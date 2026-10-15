'use client';

import { useState, useEffect } from 'react';
import { Query, DatabaseReference, onValue, get } from 'firebase/database';
import {
  getRefKey,
  getMemoryCache,
  setMemoryCache,
  safeGetLocalStorage,
  safeSetLocalStorage,
  getIndexedDBCache,
  setIndexedDBCache
} from './cache-storage';

export interface UseListOptions {
  once?: boolean;
}

export function useList<T = any>(
  memoizedRefOrQuery: DatabaseReference | Query | null | undefined,
  options: UseListOptions = {}
) {
  const refKey = getRefKey(memoizedRefOrQuery);
  const cachedData = refKey ? (getMemoryCache<T[]>(refKey) || safeGetLocalStorage<T[]>(refKey)) : undefined;

  const [data, setData] = useState<T[] | null>(cachedData ? (cachedData as T[]) : null);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedData && !!memoizedRefOrQuery);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memoizedRefOrQuery) {
      setData(null);
      setIsLoading(false);
      return;
    }
    
    const cached = refKey ? (getMemoryCache<T[]>(refKey) || safeGetLocalStorage<T[]>(refKey)) : null;
    if (cached) {
      setData(cached as T[]);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      // Asynchronously check IndexedDB for large cached lists
      if (refKey) {
        getIndexedDBCache<T[]>(refKey).then((idbCached) => {
          if (idbCached && idbCached.length > 0) {
            setMemoryCache(refKey, idbCached);
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
        setMemoryCache(refKey, results);
        safeSetLocalStorage(refKey, results);
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
