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
  ClipboardCheck,
  ListChecks,
  Calendar,
  Ban,
  Clock,
  Info
} from "lucide-react"
import { useUser, useObject, useMemoFirebase, useList, useDatabase } from "@/firebase"
import { ref } from "firebase/database"

export function useNavigation() {
  const { user } = useUser()
  const database = useDatabase()

  // Admin Check
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole } = useObject(adminRef)

  // System User / Role Check
  const usersRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  const { data: allUsersForProfile } = useList(usersRef)
  const userProfile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isMonitoring = userProfile?.role === 'monitoring'
  const isKoordinator = userProfile?.role === 'koordinator'
  const isPetugas = userProfile?.role === 'petugas'
  const isDinas = userProfile?.role === 'dinas'
  const isInspektorat = userProfile?.role === 'inspektorat'
  
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
      show: !!user && !isDinas && !isInspektorat && !isKoordinator,
      color: "#f59e0b", // amber-500
      description: "Statistik & Ringkasan Data"
    },
    {
      name: "Pesan Chat",
      href: "/messages",
      icon: MessageSquare,
      show: !!user && !isDinas && !isInspektorat && !isKoordinator,
      color: "#4f46e5", // indigo-600
      description: "Komunikasi Internal",
      badge: totalUnread > 0 ? totalUnread : undefined
    },
    {
      name: "Cek Data",
      href: "/check-data",
      icon: SearchCheck,
      show: (isAdmin || isPetugas) && !isDinas,
      color: "#2563eb", // blue-600
      description: "Pencarian Data Pelaku Usaha"
    },
    {
      name: "Cek Data Kolektif",
      href: "/check-data-collective",
      icon: SearchCheck,
      show: (isAdmin || isPetugas) && !isDinas,
      color: "#0891b2", // cyan-600
      description: "Verifikasi Data Massal"
    },
    {
      name: "Input Data",
      href: "/input",
      icon: UserPlus,
      show: !!user && !isKoordinator && !isDinas,
      color: "#059669", // emerald-600
      description: "Pendaftaran Pelaku Usaha Baru"
    },
    {
      name: "Verifikasi Admin",
      href: "/verify-actor",
      icon: ShieldCheck,
      show: (isAdmin || isMonitoring || isPetugas) && !isDinas,
      color: "#7c3aed", // violet-600
      description: "Persetujuan Data Pendaftar"
    },
    {
      name: "Data Pelaku Usaha",
      href: "/actor-data",
      icon: Users,
      show: (!!user && !isDinas) || isInspektorat,
      color: "#0284c7", // sky-600
      description: "Database Seluruh Pelaku Usaha"
    },
    {
      name: "Rekapan Data",
      href: "/rekapan-data",
      icon: BarChart3,
      show: !!user && !isDinas && !isInspektorat && !isKoordinator,
      color: "#d97706", // amber-600
      description: "Rekap Data Per Wilayah"
    },
    {
      name: "BPJS Ketenagakerjaan",
      href: "/bpjs",
      icon: ShieldCheck,
      show: !!user && !isDinas && !isInspektorat && !isKoordinator,
      color: "#15803d", // green-700
      description: "Monitoring BPJS Peserta"
    },
    {
      name: "Data Ditolak",
      href: "/rejected",
      icon: Ban,
      show: !!user && !isDinas && !isKoordinator,
      color: "#f97316", // orange-500
      description: "Arsip Data yang Tidak Disetujui"
    },
    {
      name: "Verifikasi & Validasi Dinas",
      href: "/verifikasi-dinas",
      icon: ClipboardCheck,
      show: isAdmin || isDinas || isPetugas,
      color: "#c026d3", // fuchsia-600
      description: "Tahap Akhir Verifikasi Dinas"
    },
    {
      name: "HASIL VERIFIKASI",
      href: "/hasil-verifikasi",
      icon: ListChecks,
      show: (isAdmin || isPetugas) && !isDinas,
      color: "#0d9488", // teal-600
      description: "Laporan Hasil Verifikasi"
    },
    {
      name: "Rekening Bank",
      href: "/rekening-bank",
      icon: CreditCard,
      show: !!user && !isDinas && !isInspektorat,
      color: "#475569", // slate-600
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
      show: (isAdmin || isPetugas || isMonitoring || isKoordinator) && !isDinas,
      color: "#52525b", // zinc-600
      description: "Laporan Pertanggungjawaban"
    },
    {
      name: "Tanda Terima LPJ",
      href: "/lpj-receipt",
      icon: FileText,
      show: (isAdmin || isPetugas || isMonitoring) && !isDinas,
      color: "#6366f1", // indigo-500
      description: "Cetak Tanda Terima LPJ Koordinator"
    },
    {
      name: "Data Selesai",
      href: "/finish",
      icon: CheckCircle2,
      show: !!user && !isDinas && !isInspektorat && !isKoordinator,
      color: "#1d4ed8", // blue-700
      description: "Data yang Telah Selesai Diproses"
    },
    {
      name: "Manajemen User",
      href: "/users",
      icon: UserCog,
      show: isAdmin,
      color: "#1e293b", // slate-800
      description: "Kelola Pengguna Sistem"
    },
    {
      name: "Pengaturan",
      href: "/settings",
      icon: UserCog,
      show: !!user && !isDinas && !isInspektorat && !isKoordinator,
      color: "#94a3b8", // slate-400
      description: "Konfigurasi Profil & Sistem"
    },
    {
      name: "Pengaturan Teks",
      href: "/settings-running-text",
      icon: MessageSquare,
      show: isAdmin,
      color: "#ec4899", // pink-500
      description: "Konfigurasi Teks Berjalan"
    },
    {
      name: "Pengaturan Slideshow",
      href: "/settings-slideshow",
      icon: Calendar,
      show: isAdmin,
      color: "#db2777", // pink-600
      description: "Manajemen Slideshow Login"
    },
    {
      name: "Kuota KORLAP / DEWAN",
      href: "/kuota-koordinator",
      icon: BarChart3,
      show: isAdmin,
      color: "#f59e0b", // amber-500
      description: "Manajemen Kuota"
    },
    {
      name: "Pengaturan Event",
      href: "/settings-event",
      icon: Calendar,
      show: isAdmin,
      color: "#8b5cf6", // violet-500
      description: "Manajemen Event & Jadwal"
    },
    {
      name: "Jam & Libur Kantor",
      href: "/settings-office-hours",
      icon: Clock,
      show: isAdmin,
      color: "#10b981", // emerald-500
      description: "Pengaturan Jam Operasional & Libur"
    },
    {
      name: "Pengaturan Informasi",
      href: "/settings-info",
      icon: Info,
      show: isAdmin,
      color: "#64748b", // slate-500
      description: "Kelola Konten Informasi Aplikasi"
    },
    {
      name: "LOG APLIKASI",
      href: "/app-logs",
      icon: History,
      show: isAdmin,
      color: "#000000", // black
      description: "Riwayat Aktivitas Sistem"
    },
  ], [user, isAdmin, isMonitoring, userProfile, totalUnread])

  return {
    navigation: navigation.filter(item => item.show),
    isAdmin,
    isKoordinator,
    isMonitoring,
    isPetugas,
    isDinas,
    isInspektorat,
    userProfile
  }
}
