// Apps shared by the computer, tablet and phone. They all read/write the SAME IndexedDB,
// so a diary written on the computer shows up on the phone immediately.
import { useEffect, useRef, useState } from 'react';
import { db } from '../db/idb';
import { useBus, useLive } from '../hooks';
import { navigate } from '../router';
import { useBooks, useSessions, useStats, STATUS_LABEL } from '../state';
import { deleteDiary, diaryToMarkdown, lastDiaryCoins, saveDiary, TEMPLATES, toggleFavorite } from '../services/journal';
import { clearChat, isTyping, markRead, recordCall, sendTopic, startVisit } from '../services/love';
import { markArrival } from '../pages/Room';
import { PARTNER_ID } from '../services/seed';
import { CHAT_TOPICS, CALL_LINES, type Line } from '../data/dialogue';
import { portraitURL } from '../sprites/characters';
import { BookCover, confirmDialog, Empty, Field, MoodPicker, MOODS, moodLabel, PhotoPicker, PhotoThumb, Progress, TagInput, useAction } from '../ui';
import { dateKey, downloadText, fmtDate, fmtDateTime, fmtMinutes, pick, timeHM } from '../lib/util';
import { toast } from '../lib/bus';
import { checkAchievements } from '../services/reading';
import type { DiaryEntry, DiaryTemplate, Mood } from '../db/types';
import { DiaryBook, type BookPage } from './DiaryBook';
import { unlockedTopics } from '../services/progress';

