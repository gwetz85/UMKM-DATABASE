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
    }

    const handleSnapshot = (snapshot: any) => {
      const results: any[] = [];
      snapshot.forEach((childSnap: any) => {
        results.push({ ...childSnap.val(), id: childSnap.key });
      });
      if (refKey) {
        memoryCache.set(refKey, results);
        setLocalCache(refKey, results);
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
