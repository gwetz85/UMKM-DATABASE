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
  UserCircle
} from "lucide-react"

export default function ProfilePage() {
  const { user, isUserLoading } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])

  const { data: allUsersForProfile, isLoading: isProfileLoading } = useList(userProfileRef)
  const profile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)

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

  if (!user || !profile) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-2xl font-bold">Silahkan Login Terlebih Dahulu</h1>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
          <UserCircle className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Update Profil</h1>
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
                  <Input value={profile.role?.toUpperCase()} disabled className="pl-10 bg-slate-50 font-black text-xs uppercase" />
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
