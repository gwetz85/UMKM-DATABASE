"use client"

import React, { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useDatabase, useList, useMemoFirebase, useUser } from "@/firebase"
import { ref } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  Building2, 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldAlert
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { cn, formatCurrency, maskLast4Digits, maskPhoneNumber, extractDobFromNik, parsePobDob, calculateAge } from "@/lib/utils"
import { logActivity, getDeviceType } from "@/lib/logger"
import { useToast } from "@/hooks/use-toast"

type SearchType = "nik" | "noKK" | "nama" | "phone"

function CekDataContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const database = useDatabase()
  const { user } = useUser()
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

  const isDatabaseLoading = is2023Loading || is2024Loading || is2025Loading || isBlacklistLoading || isActorsLoading

  // Combined synchronized data
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

  // Normalizer helper for phone numbers
  const normalizePhone = (p: string) => {
    return String(p || "").replace(/[^0-9]/g, "")
  }

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!submittedQuery || !submittedQuery.value) return []

    const queryVal = submittedQuery.value.trim().toLowerCase()
    const rawCleanDigits = submittedQuery.value.replace(/[^0-9]/g, "")

    let matches = combinedDataset.filter((item: any) => {
      if (submittedQuery.type === "nama") {
        const name = String(item._displayName || "").toLowerCase()
        return name.includes(queryVal)
      }

      if (submittedQuery.type === "nik") {
        const nikClean = String(item._displayNik || "").replace(/[^0-9]/g, "")
        if (!nikClean) return false
        // Exact match or contains if user typed partial
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
        // Compare with or without leading zero / country code
        const qPhone = normalizePhone(submittedQuery.value)
        const qTrimmed = qPhone.startsWith("62") ? qPhone.slice(2) : qPhone.startsWith("0") ? qPhone.slice(1) : qPhone
        return phoneClean.includes(qTrimmed)
      }

      return false
    })

    if (filterSource !== "ALL") {
      matches = matches.filter((m: any) => m._sourceType === filterSource)
    }

    return matches
  }, [combinedDataset, submittedQuery, filterSource])

  // Handle URL params initialization
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

    // Update browser URL query params without reloading
    const params = new URLSearchParams()
    params.set("type", searchType)
    params.set("q", processed)
    router.replace(`/cek-data?${params.toString()}`)

    // Log Activity to Firebase
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
Nominal Bantuan: ${formatCurrency(item._displayNominal)}
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

  // Print helper
  const handlePrint = () => {
    window.print()
  }

  // Reset form
  const handleReset = () => {
    setInputValue("")
    setSubmittedQuery(null)
    setSearchDone(false)
    setSelectedItem(null)
    router.replace("/cek-data")
  }

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-primary/95 to-slate-900 text-white p-6 sm:p-10 shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-black uppercase tracking-widest text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Portal Resmi Validasi Data UMKM
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase font-headline text-white drop-shadow-md">
            Pengecekan Data Pelaku Usaha
          </h1>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
            Layanan mandiri bagi masyarakat dan pelaku usaha untuk memeriksa status pendaftaran, verifikasi lapangan, data master pembanding, dan histori pengajuan program secara transparan.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-bold text-slate-300">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl">
              <Database className="w-3.5 h-3.5 text-primary-foreground" />
              <span>5 Basis Data Tersinkron</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privasi Terlindungi (Masking NIK & KK)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Filter & Input Card */}
      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="p-6 sm:p-8 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800 flex items-center gap-2.5">
                <SearchCheck className="w-6 h-6 text-primary" />
                Pilih Parameter Pencarian
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-slate-500 mt-1">
                Tentukan kriteria pencarian data yang ingin Anda periksa.
              </CardDescription>
            </div>
            {submittedQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-9 rounded-xl border-slate-300 hover:bg-slate-100 font-bold text-slate-700 self-start sm:self-auto"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Reset Pencarian
              </Button>
            )}
          </div>

          {/* Search Type Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
            {[
              { id: "nik", label: "NIK (16 Digit)", icon: CreditCard, desc: "Berdasarkan KTP" },
              { id: "noKK", label: "Nomor KK", icon: Database, desc: "Kartu Keluarga" },
              { id: "nama", label: "Nama Lengkap", icon: User, desc: "Nama Pemilik" },
              { id: "phone", label: "Nomor Ponsel", icon: Phone, desc: "WhatsApp / HP" }
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
                  }}
                  className={cn(
                    "flex flex-col items-start p-3 sm:p-4 rounded-2xl border transition-all text-left group active:scale-98",
                    isActive
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-[1.02]"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                  )}
                >
                  <div className="flex items-center gap-2 w-full mb-1">
                    <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-primary")} />
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider">{tab.label}</span>
                  </div>
                  <span className={cn("text-[10px] font-semibold", isActive ? "text-primary-foreground/80" : "text-slate-400")}>
                    {tab.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 pt-2">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-input" className="text-xs font-black uppercase text-slate-700 tracking-wider">
                {searchType === "nik" && "Masukkan 16 Digit NIK"}
                {searchType === "noKK" && "Masukkan 16 Digit Nomor KK"}
                {searchType === "nama" && "Masukkan Nama Lengkap Pelaku Usaha"}
                {searchType === "phone" && "Masukkan Nomor Ponsel / WhatsApp"}
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
                        ? "Contoh: 3201012345670001..."
                        : searchType === "noKK"
                        ? "Contoh: 3201019876540002..."
                        : searchType === "nama"
                        ? "Contoh: Budi Santoso / Siti Rahma..."
                        : "Contoh: 081234567890..."
                    }
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className={cn(
                      "h-14 text-base sm:text-lg bg-white rounded-2xl border-slate-300 shadow-inner px-4 font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-primary",
                      searchType !== "nama" && "font-mono tracking-widest"
                    )}
                    required
                  />
                  {inputValue && (
                    <button
                      type="button"
                      onClick={() => setInputValue("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isDatabaseLoading || !inputValue.trim()}
                  className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {isDatabaseLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Memuat Data...
                    </>
                  ) : (
                    <>
                      <SearchCheck className="w-5 h-5 mr-2" />
                      Cari Data
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Privacy Disclaimer */}
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-semibold text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Jaminan Keamanan:</strong> Sesuai UU Perlindungan Data Pribadi (PDP), 4 digit terakhir NIK dan Nomor KK disamarkan untuk melindungi privasi pemilik data.
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Database Loading State */}
      {isDatabaseLoading && (
        <div className="flex flex-col items-center justify-center p-12 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200 shadow-sm text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <h3 className="text-base font-black uppercase text-slate-800 tracking-wider">Menghubungkan ke Basis Data</h3>
          <p className="text-xs font-semibold text-slate-500 mt-1">Mengambil data sinkronisasi master dan pendaftaran terbaru...</p>
        </div>
      )}

      {/* Results Section */}
      {searchDone && !isDatabaseLoading && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {searchResults.length > 0 ? (
            <div className="space-y-6">
              {/* Alert Data Found */}
              <Alert className="bg-emerald-50 border-emerald-200 text-emerald-950 rounded-3xl p-6 shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <AlertTitle className="text-lg font-black uppercase tracking-tight text-emerald-900">
                  Data Ditemukan ({searchResults.length} Catatan)
                </AlertTitle>
                <AlertDescription className="text-xs font-semibold text-emerald-800 mt-1">
                  Ditemukan kecocokan data pada sistem untuk pencarian <strong>"{submittedQuery?.value}"</strong>. Klik salah satu kartu untuk melihat detail lengkap.
                </AlertDescription>
              </Alert>

              {/* Source Filter Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider mr-2">Filter Sumber:</span>
                {[
                  { id: "ALL", label: `Semua (${searchResults.length})` },
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
                      "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      filterSource === f.id
                        ? "bg-slate-900 text-white shadow-md"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Result Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {searchResults.map((item: any, idx: number) => {
                  const isBlacklist = item._sourceType === "blacklist"
                  const isFinish = String(item._displayStatus || "").toLowerCase().includes("finish") || String(item._displayStatus || "").toLowerCase().includes("terdaftar")
                  const isVerified = String(item._displayStatus || "").toLowerCase().includes("verified")

                  return (
                    <Card
                      key={`${item._id}-${idx}`}
                      onClick={() => setSelectedItem(item)}
                      className={cn(
                        "border rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer bg-white group flex flex-col justify-between relative",
                        isBlacklist ? "border-red-200 hover:border-red-400" : "border-slate-200 hover:border-primary/50"
                      )}
                    >
                      {/* Top Accent Strip */}
                      <div
                        className={cn(
                          "h-2 w-full",
                          isBlacklist
                            ? "bg-red-500"
                            : isFinish
                            ? "bg-emerald-500"
                            : isVerified
                            ? "bg-blue-500"
                            : "bg-amber-500"
                        )}
                      />

                      <CardHeader className="p-5 pb-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                              isBlacklist
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-primary/10 text-primary border-primary/20"
                            )}
                          >
                            {item._source}
                          </Badge>

                          <Badge
                            className={cn(
                              "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg",
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

                        <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                          {item._displayName}
                        </CardTitle>

                        <div className="flex flex-col gap-1 text-xs font-mono font-bold text-slate-500 pt-1">
                          <span className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            NIK: {maskLast4Digits(item._displayNik)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-slate-400" />
                            KK: {maskLast4Digits(item._displayKk)}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="p-5 pt-0 space-y-3">
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-400 uppercase text-[10px]">Nama Usaha</span>
                            <span className="font-black text-slate-800 uppercase truncate max-w-[160px]">{item._displayBusiness}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-400 uppercase text-[10px]">Wilayah</span>
                            <span className="font-bold text-slate-700 uppercase truncate max-w-[160px]">
                              {item._displayKelurahan !== "-" ? `${item._displayKelurahan}, ${item._displayKecamatan}` : item._displayKecamatan}
                            </span>
                          </div>
                          {item._displayNominal > 0 && (
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                              <span className="font-bold text-slate-400 uppercase text-[10px]">Nominal</span>
                              <span className="font-black text-primary">{formatCurrency(item._displayNominal)}</span>
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          className="w-full h-10 rounded-xl font-black text-xs uppercase tracking-widest text-primary hover:text-white hover:bg-primary transition-all group-hover:shadow-md flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Lihat Detail Lengkap
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ) : (
            /* No Results Alert */
            <div className="space-y-6">
              <Alert className="bg-red-50 border-red-200 text-red-950 rounded-3xl p-8 shadow-sm text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-3 mx-auto">
                  <XCircle className="w-10 h-10" />
                </div>
                <AlertTitle className="text-xl font-black uppercase tracking-tight text-red-900 mb-2">
                  Data Tidak Ditemukan
                </AlertTitle>
                <AlertDescription className="text-sm font-medium text-red-800 max-w-lg mx-auto leading-relaxed">
                  Tidak ada catatan yang cocok dengan <strong>{submittedQuery?.type.toUpperCase()}: "{submittedQuery?.value}"</strong> di database master, blacklist, maupun data pendaftaran pelaku usaha.
                </AlertDescription>

                <div className="mt-6 p-4 rounded-2xl bg-white border border-red-200 max-w-md w-full text-left space-y-2 text-xs font-semibold text-slate-700">
                  <span className="font-black uppercase tracking-wider text-slate-900 block mb-1">Saran Pengecekan:</span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    <li>Pastikan 16 digit NIK atau Nomor KK yang dimasukkan sudah benar.</li>
                    <li>Coba lakukan pencarian menggunakan metode lain (Nama Lengkap atau Nomor HP).</li>
                    <li>Jika nama mengandung ejaan khusus, coba gunakan kata kunci nama depan saja.</li>
                  </ul>
                </div>
              </Alert>

              <div className="flex justify-center">
                <Button
                  onClick={handleReset}
                  className="h-12 px-8 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-lg active:scale-95"
                >
                  Coba Cari Ulang
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initial State Helper */}
      {!searchDone && !isDatabaseLoading && (
        <div className="p-8 sm:p-12 rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 backdrop-blur-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <UserSearch className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-black uppercase text-slate-800">Siap Melakukan Pengecekan</h3>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Pilih metode pencarian di atas dan masukkan data NIK, Nomor KK, Nama, atau Nomor Ponsel untuk memeriksa status dan histori data secara mendetail.
            </p>
          </div>
        </div>
      )}

      {/* Detailed Modal / Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-3xl bg-white">
          {selectedItem && (
            <div>
              {/* Modal Header */}
              <div className="p-6 sm:p-8 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-primary/40 rounded-full blur-2xl pointer-events-none" />
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <Badge className="bg-white/20 text-white font-black text-xs uppercase tracking-widest border border-white/20 px-3 py-1">
                    {selectedItem._source}
                  </Badge>
                  <Badge
                    className={cn(
                      "font-black text-xs uppercase tracking-wider px-3 py-1",
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
                <DialogDescription className="text-xs font-bold text-slate-300 mt-1">
                  Detail Informasi Terverifikasi dalam Sistem Manajemen UMKM
                </DialogDescription>
              </div>

              {/* Modal Body with Sections */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Section 1: Identitas Pemilik */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest border-b pb-2">
                    <User className="w-4 h-4" />
                    Data Identitas Pelaku Usaha
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap</span>
                      <p className="text-sm font-black text-slate-900 uppercase">{selectedItem._displayName}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">NIK (4 Digit Disamarkan)</span>
                      <p className="text-sm font-mono font-black text-slate-900">{maskLast4Digits(selectedItem._displayNik)}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Nomor KK (4 Digit Disamarkan)</span>
                      <p className="text-sm font-mono font-black text-slate-900">{maskLast4Digits(selectedItem._displayKk)}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Nomor Ponsel / WhatsApp</span>
                      <p className="text-sm font-bold text-slate-900">{maskPhoneNumber(selectedItem._displayPhone)}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Jenis Kelamin</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem.gender || selectedItem.jenisKelamin || "-"}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tempat / Tanggal Lahir</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">
                        {selectedItem.pobDob || (selectedItem.dob ? `${selectedItem.pob || ""}, ${selectedItem.dob}` : "-")}
                      </p>
                    </div>

                    <div className="sm:col-span-2 md:col-span-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Alamat Lengkap</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">
                        {selectedItem._displayAddress} {selectedItem.rtRw ? `(RT/RW: ${selectedItem.rtRw})` : ""}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Kelurahan</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem._displayKelurahan}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Kecamatan</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem._displayKecamatan}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Koordinator Wilayah</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem.coordinator || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Data Usaha */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest border-b pb-2">
                    <Store className="w-4 h-4" />
                    Data Usaha & Verifikasi
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Usaha</span>
                      <p className="text-sm font-black text-slate-900 uppercase">{selectedItem._displayBusiness}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Kategori Usaha</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem.businessCategory || selectedItem.kategori || "-"}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tahun Pengajuan / Data</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem._displayYear}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Nominal Bantuan / LPJ</span>
                      <p className="text-sm font-black text-emerald-600">{formatCurrency(selectedItem._displayNominal)}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Status LPJ</span>
                      <p className="text-sm font-bold text-slate-900 uppercase">{selectedItem.statusLpj || "-"}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
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
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Modal Usaha</span>
                        <p className="text-sm font-bold text-slate-900">{selectedItem.surveyData.modalUsaha || "-"}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Omset Usaha</span>
                        <p className="text-sm font-bold text-slate-900">{selectedItem.surveyData.omset || "-"}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Tahun Berdiri Usaha</span>
                        <p className="text-sm font-bold text-slate-900">{selectedItem.surveyData.tahunBerdiri || "-"}</p>
                      </div>
                      <div className="sm:col-span-2 md:col-span-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Rencana Penggunaan Bantuan</span>
                        <p className="text-xs font-bold text-slate-900">{selectedItem.surveyData.rencanaPenggunaan || "-"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => handleCopySummary(selectedItem)}
                    className="h-11 rounded-2xl border-slate-300 font-bold text-xs uppercase tracking-wider flex-1 sm:flex-initial"
                  >
                    {hasCopied ? <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1.5" />}
                    {hasCopied ? "Tersalin!" : "Salin Ringkasan"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    className="h-11 rounded-2xl border-slate-300 font-bold text-xs uppercase tracking-wider flex-1 sm:flex-initial"
                  >
                    <Printer className="w-4 h-4 mr-1.5 text-slate-700" />
                    Cetak
                  </Button>
                </div>

                <Button
                  onClick={() => setSelectedItem(null)}
                  className="w-full sm:w-auto h-11 px-8 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800"
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
