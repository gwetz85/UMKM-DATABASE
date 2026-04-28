'use client';

import React from 'react';

export function RunningText() {
  const text = "SELAMAT DATANG DI APLIKASI SISTEM INFORMASI MANAJEMEN PELAKU USAHA TAHUN 2026 , APLIKASI INI BISA DI GUNAKAN UNTUK MELAKUKAN CEK DATA DAN PENGINPUTAN DATA PELAKU USAHA . SYSTEM KAMI AKAN MENDETEKSI SEMUA PERIHAL YANG DIKERJAKAN ATAU DIAKSES DI APLIKASI . PENGECEKKAN BISA DI LAKUKAN MELALUI BERBAGAI MACAM FITUR / JALUR PENGECEKKAN";

  return (
    <div className="w-full bg-primary/5 border-y border-primary/10 overflow-hidden py-1.5 print:hidden">
      <div className="relative flex overflow-x-hidden whitespace-nowrap">
        <div className="animate-marquee py-0.5 inline-block whitespace-nowrap">
          <span className="text-[11px] font-black text-primary uppercase tracking-widest px-4">
            {text}
          </span>
          {/* Duplicate for seamless loop */}
          <span className="text-[11px] font-black text-primary uppercase tracking-widest px-4">
            {text}
          </span>
        </div>
      </div>

      <style jsx>{`
        .animate-marquee {
          display: inline-block;
          animation: marquee 40s linear infinite;
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
