"use client"

import { useState, useEffect } from "react"
import { useUser, useDatabase, useMemoFirebase, useList, updateDocumentNonBlocking } from "@/firebase"
import { ref, query, equalTo, limitToFirst } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Image as ImageIcon
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function ProfilePage() {
  const { user, isUserLoading } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [mounted, setMounted] = useState(false)

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
            img.onerror = (err) => reject(new Error("Gagal membaca gambar"))
          }
          reader.onerror = (err) => reject(new Error("Gagal membaca file"))
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
        title: "Profil Diperbarui",
        description: "Data diri Anda berhasil disimpan ke sistem.",
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
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-20 text-center animate-in fade-in duration-500">
        <div className="mx-auto w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <UserCircle className="w-12 h-12 text-slate-300" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Login Terlebih Dahulu</h1>
        <p className="text-slate-500 font-medium mb-8">Anda harus masuk ke sistem untuk mengakses halaman ini.</p>
        <Button asChild className="font-bold px-8 h-12">
          <a href="/login">MASUK KE SISTEM</a>
        </Button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-20 text-center animate-in fade-in duration-500">
         <div className="mx-auto w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
          <ShieldCheck className="w-12 h-12 text-amber-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Data Belum Sinkron</h1>
        <p className="text-slate-500 font-medium max-w-sm mx-auto">
          Akun Anda ({user.email}) sudah aktif, namun data profil Anda belum tersedia atau belum ditautkan oleh Admin.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atau coba reload halaman</p>
           <Button onClick={() => window.location.reload()} variant="outline" className="font-bold border-slate-200">
              RELOAD HALAMAN
           </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-center gap-6 mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="relative group">
          <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center shadow-inner overflow-hidden border-2 border-white ring-4 ring-primary/10">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserCircle className="w-14 h-14 text-primary/40" />
            )}
            
            {isUploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </div>
          
          <label className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg border-2 border-white cursor-pointer hover:scale-110 active:scale-95 transition-all">
            <Camera className="w-4 h-4" />
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
          </label>
        </div>
        
        <div className="text-center md:text-left">
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Update Profil</h1>
          </div>
          <p className="text-slate-500 font-medium">Lengkapi data diri Anda untuk memudahkan koordinasi.</p>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Informasi Akun & Data Diri
          </CardTitle>
          <CardDescription>
            Username dan Role ditentukan oleh Administrator dan tidak dapat diubah secara mandiri.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 opacity-60">
                <Label className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Username / ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input value={profile.id} disabled className="pl-10 bg-slate-50 font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-2 opacity-60">
                <Label className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Role / Jabatan</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    value={
                      profile.role === 'koordinator' ? "USULAN" : 
                      profile.role === 'petugas' ? "PETUGAS INPUT" :
                      profile.role?.toUpperCase() || "-"
                    } 
                    disabled 
                    className="pl-10 bg-slate-50 font-black text-xs uppercase" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-[10px] uppercase tracking-wider text-slate-600">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <Input name="fullName" defaultValue={profile.fullName} placeholder="Masukkan nama lengkap..." className="pl-10 focus-visible:ring-primary border-slate-200" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-[10px] uppercase tracking-wider text-slate-600">Nomor Ponsel (WhatsApp)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <Input name="phoneNumber" defaultValue={profile.phoneNumber} placeholder="Contoh: 081234567890" className="pl-10 focus-visible:ring-primary border-slate-200" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-[10px] uppercase tracking-wider text-slate-600">NIK (Nomor Induk Kependudukan)</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <Input name="nik" defaultValue={profile.nik} placeholder="Masukkan 16 digit NIK..." className="pl-10 focus-visible:ring-primary border-slate-200" required maxLength={16} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-[10px] uppercase tracking-wider text-slate-600">Alamat Lengkap</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-primary/40" />
                <Textarea name="address" defaultValue={profile.address} placeholder="Masukkan alamat lengkap domisili..." className="pl-10 min-h-[100px] focus-visible:ring-primary border-slate-200" required />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
              Simpan Data Profil
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] py-4">
        &copy; SIMPU - Sistem Informasi Manajemen Pelaku Usaha
      </p>
    </div>
  )
}
