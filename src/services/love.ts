// 戀愛系統：遊戲內聊天、模擬通話、到訪、共同用餐/閱讀、戀愛回憶、紀念日。
// 陳卷毛的所有回覆都是遊戲內虛構台詞，不會冒充真實訊息。
import { db } from '../db/idb';
import type { ChatMessage, LoveMemory, RelationshipSettings, VisitRecord } from '../db/types';
import { CHAT_TOPICS, EVENT_LINES, type Line } from '../data/dialogue';
import { foodById, GIFTS } from '../data/catalog';
import { emit } from '../lib/bus';
import { dateKey, pick, uuid } from '../lib/util';
import { PARTNER_ID } from './seed';
import { GameError, txSpend } from './wallet';

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
  const lines = pick(topic.replies);
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
}

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
}

export async function endVisit() {
  await db.tx(['meta', 'visits'], 'readwrite', async (t) => {
    const cur = (await t.store('meta').get('visit'))?.value as VisitState | undefined;
    if (cur?.visitId) {
      const v = await t.store('visits').get(cur.visitId);
      if (v && !v.departedAt) await t.store('visits').put({ ...v, departedAt: Date.now() });
    }
    await t.store('meta').put({ key: 'visit', value: { active: false } });
  });
}

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
