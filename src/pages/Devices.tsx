import { useState } from 'react';
import { db } from '../db/idb';
import { useBus, useLive, useNow } from '../hooks';
import { Link, navigate } from '../router';
import { CallLog, CallScreen, ChatApp, DiaryApp, LibraryApp, NotesApp, QuotesApp, ReadingLogApp, StatsApp } from '../components/apps';
import { DEVICES, deviceById } from '../data/catalog';
import { PARTNER_ID } from '../services/seed';
import { startVisit } from '../services/love';
import { markArrival } from './Room';
import { portraitURL } from '../sprites/characters';
import { deviceURL } from '../sprites/furniture';
import { Empty, Icon, PhotoThumb, useAction } from '../ui';
import { toast } from '../lib/bus';
import { timeHM } from '../lib/util';
import type { ChatMessage } from '../db/types';
import { checkAchievements } from '../services/reading';

type AppId = 'diary' | 'notes' | 'library' | 'stats' | 'chat' | 'settings' | 'quotes' | 'log' | 'contacts' | 'calls' | 'photos';
const APP_META: Record<AppId, { name: string; icon: string; color: string }> = {
  diary: { name: '日記', icon: 'journal', color: '#e3eedf' },
  notes: { name: '閱讀手札', icon: 'pen', color: '#fdf0d8' },
  library: { name: '我的書庫', icon: 'library', color: '#f3e2c2' },
  stats: { name: '閱讀統計', icon: 'chart', color: '#e0ecf3' },
  chat: { name: '戀愛訊息', icon: 'chat', color: '#fde9ea' },
  settings: { name: '裝置設定', icon: 'gear', color: '#ece8e2' },
  quotes: { name: '佳句收藏', icon: 'quote', color: '#f3e2c2' },
  log: { name: '閱讀紀錄', icon: 'clock', color: '#e0ecf3' },
  contacts: { name: '聯絡人', icon: 'heart', color: '#fde9ea' },
  calls: { name: '通話紀錄', icon: 'call', color: '#e3eedf' },
  photos: { name: '照片回憶', icon: 'star', color: '#fff3c8' },
};

function useOwned(type: 'computer' | 'tablet') {
  const devs = useLive(() => db.all('ownedDevices'), [], undefined);
  return devs === undefined ? undefined : devs.some((d) => deviceById.get(d.defId)?.deviceType === type);
}
function NotOwned({ what }: { what: string }) {
  return <div className="content"><div className="card"><Empty icon="gift">還沒有{what}。<br />到商店的「數位設備」用知識幣買一台吧！</Empty><Link to="/shop?tab=devices" className="btn primary block">去商店</Link></div></div>;
}

function AppBody({ app, onCall, onOpen }: { app: AppId; onCall?: () => void; onOpen?: (a: AppId) => void }) {
  switch (app) {
    case 'diary': return <DiaryApp compact />;
    case 'notes': return <NotesApp />;
    case 'library': return <LibraryApp />;
    case 'stats': return <StatsApp />;
    case 'chat': return <ChatApp onCall={onCall} embedded />;
    case 'settings': return <DeviceSettings />;
    case 'quotes': return <QuotesApp />;
    case 'log': return <ReadingLogApp />;
    case 'calls': return <CallLog />;
    case 'photos': return <PhotosApp />;
    case 'contacts': return <ContactCard onCall={onCall} onChat={() => (onOpen ? onOpen('chat') : navigate('/love'))} />;
  }
}

