"use client"

import { useState, useMemo, Suspense } from "react"
import { useMemoFirebase, useList, useDatabase } from "@/firebase"
import { ref } from "firebase/database"
import { BusinessActor } from "../lib/types"
import { parsePobDob, cn } from "@/lib/utils"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Users, Building2, RotateCcw, FileSpreadsheet, Search, Map as MapIcon, Home, Hash } from "lucide-react"
import * as XLSX from "xlsx"
import { useToast } from "@/hooks/use-toast"

// ── helpers & mappings ────────────────────────────────────────────────────────

const KELURAHAN_TO_KECAMATAN: Record<string, string> = {
  "SEIJANG": "BUKIT BESTARI",
  "SEI JANG": "BUKIT BESTARI",
  "DOMPAK": "BUKIT BESTARI",
  "TANJUNG UNGGAT": "BUKIT BESTARI",
  "TANJUNGPINANG TIMUR": "TANJUNGPINANG TIMUR",
  "TANJUNJGPINANG TIMUR": "TANJUNGPINANG TIMUR",
  "TANJUNGPINNAG TIMUR": "TANJUNGPINANG TIMUR",
  "TANJUNG PINANG TIMUR": "TANJUNGPINANG TIMUR",
  "AIR RAJA": "TANJUNGPINANG TIMUR",
  "AIRRAJA": "TANJUNGPINANG TIMUR",
  "PINANG KENCANA": "TANJUNGPINANG TIMUR",
  "PINANGKENCANA": "TANJUNGPINANG TIMUR",
  "BATU IX": "TANJUNGPINANG TIMUR",
  "BATUIX": "TANJUNGPINANG TIMUR",
  "BATU 9": "TANJUNGPINANG TIMUR",
  "BATU9": "TANJUNGPINANG TIMUR",
  "KAMPUNG BULANG": "TANJUNGPINANG TIMUR",
  "KP BULANG": "TANJUNGPINANG TIMUR",
  "BULANG": "TANJUNGPINANG TIMUR",
  "KAMPUNG BUGIS": "TANJUNGPINANG KOTA",
  "KP BUGIS": "TANJUNGPINANG KOTA",
  "SENGGARANG": "TANJUNGPINANG KOTA",
  "TANJUNGPINANG KOTA": "TANJUNGPINANG KOTA",
  "TANJUNG PINANG KOTA": "TANJUNGPINANG KOTA",
  "PENYENGAT": "TANJUNGPINANG KOTA",
  "TANJUNGPINANG BARAT": "TANJUNGPINANG BARAT",
  "TANJUNG PINANG BARAT": "TANJUNGPINANG BARAT",
  "KEMBOJA": "TANJUNGPINANG BARAT",
  "KAMBOJA": "TANJUNGPINANG BARAT",
  "KAMPUNG BARU": "TANJUNGPINANG BARAT",
  "KP BARU": "TANJUNGPINANG BARAT",
  "BUKIT CERMIN": "TANJUNGPINANG BARAT",
  "BKT CERMIN": "TANJUNGPINANG BARAT",
}

function isValidKecamatan(kec: string): boolean {
  if (!kec) return false
  const clean = kec.trim().toUpperCase()
  return clean !== "" && clean !== "#N/A" && clean !== "N/A" && clean !== "NA" && clean !== "NULL" && clean !== "-" && clean !== "TIDAK DIKETAHUI"
}

