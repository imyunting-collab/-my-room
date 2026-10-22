import { useEffect, useState } from 'react';
import { db } from '../db/idb';
import { navigate } from '../router';
import { useBooks } from '../state';
import { Field, Icon, MoodPicker, PhotoPicker, Sheet, TagInput, useAction } from '../ui';
import { BookForm } from '../components/BookForm';
import { checkAchievements, saveSession } from '../services/reading';
import { pushEvent } from '../services/love';
import { dateKey, minutesBetween, timeHM } from '../lib/util';
import { toast } from '../lib/bus';
import type { Mood } from '../db/types';

export default function AddSessionPage({ sessionId, bookId }: { sessionId?: string; bookId?: string }) {
  const books = useBooks();
  const [loaded, setLoaded] = useState(!sessionId);
  const [f, setF] = useState({
    bookId: bookId ?? '', date: dateKey(), startTime: '', endTime: '', minutes: '', startPage: '', endPage: '',
    mood: undefined as Mood | undefined, reflection: '', quote: '', photoIds: [] as string[], tags: [] as string[], markFinished: false,
  });
  const [newBook, setNewBook] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const { busy, run } = useAction();
  const set = (k: keyof typeof f, v: any) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!sessionId) return;
    db.get('sessions', sessionId).then((s) => {
      if (s) setF({ bookId: s.bookId, date: s.date, startTime: s.startTime ?? '', endTime: s.endTime ?? '', minutes: String(s.minutes), startPage: s.startPage?.toString() ?? '', endPage: s.endPage?.toString() ?? '', mood: s.mood, reflection: s.reflection ?? '', quote: s.quote ?? '', photoIds: s.photoIds, tags: s.tags, markFinished: false });
      setLoaded(true);
    });
  }, [sessionId]);
  // default book: the one currently being read
  useEffect(() => { if (!f.bookId && !sessionId && books.length) set('bookId', (books.find((b) => b.status === 'reading') ?? books[0]).id); }, [books.length]);
  // pre-fill start page from the book's progress
  const book = books.find((b) => b.id === f.bookId);
  useEffect(() => { if (book && !sessionId && f.startPage === '') set('startPage', String(book.currentPage)); }, [book?.id]);
  const autoMin = minutesBetween(f.startTime, f.endTime);
  useEffect(() => { if (autoMin != null) set('minutes', String(autoMin)); }, [autoMin]);
  useEffect(() => { if (book?.totalPages && parseInt(f.endPage) >= book.totalPages && book.status !== 'finished') set('markFinished', true); }, [f.endPage, book?.id]);

  const pages = f.startPage !== '' && f.endPage !== '' ? Math.max(0, parseInt(f.endPage) - parseInt(f.startPage)) : 0;
  const submit = () => run(async () => {
    const res = await saveSession({
      id: sessionId, bookId: f.bookId, date: f.date, startTime: f.startTime, endTime: f.endTime, minutes: parseInt(f.minutes) || 0,
      startPage: f.startPage === '' ? undefined : parseInt(f.startPage), endPage: f.endPage === '' ? undefined : parseInt(f.endPage),
      mood: f.mood, reflection: f.reflection, quote: f.quote, photoIds: f.photoIds, tags: f.tags, markFinished: f.markFinished,
    });
    toast(sessionId ? '已更新閱讀紀錄' : '已儲存閱讀紀錄', 'success');
    if (res.coins) toast(`知識幣 +${res.coins}（${res.rewards.join('、')}）`, 'coin');
    for (const a of await checkAchievements()) toast(`🏆 解鎖成就「${a.name}」+${a.reward}`, 'coin');
    if (!sessionId) {
      const key = `cheer:${dateKey()}`;
      if (res.finishedBook) pushEvent('bookFinished');
      else if (!(await db.get('meta', key))) { await db.setKV('meta', key, true); setTimeout(() => pushEvent('readingDone'), 2500); }
    }
    navigate(`/book/${f.bookId}`, true);
  });

  if (!loaded) return <p className="muted">載入中…</p>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="card">
        <Field label="哪一本書？">
          <div className="row">
            <select value={f.bookId} onChange={(e) => { set('bookId', e.target.value); set('startPage', ''); }} name="bookId" required>
              {!books.length && <option value="">（還沒有書）</option>}
              {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <button type="button" className="btn small" onClick={() => setNewBook(true)}>＋新書</button>
          </div>
        </Field>
        <div className="grid2">
          <Field label="日期"><input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} required /></Field>
          <Field label="閱讀分鐘數"><input inputMode="numeric" value={f.minutes} onChange={(e) => set('minutes', e.target.value.replace(/\D/g, ''))} placeholder="例如 30" name="minutes" /></Field>
        </div>
        <div className="grid2">
          <Field label="開始時間"><input type="time" value={f.startTime} onChange={(e) => set('startTime', e.target.value)} /></Field>
          <Field label="結束時間"><input type="time" value={f.endTime} onChange={(e) => set('endTime', e.target.value)} /></Field>
        </div>
        {!sessionId && (
          timerStart == null
            ? <button type="button" className="btn small" onClick={() => { setTimerStart(Date.now()); set('startTime', timeHM()); set('endTime', ''); }}>⏱ 開始計時</button>
            : <button type="button" className="btn small pink" onClick={() => { set('endTime', timeHM()); setTimerStart(null); }}>⏹ 結束計時（{timeHM(timerStart)} 開始）</button>
        )}
        <div className="grid2" style={{ marginTop: 12 }}>
          <Field label="開始頁碼"><input inputMode="numeric" value={f.startPage} onChange={(e) => set('startPage', e.target.value.replace(/\D/g, ''))} name="startPage" /></Field>
          <Field label={`結束頁碼${book?.totalPages ? `（共 ${book.totalPages}）` : ''}`}><input inputMode="numeric" value={f.endPage} onChange={(e) => set('endPage', e.target.value.replace(/\D/g, ''))} name="endPage" /></Field>
        </div>
        <p className="small" style={{ marginTop: -4 }}>本次閱讀 <b>{pages}</b> 頁 · <b>{parseInt(f.minutes) || 0}</b> 分鐘</p>
        {book && book.status !== 'finished' && (
          <label className="row small" style={{ cursor: 'pointer' }}><input type="checkbox" checked={f.markFinished} onChange={(e) => set('markFinished', e.target.checked)} style={{ width: 22, height: 22 }} />這次讀完這本書了（+30 知識幣）</label>
        )}
      </div>
      <div className="card">
        <Field label="心情"><MoodPicker value={f.mood} onChange={(v) => set('mood', v)} /></Field>
        <Field label="心得"><textarea value={f.reflection} onChange={(e) => set('reflection', e.target.value)} placeholder="今天讀到哪一段，讓你停下來想了一下？" name="reflection" /></Field>
        <Field label="佳句（會自動收藏）"><textarea value={f.quote} onChange={(e) => set('quote', e.target.value)} style={{ minHeight: 64 }} placeholder="抄下一句喜歡的話" /></Field>
        <Field label="標籤"><TagInput value={f.tags} onChange={(v) => set('tags', v)} /></Field>
        <Field label="閱讀照片"><PhotoPicker ids={f.photoIds} onChange={(v) => set('photoIds', v)} /></Field>
      </div>
      <button className="btn primary block" disabled={busy || !f.bookId} type="submit" data-testid="save-session"><Icon name="check" />{sessionId ? '儲存變更' : '儲存閱讀紀錄'}</button>
      <Sheet open={newBook} onClose={() => setNewBook(false)} title="新增書籍"><BookForm onDone={(b) => { setNewBook(false); if (b) { set('bookId', b.id); set('startPage', '0'); } }} /></Sheet>
    </form>
  );
}
