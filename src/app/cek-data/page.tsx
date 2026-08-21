"use client"

import React, { useState, useEffect, useMemo, Suspense, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  Database,
  User,
  Eye,
  FileText,
  ShieldCheck,
  CreditCard,
  Phone,
  Store,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  Building2,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  SearchX
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn, formatCurrency, maskLast4Digits, maskPhoneNumber } from "@/lib/utils"
import { formatTanggalIndonesia } from "@/lib/generate-berita-acara-pdf"
import { useToast } from "@/hooks/use-toast"

type SearchType = "nik" | "noKK" | "nama" | "phone"

function CekDataContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const [searchType, setSearchType] = useState<SearchType>(() => {
    const t = searchParams.get("type") as SearchType
    if (t && ["nik", "noKK", "nama", "phone"].includes(t)) return t
    return "nik"
  })
  const [inputValue, setInputValue] = useState<string>(() => searchParams.get("q") || "")
  const [submittedQuery, setSubmittedQuery] = useState<{ type: SearchType; value: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchDone, setSearchDone] = useState(false)
  const [filterSource, setFilterSource] = useState<string>("ALL")
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [hasCopied, setHasCopied] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Handle URL query parameters on initial page mount or navigation
  useEffect(() => {
    const urlQ = searchParams.get("q")
    const urlType = searchParams.get("type") as SearchType
    if (urlQ && urlQ.trim().length > 0) {
      const validType = ["nik", "noKK", "nama", "phone"].includes(urlType) ? urlType : "nik"
      setSearchType(validType)
      setInputValue(urlQ.trim())
      executeSearch(validType, urlQ.trim())
    }
  }, [searchParams])

  const executeSearch = async (type: SearchType, val: string) => {
    const cleanVal = val.trim()
    if (!cleanVal) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setSubmittedQuery({ type, value: cleanVal })
    setFilterSource("ALL")

    try {
      const res = await fetch(`/api/cek-data?type=${encodeURIComponent(type)}&q=${encodeURIComponent(cleanVal)}`, {
        signal: controller.signal,
      })
      const json = await res.json()

      if (json.success && Array.isArray(json.results)) {
        setSearchResults(json.results)
      } else {
        setSearchResults([])
      }
      setSearchDone(true)
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Error checking data:", err)
        setSearchResults([])
        setSearchDone(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const processed = inputValue.trim()
    const params = new URLSearchParams()
    params.set("type", searchType)
    params.set("q", processed)
    router.replace(`/cek-data?${params.toString()}`)
    executeSearch(searchType, processed)
  }

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setInputValue("")
    setSubmittedQuery(null)
    setSearchDone(false)
    setSearchResults([])
    setSelectedItem(null)
    router.replace("/cek-data")
  }

  // Filtered Results
  const filteredResults = useMemo(() => {
    if (filterSource === "ALL") return searchResults
    return searchResults.filter((m: any) => m._sourceType === filterSource)
  }, [searchResults, filterSource])

  // Count by sources
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: searchResults.length,
      actors: 0,
      master_2025: 0,
      master_2024: 0,
      master_2023: 0,
      blacklist: 0,
    }
    searchResults.forEach((item) => {
      if (counts[item._sourceType] !== undefined) {
        counts[item._sourceType]++
      }
    })
    return counts
  }, [searchResults])

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
      description: "Ringkasan data telah disalin ke clipboard.",
    })
    setTimeout(() => setHasCopied(false), 2500)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 font-sans px-1 sm:px-2">
      {/* Header Section: Minimalist & Clean */}
      <div className="text-center space-y-2.5 pt-2 sm:pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800 text-[11px] font-bold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Dinas Koperasi & Usaha Mikro</span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
          Pengecekan Data Pelaku Usaha
        </h1>

        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          Layanan mandiri pengecekan status pendaftaran, verifikasi, dan histori data UMKM secara cepat, akurat, dan transparan.
        </p>
      </div>

      {/* Main Search Box: Minimalist Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 md:p-8 space-y-5">
        {/* Parameter Selector Pills */}
        <div>
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 block">
            Pilih Kategori Pencarian
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "nik", label: "NIK KTP", desc: "16 Digit NIK", icon: CreditCard },
              { id: "noKK", label: "Nomor KK", desc: "16 Digit KK", icon: Database },
              { id: "nama", label: "Nama Lengkap", desc: "Nama Pemilik", icon: User },
              { id: "phone", label: "Nomor Ponsel", desc: "WhatsApp / HP", icon: Phone },
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
                  }}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl sm:rounded-2xl border text-left transition-all",
                    isActive
                      ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-1 ring-blue-600/30"
                      : "border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700 hover:border-slate-300"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs",
                      isActive ? "bg-blue-600 text-white" : "bg-white text-slate-500 border border-slate-200"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold truncate leading-tight">{tab.label}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{tab.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="search-input" className="text-xs font-semibold text-slate-700">
              {searchType === "nik" && "Masukkan 16 Digit NIK KTP"}
              {searchType === "noKK" && "Masukkan 16 Digit Nomor Kartu Keluarga (KK)"}
              {searchType === "nama" && "Masukkan Nama Lengkap Pelaku Usaha"}
              {searchType === "phone" && "Masukkan Nomor Ponsel / WhatsApp"}
            </Label>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Input
                  id="search-input"
                  type={searchType === "nama" ? "text" : "tel"}
                  inputMode={searchType === "nama" ? "text" : "numeric"}
                  maxLength={searchType === "nik" || searchType === "noKK" ? 16 : 60}
                  placeholder={
                    searchType === "nik"
                      ? "Contoh: 2172010101900001"
                      : searchType === "noKK"
                      ? "Contoh: 2172010101900002"
                      : searchType === "nama"
                      ? "Contoh: Budi Santoso"
                      : "Contoh: 081234567890"
                  }
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className={cn(
                    "h-12 sm:h-13 px-4 text-sm sm:text-base rounded-xl border border-slate-300 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-blue-600 text-slate-900 placeholder:text-slate-400 font-medium",
                    searchType !== "nama" && "font-mono tracking-wider"
                  )}
                  required
                />
                {inputValue && (
                  <button
                    type="button"
                    onClick={() => setInputValue("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full"
                    title="Hapus"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="h-12 sm:h-13 px-6 sm:px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide shadow-sm transition-all shrink-0 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mencari...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Cari Data</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] sm:text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Perlindungan Data Pribadi:</strong> Sesuai UU PDP, 4 digit terakhir NIK & Nomor KK disamarkan untuk melindungi privasi masyarakat.
            </p>
          </div>
        </form>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">Sedang Memeriksa Basis Data...</p>
            <p className="text-xs text-slate-500">Mencocokkan data di sistem SIMPU dan data master pembanding.</p>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchDone && !isLoading && (
        <div className="space-y-5">
          {searchResults.length > 0 ? (
            <div className="space-y-4">
              {/* Results Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs sm:text-sm font-bold">
                      Ditemukan {searchResults.length} data yang cocok
                    </p>
                    <p className="text-[11px] sm:text-xs text-emerald-700">
                      Kata kunci: <strong>"{submittedQuery?.value}"</strong> ({submittedQuery?.type.toUpperCase()})
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 rounded-lg border-emerald-300 text-emerald-800 hover:bg-emerald-100/70 text-xs font-semibold self-start sm:self-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Cari Ulang
                </Button>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-xl text-xs">
                {[
                  { id: "ALL", label: "Semua", count: sourceCounts.ALL },
                  { id: "actors", label: "SIMPU", count: sourceCounts.actors },
                  { id: "master_2025", label: "2025", count: sourceCounts.master_2025 },
                  { id: "master_2024", label: "2024", count: sourceCounts.master_2024 },
                  { id: "master_2023", label: "2023", count: sourceCounts.master_2023 },
                  { id: "blacklist", label: "Blacklist", count: sourceCounts.blacklist },
                ]
                  .filter((f) => f.count > 0 || f.id === "ALL")
                  .map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilterSource(f.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5",
                        filterSource === f.id
                          ? "bg-white text-slate-900 shadow-sm font-bold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                      )}
                    >
                      <span>{f.label}</span>
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded-full text-[10px]",
                          filterSource === f.id ? "bg-slate-100 text-slate-700" : "bg-slate-200 text-slate-600"
                        )}
                      >
                        {f.count}
                      </span>
                    </button>
                  ))}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                {filteredResults.map((item: any, idx: number) => {
                  const isBlacklist = item._sourceType === "blacklist"
                  const isFinish =
                    String(item._displayStatus || "").toLowerCase().includes("finish") ||
                    String(item._displayStatus || "").toLowerCase().includes("terdaftar")
                  const isVerified = String(item._displayStatus || "").toLowerCase().includes("verified")

                  return (
                    <Card
                      key={`${item._id}-${idx}`}
                      onClick={() => setSelectedItem(item)}
                      className={cn(
                        "bg-white rounded-2xl border transition-all hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden group",
                        isBlacklist ? "border-red-200 hover:border-red-400" : "border-slate-200 hover:border-blue-400"
                      )}
                    >
                      <div className="p-4 sm:p-5 space-y-3.5">
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border-none"
                          >
                            {item._source}
                          </Badge>

                          <Badge
                            className={cn(
                              "text-[10px] font-bold px-2.5 py-0.5 rounded-md border-none",
                              isBlacklist
                                ? "bg-red-600 text-white"
                                : isFinish
                                ? "bg-emerald-600 text-white"
                                : isVerified
                                ? "bg-blue-600 text-white"
                                : "bg-amber-500 text-white"
                            )}
                          >
                            {isBlacklist ? "Ditolak / Blacklist" : item._displayStatus.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        {/* Name & Basic IDs */}
                        <div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {item._displayName}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                            <span>NIK: {maskLast4Digits(item._displayNik)}</span>
                            <span>KK: {maskLast4Digits(item._displayKk)}</span>
                          </div>
                        </div>

                        {/* Business & Location Summary */}
                        <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 font-medium">Nama Usaha</span>
                            <span className="font-semibold text-slate-800 text-right truncate">{item._displayBusiness}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 font-medium">Wilayah</span>
                            <span className="font-semibold text-slate-700 text-right truncate">
                              {item._displayKelurahan !== "-" ? `${item._displayKelurahan}, ${item._displayKecamatan}` : item._displayKecamatan}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 font-medium">Tahun</span>
                            <span className="font-semibold text-slate-700">{item._displayYear}</span>
                          </div>
                          {item._displayNominal > 0 && (
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                              <span className="text-slate-400 font-medium">Bantuan</span>
                              <span className="font-bold text-emerald-600">{formatCurrency(item._displayNominal)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Action */}
                      <div className="px-4 pb-4 pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-9 rounded-xl text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Detail Lengkap</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Not Found State */
            <div className="p-8 sm:p-10 rounded-2xl bg-white border border-slate-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                <SearchX className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Data Tidak Ditemukan</h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Tidak ditemukan data untuk <strong>{submittedQuery?.type.toUpperCase()}: "{submittedQuery?.value}"</strong> pada database pendaftaran maupun master data.
                </p>
              </div>

              <div className="max-w-sm mx-auto p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1 text-slate-600">
                <p className="font-semibold text-slate-800">Petunjuk Pencarian:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-500">
                  <li>Pastikan NIK atau No. KK terdiri dari 16 digit angka.</li>
                  <li>Untuk pencarian nama, gunakan kata kunci nama depan atau nama lengkap.</li>
                  <li>Untuk nomor HP, gunakan format angka standar (contoh: 0812...).</li>
                </ul>
              </div>

              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="rounded-xl font-semibold text-xs"
              >
                Coba Pencarian Lain
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Initial Landing Guidance */}
      {!searchDone && !isLoading && (
        <div className="p-6 sm:p-8 rounded-2xl border border-dashed border-slate-300 bg-white/60 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Search className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-slate-800">Siap Melakukan Pengecekan</h3>
            <p className="text-xs text-slate-500">
              Pilih parameter pencarian di atas, ketik data yang ingin diperiksa, lalu klik tombol <strong>Cari Data</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Detail Modal Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[88vh] overflow-y-auto p-0 border border-slate-200 rounded-2xl sm:rounded-3xl bg-white shadow-xl">
          {selectedItem && (
            <div>
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-slate-900 text-white space-y-2 rounded-t-2xl sm:rounded-t-3xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge className="bg-white/20 text-white font-semibold text-[10px] uppercase tracking-wider border-none">
                    {selectedItem._source}
                  </Badge>
                  <Badge
                    className={cn(
                      "font-bold text-[10px] uppercase tracking-wider border-none",
                      selectedItem._sourceType === "blacklist" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
                    )}
                  >
                    {selectedItem._displayStatus.replace(/_/g, " ")}
                  </Badge>
                </div>

                <DialogTitle className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
                  {selectedItem._displayName}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  Rincian Informasi Data Pelaku Usaha
                </DialogDescription>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-5 text-xs">
                {/* 1. Identitas */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-blue-700 uppercase tracking-wider pb-1 border-b">
                    <User className="w-3.5 h-3.5" />
                    <span>Data Identitas Pemilik</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">Nama Lengkap</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedItem._displayName}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">NIK (Disamarkan)</span>
                      <span className="font-mono font-bold text-slate-800">{maskLast4Digits(selectedItem._displayNik)}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">Nomor KK (Disamarkan)</span>
                      <span className="font-mono font-bold text-slate-800">{maskLast4Digits(selectedItem._displayKk)}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">Nomor Ponsel</span>
                      <span className="font-bold text-slate-800">{maskPhoneNumber(selectedItem._displayPhone)}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">Kelurahan</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedItem._displayKelurahan}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">Kecamatan</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedItem._displayKecamatan}</span>
                    </div>
                    <div className="sm:col-span-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">Alamat Lengkap</span>
                      <span className="font-medium text-slate-800 uppercase">
                        {selectedItem._displayAddress} {selectedItem.rtRw ? `(RT/RW: ${selectedItem.rtRw})` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Usaha & Histori */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-blue-700 uppercase tracking-wider pb-1 border-b">
                    <Store className="w-3.5 h-3.5" />
                    <span>Data Usaha & Bantuan</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">Nama Usaha</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedItem._displayBusiness}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">Kategori Usaha</span>
                      <span className="font-medium text-slate-800 uppercase">
                        {selectedItem.businessCategory || selectedItem.kategori || "-"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">Tahun Pengajuan / Data</span>
                      <span className="font-bold text-slate-800">{selectedItem._displayYear}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">Nominal Bantuan</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(selectedItem._displayNominal)}</span>
                    </div>

                    {selectedItem.rejectionReason && (
                      <div className="sm:col-span-2 p-3 bg-red-50 rounded-xl border border-red-200 text-red-900 space-y-1">
                        <span className="text-[10px] font-bold text-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Alasan Penolakan / Catatan
                        </span>
                        <p className="font-medium leading-relaxed">{selectedItem.rejectionReason}</p>
                      </div>
                    )}

                    {selectedItem.keteranganDinas && (
                      <div className="sm:col-span-2 p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 space-y-1">
                        <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          Keterangan Dinas
                        </span>
                        <p className="font-medium leading-relaxed">{selectedItem.keteranganDinas}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Field Survey (If any) */}
                {selectedItem.surveyData && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-blue-700 uppercase tracking-wider pb-1 border-b">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Hasil Survey Lapangan Dinas</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedItem.surveyData.tanggalSurvey && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-semibold block">Tanggal Survey</span>
                          <span className="font-bold text-slate-800">
                            {formatTanggalIndonesia(selectedItem.surveyData.tanggalSurvey).fullText}
                          </span>
                        </div>
                      )}
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-semibold block">Modal Usaha</span>
                        <span className="font-medium text-slate-800">{selectedItem.surveyData.modalUsaha || "-"}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-semibold block">Omset Usaha</span>
                        <span className="font-medium text-slate-800">{selectedItem.surveyData.omset || "-"}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-semibold block">Tahun Berdiri</span>
                        <span className="font-medium text-slate-800">{selectedItem.surveyData.tahunBerdiri || "-"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 rounded-b-2xl sm:rounded-b-3xl">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopySummary(selectedItem)}
                    className="h-9 px-3 rounded-xl font-semibold text-xs border-slate-300"
                  >
                    {hasCopied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {hasCopied ? "Tersalin" : "Salin Ringkasan"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="h-9 px-3 rounded-xl font-semibold text-xs border-slate-300"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1 text-slate-600" />
                    Cetak
                  </Button>
                </div>

                <Button
                  onClick={() => setSelectedItem(null)}
                  size="sm"
                  className="h-9 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
                >
                  Tutup
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
        <div className="h-[50vh] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs font-semibold text-slate-500">Memuat Halaman Cek Data...</p>
        </div>
      }
    >
      <CekDataContent />
    </Suspense>
  )
}

