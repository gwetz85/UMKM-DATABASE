'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { InfoDialog } from '@/components/info-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ProfileStatusDialog } from '@/components/ProfileStatusDialog';
import { OfficeHoursTimer } from '@/components/OfficeHoursTimer'
import { GlobalAutoVerifier } from '@/components/GlobalAutoVerifier';
import { BackgroundMusic } from '@/components/BackgroundMusic';
import { useUser, useDatabase, useList, useMemoFirebase, useObject, useAuth } from '@/firebase'
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database'
import { signOut } from 'firebase/auth'
import { User as UserIcon, LayoutGrid, Home, LogOut, Check, X as XIcon, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { EventCountdown } from './event-countdown';
import { useActiveEvent } from '@/hooks/use-active-event';
import { Toaster } from '@/components/ui/toaster';
import { ThemePersistence } from '@/components/theme-persistence';
import { RunningText } from './running-text';
import { useSoundEffect } from '@/hooks/use-sound-effect';
import { cn } from '@/lib/utils';
import { MessageNotification } from './MessageNotification';
import { RealtimeClock } from './realtime-clock';
import { WeatherWidget } from './weather-widget';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth()
  const database = useDatabase();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = React.useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  
  const { data: allUsers, isLoading: isUsersLoading } = useList(userProfileRef)
  const profile = allUsers?.find((u: any) => u.uid === user?.uid)
  const isKoordinator = profile?.role === 'koordinator'
  const { playSound } = useSoundEffect();

  const eventSettingsRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'settings/event_info')
  }, [database])
  const { data: eventInfo } = useObject(eventSettingsRef)
  const activeEvent = useActiveEvent(eventInfo)

  const maintenanceRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/maintenance');
  }, [database]);
  const { data: maintenanceData } = useObject(maintenanceRef);

  const isAdmin = profile?.role === 'admin' || (user?.email?.toLowerCase() === 'agus@umkm.id');

  React.useEffect(() => {
    if (maintenanceData && typeof maintenanceData === 'object' && user && profile) {
      const isMaintenanceMode = maintenanceData.enabled === true;
      if (isMaintenanceMode && !isAdmin && pathname !== '/maintenance' && pathname !== '/login') {
        router.replace('/maintenance');
      } else if (!isMaintenanceMode && pathname === '/maintenance') {
        router.replace('/');
      }
    }
  }, [maintenanceData, isAdmin, pathname, router, user, profile]);

  React.useEffect(() => {
    if (!database || !user || !profile?.id) return;

    const userStatusRef = ref(database, `system_users/${profile.id}/isOnline`);
    const lastSeenRef = ref(database, `system_users/${profile.id}/lastSeen`);
    const connectedRef = ref(database, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        onDisconnect(userStatusRef).set(false);
        onDisconnect(lastSeenRef).set(serverTimestamp());
        set(userStatusRef, true);
        set(lastSeenRef, serverTimestamp());
      }
    });

    return () => {
      unsubscribe();
      // NOTE: Do NOT manually set userStatusRef/lastSeenRef here.
      // onDisconnect() already handles offline status server-side.
      // Manually setting here causes false-offline glitches during HMR and re-renders.
    };
  }, [database, user, profile?.id]);

  React.useEffect(() => {
    if (!isUserLoading && user && !isUsersLoading && allUsers && pathname !== '/login') {
       if (!profile) {
          signOut(auth).then(() => {
             router.push('/login');
          });
       }
    }
  }, [user, allUsers, isUserLoading, isUsersLoading, profile, auth, router, pathname])

  React.useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const isClickable = 
        target.closest('button') || 
        target.closest('a') || 
        target.closest('[role="button"]') ||
        target.closest('[role="tab"]') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[role="checkbox"]') ||
        target.closest('[role="switch"]') ||
        target.closest('[role="radio"]') ||
        target.closest('label') ||
        target.closest('summary') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('.cursor-pointer');

      if (isClickable) {
        playSound('click', 0.35);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [playSound]);

  const isLoginPage = pathname === '/login'
  const isRootPage = pathname === '/'

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/': return 'Menu Utama';
      case '/dashboard': return 'Dashboard Statistik';
      case '/actor-data': return 'Data Pelaku Usaha';
      case '/finish': return 'Data Selesai';
      case '/rejected': return 'Data Ditolak';
      case '/verify-actor': return 'Verifikasi Admin';
      case '/input': return 'Input Data';
      case '/check-data': return 'Cek Data';
      case '/profile': return 'Profil Saya';
      case '/settings': return 'Pengaturan';
      case '/users': return 'Manajemen User';
      case '/lpj': return 'LPJ';
      case '/hasil-verifikasi': return 'Hasil Verifikasi';
      default: return '';
    }
  };

  const currentTitle = getPageTitle(pathname);

  return (
    <>
      <ThemePersistence />
      <SidebarProvider>
        <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-transparent">
          <GlobalAutoVerifier />
          <BackgroundMusic role={profile?.role} />
          <MessageNotification />
          <Toaster />

          {!isLoginPage && (
            <>
              <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 shrink-0 print:hidden">
                <div className="flex items-center gap-6">
                  <InfoDialog>
                    <div className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity">
                      <span className="text-3xl font-black tracking-tighter leading-none text-primary">
                        SIMPU
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sistem Manajemen UMKM</span>
                    </div>
                  </InfoDialog>

                  <div className="hidden md:flex h-8 w-px bg-slate-200 mx-2" />

                  {currentTitle && (
                    <h1 className="hidden md:block text-2xl font-black text-slate-800 tracking-tight uppercase">
                      {currentTitle}
                    </h1>
                  )}
                </div>

                {activeEvent && (
                  <div className="hidden lg:flex flex-col items-center justify-center animate-in fade-in zoom-in duration-1000">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">
                      {activeEvent.description || 'EVENT MENDATANG'}
                    </span>
                    <EventCountdown targetDate={activeEvent.endDate || activeEvent.date} startDate={activeEvent.startDate} size="sm" />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {!isRootPage && !isKoordinator && (
                    <button
                      onClick={() => router.push('/')}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 bg-primary text-white shadow-primary/20 hover:bg-primary/90"
                    >
                      <Home className="w-5 h-5" />
                      <span>Kembali ke Menu</span>
                    </button>
                  )}

                  <div className="hidden sm:flex h-8 w-px bg-slate-200 mx-2" />

                  <div className="hidden sm:flex flex-col items-end gap-1 translate-y-1">
                    <OfficeHoursTimer />
                  </div>

                  <button
                    onClick={() => setIsLogoutDialogOpen(true)}
                    className="hidden sm:flex w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 items-center justify-center hover:bg-rose-100 transition-all active:scale-90 border border-rose-100 shadow-sm group"
                    title="Logout / Keluar"
                  >
                    <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                  </button>

                  <ConfirmDialog
                    open={isLogoutDialogOpen}
                    onOpenChange={setIsLogoutDialogOpen}
                    icon={<AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />}
                    title="Keluar dari Aplikasi?"
                    description="Anda akan keluar dari sesi ini."
                    cancelText="Batal"
                    confirmText="Keluar"
                    confirmIcon={<LogOut className="w-4 h-4" />}
                    variant="destructive"
                    onConfirm={() => {
                      setIsLogoutDialogOpen(false);
                      signOut(auth).then(() => router.push('/login'));
                    }}
                  />

                  {!isKoordinator && (
                    <Link 
                      href="/profile" 
                      className="flex items-center gap-3 group"
                    >
                      <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{profile?.fullName?.split(' ')[0] || 'User'}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Profil</span>
                      </div>
                      <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-white ring-2 ring-primary/5 shadow-md transition-transform group-hover:scale-105 active:scale-95 bg-slate-100 flex items-center justify-center">
                        {profile?.photoURL ? (
                          <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-5 h-5 text-primary/30" />
                        )}
                      </div>
                    </Link>
                  )}
                </div>
              </header>
              <ProfileStatusDialog />
            </>
          )}

          <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
            {!isLoginPage && (
              <div className="absolute top-4 right-4 md:top-6 md:right-8 z-50 hidden lg:block pointer-events-none">
                <div className="pointer-events-auto flex flex-col items-end gap-3">
                  <RealtimeClock 
                    className="bg-white/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-sm hover:bg-white/80 transition-colors" 
                    timeClassName="text-lg md:text-xl text-slate-700" 
                    dateClassName="text-[8px] md:text-[10px]" 
                  />
                  <WeatherWidget className="w-72" />
                  <div className="w-72 bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg overflow-hidden flex flex-col transition-all hover:shadow-xl hover:bg-white">
                    <div className="p-4 border-b border-slate-300/50">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Aplikasi</span>
                          <span className="text-xs font-black text-blue-700 uppercase drop-shadow-sm">SIMPU</span>
                        </div>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Versi</span>
                          <span className="text-xs font-black text-slate-800 bg-slate-200/80 border border-slate-300 px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">8.2.5 PRO</span>
                        </div>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Pengguna</span>
                          <span className="text-xs font-black text-slate-900 truncate max-w-[140px] text-right uppercase drop-shadow-sm">
                            {profile?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-100/80 flex flex-col gap-3">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 drop-shadow-sm">
                        <div className="w-2 h-2 bg-blue-600 rounded-full shadow-sm"></div>
                        Kontak Admin
                      </span>
                      <a href="mailto:simputeam@gmail.com" className="flex items-center justify-between w-full group">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider group-hover:text-blue-700 transition-colors">Email</span>
                        <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">simputeam@gmail.com</span>
                      </a>
                      <a href="https://wa.me/62817319885" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full group">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">WhatsApp</span>
                        <span className="text-xs font-black text-emerald-700 group-hover:text-emerald-800 transition-colors">wa.me/62817319885</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <main className={cn(
              "flex-1 bg-transparent print:bg-white relative z-0 isolate flex flex-col",
              isRootPage ? "overflow-hidden" : "overflow-auto"
            )}>
              {!isLoginPage && <RunningText />}
              
              <div key={pathname} className={cn(
                "w-full relative z-0 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out p-4 md:p-8",
                isRootPage ? "flex-1 flex flex-col min-h-0 overflow-hidden lg:pr-[320px]" : "min-h-full lg:pr-[320px]"
              )}>
                {children}
              </div>
            </main>
          </div>

          {!isLoginPage && !isRootPage && !isKoordinator && (
            <button 
              onClick={() => router.push('/')}
              className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-primary text-white shadow-2xl flex items-center justify-center z-50 animate-in slide-in-from-bottom-10 duration-500 border-4 border-white active:scale-90"
            >
              <LayoutGrid className="w-8 h-8" />
            </button>
          )}
        </div>
      </SidebarProvider>
    </>
  );
}