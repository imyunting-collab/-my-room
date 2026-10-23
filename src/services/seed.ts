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
      for (const f of FURNITURE.filter((f) => f.starter && f.starter.room !== 'kitchen')) {
        await t.store('ownedFurniture').put({ id: uuid(), defId: f.id, roomId: f.starter!.room, x: f.starter!.x, y: f.starter!.y, purchasedAt: now });
      }
      for (const c of CLOTHING.filter((c) => c.starter)) await t.store('ownedClothing').put({ id: uuid(), defId: c.id, purchasedAt: now });
      await meta.put({ key: 'equip:99', value: DEFAULT_EQUIP['99'] });
      await meta.put({ key: 'equip:chen', value: DEFAULT_EQUIP.chen });
      for (const id of ['bedroom', 'study', 'balcony'] as const) await t.store('room').put({ id, wallpaper: 'cream', floor: 'wood', updatedAt: now });
      await meta.put({ key: 'seed:life', value: now });
    }
    if (!(await flag('seed:kitchen'))) {
      // 廚房：冰箱搬過來，預設有流理臺、洗手台、餐桌和兩張餐椅
      const owned = await t.store('ownedFurniture').all();
      for (const f of owned) {
        if (f.defId.startsWith('fridge') && f.roomId && f.roomId !== 'kitchen') await t.store('ownedFurniture').put({ ...f, roomId: 'kitchen', x: 170, y: 140 });
      }
      const place = async (defId: string, x: number, y: number, flip = false) => t.store('ownedFurniture').put({ id: uuid(), defId, roomId: 'kitchen', x, y, flip, purchasedAt: now });
      const has = (defId: string) => owned.some((f) => f.defId === defId);
      if (!owned.some((f) => f.defId.startsWith('fridge'))) await place('fridge_cream', 170, 140);
      if (!has('counter_wood')) await place('counter_wood', 46, 140);
      if (!has('sink_white')) await place('sink_white', 104, 140);
      if (!has('table_kitchen')) await place('table_kitchen', 96, 200);
      if (!has('chair_kitchen')) { await place('chair_kitchen', 66, 206); await place('chair_kitchen', 126, 206, true); }
      if (!(await t.store('room').get('kitchen'))) await t.store('room').put({ id: 'kitchen', wallpaper: 'tile', floor: 'check', updatedAt: now });
      await meta.put({ key: 'seed:kitchen', value: now });
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