// ───────── 桌上型電腦：復古視窗系統 ─────────
export function ComputerPage() {
  const owned = useOwned('computer');
  const now = useNow(10000);
  const [wins, setWins] = useState<{ id: AppId; z: number }[]>([]);
  const [calling, setCalling] = useState(false);
  if (owned === undefined) return null;
  if (!owned) return <NotOwned what="電腦" />;
  const top = wins.reduce((m, w) => Math.max(m, w.z), 0);
  const active = wins.find((w) => w.z === top)?.id;
  const open = (id: AppId) => setWins((ws) => (ws.some((w) => w.id === id) ? ws.map((w) => (w.id === id ? { ...w, z: top + 1 } : w)) : [...ws, { id, z: top + 1 }]));
  const close = (id: AppId) => setWins((ws) => ws.filter((w) => w.id !== id));
  const narrow = typeof window !== 'undefined' && window.innerWidth < 700;
  return (
    <div className="device-stage">
      <div className="monitor">
        <div className="screen" data-testid="computer-screen">
          <div className="desk-icons">
            {(['diary', 'notes', 'library', 'stats', 'chat', 'settings'] as AppId[]).map((id) => (
              <button key={id} className="desk-icon" onClick={() => open(id)} data-testid={`pc-app-${id}`}><span className="ico" style={{ background: APP_META[id].color }}><Icon name={APP_META[id].icon} size={26} /></span>{APP_META[id].name}</button>
            ))}
          </div>
          {wins.map((w, i) => (
            <div key={w.id} className={'win' + (w.id === active ? '' : ' inactive')} style={narrow ? { inset: '6px 6px 42px', zIndex: w.z } : { left: `${6 + i * 3}%`, top: `${4 + i * 4}%`, width: '64%', height: '74%', zIndex: w.z }} onPointerDown={() => open(w.id)} data-testid={`win-${w.id}`}>
              <div className="titlebar"><Icon name={APP_META[w.id].icon} size={16} />{APP_META[w.id].name}<span className="spacer" /><button onClick={(e) => { e.stopPropagation(); close(w.id); }} aria-label={`關閉${APP_META[w.id].name}`}>✕</button></div>
              <div className="body" style={w.id === 'chat' ? { padding: 0, display: 'flex', flexDirection: 'column' } : undefined}>
                {w.id === 'chat' && calling ? <CallScreen onEnd={() => setCalling(false)} /> : <AppBody app={w.id} onCall={() => setCalling(true)} />}
              </div>
            </div>
          ))}
          <div className="taskbar" style={{ zIndex: 999 }}>
            <button onClick={() => navigate('/room?scene=study')}>⏻ 離開</button>
            {wins.map((w) => <button key={w.id} className={w.id === active ? 'on' : ''} onClick={() => open(w.id)}>{APP_META[w.id].name}</button>)}
            <span className="clock">{timeHM(now)}</span>
          </div>
        </div>
        <div className="chin"><i /></div>
      </div>
    </div>
  );
}

