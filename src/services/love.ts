// 戀愛系統：遊戲內聊天、模擬通話、到訪、共同用餐/閱讀、戀愛回憶、紀念日。
// 陳卷毛的所有回覆都是遊戲內虛構台詞，不會冒充真實訊息。
import { db } from '../db/idb';
import type { ChatMessage, LoveMemory, RelationshipSettings, VisitRecord } from '../db/types';
import { CHAT_TOPICS, EVENT_LINES, GACHA_LINES, LOVE_NOTES, MOOD_REPLIES, NUDGE_LINES, PROACTIVE_LINES, type Line, type MoodLevel } from '../data/dialogue';
import { foodById, GIFTS } from '../data/catalog';
import { emit, toast } from '../lib/bus';
import { dateKey, pick, uuid } from '../lib/util';
import { PARTNER_ID } from './seed';
import { GameError, txGrant, txSpend } from './wallet';

export interface VisitState { active: boolean; visitId?: string; arrivedAt?: number }

async function addMessage(m: Omit<ChatMessage, 'id' | 'timestamp' | 'read'> & { read?: boolean }) {
  const row: ChatMessage = { id: uuid(), timestamp: Date.now(), read: m.sender !== 'partner', ...m } as ChatMessage;
  await db.put('chat', row);
  return row;
}

let typingTimer: ReturnType<typeof setTimeout> | null = null;
/** Delivers partner lines one by one (persisted as they arrive). */
export function deliverLines(lines: Line[], interactionType = 'chat', delay = 900): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const next = () => {
      if (i >= lines.length) { emit('typing', false); typingTimer = null; resolve(); return; }
      emit('typing', true);
      typingTimer = setTimeout(async () => {
        const l = lines[i++];
        const msg = await addMessage({ contactId: PARTNER_ID, sender: 'partner', content: l.text, emotion: l.emotion, interactionType: l.action ? `${interactionType}:${l.action}` : interactionType });
        emit('partnerMessage', msg);
        next();
      }, delay + Math.min(1200, l0(lines[i]) * 40));
    };
    next();
  });
}
const l0 = (l?: Line) => (l ? l.text.length : 0);
export function isTyping() { return typingTimer !== null; }

export async function sendTopic(topicId: string, delay?: number): Promise<Line[]> {
  const topic = CHAT_TOPICS.find((t) => t.id === topicId);
  if (!topic) throw new GameError('找不到這個話題');
  await addMessage({ contactId: PARTNER_ID, sender: 'me', content: topic.prompt, interactionType: `topic:${topicId}` });
  grantLove('chat').catch(() => undefined);
  const mood = await getTodayMood();
  const byMood = mood && topic.byMood?.[moodLevel(mood.temp)];
  const lines = pick(byMood && byMood.length ? byMood : topic.replies);
  await deliverLines(lines, `topic:${topicId}`, delay);
  return lines;
}

/** In-game event message (e.g. after you finish a reading session). */
export async function pushEvent(kind: keyof typeof EVENT_LINES) {
  const l = pick(EVENT_LINES[kind]);
  const msg = await addMessage({ contactId: PARTNER_ID, sender: 'partner', content: l.text, emotion: l.emotion, interactionType: `event:${kind}` });
  emit('partnerMessage', msg);
}

export async function markRead(contactId = PARTNER_ID) {
  await db.tx(['chat'], 'readwrite', async (t) => {
    for (const m of await t.store('chat').byIndex('contactId', contactId)) if (!m.read) await t.store('chat').put({ ...m, read: true });
  });
}
export async function clearChat(contactId = PARTNER_ID) {
  await db.tx(['chat'], 'readwrite', async (t) => {
    for (const m of await t.store('chat').byIndex('contactId', contactId)) await t.store('chat').delete(m.id);
  });
}

export async function recordCall(startedAt: number, outcome: 'completed' | 'cancelled') {
  await db.put('calls', { id: uuid(), contactId: PARTNER_ID, startedAt, endedAt: Date.now(), outcome });
  if (outcome === 'completed') await grantLove('call');
}

