'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { InfoDialog } from '@/components/info-dialog';
import { ProfileStatusDialog } from '@/components/ProfileStatusDialog';
import { ChatBubble } from '@/components/chat-bubble';
import { OfficeHoursTimer } from '@/components/OfficeHoursTimer'
import { GlobalAutoVerifier } from '@/components/GlobalAutoVerifier';
import { GlobalAutoVerifier } from '@/components/GlobalAutoVerifier';
import { useUser, useDatabase, useList, useMemoFirebase, useObject } from '@/firebase'
import { ref } from 'firebase/database'
import { User as UserIcon, Calendar } from 'lucide-react'
import Link from 'next/link'
import { EventCountdown } from './event-countdown';
import { useActiveEvent } from '@/hooks/use-active-event';


import { Toaster } from '@/components/ui/toaster';
import { ThemePersistence } from '@/components/theme-persistence';
import { useSoundEffect } from '@/hooks/use-sound-effect';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const database = useDatabase();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  const { data: allUsers } = useList(userProfileRef)
  const profile = allUsers?.find((u: any) => u.uid === user?.uid)
  const isKoordinator = profile?.role === 'koordinator'
  const { playSound } = useSoundEffect();

  const eventSettingsRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'settings/event_info')
  }, [database])
  const { data: eventInfo } = useObject(eventSettingsRef)
  const activeEvent = useActiveEvent(eventInfo)

  React.useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Expanded detection for any interactive or pointer-enabled element
      const isClickable = 
        target.closest('button') || 
        target.closest('a') || 
        target.closest('[role="button"]') ||
        target.closest('[role="tab"]') ||
        target.closest('label') ||
        target.closest('summary') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('.cursor-pointer') ||
        window.getComputedStyle(target).cursor === 'pointer';

      if (isClickable) {
        console.log('[SoundEffect] Click detected on:', target.tagName, target.className);
        playSound('click', 0.35);
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [playSound]);

  const isLoginPage = pathname === '/login'

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
    <>
      <ThemePersistence />
      <SidebarProvider>
        <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-transparent">
          {/* Global Components */}
          <GlobalAutoVerifier />
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
                    <button className="w-10 h-10 overflow-hidden rounded-full border border-white/20 shadow-lg outline-none bg-white flex items-center justify-center">
                      <img 
                        src="/logo.png" 
                        alt="SIMPU" 
                        className="w-full h-full object-contain p-1"
                      />
                    </button>
                  </InfoDialog>
                  <Link href="/profile" className="w-9 h-9 rounded-xl overflow-hidden border border-white/20 shadow-inner bg-white/10 flex items-center justify-center transition-transform active:scale-95">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-white" />
                    )}
                  </Link>
                  <div className="flex flex-col items-end gap-1">
                    <OfficeHoursTimer />
                  </div>
                </div>

              </header>
              <ProfileStatusDialog />
              
              {/* Mobile Event Banner */}
              {activeEvent && (
                <div key={activeEvent.id || activeEvent.description} className="md:hidden bg-gradient-to-b from-primary/10 to-transparent border-b border-primary/20 px-4 py-3 flex flex-col items-center justify-center animate-in fade-in zoom-in slide-in-from-top-2 duration-700 w-full">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 text-center text-balance drop-shadow-sm">
                    {activeEvent.description || 'EVENT MENDATANG'}
                  </span>
                  <EventCountdown targetDate={activeEvent.endDate || activeEvent.date} startDate={activeEvent.startDate} />
                </div>
              )}
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
                  
                  {/* Event Info - Center Area */}
                  {activeEvent && (
                    <div key={activeEvent.id || activeEvent.description} className="flex-1 flex flex-col items-center justify-center px-4 animate-in fade-in zoom-in duration-1000">
                      <div className="flex flex-col items-center gap-1 group cursor-default">
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-8 md:w-12 bg-primary/20 rounded-full" />
                          <span className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-[0.3em] text-center drop-shadow-sm group-hover:tracking-[0.4em] transition-all">
                            {activeEvent.description || 'EVENT MENDATANG'}
                          </span>
                          <div className="h-1 w-8 md:w-12 bg-primary/20 rounded-full" />
                        </div>
                        <EventCountdown targetDate={activeEvent.endDate || activeEvent.date} startDate={activeEvent.startDate} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1.5 translate-y-2">
                       <OfficeHoursTimer />
                    </div>
                    <Link 
                      href="/profile" 
                      className="flex items-center gap-3 pl-4 border-l border-slate-200 group"
                    >
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{profile?.fullName?.split(' ')[0] || 'User'}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Lihat Profil</span>
                      </div>
                      <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-white ring-2 ring-primary/5 shadow-md transition-transform group-hover:scale-105 active:scale-95 bg-slate-50 flex items-center justify-center">
                        {profile?.photoURL ? (
                          <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-5 h-5 text-primary/30" />
                        )}
                      </div>
                    </Link>
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
    </>
  );
}