function inferKecamatanFromText(text: string): string {
  if (!text) return ""
  const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, "")

  if (
    clean.includes("BARAT") ||
    clean.includes("KEMBOJA") ||
    clean.includes("KAMBOJA") ||
    clean.includes("BUKITCERMIN") ||
    clean.includes("BKTCERMIN") ||
    clean.includes("KAMPUNGBARU") ||
    clean.includes("KPBARU")
  ) {
    return "TANJUNGPINANG BARAT"
  }

  if (
    clean.includes("BESTARI") ||
    clean.includes("SEIJANG") ||
    clean.includes("DOMPAK") ||
    clean.includes("TANJUNGUNGGAT") ||
    clean.includes("TUNGGAT")
  ) {
    return "BUKIT BESTARI"
  }

  if (
    clean.includes("KOTA") ||
    clean.includes("BUGIS") ||
    clean.includes("KPBUGIS") ||
    clean.includes("SENGGARANG") ||
    clean.includes("PENYENGAT")
  ) {
    return "TANJUNGPINANG KOTA"
  }

  if (
    clean.includes("TIMUR") ||
    clean.includes("BATUIX") ||
    clean.includes("BATU9") ||
    clean.includes("PINANGKENCANA") ||
    clean.includes("AIRRAJA") ||
    clean.includes("BULANG") ||
    clean.includes("TANJUNJGPINANG") ||
    clean.includes("TANJUNGPINNAG")
  ) {
    return "TANJUNGPINANG TIMUR"
  }

  return ""
}

function formatKelurahan(rawKel: string): string {
  if (!rawKel || rawKel === "-") return "-"
  const clean = rawKel.trim().toUpperCase()
  if (clean === "BATUIX" || clean === "BATU9") return "BATU IX"
  if (clean === "TANJUNJGPINANG TIMUR" || clean === "TANJUNGPINNAG TIMUR" || clean === "TANJUNG PINANG TIMUR") return "TANJUNGPINANG TIMUR"
  if (clean === "TANJUNG PINANG BARAT") return "TANJUNGPINANG BARAT"
  if (clean === "TANJUNG PINANG KOTA") return "TANJUNGPINANG KOTA"
  return clean
}

function parseRtRw(raw: string): { rt: string; rw: string } {
  if (!raw) return { rt: "-", rw: "-" }
  const clean = raw.toUpperCase().replace(/\./g, " ").replace(/\s+/g, " ").trim()

  // Pattern: RT 001 RW 002 or RT001 RW002
  const full = clean.match(/RT\s*(\w+)[,/\s]+RW\s*(\w+)/)
  if (full) return { rt: full[1], rw: full[2] }

  // Pattern: 001/002
  const slash = clean.match(/^(\w+)\/(\w+)$/)
  if (slash) return { rt: slash[1], rw: slash[2] }

  return { rt: raw, rw: "-" }
}

function normalizeStr(s: string) {
  return (s || "").trim().toUpperCase()
}

// ── main component ────────────────────────────────────────────────────────────