// ───────── 日記 ─────────
export function DiaryApp({ startId, compact }: { startId?: string; compact?: boolean }) {
  const all = useLive(() => db.all('diary'), [], []) ?? [];
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [reading, setReading] = useState<string | null>(startId ?? null);
  const backToBook = useRef<string | null>(null);
  const [q, setQ] = useState('');
  const [mood, setMood] = useState<string>('');
  const [fav, setFav] = useState(false);
  const [asc, setAsc] = useState(false);
  const list = all.filter((d) => (!q || (d.title + d.content + d.tags.join(' ')).toLowerCase().includes(q.toLowerCase())) && (!mood || d.mood === mood) && (!fav || d.isFavorite))
    .sort((a, b) => (asc ? 1 : -1) * (a.date.localeCompare(b.date) || a.createdAt - b.createdAt));
  const drafts = list.filter((d) => d.isDraft), done = list.filter((d) => !d.isDraft);
  const pages: BookPage[] = done.slice().sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt).map((d) => ({
    id: d.id, date: d.date, title: d.title, content: d.content, photoIds: d.photoIds, favorite: d.isFavorite,
    meta: [TEMPLATES[d.template].label, moodLabel(d.mood), d.tags.map((t) => `#${t}`).join(' ')].filter(Boolean).join('　'),
  }));
  if (editing) return <DiaryEditor id={editing === 'new' ? undefined : editing} onClose={() => { setEditing(null); if (backToBook.current) { setReading(backToBook.current); backToBook.current = null; } }} />;
  const book = reading && pages.some((p) => p.id === reading) ? (
    <DiaryBook pages={pages} startId={reading} title="我的日記本" onClose={() => setReading(null)}
      onFavorite={(id) => toggleFavorite(id)}
      onEdit={(id) => { backToBook.current = id; setReading(null); setEditing(id); }} />
  ) : null;
  return (
    <div className="stack" data-testid="diary-app">
      {book}
      <div className="row">
        <input className="input" placeholder="搜尋日記…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜尋日記" />
        <button className="btn small primary" onClick={() => setEditing('new')} data-testid="new-diary">＋ 新日記</button>
      </div>
      {pages.length > 0 && <button className="btn pink block" onClick={() => setReading(pages[pages.length - 1].id)} data-testid="open-diary-book">📖 翻閱日記本（{pages.length} 頁）</button>}
      <div className="chips">
        <button className={'chip' + (fav ? ' on' : '')} onClick={() => setFav(!fav)}>★ 收藏</button>
        <button className="chip" onClick={() => setAsc(!asc)}>{asc ? '舊→新' : '新→舊'}</button>
        <select className="chip" value={mood} onChange={(e) => setMood(e.target.value)} aria-label="依心情篩選" style={{ minHeight: 36 }}>
          <option value="">全部心情</option>{MOODS.map(([k, e, l]) => <option key={k} value={k}>{e} {l}</option>)}
        </select>
        <button className="chip" onClick={() => downloadText(diaryToMarkdown(done), `MY-ROOM-日記-${dateKey()}.md`, 'text/markdown')}>⬇ 匯出</button>
      </div>
      {drafts.length > 0 && <div><b className="small">草稿</b>{drafts.map((d) => <DiaryRow key={d.id} d={d} onOpen={() => setEditing(d.id)} compact={compact} />)}</div>}
      {done.length === 0 ? <Empty icon="journal">{all.length ? '沒有符合的日記' : '還沒有日記。今天發生了什麼小事，是你想替未來的自己留下來的？'}</Empty>
        : <div className="list" data-testid="diary-list">{done.map((d) => <DiaryRow key={d.id} d={d} onOpen={() => setReading(d.id)} compact={compact} />)}</div>}
    </div>
  );
}
function DiaryRow({ d, onOpen, compact }: { d: DiaryEntry; onOpen: () => void; compact?: boolean }) {
  return (
    <div className="list-item" onClick={onOpen} role="button" tabIndex={0} data-testid="diary-row">
      {!compact && d.photoIds[0] && <PhotoThumb id={d.photoIds[0]} size={48} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row between"><b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</b><span className="muted" style={{ whiteSpace: 'nowrap' }}>{d.date}</span></div>
        <div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{TEMPLATES[d.template].label} {moodLabel(d.mood)} {d.content.slice(0, 40)}</div>
      </div>
      <button className="btn small ghost" onClick={(e) => { e.stopPropagation(); toggleFavorite(d.id); }} aria-label={d.isFavorite ? '取消收藏' : '收藏'} style={{ color: d.isFavorite ? '#c9a227' : undefined }}>{d.isFavorite ? '★' : '☆'}</button>
    </div>
  );
}
export function DiaryEditor({ id, onClose, template: t0 }: { id?: string; onClose: () => void; template?: DiaryTemplate }) {
  const [f, setF] = useState({ id, title: '', content: '', date: dateKey(), mood: undefined as Mood | undefined, template: t0 ?? ('life' as DiaryTemplate), tags: [] as string[], photoIds: [] as string[], isFavorite: false });
  const [loaded, setLoaded] = useState(!id);
  const { busy, run } = useAction();
  const set = (k: keyof typeof f, v: any) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => {
    if (id) db.get('diary', id).then((d) => { if (d) setF({ id: d.id, title: d.title === '（草稿）' ? '' : d.title, content: d.content, date: d.date, mood: d.mood, template: d.template, tags: d.tags, photoIds: d.photoIds, isFavorite: d.isFavorite }); setLoaded(true); });
    else db.getKV<typeof f | null>('meta', 'diaryDraft', null).then((d) => { if (d && (d.title || d.content)) { setF({ ...d, id: undefined }); toast('已恢復上次沒寫完的內容', 'info'); } });
  }, [id]);
  // autosave unsaved new entries so nothing is lost if the app closes
  useEffect(() => { if (!id && loaded) { const t = setTimeout(() => db.setKV('meta', 'diaryDraft', f), 500); return () => clearTimeout(t); } }, [f, id, loaded]);
  const clearDraft = () => db.setKV('meta', 'diaryDraft', null);
  if (!loaded) return <p className="muted">載入中…</p>;
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await saveDiary(f); await clearDraft(); if (lastDiaryCoins) toast(`📔 寫日記 +${lastDiaryCoins} 知識幣`, 'coin'); for (const a of await checkAchievements()) toast(`🏆 解鎖成就「${a.name}」+${a.reward}`, 'coin'); onClose(); }, '日記已儲存'); }} data-testid="diary-editor">
      <div className="row"><button type="button" className="btn small" onClick={onClose}>‹ 返回</button><span className="spacer" /><button type="button" className="btn small ghost" onClick={() => set('isFavorite', !f.isFavorite)} style={{ color: f.isFavorite ? '#c9a227' : undefined }}>{f.isFavorite ? '★ 已收藏' : '☆ 收藏'}</button></div>
      <div className="chips">{(Object.keys(TEMPLATES) as DiaryTemplate[]).map((k) => <button type="button" key={k} className={'chip' + (f.template === k ? ' on' : '')} onClick={() => set('template', k)}>{TEMPLATES[k].label}</button>)}</div>
      <div className="grid2">
        <Field label="標題"><input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder={TEMPLATES[f.template].label} name="diary-title" /></Field>
        <Field label="日期"><input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
      </div>
      <Field label="內容"><textarea value={f.content} onChange={(e) => set('content', e.target.value)} placeholder={TEMPLATES[f.template].prompt} style={{ minHeight: 160 }} name="diary-content" /></Field>
      <Field label="心情"><MoodPicker value={f.mood} onChange={(v) => set('mood', v)} /></Field>
      <Field label="標籤"><TagInput value={f.tags} onChange={(v) => set('tags', v)} /></Field>
      <Field label="照片"><PhotoPicker ids={f.photoIds} onChange={(v) => set('photoIds', v)} /></Field>
      <div className="grid2">
        <button type="button" className="btn" disabled={busy} onClick={() => run(async () => { await saveDiary(f, { draft: true }); await clearDraft(); onClose(); }, '已存成草稿')}>存草稿</button>
        <button className="btn primary" disabled={busy} type="submit" data-testid="save-diary">儲存日記</button>
      </div>
      {id && <button type="button" className="btn danger" onClick={async () => { if (await confirmDialog('刪除這篇日記？', { danger: true, ok: '刪除' })) { await run(() => deleteDiary(id), '已刪除'); onClose(); } }}>刪除</button>}
    </form>
  );
}

