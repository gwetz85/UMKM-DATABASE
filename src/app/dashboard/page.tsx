"use client"

import { useMemoFirebase, useList, useUser, useDatabase, useObject } from "@/firebase"
import { ref, query, orderByChild, equalTo, limitToFirst, limitToLast } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { 
  RefreshCw, 
  Users, 
  UserCheck, 
  UserX, 
  Loader2, 
  Building2, 
  TrendingUp, 
  MapPin, 
  BarChart3, 
  ClipboardCheck, 
  FileText, 
  ListChecks, 
  ArrowRight, 
  BadgeCheck, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
  Store,
  CheckCircle2,
  ChevronRight
} from "lucide-react"
import { useRouter } from "next/navigation"
import React, { useEffect, useMemo, useState, useRef } from "react"
import { BusinessActor } from "../lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn, formatDateTimeIndo } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { 
  ChartConfig
} from "@/components/ui/chart"

const KELURAHAN_LIST = [
  "Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat",
  "Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru",
  "Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana",
  "Air Raja", "Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"
]

const getInitials = (name?: string) => {
  if (!name) return "UM"
  const clean = name.trim().split(/\s+/)
  if (clean.length === 1) return clean[0].substring(0, 2).toUpperCase()
  return (clean[0][0] + clean[1][0]).toUpperCase()
}

const formatDateTimeParts = (isoString?: string | null) => {
  if (!isoString) return { date: "-", time: "-" }
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return { date: "-", time: "-" }
    const date = d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    const time = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(/\./g, ':') + ' WIB'
    return { date, time }
  } catch {
    return { date: "-", time: "-" }
  }
}

