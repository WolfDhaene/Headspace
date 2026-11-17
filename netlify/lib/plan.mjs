// Planning van de meldingen: wanneer wordt wat verstuurd
import { quotes } from './shared.mjs';

const DEFAULTS = { perDay: 2, from: 9, to: 21, checkin: false, checkinAt: '20:30' };
const WINDOW = 45; // minuten: een gemist moment wordt niet veel later nog verstuurd

// Datum en minuut-van-de-dag in de tijdzone van de gebruiker
export function localNow(tz, at = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(at).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}

// Beslist wat er nu verstuurd moet worden en werkt de planning van de dag bij
export function decide(rec, state, now, rnd = Math.random) {
  const cfg = { ...DEFAULTS, ...(state?.settings?.push || {}) };
  const sig = `${cfg.perDay}|${cfg.from}|${cfg.to}`;
  let plan = rec.plan?.date === now.date ? { ...rec.plan } : { date: now.date, sent: 0, checkin: false };

  // Nieuwe dag of andere instellingen: kies opnieuw willekeurige momenten (alleen in de toekomst)
  if (plan.sig !== sig) {
    // het resterende venster in gelijke stukken verdelen, met in elk stuk één willekeurig moment
    const start = Math.max(cfg.from * 60, now.min + 1), end = cfg.to * 60;
    const n = end > start ? Math.max(0, cfg.perDay - plan.sent) : 0, slot = (end - start) / Math.max(n, 1);
    plan.times = Array.from({ length: n }, (_, i) => Math.floor(start + slot * (i + rnd())));
    plan.sig = sig;
  }

  const todo = [];
  if (plan.times.length && plan.times[0] <= now.min) {
    const t = plan.times.shift();
    const all = quotes(state);
    const pool = all.length > 1 ? all.filter(q => q !== rec.last) : all; // niet twee keer dezelfde na elkaar
    if (pool.length && now.min - t <= WINDOW) {
      const body = pool[Math.floor(rnd() * pool.length)];
      todo.push({ title: 'Headspace', body, tag: 'quote', url: '/' });
      rec = { ...rec, last: body };
      plan.sent++;
    }
  }

  const [h, m] = String(cfg.checkinAt).split(':').map(Number);
  const at = h * 60 + (m || 0);
  if (cfg.checkin && !plan.checkin && now.min >= at) {
    plan.checkin = true;
    const done = state?.entries?.['d' + now.date];
    if (now.min - at <= WINDOW && !(done && !done.del))
      todo.push({ title: 'Tijd voor je check-in', body: 'Hoe was je dag? Mood, stress en slaap in tien seconden.', tag: 'checkin', url: '/#checkin' });
  }
  return { rec: { ...rec, plan }, todo };
}
