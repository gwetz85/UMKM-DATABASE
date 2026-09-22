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
  CalendarDays,
  ClipboardList,
  Camera,
  CheckCircle2,
  XCircle,
  Sparkles,
  Users,
  ChevronRight,
  X,
  ShieldCheck,
  Copy,
  Check,
  Phone,
  Store,
  ExternalLink,
  Calendar
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { cn, parsePobDob, calculateAge, extractDobFromNik, formatDateTimeIndo } from "@/lib/utils"
import { resolveSurveyorCanonicalName } from "@/lib/surveyor-utils"
import { logActivity, getDeviceType } from "@/lib/logger"
import { useSearchParams, useRouter } from "next/navigation"
import * as XLSX from "xlsx"

const BANK_LIST = [
  "BCA", "BNI", "BRI", "BRK", "MANDIRI", "BSI", "BTN", "OCBC", "PANIN", "MUAMALAT", "MAYBANK", "BUKOPIN", "DANAMON", "PERMATA"
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopy = (text: string, label: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedKey(label)
    toast({
      title: "Tersalin ke Clipboard",
      description: `${label}: ${text}`,
    })
    setTimeout(() => {
      setCopiedKey(null)
    }, 2000)
  }

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
        const actorPetugasUpper = String(a.petugasSurvey || "").toUpperCase().trim()
        if (!actorPetugasUpper || actorPetugasUpper === "BELUM ADA" || actorPetugasUpper === "-") return false
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

  const activeCoordinatorCount = useMemo(() => {
    return coordinatorStats.filter(s => s.count > 0).length
  }, [coordinatorStats])

  const totalLolosCount = useMemo(() => {
    return filteredActors?.length || 0
  }, [filteredActors])

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

      // Update global stats (Tahap 3 -> Tahap 4 / Selesai)
      import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
        const updatedActor = { ...inputtingBankActor, ...updates }
        updateStatsOnStatusChange(database, inputtingBankActor, updatedActor, updatedActor).catch(e => console.error(e))
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
      const rawOfficerName = returnTargetActor.petugasSurvey || returnTargetActor.createdBy || returnTargetActor.surveyData?.pejabatData?.petugas?.nama || ''
      const officerName = resolveSurveyorCanonicalName(rawOfficerName)

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

      if (officerName && officerName !== 'BELUM ADA' && (!returnTargetActor.petugasSurvey || returnTargetActor.petugasSurvey.trim() === '-' || returnTargetActor.petugasSurvey.trim() === '')) {
        updates.petugasSurvey = officerName
      }

      const cleanData = sanitizeForFirebase(updates)
      const { update } = await import('firebase/database')
      await update(actorRef, cleanData)

      // Update global stats (Tahap 3 -> Tahap 1)
      import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
        const updatedActor = { ...returnTargetActor, ...updates }
        updateStatsOnStatusChange(database, returnTargetActor, updatedActor, updatedActor).catch(e => console.error(e))
      })

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
      {/* Modern Frosted Glass Canvas */}
      <div className="bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl border border-white/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl shadow-slate-300/40 dark:shadow-none space-y-6">
        {/* Sticky Fixed Header & Stats Ribbon Section */}
        <div className="sticky -top-4 md:-top-8 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-4 border-b border-slate-200/80 dark:border-slate-800 rounded-t-3xl shadow-sm space-y-4 print:static print:p-0 print:m-0 print:border-none print:shadow-none">
          {/* Main Top Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Verifikasi Dinas Telah Selesai
                </span>
              </div>
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors h-9 w-9 rounded-xl" />
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-headline">
                  Hasil Verifikasi
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Daftar pelaku usaha yang telah lolos tahapan verifikasi dan validasi dinas.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 w-full lg:w-auto print:hidden">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Cari Nama, NIK, Usaha, Koordinator..."
                  className="pl-10 h-11 border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-sm focus-visible:ring-primary font-medium text-xs sm:text-sm"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                  <button 
                    onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <Button
                onClick={() => {
                  const allKeys = Object.keys(groupedActors).sort()
                  setSelectedExportSheets(allKeys)
                  setShowExportDialog(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 hover:shadow-lg h-11 rounded-2xl text-xs sm:text-sm transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1.5" /> EKSPOR EXCEL
              </Button>
            </div>
          </div>

          {/* Overview Stats Ribbon (when showing coordinator cards) */}
          {!isShowingTable && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4 print:hidden pt-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-50/80 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/10 border border-indigo-100/80 dark:border-indigo-900/30 shadow-sm">
                <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                  <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Koordinator</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{activeCoordinatorCount}</span>
                    <span className="hidden sm:inline text-xs font-semibold text-slate-500">Penanggung Jawab</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-100/80 dark:border-emerald-900/30 shadow-sm">
                <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Total Lolos Dinas</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">{totalLolosCount}</span>
                    <span className="hidden sm:inline text-xs font-semibold text-slate-500">Pelaku Usaha</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-100/80 dark:border-amber-900/30 shadow-sm">
                <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                  <CreditCard className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Langkah Lanjut</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs sm:text-sm font-black text-amber-700 dark:text-amber-400 truncate">Input Rekening</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subheader when showing table */}
          {isShowingTable && (
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2 flex-wrap">
                {!isKoordinator && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchInput("")
                      setSearchQuery("")
                      router.push('/hasil-verifikasi')
                    }}
                    className="font-bold border-primary text-primary hover:bg-primary/5 shadow-sm rounded-xl h-9 text-xs sm:text-sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali
                  </Button>
                )}
                <h2 className="text-base sm:text-xl font-black text-primary uppercase tracking-tight truncate max-w-[240px] sm:max-w-none">
                  {isKoordinator
                    ? `DATA: ${userProfile?.fullName || "KOORDINATOR"}`
                    : filterCoordinator
                      ? `DATA: ${filterCoordinator}`
                      : `HASIL PENCARIAN (${currentDataToDisplay.length})`}
                </h2>
              </div>
              <Badge className="bg-emerald-600 text-white font-bold rounded-xl px-3 py-1 text-xs shrink-0">
                {currentDataToDisplay.length} DATA LOLOS
              </Badge>
            </div>
          )}
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

          {currentDataToDisplay.length === 0 ? (
            <Card className="border-dashed border-2 flex flex-col items-center justify-center py-20 text-muted-foreground bg-slate-50/50 rounded-3xl">
              <BadgeCheck className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">Belum ada data hasil verifikasi Dinas yang lolos</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Responsive Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {currentDataToDisplay.slice(0, pageLimit).map((actor, index) => {
                  const isFemale = normalizeGender(actor.gender) === 'Perempuan';
                  const cardTheme = isFemale ? '#e11d48' : '#0284c7';
                  const actorAge = calculateAge(actor.dob || (actor.pobDob ? parsePobDob(actor.pobDob).dob : "") || extractDobFromNik(actor.nik || ""));

                  return (
                    <div
                      key={actor.id}
                      onClick={() => setViewingActor(actor)}
                      className="group relative overflow-hidden border-2 hover:shadow-2xl transition-all duration-300 ease-out rounded-3xl p-5 bg-white dark:bg-slate-900 hover:-translate-y-1.5 flex flex-col justify-between cursor-pointer"
                      style={{
                        borderColor: `${cardTheme}35`,
                        boxShadow: `0 4px 20px -2px ${cardTheme}15`
                      }}
                    >
                      {/* Glowing Top Accent Stripe */}
                      <div 
                        className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 group-hover:h-2 z-10"
                        style={{ background: `linear-gradient(90deg, ${cardTheme}, ${cardTheme}dd, ${cardTheme}aa)` }} 
                      />

                      {/* Colorful Gradient Wash Overlay */}
                      <div 
                        className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-40 group-hover:opacity-80"
                        style={{ background: `linear-gradient(145deg, transparent 35%, ${cardTheme}08 80%, ${cardTheme}15 100%)` }}
                      />

                      {/* Ambient Soft Glow Orb */}
                      <div 
                        className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl transition-all duration-700 pointer-events-none opacity-15 group-hover:opacity-30 group-hover:scale-150"
                        style={{ backgroundColor: cardTheme }}
                      />

                      {/* Decorative Watermark Icon (Bottom-Right) */}
                      <div 
                        className="absolute -bottom-3 -right-3 pointer-events-none transition-all duration-500 ease-out opacity-[0.05] dark:opacity-[0.10] group-hover:opacity-[0.18] group-hover:scale-125 group-hover:-rotate-12"
                        style={{ color: cardTheme }}
                      >
                        <ShieldCheck className="w-28 h-28 stroke-[1.2]" />
                      </div>

                      {/* Content Layer */}
                      <div className="relative z-10 space-y-3.5">
                        {/* Top Row: Circular Index Badge, Name & Status */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Circular Index Badge */}
                            <span 
                              className="w-10 h-10 rounded-2xl text-white font-extrabold text-sm sm:text-base flex items-center justify-center shrink-0 shadow-md transition-all duration-300 group-hover:scale-105"
                              style={{ backgroundColor: cardTheme }}
                            >
                              {globalIndexMap.get(actor.id) || index + 1}
                            </span>

                            <div className="min-w-0 flex-1">
                              {/* Full Name */}
                              <h3
                                className="font-extrabold text-base sm:text-[17px] tracking-tight truncate leading-tight uppercase"
                                style={{ color: cardTheme }}
                              >
                                {actor.fullName}
                              </h3>

                              {/* NIK & Age Badge */}
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 font-mono tracking-tight">
                                  {actor.nik || '-'}
                                </span>
                                {actorAge ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {actorAge} Thn
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Keputusan Badge */}
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border shadow-2xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>LOLOS</span>
                          </span>
                        </div>

                        {/* Middle Container: Informasi Usaha */}
                        <div className="bg-slate-50/90 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-3.5 space-y-2 relative z-10 backdrop-blur-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="space-y-0.5 min-w-0">
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Nama Usaha</span>
                              <h4 
                                className="font-black text-sm sm:text-[15px] uppercase tracking-tight truncate"
                                style={{ color: cardTheme }}
                              >
                                {actor.businessName || 'Nama Usaha Belum Diisi'}
                              </h4>
                            </div>
                            <span className={cn(
                              "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border shadow-2xs shrink-0",
                              actor.businessCategory === 'Kuliner' 
                                ? "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" 
                                : "border-blue-300 text-blue-800 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                            )}>
                              {actor.businessCategory || '-'}
                            </span>
                          </div>

                          {/* Alamat / Lokasi Usaha */}
                          {(actor.businessLocation || actor.address) && (
                            <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="font-medium line-clamp-1 uppercase tracking-tight">
                                {actor.businessLocation || actor.address}
                              </span>
                            </div>
                          )}

                          {/* Koordinator & Waktu Verifikasi Dinas */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Koordinator</span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase truncate block" title={actor.coordinator}>
                                {actor.coordinator || '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Waktu Verifikasi</span>
                              <div className="text-xs text-slate-700 dark:text-slate-300">
                                <span className="font-bold">
                                  {actor.verifiedDinasAt ? new Date(actor.verifiedDinasAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                                </span>
                                {actor.verifiedDinasBy && (
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    Oleh: {actor.verifiedDinasBy}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status Rekening Bank */}
                        {actor.bankNumber ? (
                          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                                {actor.bankName || "Bank"} • <span className="font-mono">{actor.bankNumber}</span>
                              </span>
                            </div>
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full shrink-0">
                              Tersimpan
                            </span>
                          </div>
                        ) : (
                          <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-dashed border-amber-200/70 dark:border-amber-900/40 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                              <CreditCard className="w-3.5 h-3.5 shrink-0" />
                              <span>Rekening Belum Diisi</span>
                            </div>
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                              Menunggu
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Row */}
                      <div className="flex items-center gap-2 sm:gap-2.5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 relative z-10" onClick={(e) => e.stopPropagation()}>
                        {/* Lihat Detail */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-10 rounded-xl font-bold text-xs text-blue-700 bg-blue-50/70 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-2xs cursor-pointer"
                          onClick={() => setViewingActor(actor)}
                          title="Lihat Detail Lengkap"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </Button>

                        {/* Input / Edit Rekening */}
                        <Button
                          size="sm"
                          onClick={() => setInputtingBankActor(actor)}
                          className="flex-1 h-10 rounded-xl font-black text-xs text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-sm shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                          title="Input Rekening & Teruskan"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{actor.bankNumber ? "Edit Rekening" : "Input Rekening"}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {currentDataToDisplay.length > pageLimit && (
                <div className="p-6 flex justify-center bg-white dark:bg-slate-900 border-2 rounded-2xl shadow-xs">
                  <Button variant="outline" onClick={() => setPageLimit(prev => prev + 50)} className="font-bold border-primary text-primary hover:bg-primary/10 rounded-xl h-11 px-6">
                    <RefreshCw className="w-4 h-4 mr-2" /> Tampilkan Lebih Banyak Data ({currentDataToDisplay.length - pageLimit} data tersisa)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ─── COORDINATOR CARDS GRID VIEW (DEFAULT) ─── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5">
          {isKuotaLoading ? (
            [...Array(12)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-slate-800/60 animate-pulse min-h-[165px] justify-between border border-slate-200/50 dark:border-slate-800"
              >
                <div className="flex justify-between items-center">
                  <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                  <div className="w-14 h-4 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
                <div className="space-y-2 my-2">
                  <div className="w-3/4 h-3.5 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                  <div className="w-1/2 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
            ))
          ) : coordinatorStats.filter(stat => stat.count > 0).map((stat) => {
            const themeColor = '#0d9488';
            return (
            <div
              key={stat.name}
              onClick={() => router.push(`/hasil-verifikasi?coordinator=${encodeURIComponent(stat.name)}`)}
              style={{
                borderColor: `${themeColor}50`,
                boxShadow: `0 4px 18px -2px ${themeColor}20`
              }}
              className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl transition-all duration-300 ease-out overflow-hidden cursor-pointer active:scale-95 min-h-[165px] border-2 bg-white dark:bg-slate-900 hover:shadow-xl hover:-translate-y-1.5 animate-in fade-in slide-in-from-bottom-3"
            >
              {/* Glowing Top Accent Stripe */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 group-hover:h-2 z-10"
                style={{
                  background: "linear-gradient(90deg, #0d9488, #14b8a6, #2dd4bf)"
                }}
              />

              {/* Colorful Gradient Wash Overlay */}
              <div 
                className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-60 group-hover:opacity-100"
                style={{ 
                  background: `linear-gradient(145deg, transparent 35%, ${themeColor}15 80%, ${themeColor}25 100%)` 
                }}
              />

              {/* Ambient Soft Glow Orb */}
              <div 
                className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl transition-all duration-700 pointer-events-none opacity-25 group-hover:opacity-50 group-hover:scale-150"
                style={{ backgroundColor: themeColor }} 
              />

              {/* Large Decorative Watermark Icon (Bottom-Right) */}
              <div 
                className="absolute -bottom-2.5 -right-2.5 pointer-events-none transition-all duration-500 ease-out opacity-[0.08] dark:opacity-[0.14] group-hover:opacity-[0.24] group-hover:scale-125 group-hover:-rotate-12"
                style={{ color: themeColor }}
              >
                <CheckCircle2 className="w-24 h-24 stroke-[1.5]" />
              </div>

              {/* Top Row: Avatar & Status Badge */}
              <div className="relative z-10 flex items-center justify-between gap-2 pt-1">
                <div 
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-md shrink-0 text-white"
                  style={{ 
                    backgroundColor: themeColor,
                    boxShadow: `0 6px 14px -3px ${themeColor}60`
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>

                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
                  Lolos Dinas
                </span>
              </div>

              {/* Middle: Coordinator Name & Berkas Count */}
              <div className="relative z-10 space-y-1.5 my-2">
                <div className="flex items-center gap-1.5">
                  <span 
                    className="w-1.5 h-1.5 rounded-full shrink-0 transition-transform duration-300 group-hover:scale-150" 
                    style={{ backgroundColor: themeColor }} 
                  />
                  <h3
                    className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors"
                    title={stat.name}
                  >
                    {stat.name}
                  </h3>
                </div>

                <div className="flex items-baseline gap-1.5 pl-3">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                    {stat.count}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Berkas Lolos
                  </span>
                </div>
              </div>

              {/* Bottom Action Cue */}
              <div 
                className="relative z-10 pt-2 border-t flex items-center justify-between text-[10px] sm:text-[11px] font-bold transition-colors"
                style={{ borderColor: `${themeColor}25` }}
              >
                <span 
                  className="font-bold transition-colors"
                  style={{ color: themeColor }}
                >
                  Lihat Data Lolos
                </span>
                <div 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 shadow-xs"
                  style={{ 
                    backgroundColor: themeColor,
                    color: '#ffffff',
                    boxShadow: `0 4px 10px -2px ${themeColor}50`
                  }}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          )})}

          {!isKuotaLoading && coordinatorStats.filter(stat => stat.count > 0).length === 0 && (
            <div className="col-span-full py-16 text-center flex flex-col items-center gap-4 bg-white/60 dark:bg-slate-900/60 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-bold text-slate-400 uppercase tracking-wider text-xs sm:text-sm">Belum ada data koordinator lolos verifikasi</p>
            </div>
          )}
        </div>
      )}
      </div>

      {/* ─── MODAL DETAIL PELAKU USAHA ─── */}
      <Dialog open={!!viewingActor} onOpenChange={(open) => !open && setViewingActor(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border-0 rounded-2xl shadow-2xl bg-white dark:bg-slate-950 overflow-hidden">
          {viewingActor && (
            <>
              {/* Top Accent Stripe */}
              <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

              {/* Dialog Header */}
              <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Data Hasil Verifikasi
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Rincian lengkap data pelaku usaha yang telah lolos verifikasi dinas
                    </DialogDescription>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5" /> Lolos Verifikasi Dinas
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    {viewingActor.businessCategory || "UMKM"}
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                {/* HERO: KEPUTUSAN DINAS */}
                <section className="relative overflow-hidden rounded-2xl p-5 border-2 shadow-xs transition-all bg-gradient-to-br from-emerald-50/90 via-teal-50/30 to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-950 border-emerald-200 dark:border-emerald-800/60">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold shadow-xs shrink-0 bg-emerald-500 text-white">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider block text-emerald-700 dark:text-emerald-400">
                          Keputusan Dinas: {viewingActor.hasilVerifikasiDinas || "Lolos"}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          Hasil telaah berkas dan verifikasi lapangan dinas
                        </span>
                      </div>
                    </div>

                    {(viewingActor.berkasDinasVerifiedBy || viewingActor.verifikatorDinas) && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-2xs bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                        Diverifikasi oleh: {viewingActor.berkasDinasVerifiedBy || viewingActor.verifikatorDinas}
                      </span>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border backdrop-blur-xs bg-white/90 dark:bg-slate-900/90 border-emerald-100 dark:border-emerald-900/40">
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                      Keterangan / Alasan Verifikasi:
                    </p>
                    <p className="text-sm sm:text-base font-bold leading-relaxed italic text-emerald-950 dark:text-emerald-100">
                      "{viewingActor.keteranganDinas || (viewingActor as any).surveyData?.hasilSurvey || "Data lolos verifikasi dinas dan memenuhi persyaratan bantuan UMKM."}"
                    </p>
                  </div>
                </section>

                {/* INFORMASI PRIBADI & IDENTITAS */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span>Informasi Pribadi & Identitas</span>
                  </div>
                  {(() => {
                    const parsed = parsePobDob(viewingActor.pobDob || "")
                    const pob = viewingActor.pob || parsed.pob || ""
                    const dob = viewingActor.dob || parsed.dob || ""
                    const actorAge = calculateAge(dob || extractDobFromNik(viewingActor.nik || ""))
                    const isFemale = normalizeGender(viewingActor.gender) === 'Perempuan'
                    const genderText = normalizeGender(viewingActor.gender) || '-'
                    const waNumber = viewingActor.phone ? String(viewingActor.phone).replace(/\D/g, "").replace(/^0/, "62") : ""

                    return (
                      <div className="space-y-3">
                        {/* Profile Header Bar */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-11 h-11 rounded-xl flex items-center justify-center font-black text-base text-white shadow-xs shrink-0",
                              isFemale ? "bg-gradient-to-br from-rose-500 to-pink-600" : "bg-gradient-to-br from-blue-500 to-indigo-600"
                            )}>
                              {(viewingActor.fullName || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-base font-black uppercase tracking-tight leading-tight" style={{ color: isFemale ? '#e11d48' : '#0284c7' }}>
                                {viewingActor.fullName || "-"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                  {genderText}
                                </span>
                                {actorAge ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                    {actorAge} Tahun
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Phone / WA Action */}
                          {waNumber ? (
                            <a
                              href={`https://wa.me/${waNumber}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Hubungi WhatsApp</span>
                              <span className="text-[10px] opacity-90">({viewingActor.phone})</span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">No. HP tidak tersedia</span>
                          )}
                        </div>

                        {/* Cards for NIK, KK, TTL */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* NIK Card */}
                          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 relative group">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                              Nomor Induk Kependudukan (NIK)
                            </span>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white tracking-wider">
                                {viewingActor.nik || "-"}
                              </span>
                              {viewingActor.nik && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(viewingActor.nik, "NIK")}
                                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                                  title="Salin NIK"
                                >
                                  {copiedKey === "NIK" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* KK Card */}
                          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 relative group">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                              Nomor Kartu Keluarga (KK)
                            </span>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white tracking-wider">
                                {viewingActor.noKK || "-"}
                              </span>
                              {viewingActor.noKK && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(viewingActor.noKK, "KK")}
                                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                                  title="Salin No KK"
                                >
                                  {copiedKey === "KK" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* TTL Card */}
                          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                              Tempat & Tanggal Lahir
                            </span>
                            <div className="flex items-center gap-1.5 text-slate-900 dark:text-white text-xs font-bold">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{[pob, dob].filter(Boolean).join(", ") || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </section>

                {/* ALAMAT & DOMISILI */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <span>Alamat & Domisili</span>
                  </div>

                  <div className="space-y-3">
                    {/* Region Badges */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5">Kecamatan</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase">{viewingActor.kecamatan || "-"}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5">Kelurahan</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase">{viewingActor.kelurahan || "-"}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5">RT / RW</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{viewingActor.rtRw || "-"}</span>
                      </div>
                    </div>

                    {/* Full Address Card */}
                    <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Alamat Lengkap</span>
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase leading-relaxed">
                          {viewingActor.address || "-"}
                        </p>
                      </div>
                      {viewingActor.address && (
                        <button
                          type="button"
                          onClick={() => handleCopy(viewingActor.address, "Alamat")}
                          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
                          title="Salin Alamat"
                        >
                          {copiedKey === "Alamat" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                {/* INFORMASI USAHA & PENGUSUL */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Store className="w-3.5 h-3.5" />
                    </div>
                    <span>Informasi Usaha & Pengusul</span>
                  </div>

                  {(() => {
                    const found = kuotaData?.find((q: any) => (q.name || q.coordinator || "").toUpperCase().trim() === (viewingActor.coordinator || "").toUpperCase().trim())
                    const coordPhone = found?.phone || found?.noHp || found?.hp || ""
                    const coordWaLink = coordPhone ? `https://wa.me/${coordPhone.replace(/\D/g, "").replace(/^0/, "62")}` : ""
                    const isBelumAdaPetugas = !(viewingActor as any).petugasSurvey || (viewingActor as any).petugasSurvey.trim() === "" || (viewingActor as any).petugasSurvey.trim() === "-" || (viewingActor as any).petugasSurvey.toUpperCase().trim() === "BELUM ADA"

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Business Name Card */}
                        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Nama Usaha</span>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase leading-tight">
                            {viewingActor.businessName || "-"}
                          </h4>
                        </div>

                        {/* Category Card */}
                        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Kategori Usaha</span>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            {viewingActor.businessCategory || "Bukan Kuliner"}
                          </div>
                        </div>

                        {/* Business Location Card */}
                        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Lokasi Usaha</span>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase leading-snug">
                            {viewingActor.businessLocation || "-"}
                          </p>
                        </div>

                        {/* Coordinator / Usulan Card */}
                        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Koordinator / Pengusul</span>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
                              {viewingActor.coordinator || "-"}
                            </span>
                            {coordWaLink && (
                              <a
                                href={coordWaLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800 shadow-2xs transition-colors"
                                title="WhatsApp Koordinator"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>{coordPhone}</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Surveyor Badge Card */}
                        <div className="md:col-span-2 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Petugas Survey Lapangan</span>
                          {isBelumAdaPetugas ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-black text-rose-600 uppercase bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-900">
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                              BELUM ADA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              {(viewingActor as any).petugasSurvey}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </section>

                {/* INFORMASI REKENING BANK */}
                {viewingActor.bankNumber || viewingActor.bankName ? (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <span>Informasi Rekening Bank</span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                          {viewingActor.bankName || "BANK"}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-wider">
                              {viewingActor.bankNumber || "-"}
                            </span>
                            {viewingActor.bankNumber && (
                              <button
                                type="button"
                                onClick={() => handleCopy(viewingActor.bankNumber!, "No. Rekening")}
                                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                                title="Salin No. Rekening"
                              >
                                {copiedKey === "No. Rekening" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">
                            a.n. {viewingActor.bankOwner || viewingActor.fullName}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const actor = viewingActor
                          setViewingActor(null)
                          setInputtingBankActor(actor)
                        }}
                        className="text-xs font-bold border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Ubah Rekening
                      </Button>
                    </div>
                  </section>
                ) : (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <span>Informasi Rekening Bank</span>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-dashed border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="space-y-0.5 text-center sm:text-left">
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-300">Belum ada nomor rekening bank tersimpan</p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">Silakan input data rekening untuk keperluan pencairan bantuan.</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const actor = viewingActor
                          setViewingActor(null)
                          setInputtingBankActor(actor)
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Input Rekening
                      </Button>
                    </div>
                  </section>
                )}

                {/* HASIL SURVEY LAPANGAN */}
                {(viewingActor as any).surveyData && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <ClipboardList className="w-3.5 h-3.5" />
                      </div>
                      <span>Hasil Survey Lapangan</span>
                    </div>

                    {/* Kesimpulan */}
                    {(viewingActor as any).surveyData?.hasilSurvey && (
                      <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 space-y-1">
                        <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider">Kesimpulan / Catatan Petugas Survey</p>
                        <p className="text-xs sm:text-sm font-semibold text-blue-950 dark:text-blue-100 break-words leading-relaxed italic">
                          "{(viewingActor as any).surveyData.hasilSurvey}"
                        </p>
                      </div>
                    )}

                    {/* Grid survey metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {[
                        { label: "Status Perkawinan", value: (viewingActor as any).surveyData?.status },
                        { label: "Email", value: (viewingActor as any).surveyData?.email },
                        { label: "Media Sosial", value: (viewingActor as any).surveyData?.sosmed },
                        { label: "Bidang Usaha", value: (viewingActor as any).surveyData?.bidangUsaha },
                        { label: "Peralatan Usaha", value: (viewingActor as any).surveyData?.peralatan },
                        { label: "Tahun Berdiri", value: (viewingActor as any).surveyData?.tahunBerdiri },
                        { label: "Modal Usaha", value: (viewingActor as any).surveyData?.modalUsaha },
                        { label: "Omset per Bulan", value: (viewingActor as any).surveyData?.omset },
                        { label: "Rencana Penggunaan", value: (viewingActor as any).surveyData?.rencanaPenggunaan },
                        { label: "Tanggal Survey", value: (viewingActor as any).surveyData?.tanggalSurvey },
                      ].filter(i => i.value).map((item, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{item.label}</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Izin Usaha chips */}
                    {Array.isArray((viewingActor as any).surveyData?.izin) && (viewingActor as any).surveyData.izin.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Izin Usaha Dimiliki</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(viewingActor as any).surveyData.izin.map((iz: string, idx: number) => (
                            <span key={idx} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {iz}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* DTKS & Hibah cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* DTKS */}
                      {(viewingActor as any).surveyData?.dtks !== undefined && (
                        <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Status DTKS</span>
                          <div className="flex items-center gap-2">
                            {(viewingActor as any).surveyData.dtks?.masuk ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                  Terdaftar DTKS {(viewingActor as any).surveyData.dtks?.jenis ? `(${(viewingActor as any).surveyData.dtks.jenis})` : ""}
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className="text-xs font-bold text-slate-500">Tidak Terdaftar DTKS</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Hibah */}
                      {(viewingActor as any).surveyData?.hibah !== undefined && (
                        <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Riwayat Bantuan / Hibah</span>
                          {(viewingActor as any).surveyData.hibah?.pernah ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                                <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>Pernah menerima bantuan</span>
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-300 pl-6 space-x-2">
                                {(viewingActor as any).surveyData.hibah?.dariMana && <span>Dari: <b>{(viewingActor as any).surveyData.hibah.dariMana}</b></span>}
                                {(viewingActor as any).surveyData.hibah?.tahun && <span>Tahun: <b>{(viewingActor as any).surveyData.hibah.tahun}</b></span>}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
                              <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>Belum pernah menerima bantuan</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Foto Survey */}
                    {Boolean(
                      (viewingActor as any).surveyData?.fotoSurveyUrl &&
                      (viewingActor as any).surveyData.fotoSurveyUrl !== (viewingActor as any).comparisonPhotoUrl
                    ) && (
                      <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Camera className="w-4 h-4 text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Dokumentasi Lapangan Petugas Survey</span>
                        </div>
                        <a
                          href={(viewingActor as any).surveyData.fotoSurveyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 w-fit max-w-sm hover:opacity-95 transition-opacity"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={(viewingActor as any).surveyData.fotoSurveyUrl}
                            alt="Foto Survey"
                            className="w-full h-48 object-cover cursor-zoom-in"
                          />
                        </a>
                      </div>
                    )}

                    {/* Pejabat Data */}
                    {((viewingActor as any).surveyData?.pejabatData || (viewingActor as any).pejabatData) && (() => {
                      const pejabat = (viewingActor as any).surveyData?.pejabatData || (viewingActor as any).pejabatData
                      return (
                        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Data Petugas & Verifikator</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {pejabat?.petugas?.nama && (
                              <div className="space-y-0.5">
                                <p className="text-[9px] font-bold text-slate-500 uppercase">Petugas Survey</p>
                                <p className="text-xs font-black text-slate-900 dark:text-white">{pejabat.petugas.nama}</p>
                                {pejabat.petugas.nipppk && <p className="text-[10px] text-slate-500 font-mono">NIP/PPPK: {pejabat.petugas.nipppk}</p>}
                                {pejabat.petugas.jabatan && <p className="text-[10px] text-slate-500">{pejabat.petugas.jabatan}</p>}
                              </div>
                            )}
                            {pejabat?.verifikator?.nama && (
                              <div className="space-y-0.5">
                                <p className="text-[9px] font-bold text-slate-500 uppercase">Verifikator</p>
                                <p className="text-xs font-black text-slate-900 dark:text-white">{pejabat.verifikator.nama}</p>
                                {pejabat.verifikator.nipppk && <p className="text-[10px] text-slate-500 font-mono">NIP/PPPK: {pejabat.verifikator.nipppk}</p>}
                                {pejabat.verifikator.jabatan && <p className="text-[10px] text-slate-500">{pejabat.verifikator.jabatan}</p>}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </section>
                )}

                {/* TITIK LOKASI VERIFIKASI */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <span>Data Titik Lokasi Verifikasi</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(viewingActor as any).verificationLocation && (
                      <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col justify-between space-y-2">
                        <div>
                          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Sumber: Verifikasi Admin</span>
                          <p className="text-xs font-mono font-bold text-emerald-900 dark:text-emerald-300 mt-1">
                            {(viewingActor as any).verificationLocation.lat}, {(viewingActor as any).verificationLocation.lon}
                          </p>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${(viewingActor as any).verificationLocation.lat},${(viewingActor as any).verificationLocation.lon}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Buka di Google Maps
                        </a>
                      </div>
                    )}

                    {(viewingActor as any).verificationLocationDinas && (
                      <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col justify-between space-y-2">
                        <div>
                          <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">Sumber: Verifikasi Dinas</span>
                          <p className="text-xs font-mono font-bold text-indigo-900 dark:text-indigo-300 mt-1">
                            {(viewingActor as any).verificationLocationDinas.lat}, {(viewingActor as any).verificationLocationDinas.lon}
                          </p>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${(viewingActor as any).verificationLocationDinas.lat},${(viewingActor as any).verificationLocationDinas.lon}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-800 dark:text-indigo-400 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Buka di Google Maps
                        </a>
                      </div>
                    )}

                    {!(viewingActor as any).verificationLocation && !(viewingActor as any).verificationLocationDinas && (
                      <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 col-span-full text-center">
                        <p className="text-xs font-medium text-slate-500">Belum ada titik koordinat lokasi yang direkam.</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* AUDIT SISTEM & VERIFIKASI */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                      <History className="w-3.5 h-3.5" />
                    </div>
                    <span>Audit Sistem & Riwayat Verifikasi</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Status</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {viewingActor.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Diinput Oleh</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{viewingActor.createdBy || "System"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Waktu Input</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{viewingActor.createdAt ? formatDateTimeIndo(viewingActor.createdAt) : "-"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Waktu Lolos</span>
                      <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                        {viewingActor.berkasDinasVerifiedAt
                          ? formatDateTimeIndo(viewingActor.berkasDinasVerifiedAt)
                          : (viewingActor.verifiedDinasAt ? formatDateTimeIndo(viewingActor.verifiedDinasAt) : "-")}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Verifikator</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {viewingActor.berkasDinasVerifiedBy || viewingActor.verifikatorDinas || "-"}
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
                  Terverifikasi di sistem SIMPU DKUKM Kota Tanjungpinang
                </p>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setViewingActor(null)}
                    className="w-full sm:w-auto font-bold rounded-xl"
                  >
                    Tutup Rincian
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL INPUT BANK ─── */}
      <Dialog open={!!inputtingBankActor} onOpenChange={(open) => !open && setInputtingBankActor(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          {inputtingBankActor && (
            <form onSubmit={handleInputBank} className="space-y-5">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-amber-600 uppercase flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-600" /> Input Rekening & Penyaluran
                </DialogTitle>
                <DialogDescription>
                  Silakan periksa detail pelaku usaha di sebelah kiri dan lengkapi data rekening di sebelah kanan. Setelah disimpan, data akan masuk ke menu Rekening Bank.
                </DialogDescription>
              </DialogHeader>

              {/* ── LAYOUT 2 KOLOM MENYAMPING ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {/* ── KOLOM KIRI: DETAIL PELAKU USAHA ── */}
                <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500">
                          <User className="w-3.5 h-3.5" /> Detail Pelaku Usaha
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight leading-snug">
                          {inputtingBankActor.fullName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                            NIK: {inputtingBankActor.nik || "-"}
                          </span>
                          {inputtingBankActor.noKK && (
                            <span className="font-mono text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              KK: {inputtingBankActor.noKK}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block text-[10px] font-black px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-lg uppercase border border-amber-200 dark:border-amber-800">
                          {inputtingBankActor.kelurahan || "Kelurahan"}
                        </span>
                        {inputtingBankActor.kecamatan && (
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase">
                            Kec. {inputtingBankActor.kecamatan}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                        <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> Usaha & Kategori
                        </p>
                        <p className="font-black text-slate-900 dark:text-slate-100 uppercase text-sm">
                          {inputtingBankActor.businessName || "-"}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {inputtingBankActor.businessCategory || "Kategori Belum Ditentukan"}
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                        <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Alamat / Lokasi Usaha
                        </p>
                        <p className="font-medium text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
                          {inputtingBankActor.address || inputtingBankActor.businessLocation || "-"} {inputtingBankActor.rtRw ? `(RT/RW ${inputtingBankActor.rtRw})` : ""}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {inputtingBankActor.phone && (
                          <div className="bg-white dark:bg-slate-800/90 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            <span className="text-[9px] font-bold uppercase text-slate-400 block">No. HP / WhatsApp</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1 mt-0.5">
                              <MessageCircle className="w-3 h-3" /> {inputtingBankActor.phone}
                            </span>
                          </div>
                        )}
                        {inputtingBankActor.coordinator && (
                          <div className="bg-white dark:bg-slate-800/90 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            <span className="text-[9px] font-bold uppercase text-slate-400 block">Usulan / Koord</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase block truncate mt-0.5">
                              {inputtingBankActor.coordinator}
                            </span>
                          </div>
                        )}
                      </div>

                      {(inputtingBankActor as any).petugasSurvey && (
                        <div className="bg-white dark:bg-slate-800/90 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase text-slate-400">Petugas Survey:</span>
                          <span className="font-black text-emerald-700 dark:text-emerald-400 uppercase text-xs">
                            {(inputtingBankActor as any).petugasSurvey}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── KOLOM KANAN: FORM INPUT REKENING ── */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500">
                        <CreditCard className="w-3.5 h-3.5" /> Formulir Rekening Bank
                      </span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase">
                        Input Data Rekening
                      </h4>
                    </div>

                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                          Pilih Nama Bank <span className="text-rose-500">*</span>
                        </Label>
                        <Select name="bankName" defaultValue={inputtingBankActor.bankName || ""} required>
                          <SelectTrigger className="w-full h-11 font-bold text-sm bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700">
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
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-black uppercase text-amber-700 dark:text-amber-500 flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4" /> Nomor Rekening <span className="text-rose-500">*</span>
                          </Label>
                          <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded uppercase tracking-wide">
                            Ukuran Besar & Jelas
                          </span>
                        </div>
                        <Input
                          name="bankNumber"
                          defaultValue={inputtingBankActor.bankNumber}
                          placeholder="Contoh: 1234567890"
                          className="h-16 font-mono font-black tracking-widest text-slate-900 dark:text-slate-100 bg-amber-50/60 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-500 focus-visible:border-amber-500 focus-visible:ring-4 focus-visible:ring-amber-500/20 rounded-xl px-4 shadow-sm"
                          style={{ fontSize: "28px", fontWeight: "900", letterSpacing: "0.1em" }}
                          autoComplete="off"
                          spellCheck={false}
                          required
                          autoFocus
                        />
                        <p className="text-[11px] text-slate-500 font-medium">
                          Pastikan nomor rekening sesuai buku rekening/tabungan pelaku usaha.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                          Nama Pemilik Rekening <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          name="bankOwner"
                          defaultValue={inputtingBankActor.bankOwner || inputtingBankActor.fullName}
                          placeholder="Cth: BUDI SANTOSO"
                          className="h-11 font-bold uppercase text-sm bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus-visible:border-amber-500 rounded-xl px-3.5"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-semibold leading-relaxed flex items-start gap-2">
                      <span className="text-sm">⚠️</span>
                      <div>
                        <strong>PENTING:</strong> Setelah disimpan, status akan berubah menjadi <strong>Selesai (Rekening Bank)</strong>.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setInputtingBankActor(null)}>Batal</Button>
                <Button type="submit" disabled={isSubmittingBank} className="min-w-[170px] bg-amber-500 hover:bg-amber-600 text-white font-bold h-11">
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

