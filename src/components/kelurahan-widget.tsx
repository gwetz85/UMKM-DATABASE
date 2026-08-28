'use client';

import React, { useMemo } from 'react';
import { useDatabase, useMemoFirebase, useObject } from '@/firebase';
import { ref } from 'firebase/database';
import { MapPin, Loader2 } from 'lucide-react';
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

  return (
    <div
      className={cn(
        "w-72 bg-white/80 dark:bg-slate-900/85 backdrop-blur-md rounded-2xl border border-white/60 dark:border-slate-800/80 shadow-lg overflow-hidden flex flex-col transition-all hover:shadow-xl hover:bg-white dark:hover:bg-slate-900",
        className
      )}
    >
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider leading-tight">
              Sebaran Kelurahan
            </h3>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-tight">
              Kota Tanjungpinang
            </p>
          </div>
        </div>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
          {kelurahanStats.length} Kel
        </span>
      </div>

      {/* Table Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {isLoading ? (
          <div className="p-6 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="font-bold text-[10px] uppercase tracking-wider">Memuat Data...</span>
          </div>
        ) : kelurahanStats.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs font-medium">
            Belum ada data sebaran
          </div>
        ) : (
          <div className="max-h-[230px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm z-10 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-800/50">
                <tr>
                  <th className="py-1.5 px-2 text-center w-8">No</th>
                  <th className="py-1.5 px-2">Kelurahan</th>
                  <th className="py-1.5 px-2 text-center w-16">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {kelurahanStats.map((item, idx) => (
                  <tr
                    key={item.name}
                    className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group"
                  >
                    <td className="py-1.5 px-2 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2 font-bold text-[11px] text-slate-700 dark:text-slate-200 uppercase group-hover:text-primary transition-colors truncate max-w-[130px]" title={item.name}>
                      {item.name}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <span className="inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black px-2 py-0.5 rounded-md min-w-[2rem] text-[10px] border border-slate-200 dark:border-slate-700 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all">
                        {item.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-100/80 dark:bg-slate-800/80 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          Total Tersebar
        </span>
        <span className="text-xs font-black text-primary drop-shadow-sm">
          {totalTersebar.toLocaleString('id-ID')} Data
        </span>
      </div>
    </div>
  );
}
