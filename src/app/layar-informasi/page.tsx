'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDatabase, useObject, useList, useMemoFirebase } from '@/firebase';
import { ref, query, orderByChild, equalTo } from 'firebase/database';
import { BusinessActor } from '../lib/types';
import { cn } from '@/lib/utils';
import { useActiveEvent } from '@/hooks/use-active-event';
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
  Calendar, 
  Radio, 
  Loader2
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

export default function LayarInformasiPage() {
  const database = useDatabase();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // 1. Fetch real-time system stats
  const statsRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'system_stats');
  }, [database]);
  const { data: systemStats, isLoading: isStatsLoading } = useObject(statsRef);

  // 2. Fetch verified_dinas actors
  const verifiedDinasQuery = useMemoFirebase(() => {
    if (!database) return null;
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('verified_dinas'));
  }, [database]);
  const { data: verifiedDinasData, isLoading: isTableLoading } = useList<BusinessActor>(verifiedDinasQuery);

  // 3. Running Text from Firebase
  const runningTextRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/running_text');
  }, [database]);
  const { data: runningTextConfig } = useObject(runningTextRef);
  const defaultRunningText = "SELAMAT DATANG DI APLIKASI SISTEM INFORMASI MANAJEMEN PELAKU USAHA (SIMPU) TAHUN 2026 • STATUS VERIFIKASI DATA DAN SURVEY DINAS DIPERBARUI SECARA REALTIME";
  const runningText = (typeof runningTextConfig === 'string' ? runningTextConfig : runningTextConfig?.text) || defaultRunningText;

  // 4. Event Countdown from Firebase
  const eventInfoRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/event_info');
  }, [database]);
  const { data: eventInfo } = useObject(eventInfoRef);
  const activeEvent = useActiveEvent(eventInfo);

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
    return (
      d.petugasSurvey ||
      (d.surveyData as any)?.petugasSurvey ||
      d.surveyData?.pejabatData?.petugas?.nama ||
      d.verifiedDinasBy ||
      '-'
    );
  };

  // Helper verifikator name
  const getVerifikatorName = (d: BusinessActor) => {
    return (
      d.berkasDinasVerifiedBy ||
      d.verifikatorDinas ||
      d.pejabatData?.verifikator?.nama ||
      '-'
    );
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

  // 6 Stats Cards
  const cardStats = [
    {
      title: "Total Data Terverifikasi",
      count: systemStats?.status?.verified ?? 0,
      icon: UserCheck,
      cardBg: "from-emerald-700 to-emerald-950 border-emerald-500/60 shadow-emerald-950/40",
      iconBg: "bg-emerald-400/25 text-emerald-200"
    },
    {
      title: "Cancell",
      count: systemStats?.status?.rejected ?? 0,
      icon: UserX,
      cardBg: "from-rose-700 to-red-950 border-rose-500/60 shadow-rose-950/40",
      iconBg: "bg-rose-400/25 text-rose-200"
    },
    {
      title: "Survey Dinas",
      subtitle: "Tahap 1",
      count: systemStats?.detailedStatus?.survey ?? 0,
      icon: ClipboardCheck,
      cardBg: "from-fuchsia-700 to-purple-950 border-fuchsia-500/60 shadow-fuchsia-950/40",
      iconBg: "bg-fuchsia-400/25 text-fuchsia-200"
    },
    {
      title: "Verifikasi Dinas",
      subtitle: "Tahap 2",
      count: systemStats?.detailedStatus?.verifikasi ?? 0,
      icon: FileText,
      cardBg: "from-indigo-700 to-blue-950 border-indigo-500/60 shadow-indigo-950/40",
      iconBg: "bg-indigo-400/25 text-indigo-200"
    },
    {
      title: "Hasil Dinas",
      subtitle: "Tahap 3",
      count: systemStats?.detailedStatus?.hasilVerifikasi ?? 0,
      icon: ListChecks,
      cardBg: "from-teal-700 to-cyan-950 border-teal-500/60 shadow-teal-950/40",
      iconBg: "bg-teal-400/25 text-teal-200"
    },
    {
      title: "Rekening Terinput",
      subtitle: "Tahap 4 Final",
      count: systemStats?.detailedStatus?.selesai ?? systemStats?.status?.finish ?? 0,
      icon: CreditCard,
      cardBg: "from-sky-700 to-blue-950 border-sky-500/60 shadow-sky-950/40",
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
    <div className="h-[100dvh] w-full max-h-[100dvh] bg-[#060a12] text-white flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-white overflow-hidden select-none p-2 sm:p-3 md:p-3.5 gap-2">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER
      ────────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2 md:px-5 md:py-2.5 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg ring-2 ring-white/20 shrink-0">
            <SimpuLogo className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse leading-none">
                LIVE DISPLAY MONITORING
              </span>
            </div>
            <h1 className="text-base md:text-xl lg:text-2xl font-black text-white uppercase tracking-tight font-headline leading-tight mt-0.5 drop-shadow">
              SISTEM INFORMASI MANAGEMEN PELAKU USAHA 2026
            </h1>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1.5 rounded-xl shadow-inner">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
              Realtime Online
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-white border border-slate-600 px-3.5 py-1.5 rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-md"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4 text-cyan-400" />}
            <span className="hidden sm:inline">{isFullscreen ? "Normal" : "Layar Penuh"}</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. BAGIAN ATAS: 6 CARD WIDGET STATISTIK REAL-TIME
      ────────────────────────────────────────────────────────────── */}
      <section className="shrink-0 grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {cardStats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={cn(
                "relative overflow-hidden rounded-2xl p-2.5 md:p-3 flex flex-col justify-between border-2 shadow-xl bg-gradient-to-br transition-transform duration-200 hover:scale-[1.01]",
                item.cardBg
              )}
            >
              <div className="flex items-center justify-between gap-1 relative z-10">
                <span className="text-[11px] md:text-xs font-black uppercase tracking-wide text-white drop-shadow line-clamp-1">
                  {item.title}
                </span>
                <div className={cn("p-1.5 rounded-lg shrink-0", item.iconBg)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="mt-1.5 relative z-10 flex items-baseline justify-between">
                <div className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                  {isStatsLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    (item.count || 0).toLocaleString('id-ID')
                  )}
                </div>
                <span className="text-[10px] md:text-xs font-extrabold text-white/90 uppercase tracking-wider">
                  {item.subtitle || "Data Realtime"}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. BAGIAN TENGAH: 2 TABEL DENGAN FORMAT PAS & RATA TENGAH
      ────────────────────────────────────────────────────────────── */}
      <section className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2.5 md:gap-3">
        
        {/* TABEL 1: VERIFIKASI DINAS (TAHAP 2) */}
        <div className="bg-[#0b1329] border-2 border-indigo-500/50 rounded-2xl p-2.5 md:p-3 shadow-2xl flex flex-col justify-between min-h-0 overflow-hidden">
          
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
            <span className="hidden sm:inline-flex text-xs font-black text-indigo-200 bg-indigo-950 border border-indigo-600/60 px-2.5 py-1 rounded-xl shadow-sm">
              10 Terkini
            </span>
          </div>

          {/* Table Container with Proportional Centered Columns */}
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-700 bg-[#050a14] overflow-hidden shadow-inner">
            
            {/* Column Headers */}
            <div className="shrink-0 grid grid-cols-[40px_1fr_135px_130px_95px] md:grid-cols-[46px_1fr_155px_145px_105px] items-center bg-[#18243e] border-b-2 border-indigo-500/40 px-2 py-2 text-xs font-black uppercase text-indigo-200 tracking-wider">
              <div className="text-center">No</div>
              <div className="text-left pl-2">Pelaku Usaha</div>
              <div className="text-center">Waktu Masuk</div>
              <div className="text-center">Petugas Survey</div>
              <div className="text-center">Status</div>
            </div>

            {/* 10 Stretch Rows with Clean Center Alignment */}
            <div className="flex-1 flex flex-col justify-between min-h-0 divide-y divide-slate-800">
              {isTableLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 font-bold text-sm">
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-400 mb-2" />
                  <span>Memuat Data Verifikasi Dinas...</span>
                </div>
              ) : latestVerifikasiDinas.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 font-bold uppercase text-sm">
                  Belum ada antrean data Verifikasi Dinas
                </div>
              ) : (
                latestVerifikasiDinas.map((actor, idx) => {
                  const dt = formatDateTimeSplit(actor.verifiedDinasAt || (actor.surveyData as any)?.tanggalSurvey || actor.createdAt);
                  return (
                    <div 
                      key={actor.id || idx}
                      className={cn(
                        "flex-1 min-h-0 grid grid-cols-[40px_1fr_135px_130px_95px] md:grid-cols-[46px_1fr_155px_145px_105px] items-center px-2 transition-colors hover:bg-indigo-950/70",
                        idx % 2 === 0 ? "bg-[#0a1224]" : "bg-[#0d1830]"
                      )}
                    >
                      {/* 1. No (Rata Tengah) */}
                      <div className="text-center font-black font-mono text-slate-200 text-sm sm:text-base">
                        {idx + 1}
                      </div>

                      {/* 2. Pelaku Usaha (Sangat Jelas, Besar & Terbaca) */}
                      <div className="min-w-0 pr-2 pl-2 flex flex-col justify-center">
                        <div className="font-black text-white uppercase text-sm sm:text-base md:text-[17px] tracking-normal truncate leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                          {actor.fullName || '-'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 truncate">
                          <span className="text-xs sm:text-[13px] font-black text-cyan-300 uppercase tracking-tight truncate">
                            {actor.businessName || 'USAHA'}
                          </span>
                          {actor.kelurahan && (
                            <>
                              <span className="text-slate-400 font-bold">•</span>
                              <span className="text-[11px] sm:text-xs font-extrabold text-amber-300/90 uppercase tracking-wide truncate">
                                {actor.kelurahan}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 3. Waktu Masuk (Rata Tengah 2 Baris) */}
                      <div className="text-center flex flex-col items-center justify-center leading-tight">
                        <span className="text-xs sm:text-sm font-black text-amber-300 font-mono flex items-center justify-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          {dt.time}
                        </span>
                        <span className="text-[11px] sm:text-xs font-bold text-slate-200 mt-0.5">
                          {dt.date}
                        </span>
                      </div>

                      {/* 4. Petugas Survey (Rata Tengah) */}
                      <div className="text-center flex items-center justify-center px-1">
                        <span className="text-xs sm:text-[13px] font-black text-emerald-300 uppercase leading-snug line-clamp-2 drop-shadow-sm">
                          {getSurveyorName(actor)}
                        </span>
                      </div>

                      {/* 5. Status (Rata Tengah) */}
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

          {/* Table Footer Stats */}
          <div className="shrink-0 pt-2 mt-1 border-t border-indigo-500/30 flex items-center justify-between text-xs text-slate-300">
            <span className="font-black uppercase tracking-wide">
              Total Antrean: <strong className="text-indigo-300 font-mono text-sm">{systemStats?.detailedStatus?.verifikasi ?? 0} Pelaku Usaha</strong>
            </span>
            <span className="text-slate-400 text-[11px] font-semibold">Pembaruan Otomatis Realtime</span>
          </div>

        </div>

        {/* TABEL 2: HASIL DINAS (TAHAP 3) */}
        <div className="bg-[#081a24] border-2 border-teal-500/50 rounded-2xl p-2.5 md:p-3 shadow-2xl flex flex-col justify-between min-h-0 overflow-hidden">
          
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
            <span className="hidden sm:inline-flex text-xs font-black text-teal-200 bg-teal-950 border border-teal-600/60 px-2.5 py-1 rounded-xl shadow-sm">
              10 Terkini
            </span>
          </div>

          {/* Table Container with Proportional Centered Columns */}
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-700 bg-[#040e14] overflow-hidden shadow-inner">
            
            {/* Column Headers */}
            <div className="shrink-0 grid grid-cols-[40px_1fr_135px_130px_95px] md:grid-cols-[46px_1fr_155px_145px_105px] items-center bg-[#112a38] border-b-2 border-teal-500/40 px-2 py-2 text-xs font-black uppercase text-teal-200 tracking-wider">
              <div className="text-center">No</div>
              <div className="text-left pl-2">Pelaku Usaha</div>
              <div className="text-center">Waktu Verifikasi</div>
              <div className="text-center">Petugas Verifikator</div>
              <div className="text-center">Status</div>
            </div>

            {/* 10 Stretch Rows with Clean Center Alignment */}
            <div className="flex-1 flex flex-col justify-between min-h-0 divide-y divide-slate-800">
              {isTableLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 font-bold text-sm">
                  <Loader2 className="w-7 h-7 animate-spin text-teal-400 mb-2" />
                  <span>Memuat Data Hasil Dinas...</span>
                </div>
              ) : latestHasilVerifikasi.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 font-bold uppercase text-sm">
                  Belum ada data Hasil Dinas terbaru
                </div>
              ) : (
                latestHasilVerifikasi.map((actor, idx) => {
                  const dt = formatDateTimeSplit(actor.berkasDinasVerifiedAt || actor.verifiedDinasAt || actor.createdAt);
                  return (
                    <div 
                      key={actor.id || idx}
                      className={cn(
                        "flex-1 min-h-0 grid grid-cols-[40px_1fr_135px_130px_95px] md:grid-cols-[46px_1fr_155px_145px_105px] items-center px-2 transition-colors hover:bg-teal-950/70",
                        idx % 2 === 0 ? "bg-[#06151f]" : "bg-[#0a1e2c]"
                      )}
                    >
                      {/* 1. No (Rata Tengah) */}
                      <div className="text-center font-black font-mono text-slate-300 text-sm sm:text-base">
                        {idx + 1}
                      </div>

                      {/* 2. Pelaku Usaha (Sangat Jelas, Besar & Terbaca) */}
                      <div className="min-w-0 pr-2 pl-2 flex flex-col justify-center">
                        <div className="font-black text-white uppercase text-sm sm:text-base md:text-[17px] tracking-normal truncate leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                          {actor.fullName || '-'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 truncate">
                          <span className="text-xs sm:text-[13px] font-black text-teal-300 uppercase tracking-tight truncate">
                            {actor.businessName || 'USAHA'}
                          </span>
                          {actor.kelurahan && (
                            <>
                              <span className="text-slate-400 font-bold">•</span>
                              <span className="text-[11px] sm:text-xs font-extrabold text-amber-300/90 uppercase tracking-wide truncate">
                                {actor.kelurahan}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 3. Waktu Verifikasi (Rata Tengah 2 Baris) */}
                      <div className="text-center flex flex-col items-center justify-center leading-tight">
                        <span className="text-xs sm:text-sm font-black text-amber-300 font-mono flex items-center justify-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          {dt.time}
                        </span>
                        <span className="text-[11px] sm:text-xs font-bold text-slate-200 mt-0.5">
                          {dt.date}
                        </span>
                      </div>

                      {/* 4. Petugas Verifikator (Rata Tengah) */}
                      <div className="text-center flex items-center justify-center px-1">
                        <span className="text-xs sm:text-[13px] font-black text-emerald-300 uppercase leading-snug line-clamp-2 drop-shadow-sm">
                          {getVerifikatorName(actor)}
                        </span>
                      </div>

                      {/* 5. Status (Rata Tengah) */}
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

          {/* Table Footer Stats */}
          <div className="shrink-0 pt-2 mt-1 border-t border-teal-500/30 flex items-center justify-between text-xs text-slate-300">
            <span className="font-black uppercase tracking-wide">
              Total Selesai: <strong className="text-teal-300 font-mono text-sm">{systemStats?.detailedStatus?.hasilVerifikasi ?? 0} Pelaku Usaha</strong>
            </span>
            <span className="text-slate-400 text-[11px] font-semibold">Pembaruan Otomatis Realtime</span>
          </div>

        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. BAGIAN BAWAH: FOOTER (RUNNING TEXT, REALTIME CLOCK & COUNTDOWN EVENT)
      ────────────────────────────────────────────────────────────── */}
      <footer className="shrink-0 rounded-2xl overflow-hidden bg-slate-900/95 border-2 border-slate-700 shadow-2xl">
        
        {/* Row 1: Running Text (Marquee) */}
        <div className="w-full bg-[#022c2a] border-b border-cyan-500/40 py-1.5 overflow-hidden flex items-center">
          <div className="bg-cyan-400 text-slate-950 px-3 py-0.5 text-xs font-black uppercase tracking-widest shrink-0 flex items-center gap-1.5 shadow-md ml-2 rounded-md">
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

        {/* Row 2: Bottom Bar (Sudut Kiri Clock, Sudut Kanan Countdown Event) */}
        <div className="px-4 py-2 md:px-6 md:py-2.5 flex items-center justify-between gap-3 bg-[#0a101d]">
          
          {/* SUDUT KIRI: REALTIME CLOCK */}
          <div className="flex items-center gap-3 bg-slate-950 border border-slate-700 px-4 py-1.5 rounded-2xl shadow-md shrink-0">
            <Clock className="w-6 h-6 text-cyan-400 animate-pulse" />
            <div className="flex items-baseline gap-2.5">
              <span className="text-lg md:text-2xl font-black text-white font-mono tracking-wider">
                {currentTime ? currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':') : '--:--:--'}
                <span className="text-xs text-cyan-400 font-black ml-1">WIB</span>
              </span>
              <span className="text-xs md:text-sm font-black text-slate-300 uppercase tracking-wider hidden sm:inline">
                {currentTime ? currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
              </span>
            </div>
          </div>

          {/* SUDUT KANAN: COUNTDOWN EVENT */}
          {activeEvent ? (
            <div className="flex items-center gap-3 bg-slate-950 border-2 border-cyan-500/60 px-4 py-1.5 rounded-2xl shadow-lg shrink-0">
              <div className="flex items-center gap-2 leading-none">
                <span className="px-2.5 py-1 rounded-md text-[10px] md:text-xs font-black uppercase tracking-wider bg-rose-500/30 text-rose-200 border border-rose-400/60 flex items-center gap-1 shadow-sm">
                  <Calendar className="w-3.5 h-3.5" />
                  EVENT
                </span>
                <span className="text-xs md:text-sm lg:text-base font-black text-cyan-200 uppercase truncate max-w-[200px] sm:max-w-[320px] drop-shadow">
                  {activeEvent.description || 'Jadwal Event'}
                </span>
              </div>
              <EventTimerDisplay targetDate={activeEvent.endDate || activeEvent.date} startDate={activeEvent.startDate} />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-2xl text-slate-400 text-xs font-black uppercase tracking-wider shrink-0">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Tidak Ada Event Aktif</span>
            </div>
          )}

        </div>
      </footer>

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

// Subcomponent for Event Timer Display (Large & Crisp)
function EventTimerDisplay({ targetDate, startDate }: { targetDate: string; startDate?: string }) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isEnded: boolean;
    isStarted: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: false, isStarted: false });

  useEffect(() => {
    if (!targetDate) return;

    const calculate = () => {
      const now = +new Date();
      const start = startDate ? +new Date(startDate) : 0;
      const end = +new Date(targetDate);

      let targetTime = end;
      let isStarted = true;

      if (start && now < start) {
        isStarted = false;
        targetTime = start;
      }

      const difference = targetTime - now;
      if (isNaN(difference) || (isStarted && difference <= 0)) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: now >= end, isStarted };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isEnded: false,
        isStarted
      };
    };

    setTimeLeft(calculate());
    const interval = setInterval(() => {
      setTimeLeft(calculate());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, startDate]);

  if (timeLeft.isEnded) {
    return <span className="text-xs font-black text-slate-400 uppercase">Selesai</span>;
  }

  return (
    <div className="flex items-center gap-1.5 font-mono text-sm md:text-base lg:text-lg font-black text-white">
      <span className="text-amber-300 font-black">{timeLeft.days}</span>
      <span className="text-[10px] text-amber-200 uppercase mr-0.5">h</span>
      <span className="text-cyan-400 font-black">:</span>
      <span className="text-white font-black">{timeLeft.hours.toString().padStart(2, '0')}</span>
      <span className="text-[10px] text-slate-300 uppercase mr-0.5">j</span>
      <span className="text-cyan-400 font-black">:</span>
      <span className="text-white font-black">{timeLeft.minutes.toString().padStart(2, '0')}</span>
      <span className="text-[10px] text-slate-300 uppercase mr-0.5">m</span>
      <span className="text-cyan-400 font-black">:</span>
      <span className="text-cyan-300 font-black">{timeLeft.seconds.toString().padStart(2, '0')}</span>
      <span className="text-[10px] text-cyan-200 uppercase">d</span>
    </div>
  );
}
