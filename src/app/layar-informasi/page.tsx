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
  Store, 
  Radio, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function LayarInformasiPage() {
  const database = useDatabase();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // 1. Fetch pre-calculated real-time statistics
  const statsRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'system_stats');
  }, [database]);
  const { data: systemStats, isLoading: isStatsLoading } = useObject(statsRef);

  // 2. Fetch verified_dinas actors for the 10 latest tables
  const verifiedDinasQuery = useMemoFirebase(() => {
    if (!database) return null;
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('verified_dinas'));
  }, [database]);
  const { data: verifiedDinasData, isLoading: isTableLoading } = useList<BusinessActor>(verifiedDinasQuery);

  // 3. Running Text
  const runningTextRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/running_text');
  }, [database]);
  const { data: runningTextConfig } = useObject(runningTextRef);
  const defaultRunningText = "SELAMAT DATANG DI APLIKASI SISTEM INFORMASI MANAJEMEN PELAKU USAHA (SIMPU) TAHUN 2026 - DINAS TENAGA KERJA, KOPERASI DAN USAHA MIKRO KOTA TANJUNGPINANG • INFORMASI STATUS VERIFIKASI DATA DAN HASIL SURVEY DINAS DAPAT DIPANTAU SECARA REALTIME";
  const runningText = (typeof runningTextConfig === 'string' ? runningTextConfig : runningTextConfig?.text) || defaultRunningText;

  // 4. Event Info Countdown
  const eventInfoRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/event_info');
  }, [database]);
  const { data: eventInfo } = useObject(eventInfoRef);
  const activeEvent = useActiveEvent(eventInfo);

  // Clock interval
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if actor is cancelled by dinas
  const isCancelDinas = (d: any) => {
    const s = (d?.status || '').toLowerCase();
    return (s === 'verified_dinas' && d.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(d.alasanCancelDinas);
  };

  // Helper to extract surveyor name
  const getSurveyorName = (d: BusinessActor) => {
    return (
      d.petugasSurvey ||
      (d.surveyData as any)?.petugasSurvey ||
      d.surveyData?.pejabatData?.petugas?.nama ||
      d.verifiedDinasBy ||
      '-'
    );
  };

  // Helper to extract verifikator name
  const getVerifikatorName = (d: BusinessActor) => {
    return (
      d.berkasDinasVerifiedBy ||
      d.verifikatorDinas ||
      d.pejabatData?.verifikator?.nama ||
      '-'
    );
  };

  // 10 Pelaku Usaha terakhir di Verifikasi Dinas (Tahap 2: Menunggu Cek Berkas)
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

  // 10 Pelaku Usaha terakhir di Hasil Dinas (Tahap 3: Selesai Cek Berkas / Lolos Final)
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

  // Stats Card Values
  const cardStats = [
    {
      title: "Total Data Terverifikasi",
      count: systemStats?.status?.verified ?? 0,
      icon: UserCheck,
      bgGradient: "from-emerald-600 via-emerald-700 to-teal-800",
      iconBg: "bg-emerald-400/20 text-emerald-300",
      accentBorder: "border-emerald-400/30",
      glowColor: "shadow-emerald-900/20"
    },
    {
      title: "Cancell",
      count: systemStats?.status?.rejected ?? 0,
      icon: UserX,
      bgGradient: "from-rose-600 via-red-700 to-orange-800",
      iconBg: "bg-rose-400/20 text-rose-300",
      accentBorder: "border-rose-400/30",
      glowColor: "shadow-rose-900/20"
    },
    {
      title: "Survey Dinas",
      subtitle: "Tahap 1",
      count: systemStats?.detailedStatus?.survey ?? 0,
      icon: ClipboardCheck,
      bgGradient: "from-fuchsia-600 via-purple-700 to-violet-800",
      iconBg: "bg-fuchsia-400/20 text-fuchsia-300",
      accentBorder: "border-fuchsia-400/30",
      glowColor: "shadow-fuchsia-900/20"
    },
    {
      title: "Verifikasi Dinas",
      subtitle: "Tahap 2",
      count: systemStats?.detailedStatus?.verifikasi ?? 0,
      icon: FileText,
      bgGradient: "from-indigo-600 via-blue-700 to-sky-800",
      iconBg: "bg-indigo-400/20 text-indigo-300",
      accentBorder: "border-indigo-400/30",
      glowColor: "shadow-indigo-900/20"
    },
    {
      title: "Hasil Dinas",
      subtitle: "Tahap 3",
      count: systemStats?.detailedStatus?.hasilVerifikasi ?? 0,
      icon: ListChecks,
      bgGradient: "from-teal-600 via-teal-700 to-cyan-800",
      iconBg: "bg-teal-400/20 text-teal-300",
      accentBorder: "border-teal-400/30",
      glowColor: "shadow-teal-900/20"
    },
    {
      title: "Rekening Terinput",
      subtitle: "Tahap 4 Final",
      count: systemStats?.detailedStatus?.selesai ?? systemStats?.status?.finish ?? 0,
      icon: CreditCard,
      bgGradient: "from-blue-600 via-sky-700 to-cyan-800",
      iconBg: "bg-blue-400/20 text-blue-300",
      accentBorder: "border-blue-400/30",
      glowColor: "shadow-blue-900/20"
    }
  ];

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-white relative overflow-x-hidden">
      {/* Background Glow effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 w-[700px] h-[400px] bg-teal-600/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col p-4 md:p-6 lg:p-8 space-y-6 max-w-[1920px] mx-auto w-full">
        
        {/* ─────────────────────────────────────────────────────────────
            HEADER COMMAND CENTER
        ────────────────────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-4 md:px-6 md:py-4 rounded-3xl border shadow-2xl">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-2 ring-white/20 shrink-0">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 animate-pulse">
                  LIVE DISPLAY
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  DINAS TENAGA KERJA, KOPERASI DAN USAHA MIKRO
                </span>
              </div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300 uppercase tracking-tight font-headline">
                Layar Informasi Pelaku Usaha (SIMPU)
              </h1>
            </div>
          </div>

          {/* Action & Realtime Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-4 py-2 rounded-2xl shadow-inner">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Sistem Terhubung
              </span>
            </div>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh (TV Display)"}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-slate-200 border border-slate-700 px-4 py-2 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Keluar Layar Penuh</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Layar Penuh (F11)</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            BAGIAN ATAS: 6 CARD WIDGET STATISTIK REAL-TIME
        ────────────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {cardStats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={cn(
                  "relative overflow-hidden rounded-3xl p-4 md:p-5 flex flex-col justify-between border transition-all duration-300 hover:scale-[1.02] shadow-xl bg-gradient-to-br",
                  item.bgGradient,
                  item.accentBorder,
                  item.glowColor
                )}
              >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 translate-x-3 -translate-y-3 opacity-15 pointer-events-none">
                  <Icon className="w-24 h-24 text-white" />
                </div>

                <div className="flex items-center justify-between gap-2 relative z-10">
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white/80 line-clamp-1">
                    {item.title}
                  </span>
                  <div className={cn("p-2 rounded-xl backdrop-blur-md shrink-0", item.iconBg)}>
                    <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                </div>

                <div className="mt-4 relative z-10">
                  <div className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md font-mono">
                    {isStatsLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-white/70" />
                    ) : (
                      (item.count || 0).toLocaleString('id-ID')
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                      {item.subtitle || "Data Realtime"}
                    </span>
                    <span className="inline-flex items-center text-[9px] font-bold text-emerald-200 bg-black/20 px-2 py-0.5 rounded-full">
                      ✓ Aktif
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* ─────────────────────────────────────────────────────────────
            BAGIAN TENGAH: TABEL 10 PELAKU USAHA TERAKHIR
            - Kiri: 10 Masuk Verifikasi Dinas (Tahap 2)
            - Kanan: 10 Masuk Hasil Dinas (Tahap 3)
        ────────────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          
          {/* TABEL 1: VERIFIKASI DINAS (10 NAMA TERAKHIR) */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-5 shadow-2xl flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base md:text-lg font-black text-white uppercase tracking-tight">
                        Verifikasi Dinas
                      </h2>
                      <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-[10px] font-black uppercase">
                        Tahap 2
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      10 Pelaku Usaha Terakhir Masuk Verifikasi Dinas (Menunggu Cek Berkas)
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-indigo-950/60 border border-indigo-800/60 rounded-xl text-[10px] font-bold text-indigo-300">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  10 Data Terkini
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
                <Table>
                  <TableHeader className="bg-slate-950/80">
                    <TableRow className="border-b border-slate-800 hover:bg-transparent">
                      <TableHead className="w-12 text-center text-xs font-black uppercase text-indigo-300">No</TableHead>
                      <TableHead className="text-xs font-black uppercase text-indigo-300">Pelaku Usaha</TableHead>
                      <TableHead className="text-xs font-black uppercase text-indigo-300">Waktu Masuk</TableHead>
                      <TableHead className="text-xs font-black uppercase text-indigo-300">Petugas Survey</TableHead>
                      <TableHead className="text-center text-xs font-black uppercase text-indigo-300">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isTableLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Memuat Data Verifikasi Dinas...</p>
                        </TableCell>
                      </TableRow>
                    ) : latestVerifikasiDinas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center text-slate-500">
                          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                          <p className="text-xs font-bold uppercase tracking-wider">Belum ada antrean data Verifikasi Dinas</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      latestVerifikasiDinas.map((actor, idx) => (
                        <TableRow 
                          key={actor.id || idx} 
                          className="border-b border-slate-800/50 hover:bg-indigo-950/30 transition-colors group"
                        >
                          <TableCell className="text-center font-bold font-mono text-xs text-slate-400">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="font-black text-xs md:text-sm text-slate-100 uppercase group-hover:text-indigo-300 transition-colors">
                              {actor.fullName || '-'}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-semibold text-slate-300">{actor.businessName || 'Usaha'}</span>
                              <span>•</span>
                              <span className="text-slate-400">{actor.kelurahan || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 whitespace-nowrap">
                            <div className="text-[11px] font-bold text-slate-300 font-mono flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-indigo-400" />
                              {formatDateTimeIndo(actor.verifiedDinasAt || (actor.surveyData as any)?.tanggalSurvey || actor.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="text-xs font-bold text-indigo-200 uppercase tracking-wide">
                              {getSurveyorName(actor)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Cek Berkas
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold uppercase tracking-wider">
                Total Antrean: <strong className="text-indigo-400 font-mono">{systemStats?.detailedStatus?.verifikasi ?? 0} Pelaku Usaha</strong>
              </span>
              <span className="text-slate-500 text-[10px]">Pembaruan Otomatis Realtime</span>
            </div>
          </div>

          {/* TABEL 2: HASIL DINAS (10 NAMA TERAKHIR) */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-teal-500/30 rounded-3xl p-5 shadow-2xl flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-teal-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400 shadow-inner">
                    <ListChecks className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base md:text-lg font-black text-white uppercase tracking-tight">
                        Hasil Dinas
                      </h2>
                      <Badge className="bg-teal-500/20 text-teal-300 border-teal-400/30 text-[10px] font-black uppercase">
                        Tahap 3
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      10 Pelaku Usaha Terakhir Lolos Verifikasi Berkas Dinas
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-teal-950/60 border border-teal-800/60 rounded-xl text-[10px] font-bold text-teal-300">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  10 Data Terkini
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
                <Table>
                  <TableHeader className="bg-slate-950/80">
                    <TableRow className="border-b border-slate-800 hover:bg-transparent">
                      <TableHead className="w-12 text-center text-xs font-black uppercase text-teal-300">No</TableHead>
                      <TableHead className="text-xs font-black uppercase text-teal-300">Pelaku Usaha</TableHead>
                      <TableHead className="text-xs font-black uppercase text-teal-300">Waktu Verifikasi</TableHead>
                      <TableHead className="text-xs font-black uppercase text-teal-300">Petugas Verifikator</TableHead>
                      <TableHead className="text-center text-xs font-black uppercase text-teal-300">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isTableLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-teal-400 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Memuat Data Hasil Dinas...</p>
                        </TableCell>
                      </TableRow>
                    ) : latestHasilVerifikasi.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center text-slate-500">
                          <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                          <p className="text-xs font-bold uppercase tracking-wider">Belum ada data Hasil Dinas terbaru</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      latestHasilVerifikasi.map((actor, idx) => (
                        <TableRow 
                          key={actor.id || idx} 
                          className="border-b border-slate-800/50 hover:bg-teal-950/30 transition-colors group"
                        >
                          <TableCell className="text-center font-bold font-mono text-xs text-slate-400">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="font-black text-xs md:text-sm text-slate-100 uppercase group-hover:text-teal-300 transition-colors">
                              {actor.fullName || '-'}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-semibold text-slate-300">{actor.businessName || 'Usaha'}</span>
                              <span>•</span>
                              <span className="text-slate-400">{actor.kelurahan || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 whitespace-nowrap">
                            <div className="text-[11px] font-bold text-slate-300 font-mono flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-teal-400" />
                              {formatDateTimeIndo(actor.berkasDinasVerifiedAt || actor.verifiedDinasAt || actor.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="text-xs font-bold text-teal-200 uppercase tracking-wide">
                              {getVerifikatorName(actor)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              ✓ Lolos Berkas
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold uppercase tracking-wider">
                Total Selesai Berkas: <strong className="text-teal-400 font-mono">{systemStats?.detailedStatus?.hasilVerifikasi ?? 0} Pelaku Usaha</strong>
              </span>
              <span className="text-slate-500 text-[10px]">Pembaruan Otomatis Realtime</span>
            </div>
          </div>

        </section>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          BAGIAN BAWAH: FOOTER BAR (CLOCK, RUNNING TEXT & COUNTDOWN EVENT)
      ────────────────────────────────────────────────────────────── */}
      <footer className="relative z-20 w-full bg-slate-900/95 border-t border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        
        {/* Row 1: Running Text (Marquee) */}
        <div className="w-full bg-gradient-to-r from-teal-900 via-cyan-900 to-blue-950 border-b border-cyan-500/20 py-2 overflow-hidden flex items-center">
          <div className="bg-cyan-500 text-slate-950 px-4 py-0.5 text-[11px] font-black uppercase tracking-widest shrink-0 flex items-center gap-1.5 shadow-md ml-2 rounded-lg">
            <Radio className="w-3.5 h-3.5 animate-pulse text-slate-950" />
            PENGUMUMAN
          </div>
          <div className="relative flex overflow-x-hidden whitespace-nowrap flex-1">
            <div className="animate-marquee inline-block whitespace-nowrap">
              <span className="text-xs font-bold text-cyan-100 uppercase tracking-widest px-8 drop-shadow">
                {runningText}
              </span>
              <span className="text-cyan-400/50 mx-4">•</span>
              <span className="text-xs font-bold text-cyan-100 uppercase tracking-widest px-8 drop-shadow">
                {runningText}
              </span>
              <span className="text-cyan-400/50 mx-4">•</span>
            </div>
          </div>
        </div>

        {/* Row 2: Bottom Bar (Realtime Clock di Sudut Kiri, Countdown Event di Sudut Kanan) */}
        <div className="p-3 md:px-8 md:py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* SUDUT KIRI: REALTIME CLOCK */}
          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-2xl shadow-inner shrink-0">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-400">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-black text-white font-mono tracking-wider leading-none">
                {currentTime ? currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':') : '--:--:--'}
                <span className="text-xs font-bold text-cyan-400 ml-1">WIB</span>
              </div>
              <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                {currentTime ? currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Memuat Waktu...'}
              </div>
            </div>
          </div>

          {/* SUDUT KANAN: COUNTDOWN EVENT */}
          {activeEvent ? (
            <div className="flex items-center gap-3 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/80 border border-cyan-500/30 px-4 py-2 rounded-2xl shadow-lg shrink-0">
              <div className="flex flex-col items-start sm:items-end">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    EVENT MENDATANG
                  </span>
                  <span className="text-xs font-black text-cyan-200 uppercase tracking-tight truncate max-w-[200px] md:max-w-[280px]">
                    {activeEvent.description || 'Jadwal Event'}
                  </span>
                </div>
                {/* Event Timer Display */}
                <EventTimerDisplay targetDate={activeEvent.endDate || activeEvent.date} startDate={activeEvent.startDate} />
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 hidden sm:flex">
                <Sparkles className="w-6 h-6 text-yellow-400 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-2xl text-slate-500 text-xs font-bold uppercase tracking-wider shrink-0">
              <Calendar className="w-4 h-4 text-slate-600" />
              <span>Tidak Ada Event Aktif Saat Ini</span>
            </div>
          )}

        </div>
      </footer>

      {/* Marquee Animation Keyframes */}
      <style jsx>{`
        .animate-marquee {
          display: inline-block;
          animation: marquee 75s linear infinite;
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

// Subcomponent for Event Countdown Timer Display
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
    return <span className="text-xs font-bold text-slate-500 uppercase mt-1">Event Telah Berakhir</span>;
  }

  return (
    <div className="flex items-center gap-1.5 md:gap-2 mt-1">
      {/* Hari */}
      <div className="flex flex-col items-center min-w-[28px]">
        <span className="text-sm md:text-base font-black text-white font-mono leading-none">{timeLeft.days}</span>
        <span className="text-[8px] font-bold text-cyan-200 uppercase tracking-tighter">Hari</span>
      </div>
      <span className="text-xs font-black text-cyan-400 animate-pulse -mt-2">:</span>

      {/* Jam */}
      <div className="flex flex-col items-center min-w-[28px]">
        <span className="text-sm md:text-base font-black text-white font-mono leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
        <span className="text-[8px] font-bold text-cyan-200 uppercase tracking-tighter">Jam</span>
      </div>
      <span className="text-xs font-black text-cyan-400 animate-pulse -mt-2">:</span>

      {/* Menit */}
      <div className="flex flex-col items-center min-w-[28px]">
        <span className="text-sm md:text-base font-black text-white font-mono leading-none">{timeLeft.minutes.toString().padStart(2, '0')}</span>
        <span className="text-[8px] font-bold text-cyan-200 uppercase tracking-tighter">Menit</span>
      </div>
      <span className="text-xs font-black text-cyan-400 animate-pulse -mt-2">:</span>

      {/* Detik */}
      <div className="flex flex-col items-center min-w-[28px]">
        <span className="text-sm md:text-base font-black text-cyan-300 font-mono leading-none">{timeLeft.seconds.toString().padStart(2, '0')}</span>
        <span className="text-[8px] font-bold text-cyan-200 uppercase tracking-tighter">Detik</span>
      </div>
    </div>
  );
}
