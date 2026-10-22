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
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  }
  try { await navigator.storage?.persist?.(); } catch { /* optional */ }
}
boot();