// ───────── 戀愛訊息（遊戲內聊天）─────────
export function ChatApp({ onCall, embedded }: { onCall?: () => void; embedded?: boolean }) {
  const msgs = (useLive(() => db.byIndex('chat', 'contactId', PARTNER_ID), [], []) ?? []).sort((a, b) => a.timestamp - b.timestamp);
  const [typing, setTyping] = useState(isTyping());
  const end = useRef<HTMLDivElement | null>(null);
  const { busy, run } = useAction();
  useBus<boolean>('typing', setTyping);
  useEffect(() => { markRead(); end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length, typing]);
  const lastPartner = [...msgs].reverse().find((m) => m.sender === 'partner');
  const unlockedT = useLive(unlockedTopics, [], []) ?? [];
  const invite = () => run(async () => { markArrival(); await startVisit(); for (const a of await checkAchievements()) toast(`🏆 解鎖成就「${a.name}」+${a.reward}`, 'coin'); navigate('/room'); }, '陳卷毛出發了！');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: embedded ? 0 : 420 }} data-testid="chat-app">
      <div className="fiction-note">陳卷毛的回覆是遊戲內角色台詞，不是真實訊息。</div>
      <div className="chat">
        {msgs.length === 0 && <Empty icon="chat">選一個話題，跟陳卷毛聊聊天吧。</Empty>}
        {msgs.map((m) => (
          <div key={m.id} className={'msg ' + m.sender}>
            {m.sender === 'partner' && <img className="av" src={portraitURL('chen', (m.emotion as any) ?? 'smile')} alt="" />}
            <div className="bubble-c">{m.content}</div>
            <time>{timeHM(m.timestamp)}</time>
          </div>
        ))}
        {lastPartner?.interactionType?.endsWith(':invite') && <button className="btn small pink" style={{ alignSelf: 'center' }} onClick={invite}>💗 邀請陳卷毛來家裡</button>}
        {lastPartner?.interactionType?.endsWith(':meal') && <button className="btn small pink" style={{ alignSelf: 'center' }} onClick={invite}>🍙 請他來家裡吃飯</button>}
        {lastPartner?.interactionType?.endsWith(':read') && <button className="btn small pink" style={{ alignSelf: 'center' }} onClick={invite}>📖 請他來一起看書</button>}
        <div ref={end} />
      </div>
      {typing && <div className="typing">陳卷毛正在輸入…</div>}
      <div className="options" role="group" aria-label="對話選項">
        {CHAT_TOPICS.filter((t) => !t.locked || unlockedT.includes(t.id)).map((t) => <button key={t.id} className={t.locked ? 'new-topic' : ''} disabled={busy || typing} onClick={() => run(() => sendTopic(t.id))} data-testid={`topic-${t.id}`}>{t.locked ? '💞 ' : ''}{t.prompt}</button>)}
      </div>
      <div className="row" style={{ padding: '6px 10px 10px', background: 'var(--cream)', gap: 6 }}>
        {onCall && <button className="btn small" onClick={onCall} data-testid="start-call">📞 打電話</button>}
        <button className="btn small pink" onClick={invite} data-testid="chat-invite">💗 邀請來家裡</button>
        <span className="spacer" />
        <button className="btn small ghost" onClick={async () => { if (await confirmDialog('清除所有聊天紀錄？', { danger: true, ok: '清除' })) run(() => clearChat()); }}>清除</button>
      </div>
    </div>
  );
}

