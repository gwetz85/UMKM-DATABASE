"use client"

import { useState, useEffect } from "react"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { collection, doc, getDocs, writeBatch, query } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  Moon, 
  Sun, 
  Palette, 
  Trash2, 
  Download, 
  Upload, 
  AlertTriangle, 
  Loader2, 
  ShieldAlert,
  CheckCircle2,
  RefreshCcw
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function SettingsPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const firestore = useFirestore()
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")

  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])

  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark")
    setTheme(isDark ? "dark" : "light")
  }, [])

  const toggleTheme = (val: "light" | "dark") => {
    setTheme(val)
    if (val === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  const changePalette = (colorHsl: string) => {
    document.documentElement.style.setProperty('--primary', colorHsl)
    toast({ title: "Warna Diperbarui", description: "Palet warna aplikasi telah berubah." })
  }

  const handleBackup = async () => {
    setLoading(true)
    try {
      const colRef = collection(firestore, "businessActors")
      const snapshot = await getDocs(colRef)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `backup-umkm-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      
      toast({ title: "Backup Berhasil", description: "File data telah diunduh." })
    } catch (error) {
      toast({ variant: "destructive", title: "Backup Gagal", description: "Terjadi kesalahan saat mengambil data." })
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (!Array.isArray(data)) throw new Error("Format file tidak valid")

        const batch = writeBatch(firestore)
        data.forEach((item) => {
          const { id, ...rest } = item
          const docRef = doc(firestore, "businessActors", id)
          batch.set(docRef, rest, { merge: true })
        })
        await batch.commit()
        
        toast({ title: "Restore Berhasil", description: `${data.length} data telah dipulihkan.` })
      } catch (error) {
        toast({ variant: "destructive", title: "Restore Gagal", description: "Pastikan format file backup benar." })
      } finally {
        setLoading(false)
      }
    }
    reader.readAsText(file)
  }

  const handleReset = async () => {
    if (!confirm("PERINGATAN! Semua data pelaku usaha akan dihapus permanen. Lanjutkan?")) return

    setLoading(true)
    try {
      const colRef = collection(firestore, "businessActors")
      const snapshot = await getDocs(colRef)
      const batch = writeBatch(firestore)
      snapshot.docs.forEach((doc) => batch.delete(doc.ref))
      await batch.commit()
      
      toast({ title: "Reset Berhasil", description: "Seluruh data pelaku usaha telah dihapus." })
    } catch (error) {
      toast({ variant: "destructive", title: "Reset Gagal", description: "Terjadi kesalahan saat menghapus data." })
    } finally {
      setLoading(false)
    }
  }

  if (isAdminLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
  }

  if (!isAdmin) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground">Hanya Admin yang dapat mengakses Pengaturan Sistem.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-black text-primary font-headline">Pengaturan</h1>
        <p className="text-muted-foreground font-medium">Konfigurasi tampilan dan manajemen data aplikasi.</p>
      </div>

      <div className="grid gap-6">
        {/* Tema & Warna */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" /> Tampilan & Tema
            </CardTitle>
            <CardDescription>Personalisasi antarmuka aplikasi Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <Label className="font-bold">Mode Tampilan</Label>
              <RadioGroup value={theme} onValueChange={(v: "light"|"dark") => toggleTheme(v)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light" className="flex items-center gap-1.5 cursor-pointer">
                    <Sun className="w-4 h-4 text-amber-500" /> Terang
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark" className="flex items-center gap-1.5 cursor-pointer">
                    <Moon className="w-4 h-4 text-blue-500" /> Gelap
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <Label className="font-bold">Palet Warna Utama</Label>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => changePalette('212 68% 42%')} className="w-10 h-10 rounded-full bg-[#2266B3] border-2 border-white shadow-sm hover:scale-110 transition-transform" title="Biru (Default)" />
                <button onClick={() => changePalette('151 81% 40%')} className="w-10 h-10 rounded-full bg-[#198E53] border-2 border-white shadow-sm hover:scale-110 transition-transform" title="Hijau" />
                <button onClick={() => changePalette('346 84% 45%')} className="w-10 h-10 rounded-full bg-[#D41B42] border-2 border-white shadow-sm hover:scale-110 transition-transform" title="Merah" />
                <button onClick={() => changePalette('262 83% 58%')} className="w-10 h-10 rounded-full bg-[#8B5CF6] border-2 border-white shadow-sm hover:scale-110 transition-transform" title="Ungu" />
                <button onClick={() => changePalette('25 95% 45%')} className="w-10 h-10 rounded-full bg-[#E65C00] border-2 border-white shadow-sm hover:scale-110 transition-transform" title="Oranye" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manajemen Data */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCcw className="w-5 h-5 text-primary" /> Manajemen Data
            </CardTitle>
            <CardDescription>Ekspor, impor, dan bersihkan data database.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-xl space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Download className="w-4 h-4 text-emerald-600" /> Backup Data
                </div>
                <p className="text-xs text-muted-foreground">Unduh semua data pelaku usaha dalam format JSON untuk cadangan.</p>
                <Button variant="outline" size="sm" onClick={handleBackup} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null} Unduh Backup
                </Button>
              </div>

              <div className="p-4 border rounded-xl space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Upload className="w-4 h-4 text-blue-600" /> Restore Data
                </div>
                <p className="text-xs text-muted-foreground">Unggah file backup JSON untuk memulihkan data ke sistem.</p>
                <div className="relative">
                  <input type="file" accept=".json" onChange={handleRestore} className="hidden" id="restore-input" disabled={loading} />
                  <Label htmlFor="restore-input" className="cursor-pointer">
                    <div className="flex items-center justify-center w-full h-9 px-3 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
                      {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null} Pilih File & Restore
                    </div>
                  </Label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="font-bold">Zona Bahaya</AlertTitle>
                <AlertDescription className="flex flex-col gap-3">
                  <span className="text-xs">Fungsi Reset akan menghapus SEMUA data pelaku usaha tanpa bisa dikembalikan. Gunakan hanya jika Anda ingin memulai dari nol.</span>
                  <Button variant="destructive" size="sm" onClick={handleReset} disabled={loading} className="w-fit font-bold">
                    <Trash2 className="w-4 h-4 mr-2" /> Reset Seluruh Data
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-center text-xs text-muted-foreground font-bold uppercase tracking-widest gap-2">
        <CheckCircle2 className="w-3 h-3" /> Konfigurasi Sistem Optimal
      </div>
    </div>
  )
}
