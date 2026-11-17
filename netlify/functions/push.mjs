// /api/push — toestel aan- of afmelden voor pushmeldingen, of een testmelding sturen
import { accounts, json, keyFromRequest, pushes, pushKey, quotes, sendAll, update } from '../lib/shared.mjs';

// Alleen echte push-diensten van browsers toelaten
const PUSH_HOST = /^https:\/\/([a-z0-9-]+\.)*(googleapis\.com|mozilla\.com|windows\.com|apple\.com)\//;

export default async (req) => {
  if (req.method === 'GET') return json({ key: await pushKey() });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const key = await keyFromRequest(req);
  if (!key) return json({ error: 'code' }, 401);
  const acc = await accounts().get(key, { type: 'json' });
  if (!acc) return json({ error: 'unknown-code' }, 404);
  const body = await req.json().catch(() => ({}));
  const store = pushes();

  if (body.action === 'subscribe') {
    const sub = body.sub;
    if (!PUSH_HOST.test(sub?.endpoint || '') || !sub.keys?.p256dh || !sub.keys?.auth) return json({ error: 'sub' }, 400);
    const rec = await update(store, key, cur => {
      const r = cur || { subs: [] };
      return { ...r, tz: body.tz || r.tz, subs: r.subs.filter(s => s.endpoint !== sub.endpoint).concat(sub).slice(-10) };
    });
    return json({ ok: true, devices: rec.subs.length });
  }

  if (body.action === 'unsubscribe') {
    const rec = await update(store, key, cur => cur ? { ...cur, subs: cur.subs.filter(s => s.endpoint !== body.endpoint) } : undefined);
    return json({ ok: true, devices: rec?.subs.length || 0 });
  }

  if (body.action === 'test') {
    const rec = await store.get(key, { type: 'json' });
    if (!rec?.subs?.length) return json({ error: 'no-devices' }, 409);
    const pool = quotes(acc.state);
    const text = pool.length ? pool[Math.floor(Math.random() * pool.length)] : 'Zo ziet een melding van Headspace eruit.';
    const keep = await sendAll(rec.subs, { title: 'Headspace', body: text, tag: 'test', url: '/' });
    await dropDead(store, key, rec.subs, keep);
    return json({ ok: true, devices: keep.length });
  }

  return json({ error: 'action' }, 400);
};

// Toestellen die zich afgemeld hebben weghalen (zonder intussen nieuwe toestellen te verliezen)
async function dropDead(store, key, before, keep) {
  const dead = new Set(before.filter(s => !keep.includes(s)).map(s => s.endpoint));
  if (dead.size) await update(store, key, cur => cur ? { ...cur, subs: cur.subs.filter(s => !dead.has(s.endpoint)) } : undefined);
}

export const config = { path: '/api/push' };
