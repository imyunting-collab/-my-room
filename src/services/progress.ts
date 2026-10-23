// Reading map (areas), book cards (書卡), weekly couple quests (雙人任務), artworks (作品牆).
import { db } from '../db/idb';
import { AREAS, AREA_PAGES, areaById } from '../data/areas';
import { furnById, CATEGORY_COLORS } from '../data/catalog';
import type { AreaId, OwnedFurniture } from '../db/types';
import { toast } from '../lib/bus';
import { addDays, dateKey, parseDateKey, uuid } from '../lib/util';
import { GameError, txGrant } from './wallet';
import { hash01 } from './world';

// ───────── 閱讀地圖 ─────────
export interface AreaProgress { id: AreaId; pages: number; finished: number; unlocked: boolean; progress: number }
export async function areaProgress(): Promise<AreaProgress[]> {
  const books = await db.all('books'), sessions = await db.all('sessions');
  const unlockedSet = new Set(await db.getKV<AreaId[]>('meta', 'areasUnlocked', []));
  return AREAS.map((a) => {
    const ids = new Set(books.filter((b) => a.cats.includes(b.category)).map((b) => b.id));
    const pages = sessions.filter((s) => ids.has(s.bookId)).reduce((n, s) => n + (s.pages || 0), 0);
    const finished = books.filter((b) => ids.has(b.id) && b.status === 'finished').length;
    const reached = pages >= AREA_PAGES || finished >= 1;
    return { id: a.id, pages, finished, unlocked: unlockedSet.has(a.id) || reached, progress: Math.min(1, Math.max(pages / AREA_PAGES, finished)) };
  });
}
/** Unlocks newly reached areas and furnishes them. Returns the new ones. */
export async function syncAreas(): Promise<AreaId[]> {
  const prog = await areaProgress();
  const had = new Set(await db.getKV<AreaId[]>('meta', 'areasUnlocked', []));
  const fresh = prog.filter((p) => p.unlocked && !had.has(p.id)).map((p) => p.id);
  if (!fresh.length) return [];
  await db.tx(['meta', 'ownedFurniture'], 'readwrite', async (t) => {
    const now = Date.now();
    for (const id of fresh) {
      for (const pr of areaById.get(id)!.props) await t.store('ownedFurniture').put({ id: uuid(), defId: pr.defId, roomId: id, x: pr.x, y: pr.y, flip: pr.flip, purchasedAt: now });
      had.add(id);
    }
    await t.store('meta').put({ key: 'areasUnlocked', value: [...had] });
  });
  for (const id of fresh) toast(`🗺️ 解鎖新區域「${areaById.get(id)!.name}」！房間又長大了一點`, 'success');
  return fresh;
}
export async function unlockedAreas(): Promise<AreaId[]> { return db.getKV<AreaId[]>('meta', 'areasUnlocked', []); }

// ───────── 書卡 ─────────
export interface BookCard { bookId: string; quote: string; earnedAt: number; date: string; hung?: boolean }
export async function bookCards(): Promise<BookCard[]> { return db.getKV<BookCard[]>('meta', 'bookCards', []); }
/** Every finished book gets a pixel card (with its latest quote, which you can change). */
export async function syncBookCards(): Promise<string[]> {
  const cards = await bookCards();
  const have = new Set(cards.map((c) => c.bookId));
  const books = (await db.all('books')).filter((b) => b.status === 'finished' && !have.has(b.id));
  if (!books.length) return [];
  const quotes = await db.all('quotes');
  for (const b of books) {
    const q = quotes.filter((x) => x.bookId === b.id).sort((a, c) => c.createdAt - a.createdAt)[0];
    const sessQuote = (await db.byIndex('sessions', 'bookId', b.id)).map((s) => s.quote).filter(Boolean).pop();
    cards.push({ bookId: b.id, quote: q?.text ?? sessQuote ?? '', earnedAt: Date.now(), date: b.finishDate ?? dateKey(), hung: cards.filter((c) => c.hung).length < 3 });
    toast(`🎴 獲得書卡《${b.title}》`, 'success');
  }
  await db.setKV('meta', 'bookCards', cards);
  return books.map((b) => b.id);
}
export async function updateCard(bookId: string, patch: Partial<BookCard>) {
  const cards = await bookCards();
  const i = cards.findIndex((c) => c.bookId === bookId);
  if (i < 0) throw new GameError('找不到這張書卡');
  if (patch.hung && !cards[i].hung && cards.filter((c) => c.hung).length >= 3) throw new GameError('書卡牆一次最多掛 3 張，先取下一張吧');
  cards[i] = { ...cards[i], ...patch };
  await db.setKV('meta', 'bookCards', cards);
}
/** colors of the hung cards for the wall sprite */
export async function hungCardColors(): Promise<string[]> {
  const cards = (await bookCards()).filter((c) => c.hung);
  const books = await db.all('books');
  return cards.map((c) => CATEGORY_COLORS[books.find((b) => b.id === c.bookId)?.category ?? ''] ?? '#9a8f86');
}

