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
      for (const cat of ['fridge', 'wardrobe', 'bed']) {
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
      for (const cat of ['fridge', 'wardrobe', 'bed']) {
        const b = await page.locator(`[data-testid=furn-${cat}]`).first().boundingBox();
        if (Math.abs(b.x - before[cat].x) < 10) throw new Error(`${cat} did not move: ${before[cat].x} → ${b.x}`);
      }
      // tap (no drag) in arrange mode opens the menu with 移動/收納
      await page.click('[data-testid=arrange-toggle]');
      await page.locator('[data-testid=furn-fridge]').first().click();
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
      for (const r of ['/', '/library', '/add', '/journal', '/room', '/balcony', '/shop', '/wardrobe', '/fridge', '/computer', '/tablet', '/phone', '/love', '/love-diary', '/settings', '/stats', '/review']) {
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
