// Diary (shared by computer / tablet / phone) and photos.
import { db } from '../db/idb';
import type { DiaryEntry, DiaryTemplate } from '../db/types';
import { dateKey, uuid } from '../lib/util';
import { GameError, txGrant } from './wallet';

export const TEMPLATES: Record<DiaryTemplate, { label: string; prompt: string }> = {
  life: { label: '今日生活', prompt: '今天發生了什麼小事，是你想替未來的自己留下來的？' },
  reading: { label: '閱讀心得', prompt: '今天讀到哪一段，讓你停下來想了一下？' },
  love: { label: '戀愛日記', prompt: '今天有沒有哪個瞬間，讓你特別想念他？' },
  mood: { label: '今日心情', prompt: '用三個詞形容今天的心情，然後說說為什麼。' },
  free: { label: '自由書寫', prompt: '今天有沒有哪個瞬間，讓你覺得生活其實很可愛？' },
};

export type DiaryInput = Partial<DiaryEntry> & { title: string; content: string; template: DiaryTemplate };

export const DIARY_COIN = 5, DIARY_COIN_PER_DAY = 3;
/** coins paid by the last saveDiary call (0 if none) */
export let lastDiaryCoins = 0;
export async function saveDiary(input: DiaryInput, opts: { draft?: boolean } = {}): Promise<DiaryEntry> {
  lastDiaryCoins = 0;
  if (!opts.draft && !input.title.trim() && !input.content.trim()) throw new GameError('寫一點內容再儲存吧');
  const now = Date.now();
  let saved!: DiaryEntry;
  await db.tx(['diary', 'wallet', 'meta'], 'readwrite', async (t) => {
    const prev = input.id ? await t.store('diary').get(input.id) : undefined;
    saved = {
      id: prev?.id ?? input.id ?? uuid(),
      title: input.title.trim() || (opts.draft ? '（草稿）' : TEMPLATES[input.template].label),
      content: input.content,
      date: input.date || dateKey(),
      mood: input.mood,
      template: input.template,
      photoIds: input.photoIds ?? prev?.photoIds ?? [],
      tags: input.tags ?? prev?.tags ?? [],
      isFavorite: input.isFavorite ?? prev?.isFavorite ?? false,
      isDraft: !!opts.draft,
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    };
    await t.store('diary').put(saved);
    // 寫日記 +5 知識幣：每篇只發一次，每天最多 3 篇
    if (!saved.isDraft && (saved.title.trim() || saved.content.trim())) {
      const day = dateKey(), key = `diaryCoin:${day}`;
      const used = Number((await t.store('meta').get(key))?.value ?? 0);
      if (used < DIARY_COIN_PER_DAY && await txGrant(t, `diary:${saved.id}`, DIARY_COIN, `寫日記「${saved.title}」`, { type: 'day', id: day })) {
        await t.store('meta').put({ key, value: used + 1 });
        lastDiaryCoins = DIARY_COIN;
      }
    }
  });
  return saved;
}
export async function toggleFavorite(id: string) {
  await db.tx(['diary'], 'readwrite', async (t) => {
    const d = await t.store('diary').get(id);
    if (d) await t.store('diary').put({ ...d, isFavorite: !d.isFavorite, updatedAt: Date.now() });
  });
}
export function deleteDiary(id: string) { return db.delete('diary', id); }

export function diaryToMarkdown(entries: DiaryEntry[]): string {
  return entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => `## ${d.date}｜${d.title}${d.isFavorite ? ' ★' : ''}\n\n*${TEMPLATES[d.template].label}${d.tags.length ? ' · #' + d.tags.join(' #') : ''}*\n\n${d.content}\n`)
    .join('\n---\n\n');
}

// ───────── photos (stored as real Blobs, downscaled) ─────────
export async function savePhoto(file: Blob, maxSide = 1280): Promise<string> {
  let blob = file;
  try {
    if (typeof createImageBitmap === 'function' && file.type.startsWith('image/')) {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
      if (scale < 1) {
        const c = document.createElement('canvas');
        c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
        c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
        blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.86));
      }
    }
  } catch { /* keep original */ }
  const id = uuid();
  await db.put('photos', { id, blob, type: blob.type || 'image/jpeg', createdAt: Date.now() });
  return id;
}
const urlCache = new Map<string, string>();
export async function photoURL(id: string): Promise<string | null> {
  const hit = urlCache.get(id);
  if (hit) return hit;
  const row = await db.get('photos', id);
  if (!row) return null;
  const url = URL.createObjectURL(row.blob);
  urlCache.set(id, url);
  return url;
}
export function deletePhoto(id: string) { urlCache.delete(id); return db.delete('photos', id); }
