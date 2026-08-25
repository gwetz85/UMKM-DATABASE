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

export function useObject<T = any>(
  memoizedRef: DatabaseReference | null | undefined
) {
  const refKey = getRefKey(memoizedRef);
  const cachedData = refKey ? objectMemoryCache.get(refKey) : undefined;

  const [data, setData] = useState<(T & {id: string}) | null>(cachedData ? (cachedData as (T & {id: string})) : null);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedData && !!memoizedRef);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memoizedRef) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const cached = refKey ? objectMemoryCache.get(refKey) : null;
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
        }
        setData(val);
      } else {
        if (refKey) {
          objectMemoryCache.delete(refKey);
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
