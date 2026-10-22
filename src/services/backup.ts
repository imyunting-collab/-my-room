// Full local backup / restore. Everything stays on this device unless you move the file yourself.
import { ALL_STORES, DB_VERSION, db } from '../db/idb';
import type { StoreName, Tables } from '../db/types';
import { uuid } from '../lib/util';
import { GameError } from './wallet';

export const BACKUP_FORMAT = 'my-room-backup';
export interface BackupFile {
  app: 'MY ROOM';
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportId: string;
  exportedAt: string;
  counts: Partial<Record<StoreName, number>>;
  data: Partial<Record<StoreName, unknown[]>>;
}

const KEY: Partial<Record<StoreName, string>> = { settings: 'key', meta: 'key', foodInventory: 'foodId' };
const keyOf = (store: StoreName, row: any): IDBValidKey => row[KEY[store] ?? 'id'];

function blobToDataURL(b: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
}
function dataURLToBlob(u: string): Blob {
  const [head, body] = u.split(',');
  const type = /data:([^;]+)/.exec(head)?.[1] ?? 'application/octet-stream';
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}

export async function exportBackup(): Promise<BackupFile> {
  const raw = await db.tx(ALL_STORES, 'readonly', async (t) => {
    const out: Partial<Record<StoreName, any[]>> = {};
    for (const s of ALL_STORES) out[s] = await t.store(s).all();
    return out;
  });
  raw.photos = await Promise.all((raw.photos ?? []).map(async (p: Tables['photos']) => ({ ...p, blob: { __dataURL: await blobToDataURL(p.blob) } })));
  // transient UI state is not worth restoring
  raw.meta = (raw.meta ?? []).filter((m: Tables['meta']) => m.key !== 'diaryDraft');
  const counts: Partial<Record<StoreName, number>> = {};
  for (const s of ALL_STORES) counts[s] = raw[s]?.length ?? 0;
  return { app: 'MY ROOM', format: BACKUP_FORMAT, schemaVersion: DB_VERSION, exportId: uuid(), exportedAt: new Date().toISOString(), counts, data: raw };
}

export interface ImportSummary {
  file: BackupFile;
  rows: { store: StoreName; total: number; existing: number }[];
  alreadyImported: boolean;
  totalRows: number;
}

export function parseBackup(text: string): BackupFile {
  let obj: any;
  try { obj = JSON.parse(text); } catch { throw new GameError('檔案不是有效的 JSON 備份'); }
  if (!obj || obj.format !== BACKUP_FORMAT || obj.app !== 'MY ROOM') throw new GameError('這不是 MY ROOM 的備份檔');
  if (typeof obj.schemaVersion !== 'number' || obj.schemaVersion > DB_VERSION) throw new GameError('備份檔版本比目前 App 新，請先更新 App');
  if (!obj.data || typeof obj.data !== 'object') throw new GameError('備份檔缺少資料');
  for (const [store, rows] of Object.entries(obj.data)) {
    if (!ALL_STORES.includes(store as StoreName)) throw new GameError(`備份檔包含未知的資料表：${store}`);
    if (!Array.isArray(rows)) throw new GameError(`資料表 ${store} 格式錯誤`);
    for (const r of rows as any[]) if (r == null || keyOf(store as StoreName, r) == null) throw new GameError(`資料表 ${store} 有缺少 ID 的資料`);
  }
  return obj as BackupFile;
}

export async function summarize(file: BackupFile): Promise<ImportSummary> {
  const imported = await db.getKV<string[]>('meta', 'importedBackups', []);
  const rows = await db.tx(ALL_STORES, 'readonly', async (t) => {
    const res: ImportSummary['rows'] = [];
    for (const s of ALL_STORES) {
      const list = (file.data[s] ?? []) as any[];
      if (!list.length) continue;
      let existing = 0;
      for (const r of list) if (await t.store(s).get(keyOf(s, r))) existing++;
      res.push({ store: s, total: list.length, existing });
    }
    return res;
  });
  return { file, rows, alreadyImported: imported.includes(file.exportId), totalRows: rows.reduce((a, r) => a + r.total, 0) };
}

/**
 * merge: keep everything on this device, add rows that don't exist yet.
 * overwrite: replace all local data with the backup.
 * Runs in ONE transaction — if anything fails nothing changes.
 */
export async function applyBackup(file: BackupFile, mode: 'merge' | 'overwrite'): Promise<{ added: number }> {
  const data: Partial<Record<StoreName, any[]>> = {};
  for (const [s, rows] of Object.entries(file.data) as [StoreName, any[]][]) {
    data[s] = s === 'photos' ? rows.map((p) => ({ ...p, blob: p.blob?.__dataURL ? dataURLToBlob(p.blob.__dataURL) : p.blob })) : rows;
  }
  let added = 0;
  await db.tx(ALL_STORES, 'readwrite', async (t) => {
    if (mode === 'overwrite') for (const s of ALL_STORES) await t.store(s).clear();
    for (const s of ALL_STORES) {
      const st = t.store(s);
      for (const row of data[s] ?? []) {
        if (mode === 'merge') {
          if (await st.get(keyOf(s, row))) continue;
          if (s === 'wallet' && row.rewardKey && (await st.byIndex('rewardKey', row.rewardKey)).length) continue; // never pay a reward twice
          if (s === 'ownedClothing' && (await st.byIndex('defId', row.defId)).length) continue;
        }
        await st.put(row);
        added++;
      }
    }
    const prev = ((await t.store('meta').get('importedBackups'))?.value as string[] | undefined) ?? [];
    await t.store('meta').put({ key: 'importedBackups', value: [...new Set([...prev, file.exportId])] });
  });
  return { added };
}

export async function resetAll() {
  await db.tx(ALL_STORES, 'readwrite', async (t) => { for (const s of ALL_STORES) await t.store(s).clear(); });
}

export const STORE_LABEL: Record<StoreName, string> = {
  books: '書籍', sessions: '閱讀紀錄', quotes: '佳句', photos: '照片', wallet: '知識幣交易', achievements: '成就', settings: '設定', meta: '遊戲狀態',
  diary: '日記', ownedFurniture: '家具與房間配置', ownedClothing: '服裝', outfits: '穿搭', foodInventory: '食物庫存', ownedPlants: '植物', room: '房間設定',
  ownedDevices: '數位設備', contacts: '聯絡人', chat: '聊天紀錄', calls: '通話紀錄', visits: '到訪紀錄', meals: '共同用餐', readTogether: '共同閱讀',
  loveMemories: '戀愛回憶', anniversaries: '紀念日', relationship: '戀愛設定',
};
