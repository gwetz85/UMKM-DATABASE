'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { InfoDialog } from '@/components/info-dialog';
import { ProfileStatusDialog } from '@/components/ProfileStatusDialog';
import { ChatBubble } from '@/components/chat-bubble';

import { Toaster } from '@/components/ui/toaster';
import { ThemePersistence } from '@/components/theme-persistence';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/': return 'Dashboard';
      case '/actor-data': return 'Data Pelaku Usaha';
      case '/finish': return 'Data Selesai';
      case '/rejected': return 'Data Ditolak';
      case '/verify-actor': return 'Verifikasi Admin';
      case '/verify-bank': return 'Verifikasi Data';
      case '/input': return 'Input Data';
      case '/check-data': return 'Cek Data';
      case '/profile': return 'Profil Saya';
      case '/settings': return 'Pengaturan';
      case '/users': return 'Manajemen User';
      case '/chat-monitoring': return 'Monitoring Chat';
      case '/lpj': return 'LPJ';
      default: return '';
    }
  };

  const currentTitle = getPageTitle(pathname);

  return (
    <SidebarProvider>
      <ThemePersistence />
      <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background">
        {/* Global Components */}
        <Toaster />

        {/* Mobile Header - Hidden on Login */}
        {!isLoginPage && (
          <>
            <header className="sticky top-0 flex md:hidden items-center justify-between px-4 h-16 bg-primary text-white shrink-0 z-50 shadow-md print:hidden">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="text-white hover:bg-white/10 transition-colors" />
                <div className="flex flex-col">
                  <span className="text-2xl font-black tracking-tighter leading-none flex items-center gap-1">
                    SIMPU
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <InfoDialog>
                  <button className="w-10 h-10 overflow-hidden rounded-full border border-white/20 shadow-lg outline-none">
                    <img 
                      src="/logo.png" 
                      alt="SIMPU" 
                      className="w-full h-full object-cover"
                    />
                  </button>
                </InfoDialog>
              </div>
            </header>
            <ProfileStatusDialog />
          </>
        )}

        <div className="flex flex-1 min-h-0 w-full overflow-hidden">
          <AppSidebar />
          <main className="flex-1 overflow-auto bg-transparent print:bg-white relative z-0 isolate">
            {/* Desktop Top Bar - Hidden on Login */}
            {!isLoginPage && (
              <div className="hidden md:flex p-4 items-center justify-between print:hidden sticky top-4 z-40 glass-panel border border-white/20 shadow-sm mx-4 mb-4 mt-4 rounded-2xl backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors p-2 rounded-lg" />
                  {currentTitle && (
                    <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight uppercase">
                      {currentTitle}
                    </h1>
                  )}
                </div>
              </div>
            )}
            <div key={pathname} className="w-full relative z-0 animate-in fade-in-up">
              {children}
            </div>
            
            {!isLoginPage && <ChatBubble />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}