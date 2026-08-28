'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDatabase, useObject, useList, useMemoFirebase } from '@/firebase';
import { ref, query, orderByChild, equalTo } from 'firebase/database';
import { BusinessActor } from '../lib/types';
import { formatDateTimeIndo, cn } from '@/lib/utils';
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
  Sparkles, 
  Building2, 
  Radio, 
  Loader2
} from 'lucide-react';

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
  const defaultRunningText = "SELAMAT DATANG DI APLIKASI SISTEM INFORMASI MANAJEMEN PELAKU USAHA (SIMPU) TAHUN 2026 • DINAS TENAGA KERJA, KOPERASI DAN USAHA MIKRO KOTA TANJUNGPINANG • STATUS VERIFIKASI DATA DAN SURVEY DINAS DIPERBARUI SECARA REALTIME";
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
      cardBg: "from-emerald-700 to-emerald-900 border-emerald-500/50",
      iconBg: "bg-emerald-500/20 text-emerald-300"
    },
    {
      title: "Cancell",
      count: systemStats?.status?.rejected ?? 0,
      icon: UserX,
      cardBg: "from-rose-700 to-red-950 border-rose-500/50",
      iconBg: "bg-rose-500/20 text-rose-300"
    },
    {
      title: "Survey Dinas",
      subtitle: "Tahap 1",
      count: systemStats?.detailedStatus?.survey ?? 0,
      icon: ClipboardCheck,
      cardBg: "from-fuchsia-700 to-purple-950 border-fuchsia-500/50",
      iconBg: "bg-fuchsia-500/20 text-fuchsia-300"
    },
    {
      title: "Verifikasi Dinas",
      subtitle: "Tahap 2",
      count: systemStats?.detailedStatus?.verifikasi ?? 0,
      icon: FileText,
      cardBg: "from-indigo-700 to-blue-950 border-indigo-500/50",
      iconBg: "bg-indigo-500/20 text-indigo-300"
    },
    {
      title: "Hasil Dinas",
      subtitle: "Tahap 3",
      count: systemStats?.detailedStatus?.hasilVerifikasi ?? 0,
      icon: ListChecks,
      cardBg: "from-teal-700 to-cyan-950 border-teal-500/50",
      iconBg: "bg-teal-500/20 text-teal-300"
    },
    {
      title: "Rekening Terinput",
      subtitle: "Tahap 4 Final",
      count: systemStats?.detailedStatus?.selesai ?? systemStats?.status?.finish ?? 0,
      icon: CreditCard,
      cardBg: "from-sky-700 to-blue-950 border-sky-500/50",
      iconBg: "bg-sky-500/20 text-sky-300"
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
    <div className="h-[100dvh] w-full max-h-[100dvh] bg-[#070b14] text-white flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-white overflow-hidden select-none p-2 sm:p-3 md:p-3.5 gap-2">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER (Compact & Elegant)
      ────────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-3 py-1.5 md:px-4 md:py-2 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-md ring-1 ring-white/20 shrink-0">
            <Building2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 animate-pulse leading-none">
                LIVE MONITORING
              </span>
              <span className="text-[10px] md:text-xs font-semibold text-slate-400 hidden sm:inline leading-none">
                DINAS TENAGA KERJA, KOPERASI DAN USAHA MIKRO KOTA TANJUNGPINANG
              </span>
            </div>
            <h1 className="text-sm md:text-base lg:text-lg font-black text-white uppercase tracking-tight font-headline leading-tight mt-0.5">
              Layar Informasi Data Pelaku Usaha (SIMPU 2026)
            </h1>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-600/40 px-2.5 py-1 rounded-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Online
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-slate-200 border border-slate-700 px-3 py-1 rounded-xl font-bold text-[11px] uppercase tracking-wider shadow"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-cyan-400" /> : <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="hidden sm:inline">{isFullscreen ? "Normal" : "Fullscreen"}</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. BAGIAN ATAS: 6 CARD WIDGET STATISTIK REAL-TIME
      ────────────────────────────────────────────────────────────── */}
      <section className="shrink-0 grid grid-cols-3 lg:grid-cols-6 gap-2">
        {cardStats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={cn(
                "relative overflow-hidden rounded-2xl p-2 md:p-2.5 flex flex-col justify-between border shadow-lg bg-gradient-to-br transition-transform duration-200 hover:scale-[1.01]",
                item.cardBg
              )}
            >
              <div className="flex items-center justify-between gap-1 relative z-10">
                <span className="text-[10px] md:text-[11px] font-extrabold uppercase tracking-wide text-white line-clamp-1">
                  {item.title}
                </span>
                <div className={cn("p-1.5 rounded-lg shrink-0", item.iconBg)}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
              </div>

              <div className="mt-1 relative z-10 flex items-baseline justify-between">
                <div className="text-xl md:text-2xl font-black text-white tracking-tight font-mono drop-shadow">
                  {isStatsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                  ) : (
                    (item.count || 0).toLocaleString('id-ID')
                  )}
                </div>
                <span className="text-[8px] md:text-[9px] font-bold text-white/80 uppercase">
                  {item.subtitle || "Realtime"}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. BAGIAN TENGAH: 2 TABEL DENGAN ROWS YANG MENGISI 100% SPACE
      ────────────────────────────────────────────────────────────── */}
      <section className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        
        {/* TABEL 1: VERIFIKASI DINAS (TAHAP 2) */}
        <div className="bg-[#0f172a] border border-indigo-500/40 rounded-2xl p-2.5 md:p-3 shadow-xl flex flex-col justify-between min-h-0 overflow-hidden">
          
          {/* Table Header Top Bar */}
          <div className="shrink-0 flex items-center justify-between pb-1.5 mb-1.5 border-b border-indigo-500/30">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs md:text-sm font-black text-white uppercase tracking-tight">
                    Verifikasi Dinas
                  </h2>
                  <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[9px] font-black uppercase px-1.5 py-0.2 rounded">
                    Tahap 2
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 font-medium leading-none">
                  10 Pelaku Usaha Terakhir Masuk Verifikasi Dinas (Menunggu Cek Berkas)
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex text-[10px] font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-800/80 px-2 py-0.5 rounded-lg">
              10 Terkini
            </span>
          </div>

          {/* Table Container with 10 Flex Rows filling 100% height */}
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-700/80 bg-[#090e1a] overflow-hidden">
            
            {/* Column Headers */}
            <div className="shrink-0 grid grid-cols-[34px_1fr_150px_140px_90px] md:grid-cols-[38px_1fr_175px_150px_95px] items-center bg-[#1e293b] border-b border-slate-700 px-2 py-1.5 text-[10px] md:text-[11px] font-black uppercase text-indigo-300 tracking-wider">
              <div className="text-center">No</div>
              <div className="pl-1">Pelaku Usaha</div>
              <div>Waktu Masuk</div>
              <div>Petugas Survey</div>
              <div className="text-center">Status</div>
            </div>

            {/* 10 Stretch Rows */}
            <div className="flex-1 flex flex-col justify-between min-h-0 divide-y divide-slate-800/80">
              {isTableLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 font-bold">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mb-1" />
                  <span>Memuat Data...</span>
                </div>
              ) : latestVerifikasiDinas.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 font-bold uppercase text-xs">
                  Belum ada antrean data Verifikasi Dinas
                </div>
              ) : (
                latestVerifikasiDinas.map((actor, idx) => (
                  <div 
                    key={actor.id || idx}
                    className={cn(
                      "flex-1 min-h-0 grid grid-cols-[34px_1fr_150px_140px_90px] md:grid-cols-[38px_1fr_175px_150px_95px] items-center px-2 transition-colors hover:bg-indigo-950/60",
                      idx % 2 === 0 ? "bg-[#0b1329]" : "bg-[#0f172a]"
                    )}
                  >
                    {/* No */}
                    <div className="text-center font-bold font-mono text-slate-400 text-xs">
                      {idx + 1}
                    </div>

                    {/* Pelaku Usaha */}
                    <div className="min-w-0 pr-2 pl-1">
                      <div className="font-extrabold text-white uppercase text-xs md:text-[13px] tracking-tight truncate leading-tight">
                        {actor.fullName || '-'}
                      </div>
                      <div className="text-[10px] md:text-[11px] text-cyan-300 font-semibold truncate leading-tight mt-0.5">
                        {actor.businessName || 'Usaha'} • <span className="text-slate-400 font-normal">{actor.kelurahan || '-'}</span>
                      </div>
                    </div>

                    {/* Waktu Masuk */}
                    <div className="whitespace-nowrap text-[11px] md:text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{formatDateTimeIndo(actor.verifiedDinasAt || (actor.surveyData as any)?.tanggalSurvey || actor.createdAt)}</span>
                    </div>

                    {/* Petugas Survey */}
                    <div className="text-[11px] md:text-xs font-bold text-emerald-300 uppercase truncate pr-2">
                      {getSurveyorName(actor)}
                    </div>

                    {/* Status Badge */}
                    <div className="text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] md:text-[10px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-sm">
                        Cek Berkas
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

          {/* Table Footer Stats */}
          <div className="shrink-0 pt-1.5 mt-1 border-t border-indigo-500/20 flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-extrabold uppercase">
              Total Antrean: <strong className="text-indigo-300 font-mono">{systemStats?.detailedStatus?.verifikasi ?? 0} Pelaku Usaha</strong>
            </span>
            <span className="text-slate-500 text-[9px]">Pembaruan Otomatis Realtime</span>
          </div>

        </div>

        {/* TABEL 2: HASIL DINAS (TAHAP 3) */}
        <div className="bg-[#0f172a] border border-teal-500/40 rounded-2xl p-2.5 md:p-3 shadow-xl flex flex-col justify-between min-h-0 overflow-hidden">
          
          {/* Table Header Top Bar */}
          <div className="shrink-0 flex items-center justify-between pb-1.5 mb-1.5 border-b border-teal-500/30">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0">
                <ListChecks className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs md:text-sm font-black text-white uppercase tracking-tight">
                    Hasil Dinas
                  </h2>
                  <span className="bg-teal-500/30 text-teal-200 border border-teal-400/40 text-[9px] font-black uppercase px-1.5 py-0.2 rounded">
                    Tahap 3
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 font-medium leading-none">
                  10 Pelaku Usaha Terakhir Selesai Verifikasi Berkas Dinas
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex text-[10px] font-bold text-teal-300 bg-teal-950/80 border border-teal-800/80 px-2 py-0.5 rounded-lg">
              10 Terkini
            </span>
          </div>

          {/* Table Container with 10 Flex Rows filling 100% height */}
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-700/80 bg-[#090e1a] overflow-hidden">
            
            {/* Column Headers */}
            <div className="shrink-0 grid grid-cols-[34px_1fr_150px_140px_90px] md:grid-cols-[38px_1fr_175px_150px_95px] items-center bg-[#1e293b] border-b border-slate-700 px-2 py-1.5 text-[10px] md:text-[11px] font-black uppercase text-teal-300 tracking-wider">
              <div className="text-center">No</div>
              <div className="pl-1">Pelaku Usaha</div>
              <div>Waktu Verifikasi</div>
              <div>Petugas Verifikator</div>
              <div className="text-center">Status</div>
            </div>

            {/* 10 Stretch Rows */}
            <div className="flex-1 flex flex-col justify-between min-h-0 divide-y divide-slate-800/80">
              {isTableLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 font-bold">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-400 mb-1" />
                  <span>Memuat Data...</span>
                </div>
              ) : latestHasilVerifikasi.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 font-bold uppercase text-xs">
                  Belum ada data Hasil Dinas terbaru
                </div>
              ) : (
                latestHasilVerifikasi.map((actor, idx) => (
                  <div 
                    key={actor.id || idx}
                    className={cn(
                      "flex-1 min-h-0 grid grid-cols-[34px_1fr_150px_140px_90px] md:grid-cols-[38px_1fr_175px_150px_95px] items-center px-2 transition-colors hover:bg-teal-950/60",
                      idx % 2 === 0 ? "bg-[#0b1329]" : "bg-[#0f172a]"
                    )}
                  >
                    {/* No */}
                    <div className="text-center font-bold font-mono text-slate-400 text-xs">
                      {idx + 1}
                    </div>

                    {/* Pelaku Usaha */}
                    <div className="min-w-0 pr-2 pl-1">
                      <div className="font-extrabold text-white uppercase text-xs md:text-[13px] tracking-tight truncate leading-tight">
                        {actor.fullName || '-'}
                      </div>
                      <div className="text-[10px] md:text-[11px] text-teal-300 font-semibold truncate leading-tight mt-0.5">
                        {actor.businessName || 'Usaha'} • <span className="text-slate-400 font-normal">{actor.kelurahan || '-'}</span>
                      </div>
                    </div>

                    {/* Waktu Verifikasi */}
                    <div className="whitespace-nowrap text-[11px] md:text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{formatDateTimeIndo(actor.berkasDinasVerifiedAt || actor.verifiedDinasAt || actor.createdAt)}</span>
                    </div>

                    {/* Petugas Verifikator */}
                    <div className="text-[11px] md:text-xs font-bold text-emerald-300 uppercase truncate pr-2">
                      {getVerifikatorName(actor)}
                    </div>

                    {/* Status Badge */}
                    <div className="text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] md:text-[10px] font-extrabold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-sm">
                        ✓ Lolos Berkas
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

          {/* Table Footer Stats */}
          <div className="shrink-0 pt-1.5 mt-1 border-t border-teal-500/20 flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-extrabold uppercase">
              Total Selesai: <strong className="text-teal-300 font-mono">{systemStats?.detailedStatus?.hasilVerifikasi ?? 0} Pelaku Usaha</strong>
            </span>
            <span className="text-slate-500 text-[9px]">Pembaruan Otomatis Realtime</span>
          </div>

        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. BAGIAN BAWAH: FOOTER (CLOCK, RUNNING TEXT & COUNTDOWN EVENT)
      ────────────────────────────────────────────────────────────── */}
      <footer className="shrink-0 rounded-2xl overflow-hidden bg-slate-900/95 border border-slate-800 shadow-2xl">
        
        {/* Row 1: Running Text (Marquee) */}
        <div className="w-full bg-[#042f2e] border-b border-cyan-500/30 py-1 overflow-hidden flex items-center">
          <div className="bg-cyan-500 text-slate-950 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest shrink-0 flex items-center gap-1 shadow ml-1.5 rounded">
            <Radio className="w-3 h-3 animate-pulse text-slate-950" />
            PENGUMUMAN
          </div>
          <div className="relative flex overflow-x-hidden whitespace-nowrap flex-1">
            <div className="animate-marquee inline-block whitespace-nowrap">
              <span className="text-[11px] font-extrabold text-cyan-200 uppercase tracking-widest px-6">
                {runningText}
              </span>
              <span className="text-cyan-400/50 mx-3">•</span>
              <span className="text-[11px] font-extrabold text-cyan-200 uppercase tracking-widest px-6">
                {runningText}
              </span>
              <span className="text-cyan-400/50 mx-3">•</span>
            </div>
          </div>
        </div>

        {/* Row 2: Bottom Bar (Sudut Kiri Clock, Sudut Kanan Countdown Event) */}
        <div className="px-3 py-1.5 md:px-4 md:py-1.5 flex items-center justify-between gap-2">
          
          {/* SUDUT KIRI: REALTIME CLOCK */}
          <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 px-3 py-1 rounded-xl shrink-0">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
            <div className="flex items-baseline gap-2">
              <span className="text-sm md:text-base font-black text-white font-mono tracking-wider">
                {currentTime ? currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':') : '--:--:--'}
                <span className="text-[9px] text-cyan-400 font-bold ml-0.5">WIB</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase hidden md:inline">
                {currentTime ? currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''}
              </span>
            </div>
          </div>

          {/* SUDUT KANAN: COUNTDOWN EVENT */}
          {activeEvent ? (
            <div className="flex items-center gap-2 bg-slate-950/90 border border-cyan-500/40 px-3 py-1 rounded-xl shrink-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-0.5">
                  <Calendar className="w-2.5 h-2.5" />
                  EVENT
                </span>
                <span className="text-[10px] md:text-xs font-black text-cyan-200 uppercase truncate max-w-[150px] sm:max-w-[250px]">
                  {activeEvent.description || 'Jadwal Event'}
                </span>
              </div>
              <EventTimerDisplay targetDate={activeEvent.endDate || activeEvent.date} startDate={activeEvent.startDate} />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 px-2.5 py-1 rounded-xl text-slate-500 text-[10px] font-bold uppercase shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
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

// Subcomponent for Event Timer Display (Compact)
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
    return <span className="text-[10px] font-bold text-slate-500 uppercase">Selesai</span>;
  }

  return (
    <div className="flex items-center gap-1 font-mono text-[11px] font-black text-white">
      <span className="text-amber-300">{timeLeft.days}h</span>
      <span className="text-cyan-400">:</span>
      <span className="text-white">{timeLeft.hours.toString().padStart(2, '0')}j</span>
      <span className="text-cyan-400">:</span>
      <span className="text-white">{timeLeft.minutes.toString().padStart(2, '0')}m</span>
      <span className="text-cyan-400">:</span>
      <span className="text-cyan-300">{timeLeft.seconds.toString().padStart(2, '0')}d</span>
    </div>
  );
}
