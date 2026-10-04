import React from 'react';
import { useDatabase, useObject, useMemoFirebase } from '@/firebase';
import { ref } from 'firebase/database';

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
    <div className="w-full shrink-0 relative bg-[#005e61]/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-white/20 dark:border-white/10 overflow-hidden py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-[100] print:hidden">
      <div className="relative flex overflow-x-hidden whitespace-nowrap">
        <div className="animate-marquee inline-block whitespace-nowrap">
          <span className="text-[11.5px] font-black text-white uppercase tracking-widest px-8">
            {text}
          </span>
          {/* Pemisah antar teks */}
          <span className="text-white/50 mx-4 font-black">•</span>
          <span className="text-[11.5px] font-black text-white uppercase tracking-widest px-8">
            {text}
          </span>
          <span className="text-white/50 mx-4 font-black">•</span>
        </div>
      </div>

      <style jsx>{`
        .animate-marquee {
          display: inline-block;
          animation: marquee 80s linear infinite;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
