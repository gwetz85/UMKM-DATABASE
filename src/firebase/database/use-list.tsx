'use client';

import { useState, useEffect } from 'react';
import { Query, DatabaseReference, onValue } from 'firebase/database';

export function useList<T = any>(
  memoizedRefOrQuery: DatabaseReference | Query | null | undefined
) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!memoizedRefOrQuery);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memoizedRefOrQuery) {
      setData(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    
    // Typecast to any to avoid generic union issues across RTDB versions in onValue
    const unsubscribe = onValue(memoizedRefOrQuery as any, (snapshot) => {
      const results: any[] = [];
      snapshot.forEach((childSnap) => {
        results.push({ ...childSnap.val(), id: childSnap.key });
      });
      setData(results);
      setIsLoading(false);
    }, (err) => {
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [memoizedRefOrQuery]);

  return { data, isLoading, error };
}
