import { db, type Tx } from '../db/idb';
import type { Book, Quote, ReadingSession } from '../db/types';
import { ACHIEVEMENTS, computeStats, type AchievementContext, type AchievementDef } from '../data/achievements';
import { dateKey, uuid } from '../lib/util';
import { GameError, txGrant } from './wallet';

import { syncAreas, syncBookCards } from './progress';

export const REWARD = { session: 5, first20: 5, dailyGoal: 10, finish: 30, sessionsPerDayCap: 6 };

export type BookInput = Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'currentPage' | 'status'> & Partial<Pick<Book, 'currentPage' | 'status'>>;

export async function addBook(input: BookInput): Promise<Book> {
  if (!input.title.trim()) throw new GameError('請輸入書名');
  const now = Date.now();
  const book: Book = { currentPage: 0, status: 'want', ...input, title: input.title.trim(), author: input.author.trim(), id: uuid(), createdAt: now, updatedAt: now };
  if (book.status === 'finished' && !book.finishDate) book.finishDate = dateKey();
  await db.tx(['books', 'wallet'], 'readwrite', async (t) => {
    await t.store('books').add(book);
    if (book.status === 'finished') await txGrant(t, `finish:${book.id}`, REWARD.finish, `完成《${book.title}》`, { type: 'book', id: book.id });
  });
  return book;
}

export async function updateBook(id: string, patch: Partial<Book>): Promise<{ finishedNow: boolean }> {
  let finishedNow = false;
  await db.tx(['books', 'wallet'], 'readwrite', async (t) => {
    const b = await t.store('books').get(id);
    if (!b) throw new GameError('找不到這本書');
    const next: Book = { ...b, ...patch, id, updatedAt: Date.now() };
    if (next.status === 'finished' && b.status !== 'finished') {
      next.finishDate = next.finishDate || dateKey();
      if (next.totalPages) next.currentPage = next.totalPages;
      finishedNow = await txGrant(t, `finish:${id}`, REWARD.finish, `完成《${next.title}》`, { type: 'book', id });
    }
    if (next.status === 'reading' && !next.startDate) next.startDate = dateKey();
    await t.store('books').put(next);
  });
  return { finishedNow };
}

/** Deletes a book with its sessions and quotes. Coins already earned are kept (no punishment). */
export async function deleteBook(id: string) {
  await db.tx(['books', 'sessions', 'quotes'], 'readwrite', async (t) => {
    for (const s of await t.store('sessions').byIndex('bookId', id)) await t.store('sessions').delete(s.id);
    for (const q of await t.store('quotes').byIndex('bookId', id)) await t.store('quotes').delete(q.id);
    await t.store('books').delete(id);
  });
}

export interface SessionInput {
  id?: string;
  bookId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  minutes: number;
  startPage?: number;
  endPage?: number;
  pages?: number;
  mood?: ReadingSession['mood'];
  reflection?: string;
  quote?: string;
  photoIds?: string[];
  tags?: string[];
  markFinished?: boolean;
}

export interface SaveResult { session: ReadingSession; coins: number; rewards: string[]; finishedBook?: Book }

async function txDayMinutes(t: Tx, date: string) {
  return (await t.store('sessions').byIndex('date', date)).reduce((s, x) => s + (x.minutes || 0), 0);
}

