// 閱讀地圖、書卡收藏、我的作品牆
import { useState } from 'react';
import { db } from '../db/idb';
import { useLive } from '../hooks';
import { navigate } from '../router';
import { AREAS, AREA_PAGES } from '../data/areas';
import { CATEGORY_COLORS } from '../data/catalog';
import { addArtwork, areaProgress, bookCards, deleteArtwork, isArtwork, syncAreas, syncBookCards, updateArtwork, updateCard } from '../services/progress';
import { savePhoto } from '../services/journal';
import { placeFurniture } from '../services/life';
import { BookCover, confirmDialog, Empty, Field, PhotoThumb, Progress, Sheet, useAction } from '../ui';
import { PhotoViewer } from '../components/DiaryBook';
import { fmtDate } from '../lib/util';
import type { OwnedFurniture } from '../db/types';

// ───────── 閱讀地圖 ─────────
export function MapPage() {
  const prog = useLive(async () => { await syncAreas(); return areaProgress(); }, [], []) ?? [];
  return (
    <div>
      <p className="muted">讀不同分類的書，房子會長出新的區域：每個分類讀滿 {AREA_PAGES} 頁或讀完 1 本就解鎖，新區域會出現在房間上方的分頁。</p>
      <div className="map-grid">
        {AREAS.map((a) => {
          const p = prog.find((x) => x.id === a.id);
          const open = !!p?.unlocked;
          return (
            <div key={a.id} className={'map-tile' + (open ? ' open' : '')} data-testid={`area-${a.id}`} data-unlocked={open ? '1' : '0'}>
              <div className="map-emoji">{open ? a.emoji : '🔒'}</div>
              <b>{a.name}</b>
              <div className="small muted">{a.cats.join('、')}</div>
              <div className="small">{a.desc}</div>
              {open ? <button className="btn small primary" onClick={() => navigate(`/room?scene=${a.id}`)}>去看看 ›</button> : (
                <><Progress value={p?.progress ?? 0} /><div className="small muted">已讀 {p?.pages ?? 0} / {AREA_PAGES} 頁{p?.finished ? `・讀完 ${p.finished} 本` : ''}</div></>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────── 書卡收藏 ─────────
export function CardsPage() {
  const cards = useLive(async () => { await syncBookCards(); return bookCards(); }, [], []) ?? [];
  const books = useLive(() => db.all('books'), [], []) ?? [];
  const quotes = useLive(() => db.all('quotes'), [], []) ?? [];
  const wallOwned = (useLive(() => db.all('ownedFurniture'), [], []) ?? []).some((f) => f.defId === 'card_wall');
  const [edit, setEdit] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const { run } = useAction();
  const editing = cards.find((c) => c.bookId === edit);
  return (
    <div>
      <p className="muted">每讀完一本書就會得到一張像素書卡。選一句最喜歡的佳句放上去，最多 3 張可以掛在房間的「書卡展示牆」{wallOwned ? '' : '（商店 20 知識幣）'}。</p>
      {cards.length === 0 ? <Empty icon="book">還沒有書卡。讀完第一本書就會拿到！</Empty> : (
        <div className="card-grid">
          {cards.map((c) => {
            const b = books.find((x) => x.id === c.bookId);
            if (!b) return null;
            return (
              <div key={c.bookId} className="book-card" style={{ ['--cc' as string]: CATEGORY_COLORS[b.category] ?? '#9a8f86' }} data-testid="book-card">
                <div className="book-card-top"><BookCover book={b} /><div style={{ minWidth: 0 }}><b>{b.title}</b><div className="small muted">{b.author}</div><div className="small muted">{fmtDate(c.date)} 讀完</div></div></div>
                <div className="book-card-quote">{c.quote ? `「${c.quote}」` : <span className="muted">（還沒選佳句）</span>}</div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn small" onClick={() => { setEdit(c.bookId); setCustom(c.quote); }}>✏️ 佳句</button>
                  <button className={'btn small' + (c.hung ? ' primary' : '')} onClick={() => run(() => updateCard(c.bookId, { hung: !c.hung }), c.hung ? '從牆上取下了' : '掛上書卡牆了')} data-testid="card-hang">{c.hung ? '✓ 掛著' : '🖼 掛到牆上'}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Sheet open={!!editing} onClose={() => setEdit(null)} title="選一句佳句">
        {editing && (
          <div className="stack">
            {quotes.filter((q) => q.bookId === editing.bookId).map((q) => <button key={q.id} className="list-item" onClick={() => { setEdit(null); run(() => updateCard(editing.bookId, { quote: q.text }), '書卡更新了'); }}>「{q.text}」</button>)}
            <Field label="或自己寫一句"><textarea value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={80} data-testid="card-quote" /></Field>
            <button className="btn primary" onClick={() => { setEdit(null); run(() => updateCard(editing.bookId, { quote: custom.trim() }), '書卡更新了'); }} data-testid="card-quote-save">儲存</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

// ───────── 我的作品牆 ─────────
const KIND_LABEL = { print: '手繪版畫', poem: '詩作', other: '其他作品' } as const;
export function GalleryPage() {
  const arts = (useLive(() => db.all('ownedFurniture'), [], []) ?? []).filter(isArtwork).sort((a, b) => b.purchasedAt - a.purchasedAt);
  const [form, setForm] = useState<{ id?: string; photoId?: string; title: string; kind: 'print' | 'poem' | 'other' } | null>(null);
  const [view, setView] = useState<OwnedFurniture | null>(null);
  const { busy, run } = useAction();
  return (
    <div>
      <p className="muted">把妳的手繪版畫和詩作拍下來，做成一個屬於妳的小展覽。作品會放進房間的收納箱，可以掛在任何一面牆上。</p>
      <label className="btn primary block" style={{ cursor: 'pointer' }}>
        {busy ? '儲存中…' : '＋ 加入作品照片'}
        <input type="file" accept="image/*" hidden data-testid="art-file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) run(async () => { const id = await savePhoto(f, 1600); setForm({ photoId: id, title: '', kind: 'print' }); }); }} />
      </label>
      {arts.length === 0 ? <Empty icon="star">還沒有作品。加一張妳的版畫或詩吧！</Empty> : (
        <div className="gallery-grid">
          {arts.map((a) => (
            <figure key={a.id} className="gallery-item" data-testid="artwork">
              <button className="thumb-btn" onClick={() => setView(a)} aria-label="放大作品"><PhotoThumb id={a.photoId!} size={140} /></button>
              <figcaption><b>{a.title}</b><span className="small muted">{KIND_LABEL[a.artKind ?? 'other']}・{a.roomId ? `掛在${a.roomId === 'balcony' ? '陽台' : '房間'}` : '收納中'}</span></figcaption>
              <div className="row" style={{ gap: 4, justifyContent: 'center' }}>
                {!a.roomId && <button className="btn small" onClick={() => run(async () => { await placeFurniture(a.id, 'bedroom', 96, 70); navigate('/room?scene=bedroom'); }, '掛到臥室牆上了，可以用「擺設」移動')} data-testid="art-hang">掛到臥室</button>}
                <button className="btn small ghost" onClick={() => setForm({ id: a.id, photoId: a.photoId, title: a.title ?? '', kind: a.artKind ?? 'other' })}>✏️</button>
                <button className="btn small ghost" onClick={async () => { if (await confirmDialog(`把「${a.title}」從作品牆拿掉？`, { danger: true, ok: '拿掉' })) run(() => deleteArtwork(a.id)); }} aria-label="刪除">🗑</button>
              </div>
            </figure>
          ))}
        </div>
      )}
      <Sheet open={!!form} onClose={() => setForm(null)} title="作品資訊">
        {form && (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); const id = form.id; run(async () => { if (id) await updateArtwork(id, { title: form.title, artKind: form.kind }); else await addArtwork(form.photoId!, form.title, form.kind); setForm(null); }, id ? '更新了' : '加入作品牆了 🖼'); }}>
            {form.photoId && <PhotoThumb id={form.photoId} size={120} />}
            <Field label="作品名稱"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例如：無名浪" data-testid="art-title" /></Field>
            <div className="chips">{(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map((k) => <button type="button" key={k} className={'chip' + (form.kind === k ? ' on' : '')} onClick={() => setForm({ ...form, kind: k })}>{KIND_LABEL[k]}</button>)}</div>
            <button className="btn primary" data-testid="art-save">儲存</button>
          </form>
        )}
      </Sheet>
      {view?.photoId && <PhotoViewer ids={[view.photoId]} onClose={() => setView(null)} />}
    </div>
  );
}
