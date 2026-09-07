"use client"

import { useState, useMemo, Suspense } from "react"
import { useUser, useDatabase, useMemoFirebase, useList } from "@/firebase"
import { ref, query, orderByChild, equalTo } from "firebase/database"
import { generateSuratPernyataan, generateSuratPernyataanBulk } from "@/lib/pdf-generator"
import { BusinessActor } from "../lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import { logActivity, getDeviceType } from "@/lib/logger"
import {
  Loader2,
  Search,
  FileText,
  Printer,
  User,
  CreditCard,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  Users,
  Filter,
  X,
  Layers,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function CetakBerkasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      }
    >
      <CetakBerkasContent />
    </Suspense>
  )
}

function CetakBerkasContent() {
  const { user, userProfile } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>("all")
  const [showCoordinatorModal, setShowCoordinatorModal] = useState(false)
  const [coordinatorModalSearch, setCoordinatorModalSearch] = useState("")
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [printingCoordinator, setPrintingCoordinator] = useState<string | null>(null)
  const [isPrintingAll, setIsPrintingAll] = useState(false)

  // Ambil data pelaku usaha dengan status finish
  const memoQuery = useMemoFirebase(() => {
    if (!database || !user) return null
    return query(ref(database, "businessActors"), orderByChild("status"), equalTo("finish"))
  }, [database, user])

  const { data: allData, isLoading } = useList<BusinessActor>(memoQuery)

  // Daftar Koordinator unik yang memiliki data selesai dan ada rekening
  const coordinatorsList = useMemo(() => {
    if (!allData) return []
    const map = new Map<string, BusinessActor[]>()
    allData
      .filter((a) => a.status === "finish" && a.bankNumber && a.bankNumber.trim() !== "")
      .forEach((a) => {
        const coordName = (a.coordinator || "TANPA KOORDINATOR").toUpperCase().trim()
        if (!map.has(coordName)) {
          map.set(coordName, [])
        }
        map.get(coordName)!.push(a)
      })
    return Array.from(map.entries())
      .map(([name, actors]) => ({
        name,
        count: actors.length,
        actors,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allData])

  // Filter Koordinator pada modal dialog
  const filteredCoordinatorsModal = useMemo(() => {
    const q = coordinatorModalSearch.toLowerCase().trim()
    if (!q) return coordinatorsList
    return coordinatorsList.filter((c) => c.name.toLowerCase().includes(q))
  }, [coordinatorsList, coordinatorModalSearch])

  // Filter data pelaku usaha: status finish + bankNumber terisi + koordinator + pencarian
  const filteredActors = useMemo(() => {
    if (!allData) return []
    return allData
      .filter((a) => a.status === "finish" && a.bankNumber && a.bankNumber.trim() !== "")
      .filter((a) => {
        if (selectedCoordinator && selectedCoordinator !== "all") {
          const cName = (a.coordinator || "TANPA KOORDINATOR").toUpperCase().trim()
          if (cName !== selectedCoordinator) return false
        }
        const q = searchQuery.toLowerCase().trim()
        if (!q) return true
        return (
          (a.fullName || "").toLowerCase().includes(q) ||
          (a.nik || "").includes(q) ||
          (a.bankNumber || "").includes(q) ||
          (a.coordinator || "").toLowerCase().includes(q) ||
          (a.businessName || "").toLowerCase().includes(q) ||
          (a.kelurahan || "").toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
  }, [allData, searchQuery, selectedCoordinator])

  const handlePrintSingle = (actor: BusinessActor) => {
    try {
      setPrintingId(actor.id)
      generateSuratPernyataan(actor)
      logActivity({
        query: `CETAK BERKAS PENCAIRAN: ${actor.fullName} (${actor.nik})`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: "Web",
        method: "CETAK BERKAS PENCAIRAN",
        userId: user?.email || user?.uid || "Admin",
      })
      toast({
        title: "Berhasil Dicetak",
        description: `Berkas Pencairan (Surat Pernyataan & Kuitansi) untuk ${actor.fullName} sedang diunduh.`,
      })
    } catch (err) {
      console.error("Print error:", err)
      toast({
        variant: "destructive",
        title: "Gagal Mencetak",
        description: "Terjadi kesalahan saat membuat PDF.",
      })
    } finally {
      setTimeout(() => setPrintingId(null), 1500)
    }
  }

  // Cetak Berkas Gabungan (Seluruh berkas pencairan langsung digabung dalam 1 PDF siap cetak)
  const handlePrintCombined = (actorsToPrint: BusinessActor[], coordinatorName?: string) => {
    if (!actorsToPrint || actorsToPrint.length === 0) {
      toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ada berkas untuk dicetak." })
      return
    }
    try {
      setIsPrintingAll(true)
      const cleanName = coordinatorName ? coordinatorName.replace(/[^a-z0-9]/gi, "_").toUpperCase() : "SEMUA"
      const filename = `BERKAS_PENCAIRAN_${cleanName}_(${actorsToPrint.length}_DATA).pdf`

      generateSuratPernyataanBulk(actorsToPrint, filename)

      logActivity({
        query: `CETAK BERKAS PENCAIRAN ${coordinatorName ? `KOORDINATOR ${coordinatorName}` : "SEMUA"} (${actorsToPrint.length} data)`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: "Web",
        method: "CETAK BERKAS PENCAIRAN",
        userId: user?.email || user?.uid || "Admin",
      })

      toast({
        title: "Dokumen Berhasil Dibuat",
        description: `${actorsToPrint.length} Berkas Pencairan untuk ${coordinatorName ? `Koordinator ${coordinatorName}` : "Semua Koordinator"} telah diunduh dalam 1 file PDF siap cetak.`,
      })
    } catch (err) {
      console.error("Print combined error:", err)
      toast({
        variant: "destructive",
        title: "Gagal Mencetak",
        description: "Terjadi kesalahan saat memproses dokumen PDF.",
      })
    } finally {
      setIsPrintingAll(false)
    }
  }

  if (!user) return null

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-2xl md:text-4xl font-black tracking-tight font-headline text-gradient uppercase drop-shadow-sm flex items-center gap-3">
              <FileText className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              Cetak Berkas Pencairan
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 font-semibold ml-10">
            Cetak Berkas Pencairan (Surat Pernyataan & Kuitansi) untuk pelaku usaha yang telah selesai dan memiliki rekening bank.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Filter Koordinator Dropdown */}
          <div className="w-full sm:w-56">
            <Select value={selectedCoordinator} onValueChange={setSelectedCoordinator}>
              <SelectTrigger className="h-10 bg-white/80 backdrop-blur-sm border-primary/20 rounded-xl font-bold text-xs shadow-sm">
                <div className="flex items-center gap-1.5 truncate">
                  <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                  <SelectValue placeholder="Pilih Koordinator" />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all" className="font-bold text-xs">
                  Semua Koordinator ({allData?.filter((a) => a.status === "finish" && a.bankNumber)?.length ?? 0})
                </SelectItem>
                {coordinatorsList.map((c) => (
                  <SelectItem key={c.name} value={c.name} className="text-xs font-semibold">
                    {c.name} ({c.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <Input
              placeholder="Cari nama, NIK, rekening..."
              className="pl-9 h-10 bg-white/80 backdrop-blur-sm border-primary/20 focus-visible:ring-primary rounded-xl text-xs shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tombol Cetak per Koordinator (Buka Modal) */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowCoordinatorModal(true)}
            className="h-10 px-3.5 font-bold text-xs border-primary/25 bg-white/90 hover:bg-primary/10 text-primary rounded-xl shadow-sm gap-2 whitespace-nowrap"
            title="Buka daftar koordinator untuk mencetak berkas secara berkelompok"
          >
            <Layers className="w-4 h-4" />
            Cetak per Koordinator
          </Button>

          {/* Tombol Cetak Dokumen PDF */}
          <Button
            onClick={() => handlePrintCombined(filteredActors, selectedCoordinator === "all" ? undefined : selectedCoordinator)}
            disabled={isPrintingAll || filteredActors.length === 0}
            className="h-10 px-5 font-bold text-xs rounded-xl shadow-lg shadow-primary/20 whitespace-nowrap gap-2"
          >
            {isPrintingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            {selectedCoordinator === "all"
              ? `CETAK SEMUA (${filteredActors.length})`
              : `CETAK ${selectedCoordinator} (${filteredActors.length})`}
          </Button>
        </div>
      </div>

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Selesai",
            value: allData?.filter((a) => a.status === "finish").length ?? 0,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Ada Rekening",
            value: allData?.filter((a) => a.status === "finish" && a.bankNumber).length ?? 0,
            icon: CreditCard,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Belum Ada Rekening",
            value: allData?.filter((a) => a.status === "finish" && !a.bankNumber).length ?? 0,
            icon: AlertCircle,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Ditampilkan",
            value: filteredActors.length,
            icon: FileText,
            color: "text-violet-600",
            bg: "bg-violet-50",
          },
        ].map((stat) => (
          <Card key={stat.label} className="glass border-none shadow-lg rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── TABEL ───────────────────────────────────────────────────────────── */}
      <Card className="glass border-none shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base font-black uppercase text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Daftar Pelaku Usaha
              </CardTitle>
              <CardDescription className="text-[10px] font-semibold uppercase tracking-widest mt-0.5">
                Status: SELESAI · Rekening: LENGKAP {selectedCoordinator !== "all" ? `· Koordinator: ${selectedCoordinator}` : ""}
              </CardDescription>
            </div>

            {selectedCoordinator !== "all" && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-bold text-xs bg-primary/10 text-primary border border-primary/20 gap-1.5 py-1 px-3">
                  <Users className="w-3.5 h-3.5" />
                  Koordinator: {selectedCoordinator}
                  <button
                    onClick={() => setSelectedCoordinator("all")}
                    className="ml-1 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Hapus filter koordinator"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="font-bold animate-pulse uppercase tracking-widest text-xs">Memuat Data...</p>
            </div>
          ) : filteredActors.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
              <div className="bg-slate-100 p-6 rounded-full">
                <FileText className="w-10 h-10 text-slate-300" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-lg text-slate-700 uppercase">Tidak Ada Data</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Tidak ditemukan data yang cocok dengan pencarian."
                    : "Belum ada pelaku usaha dengan status selesai dan rekening lengkap."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-transparent border-b border-slate-100">
                    <TableHead className="w-12 text-center font-black text-[10px] uppercase tracking-widest py-3 pl-6">No</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-3">Nama Lengkap</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-3">NIK</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-3">Jenis Usaha</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-3">
                      <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Rekening</span>
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-3">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Kelurahan</span>
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-3">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> Telepon</span>
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-3 pr-6 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActors.map((actor, index) => (
                    <TableRow
                      key={actor.id}
                      className="group hover:bg-primary/5 transition-colors border-b border-slate-50"
                    >
                      <TableCell className="text-center py-3 pl-6 text-xs font-bold text-slate-400">
                        {index + 1}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="font-bold text-slate-800 uppercase text-sm leading-tight">
                          {actor.fullName}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium">
                          {actor.coordinator || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 font-mono text-xs text-slate-600 font-bold">
                        {actor.nik || "-"}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-black uppercase",
                            actor.businessCategory === "Kuliner"
                              ? "border-orange-200 text-orange-600 bg-orange-50"
                              : "border-blue-200 text-blue-600 bg-blue-50"
                          )}
                        >
                          {actor.businessName || actor.businessCategory || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="font-mono font-bold text-primary text-sm">
                          {actor.bankNumber}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">
                          {actor.bankName || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-slate-600 uppercase font-medium">
                        {actor.kelurahan || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-slate-600 font-mono">
                        {actor.phone || "-"}
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-center">
                        <Button
                          size="sm"
                          onClick={() => handlePrintSingle(actor)}
                          disabled={printingId === actor.id}
                          className="h-8 px-3 text-[10px] font-black uppercase rounded-lg gap-1.5 shadow-sm shadow-primary/20"
                        >
                          {printingId === actor.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Printer className="w-3 h-3" />
                          )}
                          CETAK
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── DIALOG CETAK PER KOORDINATOR ──────────────────────────── */}
      <Dialog open={showCoordinatorModal} onOpenChange={setShowCoordinatorModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary text-white rounded-xl shadow-md">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 uppercase">
                  Cetak Berkas per Koordinator
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600 mt-1">
                  Pilih koordinator di bawah untuk langsung mengunduh seluruh berkas pencairan (Kuitansi & Surat Pernyataan) dalam 1 dokumen PDF siap cetak.
                </DialogDescription>
              </div>
            </div>

            {/* Search Koordinator */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Cari nama koordinator..."
                value={coordinatorModalSearch}
                onChange={(e) => setCoordinatorModalSearch(e.target.value)}
                className="pl-9 h-10 bg-white border-primary/20 text-xs rounded-xl"
              />
            </div>
          </DialogHeader>

          <div className="p-6 overflow-y-auto flex-1 space-y-3">
            {filteredCoordinatorsModal.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold text-sm">
                Tidak ada koordinator yang cocok dengan pencarian.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCoordinatorsModal.map((c) => {
                  const isThisPrinting = printingCoordinator === c.name
                  return (
                    <div
                      key={c.name}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-black text-sm uppercase text-slate-900 leading-tight">
                            {c.name}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md mt-1.5">
                            <FileText className="w-3 h-3" />
                            {c.count} Berkas Siap Cetak
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedCoordinator(c.name)
                            setShowCoordinatorModal(false)
                          }}
                          variant="ghost"
                          className="flex-1 h-8 text-[11px] font-bold text-slate-600 hover:text-primary hover:bg-primary/5 rounded-lg"
                        >
                          Lihat di Tabel
                        </Button>
                        <Button
                          size="sm"
                          disabled={isThisPrinting || isPrintingAll}
                          onClick={() => {
                            setPrintingCoordinator(c.name)
                            handlePrintCombined(c.actors, c.name)
                            setTimeout(() => setPrintingCoordinator(null), 1500)
                          }}
                          className="h-8 px-3 text-[11px] font-black rounded-lg gap-1.5 shadow-sm"
                        >
                          {isThisPrinting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Printer className="w-3.5 h-3.5" />
                          )}
                          Cetak PDF ({c.count})
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t flex justify-between items-center sm:justify-between">
            <span className="text-xs font-bold text-slate-500">
              Total: {coordinatorsList.length} Koordinator ({allData?.filter((a) => a.status === "finish" && a.bankNumber)?.length ?? 0} Berkas)
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowCoordinatorModal(false)} className="font-bold text-xs rounded-xl">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
