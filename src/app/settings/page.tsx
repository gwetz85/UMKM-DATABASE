"use client"

import { useState, useEffect } from "react"
import { useDatabase, useUser, useObject, useMemoFirebase } from "@/firebase"
import { ref, get, update, remove, push } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DatabaseZap,
  Check,
  XCircle,
  Lock,
  Key
} from "lucide-react"
import { updatePassword } from "firebase/auth"
import { useAuth, useList } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import * as XLSX from 'xlsx'

export default function SettingsPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const auth = useAuth()
  const [loading, setLoading] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [uploadingExcel, setUploadingExcel] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])

  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  const { data: allUsersForProfile } = useList(userProfileRef)
  const userProfile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isKoordinator = userProfile?.role?.toLowerCase() === 'koordinator'
  const isPetugas = userProfile?.role === 'petugas'
  const isMonitoring = userProfile?.role === 'monitoring'
  const isDinas = userProfile?.role === 'dinas'

  const themeSettingsRef = database ? ref(database, 'chats/__system_settings/theme') : null
  const { data: themeSettings, error: themeError } = useObject(themeSettingsRef)

  useEffect(() => {
    if (themeError) {
      console.error('Theme Settings Error:', themeError)
    }
  }, [themeError])

  useEffect(() => {
    if (themeSettings?.mode) {
      setTheme(themeSettings.mode)
    }
  }, [themeSettings])

  const applyLocalTheme = (themeData: any) => {
    if (!themeData) return;
    const root = document.documentElement;

    if (themeData.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (themeData.palette) {
      const palette = themeData.palette;
      let styleEl = document.getElementById('dynamic-theme-style') as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-theme-style';
        document.head.appendChild(styleEl);
      }

      styleEl.innerHTML = `
        :root {
          --primary: ${palette} !important;
          --sidebar-background: ${palette} !important;
          --sidebar-primary-foreground: ${palette} !important;
          --sidebar-border: ${palette} !important;
          --ring: ${palette} !important;
          --accent: ${palette} !important;
          --sidebar-ring: ${palette} !important;
          --sidebar-accent: ${palette} !important;
        }
        .dark {
          --primary: ${palette} !important;
          --sidebar-background: ${palette} !important;
          --sidebar-border: ${palette} !important;
          --ring: ${palette} !important;
          --accent: ${palette} !important;
        }
      `;
    }
  };

  const toggleTheme = async (val: "light" | "dark") => {
    const newTheme = { ...themeSettings, mode: val };
    setTheme(val);
    applyLocalTheme(newTheme);
    localStorage.setItem('simpu-theme', JSON.stringify(newTheme));

    try {
      await update(ref(database, 'chats/__system_settings/theme'), { mode: val });
    } catch (err: any) {
      console.warn('Firebase theme sync failed (Permission Denied), but setting saved locally.');
    }

    toast({ 
      title: "Tema Diperbarui", 
      description: `Mode aplikasi diubah ke mode ${val === "dark" ? "Gelap" : "Terang"}.` 
    });
  }

  const changePalette = async (colorHsl: string, name: string) => {
    const newTheme = { ...themeSettings, palette: colorHsl, paletteName: name };
    applyLocalTheme(newTheme);
    localStorage.setItem('simpu-theme', JSON.stringify(newTheme));

    try {
      await update(ref(database, 'chats/__system_settings/theme'), { 
        palette: colorHsl,
        paletteName: name 
      });
    } catch (err: any) {
      console.warn('Firebase color sync failed (Permission Denied), but setting saved locally.');
    }

    toast({ 
      title: "Warna Diperbarui", 
      description: `Palet warna aplikasi diubah ke ${name}.` 
    });
  }

  const handleBackup = async () => {
    setLoading(true)
    try {
      const data: any[] = []
      const snapshot = await get(ref(database, "businessActors"))
      snapshot.forEach(child => {
        data.push({ id: child.key, ...child.val() })
      })
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `backup-umkm-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      
      toast({ title: "Backup Berhasil", description: "File data pelaku usaha berhasil diunduh." })
    } catch (error) {
      toast({ variant: "destructive", title: "Backup Gagal", description: "Gagal mengambil data dari database." })
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
          const chunk = data.slice(i, i + batchSize)
          const updates: any = {}
          chunk.forEach((item) => {
            const { id, ...rest } = item
            updates[`businessActors/${id}`] = item
          })
          await update(ref(database), updates)
        }
        
        toast({ title: "Pemulihan Berhasil", description: `${data.length} data pelaku usaha berhasil dipulihkan.` })
      } catch (error) {
        toast({ variant: "destructive", title: "Pemulihan Gagal", description: "Pastikan format file backup sesuai." })
      } finally {
        setLoading(false)
      }
    }
    reader.readAsText(file)
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetType: 'master' | 'blacklist') => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingExcel(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result
        const wb = XLSX.read(bstr, { type: 'binary', cellFormula: true, cellNF: true, cellText: true })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const range = XLSX.utils.decode_range(ws['!ref'] || "A1")
        const importedData: any[] = []

        for (let r = range.s.r + 1; r <= range.e.r; r++) {
          const rowValues: string[] = []
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellRef = XLSX.utils.encode_cell({ r, c })
            const cell = ws[cellRef]
            if (!cell) {
              rowValues.push("")
              continue
            }
            if (cell.t === 'n') {
              rowValues.push(BigInt(Math.floor(Number(cell.v))).toString())
            } else {
              rowValues.push(cell.w || (cell.v !== undefined ? String(cell.v).trim() : ""))
            }
          }

          const getVal = (idx: number) => rowValues[idx] || ""
          const item = {
            noKK: getVal(0),
            nik: getVal(1),
            nomor: getVal(2),
            tahunPengajuan: getVal(3),
            nama: getVal(4),
            status: getVal(5),
            statusLpj: getVal(6),
            nominal: getVal(7),
            usaha: getVal(8),
            alamat: getVal(9),
            kelurahan: getVal(10),
            kecamatan: getVal(11),
            coordinator: getVal(12),
            uploadedAt: new Date().toISOString()
          }

          if (item.nik) {
            importedData.push(item)
          }
        }

        if (importedData.length === 0) throw new Error("Tidak ada data valid yang ditemukan dalam file excel.")

        const dbPath = targetType === 'master' ? "master_data" : "blacklist_data"
        const batchSize = 500
        for (let i = 0; i < importedData.length; i += batchSize) {
          const chunk = importedData.slice(i, i + batchSize)
          const updates: any = {}
          chunk.forEach((item) => {
            const newId = push(ref(database, dbPath)).key
            updates[`${dbPath}/${newId}`] = item
          })
          await update(ref(database), updates)
        }

        toast({ 
          title: `Import Sheet ${targetType === 'master' ? '1' : '2'} Berhasil`, 
          description: `${importedData.length} data tersimpan ke ${targetType === 'master' ? 'Data Master' : 'Data Blacklist'}.` 
        })
      } catch (error: any) {
        toast({ variant: "destructive", title: "Gagal Mengimpor Excel", description: error.message || "Pastikan format kolom sudah sesuai." })
      } finally {
        setUploadingExcel(false)
        e.target.value = ''
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleReset = async () => {
    if (!confirm("HAPUS SELURUH DATA SISTEM? Tindakan ini tidak dapat dibatalkan!")) return

    setLoading(true)
    try {
      await remove(ref(database, "businessActors"))
      toast({ title: "Reset Berhasil", description: "Seluruh data pelaku usaha telah dihapus." })
    } catch (error) {
      toast({ variant: "destructive", title: "Reset Gagal", description: "Terjadi kesalahan saat menghapus data." })
    } finally {
      setLoading(false)
    }
  }

  const handleResetMaster = async () => {
    if (!confirm("Hapus seluruh data master pembanding (Sheet 1)?")) return

    setLoading(true)
    try {
      await remove(ref(database, "master_data"))
      toast({ title: "Berhasil Dihapus", description: "Seluruh data master telah dihapus." })
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: "Terjadi kesalahan saat menghapus data master." })
    } finally {
      setLoading(false)
    }
  }

  const handleResetBlacklist = async () => {
    if (!confirm("Hapus seluruh data blacklist/cancell (Sheet 2)?")) return

    setLoading(true)
    try {
      await remove(ref(database, "blacklist_data"))
      toast({ title: "Berhasil Dihapus", description: "Seluruh data blacklist telah dihapus." })
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: "Terjadi kesalahan saat menghapus data blacklist." })
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
        <p className="text-muted-foreground font-medium">
          {isAdmin ? "Kelola preferensi aplikasi, keamanan akun, dan manajemen database." : "Kelola preferensi tampilan dan keamanan akun Anda."}
        </p>
      </div>

      {!isAdmin && (
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-300 font-bold">Akses Pengaturan</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-400">
            Halo {userProfile?.fullName || 'User'}, Anda masuk sebagai {isKoordinator ? "Koordinator" : isPetugas ? "Petugas" : isDinas ? "Dinas" : isMonitoring ? "Monitoring" : "Pengguna"}.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" /> Tampilan & Tema
            </CardTitle>
            <CardDescription>Sesuaikan antarmuka aplikasi sesuai kenyamanan Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <Label className="font-bold">Mode Tampilan</Label>
              <RadioGroup value={theme} onValueChange={(v: "light"|"dark") => toggleTheme(v)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light" className="flex items-center gap-1.5 cursor-pointer">
                    <Sun className="w-4 h-4 text-amber-500" /> Mode Terang
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark" className="flex items-center gap-1.5 cursor-pointer">
                    <Moon className="w-4 h-4 text-blue-500" /> Mode Gelap
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4 pt-4 border-t border-dashed">
              <Label className="font-bold">Palet Warna Utama</Label>
              <div className="flex flex-wrap gap-4">
                {[
                  { name: "Biru Samudera", hsl: "212 68% 42%", hex: "#2266B3" },
                  { name: "Hijau Botani", hsl: "151 81% 40%", hex: "#198E53" },
                  { name: "Merah Berani", hsl: "346 84% 45%", hex: "#D41B42" },
                  { name: "Ungu Royal", hsl: "262 83% 58%", hex: "#8B5CF6" },
                  { name: "Oranye Senja", hsl: "25 95% 45%", hex: "#E65C00" },
                  { name: "Hitam Elegan", hsl: "210 40% 10%", hex: "#0F172A" },
                ].map((color) => (
                  <button 
                    key={color.name}
                    onClick={() => changePalette(color.hsl, color.name)}
                    className="group relative flex flex-col items-center gap-2 transition-transform hover:scale-110 active:scale-95"
                  >
                    <div 
                      className={cn(
                        "w-12 h-12 rounded-2xl shadow-md border-4 border-white dark:border-slate-800 transition-all",
                        themeSettings?.palette === color.hsl ? "ring-2 ring-primary ring-offset-2 scale-110" : "opacity-80"
                      )} 
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">{color.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic">Perubahan warna akan diterapkan secara instan di seluruh aplikasi.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Keamanan Akun
            </CardTitle>
            <CardDescription>Amankan akun Anda dengan memperbarui kata sandi secara berkala.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newPass = formData.get('newPassword') as string;
              const confirmPass = formData.get('confirmPassword') as string;

              if (newPass !== confirmPass) {
                toast({ variant: "destructive", title: "Gagal", description: "Kata sandi tidak cocok." });
                return;
              }

              if (newPass.length < 6) {
                toast({ variant: "destructive", title: "Gagal", description: "Kata sandi terlalu pendek (minimal 6 karakter)." });
                return;
              }

              setChangingPassword(true);
              try {
                if (auth.currentUser) {
                  await updatePassword(auth.currentUser, newPass);
                }

                if (userProfile?.id && database) {
                  await update(ref(database, `system_users/${userProfile.id}`), {
                    password: newPass
                  });
                }

                toast({ title: "Berhasil", description: "Kata sandi Anda telah diperbarui." });
                (e.target as HTMLFormElement).reset();
              } catch (err: any) {
                console.error(err);
                let msg = "Terjadi kesalahan saat mengganti kata sandi.";
                if (err.code === 'auth/requires-recent-login') {
                  msg = "Demi keamanan, silakan logout dan login kembali sebelum mengganti kata sandi.";
                }
                toast({ variant: "destructive", title: "Gagal", description: msg });
              } finally {
                setChangingPassword(false);
              }
            }} className="space-y-4 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Kata Sandi Baru</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="newPassword" name="newPassword" type="password" required className="pl-10" placeholder="Minimal 6 karakter" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi Baru</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="confirmPassword" name="confirmPassword" type="password" required className="pl-10" placeholder="Ulangi kata sandi baru" />
                </div>
              </div>
              <Button type="submit" disabled={changingPassword} className="w-full font-bold">
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                Ganti Kata Sandi
              </Button>
              <p className="text-[10px] text-muted-foreground italic">
                Mungkin diperlukan login ulang demi alasan keamanan.
              </p>
            </form>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCcw className="w-5 h-5 text-primary" /> Manajemen Data
              </CardTitle>
              <CardDescription>Ekspor, Impor, dan Pembersihan Database Sistem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 border rounded-xl space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Download className="w-4 h-4 text-emerald-600" /> Cadangkan Data (Backup)
                  </div>
                  <p className="text-xs text-muted-foreground">Ekspor seluruh data pelaku usaha ke file JSON.</p>
                  <Button variant="outline" size="sm" onClick={handleBackup} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null} Unduh Backup
                  </Button>
                </div>

                <div className="p-4 border rounded-xl space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Upload className="w-4 h-4 text-blue-600" /> Pulihkan Data (Restore)
                  </div>
                  <p className="text-xs text-muted-foreground">Impor data dari file backup JSON sebelumnya.</p>
                  <div className="relative">
                    <input type="file" accept=".json" onChange={handleRestore} className="hidden" id="restore-input" disabled={loading} />
                    <Label htmlFor="restore-input" className="cursor-pointer">
                      <div className="flex items-center justify-center w-full h-9 px-3 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
                        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null} Pilih File Backup
                      </div>
                    </Label>
                  </div>
                </div>

                <div className="p-4 border border-accent/20 bg-accent/5 dark:bg-accent/10 rounded-xl space-y-3 sm:col-span-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-primary">
                    <FileSpreadsheet className="w-4 h-4" /> Automasi Impor Excel (Cek Data Master)
                  </div>
                  <p className="text-[10px] text-muted-foreground italic mb-4">Fitur ini khusus untuk memperbarui Database Cek Data Master & Blacklist.</p>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-[11px] font-black uppercase text-emerald-600 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Sheet 1: DATA MASTER (PEMBANDING)
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                          <input type="file" accept=".xlsx, .xls" onChange={(e) => handleExcelUpload(e, 'master')} className="hidden" id="excel-master-upload" disabled={uploadingExcel} />
                          <Label htmlFor="excel-master-upload" className="cursor-pointer">
                            <Button variant="outline" className="w-full border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400" asChild>
                              <div className="flex items-center justify-center gap-2">
                                {uploadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Upload Sheet 1
                              </div>
                            </Button>
                          </Label>
                        </div>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/5" onClick={handleResetMaster} disabled={loading}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Kosongkan Sheet 1
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-dashed">
                      <Label className="text-[11px] font-black uppercase text-rose-600 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> Sheet 2: DATA BLACKLIST (CANCELL)
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                          <input type="file" accept=".xlsx, .xls" onChange={(e) => handleExcelUpload(e, 'blacklist')} className="hidden" id="excel-blacklist-upload" disabled={uploadingExcel} />
                          <Label htmlFor="excel-blacklist-upload" className="cursor-pointer">
                            <Button variant="outline" className="w-full border-rose-500/20 hover:bg-rose-500/5 text-rose-700 dark:text-rose-400" asChild>
                              <div className="flex items-center justify-center gap-2">
                                {uploadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Upload Sheet 2
                              </div>
                            </Button>
                          </Label>
                        </div>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/5" onClick={handleResetBlacklist} disabled={loading}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Kosongkan Sheet 2
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="font-bold">ZONA BERBAHAYA</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3">
                    <span className="text-xs">Tindakan ini akan menghapus seluruh data pelaku usaha secara permanen!</span>
                    <Button variant="destructive" size="sm" onClick={handleReset} disabled={loading} className="w-fit font-bold">
                      <Trash2 className="w-4 h-4 mr-2" /> KOSONGKAN SELURUH DATA
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
