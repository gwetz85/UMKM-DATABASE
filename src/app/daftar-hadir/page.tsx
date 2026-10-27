"use client"

import React, { useState, useMemo, Suspense } from "react"
import Link from "next/link"
import { 
  useUser, 
  useDatabase, 
  useMemoFirebase, 
  useList, 
  useObject,
  updateDocumentNonBlocking 
} from "@/firebase"
import { ref, update } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
import { useToast } from "@/hooks/use-toast"
import { BusinessActor } from "../lib/types"
import { normalizeCoordinator } from "@/lib/coordinator-utils"
import { cn } from "@/lib/utils"

// UI Components
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { SidebarTrigger } from "@/components/ui/sidebar"

// Icons
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Copy,
  Printer,
  FileSpreadsheet,
  Users,
  UserCheck,
  Check,
  RotateCcw,
  Sparkles,
  Loader2,
  MapPin,
  Building2,
  HelpCircle,
  FileText,
  ArrowLeft
} from "lucide-react"

import ExcelJS from "exceljs"

// Tipe Status Kehadiran
export type AttendanceStatus = 'hadir' | 'belum_hadir' | 'izin' | 'sakit';

// Helper Penentu Data yang TERVERIFIKASI
export const isCancelDinas = (actorData: any): boolean => {
  if (!actorData) return false;
  const status = (actorData.status || "").toLowerCase();
  return (status === 'verified_dinas' && actorData.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(actorData.alasanCancelDinas);
};

export const isActorVerified = (actorData: any): boolean => {
  if (!actorData) return false;
  if (isCancelDinas(actorData)) return false;
  const status = (actorData.status || "").toLowerCase();
  // Hanya data yang telah melewati verifikasi resmi (Admin / Dinas / Pencairan / Finish)
  return ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(status);
};

export default function DaftarHadirPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <DaftarHadirContent />
    </Suspense>
  )
}

