'use client';

import { useState, useEffect } from 'react';
import { Query, DatabaseReference, onValue, get } from 'firebase/database';

export interface UseListOptions {
  once?: boolean;
}

function getRefKey(refOrQuery: any): string {
  if (!refOrQuery) return '';
  const url = typeof refOrQuery.toString === 'function' ? refOrQuery.toString() : '';
  const params = refOrQuery._queryParams ? JSON.stringify(refOrQuery._queryParams) : '';
  return `${url}::${params}`;
}

export function useList<T = any>(
  memoizedRefOrQuery: DatabaseReference | Query | null | undefined,
  options: UseListOptions = {}
) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!memoizedRefOrQuery);
  const [error, setError] = useState<Error | null>(null);

  const refKey = getRefKey(memoizedRefOrQuery);

  useEffect(() => {
    if (!memoizedRefOrQuery) {
      setData(null);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);

    const handleSnapshot = (snapshot: any) => {
      const results: any[] = [];
      snapshot.forEach((childSnap: any) => {
        results.push({ ...childSnap.val(), id: childSnap.key });
      });
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