// ───────── 愛的互動 → 知識幣 ─────────
export const LOVE_COIN = 5, LOVE_COIN_PER_DAY = 10;
const LOVE_LABEL: Record<string, string> = { chat: '聊天', call: '通話', hug: '抱抱', kiss: '親親', sit: '一起坐著', meal: '一起吃飯', read: '一起看書', movie: '看電影', diary: '分享日記', gift: '送禮物', pat: '摸摸頭', hands: '牽手', aegyo: '撒嬌', dance: '跳舞', photo: '拍合照', furniture: '一起玩' };
/** +5 知識幣 per love interaction (up to 10 times a day). Returns the coins paid. */
export async function grantLove(kind: string): Promise<number> {
  const day = dateKey();
  let paid = 0;
  await db.tx(['wallet', 'meta'], 'readwrite', async (t) => {
    const key = `loveCoin:${day}`;
    const used = Number((await t.store('meta').get(key))?.value ?? 0);
    if (used >= LOVE_COIN_PER_DAY) return;
    if (await txGrant(t, `love:${day}:${used}`, LOVE_COIN, `愛的互動・${LOVE_LABEL[kind] ?? kind}`, { type: 'day', id: day })) paid = LOVE_COIN;
    await t.store('meta').put({ key, value: used + 1 });
  });
  if (paid) toast(`💗 愛的互動 +${paid} 知識幣`, 'coin');
  return paid;
}

// ───────── 今日心情溫度計 ─────────
export interface MoodEntry { temp: number; at: number }
export const MOOD_STEPS: { level: MoodLevel; label: string; emoji: string; color: string }[] = [
  { level: 0, label: '好低落', emoji: '🥶', color: '#7aa3c9' },
  { level: 1, label: '有點悶', emoji: '🌧️', color: '#9ab3c4' },
  { level: 2, label: '普普通通', emoji: '☁️', color: '#c9b89a' },
  { level: 3, label: '暖暖的', emoji: '🌤️', color: '#f3a65a' },
  { level: 4, label: '超開心', emoji: '☀️', color: '#e8574f' },
];
export function moodLevel(temp: number): MoodLevel { return Math.max(0, Math.min(4, Math.floor(temp / 20.0001))) as MoodLevel; }
export function getTodayMood(day = dateKey()) { return db.getKV<MoodEntry | null>('meta', `moodTemp:${day}`, null); }
export async function moodHistory(days = 7): Promise<{ day: string; temp: number | null }[]> {
  const out: { day: string; temp: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const day = dateKey(d);
    out.push({ day, temp: (await getTodayMood(day))?.temp ?? null });
  }
  return out;
}
/** Saves today's mood temperature; 陳卷毛 answers when the level changes. */
export async function setTodayMood(temp: number) {
  const t = Math.max(0, Math.min(100, Math.round(temp)));
  const prev = await getTodayMood();
  await db.setKV('meta', `moodTemp:${dateKey()}`, { temp: t, at: Date.now() });
  if (!prev || moodLevel(prev.temp) !== moodLevel(t)) {
    deliverLines(pick(MOOD_REPLIES[moodLevel(t)]), 'mood', 1400).catch(() => undefined);
  }
}

