'use client';

import { useState, useEffect } from 'react';
import { DatabaseReference, onValue } from 'firebase/database';

const objectMemoryCache = new Map<string, any>();

function getRefKey(refOrQuery: any): string {
  if (!refOrQuery) return '';
  const url = typeof refOrQuery.toString === 'function' ? refOrQuery.toString() : '';
  const params = refOrQuery._queryParams ? JSON.stringify(refOrQuery._queryParams) : '';
  return `${url}::${params}`;
}

function getLocalObjectCache(key: string): any | null {
  if (typeof window === 'undefined' || !key) return null;
  try {
    const item = localStorage.getItem(`rtdb_obj_${key}`);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

function setLocalObjectCache(key: string, data: any): void {
  if (typeof window === 'undefined' || !key) return;
  try {
    const str = JSON.stringify(data);
    if (str.length < 500000) {
      localStorage.setItem(`rtdb_obj_${key}`, str);
    }
  } catch {
    // Ignore quota errors
  }
}

export function useObject<T = any>(
  memoizedRef: DatabaseReference | null | undefined
) {
  const refKey = getRefKey(memoizedRef);
  const cachedData = refKey ? (objectMemoryCache.get(refKey) || getLocalObjectCache(refKey)) : undefined;

  const [data, setData] = useState<(T & {id: string}) | null>(cachedData ? (cachedData as (T & {id: string})) : null);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedData && !!memoizedRef);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memoizedRef) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const cached = refKey ? (objectMemoryCache.get(refKey) || getLocalObjectCache(refKey)) : null;
    if (cached) {
      setData(cached as (T & {id: string}));
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    const unsubscribe = onValue(memoizedRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = { ...snapshot.val(), id: snapshot.key };
        if (refKey) {
          objectMemoryCache.set(refKey, val);
          setLocalObjectCache(refKey, val);
        }
        setData(val);
      } else {
        if (refKey) {
          objectMemoryCache.delete(refKey);
          if (typeof window !== 'undefined') {
            try { localStorage.removeItem(`rtdb_obj_${refKey}`); } catch {}
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
