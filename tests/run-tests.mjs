// Runs the MY ROOM test suite in real Chromium (Playwright):
//  1) service/unit tests against real IndexedDB
//  2) end-to-end UI flows on an iPhone-sized viewport against the production build in dist/
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';
import { serve } from '../scripts/serve.mjs';

const unitOnly = process.argv.includes('--unit');
const root = path.resolve('dist');
if (!fs.existsSync(path.join(root, 'index.html'))) { console.error('請先執行 npm run build'); process.exit(1); }
fs.mkdirSync(path.join(root, '__tests__'), { recursive: true });
await esbuild.build({ entryPoints: ['tests/unit/services.test.ts'], bundle: true, format: 'esm', outfile: path.join(root, '__tests__/unit.js'), logLevel: 'warning', jsx: 'automatic' });
fs.writeFileSync(path.join(root, '__tests__/index.html'), '<!doctype html><meta charset="utf-8"><script type="module" src="./unit.js"></script>');

const PORT = 4199;
const server = await serve(root, PORT);
const browser = await chromium.launch();
let failed = 0, passed = 0;
const report = (name, ok, err) => { ok ? passed++ : failed++; console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : '\n    ' + String(err).split('\n').slice(0, 4).join('\n    ')}`); };

try {
  console.log('\n── 單元測試（服務層 + IndexedDB）──');
  const p = await browser.newPage();
  await p.goto(`http://localhost:${PORT}/__tests__/index.html`);
  await p.waitForFunction(() => typeof window.runTests === 'function');
  for (const r of await p.evaluate(() => window.runTests())) report(r.name, r.ok, r.err);
  await p.close();

  if (!unitOnly) {
    console.log('\n── 端對端測試（iPhone 畫面）──');
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const go = async (h) => { await page.goto(`http://localhost:${PORT}/#/more`); await page.goto(`http://localhost:${PORT}/#${h}`); await page.waitForTimeout(400); };
    const e2e = async (name, fn) => { try { await fn(); report(name, true); } catch (e) { report(name, false, e.message); await page.screenshot({ path: `dist/__tests__/fail-${passed + failed}.png` }); } };
    const coins = async () => Number(await page.locator('[data-testid=coin-balance]').textContent());
    const grant = (n) => page.evaluate((n) => new Promise((res, rej) => {
      const r = indexedDB.open('my-room-db');
      r.onsuccess = () => { const tx = r.result.transaction('wallet', 'readwrite'); tx.objectStore('wallet').put({ id: 'test-grant-' + Math.random(), amount: n, reason: '測試加幣', createdAt: Date.now() }); tx.oncomplete = () => { r.result.close(); res(); }; tx.onerror = () => rej(tx.error); };
    }), n);

    await go('/');
    await e2e('首頁時鐘顯示裝置真實時間', async () => {
      const t = (await page.locator('[data-testid=home-clock]').textContent()).trim();
      const now = await page.evaluate(() => { const d = new Date(); return [d.getHours(), d.getMinutes()].map((x) => String(x).padStart(2, '0')).join(':'); });
      if (t !== now) throw new Error(`${t} != ${now}`);
    });
    await e2e('新增書籍後動態書架多一本書', async () => {
      await go('/library');
      await page.click('[data-testid=add-book]');
      await page.fill('input[name=title]', '小王子');
      await page.fill('input[name=totalPages]', '120');
      await page.click('button:has-text("加入書庫")');
      await page.waitForTimeout(300);
      await go('/bookshelf');
      if ((await page.locator('[data-testid=spine]').count()) !== 1) throw new Error('spine count');
    });
    await e2e('新增閱讀紀錄得到知識幣，同一本書書架仍只有一本', async () => {
      const before = await coins();
      for (const [a, b] of [['0', '20'], ['20', '45']]) {
        await go('/add');
        await page.fill('input[name=minutes]', '25');
        await page.fill('input[name=startPage]', a);
        await page.fill('input[name=endPage]', b);
        await page.click('[data-testid=save-session]');
        await page.waitForURL(/#\/book\//);
      }
      if ((await coins()) <= before) throw new Error('no coins');
      await go('/bookshelf');
      if ((await page.locator('[data-testid=spine]').count()) !== 1) throw new Error('duplicated spine');
    });
    await e2e('房間書架從真實書籍生成', async () => {
      await go('/room?scene=study');
      if (!(await page.locator('[data-testid=furn-bookshelf]').count())) throw new Error('no shelf');
    });
    await e2e('點椅子角色坐下，再點起身', async () => {
      await go('/room?scene=study');
      await page.locator('[data-testid=furn-chair]').click({ force: true });
      await page.waitForFunction(() => document.querySelector('[data-testid=actor-99]')?.getAttribute('data-pose') === 'sit', null, { timeout: 5000 });
      await page.locator('[data-testid=furn-chair]').click({ force: true });
      await page.waitForFunction(() => document.querySelector('[data-testid=actor-99]')?.getAttribute('data-pose') === 'stand', null, { timeout: 5000 });
    });
    await e2e('購買家具並擺進房間', async () => {
      await go('/shop');
      await page.locator('[data-testid=shop-chair_candy] [data-testid=buy]').click();
      await page.waitForTimeout(300);
      await go('/room?scene=bedroom');
      await page.click('button:has-text("收納箱")');
      await page.click('[data-testid=place-item]');
      const box = await page.locator('[data-testid=room-scene]').boundingBox();
      await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.85);
      await page.waitForTimeout(400);
      if (!(await page.locator('[data-defid=chair_candy]').count())) throw new Error('not placed');
    });
    await e2e('角色可以獨立換裝（只換鞋子）', async () => {
      await grant(200);
      await go('/wardrobe');
      const before = await page.locator('[data-testid=wardrobe-preview]').getAttribute('src');
      await page.click('button:has-text("鞋子")');
      await page.locator('[data-testid=cloth-shoes_maryjane] button:has-text("購買")').click();
      await page.waitForTimeout(400);
      const after = await page.locator('[data-testid=wardrobe-preview]').getAttribute('src');
      if (before === after) throw new Error('preview unchanged');
      const eq = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('my-room-db'); r.onsuccess = () => { const g = r.result.transaction('meta').objectStore('meta').get('equip:99'); g.onsuccess = () => { res(g.result.value); r.result.close(); }; }; }));
      if (eq.shoes !== 'shoes_maryjane' || eq.top !== 'top_sweat_brown') throw new Error(JSON.stringify(eq));
    });
    await e2e('購買電腦與平板後可以開啟，手機可開啟', async () => {
      await grant(300);
      await go('/shop?tab=devices');
      await page.locator('[data-testid=shop-computer_retro] [data-testid=buy]').click(); await page.waitForTimeout(300);
      await page.locator('[data-testid=shop-tablet_cream] [data-testid=buy]').click(); await page.waitForTimeout(300);
      await go('/computer'); await page.waitForSelector('[data-testid=computer-screen]');
      await go('/tablet'); await page.waitForSelector('[data-testid=tablet-screen]');
      await go('/phone'); await page.waitForSelector('[data-testid=phone-app-diary]');
      await go('/room?scene=study');
      if (!(await page.locator('[data-testid=device-computer]').count())) throw new Error('computer not on desk');
    });
    await e2e('在電腦寫日記，手機看得到；重新整理後仍存在', async () => {
      await go('/computer');
      await page.click('[data-testid=pc-app-diary]');
      await page.click('[data-testid=new-diary]');
      await page.fill('input[name=diary-title]', '電腦寫的日記');
      await page.fill('textarea[name=diary-content]', '今天有一個很可愛的瞬間。');
      await page.click('[data-testid=save-diary]');
      await page.waitForTimeout(300);
      await go('/phone');
      await page.click('[data-testid=phone-app-diary]');
      await page.waitForSelector('text=電腦寫的日記');
      await page.reload(); await page.waitForTimeout(500);
      await page.click('[data-testid=phone-app-diary]');
      await page.waitForSelector('text=電腦寫的日記');
    });
    await e2e('日記可以像書一樣翻閱，照片可以放大，從書裡可以進入編輯', async () => {
      // 1×1 png
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      await go('/diary');
      await page.click('[data-testid=new-diary]');
      await page.fill('input[name=diary-title]', '有照片的一天');
      await page.fill('textarea[name=diary-content]', '第一行\n第二行，翻頁看看。');
      await page.setInputFiles('[data-testid=diary-editor] input[type=file]', { name: 'a.png', mimeType: 'image/png', buffer: png });
      await page.waitForSelector('[data-testid=diary-editor] [data-testid=photo-thumb]');
      await page.click('[data-testid=diary-editor] [data-testid=photo-thumb]');
      await page.waitForSelector('[data-testid=photo-viewer] img');
      await page.click('[data-testid=photo-viewer-close]');
      await page.click('[data-testid=save-diary]');
      await page.waitForSelector('[data-testid=diary-row]:has-text("有照片的一天")');
      // tapping a row opens the book, NOT the editor
      await page.click('[data-testid=diary-row]:has-text("有照片的一天")');
      await page.waitForSelector('[data-testid=diary-book]');
      if (await page.locator('[data-testid=diary-editor]').count()) throw new Error('editor opened instead of book');
      const cur = page.locator('[data-testid=diary-book] [data-testid=book-page]').last();
      if (!(await cur.textContent()).includes('第二行，翻頁看看。')) throw new Error('full text not shown');
      await page.click('[data-testid=book-photo]');
      await page.waitForSelector('[data-testid=photo-viewer] img');
      await page.keyboard.press('Escape');
      await page.waitForSelector('[data-testid=photo-viewer]', { state: 'detached' });
      // flip back to the earlier entry and forward again
      await page.click('[data-testid=book-prev]');
      await page.waitForTimeout(700);
      if (!(await page.locator('[data-testid=diary-book] [data-testid=book-page]').last().textContent()).includes('電腦寫的日記')) throw new Error('prev page wrong');
      await page.click('[data-testid=book-next]');
      await page.waitForTimeout(700);
      if (!(await page.locator('[data-testid=diary-book] [data-testid=book-page]').last().textContent()).includes('有照片的一天')) throw new Error('next page wrong');
      // edit from the book, come back to the book
      await page.click('[data-testid=book-edit]');
      await page.fill('input[name=diary-title]', '有照片的一天（改）');
      await page.click('[data-testid=save-diary]');
      await page.waitForSelector('[data-testid=diary-book] >> text=有照片的一天（改）');
      await page.click('[data-testid=book-close]');
      await page.waitForSelector('[data-testid=diary-book]', { state: 'detached' });
      // the journal link opens the same book
      await go('/journal');
      await page.click('button:has-text("日記")');
      await page.click('a.list-item:has-text("有照片的一天（改）")');
      await page.waitForSelector('[data-testid=diary-book]');
    });
    await e2e('手機聯絡人可以聊天，陳卷毛會回覆', async () => {
      await go('/phone');
      await page.click('[data-testid=phone-app-chat]');
      await page.click('[data-testid=topic-doing]');
      await page.waitForSelector('.msg.partner', { timeout: 8000 });
    });
    await e2e('打電話進入模擬通話並結束', async () => {
      await go('/phone');
      await page.click('[data-testid=phone-app-contacts]');
      await page.click('[data-testid=contact-call]');
      await page.waitForSelector('[data-testid=call-screen][data-phase=talking]', { timeout: 5000 });
      await page.click('[data-testid=hang-up]');
      await page.waitForTimeout(1200);
      await page.click('[aria-label=回主畫面]');
      await page.click('[data-testid=phone-app-calls]');
      await page.waitForSelector('.phone .list-item:has-text("陳卷毛")');
    });
    await e2e('食物不足時不能一起吃飯', async () => {
      await go('/room?scene=bedroom');
      await page.click('[data-testid=invite-chen]');
      await page.waitForSelector('[data-testid=actor-chen]', { timeout: 5000 });
      await page.waitForTimeout(2500);
      await page.click('[data-testid=act-meal]');
      await page.waitForSelector('[data-testid=go-buy-food]');
      await page.keyboard.press('Escape');
    });
    await e2e('邀請陳卷毛後他在房間；抱抱、親親切換姿勢', async () => {
      await go('/room?scene=bedroom');
      await page.waitForSelector('[data-testid=actor-chen]');
      await page.click('[data-testid=act-hug]');
      await page.waitForFunction(() => document.querySelector('[data-testid=actor-chen]')?.getAttribute('data-pose') === 'hug', null, { timeout: 6000 });
      await page.waitForFunction(() => document.querySelector('[data-testid=actor-chen]')?.getAttribute('data-pose') === 'stand', null, { timeout: 6000 });
      await page.click('[data-testid=act-kiss]');
      await page.waitForFunction(() => document.querySelector('[data-testid=actor-99]')?.getAttribute('data-pose') === 'kiss', null, { timeout: 6000 });
      await page.waitForTimeout(3200);
    });
    await e2e('一起吃飯正確扣除冰箱庫存', async () => {
      await grant(100);
      await go('/shop?tab=food');
      for (let i = 0; i < 3; i++) { await page.locator('[data-testid=shop-onigiri] [data-testid=buy]').click(); await page.waitForTimeout(250); }
      await go('/room?scene=bedroom');
      await page.waitForSelector('[data-testid=actor-chen]');
      await page.click('[data-testid=act-meal]');
      await page.click('[data-testid=meal-onigiri]');
      await page.waitForFunction(() => document.querySelector('[data-testid=actor-chen]')?.getAttribute('data-pose') === 'eat', null, { timeout: 8000 });
      await go('/fridge');
      const q = await page.locator('[data-testid=food-onigiri] [data-testid=qty]').textContent();
      if (q.trim() !== '1') throw new Error('qty ' + q);
    });
    await e2e('送陳卷毛回家後角色離開，重新整理也不會再出現', async () => {
      await go('/room?scene=bedroom');
      await page.waitForSelector('[data-testid=actor-chen]');
      await page.waitForTimeout(500);
      await page.click('[data-testid=act-leave]');
      await page.waitForSelector('[data-testid=actor-chen]', { state: 'detached', timeout: 10000 });
      await page.reload(); await page.waitForTimeout(800);
      if (await page.locator('[data-testid=actor-chen]').count()) throw new Error('chen reappeared');
      await page.waitForSelector('[data-testid=invite-chen]');
    });
    await e2e('擺設模式可以拖曳冰箱、衣櫃、床，重新整理後位置保留', async () => {
      await go('/room?scene=bedroom');
      await page.click('[data-testid=arrange-toggle]');
      await page.waitForSelector('[data-testid=arrange-hint]');
      const box = await page.locator('[data-testid=room-scene]').boundingBox();
      const before = {};
      for (const cat of ['wardrobe', 'bed']) {
        const el = page.locator(`[data-testid=furn-${cat}]`).first();
        const b = await el.boundingBox();
        before[cat] = b;
        const sx = b.x + b.width / 2, sy = b.y + b.height * 0.7;
        await page.mouse.move(sx, sy); await page.mouse.down();
        for (let i = 1; i <= 6; i++) await page.mouse.move(sx - (box.width * 0.12) * (i / 6), sy + (box.height * 0.06) * (i / 6));
        await page.mouse.up();
        await page.waitForTimeout(400);
      }
      if (await page.locator('.sheet, [role=dialog]').count()) throw new Error('menu opened on drag');
      if (page.url().includes('/fridge') || page.url().includes('/wardrobe')) throw new Error('navigated instead of drag');
      await page.reload(); await page.waitForTimeout(800);
      for (const cat of ['wardrobe', 'bed']) {
        const b = await page.locator(`[data-testid=furn-${cat}]`).first().boundingBox();
        if (Math.abs(b.x - before[cat].x) < 10) throw new Error(`${cat} did not move: ${before[cat].x} → ${b.x}`);
      }
      // tap (no drag) in arrange mode opens the menu with 移動/收納
      await page.click('[data-testid=arrange-toggle]');
      await page.locator('[data-testid=furn-wardrobe]').first().click();
      await page.waitForSelector('button:has-text("收納")');
      await page.keyboard.press('Escape');
      await page.click('[data-testid=arrange-toggle]');
    });
    await e2e('家具與窗戶可以翻轉、窗戶可以拖曳；唱片機會放音樂；睡覺會蓋棉被；對話在最上層', async () => {
      await grant(300);
      await go('/shop');
      await page.locator('[data-testid=shop-recordplayer_wood] [data-testid=buy]').click(); await page.waitForTimeout(300);
      await page.locator('[data-testid=shop-cabinet_wood] [data-testid=buy]').click(); await page.waitForTimeout(300);
      await go('/room?scene=bedroom');
      const at = async (x, y) => { await page.evaluate(() => scrollTo(0, 0)); const b = await page.locator('[data-testid=room-scene]').boundingBox(); return { x: b.x + x / 192 * b.width, y: b.y + y / 240 * b.height }; };
      for (const [x, y] of [[170, 190], [30, 234]]) { await page.click('button:has-text("收納箱")'); await page.locator('[data-testid=place-item]').first().click(); await page.waitForTimeout(150); const p = await at(x, y); await page.mouse.click(p.x, p.y); await page.waitForTimeout(400); }
      if (!(await page.locator('[data-testid=furn-recordPlayer]').count()) || !(await page.locator('[data-testid=furn-cabinet]').count())) throw new Error('new furniture not placed');
      // record player
      await page.locator('[data-testid=furn-recordPlayer]').click();
      await page.waitForSelector('.music-note', { timeout: 6000 });
      // speech bubble is above every piece of furniture
      const zs = await page.evaluate(() => { const b = document.querySelector('.scene .bubble'); const maxF = Math.max(...[...document.querySelectorAll('.scene .obj')].map((e) => Number(getComputedStyle(e).zIndex) || 0)); return [b ? Number(getComputedStyle(b).zIndex) : -1, maxF]; });
      if (!(zs[0] > zs[1])) throw new Error('bubble below furniture ' + zs);
      await page.locator('[data-testid=furn-recordPlayer]').click(); await page.waitForTimeout(400);
      await page.waitForSelector('.music-note', { state: 'detached', timeout: 4000 });
      // sleep → blanket
      await page.locator('[data-testid=furn-bed]').click();
      await page.waitForSelector('[data-testid=blanket]', { timeout: 6000 });
      await page.locator('[data-testid=furn-bed]').click(); await page.waitForTimeout(300);
      if (await page.locator('[data-testid=blanket]').count()) throw new Error('blanket stayed after waking');
      // flip furniture + window, move window; persists after reload
      await page.click('[data-testid=arrange-toggle]');
      for (const cat of ['bed', 'lamp', 'recordPlayer']) {
        await go(cat === 'lamp' ? '/room?scene=study' : '/room?scene=bedroom');
        if (!(await page.locator('[data-testid=arrange-hint]').count())) await page.click('[data-testid=arrange-toggle]');
        await page.locator(`[data-testid=furn-${cat}]`).first().click(); await page.click('[data-testid=flip-item]'); await page.waitForTimeout(250);
      }
      await go('/room?scene=bedroom');
      if (!(await page.locator('[data-testid=arrange-hint]').count())) await page.click('[data-testid=arrange-toggle]');
      await page.evaluate(() => scrollTo(0, 0)); await page.locator('[data-testid=room-window]').click({ force: true }); await page.click('[data-testid=flip-window]'); await page.waitForTimeout(250);
      await page.evaluate(() => scrollTo(0, 0));
      const w0 = await page.locator('[data-testid=room-window]').boundingBox();
      await page.mouse.move(w0.x + w0.width / 2, w0.y + w0.height / 2); await page.mouse.down();
      for (let i = 1; i <= 6; i++) await page.mouse.move(w0.x + w0.width / 2 + i * 20, w0.y + w0.height / 2);
      await page.mouse.up(); await page.waitForTimeout(400);
      await page.reload(); await page.waitForTimeout(900);
      await page.evaluate(() => scrollTo(0, 0));
      const w1 = await page.locator('[data-testid=room-window]').boundingBox();
      if (w1.x - w0.x < 40) throw new Error('window did not move');
      for (const sel of ['[data-testid=room-window]', '[data-testid=furn-bed]', '[data-testid=furn-recordPlayer]']) if (!(await page.locator(sel).first().getAttribute('class')).includes('flipped')) throw new Error(sel + ' not flipped');
      await go('/room?scene=study');
      if (!(await page.locator('[data-testid=furn-lamp]').first().getAttribute('class')).includes('flipped')) throw new Error('lamp not flipped');
      if (await page.locator('[data-testid=arrange-hint]').count()) await page.click('[data-testid=arrange-toggle]');
    });
    await e2e('廚房：冰箱搬到廚房，預設有流理臺、洗手台、餐桌和兩張椅子', async () => {
      await go('/room?scene=bedroom');
      if (await page.locator('[data-testid=furn-fridge]').count()) throw new Error('fridge still in bedroom');
      await page.click('[data-testid=tab-kitchen]'); await page.waitForTimeout(400);
      for (const [cat, n] of [['fridge', 1], ['counter', 1], ['sink', 1], ['table', 1], ['chair', 2]]) {
        const c = await page.locator(`[data-testid=furn-${cat}]`).count();
        if (c !== n) throw new Error(`${cat}: ${c}`);
      }
      // counter & sink really do something
      await page.locator('[data-testid=furn-sink]').click();
      await page.waitForSelector('.scene .bubble', { timeout: 6000 });
    });
    await e2e('咖啡機泡咖啡 +1 知識幣（每天 5 杯）；烤麵包機把麵包放進冰箱', async () => {
      await grant(200);
      await go('/shop?tab=furniture&area=kitchen');
      for (const id of ['coffee_machine', 'toaster']) { await page.locator(`[data-testid=shop-${id}] [data-testid=buy]`).click(); await page.waitForTimeout(300); }
      await go('/room?scene=kitchen');
      const at = async (x, y) => { await page.evaluate(() => scrollTo(0, 0)); const b = await page.locator('[data-testid=room-scene]').boundingBox(); return { x: b.x + x / 192 * b.width, y: b.y + y / 240 * b.height }; };
      for (const [x, y] of [[30, 108], [60, 108]]) { await page.click('button:has-text("收納箱")'); await page.locator('[data-testid=place-item]').first().click(); await page.waitForTimeout(150); const p = await at(x, y); await page.mouse.click(p.x, p.y); await page.waitForTimeout(400); }
      const coffee = page.locator('[data-testid=furn-kitchenware][data-defid=coffee_machine]');
      const before = await coins();
      for (let i = 0; i < 6; i++) { await coffee.click({ force: true }); await page.waitForTimeout(2900); }
      const after = await coins();
      if (after - before !== 5) throw new Error(`coffee coins ${after - before}`);
      const breadBefore = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('my-room-db'); r.onsuccess = () => { const g = r.result.transaction('foodInventory').objectStore('foodInventory').get('bread'); g.onsuccess = () => { res(g.result?.quantity ?? 0); r.result.close(); }; }; }));
      await page.locator('[data-testid=furn-kitchenware][data-defid=toaster]').click({ force: true }); await page.waitForTimeout(2600);
      const breadAfter = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('my-room-db'); r.onsuccess = () => { const g = r.result.transaction('foodInventory').objectStore('foodInventory').get('bread'); g.onsuccess = () => { res(g.result?.quantity ?? 0); r.result.close(); }; }; }));
      if (breadAfter - breadBefore !== 1) throw new Error(`bread ${breadBefore} → ${breadAfter}`);
    });
    await e2e('寫日記 +5 知識幣；愛的互動 +5 知識幣', async () => {
      const c0 = await coins();
      await go('/diary');
      await page.click('[data-testid=new-diary]');
      await page.fill('input[name=diary-title]', '拿知識幣的日記');
      await page.fill('textarea[name=diary-content]', '今天也很好。');
      await page.click('[data-testid=save-diary]'); await page.waitForTimeout(500);
      const c1 = await coins();
      if (c1 - c0 !== 5) throw new Error(`diary coins ${c1 - c0}`);
      await go('/room?scene=bedroom');
      await page.click('[data-testid=invite-chen]');
      await page.waitForSelector('[data-testid=actor-chen]', { timeout: 5000 }); await page.waitForTimeout(2600);
      const c2 = await coins();
      await page.click('[data-testid=act-hug]'); await page.waitForTimeout(3500);
      const c3 = await coins();
      if (c3 - c2 !== 5) throw new Error(`love coins ${c3 - c2}`);
      // new interactions
      await page.click('[data-testid=act-pat]'); await page.waitForFunction(() => document.querySelector('[data-testid=actor-chen]')?.getAttribute('data-pose') === 'holdL', null, { timeout: 6000 });
      await page.waitForTimeout(2600);
      await page.click('[data-testid=act-photo]'); await page.waitForTimeout(3500);
      const mem = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('my-room-db'); r.onsuccess = () => { const g = r.result.transaction('loveMemories').objectStore('loveMemories').getAll(); g.onsuccess = () => { res(g.result.filter((m) => m.title === '合照').length); r.result.close(); }; }; }));
      if (!mem) throw new Error('photo memory not saved');
      await page.click('[data-testid=act-leave]');
      await page.waitForSelector('[data-testid=actor-chen]', { state: 'detached', timeout: 10000 });
    });
    await e2e('心情溫度計：設定後陳卷毛依照心情回訊息', async () => {
      await go('/');
      await page.waitForSelector('[data-testid=mood-thermo]');
      await page.click('[data-testid=mood-0]');
      await page.waitForSelector('[data-testid=mood-temp]');
      if ((await page.locator('[data-testid=mood-temp]').textContent()).trim() !== '10°') throw new Error('temp');
      await page.waitForTimeout(4500);
      const msgs = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('my-room-db'); r.onsuccess = () => { const g = r.result.transaction('chat').objectStore('chat').getAll(); g.onsuccess = () => { res(g.result.filter((m) => m.interactionType?.startsWith('mood')).map((m) => m.content)); r.result.close(); }; }; }));
      if (!msgs.length) throw new Error('no mood reply');
      await page.reload(); await page.waitForTimeout(800);
      if ((await page.locator('[data-testid=mood-temp]').textContent()).trim() !== '10°') throw new Error('mood not saved');
    });
    await e2e('陳卷毛會主動傳訊息', async () => {
      await page.evaluate(() => localStorage.setItem('myroom:allowProactive', '1'));
      await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('my-room-db'); r.onsuccess = () => { const tx = r.result.transaction(['chat', 'meta'], 'readwrite'); tx.objectStore('chat').clear(); const k = 'proactive:' + new Date().toLocaleDateString('sv'); tx.objectStore('meta').delete(k); tx.objectStore('meta').delete('proactive:last'); tx.oncomplete = () => { r.result.close(); res(); }; }; }));
      await go('/');
      await page.reload();
      await page.waitForFunction(() => new Promise((res) => { const r = indexedDB.open('my-room-db'); r.onsuccess = () => { const g = r.result.transaction('chat').objectStore('chat').getAll(); g.onsuccess = () => { res(g.result.some((m) => m.interactionType?.startsWith('proactive'))); r.result.close(); }; }; }), null, { timeout: 20000, polling: 1000 });
      await page.evaluate(() => localStorage.removeItem('myroom:allowProactive'));
    });
    await e2e('陽台小物：擺到陽台、可以互動、可以翻轉', async () => {
      await grant(100);
      await go('/shop?tab=furniture&area=balcony');
      await page.locator('[data-testid=shop-pot_tulip] [data-testid=buy]').click(); await page.waitForTimeout(300);
      await go('/balcony');
      await page.click('[data-testid=balcony-decor]');
      await page.locator('.shop-item:has-text("鬱金香花盆") [data-testid=place-decor]').click();
      await page.evaluate(() => scrollTo(0, 0));
      const b = await page.locator('[data-testid=balcony]').boundingBox();
      await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.8); await page.waitForTimeout(400);
      await page.locator('[data-testid=decor-pot_tulip]').click({ force: true });
      await page.waitForSelector('.scene .bubble', { timeout: 5000 });
      await page.waitForTimeout(1500);
      await page.click('[data-testid=balcony-arrange]');
      await page.locator('[data-testid=decor-pot_tulip]').click({ force: true });
      await page.click('[data-testid=flip-item]'); await page.waitForTimeout(300);
      if (!(await page.locator('[data-testid=decor-pot_tulip]').getAttribute('class')).includes('flipped')) throw new Error('not flipped');
    });
    await e2e('情書信箱和扭蛋機會跳出陳卷毛的話', async () => {
      await grant(200);
      await go('/shop?tab=love');
      for (const id of ['lovebox', 'gacha_love']) { await page.locator(`[data-testid=shop-${id}] [data-testid=buy]`).click(); await page.waitForTimeout(300); }
      await go('/room?scene=bedroom');
      const at = async (x, y) => { await page.evaluate(() => scrollTo(0, 0)); const bb = await page.locator('[data-testid=room-scene]').boundingBox(); return { x: bb.x + x / 192 * bb.width, y: bb.y + y / 240 * bb.height }; };
      for (const [x, y] of [[150, 150], [175, 226]]) { await page.click('button:has-text("收納箱")'); await page.locator('[data-testid=place-item]').first().click(); await page.waitForTimeout(150); const p = await at(x, y); await page.mouse.click(p.x, p.y); await page.waitForTimeout(400); }
      for (const id of ['lovebox', 'gacha_love']) {
        await page.locator(`[data-defid=${id}]`).click({ force: true });
        try { await page.waitForSelector('[data-testid=love-note]', { timeout: 8000 }); }
        catch (e) { throw new Error(id + ' bubbles=' + JSON.stringify(await page.locator('.scene .bubble').allTextContents()) + ' toasts=' + JSON.stringify(await page.locator('.toast').allTextContents()) + ' top=' + await page.evaluate((id) => { const el = document.querySelector(`[data-defid=${id}]`); const r = el.getBoundingClientRect(); return document.elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2).slice(0, 3).map((e) => e.getAttribute('data-defid') || e.className).join('|'); }, id)); }
        await page.keyboard.press('Escape'); await page.waitForTimeout(1600);
      }
    });
    await e2e('音效與背景音樂設定可以切換並保留', async () => {
      await go('/settings');
      await page.waitForSelector('[data-testid=sound-settings]');
      await page.click('[data-testid=sfx-toggle]');
      await page.click('[data-testid=bgm-rain]'); await page.waitForTimeout(500);
      await page.reload(); await page.waitForTimeout(800);
      if (await page.locator('[data-testid=sfx-toggle]').isChecked()) throw new Error('sfx not saved');
      if (!(await page.locator('[data-testid=bgm-rain]').getAttribute('class')).includes('on')) throw new Error('track not saved');
      await page.click('[data-testid=sfx-toggle]');
    });
    await e2e('戀愛日記可以新增、編輯、刪除', async () => {
      await go('/love-diary');
      await page.click('[data-testid=new-memory]');
      await page.fill('input[name=memory-title]', '第一次約會');
      await page.click('[data-testid=save-memory]');
      await page.waitForSelector('[data-testid=memory-row]:has-text("第一次約會")');
      await page.click('[data-testid=memory-row]:has-text("第一次約會")');
      await page.waitForSelector('[data-testid=diary-book] [data-testid=book-page]:has-text("第一次約會")');
      await page.click('[data-testid=book-edit]');
      await page.fill('input[name=memory-title]', '第一次約會（改）');
      await page.click('[data-testid=save-memory]');
      await page.waitForSelector('[data-testid=diary-book] >> text=第一次約會（改）');
      await page.click('[data-testid=book-close]');
      await page.click('[data-testid=memory-row]:has-text("第一次約會（改）")');
      await page.click('[data-testid=book-edit]');
      await page.click('button:has-text("刪除")');
      await page.click('[data-testid=confirm-ok]');
      await page.waitForTimeout(400);
      if (await page.locator('text=第一次約會（改）').count()) throw new Error('not deleted');
    });
    await e2e('種植物並澆水', async () => {
      await go('/shop?tab=plants');
      await page.locator('[data-testid=shop-daisy] [data-testid=buy]').click(); await page.waitForTimeout(300);
      await go('/balcony');
      await page.click('[data-testid=plant]');
      await page.click('[data-testid=water]');
      await page.waitForTimeout(400);
    });
    // ───────── 生命感、閱讀、關係 ─────────
    const idb = (fn, arg) => page.evaluate(([src, arg]) => new Promise((res, rej) => { const r = indexedDB.open('my-room-db'); r.onsuccess = () => { const db = r.result; const f = new Function('db', 'arg', 'res', src); try { f(db, arg, (v) => { db.close(); res(v); }); } catch (e) { db.close(); rej(e); } }; }), [fn.toString().replace(/^[^{]*{|}$/g, ''), arg]);
    const setKV = (store, key, value) => idb((db, arg, res) => { const tx = db.transaction(arg.store, 'readwrite'); tx.objectStore(arg.store).put({ key: arg.key, value: arg.value }); tx.oncomplete = () => res(); }, { store, key, value });
    const getAll = (store) => idb((db, arg, res) => { const g = db.transaction(arg).objectStore(arg).getAll(); g.onsuccess = () => res(g.result); }, store);
    const putRow = (store, row) => idb((db, arg, res) => { const tx = db.transaction(arg.store, 'readwrite'); tx.objectStore(arg.store).put(arg.row); tx.oncomplete = () => res(); }, { store, row });
    await e2e('下雨天：窗外下雨、99 坐在窗邊、陽台植物自動澆到水', async () => {
      await setKV('settings', 'weatherOverride', 'rain');
      const before = (await getAll('ownedPlants')).map((p) => p.lastWateredAt);
      await go('/room?scene=bedroom');
      await page.waitForSelector('[data-testid=room-window][data-weather=rain]');
      await page.waitForFunction(() => document.querySelector('[data-testid=actor-99]')?.getAttribute('data-pose') === 'sit', null, { timeout: 4000 });
      await page.waitForTimeout(600);
      const after = (await getAll('ownedPlants')).map((p) => p.lastWateredAt);
      if (before.length && !after.some((t, i) => t > before[i])) throw new Error('plants not watered by rain');
      await setKV('settings', 'weatherOverride', 'sunny');
    });
    await e2e('黑白貓：在房間閒晃、用冰箱的牛奶餵牠會扣掉一份', async () => {
      await grant(50);
      await go('/shop?tab=food');
      await page.locator('[data-testid=shop-milk] [data-testid=buy]').click(); await page.waitForTimeout(300);
      const milk0 = (await getAll('foodInventory')).find((x) => x.foodId === 'milk')?.quantity ?? 0;
      await go('/room?scene=bedroom');
      await page.waitForSelector('[data-testid=pet-cat]');
      await page.locator('[data-testid=pet-cat]').click({ force: true });
      await page.waitForSelector('[data-testid=cat-menu]');
      await page.click('[data-testid=cat-feed-milk]');
      await page.waitForFunction(() => document.querySelector('[data-testid=pet-cat]')?.getAttribute('data-pose') === 'eat', null, { timeout: 8000 });
      const milk1 = (await getAll('foodInventory')).find((x) => x.foodId === 'milk')?.quantity ?? 0;
      if (milk1 !== milk0 - 1) throw new Error(`milk ${milk0} → ${milk1}`);
      await page.waitForTimeout(4000);
    });
    await e2e('節日：聖誕節佈置會出現；限定家具不在期間時買不到', async () => {
      await setKV('settings', 'festivalPreview', 'christmas');
      await go('/room?scene=bedroom');
      await page.waitForSelector('[data-testid=festival-banner]:has-text("Merry Christmas")');
      await setKV('settings', 'festivalPreview', '');
      await go('/shop?tab=limited');
      await page.waitForSelector('[data-testid=shop-xmas_tree]');
      const md = new Date().toISOString().slice(5, 10);
      const open = md >= '12-01';
      if (!open && await page.locator('[data-testid=shop-xmas_tree] [data-testid=buy]').count()) throw new Error('limited item buyable out of season');
    });
    await e2e('專注模式：坐到書桌看書，結束後自動產生一筆閱讀紀錄', async () => {
      await go('/room?scene=study');
      await page.click('[data-testid=focus-start]');
      await page.click('[data-testid=focus-go]');
      await page.waitForSelector('[data-testid=focus-overlay]');
      await page.waitForFunction(() => document.querySelector('[data-testid=actor-99]')?.getAttribute('data-pose') === 'read', null, { timeout: 4000 });
      // pretend 12 minutes have passed
      const f = (await getAll('meta')).find((r) => r.key === 'focus').value;
      await setKV('meta', 'focus', { ...f, startedAt: Date.now() - 12 * 60000 });
      await page.waitForTimeout(500);
      await page.click('[data-testid=focus-end]');
      await page.click('[data-testid=focus-save]');
      await page.waitForSelector('[data-testid=focus-overlay]', { state: 'detached' });
      const s0 = (await getAll('sessions')).filter((x) => x.tags.includes('專注模式'));
      if (!s0.length || s0[0].minutes < 12) throw new Error('no focus session ' + JSON.stringify(s0));
    });
    await e2e('讀完一本詩集：拿到書卡、解鎖星空屋頂', async () => {
      const book = { id: 'poems-1', title: '測試詩集', author: '99', category: '詩集', totalPages: 80, currentPage: 80, status: 'finished', finishDate: new Date().toLocaleDateString('sv'), tags: [], createdAt: Date.now(), updatedAt: Date.now() };
      await putRow('books', book);
      await putRow('quotes', { id: 'q-poem', bookId: 'poems-1', text: '浪沒有名字，也一直在。', tags: [], createdAt: Date.now() });
      await go('/cards');
      await page.waitForSelector('[data-testid=book-card]:has-text("測試詩集")');
      if (!(await page.locator('[data-testid=book-card]:has-text("測試詩集")').textContent()).includes('浪沒有名字')) throw new Error('quote not on card');
      await go('/map');
      await page.waitForSelector('[data-testid=area-rooftop][data-unlocked="1"]');
      await go('/room?scene=bedroom');
      await page.click('[data-testid=tab-rooftop]'); await page.waitForTimeout(500);
      if (!(await page.locator('[data-defid=telescope]').count())) throw new Error('rooftop not furnished');
    });
    await e2e('作品牆：上傳作品照片、掛到房間牆上', async () => {
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      await go('/gallery');
      await page.setInputFiles('[data-testid=art-file]', { name: 'wave.png', mimeType: 'image/png', buffer: png });
      await page.fill('[data-testid=art-title]', '無名浪');
      await page.click('[data-testid=art-save]');
      await page.waitForSelector('[data-testid=artwork]:has-text("無名浪")');
      await page.click('[data-testid=art-hang]');
      await page.waitForURL(/scene=bedroom/);
      await page.waitForSelector('.art-photo');
    });
    await e2e('遠距離：兩個時鐘、見面倒數；見面當天房間有佈置', async () => {
      await go('/');
      await page.click('[data-testid=ld-edit]');
      await page.selectOption('[data-testid=ld-tz]', 'Europe/London');
      await page.fill('[data-testid=ld-meet]', new Date().toLocaleDateString('sv'));
      await page.click('[data-testid=ld-save]'); await page.waitForTimeout(400);
      await page.waitForSelector('[data-testid=meet-countdown]:has-text("就是今天")');
      const me = await page.locator('[data-testid=clock-me]').textContent(), him = await page.locator('[data-testid=clock-him]').textContent();
      if (me === him) throw new Error('clocks identical');
      await go('/room?scene=bedroom');
      await page.waitForSelector('[data-testid=festival-banner]:has-text("歡迎回來")');
      await setKV('settings', 'longDistance', { partnerTz: 'Europe/London', partnerCity: '', nextMeet: '', myBirthday: '', partnerBirthday: '' });
    });
    await e2e('本週雙人任務會顯示 3 個', async () => {
      await go('/');
      await page.waitForSelector('[data-testid=quests-card]');
      if ((await page.locator('[data-testid=quests-card] .quest').count()) !== 3) throw new Error('quest count');
    });
    await e2e('日記選了「難過」，陳卷毛來時先問妳還好嗎；他會自己找事做', async () => {
      await go('/diary');
      await page.click('[data-testid=new-diary]');
      await page.fill('input[name=diary-title]', '有點難過的一天');
      await page.fill('textarea[name=diary-content]', '今天不太順。');
      await page.click('button.chip:has-text("難過")');
      await page.click('[data-testid=save-diary]'); await page.waitForTimeout(400);
      await go('/room?scene=bedroom');
      await page.click('[data-testid=invite-chen]');
      await page.waitForSelector('.scene .bubble:has-text("妳日記寫的")', { timeout: 8000 });
      // leave him alone: he does something on his own (talks without being asked)
      await page.waitForTimeout(6000);
      const seen = new Set();
      for (let i = 0; i < 30; i++) { for (const t of await page.locator('.scene .bubble').allTextContents()) seen.add(t); if ([...seen].some((t) => /冰箱|書架|這本|瞇一下|外面|摸摸/.test(t))) break; await page.waitForTimeout(1000); }
      if (![...seen].some((t) => /冰箱|書架|這本|瞇一下|外面|摸摸/.test(t))) throw new Error('he did nothing on his own: ' + [...seen].join(' / '));
      await page.waitForTimeout(4000);
      await page.click('[data-testid=act-leave]');
      await page.waitForSelector('[data-testid=actor-chen]', { state: 'detached', timeout: 12000 });
    });
    await e2e('戀愛回憶可以做成像素明信片', async () => {
      await go('/love-diary');
      await page.click('[data-testid=new-memory]');
      await page.fill('input[name=memory-title]', '海邊');
      await page.click('[data-testid=save-memory]'); await page.waitForTimeout(400);
      await page.click('[data-testid=memory-row]:has-text("海邊")');
      await page.click('[data-testid=make-postcard]');
      await page.waitForSelector('[data-testid=postcard-img]', { timeout: 8000 });
      const w = await page.locator('[data-testid=postcard-img]').evaluate((img) => img.naturalWidth);
      if (w !== 1200) throw new Error('postcard width ' + w);
    });
    await e2e('關閉後重新開啟，所有資料仍存在', async () => {
      // close the app tab and open a new one in the same browser profile
      const p2 = await ctx.newPage();
      await page.close();
      await p2.goto(`http://localhost:${PORT}/#/library`); await p2.waitForTimeout(500);
      await p2.waitForSelector('text=小王子');
      await p2.goto(`http://localhost:${PORT}/#/diary`); await p2.waitForSelector('text=電腦寫的日記');
      await p2.close();
    });
    await e2e('手機版主要頁面沒有水平溢出', async () => {
      const p3 = await ctx.newPage();
      for (const r of ['/', '/library', '/add', '/journal', '/room', '/balcony', '/shop', '/wardrobe', '/fridge', '/computer', '/tablet', '/phone', '/love', '/love-diary', '/settings', '/stats', '/review', '/map', '/cards', '/gallery', '/room?scene=rooftop']) {
        await p3.goto(`http://localhost:${PORT}/#${r}`); await p3.waitForTimeout(250);
        if (await p3.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) throw new Error('overflow on ' + r);
      }
      await p3.close();
    });
    if (errors.length) report('執行期間沒有 JavaScript 錯誤', false, errors.join('\n')); else report('執行期間沒有 JavaScript 錯誤', true);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${passed} 通過，${failed} 失敗`);
process.exit(failed ? 1 : 0);
