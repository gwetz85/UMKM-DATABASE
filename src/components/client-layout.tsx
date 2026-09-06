'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { InfoDialog } from '@/components/info-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ProfileStatusDialog } from '@/components/ProfileStatusDialog';
import { OfficeHoursTimer } from '@/components/OfficeHoursTimer'
import { GlobalAutoVerifier } from '@/components/GlobalAutoVerifier';
import { GlobalStatsAutoSync } from '@/components/GlobalStatsAutoSync';
import { useUser, useDatabase, useList, useMemoFirebase, useObject, useAuth } from '@/firebase'
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database'
import { signOut } from 'firebase/auth'
import { User as UserIcon, LayoutGrid, Home, LogOut, Check, X as XIcon, AlertCircle, MonitorOff, Loader2 } from 'lucide-react'
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
import { KelurahanWidget } from './kelurahan-widget';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading, userProfile: profile, isProfileLoading } = useUser();
  const auth = useAuth()
  const database = useDatabase();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = React.useState(false);
  const [isDisplaced, setIsDisplaced] = React.useState(false); // True when another device took over the session

  const isKoordinator = profile?.role === 'koordinator'
  const { playSound } = useSoundEffect();

  const isLoginPage = pathname === '/login';
  const isCekDataPage = pathname === '/cek-data' || pathname?.startsWith('/cek-data');
  const isLayarInformasiPage = pathname === '/layar-informasi' || pathname?.startsWith('/layar-informasi');
  const isPublicPage = isLoginPage || isCekDataPage || isLayarInformasiPage;
  const isRootPage = pathname === '/';
  const isAdmin = profile?.role === 'admin' || (user?.email?.toLowerCase() === 'agus@umkm.id');
  const isStaff = profile?.role === 'staff';

  const eventSettingsRef = useMemoFirebase(() => {
    if (!database || isLoginPage) return null
    return ref(database, 'settings/event_info')
  }, [database, isLoginPage])
  const { data: eventInfo } = useObject(eventSettingsRef)
  const activeEvent = useActiveEvent(eventInfo)

  const maintenanceRef = useMemoFirebase(() => {
    if (!database || isLoginPage) return null;
    return ref(database, 'settings/maintenance');
  }, [database, isLoginPage]);
  const { data: maintenanceData } = useObject(maintenanceRef);

  const systemConfigRef = useMemoFirebase(() => {
    if (!database || isLoginPage) return null;
    return ref(database, 'settings/system_config');
  }, [database, isLoginPage]);
  const { data: systemConfig } = useObject(systemConfigRef);

  React.useEffect(() => {
    if (maintenanceData && typeof maintenanceData === 'object' && user && profile) {
      const isMaintenanceMode = maintenanceData.enabled === true;
      if (isMaintenanceMode && !isAdmin && !isStaff && pathname !== '/maintenance' && !isPublicPage) {
        router.replace('/maintenance');
      } else if (!isMaintenanceMode && pathname === '/maintenance') {
        router.replace('/');
      }
    }
  }, [maintenanceData, isAdmin, isStaff, pathname, router, user, profile, isPublicPage]);

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
    };
  }, [database, user, profile?.id]);

  React.useEffect(() => {
    if (!isUserLoading && user && !isProfileLoading && !isPublicPage) {
       if (!profile) {
          // Add a grace period before signing out to prevent race condition on refresh
          // where Firebase Auth restores the user but profile data hasn't loaded yet
          const timer = setTimeout(() => {
            signOut(auth).then(() => {
              router.push('/login');
            });
          }, 3000);
          return () => clearTimeout(timer);
       }
    }
  }, [user, isUserLoading, isProfileLoading, profile, auth, router, isPublicPage])

  // Single-device login enforcement: listen to activeSessionId in realtime.
  // If another device logs in and changes the sessionId, force this session out.
  React.useEffect(() => {
    if (!database || !profile?.id || isLoginPage || isDisplaced) return;
    // Admin users are exempt from single-device restriction
    if (profile?.role === 'admin' || user?.email?.toLowerCase() === 'agus@umkm.id') return;

    const mySessionId = localStorage.getItem('simpu_session_id');
    if (!mySessionId) return;

    const sessionRef = ref(database, `system_users/${profile.id}/activeSessionId`);
    const unsubscribe = onValue(sessionRef, (snap) => {
      const remoteSessionId = snap.val();
      // If a new sessionId was written by another device, show the displaced overlay
      if (remoteSessionId && remoteSessionId !== mySessionId) {
        setIsDisplaced(true);
        // Clean up localStorage only — no automatic sign-out or redirect
        localStorage.removeItem('simpu_session_id');
      }
    });

    return () => unsubscribe();
  }, [database, profile?.id, profile?.role, isLoginPage, isDisplaced, user?.email, auth, router])

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


  // Toggle body background class — login and public cek-data pages have clean background
  useEffect(() => {
    if (isLoginPage || isCekDataPage) {
      document.body.classList.remove('app-bg');
    } else {
      document.body.classList.add('app-bg');
    }
    return () => {
      document.body.classList.remove('app-bg');
    };
  }, [isLoginPage, isCekDataPage]);

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
      case '/cek-data': return 'Cek Data Publik';
      case '/profile': return 'Profil Saya';
      case '/settings': return 'Pengaturan';
      case '/users': return 'Manajemen User';
      case '/lpj': return 'LPJ';
      case '/hasil-verifikasi': return 'Hasil Verifikasi';
      case '/messages': return 'Pesan Chat';
      case '/verifikasi-dinas-berkas': return 'Verifikasi Dinas';
      default: return '';
    }
  };

  const currentTitle = getPageTitle(pathname);

  return (
    <>
      <ThemePersistence />
      <SidebarProvider>
        <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-transparent">
          {user && !isLoginPage && <GlobalStatsAutoSync />}
          {user && !isLoginPage && <MessageNotification />}
          <Toaster />

          {!isLoginPage && !isLayarInformasiPage && (
            <>
              <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 lg:px-8 h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shrink-0 print:hidden shadow-sm gap-3 md:gap-4">
                <div className="flex items-center gap-3 md:gap-5 shrink-0">
                  <Link href={user ? "/" : "/cek-data"} className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity">
                    <span className="text-2xl md:text-3xl font-black tracking-tighter leading-none text-primary">
                      SIMPU
                    </span>
                    <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {isCekDataPage && !user ? "Portal Cek Data Publik" : "Sistem Manajemen UMKM"}
                    </span>
                  </Link>

                  <div className="hidden md:flex h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                  {currentTitle && (
                    <h1 className="hidden 2xl:block text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase max-w-[200px] truncate">
                      {currentTitle}
                    </h1>
                  )}
                </div>

                {activeEvent && !isCekDataPage && (
                  <div className="hidden 2xl:flex items-center justify-center flex-1 min-w-0 px-2 py-1 animate-in fade-in zoom-in duration-1000">
                    <EventCountdown 
                      targetDate={activeEvent.endDate || activeEvent.date} 
                      startDate={activeEvent.startDate} 
                      title={activeEvent.description}
                      size="sm" 
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-auto">
                  {user ? (
                    <>
                      {!isRootPage && !isKoordinator && (
                        <button
                          onClick={() => router.push('/')}
                          className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 bg-primary text-white shadow-primary/20 hover:bg-primary/90 shrink-0"
                        >
                          <Home className="w-4 h-4 md:w-5 md:h-5" />
                          <span className="hidden sm:inline">Kembali ke Menu</span>
                        </button>
                      )}

                      <div className="hidden sm:flex h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                      <div className="hidden sm:flex items-center gap-2">
                        <RealtimeClock 
                          className="bg-white/95 dark:bg-slate-800/90 backdrop-blur-md px-3 py-1.5 md:px-3.5 md:py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md" 
                          timeClassName="text-xs md:text-sm font-mono font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none" 
                          dateClassName="text-[8px] md:text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5" 
                        />
                        <OfficeHoursTimer />
                      </div>

                      <button
                        onClick={() => setIsLogoutDialogOpen(true)}
                        className="hidden sm:flex w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all active:scale-90 border border-rose-100 dark:border-rose-900/40 shadow-sm group"
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
                          <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-700 ring-2 ring-primary/5 shadow-md transition-transform group-hover:scale-105 active:scale-95 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            {profile?.photoURL ? (
                              <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-5 h-5 text-primary/30" />
                            )}
                          </div>
                        </Link>
                      )}
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className="flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 bg-primary text-white hover:bg-primary/90 shadow-primary/20 shrink-0"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>Login Petugas</span>
                    </Link>
                  )}
                </div>
              </header>
              {user && <ProfileStatusDialog />}
            </>
          )}

          <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
            {!isLoginPage && !isLayarInformasiPage && (!isCekDataPage || (user && !isCekDataPage)) && (
              <div className="absolute top-4 right-4 md:top-6 md:right-8 z-50 pointer-events-none">
                <div className="pointer-events-auto flex flex-col items-end gap-3 max-h-[calc(100dvh-5.5rem)] overflow-y-auto no-scrollbar pb-6 pr-1">
                  <div className="hidden lg:flex flex-col gap-3">
                    <WeatherWidget className="w-72" />
                  </div>
                  <div className="hidden lg:flex flex-col gap-3">
                    <div className="w-72 bg-white/80 dark:bg-slate-900/85 backdrop-blur-md rounded-2xl border border-white/60 dark:border-slate-800/80 shadow-lg overflow-hidden flex flex-col transition-all hover:shadow-xl hover:bg-white dark:hover:bg-slate-900">
                      <div className="p-4 border-b border-slate-300/50 dark:border-slate-800/50">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Aplikasi</span>
                            <span className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase drop-shadow-sm">{systemConfig?.appName || 'SIMPU'}</span>
                          </div>
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Versi</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">{systemConfig?.version || '8.2.5 PRO'}</span>
                          </div>
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Pengguna</span>
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate max-w-[140px] text-right uppercase drop-shadow-sm">
                              {profile?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between w-full pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Data Pembanding</span>
                            <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase drop-shadow-sm">
                              {systemConfig?.totalPembanding || '0 Data'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-100/80 dark:bg-slate-800/80 flex flex-col gap-3">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2 drop-shadow-sm">
                          <div className="w-2 h-2 bg-blue-600 rounded-full shadow-sm"></div>
                          Kontak Admin
                        </span>
                        <a href={`mailto:${systemConfig?.adminEmail || 'simputeam@gmail.com'}`} className="flex items-center justify-between w-full group">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">Email</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{systemConfig?.adminEmail || 'simputeam@gmail.com'}</span>
                        </a>
                        <a 
                          href={systemConfig?.adminWhatsapp ? (systemConfig.adminWhatsapp.startsWith('http') ? systemConfig.adminWhatsapp : `https://${systemConfig.adminWhatsapp}`) : 'https://wa.me/62817319885'} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center justify-between w-full group"
                        >
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">WhatsApp</span>
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-800 transition-colors">{systemConfig?.adminWhatsapp || 'wa.me/62817319885'}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="hidden lg:flex flex-col gap-3">
                    <KelurahanWidget className="w-72" />
                  </div>
                </div>
              </div>
            )}

            <main className={cn(
              "flex-1 bg-transparent print:bg-white relative z-0 isolate flex flex-col",
              isLoginPage ? "overflow-hidden" : isLayarInformasiPage ? "overflow-y-auto lg:overflow-hidden" : "overflow-y-auto"
            )}>
              <div key={pathname} className={cn(
                "w-full relative z-0 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out",
                isLoginPage ? "flex-1 flex flex-col min-h-0 p-0 overflow-hidden" : 
                isLayarInformasiPage ? "p-0 min-h-full lg:h-full lg:max-h-full flex-1 flex flex-col overflow-y-auto lg:overflow-hidden" :
                isCekDataPage ? "p-3 sm:p-6 md:p-8 min-h-full pb-20 max-w-7xl mx-auto" :
                isRootPage ? "p-4 md:p-8 flex-1 flex flex-col min-h-0 pb-20 lg:pr-[360px]" : 
                "p-4 md:p-8 min-h-full pb-20 lg:pr-[360px]"
              )}>
                {children}
              </div>
            </main>
          </div>

          {!isLoginPage && !isLayarInformasiPage && <RunningText />}

          {!isLoginPage && !isLayarInformasiPage && !isRootPage && !isKoordinator && (
            <button 
              onClick={() => router.push('/')}
              className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-primary text-white shadow-2xl flex items-center justify-center z-50 animate-in slide-in-from-bottom-10 duration-500 border-4 border-white active:scale-90"
            >
              <LayoutGrid className="w-8 h-8" />
            </button>
          )}
        </div>
      </SidebarProvider>

      {/* Single-device displaced overlay — shown when another device took over this session */}
      {isDisplaced && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center animate-in fade-in duration-500">
          <div className="bg-white rounded-3xl p-10 max-w-sm w-full mx-4 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto border-2 border-rose-200">
              <MonitorOff className="w-10 h-10 text-rose-500" />
            </div>
            <div className="space-y-3">
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight leading-tight">
                User Sudah Digunakan<br />di Perangkat Lain
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Akun ini sedang digunakan di perangkat lain. Silakan klik tombol di bawah untuk kembali ke halaman login.
              </p>
            </div>
            <button
              onClick={() => signOut(auth).then(() => router.push('/login'))}
              className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Kembali ke Login
            </button>
          </div>
        </div>
      )}
    </>
  );
}