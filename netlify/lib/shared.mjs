// Gedeelde helpers voor de Netlify-functies (sync + pushmeldingen)
import { getStore } from '@netlify/blobs';
import * as webpush from 'web-push';

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

// Opslag: accounts = je journal, push = toestellen + planning van de dag, config = sleutels
export const accounts = () => getStore({ name: 'accounts', consistency: 'strong' });
export const pushes = () => getStore({ name: 'push', consistency: 'strong' });

// Lezen, aanpassen en terugschrijven zonder dat twee gelijktijdige verzoeken elkaars werk overschrijven.
// fn krijgt de huidige waarde (of null) en geeft de nieuwe terug, of undefined als er niets te schrijven valt.
export async function update(store, key, fn) {
  for (let i = 0; i < 8; i++) {
    const cur = await store.getWithMetadata(key, { type: 'json' });
    const next = fn(cur ? cur.data : null);
    if (next === undefined) return cur ? cur.data : null;
    const cond = cur ? (cur.etag ? { onlyIfMatch: cur.etag } : {}) : { onlyIfNew: true };
    const res = await store.setJSON(key, next, cond);
    if (!res || res.modified !== false) return next;
    await new Promise(r => setTimeout(r, 40 + Math.random() * 160)); // iemand anders schreef net: opnieuw
  }
  throw new Error('conflict');
}

// De sync-code zelf wordt nooit bewaard, alleen een hash ervan
export async function keyFromRequest(req) {
  const code = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (code.length < 16) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Twee versies samenvoegen: per item wint de laatst gewijzigde (zelfde functie staat in index.html)
export function merge(a = {}, b = {}) {
  const out = { settings: (b.settings?.u || 0) > (a.settings?.u || 0) ? b.settings : a.settings || { u: 0 } };
  for (const c of ['notes', 'entries', 'goals', 'wins']) {
    out[c] = { ...(a[c] || {}) };
    for (const id in b[c] || {}) if (!out[c][id] || (b[c][id].u || 0) > (out[c][id].u || 0)) out[c][id] = b[c][id];
  }
  return out;
}

// Sleutels voor pushmeldingen: worden één keer automatisch aangemaakt en bewaard
export async function pushKey() {
  const store = getStore({ name: 'config', consistency: 'strong' });
  let keys = await store.get('vapid', { type: 'json' });
  if (!keys) {
    await store.setJSON('vapid', webpush.generateVAPIDKeys());
    keys = await store.get('vapid', { type: 'json' });
  }
  webpush.setVapidDetails(process.env.URL || 'https://headspace.netlify.app', keys.publicKey, keys.privateKey);
  return keys.publicKey;
}

// Stuurt een melding naar alle toestellen; geeft de toestellen terug die nog geldig zijn
export async function sendAll(subs, payload) {
  await pushKey();
  const keep = [];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600 });
      keep.push(sub);
    } catch (e) {
      if (e.statusCode !== 404 && e.statusCode !== 410) keep.push(sub); // 404/410 = toestel is afgemeld
    }
  }
  return keep;
}

const strip = s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();

// Quotes = notes met flag 'quote' (of 'les'). Gemarkeerde stukken tellen, anders de hele note.
export function quotes(state) {
  const out = [];
  for (const n of Object.values(state?.notes || {})) {
    if (n.del || !(n.flags || []).some(f => f === 'quote' || f === 'les')) continue;
    const marks = [...(n.html || '').matchAll(/<mark>([\s\S]*?)<\/mark>/g)].map(m => strip(m[1])).filter(Boolean);
    out.push(...(marks.length ? marks : [(n.text || '').trim()].filter(Boolean)));
  }
  return out;
}
