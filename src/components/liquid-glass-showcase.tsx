'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Sun, 
  Moon, 
  TrendingUp, 
  ShieldCheck, 
  ArrowUpRight, 
  Layers, 
  CheckCircle2, 
  Eye, 
  SlidersHorizontal 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

export function LiquidGlassShowcase() {
  const { theme, setTheme } = useTheme();
  const [activeGlassVariant, setActiveGlassVariant] = useState<'adaptive' | 'light-preview' | 'dark-preview'>('adaptive');

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      
      {/* 1. Header / Navbar Demonstration with .glass-nav */}
      <header className={cn(
        "glass-nav w-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border transition-all duration-300",
        "shadow-glass backdrop-blur-xl backdrop-saturate-180"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-white/40 shadow-inner">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white glass-title">
                Liquid Glass
              </h2>
              <span className="glass-badge bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/30">
                iOS Design Spec
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 glass-subtitle">
              Sistem Desain Glassmorphism Saturasi Tinggi & Kontras WCAG AA
            </p>
          </div>
        </div>

        {/* Live Interactive Switcher in Navbar */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <div className="inline-flex items-center p-1 rounded-full bg-white/40 dark:bg-black/30 border border-white/30 dark:border-white/10 shadow-inner backdrop-blur-md">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                theme === 'light'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              )}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                theme === 'dark'
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-white"
              )}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dark</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('liquid-glass')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                theme === 'liquid-glass'
                  ? "bg-sky-500 text-white shadow-sm ring-1 ring-white/50"
                  : "text-slate-600 dark:text-slate-300 hover:text-sky-500"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Liquid Glass</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Controls & Overview Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/25">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            <Layers className="w-4 h-4" />
            <span>Spesifikasi Desain & Kompatibilitas Token</span>
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Komponen ini menunjukkan efek refleksi tepi kaca (specular highlight), blur bertingkat, dan ketajaman kontras teks di atas permukaan semi-transparan.
          </p>
        </div>

        {/* Filter Preview Variant */}
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-white/20 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveGlassVariant('adaptive')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-lg transition-all",
              activeGlassVariant === 'adaptive' ? "bg-white dark:bg-slate-800 shadow-2xs text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Adaptif Otomatis
          </button>
          <button
            type="button"
            onClick={() => setActiveGlassVariant('light-preview')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-lg transition-all",
              activeGlassVariant === 'light-preview' ? "bg-white dark:bg-slate-800 shadow-2xs text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Simulasi Kaca Terang
          </button>
          <button
            type="button"
            onClick={() => setActiveGlassVariant('dark-preview')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-lg transition-all",
              activeGlassVariant === 'dark-preview' ? "bg-white dark:bg-slate-800 shadow-2xs text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Simulasi Kaca Gelap
          </button>
        </div>
      </div>

      {/* 3. Cards Demonstration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Card 1: Mode Kaca Terang (Light Glass Surface) */}
        {(activeGlassVariant === 'adaptive' || activeGlassVariant === 'light-preview') && (
          <div className="relative group">
            {/* Background Simulator Container */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-sky-400/30 via-indigo-400/20 to-pink-400/30 border border-white/40 shadow-inner">
              <span className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-extrabold bg-white/70 text-slate-800 border border-white shadow-2xs">
                Light Glass Variant (RGBA 255, 255, 255, 0.55)
              </span>

              <Card 
                variant="glass" 
                className="bg-white/60 text-slate-900 border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] hover:shadow-[0_16px_40px_0_rgba(0,0,0,0.18)] hover:border-white/90 hover:-translate-y-1 transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700">
                        Sektor Kuliner Unggulan
                      </span>
                      <CardTitle className="text-xl font-black text-slate-900 mt-1">
                        Kopi Rempah Tradisional Melayu
                      </CardTitle>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Terverifikasi NIB</span>
                    </span>
                  </div>
                  <CardDescription className="text-sm font-semibold text-slate-700 mt-2">
                    Pelaku usaha mikro binaan kota Tanjungpinang dengan komoditas kopi rempah siap ekspor bersertifikat halal & BPOM.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Metric Box inside Glass */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/50 border border-white/80 shadow-xs">
                    <div>
                      <p className="text-xs font-bold text-slate-600">Omzet Bulanan Rata-rata</p>
                      <p className="text-xl font-black text-slate-900 mt-0.5">Rp 38.500.000</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center border border-emerald-500/20">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Contrast Legibility Check Badge */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/5 border border-slate-900/10 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Rasio Kontras: 11.2:1 (Lolos Standar WCAG AAA)</span>
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between pt-4 border-t border-slate-900/10 text-xs font-bold text-slate-600">
                  <span>Terakhir diperbarui: Hari ini, 15:30 WIB</span>
                  <button type="button" className="glass-button bg-white/50 text-slate-900 hover:bg-white text-xs py-1.5 px-3">
                    Lihat Berkas
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}

        {/* Card 2: Mode Kaca Gelap (Dark Glass Surface) */}
        {(activeGlassVariant === 'adaptive' || activeGlassVariant === 'dark-preview') && (
          <div className="relative group">
            {/* Background Simulator Container */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-white/10 shadow-inner">
              <span className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-extrabold bg-white/10 text-slate-200 border border-white/20 shadow-2xs">
                Dark Glass Variant (RGBA 18, 18, 24, 0.65)
              </span>

              <Card 
                variant="glass" 
                className="bg-[rgba(18,18,24,0.70)] text-slate-50 border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.45)] hover:shadow-[0_16px_44px_0_rgba(0,0,0,0.60)] hover:border-white/30 hover:-translate-y-1 transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
                        Sektor Kerajinan & Kriya
                      </span>
                      <CardTitle className="text-xl font-black text-white mt-1">
                        Batik Gonggong Bahari Lestari
                      </CardTitle>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                      <span>Terverifikasi SNI</span>
                    </span>
                  </div>
                  <CardDescription className="text-sm font-semibold text-slate-300 mt-2">
                    Karya seni motif khas Kepulauan Riau bermitra dengan 22 perajin tenun dan batik cap ramah lingkungan.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Metric Box inside Glass */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 shadow-xs">
                    <div>
                      <p className="text-xs font-bold text-slate-400">Estimasi Penjualan Ekspor</p>
                      <p className="text-xl font-black text-white mt-0.5">Rp 52.100.000</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-400/30">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Contrast Legibility Check Badge */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Rasio Kontras: 14.8:1 (Lolos Standar WCAG AAA)</span>
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between pt-4 border-t border-white/10 text-xs font-bold text-slate-400">
                  <span>Terakhir diperbarui: 2 jam lalu</span>
                  <button type="button" className="glass-button bg-white/10 text-white hover:bg-white/20 text-xs py-1.5 px-3">
                    Lihat Berkas
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}

      </div>

      {/* 4. Interactive Specular Edge & Utility Showcase Footer */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/20">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white glass-title">
            Fitur Edge Specular Reflection (iOS-Style)
          </h4>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 glass-subtitle">
            Setiap kartu dan panel dilengkapi garis kilauan specular 1px di tepi atas yang beradaptasi dengan pencahayaan latar.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button type="button" className="glass-button text-xs py-2 px-4 shadow-glass-specular">
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Mode</span>
          </button>
          <button type="button" className="glass-button bg-primary text-white hover:bg-primary/90 text-xs py-2 px-4 shadow-md">
            <span>Terapkan Tema Ini</span>
          </button>
        </div>
      </div>

    </div>
  );
}
