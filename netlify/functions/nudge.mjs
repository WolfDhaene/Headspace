// Draait elk kwartier: stuurt op willekeurige momenten een quote, en eventueel een check-in-herinnering
import { accounts, pushes, sendAll, update } from '../lib/shared.mjs';
import { decide, localNow } from '../lib/plan.mjs';

export default async () => {
  const store = pushes();
  for (const { key } of (await store.list()).blobs) {
    try {
      const acc = await accounts().get(key, { type: 'json' });
      let todo = [], subs = [];
      // eerst de planning bijwerken en bewaren, pas dan versturen: zo gaat een melding nooit twee keer weg
      await update(store, key, cur => {
        todo = []; subs = cur?.subs || [];
        if (!subs.length) return undefined;
        let now;
        try { now = localNow(cur.tz || 'Europe/Brussels'); } catch { now = localNow('Europe/Brussels'); }
        const r = decide(cur, acc?.state, now);
        todo = r.todo;
        return JSON.stringify(r.rec) === JSON.stringify(cur) ? undefined : r.rec;
      });
      let alive = subs;
      for (const payload of todo) alive = await sendAll(alive, payload);
      const dead = new Set(subs.filter(s => !alive.includes(s)).map(s => s.endpoint));
      if (dead.size) await update(store, key, cur => cur ? { ...cur, subs: cur.subs.filter(s => !dead.has(s.endpoint)) } : undefined);
    } catch (e) {
      console.error('nudge', e.message); // één account mag de rest niet tegenhouden
    }
  }
  return new Response('ok');
};

export const config = { schedule: '*/15 * * * *' };
