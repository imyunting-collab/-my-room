// 專注模式：開始後角色坐到書桌前看書，結束自動產生一筆閱讀紀錄。關掉 App 再回來也會繼續計時。
import { db } from '../db/idb';
import { dateKey, timeHM } from '../lib/util';
import { saveSession, type SaveResult } from './reading';
import { GameError } from './wallet';

export interface FocusState { bookId: string; startedAt: number; target: number }
export function getFocus() { return db.getKV<FocusState | null>('meta', 'focus', null); }
export async function startFocus(bookId: string, target: number) {
  if (!bookId) throw new GameError('先選一本書');
  const s: FocusState = { bookId, startedAt: Date.now(), target };
  await db.setKV('meta', 'focus', s);
  return s;
}
export async function cancelFocus() { await db.setKV('meta', 'focus', null); }
/** Ends the focus session and writes a reading record (needs at least 1 minute). */
export async function endFocus(endPage?: number): Promise<SaveResult | null> {
  const f = await getFocus();
  if (!f) return null;
  await db.setKV('meta', 'focus', null);
  const minutes = Math.floor((Date.now() - f.startedAt) / 60000);
  if (minutes < 1) return null;
  const book = await db.get('books', f.bookId);
  if (!book) return null;
  const start = new Date(f.startedAt);
  const startPage = book.currentPage || 0;
  const end = endPage != null && endPage >= startPage ? endPage : undefined;
  return saveSession({
    bookId: f.bookId, date: dateKey(start), startTime: timeHM(start), endTime: timeHM(new Date()), minutes,
    ...(end != null ? { startPage, endPage: end } : {}), tags: ['專注模式'],
  });
}
