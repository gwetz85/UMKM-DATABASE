'use client';

import React, { useMemo } from 'react';
import { useDatabase, useMemoFirebase, useObject } from '@/firebase';
import { ref } from 'firebase/database';
import { MapPin, Loader2, Layers, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KelurahanWidgetProps {
  className?: string;
}

export function KelurahanWidget({ className }: KelurahanWidgetProps) {
  const database = useDatabase();

  const statsRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'system_stats');
  }, [database]);

  const { data: systemStats, isLoading } = useObject(statsRef);

  const kelurahanStats = useMemo(() => {
    if (!systemStats?.kelurahan) return [];
    const stats = Object.entries(systemStats.kelurahan).map(([name, count]) => ({
      name,
      count: count as number,
    }));
    return stats.sort((a, b) => b.count - a.count);
  }, [systemStats]);

  const totalTersebar = useMemo(() => {
    return kelurahanStats.reduce((acc, curr) => acc + curr.count, 0);
  }, [kelurahanStats]);

  const maxCount = useMemo(() => {
    if (kelurahanStats.length === 0) return 1;
    return Math.max(...kelurahanStats.map((k) => k.count), 1);
  }, [kelurahanStats]);

  return (
    <div
      className={cn(
        "w-72 bg-white/75 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-white/70 dark:border-white/10 shadow-[0_8px_30px_rgba(15,23,42,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:border-primary/40 group",
        className
      )}
    >
      {/* Header */}
      <div className="p-3 pb-2.5 border-b border-white/70 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6.5 h-6.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
              Sebaran Kelurahan
            </h3>
            <p className="text-[8.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-tight mt-0.5">
              Kota Tanjungpinang
            </p>
          </div>
        </div>
        <span className="text-[9.5px] font-black px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 shadow-xs">
          {kelurahanStats.length} Kel
        </span>
      </div>

      {/* Table & Ranking Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2.5 text-slate-400 text-xs flex-1">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="font-extrabold text-[9.5px] uppercase tracking-wider">Memuat Sebaran...</span>
          </div>
        ) : kelurahanStats.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs font-semibold flex-1 flex items-center justify-center">
            Belum ada data sebaran
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar select-none divide-y divide-slate-100/60 dark:divide-slate-800/40">
            {kelurahanStats.map((item, idx) => {
              const rank = idx + 1;
              const percent = Math.min(100, Math.round((item.count / maxCount) * 100));

              return (
                <div
                  key={item.name}
                  className="relative flex items-center justify-between px-3 py-1.5 transition-all duration-150 hover:bg-white/80 dark:hover:bg-slate-800/70 group/row"
                >
                  {/* Subtle Background Proportion Progress Bar */}
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/[0.04] dark:bg-primary/[0.08] pointer-events-none transition-all group-hover/row:bg-primary/[0.08]"
                    style={{ width: `${percent}%` }}
                  />

                  {/* Left: Rank & Kelurahan Name */}
                  <div className="relative z-10 flex items-center gap-2 min-w-0 pr-2">
                    {/* Rank Badge */}
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {rank === 1 ? (
                        <span className="w-4.5 h-4.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-black text-[9px] flex items-center justify-center ring-1 ring-amber-300/80 dark:ring-amber-700 shadow-xs">
                          1
                        </span>
                      ) : rank === 2 ? (
                        <span className="w-4.5 h-4.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-[9px] flex items-center justify-center ring-1 ring-slate-300 dark:ring-slate-700 shadow-xs">
                          2
                        </span>
                      ) : rank === 3 ? (
                        <span className="w-4.5 h-4.5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 font-black text-[9px] flex items-center justify-center ring-1 ring-orange-300/80 dark:ring-orange-800 shadow-xs">
                          3
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                          {rank}
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <span 
                      className="font-black text-[11px] text-slate-900 dark:text-white uppercase truncate group-hover/row:text-primary transition-colors"
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </div>

                  {/* Right: Data Count Chip */}
                  <div className="relative z-10 shrink-0">
                    <span className="inline-flex items-center justify-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-900 dark:text-white font-black px-2.5 py-0.5 rounded-xl text-[10.5px] border border-white/70 dark:border-white/10 shadow-xs group-hover/row:border-primary/40 group-hover/row:text-primary transition-all min-w-[2.2rem]">
                      {item.count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 px-3 bg-white/60 dark:bg-slate-800/80 backdrop-blur-md border-t border-white/70 dark:border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span className="text-[9.5px] font-black uppercase tracking-wider">
            Total Tersebar
          </span>
        </div>
        <span className="text-xs font-black text-primary">
          {totalTersebar.toLocaleString('id-ID')} Data
        </span>
      </div>
    </div>
  );
}