// ───────── 陳卷毛主動傳訊息 ─────────
export const PROACTIVE_PER_DAY = 5;
function slotOf(h: number): keyof typeof PROACTIVE_LINES { return h < 11 ? 'morning' : h < 14 ? 'noon' : h < 18 ? 'afternoon' : h < 22 ? 'evening' : 'night'; }
/** Sends a message on his own if it's been quiet for a while (max 5 a day, not between 1–7am). */
export async function maybeProactive(now = new Date()): Promise<boolean> {
  const h = now.getHours();
  if (h >= 1 && h < 7) return false;
  if (typingTimer) return false;
  const day = dateKey(now);
  const count = await db.getKV<number>('meta', `proactive:${day}`, 0);
  if (count >= PROACTIVE_PER_DAY) return false;
  const msgs = await db.byIndex('chat', 'contactId', PARTNER_ID);
  const last = msgs.reduce((m, x) => Math.max(m, x.timestamp), 0);
  const lastSelf = await db.getKV<number>('meta', 'proactive:last', 0);
  const quiet = now.getTime() - Math.max(last, lastSelf);
  if (count > 0 && quiet < 80 * 60e3) return false; // the first one of the day can come right away
  if (count === 0 && quiet < 20 * 60e3) return false;
  await db.setKV('meta', `proactive:${day}`, count + 1);
  await db.setKV('meta', 'proactive:last', now.getTime());
  // what to say: mood first (if set today and not answered yet), then what you did today, then the time of day
  const mood = await getTodayMood(day);
  const sessions = (await db.all('sessions')).filter((x) => x.date === day);
  const diary = (await db.all('diary')).filter((d) => d.date === day && !d.isDraft);
  let lines: Line[];
  if (mood && count % 2 === 1) lines = pick(MOOD_REPLIES[moodLevel(mood.temp)]);
  else if (sessions.length && Math.random() < 0.4) lines = pick(NUDGE_LINES.readToday);
  else if (!sessions.length && h >= 19 && Math.random() < 0.5) lines = pick(NUDGE_LINES.noReadYet);
  else if (diary.length && Math.random() < 0.3) lines = pick(NUDGE_LINES.diaryToday);
  else lines = pick(PROACTIVE_LINES[slotOf(h)]);
  deliverLines(lines, 'proactive', 1200).catch(() => undefined);
  return true;
}

export function loveNote() { return pick(LOVE_NOTES); }
export function gachaLine() { return pick(GACHA_LINES); }

// ───────── visits ─────────
export async function getVisit(): Promise<VisitState> { return db.getKV<VisitState>('meta', 'visit', { active: false }); }

export async function startVisit(): Promise<VisitState> {
  let state!: VisitState;
  await db.tx(['meta', 'visits'], 'readwrite', async (t) => {
    const cur = (await t.store('meta').get('visit'))?.value as VisitState | undefined;
    if (cur?.active) { state = cur; return; }
    const v: VisitRecord = { id: uuid(), contactId: PARTNER_ID, arrivedAt: Date.now(), interactions: [] };
    await t.store('visits').add(v);
    state = { active: true, visitId: v.id, arrivedAt: v.arrivedAt };
    await t.store('meta').put({ key: 'visit', value: state });
  });
  return state;
}

export async function logInteraction(type: string, detail?: string) {
  await db.tx(['meta', 'visits'], 'readwrite', async (t) => {
    const cur = (await t.store('meta').get('visit'))?.value as VisitState | undefined;
    if (!cur?.active || !cur.visitId) throw new GameError('陳卷毛現在不在家裡');
    const v = await t.store('visits').get(cur.visitId);
    if (v) await t.store('visits').put({ ...v, interactions: [...v.interactions, { type, at: Date.now(), detail }] });
  });
  await grantLove(type);
}

export async function endVisit() {
  await db.tx(['meta', 'visits'], 'readwrite', async (t) => {
    const cur = (await t.store('meta').get('visit'))?.value as VisitState | undefined;
    if (cur?.visitId) {
      const v = await t.store('visits').get(cur.visitId);
      if (v && !v.departedAt) await t.store('visits').put({ ...v, departedAt: Date.now() });
    }
    await t.store('meta').put({ key: 'visit', value: { active: false } });
    await t.store('meta').put({ key: 'visit:lastEnd', value: Date.now() });
  });
}

