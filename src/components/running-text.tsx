'use client';

import React, { useState, useEffect } from 'react';
import { useDatabase, useObject, useMemoFirebase } from '@/firebase';
import { ref } from 'firebase/database';

export function RunningText() {
  const database = useDatabase();
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTimeString(`${h}:${m}:${s}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const configRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/running_text');
  }, [database]);

  const { data: config } = useObject(configRef);
  
  const defaultText = "SELAMAT DATANG DI APLIKASI SISTEM INFORMASI MANAJEMEN PELAKU USAHA TAHUN 2026 , APLIKASI INI BISA DI GUNAKAN UNTUK MELAKUKAN CEK DATA DAN PENGINPUTAN DATA PELAKU USAHA . SYSTEM KAMI AKAN MENDETEKSI SEMUA PERIHAL YANG DIKERJAKAN ATAU DIAKSES DI APLIKASI . PENGECEKKAN BISA DI LAKUKAN MELALUI BERBAGAI MACAM FITUR / JALUR PENGECEKKAN";
  
  const text = (typeof config === 'string' ? config : config?.text) || defaultText;

  return (
    <div className="w-full shrink-0 relative bg-[#070D1D] text-slate-100 border-t border-slate-800/80 overflow-hidden h-9 sm:h-10 flex items-center z-30 print:hidden shadow-lg select-none">
      {/* Realtime Clock Badge on Left (HH:MM:SS) */}
      <div className="h-full px-3 sm:px-4 bg-[#0B132B] border-r border-slate-800/80 flex items-center gap-2 shrink-0 z-10 shadow-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-xs sm:text-sm font-mono font-black tracking-wider text-sky-300 whitespace-nowrap tabular-nums">
          {timeString || '--:--:--'}
        </span>
      </div>

      {/* Marquee Content */}
      <div className="relative flex-1 h-full flex items-center overflow-hidden">
        <div className="animate-marquee whitespace-nowrap text-slate-200 font-bold text-xs uppercase tracking-wide flex items-center hover:[animation-play-state:paused]">
          <span className="inline-block px-8">{text}</span>
          <span className="text-sky-400 font-black">•</span>
          <span className="inline-block px-8">{text}</span>
          <span className="text-sky-400 font-black">•</span>
          <span className="inline-block px-8">{text}</span>
          <span className="text-sky-400 font-black">•</span>
        </div>
      </div>

      <style jsx>{`
        .animate-marquee {
          display: inline-flex;
          animation: marquee 50s linear infinite;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </div>
  );
}
