'use client';

import { useEffect } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue, DataSnapshot } from 'firebase/database';

export function ThemePersistence() {
  const database = useDatabase();

  useEffect(() => {
    if (!database) return;

    const themeRef = ref(database, 'settings/theme');
    
    const unsubscribe = onValue(themeRef, (snapshot: DataSnapshot) => {
      const themeData = snapshot.val();
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
        
        let styleEl = document.getElementById('dynamic-theme-style') as HTMLStyleElement;
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'dynamic-theme-style';
          document.head.appendChild(styleEl);
        }

        styleEl.innerHTML = `
          :root {
            --primary: ${palette} !important;
            --sidebar-background: ${palette} !important;
            --sidebar-primary-foreground: ${palette} !important;
            --sidebar-border: ${palette} !important;
            --ring: ${palette} !important;
            --accent: ${palette} !important;
            --sidebar-ring: ${palette} !important;
            --sidebar-accent: ${palette} !important;
          }
          .dark {
            --primary: ${palette} !important;
            --sidebar-background: ${palette} !important;
            --sidebar-border: ${palette} !important;
            --ring: ${palette} !important;
            --accent: ${palette} !important;
          }
        `;
      }
    }, (error: Error) => {
      console.error('ThemePersistence Error:', error);
    });

    return () => unsubscribe();
  }, [database]);

  return null;
}
