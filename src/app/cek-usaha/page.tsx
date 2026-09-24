"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useDatabase, useMemoFirebase, useUser, useObject } from "@/firebase"
import { ref } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Store,
  Search,
  Loader2,
  CheckCircle2,
  Info,
  User,
  Eye,
  FileSpreadsheet,
  RotateCcw,
  RefreshCw,
  Copy,
  Check,
  MapPin,
  Phone,
  ShieldAlert,
  Building2,
  Calendar,
  Layers,
  ArrowUpDown,
  Filter,
  ExternalLink,
  MessageCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn, formatCurrency } from "@/lib/utils"
import { logActivity, getDeviceType } from "@/lib/logger"
import * as XLSX from "xlsx"

// Preset Quick Chips for popular business categories
const POPULAR_USAHA_TAGS = [
  { label: "Semua", value: "" },
  { label: "Kuliner / Makanan", value: "kuliner" },
  { label: "Warung / Sembako", value: "warung" },
  { label: "Kue & Roti", value: "kue" },
  { label: "Jahit / Pakaian", value: "jahit" },
  { label: "Bengkel / Otomotif", value: "bengkel" },
  { label: "Laundry", value: "laundry" },
  { label: "Salon & Pangkas", value: "salon" },
  { label: "Kelontong / Kios", value: "kelontong" },
  { label: "Pertanian & Ikan", value: "ikan" },
  { label: "Minuman & Kopi", value: "kopi" },
  { label: "Boat / Penambang", value: "boat" },
]

