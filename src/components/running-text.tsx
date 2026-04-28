'use client';

import React from 'react';

export function RunningText() {
  const text = "SELAMAT DATANG DI APLIKASI SISTEM INFORMASI MANAJEMEN PELAKU USAHA TAHUN 2026 , APLIKASI INI BISA DI GUNAKAN UNTUK MELAKUKAN CEK DATA DAN PENGINPUTAN DATA PELAKU USAHA . SYSTEM KAMI AKAN MENDETEKSI SEMUA PERIHAL YANG DIKERJAKAN ATAU DIAKSES DI APLIKASI . PENGECEKKAN BISA DI LAKUKAN MELALUI BERBAGAI MACAM FITUR / JALUR PENGECEKKAN";

  return (
    <div className="mx-4 mt-4 mb-2 bg-[#e0f2fe]/90 backdrop-blur-xl border border-white/50 overflow-hidden py-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl sticky top-4 z-30 print:hidden ring-1 ring-blue-100/50">
      <div className="relative flex overflow-x-hidden whitespace-nowrap">
        <div className="animate-marquee inline-block whitespace-nowrap">
          <span className="text-[10px] font-black text-[#0369a1] uppercase tracking-[0.25em] px-8">
            {text}
          </span>
          {/* Pemisah antar teks */}
          <span className="text-[#0369a1]/20 mx-4 font-normal text-lg">/</span>
          <span className="text-[10px] font-black text-[#0369a1] uppercase tracking-[0.25em] px-8">
            {text}
          </span>
          <span className="text-[#0369a1]/20 mx-4 font-normal text-lg">/</span>
        </div>
      </div>

      <style jsx>{`
        .animate-marquee {
          display: inline-block;
          animation: marquee 70s linear infinite;
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
