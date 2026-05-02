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
  Ban
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

  const navigation = React.useMemo(() => [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      show: !!user && !isKoordinator,
      color: "bg-amber-500",
      hoverColor: "hover:bg-amber-600",
      borderColor: "border-amber-400",
      description: "Statistik & Ringkasan Data"
    },
    {
      name: "Pesan Chat",
      href: "/messages",
      icon: MessageSquare,
      show: !!user,
      color: "bg-indigo-600",
      hoverColor: "hover:bg-indigo-700",
      borderColor: "border-indigo-500",
      description: "Komunikasi Internal"
    },
    {
      name: "Cek Data",
      href: "/check-data",
      icon: SearchCheck,
      show: isAdmin || isPetugas,
      color: "bg-blue-600",
      hoverColor: "hover:bg-blue-700",
      borderColor: "border-blue-500",
      description: "Pencarian Data Pelaku Usaha"
    },
    {
      name: "Cek Data Kolektif",
      href: "/check-data-collective",
      icon: SearchCheck,
      show: isAdmin || isPetugas,
      color: "bg-cyan-600",
      hoverColor: "hover:bg-cyan-700",
      borderColor: "border-cyan-500",
      description: "Verifikasi Data Massal"
    },
    {
      name: "Input Data",
      href: "/input",
      icon: UserPlus,
      show: !!user && !isKoordinator,
      color: "bg-emerald-600",
      hoverColor: "hover:bg-emerald-700",
      borderColor: "border-emerald-500",
      description: "Pendaftaran Pelaku Usaha Baru"
    },
    {
      name: "Verifikasi Admin",
      href: "/verify-actor",
      icon: ShieldCheck,
      show: isAdmin || isMonitoring,
      color: "bg-violet-600",
      hoverColor: "hover:bg-violet-700",
      borderColor: "border-violet-500",
      description: "Persetujuan Data Pendaftar"
    },
    {
      name: "Data Pelaku Usaha",
      href: "/actor-data",
      icon: Users,
      show: !!user && !isDinas,
      color: "bg-sky-600",
      hoverColor: "hover:bg-sky-700",
      borderColor: "border-sky-500",
      description: "Database Seluruh Pelaku Usaha"
    },
    {
      name: "BPJS Ketenagakerjaan",
      href: "/bpjs",
      icon: ShieldCheck,
      show: !!user && !isDinas,
      color: "bg-green-700",
      hoverColor: "hover:bg-green-800",
      borderColor: "border-green-600",
      description: "Monitoring BPJS Peserta"
    },
    {
      name: "Data Ditolak",
      href: "/rejected",
      icon: Ban,
      show: !!user && !isDinas && !isKoordinator,
      color: "bg-orange-500",
      hoverColor: "hover:bg-orange-600",
      borderColor: "border-orange-400",
      description: "Arsip Data yang Tidak Disetujui"
    },
    {
      name: "Verifikasi Data",
      href: "/verify-bank",
      icon: CreditCard,
      show: isAdmin || isMonitoring,
      color: "bg-rose-500",
      hoverColor: "hover:bg-rose-600",
      borderColor: "border-rose-400",
      description: "Validasi Rekening Bank"
    },
    {
      name: "Verifikasi & Validasi Dinas",
      href: "/verifikasi-dinas",
      icon: ClipboardCheck,
      show: isAdmin || isDinas || isPetugas,
      color: "bg-fuchsia-600",
      hoverColor: "hover:bg-fuchsia-700",
      borderColor: "border-fuchsia-500",
      description: "Tahap Akhir Verifikasi Dinas"
    },
    {
      name: "HASIL VERIFIKASI",
      href: "/hasil-verifikasi",
      icon: ListChecks,
      show: (isAdmin || isPetugas || isKoordinator) && !isDinas,
      color: "bg-teal-600",
      hoverColor: "hover:bg-teal-700",
      borderColor: "border-teal-500",
      description: "Laporan Hasil Verifikasi"
    },
    {
      name: "Rekening Bank",
      href: "/rekening-bank",
      icon: CreditCard,
      show: !!user && !isDinas,
      color: "bg-slate-600",
      hoverColor: "hover:bg-slate-700",
      borderColor: "border-slate-500",
      description: "Daftar Rekening Per Bank"
    },
    {
      name: "LPJ",
      href: "/lpj",
      icon: FileText,
      show: (isAdmin || isPetugas || isMonitoring) && !isKoordinator,
      color: "bg-zinc-600",
      hoverColor: "hover:bg-zinc-700",
      borderColor: "border-zinc-500",
      description: "Laporan Pertanggungjawaban"
    },
    {
      name: "Data Selesai",
      href: "/finish",
      icon: CheckCircle2,
      show: !!user && !isDinas,
      color: "bg-blue-700",
      hoverColor: "hover:bg-blue-800",
      borderColor: "border-blue-600",
      description: "Data yang Telah Selesai Diproses"
    },
    {
      name: "Manajemen User",
      href: "/users",
      icon: UserCog,
      show: isAdmin,
      color: "bg-slate-800",
      hoverColor: "hover:bg-slate-900",
      borderColor: "border-slate-700",
      description: "Kelola Pengguna Sistem"
    },
    {
      name: "Pengaturan",
      href: "/settings",
      icon: UserCog,
      show: !!user,
      color: "bg-slate-400",
      hoverColor: "hover:bg-slate-500",
      borderColor: "border-slate-300",
      description: "Konfigurasi Profil & Sistem"
    },
    {
      name: "LOG APLIKASI",
      href: "/app-logs",
      icon: History,
      show: isAdmin,
      color: "bg-black",
      hoverColor: "hover:bg-zinc-900",
      borderColor: "border-zinc-800",
      description: "Riwayat Aktivitas Sistem"
    },
  ], [user, isAdmin, isMonitoring, userProfile])

  return {
    navigation: navigation.filter(item => item.show),
    isAdmin,
    isKoordinator,
    isMonitoring,
    isPetugas,
    isDinas,
    userProfile
  }
}
