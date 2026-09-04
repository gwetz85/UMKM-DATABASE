"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject } from "@/firebase"
import { ref, query, equalTo, orderByChild } from "firebase/database"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { 
  Ban, 
  Clock, 
  AlertTriangle, 
  Search, 
  Loader2, 
  ShieldAlert, 
  User, 
  CreditCard, 
  Building2, 
  MapPin, 
  CheckCircle2, 
  Save, 
  FileSpreadsheet,
  Printer,
  Calendar,
  Wrench,
  Info
} from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import { cn, parsePobDob } from "@/lib/utils"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { logActivity, getDeviceType } from "@/lib/logger"
import ExcelJS from "exceljs"

export default function BlacklistPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-destructive" />
      </div>
    }>
      <BlacklistContent />
    </Suspense>
  )
}

function BlacklistContent() {
  const { user, userProfile } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const filterCoordinatorParam = searchParams.get("coordinator")

  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCoordinator, setFilterCoordinator] = useState<string>(filterCoordinatorParam || "")
  const [pageLimit, setPageLimit] = useState(50)
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  
  // State untuk modal perbaikan khusus Admin
  const [repairingActor, setRepairingActor] = useState<BusinessActor | null>(null)
  const [lpjNominalInput, setLpjNominalInput] = useState("")
  const [repairNotes, setRepairNotes] = useState("")
  const [isSavingRepair, setIsSavingRepair] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 250)
    return () => clearTimeout(t)
  }, [searchInput])

  // ── Firebase Roles ────────────────────────────────────────────────────────
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole } = useObject(adminRef)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === "agus@umkm.id") || userProfile?.role === "admin"
  const isKoordinator = userProfile?.role === "koordinator"

  // Query database businessActors
  // Blacklist bisa berupa status === 'blacklist' atau status === 'finish' yang waktu LPJ-nya habis
  const finishQuery = useMemoFirebase(() => {
    if (!database) return null
    return query(ref(database, "businessActors"), orderByChild("status"), equalTo("finish"))
  }, [database])

  const blacklistQuery = useMemoFirebase(() => {
    if (!database) return null
    return query(ref(database, "businessActors"), orderByChild("status"), equalTo("blacklist"))
  }, [database])

  const { data: finishActors, isLoading: isFinishLoading } = useList<BusinessActor>(finishQuery)
  const { data: directBlacklistActors, isLoading: isBlacklistLoading } = useList<BusinessActor>(blacklistQuery)

  const isLoading = isFinishLoading || isBlacklistLoading

  // Gabungkan dan filter data yang memenuhi kriteria Blacklist
  // Kriteria:
  // 1. Status === 'blacklist' ATAU
  // 2. Dalam antrean LPJ (readyForLPJ / lpjEntryDate), belum input nominal LPJ (!lpjNominal),
  //    dan countdown LPJ nol (0) alias durasi >= 14 hari sejak lpjEntryDate.
  const blacklistData = useMemo(() => {
    const combined: Array<BusinessActor & { daysInLPJ: number; deadlineDate: Date; daysOverdue: number }> = []
    const seenIds = new Set<string>()

    const now = Date.now()

    // 1. Direct blacklist actors
    if (directBlacklistActors) {
      directBlacklistActors.forEach(actor => {
        if (seenIds.has(actor.id)) return
        seenIds.add(actor.id)
        const entryDate = actor.lpjEntryDate ? new Date(actor.lpjEntryDate) : new Date(actor.createdAt || now)
        const deadlineDate = new Date(entryDate.getTime() + (14 * 24 * 60 * 60 * 1000))
        const daysInLPJ = Math.floor((now - entryDate.getTime()) / (1000 * 60 * 60 * 24))
        const daysOverdue = Math.max(0, daysInLPJ - 14)

        combined.push({
          ...actor,
          daysInLPJ,
          deadlineDate,
          daysOverdue
        })
      })
    }

    // 2. Finish actors with LPJ overdue (countdown nol = 0 / 14 days passed and no lpjNominal)
    if (finishActors) {
      finishActors.forEach(actor => {
        if (seenIds.has(actor.id)) return

        const hasNominal = !!actor.lpjNominal && Number(actor.lpjNominal) > 0
        if (hasNominal) return // Sudah selesai, bukan blacklist

        // Cek apakah data ini dalam antrean LPJ atau memiliki tanggal entry LPJ
        if (actor.readyForLPJ || actor.lpjEntryDate) {
          const entryDate = actor.lpjEntryDate ? new Date(actor.lpjEntryDate) : new Date(actor.createdAt || now)
          const deadlineDate = new Date(entryDate.getTime() + (14 * 24 * 60 * 60 * 1000))
          const daysInLPJ = Math.floor((now - entryDate.getTime()) / (1000 * 60 * 60 * 24))
          const daysOverdue = daysInLPJ - 14

          // Countdown habis jika daysInLPJ >= 14 (countdown 14 - daysInLPJ <= 0)
          if (daysInLPJ >= 14) {
            seenIds.add(actor.id)
            combined.push({
              ...actor,
              daysInLPJ,
              deadlineDate,
              daysOverdue: Math.max(1, daysOverdue)
            })
          }
        }
      })
    }

    return combined
  }, [directBlacklistActors, finishActors])

  // Filter pencarian dan koordinator
  const filteredActors = useMemo(() => {
    return blacklistData
      .filter(actor => {
        const matchesSearch =
          actor.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          actor.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          actor.nik?.includes(searchQuery) ||
          actor.bankNumber?.includes(searchQuery) ||
          actor.coordinator?.toLowerCase().includes(searchQuery.toLowerCase())

        if (isKoordinator) {
          if (!actor.coordinator || !userProfile?.fullName) return false
          return matchesSearch && actor.coordinator.toLowerCase() === userProfile.fullName.toLowerCase()
        }

        if (filterCoordinator) {
          return matchesSearch && actor.coordinator === filterCoordinator
        }

        return matchesSearch
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
  }, [blacklistData, searchQuery, filterCoordinator, isKoordinator, userProfile])

  // List koordinator untuk dropdown filter
  const coordinatorList = useMemo(() => {
    const set = new Set<string>()
    blacklistData.forEach(a => {
      if (a.coordinator) set.add(a.coordinator)
    })
    return Array.from(set).sort()
  }, [blacklistData])

  // ── Aksi Perbaikan Data (Khusus Role Admin) ───────────────────────────────
  const handleOpenRepairDialog = (actor: BusinessActor) => {
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Akses Ditolak",
        description: "Hanya pengguna dengan Role Admin yang dapat memperbaiki data blacklist."
      })
      return
    }
    setRepairingActor(actor)
    setLpjNominalInput(actor.lpjNominal ? String(actor.lpjNominal) : "")
    setRepairNotes("")
  }

  const handleSaveRepair = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin || !database || !repairingActor) return

    const numNominal = parseFloat(lpjNominalInput.replace(/[^0-9]/g, ""))
    if (isNaN(numNominal) || numNominal <= 0) {
      toast({
        variant: "destructive",
        title: "Nominal LPJ Tidak Valid",
        description: "Harap masukkan nominal LPJ yang valid (lebih dari 0) agar data dapat diselesaikan."
      })
      return
    }

    setIsSavingRepair(true)
    try {
      const now = new Date().toISOString()
      const updates: any = {
        status: "finish",
        lpjNominal: numNominal,
        lpjDoneAt: now,
        readyForLPJ: true,
        lpjRepairedBy: userProfile?.fullName || user?.email || "Administrator",
        lpjRepairedAt: now,
        catatanPerbaikanBlacklist: repairNotes || "Diperbaiki oleh Admin dari Menu Blacklist"
      }

      const actorRef = ref(database, `businessActors/${repairingActor.id}`)
      await updateDocumentNonBlocking(actorRef, updates)

      // Update global stats
      import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
        const oldActor = repairingActor
        const updatedActor = { ...repairingActor, ...updates }
        updateStatsOnStatusChange(database, oldActor, updatedActor, updatedActor).catch(e => console.error(e))
      })

      logActivity({
        query: `PERBAIKI DATA BLACKLIST -> SELESAI: ${repairingActor.fullName} (LPJ Rp ${numNominal.toLocaleString("id-ID")})`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: "Web",
        method: "MENU BLACKLIST",
        userId: user?.email || user?.uid || "Admin"
      })

      toast({
        title: "✅ Data Berhasil Diperbaiki!",
        description: `Data ${repairingActor.fullName} telah diperbarui dengan nominal LPJ dan otomatis masuk ke Menu Selesai.`
      })

      setRepairingActor(null)
      if (viewingActor?.id === repairingActor.id) {
        setViewingActor(null)
      }
    } catch (err: any) {
      console.error("Error repairing blacklist actor:", err)
      toast({
        variant: "destructive",
        title: "Gagal Memperbaiki",
        description: err?.message || "Terjadi kesalahan saat memperbarui data."
      })
    } finally {
      setIsSavingRepair(false)
    }
  }

  // ── Excel Export ──────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    try {
      if (!filteredActors || filteredActors.length === 0) {
        toast({ variant: "destructive", title: "Data Kosong", description: "Tidak ada data blacklist untuk di-export." })
        return
      }

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Data Blacklist UMKM")

      const headers = [
        { header: "NO", key: "no", width: 6 },
        { header: "NAMA LENGKAP", key: "fullName", width: 25 },
        { header: "NIK", key: "nik", width: 20 },
        { header: "NOMOR HP / WA", key: "phone", width: 16 },
        { header: "NAMA USAHA", key: "businessName", width: 25 },
        { header: "NAMA BANK", key: "bankName", width: 15 },
        { header: "NOMOR REKENING", key: "bankNumber", width: 20 },
        { header: "PEMILIK REKENING", key: "bankOwner", width: 22 },
        { header: "PENGUSUL / KOORDINATOR", key: "coordinator", width: 25 },
        { header: "TANGGAL MASUK LPJ", key: "entryDate", width: 20 },
        { header: "BATAS WAKTU (14 HARI)", key: "deadline", width: 20 },
        { header: "KETERLAMBATAN (HARI)", key: "overdue", width: 20 },
        { header: "STATUS", key: "status", width: 25 },
      ]

      worksheet.columns = headers

      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } }
      headerRow.height = 25
      headerRow.alignment = { vertical: "middle", horizontal: "center" }

      filteredActors.forEach((actor, index) => {
        worksheet.addRow({
          no: index + 1,
          fullName: actor.fullName || "-",
          nik: actor.nik || "-",
          phone: actor.phone || "-",
          businessName: actor.businessName || "-",
          bankName: actor.bankName || "-",
          bankNumber: actor.bankNumber || "-",
          bankOwner: actor.bankOwner || "-",
          coordinator: actor.coordinator || "-",
          entryDate: actor.lpjEntryDate ? new Date(actor.lpjEntryDate).toLocaleDateString("id-ID") : "-",
          deadline: actor.deadlineDate.toLocaleDateString("id-ID"),
          overdue: `${actor.daysOverdue} Hari`,
          status: "BLACKLIST (LPJ KADALUARSA)",
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const nowStr = new Date().toISOString().split("T")[0]
      a.href = url
      a.download = `Data_Blacklist_LPJ_${nowStr}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)

      toast({ title: "✅ Export Berhasil", description: `${filteredActors.length} data blacklist berhasil di-export ke Excel.` })
    } catch (err: any) {
      console.error("Export error:", err)
      toast({ variant: "destructive", title: "Gagal Export", description: err?.message || "Terjadi kesalahan saat export." })
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-card/80 backdrop-blur sticky top-0 z-10 shrink-0 border-red-200">
        <SidebarTrigger />
        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-600 shrink-0" />
            <h1 className="font-black text-base md:text-lg uppercase text-red-700">Menu Blacklist</h1>
            <Badge className="bg-red-600 text-white font-black text-xs">{filteredActors.length}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:ml-4">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama / NIK / usaha / rek…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            {!isKoordinator && coordinatorList.length > 0 && (
              <select
                value={filterCoordinator}
                onChange={e => setFilterCoordinator(e.target.value)}
                className="h-8 text-xs px-2 rounded-md border border-input bg-background max-w-[180px] truncate font-medium"
              >
                <option value="">Semua Koordinator</option>
                {coordinatorList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            className="border-red-500 text-red-700 font-bold hover:bg-red-50 text-xs shrink-0"
            disabled={filteredActors.length === 0}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Export Excel
          </Button>
        )}
      </header>

      {/* Banner Informasi Aturan Blacklist */}
      <div className="p-4 pb-0">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-red-900 uppercase tracking-tight">
                Daftar Pelaku Usaha Melewati Batas Waktu LPJ (Countdown 0 = 14 Hari)
              </p>
              <p className="text-[11px] text-red-700 leading-relaxed mt-0.5">
                Pelaku usaha berikut belum menyerahkan nominal LPJ setelah batas waktu 14 hari habis. 
                {isAdmin ? (
                  <span className="font-bold ml-1">Sebagai Administrator, Anda dapat mengklik tombol "Perbaiki Data" untuk menginput nominal LPJ, dan data akan otomatis berpindah ke Menu Selesai.</span>
                ) : (
                  <span className="font-medium ml-1">Perbaikan data hanya dapat dilakukan oleh pengguna dengan Role Admin.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Data Blacklist */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredActors.slice(0, pageLimit).map(actor => (
                <Card
                  key={actor.id}
                  className="hover:shadow-lg border-red-200 hover:border-red-400 transition-all bg-card flex flex-col justify-between overflow-hidden"
                >
                  <CardContent className="p-3.5 flex flex-col gap-2 h-full">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <Badge variant="destructive" className="font-black text-[9px] uppercase tracking-wider bg-red-600 hover:bg-red-700">
                          <Ban className="w-2.5 h-2.5 mr-1" /> BLACKLIST
                        </Badge>
                        <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                          Terlambat {actor.daysOverdue} Hari
                        </span>
                      </div>

                      <p className="text-xs font-black uppercase text-slate-900 line-clamp-1" title={actor.fullName}>
                        {actor.fullName}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        NIK: {actor.nik || "-"}
                      </p>

                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Nama Usaha:</span>
                          <span className="font-bold text-slate-800 uppercase line-clamp-1 max-w-[150px]" title={actor.businessName}>
                            {actor.businessName || "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Rekening:</span>
                          <span className="font-mono font-bold text-slate-700">
                            {actor.bankName} - {actor.bankNumber}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Pengusul:</span>
                          <span className="font-bold text-slate-700 uppercase line-clamp-1 max-w-[140px]" title={actor.coordinator}>
                            {actor.coordinator || "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-red-600 font-bold pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Jatuh Tempo:
                          </span>
                          <span>{actor.deadlineDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t flex items-center gap-2 mt-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingActor(actor)}
                        className="text-xs font-bold h-8 flex-1 border-slate-300 hover:bg-slate-50"
                      >
                        Detail
                      </Button>
                      {isAdmin ? (
                        <Button
                          size="sm"
                          onClick={() => handleOpenRepairDialog(actor)}
                          className="text-xs font-black h-8 flex-1 bg-red-600 hover:bg-red-700 text-white shadow-sm"
                        >
                          <Wrench className="w-3 h-3 mr-1" /> Perbaiki
                        </Button>
                      ) : (
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter text-center flex-1">
                          Khusus Admin
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredActors.length === 0 && (
                <div className="col-span-full py-20 text-center text-muted-foreground grid place-items-center">
                  <CheckCircle2 className="w-12 h-12 mb-4 text-emerald-500 opacity-60" />
                  <p className="font-bold text-sm text-slate-700">Tidak ada pelaku usaha yang ter-blacklist.</p>
                  <p className="text-xs text-muted-foreground mt-1">Semua data LPJ masih dalam masa tenggang atau telah diselesaikan.</p>
                </div>
              )}
            </div>

            {filteredActors.length > pageLimit && (
              <div className="p-4 flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => setPageLimit(prev => prev + 50)} 
                  className="font-bold border-red-500 text-red-700 hover:bg-red-50"
                >
                  Tampilkan Lebih Banyak Data (+50)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Detail Pelaku Usaha Ter-Blacklist */}
      <Dialog open={!!viewingActor} onOpenChange={(open) => { if (!open) setViewingActor(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewingActor && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-2">
                <div className="flex items-center gap-2">
                  <Ban className="w-6 h-6 text-red-600 shrink-0" />
                  <div>
                    <DialogTitle className="text-lg font-black text-red-700 uppercase">
                      Detail Pelaku Usaha Ter-Blacklist
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                      Status: Melewati batas 14 hari penyerahan nominal LPJ
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const a = viewingActor
                      setViewingActor(null)
                      handleOpenRepairDialog(a)
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-black text-xs"
                  >
                    <Wrench className="w-3.5 h-3.5 mr-1.5" /> Perbaiki &amp; Selesaikan
                  </Button>
                )}
              </div>

              {/* Status Peringatan */}
              <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black text-red-900 uppercase">Informasi Keterlambatan LPJ</p>
                  <p className="text-xs text-red-700">
                    Tanggal Masuk Antrean LPJ: <span className="font-bold">{viewingActor.lpjEntryDate ? new Date(viewingActor.lpjEntryDate).toLocaleDateString("id-ID") : "-"}</span>
                  </p>
                  <p className="text-xs text-red-700">
                    Batas Waktu Penyerahan (14 Hari): <span className="font-bold">
                      {viewingActor.lpjEntryDate ? new Date(new Date(viewingActor.lpjEntryDate).getTime() + (14 * 24 * 60 * 60 * 1000)).toLocaleDateString("id-ID") : "-"}
                    </span> (Countdown: 0 Hari)
                  </p>
                  <p className="text-[11px] text-red-600 font-semibold mt-1">
                    {isAdmin 
                      ? "Silakan klik tombol 'Perbaiki & Selesaikan' untuk menginput nominal LPJ dan memindahkan data ke Menu Selesai." 
                      : "Data dikunci. Hanya Administrator yang dapat membuka blokir dan menyelesaikan data ini."}
                  </p>
                </div>
              </div>

              {/* Biodata & Rekening */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4 rounded-xl border space-y-2">
                  <p className="text-[10px] font-black uppercase text-primary border-b pb-1">Biodata Pelaku Usaha</p>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Nama Lengkap</p>
                    <p className="text-xs font-black uppercase">{viewingActor.fullName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">NIK</p>
                    <p className="text-xs font-mono font-bold">{viewingActor.nik || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Nomor HP / WhatsApp</p>
                    <p className="text-xs font-bold text-emerald-700">{viewingActor.phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Alamat</p>
                    <p className="text-xs font-medium">{viewingActor.address || "-"}</p>
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-xl border space-y-2">
                  <p className="text-[10px] font-black uppercase text-primary border-b pb-1">Data Usaha &amp; Perbankan</p>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Nama Usaha</p>
                    <p className="text-xs font-black uppercase">{viewingActor.businessName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Pengusul / Koordinator</p>
                    <p className="text-xs font-black uppercase text-slate-800">{viewingActor.coordinator || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Bank &amp; Nomor Rekening</p>
                    <p className="text-xs font-mono font-black text-primary">{viewingActor.bankName} - {viewingActor.bankNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Nama Pemilik Rekening</p>
                    <p className="text-xs font-black uppercase">{viewingActor.bankOwner || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Khusus Role Admin: Perbaiki Data & Masuk ke Menu Selesai */}
      <Dialog open={!!repairingActor} onOpenChange={(open) => { if (!open) setRepairingActor(null) }}>
        <DialogContent className="max-w-md">
          {repairingActor && (
            <form onSubmit={handleSaveRepair} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Wrench className="w-5 h-5 text-red-600" />
                <DialogTitle className="text-base font-black text-slate-900 uppercase">
                  Perbaiki Data &amp; Selesaikan LPJ
                </DialogTitle>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Info className="w-4 h-4 text-amber-700" /> Wewenang Administrator
                </p>
                <p className="text-[11px] leading-relaxed">
                  Setelah Anda menginput nominal LPJ dan menyimpan perbaikan, status pelaku usaha akan otomatis dipulihkan ke 
                  <span className="font-bold text-emerald-800"> Selesai</span> dan data langsung masuk ke <span className="font-bold text-emerald-800">Menu Selesai</span>.
                </p>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-lg border text-xs space-y-1">
                  <p className="font-bold uppercase text-slate-800">{repairingActor.fullName}</p>
                  <p className="font-mono text-muted-foreground">NIK: {repairingActor.nik} &bull; Bank: {repairingActor.bankName} ({repairingActor.bankNumber})</p>
                  <p className="text-slate-600">Koordinator: <span className="font-bold">{repairingActor.coordinator || "-"}</span></p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase text-emerald-800">
                    Nominal LPJ yang Diterima (Rp) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">Rp</span>
                    <Input
                      required
                      type="text"
                      placeholder="Contoh: 5.000.000"
                      value={lpjNominalInput ? Number(lpjNominalInput.replace(/\D/g, "")).toLocaleString("id-ID") : ""}
                      onChange={(e) => setLpjNominalInput(e.target.value.replace(/\D/g, ""))}
                      className="pl-9 font-mono font-black text-base border-emerald-300 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Masukkan nominal realisasi dana bantuan sesuai bukti dokumen LPJ.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-700">
                    Catatan Perbaikan / Keterangan (Opsional)
                  </Label>
                  <Input
                    placeholder="Contoh: LPJ fisik telah diserahkan langsung ke dinas"
                    value={repairNotes}
                    onChange={(e) => setRepairNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2 border-t flex sm:justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRepairingActor(null)}
                  disabled={isSavingRepair}
                  className="font-bold text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingRepair}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md"
                >
                  {isSavingRepair ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Simpan &amp; Masukkan Selesai</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