export function CallScreen({ onEnd }: { onEnd: () => void }) {
  const [phase, setPhase] = useState<'dialing' | 'talking' | 'ended'>('dialing');
  const [start] = useState(Date.now());
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [lines] = useState<Line[]>(() => pick(CALL_LINES));
  const [idx, setIdx] = useState(0);
  useEffect(() => { const t = setTimeout(() => { setPhase('talking'); setConnectedAt(Date.now()); }, 2200); return () => clearTimeout(t); }, []);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (phase === 'talking') { const t = setInterval(() => setIdx((i) => Math.min(lines.length - 1, i + 1)), 2600); return () => clearInterval(t); } }, [phase]);
  const hang = async () => { setPhase('ended'); await recordCall(start, connectedAt ? 'completed' : 'cancelled'); setTimeout(onEnd, 900); };
  const secs = connectedAt ? Math.floor((Date.now() - connectedAt) / 1000) : 0;
  void tick;
  const l = lines[idx];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20, background: 'linear-gradient(#354b3b, #26354d)', color: '#fffaf1', textAlign: 'center' }} data-testid="call-screen" data-phase={phase}>
      <img className="px" src={portraitURL('chen', phase === 'talking' ? l.emotion : 'normal')} alt="陳卷毛" style={{ width: 110, borderRadius: 20, border: '3px solid #fffaf1' }} />
      <b style={{ fontSize: 20 }}>陳卷毛</b>
      <div>{phase === 'dialing' ? '正在撥打…' : phase === 'talking' ? `通話中 ${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}` : '通話結束'}</div>
      {phase === 'talking' && <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', minHeight: 48 }}>「{l.text}」</div>}
      <div className="muted" style={{ color: '#d6dce8' }}>遊戲內模擬通話，不會撥打真實電話</div>
      {phase !== 'ended' && <button className="btn" style={{ background: '#d9475a', color: '#fff', borderRadius: 999, width: 70, height: 70 }} onClick={hang} aria-label="結束通話" data-testid="hang-up">📞</button>}
    </div>
  );
}

