// Shop, room layout, wardrobe, fridge, balcony plants.
import { db } from '../db/idb';
import type { CharacterId, Equip, OwnedPlant, RoomId, Slot } from '../db/types';
import { BALCONY_SLOTS, clothById, deviceById, foodById, furnById, plantById, type PlantDef, type Unlock } from '../data/catalog';
import { achievementById } from '../data/achievements';
import { clamp, uuid } from '../lib/util';
import { GameError, txSpend } from './wallet';

// ───────── unlock conditions ─────────
export interface UnlockCtx { achievements: Set<string>; books: number; pages: number }
export async function unlockContext(): Promise<UnlockCtx> {
  return db.tx(['achievements', 'books', 'sessions'], 'readonly', async (t) => ({
    achievements: new Set((await t.store('achievements').all()).map((a) => a.id)),
    books: await t.store('books').count(),
    pages: (await t.store('sessions').all()).reduce((s, x) => s + x.pages, 0),
  }));
}
export function isUnlocked(u: Unlock | undefined, c: UnlockCtx): boolean {
  if (!u) return true;
  if (u.kind === 'achievement') return c.achievements.has(u.id);
  if (u.kind === 'books') return c.books >= u.n;
  return c.pages >= u.n;
}
export function unlockText(u?: Unlock): string {
  if (!u) return '';
  if (u.kind === 'achievement') return `解鎖條件：成就「${achievementById.get(u.id)?.name ?? u.id}」`;
  if (u.kind === 'books') return `解鎖條件：藏書 ${u.n} 本`;
  return `解鎖條件：累積 ${u.n} 頁`;
}

// ───────── purchases (atomic: balance check + debit + ownership in one transaction) ─────────
export async function buyFurniture(defId: string) {
  const def = furnById.get(defId);
  if (!def) throw new GameError('找不到商品');
  if (!isUnlocked(def.unlock, await unlockContext())) throw new GameError('這件家具還沒解鎖');
  await db.tx(['ownedFurniture', 'wallet'], 'readwrite', async (t) => {
    if ((await t.store('ownedFurniture').byIndex('defId', defId)).length) throw new GameError('已經擁有這件家具了');
    await txSpend(t, def.price, `購買家具「${def.name}」`, { type: 'furniture', id: defId });
    await t.store('ownedFurniture').add({ id: uuid(), defId, roomId: null, x: 96, y: 180, purchasedAt: Date.now() });
  });
}

export async function buyDevice(defId: string) {
  const def = deviceById.get(defId);
  if (!def) throw new GameError('找不到商品');
  await db.tx(['ownedDevices', 'wallet'], 'readwrite', async (t) => {
    if ((await t.store('ownedDevices').byIndex('defId', defId)).length) throw new GameError('已經擁有這個設備了');
    await txSpend(t, def.price, `購買設備「${def.name}」`, { type: 'device', id: defId });
    await t.store('ownedDevices').add({ id: uuid(), defId, isPlaced: false, roomId: null, x: 0, y: 0, purchasedAt: Date.now() });
  });
}

export async function buyClothing(defId: string) {
  const def = clothById.get(defId);
  if (!def) throw new GameError('找不到商品');
  if (!isUnlocked(def.unlock, await unlockContext())) throw new GameError('這件衣服還沒解鎖');
  await db.tx(['ownedClothing', 'wallet'], 'readwrite', async (t) => {
    if ((await t.store('ownedClothing').byIndex('defId', defId)).length) throw new GameError('已經擁有這件了');
    await txSpend(t, def.price, `購買服裝「${def.name}」`, { type: 'clothing', id: defId });
    await t.store('ownedClothing').add({ id: uuid(), defId, purchasedAt: Date.now() });
  });
}

export async function buyFood(foodId: string, qty = 1) {
  const def = foodById.get(foodId);
  if (!def) throw new GameError('找不到食物');
  if (qty < 1 || qty > 20) throw new GameError('一次可買 1–20 份');
  await db.tx(['foodInventory', 'wallet'], 'readwrite', async (t) => {
    await txSpend(t, def.price * qty, `購買食物「${def.name}」×${qty}`, { type: 'food', id: foodId });
    const inv = await t.store('foodInventory').get(foodId);
    await t.store('foodInventory').put({ foodId, quantity: (inv?.quantity ?? 0) + qty, updatedAt: Date.now() });
  });
}

export async function buyPlant(defId: string): Promise<OwnedPlant> {
  const def = plantById.get(defId);
  if (!def) throw new GameError('找不到植物');
  if (!isUnlocked(def.unlock, await unlockContext())) throw new GameError('這盆植物還沒解鎖');
  let plant!: OwnedPlant;
  await db.tx(['ownedPlants', 'wallet'], 'readwrite', async (t) => {
    await txSpend(t, def.price, `購買盆栽「${def.name}」`, { type: 'plant', id: defId });
    const used = new Set((await t.store('ownedPlants').all()).map((p) => p.slot).filter((s) => s != null));
    let slot: number | null = null;
    for (let i = 0; i < BALCONY_SLOTS; i++) if (!used.has(i)) { slot = i; break; }
    const now = Date.now();
    plant = { id: uuid(), defId, slot, purchasedAt: now, lastWateredAt: now, growthMinutes: 0, lastUpdatedAt: now };
    await t.store('ownedPlants').add(plant);
  });
  return plant;
}

