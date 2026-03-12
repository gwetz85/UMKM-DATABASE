"use client"

import { useState, useEffect } from "react"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { collection, doc, getDocs, writeBatch } from "firebase/firestore"
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
  RefreshCcw,
  Info,
  FileSpreadsheet,
  DatabaseZap
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import * as XLSX from 'xlsx'

export default function SettingsPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const firestore = useFirestore()
  const [loading, setLoading] = useState(false)
  const [uploadingExcel, setUploadingExcel] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")

  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])

  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

  useEffect(() => {
    // Inisialisasi status tema dari kelas dokumen
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
    toast({ 
      title: "Tema Diperbarui", 
      description: `Aplikasi sekarang dalam Mode ${val === "dark" ? "Gelap" : "Terang"}.` 
    })
  }

  const changePalette = (colorHsl: string, name: string) => {
    // Mengupdate variabel CSS --primary dan --sidebar-background agar sinkron
    document.documentElement.style.setProperty('--primary', colorHsl)
    document.documentElement.style.setProperty('--sidebar-background', colorHsl)
    toast({ 
      title: "Warna Diperbarui", 
      description: `Warna utama aplikasi telah diubah ke ${name}.` 
    })
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

        const batchSize = 500
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = writeBatch(firestore)
          const chunk = data.slice(i, i + batchSize)
          chunk.forEach((item) => {
            const { id, ...rest } = item
            const docRef = doc(firestore, "businessActors", id)
            batch.set(docRef, rest, { merge: true })
          })
          await batch.commit()
        }
        
        toast({ title: "Restore Berhasil", description: `${data.length} data telah dipulihkan.` })
      } catch (error) {
        toast({ variant: "destructive", title: "Restore Gagal", description: "Pastikan format file backup benar." })
      } finally {
        setLoading(false)
      }
    }
    reader.readAsText(file)
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingExcel(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[]

        if (data.length <= 1) throw new Error("File Excel kosong atau tidak memiliki data.")

        const masterData = data.slice(1).map((row: any[]) => {
          const getStr = (idx: number) => {
            const val = row[idx]
            return val !== undefined && val !== null ? String(val).trim() : ""
          }

          return {
            noKK: getStr(0),
            nik: getStr(1),
            nomor: getStr(2),
            tahunPengajuan: getStr(3),
            nama: getStr(4),
            status: getStr(5),
            statusLpj: getStr(6),
            nominal: getStr(7),
            usaha: getStr(8),
            alamat: getStr(9),
            kelurahan: getStr(10),
            uploadedAt: new Date().toISOString()
          }
        }).filter(item => item.noKK && item.nik)

        if (masterData.length === 0) throw new Error("Tidak ada data valid ditemukan. Pastikan kolom KK dan NIK terisi.")

        const batchSize = 500
        const colRef = collection(firestore, "master_data")
        
        for (let i = 0; i < masterData.length; i += batchSize) {
          const batch = writeBatch(firestore)
          const chunk = masterData.slice(i, i + batchSize)
          chunk.forEach((item) => {
            const newDocRef = doc(colRef)
            batch.set(newDocRef, item)
          })
          await batch.commit()
        }

        toast({ title: "Upload Excel Berhasil", description: `${masterData.length} data master telah disimpan ke sistem.` })
      } catch (error: any) {
        toast({ variant: "destructive", title: "Gagal Impor Excel", description: error.message || "Pastikan format kolom benar." })
      } finally {
        setUploadingExcel(false)
        e.target.value = ''
      }
    }
    reader.readAsBinaryString(file)
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

  const handleResetMaster = async () => {
    if (!confirm("Hapus semua data Master (Data Pembanding)? Tindakan ini tidak dapat dibatalkan.")) return

    setLoading(true)
    try {
      const colRef = collection(firestore, "master_data")
      const snapshot = await getDocs(colRef)
      
      const batchSize = 500
      const docs = snapshot.docs
      
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(firestore)
        const chunk = docs.slice(i, i + batchSize)
        chunk.forEach((doc) => batch.delete(doc.ref))
        await batch.commit()
      }
      
      toast({ title: "Hapus Berhasil", description: "Seluruh data master pembanding telah dihapus." })
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal Hapus", description: "Terjadi kesalahan saat menghapus data master." })
    } finally {
      setLoading(false)
    }
  }

  if (isAdminLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black text-primary font-headline">Pengaturan</h1>
        <p className="text-muted-foreground font-medium">Konfigurasi tampilan {isAdmin ? "dan manajemen data aplikasi." : "aplikasi Anda."}</p>
      </div>

      {!isAdmin && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 font-bold">Akses Terbatas</AlertTitle>
          <AlertDescription className="text-blue-700">
            Sebagai Petugas Input, Anda hanya dapat merubah tema dan warna aplikasi. Fitur manajemen data hanya tersedia untuk Administrator.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
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
                    <Sun className="w-4 h-4 text-amber-500" /> Terang (Light)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark" className="flex items-center gap-1.5 cursor-pointer">
                    <Moon className="w-4 h-4 text-blue-500" /> Gelap (Dark)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <Label className="font-bold">Palet Warna Utama (Sidebar & Aksen)</Label>
              <div className="flex flex-wrap gap-4">
                {[
                  { name: "Biru", hsl: "212 68% 42%", hex: "#2266B3" },
                  { name: "Hijau", hsl: "151 81% 40%", hex: "#198E53" },
                  { name: "Merah", hsl: "346 84% 45%", hex: "#D41B42" },
                  { name: "Ungu", hsl: "262 83% 58%", hex: "#8B5CF6" },
                  { name: "Oranye", hsl: "25 95% 45%", hex: "#E65C00" },
                  { name: "Hitam", hsl: "210 40% 10%", hex: "#0F172A" },
                ].map((color) => (
                  <button 
                    key={color.name}
                    onClick={() => changePalette(color.hsl, color.name)} 
                    className="w-12 h-12 rounded-2xl border-4 border-white shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center group"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Palette className="w-4 h-4 text-white" />
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic">Pilihan warna ini akan merubah warna Sidebar dan elemen utama aplikasi.</p>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
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
                  <p className="text-xs text-muted-foreground">Unduh semua data pelaku usaha dalam format JSON.</p>
                  <Button variant="outline" size="sm" onClick={handleBackup} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null} Unduh Backup
                  </Button>
                </div>

                <div className="p-4 border rounded-xl space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Upload className="w-4 h-4 text-blue-600" /> Restore Data
                  </div>
                  <p className="text-xs text-muted-foreground">Unggah file backup JSON untuk memulihkan data.</p>
                  <div className="relative">
                    <input type="file" accept=".json" onChange={handleRestore} className="hidden" id="restore-input" disabled={loading} />
                    <Label htmlFor="restore-input" className="cursor-pointer">
                      <div className="flex items-center justify-center w-full h-9 px-3 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
                        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null} Pilih File & Restore
                      </div>
                    </Label>
                  </div>
                </div>

                <div className="p-4 border border-accent/20 bg-accent/5 rounded-xl space-y-3 sm:col-span-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-primary">
                    <FileSpreadsheet className="w-4 h-4" /> Import Data Master (Excel)
                  </div>
                  <p className="text-xs text-muted-foreground">Upload .xlsx (Kolom A-K: KK, NIK, No, Tahun, Nama, Status, LPJ, Nominal, Usaha, Alamat, Kelurahan).</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} className="hidden" id="excel-upload" disabled={uploadingExcel} />
                      <Label htmlFor="excel-upload" className="cursor-pointer">
                        <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/5" asChild>
                          <div className="flex items-center justify-center gap-2">
                            {uploadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Upload Excel Master
                          </div>
                        </Button>
                      </Label>
                    </div>
                    <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/5" onClick={handleResetMaster} disabled={loading}>
                      <DatabaseZap className="w-4 h-4 mr-2" /> HAPUS DATA PEMBANDING
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="font-bold">Zona Bahaya</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3">
                    <span className="text-xs">Hapus SEMUA data pelaku usaha secara permanen. Tindakan ini tidak berpengaruh pada data Master/Pembanding.</span>
                    <Button variant="destructive" size="sm" onClick={handleReset} disabled={loading} className="w-fit font-bold">
                      <Trash2 className="w-4 h-4 mr-2" /> Reset Seluruh Data Pelaku
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
