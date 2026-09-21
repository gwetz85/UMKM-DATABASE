"use client"

import { useState, useEffect } from "react"
import { useUser, useDatabase, useMemoFirebase, useList, updateDocumentNonBlocking } from "@/firebase"
import { ref } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  User, 
  Phone, 
  CreditCard, 
  MapPin, 
  Save, 
  Loader2,
  ShieldCheck,
  UserCircle,
  Camera,
  Copy,
  Check,
  Lock,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Info,
  BadgeCheck,
  Building
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const { user, isUserLoading } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [nikInput, setNikInput] = useState<string>("")

  useEffect(() => {
    setMounted(true)
  }, [])

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])

  const { data: allUsersForProfile, isLoading: isProfileLoading } = useList(userProfileRef)
  
  // 1. Primary match by UID
  let profile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)
  
  // 2. Fallback match by Username (if UID match fails)
  const username = user?.email?.split('@')[0]
  if (!profile && allUsersForProfile && username) {
    profile = allUsersForProfile.find((u: any) => u.id === username)
  }

  // Effect to auto-link UID if found via fallback
  useEffect(() => {
    if (mounted && user && allUsersForProfile && profile && !profile.uid && database) {
       const userRef = ref(database, `system_users/${profile.id}`)
       updateDocumentNonBlocking(userRef, { uid: user.uid })
    }
  }, [user, profile, allUsersForProfile, mounted, database])

  // Sync initial NIK value to state for character counter
  useEffect(() => {
    if (profile?.nik) {
      setNikInput(profile.nik)
    }
  }, [profile?.nik])

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !database || !profile) return
    
    setIsUploading(true)
    try {
      // Helper function to compress and convert to Base64
      const compressAndConvert = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(file)
          reader.onload = (event) => {
            const img = new Image()
            img.src = event.target?.result as string
            img.onload = () => {
              const canvas = document.createElement('canvas')
              const MAX_SIZE = 150 // Keep it small for database performance
              let width = img.width
              let height = img.height

              if (width > height) {
                if (width > MAX_SIZE) {
                  height *= MAX_SIZE / width
                  width = MAX_SIZE
                }
              } else {
                if (height > MAX_SIZE) {
                  width *= MAX_SIZE / height
                  height = MAX_SIZE
                }
              }

              canvas.width = width
              canvas.height = height
              const ctx = canvas.getContext('2d')
              ctx?.drawImage(img, 0, 0, width, height)
              
              // Low quality and small size to stay free & fast in RTDB
              const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
              resolve(dataUrl)
            }
            img.onerror = () => reject(new Error("Gagal membaca gambar"))
          }
          reader.onerror = () => reject(new Error("Gagal membaca file"))
        })
      }

      const base64Photo = await compressAndConvert(file)
      
      const userRef = ref(database, `system_users/${profile.id}`)
      updateDocumentNonBlocking(userRef, { photoURL: base64Photo })

      toast({
        title: "Foto Berhasil Diperbarui",
        description: "Foto profil Anda telah disimpan ke sistem.",
      })
    } catch (error: any) {
      console.error("Upload error details:", error)
      toast({
        variant: "destructive",
        title: "Gagal Mengunggah",
        description: `Error: ${error.message || "Terjadi kesalahan saat memproses foto."}`,
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!profile || !database) return

    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    
    const updates = {
      fullName: formData.get("fullName") as string,
      phoneNumber: formData.get("phoneNumber") as string,
      nik: formData.get("nik") as string,
      address: formData.get("address") as string,
    }

    try {
      const userRef = ref(database, `system_users/${profile.id}`)
      updateDocumentNonBlocking(userRef, updates)
      toast({
        title: "Profil Berhasil Disimpan",
        description: "Data diri Anda telah diperbarui pada sistem SIMPU.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: "Terjadi kesalahan saat memperbarui profil.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!mounted || isUserLoading || isProfileLoading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Memuat Profil Pengguna...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-12 md:p-20 text-center animate-in fade-in duration-500 max-w-lg mx-auto">
        <div className="mx-auto w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
          <UserCircle className="w-12 h-12 text-slate-400" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Login Terlebih Dahulu</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 text-sm">Anda harus masuk ke sistem SIMPU untuk mengakses dan mengelola profil ini.</p>
        <Button asChild className="font-bold px-8 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
          <a href="/login">MASUK KE SISTEM</a>
        </Button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-12 md:p-20 text-center animate-in fade-in duration-500 max-w-lg mx-auto">
        <div className="mx-auto w-20 h-20 bg-amber-50 dark:bg-amber-950/40 rounded-3xl flex items-center justify-center mb-6 border border-amber-200 dark:border-amber-800">
          <ShieldCheck className="w-12 h-12 text-amber-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Data Belum Sinkron</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm max-w-sm mx-auto leading-relaxed">
          Akun Anda (<span className="font-mono font-bold text-slate-800 dark:text-slate-200">{user.email}</span>) sudah aktif, namun data profil belum ditautkan oleh Administrator.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button onClick={() => window.location.reload()} variant="outline" className="font-bold border-slate-300 dark:border-slate-700 rounded-xl">
            Muat Ulang Halaman
          </Button>
        </div>
      </div>
    )
  }

  const roleLabel = 
    profile.role === 'koordinator' ? "KOORDINATOR / USULAN" : 
    profile.role === 'petugas' ? "PETUGAS INPUT" :
    profile.role === 'petugas_survey' ? "PETUGAS SURVEY" :
    profile.role === 'admin' ? "ADMINISTRATOR" :
    profile.role?.toUpperCase() || "PENGGUNA"

  const roleBadgeStyle = 
    profile.role === 'admin' ? "bg-indigo-600 text-white border-indigo-500" :
    profile.role === 'koordinator' ? "bg-amber-600 text-white border-amber-500" :
    profile.role === 'petugas_survey' ? "bg-teal-600 text-white border-teal-500" :
    profile.role === 'petugas' ? "bg-blue-600 text-white border-blue-500" :
    "bg-slate-700 text-white border-slate-600"

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Page Title Bar */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 p-2 rounded-xl transition-colors cursor-pointer" />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Profil Pengguna
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Kelola informasi akun dan data diri Anda pada Sistem Informasi SIMPU
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Akun Aktif
          </span>
        </div>
      </div>

      {/* Main Content Layout: Left Summary Card + Right Form Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Identity Profile Card */}
        <div className="lg:col-span-4 space-y-5">
          {/* Hero Profile Card */}
          <Card className="border-2 border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
            {/* Gradient Top Cover */}
            <div className="h-28 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 relative flex items-start justify-end p-3">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-xs">
                <Sparkles className="w-3 h-3" /> SIMPU USER
              </span>
            </div>

            {/* Profile Avatar & Details */}
            <div className="px-5 pb-6 text-center relative flex flex-col items-center">
              {/* Avatar Container */}
              <div className="relative -mt-14 mb-3 group">
                <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} alt={profile.fullName || "Profile"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-3xl uppercase">
                      {(profile.fullName || profile.id || "U").substring(0, 2)}
                    </div>
                  )}

                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-1 z-10">
                      <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                      <span className="text-[9px] font-black uppercase tracking-wider">Mengunggah...</span>
                    </div>
                  )}
                </div>

                {/* Camera Upload Trigger */}
                <label 
                  className="absolute -bottom-1 -right-1 bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-2xl shadow-lg border-2 border-white dark:border-slate-900 cursor-pointer hover:scale-110 active:scale-95 transition-all"
                  title="Ganti Foto Profil"
                >
                  <Camera className="w-4 h-4" />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handlePhotoUpload} 
                    disabled={isUploading} 
                  />
                </label>
              </div>

              {/* User Name & Role */}
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">
                {profile.fullName || profile.id || "Nama Pengguna"}
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[240px]">
                {user.email}
              </p>

              {/* Role Badge */}
              <div className="mt-3">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs border",
                  roleBadgeStyle
                )}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {roleLabel}
                </span>
              </div>

              {/* Account Quick Meta */}
              <div className="w-full mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-left">
                {/* User ID with Copy */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ID Sistem</span>
                    <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{profile.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(profile.id, "ID Sistem")}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
                    title="Salin ID"
                  >
                    {copiedKey === "ID Sistem" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* WhatsApp Quick Link */}
                {profile.phoneNumber && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nomor WhatsApp</span>
                      <p className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">{profile.phoneNumber}</p>
                    </div>
                    <a
                      href={`https://wa.me/${String(profile.phoneNumber).replace(/\D/g, "").replace(/^0/, "62")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-transparent hover:border-emerald-200 transition-all cursor-pointer"
                      title="Tes Hubungi WhatsApp"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Quick Notice Card */}
          <Card className="border-2 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-3xl p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                  Panduan Data Profil
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Pastikan data Nama Lengkap dan Nomor WhatsApp aktif agar seluruh notifikasi sistem dan proses koordinasi pendataan berjalan optimal.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Form Edit Profile */}
        <div className="lg:col-span-8">
          <Card className="border-2 border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Pengaturan Data Profil
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Lengkapi atau sesuaikan rincian identitas akun resmi Anda di bawah ini.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-7">
              <form onSubmit={handleSave} className="space-y-6">
                {/* SECTION 1: Kredensial Akun (Read Only) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Kredensial &amp; Otoritas Sistem
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Username / ID */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase text-slate-500">Username / ID</Label>
                        <span className="text-[10px] font-semibold text-slate-400">Terkunci</span>
                      </div>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          value={profile.id} 
                          disabled 
                          className="pl-10 pr-10 bg-slate-100/70 dark:bg-slate-800/60 font-mono text-xs font-bold text-slate-700 dark:text-slate-300 h-10.5 rounded-xl border-slate-200 dark:border-slate-700 cursor-not-allowed" 
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy(profile.id, "Username / ID")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors p-1"
                          title="Salin Username"
                        >
                          {copiedKey === "Username / ID" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Role / Jabatan */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase text-slate-500">Role / Hak Akses</Label>
                        <span className="text-[10px] font-semibold text-slate-400">Ditetapkan Admin</span>
                      </div>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          value={roleLabel} 
                          disabled 
                          className="pl-10 bg-slate-100/70 dark:bg-slate-800/60 font-black text-xs uppercase text-slate-700 dark:text-slate-300 h-10.5 rounded-xl border-slate-200 dark:border-slate-700 cursor-not-allowed" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Data Pribadi & Kontak */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Informasi Identitas Pribadi
                    </span>
                  </div>

                  {/* Nama Lengkap */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Nama Lengkap</span>
                      <span className="text-[10px] text-emerald-600 font-bold uppercase">* Wajib Diisi</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                      <Input 
                        name="fullName" 
                        defaultValue={profile.fullName} 
                        placeholder="Masukkan nama lengkap beserta gelar jika ada..." 
                        className="pl-10 h-11 rounded-xl font-bold border-slate-300 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500 text-sm shadow-xs" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nomor Ponsel / WhatsApp */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Nomor WhatsApp / HP</span>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase">* Wajib</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                        <Input 
                          name="phoneNumber" 
                          defaultValue={profile.phoneNumber} 
                          placeholder="Contoh: 081234567890" 
                          className="pl-10 h-11 rounded-xl font-bold font-mono border-slate-300 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500 text-sm shadow-xs" 
                          required 
                        />
                      </div>
                    </div>

                    {/* NIK */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          NIK (16 Digit KTP)
                        </Label>
                        <span className={cn(
                          "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded",
                          nikInput.length === 16 ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300" : "text-slate-400 bg-slate-100 dark:bg-slate-800"
                        )}>
                          {nikInput.length}/16
                        </span>
                      </div>
                      <div className="relative">
                        <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                        <Input 
                          name="nik" 
                          value={nikInput}
                          onChange={(e) => setNikInput(e.target.value.replace(/\D/g, "").slice(0, 16))}
                          placeholder="Masukkan 16 digit NIK..." 
                          className="pl-10 h-11 rounded-xl font-bold font-mono tracking-wider border-slate-300 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500 text-sm shadow-xs" 
                          required 
                          maxLength={16} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Alamat Domisili */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Alamat &amp; Domisili Petugas
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Alamat Lengkap (Domisili / Kantor)
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-600" />
                      <Textarea 
                        name="address" 
                        defaultValue={profile.address} 
                        placeholder="Masukkan alamat lengkap domisili atau instansi tugas Anda..." 
                        className="pl-10 min-h-[95px] rounded-xl font-medium border-slate-300 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500 text-sm leading-relaxed shadow-xs" 
                        required 
                      />
                    </div>
                  </div>
                </div>

                {/* Submit CTA Button */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-400 font-medium text-center sm:text-left">
                    Data profil akan disinkronkan secara *real-time* ke server SIMPU.
                  </p>
                  <Button 
                    type="submit" 
                    className="w-full sm:w-auto h-11 px-8 font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-98" 
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Simpan Data Profil
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="pt-4 text-center">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
          &copy; SIMPU &bull; Sistem Informasi Manajemen Pelaku Usaha &bull; Diskop UKM
        </p>
      </div>
    </div>
  )
}
