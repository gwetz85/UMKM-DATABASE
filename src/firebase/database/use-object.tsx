'use client';

import { useState, useEffect } from 'react';
import { DatabaseReference, onValue } from 'firebase/database';

const objectMemoryCache = new Map<string, any>();

function getRefKey(refOrQuery: any): string {
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
      try {
        localStorage.setItem(`rtdb_obj_${key}`, str);
      } catch (err: any) {
        if (err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014)) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('rtdb_obj_')) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.slice(0, Math.ceil(keysToRemove.length / 2)).forEach(k => localStorage.removeItem(k));
          localStorage.setItem(`rtdb_obj_${key}`, str);
        }
      }
    }
  } catch {
    // Ignore quota errors
  }
}

export function useObject<T = any>(
  memoizedRef: DatabaseReference | null | undefined
) {
  const refKey = getRefKey(memoizedRef);

  const [data, setData] = useState<(T & {id: string}) | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!memoizedRef);
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
        const val = snapshot.val();
        const formatted = (typeof val === 'object' && val !== null) ? { ...val, id: snapshot.key } : val;
        if (refKey) {
          objectMemoryCache.set(refKey, formatted);
          setLocalObjectCache(refKey, formatted);
        }
        setData(formatted);
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