export default function DashboardStatsPage() {
  const { user, isUserLoading, userProfile } = useUser()
  const database = useDatabase()
  const router = useRouter()
  const { toast } = useToast()

  const [selectedFilter, setSelectedFilter] = useState<{ name: string; filterType: string; targetUrl?: string } | null>(null)
  const [expandedActorId, setExpandedActorId] = useState<string | null>(null)
  const [detailActor, setDetailActor] = useState<BusinessActor | null>(null)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
      return
    }

    if (userProfile?.role === 'dinas') {
      router.push("/verifikasi-dinas")
    }

    if (userProfile?.role === 'verifikator_dinas') {
      router.push("/verifikasi-dinas-berkas")
    }

    if (userProfile?.role === 'koordinator') {
      router.push("/actor-data")
    }

    if (userProfile?.role === 'petugas_survey' || userProfile?.role === 'petugas') {
      router.push("/verifikasi-dinas")
    }
  }, [user, isUserLoading, router, userProfile])

  // 1. Fetch pre-calculated stats (Instant & ultra-lightweight ~1KB JSON)
  const statsRef = useMemoFirebase(() => database ? ref(database, 'system_stats') : null, [database])
  const { data: systemStats, isLoading: isStatsLoading } = useObject(statsRef)

  // 3. Fetch ONLY verified_dinas actors for the 5 latest tables (targeted query, real-time)
  const verifiedDinasQuery = useMemoFirebase(() => {
    if (!database) return null
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('verified_dinas'))
  }, [database])

  const { data: verifiedDinasData, isLoading: isVerifiedDinasLoading } = useList<BusinessActor>(verifiedDinasQuery)

  const isCancelDinas = (d: any) => {
    const s = (d?.status || "").toLowerCase()
    return (s === 'verified_dinas' && d.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(d.alasanCancelDinas)
  }

  // 5 Pelaku Usaha terbaru di menu Verifikasi Dinas (Tahap 2: Menunggu Cek Berkas)
  const latestVerifikasiDinas = useMemo(() => {
    if (!verifiedDinasData) return []
    return verifiedDinasData
      .filter(d => d.status === 'verified_dinas' && d.hasilVerifikasiDinas === 'Lolos' && !d.berkasDinasVerified && !isCancelDinas(d))
      .sort((a, b) => {
        const timeA = new Date(a.verifiedDinasAt || (a.surveyData as any)?.tanggalSurvey || a.createdAt || 0).getTime()
        const timeB = new Date(b.verifiedDinasAt || (b.surveyData as any)?.tanggalSurvey || b.createdAt || 0).getTime()
        return timeB - timeA
      })
      .slice(0, 5)
  }, [verifiedDinasData])

  // 5 Pelaku Usaha terbaru di menu Hasil Verifikasi (Tahap 3: Selesai Cek Berkas / Lolos Final)
  const latestHasilVerifikasi = useMemo(() => {
    if (!verifiedDinasData) return []
    return verifiedDinasData
      .filter(d => d.status === 'verified_dinas' && d.hasilVerifikasiDinas === 'Lolos' && Boolean(d.berkasDinasVerified) && !isCancelDinas(d))
      .sort((a, b) => {
        const timeA = new Date(a.berkasDinasVerifiedAt || a.verifiedDinasAt || a.createdAt || 0).getTime()
        const timeB = new Date(b.berkasDinasVerifiedAt || b.verifiedDinasAt || b.createdAt || 0).getTime()
        return timeB - timeA
      })
      .slice(0, 5)
  }, [verifiedDinasData])

  // 4. Fetch Kuota
  const kuotaQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'koordinator_kuotas')
  }, [database])

  const { data: kuotaData, isLoading: isKuotaLoading } = useList(kuotaQuery)

  // 5. On-demand fetch for modal data (only queried when modal is opened)
  const modalQuery = useMemoFirebase(() => {
    if (!database || !selectedFilter) return null
    const baseRef = ref(database, 'businessActors')
    if (selectedFilter.filterType === 'pending') return query(baseRef, orderByChild('status'), equalTo('pending'))
    if (selectedFilter.filterType === 'verifikasi_dinas' || selectedFilter.filterType === 'hasil_verifikasi') {
      return query(baseRef, orderByChild('status'), equalTo('verified_dinas'))
    }
    return baseRef
  }, [database, selectedFilter])

  const { data: modalData, isLoading: isModalLoading } = useList(modalQuery)

  const statsValues = useMemo(() => {
    if (systemStats) {
      return {
        total: (systemStats.status?.verified || 0) + (systemStats.status?.rejected || 0),
        laki: systemStats.gender?.laki ?? (systemStats.gender as any)?.['Laki-laki'] ?? systemStats.verifiedGender?.['Laki-laki'] ?? 0,
        perempuan: systemStats.gender?.perempuan ?? (systemStats.gender as any)?.['Perempuan'] ?? systemStats.verifiedGender?.['Perempuan'] ?? 0,
        verified: systemStats.status?.verified || 0,
        rejected: systemStats.status?.rejected || 0,
        pending: systemStats.status?.pending || 0,
        surveyDinas: systemStats.detailedStatus?.survey || 0,
        verifikasiDinas: systemStats.detailedStatus?.verifikasi || 0,
        hasilVerifikasi: systemStats.detailedStatus?.hasilVerifikasi || 0,
        lpj: systemStats.detailedStatus?.lpj || 0,
        selesai: (systemStats.detailedStatus?.selesai || 0) + (systemStats.detailedStatus?.lpj || 0) || systemStats.status?.finish || 0,
      }
    }
    return {
      total: 0,
      laki: 0,
      perempuan: 0,
      verified: 0,
      rejected: 0,
      pending: 0,
      surveyDinas: 0,
      verifikasiDinas: 0,
      hasilVerifikasi: 0,
      lpj: 0,
      selesai: 0,
    }
  }, [systemStats])

  const [isSyncing, setIsSyncing] = useState(false)
  const isSyncingGuardRef = React.useRef(false)
  const [nextSyncIn, setNextSyncIn] = useState<number>(300)

  const lastSyncTime = useMemo(() => {
    if (!systemStats?.lastUpdated) return null;
    const d = new Date(systemStats.lastUpdated);
    return isNaN(d.getTime()) ? null : d;
  }, [systemStats?.lastUpdated]);

  const handleSyncStats = async (isAuto = false) => {
    if (!database || isSyncingGuardRef.current) return
    isSyncingGuardRef.current = true
    setIsSyncing(true)
    try {
      const { recalculateAndSaveSystemStats } = await import("@/lib/stats-service")
      await recalculateAndSaveSystemStats(database)
      if (!isAuto) {
        toast({ title: "Sinkronisasi Berhasil", description: "Statistik sistem telah diperbarui dengan data terkini." })
      }
    } catch (err) {
      console.error("[Dashboard Auto-Sync] Error:", err)
      if (!isAuto) {
        toast({ variant: "destructive", title: "Gagal Sinkronisasi", description: "Terjadi kesalahan saat menghitung ulang statistik." })
      }
    } finally {
      setIsSyncing(false)
      isSyncingGuardRef.current = false
    }
  }

  const handleSyncStatsRef = useRef(handleSyncStats);
  handleSyncStatsRef.current = handleSyncStats;

  // Countdown Timer & Auto-Sync Execution synchronized with systemStats.lastUpdated (every 5 minutes)
  useEffect(() => {
    const SYNC_INTERVAL_SEC = 300; // 5 menit

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
      handleSyncStatsRef.current(true);
    }

    const timer = setInterval(() => {
      const remaining = calculateRemaining();
      setNextSyncIn(remaining);

      if (remaining <= 0) {
        handleSyncStatsRef.current(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [systemStats?.lastUpdated, database]);

  const coordinatorStats = useMemo(() => {
    if (!systemStats?.coordinator) return []
    return Object.entries(systemStats.coordinator)
      .map(([name, count]) => ({ name, count: count as number }))
      .sort((a, b) => b.count - a.count)
  }, [systemStats])

  const combinedKuotaData = useMemo(() => {
    if (!kuotaData) return []
    
    const achievedMap = systemStats?.coordinator || {}

    return kuotaData.map((item: any) => {
      const quota = item.quota || 0
      const nameUpper = item.name ? item.name.toUpperCase().trim() : ''
      const achieved = achievedMap[nameUpper] || 0
      const remaining = quota - achieved
      return {
        ...item,
        quota,
        achieved,
        remaining
      }
    }).sort((a: any, b: any) => {
      const nameA = (a.name || "").toLowerCase()
      const nameB = (b.name || "").toLowerCase()
      return nameA.localeCompare(nameB)
    })
  }, [kuotaData, systemStats])

  const totalKuotaDashboard = useMemo(() => {
    return combinedKuotaData.reduce((acc, curr) => acc + curr.quota, 0)
  }, [combinedKuotaData])

  const totalAchievedDashboard = useMemo(() => {
    return combinedKuotaData.reduce((acc, curr) => acc + curr.achieved, 0)
  }, [combinedKuotaData])

  const filteredModalData = useMemo(() => {
    if (!selectedFilter || !modalData) return []
    const type = selectedFilter.filterType

    if (type === "total") {
      return modalData.filter(d => {
        const s = d.status || ""
        const isVerified = ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s) && !isCancelDinas(d)
        const isRejected = s === 'rejected' || isCancelDinas(d)
        return isVerified || isRejected
      })
    }

    if (type === "laki") {
      return modalData.filter(d => {
        const s = d.status || ""
        const isVerified = ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s) && !isCancelDinas(d)
        const isRejected = s === 'rejected' || isCancelDinas(d)
        if (!isVerified && !isRejected) return false
        const g = (d.gender || "").toLowerCase().trim()
        return g !== 'perempuan' && g !== 'p'
      })
    }

    if (type === "perempuan") {
      return modalData.filter(d => {
        const s = d.status || ""
        const isVerified = ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s) && !isCancelDinas(d)
        const isRejected = s === 'rejected' || isCancelDinas(d)
        if (!isVerified && !isRejected) return false
        const g = (d.gender || "").toLowerCase().trim()
        return g === 'perempuan' || g === 'p'
      })
    }

    if (type === "verified") {
      return modalData.filter(d => {
        const s = d.status || ""
        return ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s) && !isCancelDinas(d)
      })
    }

    if (type === "pending") return modalData.filter(d => (d.status || 'pending') === 'pending')

    if (type === "rejected") {
      // Menampilkan DITOLAK ADMIN & CANCEL DINAS
      return modalData.filter(d => d.status === 'rejected' || isCancelDinas(d))
    }

    if (type === "survey_dinas") {
      return modalData.filter(d => ['lpj_pending', 'verified_actor'].includes(d.status || ""))
    }

    if (type === "verifikasi_dinas") {
      return modalData.filter(d => {
        const s = d.status || ""
        return ((s === 'verified_dinas' && d.hasilVerifikasiDinas === 'Lolos' && !d.berkasDinasVerified) || s === 'bank_pending') && !isCancelDinas(d)
      })
    }

    if (type === "hasil_verifikasi") {
      return modalData.filter(d => (d.status || "") === 'verified_dinas' && d.hasilVerifikasiDinas === 'Lolos' && Boolean(d.berkasDinasVerified) && !isCancelDinas(d))
    }

    if (type === "selesai") {
      return modalData.filter(d => (d.status || "") === 'finish' && !isCancelDinas(d))
    }

    if (type === "kelurahan") {
      return modalData.filter(d => {
        const k = d.kelurahan?.toLowerCase().trim() || ""
        const targetK = selectedFilter.name.toLowerCase().trim()
        const s = d.status || "pending"
        const isVerified = ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s) && !isCancelDinas(d)
        return k === targetK && isVerified
      })
    }

    return modalData
  }, [modalData, selectedFilter])

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return ((value / total) * 100).toFixed(1);
  };

  const topStats = [
    { 
      name: "Total Data", 
      value: statsValues.total, 
      icon: Building2, 
      filterType: "total",
      percentage: null,
      detail: "DATA TERKINI",
      accentGradient: "from-blue-600 via-indigo-600 to-indigo-700",
      iconBg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50",
      accentBorder: "hover:border-indigo-400/80",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-900/40 dark:text-indigo-300",
      glowColor: "hover:shadow-indigo-500/10",
      barPercent: 100,
      barColor: "bg-indigo-500"
    },
    { 
      name: "Laki-Laki", 
      value: statsValues.laki, 
      icon: Users, 
      filterType: "laki",
      percentage: getPercentage(statsValues.laki, statsValues.total),
      detail: "PROPORSI GENDER",
      accentGradient: "from-sky-500 via-blue-600 to-cyan-600",
      iconBg: "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/50",
      accentBorder: "hover:border-sky-400/80",
      badgeColor: "bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-900/40 dark:text-sky-300",
      glowColor: "hover:shadow-sky-500/10",
      barPercent: Number(getPercentage(statsValues.laki, statsValues.total)),
      barColor: "bg-sky-500"
    },
    { 
      name: "Perempuan", 
      value: statsValues.perempuan, 
      icon: Users, 
      filterType: "perempuan",
      percentage: getPercentage(statsValues.perempuan, statsValues.total),
      detail: "PROPORSI GENDER",
      accentGradient: "from-pink-500 via-rose-600 to-rose-700",
      iconBg: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50",
      accentBorder: "hover:border-rose-400/80",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-900/40 dark:text-rose-300",
      glowColor: "hover:shadow-rose-500/10",
      barPercent: Number(getPercentage(statsValues.perempuan, statsValues.total)),
      barColor: "bg-rose-500"
    },
    { 
      name: "Data Terverifikasi", 
      value: statsValues.verified, 
      icon: UserCheck, 
      filterType: "verified",
      percentage: getPercentage(statsValues.verified, totalKuotaDashboard),
      detail: "DARI TOTAL KUOTA",
      accentGradient: "from-emerald-500 via-teal-600 to-teal-700",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50",
      accentBorder: "hover:border-emerald-400/80",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/40 dark:text-emerald-300",
      glowColor: "hover:shadow-emerald-500/10",
      barPercent: Number(getPercentage(statsValues.verified, totalKuotaDashboard)),
      barColor: "bg-emerald-500"
    },
    { 
      name: "Dibatalkan", 
      value: statsValues.rejected, 
      icon: UserX, 
      filterType: "rejected",
      percentage: getPercentage(statsValues.rejected, totalKuotaDashboard),
      detail: "ADMIN & DINAS",
      accentGradient: "from-amber-500 via-orange-600 to-rose-600",
      iconBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50",
      accentBorder: "hover:border-amber-400/80",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/40 dark:text-amber-300",
      glowColor: "hover:shadow-amber-500/10",
      barPercent: Number(getPercentage(statsValues.rejected, totalKuotaDashboard)),
      barColor: "bg-amber-500"
    }
  ]

  const dinasStageCards = [
    {
      stepNumber: "01",
      name: "Survey Dinas",
      stageTag: "Tahap 1",
      value: statsValues.surveyDinas,
      icon: ClipboardCheck,
      cardGradient: "from-violet-600 via-purple-600 to-indigo-700",
      accentBorder: "hover:border-purple-300 dark:hover:border-purple-500",
      badgeBg: "bg-white/20 text-white border-white/30 backdrop-blur-md",
      iconBg: "bg-white/20 text-white shadow-inner",
      glowColor: "group-hover:shadow-purple-500/25",
      description: "Antrean & Proses Survey Lapangan Petugas",
      filterType: "survey_dinas",
      targetUrl: "/verifikasi-dinas",
      percentage: getPercentage(statsValues.surveyDinas, statsValues.verified || 1)
    },
    {
      stepNumber: "02",
      name: "Verifikasi Dinas",
      stageTag: "Tahap 2",
      value: statsValues.verifikasiDinas,
      icon: FileText,
      cardGradient: "from-indigo-600 via-blue-600 to-indigo-800",
      accentBorder: "hover:border-indigo-300 dark:hover:border-indigo-500",
      badgeBg: "bg-white/20 text-white border-white/30 backdrop-blur-md",
      iconBg: "bg-white/20 text-white shadow-inner",
      glowColor: "group-hover:shadow-indigo-500/25",
      description: "Survey Lolos & Menunggu Cek Berkas Dinas",
      filterType: "verifikasi_dinas",
      targetUrl: "/verifikasi-dinas-berkas",
      percentage: getPercentage(statsValues.verifikasiDinas, statsValues.verified || 1)
    },
    {
      stepNumber: "03",
      name: "Hasil Verifikasi",
      stageTag: "Tahap 3",
      value: statsValues.hasilVerifikasi,
      icon: ListChecks,
      cardGradient: "from-teal-600 via-emerald-600 to-teal-800",
      accentBorder: "hover:border-teal-300 dark:hover:border-teal-500",
      badgeBg: "bg-white/20 text-white border-white/30 backdrop-blur-md",
      iconBg: "bg-white/20 text-white shadow-inner",
      glowColor: "group-hover:shadow-emerald-500/25",
      description: "Lolos Survey & Selesai Verifikasi Berkas",
      filterType: "hasil_verifikasi",
      targetUrl: "/hasil-verifikasi",
      percentage: getPercentage(statsValues.hasilVerifikasi, statsValues.verified || 1)
    },
    {
      stepNumber: "04",
      name: "Rekening Terinput",
      stageTag: "Tahap 4 (Final)",
      value: statsValues.selesai,
      icon: BadgeCheck,
      cardGradient: "from-sky-600 via-blue-600 to-indigo-700",
      accentBorder: "hover:border-sky-300 dark:hover:border-sky-500",
      badgeBg: "bg-white/20 text-white border-white/30 backdrop-blur-md",
      iconBg: "bg-white/20 text-white shadow-inner",
      glowColor: "group-hover:shadow-sky-500/25",
      description: "Data Lolos & Rekening Bank Telah Diinput",
      filterType: "selesai",
      targetUrl: "/finish",
      percentage: getPercentage(statsValues.selesai, statsValues.verified || 1)
    }
  ]

  return (
    <div className="w-full space-y-6 animate-in fade-in-up duration-700">
      {/* Modern Frosted Glass Canvas Container */}
      <div className="bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl border border-white/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 lg:p-7 shadow-2xl shadow-slate-300/40 dark:shadow-none space-y-6 md:space-y-7">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] md:text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Pusat Kendali & Monitoring Data
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight font-headline text-slate-900 dark:text-white uppercase">
              Dashboard Statistik UMKM
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Monitor alur verifikasi dinas, rasio pendaftaran, dan target kuota secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-start md:justify-end w-full md:w-auto">
            {/* Auto-sync countdown pill */}
            <div className="px-3.5 py-2 rounded-2xl flex items-center gap-2.5 border border-blue-200/70 bg-blue-50/80 dark:bg-blue-950/40 dark:border-blue-900 shadow-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-blue-600 animate-ping' : 'bg-blue-500 animate-pulse'}`} />
              <div className="flex flex-col leading-none">
                <span className="text-[9px] md:text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  AUTO SYNC
                </span>
                <span className="text-[11px] md:text-xs font-black text-blue-900 dark:text-blue-200 font-mono mt-0.5">
                  {isSyncing ? 'Sinkronisasi...' : `${Math.floor(nextSyncIn / 60)}:${String(nextSyncIn % 60).padStart(2, '0')}`}
                </span>
              </div>
              {lastSyncTime && (
                <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold hidden lg:inline border-l border-blue-200 dark:border-blue-800 pl-2">
                  {lastSyncTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })} WIB
                </span>
              )}
            </div>

            {userProfile?.role === 'admin' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSyncStats(false)} 
                disabled={isSyncing}
                className="border-primary/30 text-primary hover:bg-primary hover:text-white font-black text-[10px] md:text-xs h-9 sm:h-10 px-3.5 rounded-2xl shadow-sm transition-all active:scale-95"
              >
                {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                SYNC STATS
              </Button>
            )}

            <div className="px-3.5 py-2 rounded-2xl flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900 shadow-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Sistem: <strong className="text-emerald-700 dark:text-emerald-400 font-black">AKTIF</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Top 5 KPI Stats Cards */}
        <div className="grid gap-3.5 md:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 items-stretch">
          {topStats.map((stat) => (
            <Card 
              key={stat.name} 
              onClick={() => setSelectedFilter({ name: stat.name, filterType: stat.filterType })}
              className={cn(
                "relative overflow-hidden bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all duration-300 group cursor-pointer active:scale-95 flex flex-col justify-between h-full",
                "hover:shadow-xl hover:-translate-y-1",
                stat.accentBorder,
                stat.glowColor
              )}
            >
              {/* Gradient accent top stripe */}
              <div className={cn("h-1.5 w-full bg-gradient-to-r shrink-0", stat.accentGradient)} />

              <CardHeader className="p-3.5 sm:p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1 pr-2">
                  <span className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 line-clamp-1">
                    {stat.name}
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                    {isStatsLoading ? "..." : stat.value.toLocaleString('id-ID')}
                  </div>
                </div>
                <div className={cn("p-2 sm:p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110 shadow-sm shrink-0", stat.iconBg)}>
                  <stat.icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
              </CardHeader>

              <CardContent className="p-3.5 sm:p-4 pt-1 space-y-2.5">
                {/* Visual proportion progress bar if percentage exists */}
                {stat.percentage !== null ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] md:text-[10px] font-bold text-slate-500">
                      <span>Proporsi / Capaian</span>
                      <span className="font-mono font-black text-slate-700 dark:text-slate-200">{stat.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-700 ease-out", stat.barColor)}
                        style={{ width: `${Math.min(100, Math.max(3, Number(stat.barPercent)))}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-2" />
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                  <span className="flex items-center gap-1 truncate">
                    <TrendingUp className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    {stat.detail}
                  </span>
                  <span className="text-primary group-hover:translate-x-0.5 transition-transform text-[10px] font-black shrink-0">
                    &rarr;
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ─── TAHAPAN VERIFIKASI DINAS (PIPELINE / STEPPER CARDS) ─── */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h2 className="text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 dark:text-indigo-400" />
                Statistik Alur & Tahapan Dinas
              </h2>
              <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Alur bertahap: Survey Lapangan &rarr; Cek Berkas Dinas &rarr; Lolos Verifikasi &rarr; Rekening Terinput Selesai.
              </p>
            </div>
            <div className="self-start sm:self-auto flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-xs">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Total Terverifikasi:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{statsValues.verified.toLocaleString('id-ID')}</strong>
              </div>
            </div>
          </div>

          <div className="grid gap-3.5 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
            {dinasStageCards.map((stage) => (
              <Card 
                key={stage.name}
                onClick={() => setSelectedFilter({ name: stage.name, filterType: stage.filterType, targetUrl: stage.targetUrl })}
                className={cn(
                  "relative overflow-hidden border border-white/20 shadow-md transition-all duration-300 cursor-pointer active:scale-95 group flex flex-col justify-between h-full rounded-2xl text-white",
                  "bg-gradient-to-br",
                  stage.cardGradient,
                  stage.accentBorder,
                  stage.glowColor,
                  "hover:shadow-2xl hover:-translate-y-1.5"
                )}
              >
                {/* Decorative large step number watermark */}
                <span className="absolute -top-3 -right-2 text-7xl md:text-8xl font-black text-white/[0.08] select-none pointer-events-none tracking-tighter leading-none">
                  {stage.stepNumber}
                </span>

                {/* Ambient background glow bubble */}
                <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

                <CardHeader className="p-4 pb-2 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm", stage.badgeBg)}>
                      {stage.stageTag}
                    </span>
                    <div className={cn("p-2 rounded-xl backdrop-blur-md group-hover:scale-110 transition-transform duration-300 shadow-sm", stage.iconBg)}>
                      <stage.icon className="w-4 h-4 md:w-4.5 md:h-4.5" />
                    </div>
                  </div>
                  <CardTitle className="text-base md:text-lg font-black text-white uppercase tracking-tight mt-2 flex items-center gap-2">
                    {stage.name}
                  </CardTitle>
                  <p className="text-[10px] md:text-[11px] font-medium text-white/80 line-clamp-1">
                    {stage.description}
                  </p>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3 relative z-10">
                  <div className="flex items-baseline justify-between pt-1">
                    <div className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none">
                      {isStatsLoading ? "..." : stage.value.toLocaleString('id-ID')}
                      <span className="text-[10px] md:text-xs font-semibold text-white/75 ml-1.5">Pelaku Usaha</span>
                    </div>
                    <div className="text-[10px] md:text-xs font-black text-white bg-white/20 backdrop-blur-sm border border-white/25 px-2 py-0.5 rounded-full shadow-sm">
                      {stage.percentage}%
                    </div>
                  </div>

                  {/* Progress bar relative to total verified */}
                  <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden p-0.5">
                    <div 
                      className="bg-white h-full rounded-full transition-all duration-700 ease-out shadow-sm" 
                      style={{ width: `${Math.min(100, Math.max(3, Number(stage.percentage)))}%` }}
                    />
                  </div>

                  {/* Card Action Link */}
                  <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[10px] md:text-[11px] font-semibold text-white/90">
                    <span className="flex items-center gap-1 group-hover:text-white transition-colors">
                      Lihat Rincian Data
                    </span>
                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(stage.targetUrl)
                      }}
                      className="h-6 px-2 text-[9px] md:text-[10px] font-black bg-white/20 hover:bg-white text-white hover:text-slate-900 rounded-lg transition-all shadow-sm flex items-center gap-1 active:scale-95"
                    >
                      Buka Menu <ArrowRight className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ─── 5 DATA TERBARU VERIFIKASI DINAS & HASIL VERIFIKASI ─── */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h2 className="text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-2">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 dark:text-indigo-400" />
                Data Terkini Masuk Tahapan Dinas
              </h2>
              <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Daftar 5 pelaku usaha terbaru yang masuk antrean Verifikasi Dinas dan Hasil Verifikasi beserta waktu data masuk.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:gap-5 grid-cols-1 lg:grid-cols-2 items-stretch">
            {/* Card 1: 5 Data Terbaru Verifikasi Dinas (Tahap 2) */}
            <Card className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md overflow-hidden transition-all hover:shadow-xl border border-indigo-100 dark:border-indigo-950/60 flex flex-col shadow-sm rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-indigo-50/90 via-violet-50/80 to-blue-50/90 dark:from-indigo-950/40 dark:to-slate-900 border-b border-indigo-100/80 dark:border-indigo-900/50 p-3.5 pb-2.5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/20">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs md:text-sm font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-tight flex items-center gap-2">
                      Verifikasi Dinas
                      <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-300 text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-full">
                        Tahap 2
                      </Badge>
                    </CardTitle>
                    <p className="text-[10px] md:text-[11px] font-medium text-indigo-600/90 dark:text-indigo-400">
                      5 data terbaru lolos survey & menunggu cek berkas dinas
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/verifikasi-dinas-berkas')}
                  className="text-[10px] md:text-[11px] font-black text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50 h-7 px-2.5 rounded-xl flex items-center gap-1 shrink-0 transition-all"
                >
                  Lihat Semua <ArrowRight className="w-3 h-3" />
                </Button>
              </CardHeader>

              <CardContent className="p-0 flex-1 flex flex-col justify-between overflow-hidden">
                <div className="w-full overflow-hidden">
                  <table className="w-full table-fixed text-left border-collapse">
                    <colgroup>
                      <col className="w-8 md:w-9" />
                      <col className="w-[38%]" />
                      <col className="w-[34%]" />
                      <col className="w-[28%] min-w-[90px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
                        <th className="w-8 md:w-9 text-center font-black text-[9px] md:text-[10px] text-slate-700 dark:text-slate-300 uppercase py-2 px-1">
                          No
                        </th>
                        <th className="font-black text-[9px] md:text-[10px] text-slate-700 dark:text-slate-300 uppercase py-2 px-2">
                          Pelaku Usaha
                        </th>
                        <th className="font-black text-[9px] md:text-[10px] text-slate-700 dark:text-slate-300 uppercase py-2 px-2">
                          Usaha / Wilayah
                        </th>
                        <th className="font-black text-[9px] md:text-[10px] text-slate-700 dark:text-slate-300 uppercase py-2 px-2 text-left">
                          Waktu Masuk
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {isVerifiedDinasLoading ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8">
                            <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium text-xs">
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                              Memuat data Verifikasi Dinas...
                            </div>
                          </td>
                        </tr>
                      ) : latestVerifikasiDinas.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-muted-foreground italic font-medium text-xs">
                            Belum ada data pada menu Verifikasi Dinas.
                          </td>
                        </tr>
                      ) : (
                        latestVerifikasiDinas.map((actor, idx) => {
                          const masukTime = actor.verifiedDinasAt || (actor.surveyData as any)?.tanggalSurvey || actor.createdAt
                          const dt = formatDateTimeParts(masukTime)
                          return (
                            <tr 
                              key={actor.id} 
                              onClick={() => setDetailActor(actor)}
                              className="hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer group"
                            >
                              <td className="text-center py-2 px-1">
                                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 inline-flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-2 px-2 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-[9px] md:text-[10px] flex items-center justify-center shrink-0 border border-indigo-200/50">
                                    {getInitials(actor.fullName)}
                                  </div>
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-black text-slate-800 dark:text-slate-100 text-[11px] md:text-xs uppercase group-hover:text-indigo-600 transition-colors truncate block" title={actor.fullName}>
                                      {actor.fullName || "-"}
                                    </span>
                                    <span className="text-[9px] md:text-[10px] font-mono text-slate-500 truncate block">
                                      {actor.nik || "-"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-2 min-w-0">
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-slate-700 dark:text-slate-200 text-[11px] md:text-xs uppercase truncate block" title={actor.businessName}>
                                    {actor.businessName || "-"}
                                  </span>
                                  <span className="text-[9px] md:text-[10px] text-slate-500 uppercase truncate flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{actor.kelurahan || actor.coordinator || "-"}</span>
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex flex-col text-left">
                                  <span className="text-[10px] md:text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap">
                                    {dt.date}
                                  </span>
                                  <span className="text-[9px] md:text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5 leading-tight whitespace-nowrap">
                                    <Clock className="w-2.5 h-2.5 shrink-0" />
                                    {dt.time}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] md:text-[11px] font-medium text-slate-600 dark:text-slate-400 px-4">
                  <span>Total antrean: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{statsValues.verifikasiDinas}</strong> pelaku usaha</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/verifikasi-dinas-berkas')}
                    className="h-6 text-[9px] md:text-[10px] font-black border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 px-2.5 rounded-lg"
                  >
                    Buka Verifikasi Dinas <ExternalLink className="w-2.5 h-2.5 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: 5 Data Terbaru Hasil Verifikasi (Tahap 3) */}
            <Card className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md overflow-hidden transition-all hover:shadow-xl border border-teal-100 dark:border-teal-950/60 flex flex-col shadow-sm rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-teal-50/90 via-emerald-50/80 to-teal-50/90 dark:from-teal-950/40 dark:to-slate-900 border-b border-teal-100/80 dark:border-teal-900/50 p-3.5 pb-2.5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-teal-600 text-white rounded-xl shadow-md shadow-teal-600/20">
                    <ListChecks className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs md:text-sm font-black text-teal-950 dark:text-teal-200 uppercase tracking-tight flex items-center gap-2">
                      Hasil Verifikasi
                      <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100 border-teal-200 dark:bg-teal-900/60 dark:text-teal-300 text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-full">
                        Tahap 3 (Final)
                      </Badge>
                    </CardTitle>
                    <p className="text-[10px] md:text-[11px] font-medium text-teal-600/90 dark:text-teal-400">
                      5 data terbaru selesai verifikasi berkas & dinyatakan lolos
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/hasil-verifikasi')}
                  className="text-[10px] md:text-[11px] font-black text-teal-700 dark:text-teal-300 hover:bg-teal-100/70 dark:hover:bg-teal-900/50 h-7 px-2.5 rounded-xl flex items-center gap-1 shrink-0 transition-all"
                >
                  Lihat Semua <ArrowRight className="w-3 h-3" />
                </Button>
              </CardHeader>

              <CardContent className="p-0 flex-1 flex flex-col justify-between overflow-hidden">
                <div className="w-full overflow-hidden">
                  <table className="w-full table-fixed text-left border-collapse">
                    <colgroup>
                      <col className="w-8 md:w-9" />
                      <col className="w-[38%]" />
                      <col className="w-[34%]" />
                      <col className="w-[28%] min-w-[90px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
                        <th className="w-8 md:w-9 text-center font-black text-[9px] md:text-[10px] text-slate-700 dark:text-slate-300 uppercase py-2 px-1">
                          No
                        </th>
                        <th className="font-black text-[9px] md:text-[10px] text-slate-700 dark:text-slate-300 uppercase py-2 px-2">
                          Pelaku Usaha
                        </th>
                        <th className="font-black text-[9px] md:text-[10px] text-slate-700 dark:text-slate-300 uppercase py-2 px-2">
                          Usaha / Wilayah
                        </th>
                        <th className="font-black text-[9px] md:text-[10px] text-slate-700 dark:text-slate-300 uppercase py-2 px-2 text-left">
                          Waktu Masuk
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {isVerifiedDinasLoading ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8">
                            <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium text-xs">
                              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                              Memuat data Hasil Verifikasi...
                            </div>
                          </td>
                        </tr>
                      ) : latestHasilVerifikasi.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-muted-foreground italic font-medium text-xs">
                            Belum ada data pada menu Hasil Verifikasi.
                          </td>
                        </tr>
                      ) : (
                        latestHasilVerifikasi.map((actor, idx) => {
                          const masukTime = actor.berkasDinasVerifiedAt || actor.verifiedDinasAt || actor.createdAt
                          const dt = formatDateTimeParts(masukTime)
                          return (
                            <tr 
                              key={actor.id} 
                              onClick={() => setDetailActor(actor)}
                              className="hover:bg-teal-50/50 dark:hover:bg-teal-950/30 transition-colors cursor-pointer group"
                            >
                              <td className="text-center py-2 px-1">
                                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 inline-flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-2 px-2 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-black text-[9px] md:text-[10px] flex items-center justify-center shrink-0 border border-teal-200/50">
                                    {getInitials(actor.fullName)}
                                  </div>
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-black text-slate-800 dark:text-slate-100 text-[11px] md:text-xs uppercase group-hover:text-teal-600 transition-colors truncate block" title={actor.fullName}>
                                      {actor.fullName || "-"}
                                    </span>
                                    <span className="text-[9px] md:text-[10px] font-mono text-slate-500 truncate block">
                                      {actor.nik || "-"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-2 min-w-0">
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-slate-700 dark:text-slate-200 text-[11px] md:text-xs uppercase truncate block" title={actor.businessName}>
                                    {actor.businessName || "-"}
                                  </span>
                                  <span className="text-[9px] md:text-[10px] text-slate-500 uppercase truncate flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{actor.kelurahan || actor.coordinator || "-"}</span>
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex flex-col text-left">
                                  <span className="text-[10px] md:text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap">
                                    {dt.date}
                                  </span>
                                  <span className="text-[9px] md:text-[10px] font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1 mt-0.5 leading-tight whitespace-nowrap">
                                    <Clock className="w-2.5 h-2.5 shrink-0" />
                                    {dt.time}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] md:text-[11px] font-medium text-slate-600 dark:text-slate-400 px-4">
                  <span>Total lolos: <strong className="text-teal-600 dark:text-teal-400 font-bold">{statsValues.hasilVerifikasi}</strong> pelaku usaha</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/hasil-verifikasi')}
                    className="h-6 text-[9px] md:text-[10px] font-black border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 px-2.5 rounded-lg"
                  >
                    Buka Hasil Verifikasi <ExternalLink className="w-2.5 h-2.5 ml-1" />
                  </Button>
                </div>
              </CardContent>


            </Card>
          </div>
        </div>

        {/* ─── GRID: KUOTA USULAN ─── */}
        <div className="w-full flex flex-col h-full min-h-0">
          <Card className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md overflow-hidden transition-all hover:shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col rounded-2xl shadow-sm">
            <CardHeader className="bg-slate-50/90 dark:bg-slate-800/80 p-4 pb-3 border-b border-slate-200/80 dark:border-slate-800 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-sm md:text-base font-black flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tight">
                <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-primary" /> Target & Ketercapaian Kuota Usulan
              </CardTitle>

              {/* Summary chips */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2.5 py-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[10px]">
                  Target: {totalKuotaDashboard}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-[10px]">
                  Tercapai: {totalAchievedDashboard}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black text-[10px]">
                  Sisa: {Math.max(0, totalKuotaDashboard - totalAchievedDashboard)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[40px] text-center font-black text-slate-800 dark:text-slate-200 text-[9px] md:text-[10px] px-2 py-2.5">No</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-200 text-[9px] md:text-[10px] min-w-[140px] px-3 py-2.5">Nama Usulan</TableHead>
                      <TableHead className="text-center font-black text-slate-800 dark:text-slate-200 text-[9px] md:text-[10px] px-2 py-2.5">Target Kuota</TableHead>
                      <TableHead className="text-center font-black text-slate-800 dark:text-slate-200 text-[9px] md:text-[10px] px-2 py-2.5">Tercapai</TableHead>
                      <TableHead className="text-center font-black text-slate-800 dark:text-slate-200 text-[9px] md:text-[10px] px-2 py-2.5">Sisa Kuota</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-200 text-[9px] md:text-[10px] min-w-[130px] px-3 py-2.5">Progress Capaian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isKuotaLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 px-2">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium text-xs">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            Memuat data kuota...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : combinedKuotaData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 px-2 text-muted-foreground italic font-medium text-xs">
                          Belum ada data target kuota yang didaftarkan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      combinedKuotaData.map((item: any, index: number) => {
                        const percentAchieved = item.quota > 0 ? Math.min(100, Math.round((item.achieved / item.quota) * 100)) : 0
                        return (
                          <TableRow key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <TableCell className="text-center font-bold text-slate-600 dark:text-slate-400 text-xs px-2 py-2.5">{index + 1}</TableCell>
                            <TableCell className="font-black text-primary text-xs tracking-tight px-3 py-2.5">{item.name}</TableCell>
                            <TableCell className="text-center px-2 py-2.5">
                              <span className="inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black px-2.5 py-0.5 rounded-full min-w-[2.5rem] shadow-sm text-xs border border-slate-200 dark:border-slate-700">
                                {item.quota}
                              </span>
                            </TableCell>
                            <TableCell className="text-center px-2 py-2.5">
                              <span className="inline-flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black px-2.5 py-0.5 rounded-full min-w-[2.5rem] shadow-sm text-xs border border-emerald-200 dark:border-emerald-800">
                                {item.achieved}
                              </span>
                            </TableCell>
                            <TableCell className="text-center px-2 py-2.5">
                              <span className={cn(
                                "inline-flex items-center justify-center font-black px-2.5 py-0.5 rounded-full min-w-[2.5rem] shadow-sm text-xs border",
                                item.remaining <= 0 
                                  ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800" 
                                  : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                              )}>
                                {item.remaining}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      percentAchieved >= 100 ? "bg-emerald-500" : percentAchieved >= 60 ? "bg-blue-500" : "bg-amber-500"
                                    )}
                                    style={{ width: `${percentAchieved}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono font-black text-slate-700 dark:text-slate-300 w-9 text-right">
                                  {percentAchieved}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                  {!isKuotaLoading && combinedKuotaData.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                        <TableCell colSpan={2} className="font-black text-slate-800 dark:text-slate-100 uppercase text-right text-xs px-3 py-2.5">
                          Total Kuota Data
                        </TableCell>
                        <TableCell className="text-center font-black text-slate-700 dark:text-slate-200 text-sm px-2 py-2.5">
                          {totalKuotaDashboard}
                        </TableCell>
                        <TableCell className="text-center font-black text-emerald-600 dark:text-emerald-400 text-sm px-2 py-2.5">
                          {totalAchievedDashboard}
                        </TableCell>
                        <TableCell className="text-center font-black text-primary text-sm px-2 py-2.5">
                          {totalKuotaDashboard - totalAchievedDashboard}
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          <span className="text-[11px] font-black text-primary font-mono">
                            {totalKuotaDashboard > 0 ? ((totalAchievedDashboard / totalKuotaDashboard) * 100).toFixed(1) : 0}% Tercapai
                          </span>
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Modal Dialog */}
      <Dialog open={!!selectedFilter} onOpenChange={(open) => {
        if (!open) {
          setSelectedFilter(null)
          setExpandedActorId(null)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 mr-6">
            <div>
              <DialogTitle className="text-xl font-black uppercase text-primary flex items-center gap-2">
                DATA: {selectedFilter?.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Menampilkan total <strong>{filteredModalData.length}</strong> data pelaku usaha.
              </DialogDescription>
            </div>
            {selectedFilter?.targetUrl && (
              <Button 
                size="sm"
                variant="outline"
                onClick={() => router.push(selectedFilter.targetUrl!)}
                className="text-xs font-bold border-primary text-primary hover:bg-primary hover:text-white transition-all flex items-center gap-1.5"
              >
                Menuju Menu <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-auto rounded-xl border">
            {isModalLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filteredModalData.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-medium text-xs">
                Tidak ada data pelaku usaha yang sesuai dengan filter ini.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b">
                  <TableRow>
                    <TableHead className="w-[50px] text-center font-black text-slate-800 text-xs">No</TableHead>
                    <TableHead className="font-black text-slate-800 text-xs">Nama Lengkap</TableHead>
                    <TableHead className="font-black text-slate-800 text-xs">NIK</TableHead>
                    <TableHead className="font-black text-slate-800 text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModalData.map((d, i) => {
                    const isCancelDinas = (d.status === 'verified_dinas' && d.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean((d as any).alasanCancelDinas)
                    const isRejectedAdmin = d.status === 'rejected'
                    
                    return (
                      <React.Fragment key={d.id}>
                        <TableRow 
                          className="cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => setExpandedActorId(prev => prev === d.id ? null : d.id)}
                        >
                          <TableCell className="text-center font-bold text-slate-600 text-xs">{i + 1}</TableCell>
                          <TableCell className="font-black text-slate-800 text-xs uppercase">{d.fullName || "-"}</TableCell>
                          <TableCell className="font-mono text-slate-600 text-xs">{d.nik || "-"}</TableCell>
                          <TableCell className="text-center">
                            {isCancelDinas ? (
                              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border bg-rose-100 text-rose-700 border-rose-300">
                                CANCEL DINAS
                              </span>
                            ) : isRejectedAdmin ? (
                              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border bg-orange-100 text-orange-700 border-orange-300">
                                DITOLAK ADMIN
                              </span>
                            ) : (d.status === 'lpj_pending' || d.status === 'verified_actor') ? (
                              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300">
                                {d.status === 'verified_actor' ? 'SURVEY (ANTREAN)' : 'SURVEY DINAS'}
                              </span>
                            ) : d.status === 'verified_dinas' && d.hasilVerifikasiDinas === 'Lolos' && !d.berkasDinasVerified ? (
                              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border bg-indigo-100 text-indigo-700 border-indigo-300">
                                VERIFIKASI BERKAS
                              </span>
                            ) : d.status === 'verified_dinas' && d.hasilVerifikasiDinas === 'Lolos' && d.berkasDinasVerified ? (
                              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border bg-teal-100 text-teal-700 border-teal-300">
                                HASIL VERIFIKASI
                              </span>
                            ) : d.status === 'finish' ? (
                              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border bg-sky-100 text-sky-700 border-sky-300">
                                SELESAI
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600">
                                {(d.status || "PENDING").replace(/_/g, " ")}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>

                        {expandedActorId === d.id && (
                          <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableCell colSpan={4} className="p-0 border-b">
                              <div className="p-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <p className="font-bold text-slate-400 mb-1">USAHA</p>
                                    <p className="font-black text-primary uppercase">{d.businessName || "-"}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{d.businessCategory || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-400 mb-1">NO. HP</p>
                                    <p className="font-bold text-slate-700">{d.phone || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-400 mb-1">GENDER</p>
                                    <p className="font-bold text-slate-700 uppercase">{d.gender || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-400 mb-1">KOORDINATOR</p>
                                    <p className="font-bold text-slate-700 uppercase">{d.coordinator || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-400 mb-1">PETUGAS SURVEY</p>
                                    <p className="font-bold text-slate-700 uppercase">{d.petugasSurvey || d.createdBy || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-400 mb-1">VERIFIKATOR DINAS</p>
                                    <p className="font-bold text-slate-700 uppercase">{d.verifikatorDinas || (d as any).berkasDinasVerifiedBy || "-"}</p>
                                  </div>

                                  {(isCancelDinas || isRejectedAdmin) && (
                                    <div className="col-span-2 md:col-span-4 bg-red-50 border border-red-200 p-3 rounded-lg">
                                      <p className="font-black text-red-700 mb-1 flex items-center gap-1.5">
                                        <AlertCircle className="w-4 h-4" /> ALASAN {isCancelDinas ? "CANCEL DINAS" : "PENOLAKAN"}
                                      </p>
                                      <p className="text-xs font-semibold text-red-800">
                                        {(d as any).alasanCancelDinas || d.rejectionReason || d.keteranganDinas || "Tidak ada alasan spesifik tercatat."}
                                      </p>
                                      {(d as any).cancelDinasBy && (
                                        <p className="text-[10px] text-red-600 mt-1">
                                          Dibatalkan oleh: <strong>{(d as any).cancelDinasBy}</strong> ({(d as any).cancelDinasAt ? new Date((d as any).cancelDinasAt).toLocaleString('id-ID') : '-'})
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  <div className="col-span-2 md:col-span-4 border-t pt-2 mt-1">
                                    <p className="font-bold text-slate-400 mb-1">ALAMAT LENGKAP</p>
                                    <p className="font-bold text-slate-700 uppercase">{d.address || "-"} RT/RW {d.rtRw || "-"} Kel. {d.kelurahan || "-"}, Kec. {d.kecamatan || "-"}</p>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Actor Dialog for 5 latest tables */}
      <Dialog open={!!detailActor} onOpenChange={(open) => !open && setDetailActor(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailActor && (
            <>
              <DialogHeader className="border-b pb-3">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg font-black uppercase text-primary flex items-center gap-2">
                    <UserCheck className="w-5 h-5" /> Detail Pelaku Usaha
                  </DialogTitle>
                  <Badge className={cn(
                    "text-[10px] font-black uppercase px-2.5 py-0.5",
                    detailActor.berkasDinasVerified ? "bg-teal-100 text-teal-700 border-teal-300" : "bg-indigo-100 text-indigo-700 border-indigo-300"
                  )}>
                    {detailActor.berkasDinasVerified ? "Hasil Verifikasi (Lolos)" : "Verifikasi Dinas"}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  Rincian data pelaku usaha pada alur verifikasi dinas.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                {/* Informasi Masuk Menu */}
                <div className="bg-slate-50 border rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Waktu Masuk Verifikasi Dinas</p>
                    <p className="font-bold text-indigo-900 flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      {formatDateTimeIndo(detailActor.verifiedDinasAt || (detailActor.surveyData as any)?.tanggalSurvey || detailActor.createdAt)}
                    </p>
                  </div>
                  {detailActor.berkasDinasVerified && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Waktu Lolos Hasil Verifikasi</p>
                      <p className="font-bold text-teal-900 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        {formatDateTimeIndo(detailActor.berkasDinasVerifiedAt || detailActor.verifiedDinasAt || detailActor.createdAt)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Profil & Usaha */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white border rounded-xl p-3">
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">NAMA LENGKAP</p>
                    <p className="font-black text-slate-800 uppercase">{detailActor.fullName || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">NIK</p>
                    <p className="font-mono font-bold text-slate-700">{detailActor.nik || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">NO. KK</p>
                    <p className="font-mono font-bold text-slate-700">{detailActor.noKK || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">NAMA USAHA</p>
                    <p className="font-black text-primary uppercase">{detailActor.businessName || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">KATEGORI USAHA</p>
                    <p className="font-bold text-slate-700 uppercase">{detailActor.businessCategory || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">NO. HP</p>
                    <p className="font-bold text-slate-700">{detailActor.phone || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">KOORDINATOR</p>
                    <p className="font-bold text-slate-700 uppercase">{detailActor.coordinator || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">PETUGAS SURVEY</p>
                    <p className="font-bold text-slate-700 uppercase">{detailActor.petugasSurvey || detailActor.createdBy || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">VERIFIKATOR DINAS</p>
                    <p className="font-bold text-slate-700 uppercase">{detailActor.verifikatorDinas || (detailActor as any).berkasDinasVerifiedBy || "-"}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-3 border-t pt-2 mt-1">
                    <p className="font-bold text-slate-400 text-[10px] uppercase">ALAMAT LENGKAP</p>
                    <p className="font-bold text-slate-700 uppercase">
                      {detailActor.address || "-"} RT/RW {detailActor.rtRw || "-"} Kel. {detailActor.kelurahan || "-"}, Kec. {detailActor.kecamatan || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailActor(null)}
                    className="font-bold"
                  >
                    Tutup
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const target = detailActor.berkasDinasVerified ? '/hasil-verifikasi' : '/verifikasi-dinas-berkas'
                      setDetailActor(null)
                      router.push(target)
                    }}
                    className={cn(
                      "font-bold text-white shadow-sm",
                      detailActor.berkasDinasVerified ? "bg-teal-600 hover:bg-teal-700" : "bg-indigo-600 hover:bg-indigo-700"
                    )}
                  >
                    Buka Menu {detailActor.berkasDinasVerified ? "Hasil Verifikasi" : "Verifikasi Dinas"} <ExternalLink className="w-3 h-3 ml-1.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
