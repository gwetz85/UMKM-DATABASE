'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ProfileStatusDialog } from '@/components/ProfileStatusDialog';
import { GlobalStatsAutoSync } from '@/components/GlobalStatsAutoSync';
import { useUser, useDatabase, useMemoFirebase, useObject, useAuth } from '@/firebase'
import { ref, onValue, set, update, onDisconnect, serverTimestamp } from 'firebase/database'
import { signOut } from 'firebase/auth'
import { User as UserIcon, LogOut, AlertCircle, MonitorOff, ArrowLeft, Moon, Sun, Share2, MoreHorizontal, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Toaster } from '@/components/ui/toaster';
import { ThemePersistence } from '@/components/theme-persistence';
import { useSoundEffect } from '@/hooks/use-sound-effect';
import { cn } from '@/lib/utils';
import { MessageNotification } from './MessageNotification';
import { useToast } from '@/hooks/use-toast';
import { MobileBottomNav } from './mobile-bottom-nav';
import { AppSidebar } from '@/components/app-sidebar';
import { RunningText } from '@/components/running-text';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading, userProfile: profile, isProfileLoading } = useUser();
  const auth = useAuth()
  const database = useDatabase();
  const { toast } = useToast();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = React.useState(false);
  const [isDisplaced, setIsDisplaced] = React.useState(false); // True when another device took over the session
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleToggleTheme = () => {
    playSound('click');
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    const root = document.documentElement;
    if (newDark) {
      root.classList.add('dark');
      document.body?.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body?.classList.remove('dark');
    }

    try {
      const savedTheme = localStorage.getItem('simpu-theme');
      const themeData = savedTheme ? JSON.parse(savedTheme) : {};
      themeData.mode = newDark ? 'dark' : 'light';
      localStorage.setItem('simpu-theme', JSON.stringify(themeData));
      if (profile?.role === 'admin' && database) {
        update(ref(database, 'chats/__system_settings/theme'), { mode: themeData.mode }).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isKoordinator = profile?.role === 'koordinator'
  const { playSound } = useSoundEffect();

  const isLoginPage = pathname === '/login';
  const isCekDataPage = pathname === '/cek-data' || pathname?.startsWith('/cek-data');
  const isLayarInformasiPage = pathname === '/layar-informasi' || pathname?.startsWith('/layar-informasi');
  const isPortalSurveyPage = pathname === '/portal-survey' || pathname?.startsWith('/portal-survey');
  const isPendaftaranPage = pathname === '/pendaftaran' || pathname?.startsWith('/pendaftaran') || pathname === '/daftar' || pathname?.startsWith('/daftar');
  const isPublicPage = isLoginPage || isCekDataPage || isLayarInformasiPage || isPendaftaranPage;
  const isRootPage = pathname === '/';
  const isAdmin = profile?.role === 'admin' || (user?.email?.toLowerCase() === 'agus@umkm.id');
  const isStaff = profile?.role === 'staff';

  const maintenanceRef = useMemoFirebase(() => {
    if (!database || isLoginPage) return null;
    return ref(database, 'settings/maintenance');
  }, [database, isLoginPage]);
  const { data: maintenanceData } = useObject(maintenanceRef);

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
    // Jangan pernah mengikat status online ke akun dummy 'agus'
    if (!database || !user || !profile?.id || (profile.id === 'agus' && user.email?.toLowerCase() === 'agus@umkm.id')) return;

    const userStatusRef = ref(database, `system_users/${profile.id}/isOnline`);
    const lastSeenRef = ref(database, `system_users/${profile.id}/lastSeen`);
    const connectedRef = ref(database, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        onDisconnect(userStatusRef).set(false);
        onDisconnect(lastSeenRef).set(serverTimestamp());
        set(userStatusRef, true);
        set(lastSeenRef, serverTimestamp());

        // Jika belum ada lastLogin, lengkapi dengan waktu sekarang
        if (!profile.lastLogin) {
          update(ref(database, `system_users/${profile.id}`), {
            lastLogin: new Date().toISOString()
          }).catch(console.error);
        }
      }
    });

    // Heartbeat berkala setiap 60 detik untuk memastikan lastSeen selalu segar
    const interval = setInterval(() => {
      set(lastSeenRef, serverTimestamp()).catch(() => {});
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [database, user, profile?.id, profile?.lastLogin]);

  React.useEffect(() => {
    if (!isUserLoading && user && !isProfileLoading && !isPublicPage) {
       if (!profile) {
          // Add a grace period before signing out to prevent race condition on refresh
          // where Firebase Auth restores the user but profile data hasn't loaded yet
          const timer = setTimeout(() => {
            signOut(auth).then(() => {
              if (typeof window !== 'undefined') sessionStorage.removeItem('simpu_2fa_passed');
              router.push('/login');
            });
          }, 3000);
          return () => clearTimeout(timer);
       } else if (profile.twoFactorEnabled && profile.twoFactorSecret) {
          // Cek apakah 2FA sudah diverifikasi dalam sesi browser ini
          const passed = typeof window !== 'undefined' && sessionStorage.getItem('simpu_2fa_passed') === user.uid;
          if (!passed) {
            router.replace('/login');
          }
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

  // Otomatis ubah koordinator DKUKM / DKUKM PROVINSI menjadi AGUS
  React.useEffect(() => {
    if (!database || !user || !isAdmin) return;
    const migrateDkukmCoordinators = async () => {
      try {
        const { query, orderByChild, equalTo, get, update } = await import("firebase/database");
        for (const coordName of ["DKUKM PROVINSI", "DKUKM"]) {
          const q = query(ref(database, 'businessActors'), orderByChild('coordinator'), equalTo(coordName));
          const snap = await get(q);
          if (snap.exists()) {
            const updates: Record<string, any> = {};
            snap.forEach(child => {
              updates[`businessActors/${child.key}/coordinator`] = "AGUS";
            });
            if (Object.keys(updates).length > 0) {
              await update(ref(database), updates);
              const { recalculateAndSaveSystemStats } = await import("@/lib/stats-service");
              await recalculateAndSaveSystemStats(database);
            }
          }
        }
      } catch (e) {
        console.error("Auto migration DKUKM -> AGUS error:", e);
      }
    };
    migrateDkukmCoordinators();
  }, [database, user, isAdmin]);

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


  // Toggle body background class — login, portal survey, and public cek-data/pendaftaran pages have clean background
  useEffect(() => {
    if (isLoginPage || isCekDataPage || isPortalSurveyPage || isPendaftaranPage) {
      document.body.classList.remove('app-bg');
    } else {
      document.body.classList.add('app-bg');
    }
    return () => {
      document.body.classList.remove('app-bg');
    };
  }, [isLoginPage, isCekDataPage, isPortalSurveyPage, isPendaftaranPage]);

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/': return 'Dashboard Statistik';
      case '/dashboard': return 'Dashboard Statistik';
      case '/actor-data': return 'Data Pelaku Usaha';
      case '/finish': return 'Data Selesai';
      case '/rejected': return 'Data Ditolak';
      case '/verify-actor': return 'Verifikasi Admin';
      case '/input': return 'Input Data';
      case '/pendaftaran':
      case '/daftar': return 'Pendaftaran Pelaku Usaha';
      case '/check-data': return 'Cek Data';
      case '/cek-data': return 'Cek Data Publik';
      case '/profile': return 'Profil Saya';
      case '/settings': return 'Pengaturan';
      case '/users': return 'Manajemen User';
      case '/lpj': return 'LPJ';
      case '/hasil-verifikasi': return 'Hasil Verifikasi';
      case '/messages': return 'Pesan Chat';
      case '/verifikasi-dinas-berkas': return 'Verifikasi Dinas';
      default: return path ? path.replace(/^\//, '').replace(/[-_]/g, ' ') : '';
    }
  };

  const currentTitle = getPageTitle(pathname);

  return (
    <>
      <ThemePersistence />
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-[100dvh] w-full overflow-hidden p-0 sm:p-2.5 md:p-3.5 lg:p-4.5 xl:p-5 items-center justify-center">
          <div className={cn(
            "flex w-full h-full overflow-hidden transition-all duration-300",
            isLoginPage || isLayarInformasiPage || isPortalSurveyPage
              ? "rounded-none max-w-full"
              : "max-w-[1720px] rounded-none sm:rounded-[28px] lg:rounded-[36px] shadow-2xl border border-white/50 dark:border-white/10 bg-white dark:bg-slate-900"
          )}>
            {user && !isLoginPage && !isLayarInformasiPage && !isPortalSurveyPage && (
              <AppSidebar />
            )}

            <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden bg-white dark:bg-slate-900">
              {user && !isLoginPage && <GlobalStatsAutoSync />}
              {user && !isLoginPage && <MessageNotification />}
              <Toaster />

              {!isLoginPage && !isLayarInformasiPage && !isPortalSurveyPage && (
                <>
                  <header className="flex items-center justify-between px-3 sm:px-6 h-14 sm:h-16 border-b border-slate-100 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 print:hidden gap-3">
                    {/* Breadcrumbs matching Growly LMS */}
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {user && (
                        <SidebarTrigger className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs transition-all active:scale-95 shrink-0" />
                      )}

                      <Link href={user ? "/" : "/cek-data"} className="font-extrabold text-slate-900 dark:text-white hover:text-primary transition-colors flex items-center gap-1.5">
                        <span>SIMPU</span>
                      </Link>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                      <Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors truncate">
                        Dashboard
                      </Link>
                      {currentTitle && currentTitle !== 'Dashboard Statistik' && (
                        <>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          <span className="text-slate-900 dark:text-white font-extrabold truncate max-w-[200px] sm:max-w-[320px]">
                            {currentTitle}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Action Pills matching Growly LMS: Share, Theme, Options/Logout */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
                      {user ? (
                        <>
                          <button
                            onClick={() => {
                              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                navigator.clipboard.writeText(window.location.href);
                                playSound('click');
                                toast({ title: "Tautan Disalin", description: "URL halaman berhasil disalin ke clipboard." });
                              }
                            }}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs active:scale-95"
                            title="Salin tautan halaman"
                          >
                            <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            <span>Share</span>
                          </button>

                          <button
                            onClick={handleToggleTheme}
                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-amber-400 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-90 shadow-2xs"
                            title={isDarkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
                            aria-label="Toggle Dark Mode"
                          >
                            {isDarkMode ? (
                              <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
                            ) : (
                              <Moon className="w-4 h-4 text-slate-700 transition-transform hover:-rotate-12" />
                            )}
                          </button>

                          <button
                            onClick={() => setIsLogoutDialogOpen(true)}
                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-all active:scale-90 shadow-2xs"
                            title="Logout"
                            aria-label="Logout"
                          >
                            <MoreHorizontal className="w-4 h-4" />
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
                              if (profile?.id && database) {
                                update(ref(database, `system_users/${profile.id}`), {
                                  isOnline: false,
                                  lastSeen: Date.now()
                                }).catch(() => {});
                              }
                              if (typeof window !== 'undefined') {
                                sessionStorage.removeItem('simpu_2fa_passed');
                              }
                              signOut(auth).then(() => router.push('/login'));
                            }}
                          />
                        </>
                      ) : (
                        <Link
                          href="/login"
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-xs bg-primary text-white hover:bg-primary/90 shadow-sm transition-all active:scale-95"
                        >
                          <UserIcon className="w-3.5 h-3.5" />
                          <span>Login</span>
                        </Link>
                      )}
                    </div>
                  </header>
                  {user && <ProfileStatusDialog />}
                </>
              )}

              <main className={cn(
                "flex-1 bg-white dark:bg-slate-900 print:bg-white relative z-0 isolate flex flex-col custom-scrollbar",
                isLoginPage ? "overflow-hidden" : isPortalSurveyPage ? "overflow-y-auto overflow-x-hidden" : isLayarInformasiPage ? "overflow-y-auto lg:overflow-hidden" : "overflow-y-auto"
              )}>
                <div key={pathname} className={cn(
                  "w-full relative z-0 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out",
                  isLoginPage ? "flex-1 flex flex-col min-h-0 p-0 overflow-hidden" : 
                  isPortalSurveyPage ? "p-0 min-h-full flex-1 flex flex-col" :
                  isLayarInformasiPage ? "p-0 min-h-full lg:h-full lg:max-h-full flex-1 flex flex-col overflow-y-auto lg:overflow-hidden" :
                  isCekDataPage ? "p-3 sm:p-6 md:p-8 min-h-full pb-32 sm:pb-28 md:pb-20 max-w-7xl mx-auto" :
                  isPendaftaranPage ? "p-3 sm:p-6 md:p-8 min-h-full pb-32 sm:pb-28 md:pb-20 max-w-5xl mx-auto" :
                  "p-3 sm:p-5 lg:p-6 min-h-full"
                )}>
                  {!isRootPage && pathname !== '/dashboard' && !isKoordinator && !isLoginPage && !isPortalSurveyPage && !isLayarInformasiPage && (
                    <div className="mb-3.5 flex items-center justify-between gap-3 print:hidden">
                      <button
                        onClick={() => router.push('/')}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all active:scale-95 text-xs font-bold"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-primary" />
                        <span>Kembali ke Dashboard</span>
                      </button>
                    </div>
                  )}
                  {children}

                  {/* Safe Area Spacer for Mobile Bottom Navigation */}
                  {!isLoginPage && !isLayarInformasiPage && (
                    <div className="h-16 md:hidden shrink-0 pointer-events-none" aria-hidden="true" />
                  )}
                </div>
              </main>

              {/* Running Text at Bottom of Page */}
              {!isLoginPage && !isLayarInformasiPage && (
                <RunningText />
              )}
            </div>
          </div>
          <MobileBottomNav />
        </div>
      </SidebarProvider>

      {/* Single-device displaced overlay — shown when another device took over this session */}
      {isDisplaced && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 max-w-sm w-full mx-4 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center mx-auto border-2 border-rose-200 dark:border-rose-900">
              <MonitorOff className="w-10 h-10 text-rose-500" />
            </div>
            <div className="space-y-3">
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                User Sudah Digunakan<br />di Perangkat Lain
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Akun ini sedang digunakan di perangkat lain. Silakan klik tombol di bawah untuk kembali ke halaman login.
              </p>
            </div>
            <button
              onClick={() => {
                if (profile?.id && database) {
                  update(ref(database, `system_users/${profile.id}`), {
                    isOnline: false,
                    lastSeen: Date.now()
                  }).catch(() => {});
                }
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('simpu_2fa_passed');
                }
                signOut(auth).then(() => router.push('/login'))
              }}
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