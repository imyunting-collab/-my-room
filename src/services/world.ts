// The living world: weather, seasons & festivals, the desk that remembers, long-distance settings.
import { db } from '../db/idb';
import { growPlant } from './life';
import { plantById } from '../data/catalog';
import { addDays, dateKey, daysBetween, parseDateKey } from '../lib/util';

// ───────── weather ─────────
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'wind' | 'snow';
export const WEATHER_LABEL: Record<Weather, { emoji: string; label: string }> = {
  sunny: { emoji: '☀️', label: '晴天' }, cloudy: { emoji: '☁️', label: '多雲' }, rain: { emoji: '🌧️', label: '下雨' },
  wind: { emoji: '🍃', label: '起風' }, snow: { emoji: '❄️', label: '下雪' },
};
/** small deterministic hash → [0, 1) */
export function hash01(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
/** Today's weather is random but the same all day (so it doesn't flicker). */
export function naturalWeather(day = dateKey()): Weather {
  const m = parseDateKey(day).getMonth() + 1, r = hash01('weather|' + day);
  const table: [Weather, number][] =
    m === 12 || m <= 2 ? [['snow', 0.2], ['rain', 0.2], ['wind', 0.15], ['cloudy', 0.2]]
      : m <= 5 ? [['rain', 0.3], ['wind', 0.12], ['cloudy', 0.2]]
        : m <= 8 ? [['rain', 0.3], ['wind', 0.1], ['cloudy', 0.15]]
          : [['rain', 0.2], ['wind', 0.25], ['cloudy', 0.2]];
  let acc = 0;
  for (const [w, p] of table) { acc += p; if (r < acc) return w; }
  return 'sunny';
}
export async function getWeather(day = dateKey()): Promise<Weather> {
  const o = await db.getKV<Weather | ''>('settings', 'weatherOverride', '');
  return o || naturalWeather(day);
}
/** Rainy day: every balcony plant counts as watered (once per day). */
export async function rainOnPlants(day = dateKey()): Promise<number> {
  if ((await getWeather(day)) !== 'rain') return 0;
  if (await db.getKV<boolean>('meta', `rainWatered:${day}`, false)) return 0;
  let n = 0;
  await db.tx(['ownedPlants', 'meta'], 'readwrite', async (t) => {
    const now = Date.now();
    for (const p of await t.store('ownedPlants').all()) {
      const def = plantById.get(p.defId);
      if (!def || p.slot == null) continue;
      await t.store('ownedPlants').put({ ...growPlant(p, def, now), lastWateredAt: now });
      n++;
    }
    await t.store('meta').put({ key: `rainWatered:${day}`, value: true });
  });
  return n;
}

// ───────── seasons & festivals ─────────
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASON_LABEL: Record<Season, string> = { spring: '春天', summer: '夏天', autumn: '秋天', winter: '冬天' };
export function seasonOf(day = dateKey()): Season { const m = parseDateKey(day).getMonth() + 1; return m >= 3 && m <= 5 ? 'spring' : m <= 8 && m >= 6 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; }

export type Festival = 'christmas' | 'newyear' | 'lunarNewYear' | 'valentine' | 'midAutumn' | 'birthday99' | 'birthdayChen' | 'anniversary' | 'reunion';
export const FESTIVAL_INFO: Record<Festival, { name: string; emoji: string; banner: string }> = {
  christmas: { name: '聖誕節', emoji: '🎄', banner: 'Merry Christmas' },
  newyear: { name: '新年', emoji: '🎆', banner: 'Happy New Year' },
  lunarNewYear: { name: '農曆新年', emoji: '🧧', banner: '新年快樂' },
  valentine: { name: '情人節', emoji: '💝', banner: "Happy Valentine's" },
  midAutumn: { name: '中秋節', emoji: '🥮', banner: '中秋快樂' },
  birthday99: { name: '99 的生日', emoji: '🎂', banner: 'Happy Birthday 99' },
  birthdayChen: { name: '陳卷毛的生日', emoji: '🎂', banner: 'Happy Birthday 陳卷毛' },
  anniversary: { name: '交往紀念日', emoji: '💞', banner: '紀念日快樂' },
  reunion: { name: '見面日', emoji: '🧳', banner: '歡迎回來 ♥' },
};
const LUNAR_NY: Record<number, string> = { 2026: '2026-02-17', 2027: '2027-02-06', 2028: '2028-01-26', 2029: '2029-02-13', 2030: '2030-02-03', 2031: '2031-01-23' };
const MID_AUTUMN: Record<number, string> = { 2026: '2026-09-25', 2027: '2027-09-15', 2028: '2028-10-03', 2029: '2029-09-22', 2030: '2030-09-12', 2031: '2031-10-01' };
const within = (day: string, center: string | undefined, before: number, after: number) => !!center && daysBetween(center, day) >= -before && daysBetween(center, day) <= after;
const mmdd = (day: string) => day.slice(5);

export interface LDSettings { partnerTz: string; partnerCity: string; nextMeet: string; myBirthday: string; partnerBirthday: string }
export const DEFAULT_LD: LDSettings = { partnerTz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei', partnerCity: '', nextMeet: '', myBirthday: '', partnerBirthday: '' };
export async function getLD(): Promise<LDSettings> { return { ...DEFAULT_LD, ...(await db.getKV<Partial<LDSettings>>('settings', 'longDistance', {})) }; }
export async function saveLD(patch: Partial<LDSettings>) { await db.setKV('settings', 'longDistance', { ...(await getLD()), ...patch }); }

/** Pure date rules (no user dates). */
export function calendarFestivals(day = dateKey()): Festival[] {
  const y = parseDateKey(day).getFullYear(), md = mmdd(day), out: Festival[] = [];
  if (md >= '12-18' && md <= '12-26') out.push('christmas');
  if (md === '12-31' || md === '01-01' || md === '01-02') out.push('newyear');
  if (md >= '02-13' && md <= '02-15') out.push('valentine');
  if (within(day, LUNAR_NY[y], 2, 5)) out.push('lunarNewYear');
  if (within(day, MID_AUTUMN[y], 3, 1)) out.push('midAutumn');
  return out;
}
export async function activeFestivals(day = dateKey()): Promise<Festival[]> {
  const preview = await db.getKV<Festival | ''>('settings', 'festivalPreview', '');
  const out = calendarFestivals(day);
  const ld = await getLD();
  const rel = await db.get('relationship', 'main');
  if (ld.myBirthday && mmdd(day) === ld.myBirthday) out.push('birthday99');
  if (ld.partnerBirthday && mmdd(day) === ld.partnerBirthday) out.push('birthdayChen');
  if (rel?.anniversaryDate && mmdd(day) === mmdd(rel.anniversaryDate) && rel.anniversaryDate !== day) out.push('anniversary');
  if (ld.nextMeet && within(day, ld.nextMeet, 0, 1)) out.push('reunion');
  if (preview && !out.includes(preview)) out.unshift(preview);
  return out;
}
/** Limited furniture is buyable in the festival window (and a few days before). */
export function festivalOpenForShop(f: Festival, day = dateKey()): boolean {
  const y = parseDateKey(day).getFullYear(), md = mmdd(day);
  switch (f) {
    case 'christmas': return md >= '12-01' && md <= '12-31';
    case 'newyear': return md >= '12-25' || md <= '01-07';
    case 'valentine': return md >= '02-01' && md <= '02-20';
    case 'lunarNewYear': return within(day, LUNAR_NY[y], 14, 10);
    case 'midAutumn': return within(day, MID_AUTUMN[y], 14, 5);
    default: return false;
  }
}

// ───────── the desk remembers ─────────
export interface DeskState { dust: 0 | 1 | 2 | 3; coffee: boolean; notes: boolean; daysAway: number; streak: number }
export async function deskState(day = dateKey()): Promise<DeskState> {
  const sessions = await db.all('sessions');
  const days = new Set(sessions.map((s) => s.date));
  const last = [...days].sort().pop();
  const away = last ? Math.max(0, daysBetween(last, day)) : 0;
  let streak = 0;
  for (let d = days.has(day) ? day : addDays(day, -1); days.has(d); d = addDays(d, -1)) streak++;
  const dust = !last ? 0 : away >= 21 ? 3 : away >= 10 ? 2 : away >= 4 ? 1 : 0;
  return { dust, coffee: streak >= 3, notes: streak >= 7, daysAway: away, streak };
}

// ───────── two clocks ─────────
export function timeIn(tz: string, now = new Date()) {
  try {
    const f = new Intl.DateTimeFormat('zh-TW', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short', month: 'numeric', day: 'numeric' });
    const parts = Object.fromEntries(f.formatToParts(now).map((p) => [p.type, p.value]));
    const hour = Number(parts.hour) % 24;
    return { hm: `${String(hour).padStart(2, '0')}:${parts.minute}`, hour, date: `${parts.month}/${parts.day}`, weekday: parts.weekday };
  } catch { return { hm: '--:--', hour: 12, date: '', weekday: '' }; }
}
export const TIMEZONES: [string, string][] = [
  ['Asia/Taipei', '台北'], ['Asia/Tokyo', '東京'], ['Asia/Seoul', '首爾'], ['Asia/Shanghai', '上海／北京'], ['Asia/Hong_Kong', '香港'], ['Asia/Singapore', '新加坡'],
  ['Asia/Bangkok', '曼谷'], ['Australia/Sydney', '雪梨'], ['Australia/Melbourne', '墨爾本'], ['Australia/Brisbane', '布里斯本'], ['Pacific/Auckland', '奧克蘭'],
  ['Europe/London', '倫敦'], ['Europe/Paris', '巴黎'], ['Europe/Berlin', '柏林'], ['Europe/Amsterdam', '阿姆斯特丹'],
  ['America/New_York', '紐約'], ['America/Chicago', '芝加哥'], ['America/Los_Angeles', '洛杉磯'], ['America/Vancouver', '溫哥華'], ['America/Toronto', '多倫多'],
];
