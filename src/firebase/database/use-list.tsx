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
  const params = refOrQuery._queryParams ? JSON.stringify(refOrQuery._queryParams) : '';
  return `${url}::${params}`;
}

const DB_NAME = 'simpu_rtdb_cache';
const STORE_NAME = 'query_lists';

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
    store.put(data, key);
  } catch {
    // Ignore quota errors
  }
}

function getLocalCache(key: string): any[] | null {
  if (typeof window === 'undefined' || !key) return null;
  try {
    const item = localStorage.getItem(`rtdb_list_${key}`);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

function setLocalCache(key: string, data: any[]): void {
  if (typeof window === 'undefined' || !key) return;
  try {
    const str = JSON.stringify(data);
    if (str.length < 800000) { // < 800KB
      localStorage.setItem(`rtdb_list_${key}`, str);
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
  const cachedData = refKey ? (memoryCache.get(refKey) || getLocalCache(refKey)) : undefined;

  const [data, setData] = useState<T[] | null>(cachedData ? (cachedData as T[]) : null);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedData && !!memoizedRefOrQuery);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memoizedRefOrQuery) {
      setData(null);
      setIsLoading(false);
      return;
    }
    
    const cached = refKey ? (memoryCache.get(refKey) || getLocalCache(refKey)) : null;
    if (cached) {
      setData(cached as T[]);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      // Asynchronously check IndexedDB for large cached lists
      if (refKey) {
        getIndexedDBCache(refKey).then((idbCached) => {
          if (idbCached && idbCached.length > 0) {
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
  }, [refKey, options.once]); // Include options.once in deps

  return { data, isLoading, error };
}
