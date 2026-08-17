"use client"

import React, { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useDatabase, useList, useMemoFirebase, useUser, useAuth } from "@/firebase"
import { ref } from "firebase/database"
import { signInAnonymously } from "firebase/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  SearchCheck, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Database, 
  UserSearch, 
  User, 
  Eye, 
  FileText, 
  ShieldCheck, 
  CreditCard, 
  Phone, 
  MapPin, 
  Store, 
  Printer, 
  Copy, 
  Check, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Award,
  ChevronRight,
  Building2,
  Calendar
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn, formatCurrency, maskLast4Digits, maskPhoneNumber } from "@/lib/utils"
import { formatTanggalIndonesia } from "@/lib/generate-berita-acara-pdf"
import { logActivity, getDeviceType } from "@/lib/logger"
import { useToast } from "@/hooks/use-toast"

type SearchType = "nik" | "noKK" | "nama" | "phone"

function CekDataContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const database = useDatabase()
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()

  const [searchType, setSearchType] = useState<SearchType>(() => {
    const t = searchParams.get("type") as SearchType
    if (t && ["nik", "noKK", "nama", "phone"].includes(t)) return t
    return "nik"
  })
  const [inputValue, setInputValue] = useState<string>(() => searchParams.get("q") || "")
  const [submittedQuery, setSubmittedQuery] = useState<{ type: SearchType; value: string } | null>(null)
  const [searchDone, setSearchDone] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [filterSource, setFilterSource] = useState<string>("ALL")
  const [hasCopied, setHasCopied] = useState(false)
  const [apiResults, setApiResults] = useState<any[] | null>(null)
  const [isApiLoading, setIsApiLoading] = useState(false)

  // Auto anonymous login for public visitors to access RTDB
  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      signInAnonymously(auth).catch((err) => {
        console.warn("Anonymous sign-in warning:", err)
      })
    }
  }, [user, isUserLoading, auth])

  // Realtime Database Listeners for all synchronized sources
  const master2023Ref = useMemoFirebase(() => (database ? ref(database, "master_data_2023") : null), [database])
  const master2024Ref = useMemoFirebase(() => (database ? ref(database, "master_data_2024") : null), [database])
  const master2025Ref = useMemoFirebase(() => (database ? ref(database, "master_data_2025") : null), [database])
  const blacklistDataRef = useMemoFirebase(() => (database ? ref(database, "blacklist_data") : null), [database])
  const businessActorsRef = useMemoFirebase(() => (database ? ref(database, "businessActors") : null), [database])

  const { data: data2023, isLoading: is2023Loading } = useList(master2023Ref)
  const { data: data2024, isLoading: is2024Loading } = useList(master2024Ref)
  const { data: data2025, isLoading: is2025Loading } = useList(master2025Ref)
  const { data: allBlacklistData, isLoading: isBlacklistLoading } = useList(blacklistDataRef)
  const { data: allActorsData, isLoading: isActorsLoading } = useList(businessActorsRef)

  const isClientDbLoading = is2023Loading || is2024Loading || is2025Loading || isBlacklistLoading || isActorsLoading
  const isDatabaseLoading = isClientDbLoading || isApiLoading

  // Combined client dataset
  const combinedDataset = useMemo(() => {
    const d2023 = (data2023 || []).map((m: any) => ({
      ...m,
      _id: m.id || m.nik || Math.random().toString(),
      _source: "SHEET 2023",
      _sourceType: "master_2023",
      _displayName: m.nama || m.fullName || "-",
      _displayNik: m.nik || "-",
      _displayKk: m.noKK || m.kk || "-",
      _displayPhone: m.phone || m.noHp || m.telepon || "-",
      _displayBusiness: m.usaha || m.businessName || "-",
      _displayStatus: m.status || "Terdaftar",
      _displayNominal: m.nominal || m.lpjNominal || 0,
      _displayAddress: m.alamat || m.address || "-",
      _displayKelurahan: m.kelurahan || "-",
      _displayKecamatan: m.kecamatan || "-",
      _displayYear: m.tahunPengajuan || "2023"
    }))

    const d2024 = (data2024 || []).map((m: any) => ({
      ...m,
      _id: m.id || m.nik || Math.random().toString(),
      _source: "SHEET 2024",
      _sourceType: "master_2024",
      _displayName: m.nama || m.fullName || "-",
      _displayNik: m.nik || "-",
      _displayKk: m.noKK || m.kk || "-",
      _displayPhone: m.phone || m.noHp || m.telepon || "-",
      _displayBusiness: m.usaha || m.businessName || "-",
      _displayStatus: m.status || "Terdaftar",
      _displayNominal: m.nominal || m.lpjNominal || 0,
      _displayAddress: m.alamat || m.address || "-",
      _displayKelurahan: m.kelurahan || "-",
      _displayKecamatan: m.kecamatan || "-",
      _displayYear: m.tahunPengajuan || "2024"
    }))

    const d2025 = (data2025 || []).map((m: any) => ({
      ...m,
      _id: m.id || m.nik || Math.random().toString(),
      _source: "SHEET 2025",
      _sourceType: "master_2025",
      _displayName: m.nama || m.fullName || "-",
      _displayNik: m.nik || "-",
      _displayKk: m.noKK || m.kk || "-",
      _displayPhone: m.phone || m.noHp || m.telepon || "-",
      _displayBusiness: m.usaha || m.businessName || "-",
      _displayStatus: m.status || "Terdaftar",
      _displayNominal: m.nominal || m.lpjNominal || 0,
      _displayAddress: m.alamat || m.address || "-",
      _displayKelurahan: m.kelurahan || "-",
      _displayKecamatan: m.kecamatan || "-",
      _displayYear: m.tahunPengajuan || "2025"
    }))

    const dBlacklist = (allBlacklistData || []).map((m: any) => ({
      ...m,
      _id: m.id || m.nik || Math.random().toString(),
      _source: "DATA BLACKLIST / DITOLAK",
      _sourceType: "blacklist",
      _displayName: m.nama || m.fullName || "-",
      _displayNik: m.nik || "-",
      _displayKk: m.noKK || m.kk || "-",
      _displayPhone: m.phone || m.noHp || m.telepon || "-",
      _displayBusiness: m.usaha || m.businessName || "-",
      _displayStatus: "BLACKLIST / DITOLAK",
      _displayNominal: m.nominal || m.lpjNominal || 0,
      _displayAddress: m.alamat || m.address || "-",
      _displayKelurahan: m.kelurahan || "-",
      _displayKecamatan: m.kecamatan || "-",
      _displayYear: m.tahunPengajuan || "-"
    }))

    const dActors = (allActorsData || []).map((m: any) => ({
      ...m,
      _id: m.id || Math.random().toString(),
      _source: "DATA PELAKU USAHA (SIMPU)",
      _sourceType: "actors",
      _displayName: m.fullName || m.nama || "-",
      _displayNik: m.nik || "-",
      _displayKk: m.noKK || m.kk || "-",
      _displayPhone: m.phone || m.noHp || m.telepon || "-",
      _displayBusiness: m.businessName || m.usaha || "-",
      _displayStatus: m.status || "pending",
      _displayNominal: m.lpjNominal || m.nominal || 0,
      _displayAddress: m.address || m.alamat || "-",
      _displayKelurahan: m.kelurahan || "-",
      _displayKecamatan: m.kecamatan || "-",
      _displayYear: m.createdAt ? new Date(m.createdAt).getFullYear().toString() : "2026"
    }))

    return [...dActors, ...d2025, ...d2024, ...d2023, ...dBlacklist]
  }, [data2023, data2024, data2025, allBlacklistData, allActorsData])

  const normalizePhone = (p: string) => String(p || "").replace(/[^0-9]/g, "")

  // Search in client dataset
  const clientResults = useMemo(() => {
    if (!submittedQuery || !submittedQuery.value) return []

    const queryVal = submittedQuery.value.trim().toLowerCase()
    const rawCleanDigits = submittedQuery.value.replace(/[^0-9]/g, "")

    return combinedDataset.filter((item: any) => {
      if (submittedQuery.type === "nama") {
        const name = String(item._displayName || "").toLowerCase()
        return name.includes(queryVal)
      }

      if (submittedQuery.type === "nik") {
        const nikClean = String(item._displayNik || "").replace(/[^0-9]/g, "")
        if (!nikClean) return false
        return nikClean === rawCleanDigits || (rawCleanDigits.length >= 6 && nikClean.includes(rawCleanDigits))
      }

      if (submittedQuery.type === "noKK") {
        const kkClean = String(item._displayKk || "").replace(/[^0-9]/g, "")
        if (!kkClean) return false
        return kkClean === rawCleanDigits || (rawCleanDigits.length >= 6 && kkClean.includes(rawCleanDigits))
      }

      if (submittedQuery.type === "phone") {
        const phoneClean = normalizePhone(item._displayPhone)
        if (!phoneClean) return false
        const qTrimmed = rawCleanDigits.startsWith("62")
          ? rawCleanDigits.slice(2)
          : rawCleanDigits.startsWith("0")
          ? rawCleanDigits.slice(1)
          : rawCleanDigits
        return phoneClean.includes(qTrimmed) || (qTrimmed.length >= 5 && rawCleanDigits.includes(phoneClean.slice(-5)))
      }

      return false
    })
  }, [combinedDataset, submittedQuery])

  // Fetch from server API as well to guarantee 100% complete records
  useEffect(() => {
    if (!submittedQuery || !submittedQuery.value) {
      setApiResults(null)
      return
    }

    let isMounted = true
    setIsApiLoading(true)

    fetch(`/api/cek-data?type=${encodeURIComponent(submittedQuery.type)}&q=${encodeURIComponent(submittedQuery.value)}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          if (json.success && Array.isArray(json.results)) {
            setApiResults(json.results)
          } else {
            setApiResults([])
          }
          setIsApiLoading(false)
        }
      })
      .catch((err) => {
        console.error("API search error:", err)
        if (isMounted) {
          setIsApiLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [submittedQuery])

  // Final unified results (merging client and server results without duplicates)
  const searchResults = useMemo(() => {
    let list: any[] = []

    if (apiResults && apiResults.length > 0) {
      list = apiResults
    } else if (clientResults && clientResults.length > 0) {
      list = clientResults
    } else if (apiResults) {
      list = []
    } else {
      list = clientResults
    }

    if (filterSource !== "ALL") {
      list = list.filter((m: any) => m._sourceType === filterSource)
    }

    return list
  }, [apiResults, clientResults, filterSource])

  // Handle URL query parameters on initial page mount
  useEffect(() => {
    const urlQ = searchParams.get("q")
    const urlType = searchParams.get("type") as SearchType
    if (urlQ && urlQ.trim().length > 0) {
      const validType = ["nik", "noKK", "nama", "phone"].includes(urlType) ? urlType : "nik"
      setSearchType(validType)
      setInputValue(urlQ.trim())
      setSubmittedQuery({ type: validType, value: urlQ.trim() })
      setSearchDone(true)
    }
  }, [searchParams])

  // Form submission handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const processed = inputValue.trim()
    setSubmittedQuery({ type: searchType, value: processed })
    setSearchDone(true)
    setFilterSource("ALL")

    const params = new URLSearchParams()
    params.set("type", searchType)
    params.set("q", processed)
    router.replace(`/cek-data?${params.toString()}`)

    logActivity(
      {
        query: `CEK PUBLIK (${searchType.toUpperCase()}): ${processed}`,
        results: "Memproses Pencarian...",
        device: getDeviceType(typeof navigator !== "undefined" ? navigator.userAgent : ""),
        source: "Web",
        method: `PUBLIK_${searchType.toUpperCase()}`,
        userId: user?.email || "Pengunjung Publik"
      },
      database || undefined
    )
  }

  // Effect to update activity log when search results are calculated
  useEffect(() => {
    if (searchDone && !isDatabaseLoading && submittedQuery) {
      const resCount = searchResults.length
      logActivity(
        {
          query: `HASIL CEK PUBLIK (${submittedQuery.type.toUpperCase()}): ${submittedQuery.value}`,
          results: resCount > 0 ? `Ditemukan ${resCount} Data` : "Data Tidak Ditemukan",
          device: getDeviceType(typeof navigator !== "undefined" ? navigator.userAgent : ""),
          source: "Web",
          method: `HASIL_${submittedQuery.type.toUpperCase()}`,
          userId: user?.email || "Pengunjung Publik"
        },
        database || undefined
      )
    }
  }, [searchDone, isDatabaseLoading, submittedQuery, searchResults.length])

  // Copy details helper
  const handleCopySummary = (item: any) => {
    if (!item) return
    const text = `
RINGKASAN CEK DATA UMKM - SIMPU
=================================
Sumber Data  : ${item._source}
Status       : ${item._displayStatus}
Nama Lengkap : ${item._displayName}
NIK          : ${maskLast4Digits(item._displayNik)}
Nomor KK     : ${maskLast4Digits(item._displayKk)}
No. Ponsel   : ${maskPhoneNumber(item._displayPhone)}
Nama Usaha   : ${item._displayBusiness}
Kelurahan    : ${item._displayKelurahan}
Kecamatan    : ${item._displayKecamatan}
Tahun        : ${item._displayYear}
Nominal      : ${formatCurrency(item._displayNominal)}
=================================
Dicek melalui Portal SIMPU Dinas Koperasi dan UKM
    `.trim()

    navigator.clipboard.writeText(text)
    setHasCopied(true)
    toast({
      title: "Berhasil Disalin",
      description: "Ringkasan data telah disalin ke clipboard."
    })
    setTimeout(() => setHasCopied(false), 2500)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleReset = () => {
    setInputValue("")
    setSubmittedQuery(null)
    setSearchDone(false)
    setSelectedItem(null)
    setApiResults(null)
    router.replace("/cek-data")
  }

  return (
    <div className="w-full space-y-8 pb-16 font-sans">
      {/* Ultra-Modern Hero Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 md:p-12 shadow-2xl border border-white/10">
        {/* Glowing Gradient Orbs */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 text-xs font-black uppercase tracking-widest text-emerald-300 shadow-inner">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Portal Validasi Publik & Transparansi Data UMKM
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase font-headline text-white leading-tight">
              Pengecekan Data <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Pelaku Usaha Mandiri
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              Periksa status pendaftaran, verifikasi dinas, dan histori data UMKM secara real-time dari 5 basis data tersinkron. Cepat, akurat, dan terlindungi privasi.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/10 text-xs font-bold text-slate-200">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>5 Basis Data Aktif</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/10 text-xs font-bold text-slate-200">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Masking 4-Digit NIK & KK</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/10 text-xs font-bold text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Pencarian Multi-Kriteria</span>
              </div>
            </div>
          </div>

          {/* Quick Info Card */}
          <div className="hidden lg:flex flex-col gap-3 p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/15 w-72 shrink-0 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Status Sistem</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                ONLINE
              </span>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Data Pelaku Usaha</span>
                <span className="font-mono font-bold text-white">750+ Terdaftar</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Data Master Pembanding</span>
                <span className="font-mono font-bold text-white">2023 - 2025</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Basis Blacklist</span>
                <span className="font-mono font-bold text-rose-300">Tersinkron</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Glassmorphic Search Container */}
      <div className="relative rounded-[2.5rem] bg-white/95 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl border border-slate-200/80">
        <div className="space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-primary/25">
                  <SearchCheck className="w-5 h-5" />
                </div>
                Pilih Parameter Pencarian
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 pl-13">
                Pilih metode identifikasi data yang ingin Anda periksa.
              </p>
            </div>

            {submittedQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-10 px-4 rounded-2xl border-slate-200 hover:bg-slate-100 font-bold text-slate-700 self-start sm:self-auto shadow-sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset & Cari Ulang
              </Button>
            )}
          </div>

          {/* Interactive Method Selector Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              { id: "nik", label: "NIK KTP", desc: "16 Digit Kependudukan", icon: CreditCard, color: "from-blue-600 to-indigo-600" },
              { id: "noKK", label: "Nomor KK", desc: "16 Digit Kartu Keluarga", icon: Database, color: "from-emerald-600 to-teal-600" },
              { id: "nama", label: "Nama Lengkap", desc: "Pencarian Teks Nama", icon: User, color: "from-purple-600 to-pink-600" },
              { id: "phone", label: "Nomor Ponsel", desc: "WhatsApp / No. HP", icon: Phone, color: "from-rose-600 to-amber-600" }
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = searchType === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSearchType(tab.id as SearchType)
                    setInputValue("")
                    setSubmittedQuery(null)
                    setSearchDone(false)
                    setApiResults(null)
                  }}
                  className={cn(
                    "relative flex flex-col items-start p-4 sm:p-5 rounded-3xl border-2 transition-all duration-300 text-left group overflow-hidden active:scale-95",
                    isActive
                      ? "border-primary bg-gradient-to-br from-primary/10 via-emerald-500/5 to-transparent shadow-xl shadow-primary/15 scale-[1.02]"
                      : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                  )}
                >
                  {isActive && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/30 to-emerald-400/30 rounded-bl-full blur-xl pointer-events-none" />
                  )}

                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 shadow-md",
                    isActive ? `bg-gradient-to-tr ${tab.color} text-white` : "bg-slate-100 text-slate-600"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <span className={cn("text-xs sm:text-sm font-black uppercase tracking-wider", isActive ? "text-primary" : "text-slate-800")}>
                    {tab.label}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                    {tab.desc}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search Input Box */}
          <form onSubmit={handleSearch} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="search-input" className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                <span>
                  {searchType === "nik" && "Masukkan 16 Digit NIK KTP"}
                  {searchType === "noKK" && "Masukkan 16 Digit Nomor Kartu Keluarga (KK)"}
                  {searchType === "nama" && "Masukkan Nama Lengkap Pemilik / Pelaku Usaha"}
                  {searchType === "phone" && "Masukkan Nomor Ponsel / WhatsApp Terdaftar"}
                </span>
              </Label>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Input
                    id="search-input"
                    type={searchType === "nama" ? "text" : "tel"}
                    inputMode={searchType === "nama" ? "text" : "numeric"}
                    maxLength={searchType === "nik" || searchType === "noKK" ? 16 : 100}
                    placeholder={
                      searchType === "nik"
                        ? "Ketik 16 Digit NIK KTP (Contoh: 217201...)"
                        : searchType === "noKK"
                        ? "Ketik 16 Digit Nomor Kartu Keluarga (Contoh: 217201...)"
                        : searchType === "nama"
                        ? "Ketik Nama Lengkap (Contoh: Budi Santoso / Siti Rahma)"
                        : "Ketik Nomor Ponsel / HP (Contoh: 085167454128 / 0812...)"
                    }
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className={cn(
                      "h-16 text-base sm:text-lg bg-slate-50/70 hover:bg-slate-50 focus:bg-white rounded-3xl border-2 border-slate-200 shadow-inner px-5 font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary transition-all",
                      searchType !== "nama" && "font-mono tracking-widest"
                    )}
                    required
                  />
                  {inputValue && (
                    <button
                      type="button"
                      onClick={() => setInputValue("")}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isDatabaseLoading || !inputValue.trim()}
                  className="h-16 px-10 rounded-3xl bg-gradient-to-r from-primary via-emerald-600 to-teal-600 hover:from-primary/90 hover:to-teal-700 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isDatabaseLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Mencari...
                    </>
                  ) : (
                    <>
                      <SearchCheck className="w-5 h-5" />
                      Cari Data
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Privacy & Guarantee Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs font-semibold text-emerald-900">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>
                  <strong>Jaminan Perlindungan Data:</strong> Sesuai UU Perlindungan Data Pribadi (PDP), 4 digit terakhir NIK & Nomor KK disamarkan untuk melindungi identitas warga.
                </span>
              </div>

              <div className="text-[11px] font-bold text-emerald-700 bg-white px-3 py-1 rounded-xl border border-emerald-200 shrink-0 self-start sm:self-auto">
                🔒 Enkripsi Aman
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Loading Skeleton Indicator */}
      {isDatabaseLoading && (
        <div className="flex flex-col items-center justify-center p-12 bg-white/90 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 shadow-xl text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-black uppercase text-slate-900 tracking-wider">Menghubungkan ke Basis Data</h3>
            <p className="text-xs font-semibold text-slate-500 mt-1">Mengambil data sinkronisasi master dan pendaftaran pelaku usaha...</p>
          </div>
        </div>
      )}

      {/* Search Results Area */}
      {searchDone && !isDatabaseLoading && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          {searchResults.length > 0 ? (
            <div className="space-y-6">
              {/* Alert Data Found */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[2rem] bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/20">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">
                      Data Ditemukan ({searchResults.length} Catatan)
                    </h3>
                    <p className="text-xs font-medium text-emerald-100 mt-0.5">
                      Ditemukan kecocokan data untuk kata kunci <strong>"{submittedQuery?.value}"</strong>. Silakan klik kartu untuk melihat informasi detail.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleReset}
                  variant="secondary"
                  className="h-10 px-5 rounded-2xl font-black text-xs uppercase tracking-wider bg-white text-emerald-800 hover:bg-white/90 shadow-md self-start sm:self-auto"
                >
                  Cari Data Lain
                </Button>
              </div>

              {/* Modern Filter Category Ribbon */}
              <div className="flex flex-wrap items-center gap-2 p-2 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider px-3">Filter Sumber:</span>
                {[
                  { id: "ALL", label: `Semua Data (${searchResults.length})` },
                  { id: "actors", label: "Sistem SIMPU" },
                  { id: "master_2025", label: "Master 2025" },
                  { id: "master_2024", label: "Master 2024" },
                  { id: "master_2023", label: "Master 2023" },
                  { id: "blacklist", label: "Blacklist / Ditolak" }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterSource(f.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      filterSource === f.id
                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.02]"
                        : "bg-transparent text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Modern Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((item: any, idx: number) => {
                  const isBlacklist = item._sourceType === "blacklist"
                  const isFinish = String(item._displayStatus || "").toLowerCase().includes("finish") || String(item._displayStatus || "").toLowerCase().includes("terdaftar")
                  const isVerified = String(item._displayStatus || "").toLowerCase().includes("verified")

                  return (
                    <Card
                      key={`${item._id}-${idx}`}
                      onClick={() => setSelectedItem(item)}
                      className={cn(
                        "group relative rounded-[2rem] border-2 bg-white/95 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between",
                        isBlacklist ? "border-red-200 hover:border-red-400" : "border-slate-200/90 hover:border-primary/60"
                      )}
                    >
                      {/* Top Glowing Header Strip */}
                      <div
                        className={cn(
                          "h-2.5 w-full",
                          isBlacklist
                            ? "bg-gradient-to-r from-rose-500 to-red-600"
                            : isFinish
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                            : isVerified
                            ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                            : "bg-gradient-to-r from-amber-500 to-orange-500"
                        )}
                      />

                      <div className="p-6 space-y-4">
                        {/* Source and Status Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border",
                              isBlacklist
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                            )}
                          >
                            {item._source}
                          </Badge>

                          <Badge
                            className={cn(
                              "text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-xl shadow-sm",
                              isBlacklist
                                ? "bg-red-600 text-white"
                                : isFinish
                                ? "bg-emerald-600 text-white"
                                : isVerified
                                ? "bg-blue-600 text-white"
                                : "bg-amber-500 text-white"
                            )}
                          >
                            {isBlacklist ? "DITOLAK / BLACKLIST" : item._displayStatus.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        {/* Name and ID */}
                        <div>
                          <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                            {item._displayName}
                          </h4>
                          <div className="mt-2 space-y-1 text-xs font-mono font-bold text-slate-500">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                              <span>NIK: {maskLast4Digits(item._displayNik)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Database className="w-3.5 h-3.5 text-slate-400" />
                              <span>KK: {maskLast4Digits(item._displayKk)}</span>
                            </div>
                            {item._displayPhone && item._displayPhone !== "-" && (
                              <div className="flex items-center gap-2 text-slate-700 font-sans font-bold">
                                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                <span>HP: {maskPhoneNumber(item._displayPhone)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Business Data Block */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-400 uppercase text-[10px]">Nama Usaha</span>
                            <span className="font-black text-slate-800 uppercase truncate max-w-[170px]">{item._displayBusiness}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-400 uppercase text-[10px]">Wilayah</span>
                            <span className="font-bold text-slate-700 uppercase truncate max-w-[170px]">
                              {item._displayKelurahan !== "-" ? `${item._displayKelurahan}, ${item._displayKecamatan}` : item._displayKecamatan}
                            </span>
                          </div>
                          {item._displayNominal > 0 && (
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/80">
                              <span className="font-bold text-slate-400 uppercase text-[10px]">Nominal Bantuan</span>
                              <span className="font-black text-emerald-600 text-sm">{formatCurrency(item._displayNominal)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="p-4 pt-0">
                        <Button
                          variant="ghost"
                          className="w-full h-11 rounded-2xl font-black text-xs uppercase tracking-widest text-primary group-hover:text-white group-hover:bg-primary transition-all flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Lihat Detail Lengkap
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ) : (
            /* No Results Area */
            <div className="p-8 sm:p-12 rounded-[2.5rem] bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center mx-auto shadow-inner">
                <XCircle className="w-10 h-10" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight">
                  Data Tidak Ditemukan
                </h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Tidak ditemukan catatan yang cocok dengan <strong>{submittedQuery?.type.toUpperCase()}: "{submittedQuery?.value}"</strong> di database master 2023-2025, blacklist, maupun data pendaftaran pelaku usaha.
                </p>
              </div>

              <div className="max-w-md mx-auto p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs font-semibold text-slate-700">
                <span className="font-black uppercase tracking-wider text-slate-900 block mb-1">Tips Pencarian:</span>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
                  <li>Pastikan NIK / Nomor KK terdiri dari 16 digit angka yang benar.</li>
                  <li>Jika mencari nomor ponsel, coba masukkan 8 digit angka belakangnya saja.</li>
                  <li>Jika mencari nama, gunakan kata kunci nama depan atau nama utama.</li>
                </ul>
              </div>

              <Button
                onClick={handleReset}
                className="h-12 px-8 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-xl active:scale-95"
              >
                Coba Pencarian Ulang
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Initial Landing State */}
      {!searchDone && !isDatabaseLoading && (
        <div className="p-10 sm:p-16 rounded-[2.5rem] border-2 border-dashed border-slate-200/90 bg-white/60 backdrop-blur-xl text-center space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary/20 to-emerald-500/20 text-primary flex items-center justify-center mx-auto shadow-inner">
            <UserSearch className="w-10 h-10" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-xl font-black uppercase text-slate-900">Siap Melakukan Pengecekan</h3>
            <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
              Silakan pilih metode di atas dan ketikkan NIK, Nomor KK, Nama Lengkap, atau Nomor HP untuk meninjau status dan verifikasi data secara mendalam.
            </p>
          </div>
        </div>
      )}

      {/* Comprehensive Detail Pop-up Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-[2.5rem] bg-white">
          {selectedItem && (
            <div>
              {/* Modal Banner Header */}
              <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/30 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge className="bg-white/20 text-white font-black text-xs uppercase tracking-widest border border-white/20 px-3 py-1 rounded-xl">
                      {selectedItem._source}
                    </Badge>
                    <Badge
                      className={cn(
                        "font-black text-xs uppercase tracking-wider px-3.5 py-1 rounded-xl shadow-md",
                        selectedItem._sourceType === "blacklist"
                          ? "bg-red-600 text-white"
                          : "bg-emerald-500 text-white"
                      )}
                    >
                      {selectedItem._displayStatus.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <DialogTitle className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-headline">
                    {selectedItem._displayName}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-bold text-slate-300">
                    Informasi Detail Catatan Pelaku Usaha Terverifikasi
                  </DialogDescription>
                </div>
              </div>

              {/* Modal Content Sections */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Section 1: Identitas Pemilik */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest border-b pb-2">
                    <User className="w-4 h-4" />
                    Data Identitas Pelaku Usaha
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap</span>
                      <p className="text-sm font-black text-slate-900 uppercase">{selectedItem._displayName}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">NIK (4 Digit Disamarkan)</span>
                      <p className="text-sm font-mono font-black text-slate-900">{maskLast4Digits(selectedItem._displayNik)}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Nomor KK (4 Digit Disamarkan)</span>
                      <p className="text-sm font-mono font-black text-slate-900">{maskLast4Digits(selectedItem._displayKk)}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Nomor Ponsel / WhatsApp</span>
                      <p className="text-sm font-bold text-slate-900">{maskPhoneNumber(selectedItem._displayPhone)}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Jenis Kelamin</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem.gender || selectedItem.jenisKelamin || "-"}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tempat / Tanggal Lahir</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">
                        {selectedItem.pobDob || (selectedItem.dob ? `${selectedItem.pob || ""}, ${selectedItem.dob}` : "-")}
                      </p>
                    </div>

                    <div className="sm:col-span-2 md:col-span-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Alamat Lengkap</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">
                        {selectedItem._displayAddress} {selectedItem.rtRw ? `(RT/RW: ${selectedItem.rtRw})` : ""}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Kelurahan</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem._displayKelurahan}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Kecamatan</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem._displayKecamatan}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Koordinator Wilayah</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem.coordinator || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Data Usaha & Status */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest border-b pb-2">
                    <Store className="w-4 h-4" />
                    Data Usaha & Histori Pengajuan
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Usaha</span>
                      <p className="text-sm font-black text-slate-900 uppercase">{selectedItem._displayBusiness}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Kategori Usaha</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem.businessCategory || selectedItem.kategori || "-"}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tahun Pengajuan / Data</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem._displayYear}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Nominal Bantuan / LPJ</span>
                      <p className="text-sm font-black text-emerald-600">{formatCurrency(selectedItem._displayNominal)}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Status LPJ</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem.statusLpj || "-"}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Petugas Survey</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem.petugasSurvey || "-"}</p>
                    </div>

                    {selectedItem.rejectionReason && (
                      <div className="sm:col-span-2 md:col-span-3 p-4 bg-red-50 rounded-2xl border border-red-200 space-y-1 text-red-950">
                        <span className="text-[10px] font-black uppercase text-red-700 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Alasan Penolakan / Catatan Pembatalan
                        </span>
                        <p className="text-xs font-bold leading-relaxed">{selectedItem.rejectionReason}</p>
                      </div>
                    )}

                    {selectedItem.keteranganDinas && (
                      <div className="sm:col-span-2 md:col-span-3 p-4 bg-blue-50 rounded-2xl border border-blue-200 space-y-1 text-blue-950">
                        <span className="text-[10px] font-black uppercase text-blue-700 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" />
                          Catatan / Keterangan Dinas
                        </span>
                        <p className="text-xs font-bold leading-relaxed">{selectedItem.keteranganDinas}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Data Survey Lapangan (jika ada) */}
                {selectedItem.surveyData && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest border-b pb-2">
                      <FileText className="w-4 h-4" />
                      Hasil Survey Lapangan Dinas
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {selectedItem.surveyData.tanggalSurvey && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Survey</span>
                          <p className="text-sm font-bold text-emerald-700">{formatTanggalIndonesia(selectedItem.surveyData.tanggalSurvey).fullText}</p>
                        </div>
                      )}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Modal Usaha</span>
                        <p className="text-sm font-bold text-slate-900">{selectedItem.surveyData.modalUsaha || "-"}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Omset Usaha</span>
                        <p className="text-sm font-bold text-slate-900">{selectedItem.surveyData.omset || "-"}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Tahun Berdiri Usaha</span>
                        <p className="text-sm font-bold text-slate-900">{selectedItem.surveyData.tahunBerdiri || "-"}</p>
                      </div>
                      <div className="sm:col-span-2 md:col-span-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Rencana Penggunaan Bantuan</span>
                        <p className="text-xs font-bold text-slate-900">{selectedItem.surveyData.rencanaPenggunaan || "-"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => handleCopySummary(selectedItem)}
                    className="h-12 px-5 rounded-2xl border-slate-300 font-bold text-xs uppercase tracking-wider flex-1 sm:flex-initial shadow-sm"
                  >
                    {hasCopied ? <Check className="w-4 h-4 mr-2 text-emerald-600" /> : <Copy className="w-4 h-4 mr-2" />}
                    {hasCopied ? "Tersalin!" : "Salin Ringkasan"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    className="h-12 px-5 rounded-2xl border-slate-300 font-bold text-xs uppercase tracking-wider flex-1 sm:flex-initial shadow-sm"
                  >
                    <Printer className="w-4 h-4 mr-2 text-slate-700" />
                    Cetak
                  </Button>
                </div>

                <Button
                  onClick={() => setSelectedItem(null)}
                  className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-md"
                >
                  Tutup Detail
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CekDataPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[70vh] flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Memuat Halaman Cek Data...</p>
        </div>
      }
    >
      <CekDataContent />
    </Suspense>
  )
}
