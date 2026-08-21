"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, useObject, sanitizeForFirebase, updateDocumentNonBlocking } from "@/firebase"
import { ref, query, orderByChild, equalTo } from "firebase/database"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  ShieldAlert,
  Loader2,
  Eye,
  Search,
  User,
  FileText,
  Building2,
  MapPin,
  History,
  BadgeCheck,
  CreditCard,
  MessageCircle,
  RotateCcw,
  ArrowLeft,
  FileSpreadsheet,
  RefreshCw,
  Clock,
  CalendarDays
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { cn, parsePobDob, calculateAge, extractDobFromNik, formatDateTimeIndo } from "@/lib/utils"
import { logActivity, getDeviceType } from "@/lib/logger"
import { useSearchParams, useRouter } from "next/navigation"
import * as XLSX from "xlsx"

const BANK_LIST = [
  "BCA", "BNI", "BRI", "BRK", "MANDIRI", "PANIN", "OCBC", "DANAMON", "BUKOPIN", "BTN"
]

const normalizeGender = (g: string) => {
  const val = (g || "").toLowerCase().trim()
  if (val === "l" || val === "laki-laki") return "Laki-laki"
  if (val === "p" || val === "perempuan") return "Perempuan"
  return ""
}

function HasilVerifikasiContent() {
  const { user, userProfile, isProfileLoading } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterCoordinator = searchParams.get('coordinator')

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || "")
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || "")
  const [pageLimit, setPageLimit] = useState(50)

  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [inputtingBankActor, setInputtingBankActor] = useState<BusinessActor | null>(null)
  const [isSubmittingBank, setIsSubmittingBank] = useState(false)

  // Kembalikan ke Petugas Survey states
  const [returnTargetActor, setReturnTargetActor] = useState<BusinessActor | null>(null)
  const [returnReason, setReturnReason] = useState<string>("")
  const [isSubmittingReturn, setIsSubmittingReturn] = useState<boolean>(false)

  // Export Excel states
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [selectedExportSheets, setSelectedExportSheets] = useState<string[]>([])

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPageLimit(50)
  }, [searchQuery, filterCoordinator])

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin' || userProfile?.role === 'superadmin'
  const isPetugas = userProfile?.role === 'petugas_survey' || userProfile?.role === 'petugas'
  const isKoordinator = userProfile?.role === 'koordinator'
  const isDinas = userProfile?.role === 'dinas' || userProfile?.role === 'verifikator_dinas'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('verified_dinas'))
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)

  const kuotaRef = useMemoFirebase(() => database ? ref(database, 'koordinator_kuotas') : null, [database])
  const { data: kuotaData, isLoading: isKuotaLoading } = useList<any>(kuotaRef)

  const actors = useMemo(() => {
    if (!allActorsRaw) return undefined
    return allActorsRaw.filter(a => {
      if (!a) return false
      if (a.status !== 'verified_dinas' || a.hasilVerifikasiDinas !== 'Lolos' || !(a as any).berkasDinasVerified) return false
      
      if (isPetugas) {
        if (!userProfile?.fullName) return false
        const userPetugasUpper = String(userProfile.fullName).toUpperCase().trim()
        const actorPetugasUpper = String(a.petugasSurvey || a.createdBy || "").toUpperCase().trim()
        return actorPetugasUpper === userPetugasUpper
      }
      if (isKoordinator) {
        if (!a.coordinator || !userProfile?.fullName) return false
        return a.coordinator.toLowerCase() === userProfile.fullName.toLowerCase()
      }
      return true
    })
  }, [allActorsRaw, isPetugas, isKoordinator, userProfile?.fullName])

  const filteredActors = useMemo(() => {
    if (!actors) return undefined
    const lower = searchQuery.toLowerCase().trim()
    if (!lower) return actors
    return actors.filter(a =>
      (a.fullName || "").toLowerCase().includes(lower) ||
      (a.nik || "").includes(lower) ||
      (a.businessName || "").toLowerCase().includes(lower) ||
      (a.coordinator || "").toLowerCase().includes(lower) ||
      (a.kelurahan || "").toLowerCase().includes(lower)
    ).sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
  }, [actors, searchQuery])

  const { groupedActors, globalIndexMap } = useMemo(() => {
    if (!filteredActors) return { groupedActors: {} as Record<string, BusinessActor[]>, globalIndexMap: new Map<string, number>() }
    const sorted = [...filteredActors].sort((a, b) => {
      const coordA = String(a.coordinator || "Tanpa Koordinator")
      const coordB = String(b.coordinator || "Tanpa Koordinator")
      const coordCompare = coordA.localeCompare(coordB)
      if (coordCompare !== 0) return coordCompare
      return String(a.fullName || "").localeCompare(String(b.fullName || ""))
    })

    const groups: Record<string, BusinessActor[]> = {}
    const indexMap = new Map<string, number>()

    sorted.forEach((actor, index) => {
      indexMap.set(actor.id, index + 1)
      const key = String(actor.coordinator || "Tanpa Koordinator").toUpperCase().trim()
      if (!groups[key]) groups[key] = []
      groups[key].push(actor)
    })
    return { groupedActors: groups, globalIndexMap: indexMap }
  }, [filteredActors])

  const coordinatorStats = useMemo(() => {
    const allNames = new Set<string>()
    if (kuotaData) {
      kuotaData.forEach((q: any) => {
        if (q.name) allNames.add(q.name.toUpperCase().trim())
      })
    }
    Object.keys(groupedActors).forEach(name => allNames.add(name))

    return Array.from(allNames).map(name => {
      const count = (groupedActors[name] || []).length
      return {
        name,
        count
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [groupedActors, kuotaData])

  const currentDataToDisplay = useMemo(() => {
    if (isKoordinator) return filteredActors || []
    if (filterCoordinator) {
      const targetCoord = String(filterCoordinator).toUpperCase().trim()
      return (groupedActors[targetCoord] || [])
    }
    if (searchQuery.trim().length > 0) {
      return filteredActors || []
    }
    return []
  }, [isKoordinator, filterCoordinator, searchQuery, groupedActors, filteredActors])

  const handleInputBank = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!inputtingBankActor || !database) return

    setIsSubmittingBank(true)
    try {
      const formData = new FormData(e.currentTarget)
      const updates = {
        status: 'finish',
        readyForLPJ: false,
        bankName: formData.get('bankName') as string,
        bankNumber: formData.get('bankNumber') as string,
        bankOwner: formData.get('bankOwner') as string,
      }

      const actorRef = ref(database, `businessActors/${inputtingBankActor.id}`)
      updateDocumentNonBlocking(actorRef, updates)

      import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
        updateStatsOnStatusChange(database, 'verified_dinas', 'finish', { id: inputtingBankActor.id }).catch(e => console.error(e))
      })

      logActivity({
        query: `INPUT REKENING (HASIL VERIFIKASI): ${inputtingBankActor.fullName}`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'HASIL VERIFIKASI',
        userId: user?.email || user?.uid || 'Admin'
      })

      toast({ title: "Data Diselesaikan", description: "Data telah dipindahkan ke menu Rekening Bank." })
      setInputtingBankActor(null)
    } catch (err: any) {
      console.error("Error saving bank data:", err)
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err?.message || "Terjadi kesalahan saat menyimpan data rekening." })
    } finally {
      setIsSubmittingBank(false)
    }
  }

  const handleKembalikanKePetugas = async () => {
    if (!returnTargetActor || !database || (!isAdmin && !isDinas && !isPetugas)) return
    if (!returnReason.trim()) {
      toast({ variant: "destructive", title: "Alasan Wajib Diisi", description: "Harap masukkan catatan / alasan pengembalian data ke petugas survey." })
      return
    }

    setIsSubmittingReturn(true)
    try {
      const actorRef = ref(database, `businessActors/${returnTargetActor.id}`)
      const officerName = returnTargetActor.petugasSurvey || returnTargetActor.createdBy || returnTargetActor.surveyData?.pejabatData?.petugas?.nama || ''

      const updates: any = {
        status: 'lpj_pending',
        hasilVerifikasiDinas: 'Dikembalikan',
        keteranganDinas: returnReason.trim(),
        catatanPengembalian: returnReason.trim(),
        dikembalikanKePetugasAt: new Date().toISOString(),
        dikembalikanKePetugasBy: userProfile?.fullName || user?.email || user?.uid || 'Verifikator Dinas',
        dikembalikanKePetugasReason: returnReason.trim(),
        berkasDinasVerified: false,
        berkasDinasVerifiedAt: null,
        berkasDinasVerifiedBy: null,
        verifiedDinasAt: null,
        verifiedDinasBy: null,
      }

      if (officerName && (!returnTargetActor.petugasSurvey || returnTargetActor.petugasSurvey.trim() === '-' || returnTargetActor.petugasSurvey.trim() === '')) {
        updates.petugasSurvey = officerName.toUpperCase().trim()
      }

      const cleanData = sanitizeForFirebase(updates)
      const { update } = await import('firebase/database')
      await update(actorRef, cleanData)

      logActivity({
        query: `KEMBALIKAN KE PETUGAS SURVEY (HASIL VERIFIKASI): ${returnTargetActor.fullName}`,
        results: `Petugas: ${officerName || 'Semua'} | Alasan: ${returnReason.trim()}`,
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'KEMBALIKAN KE PETUGAS',
        userId: userProfile?.fullName || user?.email || user?.uid || 'Verifikator Dinas'
      })

      toast({
        title: "✅ Berhasil Dikembalikan",
        description: `Data ${returnTargetActor.fullName} berhasil dikembalikan ke antrean Petugas Survey (${officerName || 'Petugas Terkait'}).`
      })

      setReturnTargetActor(null)
      setReturnReason("")
      if (viewingActor?.id === returnTargetActor.id) {
        setViewingActor(null)
      }
    } catch (err: any) {
      console.error("Error returning actor to survey officer:", err)
      toast({
        variant: "destructive",
        title: "Gagal Mengembalikan Data",
        description: err?.message || "Terjadi kesalahan sistem saat mengembalikan data."
      })
    } finally {
      setIsSubmittingReturn(false)
    }
  }

  const handleExportExcel = async (sheetsToExport?: string[]) => {
    try {
      const dataToExport = filterCoordinator
        ? (groupedActors[String(filterCoordinator).toUpperCase().trim()] || [])
        : (filteredActors || [])

      if (dataToExport.length === 0) {
        toast({ variant: "destructive", title: "Gagal", description: "Tidak ada data untuk diekspor." })
        return
      }

      const sortedData = [...dataToExport].sort((a, b) => {
        const coordA = String(a.coordinator || "Tanpa Koordinator")
        const coordB = String(b.coordinator || "Tanpa Koordinator")
        const coordCompare = coordA.localeCompare(coordB)
        if (coordCompare !== 0) return coordCompare
        return String(a.fullName || "").localeCompare(String(b.fullName || ""))
      })

      const toRow = (actor: BusinessActor, index: number) => ({
        "NO": index + 1,
        "NAMA LENGKAP": (actor.fullName || "").toUpperCase(),
        "JENIS KELAMIN": actor.gender || "-",
        "NIK": actor.nik || "-",
        "NOMOR KK": actor.noKK || "-",
        "TEMPAT LAHIR": actor.pob || parsePobDob(actor.pobDob || "").pob || "-",
        "TANGGAL LAHIR": actor.dob || parsePobDob(actor.pobDob || "").dob || "-",
        "UMUR": calculateAge(actor.dob || (actor.pobDob ? parsePobDob(actor.pobDob).dob : "") || extractDobFromNik(actor.nik || "")),
        "NOMOR HP": actor.phone || "-",
        "ALAMAT": (actor.address || "").toUpperCase(),
        "RT/RW": actor.rtRw || "-",
        "KELURAHAN": (actor.kelurahan || "").toUpperCase(),
        "JENIS USAHA": (actor.businessCategory || "").toUpperCase(),
        "USAHA": (actor.businessName || "").toUpperCase(),
        "LOKASI USAHA": (actor.businessLocation || "").toUpperCase(),
        "KOORDINATOR": (actor.coordinator || "").toUpperCase(),
        "KEPUTUSAN": "LOLOS",
        "WAKTU LOLOS VERIFIKASI": actor.berkasDinasVerifiedAt
          ? formatDateTimeIndo(actor.berkasDinasVerifiedAt)
          : (actor.verifiedDinasAt ? formatDateTimeIndo(actor.verifiedDinasAt) : "-"),
        "PETUGAS VERIFIKATOR": actor.berkasDinasVerifiedBy || actor.verifikatorDinas || "-",
      })

      const setColWidths = (ws: any, rows: ReturnType<typeof toRow>[]) => {
        if (rows.length === 0) return
        ws['!cols'] = Object.keys(rows[0]).map(key => {
          let max = key.length
          rows.forEach(row => { const v = String((row as any)[key] || ""); if (v.length > max) max = v.length })
          return { wch: max + 2 }
        })
      }

      const workbook = XLSX.utils.book_new()

      if (sheetsToExport && sheetsToExport.length > 0) {
        sheetsToExport.forEach(coordKey => {
          const coordActors = sortedData.filter(a =>
            String(a.coordinator || "Tanpa Koordinator").toUpperCase().trim() === coordKey
          )
          if (coordActors.length === 0) return
          const rows = coordActors.map((a, i) => toRow(a, i))
          const ws = XLSX.utils.json_to_sheet(rows)
          setColWidths(ws, rows)
          const sheetName = coordKey.substring(0, 31)
          XLSX.utils.book_append_sheet(workbook, ws, sheetName)
        })

        const allRows = sortedData
          .filter(a => sheetsToExport.includes(String(a.coordinator || "Tanpa Koordinator").toUpperCase().trim()))
          .map((a, i) => toRow(a, i))
        const wsAll = XLSX.utils.json_to_sheet(allRows)
        setColWidths(wsAll, allRows)
        XLSX.utils.book_append_sheet(workbook, wsAll, "SEMUA")
      } else {
        const exportData = sortedData.map((actor, index) => toRow(actor, index))
        const worksheet = XLSX.utils.json_to_sheet(exportData)
        setColWidths(worksheet, exportData)
        XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil Verifikasi")
      }

      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Hasil_Verifikasi_Lolos_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)

      toast({ title: "Berhasil", description: "Data berhasil diekspor ke Excel." })
      setShowExportDialog(false)
    } catch (error) {
      console.error("Export Excel Error:", error)
      toast({ variant: "destructive", title: "Error", description: "Gagal mengekspor data." })
    }
  }

  if (!isAdmin && !isPetugas && !isKoordinator && !isDinas && !isAdminLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
      </div>
    )
  }

  const isShowingTable = isKoordinator || !!filterCoordinator || searchQuery.trim().length > 0

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">HASIL VERIFIKASI</h1>
            {filteredActors && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20 shadow-sm flex items-center gap-2">
                <span>Total Data Selesai diverifikasi Dinas:</span>
                <span className="bg-primary text-white px-2 py-0.5 rounded-full">{filteredActors.length}</span>
              </div>
            )}
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Daftar pelaku usaha yang telah lolos tahapan verifikasi dan validasi dinas.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari Nama, NIK, Usaha, Koordinator..."
              className="pl-9 h-10 border-primary/20 bg-card text-card-foreground"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <Button
            onClick={() => {
              const allKeys = Object.keys(groupedActors).sort()
              setSelectedExportSheets(allKeys)
              setShowExportDialog(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md h-10 rounded-xl text-white"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> EKSPOR EXCEL
          </Button>
        </div>
      </div>

      {/* ─── EXPORT EXCEL DIALOG ─── */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-emerald-700 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" /> Pilih Sheet yang Diekspor
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-xs text-slate-500 font-medium">Pilih koordinator yang datanya akan dimasukkan sebagai sheet terpisah. Sheet <strong>SEMUA</strong> akan disertakan sebagai gabungan.</p>
            <div className="flex gap-2 mb-1">
              <button onClick={() => setSelectedExportSheets(Object.keys(groupedActors).sort())} className="text-[11px] font-bold text-emerald-600 hover:underline">Pilih Semua</button>
              <span className="text-slate-300">|</span>
              <button onClick={() => setSelectedExportSheets([])} className="text-[11px] font-bold text-red-500 hover:underline">Batal Semua</button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1 border rounded-xl p-2">
              {Object.keys(groupedActors).sort().map(coordKey => (
                <label key={coordKey} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedExportSheets.includes(coordKey)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedExportSheets(prev => [...prev, coordKey])
                      } else {
                        setSelectedExportSheets(prev => prev.filter(k => k !== coordKey))
                      }
                    }}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase truncate">{coordKey}</p>
                    <p className="text-[10px] text-slate-400">{groupedActors[coordKey]?.length || 0} data lolos</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">{selectedExportSheets.length} dari {Object.keys(groupedActors).length} koordinator dipilih</p>
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowExportDialog(false)} className="flex-1 font-bold">Batal</Button>
            <Button
              disabled={selectedExportSheets.length === 0}
              onClick={() => handleExportExcel(selectedExportSheets)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Ekspor {selectedExportSheets.length} Sheet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MAIN CONTENT ─── */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col p-4 md:p-5 rounded-[2rem] bg-slate-100 dark:bg-slate-800 animate-pulse h-[130px] md:h-[150px] justify-center items-center gap-3 border border-slate-200/50"
              >
                <div className="w-16 h-3 bg-slate-300 dark:bg-slate-700 rounded-full" />
                <div className="w-24 h-5 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : isShowingTable ? (
        /* ─── TABLE VIEW (SELECTED COORDINATOR / SEARCH / KOORDINATOR ROLE) ─── */
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            {!isKoordinator && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchInput("")
                  setSearchQuery("")
                  router.push('/hasil-verifikasi')
                }}
                className="font-bold border-primary text-primary hover:bg-primary/5 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> KEMBALI KE MODUL
              </Button>
            )}
            <h2 className="text-lg md:text-xl font-black text-primary uppercase tracking-tight">
              {isKoordinator
                ? `DATA: ${userProfile?.fullName || "KOORDINATOR"}`
                : filterCoordinator
                  ? `DATA: ${filterCoordinator}`
                  : `HASIL PENCARIAN (${currentDataToDisplay.length})`}
            </h2>
            <Badge className="bg-emerald-600 text-white font-bold ml-auto">
              {currentDataToDisplay.length} DATA LOLOS
            </Badge>
          </div>

          {currentDataToDisplay.length === 0 ? (
            <Card className="border-dashed border-2 flex flex-col items-center justify-center py-20 text-muted-foreground bg-slate-50/50 rounded-3xl">
              <BadgeCheck className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">Belum ada data hasil verifikasi Dinas yang lolos</p>
            </Card>
          ) : (
            <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
              <div className="max-h-[calc(100vh-280px)] overflow-auto">
                <Table>
                  <TableHeader className="bg-slate-50 border-b sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[50px] font-black uppercase text-[10px] text-center text-slate-500">No</TableHead>
                      <TableHead className="font-black uppercase text-[10px] text-slate-500">Pelaku Usaha</TableHead>
                      <TableHead className="font-black uppercase text-[10px] text-slate-500">Informasi Usaha</TableHead>
                      <TableHead className="font-black uppercase text-[10px] text-center text-slate-500">Keputusan</TableHead>
                      <TableHead className="font-black uppercase text-[10px] text-slate-500">Waktu Verifikasi</TableHead>
                      <TableHead className="font-black uppercase text-[10px] text-slate-500">Koordinator</TableHead>
                      <TableHead className="font-black uppercase text-[10px] text-right text-slate-500 pr-6">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentDataToDisplay.slice(0, pageLimit).map((actor, index) => (
                      <TableRow key={actor.id} className="hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="text-center font-bold text-slate-400 text-xs">
                          {globalIndexMap.get(actor.id) || index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className={cn(
                              "font-black uppercase text-sm leading-tight",
                              normalizeGender(actor.gender) === 'Perempuan' ? "text-red-600" : "text-blue-600"
                            )}>
                              {actor.fullName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 uppercase">{actor.nik}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700 text-[11px] uppercase">{actor.businessName}</span>
                            <span className="text-[9px] text-slate-400 uppercase font-bold">{actor.businessCategory}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">
                            LOLOS
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="text-[11px] font-bold">
                                {actor.berkasDinasVerifiedAt
                                  ? formatDateTimeIndo(actor.berkasDinasVerifiedAt)
                                  : (actor.verifiedDinasAt ? formatDateTimeIndo(actor.verifiedDinasAt) : "-")}
                              </span>
                            </div>
                            {(actor.berkasDinasVerifiedBy || actor.verifikatorDinas) && (
                              <span className="text-[9px] text-slate-400 font-medium pl-5 truncate max-w-[170px]" title={`Petugas: ${actor.berkasDinasVerifiedBy || actor.verifikatorDinas}`}>
                                Oleh: {actor.berkasDinasVerifiedBy || actor.verifikatorDinas}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-[10px] font-bold text-slate-600 uppercase">{actor.coordinator || "-"}</span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            {/* Viewer Dialog Button */}
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => setViewingActor(actor)}
                              className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-full border-transparent transition-all"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {/* Input Bank Action Button */}
                            <Button
                              size="sm"
                              onClick={() => setInputtingBankActor(actor)}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-8 rounded-full px-3 shadow-sm"
                              title="Input Rekening & Teruskan"
                            >
                              <CreditCard className="w-4 h-4 mr-1.5" /> Input Rekening
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {currentDataToDisplay.length > pageLimit && (
                <div className="p-4 flex justify-center border-t bg-slate-50">
                  <Button variant="outline" onClick={() => setPageLimit(prev => prev + 50)} className="font-bold border-primary text-primary hover:bg-primary/10">
                    <RefreshCw className="w-4 h-4 mr-2" /> Tampilkan Lebih Banyak Data
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ─── COORDINATOR CARDS GRID VIEW (DEFAULT) ─── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {isKuotaLoading ? (
            [...Array(12)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col p-4 md:p-5 rounded-[2rem] bg-slate-100 dark:bg-slate-800 animate-pulse h-[130px] md:h-[150px] justify-center items-center gap-3 border border-slate-200/50"
              >
                <div className="w-16 h-3 bg-slate-300 dark:bg-slate-700 rounded-full" />
                <div className="w-24 h-5 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </div>
            ))
          ) : coordinatorStats.filter(stat => stat.count > 0).map((stat) => (
            <div
              key={stat.name}
              onClick={() => router.push(`/hasil-verifikasi?coordinator=${encodeURIComponent(stat.name)}`)}
              className={cn(
                "group relative flex flex-col p-4 md:p-5 rounded-[2rem] transition-all duration-300 ease-out overflow-hidden shadow-lg border cursor-pointer active:scale-95 h-[130px] md:h-[150px] justify-center items-center animate-in fade-in slide-in-from-bottom-4",
                "hover:shadow-2xl hover:-translate-y-1.5 hover:brightness-110",
                "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400/20"
              )}
            >
              {/* Glossy Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

              {/* Icon Section */}
              <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10">
                <div className="bg-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300 ease-out shadow-xl backdrop-blur-sm">
                  <User className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-white" />
                </div>
              </div>

              {/* Title Section */}
              <div className="flex-1 relative z-10 flex flex-col items-center justify-center gap-2 mt-4 w-full text-center">
                <h3
                  className="text-[11px] md:text-sm font-black text-white leading-tight uppercase tracking-tight text-center break-words line-clamp-2 w-full px-1"
                  title={stat.name}
                >
                  {stat.name}
                </h3>

                <div className="flex items-center gap-1.5 px-3 py-0.5 bg-white/20 rounded-full backdrop-blur-md border border-white/20 shadow-md">
                  <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-wider">{stat.count} Berkas</span>
                </div>
              </div>

              {/* Decorative Light Effect */}
              <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
            </div>
          ))}

          {!isKuotaLoading && coordinatorStats.filter(stat => stat.count > 0).length === 0 && (
            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <div className="p-4 bg-slate-50 rounded-full">
                <Search className="w-10 h-10 text-slate-300" />
              </div>
              <p className="font-black text-slate-400 uppercase tracking-widest">Belum ada data koordinator lolos verifikasi</p>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL DETAIL PELAKU USAHA ─── */}
      <Dialog open={!!viewingActor} onOpenChange={(open) => !open && setViewingActor(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingActor && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-black text-primary uppercase flex items-center gap-2">
                  <FileText className="w-6 h-6" /> Data Hasil Verifikasi
                </DialogTitle>
                <DialogDescription className="sr-only">Rincian data pelaku usaha purna verifikasi dinas.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                {/* Hasil Card */}
                <section>
                  <Card className="border-emerald-200 bg-emerald-50/50">
                    <CardContent className="p-4">
                      <h3 className="font-black text-sm uppercase mb-2 text-emerald-700">
                        Keputusan Dinas: {viewingActor.hasilVerifikasiDinas || "Lolos"}
                      </h3>
                      <div className="space-y-1 mt-3">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Keterangan / Alasan</p>
                        <p className="text-sm font-medium">{viewingActor.keteranganDinas || (viewingActor as any).surveyData?.hasilSurvey || "Data lolos verifikasi dinas."}</p>
                      </div>
                    </CardContent>
                  </Card>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                    {(() => {
                      const parsed = parsePobDob(viewingActor.pobDob || "")
                      return [
                        { label: "Nama Lengkap", value: viewingActor.fullName },
                        { label: "NIK", value: viewingActor.nik },
                        { label: "Nomor KK", value: viewingActor.noKK },
                        { label: "Jenis Kelamin", value: viewingActor.gender },
                        { label: "Tempat Lahir", value: viewingActor.pob || parsed.pob || "-" },
                        { label: "Tanggal Lahir", value: viewingActor.dob || parsed.dob || "-" },
                        { label: "Nomor HP", value: viewingActor.phone, isPhone: true }
                      ]
                    })().map((item, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                        {(item as any).isPhone && item.value ? (
                          <a
                            href={`https://wa.me/${String(item.value).replace(/\D/g, "").replace(/^0/, "62")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-green-600 hover:text-green-700 hover:underline flex items-center gap-1"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <p className="text-xs font-bold">{item.value || "-"}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat & Domisili</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                    {[
                      { label: "Kecamatan", value: viewingActor.kecamatan },
                      { label: "Kelurahan", value: viewingActor.kelurahan },
                      { label: "RT/RW", value: viewingActor.rtRw },
                      { label: "Alamat Lengkap", value: viewingActor.address, fullWidth: true }
                    ].map((item, i) => (
                      <div key={i} className={item.fullWidth ? "md:col-span-3 space-y-1" : "space-y-1"}>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                        <p className="text-xs font-bold">{item.value || "-"}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Building2 className="w-4 h-4" /> Informasi Usaha</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border">
                    {(() => {
                      const found = kuotaData?.find((q: any) => (q.name || q.coordinator || "").toUpperCase().trim() === (viewingActor.coordinator || "").toUpperCase().trim());
                      const coordPhone = found?.phone || found?.noHp || found?.hp || "";

                      const getWaLink = (phoneStr: string) => {
                        if (!phoneStr) return "#";
                        let clean = phoneStr.replace(/\D/g, "");
                        if (clean.startsWith("0")) clean = "62" + clean;
                        else if (!clean.startsWith("62")) clean = "62" + clean;
                        return `https://wa.me/${clean}`;
                      };

                      return [
                        { label: "Usaha", value: viewingActor.businessName },
                        { label: "Kategori Usaha", value: viewingActor.businessCategory },
                        { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                        { label: "USULAN", value: viewingActor.coordinator },
                        { label: "NO. HP USULAN", value: coordPhone, isPhone: true },
                        { label: "PETUGAS SURVEY", value: (viewingActor as any).petugasSurvey || "Belum ada" }
                      ].map((item: any, i: number) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          {item.isPhone && item.value ? (
                            <a
                              href={getWaLink(item.value)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-sm transition-all active:scale-95 w-fit"
                              title="Klik untuk membuka obrolan WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-600/20" />
                              <span>{item.value}</span>
                            </a>
                          ) : (
                            <p className="text-xs font-bold">{item.value || "-"}</p>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Data Titik Lokasi Verifikasi</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(viewingActor as any).verificationLocation && (
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Sumber: Verifikasi Admin</p>
                        <p className="text-xs font-mono text-emerald-800 font-semibold">{(viewingActor as any).verificationLocation.lat}, {(viewingActor as any).verificationLocation.lon}</p>
                        <a href={`https://www.google.com/maps?q=${(viewingActor as any).verificationLocation.lat},${(viewingActor as any).verificationLocation.lon}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline mt-2 inline-block">Lihat di Peta</a>
                      </div>
                    )}
                    {(viewingActor as any).verificationLocationDinas && (
                      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Sumber: Verifikasi Dinas</p>
                        <p className="text-xs font-mono text-indigo-800 font-semibold">{(viewingActor as any).verificationLocationDinas.lat}, {(viewingActor as any).verificationLocationDinas.lon}</p>
                        <a href={`https://www.google.com/maps?q=${(viewingActor as any).verificationLocationDinas.lat},${(viewingActor as any).verificationLocationDinas.lon}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline mt-2 inline-block">Lihat di Peta</a>
                      </div>
                    )}
                    {!(viewingActor as any).verificationLocation && !(viewingActor as any).verificationLocationDinas && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-full">
                        <p className="text-xs font-medium text-slate-500 text-center">Belum ada titik lokasi yang direkam.</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> Audit Sistem & Verifikasi</div>
                  <div className="bg-slate-50 p-4 rounded-xl text-[10px] font-bold grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 border">
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase">Status</p>
                      <p className="text-primary">{viewingActor.status.toUpperCase()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase">Diinput Oleh</p>
                      <p>{viewingActor.createdBy || "System"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase">Waktu Input</p>
                      <p>{viewingActor.createdAt ? formatDateTimeIndo(viewingActor.createdAt) : "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase">Waktu Lolos Verifikasi</p>
                      <p className="text-emerald-700 font-black">
                        {viewingActor.berkasDinasVerifiedAt
                          ? formatDateTimeIndo(viewingActor.berkasDinasVerifiedAt)
                          : (viewingActor.verifiedDinasAt ? formatDateTimeIndo(viewingActor.verifiedDinasAt) : "-")}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase">Petugas Verifikator</p>
                      <p className="text-slate-800 font-bold">
                        {viewingActor.berkasDinasVerifiedBy || viewingActor.verifikatorDinas || "-"}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
              <DialogFooter className="flex-col sm:flex-row items-center justify-between gap-2 border-t pt-4">
                {(isAdmin || isDinas) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setReturnTargetActor(viewingActor)
                      setReturnReason("")
                    }}
                    className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 font-bold gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" /> Kembalikan ke Petugas Survey
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setViewingActor(null)}>Tutup</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL INPUT BANK ─── */}
      <Dialog open={!!inputtingBankActor} onOpenChange={(open) => !open && setInputtingBankActor(null)}>
        <DialogContent>
          {inputtingBankActor && (
            <form onSubmit={handleInputBank}>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-amber-600 uppercase flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Input Rekening & Penyaluran
                </DialogTitle>
                <DialogDescription>
                  Silakan masukkan data rekening pelaku usaha <strong>{inputtingBankActor.fullName}</strong> dengan benar. Setelah dikonfirmasi, data akan masuk ke menu Rekening Bank.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Pilih Nama Bank</Label>
                    <Select name="bankName" defaultValue={inputtingBankActor.bankName || ""} required>
                      <SelectTrigger className="w-full font-bold">
                        <SelectValue placeholder="Pilih Bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {BANK_LIST.map(bank => (
                          <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Nomor Rekening</Label>
                    <Input name="bankNumber" defaultValue={inputtingBankActor.bankNumber} placeholder="Cth: 1234567890" className="font-mono font-bold" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Nama Pemilik Rekening</Label>
                    <Input name="bankOwner" defaultValue={inputtingBankActor.bankOwner || inputtingBankActor.fullName} placeholder="Cth: BUDI SANTOSO" className="font-bold uppercase" required />
                  </div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-700 font-bold leading-relaxed">
                  PENTING: Pastikan data di atas sudah valid. Setelah disimpan, status akan berubah menjadi Selesai (Rekening Bank).
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setInputtingBankActor(null)}>Batal</Button>
                <Button type="submit" disabled={isSubmittingBank} className="min-w-[150px] bg-amber-500 hover:bg-amber-600 text-white font-bold">
                  {isSubmittingBank ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "SIMPAN & TERUSKAN"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL KEMBALIKAN KE PETUGAS SURVEY ─── */}
      <Dialog open={!!returnTargetActor} onOpenChange={(open) => { if (!open) { setReturnTargetActor(null); setReturnReason(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700 font-black uppercase text-lg">
              <RotateCcw className="w-5 h-5 text-orange-600" /> Kembalikan ke Petugas Survey
            </DialogTitle>
            <DialogDescription>
              Data pelaku usaha ini akan dikembalikan ke antrean status survey lapangan agar petugas survey dapat merevisi/memperbaiki data atau berkas.
            </DialogDescription>
          </DialogHeader>

          {returnTargetActor && (
            <div className="space-y-4 py-2">
              <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-orange-800 font-bold uppercase tracking-wider">Pelaku Usaha</p>
                    <p className="text-sm font-black text-slate-900 uppercase">{returnTargetActor.fullName}</p>
                    <p className="text-xs text-slate-600 font-mono">NIK: {returnTargetActor.nik}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-orange-200 text-orange-900 rounded-lg uppercase">
                    {returnTargetActor.kelurahan || "Kelurahan"}
                  </span>
                </div>

                <div className="pt-2 border-t border-orange-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-bold uppercase text-[10px]">Tujuan Petugas Survey:</span>
                  <span className="font-black text-emerald-800 uppercase flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {returnTargetActor.petugasSurvey || returnTargetActor.createdBy || returnTargetActor.surveyData?.pejabatData?.petugas?.nama || "Petugas Terkait"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="return-reason-hv" className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1">
                  Catatan / Alasan Pengembalian <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="return-reason-hv"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Contoh: Foto usaha kurang jelas, alamat mohon disesuaikan dengan RT/RW terbaru, atau data peralatan perlu diperbaiki..."
                  className="min-h-[110px] text-sm rounded-xl border-slate-300 focus-visible:ring-orange-500 bg-white"
                />
                <p className="text-[11px] text-slate-500">
                  💡 Catatan ini akan langsung tampil pada akun Petugas Survey terkait sebagai instruksi perbaikan.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setReturnTargetActor(null); setReturnReason(""); }}
              disabled={isSubmittingReturn}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleKembalikanKePetugas}
              disabled={isSubmittingReturn || !returnReason.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2 min-w-[160px]"
            >
              {isSubmittingReturn ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Kembalikan Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function HasilVerifikasiPage() {
  return (
    <Suspense fallback={
      <div className="p-20 flex justify-center items-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <HasilVerifikasiContent />
    </Suspense>
  )
}

