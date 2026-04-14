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
import { BackgroundMusic } from '@/components/BackgroundMusic';
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
              <header className="sticky top-0 flex md:hidden items-center justify-between px-6 h-20 ios-glass text-slate-900 shrink-0 z-50 border-b border-black/5 print:hidden">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-primary hover:bg-primary/5 transition-all p-2.5 rounded-full" />
                  <div className="flex flex-col">
                    <span className="text-2xl font-[900] tracking-tighter leading-none text-slate-900">
                      SIMPU
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Link href="/profile" className="w-10 h-10 rounded-full overflow-hidden border border-black/5 shadow-sm bg-slate-100 flex items-center justify-center transition-all active:scale-90">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </Link>
                  <OfficeHoursTimer />
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
                <div className="hidden md:flex flex-col px-10 pt-12 pb-6 print:hidden">
                    {currentTitle && (
                      <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-left-4 duration-1000">
                         <span className="text-xs font-bold text-primary uppercase tracking-[0.3em] ml-1">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        <h1 className="text-5xl md:text-6xl font-[900] text-slate-900 tracking-[-0.04em] landing-none">
                          {currentTitle}
                        </h1>
                      </div>
                    )}
                </div>
                
                <div className="hidden md:flex p-4 items-center justify-between print:hidden sticky top-0 z-40 ios-glass border-b border-black/5 mx-0 mb-4 rounded-none h-16 opacity-0 hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center gap-4 px-6">
                    <SidebarTrigger className="text-primary hover:bg-primary/5 transition-all p-2 rounded-full" />
                    <span className="text-lg font-bold text-slate-800">{currentTitle}</span>
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

                  <div className="flex items-center gap-6">
                    <OfficeHoursTimer />
                    <Link 
                      href="/profile" 
                      className="flex items-center gap-4 pl-6 border-l border-slate-200 group"
                    >
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest group-hover:text-primary transition-colors">{profile?.fullName?.split(' ')[0] || 'User'}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Profil Akun</span>
                      </div>
                      <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white ring-4 ring-primary/5 shadow-xl transition-all group-hover:scale-110 group-hover:ring-primary/10 bg-slate-50 flex items-center justify-center">
                        {profile?.photoURL ? (
                          <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-primary/30" />
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
              {!isKoordinator && <BackgroundMusic />}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}