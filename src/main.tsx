import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { ensureSeed } from './services/seed';
import { refreshPlants } from './services/life';
import { checkAchievements } from './services/reading';
import { db } from './db/idb';

async function boot() {
  const root = createRoot(document.getElementById('root')!);
  try {
    await db.open();
    await ensureSeed();
    await refreshPlants();
    await checkAchievements();
  } catch (e) {
    console.error(e);
    root.render(<div className="content"><div className="card"><h2>無法開啟本機資料庫</h2><p>{(e as Error).message}</p><p className="muted">如果是無痕模式，瀏覽器可能不允許儲存資料。</p></div></div>);
    return;
  }
  root.render(<App />);
  // update plant growth whenever the app comes back to the foreground
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshPlants().catch(() => undefined); });
  if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window.self) {
    // When a new version has been downloaded, switch to it right away instead of on the next launch.
    // Don't interrupt typing: if a text field is focused, wait until the app goes to the background.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    const reload = () => { if (!reloaded) { reloaded = true; location.reload(); } };
    const typing = () => { const el = document.activeElement; return !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'file') || (el as HTMLElement).isContentEditable); };
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return; // first install: nothing to swap
      if (!typing()) reload();
      else document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') reload(); });
    });
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // home-screen apps are often resumed rather than relaunched — check for a new version each time
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => undefined); });
    }).catch(() => undefined);
  }
  try { await navigator.storage?.persist?.(); } catch { /* optional */ }
}
boot();
