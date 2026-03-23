'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar, UmkmLogo } from '@/components/app-sidebar';
import { AboutDialog } from '@/components/about-dialog';
import { ProfileStatusDialog } from '@/components/ProfileStatusDialog';

import { Toaster } from '@/components/ui/toaster';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full overflow-hidden">
        {/* Mobile Header - Hidden on Login */}
        {!isLoginPage && (
          <>
            <header className="flex md:hidden items-center justify-between px-4 h-14 bg-gradient-to-r from-primary to-blue-800 text-white shrink-0 z-30 shadow-md print:hidden">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="text-white hover:bg-white/10 transition-colors" />
                <div className="flex flex-col">
                  <span className="text-xs font-black tracking-tight leading-none">UMKM DATABASE</span>
                  <span className="text-[8px] font-bold text-accent tracking-widest uppercase">Versi 4.5</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AboutDialog variant="ghost" className="text-white hover:bg-white/10 border-white/10" />
                <div className="bg-accent/20 p-1.5 rounded-lg">
                  <UmkmLogo className="w-4 h-4 text-accent" />
                </div>
              </div>
            </header>
            <Toaster />
            <ProfileStatusDialog />
          </>
        )}

        <div className="flex flex-1 w-full overflow-hidden">
          <div className="print:hidden">
            <AppSidebar />
          </div>
          <main className="flex-1 overflow-auto bg-transparent print:bg-white">
            {/* Desktop Top Bar - Hidden on Login */}
            {!isLoginPage && (
              <div className="hidden md:flex p-4 items-center justify-between print:hidden sticky top-0 glass-panel z-10 border-b border-white/20 shadow-sm mx-4 mt-4 rounded-2xl">
                <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors p-2 rounded-lg" />
                <AboutDialog className="border-primary/20 text-primary hover:bg-primary/5 transition-colors" />
              </div>
            )}
            <div className="w-full relative z-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}