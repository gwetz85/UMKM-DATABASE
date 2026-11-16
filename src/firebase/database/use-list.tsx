'use client';

import { useState, useEffect } from 'react';
import { Query, DatabaseReference, onValue, get } from 'firebase/database';

export interface UseListOptions {
  once?: boolean;
}

const memoryCache = new Map<string, any[]>();

function getRefKey(refOrQuery: any): string {
  if (!refOrQuery) return '';
  const url = typeof refOrQuery.toString === 'function' ? refOrQuery.toString() : '';
  let params = '';
  try {
    if (typeof refOrQuery.queryIdentifier === 'function') {
      params = refOrQuery.queryIdentifier();
    } else if (typeof refOrQuery._query?.getIdentifier === 'function') {
      params = refOrQuery._query.getIdentifier();
    } else if (refOrQuery._queryIdentifier) {
      params = String(refOrQuery._queryIdentifier);
    } else if (refOrQuery._queryParams) {
      params = JSON.stringify(refOrQuery._queryParams);
    } else if (refOrQuery._query?._queryParams) {
      params = JSON.stringify(refOrQuery._query._queryParams);
    }
  } catch {}
  return `${url}::${params}`;
}

const DB_NAME = 'simpu_rtdb_cache_v3';
const STORE_NAME = 'query_lists';
const CACHE_VERSION_KEY = 'simpu_cache_global_version';
const CURRENT_CACHE_VERSION = 'v3.1';

// Auto-purge stale cache if version mismatch or old schema
if (typeof window !== 'undefined') {
  try {
    const storedVer = localStorage.getItem(CACHE_VERSION_KEY);
    if (storedVer !== CURRENT_CACHE_VERSION) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('rtdb_list_') || k.startsWith('rtdb_obj_') || k.startsWith('simpu_actors_search_cache'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);

      if (window.indexedDB) {
        try { window.indexedDB.deleteDatabase('simpu_rtdb_cache'); } catch {}
        try { window.indexedDB.deleteDatabase('simpu_rtdb_cache_v2'); } catch {}
      }
    }
  } catch {}
}

export function clearRtdbCache(): void {
  memoryCache.clear();
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('rtdb_list_') || k.startsWith('rtdb_obj_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      if (window.indexedDB) {
        getCacheDB().then(db => {
          if (db) {
            try {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              tx.objectStore(STORE_NAME).clear();
            } catch {}
          }
        });
      }
    } catch {}
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('simpu_cache_invalidated', () => {
    clearRtdbCache();
  });
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
function getCacheDB(): Promise<IDBDatabase | null> {
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

async function getIndexedDBCache(key: string): Promise<any[] | null> {
  if (!key) return null;
  const db = await getCacheDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function setIndexedDBCache(key: string, data: any[]): Promise<void> {
  if (!key || !data) return;
  const db = await getCacheDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(stripHeavyFields(data), key);
  } catch {
    // Ignore quota errors
  }
}

function getLocalCache(key: string): any[] | null {
  if (typeof window === 'undefined' || !key) return null;
  try {
    const item = localStorage.getItem(`rtdb_list_${key}`);
    const parsed = item ? JSON.parse(item) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function stripHeavyFields(data: any[]): any[] {
  if (!Array.isArray(data)) return [];
  return data.map(item => {
    if (!item || typeof item !== 'object') return item;
    const clean: any = {};
    for (const [k, v] of Object.entries(item)) {
      if (typeof v === 'string' && v.length > 500 && v.startsWith('data:')) {
        continue;
      }
      if (k === 'surveyData' && v && typeof v === 'object') {
        const sClean: any = {};
        for (const [sk, sv] of Object.entries(v as any)) {
          if (typeof sv === 'string' && sv.length > 500 && sv.startsWith('data:')) {
            continue;
          }
          sClean[sk] = sv;
        }
        clean[k] = sClean;
        continue;
      }
      clean[k] = v;
    }
    return clean;
  });
}

function setLocalCache(key: string, data: any[]): void {
  if (typeof window === 'undefined' || !key || !Array.isArray(data)) return;
  try {
    const stripped = stripHeavyFields(data);
    const str = JSON.stringify(stripped);
    if (str.length < 1500000) { // < 1.5MB
      try {
        localStorage.setItem(`rtdb_list_${key}`, str);
      } catch (err: any) {
        if (err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014)) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('rtdb_list_')) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.slice(0, Math.ceil(keysToRemove.length / 2)).forEach(k => localStorage.removeItem(k));
          localStorage.setItem(`rtdb_list_${key}`, str);
        }
      }
    }
  } catch {
    // Ignore quota errors
  }
}

export function useList<T = any>(
  memoizedRefOrQuery: DatabaseReference | Query | null | undefined,
  options: UseListOptions = {}
) {
  const refKey = getRefKey(memoizedRefOrQuery);

  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!memoizedRefOrQuery);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memoizedRefOrQuery) {
      setData(null);
      setIsLoading(false);
      return;
    }
    
    const cached = refKey ? (memoryCache.get(refKey) || getLocalCache(refKey)) : null;
    if (Array.isArray(cached)) {
      setData(cached as T[]);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      // Asynchronously check IndexedDB for large cached lists
      if (refKey) {
        getIndexedDBCache(refKey).then((idbCached) => {
          if (Array.isArray(idbCached) && idbCached.length > 0) {
            setData((prev) => (prev && prev.length > 0 ? prev : (idbCached as T[])));
            setIsLoading(false);
          }
        }).catch(() => {});
      }
    }

    const handleSnapshot = (snapshot: any) => {
      const results: any[] = [];
      snapshot.forEach((childSnap: any) => {
        results.push({ ...childSnap.val(), id: childSnap.key });
      });
      if (refKey) {
        memoryCache.set(refKey, results);
        setLocalCache(refKey, results);
        setIndexedDBCache(refKey, results).catch(() => {});
      }
      setData(results);
      setIsLoading(false);
    };

    const handleError = (err: Error) => {
      setError(err);
      setIsLoading(false);
    };
    
    if (options.once) {
      get(memoizedRefOrQuery as any)
        .then(handleSnapshot)
        .catch(handleError);
      return;
    }

    // Typecast to any to avoid generic union issues across RTDB versions in onValue
    const unsubscribe = onValue(memoizedRefOrQuery as any, handleSnapshot, handleError);

    return () => unsubscribe();
  }, [refKey, options.once]);

  return { data, isLoading, error };
}
