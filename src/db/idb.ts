// A small typed IndexedDB layer with versioned migrations, transactions and change events.
// (Plays the role Dexie.js would: schema versions are additive and never drop user data.)
import type { StoreName, Tables } from './types';

interface StoreSpec {
  name: StoreName;
  keyPath: string;
  indexes?: { name: string; keyPath: string; unique?: boolean; multiEntry?: boolean }[];
}

/**
 * Schema history. Each version only ADDS stores / indexes.
 * v1 = 閱讀小宇宙 reading core, v2 = 像素生活 (room, wardrobe, fridge, balcony, diary),
 * v3 = 數位設備 + 戀愛系統.
 */
export const SCHEMA: { version: number; stores: StoreSpec[] }[] = [
  {
    version: 1,
    stores: [
      { name: 'books', keyPath: 'id', indexes: [{ name: 'status', keyPath: 'status' }, { name: 'category', keyPath: 'category' }] },
      { name: 'sessions', keyPath: 'id', indexes: [{ name: 'bookId', keyPath: 'bookId' }, { name: 'date', keyPath: 'date' }] },
      { name: 'quotes', keyPath: 'id', indexes: [{ name: 'bookId', keyPath: 'bookId' }] },
      { name: 'photos', keyPath: 'id' },
      { name: 'wallet', keyPath: 'id', indexes: [{ name: 'rewardKey', keyPath: 'rewardKey', unique: true }] },
      { name: 'achievements', keyPath: 'id' },
      { name: 'settings', keyPath: 'key' },
      { name: 'meta', keyPath: 'key' },
    ],
  },
  {
    version: 2,
    stores: [
      { name: 'diary', keyPath: 'id', indexes: [{ name: 'date', keyPath: 'date' }] },
      { name: 'ownedFurniture', keyPath: 'id', indexes: [{ name: 'defId', keyPath: 'defId' }] },
      { name: 'ownedClothing', keyPath: 'id', indexes: [{ name: 'defId', keyPath: 'defId', unique: true }] },
      { name: 'outfits', keyPath: 'id' },
      { name: 'foodInventory', keyPath: 'foodId' },
      { name: 'ownedPlants', keyPath: 'id' },
      { name: 'room', keyPath: 'id' },
    ],
  },
  {
    version: 3,
    stores: [
      { name: 'ownedDevices', keyPath: 'id', indexes: [{ name: 'defId', keyPath: 'defId' }] },
      { name: 'contacts', keyPath: 'id' },
      { name: 'chat', keyPath: 'id', indexes: [{ name: 'contactId', keyPath: 'contactId' }] },
      { name: 'calls', keyPath: 'id' },
      { name: 'visits', keyPath: 'id' },
      { name: 'meals', keyPath: 'id' },
      { name: 'readTogether', keyPath: 'id' },
      { name: 'loveMemories', keyPath: 'id' },
      { name: 'anniversaries', keyPath: 'id' },
      { name: 'relationship', keyPath: 'id' },
    ],
  },
];
export const DB_VERSION = SCHEMA[SCHEMA.length - 1].version;
export const ALL_STORES: StoreName[] = SCHEMA.flatMap((v) => v.stores.map((s) => s.name));

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export class TxStore<K extends StoreName> {
  constructor(private s: IDBObjectStore) {}
  get(key: IDBValidKey): Promise<Tables[K] | undefined> { return req(this.s.get(key)); }
  all(): Promise<Tables[K][]> { return req(this.s.getAll()); }
  byIndex(index: string, value: IDBValidKey): Promise<Tables[K][]> { return req(this.s.index(index).getAll(value)); }
  put(value: Tables[K]): Promise<IDBValidKey> { return req(this.s.put(value)); }
  add(value: Tables[K]): Promise<IDBValidKey> { return req(this.s.add(value)); }
  delete(key: IDBValidKey): Promise<undefined> { return req(this.s.delete(key)); }
  clear(): Promise<undefined> { return req(this.s.clear()); }
  count(): Promise<number> { return req(this.s.count()); }
}

