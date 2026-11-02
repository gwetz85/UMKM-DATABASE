'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ThemeMode = 'light' | 'dark' | 'liquid-glass';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isLiquidGlass: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  if (mode === 'liquid-glass') {
    root.setAttribute('data-theme', 'liquid-glass');
    root.classList.add('theme-liquid-glass');
    root.classList.remove('dark');
    body?.classList.add('theme-liquid-glass');
    body?.classList.remove('dark');
  } else if (mode === 'dark') {
    root.removeAttribute('data-theme');
    root.classList.remove('theme-liquid-glass');
    root.classList.add('dark');
    body?.classList.remove('theme-liquid-glass');
    body?.classList.add('dark');
  } else {
    root.removeAttribute('data-theme');
    root.classList.remove('theme-liquid-glass');
    root.classList.remove('dark');
    body?.classList.remove('theme-liquid-glass');
    body?.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('simpu-theme');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mode === 'liquid-glass' || parsed.mode === 'dark' || parsed.mode === 'light') {
          setThemeState(parsed.mode);
          applyThemeMode(parsed.mode);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load initial theme:', e);
    }

    // Fallback: check DOM
    const isDark = document.documentElement.classList.contains('dark');
    const isGlass = document.documentElement.getAttribute('data-theme') === 'liquid-glass' ||
                    document.documentElement.classList.contains('theme-liquid-glass');
    if (isGlass) {
      setThemeState('liquid-glass');
    } else if (isDark) {
      setThemeState('dark');
    } else {
      setThemeState('light');
    }
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    applyThemeMode(newTheme);

    try {
      const saved = localStorage.getItem('simpu-theme');
      const data = saved ? JSON.parse(saved) : {};
      data.mode = newTheme;
      localStorage.setItem('simpu-theme', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save theme to localStorage:', e);
    }
  };

  const toggleTheme = () => {
    const cycle: Record<ThemeMode, ThemeMode> = {
      light: 'dark',
      dark: 'liquid-glass',
      'liquid-glass': 'light',
    };
    setTheme(cycle[theme] || 'light');
  };

  const value = useMemo<ThemeContextType>(() => ({
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isLiquidGlass: theme === 'liquid-glass',
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Provide safe fallback if used outside Provider
    return {
      theme: 'light' as ThemeMode,
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: false,
      isLiquidGlass: false,
    };
  }
  return context;
}

/**
 * Reusable Modern Theme Switcher Component
 * Supports Light, Dark, and Liquid Glass modes with sleek specular indicator
 */
export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme selector"
      className={cn(
        "inline-flex items-center p-1 rounded-full border transition-all duration-300",
        "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 shadow-2xs backdrop-blur-md",
        "[[data-theme=liquid-glass]_&]:bg-white/30 [[data-theme=liquid-glass]_&]:border-white/30 [[data-theme=liquid-glass]_&]:shadow-glass-sm",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        title="Mode Terang (Light)"
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200",
          theme === 'light'
            ? "bg-amber-500/10 text-amber-600 shadow-xs ring-1 ring-amber-500/30 font-extrabold"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        )}
      >
        <Sun className="w-3.5 h-3.5 text-amber-500" />
        <span className="hidden sm:inline">Terang</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        title="Mode Gelap (Dark)"
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200",
          theme === 'dark'
            ? "bg-indigo-500/20 text-indigo-300 shadow-xs ring-1 ring-indigo-500/30 font-extrabold"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        )}
      >
        <Moon className="w-3.5 h-3.5 text-indigo-400" />
        <span className="hidden sm:inline">Gelap</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('liquid-glass')}
        title="Mode Liquid Glass (iOS-style Glassmorphism)"
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200",
          theme === 'liquid-glass'
            ? "bg-sky-500/20 text-sky-600 dark:text-sky-300 shadow-xs ring-1 ring-sky-400/40 font-extrabold backdrop-blur-md"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        )}
      >
        <Sparkles className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
        <span className="hidden sm:inline">Liquid Glass</span>
      </button>
    </div>
  );
}
