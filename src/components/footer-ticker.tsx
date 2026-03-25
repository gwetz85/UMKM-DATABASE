'use client';

import React, { useEffect, useState } from 'react';

export function FooterTicker() {
  const [mounted, setMounted] = useState(false);
  const message = "Selamat datang di Aplikasi SIMPU (Sistem Informasi Manajemen Pelaku Usaha) versi 5.2. Aplikasi ini dirancang untuk mempermudah dalam pengecekkan dan penginputan data. Kritik dan saran sangat diperlukan. Kirimkan pesan ke email: agussuriyadipunya@gmail.com atau Whatsapp: 0817319885. Terima kasih.";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <footer className="w-full bg-primary/95 backdrop-blur-sm border-t border-white/10 h-8 md:h-10 flex items-center overflow-hidden z-40 relative">
      <div className="bg-accent px-2 md:px-4 h-full flex items-center z-10 shadow-[4px_0_10px_rgba(0,0,0,0.2)]">
        <span className="text-[8px] md:text-[10px] font-black text-accent-foreground whitespace-nowrap tracking-tighter uppercase">
          INFO TERKINI
        </span>
      </div>
      <div className="relative flex-1 h-full flex items-center overflow-hidden">
        <div className="animate-marquee whitespace-nowrap text-white font-medium text-[10px] md:text-xs py-1 md:py-2 flex gap-4">
          <span className="inline-block px-4">{message}</span>
          <span className="inline-block px-4">{message}</span>
          <span className="inline-block px-4">{message}</span>
        </div>
      </div>
    </footer>
  );
}