export default function CekUsahaPage() {
  const { user, userProfile } = useUser()
  const database = useDatabase()
  const { toast } = useToast()

  // State
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [kecamatanFilter, setKecamatanFilter] = useState<string>("all")
  const [allResults, setAllResults] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    actorsCount: 0,
    pembandingTotalCount: 0,
    pembanding2025Count: 0,
    pembanding2024Count: 0,
    pembanding2023Count: 0,
  })

  // Selected item for detail dialog
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sortBy, setSortBy] = useState<"nama" | "usaha" | "sumber">("nama")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Admin Verification
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)
  const isAdmin =
    !!adminRole ||
    user?.email?.toLowerCase() === "agus@umkm.id" ||
    userProfile?.role === "admin"

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setCurrentPage(1)
    }, 350)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Fetch data from dedicated API
  const fetchData = useCallback(
    async (refresh = false) => {
      if (!isAdmin) return
      setLoading(true)

      try {
        const queryParams = new URLSearchParams()
        if (debouncedQuery) queryParams.set("q", debouncedQuery)
        if (sourceFilter && sourceFilter !== "all") queryParams.set("source", sourceFilter)
        if (refresh) queryParams.set("refresh", "true")

        const res = await fetch(`/api/cek-usaha?${queryParams.toString()}`)
        const json = await res.json()

        if (json.success && Array.isArray(json.results)) {
          setAllResults(json.results)
          if (json.stats) setStats(json.stats)
          setDataLoaded(true)

          if (debouncedQuery) {
            logActivity(
              {
                query: `CEK USAHA: "${debouncedQuery}" [Source: ${sourceFilter}]`,
                results: `Ditemukan ${json.results.length} data`,
                device: getDeviceType(navigator.userAgent),
                source: "Web",
                method: "CEK USAHA ADMIN",
                userId: userProfile?.fullName || user?.email || "Admin",
              },
              database || undefined
            ).catch((err) => console.error("Log error:", err))
          }
        } else {
          setAllResults([])
          toast({
            variant: "destructive",
            title: "Gagal Mengambil Data",
            description: json.error || "Terjadi kesalahan pada server",
          })
        }
      } catch (err: any) {
        console.error("Error fetching usaha data:", err)
        toast({
          variant: "destructive",
          title: "Terjadi Kesalahan",
          description: "Tidak dapat terhubung ke server data.",
        })
      } finally {
        setLoading(false)
      }
    },
    [isAdmin, debouncedQuery, sourceFilter, database, userProfile, user, toast]
  )

  useEffect(() => {
    if (isAdmin) {
      fetchData()
    }
  }, [isAdmin, fetchData])

  // Extract distinct kecamatans from results
  const distinctKecamatans = useMemo(() => {
    const set = new Set<string>()
    allResults.forEach((r) => {
      if (r._displayKecamatan && r._displayKecamatan !== "-") {
        set.add(r._displayKecamatan.toUpperCase())
      }
    })
    return Array.from(set).sort()
  }, [allResults])

  // Client-side filtering (e.g. by Kecamatan) and sorting
  const filteredAndSorted = useMemo(() => {
    let list = [...allResults]

    if (kecamatanFilter !== "all") {
      list = list.filter(
        (r) =>
          r._displayKecamatan &&
          r._displayKecamatan.toUpperCase() === kecamatanFilter.toUpperCase()
      )
    }

    list.sort((a, b) => {
      let valA = ""
      let valB = ""

      if (sortBy === "nama") {
        valA = String(a._displayName || "").toLowerCase()
        valB = String(b._displayName || "").toLowerCase()
      } else if (sortBy === "usaha") {
        valA = String(a._displayBusiness || "").toLowerCase()
        valB = String(b._displayBusiness || "").toLowerCase()
      } else if (sortBy === "sumber") {
        valA = String(a._sourceLabel || "").toLowerCase()
        valB = String(b._sourceLabel || "").toLowerCase()
      }

      const cmp = valA.localeCompare(valB, "id-ID")
      return sortOrder === "asc" ? cmp : -cmp
    })

    return list
  }, [allResults, kecamatanFilter, sortBy, sortOrder])

  // Paginated results
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAndSorted.slice(start, start + pageSize)
  }, [filteredAndSorted, currentPage, pageSize])

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1

  // Copy to clipboard helper
  const handleCopy = (text: string, id: string, label: string) => {
    if (!text || text === "-") return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast({
      title: `${label} Disalin`,
      description: text,
    })
    setTimeout(() => setCopiedId(null), 1800)
  }

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredAndSorted.length === 0) {
      toast({
        variant: "destructive",
        title: "Data Kosong",
        description: "Tidak ada data untuk diekspor ke Excel.",
      })
      return
    }

    try {
      const rows = filteredAndSorted.map((item, index) => ({
        "No": index + 1,
        "Nama Pelaku Usaha": item._displayName || "-",
        "Nama / Jenis Usaha": item._displayBusiness || "-",
        "Kategori Usaha": item._businessCategory || "-",
        "Sumber Data": item._sourceLabel || "-",
        "NIK": item._displayNik || "-",
        "No KK": item._displayKk || "-",
        "No HP": item._displayPhone || "-",
        "Alamat": item._displayAddress || "-",
        "Kelurahan": item._displayKelurahan || "-",
        "Kecamatan": item._displayKecamatan || "-",
        "Status": item._displayStatus || "-",
        "Tahun": item._displayYear || "-",
        "Koordinator": item._coordinator || "-",
      }))

      const ws = XLSX.utils.json_to_sheet(rows)

      // Set column widths
      ws["!cols"] = [
        { wch: 5 },  // No
        { wch: 28 }, // Nama
        { wch: 28 }, // Usaha
        { wch: 18 }, // Kategori
        { wch: 28 }, // Sumber Data
        { wch: 19 }, // NIK
        { wch: 19 }, // No KK
        { wch: 15 }, // No HP
        { wch: 32 }, // Alamat
        { wch: 18 }, // Kelurahan
        { wch: 18 }, // Kecamatan
        { wch: 16 }, // Status
        { wch: 8 },  // Tahun
        { wch: 22 }, // Koordinator
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Cek Usaha")

      const keywordSuffix = debouncedQuery ? `_${debouncedQuery.replace(/[^a-zA-Z0-9]/g, "_")}` : ""
      const filename = `Cek_Usaha${keywordSuffix}_${new Date().toISOString().split("T")[0]}.xlsx`

      XLSX.writeFile(wb, filename)

      toast({
        title: "Export Berhasil",
        description: `${filteredAndSorted.length} baris data berhasil diekspor ke ${filename}`,
      })
    } catch (err) {
      console.error("Export Excel error:", err)
      toast({
        variant: "destructive",
        title: "Export Gagal",
        description: "Terjadi kesalahan saat membuat file Excel.",
      })
    }
  }

  // Highlight matching search term helper
  const highlightMatch = (text: string, query: string) => {
    if (!query || !text) return text
    const cleanQ = query.trim()
    if (!cleanQ) return text

    let regexPattern = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    if (cleanQ.toLowerCase() === 'kuliner') {
      regexPattern = `${regexPattern}|makan(?:an)?|minum(?:an)?|kue|roti|gorengan|mie|bakso|kopi|snack|resto|catering|katering`
    } else if (cleanQ.toLowerCase() === 'warung') {
      regexPattern = `${regexPattern}|kelontong|sembako|runcit|kios|toko`
    } else if (cleanQ.toLowerCase() === 'jahit') {
      regexPattern = `${regexPattern}|pakaian|konveksi|tailor|taylor|busana|bordir`
    } else if (cleanQ.toLowerCase() === 'bengkel') {
      regexPattern = `${regexPattern}|motor|mobil|otomotif|las|tambal ban|servis`
    } else if (cleanQ.toLowerCase() === 'boat') {
      regexPattern = `${regexPattern}|penambang|pompong|sampan|perahu`
    }

    const parts = text.split(new RegExp(`(${regexPattern})`, "gi"))
    return parts.map((part, i) =>
      new RegExp(`^(${regexPattern})$`, "i").test(part) ? (
        <span key={i} className="bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold px-1 rounded">
          {part}
        </span>
      ) : (
        part
      )
    )
  }

  // Render Source Badge helper
  const renderSourceBadge = (sourceType: string, sourceLabel: string) => {
    if (sourceType === "actors") {
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-sm flex items-center gap-1.5 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Pengajuan Terbaru (SIMPU)
        </Badge>
      )
    }
    if (sourceType === "master_2025") {
      return (
        <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700 font-semibold text-[11px] w-fit">
          Sheet 2025 (Pembanding 3)
        </Badge>
      )
    }
    if (sourceType === "master_2024") {
      return (
        <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 font-semibold text-[11px] w-fit">
          Sheet 2024 (Pembanding 1)
        </Badge>
      )
    }
    if (sourceType === "master_2023") {
      return (
        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 font-semibold text-[11px] w-fit">
          Sheet 2023 (Pembanding 2)
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-[11px]">
        {sourceLabel}
      </Badge>
    )
  }

  // Access check state
  if (isAdminLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Memverifikasi hak akses Administrator...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-12 md:p-20 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">Akses Ditolak</h1>
        <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
          Menu <strong>CEK USAHA</strong> khusus diperuntukkan bagi <strong>Administrator</strong>. Silakan hubungi admin sistem apabila memerlukan akses.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-[98rem] mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <div className="p-3 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight font-headline">
                CEK USAHA
              </h1>
              <Badge className="bg-sky-600 hover:bg-sky-600 text-white font-bold text-[10px] uppercase tracking-wider">
                Khusus Admin
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground font-medium">
              Pengecekan data pelaku usaha berdasarkan <strong>USAHA</strong> yang dilakukan (Pengajuan Terbaru SIMPU & Sheet Pembanding 2023, 2024, 2025).
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={loading}
            className="text-xs font-semibold h-9 rounded-xl border-slate-300 dark:border-slate-700"
            title="Muat ulang data dari server"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin text-primary")} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("")
              setDebouncedQuery("")
              setSourceFilter("all")
              setKecamatanFilter("all")
              setCurrentPage(1)
            }}
            className="text-xs font-semibold h-9 rounded-xl border-slate-300 dark:border-slate-700"
            title="Reset seluruh filter pencarian"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Reset
          </Button>

          <Button
            size="sm"
            onClick={handleExportExcel}
            disabled={filteredAndSorted.length === 0}
            className="text-xs font-bold h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Export Excel ({filteredAndSorted.length})
          </Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Ditemukan */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
          <CardContent className="p-4 md:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Ditemukan
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {stats.total.toLocaleString("id-ID")}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {debouncedQuery ? `Kata kunci: "${debouncedQuery}"` : "Seluruh data"}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600">
              <Store className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Pengajuan Terbaru (SIMPU) */}
        <Card className="border border-emerald-200 dark:border-emerald-900/50 shadow-sm bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl">
          <CardContent className="p-4 md:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Pengajuan Terbaru (SIMPU)
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
                {stats.actorsCount.toLocaleString("id-ID")}
              </h3>
              <p className="text-[10px] text-emerald-600/90 dark:text-emerald-400 mt-0.5 font-medium">
                Pendaftar terkini di sistem
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Sheet Pembanding */}
        <Card className="border border-blue-200 dark:border-blue-900/50 shadow-sm bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl">
          <CardContent className="p-4 md:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Sheet Pembanding
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-blue-800 dark:text-blue-300 mt-1">
                {stats.pembandingTotalCount.toLocaleString("id-ID")}
              </h3>
              <p className="text-[10px] text-blue-600/90 dark:text-blue-400 mt-0.5">
                2025 ({stats.pembanding2025Count}) • 2024 ({stats.pembanding2024Count}) • 2023 ({stats.pembanding2023Count})
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-700">
              <Layers className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Filter Aktif & Total Terfilter */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
          <CardContent className="p-4 md:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ditampilkan
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {filteredAndSorted.length.toLocaleString("id-ID")}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[150px]">
                {sourceFilter === "all" ? "Semua Sumber" : sourceFilter}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Filter className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Panel */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Input Search Keyword USAHA */}
            <div className="md:col-span-6 space-y-1.5">
              <Label htmlFor="searchUsaha" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pencarian Berdasarkan Usaha yang Dilakukan
              </Label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="searchUsaha"
                  type="text"
                  placeholder="Ketik kata kunci usaha (misal: Kue, Warung, Laundry, Jahit, Bengkel, Sembako, Katering)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-10 rounded-xl border-slate-300 dark:border-slate-700 focus-visible:ring-sky-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center"
                    title="Hapus pencarian"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Filter Sumber Data */}
            <div className="md:col-span-3 space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Sumber Data
              </Label>
              <Select value={sourceFilter} onValueChange={(val) => { setSourceFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-10 rounded-xl border-slate-300 dark:border-slate-700">
                  <SelectValue placeholder="Pilih Sumber" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Sumber Data</SelectItem>
                  <SelectItem value="actors">Pengajuan Terbaru (SIMPU)</SelectItem>
                  <SelectItem value="pembanding">Semua Sheet Pembanding</SelectItem>
                  <SelectItem value="master_2025">Sheet Pembanding 2025 (Sheet 3)</SelectItem>
                  <SelectItem value="master_2024">Sheet Pembanding 2024 (Sheet 1)</SelectItem>
                  <SelectItem value="master_2023">Sheet Pembanding 2023 (Sheet 2)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Kecamatan */}
            <div className="md:col-span-3 space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Filter Kecamatan
              </Label>
              <Select value={kecamatanFilter} onValueChange={(val) => { setKecamatanFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-10 rounded-xl border-slate-300 dark:border-slate-700">
                  <SelectValue placeholder="Semua Kecamatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kecamatan</SelectItem>
                  {distinctKecamatans.map((kec) => (
                    <SelectItem key={kec} value={kec}>
                      {kec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Filter Tag Chips */}
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Kategori Usaha Cepat:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_USAHA_TAGS.map((tag) => {
                const isActive = searchQuery.toLowerCase() === tag.value.toLowerCase()
                return (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => setSearchQuery(tag.value)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-lg border font-medium transition-all",
                      isActive
                        ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    )}
                  >
                    {tag.label}
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table Panel */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
        <CardHeader className="p-4 md:p-6 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
              <span>Daftar Pelaku Usaha Berdasarkan Usaha</span>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-sky-600" />}
            </CardTitle>
            <CardDescription className="text-xs">
              Menampilkan {paginatedData.length} dari {filteredAndSorted.length} data pelaku usaha yang ditemukan.
            </CardDescription>
          </div>

          {/* Sort & Page Size Controls */}
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-8 text-xs rounded-lg border-slate-300 dark:border-slate-700 w-[140px]">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nama">Urut Nama</SelectItem>
                <SelectItem value="usaha">Urut Usaha</SelectItem>
                <SelectItem value="sumber">Urut Sumber</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="h-8 w-8 rounded-lg border-slate-300 dark:border-slate-700"
              title={sortOrder === "asc" ? "A-Z (Naik)" : "Z-A (Turun)"}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </Button>

            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-8 text-xs rounded-lg border-slate-300 dark:border-slate-700 w-[95px]">
                <SelectValue placeholder="Baris" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 Baris</SelectItem>
                <SelectItem value="25">25 Baris</SelectItem>
                <SelectItem value="50">50 Baris</SelectItem>
                <SelectItem value="100">100 Baris</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                  <TableHead className="min-w-[200px] text-xs font-bold text-slate-900 dark:text-slate-100">
                    Nama Pelaku Usaha
                  </TableHead>
                  <TableHead className="min-w-[220px] text-xs font-bold text-slate-900 dark:text-slate-100">
                    Usaha yang Dilakukan
                  </TableHead>
                  <TableHead className="min-w-[190px] text-xs font-bold">Sumber Data</TableHead>
                  <TableHead className="min-w-[150px] text-xs font-bold">NIK / No KK</TableHead>
                  <TableHead className="min-w-[180px] text-xs font-bold">Alamat / Wilayah</TableHead>
                  <TableHead className="min-w-[110px] text-xs font-bold text-center">Status / Tahun</TableHead>
                  <TableHead className="w-24 text-center text-xs font-bold">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && filteredAndSorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
                        <p className="text-xs font-medium text-muted-foreground">
                          Sedang mencari data pelaku usaha dan sheet pembanding...
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                        <Store className="w-10 h-10 stroke-1 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Tidak ditemukan data pelaku usaha
                        </p>
                        <p className="text-xs max-w-sm">
                          {debouncedQuery
                            ? `Tidak ada data yang cocok dengan jenis usaha "${debouncedQuery}". Coba kata kunci lain atau pilih Semua Sumber.`
                            : "Belum ada data tersedia pada parameter yang dipilih."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, index) => {
                    const rowNumber = (currentPage - 1) * pageSize + index + 1
                    const hasValidPhone =
                      item._displayPhone &&
                      item._displayPhone !== "-" &&
                      item._displayPhone.length >= 8

                    return (
                      <TableRow
                        key={item._id || index}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* No */}
                        <TableCell className="text-center text-xs font-mono text-slate-500 font-semibold">
                          {rowNumber}
                        </TableCell>

                        {/* NAMA PELAKU USAHA (Paling Ditonjolkan) */}
                        <TableCell>
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-black text-xs shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700">
                              {item._displayName ? item._displayName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                                {item._displayName}
                                <button
                                  type="button"
                                  onClick={() => handleCopy(item._displayName, `name_${item._id}`, "Nama Pelaku Usaha")}
                                  className="text-slate-400 hover:text-slate-600 transition-colors"
                                  title="Salin Nama"
                                >
                                  {copiedId === `name_${item._id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </p>
                              {item._coordinator && item._coordinator !== "-" && (
                                <p className="text-[10px] text-muted-foreground">
                                  Koor: <span className="font-medium text-slate-600 dark:text-slate-400">{item._coordinator}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* USAHA YANG DILAKUKAN */}
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-bold text-xs text-sky-900 dark:text-sky-300 uppercase leading-snug">
                              {highlightMatch(item._displayBusiness, debouncedQuery)}
                            </p>
                            {item._businessCategory && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                                {item._businessCategory}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* SUMBER DATA */}
                        <TableCell>
                          {renderSourceBadge(item._sourceType, item._sourceLabel)}
                        </TableCell>

                        {/* NIK / KK */}
                        <TableCell>
                          <div className="space-y-0.5 text-xs font-mono">
                            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                              <span>NIK: {item._displayNik}</span>
                              {item._displayNik && item._displayNik !== "-" && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(item._displayNik, `nik_${item._id}`, "NIK")}
                                  className="text-slate-400 hover:text-slate-600"
                                  title="Salin NIK"
                                >
                                  {copiedId === `nik_${item._id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              KK: {item._displayKk}
                            </p>
                          </div>
                        </TableCell>

                        {/* ALAMAT / WILAYAH */}
                        <TableCell>
                          <div className="text-xs space-y-0.5 max-w-[200px]">
                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate" title={item._displayAddress}>
                              {item._displayAddress}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {item._displayKelurahan !== "-" ? `Kel. ${item._displayKelurahan}` : ""}
                              {item._displayKecamatan !== "-" ? `, Kec. ${item._displayKecamatan}` : ""}
                            </p>
                          </div>
                        </TableCell>

                        {/* STATUS / TAHUN */}
                        <TableCell className="text-center">
                          <div className="space-y-0.5">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] font-bold uppercase",
                                item._displayStatus.toLowerCase().includes("verified") || item._displayStatus.toLowerCase().includes("lolos")
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : item._displayStatus.toLowerCase().includes("pending")
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              )}
                            >
                              {item._displayStatus}
                            </Badge>
                            <p className="text-[10px] font-mono text-muted-foreground">
                              Thn: {item._displayYear}
                            </p>
                          </div>
                        </TableCell>

                        {/* AKSI */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedItem(item)}
                              className="h-7 text-xs font-semibold px-2 rounded-lg border-sky-300 text-sky-700 hover:bg-sky-50"
                              title="Lihat Detail Lengkap"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Detail
                            </Button>

                            {hasValidPhone && (
                              <a
                                href={`https://wa.me/${item._displayPhone.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="h-7 w-7 rounded-lg border border-emerald-300 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors"
                                title="Kirim Pesan WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <p className="text-muted-foreground">
                Halaman <span className="font-bold text-slate-800 dark:text-slate-200">{currentPage}</span> dari{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span> ({filteredAndSorted.length} Total Data)
              </p>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 text-xs font-semibold rounded-lg"
                >
                  Pertama
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 text-xs font-semibold rounded-lg"
                >
                  Sebelumnya
                </Button>
                <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 font-bold rounded-lg text-slate-700 dark:text-slate-300">
                  {currentPage}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 text-xs font-semibold rounded-lg"
                >
                  Selanjutnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 text-xs font-semibold rounded-lg"
                >
                  Terakhir
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-none shadow-2xl">
          {selectedItem && (
            <div>
              {/* Dialog Header */}
              <div className="bg-sky-600 text-white p-5 md:p-6 rounded-t-3xl space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-white/20 rounded-md">
                    DETAIL PELAKU USAHA
                  </span>
                  {renderSourceBadge(selectedItem._sourceType, selectedItem._sourceLabel)}
                </div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mt-1">
                  {selectedItem._displayName}
                </h2>
                <p className="text-sky-100 text-xs md:text-sm font-medium">
                  Usaha: <strong className="text-white">{selectedItem._displayBusiness}</strong>
                </p>
              </div>

              {/* Dialog Body */}
              <div className="p-5 md:p-6 space-y-5 bg-white dark:bg-slate-900">
                {/* Usaha Section */}
                <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-sky-600" />
                    Informasi Usaha
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Nama Usaha:</span>
                      <p className="font-extrabold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                        {selectedItem._displayBusiness}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Kategori / Sektor:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedItem._businessCategory || "-"}
                      </p>
                    </div>
                    {selectedItem._raw?.surveyData?.deskripsiUsaha && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 font-medium">Deskripsi Usaha:</span>
                        <p className="font-normal text-slate-700 dark:text-slate-300 mt-0.5 italic">
                          "{selectedItem._raw.surveyData.deskripsiUsaha}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Identitas Pelaku Usaha Section */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-600" />
                    Identitas Pelaku Usaha
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">NIK:</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedItem._displayNik}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Nomor Kartu Keluarga (KK):</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedItem._displayKk}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">No. Telepon / HP:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {selectedItem._displayPhone}
                        </p>
                        {selectedItem._displayPhone && selectedItem._displayPhone !== "-" && (
                          <a
                            href={`https://wa.me/${selectedItem._displayPhone.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 font-bold text-[11px] flex items-center gap-0.5"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WA
                          </a>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Tahun Terdata:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedItem._displayYear}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 font-medium">Alamat Lengkap:</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedItem._displayAddress}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Kelurahan:</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedItem._displayKelurahan}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Kecamatan:</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedItem._displayKecamatan}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status & Petugas Section */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-600" />
                    Status & Pengajuan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Status Data:</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 uppercase">
                        {selectedItem._displayStatus}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Sumber Asal:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedItem._sourceLabel}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Koordinator:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedItem._coordinator || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Petugas Survey:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedItem._surveyor || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Foto Usaha jika ada */}
                {selectedItem._photoUrl && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Foto Usaha Pelaku Usaha
                    </h4>
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-64 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <img
                        src={selectedItem._photoUrl}
                        alt={`Usaha ${selectedItem._displayBusiness}`}
                        className="object-contain max-h-64 w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dialog Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 rounded-b-3xl flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedItem(null)}
                  className="rounded-xl text-xs font-semibold"
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
