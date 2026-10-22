import type { Book, ReadingSession } from '../db/types';
import { addDays, dateKey } from '../lib/util';

export interface ReadingStats {
  totalPages: number;
  totalMinutes: number;
  finished: number;
  bookCount: number;
  readingDays: number;
  currentStreak: number;
  longestStreak: number;
  categories: Record<string, number>; // category → book count (books with ≥1 session or finished)
  minutesByDay: Record<string, number>;
  pagesByDay: Record<string, number>;
  sessionCount: number;
}

export function computeStats(books: Book[], sessions: ReadingSession[], today = dateKey()): ReadingStats {
  const minutesByDay: Record<string, number> = {};
  const pagesByDay: Record<string, number> = {};
  let totalPages = 0, totalMinutes = 0;
  for (const s of sessions) {
    totalPages += s.pages || 0;
    totalMinutes += s.minutes || 0;
    minutesByDay[s.date] = (minutesByDay[s.date] || 0) + (s.minutes || 0);
    pagesByDay[s.date] = (pagesByDay[s.date] || 0) + (s.pages || 0);
  }
  const days = Object.keys(minutesByDay).sort();
  let longest = 0, run = 0, prev = '';
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  let current = 0;
  let cursor = minutesByDay[today] !== undefined ? today : addDays(today, -1); // streak survives until the end of today
  while (minutesByDay[cursor] !== undefined) { current++; cursor = addDays(cursor, -1); }
  const readBookIds = new Set(sessions.map((s) => s.bookId));
  const categories: Record<string, number> = {};
  for (const b of books) if (readBookIds.has(b.id) || b.status === 'finished') categories[b.category] = (categories[b.category] || 0) + 1;
  return {
    totalPages, totalMinutes,
    finished: books.filter((b) => b.status === 'finished').length,
    bookCount: books.length,
    readingDays: days.length,
    currentStreak: current,
    longestStreak: longest,
    categories, minutesByDay, pagesByDay,
    sessionCount: sessions.length,
  };
}

export interface AchievementContext {
  stats: ReadingStats;
  quotes: number;
  diary: number;
  plants: number;
  visits: number;
  meals: number;
  readTogether: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  reward: number;
  icon: string; // pixel icon key
  progress: (c: AchievementContext) => [number, number];
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first', name: '翻開第一頁', desc: '新增第一筆閱讀紀錄', reward: 10, icon: 'book', progress: (c) => [c.stats.sessionCount, 1] },
  { id: 'streak3', name: '三日小習慣', desc: '連續閱讀 3 天', reward: 15, icon: 'flame', progress: (c) => [c.stats.longestStreak, 3] },
  { id: 'streak7', name: '一週書蟲', desc: '連續閱讀 7 天', reward: 30, icon: 'flame', progress: (c) => [c.stats.longestStreak, 7] },
  { id: 'streak30', name: '閱讀成為日常', desc: '連續閱讀 30 天', reward: 100, icon: 'crown', progress: (c) => [c.stats.longestStreak, 30] },
  { id: 'finish1', name: '讀完一本', desc: '完成第 1 本書', reward: 20, icon: 'check', progress: (c) => [c.stats.finished, 1] },
  { id: 'finish5', name: '小小藏書家', desc: '完成 5 本書', reward: 50, icon: 'shelf', progress: (c) => [c.stats.finished, 5] },
  { id: 'finish12', name: '一年十二本', desc: '完成 12 本書', reward: 120, icon: 'crown', progress: (c) => [c.stats.finished, 12] },
  { id: 'pages500', name: '五百頁的風景', desc: '累積閱讀 500 頁', reward: 25, icon: 'page', progress: (c) => [c.stats.totalPages, 500] },
  { id: 'pages2000', name: '兩千頁旅程', desc: '累積閱讀 2000 頁', reward: 80, icon: 'page', progress: (c) => [c.stats.totalPages, 2000] },
  { id: 'hours10', name: '十小時的專注', desc: '累積閱讀 10 小時', reward: 40, icon: 'clock', progress: (c) => [c.stats.totalMinutes, 600] },
  { id: 'hours50', name: '五十小時的宇宙', desc: '累積閱讀 50 小時', reward: 120, icon: 'clock', progress: (c) => [c.stats.totalMinutes, 3000] },
  { id: 'cats3', name: '跨界閱讀', desc: '讀過 3 種不同分類', reward: 25, icon: 'star', progress: (c) => [Object.keys(c.stats.categories).length, 3] },
  { id: 'quotes10', name: '佳句收藏家', desc: '收藏 10 句佳句', reward: 25, icon: 'quote', progress: (c) => [c.quotes, 10] },
  { id: 'diary1', name: '替未來留言', desc: '寫下第一篇日記', reward: 10, icon: 'pen', progress: (c) => [c.diary, 1] },
  { id: 'plant1', name: '綠手指', desc: '在陽台種下第一盆植物', reward: 10, icon: 'leaf', progress: (c) => [c.plants, 1] },
  { id: 'visit1', name: '歡迎光臨', desc: '第一次邀請陳卷毛來家裡', reward: 10, icon: 'heart', progress: (c) => [c.visits, 1] },
  { id: 'meal1', name: '一起吃飯', desc: '和陳卷毛一起吃一頓飯', reward: 10, icon: 'heart', progress: (c) => [c.meals, 1] },
  { id: 'readTogether1', name: '並肩閱讀', desc: '和陳卷毛一起看一本書', reward: 15, icon: 'heart', progress: (c) => [c.readTogether, 1] },
];
export const achievementById = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
