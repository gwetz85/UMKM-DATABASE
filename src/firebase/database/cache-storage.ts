'use client';

// High-performance shared caching layer (RAM Memory + LocalStorage + IndexedDB)
// Designed for instant 0ms loads and responsive UI across all SIMPU views.

const memoryCache = new Map<string, any>();

const DB_NAME = 'simpu_rtdb_cache_v2';
const STORE_NAME = 'rtdb_records';

let dbPromise: Promise<IDBDatabase | null> | null = null;

export function getCacheDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE_NAME)) {
            req.result.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

export function getMemoryCache<T = any>(key: string): T | undefined {
  if (!key) return undefined;
  return memoryCache.get(key) as T;
}

export function setMemoryCache(key: string, data: any): void {
  if (!key) return;
  memoryCache.set(key, data);
}

export function safeGetLocalStorage<T = any>(key: string): T | null {
  if (typeof window === 'undefined' || !key) return null;
  try {
    const item = localStorage.getItem(`rtdb_v2_${key}`);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

export function safeSetLocalStorage(key: string, data: any, maxBytes: number = 800000): void {
  if (typeof window === 'undefined' || !key || data === undefined) return;
  try {
    const str = JSON.stringify(data);
    if (str.length > maxBytes) return; // Skip saving huge items to localStorage, use IndexedDB instead

    try {
      localStorage.setItem(`rtdb_v2_${key}`, str);
    } catch (err: any) {
      // Handle QuotaExceededError by removing older rtdb keys
      if (err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014)) {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('rtdb_')) {
              keysToRemove.push(k);
            }
          }
          // Remove half of the cached keys to free space
          keysToRemove.slice(0, Math.max(1, Math.ceil(keysToRemove.length / 2))).forEach(k => {
            localStorage.removeItem(k);
          });
          localStorage.setItem(`rtdb_v2_${key}`, str);
        } catch {}
      }
    }
  } catch {}
}

export async function getIndexedDBCache<T = any>(key: string): Promise<T | null> {
  if (!key) return null;
  const db = await getCacheDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function setIndexedDBCache(key: string, data: any): Promise<void> {
  if (!key || data === undefined) return;
  const db = await getCacheDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(data, key);
  } catch {
    // Ignore quota errors
  }
}

export function getRefKey(refOrQuery: any): string {
  if (!refOrQuery) return '';
  const url = typeof refOrQuery.toString === 'function' ? refOrQuery.toString() : '';
  let params = '';
  try {
    if (typeof refOrQuery.queryIdentifier === 'function') {
      params = refOrQuery.queryIdentifier();
    } else if (refOrQuery._queryIdentifier) {
      params = String(refOrQuery._queryIdentifier);
    } else if (refOrQuery._queryParams) {
      params = JSON.stringify(refOrQuery._queryParams);
    }
  } catch {}
  return `${url}::${params}`;
}