// ───────── 雙人任務 ─────────
export interface QuestDef { id: string; title: string; goal: number; unit: string; reward: { furniture?: string; topic?: string; coins?: number }; rewardText: string }
export const QUESTS: QuestDef[] = [
  { id: 'pages100', title: '這週一起讀完 100 頁', goal: 100, unit: '頁', reward: { furniture: 'swap_shelf', topic: 'bookswap' }, rewardText: '交換書架＋新對話「交換書單」' },
  { id: 'meals3', title: '一起吃 3 頓飯', goal: 3, unit: '頓', reward: { furniture: 'tent_fort', coins: 20 }, rewardText: '枕頭帳篷＋20 知識幣' },
  { id: 'chat10', title: '跟陳卷毛聊天 10 次', goal: 10, unit: '次', reward: { topic: 'future', coins: 15 }, rewardText: '新對話「以後想去哪裡」＋15 知識幣' },
  { id: 'readTogether2', title: '一起看書 2 次', goal: 2, unit: '次', reward: { furniture: 'beanbag_pair' }, rewardText: '雙人懶骨頭' },
  { id: 'diary3', title: '寫 3 篇日記', goal: 3, unit: '篇', reward: { topic: 'firstmeet', coins: 15 }, rewardText: '新對話「第一次見面」＋15 知識幣' },
  { id: 'visits3', title: '邀請他來家裡 3 次', goal: 3, unit: '次', reward: { furniture: 'puzzle_wall', topic: 'secret' }, rewardText: '我們的拼圖＋新對話「說一個秘密」' },
  { id: 'focus120', title: '專注閱讀 120 分鐘', goal: 120, unit: '分鐘', reward: { topic: 'promise', coins: 25 }, rewardText: '新對話「約定」＋25 知識幣' },
];
export function weekStart(day = dateKey()): string { const d = parseDateKey(day); const dow = (d.getDay() + 6) % 7; return addDays(day, -dow); }
export function weekQuests(day = dateKey()): QuestDef[] {
  const wk = weekStart(day);
  return [...QUESTS].sort((a, b) => hash01(wk + a.id) - hash01(wk + b.id)).slice(0, 3);
}
export interface QuestState { def: QuestDef; value: number; done: boolean; claimed: boolean }
export async function questStates(day = dateKey()): Promise<QuestState[]> {
  const wk = weekStart(day), end = addDays(wk, 7);
  const inWeek = (d: string) => d >= wk && d < end;
  const tsIn = (ts: number) => inWeek(dateKey(ts));
  const [sessions, meals, chat, reads, diary, visits] = await Promise.all([db.all('sessions'), db.all('meals'), db.all('chat'), db.all('readTogether'), db.all('diary'), db.all('visits')]);
  const focusMin = sessions.filter((s) => inWeek(s.date) && s.tags.includes('專注模式')).reduce((n, s) => n + s.minutes, 0);
  const value: Record<string, number> = {
    pages100: sessions.filter((s) => inWeek(s.date)).reduce((n, s) => n + (s.pages || 0), 0),
    meals3: meals.filter((m) => inWeek(m.date)).length,
    chat10: chat.filter((m) => m.sender === 'me' && tsIn(m.timestamp)).length,
    readTogether2: reads.filter((r) => inWeek(r.date)).length,
    diary3: diary.filter((d) => !d.isDraft && inWeek(d.date)).length,
    visits3: visits.filter((v) => tsIn(v.arrivedAt)).length,
    focus120: focusMin,
  };
  const claimed = new Set(await db.getKV<string[]>('meta', `quests:${wk}`, []));
  return weekQuests(day).map((def) => ({ def, value: value[def.id] ?? 0, done: (value[def.id] ?? 0) >= def.goal, claimed: claimed.has(def.id) }));
}
export async function unlockedTopics(): Promise<string[]> { return db.getKV<string[]>('meta', 'topicsUnlocked', []); }
export async function claimQuest(id: string) {
  const st = (await questStates()).find((q) => q.def.id === id);
  if (!st) throw new GameError('這週沒有這個任務');
  if (!st.done) throw new GameError('還沒完成喔，加油！');
  if (st.claimed) throw new GameError('已經領過了');
  const wk = weekStart();
  await db.tx(['meta', 'ownedFurniture', 'wallet'], 'readwrite', async (t) => {
    const r = st.def.reward;
    if (r.furniture) {
      const owned = (await t.store('ownedFurniture').all()).some((f) => f.defId === r.furniture);
      if (!owned) await t.store('ownedFurniture').put({ id: uuid(), defId: r.furniture, roomId: null, x: 96, y: 200, purchasedAt: Date.now() });
    }
    if (r.topic) {
      const cur = ((await t.store('meta').get('topicsUnlocked'))?.value as string[] | undefined) ?? [];
      if (!cur.includes(r.topic)) await t.store('meta').put({ key: 'topicsUnlocked', value: [...cur, r.topic] });
    }
    if (r.coins) await txGrant(t, `quest:${wk}:${id}`, r.coins, `雙人任務「${st.def.title}」`, { type: 'week', id: wk });
    const claimed = ((await t.store('meta').get(`quests:${wk}`))?.value as string[] | undefined) ?? [];
    await t.store('meta').put({ key: `quests:${wk}`, value: [...claimed, id] });
  });
  return st.def;
}

// ───────── 作品牆 ─────────
export async function addArtwork(photoId: string, title: string, kind: OwnedFurniture['artKind']) {
  const row: OwnedFurniture = { id: uuid(), defId: 'art_frame', roomId: null, x: 96, y: 60, photoId, title: title.trim() || '無題', artKind: kind, purchasedAt: Date.now() };
  await db.put('ownedFurniture', row);
  return row;
}
export async function updateArtwork(id: string, patch: Partial<Pick<OwnedFurniture, 'title' | 'artKind'>>) {
  const f = await db.get('ownedFurniture', id);
  if (!f) throw new GameError('找不到作品');
  await db.put('ownedFurniture', { ...f, ...patch });
}
export async function deleteArtwork(id: string) { await db.delete('ownedFurniture', id); }
export const isArtwork = (f: { defId: string }) => furnById.get(f.defId)?.category === 'art';
