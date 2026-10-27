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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
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
  ArrowLeft,
  Calendar,
  Layers,
  SlidersHorizontal,
  Filter,
  RefreshCw,
  Edit
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

  // Filter Meja, Sesi & Kecamatan
  const [selectedDeskFilter, setSelectedDeskFilter] = useState("semua")
  const [selectedScheduleFilter, setSelectedScheduleFilter] = useState("semua")
  const [selectedKecamatanFilter, setSelectedKecamatanFilter] = useState("semua")
  const [selectedCoordinatorFilter, setSelectedCoordinatorFilter] = useState("semua")

  // State Pembagian Per Koordinator
  const [selectedBatchCoord, setSelectedBatchCoord] = useState("")
  const [batchCoordDesk, setBatchCoordDesk] = useState("Meja 1")
  const [batchCoordSchedule, setBatchCoordSchedule] = useState("Sesi 1 (08.00 - 10.00 WIB)")

  // NIK Sensitive Data Protection State
  const [showAllNik, setShowAllNik] = useState(false)
  const [unmaskedNiks, setUnmaskedNiks] = useState<Record<string, boolean>>({})

  // Modal Dialogs State (Presensi Individual)
  const [notesModalActor, setNotesModalActor] = useState<BusinessActor | null>(null)
  const [customStatus, setCustomStatus] = useState<AttendanceStatus>('hadir')
  const [customNotes, setCustomNotes] = useState("")
  const [customDesk, setCustomDesk] = useState("")
  const [customSchedule, setCustomSchedule] = useState("")
  const [customCoordinator, setCustomCoordinator] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal Dialog Atur Jadwal & Meja (Batch / Massal)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [batchTab, setBatchTab] = useState("auto_kecamatan")
  const [batchSessionName, setBatchSessionName] = useState("Sesi 1 (08.00 - 10.00 WIB)")
  const [evenSplitCount, setEvenSplitCount] = useState<number>(3)
  const [customBatchDesk, setCustomBatchDesk] = useState("Meja 1 (Kec. Tanjungpinang Barat)")
  const [customBatchSchedule, setCustomBatchSchedule] = useState("Sesi 1 (08.00 - 10.00 WIB)")

  // Batch action confirm dialogs
  const [showMarkAllDialog, setShowMarkAllDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showResetScheduleDialog, setShowResetScheduleDialog] = useState(false)

  // Sensor NIK Masking Function
  const formatMaskedNik = (nik: string, actorId: string): string => {
    if (!nik) return "-"
    const cleanNik = nik.trim()
    const isUnmasked = showAllNik || !!unmaskedNiks[actorId]
    if (isUnmasked || cleanNik.length < 10) return cleanNik
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

  // 4. Update Attendance Real-Time Function
  const handleUpdateAttendance = async (
    actor: BusinessActor, 
    newStatus: AttendanceStatus, 
    notes: string = "",
    desk?: string,
    schedule?: string,
    coordinator?: string
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

    if (desk !== undefined) {
      updatePayload.attendanceDesk = desk.trim() || null
    }
    if (schedule !== undefined) {
      updatePayload.attendanceSchedule = schedule.trim() || null
    }
    if (coordinator !== undefined && coordinator.trim() && isAdmin) {
      updatePayload.coordinator = coordinator.trim()
    }

    try {
      const actorRef = ref(database, `businessActors/${actor.id}`)
      await update(actorRef, updatePayload)

      const attendanceLogRef = ref(database, `daftar_hadir/${actor.id}`)
      await update(attendanceLogRef, {
        actorId: actor.id,
        fullName: actor.fullName,
        nik: actor.nik,
        businessName: actor.businessName || "",
        status: newStatus,
        notes: notes.trim() || null,
        desk: desk?.trim() || null,
        schedule: schedule?.trim() || null,
        updatedAt: nowIso,
        updatedBy: officerName,
      })

      logActivity({
        query: `ABSENSI: ${actor.fullName} -> ${newStatus.toUpperCase()}${desk ? ` (Meja: ${desk})` : ''}`,
        results: `Presensi berhasil diubah`,
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
        }${desk ? ` • ${desk}` : ''}.`
      })
    } catch (error) {
      console.error("Gagal update presensi:", error)
      toast({
        variant: "destructive",
        title: "Gagal Update",
        description: "Terjadi kesalahan saat menyimpan presensi."
      })
    } finally {
      setIsSubmitting(false)
      setNotesModalActor(null)
    }
  }

  // Quick Toggle Hadir / Belum Hadir
  const handleQuickToggleHadir = (actor: BusinessActor) => {
    const current = (actor as any).attendanceStatus as AttendanceStatus
    const nextStatus: AttendanceStatus = current === 'hadir' ? 'belum_hadir' : 'hadir'
    handleUpdateAttendance(actor, nextStatus, (actor as any).attendanceNotes || "")
  }

  // 5. Data Terverifikasi yang tampil di Daftar Hadir
  const verifiedActorsList = useMemo(() => {
    if (!rawActors) return []
    return rawActors.filter(a => a && isActorVerified(a))
  }, [rawActors])

  // Distinct Desks (Daftar Meja yang ada di data)
  const distinctDesks = useMemo(() => {
    const set = new Set<string>()
    set.add("Meja 1 (Kec. Tanjungpinang Barat)")
    set.add("Meja 2 (Kec. Tanjungpinang Timur)")
    set.add("Meja 3 (Kec. Bukit Bestari)")
    set.add("Meja 4 (Kec. Tanjungpinang Kota)")
    
    verifiedActorsList.forEach(a => {
      const d = (a as any).attendanceDesk
      if (d && typeof d === 'string' && d.trim()) {
        set.add(d.trim())
      }
    })
    return Array.from(set)
  }, [verifiedActorsList])

  // Distinct Coordinators list with counts, current desks & schedules
  const coordinatorStats = useMemo(() => {
    const map = new Map<string, { count: number; desks: Set<string>; schedules: Set<string> }>()
    verifiedActorsList.forEach(a => {
      const koor = normalizeCoordinator(a.coordinator) || "TANPA KOORDINATOR"
      if (!map.has(koor)) {
        map.set(koor, { count: 0, desks: new Set(), schedules: new Set() })
      }
      const item = map.get(koor)!
      item.count++
      const d = (a as any).attendanceDesk
      if (d && typeof d === 'string' && d.trim()) item.desks.add(d.trim())
      const s = (a as any).attendanceSchedule
      if (s && typeof s === 'string' && s.trim()) item.schedules.add(s.trim())
    })
    return Array.from(map.entries())
      .map(([name, data]) => ({ 
        name, 
        count: data.count,
        desks: Array.from(data.desks),
        schedules: Array.from(data.schedules)
      }))
      .sort((a, b) => b.count - a.count)
  }, [verifiedActorsList])

  // Distinct Schedules (Daftar Sesi yang ada di data)
  const distinctSchedules = useMemo(() => {
    const set = new Set<string>()
    set.add("Sesi 1 (08.00 - 10.00 WIB)")
    set.add("Sesi 2 (10.00 - 12.00 WIB)")
    set.add("Sesi 3 (13.00 - 15.00 WIB)")
    set.add("Sesi 4 (15.00 - 17.00 WIB)")
    
    verifiedActorsList.forEach(a => {
      const s = (a as any).attendanceSchedule
      if (s && typeof s === 'string' && s.trim()) {
        set.add(s.trim())
      }
    })
    return Array.from(set)
  }, [verifiedActorsList])

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

  // Filter gabungan Tab Kehadiran, Meja, Sesi, Kecamatan & Search
  const filteredActors = useMemo(() => {
    return verifiedActorsList.filter(actor => {
      const attendance = ((actor as any).attendanceStatus || 'belum_hadir') as AttendanceStatus

      // 1. Filter Tab Kehadiran
      if (activeTab !== 'semua' && attendance !== activeTab) {
        return false
      }

      // 2. Filter Meja
      if (selectedDeskFilter !== 'semua') {
        const desk = ((actor as any).attendanceDesk || "").trim()
        if (selectedDeskFilter === 'belum_diatur') {
          if (desk) return false
        } else {
          if (desk !== selectedDeskFilter) return false
        }
      }

      // 3. Filter Sesi
      if (selectedScheduleFilter !== 'semua') {
        const sch = ((actor as any).attendanceSchedule || "").trim()
        if (selectedScheduleFilter === 'belum_diatur') {
          if (sch) return false
        } else {
          if (sch !== selectedScheduleFilter) return false
        }
      }

      // 4. Filter Kecamatan
      if (selectedKecamatanFilter !== 'semua') {
        const kec = (actor.kecamatan || "").toLowerCase().trim()
        const target = selectedKecamatanFilter.toLowerCase().trim()
        if (!kec.includes(target) && !target.includes(kec)) {
          return false
        }
      }

      // 5. Filter Koordinator
      if (selectedCoordinatorFilter !== 'semua') {
        const koor = normalizeCoordinator(actor.coordinator) || "TANPA KOORDINATOR"
        if (koor.toLowerCase() !== selectedCoordinatorFilter.toLowerCase()) {
          return false
        }
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchName = (actor.fullName || "").toLowerCase().includes(query)
        const matchNik = (actor.nik || "").toLowerCase().includes(query)
        const matchBusiness = (actor.businessName || "").toLowerCase().includes(query)
        const matchKelurahan = (actor.kelurahan || "").toLowerCase().includes(query)
        const matchCoordinator = (actor.coordinator || "").toLowerCase().includes(query)
        const matchDesk = ((actor as any).attendanceDesk || "").toLowerCase().includes(query)
        const matchSchedule = ((actor as any).attendanceSchedule || "").toLowerCase().includes(query)

        if (!matchName && !matchNik && !matchBusiness && !matchKelurahan && !matchCoordinator && !matchDesk && !matchSchedule) {
          return false
        }
      }

      return true
    })
  }, [verifiedActorsList, activeTab, selectedDeskFilter, selectedScheduleFilter, selectedKecamatanFilter, selectedCoordinatorFilter, searchQuery])

  // ─── FUNGSI BATCH PEMBAGIAN JADWAL & MEJA SECARA CEPAT (ATOMIC MULTI-PATH RTDB) ───
  
  // 1. Pembagian Otomatis Berdasarkan 4 Kecamatan
  const executeAutoDistrictAssignment = async (assignSchedule: string = "") => {
    if (!database || !user) return
    setIsSubmitting(true)

    try {
      const updates: Record<string, any> = {}
      let baratCount = 0, timurCount = 0, bestariCount = 0, kotaCount = 0

      verifiedActorsList.forEach(actor => {
        const kec = (actor.kecamatan || "").toLowerCase().trim()
        let targetDesk = "Meja 1 (Kec. Tanjungpinang Barat)"

        if (kec.includes("barat")) {
          targetDesk = "Meja 1 (Kec. Tanjungpinang Barat)"
          baratCount++
        } else if (kec.includes("timur")) {
          targetDesk = "Meja 2 (Kec. Tanjungpinang Timur)"
          timurCount++
        } else if (kec.includes("bestari")) {
          targetDesk = "Meja 3 (Kec. Bukit Bestari)"
          bestariCount++
        } else if (kec.includes("kota")) {
          targetDesk = "Meja 4 (Kec. Tanjungpinang Kota)"
          kotaCount++
        } else {
          targetDesk = "Meja 1 (Kec. Tanjungpinang Barat)"
          baratCount++
        }

        updates[`businessActors/${actor.id}/attendanceDesk`] = targetDesk
        if (assignSchedule) {
          updates[`businessActors/${actor.id}/attendanceSchedule`] = assignSchedule
        }
      })

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates)
      }

      logActivity({
        query: `PEMBAGIAN JADWAL & MEJA: Otomatis 4 Kecamatan (${verifiedActorsList.length} peserta)`,
        results: `Barat: ${baratCount}, Timur: ${timurCount}, Bestari: ${bestariCount}, Kota: ${kotaCount}`,
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'MODUL DAFTAR HADIR',
        userId: userProfile?.fullName || user?.email || "Admin"
      })

      toast({
        title: "Pembagian Meja Selesai!",
        description: `Berhasil membagi ${verifiedActorsList.length} pelaku usaha ke Meja 1 s.d Meja 4 berdasarkan kecamatan.`
      })
      setShowScheduleModal(false)
    } catch (err) {
      console.error("Gagal auto-assign meja:", err)
      toast({ variant: "destructive", title: "Gagal Pembagian", description: "Terjadi kesalahan saat menyimpan data." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 1b. Pembagian Berdasarkan Koordinator
  const executeCoordinatorAssignment = async (coordName: string, desk: string, schedule: string) => {
    if (!database || !user || !coordName) {
      toast({ variant: "destructive", title: "Pilih Koordinator", description: "Silakan pilih salah satu koordinator terlebih dahulu." })
      return
    }
    setIsSubmitting(true)

    try {
      const updates: Record<string, any> = {}
      let count = 0

      verifiedActorsList.forEach(actor => {
        const actorKoor = normalizeCoordinator(actor.coordinator) || "TANPA KOORDINATOR"
        if (actorKoor.toLowerCase() === coordName.toLowerCase()) {
          if (desk.trim()) {
            updates[`businessActors/${actor.id}/attendanceDesk`] = desk.trim()
          }
          if (schedule.trim()) {
            updates[`businessActors/${actor.id}/attendanceSchedule`] = schedule.trim()
          }
          count++
        }
      })

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates)
      }

      logActivity({
        query: `PEMBAGIAN KOORDINATOR: ${coordName} (${count} peserta) -> Meja: ${desk || '-'}, Sesi: ${schedule || '-'}`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'MODUL DAFTAR HADIR',
        userId: userProfile?.fullName || user?.email || "Admin"
      })

      toast({
        title: "Penetapan Koordinator Berhasil!",
        description: `Berhasil menetapkan ${desk ? `Meja: ${desk}` : ''}${desk && schedule ? ' • ' : ''}${schedule ? `Sesi: ${schedule}` : ''} untuk ${count} peserta di bawah Koordinator ${coordName}.`
      })
    } catch (err) {
      console.error("Gagal assign koordinator:", err)
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat menyimpan data." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Bagi Rata Seluruh Koordinator ke Meja 1 s.d Meja 4
  const executeAutoDistributeAllCoordinators = async (deskCount: number = 4) => {
    if (!database || !user || coordinatorStats.length === 0) return
    setIsSubmitting(true)

    try {
      const updates: Record<string, any> = {}
      const deskLoads = Array.from({ length: deskCount }, (_, i) => ({ deskIndex: i + 1, totalPeople: 0 }))
      const coordToDeskMap = new Map<string, string>()

      coordinatorStats.forEach(coord => {
        deskLoads.sort((a, b) => a.totalPeople - b.totalPeople)
        const targetDesk = `Meja ${deskLoads[0].deskIndex}`
        deskLoads[0].totalPeople += coord.count
        coordToDeskMap.set(coord.name.toLowerCase(), targetDesk)
      })

      verifiedActorsList.forEach(actor => {
        const koor = (normalizeCoordinator(actor.coordinator) || "TANPA KOORDINATOR").toLowerCase()
        const assignedDesk = coordToDeskMap.get(koor) || "Meja 1"
        updates[`businessActors/${actor.id}/attendanceDesk`] = assignedDesk
      })

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates)
      }

      toast({
        title: "Koordinator Berhasil Dibagi!",
        description: `Berhasil membagi seimbang ${coordinatorStats.length} koordinator ke Meja 1 s.d Meja ${deskCount}.`
      })
      setShowScheduleModal(false)
    } catch (err) {
      console.error("Gagal auto distribute koordinator:", err)
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat membagi koordinator." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 2. Pembagian Rata Berdasarkan Sesi Waktu
  const executeEvenSessionSplit = async (sessionCount: number) => {
    if (!database || !user || verifiedActorsList.length === 0) return
    setIsSubmitting(true)

    const sessionLabels = [
      "Sesi 1 (08.00 - 10.00 WIB)",
      "Sesi 2 (10.00 - 12.00 WIB)",
      "Sesi 3 (13.00 - 15.00 WIB)",
      "Sesi 4 (15.00 - 17.00 WIB)"
    ]

    try {
      const updates: Record<string, any> = {}
      const total = verifiedActorsList.length
      const chunkSize = Math.ceil(total / sessionCount)

      verifiedActorsList.forEach((actor, index) => {
        const sessionIndex = Math.min(Math.floor(index / chunkSize), sessionCount - 1)
        const chosenSession = sessionLabels[sessionIndex] || `Sesi ${sessionIndex + 1}`
        updates[`businessActors/${actor.id}/attendanceSchedule`] = chosenSession
      })

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates)
      }

      logActivity({
        query: `PEMBAGIAN SESI: Bagi rata ${sessionCount} sesi (${total} peserta)`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'MODUL DAFTAR HADIR',
        userId: userProfile?.fullName || user?.email || "Admin"
      })

      toast({
        title: "Sesi Waktu Berhasil Dibagi!",
        description: `Berhasil membagi rata ${total} pelaku usaha ke dalam ${sessionCount} sesi waktu.`
      })
      setShowScheduleModal(false)
    } catch (err) {
      console.error("Gagal bagi sesi:", err)
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat membagi sesi." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 3. Atur Massal untuk Data yang Sedang Terfilter
  const executeCustomBatchAssignment = async (desk: string, schedule: string) => {
    if (!database || !user || filteredActors.length === 0) return
    setIsSubmitting(true)

    try {
      const updates: Record<string, any> = {}
      filteredActors.forEach(actor => {
        if (desk.trim()) {
          updates[`businessActors/${actor.id}/attendanceDesk`] = desk.trim()
        }
        if (schedule.trim()) {
          updates[`businessActors/${actor.id}/attendanceSchedule`] = schedule.trim()
        }
      })

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates)
      }

      toast({
        title: "Berhasil Diperbarui!",
        description: `Berhasil menerapkan Meja & Jadwal ke ${filteredActors.length} peserta terpilih.`
      })
      setShowScheduleModal(false)
    } catch (err) {
      console.error("Gagal custom assign:", err)
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat menyimpan." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 4. Reset Seluruh Jadwal & Meja
  const executeResetScheduleAndDesk = async () => {
    if (!database || !user) return
    setIsSubmitting(true)
    setShowResetScheduleDialog(false)

    try {
      const updates: Record<string, any> = {}
      verifiedActorsList.forEach(actor => {
        updates[`businessActors/${actor.id}/attendanceDesk`] = null
        updates[`businessActors/${actor.id}/attendanceSchedule`] = null
      })

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates)
      }

      toast({
        title: "Jadwal & Meja Dikosongkan",
        description: "Seluruh penetapan meja dan sesi kehadiran berhasil dikosongkan."
      })
      setShowScheduleModal(false)
    } catch (err) {
      console.error("Gagal reset meja & sesi:", err)
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat mereset data." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Batch Mark All Filtered as Hadir
  const executeBatchMarkHadir = async () => {
    if (!database || !user || filteredActors.length === 0) return
    setIsSubmitting(true)
    setShowMarkAllDialog(false)

    const officerName = userProfile?.fullName || user?.email || "Petugas Absensi"
    const nowIso = new Date().toISOString()

    try {
      const updates: Record<string, any> = {}
      let count = 0

      for (const actor of filteredActors) {
        const current = (actor as any).attendanceStatus
        if (current !== 'hadir') {
          updates[`businessActors/${actor.id}/attendanceStatus`] = 'hadir'
          updates[`businessActors/${actor.id}/attendanceUpdatedAt`] = nowIso
          updates[`businessActors/${actor.id}/attendanceUpdatedBy`] = officerName
          count++
        }
      }

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates)
      }

      toast({
        title: "Presensi Massal Berhasil!",
        description: `${count} pelaku usaha berhasil ditandai HADIR secara bersamaan.`
      })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat update massal." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset Seluruh Kehadiran ke Belum Hadir
  const executeResetAttendance = async () => {
    if (!database || !user || !isAdmin) return
    setIsSubmitting(true)
    setShowResetDialog(false)

    try {
      const updates: Record<string, any> = {}
      for (const actor of verifiedActorsList) {
        updates[`businessActors/${actor.id}/attendanceStatus`] = 'belum_hadir'
        updates[`businessActors/${actor.id}/attendanceUpdatedAt`] = null
        updates[`businessActors/${actor.id}/attendanceUpdatedBy`] = null
        updates[`businessActors/${actor.id}/attendanceNotes`] = null
      }

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates)
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
      worksheet.mergeCells("A1:J1")
      const titleCell = worksheet.getCell("A1")
      titleCell.value = "DAFTAR HADIR PELAKU USAHA TERVERIFIKASI DINAS KOPERASI DAN UKM"
      titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF0F172A" } }
      titleCell.alignment = { horizontal: "center", vertical: "middle" }

      worksheet.mergeCells("A2:J2")
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
        "POSISI MEJA",
        "JADWAL SESI",
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
      worksheet.getColumn(2).width = 28
      worksheet.getColumn(3).width = 22
      worksheet.getColumn(4).width = 14
      worksheet.getColumn(5).width = 24
      worksheet.getColumn(6).width = 18
      worksheet.getColumn(7).width = 22
      worksheet.getColumn(8).width = 20
      worksheet.getColumn(9).width = 18
      worksheet.getColumn(10).width = 16

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
          (actor as any).attendanceDesk || "-",
          (actor as any).attendanceSchedule || "-",
          formatVerificationLabel(actor.status),
          attStatus === 'HADIR' ? 'HADIR' : attStatus === 'IZIN' ? 'IZIN' : attStatus === 'SAKIT' ? 'SAKIT' : 'BELUM HADIR'
        ])

        row.height = 22
        row.eachCell((cell, colIndex) => {
          cell.font = { name: "Arial", size: 9 }
          cell.alignment = { 
            vertical: "middle", 
            horizontal: colIndex === 1 || colIndex === 3 || colIndex === 7 || colIndex === 8 || colIndex === 9 || colIndex === 10 ? "center" : "left" 
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
    // ─── TAMPILAN FULL-WIDTH TANPA PADDING KIRI & KANAN (EDGE TO EDGE) ───
    <div className="w-full p-0 space-y-3 pb-8">
      
      {/* ─── Header & Toolbar Menyatu Satu Baris (Persis Layout Gambar 2) ─── */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 px-1 sm:px-2 print:hidden">
        
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
        <div className="flex items-center gap-2 w-full xl:w-auto flex-wrap">
          {/* Input Search seperti Gambar 2 */}
          <div className="relative w-full sm:w-56">
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

      {/* ─── BARIS FILTER OPERASIONAL: FILTER MEJA, SESI, KECAMATAN & TOMBOL ATUR JADWAL ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-2 py-1.5 bg-slate-50/90 dark:bg-zinc-800/50 rounded-xl border border-slate-200/80 dark:border-zinc-800 print:hidden mx-1 sm:mx-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Filter Meja / Posisi Loket */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <MapPin className="w-3 h-3 text-sky-600" />
              <span>Meja:</span>
            </span>
            <select
              value={selectedDeskFilter}
              onChange={(e) => {
                setSelectedDeskFilter(e.target.value)
                setPageLimit(50)
              }}
              className="h-8 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
            >
              <option value="semua">Semua Meja</option>
              {distinctDesks.map(desk => (
                <option key={desk} value={desk}>{desk}</option>
              ))}
              <option value="belum_diatur">-- Belum Ditentukan Meja --</option>
            </select>
          </div>

          {/* Filter Sesi / Jadwal Waktu */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>Sesi:</span>
            </span>
            <select
              value={selectedScheduleFilter}
              onChange={(e) => {
                setSelectedScheduleFilter(e.target.value)
                setPageLimit(50)
              }}
              className="h-8 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
            >
              <option value="semua">Semua Sesi</option>
              {distinctSchedules.map(sch => (
                <option key={sch} value={sch}>{sch}</option>
              ))}
              <option value="belum_diatur">-- Belum Terjadwal Sesi --</option>
            </select>
          </div>

          {/* Filter Kecamatan */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-500" />
              <span>Kecamatan:</span>
            </span>
            <select
              value={selectedKecamatanFilter}
              onChange={(e) => {
                setSelectedKecamatanFilter(e.target.value)
                setPageLimit(50)
              }}
              className="h-8 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
            >
              <option value="semua">Semua Kecamatan</option>
              <option value="Tanjungpinang Barat">Tanjungpinang Barat</option>
              <option value="Tanjungpinang Timur">Tanjungpinang Timur</option>
              <option value="Bukit Bestari">Bukit Bestari</option>
              <option value="Tanjungpinang Kota">Tanjungpinang Kota</option>
            </select>
          </div>

          {/* Filter Koordinator */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Users className="w-3 h-3 text-emerald-600" />
              <span>Koordinator:</span>
            </span>
            <select
              value={selectedCoordinatorFilter}
              onChange={(e) => {
                setSelectedCoordinatorFilter(e.target.value)
                setPageLimit(50)
              }}
              className="h-8 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs max-w-[150px] truncate"
            >
              <option value="semua">Semua Koordinator</option>
              {coordinatorStats.map(c => (
                <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
              ))}
            </select>
          </div>

          {/* Reset Active Filter */}
          {(selectedDeskFilter !== 'semua' || selectedScheduleFilter !== 'semua' || selectedKecamatanFilter !== 'semua' || selectedCoordinatorFilter !== 'semua') && (
            <button
              onClick={() => {
                setSelectedDeskFilter('semua')
                setSelectedScheduleFilter('semua')
                setSelectedKecamatanFilter('semua')
                setSelectedCoordinatorFilter('semua')
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline px-1 cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Tombol Atur Jadwal & Meja (Bagi Batch) */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setShowScheduleModal(true)}
            className="h-8 px-3 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white gap-1.5 shadow-2xs rounded-lg cursor-pointer"
            title="Buka pengaturan pembagian jadwal & meja absensi"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Atur Jadwal & Meja</span>
          </Button>
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

      {/* ─── TABEL UTAMA: PERSIS SEPERTI GAMBAR 1 (MENYELURUH FULL-WIDTH DENGAN KOLOM JADWAL & MEJA) ─── */}
      <div className="w-full p-0 m-0 overflow-x-auto bg-white dark:bg-zinc-900 border-y border-slate-200/90 dark:border-zinc-800 shadow-2xs">
        {isActorsLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
              Memuat data presensi pelaku usaha terverifikasi...
            </p>
          </div>
        ) : filteredActors.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-xs font-bold uppercase tracking-wider">
            Tidak ada data pelaku usaha terverifikasi pada filter ini.
          </div>
        ) : (
          <table className="w-full text-xs border-collapse table-auto sm:table-fixed">
            {/* Header Tabel Persis Desain Gambar 1 */}
            <thead className="bg-[#E5E7EB] dark:bg-zinc-800 text-slate-900 dark:text-slate-100 border-b border-slate-300 dark:border-zinc-700">
              <tr className="divide-x divide-slate-300 dark:divide-zinc-700">
                <th className="w-[3.5%] text-center font-bold text-[11px] uppercase py-2.5 px-1">NO</th>
                <th className="w-[14.5%] text-center font-bold text-[11px] uppercase py-2.5 px-2 leading-tight">NAMA<br/>LENGKAP</th>
                <th className="w-[12%] text-center font-bold text-[11px] uppercase py-2.5 px-1.5">NIK</th>
                <th className="w-[7%] text-center font-bold text-[11px] uppercase py-2.5 px-1">KATEGORI</th>
                <th className="w-[13%] text-center font-bold text-[11px] uppercase py-2.5 px-2">USAHA</th>
                <th className="w-[8%] text-center font-bold text-[11px] uppercase py-2.5 px-1">KOORDINATOR</th>
                <th className="w-[15%] text-center font-bold text-[11px] uppercase py-2.5 px-1 leading-tight">JADWAL & POSISI<br/>ABSENSI (MEJA)</th>
                <th className="w-[10%] text-center font-bold text-[11px] uppercase py-2.5 px-1 leading-tight">STATUS<br/>VERIFIKASI</th>
                <th className="w-[9%] text-center font-bold text-[11px] uppercase py-2.5 px-1">KEHADIRAN</th>
                <th className="w-[8%] text-center font-bold text-[11px] uppercase py-2.5 px-1">AKSI</th>
                <th className="w-28 font-bold text-[11px] uppercase py-2.5 text-center hidden print:table-cell">TANDA TANGAN</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
              {filteredActors.slice(0, pageLimit).map((actor, index) => {
                const attStatus = ((actor as any).attendanceStatus || 'belum_hadir') as AttendanceStatus
                const isHadir = attStatus === 'hadir'
                const officer = (actor as any).attendanceUpdatedBy
                const time = (actor as any).attendanceUpdatedAt
                const notes = (actor as any).attendanceNotes
                const desk = (actor as any).attendanceDesk
                const schedule = (actor as any).attendanceSchedule
                const rawCoord = (actor.coordinator || "").toUpperCase()
                const isHoldOrPending = rawCoord.includes("HOLD") || rawCoord.includes("PENDING")

                return (
                  <tr 
                    key={actor.id} 
                    className={cn(
                      "hover:bg-primary/5 transition-colors divide-x divide-slate-200 dark:divide-zinc-800",
                      isHadir ? "bg-emerald-50/25 dark:bg-emerald-950/20" : "even:bg-slate-50/40 dark:even:zinc-900/40"
                    )}
                  >
                    {/* 1. NO */}
                    <td className="py-2.5 px-1 text-center font-bold text-xs text-slate-500">
                      {index + 1}
                    </td>

                    {/* 2. NAMA LENGKAP */}
                    <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-slate-100 uppercase text-xs">
                      {actor.fullName || "-"}
                    </td>

                    {/* 3. NIK */}
                    <td className="py-2.5 px-1.5 text-center font-mono text-xs">
                      <div className="inline-flex items-center gap-1 bg-slate-100/90 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-[11px] whitespace-nowrap">
                          {formatMaskedNik(actor.nik, actor.id)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleSingleNik(actor.id)}
                          className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors print:hidden cursor-pointer"
                          title={unmaskedNiks[actor.id] ? "Sensor NIK" : "Buka Sensor NIK"}
                        >
                          {unmaskedNiks[actor.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyNik(actor.nik)}
                          className="p-0.5 rounded text-slate-400 hover:text-primary transition-colors print:hidden cursor-pointer"
                          title="Salin NIK"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* 4. KATEGORI */}
                    <td className="py-2.5 px-1 text-center">
                      <span className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider whitespace-nowrap">
                        {actor.businessCategory || "-"}
                      </span>
                    </td>

                    {/* 5. USAHA */}
                    <td className="py-2.5 px-2">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase" title={actor.businessName || "-"}>
                          {actor.businessName || "-"}
                        </p>
                        {actor.kelurahan && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-0.5" title={actor.kelurahan}>
                            <MapPin className="w-2.5 h-2.5 inline shrink-0" /> {actor.kelurahan}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* 6. KOORDINATOR */}
                    <td className="py-2.5 px-1 text-center font-bold text-xs uppercase text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {isHoldOrPending ? (
                        <span 
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 cursor-pointer"
                          onClick={() => {
                            setNotesModalActor(actor)
                            setCustomStatus(attStatus)
                            setCustomNotes(notes || "")
                            setCustomDesk(desk || "")
                            setCustomSchedule(schedule || "")
                            setCustomCoordinator(actor.coordinator || "")
                          }}
                          title="Label arsip (Klik untuk sesuaikan koordinator)"
                        >
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                          <span className="truncate max-w-[90px]">{normalizeCoordinator(actor.coordinator)}</span>
                        </span>
                      ) : (
                        normalizeCoordinator(actor.coordinator)
                      )}
                    </td>

                    {/* 7. JADWAL & POSISI ABSENSI (MEJA) */}
                    <td className="py-2 px-1 text-center">
                      <div className="inline-flex flex-col items-center gap-1 max-w-full">
                        {/* Meja / Posisi Loket Badge */}
                        {desk ? (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800 whitespace-nowrap cursor-pointer hover:bg-sky-100 transition-colors"
                            onClick={() => {
                              setNotesModalActor(actor)
                              setCustomStatus(attStatus)
                              setCustomNotes(notes || "")
                              setCustomDesk(desk || "")
                              setCustomSchedule(schedule || "")
                              setCustomCoordinator(actor.coordinator || "")
                            }}
                            title="Klik untuk ubah Meja / Jadwal"
                          >
                            <MapPin className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                            <span className="truncate max-w-[130px]">{desk}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setNotesModalActor(actor)
                              setCustomStatus(attStatus)
                              setCustomNotes(notes || "")
                              setCustomDesk("")
                              setCustomSchedule(schedule || "")
                              setCustomCoordinator(actor.coordinator || "")
                            }}
                            className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-primary font-medium transition-colors cursor-pointer"
                            title="Klik untuk tentukan meja"
                          >
                            <span>+ Atur Meja</span>
                          </button>
                        )}

                        {/* Jadwal / Sesi Badge */}
                        {schedule ? (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-bold bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800 whitespace-nowrap cursor-pointer hover:bg-amber-100 transition-colors"
                            onClick={() => {
                              setNotesModalActor(actor)
                              setCustomStatus(attStatus)
                              setCustomNotes(notes || "")
                              setCustomDesk(desk || "")
                              setCustomSchedule(schedule || "")
                              setCustomCoordinator(actor.coordinator || "")
                            }}
                            title="Klik untuk ubah Meja / Jadwal"
                          >
                            <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                            <span className="truncate max-w-[130px]">{schedule}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setNotesModalActor(actor)
                              setCustomStatus(attStatus)
                              setCustomNotes(notes || "")
                              setCustomDesk(desk || "")
                              setCustomSchedule("")
                              setCustomCoordinator(actor.coordinator || "")
                            }}
                            className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-primary font-medium transition-colors cursor-pointer"
                            title="Klik untuk tentukan sesi"
                          >
                            <span>+ Atur Sesi</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 8. STATUS VERIFIKASI */}
                    <td className="py-2.5 px-1 text-center whitespace-nowrap">
                      <VerificationBadge status={actor.status} />
                    </td>

                    {/* 9. KEHADIRAN (Badge + Waktu & Petugas) */}
                    <td className="py-2.5 px-1 text-center">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleQuickToggleHadir(actor)}
                          className="focus:outline-hidden transition-transform active:scale-95 print:pointer-events-none cursor-pointer"
                          title="Klik untuk mengubah Hadir/Belum Hadir"
                        >
                          <AttendanceBadge status={attStatus} />
                        </button>
                        {time && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatTimeIndo(time)}
                            </span>
                            {officer && <span className="truncate max-w-[80px]" title={officer}>• {officer}</span>}
                          </div>
                        )}
                        {notes && (
                          <span className="text-[9.5px] italic text-slate-500 max-w-[110px] truncate" title={notes}>
                            &ldquo;{notes}&rdquo;
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 10. AKSI */}
                    <td className="py-2.5 px-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant={isHadir ? "outline" : "default"}
                          onClick={() => handleQuickToggleHadir(actor)}
                          className={cn(
                            "h-7 px-2 text-xs font-bold gap-1 rounded-lg cursor-pointer",
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

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setNotesModalActor(actor)
                            setCustomStatus(attStatus)
                            setCustomNotes(notes || "")
                            setCustomDesk(desk || "")
                            setCustomSchedule(schedule || "")
                            setCustomCoordinator(actor.coordinator || "")
                          }}
                          className="h-7 w-7 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                          title="Atur Catatan, Meja, Sesi & Opsi Kehadiran"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>

                    {/* Kolom Tanda Tangan Cetak (Print View Only) */}
                    <td className="py-2.5 text-center hidden print:table-cell text-xs text-slate-400 border border-black h-10">
                      {isHadir ? "HADIR" : "................"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Pagination / Tampilkan Lebih Banyak Data */}
        {filteredActors.length > pageLimit && (
          <div className="p-4 flex justify-center border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 print:hidden">
            <Button
              variant="outline"
              onClick={() => setPageLimit(prev => prev + 50)}
              className="text-xs font-bold border-primary text-primary hover:bg-primary/10 cursor-pointer"
            >
              Tampilkan 50 Data Lagi (Menampilkan {Math.min(pageLimit, filteredActors.length)} dari {filteredActors.length})
            </Button>
          </div>
        )}
      </div>

      {/* ─── MODAL DIALOG 1: ATUR JADWAL & POSISI ABSENSI MASSAL (BATCH) ─── */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-2xl rounded-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-primary font-black uppercase text-sm sm:text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-600 shrink-0" />
              <span>Pengaturan Jadwal & Posisi Absensi</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Bagikan kuota <strong>{verifiedActorsList.length} pelaku usaha terverifikasi</strong> ke dalam posisi meja loket dan sesi kedatangan agar proses presensi tertib dan lancar.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={batchTab} onValueChange={setBatchTab} className="w-full mt-2">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full bg-slate-100 dark:bg-zinc-800 h-auto p-1 gap-1">
              <TabsTrigger value="auto_kecamatan" className="text-xs font-bold py-1.5">1. Per Kecamatan</TabsTrigger>
              <TabsTrigger value="by_coordinator" className="text-xs font-bold py-1.5">2. Per Koordinator</TabsTrigger>
              <TabsTrigger value="even_sessions" className="text-xs font-bold py-1.5">3. Bagi Rata Sesi</TabsTrigger>
              <TabsTrigger value="custom_filter" className="text-xs font-bold py-1.5">4. Data Terfilter</TabsTrigger>
            </TabsList>

            {/* TAB 1: Pembagian Otomatis Berdasarkan 4 Kecamatan */}
            <TabsContent value="auto_kecamatan" className="space-y-4 pt-3">
              <div className="bg-sky-50 dark:bg-sky-950/40 p-3.5 rounded-xl border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 space-y-2">
                <p className="font-bold">
                  Sistem akan otomatis mengelompokkan peserta ke 4 Meja sesuai Kecamatan:
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-medium">
                  <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-sky-100 dark:border-zinc-700">
                    <strong className="text-sky-700 block">Meja 1:</strong> Kec. Tanjungpinang Barat
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-sky-100 dark:border-zinc-700">
                    <strong className="text-sky-700 block">Meja 2:</strong> Kec. Tanjungpinang Timur
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-sky-100 dark:border-zinc-700">
                    <strong className="text-sky-700 block">Meja 3:</strong> Kec. Bukit Bestari
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-sky-100 dark:border-zinc-700">
                    <strong className="text-sky-700 block">Meja 4:</strong> Kec. Tanjungpinang Kota
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tetapkan Sesi Waktu Default (Opsional)
                </label>
                <select
                  value={batchSessionName}
                  onChange={(e) => setBatchSessionName(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold"
                >
                  <option value="">-- Jangan Ubah Sesi Waktu --</option>
                  <option value="Sesi 1 (08.00 - 10.00 WIB)">Sesi 1 (08.00 - 10.00 WIB)</option>
                  <option value="Sesi 2 (10.00 - 12.00 WIB)">Sesi 2 (10.00 - 12.00 WIB)</option>
                  <option value="Sesi 3 (13.00 - 15.00 WIB)">Sesi 3 (13.00 - 15.00 WIB)</option>
                  <option value="Sesi 4 (15.00 - 17.00 WIB)">Sesi 4 (15.00 - 17.00 WIB)</option>
                </select>
              </div>

              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => executeAutoDistrictAssignment(batchSessionName)}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-10 gap-2 cursor-pointer shadow-sm"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                Terapkan Pembagian Meja Otomatis (4 Kecamatan)
              </Button>
            </TabsContent>

            {/* TAB 2: Pembagian Berdasarkan Koordinator */}
            <TabsContent value="by_coordinator" className="space-y-4 pt-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-700" />
                  <span>Pembagian Posisi Meja & Sesi Berdasarkan Koordinator:</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Pilih koordinator penanggung jawab di bawah untuk menetapkan meja loket absensi dan sesi kedatangan rombongan peserta mereka.
                </p>
              </div>

              {/* Form Input Per Koordinator */}
              <div className="space-y-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pilih Koordinator ({coordinatorStats.length} Koordinator Aktif)
                  </label>
                  <select
                    value={selectedBatchCoord}
                    onChange={(e) => {
                      const name = e.target.value
                      setSelectedBatchCoord(name)
                      const stat = coordinatorStats.find(c => c.name === name)
                      if (stat?.desks[0]) setBatchCoordDesk(stat.desks[0])
                      if (stat?.schedules[0]) setBatchCoordSchedule(stat.schedules[0])
                    }}
                    className="w-full h-9 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-bold text-slate-900 dark:text-slate-100"
                  >
                    <option value="">-- Pilih Salah Satu Koordinator --</option>
                    {coordinatorStats.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.count} orang)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Posisi Meja / Loket</label>
                    <Input
                      value={batchCoordDesk}
                      onChange={(e) => setBatchCoordDesk(e.target.value)}
                      placeholder="Contoh: Meja 1 atau Loket A"
                      className="text-xs h-9 font-medium"
                    />
                    <div className="flex flex-wrap gap-1">
                      {["Meja 1", "Meja 2", "Meja 3", "Meja 4", "Meja 5"].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setBatchCoordDesk(m)}
                          className="text-[9px] font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-sky-100 hover:text-sky-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Jadwal / Sesi Waktu</label>
                    <Input
                      value={batchCoordSchedule}
                      onChange={(e) => setBatchCoordSchedule(e.target.value)}
                      placeholder="Contoh: Sesi 1 (08.00 - 10.00 WIB)"
                      className="text-xs h-9 font-medium"
                    />
                    <div className="flex flex-wrap gap-1">
                      {["Sesi 1 (08.00 - 10.00 WIB)", "Sesi 2 (10.00 - 12.00 WIB)", "Sesi 3 (13.00 - 15.00 WIB)"].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setBatchCoordSchedule(s)}
                          className="text-[9px] font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-amber-100 hover:text-amber-900 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          {s.split(" ")[0]} {s.split(" ")[1]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={isSubmitting || !selectedBatchCoord}
                  onClick={() => executeCoordinatorAssignment(selectedBatchCoord, batchCoordDesk, batchCoordSchedule)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 gap-2 cursor-pointer shadow-sm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Terapkan ke Peserta Koordinator {selectedBatchCoord || "..."}
                </Button>
              </div>

              {/* Opsi Cepat: Bagi Rata Semua Koordinator ke Meja 1-4 */}
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Opsi Cepat Otomatis:
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => executeAutoDistributeAllCoordinators(4)}
                    className="text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-8 gap-1.5 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Bagi Rata Seluruh Koordinator ke Meja 1 - 4
                  </Button>
                </div>

                {/* Ringkasan Tabel Koordinator */}
                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-zinc-800 rounded-lg">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-100 dark:bg-zinc-800 sticky top-0 font-bold text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="py-1.5 px-2 text-left">Koordinator</th>
                        <th className="py-1.5 px-2 text-center">Peserta</th>
                        <th className="py-1.5 px-2 text-center">Meja</th>
                        <th className="py-1.5 px-2 text-center">Sesi</th>
                        <th className="py-1.5 px-2 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {coordinatorStats.map((c) => (
                        <tr key={c.name} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                          <td className="py-1 px-2 font-bold uppercase">{c.name}</td>
                          <td className="py-1 px-2 text-center font-mono font-bold text-slate-600 dark:text-slate-300">{c.count}</td>
                          <td className="py-1 px-2 text-center">
                            {c.desks[0] ? (
                              <span className="bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded text-[9.5px] font-bold">
                                {c.desks[0].split(" ")[0]} {c.desks[0].split(" ")[1] || ""}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-1 px-2 text-center">
                            {c.schedules[0] ? (
                              <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[9.5px] font-bold">
                                {c.schedules[0].split(" ")[0]} {c.schedules[0].split(" ")[1] || ""}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-1 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBatchCoord(c.name)
                                if (c.desks[0]) setBatchCoordDesk(c.desks[0])
                                if (c.schedules[0]) setBatchCoordSchedule(c.schedules[0])
                              }}
                              className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                            >
                              Pilih
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Bagi Rata Sesi Waktu */}
            <TabsContent value="even_sessions" className="space-y-4 pt-3">
              <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <p className="font-bold">
                  Bagi rata {verifiedActorsList.length} peserta secara proporsional ke beberapa sesi waktu:
                </p>
                <p className="text-[11px] leading-relaxed">
                  Peserta akan dibagi secara berurutan agar jumlah kehadiran per sesi berimbang dan tidak terjadi penumpukan antrean.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pilih Jumlah Sesi Kehadiran
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setEvenSplitCount(num)}
                      className={cn(
                        "py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                        evenSplitCount === num 
                          ? "bg-amber-500 text-white border-amber-600 shadow-xs" 
                          : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-zinc-700"
                      )}
                    >
                      {num} Sesi ({Math.ceil(verifiedActorsList.length / num)} org/sesi)
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => executeEvenSessionSplit(evenSplitCount)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-10 gap-2 cursor-pointer shadow-sm"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                Bagi Rata ke {evenSplitCount} Sesi Waktu
              </Button>
            </TabsContent>

            {/* TAB 3: Atur Massal Data Terfilter */}
            <TabsContent value="custom_filter" className="space-y-4 pt-3">
              <div className="bg-slate-50 dark:bg-zinc-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <p className="font-bold">
                  Terapkan Meja & Jadwal ke data yang sedang tampil/terfilter:
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Saat ini terdapat <strong>{filteredActors.length} pelaku usaha</strong> yang memenuhi kriteria filter pencarian Anda.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih / Ketik Posisi Meja</label>
                  <Input
                    value={customBatchDesk}
                    onChange={(e) => setCustomBatchDesk(e.target.value)}
                    placeholder="Contoh: Meja 1 (Kec. Barat) atau Loket A"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih / Ketik Jadwal Sesi</label>
                  <Input
                    value={customBatchSchedule}
                    onChange={(e) => setCustomBatchSchedule(e.target.value)}
                    placeholder="Contoh: Sesi 1 (08.00 - 10.00 WIB)"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <Button
                type="button"
                disabled={isSubmitting || filteredActors.length === 0}
                onClick={() => executeCustomBatchAssignment(customBatchDesk, customBatchSchedule)}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 gap-2 cursor-pointer shadow-sm"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Terapkan ke {filteredActors.length} Data Terfilter
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t pt-3 flex items-center justify-between">
            {isAdmin && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowResetScheduleDialog(true)}
                className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                Kosongkan Meja & Sesi
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowScheduleModal(false)}
              className="text-xs font-bold cursor-pointer"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL DIALOG 2: UBAH STATUS KEHADIRAN, CATATAN, MEJA & SESI PER ORANG ─── */}
      <Dialog open={!!notesModalActor} onOpenChange={(open) => { if (!open) setNotesModalActor(null) }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary font-black uppercase text-base flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" /> Presensi Pelaku Usaha
            </DialogTitle>
            <DialogDescription className="text-xs">
              Atur status presensi, meja, dan jadwal untuk <strong className="text-slate-900 dark:text-slate-100">{notesModalActor?.fullName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            {/* Status Kehadiran */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status Kehadiran</label>
              <Select value={customStatus} onValueChange={(val) => setCustomStatus(val as AttendanceStatus)}>
                <SelectTrigger className="font-semibold text-xs">
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

            {/* Posisi Meja */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span>Posisi Meja / Loket Absensi</span>
              </label>
              <div className="space-y-1">
                <Input
                  value={customDesk}
                  onChange={(e) => setCustomDesk(e.target.value)}
                  placeholder="Contoh: Meja 1 (Kec. Tanjungpinang Barat)"
                  className="text-xs h-9 font-medium"
                />
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1">
                  {[
                    "Meja 1 (Kec. Tanjungpinang Barat)",
                    "Meja 2 (Kec. Tanjungpinang Timur)",
                    "Meja 3 (Kec. Bukit Bestari)",
                    "Meja 4 (Kec. Tanjungpinang Kota)"
                  ].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCustomDesk(m)}
                      className="text-[9px] font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-sky-100 hover:text-sky-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      {m.split(" ")[0]} {m.split(" ")[1]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Jadwal Sesi */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Jadwal / Sesi Waktu Kedatangan</span>
              </label>
              <div className="space-y-1">
                <Input
                  value={customSchedule}
                  onChange={(e) => setCustomSchedule(e.target.value)}
                  placeholder="Contoh: Sesi 1 (08.00 - 10.00 WIB)"
                  className="text-xs h-9 font-medium"
                />
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1">
                  {[
                    "Sesi 1 (08.00 - 10.00 WIB)",
                    "Sesi 2 (10.00 - 12.00 WIB)",
                    "Sesi 3 (13.00 - 15.00 WIB)",
                    "Sesi 4 (15.00 - 17.00 WIB)"
                  ].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCustomSchedule(s)}
                      className="text-[9px] font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-amber-100 hover:text-amber-900 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      {s.split(" ")[0]} {s.split(" ")[1]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sesuaikan Nama Koordinator (Khusus Admin bila ada ketidaksinkronan data seperti Sulastri) */}
            {isAdmin && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-zinc-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Nama Koordinator</span>
                  <span className="text-[10px] text-muted-foreground font-normal">(Opsional sinkronisasi nama)</span>
                </label>
                <Input
                  value={customCoordinator}
                  onChange={(e) => setCustomCoordinator(e.target.value)}
                  placeholder="Nama Koordinator"
                  className="text-xs h-9 uppercase font-semibold"
                />
              </div>
            )}

            {/* Catatan Khusus */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Catatan Khusus (Opsional)</label>
              <Textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Contoh: Diwakili keluarga, dokumen dibawa lengkap, dll."
                className="text-xs min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNotesModalActor(null)}
              className="w-full sm:w-auto font-bold text-xs cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (notesModalActor) {
                  handleUpdateAttendance(
                    notesModalActor, 
                    customStatus, 
                    customNotes, 
                    customDesk, 
                    customSchedule,
                    customCoordinator
                  )
                }
              }}
              className="w-full sm:w-auto font-bold text-xs bg-primary hover:bg-primary/90 cursor-pointer"
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

      {/* ─── CONFIRM DIALOG: RESET JADWAL & MEJA ─── */}
      <ConfirmDialog
        open={showResetScheduleDialog}
        onOpenChange={setShowResetScheduleDialog}
        title="Kosongkan Seluruh Jadwal & Meja"
        description="Apakah Anda yakin ingin mengosongkan seluruh penetapan posisi meja dan sesi kehadiran untuk seluruh pelaku usaha?"
        onConfirm={executeResetScheduleAndDesk}
        confirmText="Ya, Kosongkan Semua"
        variant="destructive"
        icon={<AlertTriangle className="w-8 h-8 text-destructive" />}
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
