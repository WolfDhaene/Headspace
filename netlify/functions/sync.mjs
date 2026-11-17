// POST /api/sync — voegt de data van dit toestel samen met wat al bewaard is en geeft het geheel terug
import { accounts, json, keyFromRequest, merge, update } from '../lib/shared.mjs';

const MAX_ACCOUNTS = 40; // rem tegen misbruik: dit is een persoonlijke app

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const key = await keyFromRequest(req);
  if (!key) return json({ error: 'code' }, 401);
  const body = await req.json().catch(() => null);
  if (!body || typeof body.state !== 'object') return json({ error: 'body' }, 400);

  const store = accounts();
  if (body.create && !(await store.get(key)) && (await store.list()).blobs.length >= MAX_ACCOUNTS) return json({ error: 'full' }, 403);

  let state = null, missing = false;
  try {
    await update(store, key, cur => {
      if (!cur && !body.create) { missing = true; return undefined; }
      state = merge(cur?.state, body.state);
      const tz = body.tz || cur?.tz;
      if (cur && tz === cur.tz && JSON.stringify(state) === JSON.stringify(cur.state)) return undefined; // niets nieuws
      return { state, tz };
    });
  } catch (e) {
    return json({ error: 'busy' }, 503);
  }
  if (missing) return json({ error: 'unknown-code' }, 404);
  return json({ state });
};

export const config = { path: '/api/sync' };