// ───────── 平板 ─────────
export function TabletPage() {
  const owned = useOwned('tablet');
  const [app, setApp] = useState<AppId>('notes');
  const [calling, setCalling] = useState(false);
  if (owned === undefined) return null;
  if (!owned) return <NotOwned what="平板" />;
  return (
    <div className="device-stage">
      <div className="tablet">
        <div className="screen" data-testid="tablet-screen">
          <div className="tabbar">
            {(['notes', 'diary', 'log', 'library', 'quotes', 'chat'] as AppId[]).map((id) => (
              <button key={id} className={'btn small' + (app === id ? ' wood' : '')} onClick={() => { setApp(id); setCalling(false); }} data-testid={`tab-app-${id}`}><Icon name={APP_META[id].icon} size={16} />{APP_META[id].name}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: app === 'chat' ? 0 : 12, display: 'flex', flexDirection: 'column' }}>
            {app === 'chat' && calling ? <CallScreen onEnd={() => setCalling(false)} /> : <AppBody app={app} onCall={() => setCalling(true)} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── 手機 ─────────
const WALLPAPERS: Record<string, string> = {
  cream: 'linear-gradient(#f6f0e5, #efe5d3)', forest: 'linear-gradient(#a9c39b, #6d8765)', night: 'linear-gradient(#26354d, #4b5f86)', pink: 'linear-gradient(#fbe3ea, #e8b8b2)', sunset: 'linear-gradient(#f6d29a, #e07a5f)',
};
export function PhonePage({ app: initial }: { app?: string }) {
  const [app, setApp] = useState<AppId | null>((initial as AppId) ?? null);
  const [calling, setCalling] = useState(false);
  const [notice, setNotice] = useState<ChatMessage | null>(null);
  const now = useNow(10000);
  const skinId = useLive(() => db.getKV<string>('meta', 'phoneSkin', 'phone_basic'), [], 'phone_basic') ?? 'phone_basic';
  const wall = useLive(() => db.getKV<string>('meta', 'phoneWallpaper', 'cream'), [], 'cream') ?? 'cream';
  const unread = useLive(async () => (await db.byIndex('chat', 'contactId', PARTNER_ID)).filter((m) => !m.read).length, [], 0) ?? 0;
  const skin = deviceById.get(skinId)?.skin ?? DEVICES[0].skin!;
  useBus<ChatMessage>('partnerMessage', (m) => { if (app !== 'chat') { setNotice(m); setTimeout(() => setNotice((n) => (n?.id === m.id ? null : n)), 3500); } });
  const dark = wall === 'night' || wall === 'forest' || wall === 'sunset';
  return (
    <div className="device-stage">
      <div className="phone" style={{ background: skin.body }} data-testid="phone">
        <div className="screen" style={{ background: WALLPAPERS[wall] ?? WALLPAPERS.cream }}>
          <div className="status" style={{ color: app ? 'var(--ink)' : dark ? '#fffaf1' : 'var(--ink)', background: app ? 'var(--cream)' : 'transparent' }}><span data-testid="phone-time">{timeHM(now)}</span><span>MY ROOM ▮▮▮</span></div>
          {notice && <div className="notify" onClick={() => { setNotice(null); setApp('chat'); }} data-testid="phone-notice"><img className="px" src={portraitURL('chen', (notice.emotion as any) ?? 'smile')} alt="" /><div><b>陳卷毛（遊戲角色）</b><div>{notice.content}</div></div></div>}
          {calling ? <CallScreen onEnd={() => setCalling(false)} /> : app ? (
            <div className="app-view">
              <div className="app-head"><button onClick={() => setApp(null)} aria-label="回主畫面">‹</button>{APP_META[app].name}</div>
              <div style={{ flex: 1, overflowY: 'auto', padding: app === 'chat' ? 0 : 12, display: 'flex', flexDirection: 'column' }}><AppBody app={app} onCall={() => setCalling(true)} onOpen={setApp} /></div>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', color: dark ? '#fffaf1' : 'var(--ink)', padding: '18px 0 0' }}>
                <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>{timeHM(now)}</div>
                <div className="small">{now.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}</div>
              </div>
              <div className="apps">
                {(['diary', 'chat', 'contacts', 'calls', 'photos', 'log', 'settings'] as AppId[]).map((id) => (
                  <button key={id} className="papp" onClick={() => setApp(id)} data-testid={`phone-app-${id}`} style={{ color: dark ? '#fffaf1' : 'var(--ink)' }}>
                    <span className="ico" style={{ background: APP_META[id].color }}><Icon name={APP_META[id].icon} size={30} /></span>
                    {id === 'chat' ? '訊息' : APP_META[id].name}
                    {id === 'chat' && unread > 0 && <span className="badge">{unread}</span>}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="home-bar" style={{ background: skin.accent }} />
        </div>
      </div>
    </div>
  );
}

function ContactCard({ onCall, onChat }: { onCall?: () => void; onChat: () => void }) {
  const { run } = useAction();
  return (
    <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
      <img className="px" src={portraitURL('chen', 'smile')} alt="陳卷毛" style={{ width: 96, borderRadius: 16, border: '3px solid var(--ink)' }} />
      <b style={{ fontSize: 18 }}>陳卷毛</b>
      <span className="muted">遊戲角色 · 男朋友</span>
      <div className="grid3" style={{ width: '100%' }}>
        <button className="btn small" onClick={onChat}>💬<br />訊息</button>
        <button className="btn small" onClick={onCall} data-testid="contact-call">📞<br />通話</button>
        <button className="btn small pink" onClick={() => run(async () => { markArrival(); await startVisit(); for (const a of await checkAchievements()) toast(`🏆 解鎖成就「${a.name}」+${a.reward}`, 'coin'); navigate('/room'); }, '陳卷毛出發了！')} data-testid="contact-invite">🏠<br />邀請來家裡</button>
      </div>
    </div>
  );
}

function PhotosApp() {
  const mem = useLive(() => db.all('loveMemories'), [], []) ?? [];
  const diary = useLive(() => db.all('diary'), [], []) ?? [];
  const ids = [...mem.flatMap((m) => m.photoIds), ...diary.flatMap((d) => d.photoIds)];
  if (!ids.length) return <Empty icon="star">還沒有照片。在日記或戀愛日記加入照片，就會出現在這裡。</Empty>;
  return <div className="row wrap">{ids.map((id) => <PhotoThumb key={id} id={id} size={92} />)}</div>;
}

function DeviceSettings() {
  const devs = useLive(() => db.all('ownedDevices'), [], []) ?? [];
  const skin = useLive(() => db.getKV<string>('meta', 'phoneSkin', 'phone_basic'), [], 'phone_basic');
  const wall = useLive(() => db.getKV<string>('meta', 'phoneWallpaper', 'cream'), [], 'cream');
  const { run } = useAction();
  const phones = devs.map((d) => deviceById.get(d.defId)!).filter((d) => d?.deviceType === 'phone');
  return (
    <div className="stack">
      <b>手機外觀</b>
      <div className="row wrap">{phones.map((p) => (
        <button key={p.id} className={'chip' + (skin === p.id ? ' on' : '')} onClick={() => run(() => db.setKV('meta', 'phoneSkin', p.id), `換成${p.name}`)}><img className="px" src={deviceURL(p, true).url} alt="" style={{ width: 14 }} />{p.name}</button>
      ))}</div>
      <Link to="/shop?tab=devices" className="btn small">買更多手機殼</Link>
      <b>手機桌布</b>
      <div className="row wrap">{Object.entries(WALLPAPERS).map(([k, v]) => <button key={k} aria-label={k} onClick={() => run(() => db.setKV('meta', 'phoneWallpaper', k))} style={{ width: 44, height: 64, borderRadius: 8, border: wall === k ? '3px solid var(--ink)' : '2px solid var(--wood-light)', background: v, cursor: 'pointer' }} />)}</div>
      <p className="muted">電腦、平板、手機共用同一份本機資料：在任何一台寫的日記，其他設備都看得到。</p>
    </div>
  );
}
