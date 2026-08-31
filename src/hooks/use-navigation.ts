import * as React from "react"
import {
  LayoutDashboard,
  UserPlus,
  ShieldCheck,
  Users,
  CreditCard,
  CheckCircle2,
  UserCog,
  SearchCheck,
  MessageSquare,
  History,
  FileText,
  BarChart3,
  FileSpreadsheet,
  ClipboardCheck,
  ListChecks,
  Calendar,
  Ban,
  Clock,
  ShieldAlert,
  UserCheck,
  Info,
  FileDown,
  Tv
} from "lucide-react"
import { useUser, useObject, useMemoFirebase, useList, useDatabase } from "@/firebase"
import { ref } from "firebase/database"

export function useNavigation() {
  const { user, userProfile } = useUser()
  const database = useDatabase()

  // Admin Check
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole } = useObject(adminRef)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isMonitoring = userProfile?.role === 'monitoring'
  const isKoordinator = userProfile?.role === 'koordinator'
  const isPetugas = userProfile?.role === 'petugas_survey' || userProfile?.role === 'petugas'
  const isDinas = userProfile?.role === 'dinas'
  const isVerifikatorDinas = userProfile?.role === 'verifikator_dinas'
  const isInspektorat = userProfile?.role === 'inspektorat'
  const isStaff = userProfile?.role === 'staff'
  
  // Real-time unread count
  const chatsRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `chats/${user.uid}`)
  }, [user, database])
  const { data: userChats } = useList(chatsRef)

  const totalUnread = React.useMemo(() => {
    if (!userChats) return 0
    return userChats.filter((c: any) => c.unread === true).length
  }, [userChats])

  const navigation = React.useMemo(() => [
    {
      name: "Dashboard Statistik",
      href: "/dashboard",
      icon: LayoutDashboard,
      show: !!user && !isDinas && !isVerifikatorDinas && !isInspektorat && !isKoordinator && !isPetugas,
      color: "#f59e0b",
      description: "Statistik & Ringkasan Data"
    },
    {
      name: "Layar Informasi",
      href: "/layar-informasi",
      icon: Tv,
      show: !!user || true, // Can be accessed with or without login
      color: "#06b6d4",
      description: "Live Display & Layar Monitoring Realtime"
    },
    {
      name: "Pesan Chat",
      href: "/messages",
      icon: MessageSquare,
      show: !!user && !isDinas && !isInspektorat && !isKoordinator,
      color: "#4f46e5",
      description: "Komunikasi Internal",
      badge: totalUnread > 0 ? totalUnread : undefined
    },
    {
      name: "Cek Data",
      href: "/check-data",
      icon: SearchCheck,
      show: (isAdmin || isStaff) && !isDinas && !isVerifikatorDinas,
      color: "#2563eb",
      description: "Pencarian Data Pelaku Usaha"
    },
    {
      name: "Cek Data Kolektif",
      href: "/check-data-collective",
      icon: SearchCheck,
      show: (isAdmin || isStaff) && !isDinas && !isVerifikatorDinas,
      color: "#0891b2",
      description: "Verifikasi Data Massal"
    },
    {
      name: "Input Data",
      href: "/input",
      icon: UserPlus,
      show: !!user && !isKoordinator && !isDinas && !isVerifikatorDinas && !isPetugas,
      color: "#059669",
      description: "Pendaftaran Pelaku Usaha Baru"
    },
    {
      name: "Verifikasi Admin",
      href: "/verify-actor",
      icon: ShieldCheck,
      show: (isAdmin || isMonitoring || isStaff) && !isDinas && !isVerifikatorDinas && !isPetugas,
      color: "#7c3aed",
      description: "Persetujuan Data Pendaftar"
    },
    {
      name: "Data Pelaku Usaha",
      href: "/actor-data",
      icon: Users,
      show: (!!user && !isDinas && !isVerifikatorDinas && !isPetugas) || isInspektorat,
      color: "#0284c7",
      description: "Database Seluruh Pelaku Usaha"
    },
    {
      name: "Data Ditolak",
      href: "/rejected",
      icon: Ban,
      show: !!user && !isDinas && !isVerifikatorDinas && !isKoordinator && !isPetugas,
      color: "#f97316",
      description: "Arsip Data yang Tidak Disetujui"
    },
    {
      name: "Survey Dinas",
      href: "/verifikasi-dinas",
      icon: ClipboardCheck,
      show: isAdmin || isDinas || isPetugas || isStaff,
      color: "#c026d3",
      description: "Tahap Awal Verifikasi Dinas"
    },
    {
      name: "Verifikasi Dinas",
      href: "/verifikasi-dinas-berkas",
      icon: ClipboardCheck,
      show: (isAdmin || isVerifikatorDinas || isStaff) && !isPetugas,
      color: "#9333ea",
      description: "Cek Kelengkapan Berkas"
    },
    {
      name: "Hasil Verifikasi",
      href: "/hasil-verifikasi",
      icon: ListChecks,
      show: (isAdmin || isStaff) && !isDinas && !isVerifikatorDinas,
      color: "#0d9488",
      description: "Laporan Hasil Verifikasi"
    },
    {
      name: "GBAS",
      href: "/gbas",
      icon: FileDown,
      show: isAdmin, // KHUSUS ADMINISTRATOR
      color: "#6366f1",
      description: "Download Berita Acara Survey"
    },
    {
      name: "Rekapan Data",
      href: "/rekapan-data",
      icon: BarChart3,
      show: !!user && !isDinas && !isVerifikatorDinas && !isInspektorat && !isKoordinator && !isPetugas,
      color: "#d97706",
      description: "Rekap Semua Data Input (Per Wilayah)"
    },
    {
      name: "BPJS Ketenagakerjaan",
      href: "/bpjs",
      icon: ShieldCheck,
      show: !!user && !isDinas && !isVerifikatorDinas && !isInspektorat && !isKoordinator && !isPetugas,
      color: "#15803d",
      description: "Monitoring BPJS Peserta"
    },
    {
      name: "Rekening Bank",
      href: "/rekening-bank",
      icon: CreditCard,
      show: !!user && !isDinas && !isVerifikatorDinas && !isInspektorat && !isPetugas,
      color: "#475569",
      description: "Daftar Rekening Per Bank",
      items: [
        { name: "BCA", href: "/rekening-bank?bank=BCA" },
        { name: "BNI", href: "/rekening-bank?bank=BNI" },
        { name: "BRI", href: "/rekening-bank?bank=BRI" },
        { name: "BRK", href: "/rekening-bank?bank=BRK" },
        { name: "MANDIRI", href: "/rekening-bank?bank=MANDIRI" },
        { name: "BSI", href: "/rekening-bank?bank=BSI" },
        { name: "BTN", href: "/rekening-bank?bank=BTN" },
        { name: "OCBC", href: "/rekening-bank?bank=OCBC" },
        { name: "PANIN", href: "/rekening-bank?bank=PANIN" },
        { name: "MUAMALAT", href: "/rekening-bank?bank=MUAMALAT" },
        { name: "MAYBANK", href: "/rekening-bank?bank=MAYBANK" },
        { name: "BUKOPIN", href: "/rekening-bank?bank=BUKOPIN" },
        { name: "DANAMON", href: "/rekening-bank?bank=DANAMON" },
        { name: "PERMATA", href: "/rekening-bank?bank=PERMATA" },
      ]
    },
    {
      name: "LPJ",
      href: "/lpj",
      icon: FileText,
      show: (isAdmin || isMonitoring || isKoordinator || isStaff) && !isDinas && !isVerifikatorDinas && !isPetugas,
      color: "#52525b",
      description: "Laporan Pertanggungjawaban"
    },
    {
      name: "Tanda Terima LPJ",
      href: "/lpj-receipt",
      icon: FileText,
      show: (isAdmin || isMonitoring || isStaff) && !isDinas && !isVerifikatorDinas && !isPetugas,
      color: "#6366f1",
      description: "Cetak Tanda Terima LPJ Koordinator"
    },
    {
      name: "Cetak Berkas Pencairan",
      href: "/cetak-berkas",
      icon: FileDown,
      show: (isAdmin || isStaff) && !isDinas && !isVerifikatorDinas && !isPetugas,
      color: "#0284c7",
      description: "Cetak Surat Pernyataan Pencairan Dana"
    },
    {
      name: "Data Selesai",
      href: "/finish",
      icon: CheckCircle2,
      show: !!user && !isDinas && !isVerifikatorDinas && !isInspektorat && !isKoordinator && !isPetugas,
      color: "#1d4ed8",
      description: "Data yang Telah Selesai Diproses"
    },
    // ─── Menu yang TIDAK boleh diakses STAFF ───────────────────────────────────
    {
      name: "Manajemen User",
      href: "/users",
      icon: UserCog,
      show: isAdmin, // STAFF tidak bisa
      color: "#1e293b",
      description: "Kelola Pengguna Sistem"
    },
    {
      name: "Pembagian Petugas Survey",
      href: "/upload-petugas-survey",
      icon: UserCheck,
      show: isAdmin || isKoordinator || isMonitoring,
      color: "#8b5cf6",
      description: "Import Pemetaan & Kelola Petugas Survey"
    },
    {
      name: "Pengaturan",
      href: "/settings",
      icon: UserCog,
      show: !!user && !isDinas && !isVerifikatorDinas && !isInspektorat && !isKoordinator && !isPetugas,
      color: "#94a3b8",
      description: "Konfigurasi Profil & Sistem"
    },
    {
      name: "Pengaturan Teks",
      href: "/settings-running-text",
      icon: MessageSquare,
      show: isAdmin, // STAFF tidak bisa
      color: "#ec4899",
      description: "Konfigurasi Teks Berjalan"
    },
    {
      name: "Pengaturan Slideshow",
      href: "/settings-slideshow",
      icon: Calendar,
      show: isAdmin, // STAFF tidak bisa
      color: "#db2777",
      description: "Manajemen Slideshow Login"
    },
    {
      name: "Kuota USULAN",
      href: "/kuota-koordinator",
      icon: BarChart3,
      show: isAdmin, // STAFF tidak bisa
      color: "#f59e0b",
      description: "Manajemen Kuota"
    },
    {
      name: "Pengaturan Event",
      href: "/settings-event",
      icon: Calendar,
      show: isAdmin, // STAFF tidak bisa
      color: "#8b5cf6",
      description: "Manajemen Event & Jadwal"
    },
    {
      name: "Jam & Libur Kantor",
      href: "/settings-office-hours",
      icon: Clock,
      show: isAdmin, // STAFF tidak bisa
      color: "#10b981",
      description: "Pengaturan Jam Operasional & Libur"
    },
    {
      name: "Maintenance Setting",
      href: "/settings-maintenance",
      icon: ShieldAlert,
      show: isAdmin, // STAFF tidak bisa
      color: "#ef4444",
      description: "Pengaturan Mode Perbaikan Aplikasi"
    },
    {
      name: "Pengaturan Informasi",
      href: "/settings-info",
      icon: Info,
      show: isAdmin, // STAFF tidak bisa
      color: "#64748b",
      description: "Kelola Konten Informasi Aplikasi"
    },
    {
      name: "LOG APLIKASI",
      href: "/app-logs",
      icon: History,
      show: isAdmin, // STAFF tidak bisa
      color: "#000000",
      description: "Riwayat Aktivitas Sistem"
    },
  ], [user, isAdmin, isMonitoring, isKoordinator, isPetugas, isVerifikatorDinas, isDinas, isStaff, userProfile, totalUnread])

  return {
    navigation: navigation.filter(item => item.show),
    isAdmin,
    isKoordinator,
    isMonitoring,
    isPetugas,
    isDinas,
    isVerifikatorDinas,
    isInspektorat,
    isStaff,
    userProfile
  }
}
