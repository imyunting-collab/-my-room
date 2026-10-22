import { useState } from 'react';
import { db } from '../db/idb';
import { useLive } from '../hooks';
import { Link, navigate } from '../router';
import { STATUS_LABEL } from '../state';
import { BookCover, confirmDialog, Empty, Icon, moodLabel, PhotoThumb, Progress, Sheet, useAction } from '../ui';
import { BookForm } from '../components/BookForm';
import { deleteBook, deleteQuote, deleteSession, saveQuote } from '../services/reading';
import { fmtDate, fmtMinutes } from '../lib/util';

export default function BookPage({ id }: { id: string }) {
  const book = useLive(() => db.get('books', id), [id]);
  const sessions = (useLive(() => db.byIndex('sessions', 'bookId', id), [id], []) ?? []).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const quotes = useLive(() => db.byIndex('quotes', 'bookId', id), [id], []) ?? [];
  const [editing, setEditing] = useState(false);
  const [quote, setQuote] = useState('');
  const { busy, run } = useAction();
  if (book === undefined) return <p className="muted">載入中…</p>;
  if (!book) return <Empty icon="book">找不到這本書，可能已經被刪除了。<br /><Link to="/library">回書庫</Link></Empty>;
  const minutes = sessions.reduce((s, x) => s + x.minutes, 0);
  return (
    <div>
      <div className="card">
        <div className="book-row" style={{ alignItems: 'flex-start' }}>
          <BookCover book={book} large />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 19 }}>{book.title}</h2>
            <div className="muted">{book.author || '未知作者'}{book.publisher ? ` · ${book.publisher}` : ''}</div>
            <div className="row wrap" style={{ margin: '6px 0', gap: 4 }}><span className="tag">{STATUS_LABEL[book.status]}</span><span className="tag">{book.category}</span>{book.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>
            {book.rating ? <div style={{ color: '#c9a227' }}>{'★'.repeat(book.rating)}<span style={{ color: '#ddd' }}>{'★'.repeat(5 - book.rating)}</span></div> : null}
            <div className="small">{book.totalPages ? `${book.currentPage} / ${book.totalPages} 頁` : `讀到第 ${book.currentPage} 頁`}</div>
            {book.totalPages > 0 && <Progress value={book.currentPage / book.totalPages} />}
            <div className="muted" style={{ marginTop: 4 }}>{sessions.length} 次閱讀 · {fmtMinutes(minutes)}{book.startDate ? ` · ${book.startDate} 開始` : ''}{book.finishDate ? ` · ${book.finishDate} 讀完` : ''}</div>
          </div>
        </div>
        <div className="grid2" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={() => navigate(`/add?book=${book.id}`)}><Icon name="plus" />新增閱讀紀錄</button>
          <button className="btn" onClick={() => setEditing(true)}><Icon name="pen" />編輯書籍</button>
        </div>
      </div>

      <div className="card">
        <h2><Icon name="clock" />閱讀紀錄</h2>
        {sessions.length === 0 ? <p className="muted">還沒有閱讀紀錄。</p> : sessions.map((s) => (
          <div key={s.id} className="list-item" style={{ alignItems: 'flex-start', cursor: 'default' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row between"><b>{fmtDate(s.date)}</b><span className="small">{fmtMinutes(s.minutes)} · {s.pages} 頁</span></div>
              <div className="muted">{s.startTime && s.endTime ? `${s.startTime}–${s.endTime} · ` : ''}{s.startPage != null && s.endPage != null ? `p.${s.startPage}→${s.endPage} ` : ''}{moodLabel(s.mood)}</div>
              {s.reflection && <p style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>{s.reflection}</p>}
              {s.quote && <blockquote style={{ margin: '6px 0', padding: '6px 10px', borderLeft: '4px solid var(--pink)', background: 'var(--cream)' }}>「{s.quote}」</blockquote>}
              {s.photoIds.length > 0 && <div className="row wrap">{s.photoIds.map((p) => <PhotoThumb key={p} id={p} size={60} />)}</div>}
              <div className="row" style={{ marginTop: 6 }}>
                <button className="btn small" onClick={() => navigate(`/add?id=${s.id}`)}>編輯</button>
                <button className="btn small danger" onClick={async () => { if (await confirmDialog('刪除這筆閱讀紀錄？（已獲得的知識幣不會被收回）', { danger: true, ok: '刪除' })) run(() => deleteSession(s.id), '已刪除紀錄'); }}>刪除</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2><Icon name="quote" />佳句收藏</h2>
        {quotes.map((q) => (
          <div key={q.id} className="list-item" style={{ cursor: 'default' }}>
            <div style={{ flex: 1 }}>「{q.text}」{q.page ? <span className="muted"> p.{q.page}</span> : null}</div>
            <button className="btn small ghost" aria-label="刪除佳句" onClick={async () => { if (await confirmDialog('刪除這句佳句？', { danger: true, ok: '刪除' })) run(() => deleteQuote(q.id)); }}>✕</button>
          </div>
        ))}
        <form className="row" style={{ marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); run(async () => { await saveQuote({ text: quote, bookId: book.id }); setQuote(''); }, '已收藏佳句'); }}>
          <input className="input" value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="抄下一句喜歡的話…" />
          <button className="btn small" disabled={busy || !quote.trim()}>收藏</button>
        </form>
      </div>

      <button className="btn danger block" onClick={async () => {
        if (await confirmDialog(`確定刪除《${book.title}》？\n相關的閱讀紀錄與佳句也會一起刪除，書架上的書也會消失。`, { danger: true, ok: '刪除這本書' })) {
          await run(() => deleteBook(book.id), '已刪除');
          navigate('/library', true);
        }
      }}>刪除這本書</button>

      <Sheet open={editing} onClose={() => setEditing(false)} title="編輯書籍"><BookForm book={book} onDone={() => setEditing(false)} /></Sheet>
    </div>
  );
}
