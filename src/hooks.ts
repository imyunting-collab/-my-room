import { useEffect, useRef, useState } from 'react';
import { db } from './db/idb';
import { on } from './lib/bus';
import { dayPartOf, DEFAULT_DAYPARTS, type DayPart, type DayPartRanges } from './lib/util';

/** Re-runs the query whenever the database changes (like Dexie's useLiveQuery). */
export function useLive<T>(query: () => Promise<T>, deps: unknown[] = [], fallback?: T): T | undefined {
  const [value, setValue] = useState<T | undefined>(fallback);
  const q = useRef(query);
  q.current = query;
  useEffect(() => {
    let alive = true;
    let seq = 0;
    const run = () => { const my = ++seq; q.current().then((v) => { if (alive && my === seq) setValue(v); }).catch((e) => console.error(e)); };
    run();
    const off = db.onChange(run);
    return () => { alive = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

/** Real device time, refreshed every 15s and immediately when the app becomes visible again. */
export function useNow(intervalMs = 15000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, intervalMs);
    const vis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('focus', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); window.removeEventListener('focus', tick); };
  }, [intervalMs]);
  return now;
}

export function useDayPart(): { part: DayPart; now: Date } {
  const now = useNow();
  const ranges = useLive(() => db.getKV<DayPartRanges>('settings', 'dayparts', DEFAULT_DAYPARTS), [], DEFAULT_DAYPARTS) ?? DEFAULT_DAYPARTS;
  const override = useLive(() => db.getKV<DayPart | ''>('settings', 'daypartPreview', ''), [], '');
  return { part: override || dayPartOf(now.getHours() + now.getMinutes() / 60, ranges), now };
}

export function useBus<T = unknown>(evt: string, handler: (p: T) => void) {
  const h = useRef(handler);
  h.current = handler;
  useEffect(() => on(evt, (p) => h.current(p)), [evt]);
}

export function useReducedMotion(): boolean {
  const pref = useLive(() => db.getKV<boolean>('settings', 'reducedMotion', false), [], false);
  const [media, setMedia] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia('(prefers-reduced-motion: reduce)');
    const f = () => setMedia(m.matches);
    m.addEventListener?.('change', f);
    return () => m.removeEventListener?.('change', f);
  }, []);
  return !!pref || media;
}