function DaftarHadirContent() {
  const { user, isUserLoading, userProfile } = useUser()
  const database = useDatabase()
  const { toast } = useToast()

  // 1. Role-Based Access Control (RBAC)
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  const roleStr = String(userProfile?.role || '').toLowerCase().trim()
  const isAdmin = !!adminRole || 
    (user?.email?.toLowerCase() === 'agus@umkm.id') || 
    roleStr === 'admin' || 
    roleStr === 'administrator' || 
    roleStr === 'superadmin'

  const isPetugasAbsensi = 
    roleStr === 'petugas_absensi' || 
    roleStr === 'petugas absensi' || 
    roleStr === 'absensi'

  // Akses diizinkan HANYA untuk Admin dan Petugas Absensi
  const isAuthorized = isAdmin || isPetugasAbsensi

  // 2. Fetch Real-time Business Actors Data
  const actorsQuery = useMemoFirebase(() => {
    if (!database || !user) return null
    return ref(database, 'businessActors')
  }, [database, user])

  const { data: rawActors, isLoading: isActorsLoading } = useList<BusinessActor>(actorsQuery)

  // 3. States Filter, Search, Tab, Pagination, Sensitive Data
  const [activeTab, setActiveTab] = useState<'semua' | 'hadir' | 'belum_hadir' | 'izin' | 'sakit'>('semua')
  const [searchQuery, setSearchQuery] = useState("")
  const [pageLimit, setPageLimit] = useState(50)

  // NIK Sensitive Data Protection State
  const [showAllNik, setShowAllNik] = useState(false)
  const [unmaskedNiks, setUnmaskedNiks] = useState<Record<string, boolean>>({})

  // Modal Dialogs State
  const [notesModalActor, setNotesModalActor] = useState<BusinessActor | null>(null)
  const [customStatus, setCustomStatus] = useState<AttendanceStatus>('hadir')
  const [customNotes, setCustomNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Batch action confirm dialogs
  const [showMarkAllDialog, setShowMarkAllDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)

  // Sensor NIK Masking Function
  const formatMaskedNik = (nik: string, actorId: string): string => {
    if (!nik) return "-"
    const cleanNik = nik.trim()
    const isUnmasked = showAllNik || !!unmaskedNiks[actorId]
    if (isUnmasked || cleanNik.length < 10) return cleanNik

    // Tampilkan 6 digit awal, 6 digit bintang sensor, 4 digit akhir
    return `${cleanNik.slice(0, 6)}******${cleanNik.slice(-4)}`
  }

  const toggleSingleNik = (actorId: string) => {
    setUnmaskedNiks(prev => ({
      ...prev,
      [actorId]: !prev[actorId]
    }))
  }

  const handleCopyNik = (nik: string) => {
    if (!nik) return
    navigator.clipboard.writeText(nik.trim())
    toast({
      title: "NIK Disalin",
      description: "Nomor Induk Kependudukan berhasil disalin ke clipboard."
    })
  }

  // Helper Format Waktu Indonesia
  const formatTimeIndo = (isoString?: string) => {
    if (!isoString) return "-"
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB"
    } catch {
      return "-"
    }
  }

  const formatDateTimeIndo = (isoString?: string) => {
    if (!isoString) return "-"
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      }) + " WIB"
    } catch {
      return "-"
    }
  }

  // 4. Update Attendance Real-Time Function
  const handleUpdateAttendance = async (
    actor: BusinessActor, 
    newStatus: AttendanceStatus, 
    notes: string = ""
  ) => {
    if (!database || !user) return
    setIsSubmitting(true)

    const officerName = userProfile?.fullName || user?.email || (isAdmin ? "Administrator" : "Petugas Absensi")
    const nowIso = new Date().toISOString()

    const updatePayload: any = {
      attendanceStatus: newStatus,
      attendanceUpdatedAt: nowIso,
      attendanceUpdatedBy: officerName,
    }

    if (notes.trim()) {
      updatePayload.attendanceNotes = notes.trim()
    } else if (newStatus === 'belum_hadir') {
      updatePayload.attendanceNotes = null
    }

    try {
      // 1. Update langsung ke node data pelaku usaha (Realtime trigger ke seluruh subscriber)
      const actorRef = ref(database, `businessActors/${actor.id}`)
      await update(actorRef, updatePayload)

      // 2. Simpan backup jejak audit ke node daftar_hadir
      const attendanceLogRef = ref(database, `daftar_hadir/${actor.id}`)
      await update(attendanceLogRef, {
        actorId: actor.id,
        fullName: actor.fullName,
        nik: actor.nik,
        businessName: actor.businessName || "",
        status: newStatus,
        notes: notes.trim() || null,
        updatedAt: nowIso,
        updatedBy: officerName,
      })

      // 3. Catat di Log Aktivitas Sistem
      logActivity({
        query: `ABSENSI: ${actor.fullName} -> ${newStatus.toUpperCase()}`,
        results: `Status berhasil diubah menjadi ${newStatus}`,
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'MODUL DAFTAR HADIR',
        userId: officerName
      })

      toast({
        title: newStatus === 'hadir' ? "Berhasil Hadir!" : "Presensi Diperbarui",
        description: `${actor.fullName} ditandai sebagai: ${
          newStatus === 'hadir' ? 'HADIR' : 
          newStatus === 'izin' ? 'IZIN' : 
          newStatus === 'sakit' ? 'SAKIT' : 'BELUM HADIR'
        }.`
      })
    } catch (error) {
      console.error("Gagal update presensi:", error)
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: "Terjadi kesalahan saat memperbarui status kehadiran."
      })
    } finally {
      setIsSubmitting(false)
      setNotesModalActor(null)
    }
  }

  // Quick 1-Click Toggle Hadir / Belum Hadir
  const handleQuickToggleHadir = (actor: BusinessActor) => {
    const current = ((actor as any).attendanceStatus || 'belum_hadir') as AttendanceStatus
    const nextStatus: AttendanceStatus = current === 'hadir' ? 'belum_hadir' : 'hadir'
    handleUpdateAttendance(actor, nextStatus, "")
  }

  // 5. Data Filter: HANYA MENAMPILKAN DATA YANG TERVERIFIKASI
  const verifiedActorsList = useMemo(() => {
    if (!rawActors) return []
    // Filter ketat: Hanya data yang statusnya lolos verifikasi resmi
    return rawActors.filter(a => a && isActorVerified(a))
  }, [rawActors])

  // Hitung jumlah per-kategori tab kehadiran
  const counts = useMemo(() => {
    let hadir = 0
    let belumHadir = 0
    let izin = 0
    let sakit = 0

    verifiedActorsList.forEach(a => {
      const st = ((a as any).attendanceStatus || 'belum_hadir') as AttendanceStatus
      if (st === 'hadir') hadir++
      else if (st === 'izin') izin++
      else if (st === 'sakit') sakit++
      else belumHadir++
    })

    return {
      semua: verifiedActorsList.length,
      hadir,
      belumHadir,
      izin,
      sakit
    }
  }, [verifiedActorsList])

  // Filter gabungan Tab Kehadiran & Search
  const filteredActors = useMemo(() => {
    return verifiedActorsList.filter(actor => {
      const attendance = ((actor as any).attendanceStatus || 'belum_hadir') as AttendanceStatus

      // Filter berdasarkan Tab yang dipilih (seperti Gambar 2)
      if (activeTab !== 'semua' && attendance !== activeTab) {
        return false
      }

      // Search Query (Nama, NIK, Nama Usaha, Kelurahan, Koordinator)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchName = (actor.fullName || "").toLowerCase().includes(query)
        const matchNik = (actor.nik || "").toLowerCase().includes(query)
        const matchBusiness = (actor.businessName || "").toLowerCase().includes(query)
        const matchKelurahan = (actor.kelurahan || "").toLowerCase().includes(query)
        const matchCoordinator = (actor.coordinator || "").toLowerCase().includes(query)

        if (!matchName && !matchNik && !matchBusiness && !matchKelurahan && !matchCoordinator) {
          return false
        }
      }

      return true
    })
  }, [verifiedActorsList, activeTab, searchQuery])

  // Batch Mark All Filtered as Hadir
  const executeBatchMarkHadir = async () => {
    if (!database || !user || filteredActors.length === 0) return
    setIsSubmitting(true)
    setShowMarkAllDialog(false)

    const officerName = userProfile?.fullName || user?.email || "Petugas Absensi"
    const nowIso = new Date().toISOString()
    let count = 0

    try {
      for (const actor of filteredActors) {
        const current = (actor as any).attendanceStatus
        if (current !== 'hadir') {
          const actorRef = ref(database, `businessActors/${actor.id}`)
          updateDocumentNonBlocking(actorRef, {
            attendanceStatus: 'hadir',
            attendanceUpdatedAt: nowIso,
            attendanceUpdatedBy: officerName
          })
          count++
        }
      }

      toast({
        title: "Presensi Massal Berhasil",
        description: `${count} pelaku usaha terverifikasi berhasil ditandai HADIR.`
      })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kendala saat update massal." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset All Attendance (Admin Only)
  const executeResetAttendance = async () => {
    if (!database || !user || !isAdmin) return
    setIsSubmitting(true)
    setShowResetDialog(false)

    try {
      for (const actor of verifiedActorsList) {
        const actorRef = ref(database, `businessActors/${actor.id}`)
        updateDocumentNonBlocking(actorRef, {
          attendanceStatus: 'belum_hadir',
          attendanceUpdatedAt: null,
          attendanceUpdatedBy: null,
          attendanceNotes: null
        })
      }

      toast({
        title: "Kehadiran Direset",
        description: "Seluruh status kehadiran berhasil dikembalikan ke BELUM HADIR."
      })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat reset." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Export to Excel Function
  const handleExportExcel = async () => {
    if (filteredActors.length === 0) {
      toast({ variant: "destructive", title: "Data Kosong", description: "Tidak ada data untuk diekspor." })
      return
    }

    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Daftar Hadir Terverifikasi")

      worksheet.pageSetup = {
        orientation: "landscape",
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
      }

      // Title rows
      worksheet.mergeCells("A1:H1")
      const titleCell = worksheet.getCell("A1")
      titleCell.value = "DAFTAR HADIR PELAKU USAHA TERVERIFIKASI DINAS KOPERASI DAN UKM"
      titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF0F172A" } }
      titleCell.alignment = { horizontal: "center", vertical: "middle" }

      worksheet.mergeCells("A2:H2")
      const subTitleCell = worksheet.getCell("A2")
      subTitleCell.value = `Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })} | Total: ${filteredActors.length} Pelaku Usaha Terverifikasi`
      subTitleCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } }
      subTitleCell.alignment = { horizontal: "center", vertical: "middle" }

      worksheet.addRow([])

      // Header Table
      const headerRow = worksheet.addRow([
        "NO",
        "NAMA LENGKAP",
        "NIK",
        "KATEGORI",
        "USAHA",
        "KOORDINATOR",
        "STATUS VERIFIKASI",
        "STATUS KEHADIRAN"
      ])

      headerRow.height = 28
      headerRow.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0284C7" } // Sky-600
        }
        cell.alignment = { vertical: "middle", horizontal: "center" }
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } }
        }
      })

      // Column widths
      worksheet.getColumn(1).width = 6
      worksheet.getColumn(2).width = 30
      worksheet.getColumn(3).width = 22
      worksheet.getColumn(4).width = 16
      worksheet.getColumn(5).width = 24
      worksheet.getColumn(6).width = 22
      worksheet.getColumn(7).width = 20
      worksheet.getColumn(8).width = 18

      // Rows Data
      filteredActors.forEach((actor, index) => {
        const attStatus = ((actor as any).attendanceStatus || 'belum_hadir').toUpperCase()

        const row = worksheet.addRow([
          index + 1,
          actor.fullName ? actor.fullName.toUpperCase() : "-",
          actor.nik ? `'${actor.nik.trim()}` : "-",
          actor.businessCategory || "-",
          actor.businessName || "-",
          normalizeCoordinator(actor.coordinator),
          formatVerificationLabel(actor.status),
          attStatus === 'HADIR' ? 'HADIR' : attStatus === 'IZIN' ? 'IZIN' : attStatus === 'SAKIT' ? 'SAKIT' : 'BELUM HADIR'
        ])

        row.height = 22
        row.eachCell((cell, colIndex) => {
          cell.font = { name: "Arial", size: 9 }
          cell.alignment = { 
            vertical: "middle", 
            horizontal: colIndex === 1 || colIndex === 3 || colIndex === 7 || colIndex === 8 ? "center" : "left" 
          }
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } }
          }
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `DAFTAR_HADIR_TERVERIFIKASI_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Ekspor Berhasil",
        description: "File Excel Daftar Hadir Terverifikasi berhasil diunduh."
      })
    } catch (err) {
      console.error(err)
      toast({ variant: "destructive", title: "Gagal Ekspor", description: "Terjadi kesalahan saat membuat file Excel." })
    }
  }

  // Print Function
  const handlePrint = () => {
    window.print()
  }

  // Loading screen
  if (isUserLoading || isAdminLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  // 6. Security Check / Access Denied Screen (RBAC)
  if (!isAuthorized) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-destructive/20 shadow-xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden text-center p-8 space-y-5">
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 dark:bg-destructive/20 flex items-center justify-center text-destructive">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-destructive uppercase bg-destructive/10 px-2.5 py-1 rounded-full">
              AKSES DITOLAK (403)
            </span>
            <h1 className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-100">
              Akses Terbatas
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Modul <strong className="text-primary font-bold">Daftar Hadir</strong> ini memiliki proteksi ketat dan hanya dapat diakses oleh Administrator dan Petugas Absensi.
            </p>
          </div>
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            className="w-full bg-primary hover:bg-primary/90 font-bold"
          >
            Kembali ke Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return (
    // ─── TAMPILAN FULL PANEL PERSIS SEPERTI GAMBAR 2 (EDGE TO EDGE) ───
    <div className="p-4 md:p-8 space-y-6 w-full">
      
      {/* ─── Tombol Kembali ke Dashboard (Persis Seperti Gambar 2) ─── */}
      <div className="print:hidden">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      {/* ─── Header & Toolbar Menyatu Satu Baris (Persis Layout Gambar 2) ─── */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        
        {/* Sisi Kiri: SidebarTrigger + Judul + Subtitle */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 font-headline tracking-tight">
              Daftar Hadir
            </h1>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs uppercase font-black tracking-widest">
            Presensi & Kehadiran Pelaku Usaha Terverifikasi
          </p>
        </div>

        {/* Sisi Tengah: Tab Pills Kehadiran (Persis Seperti Tab Gambar 2) */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl w-full xl:w-auto overflow-x-auto shadow-2xs">
          {[
            { id: 'semua', label: 'Semua', count: counts.semua },
            { id: 'hadir', label: 'Hadir', count: counts.hadir },
            { id: 'belum_hadir', label: 'Belum Hadir', count: counts.belumHadir },
            { id: 'izin', label: 'Izin', count: counts.izin },
            { id: 'sakit', label: 'Sakit', count: counts.sakit }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any)
                setPageLimit(50)
              }}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-white dark:bg-zinc-900 text-primary shadow-xs" 
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                activeTab === tab.id 
                  ? "bg-primary text-white" 
                  : "bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-slate-300"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Sisi Kanan: Search Bar & Tombol Aksi */}
        <div className="flex items-center gap-2.5 w-full xl:w-auto flex-wrap">
          {/* Input Search seperti Gambar 2 */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Cari..."
              className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 pl-9 text-xs text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tombol Cetak Presensi */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-10 px-3 text-xs font-bold border-slate-300 dark:border-zinc-700 gap-1.5 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </Button>

          {/* Tombol Ekspor Excel */}
          <Button
            size="sm"
            onClick={handleExportExcel}
            className="h-10 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor</span>
          </Button>

          {/* Tombol Buka/Tutup Sensor NIK Global */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAllNik(!showAllNik)}
            className={cn(
              "h-10 px-3 text-xs font-bold gap-1.5 shadow-2xs",
              showAllNik 
                ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700" 
                : "border-slate-300 dark:border-zinc-700"
            )}
            title="Buka / Sensor Semua NIK"
          >
            {showAllNik ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{showAllNik ? "Sensor NIK" : "Buka NIK"}</span>
          </Button>

          {/* Batch Mark All */}
          <Button
            type="button"
            size="sm"
            onClick={() => setShowMarkAllDialog(true)}
            disabled={filteredActors.length === 0 || isSubmitting}
            className="h-10 px-3 text-xs font-bold bg-primary hover:bg-primary/90 text-white gap-1.5 shadow-2xs"
            title="Tandai Hadir Semua Yang Tampil"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hadir Semua ({filteredActors.length})</span>
          </Button>

          {/* Reset Kehadiran (Khusus Admin) */}
          {isAdmin && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowResetDialog(true)}
              disabled={isSubmitting}
              className="h-10 w-10 text-destructive hover:bg-destructive/10"
              title="Reset seluruh presensi"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ─── Header Resmi Dokumen Saat Dicetak (Print Only) ─── */}
      <div className="hidden print:block text-center pb-4 mb-4 border-b-2 border-black">
        <h2 className="text-base font-black uppercase tracking-wider">PEMERINTAH KOTA TANJUNGPINANG</h2>
        <h3 className="text-lg font-black uppercase tracking-wider">DINAS KOPERASI DAN USAHA KECIL MENENGAH</h3>
        <p className="text-xs text-slate-600">Sistem Informasi Manajemen Pelaku Usaha (SIMPU) • Lembar Daftar Hadir</p>
        <div className="mt-2 text-xs font-bold uppercase underline">
          DAFTAR HADIR PESERTA / PELAKU USAHA TERVERIFIKASI
        </div>
        <p className="text-[10px] text-slate-500 mt-1">Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
      </div>

      {/* ─── TABEL UTAMA: TAMPILAN FULL PANEL PERSIS SEPERTI GAMBAR 2 ─── */}
      <Card className="border border-slate-200/60 dark:border-zinc-800 shadow-md overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl w-full">
        <CardContent className="p-0">
          {isActorsLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                Memuat data presensi pelaku usaha terverifikasi...
              </p>
            </div>
          ) : filteredActors.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground text-xs font-bold uppercase tracking-wider">
              Tidak ada data pelaku usaha terverifikasi pada kategori ini.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="w-full">
                {/* Header Tabel Persis Desain Gambar 2 */}
                <TableHeader className="bg-muted/30 dark:bg-zinc-800/40">
                  <TableRow className="border-b border-slate-200 dark:border-zinc-800">
                    <TableHead className="w-12 text-center font-bold text-xs uppercase py-3.5 pl-4">No</TableHead>
                    <TableHead className="min-w-[180px] font-bold text-xs uppercase py-3.5">Nama Lengkap</TableHead>
                    <TableHead className="min-w-[150px] font-bold text-xs uppercase py-3.5 text-center">NIK</TableHead>
                    <TableHead className="min-w-[120px] font-bold text-xs uppercase py-3.5 text-center">Kategori</TableHead>
                    <TableHead className="min-w-[180px] font-bold text-xs uppercase py-3.5">Usaha</TableHead>
                    <TableHead className="min-w-[160px] font-bold text-xs uppercase py-3.5">Koordinator</TableHead>
                    <TableHead className="min-w-[150px] font-bold text-xs uppercase py-3.5 text-center">Status Verifikasi</TableHead>
                    <TableHead className="min-w-[140px] font-bold text-xs uppercase py-3.5 text-center">Kehadiran</TableHead>
                    <TableHead className="min-w-[160px] font-bold text-xs uppercase py-3.5 text-center print:hidden">Waktu & Petugas</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase py-3.5 pr-6 print:hidden">Aksi</TableHead>
                    <TableHead className="w-32 font-bold text-xs uppercase py-3.5 text-center hidden print:table-cell">Tanda Tangan</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredActors.slice(0, pageLimit).map((actor, index) => {
                    const attStatus = ((actor as any).attendanceStatus || 'belum_hadir') as AttendanceStatus
                    const isHadir = attStatus === 'hadir'
                    const officer = (actor as any).attendanceUpdatedBy
                    const time = (actor as any).attendanceUpdatedAt
                    const notes = (actor as any).attendanceNotes

                    return (
                      <TableRow 
                        key={actor.id} 
                        className={cn(
                          "hover:bg-primary/5 transition-colors border-b border-slate-100 dark:border-zinc-800/70",
                          isHadir && "bg-emerald-50/20 dark:bg-emerald-950/15"
                        )}
                      >
                        {/* 1. Nomor Urut */}
                        <TableCell className="py-3.5 pl-4 text-center font-bold text-xs text-slate-500">
                          {index + 1}
                        </TableCell>

                        {/* 2. Nama Lengkap Pelaku Usaha */}
                        <TableCell className="py-3.5 font-bold text-slate-900 dark:text-slate-100 uppercase text-xs sm:text-sm">
                          {actor.fullName || "-"}
                        </TableCell>

                        {/* 3. NIK dengan Proteksi Data Sensitif */}
                        <TableCell className="py-3.5 text-center font-mono text-xs">
                          <div className="inline-flex items-center gap-1 bg-slate-100/80 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-zinc-700">
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {formatMaskedNik(actor.nik, actor.id)}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleSingleNik(actor.id)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors print:hidden"
                              title={unmaskedNiks[actor.id] ? "Sensor NIK" : "Buka Sensor NIK"}
                            >
                              {unmaskedNiks[actor.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyNik(actor.nik)}
                              className="p-1 rounded text-slate-400 hover:text-primary transition-colors print:hidden"
                              title="Salin NIK"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </TableCell>

                        {/* 4. Kategori Usaha (Persis Gaya Gambar 2) */}
                        <TableCell className="py-3.5 text-center">
                          <span className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider">
                            {actor.businessCategory || "-"}
                          </span>
                        </TableCell>

                        {/* 5. Usaha */}
                        <TableCell className="py-3.5">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase">
                              {actor.businessName || "-"}
                            </p>
                            {actor.kelurahan && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5 inline" /> {actor.kelurahan}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* 6. Koordinator */}
                        <TableCell className="py-3.5 font-bold text-xs uppercase text-slate-700 dark:text-slate-300">
                          {normalizeCoordinator(actor.coordinator)}
                        </TableCell>

                        {/* 7. Status Verifikasi */}
                        <TableCell className="py-3.5 text-center">
                          <VerificationBadge status={actor.status} />
                        </TableCell>

                        {/* 8. Kehadiran (Interactive Badge & Realtime Toggle) */}
                        <TableCell className="py-3.5 text-center">
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleQuickToggleHadir(actor)}
                              className="focus:outline-hidden transition-transform active:scale-95 print:pointer-events-none cursor-pointer"
                              title="Klik untuk mengubah Hadir/Belum Hadir"
                            >
                              <AttendanceBadge status={attStatus} />
                            </button>
                            {notes && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 italic max-w-[130px] truncate" title={notes}>
                                Ket: {notes}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* 9. Waktu & Petugas Presensi */}
                        <TableCell className="py-3.5 text-center print:hidden">
                          {time ? (
                            <div className="flex flex-col items-center text-[11px]">
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {formatTimeIndo(time)}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[140px]" title={officer}>
                                {officer || "Petugas"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </TableCell>

                        {/* 10. Aksi (Persis Posisi Gambar 2) */}
                        <TableCell className="text-right py-3.5 pr-6 print:hidden">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Tombol Quick 1-Click Hadir / Batal */}
                            <Button
                              size="sm"
                              variant={isHadir ? "outline" : "default"}
                              onClick={() => handleQuickToggleHadir(actor)}
                              className={cn(
                                "h-7 px-2.5 text-xs font-bold gap-1 rounded-lg",
                                isHadir 
                                  ? "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:text-slate-300 dark:hover:bg-zinc-800"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              )}
                            >
                              {isHadir ? (
                                <>
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Batal</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Hadir</span>
                                </>
                              )}
                            </Button>

                            {/* Tombol Opsi Detail & Catatan */}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setNotesModalActor(actor)
                                setCustomStatus(attStatus)
                                setCustomNotes(notes || "")
                              }}
                              className="h-7 w-7 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                              title="Atur Catatan & Opsi Kehadiran"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>

                        {/* Kolom Tanda Tangan Cetak (Print View Only) */}
                        <TableCell className="py-3.5 text-center hidden print:table-cell text-xs text-slate-400 border border-black h-12">
                          {isHadir ? "HADIR" : "................"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination / Tampilkan Lebih Banyak Data */}
          {filteredActors.length > pageLimit && (
            <div className="p-4 flex justify-center border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 print:hidden">
              <Button
                variant="outline"
                onClick={() => setPageLimit(prev => prev + 50)}
                className="text-xs font-bold border-primary text-primary hover:bg-primary/10"
              >
                Tampilkan 50 Data Lagi (Menampilkan {Math.min(pageLimit, filteredActors.length)} dari {filteredActors.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── MODAL DIALOG: UBAH STATUS KEHADIRAN & CATATAN ─── */}
      <Dialog open={!!notesModalActor} onOpenChange={(open) => { if (!open) setNotesModalActor(null) }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary font-black uppercase text-base flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" /> Presensi Pelaku Usaha
            </DialogTitle>
            <DialogDescription>
              Atur status kehadiran dan catatan untuk <strong className="text-slate-900 dark:text-slate-100">{notesModalActor?.fullName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Status Kehadiran</label>
              <Select value={customStatus} onValueChange={(val) => setCustomStatus(val as AttendanceStatus)}>
                <SelectTrigger className="font-semibold text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hadir">Hadir (Terverifikasi di Lokasi)</SelectItem>
                  <SelectItem value="belum_hadir">Belum Hadir</SelectItem>
                  <SelectItem value="izin">Izin (Ada Pemberitahuan)</SelectItem>
                  <SelectItem value="sakit">Sakit (Keterangan Medis)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Catatan Khusus (Opsional)</label>
              <Textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Contoh: Diwakili istri, terlambat karena dinas luar, ada surat izin, dll."
                className="text-xs sm:text-sm min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNotesModalActor(null)}
              className="w-full sm:w-auto font-bold text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (notesModalActor) {
                  handleUpdateAttendance(notesModalActor, customStatus, customNotes)
                }
              }}
              className="w-full sm:w-auto font-bold text-xs bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Simpan Presensi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CONFIRM DIALOG: TANDAI HADIR SEMUA ─── */}
      <ConfirmDialog
        open={showMarkAllDialog}
        onOpenChange={setShowMarkAllDialog}
        title="Tandai Hadir Seluruh Data Terfilter"
        description={`Apakah Anda yakin ingin menandai ${filteredActors.length} pelaku usaha terverifikasi sebagai HADIR secara bersamaan?`}
        onConfirm={executeBatchMarkHadir}
        confirmText="Ya, Tandai Hadir"
        variant="default"
        icon={<CheckCircle2 className="w-8 h-8 text-emerald-600" />}
      />

      {/* ─── CONFIRM DIALOG: RESET KEHADIRAN ─── */}
      <ConfirmDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        title="Reset Seluruh Presensi"
        description="Apakah Anda yakin ingin mereset seluruh status kehadiran ke 'BELUM HADIR'? Tindakan ini akan mengosongkan seluruh riwayat presensi hari ini."
        onConfirm={executeResetAttendance}
        confirmText="Ya, Reset Semua"
        variant="destructive"
        icon={<RotateCcw className="w-8 h-8 text-destructive" />}
      />

    </div>
  )
}

// ─── Sub-Komponen Badge Status Kehadiran Berkualitas Kontras Tinggi ───
function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  switch (status) {
    case 'hadir':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
          <CheckCircle2 className="w-3.5 h-3.5" />
          Hadir
        </span>
      )
    case 'izin':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700 shadow-2xs">
          <Clock className="w-3.5 h-3.5" />
          Izin
        </span>
      )
    case 'sakit':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-950 border border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-700 shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          Sakit
        </span>
      )
    case 'belum_hadir':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-zinc-800 dark:text-slate-300 dark:border-zinc-700 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Belum Hadir
        </span>
      )
  }
}

// ─── Sub-Komponen Badge Status Verifikasi Pelaku Usaha ───
function VerificationBadge({ status }: { status?: string }) {
  const st = (status || 'pending').toLowerCase()

  if (st === 'verified_dinas') {
    return (
      <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700 text-[10px] font-bold uppercase gap-1">
        <CheckCircle2 className="w-3 h-3" /> Verifikasi Dinas
      </Badge>
    )
  }

  if (st === 'verified_actor') {
    return (
      <Badge className="bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700 text-[10px] font-bold uppercase gap-1">
        <ShieldCheck className="w-3 h-3" /> Verifikasi Admin
      </Badge>
    )
  }

  if (st === 'finish') {
    return (
      <Badge className="bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-700 text-[10px] font-bold uppercase gap-1">
        <CheckCircle2 className="w-3 h-3" /> Selesai
      </Badge>
    )
  }

  if (st === 'bank_pending') {
    return (
      <Badge className="bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-700 text-[10px] font-bold uppercase gap-1">
        <Building2 className="w-3 h-3" /> Rekening Bank
      </Badge>
    )
  }

  if (st === 'lpj_pending') {
    return (
      <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-700 text-[10px] font-bold uppercase gap-1">
        <FileText className="w-3 h-3" /> Tahap LPJ
      </Badge>
    )
  }

  return (
    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700 text-[10px] font-bold uppercase gap-1">
      <CheckCircle2 className="w-3 h-3" /> Terverifikasi
    </Badge>
  )
}

function formatVerificationLabel(status?: string): string {
  const st = (status || '').toLowerCase()
  if (st === 'verified_dinas') return 'Terverifikasi Dinas'
  if (st === 'verified_actor') return 'Terverifikasi Admin'
  if (st === 'finish') return 'Selesai'
  if (st === 'bank_pending') return 'Pencairan Bank'
  if (st === 'lpj_pending') return 'Tahap LPJ'
  return 'Terverifikasi'
}
