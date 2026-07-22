"use client"

import { useState, useEffect } from "react"
import { useDatabase, useUser, useObject, useMemoFirebase } from "@/firebase"
import { ref, get, set, update } from "firebase/database"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Info, Plus, Trash2, Loader2, Save, Send, Zap } from "lucide-react"

export default function SettingsInfoPage() {
  const { user, isUserLoading } = useUser()
  const database = useDatabase()
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form State
  const [appName, setAppName] = useState("SIMPU")
  const [version, setVersion] = useState("8.2.5 PRO")
  const [totalPembanding, setTotalPembanding] = useState("15.000 Data")
  const [adminEmail, setAdminEmail] = useState("simputeam@gmail.com")
  const [adminWhatsapp, setAdminWhatsapp] = useState("wa.me/62817319885")
  const [copyright, setCopyright] = useState("")
  const [welcomeText, setWelcomeText] = useState("")
  const [subText, setSubText] = useState("")
  const [updates, setUpdates] = useState<string[]>([])
  const [newUpdate, setNewUpdate] = useState("")

  // Verify Admin Access
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/login')
  }, [user, isUserLoading, router])

  useEffect(() => {
    if (database) {
      const configRef = ref(database, 'settings/system_config')
      get(configRef).then(snap => {
        if (snap.exists()) {
          const data = snap.val()
          setAppName(data.appName || "SIMPU")
          setVersion(data.version || "8.2.5 PRO")
          setTotalPembanding(data.totalPembanding || "15.000 Data")
          setAdminEmail(data.adminEmail || "simputeam@gmail.com")
          setAdminWhatsapp(data.adminWhatsapp || "wa.me/62817319885")
          setCopyright(data.copyright || "")
          setWelcomeText(data.welcomeText || "")
          setSubText(data.subText || "")
          setUpdates(data.appUpdates || [])
        }
        setIsLoading(false)
      })
    }
  }, [database])

  const handleAddUpdate = () => {
    if (!newUpdate.trim()) return
    setUpdates([...updates, newUpdate.trim()])
    setNewUpdate("")
  }

  const handleRemoveUpdate = (index: number) => {
    setUpdates(updates.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!database) return
    setIsSaving(true)
    try {
      await update(ref(database, 'settings/system_config'), {
        appName,
        version,
        totalPembanding,
        adminEmail,
        adminWhatsapp,
        copyright,
        welcomeText,
        subText,
        appUpdates: updates
      })
      toast({ title: "Berhasil", description: "Informasi aplikasi telah diperbarui." })
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Terjadi kesalahan saat menyimpan pengaturan." })
    } finally {
      setIsSaving(false)
    }
  }

  if (isUserLoading || isAdminLoading || isLoading) {
    return <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
  }

  if (!adminRole && user?.email !== 'agus@umkm.id') {
    return <div className="p-20 text-center font-black text-2xl text-red-500">Akses Ditolak. Khusus Administrator.</div>
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <h1 className="text-3xl font-black text-primary font-headline uppercase">Pengaturan Informasi</h1>
        </div>
        <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
          Kelola Konten Dialog Informasi Aplikasi & Widget Kontak Admin
        </p>
      </div>

      <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-8">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-black uppercase text-slate-800 flex items-center gap-2 border-b pb-2">
            <Info className="w-5 h-5 text-primary" /> Identitas Aplikasi & Kontak Admin
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nama Aplikasi</Label>
              <Input 
                value={appName} 
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Contoh: SIMPU"
                className="font-bold focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Versi Aplikasi</Label>
              <Input 
                value={version} 
                onChange={(e) => setVersion(e.target.value)}
                placeholder="Contoh: 8.2.5 PRO"
                className="font-bold focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Data Pembanding</Label>
              <Input 
                value={totalPembanding} 
                onChange={(e) => setTotalPembanding(e.target.value)}
                placeholder="Contoh: 15.000 Data"
                className="font-bold focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email Kontak Admin</Label>
              <Input 
                value={adminEmail} 
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="Contoh: simputeam@gmail.com"
                className="font-bold focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">WhatsApp Kontak Admin</Label>
              <Input 
                value={adminWhatsapp} 
                onChange={(e) => setAdminWhatsapp(e.target.value)}
                placeholder="Contoh: wa.me/62817319885"
                className="font-bold focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Copyright</Label>
              <Input 
                value={copyright} 
                onChange={(e) => setCopyright(e.target.value)}
                placeholder="Contoh: © 2024 Dinas Koperasi & UKM"
                className="font-bold focus-visible:ring-primary/30"
              />
            </div>
          </div>
        </div>

        {/* Welcome Text Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-black uppercase text-slate-800 flex items-center gap-2 border-b pb-2">
            <Send className="w-5 h-5 text-primary" /> Teks Selamat Datang
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Judul Utama (Welcome Text)</Label>
              <Input 
                value={welcomeText} 
                onChange={(e) => setWelcomeText(e.target.value)}
                placeholder="Contoh: Selamat datang di Aplikasi SIMPU"
                className="font-bold focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Sub-Teks (Bawah Judul)</Label>
              <Input 
                value={subText} 
                onChange={(e) => setSubText(e.target.value)}
                placeholder="Contoh: SISTEM INFORMASI MANAJEMEN PELAKU USAHA"
                className="font-bold focus-visible:ring-primary/30"
              />
            </div>
          </div>
        </div>

        {/* Updates Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-black uppercase text-slate-800 flex items-center gap-2 border-b pb-2">
            <Zap className="w-5 h-5 text-primary" /> Pembaruan Aplikasi
          </h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={newUpdate} 
                onChange={(e) => setNewUpdate(e.target.value)}
                placeholder="Tambahkan poin pembaruan baru..."
                className="font-bold focus-visible:ring-primary/30"
                onKeyDown={(e) => e.key === 'Enter' && handleAddUpdate()}
              />
              <Button onClick={handleAddUpdate} className="shrink-0 bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {updates.map((text, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group animate-in slide-in-from-right-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm font-bold text-slate-700">{text}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveUpdate(idx)}
                    className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {updates.length === 0 && (
                <p className="text-center py-8 text-xs font-bold text-slate-400 uppercase tracking-widest border-2 border-dashed rounded-2xl">
                  Belum ada daftar pembaruan
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest py-6 rounded-2xl shadow-xl shadow-primary/20"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>
  )
}
