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
  ChevronDown,
  BookOpen,
  Award,
  Camera,
  Calendar,
  Loader2,
  UserCheck,
  Users,
  UserX,
  CreditCard,
  MapPin
} from "lucide-react"
import { useRouter } from "next/navigation"
import React, { useEffect, useMemo, useState, useRef } from "react"
import { BusinessActor } from "../lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn, formatDateTimeIndo } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { WeatherWidget } from "@/components/weather-widget"

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
        const k = (d.kelurahan || "").toLowerCase().replace(/[^a-z0-9]/g, "")
        const targetK = selectedFilter.name.toLowerCase().replace(/[^a-z0-9]/g, "")
        const s = d.status || "pending"
        const isVerified = ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s) && !isCancelDinas(d)
        return (k === targetK || k.includes(targetK) || targetK.includes(k)) && isVerified
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

  const kelurahanStats = useMemo(() => {
    const map = (systemStats?.kelurahan || {}) as Record<string, number>
    const totalVerified = statsValues.verified || 1

    const list = KELURAHAN_LIST.map((name) => {
      const key = name.toUpperCase().trim()
      const count = Number(map[key] || 0)
      const percent = Number(((count / totalVerified) * 100).toFixed(1))
      return { name, count, percent }
    })

    Object.entries(map).forEach(([rawKey, val]) => {
      const exists = list.some((item) => item.name.toUpperCase().trim() === rawKey)
      if (!exists && typeof val === 'number' && val > 0) {
        const percent = Number(((val / totalVerified) * 100).toFixed(1))
        list.push({ name: rawKey, count: val, percent })
      }
    })

    return list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [systemStats?.kelurahan, statsValues.verified])

  const metricCards = useMemo(() => {
    const total = statsValues.total || 1
    const verified = statsValues.verified || 1

    return [
      {
        id: "total",
        title: "Total Berkas",
        value: statsValues.total,
        sublabel: "Data Terkini",
        percentage: "100%",
        icon: Building2,
        iconBg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50",
        badgeColor: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40",
        accentBorder: "hover:border-indigo-400/80 group-hover:shadow-indigo-500/10",
        barColor: "bg-indigo-500",
        barPercent: 100,
        filterType: "total",
        filterName: "Total Seluruh Berkas UMKM"
      },
      {
        id: "verified",
        title: "Terverifikasi",
        value: statsValues.verified,
        sublabel: "Lolos Verifikasi",
        percentage: `${getPercentage(statsValues.verified, total)}%`,
        icon: UserCheck,
        iconBg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50",
        badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40",
        accentBorder: "hover:border-emerald-400/80 group-hover:shadow-emerald-500/10",
        barColor: "bg-emerald-500",
        barPercent: Number(getPercentage(statsValues.verified, total)),
        filterType: "verified",
        filterName: "Data Terverifikasi"
      },
      {
        id: "survey_dinas",
        title: "Survey Dinas",
        value: statsValues.surveyDinas,
        sublabel: "Tahap 1 Lapangan",
        percentage: `${getPercentage(statsValues.surveyDinas, verified)}%`,
        icon: ClipboardCheck,
        iconBg: "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/50",
        badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40",
        accentBorder: "hover:border-purple-400/80 group-hover:shadow-purple-500/10",
        barColor: "bg-purple-500",
        barPercent: Number(getPercentage(statsValues.surveyDinas, verified)),
        filterType: "survey_dinas",
        filterName: "Tahap 1: Survey Dinas Lapangan"
      },
      {
        id: "verifikasi_dinas",
        title: "Verifikasi Dinas",
        value: statsValues.verifikasiDinas,
        sublabel: "Tahap 2 Cek Berkas",
        percentage: `${getPercentage(statsValues.verifikasiDinas, verified)}%`,
        icon: FileText,
        iconBg: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50",
        badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40",
        accentBorder: "hover:border-blue-400/80 group-hover:shadow-blue-500/10",
        barColor: "bg-blue-500",
        barPercent: Number(getPercentage(statsValues.verifikasiDinas, verified)),
        filterType: "verifikasi_dinas",
        filterName: "Tahap 2: Verifikasi Berkas Dinas"
      },
      {
        id: "selesai",
        title: "Input Rekening",
        value: statsValues.selesai,
        sublabel: "Tahap 4 Final Bank",
        percentage: `${getPercentage(statsValues.selesai, verified)}%`,
        icon: CreditCard,
        iconBg: "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/50",
        badgeColor: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40",
        accentBorder: "hover:border-sky-400/80 group-hover:shadow-sky-500/10",
        barColor: "bg-sky-500",
        barPercent: Number(getPercentage(statsValues.selesai, verified)),
        filterType: "selesai",
        filterName: "Tahap 4: Input Rekening Bank Selesai"
      },
      {
        id: "rejected",
        title: "Cancell / Ditolak",
        value: statsValues.rejected,
        sublabel: "Admin & Dinas",
        percentage: `${getPercentage(statsValues.rejected, total)}%`,
        icon: UserX,
        iconBg: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50",
        badgeColor: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40",
        accentBorder: "hover:border-rose-400/80 group-hover:shadow-rose-500/10",
        barColor: "bg-rose-500",
        barPercent: Number(getPercentage(statsValues.rejected, total)),
        filterType: "rejected",
        filterName: "Data Dibatalkan & Ditolak"
      },
      {
        id: "laki",
        title: "Laki-Laki",
        value: statsValues.laki,
        sublabel: "Proporsi Gender",
        percentage: `${getPercentage(statsValues.laki, total)}%`,
        icon: Users,
        iconBg: "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/50",
        badgeColor: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/40",
        accentBorder: "hover:border-cyan-400/80 group-hover:shadow-cyan-500/10",
        barColor: "bg-cyan-500",
        barPercent: Number(getPercentage(statsValues.laki, total)),
        filterType: "laki",
        filterName: "Pelaku Usaha Laki-Laki"
      },
      {
        id: "perempuan",
        title: "Perempuan",
        value: statsValues.perempuan,
        sublabel: "Proporsi Gender",
        percentage: `${getPercentage(statsValues.perempuan, total)}%`,
        icon: Users,
        iconBg: "bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 border border-pink-200/60 dark:border-pink-800/50",
        badgeColor: "bg-pink-50 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border border-pink-200/60 dark:border-pink-800/40",
        accentBorder: "hover:border-pink-400/80 group-hover:shadow-pink-500/10",
        barColor: "bg-pink-500",
        barPercent: Number(getPercentage(statsValues.perempuan, total)),
        filterType: "perempuan",
        filterName: "Pelaku Usaha Perempuan"
      }
    ]
  }, [statsValues])


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
        {/* Left Bento: Real-time Weather & Air Quality Widget */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col">
          <WeatherWidget className="w-full h-full min-h-[260px]" />
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

            {/* Rounded Pill Bar Chart matching Growly LMS */}
            <div className="relative pt-2 pb-2">

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

      {/* ─── MIDDLE SECTION: TAB PILLS ─── */}
      <div className="pt-1">
        {/* Tab Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              "px-5 py-2 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 shadow-2xs",
              activeTab === 'details'
                ? "bg-sky-500 text-white dark:bg-sky-600 dark:text-white shadow-sm font-extrabold"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white border border-slate-200/80 dark:border-slate-700"
            )}
          >
            Statistik & Kelurahan
          </button>
          <button
            onClick={() => setActiveTab('alur')}
            className={cn(
              "px-5 py-2 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 shadow-2xs",
              activeTab === 'alur'
                ? "bg-sky-500 text-white dark:bg-sky-600 dark:text-white shadow-sm font-extrabold"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white border border-slate-200/80 dark:border-slate-700"
            )}
          >
            Alur Berkas & Verifikasi
          </button>
          <button
            onClick={() => setActiveTab('kuota')}
            className={cn(
              "px-5 py-2 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 shadow-2xs",
              activeTab === 'kuota'
                ? "bg-sky-500 text-white dark:bg-sky-600 dark:text-white shadow-sm font-extrabold"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white border border-slate-200/80 dark:border-slate-700"
            )}
          >
            Data Wilayah & Kuota
          </button>
        </div>
      </div>

      {/* ─── BOTTOM SECTION: CONDITIONAL VIEWS BY TAB ─── */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch animate-in fade-in duration-300">
          {/* ─── KIRI (lg:col-span-7): 8 KARTU STATISTIK REALTIME ─── */}
          <div className="lg:col-span-7 xl:col-span-7 rounded-[28px] bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-sm flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Statistik Data UMKM
                    </h3>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Realtime
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Klik kartu metrik untuk melihat daftar data pelaku usaha secara langsung
                  </p>
                </div>
              </div>

              {/* 8 Grid Kartu Statistik */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-3">
                {metricCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <div
                      key={card.id}
                      onClick={() => setSelectedFilter({ name: card.filterName, filterType: card.filterType })}
                      className={cn(
                        "p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-100/90 dark:bg-slate-900/60 dark:hover:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 transition-all duration-200 cursor-pointer active:scale-95 group flex flex-col justify-between shadow-2xs hover:shadow-md",
                        card.accentBorder
                      )}
                    >
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <div className={cn("p-1.5 rounded-xl shrink-0 transition-transform group-hover:scale-110", card.iconBg)}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {card.percentage && (
                          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-full truncate font-mono", card.badgeColor)}>
                            {card.percentage}
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight group-hover:text-primary transition-colors">
                          {isStatsLoading ? "..." : card.value.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                          {card.title}
                        </div>
                        <div className="text-[9px] font-semibold text-slate-400 truncate">
                          {card.sublabel}
                        </div>
                      </div>

                      {/* Mini Progress Bar Indicator */}
                      <div className="w-full bg-slate-200/60 dark:bg-slate-800 rounded-full h-1 mt-2.5 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", card.barColor)}
                          style={{ width: `${Math.min(100, Math.max(5, card.barPercent))}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Hint Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" />
                Data terintegrasi Firebase Realtime DB
              </span>
              <span className="text-primary font-bold hover:underline cursor-pointer" onClick={() => setSelectedFilter({ name: 'Total Seluruh Berkas UMKM', filterType: 'total' })}>
                Buka Semua Data &rarr;
              </span>
            </div>
          </div>

          {/* ─── KANAN (lg:col-span-5): PEMBAGIAN PER KELURAHAN ─── */}
          <div className="lg:col-span-5 xl:col-span-5 rounded-[28px] bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 space-y-3.5 shadow-sm flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Sebaran Per Kelurahan
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      18 Kelurahan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Kota Tanjungpinang • Klik nama kelurahan untuk rincian data
                  </p>
                </div>
              </div>

              {/* Scrollable List of 18 Kelurahan */}
              <div className="max-h-[350px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar pt-2">
                {kelurahanStats.map((item, idx) => {
                  return (
                    <div
                      key={item.name}
                      onClick={() => setSelectedFilter({ name: item.name, filterType: 'kelurahan' })}
                      className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer group transition-all duration-150 active:scale-[0.99] border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <div className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0",
                          idx === 0 ? "bg-amber-400 text-slate-950 shadow-xs" :
                          idx === 1 ? "bg-slate-300 text-slate-900 shadow-xs" :
                          idx === 2 ? "bg-amber-600 text-white shadow-xs" :
                          "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        )}>
                          {idx + 1}
                        </div>

                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors truncate block">
                            {item.name}
                          </span>
                        </div>
                      </div>

                      {/* Segmented meter & count */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* Segmented dot meters matching Growly LMS */}
                        <div className="flex items-center gap-0.5 hidden xs:flex">
                          {Array.from({ length: 8 }).map((_, dotIdx) => {
                            const isFilled = dotIdx < Math.round((item.percent / 100) * 8);
                            return (
                              <div
                                key={dotIdx}
                                className={cn(
                                  "w-1 h-2.5 rounded-full transition-colors",
                                  isFilled ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                                )}
                              />
                            );
                          })}
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                            {item.count}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1 font-mono">
                            ({item.percent}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Summary */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span>Total Terverifikasi:</span>
              <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-xs">
                {statsValues.verified} Pelaku Usaha
              </span>
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