// ───────── room layout ─────────
export const ROOM_W = 192, ROOM_H = 240, FLOOR_Y = 118;

/** Clamp a furniture anchor (bottom-centre) to where that kind of piece is allowed to stand. */
export function furniturePos(def: { w: number; h: number; placement: string }, x: number, y: number) {
  const minY = def.placement === 'wall' ? def.h + 6 : def.placement === 'surface' ? 40 : FLOOR_Y + 12;
  const maxY = def.placement === 'wall' ? FLOOR_Y - 2 : ROOM_H - 6;
  return { x: Math.round(clamp(x, def.w / 2 + 2, ROOM_W - def.w / 2 - 2)), y: Math.round(clamp(y, minY, maxY)) };
}
export function devicePos(x: number, y: number) {
  return { x: Math.round(clamp(x, 8, ROOM_W - 8)), y: Math.round(clamp(y, 40, ROOM_H - 6)) };
}

export async function placeFurniture(id: string, roomId: RoomId, x: number, y: number) {
  await db.tx(['ownedFurniture'], 'readwrite', async (t) => {
    const f = await t.store('ownedFurniture').get(id);
    if (!f) throw new GameError('找不到家具');
    const def = furnById.get(f.defId)!;
    await t.store('ownedFurniture').put({ ...f, roomId, ...furniturePos(def, x, y) });
  });
}
export async function storeFurniture(id: string) {
  await db.tx(['ownedFurniture'], 'readwrite', async (t) => {
    const f = await t.store('ownedFurniture').get(id);
    if (f) await t.store('ownedFurniture').put({ ...f, roomId: null });
  });
}
/** Replace a placed piece with another owned piece of the same category (keeps the position). */
export async function swapFurniture(placedId: string, replacementId: string) {
  await db.tx(['ownedFurniture'], 'readwrite', async (t) => {
    const a = await t.store('ownedFurniture').get(placedId);
    const b = await t.store('ownedFurniture').get(replacementId);
    if (!a || !b) throw new GameError('找不到家具');
    await t.store('ownedFurniture').put({ ...b, roomId: a.roomId, x: a.x, y: a.y });
    await t.store('ownedFurniture').put({ ...a, roomId: null });
  });
}
export async function placeDevice(id: string, roomId: RoomId | null, x = 0, y = 0) {
  await db.tx(['ownedDevices'], 'readwrite', async (t) => {
    const d = await t.store('ownedDevices').get(id);
    if (!d) throw new GameError('找不到設備');
    await t.store('ownedDevices').put({ ...d, roomId, isPlaced: !!roomId, ...devicePos(x, y) });
  });
}

// ───────── wardrobe ─────────
export async function getEquip(who: CharacterId): Promise<Equip> { return db.getKV<Equip>('meta', `equip:${who}`, {}); }
export async function equipItem(who: CharacterId, slot: Slot, defId: string | null) {
  await db.tx(['meta', 'ownedClothing'], 'readwrite', async (t) => {
    if (defId) {
      const def = clothById.get(defId);
      if (!def || def.slot !== slot || def.character !== who) throw new GameError('這件不能穿在這裡');
      if (!(await t.store('ownedClothing').byIndex('defId', defId)).length) throw new GameError('還沒擁有這件衣服');
    }
    if (!defId && (slot === 'top' || slot === 'bottom')) throw new GameError('上衣和下身不能空著喔');
    const row = await t.store('meta').get(`equip:${who}`);
    const equip = { ...((row?.value as Equip) ?? {}), [slot]: defId };
    await t.store('meta').put({ key: `equip:${who}`, value: equip });
  });
}
export async function saveOutfit(who: CharacterId, name: string) {
  const equip = await getEquip(who);
  await db.put('outfits', { id: uuid(), name: name.trim() || '我的穿搭', character: who, equip, createdAt: Date.now() });
}
export async function applyOutfit(id: string) {
  await db.tx(['outfits', 'meta', 'ownedClothing'], 'readwrite', async (t) => {
    const o = await t.store('outfits').get(id);
    if (!o) throw new GameError('找不到這套穿搭');
    for (const v of Object.values(o.equip)) if (v && !(await t.store('ownedClothing').byIndex('defId', v)).length) throw new GameError('這套穿搭裡有還沒擁有的單品');
    await t.store('meta').put({ key: `equip:${o.character}`, value: o.equip });
  });
}

