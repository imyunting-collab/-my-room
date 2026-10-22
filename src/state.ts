import { db } from './db/idb';
import { useLive } from './hooks';
import type { Book, CharacterId, Equip, ReadingSession } from './db/types';
import { DEFAULT_EQUIP } from './sprites/characters';
import { computeStats } from './data/achievements';

export function useBooks(): Book[] {
  return useLive(async () => (await db.all('books')).sort((a, b) => b.updatedAt - a.updatedAt), [], []) ?? [];
}
export function useSessions(): ReadingSession[] {
  return useLive(async () => (await db.all('sessions')).sort((a, b) => (b.date + (b.startTime ?? '')).localeCompare(a.date + (a.startTime ?? '')) || b.createdAt - a.createdAt), [], []) ?? [];
}
export function useEquip(who: CharacterId): Equip {
  return useLive(() => db.getKV<Equip>('meta', `equip:${who}`, DEFAULT_EQUIP[who]), [who], DEFAULT_EQUIP[who]) ?? DEFAULT_EQUIP[who];
}
export function useStats() {
  const books = useBooks();
  const sessions = useSessions();
  return { books, sessions, stats: computeStats(books, sessions) };
}
export function useGoal(): number {
  return useLive(() => db.getKV<number>('settings', 'dailyGoal', 20), [], 20) ?? 20;
}
export const STATUS_LABEL: Record<Book['status'], string> = { want: '想讀', reading: '閱讀中', paused: '暫停閱讀', finished: '已讀完', dropped: '棄讀' };
