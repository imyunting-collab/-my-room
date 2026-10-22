// First-run setup. Each block is guarded by a meta flag so it runs once — also after upgrading an older database.
import { db } from '../db/idb';
import { CLOTHING, DEVICES, FURNITURE } from '../data/catalog';
import { DEFAULT_EQUIP } from '../sprites/characters';
import { uuid } from '../lib/util';
import { txGrant } from './wallet';

export const PARTNER_ID = 'contact-chen';

export async function ensureSeed() {
  await db.tx(['meta', 'wallet', 'ownedFurniture', 'ownedClothing', 'ownedDevices', 'contacts', 'relationship', 'room', 'settings'], 'readwrite', async (t) => {
    const meta = t.store('meta');
    const flag = async (k: string) => !!(await meta.get(k));
    const now = Date.now();
    if (!(await flag('seed:core'))) {
      await txGrant(t, 'welcome', 100, '歡迎來到 MY ROOM！新手禮物');
      await t.store('settings').put({ key: 'dailyGoal', value: 20 });
      await meta.put({ key: 'seed:core', value: now });
    }
    if (!(await flag('seed:life'))) {
      for (const f of FURNITURE.filter((f) => f.starter)) {
        await t.store('ownedFurniture').put({ id: uuid(), defId: f.id, roomId: f.starter!.room, x: f.starter!.x, y: f.starter!.y, purchasedAt: now });
      }
      for (const c of CLOTHING.filter((c) => c.starter)) await t.store('ownedClothing').put({ id: uuid(), defId: c.id, purchasedAt: now });
      await meta.put({ key: 'equip:99', value: DEFAULT_EQUIP['99'] });
      await meta.put({ key: 'equip:chen', value: DEFAULT_EQUIP.chen });
      for (const id of ['bedroom', 'study', 'balcony'] as const) await t.store('room').put({ id, wallpaper: 'cream', floor: 'wood', updatedAt: now });
      await meta.put({ key: 'seed:life', value: now });
    }
    if (!(await flag('seed:love'))) {
      for (const d of DEVICES.filter((d) => d.starter)) {
        await t.store('ownedDevices').put({ id: uuid(), defId: d.id, isPlaced: true, roomId: d.starter!.room, x: d.starter!.x, y: d.starter!.y, purchasedAt: now });
      }
      await t.store('contacts').put({ id: PARTNER_ID, displayName: '陳卷毛', avatarAsset: 'chen', contactType: 'partner' });
      await t.store('relationship').put({ id: 'main', partnerDisplayName: '陳卷毛', unlockedInteractions: ['chat', 'call', 'visit', 'hug', 'kiss', 'sit', 'meal', 'read', 'movie', 'diary', 'gift'], updatedAt: now });
      await meta.put({ key: 'phoneSkin', value: 'phone_basic' });
      await meta.put({ key: 'seed:love', value: now });
    }
  });
}
