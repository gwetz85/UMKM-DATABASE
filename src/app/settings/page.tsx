"use client"

import { useState, useEffect } from "react"
import { useDatabase, useUser, useObject, useMemoFirebase, useAuth, useList } from "@/firebase"
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
  Clock,
  Key,
  Settings2,
  LogOut,
  User as UserIcon,
  Mail,
  Shield,
  CircleUser
} from "lucide-react"
import { updatePassword, signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import * as XLSX from 'xlsx'
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { ConfirmDialog } from "@/components/confirm-dialog"

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const auth = useAuth()
  const [loading, setLoading] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [uploadingExcel, setUploadingExcel] = useState(false)
  const [downloadingTarget, setDownloadingTarget] = useState<'master_2024' | 'master_2023' | 'master_2025' | 'blacklist' | 'bpjs' | 'all' | null>(null)
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('simpu-theme');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.mode === 'dark' || parsed.mode === 'light') return parsed.mode;
        }
        if (document.documentElement.classList.contains('dark')) return 'dark';
      } catch (e) {}
    }
    return "light";
  });

  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showResetSheetDialog, setShowResetSheetDialog] = useState(false)
  const [resetSheetTarget, setResetSheetTarget] = useState<'2023' | '2024' | '2025' | 'blacklist' | 'bpjs' | null>(null)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)


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
  const isKoordinator = userProfile?.role === 'koordinator'
  const isPetugas = userProfile?.role === 'petugas_survey' || userProfile?.role === 'petugas'
  const isMonitoring = userProfile?.role === 'monitoring'
  const isDinas = userProfile?.role === 'dinas'
  const isVerifikatorDinas = userProfile?.role === 'verifikator_dinas'

  const themeSettingsRef = database ? ref(database, 'chats/__system_settings/theme') : null
  const { data: themeSettings, error: themeError } = useObject(themeSettingsRef)

  const systemConfigRef = database ? ref(database, 'settings/system_config') : null
  const { data: systemConfig } = useObject(systemConfigRef)

  const master2024Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2024') : null, [database])
  const master2023Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2023') : null, [database])
  const master2025Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2025') : null, [database])
  const blacklistDataRef = useMemoFirebase(() => database ? ref(database, 'blacklist_data') : null, [database])
  const bpjsDataRef = useMemoFirebase(() => database ? ref(database, 'settings/bpjs_comparison_data') : null, [database])

  const { data: data2024, isLoading: is2024Loading } = useList(master2024Ref)
  const { data: data2023, isLoading: is2023Loading } = useList(master2023Ref)
  const { data: data2025, isLoading: is2025Loading } = useList(master2025Ref)
  const { data: blacklistData, isLoading: isBlacklistLoading } = useList(blacklistDataRef)
  const { data: bpjsData, isLoading: isBpjsLoading } = useList(bpjsDataRef)

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
      document.body?.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body?.classList.remove('dark');
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
          --sidebar-primary: ${palette} !important;
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
      description: `Aplikasi sekarang dalam Mode ${val === "dark" ? "Gelap" : "Terang"}.` 
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
      description: `Warna utama aplikasi telah diubah ke ${name}.` 
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
          const chunk = data.slice(i, i + batchSize)
          const updates: any = {}
          chunk.forEach((item) => {
            const { id, ...rest } = item
            updates[`businessActors/${id}`] = item
          })
          await update(ref(database), updates)
        }
        
        // Reset stats node so dashboard will re-sync
        await remove(ref(database, "system_stats"))
        
        toast({ title: "Restore Berhasil", description: `${data.length} data telah dipulihkan. Dashboard akan mensinkronisasi ulang statistik secara otomatis.` })
      } catch (error) {
        toast({ variant: "destructive", title: "Restore Gagal", description: "Pastikan format file backup benar." })
      } finally {
        setLoading(false)
      }
    }
    reader.readAsText(file)
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetType: 'master_2024' | 'master_2023' | 'master_2025' | 'blacklist' | 'bpjs') => {
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

        if (targetType === 'bpjs') {
          // Detect header row dynamically
          let headerRowIndex = -1
          let colNik = 1
          let colNama = 2
          let colDob = 3
          let colStatus = 4
          let colKet = 5
          let colNo = 0

          for (let r = range.s.r; r <= Math.min(range.s.r + 15, range.e.r); r++) {
            const rowTexts: string[] = []
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cell = ws[XLSX.utils.encode_cell({ r, c })]
              rowTexts.push(cell ? String(cell.w || cell.v || "").trim().toUpperCase() : "")
            }
            const foundNik = rowTexts.findIndex(t => t === "NIK" || t.includes("NIK"))
            const foundNama = rowTexts.findIndex(t => t === "NAMA" || t.includes("NAMA"))
            if (foundNik !== -1 && foundNama !== -1) {
              headerRowIndex = r
              colNik = foundNik
              colNama = foundNama
              const fDob = rowTexts.findIndex(t => t.includes("LAHIR") || t.includes("DOB") || t.includes("TANGGAL"))
              if (fDob !== -1) colDob = fDob
              const fStatus = rowTexts.findIndex(t => t === "STATUS" || (t.includes("STATUS") && !t.includes("KET")))
              if (fStatus !== -1) colStatus = fStatus
              const fKet = rowTexts.findIndex(t => t.includes("KET") || t.includes("KETERANGAN") || t.includes("HASIL"))
              if (fKet !== -1) colKet = fKet
              const fNo = rowTexts.findIndex(t => t === "NO" || t === "NO.")
              if (fNo !== -1) colNo = fNo
              break
            }
          }

          const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : range.s.r + 1
          const bpjsImported: any[] = []

          for (let r = startRow; r <= range.e.r; r++) {
            const getCellStr = (c: number) => {
              const cell = ws[XLSX.utils.encode_cell({ r, c })]
              if (!cell) return ""
              if (cell.t === 'n' && cell.v !== undefined && cell.v !== null) {
                try {
                  return BigInt(Math.floor(Number(cell.v))).toString()
                } catch {
                  return String(cell.w || cell.v).trim()
                }
              }
              return String(cell.w || (cell.v !== undefined && cell.v !== null ? cell.v : "")).trim()
            }

            const rawNik = getCellStr(colNik)
            const cleanNik = rawNik.replace(/\D/g, '')
            const nama = getCellStr(colNama)
            const dob = getCellStr(colDob)
            const status = getCellStr(colStatus)
            const keterangan = getCellStr(colKet)
            const no = getCellStr(colNo)

            if (cleanNik || nama) {
              bpjsImported.push({
                no: no || String(bpjsImported.length + 1),
                nik: cleanNik || rawNik,
                nama: nama,
                tanggalLahir: dob,
                status: status,
                keterangan: keterangan,
                fileName: file.name,
                uploadedAt: new Date().toISOString()
              })
            }
          }

          if (bpjsImported.length === 0) {
            throw new Error("Tidak ada data BPJS valid ditemukan. Pastikan kolom NIK dan NAMA terisi.")
          }

          // 1. Simpan ke settings/bpjs_comparison_data (batch)
          const batchSize = 500
          for (let i = 0; i < bpjsImported.length; i += batchSize) {
            const chunk = bpjsImported.slice(i, i + batchSize)
            const updates: any = {}
            chunk.forEach((item) => {
              const newId = push(ref(database, 'settings/bpjs_comparison_data')).key
              updates[`settings/bpjs_comparison_data/${newId}`] = item
            })
            await update(ref(database), updates)
          }

          // 2. Cocokkan langsung dengan data pelaku usaha di database
          let matchedCount = 0
          try {
            const actorsSnap = await get(ref(database, 'businessActors'))
            if (actorsSnap.exists()) {
              const allActors = Object.values(actorsSnap.val()) as any[]
              const actorUpdates: Record<string, any> = {}
              const now = new Date().toISOString()

              const actorsByNik = new Map<string, any>()
              const actorsByName = new Map<string, any>()
              allActors.forEach(a => {
                if (a && a.id) {
                  const clean = String(a.nik || "").replace(/\D/g, '')
                  if (clean) actorsByNik.set(clean, a)
                  if (a.fullName) {
                    actorsByName.set(String(a.fullName).trim().toUpperCase(), a)
                  }
                }
              })

              bpjsImported.forEach(item => {
                const itemNik = String(item.nik || "").replace(/\D/g, '')
                const itemName = String(item.nama || "").trim().toUpperCase()

                let matched = itemNik ? actorsByNik.get(itemNik) : undefined
                if (!matched && itemName) {
                  matched = actorsByName.get(itemName)
                }

                if (matched) {
                  matchedCount++
                  const isEligible = 
                    String(item.status || "").toUpperCase() === 'Y' ||
                    String(item.keterangan || "").toUpperCase().includes('BISA DAFTAR') ||
                    String(item.keterangan || "").toUpperCase().includes('TERVERIFIKASI') ||
                    String(item.keterangan || "").toUpperCase().includes('SESUAI') ||
                    String(item.keterangan || "").toUpperCase().includes('LOLOS');

                  actorUpdates[`businessActors/${matched.id}/bpjsSubmissionStatus`] = isEligible ? 'accepted' : 'rejected'
                  actorUpdates[`businessActors/${matched.id}/bpjsCheckStatus`] = isEligible ? 'sesuai' : 'ditolak'
                  actorUpdates[`businessActors/${matched.id}/bpjsStatus`] = item.status || (isEligible ? 'Y' : 'N')
                  actorUpdates[`businessActors/${matched.id}/bpjsKeterangan`] = isEligible ? 'TERVERIFIKASI' : (item.keterangan || 'TIDAK LOLOS')
                  actorUpdates[`businessActors/${matched.id}/bpjsCheckNote`] = item.keterangan || (isEligible ? 'Terverifikasi' : 'Tidak Lolos')
                  actorUpdates[`businessActors/${matched.id}/bpjsCheckedAt`] = now
                  actorUpdates[`businessActors/${matched.id}/bpjsSourceFile`] = file.name
                }
              })

              if (Object.keys(actorUpdates).length > 0) {
                await update(ref(database), actorUpdates)
              }
            }
          } catch (matchErr) {
            console.error("Gagal auto-matching BPJS dengan pelaku usaha:", matchErr)
          }

          toast({
            title: "Upload Data Pembanding BPJS Berhasil",
            description: `${bpjsImported.length.toLocaleString('id-ID')} data BPJS disimpan. ${matchedCount.toLocaleString('id-ID')} data pelaku usaha berhasil dicocokkan otomatis!`
          })
          return
        }

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

            if (cell.t === 'n' && cell.v !== undefined && cell.v !== null) {
              const num = Number(cell.v)
              if (!isNaN(num)) {
                try {
                  rowValues.push(BigInt(Math.floor(num)).toString())
                } catch (e) {
                  rowValues.push(cell.w || String(cell.v).trim())
                }
              } else {
                rowValues.push(cell.w || String(cell.v).trim())
              }
            } else {
              rowValues.push(cell.w || (cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : ""))
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

          if (item.noKK || item.nik || item.nama) {
            importedData.push(item)
          }
        }

        if (importedData.length === 0) throw new Error("Tidak ada data valid ditemukan. Pastikan kolom KK dan NIK terisi.")

        let dbPath = "blacklist_data"
        if (targetType === 'master_2024') dbPath = "master_data_2024"
        else if (targetType === 'master_2023') dbPath = "master_data_2023"
        else if (targetType === 'master_2025') dbPath = "master_data_2025"

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

        const label = targetType === 'master_2024' ? 'Sheet 1 (2024)' : 
                      targetType === 'master_2023' ? 'Sheet 2 (2023)' :
                      targetType === 'master_2025' ? 'Sheet 3 (2025)' : 'Sheet 4 (Blacklist)'

        toast({ 
          title: `Upload ${label} Berhasil`, 
          description: `${importedData.length} data telah disimpan.` 
        })
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
    setShowResetDialog(true)
  }

  const executeReset = async () => {
    setShowResetDialog(false)
    setLoading(true)
    try {
      await remove(ref(database, "businessActors"))
      await remove(ref(database, "system_stats"))
      
      toast({ title: "Reset Berhasil", description: "Seluruh data pelaku usaha dan statistik telah dihapus." })
    } catch (error) {
      toast({ variant: "destructive", title: "Reset Gagal", description: "Terjadi kesalahan saat menghapus data." })
    } finally {
      setLoading(false)
    }
  }

  const handleResetSheet = async (target: '2023' | '2024' | '2025' | 'blacklist' | 'bpjs') => {
    setShowResetSheetDialog(false)
    const labels = {
      '2023': 'Sheet 2 (Data Pembanding 2023)',
      '2024': 'Sheet 1 (Data Pembanding 2024)',
      '2025': 'Sheet 3 (Data Pembanding 2025)',
      'blacklist': 'Sheet 4 (Data Blacklist)',
      'bpjs': 'Sheet 5 (Data Pembanding BPJS)'
    }
    const paths = {
      '2023': 'master_data_2023',
      '2024': 'master_data_2024',
      '2025': 'master_data_2025',
      'blacklist': 'blacklist_data',
      'bpjs': 'settings/bpjs_comparison_data'
    }

    setLoading(true)
    try {
      await remove(ref(database, paths[target]))
      toast({ title: "Hapus Berhasil", description: `Data ${labels[target]} telah dihapus.` })
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal Hapus", description: "Terjadi kesalahan saat menghapus data." })
    } finally {
      setLoading(false)
      setResetSheetTarget(null)
    }
  }

  const mapToExcelRow = (item: any, index: number) => {
    const valKK = item.noKK ?? item.kk ?? item.no_kk ?? item["NO KK"] ?? item["KK"] ?? ""
    const valNik = item.nik ?? item.Nik ?? item["NIK"] ?? ""
    const valNo = item.nomor ?? item.no ?? item["NO"] ?? item["No"] ?? (index + 1)
    const valThn = item.tahunPengajuan ?? item.tahun ?? item.thn ?? item["THN"] ?? item["Thn"] ?? ""
    const valNama = item.nama ?? item.fullName ?? item["NAMA"] ?? item["Nama"] ?? ""
    const valStatus = item.status ?? item["STATUS"] ?? item["Status"] ?? ""
    const valLpj = item.statusLpj ?? item.lpj ?? item["LPJ"] ?? ""
    const valNom = item.nominal ?? item.nom ?? item.lpjNominal ?? item["NOM"] ?? item["Nom"] ?? ""
    const valUsaha = item.usaha ?? item.businessName ?? item["USAHA"] ?? item["Usaha"] ?? ""
    const valAlamat = item.alamat ?? item.address ?? item["ALAMAT"] ?? item["Alamat"] ?? ""
    const valKel = item.kelurahan ?? item.kel ?? item["KEL"] ?? item["Kel"] ?? ""
    const valKec = item.kecamatan ?? item.kec ?? item["KEC"] ?? item["Kec"] ?? ""
    const valKoor = item.coordinator ?? item.koordinator ?? item.koor ?? item["KOOR"] ?? item["Koor"] ?? ""

    return {
      "KK": valKK ? String(valKK).trim() : "",
      "NIK": valNik ? String(valNik).trim() : "",
      "No": valNo !== "" && valNo !== undefined && valNo !== null ? String(valNo) : "",
      "Thn": valThn ? String(valThn) : "",
      "Nama": valNama ? String(valNama) : "",
      "Status": valStatus ? String(valStatus) : "",
      "LPJ": valLpj ? String(valLpj) : "",
      "Nom": valNom !== "" && valNom !== undefined && valNom !== null ? String(valNom) : "",
      "Usaha": valUsaha ? String(valUsaha) : "",
      "Alamat": valAlamat ? String(valAlamat) : "",
      "Kel": valKel ? String(valKel) : "",
      "Kec": valKec ? String(valKec) : "",
      "Koor": valKoor ? String(valKoor) : ""
    }
  }

  const getTargetData = async (targetType: 'master_2024' | 'master_2023' | 'master_2025' | 'blacklist' | 'bpjs') => {
    let list: any[] = []
    if (targetType === 'master_2024' && data2024 && data2024.length > 0) list = data2024
    else if (targetType === 'master_2023' && data2023 && data2023.length > 0) list = data2023
    else if (targetType === 'master_2025' && data2025 && data2025.length > 0) list = data2025
    else if (targetType === 'blacklist' && blacklistData && blacklistData.length > 0) list = blacklistData
    else if (targetType === 'bpjs' && bpjsData && bpjsData.length > 0) list = bpjsData

    // Fallback directly to Realtime Database if list not yet cached in state
    if (list.length === 0 && database) {
      const dbPath = targetType === 'master_2024' ? 'master_data_2024' :
                     targetType === 'master_2023' ? 'master_data_2023' :
                     targetType === 'master_2025' ? 'master_data_2025' : 
                     targetType === 'blacklist' ? 'blacklist_data' : 'settings/bpjs_comparison_data'
      const snap = await get(ref(database, dbPath))
      if (snap.exists()) {
        const val = snap.val()
        list = Array.isArray(val) ? val.filter(Boolean) : Object.values(val)
      }
    }
    return list
  }

  const createBpjsSheetFromList = (list: any[]) => {
    const rows = list.map((item, idx) => ({
      "NO": item.no || idx + 1,
      "NIK": item.nik ? String(item.nik).trim() : "",
      "NAMA": item.nama || item.name || item.fullName || "",
      "TANGGAL LAHIR": item.tanggalLahir || item.dob || "",
      "STATUS": item.status || "",
      "KETERANGAN": item.keterangan || item.statusBpjs || item.bpjsKeterangan || "",
      "SUMBER FILE": item.fileName || item.sourceFile || ""
    }))
    const dataToExport = rows.length > 0 ? rows : [
      {
        "NO": 1,
        "NIK": "",
        "NAMA": "",
        "TANGGAL LAHIR": "",
        "STATUS": "",
        "KETERANGAN": "",
        "SUMBER FILE": ""
      }
    ]
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    ws['!cols'] = [
      { wch: 8 },  // NO
      { wch: 22 }, // NIK
      { wch: 30 }, // NAMA
      { wch: 20 }, // TANGGAL LAHIR
      { wch: 12 }, // STATUS
      { wch: 25 }, // KETERANGAN
      { wch: 25 }, // SUMBER FILE
    ]
    const range = XLSX.utils.decode_range(ws['!ref'] || "A1")
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const cellNIK = ws[XLSX.utils.encode_cell({ r, c: 1 })]
      if (cellNIK) {
        cellNIK.t = 's'
        cellNIK.z = '@'
        if (cellNIK.v !== undefined && cellNIK.v !== null) cellNIK.v = String(cellNIK.v)
      }
    }
    return ws
  }

  const createSheetFromList = (list: any[]) => {
    const rows = list.map((item, idx) => mapToExcelRow(item, idx))
    const dataToExport = rows.length > 0 ? rows : [
      {
        "KK": "",
        "NIK": "",
        "No": "",
        "Thn": "",
        "Nama": "",
        "Status": "",
        "LPJ": "",
        "Nom": "",
        "Usaha": "",
        "Alamat": "",
        "Kel": "",
        "Kec": "",
        "Koor": ""
      }
    ]
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    
    // Column widths
    ws['!cols'] = [
      { wch: 20 }, // KK
      { wch: 20 }, // NIK
      { wch: 8 },  // No
      { wch: 8 },  // Thn
      { wch: 30 }, // Nama
      { wch: 16 }, // Status
      { wch: 12 }, // LPJ
      { wch: 16 }, // Nom
      { wch: 25 }, // Usaha
      { wch: 35 }, // Alamat
      { wch: 20 }, // Kel
      { wch: 20 }, // Kec
      { wch: 20 }, // Koor
    ]

    // Ensure KK and NIK are text to prevent scientific notation in Excel
    const range = XLSX.utils.decode_range(ws['!ref'] || "A1")
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const cellKK = ws[XLSX.utils.encode_cell({ r, c: 0 })]
      if (cellKK) {
        cellKK.t = 's'
        cellKK.z = '@'
        if (cellKK.v !== undefined && cellKK.v !== null) cellKK.v = String(cellKK.v)
      }
      const cellNIK = ws[XLSX.utils.encode_cell({ r, c: 1 })]
      if (cellNIK) {
        cellNIK.t = 's'
        cellNIK.z = '@'
        if (cellNIK.v !== undefined && cellNIK.v !== null) cellNIK.v = String(cellNIK.v)
      }
    }

    return ws
  }

  const handleDownloadSheet = async (targetType: 'master_2024' | 'master_2023' | 'master_2025' | 'blacklist' | 'bpjs') => {
    setDownloadingTarget(targetType)
    try {
      const list = await getTargetData(targetType)
      const ws = targetType === 'bpjs' ? createBpjsSheetFromList(list) : createSheetFromList(list)
      const wb = XLSX.utils.book_new()
      
      const sheetNames = {
        'master_2024': 'Data Pembanding 2024',
        'master_2023': 'Data Pembanding 2023',
        'master_2025': 'Data Pembanding 2025',
        'blacklist': 'Data Blacklist',
        'bpjs': 'Hasil Verifikasi BPJS'
      }
      const fileNames = {
        'master_2024': `Data_Pembanding_2024_${new Date().toISOString().split('T')[0]}.xlsx`,
        'master_2023': `Data_Pembanding_2023_${new Date().toISOString().split('T')[0]}.xlsx`,
        'master_2025': `Data_Pembanding_2025_${new Date().toISOString().split('T')[0]}.xlsx`,
        'blacklist': `Data_Blacklist_${new Date().toISOString().split('T')[0]}.xlsx`,
        'bpjs': `Data_Pembanding_BPJS_${new Date().toISOString().split('T')[0]}.xlsx`
      }
      
      XLSX.utils.book_append_sheet(wb, ws, sheetNames[targetType])
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileNames[targetType]
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)

      toast({
        title: "Download Berhasil",
        description: `${list.length.toLocaleString('id-ID')} data ${sheetNames[targetType]} berhasil diunduh.`
      })
    } catch (error: any) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Gagal Download",
        description: error.message || "Terjadi kesalahan saat mengunduh data."
      })
    } finally {
      setDownloadingTarget(null)
    }
  }

  const handleDownloadAllSheets = async () => {
    setDownloadingTarget('all')
    try {
      const [l24, l23, l25, lbl, lbpjs] = await Promise.all([
        getTargetData('master_2024'),
        getTargetData('master_2023'),
        getTargetData('master_2025'),
        getTargetData('blacklist'),
        getTargetData('bpjs')
      ])

      const wb = XLSX.utils.book_new()
      
      XLSX.utils.book_append_sheet(wb, createSheetFromList(l24), "Pembanding 2024")
      XLSX.utils.book_append_sheet(wb, createSheetFromList(l23), "Pembanding 2023")
      XLSX.utils.book_append_sheet(wb, createSheetFromList(l25), "Pembanding 2025")
      XLSX.utils.book_append_sheet(wb, createSheetFromList(lbl), "Blacklist")
      if (lbpjs.length > 0) {
        XLSX.utils.book_append_sheet(wb, createBpjsSheetFromList(lbpjs), "Pembanding BPJS")
      }

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Semua_Data_Pembanding_dan_BPJS_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)

      const total = l24.length + l23.length + l25.length + lbl.length + lbpjs.length
      toast({
        title: "Download Semua Berhasil",
        description: `Total ${total.toLocaleString('id-ID')} data berhasil diunduh.`
      })
    } catch (error: any) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Gagal Download",
        description: error.message || "Terjadi kesalahan saat mengunduh data."
      })
    } finally {
      setDownloadingTarget(null)
    }
  }

  const handleLogout = async () => {
    setShowLogoutDialog(true)
  }

  const executeLogout = async () => {
    setShowLogoutDialog(false)
    try {
      await signOut(auth)
      router.push('/login')
      toast({ title: "Berhasil Keluar", description: "Sampai jumpa kembali!" })
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal Keluar", description: "Terjadi kesalahan saat mencoba keluar." })
    }
  }

  if (isAdminLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <h1 className="text-4xl font-black text-primary font-headline">Pengaturan</h1>
        </div>
        <p className="text-muted-foreground font-medium">Konfigurasi tampilan {isAdmin ? "dan manajemen data aplikasi." : "aplikasi Anda."}</p>
      </div>

      {!isAdmin && (
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-300 font-bold">Akses Pengaturan</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-400">
            Halo {userProfile?.fullName || 'User'}, sebagai {isKoordinator ? "USULAN" : isPetugas ? "Petugas Input" : isDinas ? "Dinas" : isVerifikatorDinas ? "Verifikator Dinas" : isMonitoring ? "Monitoring" : "User"}, 
            Anda hanya dapat merubah tema aplikasi dan mengganti kata sandi. Fitur manajemen data hanya tersedia untuk Administrator.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Profile Card */}
        <Card className="border-none shadow-sm overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <div className="h-24 bg-primary/10 w-full relative">
            <div className="absolute -bottom-10 left-8">
              <Avatar className="w-20 h-20 border-4 border-white dark:border-slate-900 shadow-xl">
                <AvatarImage src={user?.photoURL || ""} />
                <AvatarFallback className="bg-primary text-white text-xl font-black">
                  {userProfile?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          <CardContent className="pt-14 pb-8 px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    {userProfile?.fullName || user?.displayName || "Pengguna Baru"}
                  </h2>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold uppercase text-[10px] px-2 py-0">
                    {userProfile?.role || (isAdmin ? "Admin" : "User")}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <Mail className="w-3.5 h-3.5" /> {user?.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <Shield className="w-3.5 h-3.5" /> ID: <span className="font-mono text-[10px]">{user?.uid}</span>
                  </div>
                </div>
              </div>

              <Button 
                variant="destructive" 
                onClick={() => setShowLogoutDialog(true)}
                className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all gap-2"
              >
                <LogOut className="w-4 h-4" /> Keluar Akun
              </Button>
            </div>
          </CardContent>
        </Card>


        <Card className="border-none shadow-sm">
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
                    className={cn(
                      "w-12 h-12 rounded-2xl border-4 shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center group",
                      themeSettings?.paletteName === color.name 
                        ? "border-primary scale-110" 
                        : "border-white dark:border-slate-800"
                    )}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    <div className={cn(
                      "transition-opacity",
                      themeSettings?.paletteName === color.name ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      {themeSettings?.paletteName === color.name ? (
                        <Check className="w-5 h-5 text-white drop-shadow-md" />
                      ) : (
                        <Palette className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic">Pilihan warna ini akan merubah warna Sidebar dan elemen utama aplikasi.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Keamanan Akun
            </CardTitle>
            <CardDescription>Ganti kata sandi untuk mengamankan akses Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newPass = formData.get('newPassword') as string;
              const confirmPass = formData.get('confirmPassword') as string;

              if (newPass !== confirmPass) {
                toast({ variant: "destructive", title: "Gagal", description: "Konfirmasi kata sandi tidak cocok." });
                return;
              }

              if (newPass.length < 6) {
                toast({ variant: "destructive", title: "Gagal", description: "Kata sandi minimal 6 karakter." });
                return;
              }

              setChangingPassword(true);
              try {
                // 1. Update di Firebase Auth
                if (auth.currentUser) {
                  await updatePassword(auth.currentUser, newPass);
                }

                // 2. Update di Database system_users (fallback/reference)
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
                  msg = "Sesi Anda telah berakhir demi keamanan. Silakan login kembali untuk mengganti kata sandi.";
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
                  <Input id="confirmPassword" name="confirmPassword" type="password" required className="pl-10" placeholder="Ulangi kata sandi" />
                </div>
              </div>
              <Button type="submit" disabled={changingPassword} className="w-full font-bold">
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                Ganti Kata Sandi
              </Button>
              <p className="text-[10px] text-muted-foreground italic">
                PENTING: Jika terjadi kesalahan "Sesi Berakhir", silakan Keluar (Logout) dan Masuk kembali untuk melanjutkan perubahan kata sandi.
              </p>
            </form>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" /> Konfigurasi Sistem & Kontak Admin
              </CardTitle>
              <CardDescription>Atur nama aplikasi, versi, kontak admin (Email & WhatsApp), dan teks hak cipta.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const appName = formData.get('appName') as string;
                const version = formData.get('version') as string;
                const totalPembanding = formData.get('totalPembanding') as string;
                const adminEmail = formData.get('adminEmail') as string;
                const adminWhatsapp = formData.get('adminWhatsapp') as string;
                const copyright = formData.get('copyright') as string;

                setLoading(true);
                try {
                  await update(ref(database, 'settings/system_config'), {
                    appName,
                    version,
                    totalPembanding,
                    adminEmail,
                    adminWhatsapp,
                    copyright
                  });
                  toast({ title: "Berhasil", description: "Konfigurasi sistem telah diperbarui." });
                } catch (err) {
                  toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan saat menyimpan konfigurasi." });
                } finally {
                  setLoading(false);
                }
              }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appName">Nama Aplikasi</Label>
                    <Input id="appName" name="appName" defaultValue={systemConfig?.appName || "SIMPU"} placeholder="Contoh: SIMPU" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="version">Versi Aplikasi</Label>
                    <Input id="version" name="version" defaultValue={systemConfig?.version || "8.2.5 PRO"} placeholder="Contoh: 8.2.5 PRO" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="totalPembanding">Total Data Pembanding</Label>
                    <Input id="totalPembanding" name="totalPembanding" defaultValue={systemConfig?.totalPembanding || "15.000 Data"} placeholder="Contoh: 15.000 Data" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email Kontak Admin</Label>
                    <Input id="adminEmail" name="adminEmail" defaultValue={systemConfig?.adminEmail || "simputeam@gmail.com"} placeholder="Contoh: simputeam@gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminWhatsapp">WhatsApp Kontak Admin</Label>
                    <Input id="adminWhatsapp" name="adminWhatsapp" defaultValue={systemConfig?.adminWhatsapp || "wa.me/62817319885"} placeholder="Contoh: wa.me/62817319885" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="copyright">Teks Hak Cipta</Label>
                    <Input id="copyright" name="copyright" defaultValue={systemConfig?.copyright || "© 2024 Dinas Koperasi & UKM"} placeholder="Contoh: © 2024 Nama Dinas" />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="font-bold">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DatabaseZap className="w-4 h-4 mr-2" />}
                  Simpan Konfigurasi
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card className="border-none shadow-sm">
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

                <div className="p-4 border border-accent/20 bg-accent/5 dark:bg-accent/10 rounded-xl space-y-3 sm:col-span-2">
                  <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-dashed">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-sm text-primary">
                        <FileSpreadsheet className="w-4 h-4" /> Import & Export Data Otomatisasi (Excel)
                      </div>
                      <p className="text-[10px] text-muted-foreground italic mt-0.5">
                        Upload & Download .xlsx Data Pembanding (Sheet 1-3, Blacklist, serta Sheet 5 Hasil Verifikasi BPJS).
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-primary/30 hover:bg-primary/10 text-primary font-bold text-xs h-9 gap-1.5 shadow-sm"
                      onClick={handleDownloadAllSheets}
                      disabled={downloadingTarget !== null}
                    >
                      {downloadingTarget === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Download Semua Sheet (.xlsx)
                    </Button>
                  </div>
                  
                  <div className="space-y-6 pt-2">
                    {/* Sheet 1: 2024 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Label className="text-[11px] font-black uppercase text-emerald-600 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> Sheet 1: Data Pembanding 2024 (3 Menit)
                        </Label>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">
                          {is2024Loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Total: {(data2024?.length || 0).toLocaleString('id-ID')} Data
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="relative">
                          <input type="file" accept=".xlsx, .xls" onChange={(e) => handleExcelUpload(e, 'master_2024')} className="hidden" id="excel-2024-upload" disabled={uploadingExcel} />
                          <Label htmlFor="excel-2024-upload" className="cursor-pointer">
                            <Button variant="outline" className="w-full border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 font-medium h-10" asChild>
                              <div className="flex items-center justify-center gap-2">
                                {uploadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Upload Sheet 1 (2024)
                              </div>
                            </Button>
                          </Label>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 font-medium h-10" 
                          onClick={() => handleDownloadSheet('master_2024')} 
                          disabled={downloadingTarget !== null}
                        >
                          <div className="flex items-center justify-center gap-2">
                            {downloadingTarget === 'master_2024' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Download Sheet 1 (2024)
                          </div>
                        </Button>
                        <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/20 hover:bg-destructive/5 font-medium h-10" onClick={() => { setResetSheetTarget('2024'); setShowResetSheetDialog(true); }} disabled={loading}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Reset Sheet 1
                        </Button>
                      </div>
                    </div>

                    {/* Sheet 2: 2023 */}
                    <div className="space-y-3 pt-4 border-t border-dashed">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Label className="text-[11px] font-black uppercase text-blue-600 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> Sheet 2: Data Pembanding 2023 (1 Menit)
                        </Label>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">
                          {is2023Loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Total: {(data2023?.length || 0).toLocaleString('id-ID')} Data
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="relative">
                          <input type="file" accept=".xlsx, .xls" onChange={(e) => handleExcelUpload(e, 'master_2023')} className="hidden" id="excel-2023-upload" disabled={uploadingExcel} />
                          <Label htmlFor="excel-2023-upload" className="cursor-pointer">
                            <Button variant="outline" className="w-full border-blue-500/20 hover:bg-blue-500/5 text-blue-700 dark:text-blue-400 font-medium h-10" asChild>
                              <div className="flex items-center justify-center gap-2">
                                {uploadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Upload Sheet 2 (2023)
                              </div>
                            </Button>
                          </Label>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full border-blue-500/30 hover:bg-blue-500/10 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 font-medium h-10" 
                          onClick={() => handleDownloadSheet('master_2023')} 
                          disabled={downloadingTarget !== null}
                        >
                          <div className="flex items-center justify-center gap-2">
                            {downloadingTarget === 'master_2023' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Download Sheet 2 (2023)
                          </div>
                        </Button>
                        <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/20 hover:bg-destructive/5 font-medium h-10" onClick={() => { setResetSheetTarget('2023'); setShowResetSheetDialog(true); }} disabled={loading}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Reset Sheet 2
                        </Button>
                      </div>
                    </div>

                    {/* Sheet 3: 2025 */}
                    <div className="space-y-3 pt-4 border-t border-dashed">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Label className="text-[11px] font-black uppercase text-amber-600 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Sheet 3: Data Pembanding 2025 (HOLD)
                        </Label>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">
                          {is2025Loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Total: {(data2025?.length || 0).toLocaleString('id-ID')} Data
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="relative">
                          <input type="file" accept=".xlsx, .xls" onChange={(e) => handleExcelUpload(e, 'master_2025')} className="hidden" id="excel-2025-upload" disabled={uploadingExcel} />
                          <Label htmlFor="excel-2025-upload" className="cursor-pointer">
                            <Button variant="outline" className="w-full border-amber-500/20 hover:bg-amber-500/5 text-amber-700 dark:text-amber-400 font-medium h-10" asChild>
                              <div className="flex items-center justify-center gap-2">
                                {uploadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Upload Sheet 3 (2025)
                              </div>
                            </Button>
                          </Label>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 font-medium h-10" 
                          onClick={() => handleDownloadSheet('master_2025')} 
                          disabled={downloadingTarget !== null}
                        >
                          <div className="flex items-center justify-center gap-2">
                            {downloadingTarget === 'master_2025' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Download Sheet 3 (2025)
                          </div>
                        </Button>
                        <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/20 hover:bg-destructive/5 font-medium h-10" onClick={() => { setResetSheetTarget('2025'); setShowResetSheetDialog(true); }} disabled={loading}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Reset Sheet 3
                        </Button>
                      </div>
                    </div>

                    {/* Sheet 4: Blacklist */}
                    <div className="space-y-3 pt-4 border-t border-dashed">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Label className="text-[11px] font-black uppercase text-rose-600 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5" /> Sheet 4: Data Blacklist (30s Reject)
                        </Label>
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">
                          {isBlacklistLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Total: {(blacklistData?.length || 0).toLocaleString('id-ID')} Data
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="relative">
                          <input type="file" accept=".xlsx, .xls" onChange={(e) => handleExcelUpload(e, 'blacklist')} className="hidden" id="excel-blacklist-upload" disabled={uploadingExcel} />
                          <Label htmlFor="excel-blacklist-upload" className="cursor-pointer">
                            <Button variant="outline" className="w-full border-rose-500/20 hover:bg-rose-500/5 text-rose-700 dark:text-rose-400 font-medium h-10" asChild>
                              <div className="flex items-center justify-center gap-2">
                                {uploadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Upload Sheet 4 (Blacklist)
                              </div>
                            </Button>
                          </Label>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full border-rose-500/30 hover:bg-rose-500/10 text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 font-medium h-10" 
                          onClick={() => handleDownloadSheet('blacklist')} 
                          disabled={downloadingTarget !== null}
                        >
                          <div className="flex items-center justify-center gap-2">
                            {downloadingTarget === 'blacklist' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Download Sheet 4 (Blacklist)
                          </div>
                        </Button>
                        <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/20 hover:bg-destructive/5 font-medium h-10" onClick={() => { setResetSheetTarget('blacklist'); setShowResetSheetDialog(true); }} disabled={loading}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Reset Sheet 4
                        </Button>
                      </div>
                    </div>

                    {/* Sheet 5: Data Pembanding BPJS */}
                    <div className="space-y-3 pt-4 border-t border-dashed" id="bpjs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Label className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> Sheet 5: Data Pembanding Hasil Verifikasi BPJS (Acuan Pelaku Usaha)
                        </Label>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">
                            {isBpjsLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                            Total: {(bpjsData?.length || 0).toLocaleString('id-ID')} Data
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 px-2 rounded-md"
                            onClick={() => router.push('/bpjs')}
                          >
                            Analisis & Tabel Pencocokan →
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="relative">
                          <input type="file" accept=".xlsx, .xls" onChange={(e) => handleExcelUpload(e, 'bpjs')} className="hidden" id="excel-bpjs-upload" disabled={uploadingExcel} />
                          <Label htmlFor="excel-bpjs-upload" className="cursor-pointer">
                            <Button variant="outline" className="w-full border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 font-medium h-10" asChild>
                              <div className="flex items-center justify-center gap-2">
                                {uploadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Upload Sheet 5 (BPJS)
                              </div>
                            </Button>
                          </Label>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 font-medium h-10" 
                          onClick={() => handleDownloadSheet('bpjs')} 
                          disabled={downloadingTarget !== null}
                        >
                          <div className="flex items-center justify-center gap-2">
                            {downloadingTarget === 'bpjs' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Download Sheet 5 (BPJS)
                          </div>
                        </Button>
                        <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/20 hover:bg-destructive/5 font-medium h-10" onClick={() => { setResetSheetTarget('bpjs'); setShowResetSheetDialog(true); }} disabled={loading}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Reset Sheet 5
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="font-bold">Zona Bahaya</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3">
                    <span className="text-xs">Hapus SEMUA data pelaku usaha secara permanen. Tindakan ini tidak berpengaruh pada data Master/Pembanding.</span>
                    <Button variant="destructive" size="sm" onClick={() => setShowResetDialog(true)} disabled={loading} className="w-fit font-bold">
                      <Trash2 className="w-4 h-4 mr-2" /> Reset Seluruh Data Pelaku
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        title="Hapus Semua Data Pelaku Usaha?"
        description="PERINGATAN! Semua data pelaku usaha akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus Semua"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        variant="destructive"
        onConfirm={executeReset}
        icon={<AlertTriangle className="w-6 h-6" />}
      />

      <ConfirmDialog
        open={showResetSheetDialog}
        onOpenChange={setShowResetSheetDialog}
        title="Hapus Data Sheet"
        description={`Hapus semua data ${
          resetSheetTarget === '2023' ? 'Sheet 2 (Data Pembanding 2023)' :
          resetSheetTarget === '2024' ? 'Sheet 1 (Data Pembanding 2024)' :
          resetSheetTarget === '2025' ? 'Sheet 3 (Data Pembanding 2025)' :
          resetSheetTarget === 'bpjs' ? 'Sheet 5 (Data Pembanding BPJS)' :
          'Sheet 4 (Data Blacklist)'
        }? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        variant="destructive"
        onConfirm={() => resetSheetTarget && handleResetSheet(resetSheetTarget)}
        icon={<Trash2 className="w-6 h-6" />}
      />

      <ConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        title="Keluar dari Aplikasi?"
        description="Apakah Anda yakin ingin keluar dari aplikasi?"
        confirmText="Ya, Keluar"
        confirmIcon={<LogOut className="w-4 h-4" />}
        variant="destructive"
        onConfirm={executeLogout}
        icon={<LogOut className="w-6 h-6" />}
      />
    </div>
  )
}