/** Should he check on you first? Looks at diaries written since his last visit, and today's mood temperature. */
export async function concernReason(): Promise<{ kind: 'sad' | 'tired' | 'cold'; key: string; title?: string } | null> {
  const since = await db.getKV<number>('meta', 'visit:lastEnd', 0);
  const handled = await db.getKV<string>('meta', 'concern:handled', '');
  const diary = (await db.all('diary')).filter((d) => !d.isDraft && d.updatedAt > since && (d.mood === 'sad' || d.mood === 'tired')).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (diary && handled !== diary.id) return { kind: diary.mood === 'sad' ? 'sad' : 'tired', key: diary.id, title: diary.title };
  const m = await getTodayMood();
  const key = `mood:${dateKey()}`;
  if (m && moodLevel(m.temp) === 0 && handled !== key) return { kind: 'cold', key };
  return null;
}
export async function markConcernHandled(key: string) { await db.setKV('meta', 'concern:handled', key); }

/** Shared meal: needs food in the fridge. Uses one portion each (or splits a single portion). */
export async function shareMeal(foodId: string): Promise<{ used: number }> {
  const food = foodById.get(foodId);
  if (!food) throw new GameError('找不到食物');
  let used = 0;
  await db.tx(['foodInventory', 'meals', 'meta', 'visits'], 'readwrite', async (t) => {
    const cur = (await t.store('meta').get('visit'))?.value as VisitState | undefined;
    if (!cur?.active || !cur.visitId) throw new GameError('先邀請陳卷毛來家裡吧');
    const inv = await t.store('foodInventory').get(foodId);
    if (!inv || inv.quantity < 1) throw new GameError('冰箱裡的食物不夠了');
    used = Math.min(2, inv.quantity);
    await t.store('foodInventory').put({ ...inv, quantity: inv.quantity - used, updatedAt: Date.now() });
    await t.store('meals').add({ id: uuid(), foodId, quantity: used, date: dateKey(), partnerId: PARTNER_ID, createdAt: Date.now() });
    const v = await t.store('visits').get(cur.visitId);
    if (v) await t.store('visits').put({ ...v, interactions: [...v.interactions, { type: 'meal', at: Date.now(), detail: food.name }] });
  });
  await grantLove('meal');
  return { used };
}

export async function readTogether(bookId: string, note?: string) {
  const book = await db.get('books', bookId);
  if (!book) throw new GameError('找不到這本書');
  await db.put('readTogether', { id: uuid(), bookId, bookTitle: book.title, date: dateKey(), partnerId: PARTNER_ID, note, createdAt: Date.now() });
  await logInteraction('read', book.title);
  return book;
}

export async function giveGift(giftId: string) {
  const g = GIFTS.find((x) => x.id === giftId);
  if (!g) throw new GameError('找不到禮物');
  await db.tx(['wallet'], 'readwrite', (t) => txSpend(t, g.price, `送陳卷毛「${g.name}」`, { type: 'gift', id: g.id }));
  await logInteraction('gift', g.name);
  return g;
}

// ───────── memories & anniversaries ─────────
export async function saveMemory(m: Partial<LoveMemory> & { title: string; content: string; sourceType: LoveMemory['sourceType'] }) {
  if (!m.title.trim()) throw new GameError('幫這段回憶取個標題吧');
  const now = Date.now();
  const row: LoveMemory = { id: m.id ?? uuid(), title: m.title.trim(), content: m.content, date: m.date || dateKey(), photoIds: m.photoIds ?? [], sourceType: m.sourceType, createdAt: m.createdAt ?? now, updatedAt: now };
  await db.put('loveMemories', row);
  return row;
}
export function deleteMemory(id: string) { return db.delete('loveMemories', id); }

export async function saveAnniversary(name: string, date: string, id?: string) {
  if (!name.trim() || !date) throw new GameError('請輸入名稱和日期');
  await db.put('anniversaries', { id: id ?? uuid(), name: name.trim(), date, createdAt: Date.now() });
}
export function deleteAnniversary(id: string) { return db.delete('anniversaries', id); }

export async function updateRelationship(patch: Partial<RelationshipSettings>) {
  await db.tx(['relationship'], 'readwrite', async (t) => {
    const cur = await t.store('relationship').get('main');
    await t.store('relationship').put({ id: 'main', partnerDisplayName: '陳卷毛', unlockedInteractions: [], ...cur, ...patch, updatedAt: Date.now() } as RelationshipSettings);
  });
}
