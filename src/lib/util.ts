export function uuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  if (c) c.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local date key YYYY-MM-DD (device local time, not UTC). */
export function dateKey(d: Date | number = new Date()): string {
  const x = typeof d === 'number' ? new Date(d) : d;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}
export function timeHM(d: Date | number = new Date()): string {
  const x = typeof d === 'number' ? new Date(d) : d;
  return `${pad(x.getHours())}:${pad(x.getMinutes())}`;
}
export function parseDateKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(k: string, n: number): string {
  const d = parseDateKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
/** Whole days from a to b (local calendar days). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86400000);
}
export function minutesBetween(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  let diff = h2 * 60 + m2 - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60; // crossed midnight
  return diff;
}
export function fmtDate(k: string): string {
  const d = parseDateKey(k);
  const wk = '日一二三四五六'[d.getDay()];
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${wk}）`;
}
export function fmtMinutes(m: number): string {
  if (m < 60) return `${m} 分鐘`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} 小時 ${r} 分` : `${h} 小時`;
}
export function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${timeHM(d)}`;
}

export type DayPart = 'dawn' | 'day' | 'dusk' | 'night' | 'midnight';
export interface DayPartRanges { dawn: number; day: number; dusk: number; night: number; midnight: number } // start hours
export const DEFAULT_DAYPARTS: DayPartRanges = { midnight: 0, dawn: 6, day: 9, dusk: 17, night: 19 };
export const DAYPART_LABEL: Record<DayPart, string> = { dawn: '清晨', day: '白天', dusk: '黃昏', night: '夜晚', midnight: '深夜' };

/** Which part of day an hour (0-23, fractional allowed) falls in. Handles ranges that wrap past midnight. */
export function dayPartOf(hour: number, r: DayPartRanges = DEFAULT_DAYPARTS): DayPart {
  const starts = (Object.entries(r) as [DayPart, number][]).sort((a, b) => a[1] - b[1]);
  let current = starts[starts.length - 1][0]; // before first start → last range (wraps)
  for (const [part, start] of starts) if (hour >= start) current = part;
  return current;
}

export function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function downloadText(text: string, filename: string, type = 'text/plain') {
  downloadBlob(new Blob([text], { type: type + ';charset=utf-8' }), filename);
}
export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}
export function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
export function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
