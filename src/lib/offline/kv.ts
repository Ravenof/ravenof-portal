// ── Minimalus IndexedDB KV (be priklausomybių) ───────────────────────────────
// Dvi lentelės: 'responses' (offline read cache) ir 'queue' (sync eilė).
// Naudojama tik app bundle'e (žr. offlineFetch.ts); Next web'e neliečiama.

const DB_NAME = 'rvn-offline'
const DB_VERSION = 1
export type StoreName = 'responses' | 'queue' | 'meta'

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB nepasiekiama')); return }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('responses')) db.createObjectStore('responses')
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | IDBRequest): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode)
    const r = fn(t.objectStore(store)) as IDBRequest<T>
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  }))
}

export const kv = {
  get: <T>(store: StoreName, key: string) => tx<T | undefined>(store, 'readonly', (s) => s.get(key)).catch(() => undefined),
  set: (store: StoreName, key: string, value: unknown) => tx(store, 'readwrite', (s) => s.put(value, key)).catch(() => undefined),
  put: (store: StoreName, value: unknown) => tx(store, 'readwrite', (s) => s.put(value)).catch(() => undefined),
  del: (store: StoreName, key: string) => tx(store, 'readwrite', (s) => s.delete(key)).catch(() => undefined),
  all: <T>(store: StoreName) => tx<T[]>(store, 'readonly', (s) => s.getAll()).catch(() => [] as T[]),
  clear: (store: StoreName) => tx(store, 'readwrite', (s) => s.clear()).catch(() => undefined),
}
