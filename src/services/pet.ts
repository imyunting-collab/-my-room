// 黑白貓（賓士貓）：在房間閒晃、睡在剛讀完的書上、用冰箱的食物餵。
import { db } from '../db/idb';
import { foodById } from '../data/catalog';
import { dateKey, pick } from '../lib/util';
import { GameError } from './wallet';

export interface PetState { name: string; affection: number; fedAt: number; fedDay: string; pettedDay: string; lastFood?: string }
export const DEFAULT_PET: PetState = { name: '芝麻', affection: 0, fedAt: 0, fedDay: '', pettedDay: '' };
export async function getPet(): Promise<PetState> { return { ...DEFAULT_PET, ...(await db.getKV<Partial<PetState>>('meta', 'pet', {})) }; }
async function savePet(p: PetState) { await db.setKV('meta', 'pet', p); }

export async function renamePet(name: string) { const p = await getPet(); await savePet({ ...p, name: name.trim().slice(0, 8) || DEFAULT_PET.name }); }
export async function petThePet(): Promise<string> {
  const p = await getPet(), today = dateKey();
  await savePet({ ...p, affection: p.affection + (p.pettedDay === today ? 0 : 1), pettedDay: today });
  return pick(['呼嚕呼嚕～', '喵～（蹭蹭）', '牠瞇起眼睛了', '肚子給妳摸！']);
}
/** Uses one portion of food from the fridge. */
export async function feedPet(foodId: string): Promise<string> {
  const food = foodById.get(foodId);
  if (!food) throw new GameError('找不到食物');
  let line = '';
  await db.tx(['foodInventory', 'meta'], 'readwrite', async (t) => {
    const inv = await t.store('foodInventory').get(foodId);
    if (!inv || inv.quantity < 1) throw new GameError('冰箱裡沒有這個了');
    await t.store('foodInventory').put({ ...inv, quantity: inv.quantity - 1, updatedAt: Date.now() });
    const p = { ...DEFAULT_PET, ...(((await t.store('meta').get('pet'))?.value as Partial<PetState>) ?? {}) };
    const today = dateKey();
    await t.store('meta').put({ key: 'pet', value: { ...p, fedAt: Date.now(), fedDay: today, lastFood: foodId, affection: p.affection + (p.fedDay === today ? 0 : 2) } });
    line = foodId === 'milk' ? '咕嚕咕嚕喝光了！' : foodId === 'onigiri' ? '鮭魚的部分先吃掉了 🐟' : pick([`${food.name}！牠吃得好開心`, '吃飽了，在舔爪子', '喵！（再一口）']);
  });
  return line;
}
export function petMood(p: PetState) { return p.fedDay === dateKey() ? '吃飽飽' : '有點餓'; }
