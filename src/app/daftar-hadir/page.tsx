"use client"

import React, { useState, useMemo, Suspense } from "react"
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
import { Input } from "@/components/ui/input"
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
  ArrowUpDown,
  Filter,
  Loader2,
  MapPin,
  Calendar,
  Building2,
  HelpCircle,
  FileText
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
  // Hanya status yang telah melewati verifikasi resmi (Admin / Dinas / Pencairan / Finish)
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

  // 3. States Filter, Search, Pagination, Sensitive Data
  const [searchQuery, setSearchQuery] = useState("")
  const [filterAttendance, setFilterAttendance] = useState<string>("semua")
  const [filterVerification, setFilterVerification] = useState<string>("semua")
  const [filterKelurahan, setFilterKelurahan] = useState<string>("semua")
  const [pageLimit, setPageLimit] = useState(50)

  // NIK Sensitive Data Protection State
  const [showAllNik, setShowAllNik] = useState(false)
  const [unmaskedNiks, setUnmaskedNiks] = useState<Record<string, boolean>>({})

  // Modal Dialogs State
  const [detailModalActor, setDetailModalActor] = useState<BusinessActor | null>(null)
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
      description: "Nomor Induk Kependudukan berhasil disalin ke clipboard secara aman."
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
        description: "Terjadi kesalahan saat memperbarui status kehadiran. Silakan coba lagi."
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

  // Extract unique Kelurahan list dari data terverifikasi
  const uniqueKelurahanList = useMemo(() => {
    const setKel = new Set<string>()
    verifiedActorsList.forEach(a => {
      if (a.kelurahan) setKel.add(a.kelurahan.trim())
    })
    return Array.from(setKel).sort()
  }, [verifiedActorsList])

  const filteredActors = useMemo(() => {
    return verifiedActorsList.filter(actor => {
      const attendance = ((actor as any).attendanceStatus || 'belum_hadir') as AttendanceStatus
      const verification = (actor.status || '').toLowerCase()

      // Filter Kehadiran
      if (filterAttendance !== "semua" && attendance !== filterAttendance) {
        return false
      }

      // Filter Verifikasi Khusus Data Terverifikasi
      if (filterVerification !== "semua") {
        if (filterVerification === 'verified_dinas' && verification !== 'verified_dinas') return false;
        if (filterVerification === 'verified_actor' && verification !== 'verified_actor') return false;
        if (filterVerification === 'finish' && verification !== 'finish') return false;
        if (filterVerification === 'bank_pending' && verification !== 'bank_pending') return false;
        if (filterVerification === 'lpj_pending' && verification !== 'lpj_pending') return false;
      }

      // Filter Kelurahan
      if (filterKelurahan !== "semua" && (actor.kelurahan || '').trim() !== filterKelurahan) {
        return false
      }

      // Search Query (Nama, NIK, Nama Usaha, Kelurahan, Petugas)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchName = (actor.fullName || "").toLowerCase().includes(query)
        const matchNik = (actor.nik || "").toLowerCase().includes(query)
        const matchBusiness = (actor.businessName || "").toLowerCase().includes(query)
        const matchKelurahan = (actor.kelurahan || "").toLowerCase().includes(query)
        const matchPetugas = (actor.petugasSurvey || "").toLowerCase().includes(query)
        const matchCoordinator = (actor.coordinator || "").toLowerCase().includes(query)

        if (!matchName && !matchNik && !matchBusiness && !matchKelurahan && !matchPetugas && !matchCoordinator) {
          return false
        }
      }

      return true
    })
  }, [verifiedActorsList, searchQuery, filterAttendance, filterVerification, filterKelurahan])

  // Real-time Summary Statistics (Berdasarkan Data Terverifikasi)
  const statistics = useMemo(() => {
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

    const total = verifiedActorsList.length
    const percentageHadir = total > 0 ? Math.round((hadir / total) * 100) : 0

    return { total, hadir, belumHadir, izin, sakit, percentageHadir }
  }, [verifiedActorsList])

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
      worksheet.mergeCells("A1:G1")
      const titleCell = worksheet.getCell("A1")
      titleCell.value = "DAFTAR HADIR PELAKU USAHA TERVERIFIKASI DINAS KOPERASI DAN UKM"
      titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF0F172A" } }
      titleCell.alignment = { horizontal: "center", vertical: "middle" }

      worksheet.mergeCells("A2:G2")
      const subTitleCell = worksheet.getCell("A2")
      subTitleCell.value = `Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })} | Total: ${filteredActors.length} Pelaku Usaha Terverifikasi`
      subTitleCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } }
      subTitleCell.alignment = { horizontal: "center", vertical: "middle" }

      worksheet.addRow([])

      // Header Table
      const headerRow = worksheet.addRow([
        "NO",
        "NAMA PELAKU USAHA",
        "NIK",
        "KELURAHAN / KECAMATAN",
        "STATUS VERIFIKASI",
        "STATUS KEHADIRAN",
        "WAKTU & PETUGAS PRESENSI"
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
      worksheet.getColumn(2).width = 32
      worksheet.getColumn(3).width = 22
      worksheet.getColumn(4).width = 24
      worksheet.getColumn(5).width = 22
      worksheet.getColumn(6).width = 18
      worksheet.getColumn(7).width = 30

      // Rows Data
      filteredActors.forEach((actor, index) => {
        const attStatus = ((actor as any).attendanceStatus || 'belum_hadir').toUpperCase()
        const officer = (actor as any).attendanceUpdatedBy || "-"
        const time = formatDateTimeIndo((actor as any).attendanceUpdatedAt)
        const auditStr = attStatus === 'BELUM_HADIR' ? "-" : `${time} (Oleh: ${officer})`

        const row = worksheet.addRow([
          index + 1,
          actor.fullName ? actor.fullName.toUpperCase() : "-",
          actor.nik ? `'${actor.nik.trim()}` : "-",
          `${actor.kelurahan || '-'} / ${actor.kecamatan || '-'}`,
          formatVerificationLabel(actor.status),
          attStatus === 'HADIR' ? 'HADIR' : attStatus === 'IZIN' ? 'IZIN' : attStatus === 'SAKIT' ? 'SAKIT' : 'BELUM HADIR',
          auditStr
        ])

        row.height = 22
        row.eachCell((cell, colIndex) => {
          cell.font = { name: "Arial", size: 9 }
          cell.alignment = { 
            vertical: "middle", 
            horizontal: colIndex === 1 || colIndex === 3 || colIndex === 5 || colIndex === 6 ? "center" : "left" 
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
              Modul <strong className="text-primary font-bold">Daftar Hadir</strong> ini memiliki proteksi ketat dan hanya dapat diakses oleh pengguna dengan hak akses:
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20">Administrator</Badge>
              <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20">Petugas Absensi</Badge>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700">
            <div className="flex justify-between py-1">
              <span>Akun Anda:</span>
              <span className="font-bold">{userProfile?.fullName || user?.email}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-200/60 dark:border-zinc-700">
              <span>Peran (Role):</span>
              <span className="font-mono font-bold uppercase text-amber-600 dark:text-amber-400">
                {userProfile?.role || 'Umum'}
              </span>
            </div>
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
    // ─── TAMPILAN FULL PANEL: 100% LEBAR LAYAR, RESPONSIF PENUH ───
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* ─── Header Halaman (Screen View) ─── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight font-headline">
                    Daftar Hadir
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Khusus Data Terverifikasi
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Presensi & Kehadiran Seluruh Pelaku Usaha Terverifikasi Real-Time (Tampilan Penuh)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Header: Cetak & Ekspor Excel */}
        <div className="flex items-center gap-2.5 flex-wrap self-stretch sm:self-auto">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="border-slate-300 dark:border-zinc-700 font-bold text-xs gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" /> Cetak Presensi
          </Button>

          <Button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" /> Ekspor Excel
          </Button>
        </div>
      </header>

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

      {/* ─── Bento Stat Cards: Real-time Attendance Metrics (Full Width) ─── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full print:hidden">
        {/* Card 1: Total Pelaku Usaha Terverifikasi */}
        <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Terverifikasi</p>
              <h3 className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-50">{statistics.total}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Data Lolos Verifikasi</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Hadir */}
        <Card className="border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-3xl shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Total Hadir</p>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100 rounded-full">
                  {statistics.percentageHadir}%
                </span>
              </div>
              <h3 className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-400">{statistics.hadir}</h3>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400/80 mt-0.5">Telah terverifikasi hadir</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Belum Hadir */}
        <Card className="border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Belum Hadir</p>
              <h3 className="mt-1 text-2xl font-black text-slate-700 dark:text-slate-300">{statistics.belumHadir}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Menunggu konfirmasi</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Izin / Sakit */}
        <Card className="border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 rounded-3xl shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Izin / Sakit</p>
              <h3 className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-400">{statistics.izin + statistics.sakit}</h3>
              <p className="text-[10px] text-amber-600 dark:text-amber-400/80 mt-0.5">
                Izin: {statistics.izin} • Sakit: {statistics.sakit}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
              <HelpCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ─── Search, Filters & NIK Security Control (Full Width) ─── */}
      <section className="w-full p-4 sm:p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-xs space-y-4 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Input Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nama, NIK, Usaha, Wilayah..."
              className="pl-9 text-xs sm:text-sm font-medium"
            />
          </div>

          {/* Filter Status Kehadiran */}
          <div>
            <Select value={filterAttendance} onValueChange={setFilterAttendance}>
              <SelectTrigger className="text-xs sm:text-sm font-medium">
                <SelectValue placeholder="Status Kehadiran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Kehadiran</SelectItem>
                <SelectItem value="hadir">Hadir ({statistics.hadir})</SelectItem>
                <SelectItem value="belum_hadir">Belum Hadir ({statistics.belumHadir})</SelectItem>
                <SelectItem value="izin">Izin ({statistics.izin})</SelectItem>
                <SelectItem value="sakit">Sakit ({statistics.sakit})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Status Verifikasi (Hanya Menampilkan Pilihan Terverifikasi) */}
          <div>
            <Select value={filterVerification} onValueChange={setFilterVerification}>
              <SelectTrigger className="text-xs sm:text-sm font-medium">
                <SelectValue placeholder="Tahap Verifikasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Data Terverifikasi</SelectItem>
                <SelectItem value="finish">Selesai (Finish)</SelectItem>
                <SelectItem value="verified_dinas">Terverifikasi Dinas</SelectItem>
                <SelectItem value="verified_actor">Terverifikasi Admin</SelectItem>
                <SelectItem value="bank_pending">Pencairan Bank</SelectItem>
                <SelectItem value="lpj_pending">Tahap LPJ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Kelurahan */}
          <div>
            <Select value={filterKelurahan} onValueChange={setFilterKelurahan}>
              <SelectTrigger className="text-xs sm:text-sm font-medium">
                <SelectValue placeholder="Kelurahan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Kelurahan</SelectItem>
                {uniqueKelurahanList.map(kel => (
                  <SelectItem key={kel} value={kel}>{kel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Toolbar Baris Kedua: NIK Privacy Protection & Batch Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800 text-xs">
          
          {/* Fitur Proteksi Data Sensitif (Sensor NIK) */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Proteksi Data NIK:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAllNik(!showAllNik)}
              className={`h-7 px-2.5 text-xs font-bold gap-1 transition-all ${
                showAllNik 
                  ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700" 
                  : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-slate-200"
              }`}
            >
              {showAllNik ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showAllNik ? "Sensor NIK Aktifkan" : "Buka Semua Sensor NIK"}
            </Button>
            <span className="text-[10px] text-slate-400 hidden md:inline">
              (NIK terlindungi secara otomatis)
            </span>
          </div>

          {/* Tombol Aksi Massal */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMarkAllDialog(true)}
              disabled={filteredActors.length === 0 || isSubmitting}
              className="h-7 px-3 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950/50 gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Tandai Hadir Semua ({filteredActors.length})
            </Button>

            {isAdmin && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowResetDialog(true)}
                disabled={isSubmitting}
                className="h-7 px-2 text-xs font-bold text-destructive hover:bg-destructive/10 gap-1"
                title="Reset seluruh status kehadiran"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Kehadiran
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ─── TABEL UTAMA: DAFTAR HADIR REAL-TIME (TAMPILAN FULL PANEL) ─── */}
      <section className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-xs overflow-hidden">
        {isActorsLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-slate-500 font-medium">Memuat data presensi pelaku usaha terverifikasi...</p>
          </div>
        ) : filteredActors.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">Tidak ada data pelaku usaha terverifikasi ditemukan</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-slate-100/90 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800">
                  <TableHead className="w-14 text-center font-black text-xs uppercase py-3.5 pl-4">No</TableHead>
                  <TableHead className="min-w-[220px] font-black text-xs uppercase py-3.5">Nama Pelaku Usaha</TableHead>
                  <TableHead className="min-w-[180px] font-black text-xs uppercase py-3.5 text-center">NIK (Sensitif)</TableHead>
                  <TableHead className="min-w-[160px] font-black text-xs uppercase py-3.5 text-center">Status Verifikasi</TableHead>
                  <TableHead className="min-w-[160px] font-black text-xs uppercase py-3.5 text-center">Kehadiran (Presensi)</TableHead>
                  <TableHead className="min-w-[180px] font-black text-xs uppercase py-3.5 text-center print:hidden">Waktu & Petugas</TableHead>
                  <TableHead className="min-w-[130px] font-black text-xs uppercase py-3.5 text-center print:hidden">Aksi</TableHead>
                  <TableHead className="w-36 font-black text-xs uppercase py-3.5 text-center hidden print:table-cell">Tanda Tangan</TableHead>
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
                      className={`transition-colors border-b border-slate-100 dark:border-zinc-800/80 ${
                        isHadir ? "bg-emerald-50/20 dark:bg-emerald-950/10" : ""
                      }`}
                    >
                      {/* Kolom 1: Nomor Urut */}
                      <TableCell className="py-3.5 pl-4 text-center font-bold text-xs text-slate-600 dark:text-slate-400">
                        {index + 1}
                      </TableCell>

                      {/* Kolom 2: Nama Pelaku Usaha & Detail Usaha */}
                      <TableCell className="py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                            {actor.fullName || "-"}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                            {actor.businessName && (
                              <span className="font-semibold text-primary truncate max-w-[200px]">
                                {actor.businessName}
                              </span>
                            )}
                            {actor.kelurahan && (
                              <span className="inline-flex items-center gap-0.5 text-slate-400">
                                • <MapPin className="w-2.5 h-2.5 inline" /> {actor.kelurahan}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Kolom 3: NIK Terproteksi (Sensitive Data Protection) */}
                      <TableCell className="py-3.5 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100/80 dark:bg-zinc-800/80 px-2 py-1 rounded-lg border border-slate-200/80 dark:border-zinc-700">
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                            {formatMaskedNik(actor.nik, actor.id)}
                          </span>
                          
                          {/* Tombol Buka/Tutup Sensor Baris */}
                          <button
                            type="button"
                            onClick={() => toggleSingleNik(actor.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors print:hidden"
                            title={unmaskedNiks[actor.id] ? "Sensor NIK" : "Buka Sensor NIK"}
                          >
                            {unmaskedNiks[actor.id] ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </button>

                          {/* Tombol Copy NIK */}
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

                      {/* Kolom 4: Status Verifikasi Pelaku Usaha */}
                      <TableCell className="py-3.5 text-center">
                        <VerificationBadge status={actor.status} />
                      </TableCell>

                      {/* Kolom 5: Status Kehadiran Interaktif (Real-time Toggle) */}
                      <TableCell className="py-3.5 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickToggleHadir(actor)}
                            className="focus:outline-hidden transition-transform active:scale-95 print:pointer-events-none"
                            title="Klik untuk mengubah status Hadir/Belum Hadir"
                          >
                            <AttendanceBadge status={attStatus} />
                          </button>
                          
                          {notes && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 italic max-w-[140px] truncate" title={notes}>
                              Ket: {notes}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Kolom 6: Waktu & Petugas Presensi (Audit Trail) */}
                      <TableCell className="py-3.5 text-center print:hidden">
                        {time ? (
                          <div className="flex flex-col items-center text-[11px] text-slate-600 dark:text-slate-300">
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {formatTimeIndo(time)}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[150px]" title={officer}>
                              Oleh: {officer || "Petugas"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>

                      {/* Kolom 7: Tombol Aksi Lengkap / Catatan */}
                      <TableCell className="py-3.5 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Tombol 1-Click Quick Toggle */}
                          <Button
                            size="sm"
                            variant={isHadir ? "outline" : "default"}
                            onClick={() => handleQuickToggleHadir(actor)}
                            className={`h-7 px-2.5 text-xs font-bold gap-1 shadow-2xs ${
                              isHadir 
                                ? "text-slate-600 border-slate-300 hover:bg-slate-100 dark:border-zinc-700 dark:text-slate-300 dark:hover:bg-zinc-800"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
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

                          {/* Tombol Buka Menu Opsi Kehadiran (Izin/Sakit/Catatan) */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setNotesModalActor(actor)
                              setCustomStatus(attStatus)
                              setCustomNotes(notes || "")
                            }}
                            className="h-7 w-7 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            title="Opsi Kehadiran & Catatan"
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

        {/* Pagination / Tampilkan Lebih Banyak */}
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
      </section>

      {/* ─── MODAL DIALOG: UBAH STATUS KEHADIRAN & CATATAN ─── */}
      <Dialog open={!!notesModalActor} onOpenChange={(open) => { if (!open) setNotesModalActor(null) }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary font-black uppercase text-base flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" /> Presensi Pelaku Usaha
            </DialogTitle>
            <DialogDescription>
              Atur status kehadiran dan catatan khusus untuk <strong className="text-slate-900 dark:text-slate-100">{notesModalActor?.fullName}</strong>.
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
                placeholder="Contoh: Diwakili istri, terlambat karena hujan, ada surat izin, dll."
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
