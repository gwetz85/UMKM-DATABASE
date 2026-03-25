'use client';

import { useState, useEffect } from 'react';
import { DatabaseReference, onValue } from 'firebase/database';

export function useObject<T = any>(
  memoizedRef: DatabaseReference | null | undefined
) {
  const [data, setData] = useState<(T & {id: string}) | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!memoizedRef);
  const [error, setError] = useState<Error | null>(null);

  const refKey = memoizedRef?.toString() || '';

  useEffect(() => {
    if (!memoizedRef) {
      setData(null);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    const unsubscribe = onValue(memoizedRef, (snapshot) => {
      if (snapshot.exists()) {
        setData({ ...snapshot.val(), id: snapshot.key });
      } else {
        setData(null);
      }
      setIsLoading(false);
    }, (err) => {
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [refKey]); // Use refKey string to ensure stability

  return { data, isLoading, error };
}
