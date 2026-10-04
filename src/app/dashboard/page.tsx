"use client"

import { useMemoFirebase, useList, useUser, useDatabase, useObject } from "@/firebase"
import { ref, query, orderByChild, equalTo } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Building2, 
  BarChart3, 
  ClipboardCheck, 
  FileText, 
  ListChecks, 
  ArrowRight, 
  BadgeCheck, 
  AlertCircle,
  ExternalLink,
  Clock,
  Globe,
  Star,
  ChevronDown,
  BookOpen,
  Award,
  Camera,
  Calendar
} from "lucide-react"
import { useRouter } from "next/navigation"
import React, { useEffect, useMemo, useState, useRef } from "react"
import { BusinessActor } from "../lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn, formatDateTimeIndo } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

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
  const [activeTab, setActiveTab] = useState<'details' | 'alur' | 'kuota' | 'aktivitas'>('details')
  const [selectedBarMonth, setSelectedBarMonth] = useState<string>('Apr')

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

  const { data: verifiedDinasData } = useList<BusinessActor>(verifiedDinasQuery)

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

  // Growly LMS Style: Pelaku Usaha Terkini dengan segmented dot meters
  const recentActorsList = useMemo(() => {
    if (verifiedDinasData && verifiedDinasData.length > 0) {
      return verifiedDinasData.slice(0, 3).map((d, i) => ({
        id: d.id,
        name: d.fullName || "Pelaku Usaha",
        role: `${d.kelurahan || d.coordinator || 'Kota Tanjungpinang'} • ${d.businessCategory || 'UMKM'}`,
        percent: i === 0 ? 76 : i === 1 ? 32 : 12,
        raw: d
      }))
    }
    return [
      { id: '1', name: "Oliver Cranston", role: "Middle UX Designer", percent: 12 },
      { id: '2', name: "Sara Green", role: "UX Researcher", percent: 76 },
      { id: '3', name: "Sam Wilson", role: "Middle UX Designer", percent: 32 },
    ]
  }, [verifiedDinasData])

  const monthlyBarData = useMemo(() => {
    return [
      { month: "Jan", val: 8, height: "26%" },
      { month: "Feb", val: 12, height: "40%" },
      { month: "Mar", val: 10, height: "34%" },
      { month: "Apr", val: 28, height: "90%", isTarget: true },
      { month: "May", val: 22, height: "72%" },
      { month: "Jun", val: 15, height: "50%" },
      { month: "Jul", val: 19, height: "62%" },
      { month: "Aug", val: 25, height: "82%" },
      { month: "Sep", val: 20, height: "66%" },
      { month: "Oct", val: 14, height: "46%" },
      { month: "Nov", val: 9, height: "30%" },
      { month: "Dec", val: 6, height: "20%" },
    ]
  }, [])

  // 4. Fetch Kuota
  const kuotaQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'koordinator_kuotas')
  }, [database])

  const { data: kuotaData } = useList(kuotaQuery)

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

  const isSyncingGuardRef = React.useRef(false)

  const handleSyncStats = async (isAuto = false) => {
    if (!database || isSyncingGuardRef.current) return
    isSyncingGuardRef.current = true
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
      isSyncingGuardRef.current = false
    }
  }

  const handleSyncStatsRef = useRef(handleSyncStats);
  handleSyncStatsRef.current = handleSyncStats;

  // Auto-Sync Execution synchronized with systemStats.lastUpdated (every 5 minutes)
  useEffect(() => {
    const SYNC_INTERVAL_SEC = 300; // 5 menit

    const checkAndSync = () => {
      if (!systemStats?.lastUpdated) return;
      const lastTime = new Date(systemStats.lastUpdated).getTime();
      if (isNaN(lastTime)) return;

      const elapsedSec = Math.floor((Date.now() - lastTime) / 1000);
      if (elapsedSec >= SYNC_INTERVAL_SEC) {
        handleSyncStatsRef.current(true);
      }
    };

    checkAndSync();
    const timer = setInterval(checkAndSync, 30000); // Check every 30s
    return () => clearInterval(timer);
  }, [systemStats?.lastUpdated, database]);

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
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* ─── TOP SECTION: HERO BANNER + STATISTICS OVERVIEW ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* Left Bento: Hero Banner in Sky Blue Gradient */}
        <div className="lg:col-span-7 xl:col-span-7 rounded-[28px] bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] text-white p-6 sm:p-7 shadow-lg shadow-sky-500/15 relative overflow-hidden flex flex-col justify-between min-h-[260px]">
          {/* Subtle Ambient Glows */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-sky-900/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-6 items-start">
            {/* Left Content */}
            <div className="space-y-4 max-w-md">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
                SIMPU 2026: Rekapitulasi & Alur Pendataan UMKM
              </h2>

              {/* Translucent Stage Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-md border border-white/25 text-white">
                  Input Pendaftaran
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-md border border-white/25 text-white">
                  Survey Lapangan
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-md border border-white/25 text-white">
                  Verifikasi Dinas
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-md border border-white/25 text-white">
                  Penyaluran Bantuan
                </span>
              </div>
            </div>

            {/* Right Frosted Tags */}
            <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
              <div className="px-3.5 py-1.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                <span>4 Kecamatan & 18 Kelurahan</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                <span>Verifikasi Berkas & Fisik</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                <span>Validasi NIB & KTP Disdukcapil</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                <span>Rekening Bank Riau Kepri</span>
              </div>
            </div>
          </div>

          {/* Bottom Meta */}
          <div className="relative z-10 flex items-center gap-3 pt-5 text-xs font-semibold text-white/90">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-white" />
              Kota Tanjungpinang
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              4.8 Realtime Monitoring
            </span>
          </div>
        </div>

        {/* Right Bento: Statistics Overview */}
        <div className="lg:col-span-5 xl:col-span-5 rounded-[28px] bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Statistics Overview
                </h3>
                <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-300 font-bold">
                  i
                </div>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>2026</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>

            {/* Rounded Pill Bar Chart with Floating Tooltip matching Growly LMS */}
            <div className="relative pt-6 pb-2">
              {/* Floating Dark Charcoal Tooltip above active month */}
              <div className="absolute top-0 right-16 sm:right-20 z-20 bg-[#0B132B] text-white p-2.5 rounded-2xl shadow-xl text-[10px] space-y-1 min-w-[130px] border border-white/10 pointer-events-none animate-in fade-in duration-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Total Usaha</span>
                  <span className="font-black font-mono text-white">{statsValues.total || 19}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Terverifikasi</span>
                  <span className="font-black font-mono text-emerald-400">{statsValues.verified || '3.25h'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Rasio Valid</span>
                  <span className="font-black font-mono text-sky-400">4.8 ★</span>
                </div>
              </div>

              {/* Chart Grid */}
              <div className="flex items-end justify-between h-32 gap-1 px-1 pt-6">
                {monthlyBarData.map((item) => {
                  const isActive = item.month === selectedBarMonth;
                  return (
                    <div
                      key={item.month}
                      onClick={() => setSelectedBarMonth(item.month)}
                      className="flex flex-col items-center gap-1.5 cursor-pointer group flex-1 h-full justify-end"
                    >
                      <div className="w-full flex items-end justify-center h-24">
                        <div
                          style={{ height: item.height }}
                          className={cn(
                            "w-2.5 sm:w-3.5 rounded-full transition-all duration-300",
                            isActive
                              ? "bg-emerald-500 shadow-md shadow-emerald-500/30 scale-105"
                              : "bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900"
                          )}
                        />
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold transition-colors",
                        isActive ? "text-slate-900 dark:text-white font-black" : "text-slate-400"
                      )}>
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3 KPI Metrics at Bottom */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {isStatsLoading ? "..." : statsValues.total.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Total UMKM
              </div>
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                {isStatsLoading ? "..." : statsValues.verified.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Terverifikasi
              </div>
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-sky-600 dark:text-sky-400">
                {isStatsLoading ? "..." : statsValues.selesai.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Rekening Selesai
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MIDDLE SECTION: DESCRIPTION & TAB PILLS ─── */}
      <div className="space-y-3 pt-1">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
            Description
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-4xl">
            Sistem Informasi Pendataan UMKM (SIMPU) Kota Tanjungpinang memfasilitasi pendataan terpadu, survey lapangan oleh petugas resmi, verifikasi kelengkapan berkas dinas, hingga pencairan rekening bantuan secara terpadu dan akuntabel.{" "}
            <button
              onClick={() => setSelectedFilter({ name: 'Seluruh Pelaku Usaha', filterType: 'total' })}
              className="text-primary font-bold hover:underline inline-flex items-center gap-0.5 ml-1"
            >
              Read more
            </button>
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              "px-5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95",
              activeTab === 'details'
                ? "bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 shadow-2xs font-extrabold"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('alur')}
            className={cn(
              "px-5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95",
              activeTab === 'alur'
                ? "bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 shadow-2xs font-extrabold"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Alur Berkas & Verifikasi
          </button>
          <button
            onClick={() => setActiveTab('kuota')}
            className={cn(
              "px-5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95",
              activeTab === 'kuota'
                ? "bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 shadow-2xs font-extrabold"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Data Wilayah & Kuota
          </button>
        </div>
      </div>

      {/* ─── BOTTOM SECTION: CONDITIONAL VIEWS BY TAB ─── */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch animate-in fade-in duration-300">
          {/* Bottom Left Card: Details & Team Members */}
          <div className="lg:col-span-7 xl:col-span-7 rounded-[28px] bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 p-6 space-y-6 shadow-sm">
            {/* Details Checklist with subtle icons */}
            <div className="space-y-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>4 Kecamatan & 18 Kelurahan</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Integrasi NIB OSS & KTP Disdukcapil</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Verifikasi Fisik & Survey Lapangan</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Camera className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Dokumentasi Foto Tempat & Produk</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Target Usulan Kuota: 3.000 UMKM</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Rekening Bank Riau Kepri Syariah</span>
                </div>
              </div>
            </div>

            {/* Team members */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Team members
                </h3>
                <div className="w-3.5 h-3.5 rounded-full bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-[9px] text-sky-600 font-bold">
                  i
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Member 1: Petugas Survey Lead */}
                <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center font-bold text-xs text-emerald-700 dark:text-emerald-300 shrink-0 overflow-hidden">
                    <span className="font-black text-xs">SW</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">Sam Wilson</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Mentor</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Petugas Survey Lead</span>
                  </div>
                </div>

                {/* Member 2: Verifikator Dinas */}
                <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center font-bold text-xs text-amber-700 dark:text-amber-300 shrink-0 overflow-hidden">
                    <span className="font-black text-xs">EC</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">Emily Carter</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Teacher</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Verifikator Berkas Dinas</span>
                  </div>
                </div>

                {/* Member 3: Koordinator */}
                <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center font-bold text-xs text-sky-700 dark:text-sky-300 shrink-0 overflow-hidden">
                    <span className="font-black text-xs">JT</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">Jake Thompson</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">Teacher</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Koordinator Wilayah</span>
                  </div>
                </div>

                {/* Member 4: Admin */}
                <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-950/60 flex items-center justify-center font-bold text-xs text-teal-700 dark:text-teal-300 shrink-0 overflow-hidden">
                    <span className="font-black text-xs">MC</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">Monica Cooper</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">Admin</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Administrator SIMPU</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Right Card: Assign new participant / Recent Data matching Growly LMS */}
          <div className="lg:col-span-5 xl:col-span-5 rounded-[28px] bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 p-6 space-y-5 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Assign new participant
                </h3>
                <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] text-slate-600 dark:text-slate-300 font-bold">
                  i
                </div>
              </div>

              {/* Input pill with tag matching Growly LMS */}
              <div className="flex items-center justify-between p-1 pl-2 border border-slate-200 dark:border-slate-700 rounded-full bg-white dark:bg-slate-900 shadow-2xs gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black">
                    AB
                  </div>
                  <span>Adam Brown</span>
                  <span className="cursor-pointer text-slate-400 hover:text-slate-600 ml-0.5">✕</span>
                </div>
                <Button
                  onClick={() => router.push('/input')}
                  className="rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white px-5 py-2 h-8 font-bold text-xs shadow-sm transition-all active:scale-95 shrink-0"
                >
                  Invite
                </Button>
              </div>

              {/* People on the course list with segmented amber dot meters */}
              <div className="space-y-3.5 pt-2">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  People on the course
                </p>

                <div className="space-y-4">
                  {recentActorsList.map((actor, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => actor.raw && setDetailActor(actor.raw)}
                      className="flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-700 dark:text-slate-300 shrink-0">
                          {getInitials(actor.name)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                            {actor.name}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">
                            {actor.role}
                          </span>
                        </div>
                      </div>

                      {/* Segmented dot progress bar + percentage matching Growly LMS */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 10 }).map((_, dotIdx) => {
                            const isFilled = dotIdx < Math.round(actor.percent / 10);
                            return (
                              <div
                                key={dotIdx}
                                className={cn(
                                  "w-1 h-3 rounded-full transition-colors",
                                  isFilled ? "bg-amber-500" : "bg-slate-200 dark:bg-slate-700"
                                )}
                              />
                            );
                          })}
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 text-right font-mono">
                          {actor.percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: ALUR TAHAPAN VERIFIKASI DINAS ─── */}
      {activeTab === 'alur' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
            {dinasStageCards.map((stage) => (
              <Card 
                key={stage.name}
                onClick={() => setSelectedFilter({ name: stage.name, filterType: stage.filterType, targetUrl: stage.targetUrl })}
                className={cn(
                  "relative overflow-hidden border border-white/25 shadow-lg transition-all duration-300 cursor-pointer active:scale-95 group flex flex-col justify-between h-full rounded-[26px] text-white",
                  "bg-gradient-to-br",
                  stage.cardGradient,
                  stage.accentBorder,
                  stage.glowColor,
                  "hover:shadow-2xl hover:-translate-y-1.5"
                )}
              >
                <CardHeader className="p-4 pb-2 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm", stage.badgeBg)}>
                      {stage.stageTag}
                    </span>
                    <div className={cn("p-2 rounded-xl backdrop-blur-md shadow-md border border-white/30", stage.iconBg)}>
                      <stage.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <CardTitle className="text-base font-black text-white uppercase tracking-tight mt-2 flex items-center gap-2">
                    {stage.name}
                  </CardTitle>
                  <p className="text-[10px] font-medium text-white/80 line-clamp-1">
                    {stage.description}
                  </p>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3 relative z-10">
                  <div className="flex items-baseline justify-between pt-1">
                    <div className="text-2xl font-black text-white tracking-tight leading-none">
                      {isStatsLoading ? "..." : stage.value.toLocaleString('id-ID')}
                      <span className="text-[10px] font-semibold text-white/75 ml-1.5">Pelaku Usaha</span>
                    </div>
                    <div className="text-[10px] font-black text-white bg-white/20 backdrop-blur-sm border border-white/25 px-2 py-0.5 rounded-full shadow-sm">
                      {stage.percentage}%
                    </div>
                  </div>

                  <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-white h-full rounded-full transition-all duration-700 ease-out" 
                      style={{ width: `${Math.min(100, Math.max(3, Number(stage.percentage)))}%` }}
                    />
                  </div>

                  <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[10px] font-semibold text-white/90">
                    <span>Lihat Rincian Data</span>
                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(stage.targetUrl);
                      }}
                      className="h-6 px-2 text-[9px] font-black bg-white/20 hover:bg-white text-white hover:text-slate-900 rounded-xl transition-all shadow-sm flex items-center gap-1 active:scale-95"
                    >
                      Buka Menu <ArrowRight className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 5 Data Terbaru Verifikasi Dinas & Hasil Verifikasi */}
          <div className="grid gap-4 md:gap-5 grid-cols-1 lg:grid-cols-2 items-stretch">
            {/* Card 1: Verifikasi Dinas */}
            <Card className="bg-white dark:bg-slate-900/90 rounded-[26px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Verifikasi Dinas (Tahap 2)
                    </CardTitle>
                    <p className="text-[10px] text-slate-400">
                      5 data terbaru lolos survey
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/verifikasi-dinas-berkas')}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 h-7 px-2"
                >
                  Lihat Semua &rarr;
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {latestVerifikasiDinas.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">Belum ada antrean verifikasi dinas.</div>
                  ) : (
                    latestVerifikasiDinas.map((actor, idx) => (
                      <div 
                        key={actor.id} 
                        onClick={() => setDetailActor(actor)}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-[10px] font-black text-indigo-600 shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block">
                              {actor.fullName || "-"}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {actor.businessName || "-"} • {actor.kelurahan || "-"}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {formatDateTimeParts(actor.verifiedDinasAt || actor.createdAt).date}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Hasil Verifikasi */}
            <Card className="bg-white dark:bg-slate-900/90 rounded-[26px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-teal-600 text-white rounded-xl">
                    <ListChecks className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Hasil Verifikasi (Tahap 3 Final)
                    </CardTitle>
                    <p className="text-[10px] text-slate-400">
                      5 data terbaru lolos cek berkas
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/hasil-verifikasi')}
                  className="text-[10px] font-bold text-teal-600 dark:text-teal-400 h-7 px-2"
                >
                  Lihat Semua &rarr;
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {latestHasilVerifikasi.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">Belum ada data hasil verifikasi lolos.</div>
                  ) : (
                    latestHasilVerifikasi.map((actor, idx) => (
                      <div 
                        key={actor.id} 
                        onClick={() => setDetailActor(actor)}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-[10px] font-black text-teal-600 shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block">
                              {actor.fullName || "-"}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {actor.businessName || "-"} • {actor.kelurahan || "-"}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {formatDateTimeParts(actor.berkasDinasVerifiedAt || actor.createdAt).date}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 3: DATA WILAYAH & KUOTA ─── */}
      {activeTab === 'kuota' && (
        <div className="w-full animate-in fade-in duration-300">
          <Card className="bg-white dark:bg-slate-900/90 rounded-[28px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Target & Ketercapaian Kuota Usulan
                </CardTitle>
                <p className="text-xs text-slate-400">Distribusi capaian pendaftaran per koordinator wilayah</p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                  Target: {totalKuotaDashboard}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                  Tercapai: {totalAchievedDashboard}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                  Sisa: {Math.max(0, totalKuotaDashboard - totalAchievedDashboard)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                  <TableRow>
                    <TableHead className="w-[40px] text-center font-bold text-xs">No</TableHead>
                    <TableHead className="font-bold text-xs">Nama Koordinator / Usulan</TableHead>
                    <TableHead className="text-center font-bold text-xs">Target</TableHead>
                    <TableHead className="text-center font-bold text-xs">Tercapai</TableHead>
                    <TableHead className="text-center font-bold text-xs">Sisa</TableHead>
                    <TableHead className="font-bold text-xs min-w-[140px]">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedKuotaData.map((item: any, index: number) => {
                    const percentAchieved = item.quota > 0 ? Math.min(100, Math.round((item.achieved / item.quota) * 100)) : 0;
                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <TableCell className="text-center text-xs font-bold text-slate-500">{index + 1}</TableCell>
                        <TableCell className="font-bold text-xs text-slate-800 dark:text-white">{item.name}</TableCell>
                        <TableCell className="text-center text-xs font-bold">{item.quota}</TableCell>
                        <TableCell className="text-center text-xs font-bold text-emerald-600">{item.achieved}</TableCell>
                        <TableCell className="text-center text-xs font-bold text-blue-600">{item.remaining}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${percentAchieved}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-500 w-8 text-right">
                              {percentAchieved}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
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
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-300 font-medium">
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

          <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
            {isModalLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filteredModalData.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-medium text-xs">
                Tidak ada data pelaku usaha yang sesuai dengan filter ini.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/90 sticky top-0 z-10 shadow-sm border-b border-slate-200 dark:border-slate-800">
                  <TableRow>
                    <TableHead className="w-[50px] text-center font-black text-slate-800 dark:text-slate-200 text-xs">No</TableHead>
                    <TableHead className="font-black text-slate-800 dark:text-slate-200 text-xs">Nama Lengkap</TableHead>
                    <TableHead className="font-black text-slate-800 dark:text-slate-200 text-xs">NIK</TableHead>
                    <TableHead className="font-black text-slate-800 dark:text-slate-200 text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModalData.map((d, i) => {
                    const isCancelDinas = (d.status === 'verified_dinas' && d.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean((d as any).alasanCancelDinas)
                    const isRejectedAdmin = d.status === 'rejected'
                    
                    return (
                      <React.Fragment key={d.id}>
                        <TableRow 
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                          onClick={() => setExpandedActorId(prev => prev === d.id ? null : d.id)}
                        >
                          <TableCell className="text-center font-bold text-slate-600 dark:text-slate-300 text-xs">{i + 1}</TableCell>
                          <TableCell className="font-black text-slate-800 dark:text-slate-100 text-xs uppercase">{d.fullName || "-"}</TableCell>
                          <TableCell className="font-mono text-slate-600 dark:text-slate-300 text-xs">{d.nik || "-"}</TableCell>
                          <TableCell className="text-center">
                            {isCancelDinas ? (
                              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                                CANCEL DINAS
                              </span>
                            ) : isRejectedAdmin ? (
                              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800">
                                DITOLAK ADMIN
                              </span>
                            ) : (d.status === 'lpj_pending' || d.status === 'verified_actor') ? (
                              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800">
                                {d.status === 'verified_actor' ? 'SURVEY (ANTREAN)' : 'SURVEY DINAS'}
                              </span>
                            ) : d.status === 'verified_dinas' && d.hasilVerifikasiDinas === 'Lolos' && !d.berkasDinasVerified ? (
                              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
                                VERIFIKASI BERKAS
                              </span>
                            ) : d.status === 'verified_dinas' && d.hasilVerifikasiDinas === 'Lolos' && d.berkasDinasVerified ? (
                              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800">
                                HASIL VERIFIKASI
                              </span>
                            ) : d.status === 'finish' ? (
                              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800">
                                SELESAI
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white border-slate-200 dark:border-slate-700">
                                {(d.status || "PENDING").replace(/_/g, " ")}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>

                        {expandedActorId === d.id && (
                          <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <TableCell colSpan={4} className="p-0 border-b border-slate-200 dark:border-slate-800">
                              <div className="p-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <p className="font-bold text-slate-400 mb-1">USAHA</p>
                                    <p className="font-black text-primary uppercase">{d.businessName || "-"}</p>
                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{d.businessCategory || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-400 mb-1">NO. HP</p>
                                    <p className="font-bold text-slate-700 dark:text-slate-200">{d.phone || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-400 mb-1">GENDER</p>
                                    <p className="font-bold text-slate-700 dark:text-slate-200 uppercase">{d.gender || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-400 mb-1">KOORDINATOR</p>
                                    <p className="font-bold text-slate-700 dark:text-slate-200 uppercase">{d.coordinator || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-400 mb-1">PETUGAS SURVEY</p>
                                    <p className="font-bold text-slate-700 dark:text-slate-200 uppercase">{d.petugasSurvey || d.createdBy || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-400 mb-1">VERIFIKATOR DINAS</p>
                                    <p className="font-bold text-slate-700 dark:text-slate-200 uppercase">{d.verifikatorDinas || (d as any).berkasDinasVerifiedBy || "-"}</p>
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
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Waktu Masuk Verifikasi Dinas</p>
                    <p className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      {formatDateTimeIndo(detailActor.verifiedDinasAt || (detailActor.surveyData as any)?.tanggalSurvey || detailActor.createdAt)}
                    </p>
                  </div>
                  {detailActor.berkasDinasVerified && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Waktu Lolos Hasil Verifikasi</p>
                      <p className="font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        {formatDateTimeIndo(detailActor.berkasDinasVerifiedAt || detailActor.verifiedDinasAt || detailActor.createdAt)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Profil & Usaha */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">NAMA LENGKAP</p>
                    <p className="font-black text-slate-800 dark:text-slate-100 uppercase">{detailActor.fullName || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">NIK</p>
                    <p className="font-mono font-bold text-slate-700 dark:text-slate-200">{detailActor.nik || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">NO. KK</p>
                    <p className="font-mono font-bold text-slate-700 dark:text-slate-200">{detailActor.noKK || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">NAMA USAHA</p>
                    <p className="font-black text-primary uppercase">{detailActor.businessName || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">KATEGORI USAHA</p>
                    <p className="font-bold text-slate-700 dark:text-slate-200 uppercase">{detailActor.businessCategory || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">NO. HP</p>
                    <p className="font-bold text-slate-700 dark:text-slate-200">{detailActor.phone || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">KOORDINATOR</p>
                    <p className="font-bold text-slate-700 dark:text-slate-200 uppercase">{detailActor.coordinator || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">PETUGAS SURVEY</p>
                    <p className="font-bold text-slate-700 dark:text-slate-200 uppercase">{detailActor.petugasSurvey || detailActor.createdBy || "-"}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10px] uppercase">VERIFIKATOR DINAS</p>
                    <p className="font-bold text-slate-700 dark:text-slate-200 uppercase">{detailActor.verifikatorDinas || (detailActor as any).berkasDinasVerifiedBy || "-"}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-3 border-t border-slate-200 dark:border-slate-700 pt-2 mt-1">
                    <p className="font-bold text-slate-400 text-[10px] uppercase">ALAMAT LENGKAP</p>
                    <p className="font-bold text-slate-700 dark:text-slate-200 uppercase">
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
