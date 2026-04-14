'use client';

import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';

export function HeaderTicker() {
  const [mounted, setMounted] = useState(false);
  const message = "Selamat datang di Aplikasi SIMPU (Sistem Informasi Manajemen Pelaku Usaha) versi 5.2. Aplikasi ini dirancang untuk mempermudah dalam pengecekkan dan penginputan data. Kritik dan saran sangat diperlukan. Kirimkan pesan ke email: agussuriyadipunya@gmail.com atau Whatsapp: 0817319885. Terima kasih.";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="hidden md:flex w-[calc(100%-2rem)] mx-4 mb-4 mt-0 glass-panel border border-white/20 shadow-sm rounded-xl overflow-hidden z-30 relative h-9 items-center">
      <div className="bg-primary px-3 h-full flex items-center z-10 shadow-lg">
        <Info className="w-3.5 h-3.5 text-white mr-2" />
        <span className="text-[9px] font-black text-white whitespace-nowrap tracking-widest uppercase">
          INFO TERKINI
        </span>
      </div>
      <div className="relative flex-1 h-full flex items-center overflow-hidden bg-white/50 backdrop-blur-sm">
        <div className="animate-marquee whitespace-nowrap text-primary font-bold text-xs py-1 flex gap-8 items-center">
          <span className="inline-block px-4">{message}</span>
          <span className="inline-block px-4">{message}</span>
          <span className="inline-block px-4">{message}</span>
          <span className="inline-block px-4">{message}</span>
        </div>
      </div>
    </div>
  );
}
