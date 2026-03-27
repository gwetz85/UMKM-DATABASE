'use client';

import { useEffect } from 'react';
import { useDatabase, useObject } from '@/firebase';
import { ref } from 'firebase/database';

export function ThemePersistence() {
  const database = useDatabase();
  const themeRef = ref(database, 'settings/theme');
  const { data: themeData } = useObject(themeRef);

  useEffect(() => {
    if (!themeData) return;

    // Apply Mode (Light/Dark)
    if (themeData.mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply Palette
    if (themeData.palette) {
      document.documentElement.style.setProperty('--primary', themeData.palette);
      document.documentElement.style.setProperty('--sidebar-background', themeData.palette);
    }
  }, [themeData]);

  return null; // This component only manages side effects
}