function RekapanDataContent() {
  const database = useDatabase()
  const { toast } = useToast()

  // 1. Data Pengajuan Terbaru (businessActors)
  const actorsRef = useMemoFirebase(
    () => (database ? ref(database, "businessActors") : null),
    [database]
  )
  const { data: allActorsRaw, isLoading: isActorsLoading } = useList<BusinessActor>(actorsRef)

  // 2. Sheet 1: Data Pembanding 2024
  const master2024Ref = useMemoFirebase(
    () => (database ? ref(database, "master_data_2024") : null),
    [database]
  )
  const { data: data2024, isLoading: is2024Loading } = useList<any>(master2024Ref)

  // 3. Sheet 2: Data Pembanding 2023
  const master2023Ref = useMemoFirebase(
    () => (database ? ref(database, "master_data_2023") : null),
    [database]
  )
  const { data: data2023, isLoading: is2023Loading } = useList<any>(master2023Ref)

  // 4. Sheet 3: Data Pembanding 2025
  const master2025Ref = useMemoFirebase(
    () => (database ? ref(database, "master_data_2025") : null),
    [database]
  )
  const { data: data2025, isLoading: is2025Loading } = useList<any>(master2025Ref)

  const isLoading = isActorsLoading || is2024Loading || is2023Loading || is2025Loading

  // ── Combine & Deduplicate Data across Sheet 1, Sheet 2, Sheet 3 & Pengajuan Terbaru ──
  const actors: any[] = useMemo(() => {
    if (isLoading) return []

    // Build dynamic kelurahan -> kecamatan map from all available datasets
    const kelurahanMap = new Map<string, string>()

    // Seed static map
    Object.entries(KELURAHAN_TO_KECAMATAN).forEach(([kel, kec]) => {
      kelurahanMap.set(normalizeStr(kel), normalizeStr(kec))
    })

    const learnMap = (list: any[]) => {
      if (!list) return
      list.forEach(item => {
        if (!item) return
        const kel = normalizeStr(item.kelurahan || item.kel)
        const kec = normalizeStr(item.kecamatan || item.kec)
        if (kel && isValidKecamatan(kec)) {
          const inferred = inferKecamatanFromText(kec) || kec
          kelurahanMap.set(kel, inferred)
        }
      })
    }

    learnMap(allActorsRaw || [])
    learnMap(data2024 || [])
    learnMap(data2023 || [])
    learnMap(data2025 || [])

    const resolveKecamatan = (rawKec: string, rawKel: string, rawAddress: string = "", rawLocation: string = ""): string => {
      const cleanKec = normalizeStr(rawKec)
      if (isValidKecamatan(cleanKec)) {
        const inferredFromKec = inferKecamatanFromText(cleanKec)
        return inferredFromKec || cleanKec
      }

      // Fuzzy/keyword match on combined location text
      const combinedText = `${rawKel} ${rawAddress} ${rawLocation}`
      const inferred = inferKecamatanFromText(combinedText)
      if (inferred) {
        return inferred
      }

      // Direct lookup from dynamic dataset map
      const cleanKel = normalizeStr(rawKel)
      if (cleanKel && kelurahanMap.has(cleanKel)) {
        return kelurahanMap.get(cleanKel)!
      }

      return "-"
    }

    const dedupeMap = new Map<string, any>()

    const processItem = (rawItem: any, sourceLabel: string) => {
      if (!rawItem) return

      const fullName = (rawItem.fullName || rawItem.nama || "").trim()
      const nik = (rawItem.nik ? String(rawItem.nik).trim() : "")

      // Skip if completely empty name AND empty NIK
      if (!fullName && !nik) return

      // Deduplication Key: Prefer NIK if valid (not empty / not "-"), fallback to uppercase Name
      const dedupeKey = (nik && nik !== "-")
        ? `NIK:${nik}`
        : `NAME:${fullName.toUpperCase()}`

      const rawKel = rawItem.kelurahan || rawItem.kel || ""
      const rawKec = rawItem.kecamatan || rawItem.kec || ""
      const rawAddress = rawItem.address || rawItem.alamat || ""
      const rawLocation = rawItem.businessLocation || rawItem.lokasi || ""

      const resolvedKec = resolveKecamatan(rawKec, rawKel, rawAddress, rawLocation)

      // Ignore duplicate (count only 1 business actor)
      if (dedupeMap.has(dedupeKey)) {
        const existing = dedupeMap.get(dedupeKey)!
        // Enrich kecamatan if existing is invalid but current has valid kecamatan
        if (!isValidKecamatan(existing.kecamatan) && isValidKecamatan(resolvedKec)) {
          existing.kecamatan = resolvedKec
        }
        return
      }

      const parsedPobDob = parsePobDob(rawItem.pobDob || "")

      const normalizedItem = {
        id: rawItem.id || `rec_${dedupeKey}_${Math.random().toString(36).substr(2, 5)}`,
        fullName: fullName || "TANPA NAMA",
        nik: nik || "-",
        noKK: rawItem.noKK || rawItem.kk || "-",
        gender: rawItem.gender || "-",
        pob: rawItem.pob || parsedPobDob.pob || "-",
        dob: rawItem.dob || parsedPobDob.dob || "-",
        phone: rawItem.phone || rawItem.hp || "-",
        address: rawAddress || "-",
        rtRw: rawItem.rtRw || rawItem.rt_rw || (rawItem.rt ? `RT ${rawItem.rt} RW ${rawItem.rw || '-'}` : "-"),
        kelurahan: rawKel ? formatKelurahan(rawKel) : "-",
        kecamatan: resolvedKec,
        businessName: rawItem.businessName || rawItem.usaha || "-",
        businessCategory: rawItem.businessCategory || rawItem.kategori || rawItem.status || "-",
        businessLocation: rawLocation || rawAddress || "-",
        coordinator: rawItem.coordinator || rawItem.koor || "-",
        source: sourceLabel
      }

      dedupeMap.set(dedupeKey, normalizedItem)
    }

    // 1. Pengajuan Terbaru (Highest Priority)
    (allActorsRaw || []).forEach(item => processItem(item, "Pengajuan Terbaru"));

    // 2. Sheet 1: 2024
    (data2024 || []).forEach(item => processItem(item, "Sheet 1 (2024)"));

    // 3. Sheet 2: 2023
    (data2023 || []).forEach(item => processItem(item, "Sheet 2 (2023)"));

    // 4. Sheet 3: 2025
    (data2025 || []).forEach(item => processItem(item, "Sheet 3 (2025)"));

    return Array.from(dedupeMap.values())
  }, [allActorsRaw, data2024, data2023, data2025, isLoading])

  // ── filter state ──────────────────────────────────────────────────────────
  const [filterKecamatan, setFilterKecamatan] = useState("ALL")
  const [filterKelurahan, setFilterKelurahan] = useState("ALL")
  const [filterRw, setFilterRw] = useState("ALL")
  const [filterRt, setFilterRt] = useState("ALL")

  // ── unique values ─────────────────────────────────────────────────────────
  const kecamatanList = useMemo(
    () =>
      Array.from(new Set(actors.map(a => normalizeStr(a.kecamatan)).filter(k => k && k !== "-"))).sort(),
    [actors]
  )

  const kelurahanList = useMemo(() => {
    const src =
      filterKecamatan === "ALL"
        ? actors
        : actors.filter(a => normalizeStr(a.kecamatan) === filterKecamatan)
    return Array.from(new Set(src.map(a => normalizeStr(a.kelurahan)).filter(k => k && k !== "-"))).sort()
  }, [actors, filterKecamatan])

  const rwList = useMemo(() => {
    let src = actors
    if (filterKecamatan !== "ALL") src = src.filter(a => normalizeStr(a.kecamatan) === filterKecamatan)
    if (filterKelurahan !== "ALL") src = src.filter(a => normalizeStr(a.kelurahan) === filterKelurahan)
    return Array.from(new Set(src.map(a => parseRtRw(a.rtRw).rw).filter(v => v && v !== "-"))).sort()
  }, [actors, filterKecamatan, filterKelurahan])

  const rtList = useMemo(() => {
    let src = actors
    if (filterKecamatan !== "ALL") src = src.filter(a => normalizeStr(a.kecamatan) === filterKecamatan)
    if (filterKelurahan !== "ALL") src = src.filter(a => normalizeStr(a.kelurahan) === filterKelurahan)
    if (filterRw !== "ALL") src = src.filter(a => parseRtRw(a.rtRw).rw === filterRw)
    return Array.from(new Set(src.map(a => parseRtRw(a.rtRw).rt).filter(v => v && v !== "-"))).sort()
  }, [actors, filterKecamatan, filterKelurahan, filterRw])

  // ── filtered result ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let src = actors
    if (filterKecamatan !== "ALL") src = src.filter(a => normalizeStr(a.kecamatan) === filterKecamatan)
    if (filterKelurahan !== "ALL") src = src.filter(a => normalizeStr(a.kelurahan) === filterKelurahan)
    if (filterRw !== "ALL") src = src.filter(a => parseRtRw(a.rtRw).rw === filterRw)
    if (filterRt !== "ALL") src = src.filter(a => parseRtRw(a.rtRw).rt === filterRt)
    return src
  }, [actors, filterKecamatan, filterKelurahan, filterRw, filterRt])

  // ── stats per kecamatan (summary cards) ───────────────────────────────────
  const kecamatanStats = useMemo(() => {
    const map: Record<string, number> = {}
    actors.forEach(a => {
      const k = normalizeStr(a.kecamatan) || "TIDAK DIKETAHUI"
      if (k !== "-") {
        map[k] = (map[k] || 0) + 1
      }
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [actors])

  // ── reset filters ─────────────────────────────────────────────────────────
  const resetFilters = () => {
    setFilterKecamatan("ALL")
    setFilterKelurahan("ALL")
    setFilterRw("ALL")
    setFilterRt("ALL")
  }

  const handleKecamatanChange = (val: string) => {
    setFilterKecamatan(val)
    setFilterKelurahan("ALL")
    setFilterRw("ALL")
    setFilterRt("ALL")
  }

  const handleKelurahanChange = (val: string) => {
    setFilterKelurahan(val)
    setFilterRw("ALL")
    setFilterRt("ALL")
  }

  const handleRwChange = (val: string) => {
    setFilterRw(val)
    setFilterRt("ALL")
  }

  // ── export excel ──────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (filtered.length === 0) {
      toast({ variant: "destructive", title: "Gagal", description: "Tidak ada data untuk diekspor." })
      return
    }
    const rows = filtered.map((a, i) => {
      const parsed = parsePobDob(a.pobDob || "")
      return {
        "NO": i + 1,
        "NAMA LENGKAP": (a.fullName || "").toUpperCase(),
        "NIK": a.nik || "-",
        "NOMOR KK": a.noKK || "-",
        "JENIS KELAMIN": a.gender || "-",
        "TEMPAT LAHIR": (a.pob || parsed.pob || "-").toUpperCase(),
        "TANGGAL LAHIR": a.dob || parsed.dob || "-",
        "NOMOR HP": a.phone || "-",
        "ALAMAT": (a.address || "").toUpperCase(),
        "RT/RW": a.rtRw || "-",
        "KELURAHAN": (a.kelurahan || "").toUpperCase(),
        "KECAMATAN": (a.kecamatan || "").toUpperCase(),
        "NAMA USAHA": (a.businessName || "").toUpperCase(),
        "JENIS USAHA": (a.businessCategory || "").toUpperCase(),
        "LOKASI USAHA": (a.businessLocation || "").toUpperCase(),
        "KOORDINATOR": (a.coordinator || "").toUpperCase(),
        "SUMBER DATA": (a.source || "").toUpperCase(),
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Rekapan Data Gabungan")
    const cols = Object.keys(rows[0]).map(k => {
      let max = k.length
      rows.forEach(r => { const v = String((r as any)[k] || ""); if (v.length > max) max = v.length })
      return { wch: max + 2 }
    })
    ws["!cols"] = cols
    XLSX.writeFile(wb, `Rekapan_Data_Gabungan_${new Date().toISOString().split("T")[0]}.xlsx`)
    toast({ title: "Berhasil", description: "Data gabungan berhasil diekspor ke Excel." })
  }

  const activeFilters = [filterKecamatan, filterKelurahan, filterRw, filterRt].filter(f => f !== "ALL").length

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[100vw] overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">Rekapan Data Gabungan</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Rekap gabungan data pelaku usaha unik dari Sheet 1 (2024), Sheet 2 (2023), Sheet 3 (2025), dan Pengajuan Terbaru.
          </p>
        </div>
        <Button
          onClick={handleExportExcel}
          className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md h-10 rounded-xl"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          EKSPOR EXCEL
        </Button>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white overflow-hidden relative">
            <div className="absolute -right-4 -top-4 opacity-10"><Users className="w-24 h-24" /></div>
            <CardContent className="p-5 relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Pelaku Usaha</p>
              <p className="text-4xl font-black mt-1">{actors.length.toLocaleString('id-ID')}</p>
              <p className="text-[10px] font-bold opacity-70 mt-1">Gabungan Unik (Tanpa Duplikat)</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-gradient-to-br from-violet-600 to-violet-700 text-white overflow-hidden relative">
            <div className="absolute -right-4 -top-4 opacity-10"><MapIcon className="w-24 h-24" /></div>
            <CardContent className="p-5 relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Kecamatan</p>
              <p className="text-4xl font-black mt-1">{kecamatanList.length}</p>
              <p className="text-[10px] font-bold opacity-70 mt-1">Wilayah Kecamatan</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-gradient-to-br from-teal-600 to-teal-700 text-white overflow-hidden relative">
            <div className="absolute -right-4 -top-4 opacity-10"><MapPin className="w-24 h-24" /></div>
            <CardContent className="p-5 relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Hasil Filter</p>
              <p className="text-4xl font-black mt-1">{filtered.length.toLocaleString('id-ID')}</p>
              <p className="text-[10px] font-bold opacity-70 mt-1">Data Sesuai Filter</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden relative">
            <div className="absolute -right-4 -top-4 opacity-10"><Building2 className="w-24 h-24" /></div>
            <CardContent className="p-5 relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Filter Aktif</p>
              <p className="text-4xl font-black mt-1">{activeFilters}</p>
              <p className="text-[10px] font-bold opacity-70 mt-1">dari 4 Tingkat Wilayah</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kecamatan Distribution */}
      {!isLoading && kecamatanStats.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <MapIcon className="w-4 h-4" /> Distribusi Per Kecamatan
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {kecamatanStats.map(([name, count]) => {
              const pct = actors.length > 0 ? Math.round((count / actors.length) * 100) : 0
              return (
                <button
                  key={name}
                  onClick={() => handleKecamatanChange(name)}
                  className="text-left p-4 rounded-2xl bg-white border-2 border-transparent hover:border-primary/30 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[11px] font-black uppercase leading-tight text-slate-700 group-hover:text-primary transition-colors line-clamp-2">{name}</span>
                    <Badge className="bg-primary/10 text-primary text-[10px] font-black ml-1 shrink-0">{count.toLocaleString('id-ID')}</Badge>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-bold mt-1">{pct}% dari total</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
            <Search className="w-4 h-4" /> Filter Wilayah
          </h2>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50">
              <RotateCcw className="w-3 h-3 mr-1" /> Reset Filter
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Kecamatan */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <MapIcon className="w-3 h-3" /> Kecamatan
            </label>
            <Select value={filterKecamatan} onValueChange={handleKecamatanChange}>
              <SelectTrigger className="h-10 border-primary/20 font-bold text-xs rounded-xl">
                <SelectValue placeholder="Semua Kecamatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="font-bold text-xs">Semua Kecamatan</SelectItem>
                {kecamatanList.map(k => (
                  <SelectItem key={k} value={k} className="font-bold text-xs">{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kelurahan */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Kelurahan
            </label>
            <Select value={filterKelurahan} onValueChange={handleKelurahanChange} disabled={kelurahanList.length === 0}>
              <SelectTrigger className="h-10 border-primary/20 font-bold text-xs rounded-xl">
                <SelectValue placeholder="Semua Kelurahan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="font-bold text-xs">Semua Kelurahan</SelectItem>
                {kelurahanList.map(k => (
                  <SelectItem key={k} value={k} className="font-bold text-xs">{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* RW */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Home className="w-3 h-3" /> RW
            </label>
            <Select value={filterRw} onValueChange={handleRwChange} disabled={rwList.length === 0}>
              <SelectTrigger className="h-10 border-primary/20 font-bold text-xs rounded-xl">
                <SelectValue placeholder="Semua RW" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="font-bold text-xs">Semua RW</SelectItem>
                {rwList.map(r => (
                  <SelectItem key={r} value={r} className="font-bold text-xs">RW {r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* RT */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Hash className="w-3 h-3" /> RT
            </label>
            <Select value={filterRt} onValueChange={setFilterRt} disabled={rtList.length === 0}>
              <SelectTrigger className="h-10 border-primary/20 font-bold text-xs rounded-xl">
                <SelectValue placeholder="Semua RT" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="font-bold text-xs">Semua RT</SelectItem>
                {rtList.map(r => (
                  <SelectItem key={r} value={r} className="font-bold text-xs">RT {r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilters > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {filterKecamatan !== "ALL" && (
              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-black uppercase px-3 py-1 rounded-full">
                <MapIcon className="w-3 h-3" /> {filterKecamatan}
              </span>
            )}
            {filterKelurahan !== "ALL" && (
              <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                <MapPin className="w-3 h-3" /> {filterKelurahan}
              </span>
            )}
            {filterRw !== "ALL" && (
              <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                <Home className="w-3 h-3" /> RW {filterRw}
              </span>
            )}
            {filterRt !== "ALL" && (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                <Hash className="w-3 h-3" /> RT {filterRt}
              </span>
            )}
            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase px-3 py-1 rounded-full">
              <Users className="w-3 h-3" /> {filtered.length.toLocaleString('id-ID')} DATA
            </span>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Data Pelaku Usaha Gabungan
            <Badge className="bg-primary text-white font-black">{filtered.length.toLocaleString('id-ID')}</Badge>
          </h2>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <div className="p-4 bg-slate-50 rounded-full">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Tidak Ada Data Ditemukan</p>
            <p className="text-xs text-slate-400">Coba ubah atau reset filter wilayah</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full pb-2">
            <Table className="w-full min-w-[1050px]">
              <TableHeader className="bg-slate-50/80 border-b">
                <TableRow>
                  <TableHead className="font-black text-primary py-3.5 pl-6 w-12 text-center whitespace-nowrap">NO</TableHead>
                  <TableHead className="font-black text-primary py-3.5 whitespace-nowrap">NAMA LENGKAP</TableHead>
                  <TableHead className="font-black text-primary py-3.5 whitespace-nowrap">NIK</TableHead>
                  <TableHead className="font-black text-primary py-3.5 whitespace-nowrap">USAHA</TableHead>
                  <TableHead className="font-black text-primary py-3.5 whitespace-nowrap">KECAMATAN</TableHead>
                  <TableHead className="font-black text-primary py-3.5 whitespace-nowrap">KELURAHAN</TableHead>
                  <TableHead className="font-black text-primary py-3.5 whitespace-nowrap">RT / RW</TableHead>
                  <TableHead className="font-black text-primary py-3.5 whitespace-nowrap">USULAN</TableHead>
                  <TableHead className="font-black text-primary py-3.5 pr-6 text-right whitespace-nowrap">SUMBER DATA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((actor, index) => {
                  const { rt, rw } = parseRtRw(actor.rtRw)
                  return (
                    <TableRow key={actor.id} className="hover:bg-primary/5 transition-colors">
                      <TableCell className="py-3 pl-6 text-center font-bold text-slate-500 text-sm whitespace-nowrap">{index + 1}</TableCell>
                      <TableCell className="py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 uppercase text-[13px]">{actor.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{actor.gender}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">{actor.nik || "-"}</TableCell>
                      <TableCell className="py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-black text-primary text-[12px] uppercase">{actor.businessName}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{actor.businessCategory}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 whitespace-nowrap">
                        <span className="text-[11px] font-bold uppercase text-slate-700">{actor.kecamatan || "-"}</span>
                      </TableCell>
                      <TableCell className="py-3 whitespace-nowrap">
                        <span className="text-[11px] font-bold uppercase text-slate-700">{actor.kelurahan || "-"}</span>
                      </TableCell>
                      <TableCell className="py-3 whitespace-nowrap">
                        <div className="flex gap-1">
                          <span className="text-[10px] font-black bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">RT {rt}</span>
                          <span className="text-[10px] font-black bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">RW {rw}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 whitespace-nowrap">
                        <span className="text-[11px] font-bold uppercase text-slate-700">{actor.coordinator || "-"}</span>
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-right whitespace-nowrap">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase px-2.5 py-0.5 border-none shadow-sm inline-block",
                          actor.source?.includes("Pengajuan") ? "bg-emerald-100 text-emerald-800" :
                          actor.source?.includes("Sheet 1") ? "bg-blue-100 text-blue-800" :
                          actor.source?.includes("Sheet 2") ? "bg-indigo-100 text-indigo-800" :
                          "bg-amber-100 text-amber-800"
                        )}>
                          {actor.source}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RekapanDataPage() {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    }>
      <RekapanDataContent />
    </Suspense>
  )
}