// ───────── fridge ─────────
export async function eatFood(foodId: string, qty = 1) {
  await db.tx(['foodInventory'], 'readwrite', async (t) => {
    const inv = await t.store('foodInventory').get(foodId);
    if (!inv || inv.quantity < qty) throw new GameError('冰箱裡沒有這樣食物了');
    await t.store('foodInventory').put({ ...inv, quantity: inv.quantity - qty, updatedAt: Date.now() });
  });
}

// ───────── plants ─────────
export type PlantHealth = 'healthy' | 'thirsty' | 'needsWater';
export const HEALTH_LABEL: Record<PlantHealth, string> = { healthy: '健康', thirsty: '有點口渴', needsWater: '需要澆水（不會枯死）' };

/**
 * Growth advances with real elapsed time: full speed while watered, half speed while a bit thirsty,
 * paused when it really needs water. Plants never die from being away.
 */
export function growPlant(p: OwnedPlant, def: PlantDef, now = Date.now()): OwnedPlant {
  const interval = def.waterIntervalH * 3600000;
  const fullUntil = p.lastWateredAt + interval;
  const halfUntil = p.lastWateredAt + interval * 2;
  const from = p.lastUpdatedAt, to = Math.max(from, now);
  const seg = (a: number, b: number) => Math.max(0, Math.min(to, b) - Math.max(from, a));
  const gainedMs = seg(-Infinity, fullUntil) + seg(fullUntil, halfUntil) * 0.5;
  return { ...p, growthMinutes: p.growthMinutes + gainedMs / 60000, lastUpdatedAt: to };
}
export function plantStatus(p: OwnedPlant, def: PlantDef, now = Date.now()): { stage: number; health: PlantHealth; nextStageHours: number | null; progress: number } {
  const hours = p.growthMinutes / 60;
  let stage = 0;
  def.stageHours.forEach((h, i) => { if (hours >= h) stage = i + 1; });
  const since = now - p.lastWateredAt, interval = def.waterIntervalH * 3600000;
  const health: PlantHealth = since <= interval ? 'healthy' : since <= interval * 2 ? 'thirsty' : 'needsWater';
  const next = stage < 4 ? def.stageHours[stage] : null;
  const prev = stage === 0 ? 0 : def.stageHours[stage - 1];
  return { stage, health, nextStageHours: next ? Math.max(0, next - hours) : null, progress: next ? (hours - prev) / (next - prev) : 1 };
}
export async function refreshPlants(now = Date.now()) {
  await db.tx(['ownedPlants'], 'readwrite', async (t) => {
    for (const p of await t.store('ownedPlants').all()) {
      const def = plantById.get(p.defId);
      if (def) await t.store('ownedPlants').put(growPlant(p, def, now));
    }
  });
}
export async function waterPlant(id: string, now = Date.now()): Promise<'watered' | 'tooSoon'> {
  let res: 'watered' | 'tooSoon' = 'watered';
  await db.tx(['ownedPlants'], 'readwrite', async (t) => {
    const p = await t.store('ownedPlants').get(id);
    if (!p) throw new GameError('找不到植物');
    const def = plantById.get(p.defId)!;
    if (now - p.lastWateredAt < 60 * 60000) { res = 'tooSoon'; return; }
    const grown = growPlant(p, def, now);
    await t.store('ownedPlants').put({ ...grown, lastWateredAt: now });
  });
  return res;
}
export async function movePlant(id: string, slot: number | null) {
  await db.tx(['ownedPlants'], 'readwrite', async (t) => {
    const all = await t.store('ownedPlants').all();
    const p = all.find((x) => x.id === id);
    if (!p) throw new GameError('找不到植物');
    const other = slot == null ? undefined : all.find((x) => x.slot === slot && x.id !== id);
    if (other) await t.store('ownedPlants').put({ ...other, slot: p.slot });
    await t.store('ownedPlants').put({ ...p, slot });
  });
}

/** After buying a computer / tablet, put it on the study desk so it's ready to use. */
export async function autoPlaceDevice(defId: string) {
  const dev = deviceById.get(defId);
  if (!dev || dev.placement !== 'surface') return;
  await db.tx(['ownedDevices', 'ownedFurniture'], 'readwrite', async (t) => {
    const owned = (await t.store('ownedDevices').byIndex('defId', defId))[0];
    if (!owned || owned.isPlaced) return;
    const desks = (await t.store('ownedFurniture').all()).filter((f) => f.roomId && furnById.get(f.defId)?.category === 'desk');
    const desk = desks.find((d) => d.roomId === 'study') ?? desks[0];
    if (desk) {
      const dd = furnById.get(desk.defId)!;
      const dx = dev.deviceType === 'computer' ? 8 : -2;
      await t.store('ownedDevices').put({ ...owned, isPlaced: true, roomId: desk.roomId, x: desk.x + dx, y: desk.y - dd.h + 2 });
    }
  });
}
