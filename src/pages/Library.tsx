import { useState } from 'react';
import { Link } from '../router';
import { useBooks, useSessions, STATUS_LABEL } from '../state';
import { BookCover, Empty, Icon, Progress, Sheet } from '../ui';
import { BookForm } from '../components/BookForm';
import { BOOK_CATEGORIES } from '../data/catalog';
import type { ReadingStatus } from '../db/types';

export default function LibraryPage() {
  const books = useBooks();
  const sessions = useSessions();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ReadingStatus | 'all'>('all');
  const [cat, setCat] = useState('all');
  const [adding, setAdding] = useState(false);
  const list = books.filter((b) => (status === 'all' || b.status === status) && (cat === 'all' || b.category === cat) &&
    (!q || [b.title, b.author, b.publisher, b.isbn, ...b.tags].join(' ').toLowerCase().includes(q.toLowerCase())));
  const count = (id: string) => sessions.filter((s) => s.bookId === id).length;
  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input" placeholder="搜尋書名、作者、標籤…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜尋書籍" />
        <button className="btn primary" onClick={() => setAdding(true)} data-testid="add-book"><Icon name="plus" />新增</button>
      </div>
      <div className="chips" style={{ marginBottom: 8 }}>
        <button className={'chip' + (status === 'all' ? ' on' : '')} onClick={() => setStatus('all')}>全部 {books.length}</button>
        {(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((s) => <button key={s} className={'chip' + (status === s ? ' on' : '')} onClick={() => setStatus(s)}>{STATUS_LABEL[s]} {books.filter((b) => b.status === s).length}</button>)}
      </div>
      <select className="input" value={cat} onChange={(e) => setCat(e.target.value)} style={{ marginBottom: 12 }} aria-label="分類篩選">
        <option value="all">所有分類</option>{BOOK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <div className="card">
        {list.length === 0 ? <Empty icon="book">{books.length ? '沒有符合條件的書' : '書庫還是空的，新增第一本書吧！'}</Empty> : (
          <div className="list" data-testid="book-list">
            {list.map((b) => (
              <Link key={b.id} to={`/book/${b.id}`} className="list-item">
                <BookCover book={b} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row between"><b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</b><span className="tag">{STATUS_LABEL[b.status]}</span></div>
                  <div className="muted">{b.author || '未知作者'} · {b.category} · {count(b.id)} 次紀錄</div>
                  {b.totalPages > 0 && <Progress value={b.currentPage / b.totalPages} />}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Link to="/bookshelf" className="btn block"><Icon name="shelf" />看看我的動態書架</Link>
      <Sheet open={adding} onClose={() => setAdding(false)} title="新增書籍"><BookForm onDone={() => setAdding(false)} /></Sheet>
    </div>
  );
}
