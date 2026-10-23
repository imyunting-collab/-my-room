import { useEffect, useState, type ReactNode } from 'react';
import { sfx } from './lib/sound';
import { CardsPage, GalleryPage, MapPage } from './pages/Growth';
import { getFocus } from './services/focus';
import { db } from './db/idb';
import { useBus, useLive, useReducedMotion } from './hooks';
import { back, Link, match, splitPath, usePath } from './router';
import { ConfirmHost, Icon, PixelText } from './ui';
import { balance } from './services/wallet';
import { PARTNER_ID } from './services/seed';
import type { ChatMessage } from './db/types';
import type { ToastKind } from './lib/bus';
import { portraitURL } from './sprites/characters';

import HomePage from './pages/Home';
import LibraryPage from './pages/Library';
import BookPage from './pages/Book';
import AddSessionPage from './pages/AddSession';
import JournalPage from './pages/Journal';
import CalendarPage from './pages/Calendar';
import StatsPage from './pages/Stats';
import ReviewPage from './pages/Review';
import AchievementsPage from './pages/Achievements';
import RoomPage from './pages/Room';
import BookshelfPage from './pages/Bookshelf';
import ShopPage from './pages/Shop';
import WardrobePage from './pages/Wardrobe';
import FridgePage from './pages/Fridge';
import BalconyPage from './pages/Balcony';
import { ComputerPage, TabletPage, PhonePage } from './pages/Devices';
import LoveChatPage from './pages/LoveChat';
import LoveDiaryPage from './pages/LoveDiary';
import WalletPage from './pages/Wallet';
import SettingsPage from './pages/Settings';
import MorePage from './pages/More';
import DiaryPage from './pages/Diary';

interface RouteDef { pattern: string; title: string; el: (p: Record<string, string>, q: URLSearchParams) => ReactNode; full?: boolean; root?: boolean }
const ROUTES: RouteDef[] = [
  { pattern: '/', title: 'MY ROOM', el: () => <HomePage />, root: true },
  { pattern: '/library', title: '我的書庫', el: () => <LibraryPage />, root: true },
  { pattern: '/book/:id', title: '書籍詳情', el: (p) => <BookPage id={p.id} /> },
  { pattern: '/add', title: '新增閱讀紀錄', el: (_p, q) => <AddSessionPage sessionId={q.get('id') ?? undefined} bookId={q.get('book') ?? undefined} />, root: true },
  { pattern: '/journal', title: '閱讀手札', el: () => <JournalPage />, root: true },
  { pattern: '/calendar', title: '閱讀月曆', el: () => <CalendarPage /> },
  { pattern: '/stats', title: '閱讀統計', el: () => <StatsPage /> },
  { pattern: '/review', title: '年度回顧', el: () => <ReviewPage /> },
  { pattern: '/achievements', title: '閱讀成就', el: () => <AchievementsPage /> },
  { pattern: '/room', title: '我的房間', el: (_p, q) => <RoomPage initial={(q.get('scene') as any) ?? undefined} />, full: true, root: true },
  { pattern: '/bookshelf', title: '動態書架', el: () => <BookshelfPage /> },
  { pattern: '/shop', title: '商店', el: (_p, q) => <ShopPage tab={q.get('tab') ?? undefined} area={q.get('area') ?? undefined} /> },
  { pattern: '/wardrobe', title: '衣櫃與試衣間', el: () => <WardrobePage /> },
  { pattern: '/fridge', title: '冰箱', el: () => <FridgePage /> },
  { pattern: '/balcony', title: '陽台植物園', el: () => <BalconyPage />, full: true },
  { pattern: '/computer', title: '電腦', el: () => <ComputerPage />, full: true },
  { pattern: '/tablet', title: '平板', el: () => <TabletPage />, full: true },
  { pattern: '/phone', title: '手機', el: (_p, q) => <PhonePage app={q.get('app') ?? undefined} />, full: true },
  { pattern: '/love', title: '陳卷毛', el: () => <LoveChatPage />, full: true },
  { pattern: '/love-diary', title: '戀愛日記', el: () => <LoveDiaryPage /> },
  { pattern: '/diary', title: '日記', el: () => <DiaryPage /> },
  { pattern: '/wallet', title: '知識幣錢包', el: () => <WalletPage /> },
  { pattern: '/settings', title: '設定與備份', el: () => <SettingsPage /> },
  { pattern: '/more', title: '更多', el: () => <MorePage /> },
  { pattern: '/map', title: '閱讀地圖', el: () => <MapPage /> },
  { pattern: '/cards', title: '書卡收藏', el: () => <CardsPage /> },
  { pattern: '/gallery', title: '我的作品牆', el: () => <GalleryPage /> },
];

const NAV: [string, string, string][] = [['/', '首頁', 'home'], ['/library', '書庫', 'library'], ['/add', '新增', 'plus'], ['/journal', '手札', 'journal'], ['/room', '房間', 'shelf']];
const SIDE: [string, [string, string, string][]][] = [
  ['閱讀', [['/', '首頁', 'home'], ['/library', '我的書庫', 'library'], ['/add', '新增閱讀', 'plus'], ['/journal', '閱讀手札', 'journal'], ['/calendar', '閱讀月曆', 'calendar'], ['/stats', '閱讀統計', 'chart'], ['/review', '年度回顧', 'star'], ['/achievements', '成就', 'trophy'], ['/map', '閱讀地圖', 'star'], ['/cards', '書卡收藏', 'book']]],
  ['生活', [['/room', '我的房間', 'home'], ['/bookshelf', '動態書架', 'shelf'], ['/shop', '商店', 'gift'], ['/wardrobe', '衣櫃', 'shirt'], ['/fridge', '冰箱', 'fridge'], ['/balcony', '陽台', 'plant']]],
  ['設備與戀愛', [['/computer', '電腦', 'chart'], ['/tablet', '平板', 'book'], ['/phone', '手機', 'phone'], ['/love', '陳卷毛', 'heart'], ['/love-diary', '戀愛日記', 'pen'], ['/diary', '日記', 'journal']]],
  ['其他', [['/wallet', '知識幣錢包', 'wallet'], ['/settings', '設定與備份', 'gear']]],
];

