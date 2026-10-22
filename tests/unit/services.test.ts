// Service tests — run inside real Chromium against real IndexedDB (each test gets a fresh database).
import { Database, useDatabase, db } from '../../src/db/idb';
import { ensureSeed } from '../../src/services/seed';
import { addBook, deleteSession, saveSession, updateBook, checkAchievements } from '../../src/services/reading';
import { balance } from '../../src/services/wallet';
import { buyFurniture, buyFood, buyPlant, eatFood, placeFurniture, growPlant, plantStatus, waterPlant, equipItem, buyClothing, getEquip, refreshPlants } from '../../src/services/life';
import { saveDiary } from '../../src/services/journal';
import { startVisit, endVisit, shareMeal, getVisit, readTogether, saveMemory } from '../../src/services/love';
import { exportBackup, applyBackup, parseBackup, summarize } from '../../src/services/backup';
import { shelfBooks } from '../../src/components/shelf';
import { dayPartOf, DEFAULT_DAYPARTS, dateKey } from '../../src/lib/util';
import { plantById } from '../../src/data/catalog';
import { computeStats } from '../../src/data/achievements';

type T = { name: string; fn: () => Promise<void> };
const tests: T[] = [];
const test = (name: string, fn: () => Promise<void>) => tests.push({ name, fn });
function expect(a: any) {
  return {
    toBe: (b: any) => { if (a !== b) throw new Error(`expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); },
    toBeTruthy: () => { if (!a) throw new Error(`expected truthy, got ${JSON.stringify(a)}`); },
    toBeGreaterThan: (b: number) => { if (!(a > b)) throw new Error(`expected > ${b}, got ${a}`); },
  };
}
async function rejects(p: Promise<unknown>, msg?: string) {
  try { await p; } catch (e) { if (msg && !String((e as Error).message).includes(msg)) throw new Error(`wrong error: ${(e as Error).message}`); return; }
  throw new Error('expected rejection');
}
let n = 0;
async function fresh() { db.close(); useDatabase(new Database(`test-${Date.now()}-${n++}`)); await ensureSeed(); }
const book = (title = '小王子', totalPages = 100) => addBook({ title, author: 'A', category: '文學小說', totalPages, tags: [] });

test('新增書籍後書架增加一本書', async () => {
  await fresh();
  expect(shelfBooks(await db.all('books')).length).toBe(0);
  await book();
  expect(shelfBooks(await db.all('books')).length).toBe(1);
});
test('同一本書多次閱讀，書架仍只有一本', async () => {
  await fresh();
  const b = await book();
  for (let i = 0; i < 3; i++) await saveSession({ bookId: b.id, date: dateKey(), minutes: 10, startPage: i * 10, endPage: i * 10 + 10 });
  expect(shelfBooks(await db.all('books')).length).toBe(1);
  expect((await db.all('sessions')).length).toBe(3);
});
test('閱讀紀錄可新增、編輯、刪除，並更新進度', async () => {
  await fresh();
  const b = await book();
  const r = await saveSession({ bookId: b.id, date: dateKey(), minutes: 15, startPage: 0, endPage: 30, quote: '一句話' });
  expect(r.session.pages).toBe(30);
  expect((await db.get('books', b.id))!.currentPage).toBe(30);
  expect((await db.all('quotes')).length).toBe(1);
  await saveSession({ id: r.session.id, bookId: b.id, date: dateKey(), minutes: 25, startPage: 0, endPage: 40 });
  expect((await db.get('sessions', r.session.id))!.minutes).toBe(25);
  expect((await db.all('quotes')).length).toBe(0);
  await deleteSession(r.session.id);
  expect((await db.all('sessions')).length).toBe(0);
});
test('知識幣不會重複發放（編輯不發幣、每日目標只一次）', async () => {
  await fresh();
  const start = await balance();
  const b = await book();
  const r1 = await saveSession({ bookId: b.id, date: dateKey(), minutes: 25, pages: 10 });
  expect(r1.coins).toBe(5 + 5 + 10); // record + 20min + daily goal(20)
  const afterFirst = await balance();
  await saveSession({ id: r1.session.id, bookId: b.id, date: dateKey(), minutes: 60, pages: 50 });
  expect(await balance()).toBe(afterFirst);
  const r2 = await saveSession({ bookId: b.id, date: dateKey(), minutes: 30, pages: 5 });
  expect(r2.coins).toBe(5);
  expect(await balance()).toBe(start + 25);
});
test('完成一本書只獲得一次 30 幣', async () => {
  await fresh();
  const b = await book();
  const before = await balance();
  await saveSession({ bookId: b.id, date: dateKey(), minutes: 0, pages: 0, markFinished: true });
  expect(await balance()).toBe(before + 30);
  await updateBook(b.id, { status: 'reading' });
  await updateBook(b.id, { status: 'finished' });
  expect(await balance()).toBe(before + 30);
});
test('成就解鎖與獎勵只發一次', async () => {
  await fresh();
  const b = await book();
  await saveSession({ bookId: b.id, date: dateKey(), minutes: 5, pages: 1 });
  const a1 = await checkAchievements();
  expect(a1.some((a) => a.id === 'first')).toBe(true);
  const bal = await balance();
  const a2 = await checkAchievements();
  expect(a2.length).toBe(0);
  expect(await balance()).toBe(bal);
});
test('家具購買後在收納箱，可以擺放；不可重複購買', async () => {
  await fresh();
  const before = await balance();
  await buyFurniture('chair_cafe');
  expect(await balance()).toBe(before - 45);
  const f = (await db.byIndex('ownedFurniture', 'defId', 'chair_cafe'))[0];
  expect(f.roomId).toBe(null);
  await placeFurniture(f.id, 'study', 100, 200);
  expect((await db.get('ownedFurniture', f.id))!.roomId).toBe('study');
  await rejects(buyFurniture('chair_cafe'), '已經擁有');
});
test('快速連續點擊購買不會重複扣款', async () => {
  await fresh();
  const before = await balance();
  const results = await Promise.allSettled([buyFurniture('rug_forest'), buyFurniture('rug_forest'), buyFurniture('rug_forest')]);
  expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1);
  expect(await balance()).toBe(before - 40);
  expect((await db.byIndex('ownedFurniture', 'defId', 'rug_forest')).length).toBe(1);
});
test('知識幣不足不能購買、餘額不會低於 0', async () => {
  await fresh();
  await rejects(buyFurniture('sofa_love'), '知識幣不足');
  expect(await balance()).toBe(100);
});
test('未解鎖的家具不能購買', async () => {
  await fresh();
  await rejects(buyFurniture('desk_dark'), '還沒解鎖');
});
test('真實時間日夜區間（含跨午夜）', async () => {
  expect(dayPartOf(7)).toBe('dawn');
  expect(dayPartOf(12)).toBe('day');
  expect(dayPartOf(17.5)).toBe('dusk');
  expect(dayPartOf(21)).toBe('night');
  expect(dayPartOf(3)).toBe('midnight');
  expect(dayPartOf(23.9, { ...DEFAULT_DAYPARTS, midnight: 23 })).toBe('midnight');
  expect(dayPartOf(1, { midnight: 22, dawn: 5, day: 8, dusk: 16, night: 18 })).toBe('midnight');
});
test('換裝：獨立替換單一部位', async () => {
  await fresh();
  await buyClothing('shoes_maryjane');
  await equipItem('99', 'shoes', 'shoes_maryjane');
  const e = await getEquip('99');
  expect(e.shoes).toBe('shoes_maryjane');
  expect(e.top).toBe('top_sweat_brown');
  expect(e.bottom).toBe('bottom_plaid_brown');
  await rejects(equipItem('99', 'top', 'top_knit_cream'), '還沒擁有');
});
test('三種設備共用同一份日記資料', async () => {
  await fresh();
  await saveDiary({ title: '電腦寫的', content: '今天很好', template: 'life' });
  const again = new Database(db.name); // another "device view" opening the same local DB
  const rows = await again.all('diary');
  expect(rows.length).toBe(1);
  expect(rows[0].title).toBe('電腦寫的');
  again.close();
});
test('冰箱庫存：買、吃、不足不能吃', async () => {
  await fresh();
  await buyFood('pudding', 2);
  await eatFood('pudding');
  expect((await db.get('foodInventory', 'pudding'))!.quantity).toBe(1);
  await eatFood('pudding');
  await rejects(eatFood('pudding'), '沒有');
});
test('植物購買、擺放、澆水，依經過時間成長且不會枯死', async () => {
  await fresh();
  const p = await buyPlant('daisy');
  expect(p.slot).toBe(0);
  const def = plantById.get('daisy')!;
  const h = 3600000;
  const grown = growPlant(p, def, p.lastUpdatedAt + 20 * h);
  expect(plantStatus(grown, def, p.lastUpdatedAt + 20 * h).stage).toBe(1);
  const later = p.lastUpdatedAt + 1000 * h; // away a long time
  const st = plantStatus(growPlant(p, def, later), def, later);
  expect(st.health).toBe('needsWater'); // paused, never dead
  expect(['healthy', 'thirsty', 'needsWater'].includes(st.health)).toBe(true);
  expect(await waterPlant(p.id)).toBe('tooSoon');
  expect(await waterPlant(p.id, Date.now() + 2 * h)).toBe('watered');
  await refreshPlants();
});
test('陳卷毛到訪：開始、共同用餐扣庫存、離開', async () => {
  await fresh();
  await rejects(shareMeal('cake'), '先邀請');
  await startVisit();
  expect((await getVisit()).active).toBe(true);
  await rejects(shareMeal('cake'), '不夠');
  await buyFood('cake', 3);
  const r = await shareMeal('cake');
  expect(r.used).toBe(2);
  expect((await db.get('foodInventory', 'cake'))!.quantity).toBe(1);
  expect((await db.all('meals')).length).toBe(1);
  await endVisit();
  expect((await getVisit()).active).toBe(false);
  const v = (await db.all('visits'))[0];
  expect(!!v.departedAt).toBe(true);
  expect(v.interactions[0].type).toBe('meal');
});
test('備份與還原包含戀愛資料與照片，合併不重複', async () => {
  await fresh();
  const b = await book('備份測試');
  await saveSession({ bookId: b.id, date: dateKey(), minutes: 20, pages: 3 });
  const photoId = 'p1';
  await db.put('photos', { id: photoId, blob: new Blob(['hello'], { type: 'image/png' }), type: 'image/png', createdAt: 1 });
  await startVisit();
  await readTogether(b.id);
  await saveMemory({ title: '第一次', content: '真實的回憶', sourceType: 'real', photoIds: [photoId] });
  await saveDiary({ title: '日記', content: 'x', template: 'love' });
  const file = parseBackup(JSON.stringify(await exportBackup()));
  const balBefore = await balance();
  // restore into a brand-new device
  await fresh();
  const s = await summarize(file);
  expect(s.alreadyImported).toBe(false);
  await applyBackup(file, 'overwrite');
  expect((await db.all('loveMemories'))[0].sourceType).toBe('real');
  expect((await db.all('readTogether')).length).toBe(1);
  expect((await db.all('diary')).length).toBe(1);
  expect(await (await db.get('photos', photoId))!.blob.text()).toBe('hello');
  expect(await balance()).toBe(balBefore);
  // merging the same file again adds nothing new
  const s2 = await summarize(file);
  expect(s2.alreadyImported).toBe(true);
  const r = await applyBackup(file, 'merge');
  expect(r.added).toBe(0);
  expect(await balance()).toBe(balBefore);
});
test('還原失敗時不破壞原有資料', async () => {
  await fresh();
  await book('原本的書');
  const bad = { app: 'MY ROOM', format: 'my-room-backup', schemaVersion: 3, exportId: 'x', exportedAt: '', counts: {}, data: { wallet: [{ id: 'a', amount: 1, reason: 'r', rewardKey: 'dup', createdAt: 1 }, { id: 'b', amount: 1, reason: 'r', rewardKey: 'dup', createdAt: 1 }] } } as any;
  await rejects(applyBackup(bad, 'overwrite'));
  expect((await db.all('books')).length).toBe(1);
  await rejects(Promise.resolve().then(() => parseBackup('{"nope":1}')), '不是 MY ROOM');
});
test('資料庫升級（v1 → v3）不會刪除原有閱讀資料', async () => {
  const name = `migrate-${Date.now()}`;
  const v1 = new Database(name, 1);
  await v1.put('books', { id: 'old', title: '舊書', author: '', category: '散文', totalPages: 10, currentPage: 5, status: 'reading', tags: [], createdAt: 1, updatedAt: 1 });
  v1.close();
  await new Promise((r) => setTimeout(r, 50));
  db.close();
  useDatabase(new Database(name));
  await ensureSeed();
  expect((await db.get('books', 'old'))!.title).toBe('舊書');
  expect((await db.all('ownedFurniture')).length).toBeGreaterThan(0);
  expect((await db.all('contacts')).length).toBe(1);
});
test('閱讀統計由真實資料計算（連續天數）', async () => {
  const s = (date: string) => ({ id: date, bookId: 'b', date, minutes: 10, pages: 5, photoIds: [], tags: [], createdAt: 0 });
  const st = computeStats([], [s('2026-01-01'), s('2026-01-02'), s('2026-01-03'), s('2026-01-05')], '2026-01-05');
  expect(st.longestStreak).toBe(3);
  expect(st.currentStreak).toBe(1);
  expect(st.totalPages).toBe(20);
});

(window as any).runTests = async () => {
  const results: { name: string; ok: boolean; err?: string }[] = [];
  for (const t of tests) {
    try { await t.fn(); results.push({ name: t.name, ok: true }); }
    catch (e) { results.push({ name: t.name, ok: false, err: String((e as Error)?.stack ?? e) }); }
  }
  return results;
};
