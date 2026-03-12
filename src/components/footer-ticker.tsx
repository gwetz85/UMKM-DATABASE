'use client';

import React, { useEffect, useState } from 'react';

export function FooterTicker() {
  const [mounted, setMounted] = useState(false);
  const message = "Selamat datang di Aplikasi UMKM Database versi 3.1 . Aplikasi ini dikembangkan di rancang untuk mempermudah dalam pengecekkan dan penginputan data . Aplikasi ini masih perlu pengembangan kedepannya , kritik dan saran sangat di perlukan . Kirimkan kritik dan saran ke email : agussuriyadipunya@gmail.com atau layanan Whatsapp : 0817319885. Terima kasih";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <footer className="w-full bg-primary/95 backdrop-blur-sm border-t border-white/10 h-10 flex items-center overflow-hidden z-40">
      <div className="bg-accent px-4 h-full flex items-center z-10 shadow-[4px_0_10px_rgba(0,0,0,0.2)]">
        <span className="text-[10px] font-black text-accent-foreground whitespace-nowrap tracking-tighter">
          INFO TERKINI
        </span>
      </div>
      <div className="relative flex-1 h-full flex items-center overflow-hidden">
        <div className="animate-marquee whitespace-nowrap text-white font-medium text-xs py-2 flex gap-4">
          <span className="inline-block px-4">{message}</span>
          <span className="inline-block px-4">{message}</span>
          <span className="inline-block px-4">{message}</span>
        </div>
      </div>
    </footer>
  );
}