interface ToastItem { id: number; text: string; kind: ToastKind }

export default function App() {
  const path = usePath();
  const { pathname, query } = splitPath(path);
  let route = ROUTES[0], params: Record<string, string> = {};
  for (const r of ROUTES) { const m = match(r.pattern, pathname); if (m) { route = r; params = m; break; } }
  const coins = useLive(balance, [], 0) ?? 0;
  const unread = useLive(async () => (await db.byIndex('chat', 'contactId', PARTNER_ID)).filter((m) => !m.read).length, [], 0) ?? 0;
  const visit = useLive(() => db.getKV<{ active: boolean }>('meta', 'visit', { active: false }), [], { active: false });
  const focus = useLive(getFocus, [], null);
  const reduce = useReducedMotion();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useBus<{ text: string; kind: ToastKind; id: number }>('toast', (t) => {
    if (t.kind === 'coin') sfx('coin');
    setToasts((x) => [...x.slice(-2), t]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== t.id)), t.kind === 'error' ? 4200 : 2800);
  });
  useBus<ChatMessage>('partnerMessage', (m) => {
    sfx('message');
    const inChat = pathname === '/love' || (pathname === '/phone' && query.get('app') === 'chat');
    if (!inChat) {
      const id = Math.random();
      setToasts((x) => [...x.slice(-2), { id, text: `💬 陳卷毛：${m.content}`, kind: 'love' }]);
      setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 3600);
    }
  });
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { document.title = route.pattern === '/' ? 'MY ROOM｜我的像素生活' : `${route.title}｜MY ROOM`; }, [route]);

  return (
    <div className={'app' + (reduce ? ' reduce-motion' : '')}>
      <nav className="sidebar" aria-label="主選單">
        <Link to="/" className="brand-logo"><span className="brand"><PixelText text="MY ROOM♥" scale={3} /></span></Link>
        {SIDE.map(([g, items]) => (
          <div key={g} className="stack" style={{ gap: 2 }}>
            <div className="group">{g}</div>
            {items.map(([to, l, ic]) => <Link key={to} to={to} className={pathname === to ? 'active' : ''}><Icon name={ic} />{l}</Link>)}
          </div>
        ))}
      </nav>
      <div className="main">
        <header className="header">
          {route.root ? (
            route.pattern === '/' ? <span style={{ flex: 1 }}><PixelText text="MY ROOM♥" scale={3} /></span> : <h1>{route.title}</h1>
          ) : (
            <>
              <button className="back" onClick={() => back()} aria-label="返回">‹</button>
              <h1>{route.title}</h1>
            </>
          )}
          <Link to="/wallet" className="coin-chip" aria-label={`知識幣 ${coins}`}><Icon name="coin" size={18} /><span data-testid="coin-balance">{coins}</span></Link>
          <a href="#/phone" className="icon-btn" aria-label="打開手機"><img className="px" src={portraitURL('chen', 'smile')} alt="" style={{ borderRadius: 6 }} />{unread > 0 && <span className="badge" data-testid="unread-badge">{unread}</span>}</a>
          <Link to="/more" className="icon-btn" aria-label="更多功能"><Icon name="more" size={22} /></Link>
        </header>
        {focus && pathname !== '/room' && (
          <a href="#/room?scene=study" data-testid="focus-banner" style={{ display: 'block', background: '#e3e8d6', borderBottom: '3px solid var(--ink)', padding: '6px 14px', fontSize: 13, fontWeight: 700, color: 'var(--ink)', textDecoration: 'none' }}>
            📖 專注閱讀中（{Math.floor((Date.now() - focus.startedAt) / 60000)} 分鐘），回書桌 ›
          </a>
        )}
        {visit?.active && pathname !== '/room' && (
          <a href="#/room" style={{ display: 'block', background: 'var(--pink)', borderBottom: '3px solid var(--ink)', padding: '6px 14px', fontSize: 13, fontWeight: 700, color: 'var(--ink)', textDecoration: 'none' }}>
            💗 陳卷毛正在你家，回房間陪他 ›
          </a>
        )}
        <main className={'content' + (route.full ? ' full' : '')}>{route.el(params, query)}</main>
      </div>
      <nav className="bottom-nav" aria-label="底部導覽">
        {NAV.map(([to, l, ic]) => (
          <Link key={to} to={to} className={(pathname === to ? 'active' : '') + (to === '/add' ? ' plus' : '')}>
            {to === '/add' ? <span className="plus-disc"><Icon name="plus" size={26} /></span> : <Icon name={ic} size={24} />}
            <span>{l}</span>
          </Link>
        ))}
      </nav>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={'toast ' + t.kind}>{t.kind === 'coin' ? <Icon name="coin" /> : t.kind === 'love' ? <Icon name="heart" /> : null}{t.text}</div>)}
      </div>
      <ConfirmHost />
    </div>
  );
}
