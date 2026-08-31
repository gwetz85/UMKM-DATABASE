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
  UserX
} from 'lucide-react';
import Image from 'next/image';

// Analog Clock Component
const AnalogClock = ({ date }: { date: Date | null }) => {
  if (!date) return null;
  const seconds = date.getSeconds();
  const minutes = date.getMinutes();
  const hours = date.getHours() % 12;

  const secDeg = (seconds / 60) * 360;
  const minDeg = ((minutes + seconds / 60) / 60) * 360;
  const hourDeg = ((hours + minutes / 60) / 12) * 360;

  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-cyan-400 bg-[#071d3a] shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center shrink-0">
      {/* Clock Face Markers */}
      <div className="absolute inset-1 rounded-full border border-cyan-500/30">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-full h-full text-center"
            style={{ transform: `rotate(${i * 30}deg)` }}
          >
            <div className={cn("w-0.5 mx-auto bg-cyan-300", i % 3 === 0 ? "h-2 bg-cyan-200" : "h-1 opacity-60")} />
          </div>
        ))}
      </div>

      {/* Clock Center Pin */}
      <div className="w-2 h-2 rounded-full bg-cyan-300 z-30 shadow-md ring-2 ring-white/50" />

      {/* Hour Hand */}
      <div
        className="absolute w-1 bg-white rounded-full origin-bottom z-10 shadow-sm"
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
        className="absolute w-0.5 bg-cyan-300 rounded-full origin-bottom z-20 shadow-sm"
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
        className="absolute w-0.5 bg-red-400 rounded-full origin-bottom z-25"
        style={{
          height: '40%',
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

// Helper usulan extraction
const getUsulan = (d: BusinessActor) => {
  try {
    const actor = d as any;
    if (actor.proposalDetails?.pengajuan) return actor.proposalDetails.pengajuan;
    if (actor.proposalDetails?.tujuan) return actor.proposalDetails.tujuan;
    if (actor.surveyData?.hasilSurvey?.catatan) return actor.surveyData.hasilSurvey.catatan;
    if (actor.businessType) return actor.businessType;
    if (actor.businessName) return actor.businessName;
    return 'BANTUAN MODAL';
  } catch {
    return '-';
  }
};

export default function LayarInformasiPage() {
  const database = useDatabase();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  // Active selected stat category (Ordered: survey -> verifikasi -> hasil -> rekening -> cancel -> cancel_pendataan)
  const [activeCategory, setActiveCategory] = useState<'survey' | 'verifikasi' | 'hasil' | 'rekening' | 'cancel' | 'cancel_pendataan'>('survey');

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

  // 7. System Users lookup for resolving staff names
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

  // Helper to get Usulan value
  const getUsulan = (d: any) => {
    return d.usulan || 
           d.surveyData?.rencanaPenggunaan || 
           d.surveyData?.peralatan || 
           d.rencanaPenggunaan || 
           d.peralatan || 
           d.businessCategory || 
           d.businessName || 
           '-';
  };

  // Filtered lists for each category (up to 10 latest, ordered from newest to oldest submit time)
  // 1. Data Terverifikasi (Default View)
  const listVerified = useMemo(() => {
    const combined = [
      ...(verifiedActorData || []),
      ...(verifiedDinasData || []).filter(d => !isCancelDinas(d)),
      ...(finishData || [])
    ];
    // Deduplicate
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
  }, [activeCategory, listSurveyDinas, listVerifikasiDinas, listHasilDinas, listRekeningTerinput, listCancelDinas, listCancelPendataan]);

  // Active Category Meta Information
  const activeCategoryMeta = useMemo(() => {
    switch (activeCategory) {
      case 'survey':
        return {
          title: 'Survey Dinas',
          petugasHeader: 'Petugas Survey',
          isHasil: false
        };
      case 'verifikasi':
        return {
          title: 'Verifikasi Dinas',
          petugasHeader: 'Petugas Survey',
          isHasil: false
        };
      case 'hasil':
        return {
          title: 'Hasil Dinas',
          petugasHeader: 'Petugas Verifikator',
          isHasil: true
        };
      case 'rekening':
        return {
          title: 'Rekening Terinput',
          petugasHeader: 'Petugas Verifikator',
          isHasil: true
        };
      case 'cancel':
        return {
          title: 'Cancell Dinas',
          petugasHeader: 'Petugas Survey / Koordinator',
          isHasil: false
        };
      case 'cancel_pendataan':
        return {
          title: 'Cancell Pendataan',
          petugasHeader: 'Koordinator',
          isHasil: false
        };
      default:
        return {
          title: 'Survey Dinas',
          petugasHeader: 'Petugas Survey',
          isHasil: false
        };
    }
  }, [activeCategory]);

  const isLoadingCurrentTable = useMemo(() => {
    if (activeCategory === 'survey') return isSurveyLoading;
    if (activeCategory === 'verifikasi') return isVerifiedDinasLoading;
    if (activeCategory === 'hasil') return isVerifiedDinasLoading;
    if (activeCategory === 'rekening') return isFinishLoading;
    if (activeCategory === 'cancel') return isCancelLoading;
    if (activeCategory === 'cancel_pendataan') return isCancelPendataanLoading;
    return false;
  }, [activeCategory, isSurveyLoading, isVerifiedDinasLoading, isFinishLoading, isCancelLoading, isCancelPendataanLoading]);

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
    <div className="min-h-screen lg:h-[100dvh] lg:max-h-[100dvh] w-full bg-gradient-to-br from-[#072c54] via-[#0b487e] to-[#093563] text-slate-900 flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-white overflow-y-auto lg:overflow-hidden select-none p-2.5 sm:p-3.5 gap-2.5">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER BANNER (DEEP ROYAL BLUE WITH LOGO & TITLE)
      ────────────────────────────────────────────────────────────── */}
      <header className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-r from-[#052852] via-[#09417d] to-[#07366b] border border-white/10 shadow-xl shrink-0 px-4 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between">
        
        {/* Left Side: Brand Logo & Title */}
        <div className="flex items-center gap-3 sm:gap-4 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center p-1.5 shadow-lg shrink-0">
              {/* UMKM Bar Chart SVG Icon */}
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#023e8a] to-[#0096c7] flex items-center justify-center p-1.5">
                <svg viewBox="0 0 24 24" className="w-full h-full text-white fill-current" preserveAspectRatio="none">
                  <path d="M4 19h16v2H4v-2zm2-4h2v3H6v-3zm4-4h2v7h-2v-7zm4-5h2v12h-2V6zm4-3h2v15h-2V3z"/>
                  <path d="M5 8l4-4 4 4 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                UMKM
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold text-cyan-300 tracking-wider uppercase leading-tight mt-0.5">
                DATA AKURAT, USAHA HEBAT
              </span>
            </div>
          </div>

          <div className="h-9 w-[1.5px] bg-white/20 hidden sm:block mx-1" />

          <div className="flex flex-col justify-center">
            <h1 className="text-sm sm:text-base md:text-xl lg:text-2xl font-black text-white uppercase tracking-tight leading-tight drop-shadow-md">
              SISTEM INFORMASI MANAGEMEN PELAKU USAHA
            </h1>
            <p className="text-[10px] sm:text-xs md:text-sm font-bold text-cyan-200/90 tracking-wide uppercase leading-tight mt-0.5">
              YAYASAN TUNAS BANGSA KEPULAUAN RIAU 2026
            </p>
          </div>
        </div>

        {/* Right Side: Header Graphic & Fullscreen Control */}
        <div className="flex items-center gap-3 z-10">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/20 px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm shrink-0"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-300" /> : <Maximize2 className="w-4 h-4 text-cyan-300" />}
            <span className="hidden sm:inline">{isFullscreen ? "Normal" : "Layar Penuh"}</span>
          </button>
        </div>

        {/* Header background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT (2 WHITE CONTAINER CARDS)
      ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5">
        
        {/* ═══════════════════════════════════════════════════════════
            LEFT COLUMN: PENAMPIL DATA (WHITE CARD, 7 COLS)
        ════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-3 sm:p-4 flex flex-col justify-between min-h-0 shadow-2xl border border-slate-100">
          
          {/* Header Bar of Penampil Data */}
          <div className="shrink-0 flex items-center justify-between pb-2.5 mb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0284c7] flex items-center justify-center text-white shadow-md">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#032b69] uppercase tracking-tight flex items-center gap-2">
                  PENAMPIL DATA
                  <span className="text-[10px] sm:text-xs font-bold text-white bg-[#0284c7] px-2.5 py-0.5 rounded-full shadow-sm">
                    {activeCategoryMeta.title}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 font-semibold leading-none mt-0.5">
                  Menampilkan 10 data terakhir
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#0284c7] bg-sky-50 border border-sky-200 px-3 py-1 rounded-full">
                Maks 10 Terkini
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 overflow-x-auto overflow-y-hidden shadow-inner">
            <div className="min-w-[650px] lg:min-w-0 flex-1 flex flex-col justify-between">
              
              {/* Table Column Headers (Deep Navy Blue Bar, All Center-Aligned) */}
              <div className="shrink-0 grid grid-cols-[45px_1.4fr_1.1fr_1.1fr_1.2fr_115px] items-center bg-[#062c5e] px-2 py-2.5 text-xs font-bold uppercase text-white tracking-wider rounded-t-lg text-center">
                <div className="text-center">No</div>
                <div className="text-center">Nama Pelaku Usaha</div>
                <div className="text-center">Kelurahan</div>
                <div className="text-center">Koordinator</div>
                <div className="text-center">{activeCategoryMeta.petugasHeader}</div>
                <div className="text-center">Waktu Submit</div>
              </div>

              {/* Table Body (10 Clean Center-Aligned Rows) */}
              <div className="flex-1 flex flex-col justify-between min-h-0 divide-y divide-slate-200/80 bg-white">
                {isLoadingCurrentTable ? (
                  <div className="py-12 flex flex-col items-center justify-center text-[#0284c7] font-bold text-sm">
                    <RotateCw className="w-7 h-7 animate-spin mb-2" />
                    <span>Memuat data penampil...</span>
                  </div>
                ) : currentTableData.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 font-bold uppercase text-sm">
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
                          "min-h-[44px] lg:min-h-0 lg:flex-1 grid grid-cols-[45px_1.4fr_1.1fr_1.1fr_1.2fr_115px] items-center px-2 py-1 transition-colors hover:bg-sky-50/70 text-center",
                          idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                        )}
                      >
                        {/* 1. No */}
                        <div className="text-center font-bold font-mono text-slate-500 text-xs sm:text-sm">
                          {idx + 1}
                        </div>

                        {/* 2. Nama Pelaku Usaha */}
                        <div className="min-w-0 px-1 flex flex-col items-center justify-center text-center">
                          <span className="font-bold text-slate-900 uppercase text-xs sm:text-[13px] leading-tight text-center line-clamp-2">
                            {actor.fullName || '-'}
                          </span>
                          {actor.businessName && (
                            <span className="text-[10px] sm:text-[11px] font-semibold text-[#0284c7] uppercase tracking-tight text-center mt-0.5 line-clamp-1">
                              {actor.businessName}
                            </span>
                          )}
                        </div>

                        {/* 3. Kelurahan */}
                        <div className="min-w-0 px-1 flex items-center justify-center text-center">
                          <span className="text-xs sm:text-sm font-semibold text-slate-700 uppercase text-center line-clamp-2 leading-tight">
                            {actor.kelurahan || '-'}
                          </span>
                        </div>

                        {/* 4. Koordinator */}
                        <div className="min-w-0 px-1 flex items-center justify-center text-center">
                          <span className="text-xs sm:text-sm font-semibold text-slate-700 uppercase text-center line-clamp-2 leading-tight">
                            {actor.coordinator || '-'}
                          </span>
                        </div>

                        {/* 5. Petugas Survey / Verifikator */}
                        <div className="min-w-0 px-1 flex items-center justify-center text-center">
                          <span className="text-xs sm:text-sm font-semibold text-slate-800 uppercase text-center line-clamp-2 leading-tight">
                            {petugasName}
                          </span>
                        </div>

                        {/* 6. Waktu Submit */}
                        <div className="min-w-0 px-1 flex items-center justify-center text-center font-mono text-xs sm:text-sm text-slate-600 whitespace-nowrap">
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
          <div className="shrink-0 pt-2.5 mt-1 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0284c7]" />
              <span className="font-bold text-slate-800 text-xs">
                Total Data:
              </span>
              <span className="text-xs text-slate-600 font-medium">
                10 data ditampilkan dari data terbaru
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Update Terakhir: {formattedUpdateTime}</span>
              <RotateCw className="w-3.5 h-3.5 text-[#0284c7] animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            RIGHT COLUMN: STATISTIK (WHITE CARD, 6 CARDS IN 2 COLS)
        ════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-3 sm:p-4 flex flex-col justify-between min-h-0 shadow-2xl border border-slate-100">
          
          {/* Header Bar of Statistik */}
          <div className="shrink-0 flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#028090] flex items-center justify-center text-white shadow-md">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#032b69] uppercase tracking-tight">
                  STATISTIK
                </h2>
                <p className="text-xs text-slate-500 font-semibold leading-none mt-0.5">
                  Ringkasan data pendataan UMKM (Klik untuk melihat tabel)
                </p>
              </div>
            </div>
          </div>

          {/* 6 Vibrant Clickable Cards Grid (2 cols x 3 rows) */}
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-2.5 sm:gap-3">
            
            {/* 1. Survey Dinas (Sky Blue) */}
            <button
              type="button"
              onClick={() => setActiveCategory('survey')}
              className={cn(
                "w-full text-left rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 transition-all duration-200 shadow-md relative overflow-hidden",
                "bg-gradient-to-r from-[#0096c7] to-[#0077b6] text-white hover:brightness-105 active:scale-[0.98]",
                activeCategory === 'survey' 
                  ? "ring-4 ring-[#0077b6] shadow-xl scale-[1.02]" 
                  : "opacity-95 hover:opacity-100"
              )}
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center shadow-md shrink-0">
                <UserCheck className="w-6 h-6 sm:w-7 sm:h-7 text-[#0077b6]" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wide truncate">
                  Survey Dinas
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl md:text-3xl font-black text-white font-mono tracking-tight leading-none drop-shadow-sm">
                    {(systemStats?.detailedStatus?.survey ?? 0).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-bold text-white/90">
                    Data
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-white/90 flex items-center gap-1 mt-0.5">
                  ↗ 8% dari minggu lalu
                </span>
              </div>
            </button>

            {/* 2. Verifikasi Dinas (Golden Amber) */}
            <button
              type="button"
              onClick={() => setActiveCategory('verifikasi')}
              className={cn(
                "w-full text-left rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 transition-all duration-200 shadow-md relative overflow-hidden",
                "bg-gradient-to-r from-[#fca311] to-[#e85d04] text-white hover:brightness-105 active:scale-[0.98]",
                activeCategory === 'verifikasi' 
                  ? "ring-4 ring-[#0077b6] shadow-xl scale-[1.02]" 
                  : "opacity-95 hover:opacity-100"
              )}
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center shadow-md shrink-0">
                <ClipboardCheck className="w-6 h-6 sm:w-7 sm:h-7 text-[#e85d04]" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wide truncate">
                  Verifikasi Dinas
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl md:text-3xl font-black text-white font-mono tracking-tight leading-none drop-shadow-sm">
                    {(systemStats?.detailedStatus?.verifikasi ?? 0).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-bold text-white/90">
                    Data
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-white/90 flex items-center gap-1 mt-0.5">
                  ↗ 10% dari minggu lalu
                </span>
              </div>
            </button>

            {/* 3. Hasil Dinas (Purple / Indigo) */}
            <button
              type="button"
              onClick={() => setActiveCategory('hasil')}
              className={cn(
                "w-full text-left rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 transition-all duration-200 shadow-md relative overflow-hidden",
                "bg-gradient-to-r from-[#5a189a] to-[#7b2cbf] text-white hover:brightness-105 active:scale-[0.98]",
                activeCategory === 'hasil' 
                  ? "ring-4 ring-[#0077b6] shadow-xl scale-[1.02]" 
                  : "opacity-95 hover:opacity-100"
              )}
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center shadow-md shrink-0">
                <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-[#7b2cbf]" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wide truncate">
                  Hasil Dinas
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl md:text-3xl font-black text-white font-mono tracking-tight leading-none drop-shadow-sm">
                    {(systemStats?.detailedStatus?.hasilVerifikasi ?? 0).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-bold text-white/90">
                    Data
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-white/90 flex items-center gap-1 mt-0.5">
                  ↗ 6% dari minggu lalu
                </span>
              </div>
            </button>

            {/* 4. Rekening Terinput (Sea Green / Teal) */}
            <button
              type="button"
              onClick={() => setActiveCategory('rekening')}
              className={cn(
                "w-full text-left rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 transition-all duration-200 shadow-md relative overflow-hidden",
                "bg-gradient-to-r from-[#00a896] to-[#028090] text-white hover:brightness-105 active:scale-[0.98]",
                activeCategory === 'rekening' 
                  ? "ring-4 ring-[#0077b6] shadow-xl scale-[1.02]" 
                  : "opacity-95 hover:opacity-100"
              )}
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center shadow-md shrink-0">
                <Landmark className="w-6 h-6 sm:w-7 sm:h-7 text-[#028090]" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wide truncate">
                  Rekening Terinput
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl md:text-3xl font-black text-white font-mono tracking-tight leading-none drop-shadow-sm">
                    {(systemStats?.detailedStatus?.selesai ?? systemStats?.status?.finish ?? 0).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-bold text-white/90">
                    Data
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-white/90 flex items-center gap-1 mt-0.5">
                  ↗ 15% dari minggu lalu
                </span>
              </div>
            </button>

            {/* 5. Cancell Dinas (Coral / Red) */}
            <button
              type="button"
              onClick={() => setActiveCategory('cancel')}
              className={cn(
                "w-full text-left rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 transition-all duration-200 shadow-md relative overflow-hidden",
                "bg-gradient-to-r from-[#fb5656] to-[#e63946] text-white hover:brightness-105 active:scale-[0.98]",
                activeCategory === 'cancel' 
                  ? "ring-4 ring-[#0077b6] shadow-xl scale-[1.02]" 
                  : "opacity-95 hover:opacity-100"
              )}
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center shadow-md shrink-0">
                <XCircle className="w-6 h-6 sm:w-7 sm:h-7 text-[#e63946]" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wide truncate">
                  Cancell Dinas
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl md:text-3xl font-black text-white font-mono tracking-tight leading-none drop-shadow-sm">
                    {(listCancelDinas.length || (cancelDinasData?.length ?? 0)).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-bold text-white/90">
                    Data
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-white/90 flex items-center gap-1 mt-0.5">
                  ↗ 5% dari minggu lalu
                </span>
              </div>
            </button>

            {/* 6. Cancell Pendataan (Crimson / Burgundy Red) */}
            <button
              type="button"
              onClick={() => setActiveCategory('cancel_pendataan')}
              className={cn(
                "w-full text-left rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 transition-all duration-200 shadow-md relative overflow-hidden",
                "bg-gradient-to-r from-[#e63946] to-[#9d0208] text-white hover:brightness-105 active:scale-[0.98]",
                activeCategory === 'cancel_pendataan' 
                  ? "ring-4 ring-[#0077b6] shadow-xl scale-[1.02]" 
                  : "opacity-95 hover:opacity-100"
              )}
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center shadow-md shrink-0">
                <UserX className="w-6 h-6 sm:w-7 sm:h-7 text-[#9d0208]" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wide truncate">
                  Cancell Pendataan
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl md:text-3xl font-black text-white font-mono tracking-tight leading-none drop-shadow-sm">
                    {totalCancelPendataanCount.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-bold text-white/90">
                    Data
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-white/90 flex items-center gap-1 mt-0.5">
                  ↗ 3% dari minggu lalu
                </span>
              </div>
            </button>

          </div>

        </div>

      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. BOTTOM SECTION (CLOCK, INFORMASI LAYANAN, RUNNING TEXT)
      ────────────────────────────────────────────────────────────── */}
      <footer className="w-full bg-[#052952]/95 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl shrink-0 flex flex-col text-white">
        
        {/* Row 1: Running Text Bar (Full Width Marquee Banner) */}
        <div className="w-full bg-[#023e8a] border-b border-cyan-400/40 py-2 px-3 overflow-hidden flex items-center shadow-inner">
          <div className="bg-cyan-400 text-[#032042] px-3 py-1 text-xs font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-md rounded-md mr-3">
            <Radio className="w-3.5 h-3.5 animate-pulse text-[#032042]" />
            <span>PENGUMUMAN</span>
          </div>
          <div className="relative flex overflow-x-hidden whitespace-nowrap flex-1">
            <div className="animate-marquee inline-block whitespace-nowrap">
              <span className="text-xs sm:text-sm font-bold text-white tracking-wide px-4 drop-shadow">
                {runningText}
              </span>
              <span className="text-cyan-300 mx-4 font-black">•</span>
              <span className="text-xs sm:text-sm font-bold text-white tracking-wide px-4 drop-shadow">
                {runningText}
              </span>
              <span className="text-cyan-300 mx-4 font-black">•</span>
            </div>
          </div>
        </div>

        {/* Row 2: 2 Columns: JAM REALTIME (with Auto Sync & Last Sync) & INFORMASI LAYANAN */}
        <div className="grid grid-cols-1 md:grid-cols-12 items-center p-2.5 sm:p-3 gap-3">
          
          {/* Section 1: JAM REALTIME + AUTO SYNC + LAST SYNC */}
          <div className="md:col-span-6 flex items-center justify-around gap-3 bg-[#093563]/80 border border-cyan-400/25 p-2.5 rounded-xl h-full">
            {/* Clock & Realtime Display */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <AnalogClock date={currentTime} />
              <div className="flex flex-col justify-center">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-cyan-300">
                  JAM REALTIME
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight leading-none my-0.5 drop-shadow-md">
                  {currentTime ? currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':') : '--:--:--'}
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-cyan-100 uppercase tracking-wide leading-tight">
                  {currentTime ? currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                </span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-14 w-px bg-cyan-400/30 hidden sm:block shrink-0" />

            {/* Auto Sync & Last Sync Section (Equal Typography to Realtime Clock) */}
            <div className="flex flex-col justify-center pr-1">
              <div className="flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-cyan-300 animate-spin" style={{ animationDuration: '4s' }} />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-cyan-300">
                  AUTO SYNC
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight leading-none my-0.5 drop-shadow-md flex items-center gap-1">
                {formatCountdown(nextSyncIn)}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-cyan-100 uppercase tracking-wide leading-tight flex items-center gap-1">
                <span className="text-cyan-300 font-bold">LAST:</span>
                <span className="font-mono text-white font-bold">
                  {lastSyncTime ? lastSyncTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':') : '--:--:--'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: INFORMASI LAYANAN */}
          <div className="md:col-span-6 flex items-start gap-3 bg-[#093563]/80 border border-cyan-400/25 p-2.5 rounded-xl h-full">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-white flex items-center justify-center text-white shrink-0 mt-0.5">
              <Info className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                INFORMASI LAYANAN
              </h3>
              <p className="text-[10px] sm:text-[11px] text-cyan-100 font-normal leading-relaxed mt-0.5">
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
          animation: marquee 45s linear infinite;
        }

        .animate-marquee-card {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 35s linear infinite;
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