export function CallLog() {
  const calls = (useLive(() => db.all('calls'), [], []) ?? []).sort((a, b) => b.startedAt - a.startedAt);
  if (!calls.length) return <Empty icon="call">還沒有通話紀錄。</Empty>;
  return <div className="list">{calls.map((c) => <div key={c.id} className="list-item" style={{ cursor: 'default' }}><span>{c.outcome === 'completed' ? '📞' : '📵'}</span><div style={{ flex: 1 }}>陳卷毛<div className="muted">{fmtDateTime(c.startedAt)} · {c.outcome === 'completed' ? `${Math.max(1, Math.round((c.endedAt - c.startedAt) / 1000))} 秒` : '未接通'}</div></div></div>)}</div>;
}

// ───────── 閱讀相關 ─────────
export function LibraryApp() {
  const books = useBooks();
  if (!books.length) return <Empty icon="book">書庫還是空的。</Empty>;
  return <div className="list">{books.map((b) => (
    <button key={b.id} className="list-item" onClick={() => navigate(`/book/${b.id}`)}>
      <BookCover book={b} />
      <div style={{ flex: 1, minWidth: 0 }}><b>{b.title}</b><div className="muted">{STATUS_LABEL[b.status]} · {b.author}</div>{b.totalPages > 0 && <Progress value={b.currentPage / b.totalPages} />}</div>
    </button>
  ))}</div>;
}
export function ReadingLogApp() {
  const sessions = useSessions();
  const books = useBooks();
  if (!sessions.length) return <Empty icon="clock">還沒有閱讀紀錄。</Empty>;
  return <div className="list">{sessions.slice(0, 50).map((s) => (
    <button key={s.id} className="list-item" onClick={() => navigate(`/book/${s.bookId}`)}>
      <div style={{ flex: 1 }}><b>《{books.find((b) => b.id === s.bookId)?.title}》</b><div className="muted">{fmtDate(s.date)} · {fmtMinutes(s.minutes)} · {s.pages} 頁 {moodLabel(s.mood)}</div></div>
    </button>
  ))}</div>;
}
export function QuotesApp() {
  const quotes = (useLive(() => db.all('quotes'), [], []) ?? []).sort((a, b) => b.createdAt - a.createdAt);
  const books = useBooks();
  if (!quotes.length) return <Empty icon="quote">還沒有佳句。</Empty>;
  return <div className="list">{quotes.map((q) => <div key={q.id} className="list-item" style={{ cursor: 'default' }}><div>「{q.text}」<div className="muted">《{books.find((b) => b.id === q.bookId)?.title ?? '—'}》</div></div></div>)}</div>;
}
export function NotesApp() {
  // 閱讀手札：心得 + 佳句
  const sessions = useSessions().filter((s) => s.reflection || s.quote);
  const books = useBooks();
  if (!sessions.length) return <Empty icon="pen">還沒有手札內容。新增閱讀紀錄時寫下心得或佳句，就會出現在這裡。</Empty>;
  return <div className="list">{sessions.map((s) => (
    <div key={s.id} className="list-item" style={{ cursor: 'default', alignItems: 'flex-start' }}>
      <div><b>《{books.find((b) => b.id === s.bookId)?.title}》</b> <span className="muted">{s.date}</span>{s.reflection && <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>{s.reflection}</p>}{s.quote && <p style={{ margin: 0 }} className="small">「{s.quote}」</p>}</div>
    </div>
  ))}</div>;
}
export function StatsApp() {
  const { stats } = useStats();
  return (
    <div className="grid2">
      <div className="stat"><b>{stats.totalPages}</b><span>累積頁數</span></div>
      <div className="stat"><b>{fmtMinutes(stats.totalMinutes)}</b><span>累積時間</span></div>
      <div className="stat"><b>{stats.finished}</b><span>完成書籍</span></div>
      <div className="stat"><b>{stats.currentStreak}</b><span>連續天數</span></div>
      <button className="btn small" style={{ gridColumn: 'span 2' }} onClick={() => navigate('/stats')}>完整統計 ›</button>
    </div>
  );
}
