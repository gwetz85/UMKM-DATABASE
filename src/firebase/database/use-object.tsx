'use client';

import { useState, useEffect } from 'react';
import { DatabaseReference, onValue } from 'firebase/database';
import {
  getRefKey,
  getMemoryCache,
  setMemoryCache,
  safeGetLocalStorage,
  safeSetLocalStorage,
  getIndexedDBCache,
  setIndexedDBCache
} from './cache-storage';

export function useObject<T = any>(
  memoizedRef: DatabaseReference | null | undefined
) {
  const refKey = getRefKey(memoizedRef);
  const cachedData = refKey ? (getMemoryCache<T & { id: string }>(refKey) || safeGetLocalStorage<T & { id: string }>(refKey)) : undefined;

  const [data, setData] = useState<(T & { id: string }) | null>(cachedData ? cachedData : null);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedData && !!memoizedRef);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memoizedRef) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const cached = refKey ? (getMemoryCache<T & { id: string }>(refKey) || safeGetLocalStorage<T & { id: string }>(refKey)) : null;
    if (cached) {
      setData(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      if (refKey) {
        getIndexedDBCache<T & { id: string }>(refKey).then((idbCached) => {
          if (idbCached) {
            setMemoryCache(refKey, idbCached);
            setData((prev) => prev || idbCached);
            setIsLoading(false);
          }
        }).catch(() => {});
      }
    }

    const unsubscribe = onValue(memoizedRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = { ...snapshot.val(), id: snapshot.key };
        if (refKey) {
          setMemoryCache(refKey, val);
          safeSetLocalStorage(refKey, val);
          setIndexedDBCache(refKey, val).catch(() => {});
        }
        setData(val);
      } else {
        if (refKey) {
          setMemoryCache(refKey, null);
          if (typeof window !== 'undefined') {
            try { localStorage.removeItem(`rtdb_v2_${refKey}`); } catch {}
          }
        }
        setData(null);
      }
      setIsLoading(false);
    }, (err) => {
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [refKey]);

  return { data, isLoading, error };
}
