'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDatabase, useObject, useList, useMemoFirebase } from '@/firebase';
import { ref, query, orderByChild, equalTo, limitToLast } from 'firebase/database';
import { BusinessActor } from '../lib/types';
import { cn } from '@/lib/utils';
import { 
  ShieldCheck, 
  XCircle, 
  UserCheck, 
  ClipboardCheck, 
  FileText, 
  ListChecks, 
  Landmark, 
  Maximize2, 
  Minimize2, 
  Clock, 
  RotateCw, 
  Info, 
  Store, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  Users, 
  Radio, 
  Megaphone, 
  UserX,
  TrendingUp,
  Sparkles,
  Activity,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import Image from 'next/image';

// Modern Precision Chrono Clock Component
const ModernChronoClock = ({ date }: { date: Date | null }) => {
  if (!date) return null;
  const seconds = date.getSeconds();
  const minutes = date.getMinutes();
  const hours = date.getHours() % 12;

  const secDeg = (seconds / 60) * 360;
  const minDeg = ((minutes + seconds / 60) / 60) * 360;
  const hourDeg = ((hours + minutes / 60) / 12) * 360;

  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-cyan-400/50 bg-gradient-to-br from-[#0c162d] to-[#050b18] shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center justify-center shrink-0 ring-2 ring-cyan-500/20">
      {/* Outer Glow Ring */}
      <div className="absolute inset-0 rounded-full bg-cyan-500/5 pointer-events-none" />

      {/* Clock Face Markers */}
      <div className="absolute inset-1 rounded-full border border-cyan-500/20">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-full h-full text-center"
            style={{ transform: `rotate(${i * 30}deg)` }}
          >
            <div
              className={cn(
                "w-0.5 mx-auto rounded-full transition-all",
                i % 3 === 0 ? "h-2 bg-cyan-300 shadow-[0_0_6px_rgba(6,182,212,0.8)]" : "h-1 bg-cyan-400/40"
              )}
            />
          </div>
        ))}
      </div>

      {/* Clock Center Pin */}
      <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 z-30 shadow-[0_0_8px_rgba(6,182,212,0.9)] ring-2 ring-white/60" />

      {/* Hour Hand */}
      <div
        className="absolute w-1 bg-gradient-to-t from-slate-200 to-white rounded-full origin-bottom z-10 shadow-md"
        style={{
          height: '24%',
          bottom: '50%',
          left: 'calc(50% - 2px)',
          transform: `rotate(${hourDeg}deg)`,
          transformOrigin: '50% 100%'
        }}
      />

      {/* Minute Hand */}
      <div
        className="absolute w-0.5 bg-gradient-to-t from-cyan-400 to-cyan-200 rounded-full origin-bottom z-20 shadow-[0_0_6px_rgba(6,182,212,0.7)]"
        style={{
          height: '35%',
          bottom: '50%',
          left: 'calc(50% - 1px)',
          transform: `rotate(${minDeg}deg)`,
          transformOrigin: '50% 100%'
        }}
      />

      {/* Second Hand */}
      <div
        className="absolute w-0.5 bg-rose-400 rounded-full origin-bottom z-25 shadow-[0_0_6px_rgba(244,63,94,0.9)]"
        style={{
          height: '42%',
          bottom: '50%',
          left: 'calc(50% - 1px)',
          transform: `rotate(${secDeg}deg)`,
          transformOrigin: '50% 100%'
        }}
      />
    </div>
  );
};

