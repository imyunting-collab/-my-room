import { useState } from 'react';
import type { Book, ReadingStatus } from '../db/types';
import { BOOK_CATEGORIES } from '../data/catalog';
import { addBook, checkAchievements, updateBook } from '../services/reading';
import { Field, PhotoPicker, TagInput, useAction } from '../ui';
import { STATUS_LABEL } from '../state';
import { toast } from '../lib/bus';

export function BookForm({ book, onDone }: { book?: Book; onDone: (b?: Book) => void }) {
  const [f, setF] = useState({
    title: book?.title ?? '', author: book?.author ?? '', category: book?.category ?? BOOK_CATEGORIES[0], publisher: book?.publisher ?? '', isbn: book?.isbn ?? '',
    totalPages: book?.totalPages ? String(book.totalPages) : '', currentPage: book ? String(book.currentPage) : '0', status: (book?.status ?? 'want') as ReadingStatus,
    startDate: book?.startDate ?? '', finishDate: book?.finishDate ?? '', rating: book?.rating ?? 0, tags: book?.tags ?? [], cover: book?.coverPhotoId ? [book.coverPhotoId] : [] as string[],
  });
  const set = (k: keyof typeof f, v: any) => setF((x) => ({ ...x, [k]: v }));
  const { busy, run } = useAction();
  const submit = () => run(async () => {
    const data = {
      title: f.title, author: f.author, category: f.category, publisher: f.publisher || undefined, isbn: f.isbn || undefined,
      totalPages: Math.max(0, parseInt(f.totalPages) || 0), currentPage: Math.max(0, parseInt(f.currentPage) || 0), status: f.status,
      startDate: f.startDate || undefined, finishDate: f.finishDate || undefined, rating: f.rating || undefined, tags: f.tags, coverPhotoId: f.cover[0],
    };
    let saved: Book | undefined;
    if (book) { const r = await updateBook(book.id, data); if (r.finishedNow) toast('讀完一本書！+30 知識幣', 'coin'); }
    else { saved = await addBook(data); if (saved.status === 'finished') toast('讀完一本書！+30 知識幣', 'coin'); }
    const ach = await checkAchievements();
    ach.forEach((a) => toast(`🏆 解鎖成就「${a.name}」+${a.reward}`, 'coin'));
    onDone(saved);
  }, book ? '已更新書籍' : '已加入書庫，書架上多了一本書！');

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Field label="書名 *"><input value={f.title} onChange={(e) => set('title', e.target.value)} required placeholder="例如：小王子" name="title" /></Field>
      <div className="grid2">
        <Field label="作者"><input value={f.author} onChange={(e) => set('author', e.target.value)} name="author" /></Field>
        <Field label="分類"><select value={f.category} onChange={(e) => set('category', e.target.value)} name="category">{BOOK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <div className="grid2">
        <Field label="總頁數"><input inputMode="numeric" value={f.totalPages} onChange={(e) => set('totalPages', e.target.value.replace(/\D/g, ''))} name="totalPages" /></Field>
        <Field label="目前頁數"><input inputMode="numeric" value={f.currentPage} onChange={(e) => set('currentPage', e.target.value.replace(/\D/g, ''))} /></Field>
      </div>
      <Field label="閱讀狀態">
        <div className="chips">{(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((s) => <button type="button" key={s} className={'chip' + (f.status === s ? ' on' : '')} onClick={() => set('status', s)}>{STATUS_LABEL[s]}</button>)}</div>
      </Field>
      <div className="grid2">
        <Field label="開始日期"><input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
        <Field label="完成日期"><input type="date" value={f.finishDate} onChange={(e) => set('finishDate', e.target.value)} /></Field>
      </div>
      <div className="grid2">
        <Field label="出版社"><input value={f.publisher} onChange={(e) => set('publisher', e.target.value)} /></Field>
        <Field label="ISBN"><input value={f.isbn} onChange={(e) => set('isbn', e.target.value)} inputMode="numeric" /></Field>
      </div>
      <Field label="個人評分">
        <div className="chips">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} className={'chip' + (f.rating >= n ? ' on' : '')} onClick={() => set('rating', f.rating === n ? 0 : n)} aria-label={`${n} 顆星`}>★</button>)}</div>
      </Field>
      <Field label="標籤"><TagInput value={f.tags} onChange={(v) => set('tags', v)} /></Field>
      <Field label="封面照片"><PhotoPicker ids={f.cover} max={1} onChange={(v) => set('cover', v)} /></Field>
      <button className="btn primary block" disabled={busy} type="submit">{book ? '儲存變更' : '加入書庫'}</button>
    </form>
  );
}
