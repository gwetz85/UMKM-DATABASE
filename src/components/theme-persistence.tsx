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

    const root = document.documentElement;

    // Apply Mode (Light/Dark)
    if (themeData.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply Palette
    if (themeData.palette) {
      const palette = themeData.palette;
      
      // Update all relevant variables for thorough theme application
      root.style.setProperty('--primary', palette);
      root.style.setProperty('--sidebar-background', palette);
      root.style.setProperty('--sidebar-primary-foreground', palette);
      root.style.setProperty('--sidebar-border', palette);
      root.style.setProperty('--ring', palette);
      root.style.setProperty('--accent', palette);
      root.style.setProperty('--sidebar-ring', palette);
      
      // Optionally update sidebar accent if you want it to match the palette
      root.style.setProperty('--sidebar-accent', palette);
    }
  }, [themeData]);

  return null; // This component only manages side effects
}
