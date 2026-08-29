'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDatabase, useObject, useList, useMemoFirebase } from '@/firebase';
import { ref, query, orderByChild, equalTo, limitToLast } from 'firebase/database';
import { BusinessActor } from '../lib/types';
import { cn } from '@/lib/utils';
import { 
  UserCheck, 
  UserX, 
  ClipboardCheck, 
  FileText, 
  ListChecks, 
  CreditCard, 
  Maximize2, 
  Minimize2, 
  Clock, 
  Radio, 
  Loader2,
  XCircle
} from 'lucide-react';

// SIMPU Icon SVG Logo
const SimpuLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

// Helper to format date & time into two clean centered lines
const formatDateTimeSplit = (isoString?: string | null) => {
  if (!isoString) return { date: '-', time: '-' };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: '-', time: '-' };
    const date = d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const time = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(/\./g, ':') + ' WIB';
    return { date, time };
  } catch {
    return { date: '-', time: '-' };
  }
};

// Helper to format date only
const formatDateOnly = (isoString?: string | null) => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
};

export default function LayarInformasiPage() {
  const database = useDatabase();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'verifikasi' | 'hasil' | 'cancel'>('verifikasi');

  // 1. Fetch real-time system stats
  const statsRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'system_stats');
  }, [database]);
  const { data: systemStats, isLoading: isStatsLoading } = useObject(statsRef);

  // 2. Fetch verified_dinas actors (fast limitToLast 50)
  const verifiedDinasQuery = useMemoFirebase(() => {
    if (!database) return null;
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('verified_dinas'), limitToLast(50));
  }, [database]);
  const { data: verifiedDinasData, isLoading: isTableLoading } = useList<BusinessActor>(verifiedDinasQuery);

  // 3. Fetch system_users for looking up staff names from NIPPPK / usernames
  const systemUsersRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'system_users');
  }, [database]);
  const { data: systemUsers } = useList(systemUsersRef);

  const userLookup = useMemo(() => {
    const map: Record<string, string> = {};
    if (!systemUsers) return map;
    systemUsers.forEach((u: any) => {
      if (!u) return;
      const name = u.fullName || u.name;
      if (!name) return;
      if (u.id) map[String(u.id).toLowerCase().trim()] = name;
      if (u.username) map[String(u.username).toLowerCase().trim()] = name;
      if (u.uid) map[String(u.uid).toLowerCase().trim()] = name;
      if (u.email) map[String(u.email).toLowerCase().trim()] = name;
      if (u.nipppk) {
        const cleanNip = String(u.nipppk).replace(/\D/g, '');
        if (cleanNip) map[cleanNip] = name;
        map[String(u.nipppk).toLowerCase().trim()] = name;
      }
      if (u.nip) {
        const cleanNip = String(u.nip).replace(/\D/g, '');
        if (cleanNip) map[cleanNip] = name;
        map[String(u.nip).toLowerCase().trim()] = name;
      }
    });
    return map;
  }, [systemUsers]);

  // 4. Running Text from Firebase
  const runningTextRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/running_text');
  }, [database]);
  const { data: runningTextConfig } = useObject(runningTextRef);
  const defaultRunningText = "SELAMAT DATANG DI APLIKASI SISTEM INFORMASI MANAJEMEN PELAKU USAHA (SIMPU) TAHUN 2026 • STATUS VERIFIKASI DATA DAN SURVEY DINAS DIPERBARUI SECARA REALTIME";
  const runningText = (typeof runningTextConfig === 'string' ? runningTextConfig : runningTextConfig?.text) || defaultRunningText;

  // Last Sync Time from system_stats
  const lastSyncTime = useMemo(() => {
    if (!systemStats?.lastUpdated) return null;
    const d = new Date(systemStats.lastUpdated);
    return isNaN(d.getTime()) ? null : d;
  }, [systemStats?.lastUpdated]);

  const [nextSyncIn, setNextSyncIn] = useState<number>(300);

  // Auto-sync countdown synchronized with systemStats.lastUpdated
  useEffect(() => {
    const SYNC_INTERVAL = 300; // 5 menit

    const updateTimer = () => {
      const lastTimeMs = systemStats?.lastUpdated ? new Date(systemStats.lastUpdated).getTime() : 0;
      if (!lastTimeMs) {
        setNextSyncIn(SYNC_INTERVAL);
        return;
      }
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastTimeMs) / 1000);
      const remainingSeconds = Math.max(0, SYNC_INTERVAL - (elapsedSeconds % SYNC_INTERVAL));
      setNextSyncIn(remainingSeconds);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [systemStats?.lastUpdated]);

  // Realtime Clock Tick
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper isCancelDinas
  const isCancelDinas = (d: any) => {
    const s = (d?.status || '').toLowerCase();
    return (s === 'verified_dinas' && d.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(d.alasanCancelDinas);
  };

  // Helper surveyor name
  const getSurveyorName = (d: BusinessActor) => {
    const pejabatNama = d.surveyData?.pejabatData?.petugas?.nama || d.pejabatData?.petugas?.nama;
    if (pejabatNama && !/^\d+$/.test(pejabatNama.trim())) {
      return pejabatNama;
    }
    if (d.petugasSurvey && !/^\d+$/.test(d.petugasSurvey.trim())) {
      return d.petugasSurvey;
    }
    const raw = d.petugasSurvey || (d.surveyData as any)?.petugasSurvey || pejabatNama || d.verifiedDinasBy;
    if (raw) {
      const cleanStr = String(raw).trim();
      const cleanDigits = cleanStr.replace(/\D/g, '');
      if (cleanDigits && userLookup[cleanDigits]) return userLookup[cleanDigits];
      if (userLookup[cleanStr.toLowerCase()]) return userLookup[cleanStr.toLowerCase()];
      return raw;
    }
    return '-';
  };

  // Helper verifikator name (Always prioritize human name over NIP/UID/email)
  const getVerifikatorName = (d: BusinessActor) => {
    // 1. Check explicit name in pejabatData / surveyData if not purely digits
    const pejabatNama = d.pejabatData?.verifikator?.nama || d.surveyData?.pejabatData?.verifikator?.nama;
    if (pejabatNama && !/^\d+$/.test(pejabatNama.trim())) {
      return pejabatNama;
    }

    // 2. Check verifikatorDinas if not purely digits
    if (d.verifikatorDinas && !/^\d+$/.test(d.verifikatorDinas.trim())) {
      return d.verifikatorDinas;
    }

    // 3. Check berkasDinasVerifiedBy if not purely digits and not email
    if (d.berkasDinasVerifiedBy && !/^\d+$/.test(d.berkasDinasVerifiedBy.trim()) && !d.berkasDinasVerifiedBy.includes('@')) {
      return d.berkasDinasVerifiedBy;
    }

    // 4. Try looking up in system_users lookup map for any NIP / UID / username
    const candidates = [
      d.verifikatorDinas,
      d.berkasDinasVerifiedBy,
      pejabatNama,
      (d as any).verifiedDinasBy
    ].filter(Boolean);

    for (const c of candidates) {
      const cleanStr = String(c).trim();
      const cleanDigits = cleanStr.replace(/\D/g, '');
      if (cleanDigits && userLookup[cleanDigits]) {
        return userLookup[cleanDigits];
      }
      if (userLookup[cleanStr.toLowerCase()]) {
        return userLookup[cleanStr.toLowerCase()];
      }
    }

    // 5. Fallback to candidate string if available
    return d.verifikatorDinas || d.berkasDinasVerifiedBy || pejabatNama || '-';
  };

  // 10 Pelaku Usaha Terakhir Masuk Verifikasi Dinas (Tahap 2: Menunggu Cek Berkas)
  const latestVerifikasiDinas = useMemo(() => {
    if (!verifiedDinasData) return [];
    return verifiedDinasData
      .filter(d => d.status === 'verified_dinas' && d.hasilVerifikasiDinas === 'Lolos' && !d.berkasDinasVerified && !isCancelDinas(d))
      .sort((a, b) => {
        const timeA = new Date(a.verifiedDinasAt || (a.surveyData as any)?.tanggalSurvey || a.createdAt || 0).getTime();
        const timeB = new Date(b.verifiedDinasAt || (b.surveyData as any)?.tanggalSurvey || b.createdAt || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 10);
  }, [verifiedDinasData]);

  // 10 Pelaku Usaha Terakhir Masuk Hasil Dinas (Tahap 3: Lolos Cek Berkas)
  const latestHasilVerifikasi = useMemo(() => {
    if (!verifiedDinasData) return [];
    return verifiedDinasData
      .filter(d => d.status === 'verified_dinas' && d.hasilVerifikasiDinas === 'Lolos' && Boolean(d.berkasDinasVerified) && !isCancelDinas(d))
      .sort((a, b) => {
        const timeA = new Date(a.berkasDinasVerifiedAt || a.verifiedDinasAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.berkasDinasVerifiedAt || b.verifiedDinasAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 10);
  }, [verifiedDinasData]);

  // Total Cancel Dinas
  const cancelDinasCount = useMemo(() => {
    if (!verifiedDinasData) return 0;
    return verifiedDinasData.filter(d => isCancelDinas(d)).length;
  }, [verifiedDinasData]);

  // 10 Data Cancel Dinas Terbaru
  const latestCancelDinas = useMemo(() => {
    if (!verifiedDinasData) return [];
    return verifiedDinasData
      .filter(d => isCancelDinas(d))
      .sort((a, b) => {
        const timeA = new Date((a as any).cancelDinasAt || a.verifiedDinasAt || a.createdAt || 0).getTime();
        const timeB = new Date((b as any).cancelDinasAt || b.verifiedDinasAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 10);
  }, [verifiedDinasData]);

  // 6 Stats Cards with border gradients
  const cardStats = [
    {
      title: "Total Data Terverifikasi",
      count: systemStats?.status?.verified ?? 0,
      icon: UserCheck,
      borderGradient: "from-emerald-400 via-teal-400 to-green-600 shadow-emerald-500/20",
      cardBg: "from-emerald-700 to-emerald-950",
      iconBg: "bg-emerald-400/25 text-emerald-200"
    },
    {
      title: "Cancell Dinas",
      count: cancelDinasCount,
      icon: UserX,
      borderGradient: "from-rose-500 via-red-500 to-amber-500 shadow-rose-500/20",
      cardBg: "from-rose-700 to-red-950",
      iconBg: "bg-rose-400/25 text-rose-200"
    },
    {
      title: "Survey Dinas",
      subtitle: "Tahap 1",
      count: systemStats?.detailedStatus?.survey ?? 0,
      icon: ClipboardCheck,
      borderGradient: "from-fuchsia-400 via-purple-500 to-pink-600 shadow-purple-500/20",
      cardBg: "from-fuchsia-700 to-purple-950",
      iconBg: "bg-fuchsia-400/25 text-fuchsia-200"
    },
    {
      title: "Verifikasi Dinas",
      subtitle: "Tahap 2",
      count: systemStats?.detailedStatus?.verifikasi ?? 0,
      icon: FileText,
      borderGradient: "from-indigo-400 via-blue-500 to-sky-600 shadow-indigo-500/20",
      cardBg: "from-indigo-700 to-blue-950",
      iconBg: "bg-indigo-400/25 text-indigo-200"
    },
    {
      title: "Hasil Dinas",
      subtitle: "Tahap 3",
      count: systemStats?.detailedStatus?.hasilVerifikasi ?? 0,
      icon: ListChecks,
      borderGradient: "from-teal-400 via-emerald-500 to-cyan-500 shadow-teal-500/20",
      cardBg: "from-teal-700 to-cyan-950",
      iconBg: "bg-teal-400/25 text-teal-200"
    },
    {
      title: "Rekening Terinput",
      subtitle: "Tahap 4 Final",
      count: systemStats?.detailedStatus?.selesai ?? systemStats?.status?.finish ?? 0,
      icon: CreditCard,
      borderGradient: "from-sky-400 via-blue-500 to-indigo-600 shadow-blue-500/20",
      cardBg: "from-sky-700 to-blue-950",
      iconBg: "bg-sky-400/25 text-sky-200"
    }
  ];

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Error fullscreen:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div className="min-h-screen lg:h-[100dvh] lg:max-h-[100dvh] w-full bg-[#060a12] text-white flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-white overflow-y-auto lg:overflow-hidden select-none p-2 sm:p-3 md:p-3.5 gap-2.5">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER (DENGAN GRADASI BATAS LUAR)
      ────────────────────────────────────────────────────────────── */}
      <div className="p-[2px] rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 shadow-[0_0_20px_rgba(6,182,212,0.25)] shrink-0">
        <header className="flex items-center justify-between px-3.5 py-2 md:px-5 md:py-2.5 rounded-[14px] bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg ring-2 ring-white/20 shrink-0">
              <SimpuLogo className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse leading-none">
                  LIVE DISPLAY MONITORING
                </span>
              </div>
              <h1 className="text-sm sm:text-base md:text-xl lg:text-2xl font-black text-white uppercase tracking-tight font-headline leading-tight mt-0.5 drop-shadow">
                SISTEM INFORMASI MANAGEMEN PELAKU USAHA 2026
              </h1>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Last Sync & Auto Sync Status */}
            <div className="flex items-center gap-2 bg-blue-950/80 border border-blue-500/40 px-2.5 py-1 md:px-3 md:py-1.5 rounded-xl shadow-inner shrink-0">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <div className="flex items-center gap-2 leading-tight">
                <div className="flex flex-col">
                  <span className="text-[8px] md:text-[9px] font-black uppercase tracking-wider text-cyan-300">
                    LAST SYNC
                  </span>
                  <span className="text-[10px] md:text-xs font-black text-white font-mono whitespace-nowrap">
                    {lastSyncTime 
                      ? `${lastSyncTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })} WIB`
                      : '-'}
                  </span>
                </div>
                <div className="h-4 w-[1px] bg-blue-500/40 hidden sm:block" />
                <div className="flex flex-col hidden sm:flex">
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-blue-300">
                    AUTO SYNC
                  </span>
                  <span className="text-[10px] md:text-xs font-bold text-cyan-200 font-mono whitespace-nowrap">
                    {`${Math.floor(nextSyncIn / 60)}:${String(nextSyncIn % 60).padStart(2, '0')}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Online Status */}
            <div className="flex items-center gap-1.5 md:gap-2 bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-1 md:px-3 md:py-1.5 rounded-xl shadow-inner shrink-0">
              <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 md:h-2.5 md:w-2.5 bg-emerald-400"></span>
              </span>
              <span className="text-[11px] md:text-xs font-black uppercase tracking-wider text-emerald-300">
                Online
              </span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-white border border-slate-600 p-2 sm:px-3 sm:py-1.5 rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-md shrink-0"
              title="Layar Penuh"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4 text-cyan-400" />}
              <span className="hidden sm:inline">{isFullscreen ? "Normal" : "Layar Penuh"}</span>
            </button>
          </div>
        </header>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. BAGIAN ATAS: 6 CARD WIDGET (DENGAN GRADASI BATAS LUAR)
      ────────────────────────────────────────────────────────────── */}
      <section className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {cardStats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={cn(
                "relative p-[2px] rounded-2xl bg-gradient-to-br shadow-lg transition-transform duration-200 hover:scale-[1.02]",
                item.borderGradient
              )}
            >
              <div className={cn("rounded-[14px] p-2.5 md:p-3 flex flex-col justify-between h-full bg-gradient-to-br", item.cardBg)}>
                <div className="flex items-center justify-between gap-1 relative z-10">
                  <span className="text-[10px] sm:text-[11px] md:text-xs font-black uppercase tracking-wide text-white drop-shadow truncate">
                    {item.title}
                  </span>
                  <div className={cn("p-1 sm:p-1.5 rounded-lg shrink-0", item.iconBg)}>
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                </div>

                <div className="mt-1 relative z-10 flex items-baseline justify-between">
                  <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                    {isStatsLoading ? (
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                    ) : (
                      (item.count || 0).toLocaleString('id-ID')
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-extrabold text-white/90 uppercase tracking-wider">
                    {item.subtitle || "Realtime"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE TAB SWITCHER (HANYA MUNCUL DI SMARTPHONE / < LG)
      ────────────────────────────────────────────────────────────── */}
      <div className="flex lg:hidden items-center p-1 rounded-xl bg-slate-900 border border-slate-700 shadow-md shrink-0 gap-1">
        <button
          type="button"
          onClick={() => setActiveMobileTab('verifikasi')}
          className={cn(
            "flex-1 py-2 px-2 rounded-lg text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1 transition-all",
            activeMobileTab === 'verifikasi'
              ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md ring-1 ring-white/20"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          <FileText className="w-3 h-3" />
          <span>Verifikasi ({latestVerifikasiDinas.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('hasil')}
          className={cn(
            "flex-1 py-2 px-2 rounded-lg text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1 transition-all",
            activeMobileTab === 'hasil'
              ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md ring-1 ring-white/20"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          <ListChecks className="w-3 h-3" />
          <span>Hasil ({latestHasilVerifikasi.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('cancel')}
          className={cn(
            "flex-1 py-2 px-2 rounded-lg text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-1 transition-all",
            activeMobileTab === 'cancel'
              ? "bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-md ring-1 ring-white/20"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          <XCircle className="w-3 h-3" />
          <span>Cancel ({latestCancelDinas.length})</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. BAGIAN TENGAH: 3 TABEL DIBAGI RATA
      ────────────────────────────────────────────────────────────── */}
      <section className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-2.5">
        
        {/* TABEL 1: VERIFIKASI DINAS (TAHAP 2) */}
        <div className={cn(
          "relative p-[2.5px] rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 shadow-[0_0_25px_rgba(99,102,241,0.35)] flex flex-col min-h-0 overflow-hidden",
          activeMobileTab === 'verifikasi' ? "flex" : "hidden lg:flex"
        )}>
          <div className="bg-[#0b1329] rounded-[13.5px] p-2.5 md:p-3 shadow-2xl flex flex-col justify-between min-h-0 h-full overflow-hidden">
            
            {/* Table Header Top Bar */}
            <div className="shrink-0 flex items-center justify-between pb-1.5 mb-1.5 border-b border-indigo-500/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/30 border border-indigo-400/50 flex items-center justify-center text-indigo-200 shrink-0 shadow">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm md:text-base font-black text-white uppercase tracking-tight drop-shadow">
                      Verifikasi Dinas
                    </h2>
                    <span className="bg-indigo-500/40 text-indigo-100 border border-indigo-300/50 text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm">
                      Tahap 2
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-semibold leading-none mt-0.5">
                    10 Pelaku Usaha Terakhir Masuk Verifikasi Dinas (Menunggu Cek Berkas)
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-indigo-200 bg-indigo-950 border border-indigo-600/60 px-2.5 py-1 rounded-xl shadow-sm">
                10 Terkini
              </span>
            </div>

            {/* Table Container with Horizontal Scroll Support on Mobile */}
            <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-700 bg-[#050a14] overflow-x-auto overflow-y-hidden shadow-inner">
              <div className="min-w-[540px] lg:min-w-0 flex-1 flex flex-col justify-between">
                
                {/* Column Headers */}
                <div className="shrink-0 grid grid-cols-[40px_1fr_135px_130px_95px] md:grid-cols-[46px_1fr_155px_145px_105px] items-center bg-[#18243e] border-b-2 border-indigo-500/40 px-2 py-2 text-xs font-black uppercase text-indigo-200 tracking-wider">
                  <div className="text-center">No</div>
                  <div className="text-left pl-2">Pelaku Usaha</div>
                  <div className="text-center">Waktu Masuk</div>
                  <div className="text-center">Petugas Survey</div>
                  <div className="text-center">Status</div>
                </div>

                {/* 10 Rows with Solid Row Height */}
                <div className="flex-1 flex flex-col justify-between min-h-0 divide-y divide-slate-800">
                  {isTableLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-300 font-bold text-sm">
                      <Loader2 className="w-7 h-7 animate-spin text-indigo-400 mb-2" />
                      <span>Memuat Data Verifikasi Dinas...</span>
                    </div>
                  ) : latestVerifikasiDinas.length === 0 ? (
                    <div className="py-12 flex items-center justify-center text-slate-400 font-bold uppercase text-sm">
                      Belum ada antrean data Verifikasi Dinas
                    </div>
                  ) : (
                    latestVerifikasiDinas.map((actor, idx) => {
                      const dt = formatDateTimeSplit(actor.verifiedDinasAt || (actor.surveyData as any)?.tanggalSurvey || actor.createdAt);
                      return (
                        <div 
                          key={actor.id || idx}
                          className={cn(
                            "min-h-[46px] sm:min-h-[48px] lg:min-h-0 lg:flex-1 grid grid-cols-[40px_1fr_135px_130px_95px] md:grid-cols-[46px_1fr_155px_145px_105px] items-center px-2 py-1 transition-colors hover:bg-indigo-950/70",
                            idx % 2 === 0 ? "bg-[#0a1224]" : "bg-[#0d1830]"
                          )}
                        >
                          {/* 1. No */}
                          <div className="text-center font-black font-mono text-slate-200 text-sm sm:text-base">
                            {idx + 1}
                          </div>

                          {/* 2. Pelaku Usaha */}
                          <div className="min-w-0 pr-2 pl-2 flex flex-col justify-center">
                            <div className="font-black text-white uppercase text-xs sm:text-sm md:text-base lg:text-[17px] tracking-normal truncate leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                              {actor.fullName || '-'}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 truncate">
                              <span className="text-[11px] sm:text-xs md:text-[13px] font-black text-cyan-300 uppercase tracking-tight truncate">
                                {actor.businessName || 'USAHA'}
                              </span>
                              {actor.kelurahan && (
                                <>
                                  <span className="text-slate-400 font-bold">•</span>
                                  <span className="text-[10px] sm:text-[11px] md:text-xs font-extrabold text-amber-300/90 uppercase tracking-wide truncate">
                                    {actor.kelurahan}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* 3. Waktu Masuk */}
                          <div className="text-center flex flex-col items-center justify-center leading-tight">
                            <span className="text-xs sm:text-sm font-black text-amber-300 font-mono flex items-center justify-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              {dt.time}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 mt-0.5">
                              {dt.date}
                            </span>
                          </div>

                          {/* 4. Petugas Survey */}
                          <div className="text-center flex items-center justify-center px-1">
                            <span className="text-xs sm:text-[13px] font-black text-emerald-300 uppercase leading-snug line-clamp-2 drop-shadow-sm">
                              {getSurveyorName(actor)}
                            </span>
                          </div>

                          {/* 5. Status */}
                          <div className="text-center flex items-center justify-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wide bg-amber-500/30 text-amber-200 border-2 border-amber-400/80 shadow-md">
                              Cek Berkas
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            </div>

            {/* Table Footer Stats */}
            <div className="shrink-0 pt-2 mt-1 border-t border-indigo-500/30 flex items-center justify-between text-xs text-slate-300">
              <span className="font-black uppercase tracking-wide">
                Total Antrean: <strong className="text-indigo-300 font-mono text-sm">{systemStats?.detailedStatus?.verifikasi ?? 0} Pelaku Usaha</strong>
              </span>
              <span className="text-slate-400 text-[11px] font-semibold">Pembaruan Realtime</span>
            </div>

          </div>
        </div>

        {/* TABEL 2: HASIL DINAS (TAHAP 3) */}
        <div className={cn(
          "relative p-[2.5px] rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500 shadow-[0_0_25px_rgba(20,184,166,0.35)] flex flex-col min-h-0 overflow-hidden",
          activeMobileTab === 'hasil' ? "flex" : "hidden lg:flex"
        )}>
          <div className="bg-[#081a24] rounded-[13.5px] p-2.5 md:p-3 shadow-2xl flex flex-col justify-between min-h-0 h-full overflow-hidden">
            
            {/* Table Header Top Bar */}
            <div className="shrink-0 flex items-center justify-between pb-1.5 mb-1.5 border-b border-teal-500/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/30 border border-teal-400/50 flex items-center justify-center text-teal-200 shrink-0 shadow">
                  <ListChecks className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm md:text-base font-black text-white uppercase tracking-tight drop-shadow">
                      Hasil Dinas
                    </h2>
                    <span className="bg-teal-500/40 text-teal-100 border border-teal-300/50 text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm">
                      Tahap 3
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-semibold leading-none mt-0.5">
                    10 Pelaku Usaha Terakhir Selesai Verifikasi Berkas Dinas
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-teal-200 bg-teal-950 border border-teal-600/60 px-2.5 py-1 rounded-xl shadow-sm">
                10 Terkini
              </span>
            </div>

            {/* Table Container with Horizontal Scroll Support on Mobile */}
            <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-700 bg-[#040e14] overflow-x-auto overflow-y-hidden shadow-inner">
              <div className="min-w-[540px] lg:min-w-0 flex-1 flex flex-col justify-between">
                
                {/* Column Headers */}
                <div className="shrink-0 grid grid-cols-[40px_1fr_135px_130px_95px] md:grid-cols-[46px_1fr_155px_145px_105px] items-center bg-[#112a38] border-b-2 border-teal-500/40 px-2 py-2 text-xs font-black uppercase text-teal-200 tracking-wider">
                  <div className="text-center">No</div>
                  <div className="text-left pl-2">Pelaku Usaha</div>
                  <div className="text-center">Waktu Verifikasi</div>
                  <div className="text-center">Petugas Verifikator</div>
                  <div className="text-center">Status</div>
                </div>

                {/* 10 Rows with Solid Row Height */}
                <div className="flex-1 flex flex-col justify-between min-h-0 divide-y divide-slate-800">
                  {isTableLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-300 font-bold text-sm">
                      <Loader2 className="w-7 h-7 animate-spin text-teal-400 mb-2" />
                      <span>Memuat Data Hasil Dinas...</span>
                    </div>
                  ) : latestHasilVerifikasi.length === 0 ? (
                    <div className="py-12 flex items-center justify-center text-slate-400 font-bold uppercase text-sm">
                      Belum ada data Hasil Dinas terbaru
                    </div>
                  ) : (
                    latestHasilVerifikasi.map((actor, idx) => {
                      const dt = formatDateTimeSplit(actor.berkasDinasVerifiedAt || actor.verifiedDinasAt || actor.createdAt);
                      return (
                        <div 
                          key={actor.id || idx}
                          className={cn(
                            "min-h-[46px] sm:min-h-[48px] lg:min-h-0 lg:flex-1 grid grid-cols-[40px_1fr_135px_130px_95px] md:grid-cols-[46px_1fr_155px_145px_105px] items-center px-2 py-1 transition-colors hover:bg-teal-950/70",
                            idx % 2 === 0 ? "bg-[#06151f]" : "bg-[#0a1e2c]"
                          )}
                        >
                          {/* 1. No */}
                          <div className="text-center font-black font-mono text-slate-300 text-sm sm:text-base">
                            {idx + 1}
                          </div>

                          {/* 2. Pelaku Usaha */}
                          <div className="min-w-0 pr-2 pl-2 flex flex-col justify-center">
                            <div className="font-black text-white uppercase text-xs sm:text-sm md:text-base lg:text-[17px] tracking-normal truncate leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                              {actor.fullName || '-'}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 truncate">
                              <span className="text-[11px] sm:text-xs md:text-[13px] font-black text-teal-300 uppercase tracking-tight truncate">
                                {actor.businessName || 'USAHA'}
                              </span>
                              {actor.kelurahan && (
                                <>
                                  <span className="text-slate-400 font-bold">•</span>
                                  <span className="text-[10px] sm:text-[11px] md:text-xs font-extrabold text-amber-300/90 uppercase tracking-wide truncate">
                                    {actor.kelurahan}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* 3. Waktu Verifikasi */}
                          <div className="text-center flex flex-col items-center justify-center leading-tight">
                            <span className="text-xs sm:text-sm font-black text-amber-300 font-mono flex items-center justify-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              {dt.time}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 mt-0.5">
                              {dt.date}
                            </span>
                          </div>

                          {/* 4. Petugas Verifikator */}
                          <div className="text-center flex items-center justify-center px-1">
                            <span className="text-xs sm:text-[13px] font-black text-emerald-300 uppercase leading-snug line-clamp-2 drop-shadow-sm">
                              {getVerifikatorName(actor)}
                            </span>
                          </div>

                          {/* 5. Status */}
                          <div className="text-center flex items-center justify-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wide bg-emerald-500/30 text-emerald-200 border-2 border-emerald-400/80 shadow-md">
                              ✓ Lolos Berkas
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            </div>

            {/* Table Footer Stats */}
            <div className="shrink-0 pt-2 mt-1 border-t border-teal-500/30 flex items-center justify-between text-xs text-slate-300">
              <span className="font-black uppercase tracking-wide">
                Total Selesai: <strong className="text-teal-300 font-mono text-sm">{systemStats?.detailedStatus?.hasilVerifikasi ?? 0} Pelaku Usaha</strong>
              </span>
              <span className="text-slate-400 text-[11px] font-semibold">Pembaruan Realtime</span>
            </div>

          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TABEL 3: CANCELL DINAS (WRAPPER GRADASI BATAS LUAR MERAH)
        ═══════════════════════════════════════════════════════════════ */}
        <div className={cn(
          "relative p-[2.5px] rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-orange-500 shadow-[0_0_25px_rgba(239,68,68,0.35)] flex flex-col min-h-0 overflow-hidden",
          activeMobileTab === 'cancel' ? "flex" : "hidden lg:flex"
        )}>
          <div className="bg-[#1a0808] rounded-[13.5px] p-2.5 md:p-3 shadow-2xl flex flex-col justify-between min-h-0 h-full overflow-hidden">
            
            {/* Table Header Top Bar */}
            <div className="shrink-0 flex items-center justify-between pb-1.5 mb-1.5 border-b border-rose-500/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/30 border border-rose-400/50 flex items-center justify-center text-rose-200 shrink-0 shadow">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm md:text-base font-black text-white uppercase tracking-tight drop-shadow">
                      Cancell Dinas
                    </h2>
                    <span className="bg-rose-600/50 text-rose-100 border border-rose-400/50 text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm">
                      Tidak Lolos
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-semibold leading-none mt-0.5">
                    10 Data Pelaku Usaha Cancel Dinas Terbaru
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-rose-200 bg-rose-950 border border-rose-600/60 px-2.5 py-1 rounded-xl shadow-sm">
                10 Terkini
              </span>
            </div>

            {/* Table Container */}
            <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-700 bg-[#120404] overflow-x-auto overflow-y-hidden shadow-inner">
              <div className="min-w-[580px] lg:min-w-0 flex-1 flex flex-col justify-between">
                
                {/* Column Headers */}
                <div className="shrink-0 grid grid-cols-[36px_1fr_110px_110px_90px_1fr] items-center bg-[#2a0f0f] border-b-2 border-rose-600/40 px-2 py-2 text-[10px] md:text-xs font-black uppercase text-rose-300 tracking-wider">
                  <div className="text-center">No</div>
                  <div className="text-left pl-2">Pelaku Usaha</div>
                  <div className="text-center">Koordinator</div>
                  <div className="text-center">Petugas Survey</div>
                  <div className="text-center">Tgl Submit</div>
                  <div className="text-center">Alasan</div>
                </div>

                {/* 10 Rows */}
                <div className="flex-1 flex flex-col justify-between min-h-0 divide-y divide-slate-800/60">
                  {isTableLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-300 font-bold text-sm">
                      <Loader2 className="w-7 h-7 animate-spin text-rose-400 mb-2" />
                      <span>Memuat Data Cancel Dinas...</span>
                    </div>
                  ) : latestCancelDinas.length === 0 ? (
                    <div className="py-12 flex items-center justify-center text-slate-400 font-bold uppercase text-sm">
                      Belum ada data Cancel Dinas
                    </div>
                  ) : (
                    latestCancelDinas.map((actor, idx) => (
                      <div
                        key={actor.id || idx}
                        className={cn(
                          "min-h-[46px] sm:min-h-[48px] lg:min-h-0 lg:flex-1 grid grid-cols-[36px_1fr_110px_110px_90px_1fr] items-center px-2 py-1 transition-colors hover:bg-rose-950/60",
                          idx % 2 === 0 ? "bg-[#160606]" : "bg-[#1c0808]"
                        )}
                      >
                        {/* 1. No */}
                        <div className="text-center font-black font-mono text-rose-300 text-xs sm:text-sm">
                          {idx + 1}
                        </div>

                        {/* 2. Pelaku Usaha */}
                        <div className="min-w-0 pl-2 pr-1 flex flex-col justify-center">
                          <div className="font-black text-white uppercase text-xs sm:text-sm md:text-[13px] tracking-normal truncate leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                            {actor.fullName || '-'}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 truncate">
                            <span className="text-[10px] sm:text-[11px] font-black text-rose-300 uppercase tracking-tight truncate">
                              {actor.businessName || 'USAHA'}
                            </span>
                            {actor.kelurahan && (
                              <>
                                <span className="text-slate-500 font-bold">•</span>
                                <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-300/80 uppercase tracking-wide truncate">
                                  {actor.kelurahan}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 3. Koordinator */}
                        <div className="text-center flex items-center justify-center px-1">
                          <span className="text-[10px] sm:text-xs font-black text-cyan-300 uppercase leading-snug line-clamp-2 drop-shadow-sm">
                            {actor.coordinator || '-'}
                          </span>
                        </div>

                        {/* 4. Petugas Survey */}
                        <div className="text-center flex items-center justify-center px-1">
                          <span className="text-[10px] sm:text-xs font-black text-emerald-300 uppercase leading-snug line-clamp-2 drop-shadow-sm">
                            {getSurveyorName(actor)}
                          </span>
                        </div>

                        {/* 5. Tanggal Submit (Cancel) */}
                        <div className="text-center flex flex-col items-center justify-center leading-tight">
                          <span className="text-[10px] sm:text-xs font-bold text-amber-300 font-mono">
                            {formatDateOnly((actor as any).cancelDinasAt || actor.verifiedDinasAt || actor.createdAt)}
                          </span>
                        </div>

                        {/* 6. Alasan */}
                        <div className="text-center flex items-center justify-center px-1">
                          <span className="text-[10px] sm:text-xs font-bold text-rose-200 leading-snug line-clamp-2">
                            {(actor as any).alasanCancelDinas || actor.keteranganDinas || '-'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>

            {/* Table Footer Stats */}
            <div className="shrink-0 pt-2 mt-1 border-t border-rose-500/30 flex items-center justify-between text-xs text-slate-300">
              <span className="font-black uppercase tracking-wide">
                Total Cancel: <strong className="text-rose-300 font-mono text-sm">{cancelDinasCount} Pelaku Usaha</strong>
              </span>
              <span className="text-slate-400 text-[11px] font-semibold">Pembaruan Realtime</span>
            </div>

          </div>
        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. BAGIAN BAWAH: FOOTER (DENGAN GRADASI BATAS LUAR)
      ────────────────────────────────────────────────────────────── */}
      <div className="p-[2px] rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-600 shadow-[0_0_25px_rgba(6,182,212,0.25)] shrink-0">
        <footer className="rounded-[14px] overflow-hidden bg-slate-900/95">
          
          {/* Row 1: Running Text (Marquee) */}
          <div className="w-full bg-[#022c2a] border-b border-cyan-500/40 py-1.5 overflow-hidden flex items-center">
            <div className="bg-cyan-400 text-slate-950 px-2.5 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-widest shrink-0 flex items-center gap-1.5 shadow-md ml-2 rounded-md">
              <Radio className="w-3.5 h-3.5 animate-pulse text-slate-950" />
              PENGUMUMAN
            </div>
            <div className="relative flex overflow-x-hidden whitespace-nowrap flex-1">
              <div className="animate-marquee inline-block whitespace-nowrap">
                <span className="text-xs md:text-sm font-black text-cyan-100 uppercase tracking-widest px-8 drop-shadow">
                  {runningText}
                </span>
                <span className="text-cyan-400 mx-4 font-black">•</span>
                <span className="text-xs md:text-sm font-black text-cyan-100 uppercase tracking-widest px-8 drop-shadow">
                  {runningText}
                </span>
                <span className="text-cyan-400 mx-4 font-black">•</span>
              </div>
            </div>
          </div>

          {/* Row 2: Bottom Bar (Realtime Clock Rata Tengah) */}
          <div className="px-4 py-2 md:px-6 md:py-2.5 flex items-center justify-center bg-[#0a101d]">
            
            {/* REALTIME CLOCK RATA TENGAH */}
            <div className="flex items-center gap-2.5 sm:gap-3 bg-slate-950 border border-slate-700/80 px-4 py-1.5 sm:px-6 sm:py-2 rounded-2xl shadow-md">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 animate-pulse" />
              <div className="flex items-baseline gap-2 sm:gap-3">
                <span className="text-base sm:text-xl md:text-2xl font-black text-white font-mono tracking-wider">
                  {currentTime ? currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':') : '--:--:--'}
                  <span className="text-xs text-cyan-400 font-black ml-1">WIB</span>
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-wider">
                  {currentTime ? currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                </span>
              </div>
            </div>

          </div>
        </footer>
      </div>

      {/* Marquee Keyframes */}
      <style jsx>{`
        .animate-marquee {
          display: inline-block;
          animation: marquee 70s linear infinite;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