export async function saveSession(input: SessionInput): Promise<SaveResult> {
  if (!input.bookId) throw new GameError('請先選擇一本書');
  if (!(input.minutes >= 0)) throw new GameError('閱讀時間格式不正確');
  const computedPages = input.startPage != null && input.endPage != null ? Math.max(0, input.endPage - input.startPage) : input.pages ?? 0;
  if (input.startPage != null && input.endPage != null && input.endPage < input.startPage) throw new GameError('結束頁碼不能小於開始頁碼');
  const goal = (await db.getKV<number>('settings', 'dailyGoal', 20)) || 20;
  let result!: SaveResult;
  await db.tx(['sessions', 'books', 'quotes', 'wallet'], 'readwrite', async (t) => {
    const book = await t.store('books').get(input.bookId);
    if (!book) throw new GameError('找不到這本書');
    const existing = input.id ? await t.store('sessions').get(input.id) : undefined;
    const now = Date.now();
    const session: ReadingSession = {
      id: existing?.id ?? uuid(),
      bookId: input.bookId,
      date: input.date,
      startTime: input.startTime || undefined,
      endTime: input.endTime || undefined,
      minutes: Math.round(input.minutes),
      startPage: input.startPage,
      endPage: input.endPage,
      pages: computedPages,
      mood: input.mood,
      reflection: input.reflection?.trim() || undefined,
      quote: input.quote?.trim() || undefined,
      photoIds: input.photoIds ?? existing?.photoIds ?? [],
      tags: input.tags ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: existing ? now : undefined,
    };
    await t.store('sessions').put(session);

    // quote → 佳句收藏 (one quote per session, kept in sync on edit)
    const qs = (await t.store('quotes').byIndex('bookId', book.id)).filter((q) => q.sessionId === session.id);
    if (session.quote) {
      const q: Quote = qs[0] ? { ...qs[0], text: session.quote, page: session.endPage } : { id: uuid(), bookId: book.id, sessionId: session.id, text: session.quote, page: session.endPage, tags: session.tags, createdAt: now };
      await t.store('quotes').put(q);
    } else if (qs[0]) await t.store('quotes').delete(qs[0].id);

    // book progress
    const nextBook: Book = { ...book, updatedAt: now };
    if (session.endPage != null) nextBook.currentPage = Math.max(book.currentPage, Math.min(session.endPage, book.totalPages || session.endPage));
    if (book.status === 'want' || book.status === 'paused') { nextBook.status = 'reading'; nextBook.startDate = book.startDate || session.date; }
    let finishedBook: Book | undefined;
    if (input.markFinished && book.status !== 'finished') {
      nextBook.status = 'finished';
      nextBook.finishDate = session.date;
      if (nextBook.totalPages) nextBook.currentPage = nextBook.totalPages;
      finishedBook = nextBook;
    }
    await t.store('books').put(nextBook);

    // rewards — every reward has a unique key, so editing never pays twice
    let coins = 0;
    const rewards: string[] = [];
    const valid = session.minutes >= 1 || session.pages >= 1;
    if (valid && !existing) {
      const paidToday = (await t.store('wallet').all()).filter((w) => w.rewardKey?.startsWith(`session:`) && w.refId === session.date).length;
      if (paidToday < REWARD.sessionsPerDayCap && await txGrant(t, `session:${session.id}`, REWARD.session, '有效閱讀紀錄', { type: 'day', id: session.date })) { coins += REWARD.session; rewards.push('閱讀紀錄 +5'); }
    }
    const dayMin = await txDayMinutes(t, session.date);
    if (dayMin >= 20 && await txGrant(t, `first20:${session.date}`, REWARD.first20, '當日閱讀滿 20 分鐘', { type: 'day', id: session.date })) { coins += REWARD.first20; rewards.push('今日滿 20 分鐘 +5'); }
    if (dayMin >= goal && await txGrant(t, `goal:${session.date}`, REWARD.dailyGoal, `達成每日目標 ${goal} 分鐘`, { type: 'day', id: session.date })) { coins += REWARD.dailyGoal; rewards.push('達成每日目標 +10'); }
    if (finishedBook && await txGrant(t, `finish:${book.id}`, REWARD.finish, `完成《${book.title}》`, { type: 'book', id: book.id })) { coins += REWARD.finish; rewards.push('讀完一本書 +30'); }
    result = { session, coins, rewards, finishedBook };
  });
  return result;
}

export async function deleteSession(id: string) {
  await db.tx(['sessions', 'quotes'], 'readwrite', async (t) => {
    const s = await t.store('sessions').get(id);
    if (!s) return;
    for (const q of await t.store('quotes').byIndex('bookId', s.bookId)) if (q.sessionId === id) await t.store('quotes').delete(q.id);
    await t.store('sessions').delete(id);
  });
}

export async function saveQuote(q: Partial<Quote> & { text: string }) {
  if (!q.text.trim()) throw new GameError('佳句不能是空白');
  const row: Quote = { id: q.id ?? uuid(), bookId: q.bookId, sessionId: q.sessionId, text: q.text.trim(), page: q.page, note: q.note, tags: q.tags ?? [], createdAt: q.createdAt ?? Date.now() };
  await db.put('quotes', row);
  return row;
}
export function deleteQuote(id: string) { return db.delete('quotes', id); }

// ───────── achievements ─────────
export async function achievementContext(): Promise<AchievementContext> {
  return db.tx(['books', 'sessions', 'quotes', 'diary', 'ownedPlants', 'visits', 'meals', 'readTogether'], 'readonly', async (t) => {
    const stats = computeStats(await t.store('books').all(), await t.store('sessions').all());
    return {
      stats,
      quotes: await t.store('quotes').count(),
      diary: (await t.store('diary').all()).filter((d) => !d.isDraft).length,
      plants: await t.store('ownedPlants').count(),
      visits: await t.store('visits').count(),
      meals: await t.store('meals').count(),
      readTogether: await t.store('readTogether').count(),
    };
  });
}

/** Unlocks every newly satisfied achievement once and pays its reward once. */
export async function checkAchievements(): Promise<AchievementDef[]> {
  // finished books → 書卡; category progress → 閱讀地圖 areas
  try { await syncBookCards(); await syncAreas(); } catch (e) { console.error(e); }
  const ctx = await achievementContext();
  const newly: AchievementDef[] = [];
  await db.tx(['achievements', 'wallet'], 'readwrite', async (t) => {
    for (const a of ACHIEVEMENTS) {
      const [cur, target] = a.progress(ctx);
      if (cur < target) continue;
      if (await t.store('achievements').get(a.id)) continue;
      await t.store('achievements').put({ id: a.id, unlockedAt: Date.now() });
      await txGrant(t, `ach:${a.id}`, a.reward, `成就「${a.name}」`, { type: 'achievement', id: a.id });
      newly.push(a);
    }
  });
  return newly;
}