// Helper format date time
const formatDateTime = (val: any) => {
  if (!val) return '-';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${mins}`;
  } catch {
    return '-';
  }
};

export default function LayarInformasiPage() {
  const database = useDatabase();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  // Active selected stat category (Ordered: verified -> survey -> verifikasi -> hasil -> rekening -> cancel -> cancel_pendataan)
  const [activeCategory, setActiveCategory] = useState<'verified' | 'survey' | 'verifikasi' | 'hasil' | 'rekening' | 'cancel' | 'cancel_pendataan'>('survey');

  // 1. Fetch real-time system stats
  const statsRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'system_stats');
  }, [database]);
  const { data: systemStats } = useObject(statsRef);

  // 2. Query for verified_actor / general actors
  const verifiedActorQuery = useMemoFirebase(() => {
    if (!database) return null;
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('verified_actor'), limitToLast(100));
  }, [database]);
  const { data: verifiedActorData, isLoading: isVerifiedActorLoading } = useList<BusinessActor>(verifiedActorQuery);

  // 3. Query for verified_dinas actors
  const verifiedDinasQuery = useMemoFirebase(() => {
    if (!database) return null;
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('verified_dinas'), limitToLast(100));
  }, [database]);
  const { data: verifiedDinasData, isLoading: isVerifiedDinasLoading } = useList<BusinessActor>(verifiedDinasQuery);

  // 4. Query for survey dinas (lpj_pending) actors
  const surveyDinasQuery = useMemoFirebase(() => {
    if (!database) return null;
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('lpj_pending'), limitToLast(100));
  }, [database]);
  const { data: surveyDinasData, isLoading: isSurveyLoading } = useList<BusinessActor>(surveyDinasQuery);

  // 5. Query for finish / rekening terinput actors
  const finishQuery = useMemoFirebase(() => {
    if (!database) return null;
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('finish'), limitToLast(100));
  }, [database]);
  const { data: finishData, isLoading: isFinishLoading } = useList<BusinessActor>(finishQuery);

  // 6. Query for Cancel Dinas
  const cancelDinasQuery = useMemoFirebase(() => {
    if (!database) return null;
    return query(ref(database, 'businessActors'), orderByChild('hasilVerifikasiDinas'), equalTo('Tidak Lolos'), limitToLast(100));
  }, [database]);
  const { data: cancelDinasData, isLoading: isCancelLoading } = useList<BusinessActor>(cancelDinasQuery);

  // 7. Query for Cancel Pendataan (status === 'rejected', strictly pendataan cancellations)
  const cancelPendataanQuery = useMemoFirebase(() => {
    if (!database) return null;
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('rejected'), limitToLast(100));
  }, [database]);
  const { data: cancelPendataanData, isLoading: isCancelPendataanLoading } = useList<BusinessActor>(cancelPendataanQuery);

  // System Users lookup for resolving staff names
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

  // Running Text
  const runningTextRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/running_text');
  }, [database]);
  const { data: runningTextConfig } = useObject(runningTextRef);
  const defaultRunningText = "SELAMAT DATANG DI SISTEM INFORMASI MANAGEMEN PELAKU USAHA ( SIMPU ) YAYASAN TUNAS BANGSA KEPULAUAN RIAU TAHUN 2026 | LAYANAN INI SENGAJA DIBUAT DAN DIKEMBANGKAN DALAM RANGKA MEMPERMUDAH PENDATAAN DAN MONITORING PROSES PENYALURAN BANTUAN | SEMUA DATA TERSIMPAN DI DATABASE PIHAK YAYASAN DAN SEPENUHNYA MENJADI KEWENANGAN YAYASAN DALAM PENGELOLAAN DAN PENYIMPANAN DATA | STATUS LAYANAN INI BERSIFAT REALTIME ( ONLINE ) DAN BISA DIAKSES OLEH SEMUA PEMILIK HAK AKSES APLIKASI";
  const runningText = (typeof runningTextConfig === 'string' ? runningTextConfig : runningTextConfig?.text) || defaultRunningText;

  // Last Sync Time from system_stats
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    return systemStats?.lastUpdated ? new Date(systemStats.lastUpdated) : new Date();
  });

  useEffect(() => {
    if (systemStats?.lastUpdated) {
      const d = new Date(systemStats.lastUpdated);
      if (!isNaN(d.getTime())) {
        setLastSyncTime(d);
      }
    }
  }, [systemStats?.lastUpdated]);

  const [nextSyncIn, setNextSyncIn] = useState<number>(300);
  const isSyncingGuardRef = useRef(false);

  const triggerAutoSync = async () => {
    if (!database || isSyncingGuardRef.current) return;
    isSyncingGuardRef.current = true;
    try {
      const { recalculateAndSaveSystemStats } = await import("@/lib/stats-service");
      await recalculateAndSaveSystemStats(database);
    } catch (err) {
      console.error("[Layar Informasi Auto-Sync] Error:", err);
    } finally {
      isSyncingGuardRef.current = false;
    }
  };

  const triggerAutoSyncRef = useRef(triggerAutoSync);
  triggerAutoSyncRef.current = triggerAutoSync;

  // Real-time Countdown timer for Auto Sync synchronized with systemStats.lastUpdated (every 5 minutes)
  useEffect(() => {
    const SYNC_INTERVAL_SEC = 300;

    const calculateRemaining = () => {
      if (!systemStats?.lastUpdated) return 0;
      const lastTime = new Date(systemStats.lastUpdated).getTime();
      if (isNaN(lastTime)) return 0;

      const elapsedSec = Math.floor((Date.now() - lastTime) / 1000);
      if (elapsedSec >= SYNC_INTERVAL_SEC) {
        return 0;
      }
      return Math.max(0, SYNC_INTERVAL_SEC - elapsedSec);
    };

    const initialRemaining = calculateRemaining();
    setNextSyncIn(initialRemaining);

    if (initialRemaining === 0) {
      triggerAutoSyncRef.current();
    }

    const timer = setInterval(() => {
      const remaining = calculateRemaining();
      setNextSyncIn(remaining);

      if (remaining <= 0) {
        triggerAutoSyncRef.current();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [systemStats?.lastUpdated, database]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

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
    const raw = d.petugasSurvey || (d.surveyData as any)?.petugasSurvey || pejabatNama || d.verifiedDinasBy || d.coordinator;
    if (raw) {
      const cleanStr = String(raw).trim();
      const cleanDigits = cleanStr.replace(/\D/g, '');
      if (cleanDigits && userLookup[cleanDigits]) return userLookup[cleanDigits];
      if (userLookup[cleanStr.toLowerCase()]) return userLookup[cleanStr.toLowerCase()];
      return raw;
    }
    return d.coordinator || '-';
  };

  // Helper verifikator name
  const getVerifikatorName = (d: BusinessActor) => {
    const pejabatNama = d.pejabatData?.verifikator?.nama || d.surveyData?.pejabatData?.verifikator?.nama;
    if (pejabatNama && !/^\d+$/.test(pejabatNama.trim())) {
      return pejabatNama;
    }
    if (d.verifikatorDinas && !/^\d+$/.test(d.verifikatorDinas.trim())) {
      return d.verifikatorDinas;
    }
    if (d.berkasDinasVerifiedBy && !/^\d+$/.test(d.berkasDinasVerifiedBy.trim()) && !d.berkasDinasVerifiedBy.includes('@')) {
      return d.berkasDinasVerifiedBy;
    }
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
    return d.verifikatorDinas || d.berkasDinasVerifiedBy || pejabatNama || '-';
  };

  // Helper to get raw submit date for a specific category
  const getActorSubmitDate = (actor: any, category?: string): any => {
    if (!actor) return null;
    if (category === 'hasil') {
      return actor.berkasDinasVerifiedAt || actor.verifiedDinasAt || actor.surveyData?.tanggalSurvey || actor.createdAt;
    }
    if (category === 'verifikasi') {
      return actor.verifiedDinasAt || actor.surveyData?.tanggalSurvey || actor.createdAt;
    }
    if (category === 'survey') {
      return actor.surveyData?.tanggalSurvey || actor.verifiedDinasAt || actor.createdAt;
    }
    if (category === 'rekening') {
      return actor.lpjEntryDate || actor.berkasDinasVerifiedAt || actor.verifiedDinasAt || actor.createdAt;
    }
    if (category === 'cancel') {
      return actor.cancelDinasAt || actor.verifiedDinasAt || actor.createdAt;
    }
    if (category === 'cancel_pendataan') {
      return actor.rejectedAt || actor.updatedAt || actor.createdAt;
    }
    return actor.berkasDinasVerifiedAt || actor.verifiedDinasAt || actor.surveyData?.tanggalSurvey || actor.lpjEntryDate || actor.cancelDinasAt || actor.rejectedAt || actor.createdAt;
  };

  // Helper to extract timestamp for sorting (Terakhir ke Terlama)
  const getActorSubmitTimestamp = (actor: any, category?: string): number => {
    const raw = getActorSubmitDate(actor, category);
    if (!raw) return 0;
    if (typeof raw === 'number') return raw;
    const t = new Date(raw).getTime();
    return isNaN(t) ? 0 : t;
  };

  // Filtered lists for each category (up to 10 latest, ordered from newest to oldest submit time)
  // 1. Data Terverifikasi (Default View)
  const listVerified = useMemo(() => {
    const combined = [
      ...(verifiedActorData || []),
      ...(verifiedDinasData || []).filter(d => !isCancelDinas(d)),
      ...(finishData || [])
    ];
    const map = new Map<string, BusinessActor>();
    combined.forEach(item => {
      if (item && item.id && !isCancelDinas(item)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values())
      .sort((a, b) => getActorSubmitTimestamp(b) - getActorSubmitTimestamp(a))
      .slice(0, 10);
  }, [verifiedActorData, verifiedDinasData, finishData]);

  // 2. Cancell Dinas
  const listCancelDinas = useMemo(() => {
    const map = new Map<string, BusinessActor>();
    (cancelDinasData || []).forEach(d => {
      if (d && d.id) map.set(d.id, d);
    });
    (verifiedDinasData || []).forEach(d => {
      if (d && d.id && isCancelDinas(d)) {
        map.set(d.id, d);
      }
    });
    return Array.from(map.values())
      .sort((a, b) => getActorSubmitTimestamp(b, 'cancel') - getActorSubmitTimestamp(a, 'cancel'))
      .slice(0, 10);
  }, [cancelDinasData, verifiedDinasData]);

  // 3. Survey Dinas
  const listSurveyDinas = useMemo(() => {
    return (surveyDinasData || [])
      .filter(d => !isCancelDinas(d))
      .sort((a, b) => getActorSubmitTimestamp(b, 'survey') - getActorSubmitTimestamp(a, 'survey'))
      .slice(0, 10);
  }, [surveyDinasData]);

  // 4. Verifikasi Dinas (Tahap 2: Menunggu Cek Berkas)
  const listVerifikasiDinas = useMemo(() => {
    if (!verifiedDinasData) return [];
    return verifiedDinasData
      .filter(d => d.status === 'verified_dinas' && d.hasilVerifikasiDinas === 'Lolos' && !d.berkasDinasVerified && !isCancelDinas(d))
      .sort((a, b) => getActorSubmitTimestamp(b, 'verifikasi') - getActorSubmitTimestamp(a, 'verifikasi'))
      .slice(0, 10);
  }, [verifiedDinasData]);

  // 5. Hasil Dinas (Tahap 3: Selesai Cek Berkas)
  const listHasilDinas = useMemo(() => {
    if (!verifiedDinasData) return [];
    return verifiedDinasData
      .filter(d => d.status === 'verified_dinas' && d.hasilVerifikasiDinas === 'Lolos' && Boolean(d.berkasDinasVerified) && !isCancelDinas(d))
      .sort((a, b) => getActorSubmitTimestamp(b, 'hasil') - getActorSubmitTimestamp(a, 'hasil'))
      .slice(0, 10);
  }, [verifiedDinasData]);

  // 6. Rekening Terinput (Tahap 4)
  const listRekeningTerinput = useMemo(() => {
    return (finishData || [])
      .filter(d => !isCancelDinas(d))
      .sort((a, b) => getActorSubmitTimestamp(b, 'rekening') - getActorSubmitTimestamp(a, 'rekening'))
      .slice(0, 10);
  }, [finishData]);

  // 7. Cancell Pendataan (Strictly rejected from pendataan, NOT cancel dinas)
  const listCancelPendataan = useMemo(() => {
    if (!cancelPendataanData) return [];
    return cancelPendataanData
      .filter(d => d.status === 'rejected' && !isCancelDinas(d) && !d.alasanCancelDinas && d.hasilVerifikasiDinas !== 'Tidak Lolos')
      .sort((a, b) => getActorSubmitTimestamp(b, 'cancel_pendataan') - getActorSubmitTimestamp(a, 'cancel_pendataan'))
      .slice(0, 10);
  }, [cancelPendataanData]);

  // Total count strictly for Cancel Pendataan (excluding Cancel Dinas)
  const totalCancelPendataanCount = useMemo(() => {
    if (cancelPendataanData) {
      return cancelPendataanData.filter(d => d.status === 'rejected' && !isCancelDinas(d) && !d.alasanCancelDinas && d.hasilVerifikasiDinas !== 'Tidak Lolos').length;
    }
    return 0;
  }, [cancelPendataanData]);

  // Active current table data based on activeCategory
  const currentTableData = useMemo(() => {
    switch (activeCategory) {
      case 'verified':
        return listVerified;
      case 'survey':
        return listSurveyDinas;
      case 'verifikasi':
        return listVerifikasiDinas;
      case 'hasil':
        return listHasilDinas;
      case 'rekening':
        return listRekeningTerinput;
      case 'cancel':
        return listCancelDinas;
      case 'cancel_pendataan':
        return listCancelPendataan;
      default:
        return listSurveyDinas;
    }
  }, [activeCategory, listVerified, listSurveyDinas, listVerifikasiDinas, listHasilDinas, listRekeningTerinput, listCancelDinas, listCancelPendataan]);

  // Active Category Meta Information
  const activeCategoryMeta = useMemo(() => {
    switch (activeCategory) {
      case 'verified':
        return {
          title: 'Total Data Terverifikasi',
          petugasHeader: 'Petugas / Koordinator',
          color: 'emerald',
          isHasil: false
        };
      case 'survey':
        return {
          title: 'Survey Dinas',
          petugasHeader: 'Petugas Survey',
          color: 'cyan',
          isHasil: false
        };
      case 'verifikasi':
        return {
          title: 'Verifikasi Dinas',
          petugasHeader: 'Petugas Survey',
          color: 'amber',
          isHasil: false
        };
      case 'hasil':
        return {
          title: 'Hasil Dinas',
          petugasHeader: 'Petugas Verifikator',
          color: 'purple',
          isHasil: true
        };
      case 'rekening':
        return {
          title: 'Rekening Terinput',
          petugasHeader: 'Petugas Verifikator',
          color: 'teal',
          isHasil: true
        };
      case 'cancel':
        return {
          title: 'Cancell Dinas',
          petugasHeader: 'Petugas Survey / Koordinator',
          color: 'rose',
          isHasil: false
        };
      case 'cancel_pendataan':
        return {
          title: 'Cancell Pendataan',
          petugasHeader: 'Koordinator',
          color: 'red',
          isHasil: false
        };
      default:
        return {
          title: 'Survey Dinas',
          petugasHeader: 'Petugas Survey',
          color: 'cyan',
          isHasil: false
        };
    }
  }, [activeCategory]);

  const isLoadingCurrentTable = useMemo(() => {
    if (activeCategory === 'verified') return isVerifiedActorLoading || isVerifiedDinasLoading || isFinishLoading;
    if (activeCategory === 'survey') return isSurveyLoading;
    if (activeCategory === 'verifikasi') return isVerifiedDinasLoading;
    if (activeCategory === 'hasil') return isVerifiedDinasLoading;
    if (activeCategory === 'rekening') return isFinishLoading;
    if (activeCategory === 'cancel') return isCancelLoading;
    if (activeCategory === 'cancel_pendataan') return isCancelPendataanLoading;
    return false;
  }, [activeCategory, isVerifiedActorLoading, isVerifiedDinasLoading, isFinishLoading, isSurveyLoading, isCancelLoading, isCancelPendataanLoading]);

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

  // Format update time
  const formattedUpdateTime = useMemo(() => {
    if (currentTime) {
      const day = String(currentTime.getDate()).padStart(2, '0');
      const month = String(currentTime.getMonth() + 1).padStart(2, '0');
      const year = currentTime.getFullYear();
      const hours = String(currentTime.getHours()).padStart(2, '0');
      const mins = String(currentTime.getMinutes()).padStart(2, '0');
      const secs = String(currentTime.getSeconds()).padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${mins}:${secs}`;
    }
    return '-';
  }, [currentTime]);

  return (
    <div className="min-h-screen lg:h-[100dvh] lg:max-h-[100dvh] w-full bg-[#060a14] text-slate-100 flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-white overflow-y-auto lg:overflow-hidden select-none p-2 sm:p-3 md:p-3.5 gap-2.5 relative">
      
      {/* ─── Ambient Glow Background Effects ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] left-1/4 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-[15%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[160px]" />
        <div className="absolute -bottom-[20%] left-1/3 w-[600px] h-[500px] bg-blue-700/10 rounded-full blur-[150px]" />
        {/* Subtle dot mesh pattern */}
        <div 
          className="absolute inset-0 opacity-[0.035]" 
          style={{ backgroundImage: 'radial-gradient(circle, #38bdf8 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. HEADER BANNER (FUTURISTIC GLASS COMMAND BAR)
      ────────────────────────────────────────────────────────────── */}
      <header className="relative w-full rounded-2xl bg-[#0c1427]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.45)] shrink-0 px-4 py-2.5 sm:px-5 sm:py-2.5 flex items-center justify-between z-10">
        
        {/* Left Side: Brand Logo & Title with Live Glowing Status */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full blur-xs opacity-70 group-hover:opacity-100 transition duration-300" />
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-950 flex items-center justify-center p-1.5 shadow-md shrink-0 border border-cyan-400/30">
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center p-1.5 shadow-inner">
                  <svg viewBox="0 0 24 24" className="w-full h-full text-white fill-current" preserveAspectRatio="none">
                    <path d="M4 19h16v2H4v-2zm2-4h2v3H6v-3zm4-4h2v7h-2v-7zm4-5h2v12h-2V6zm4-3h2v15h-2V3z"/>
                    <path d="M5 8l4-4 4 4 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none drop-shadow-xs">
                UMKM
              </span>
              <span className="text-[9px] font-extrabold text-cyan-400 tracking-wider uppercase leading-tight mt-0.5">
                DATA AKURAT, USAHA HEBAT
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10 hidden sm:block mx-1" />

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-black text-white uppercase tracking-tight leading-tight drop-shadow-sm">
                SISTEM INFORMASI MANAGEMEN PELAKU USAHA
              </h1>
              <span className="hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE COMMAND
              </span>
            </div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 tracking-wide uppercase leading-tight mt-0.5">
              YAYASAN TUNAS BANGSA KEPULAUAN RIAU 2026
            </p>
          </div>
        </div>

        {/* Right Side: Header Status & Fullscreen Controls */}
        <div className="flex items-center gap-2.5">
          {/* Live Ping Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-black tracking-wider text-slate-300 uppercase">
              REALTIME FEED
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 active:scale-95 transition-all text-white border border-cyan-500/30 hover:border-cyan-400/50 px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm shrink-0"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-300" /> : <Maximize2 className="w-4 h-4 text-cyan-300" />}
            <span className="hidden sm:inline">{isFullscreen ? "Normal" : "Layar Penuh"}</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT (TERMINAL DATA FEED & COMMAND METRICS)
      ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 z-10">
        
        {/* ═══════════════════════════════════════════════════════════
            LEFT COLUMN: PENAMPIL DATA (MODERN GLASS TERMINAL FEED)
        ════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 bg-[#0b1220]/80 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between min-h-0 shadow-[0_12px_36px_rgba(0,0,0,0.5)] border border-white/[0.08] relative overflow-hidden">
          
          {/* Subtle top card glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent pointer-events-none" />

          {/* Header Bar of Penampil Data */}
          <div className="shrink-0 flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] shrink-0">
                <Layers className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
                    PENAMPIL DATA
                  </h2>
                  <span className="text-[10px] sm:text-xs font-black text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-0.5 rounded-full shadow-2xs">
                    {activeCategoryMeta.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-semibold leading-none mt-0.5">
                  Menampilkan 10 antrean data terbaru secara *realtime*
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full shadow-2xs">
                Maks 10 Terkini
              </span>
            </div>
          </div>

          {/* Table Container with Modern Dark Glass Theme */}
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-x-auto overflow-y-hidden shadow-inner">
            <div className="min-w-[650px] lg:min-w-0 flex-1 flex flex-col justify-between">
              
              {/* Table Column Headers */}
              <div className="shrink-0 grid grid-cols-[45px_1.4fr_1.1fr_1.1fr_1.2fr_115px] items-center bg-[#0d162a]/95 px-2.5 py-2 text-[11px] font-black uppercase text-cyan-300 tracking-wider border-b border-cyan-500/20 text-center">
                <div className="text-center">No</div>
                <div className="text-center">Nama Pelaku Usaha</div>
                <div className="text-center">Kelurahan</div>
                <div className="text-center">Koordinator</div>
                <div className="text-center">{activeCategoryMeta.petugasHeader}</div>
                <div className="text-center">Waktu Submit</div>
              </div>

              {/* Table Body (10 Modern Sleek High-Contrast Rows) */}
              <div className="flex-1 flex flex-col justify-between min-h-0 divide-y divide-slate-800/60 bg-transparent">
                {isLoadingCurrentTable ? (
                  <div className="py-12 flex flex-col items-center justify-center text-cyan-400 font-bold text-sm">
                    <RotateCw className="w-7 h-7 animate-spin mb-2 text-cyan-400" />
                    <span>Memperbarui antrean data...</span>
                  </div>
                ) : currentTableData.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-500 font-bold uppercase text-sm">
                    <Activity className="w-8 h-8 text-slate-600 mb-2" />
                    <span>Belum ada data untuk kategori ini</span>
                  </div>
                ) : (
                  currentTableData.map((actor, idx) => {
                    const submitTime = formatDateTime(getActorSubmitDate(actor, activeCategory));
                    const petugasName = activeCategoryMeta.isHasil 
                      ? getVerifikatorName(actor) 
                      : getSurveyorName(actor);

                    return (
                      <div
                        key={actor.id || idx}
                        className={cn(
                          "min-h-[42px] lg:min-h-0 lg:flex-1 grid grid-cols-[45px_1.4fr_1.1fr_1.1fr_1.2fr_115px] items-center px-2.5 py-1 transition-all duration-150 text-center group",
                          idx % 2 === 0 ? "bg-slate-900/30" : "bg-slate-900/60",
                          "hover:bg-cyan-500/[0.08]"
                        )}
                      >
                        {/* 1. No */}
                        <div className="text-center font-mono font-bold text-slate-400 text-xs sm:text-[13px] group-hover:text-cyan-300">
                          {idx + 1}
                        </div>

                        {/* 2. Nama Pelaku Usaha */}
                        <div className="min-w-0 px-1 flex flex-col items-center justify-center text-center">
                          <span className="font-extrabold text-white uppercase text-xs sm:text-[13px] leading-tight text-center line-clamp-1 group-hover:text-cyan-200">
                            {actor.fullName || '-'}
                          </span>
                          {actor.businessName && (
                            <span className="text-[10px] font-semibold text-cyan-400/90 uppercase tracking-tight text-center mt-0.5 line-clamp-1">
                              {actor.businessName}
                            </span>
                          )}
                        </div>

                        {/* 3. Kelurahan */}
                        <div className="min-w-0 px-1 flex items-center justify-center text-center">
                          <span className="text-xs font-semibold text-slate-300 uppercase text-center line-clamp-1 leading-tight px-2 py-0.5 rounded-md bg-slate-800/40 border border-slate-700/40">
                            {actor.kelurahan || '-'}
                          </span>
                        </div>

                        {/* 4. Koordinator */}
                        <div className="min-w-0 px-1 flex items-center justify-center text-center">
                          <span className="text-xs font-semibold text-slate-300 uppercase text-center line-clamp-1 leading-tight">
                            {actor.coordinator || '-'}
                          </span>
                        </div>

                        {/* 5. Petugas Survey / Verifikator */}
                        <div className="min-w-0 px-1 flex items-center justify-center text-center">
                          <span className="text-xs font-semibold text-slate-200 uppercase text-center line-clamp-1 leading-tight font-sans">
                            {petugasName}
                          </span>
                        </div>

                        {/* 6. Waktu Submit */}
                        <div className="min-w-0 px-1 flex items-center justify-center text-center font-mono text-[11px] sm:text-xs text-slate-400 whitespace-nowrap group-hover:text-cyan-300">
                          {submitTime}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>

          {/* Table Bottom Status Bar */}
          <div className="shrink-0 pt-2 mt-1 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="font-bold text-slate-300 text-xs">
                Total Data:
              </span>
              <span className="text-xs text-slate-400 font-medium">
                10 data antrean teratas
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono text-[11px] text-slate-400">Update: {formattedUpdateTime}</span>
              <RotateCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            RIGHT COLUMN: STATISTIK (FUTURISTIC COMMAND METRICS)
        ════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 bg-[#0b1220]/80 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between min-h-0 shadow-[0_12px_36px_rgba(0,0,0,0.5)] border border-white/[0.08] relative overflow-hidden">
          
          {/* Subtle top card glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent pointer-events-none" />

          {/* Header Bar of Statistik */}
          <div className="shrink-0 flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.35)] shrink-0">
                <Activity className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
                  STATISTIK TERPADU
                </h2>
                <p className="text-[11px] text-slate-400 font-semibold leading-none mt-0.5">
                  Pilih kategori untuk memfilter data pada tabel
                </p>
              </div>
            </div>

            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
              INTERAKTIF
            </span>
          </div>

          {/* 7 Vibrant Modern Clickable Cards Grid (1 Hero Card + 6 Cards in 2 Cols) */}
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-2 sm:gap-2.5">
            
            {/* 0. Total Data Terverifikasi (Hero Card - Span 2 Columns) */}
            <button
              type="button"
              onClick={() => setActiveCategory('verified')}
              className={cn(
                "col-span-2 w-full text-left rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 transition-all duration-200 relative overflow-hidden group",
                "bg-gradient-to-r from-emerald-950/90 via-emerald-900/60 to-slate-900/90 border border-emerald-500/40 shadow-lg",
                "hover:border-emerald-400/80 hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] active:scale-[0.99]",
                activeCategory === 'verified'
                  ? "ring-2 ring-emerald-400 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] scale-[1.01]"
                  : "opacity-95 hover:opacity-100"
              )}
            >
              {/* Internal subtle glow */}
              <div className="absolute top-0 right-0 w-48 h-full bg-emerald-500/10 blur-xl pointer-events-none" />

              <div className="flex items-center gap-3 min-w-0 z-10">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)] shrink-0">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-[13px] font-black text-white uppercase tracking-wider truncate">
                      Total Data Terverifikasi
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-300 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3" /> 12% dari minggu lalu
                  </span>
                </div>
              </div>

              <div className="flex items-baseline gap-1 sm:gap-1.5 pr-2 shrink-0 z-10">
                <span className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono tracking-tight leading-none drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                  {(systemStats?.status?.verified ?? (
                    (systemStats?.detailedStatus?.survey ?? 0) +
                    (systemStats?.detailedStatus?.verifikasi ?? 0) +
                    (systemStats?.detailedStatus?.hasilVerifikasi ?? 0) +
                    (systemStats?.detailedStatus?.selesai ?? systemStats?.status?.finish ?? 0)
                  )).toLocaleString('id-ID')}
                </span>
                <span className="text-xs font-bold text-slate-300">
                  Data
                </span>
              </div>
            </button>

            {/* 1. Survey Dinas (Electric Cyan) */}
            <button
              type="button"
              onClick={() => setActiveCategory('survey')}
              className={cn(
                "w-full text-left rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 transition-all duration-200 relative overflow-hidden group",
                "bg-gradient-to-br from-sky-950/80 via-slate-900/90 to-slate-950 border border-sky-500/30 shadow-md",
                "hover:border-sky-400/80 hover:shadow-[0_0_20px_rgba(14,165,233,0.25)] active:scale-[0.98]",
                activeCategory === 'survey' 
                  ? "ring-2 ring-sky-400 border-sky-400 shadow-[0_0_25px_rgba(14,165,233,0.3)] scale-[1.02]" 
                  : "opacity-95 hover:opacity-100"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-[0_0_12px_rgba(14,165,233,0.4)] shrink-0">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide truncate">
                  Survey Dinas
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-sky-300 font-mono tracking-tight leading-none">
                    {(systemStats?.detailedStatus?.survey ?? 0).toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">Data</span>
                </div>
                <span className="text-[9.5px] font-semibold text-sky-400/90 flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> 8% dari minggu lalu
                </span>
              </div>
            </button>

            {/* 2. Verifikasi Dinas (Vibrant Amber / Orange) */}
            <button
              type="button"
              onClick={() => setActiveCategory('verifikasi')}
              className={cn(
                "w-full text-left rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 transition-all duration-200 relative overflow-hidden group",
                "bg-gradient-to-br from-amber-950/80 via-slate-900/90 to-slate-950 border border-amber-500/30 shadow-md",
                "hover:border-amber-400/80 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] active:scale-[0.98]",
                activeCategory === 'verifikasi' 
                  ? "ring-2 ring-amber-400 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)] scale-[1.02]" 
                  : "opacity-95 hover:opacity-100"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.4)] shrink-0">
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide truncate">
                  Verifikasi Dinas
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono tracking-tight leading-none">
                    {(systemStats?.detailedStatus?.verifikasi ?? 0).toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">Data</span>
                </div>
                <span className="text-[9.5px] font-semibold text-amber-400/90 flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> 10% dari minggu lalu
                </span>
              </div>
            </button>

            {/* 3. Hasil Dinas (Electric Purple / Violet) */}
            <button
              type="button"
              onClick={() => setActiveCategory('hasil')}
              className={cn(
                "w-full text-left rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 transition-all duration-200 relative overflow-hidden group",
                "bg-gradient-to-br from-purple-950/80 via-slate-900/90 to-slate-950 border border-purple-500/30 shadow-md",
                "hover:border-purple-400/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] active:scale-[0.98]",
                activeCategory === 'hasil' 
                  ? "ring-2 ring-purple-400 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.3)] scale-[1.02]" 
                  : "opacity-95 hover:opacity-100"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.4)] shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide truncate">
                  Hasil Dinas
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-purple-300 font-mono tracking-tight leading-none">
                    {(systemStats?.detailedStatus?.hasilVerifikasi ?? 0).toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">Data</span>
                </div>
                <span className="text-[9.5px] font-semibold text-purple-400/90 flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> 6% dari minggu lalu
                </span>
              </div>
            </button>

            {/* 4. Rekening Terinput (Luminous Teal / Cyan) */}
            <button
              type="button"
              onClick={() => setActiveCategory('rekening')}
              className={cn(
                "w-full text-left rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 transition-all duration-200 relative overflow-hidden group",
                "bg-gradient-to-br from-teal-950/80 via-slate-900/90 to-slate-950 border border-teal-500/30 shadow-md",
                "hover:border-teal-400/80 hover:shadow-[0_0_20px_rgba(20,184,166,0.25)] active:scale-[0.98]",
                activeCategory === 'rekening' 
                  ? "ring-2 ring-teal-400 border-teal-400 shadow-[0_0_25px_rgba(20,184,166,0.3)] scale-[1.02]" 
                  : "opacity-95 hover:opacity-100"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-[0_0_12px_rgba(20,184,166,0.4)] shrink-0">
                <Landmark className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide truncate">
                  Rekening Terinput
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-teal-300 font-mono tracking-tight leading-none">
                    {(systemStats?.detailedStatus?.selesai ?? systemStats?.status?.finish ?? 0).toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">Data</span>
                </div>
                <span className="text-[9.5px] font-semibold text-teal-400/90 flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> 15% dari minggu lalu
                </span>
              </div>
            </button>

            {/* 5. Cancell Dinas (Coral / Rose Red) */}
            <button
              type="button"
              onClick={() => setActiveCategory('cancel')}
              className={cn(
                "w-full text-left rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 transition-all duration-200 relative overflow-hidden group",
                "bg-gradient-to-br from-rose-950/80 via-slate-900/90 to-slate-950 border border-rose-500/30 shadow-md",
                "hover:border-rose-400/80 hover:shadow-[0_0_20px_rgba(244,63,94,0.25)] active:scale-[0.98]",
                activeCategory === 'cancel' 
                  ? "ring-2 ring-rose-400 border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.3)] scale-[1.02]" 
                  : "opacity-95 hover:opacity-100"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.4)] shrink-0">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide truncate">
                  Cancell Dinas
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-rose-300 font-mono tracking-tight leading-none">
                    {(listCancelDinas.length || (cancelDinasData?.length ?? 0)).toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">Data</span>
                </div>
                <span className="text-[9.5px] font-semibold text-rose-400/90 flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> 5% dari minggu lalu
                </span>
              </div>
            </button>

            {/* 6. Cancell Pendataan (Deep Crimson / Ruby Red) */}
            <button
              type="button"
              onClick={() => setActiveCategory('cancel_pendataan')}
              className={cn(
                "w-full text-left rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 transition-all duration-200 relative overflow-hidden group",
                "bg-gradient-to-br from-red-950/80 via-slate-900/90 to-slate-950 border border-red-500/30 shadow-md",
                "hover:border-red-400/80 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] active:scale-[0.98]",
                activeCategory === 'cancel_pendataan' 
                  ? "ring-2 ring-red-400 border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.3)] scale-[1.02]" 
                  : "opacity-95 hover:opacity-100"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.4)] shrink-0">
                <UserX className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide truncate">
                  Cancell Pendataan
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-red-300 font-mono tracking-tight leading-none">
                    {totalCancelPendataanCount.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">Data</span>
                </div>
                <span className="text-[9.5px] font-semibold text-red-400/90 flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> 3% dari minggu lalu
                </span>
              </div>
            </button>

          </div>

        </div>

      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. BOTTOM COMMAND DOCK (BROADCAST MARQUEE, CLOCK, INFO)
      ────────────────────────────────────────────────────────────── */}
      <footer className="w-full bg-[#0b1220]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.5)] shrink-0 flex flex-col text-white z-10">
        
        {/* Row 1: Running Text Bar (Full Width Marquee Banner with Edge Fade Mask) */}
        <div className="w-full bg-slate-950/80 border-b border-cyan-500/20 py-2 px-3 overflow-hidden flex items-center">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.5)] rounded-md mr-3">
            <Radio className="w-3.5 h-3.5 animate-pulse text-slate-950" />
            <span>PENGUMUMAN</span>
          </div>

          {/* Marquee with Edge Mask */}
          <div className="relative flex overflow-x-hidden whitespace-nowrap flex-1 [mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]">
            <div className="animate-marquee inline-block whitespace-nowrap hover:[animation-play-state:paused] cursor-default">
              <span className="text-xs sm:text-[13px] font-bold text-slate-200 tracking-wide px-4 drop-shadow-xs">
                {runningText}
              </span>
              <span className="text-cyan-400 mx-4 font-black">•</span>
              <span className="text-xs sm:text-[13px] font-bold text-slate-200 tracking-wide px-4 drop-shadow-xs">
                {runningText}
              </span>
              <span className="text-cyan-400 mx-4 font-black">•</span>
            </div>
          </div>
        </div>

        {/* Row 2: 2 Columns: Precision Chrono Clock & Service Info */}
        <div className="grid grid-cols-1 md:grid-cols-12 items-center p-2.5 sm:p-3 gap-2.5">
          
          {/* Section 1: JAM REALTIME + AUTO SYNC + LAST SYNC */}
          <div className="md:col-span-6 flex items-center justify-around gap-3 bg-slate-950/50 border border-cyan-500/20 p-2.5 rounded-xl h-full shadow-inner">
            {/* Clock & Realtime Display */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <ModernChronoClock date={currentTime} />
              <div className="flex flex-col justify-center">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  JAM REALTIME
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight leading-none my-0.5 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">
                  {currentTime ? currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':') : '--:--:--'}
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wide leading-tight">
                  {currentTime ? currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                </span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-14 w-px bg-slate-800/80 hidden sm:block shrink-0" />

            {/* Auto Sync & Last Sync Section */}
            <div className="flex flex-col justify-center pr-1">
              <div className="flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-cyan-400">
                  AUTO SYNC
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono tracking-tight leading-none my-0.5 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)] flex items-center gap-1">
                {formatCountdown(nextSyncIn)}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wide leading-tight flex items-center gap-1">
                <span className="text-cyan-400/90 font-bold">LAST:</span>
                <span className="font-mono text-slate-200 font-bold">
                  {lastSyncTime ? lastSyncTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':') : '--:--:--'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: INFORMASI LAYANAN */}
          <div className="md:col-span-6 flex items-start gap-3 bg-slate-950/50 border border-cyan-500/20 p-2.5 rounded-xl h-full shadow-inner">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5 shadow-xs">
              <Info className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>INFORMASI LAYANAN</span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-normal leading-relaxed mt-0.5">
                Sistem Informasi Managemen Pelaku Usaha (SIMPU) berkomitmen untuk menyediakan data yang akurat, transparan dan terpercaya demi mendukung pertumbuhan UMKM yang berdaya saing. Bersama kita wujudkan UMKM maju, masyarakat sejahtera.
              </p>
            </div>
          </div>

        </div>

      </footer>

      {/* Marquee Keyframes */}
      <style jsx>{`
        .animate-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 70s linear infinite;
        }

        .animate-marquee:hover {
          animation-play-state: paused;
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
