'use client';

import { useEffect } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue, DataSnapshot } from 'firebase/database';

export function ThemePersistence() {
  const database = useDatabase();

  useEffect(() => {
    // 1. Initial Load from LocalStorage (fastest and reliable)
    const savedTheme = localStorage.getItem('simpu-theme');
    if (savedTheme) {
      try {
        const themeData = JSON.parse(savedTheme);
        applyTheme(themeData);
      } catch (e) {
        console.error('Failed to parse local theme:', e);
      }
    }

    if (!database) return;

    // 2. Sync from Firebase (Global settings if available)
    const themeRef = ref(database, 'chats/__system_settings/theme');
    
    const unsubscribe = onValue(themeRef, (snapshot: DataSnapshot) => {
      const themeData = snapshot.val();
      if (themeData) {
        applyTheme(themeData);
        // Backup the global theme to local storage for offline/fast load
        localStorage.setItem('simpu-theme', JSON.stringify(themeData));
      }
    }, (error: Error) => {
      // Don't log normal permission errors to console to keep it clean
      // but acknowledge that Firebase sync might be limited.
    });

    return () => unsubscribe();
  }, [database]);

  const applyTheme = (themeData: any) => {
    if (!themeData) return;
    const root = document.documentElement;

    // Apply Mode (Light/Dark)
    if (themeData.mode === 'dark') {
      root.classList.add('dark');
      document.body?.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body?.classList.remove('dark');
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
          --sidebar-primary: ${palette} !important;
          --ring: ${palette} !important;
          --accent: ${palette} !important;
        }
      `;
    }
  };

  return null;
}
