"use client"

import { useMemoFirebase, useList, useUser, useDatabase, useObject } from "@/firebase"
import { ref, query, orderByChild, equalTo, limitToFirst } from "firebase/database"
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
  Clock
} from "lucide-react"
import { useRouter } from "next/navigation"
import React, { useEffect, useMemo, useState } from "react"
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

  // 3. Fetch ONLY verified_dinas actors for the 5 latest tables (targeted query, lightweight)
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
    if (selectedFilter.filterType === 'survey_dinas') return query(baseRef, orderByChild('status'), equalTo('lpj_pending'))
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
        laki: systemStats.verifiedGender?.['Laki-laki'] || systemStats.gender?.['Laki-laki'] || systemStats.gender?.laki || 0,
        perempuan: systemStats.verifiedGender?.['Perempuan'] || systemStats.gender?.['Perempuan'] || systemStats.gender?.perempuan || 0,
        verified: systemStats.status?.verified || 0,
        rejected: systemStats.status?.rejected || 0,
        pending: systemStats.status?.pending || 0,
        surveyDinas: systemStats.detailedStatus?.survey || 0,
        verifikasiDinas: systemStats.detailedStatus?.verifikasi || 0,
        hasilVerifikasi: systemStats.detailedStatus?.hasilVerifikasi || 0,
        lpj: systemStats.detailedStatus?.lpj || 0,
        selesai: systemStats.detailedStatus?.selesai || systemStats.status?.finish || 0,
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

  const handleSyncStats = async () => {
    if (!database || isSyncingGuardRef.current) return
    isSyncingGuardRef.current = true
    setIsSyncing(true)
    try {
      const { recalculateAndSaveSystemStats } = await import("@/lib/stats-service")
      await recalculateAndSaveSystemStats(database)
      toast({ title: "Sinkronisasi Berhasil", description: "Statistik sistem telah diperbarui dengan data terkini." })
    } catch (err) {
      console.error(err)
      toast({ variant: "destructive", title: "Gagal Sinkronisasi", description: "Terjadi kesalahan saat menghitung ulang statistik." })
    } finally {
      setIsSyncing(false)
      isSyncingGuardRef.current = false
    }
  }

  // Ringan & Cepat: Countdown timer tampilan saja
  useEffect(() => {
    const SYNC_INTERVAL = 300; // 5 menit dalam detik

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
      return modalData.filter(d => (d.status || "") === 'lpj_pending')
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
      color: "text-white", 
      bg: "bg-white/20",
      cardBg: "bg-amber-500",
      hoverBg: "hover:bg-amber-600",
      border: "border-amber-400",
      filterType: "total",
      percentage: null,
      detail: "DATA TERKINI"
    },
    { 
      name: "Laki-Laki", 
      value: statsValues.laki, 
      icon: Users, 
      color: "text-white", 
      bg: "bg-white/20",
      cardBg: "bg-blue-600",
      hoverBg: "hover:bg-blue-700",
      border: "border-blue-500",
      filterType: "laki",
      percentage: getPercentage(statsValues.laki, statsValues.total),
      detail: "DATA TERKINI"
    },
    { 
      name: "Perempuan", 
      value: statsValues.perempuan, 
      icon: Users, 
      color: "text-white", 
      bg: "bg-white/20",
      cardBg: "bg-rose-500",
      hoverBg: "hover:bg-rose-600",
      border: "border-rose-400",
      filterType: "perempuan",
      percentage: getPercentage(statsValues.perempuan, statsValues.total),
      detail: "DATA TERKINI"
    },
    { 
      name: "Data Terverifikasi", 
      value: statsValues.verified, 
      icon: UserCheck, 
      color: "text-white", 
      bg: "bg-white/20",
      cardBg: "bg-emerald-600",
      hoverBg: "hover:bg-emerald-700",
      border: "border-emerald-500",
      filterType: "verified",
      percentage: getPercentage(statsValues.verified, totalKuotaDashboard),
      detail: "DATA TERKINI"
    },
    { 
      name: "Cancell", 
      value: statsValues.rejected, 
      icon: UserX, 
      color: "text-white", 
      bg: "bg-white/20",
      cardBg: "bg-orange-500",
      hoverBg: "hover:bg-orange-600",
      border: "border-orange-400",
      filterType: "rejected",
      percentage: getPercentage(statsValues.rejected, totalKuotaDashboard),
      detail: "ADMIN & DINAS"
    }
  ]

  const dinasStageCards = [
    {
      name: "Survey Dinas",
      stageTag: "Tahap 1",
      value: statsValues.surveyDinas,
      icon: ClipboardCheck,
      cardBg: "bg-gradient-to-br from-fuchsia-600 to-purple-700",
      hoverBorder: "hover:border-fuchsia-300",
      textColor: "text-white",
      badgeBg: "bg-fuchsia-500/40 text-fuchsia-100 border-fuchsia-300/30",
      description: "Antrean & Proses Survey Lapangan Petugas",
      filterType: "survey_dinas",
      targetUrl: "/verifikasi-dinas",
      percentage: getPercentage(statsValues.surveyDinas, statsValues.verified || 1)
    },
    {
      name: "Verifikasi Dinas",
      stageTag: "Tahap 2",
      value: statsValues.verifikasiDinas,
      icon: FileText,
      cardBg: "bg-gradient-to-br from-indigo-600 to-violet-800",
      hoverBorder: "hover:border-indigo-300",
      textColor: "text-white",
      badgeBg: "bg-indigo-500/40 text-indigo-100 border-indigo-300/30",
      description: "Survey Lolos & Menunggu Cek Berkas Dinas",
      filterType: "verifikasi_dinas",
      targetUrl: "/verifikasi-dinas-berkas",
      percentage: getPercentage(statsValues.verifikasiDinas, statsValues.verified || 1)
    },
    {
      name: "Hasil Verifikasi",
      stageTag: "Tahap 3",
      value: statsValues.hasilVerifikasi,
      icon: ListChecks,
      cardBg: "bg-gradient-to-br from-teal-600 to-emerald-700",
      hoverBorder: "hover:border-teal-300",
      textColor: "text-white",
      badgeBg: "bg-teal-500/40 text-teal-100 border-teal-300/30",
      description: "Lolos Survey & Selesai Verifikasi Berkas",
      filterType: "hasil_verifikasi",
      targetUrl: "/hasil-verifikasi",
      percentage: getPercentage(statsValues.hasilVerifikasi, statsValues.verified || 1)
    },
    {
      name: "Rekening Terinput",
      stageTag: "Tahap 4 (Final)",
      value: statsValues.selesai,
      icon: BadgeCheck,
      cardBg: "bg-gradient-to-br from-sky-600 to-blue-700",
      hoverBorder: "hover:border-sky-300",
      textColor: "text-white",
      badgeBg: "bg-sky-500/40 text-sky-100 border-sky-300/30",
      description: "Data Lolos & Rekening Bank Telah Diinput",
      filterType: "selesai",
      targetUrl: "/finish",
      percentage: getPercentage(statsValues.selesai, statsValues.verified || 1)
    }
  ]

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in-up duration-700">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1 relative">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight font-headline text-slate-800 uppercase drop-shadow-sm">
            Dashboard Statistik
          </h1>
          <p className="text-xs md:text-sm text-slate-600 font-semibold">
            Monitor pendaftaran, alur verifikasi dinas, dan status pelaku usaha secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 lg:gap-3 flex-wrap justify-end">
          {/* Auto-sync countdown info */}
          <div className="glass-panel px-3 py-1.5 md:px-4 md:py-2 rounded-xl flex items-center gap-2 border border-blue-200/60 bg-blue-50/80">
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-ping' : 'bg-blue-400 animate-pulse'}`} />
            <div className="flex flex-col leading-none">
              <span className="text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-wider">
                AUTO SYNC
              </span>
              <span className="text-[10px] md:text-xs font-black text-blue-700 font-mono">
                {isSyncing ? 'Sinkronisasi...' : `${Math.floor(nextSyncIn / 60)}:${String(nextSyncIn % 60).padStart(2, '0')}`}
              </span>
            </div>
            {lastSyncTime && (
              <span className="text-[9px] text-blue-500 font-semibold hidden md:inline">
                Terakhir: {lastSyncTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })} WIB
              </span>
            )}
          </div>

          {userProfile?.role === 'admin' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSyncStats} 
              disabled={isSyncing}
              className="glass-panel border-primary/20 text-primary hover:bg-primary/5 font-bold text-[10px] md:text-xs h-8 md:h-10"
            >
              {isSyncing ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-2" />}
              SYNC STATS
            </Button>
          )}
          <div className="glass-panel px-3 py-1.5 md:px-4 md:py-2 rounded-xl flex items-center gap-2 md:gap-3 hover:shadow-lg transition-all">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Sistem: <span className="text-emerald-600">AKTIF</span>
            </span>
          </div>
        </div>
      </div>

      {/* Top 5 KPI Stats Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-5">
        {topStats.map((stat) => (
          <Card 
            key={stat.name} 
            onClick={() => setSelectedFilter({ name: stat.name, filterType: stat.filterType })}
            className={cn(
              "border shadow-md transition-all duration-500 group overflow-hidden cursor-pointer active:scale-95",
              "hover:shadow-2xl hover:-translate-y-1",
              stat.cardBg,
              stat.hoverBg,
              stat.border
            )}
          >
            <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
              <CardTitle className="text-[10px] md:text-xs font-bold text-white/80 uppercase tracking-wider truncate mr-2 pt-1.5">{stat.name}</CardTitle>
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(stat.bg, "p-1.5 md:p-2.5 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform duration-300 shrink-0")}>
                  <stat.icon className={cn("w-4 h-4 md:w-5 md:h-5", stat.color)} />
                </div>
                {stat.percentage && (
                  <div className="text-[10px] md:text-xs font-black text-white bg-white/20 px-2 py-0.5 rounded-full">
                    {stat.percentage}%
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl md:text-3xl font-black text-white">{isStatsLoading ? "..." : stat.value}</div>
              <div className="flex items-center gap-1 mt-1 text-[8px] md:text-[10px] font-bold text-white/70 uppercase">
                <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                {stat.detail}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── TAHAPAN VERIFIKASI DINAS (4 CARDS DALAM 1 BARIS) ─── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-base md:text-lg font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Statistik Alur & Tahapan Dinas
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              Progres verifikasi pelaku usaha pada menu Survey Dinas, Verifikasi Dinas, Hasil Verifikasi, dan Selesai.
            </p>
          </div>
          <div className="self-start sm:self-auto flex items-center gap-2">
            <span className="text-[10px] md:text-xs font-bold text-slate-500 bg-white shadow-sm px-3 py-1 rounded-full border">
              Total Terverifikasi: <strong className="text-emerald-600 font-black">{statsValues.verified}</strong>
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {dinasStageCards.map((stage) => (
            <Card 
              key={stage.name}
              onClick={() => setSelectedFilter({ name: stage.name, filterType: stage.filterType, targetUrl: stage.targetUrl })}
              className={cn(
                "relative overflow-hidden border shadow-lg transition-all duration-300 cursor-pointer active:scale-95 group",
                "hover:shadow-2xl hover:-translate-y-1.5",
                stage.cardBg,
                stage.hoverBorder
              )}
            >
              {/* Background ambient shape */}
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <span className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border backdrop-blur-sm", stage.badgeBg)}>
                    {stage.stageTag}
                  </span>
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl text-white shadow-sm group-hover:scale-110 transition-transform">
                    <stage.icon className="w-5 h-5" />
                  </div>
                </div>
                <CardTitle className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-2 flex items-center gap-2">
                  {stage.name}
                </CardTitle>
                <p className="text-[11px] font-semibold text-white/80 line-clamp-1">
                  {stage.description}
                </p>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-4">
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl md:text-4xl font-black text-white tracking-tight">
                    {isStatsLoading ? "..." : stage.value}
                    <span className="text-xs font-bold text-white/70 ml-1.5">Pelaku Usaha</span>
                  </div>
                  <div className="text-xs font-black text-white bg-white/20 px-2 py-0.5 rounded-full">
                    {stage.percentage}%
                  </div>
                </div>

                {/* Progress bar relative to total verified */}
                <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-white h-full rounded-full transition-all duration-700 ease-out" 
                    style={{ width: `${Math.min(100, Math.max(2, Number(stage.percentage)))}%` }}
                  />
                </div>

                {/* Card Action Link */}
                <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[11px] font-bold text-white/90 group-hover:text-white">
                  <span className="flex items-center gap-1">
                    Lihat Rincian Data
                  </span>
                  <Button 
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(stage.targetUrl)
                    }}
                    className="h-7 px-2.5 text-[10px] font-black bg-white/20 hover:bg-white text-white hover:text-slate-900 rounded-lg transition-all shadow-sm flex items-center gap-1"
                  >
                    Buka Menu <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ─── 5 DATA TERBARU VERIFIKASI DINAS & HASIL VERIFIKASI ─── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-base md:text-lg font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Data Terkini Masuk Tahapan Dinas
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              Daftar 5 pelaku usaha terbaru yang masuk menu Verifikasi Dinas dan Hasil Verifikasi beserta waktu data masuk.
            </p>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Card 1: 5 Data Terbaru Verifikasi Dinas (Tahap 2) */}
          <Card className="glass overflow-hidden transition-all hover:shadow-xl border-indigo-100/80 flex flex-col shadow-md">
            <CardHeader className="bg-gradient-to-r from-indigo-50/90 to-violet-50/90 border-b border-indigo-100/70 p-4 pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm md:text-base font-black text-indigo-950 uppercase tracking-tight flex items-center gap-2">
                    Verifikasi Dinas
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200 text-[10px] font-black px-2 py-0.5">
                      Tahap 2
                    </Badge>
                  </CardTitle>
                  <p className="text-[11px] font-medium text-indigo-600/80">
                    5 data terbaru lolos survey & menunggu cek berkas dinas
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/verifikasi-dinas-berkas')}
                className="text-[11px] font-bold text-indigo-700 hover:bg-indigo-100/60 h-7 px-2.5 rounded-lg flex items-center gap-1 shrink-0"
              >
                Lihat Semua <ArrowRight className="w-3 h-3" />
              </Button>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col justify-between">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b">
                    <TableRow>
                      <TableHead className="w-[40px] text-center font-black text-[10px] text-slate-700 uppercase">No</TableHead>
                      <TableHead className="font-black text-[10px] text-slate-700 uppercase">Pelaku Usaha</TableHead>
                      <TableHead className="font-black text-[10px] text-slate-700 uppercase">Usaha / Wilayah</TableHead>
                      <TableHead className="font-black text-[10px] text-slate-700 uppercase">Waktu Masuk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isVerifiedDinasLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium text-xs">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                            Memuat data Verifikasi Dinas...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : latestVerifikasiDinas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic font-medium text-xs">
                          Belum ada data pada menu Verifikasi Dinas.
                        </TableCell>
                      </TableRow>
                    ) : (
                      latestVerifikasiDinas.map((actor, idx) => {
                        const masukTime = actor.verifiedDinasAt || (actor.surveyData as any)?.tanggalSurvey || actor.createdAt
                        return (
                          <TableRow 
                            key={actor.id} 
                            onClick={() => setDetailActor(actor)}
                            className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                          >
                            <TableCell className="text-center font-bold text-slate-500 text-xs py-2.5">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="py-2.5">
                              <div className="flex flex-col">
                                <span className="font-black text-slate-800 text-xs uppercase group-hover:text-indigo-600 transition-colors">
                                  {actor.fullName || "-"}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {actor.nik || "-"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-700 text-xs uppercase truncate max-w-[130px]" title={actor.businessName}>
                                  {actor.businessName || "-"}
                                </span>
                                <span className="text-[10px] text-slate-500 uppercase truncate max-w-[130px]">
                                  {actor.kelurahan || actor.coordinator || "-"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <div className="flex items-center gap-1.5 text-indigo-900">
                                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="text-[11px] font-bold whitespace-nowrap">
                                  {formatDateTimeIndo(masukTime)}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="p-2.5 bg-slate-50/60 border-t flex items-center justify-between text-[11px] font-medium text-slate-600 px-4">
                <span>Total antrean: <strong className="text-indigo-600 font-bold">{statsValues.verifikasiDinas}</strong> pelaku usaha</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/verifikasi-dinas-berkas')}
                  className="h-6 text-[10px] font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  Buka Verifikasi Dinas <ExternalLink className="w-2.5 h-2.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: 5 Data Terbaru Hasil Verifikasi (Tahap 3) */}
          <Card className="glass overflow-hidden transition-all hover:shadow-xl border-teal-100/80 flex flex-col shadow-md">
            <CardHeader className="bg-gradient-to-r from-teal-50/90 to-emerald-50/90 border-b border-teal-100/70 p-4 pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-600 text-white rounded-xl shadow-sm">
                  <ListChecks className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm md:text-base font-black text-teal-950 uppercase tracking-tight flex items-center gap-2">
                    Hasil Verifikasi
                    <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100 border-teal-200 text-[10px] font-black px-2 py-0.5">
                      Tahap 3 (Final)
                    </Badge>
                  </CardTitle>
                  <p className="text-[11px] font-medium text-teal-600/80">
                    5 data terbaru selesai verifikasi berkas & dinyatakan lolos
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/hasil-verifikasi')}
                className="text-[11px] font-bold text-teal-700 hover:bg-teal-100/60 h-7 px-2.5 rounded-lg flex items-center gap-1 shrink-0"
              >
                Lihat Semua <ArrowRight className="w-3 h-3" />
              </Button>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col justify-between">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b">
                    <TableRow>
                      <TableHead className="w-[40px] text-center font-black text-[10px] text-slate-700 uppercase">No</TableHead>
                      <TableHead className="font-black text-[10px] text-slate-700 uppercase">Pelaku Usaha</TableHead>
                      <TableHead className="font-black text-[10px] text-slate-700 uppercase">Usaha / Wilayah</TableHead>
                      <TableHead className="font-black text-[10px] text-slate-700 uppercase">Waktu Masuk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isVerifiedDinasLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium text-xs">
                            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                            Memuat data Hasil Verifikasi...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : latestHasilVerifikasi.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic font-medium text-xs">
                          Belum ada data pada menu Hasil Verifikasi.
                        </TableCell>
                      </TableRow>
                    ) : (
                      latestHasilVerifikasi.map((actor, idx) => {
                        const masukTime = actor.berkasDinasVerifiedAt || actor.verifiedDinasAt || actor.createdAt
                        return (
                          <TableRow 
                            key={actor.id} 
                            onClick={() => setDetailActor(actor)}
                            className="hover:bg-teal-50/40 transition-colors cursor-pointer group"
                          >
                            <TableCell className="text-center font-bold text-slate-500 text-xs py-2.5">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="py-2.5">
                              <div className="flex flex-col">
                                <span className="font-black text-slate-800 text-xs uppercase group-hover:text-teal-600 transition-colors">
                                  {actor.fullName || "-"}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {actor.nik || "-"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-700 text-xs uppercase truncate max-w-[130px]" title={actor.businessName}>
                                  {actor.businessName || "-"}
                                </span>
                                <span className="text-[10px] text-slate-500 uppercase truncate max-w-[130px]">
                                  {actor.kelurahan || actor.coordinator || "-"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <div className="flex items-center gap-1.5 text-teal-900">
                                <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span className="text-[11px] font-bold whitespace-nowrap">
                                  {formatDateTimeIndo(masukTime)}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="p-2.5 bg-slate-50/60 border-t flex items-center justify-between text-[11px] font-medium text-slate-600 px-4">
                <span>Total lolos: <strong className="text-teal-600 font-bold">{statsValues.hasilVerifikasi}</strong> pelaku usaha</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/hasil-verifikasi')}
                  className="h-6 text-[10px] font-bold border-teal-200 text-teal-700 hover:bg-teal-50"
                >
                  Buka Hasil Verifikasi <ExternalLink className="w-2.5 h-2.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Grid: Kuota Usulan */}
      <div className="w-full flex flex-col h-full min-h-0">
        <Card className="glass overflow-hidden transition-all hover:shadow-xl border-none h-full min-h-[450px] lg:min-h-0 flex flex-col">
          <CardHeader className="bg-primary/10 pb-4 shrink-0">
            <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2 text-primary">
              <BarChart3 className="w-5 h-5" /> Jumlah Kuota
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40px] text-center font-black text-slate-800 text-[10px] md:text-xs">No</TableHead>
                    <TableHead className="font-black text-slate-800 text-[10px] md:text-xs min-w-[120px]">Nama Usulan</TableHead>
                    <TableHead className="text-center font-black text-slate-800 text-[10px] md:text-xs">Jumlah Kuota</TableHead>
                    <TableHead className="text-center font-black text-slate-800 text-[10px] md:text-xs">Kuota Tercapai</TableHead>
                    <TableHead className="text-center font-black text-slate-800 text-[10px] md:text-xs">Sisa Kuota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isKuotaLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium text-xs">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          Memuat data kuota...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : combinedKuotaData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic font-medium text-xs">
                        Belum ada data target kuota yang didaftarkan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    combinedKuotaData.map((item: any, index: number) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="text-center font-bold text-slate-600 text-xs">{index + 1}</TableCell>
                        <TableCell className="font-black text-primary text-xs tracking-tight">{item.name}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center bg-slate-100 text-slate-600 font-black px-3 py-1 rounded-full min-w-[3rem] shadow-sm text-xs border border-slate-200">
                            {item.quota}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center bg-emerald-100 text-emerald-700 font-black px-3 py-1 rounded-full min-w-[3rem] shadow-sm text-xs border border-emerald-200">
                            {item.achieved}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "inline-flex items-center justify-center font-black px-3 py-1 rounded-full min-w-[3rem] shadow-sm text-xs border",
                            item.remaining <= 0 
                              ? "bg-rose-100 text-rose-700 border-rose-200" 
                              : "bg-blue-100 text-blue-700 border-blue-200"
                          )}>
                            {item.remaining}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {!isKuotaLoading && combinedKuotaData.length > 0 && (
                  <TableFooter>
                    <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                      <TableCell colSpan={2} className="font-black text-slate-800 uppercase text-right text-xs py-3">
                        Total Kuota Data
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-600 text-sm">
                        {totalKuotaDashboard}
                      </TableCell>
                      <TableCell className="text-center font-black text-emerald-600 text-sm">
                        {totalAchievedDashboard}
                      </TableCell>
                      <TableCell className="text-center font-black text-primary text-sm">
                        {totalKuotaDashboard - totalAchievedDashboard}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>
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
                            ) : d.status === 'lpj_pending' ? (
                              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300">
                                SURVEY DINAS
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
