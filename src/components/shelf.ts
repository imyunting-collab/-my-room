import type { Book } from '../db/types';
import { CATEGORY_COLORS } from '../data/catalog';
import type { ShelfBook } from '../sprites/furniture';

export function hashStr(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
/** One spine per distinct book (never per session), oldest first. */
export function shelfBooks(books: Book[]): (ShelfBook & { id: string })[] {
  return books.slice().sort((a, b) => a.createdAt - b.createdAt).map((b) => ({ id: b.id, color: CATEGORY_COLORS[b.category] ?? '#9a8f86', finished: b.status === 'finished', h: hashStr(b.id) }));
}
export function shelfRows(count: number, perRow: number, maxRows: number) { return Math.min(maxRows, Math.max(3, Math.ceil(count / perRow))); }