export class Tx {
  constructor(public raw: IDBTransaction) {}
  store<K extends StoreName>(name: K): TxStore<K> { return new TxStore<K>(this.raw.objectStore(name)); }
}

type Listener = (stores: Set<StoreName>) => void;

export class Database {
  private dbp: Promise<IDBDatabase> | null = null;
  private listeners = new Set<Listener>();
  constructor(public name = 'my-room-db', public upTo = DB_VERSION) {}

  open(): Promise<IDBDatabase> {
    if (!this.dbp) {
      this.dbp = new Promise((resolve, reject) => {
        const r = indexedDB.open(this.name, this.upTo);
        r.onupgradeneeded = (ev) => {
          const db = r.result;
          const tx = r.transaction!;
          const old = ev.oldVersion;
          for (const v of SCHEMA) {
            if (v.version <= old || v.version > this.upTo) continue;
            for (const s of v.stores) {
              const os = db.objectStoreNames.contains(s.name) ? tx.objectStore(s.name) : db.createObjectStore(s.name, { keyPath: s.keyPath });
              for (const ix of s.indexes ?? []) if (!os.indexNames.contains(ix.name)) os.createIndex(ix.name, ix.keyPath, { unique: !!ix.unique, multiEntry: !!ix.multiEntry });
            }
          }
        };
        r.onsuccess = () => {
          const db = r.result;
          db.onversionchange = () => db.close();
          resolve(db);
        };
        r.onerror = () => reject(r.error);
        r.onblocked = () => reject(new Error('資料庫被其他分頁占用，請關閉其他 MY ROOM 分頁後重新整理。'));
      });
    }
    return this.dbp;
  }

  close() { this.dbp?.then((d) => d.close()); this.dbp = null; }

  onChange(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; }
  emit(stores: Iterable<StoreName>) { const s = new Set(stores); this.listeners.forEach((l) => l(s)); }

  /** Run fn inside one IndexedDB transaction. Only await IDB requests inside fn (no timers / fetch). */
  async tx<T>(stores: StoreName[], mode: IDBTransactionMode, fn: (t: Tx) => Promise<T>): Promise<T> {
    const db = await this.open();
    const raw = db.transaction(stores, mode);
    const done = new Promise<void>((resolve, reject) => {
      raw.oncomplete = () => resolve();
      raw.onerror = () => reject(raw.error);
      raw.onabort = () => reject(raw.error ?? new Error('transaction aborted'));
    });
    let result: T;
    try {
      result = await fn(new Tx(raw));
    } catch (e) {
      try { raw.abort(); } catch { /* already finished */ }
      await done.catch(() => undefined);
      throw e;
    }
    await done;
    if (mode === 'readwrite') this.emit(stores);
    return result;
  }

  get<K extends StoreName>(store: K, key: IDBValidKey) { return this.tx([store], 'readonly', (t) => t.store(store).get(key)); }
  all<K extends StoreName>(store: K) { return this.tx([store], 'readonly', (t) => t.store(store).all()); }
  byIndex<K extends StoreName>(store: K, index: string, value: IDBValidKey) { return this.tx([store], 'readonly', (t) => t.store(store).byIndex(index, value)); }
  count<K extends StoreName>(store: K) { return this.tx([store], 'readonly', (t) => t.store(store).count()); }
  put<K extends StoreName>(store: K, value: Tables[K]) { return this.tx([store], 'readwrite', (t) => t.store(store).put(value)); }
  bulkPut<K extends StoreName>(store: K, values: Tables[K][]) {
    return this.tx([store], 'readwrite', async (t) => { const s = t.store(store); for (const v of values) await s.put(v); });
  }
  delete<K extends StoreName>(store: K, key: IDBValidKey) { return this.tx([store], 'readwrite', (t) => t.store(store).delete(key)); }

  async getKV<T>(store: 'settings' | 'meta', key: string, fallback: T): Promise<T> {
    const row = await this.get(store, key);
    return row ? (row.value as T) : fallback;
  }
  setKV<T>(store: 'settings' | 'meta', key: string, value: T) { return this.put(store, { key, value }); }
}

export let db = new Database();
/** Tests swap in an isolated database. */
export function useDatabase(d: Database) { db = d; }
