'use client';

import React from 'react';
import { useDatabase, useObject, useMemoFirebase } from '@/firebase';
import { ref } from 'firebase/database';
import { Megaphone } from 'lucide-react';

export function RunningText() {
  const database = useDatabase();
  
  const configRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/running_text');
  }, [database]);

  const { data: config } = useObject(configRef);
  
  const defaultText = "SELAMAT DATANG DI APLIKASI SISTEM INFORMASI MANAJEMEN PELAKU USAHA TAHUN 2026 , APLIKASI INI BISA DI GUNAKAN UNTUK MELAKUKAN CEK DATA DAN PENGINPUTAN DATA PELAKU USAHA . SYSTEM KAMI AKAN MENDETEKSI SEMUA PERIHAL YANG DIKERJAKAN ATAU DIAKSES DI APLIKASI . PENGECEKKAN BISA DI LAKUKAN MELALUI BERBAGAI MACAM FITUR / JALUR PENGECEKKAN";
  
  const text = (typeof config === 'string' ? config : config?.text) || defaultText;

  return (
    <div className="w-full shrink-0 relative bg-[#070D1D] text-slate-100 border-t border-slate-800/80 overflow-hidden h-9 sm:h-10 flex items-center z-30 print:hidden shadow-lg select-none">
      {/* Label Badge on Left */}
      <div className="h-full px-3 sm:px-4 bg-[#0B132B] border-r border-slate-800/80 flex items-center gap-2 shrink-0 z-10 shadow-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Megaphone className="w-3.5 h-3.5 text-sky-400 shrink-0 hidden xs:inline" />
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-sky-300 whitespace-nowrap">
          INFO
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
