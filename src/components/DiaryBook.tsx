// 日記本翻閱：一頁一篇，左右滑動或點 ‹ › 翻頁，照片可以點開放大看。
import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent as RPE } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '../hooks';
import { usePhoto } from '../ui';
import { fmtDate } from '../lib/util';
import { sfx } from '../lib/sound';

export interface BookPage {
  id: string;
  date: string;
  title: string;
  content: string;
  photoIds: string[];
  /** small line under the title: mood, template, tags… */
  meta?: string;
  badge?: ReactNode;
  favorite?: boolean;
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
function dayLine(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  const w = new Date(y, m - 1, d).getDay();
  return `${y} 年 ${m} 月 ${d} 日・星期${WEEK[w]}`;
}

function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}

// ───────── 照片放大 ─────────
function ViewerImg({ id }: { id: string }) {
  const url = usePhoto(id);
  return url ? <img src={url} alt="照片" draggable={false} /> : <div className="pv-loading">載入中…</div>;
}

export function PhotoViewer({ ids, start = 0, onClose }: { ids: string[]; start?: number; onClose: () => void }) {
  const [i, setI] = useState(Math.min(start, Math.max(0, ids.length - 1)));
  const sx = useRef<number | null>(null);
  const go = useCallback((d: number) => setI((x) => Math.max(0, Math.min(ids.length - 1, x + d))), [ids.length]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [go, onClose]);
  if (!ids.length) return null;
  return (
    <Portal>
      <div className="photo-viewer" role="dialog" aria-modal="true" aria-label="照片" data-testid="photo-viewer"
        onPointerDown={(e) => { sx.current = e.clientX; }}
        onPointerUp={(e) => { if (sx.current == null) return; const dx = e.clientX - sx.current; sx.current = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="pv-top">
          <span>{ids.length > 1 ? `${i + 1} / ${ids.length}` : ''}</span>
          <button className="pv-btn" onClick={onClose} aria-label="關閉照片" data-testid="photo-viewer-close">✕</button>
        </div>
        <div className="pv-stage" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}><ViewerImg key={ids[i]} id={ids[i]} /></div>
        {ids.length > 1 && (
          <>
            <button className="pv-btn pv-prev" onClick={() => go(-1)} disabled={i === 0} aria-label="上一張">‹</button>
            <button className="pv-btn pv-next" onClick={() => go(1)} disabled={i === ids.length - 1} aria-label="下一張">›</button>
          </>
        )}
      </div>
    </Portal>
  );
}

// ───────── 日記本 ─────────
function PagePhoto({ id, onOpen }: { id: string; onOpen: () => void }) {
  const url = usePhoto(id);
  return (
    <button type="button" className="book-photo" onClick={(e) => { e.stopPropagation(); onOpen(); }} aria-label="放大照片" data-testid="book-photo">
      {url && <img src={url} alt="照片" draggable={false} />}
    </button>
  );
}

function Page({ p, n, total, onPhoto }: { p: BookPage; n: number; total: number; onPhoto: (i: number) => void }) {
  return (
    <article className="book-page" data-testid="book-page" data-id={p.id}>
      <div className="book-page-scroll">
        <div className="book-date">{dayLine(p.date)}</div>
        <h2 className="book-title">{p.favorite ? <span className="book-star">★</span> : null}{p.title}</h2>
        {(p.meta || p.badge) && <div className="book-meta">{p.badge}{p.meta}</div>}
        {p.photoIds.length > 0 && (
          <div className={'book-photos n' + Math.min(p.photoIds.length, 3)}>
            {p.photoIds.map((id, i) => <PagePhoto key={id} id={id} onOpen={() => onPhoto(i)} />)}
          </div>
        )}
        <div className="book-text">{p.content || <span className="muted">（這一頁沒有寫字）</span>}</div>
      </div>
      <div className="book-folio">— {n} / {total} —</div>
    </article>
  );
}

export function DiaryBook({ pages, startId, title, onClose, onEdit, onFavorite, extra }: {
  pages: BookPage[];
  startId?: string;
  title: string;
  onClose: () => void;
  onEdit?: (id: string) => void;
  /** one more button in the top bar (e.g. 做成明信片) */
  extra?: { label: string; onClick: (id: string) => void; testid?: string };
  onFavorite?: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(() => Math.max(0, pages.findIndex((p) => p.id === startId)));
  const [anim, setAnim] = useState<{ from: number; to: number; dir: 1 | -1 } | null>(null);
  const [photo, setPhoto] = useState<number | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const idx = Math.min(i, Math.max(0, pages.length - 1));

  const flip = useCallback((dir: 1 | -1) => {
    if (anim) return;
    const to = idx + dir;
    if (to < 0 || to >= pages.length) return;
    sfx('page');
    if (reduce) { setI(to); return; }
    setAnim({ from: idx, to, dir });
    setTimeout(() => { setI(to); setAnim(null); }, 520);
  }, [anim, idx, pages.length, reduce]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (photo != null) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') flip(1);
      if (e.key === 'ArrowLeft') flip(-1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [flip, onClose, photo]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!pages.length) return null;
  const cur = pages[idx];
  const onDown = (e: RPE<HTMLElement>) => { swipe.current = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: RPE<HTMLElement>) => {
    const s = swipe.current; swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) flip(dx < 0 ? 1 : -1);
  };

  // During a flip: the page underneath is the one being revealed; the top sheet turns.
  // Forward: old page turns away to the left. Backward: the previous page turns back in from the left.
  const under = anim ? (anim.dir === 1 ? anim.to : anim.from) : idx;
  const sheet = anim ? (anim.dir === 1 ? anim.from : anim.to) : null;

  return (
    <Portal>
      <div className="book-overlay" role="dialog" aria-modal="true" aria-label={title} data-testid="diary-book">
        <div className="book-bar">
          <button className="btn small" onClick={onClose} data-testid="book-close">‹ 闔上</button>
          <b className="book-name">{title}</b>
          <span className="row" style={{ gap: 6 }}>
            {onFavorite && <button className="btn small ghost" onClick={() => onFavorite(cur.id)} aria-label={cur.favorite ? '取消收藏' : '收藏'} style={{ color: cur.favorite ? '#c9a227' : undefined }}>{cur.favorite ? '★' : '☆'}</button>}
            {extra && <button className="btn small" onClick={() => extra.onClick(cur.id)} data-testid={extra.testid}>{extra.label}</button>}
            {onEdit && <button className="btn small" onClick={() => onEdit(cur.id)} data-testid="book-edit">✏️ 編輯</button>}
          </span>
        </div>
        <div className="book" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { swipe.current = null; }}>
          <div className="book-spine" />
          <div className="book-stack">
            <Page p={pages[under]} n={under + 1} total={pages.length} onPhoto={setPhoto} />
            {anim && sheet != null && (
              <div className={'book-sheet ' + (anim.dir === 1 ? 'turn-away' : 'turn-back')}>
                <Page p={pages[sheet]} n={sheet + 1} total={pages.length} onPhoto={() => undefined} />
              </div>
            )}
          </div>
        </div>
        <div className="book-nav">
          <button className="btn" onClick={() => flip(-1)} disabled={idx === 0 || !!anim} aria-label="上一頁" data-testid="book-prev">‹ 上一頁</button>
          <span className="muted small">{fmtDate(cur.date)}</span>
          <button className="btn" onClick={() => flip(1)} disabled={idx === pages.length - 1 || !!anim} aria-label="下一頁" data-testid="book-next">下一頁 ›</button>
        </div>
        {photo != null && <PhotoViewer ids={cur.photoIds} start={photo} onClose={() => setPhoto(null)} />}
      </div>
    </Portal>
  );
}
