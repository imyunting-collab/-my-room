import { useState } from 'react';
import { Link } from '../router';
import { useBooks, useSessions, STATUS_LABEL } from '../state';
import { shelfBooks } from '../components/shelf';
import { BookCover, Empty, Progress, Sheet } from '../ui';
import { fmtMinutes } from '../lib/util';

const PER_ROW = 12;
export default function BookshelfPage() {
  const books = useBooks();
  const sessions = useSessions();
  const spines = shelfBooks(books);
  const [open, setOpen] = useState<string | null>(null);
  const rows = Math.max(3, Math.ceil(spines.length / PER_ROW));
  const book = books.find((b) => b.id === open);
  const bs = sessions.filter((s) => s.bookId === open);
  return (
    <div>
      <p className="muted">每一本書都會在書架上長出一本像素書（同一本書讀很多次也只有一本）。書架滿了會自動加層。⭐ 是已讀完的書。</p>
      <div style={{ background: '#7a5235', border: '3px solid var(--ink)', borderRadius: 6, padding: '10px 8px 4px', boxShadow: '0 4px 0 var(--ink)' }} data-testid="bookshelf">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 74, padding: '0 6px', background: '#5e3c27', borderBottom: '8px solid #b07d52', marginBottom: 8 }}>
            {spines.slice(r * PER_ROW, (r + 1) * PER_ROW).map((s) => {
              const b = books.find((x) => x.id === s.id)!;
              return (
                <button key={s.id} data-testid="spine" onClick={() => setOpen(s.id)} title={b.title} aria-label={b.title}
                  style={{ width: 'calc((100% - 33px) / 12)', minWidth: 18, height: 50 + (s.h % 5) * 4, background: s.color, border: '2px solid #2b1d1a', borderRadius: '2px 2px 0 0', cursor: 'pointer', padding: 0, position: 'relative', boxShadow: 'inset 3px 0 0 rgba(255,255,255,0.25)' }}>
                  <span style={{ position: 'absolute', left: 0, right: 0, top: 6, height: 2, background: 'rgba(0,0,0,0.25)' }} />
                  {s.finished && <span style={{ position: 'absolute', left: 0, right: 0, bottom: 4, fontSize: 10 }}>⭐</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="small" style={{ marginTop: 14 }}>共 {spines.length} 本 · 已讀完 {spines.filter((s) => s.finished).length} 本</p>
      {spines.length === 0 && <Empty icon="shelf">書架還空空的。<br /><Link to="/library">到書庫新增第一本書</Link></Empty>}
      <Sheet open={!!book} onClose={() => setOpen(null)} title={book?.title}>
        {book && (
          <div className="stack">
            <div className="book-row"><BookCover book={book} /><div style={{ flex: 1 }}>
              <div className="muted">{book.author} · {book.category} · {STATUS_LABEL[book.status]}</div>
              {book.totalPages > 0 && <><Progress value={book.currentPage / book.totalPages} /><div className="small">{book.currentPage}/{book.totalPages} 頁</div></>}
              <div className="small">{bs.length} 次閱讀 · {fmtMinutes(bs.reduce((a, s) => a + s.minutes, 0))}</div>
            </div></div>
            {bs.find((s) => s.reflection) && <p style={{ margin: 0 }}>最近的心得：{bs.find((s) => s.reflection)!.reflection}</p>}
            {bs.find((s) => s.quote) && <p style={{ margin: 0 }}>佳句：「{bs.find((s) => s.quote)!.quote}」</p>}
            <Link to={`/book/${book.id}`} className="btn primary">查看完整書籍頁</Link>
          </div>
        )}
      </Sheet>
    </div>
  );
}
