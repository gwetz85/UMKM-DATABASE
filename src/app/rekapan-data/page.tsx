"use client"

import { useState, useMemo, Suspense } from "react"
import { useMemoFirebase, useList, useDatabase } from "@/firebase"
import { ref } from "firebase/database"
import { BusinessActor } from "../lib/types"
import { parsePobDob } from "@/lib/utils"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Users, Building2, RotateCcw, FileSpreadsheet, Search, Map, Home, Hash } from "lucide-react"
import * as XLSX from "xlsx"
import { useToast } from "@/hooks/use-toast"

// ── helpers ──────────────────────────────────────────────────────────────────

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

  const actorsRef = useMemoFirebase(
    () => (database ? ref(database, "businessActors") : null),
    [database]
  )
  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(actorsRef)

  // Only verified actors
  const actors = useMemo(
    () => (allActorsRaw || []).filter(a => a && a.status === "verified_actor"),
    [allActorsRaw]
  )

  // ── filter state ──────────────────────────────────────────────────────────
  const [filterKecamatan, setFilterKecamatan] = useState("ALL")
  const [filterKelurahan, setFilterKelurahan] = useState("ALL")
  const [filterRw, setFilterRw] = useState("ALL")
  const [filterRt, setFilterRt] = useState("ALL")

  // ── unique values ─────────────────────────────────────────────────────────
  const kecamatanList = useMemo(
    () =>
      Array.from(new Set(actors.map(a => normalizeStr(a.kecamatan)).filter(Boolean))).sort(),
    [actors]
  )

  const kelurahanList = useMemo(() => {
    const src =
      filterKecamatan === "ALL"
        ? actors
        : actors.filter(a => normalizeStr(a.kecamatan) === filterKecamatan)
    return Array.from(new Set(src.map(a => normalizeStr(a.kelurahan)).filter(Boolean))).sort()
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
      map[k] = (map[k] || 0) + 1
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
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Rekapan Data")
    const cols = Object.keys(rows[0]).map(k => {
      let max = k.length
      rows.forEach(r => { const v = String((r as any)[k] || ""); if (v.length > max) max = v.length })
      return { wch: max + 2 }
    })
    ws["!cols"] = cols
    XLSX.writeFile(wb, `Rekapan_Data_${new Date().toISOString().split("T")[0]}.xlsx`)
    toast({ title: "Berhasil", description: "Data berhasil diekspor ke Excel." })
  }

  const activeFilters = [filterKecamatan, filterKelurahan, filterRw, filterRt].filter(f => f !== "ALL").length

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">Rekapan Data</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Rekap data pelaku usaha berdasarkan wilayah kecamatan, kelurahan, RW, dan RT.
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
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Data</p>
              <p className="text-4xl font-black mt-1">{actors.length}</p>
              <p className="text-[10px] font-bold opacity-70 mt-1">Pelaku Usaha Terverifikasi</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-gradient-to-br from-violet-600 to-violet-700 text-white overflow-hidden relative">
            <div className="absolute -right-4 -top-4 opacity-10"><Map className="w-24 h-24" /></div>
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
              <p className="text-4xl font-black mt-1">{filtered.length}</p>
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
            <Map className="w-4 h-4" /> Distribusi Per Kecamatan
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {kecamatanStats.map(([name, count]) => {
              const pct = Math.round((count / actors.length) * 100)
              return (
                <button
                  key={name}
                  onClick={() => handleKecamatanChange(name)}
                  className="text-left p-4 rounded-2xl bg-white border-2 border-transparent hover:border-primary/30 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[11px] font-black uppercase leading-tight text-slate-700 group-hover:text-primary transition-colors line-clamp-2">{name}</span>
                    <Badge className="bg-primary/10 text-primary text-[10px] font-black ml-1 shrink-0">{count}</Badge>
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
              <Map className="w-3 h-3" /> Kecamatan
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
                <Map className="w-3 h-3" /> {filterKecamatan}
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
              <Users className="w-3 h-3" /> {filtered.length} DATA
            </span>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Data Pelaku Usaha
            <Badge className="bg-primary text-white font-black">{filtered.length}</Badge>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-black text-primary py-3 pl-6 w-12 text-center">NO</TableHead>
                  <TableHead className="font-black text-primary py-3">NAMA LENGKAP</TableHead>
                  <TableHead className="font-black text-primary py-3">NIK</TableHead>
                  <TableHead className="font-black text-primary py-3">USAHA</TableHead>
                  <TableHead className="font-black text-primary py-3">KECAMATAN</TableHead>
                  <TableHead className="font-black text-primary py-3">KELURAHAN</TableHead>
                  <TableHead className="font-black text-primary py-3">RT / RW</TableHead>
                  <TableHead className="font-black text-primary py-3">KOORDINATOR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((actor, index) => {
                  const { rt, rw } = parseRtRw(actor.rtRw)
                  return (
                    <TableRow key={actor.id} className="hover:bg-primary/5 transition-colors">
                      <TableCell className="py-3 pl-6 text-center font-bold text-slate-500 text-sm">{index + 1}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 uppercase text-[13px]">{actor.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{actor.gender}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 font-mono text-[11px] text-slate-600">{actor.nik || "-"}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-black text-primary text-[12px] uppercase">{actor.businessName}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{actor.businessCategory}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-[11px] font-bold uppercase text-slate-700">{actor.kecamatan || "-"}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-[11px] font-bold uppercase text-slate-700">{actor.kelurahan || "-"}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex gap-1">
                          <span className="text-[10px] font-black bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">RT {rt}</span>
                          <span className="text-[10px] font-black bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">RW {rw}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-[11px] font-bold uppercase text-slate-700">{actor.coordinator || "-"}</span>
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
