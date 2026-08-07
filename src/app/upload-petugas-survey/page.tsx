"use client"

import { useState, useMemo } from "react"
import { useDatabase, useUser, setDocumentNonBlocking, updateDocumentNonBlocking, useList, useMemoFirebase } from "@/firebase"
import { ref, get } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { logActivity, getDeviceType } from "@/lib/logger"
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Users, 
  FileCheck, 
  ShieldCheck,
  UserCheck,
  Key,
  Eye,
  EyeOff,
  RefreshCcw,
  UserPlus,
  Edit3,
  Search,
  Lock
} from "lucide-react"
import * as XLSX from "xlsx"
import Link from "next/link"

interface ParsedPetugasRow {
  rowNum: number
  regId: string
  nik: string
  fullName: string
  coordinator: string
  petugasSurvey: string
  statusMatch?: 'found' | 'not_found'
  actorId?: string
}

export default function UploadPetugasSurveyPage() {
  const { user, userProfile } = useUser()
  const database = useDatabase()
  const { toast } = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedPetugasRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isSuccess, setIsSuccess] = useState(false)
  const [searchPetugasQuery, setSearchPetugasQuery] = useState("")
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})

  // Dialog state for editing password
  const [editingPetugas, setEditingPetugas] = useState<any>(null)
  const [newPasswordInput, setNewPasswordInput] = useState("")
  const [isAddingPetugas, setIsAddingPetugas] = useState(false)
  const [addFullName, setAddFullName] = useState("")
  const [addPassword, setAddPassword] = useState("123456")

  const [summaryStats, setSummaryStats] = useState({
    totalRows: 0,
    uniquePetugas: 0,
    matchedActors: 0,
    provisionedUsers: 0
  })

  const isAllowed = userProfile?.role === 'admin' || userProfile?.role === 'koordinator' || userProfile?.role === 'monitoring' || user?.email?.toLowerCase() === 'agus@umkm.id'

  // Fetch all system users to manage Petugas Survey accounts
  const usersRef = useMemoFirebase(() => database ? ref(database, 'system_users') : null, [database])
  const { data: rawUsersList, isLoading: isUsersLoading } = useList(usersRef)

  // Fetch all businessActors to calculate linked actor counts per Petugas Survey
  const actorsRef = useMemoFirebase(() => database ? ref(database, 'businessActors') : null, [database])
  const { data: rawActorsList } = useList(actorsRef)

  // Filter petugas survey accounts (role === 'petugas')
  const petugasAccounts = useMemo(() => {
    if (!rawUsersList) return []
    
    // Count linked actors per petugas
    const actorCountsMap = new Map<string, number>()
    if (rawActorsList) {
      rawActorsList.forEach((a: any) => {
        const pName = (a.petugasSurvey || a.createdBy || "").toUpperCase().trim()
        if (pName) {
          actorCountsMap.set(pName, (actorCountsMap.get(pName) || 0) + 1)
        }
      })
    }

    return rawUsersList
      .filter((u: any) => u.role === 'petugas' || u.role === 'petugas_survey')
      .map((u: any) => {
        const upperName = (u.fullName || "").toUpperCase().trim()
        const linkedCount = actorCountsMap.get(upperName) || 0
        return { ...u, linkedCount }
      })
      .sort((a: any, b: any) => (a.fullName || "").localeCompare(b.fullName || ""))
  }, [rawUsersList, rawActorsList])

  const filteredPetugasAccounts = useMemo(() => {
    if (!searchPetugasQuery.trim()) return petugasAccounts
    const q = searchPetugasQuery.toLowerCase().trim()
    return petugasAccounts.filter((u: any) => 
      (u.fullName || "").toLowerCase().includes(q) ||
      (u.id || "").toLowerCase().includes(q)
    )
  }, [petugasAccounts, searchPetugasQuery])

  // Extract flexible column value from raw excel row
  const getColValue = (row: any, candidates: string[]): string => {
    const keys = Object.keys(row)
    for (const cand of candidates) {
      const candClean = cand.toLowerCase().replace(/[^a-z0-9]/g, '')
      for (const k of keys) {
        const kClean = k.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (kClean === candClean || kClean.includes(candClean)) {
          const val = row[k]
          if (val !== undefined && val !== null) return String(val).trim()
        }
      }
    }
    return ""
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setIsSuccess(false)
    setIsProcessing(true)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const workbook = XLSX.read(bstr, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" })

        if (!rawJson || rawJson.length === 0) {
          toast({ variant: "destructive", title: "File Kosong", description: "Tidak ada data yang dapat dibaca dari file Excel ini." })
          setIsProcessing(false)
          return
        }

        // Fetch current businessActors for matching
        let allActors: any[] = []
        if (database) {
          const snap = await get(ref(database, 'businessActors'))
          if (snap.exists()) {
            const val = snap.val()
            allActors = Object.keys(val).map(k => ({ id: k, ...val[k] }))
          }
        }

        const rows: ParsedPetugasRow[] = []
        const uniquePetugasSet = new Set<string>()
        let matchedCount = 0

        rawJson.forEach((r, idx) => {
          const regId = getColValue(r, ["REG ID", "REGISTRATION CODE", "REG_ID", "REGISTRATIONCODE"])
          const nik = getColValue(r, ["NIK", "NO NIK", "NOMOR NIK"])
          const fullName = getColValue(r, ["NAMA LENGKAP", "NAMA", "PEMILIK", "NAMA PEMILIK"])
          const coordinator = getColValue(r, ["KOORDINATOR", "NAMA KOORDINATOR"])
          const petugasSurvey = getColValue(r, ["PETUGAS SURVEY", "PETUGAS", "PETUGAS_SURVEY", "SURVEYOR"])

          if (petugasSurvey) {
            uniquePetugasSet.add(petugasSurvey.toUpperCase().trim())
          }

          // Match actor
          let matchActor: any = null
          if (regId) {
            matchActor = allActors.find(a => String(a.registrationCode || "").trim() === regId.trim())
          }
          if (!matchActor && nik) {
            matchActor = allActors.find(a => String(a.nik || "").trim() === nik.trim())
          }
          if (!matchActor && fullName) {
            matchActor = allActors.find(a => String(a.fullName || "").toLowerCase().trim() === fullName.toLowerCase().trim())
          }

          if (matchActor) {
            matchedCount++
          }

          rows.push({
            rowNum: idx + 1,
            regId: regId || "-",
            nik: nik || "-",
            fullName: fullName || "Tanpa Nama",
            coordinator: coordinator || "-",
            petugasSurvey: petugasSurvey || "-",
            statusMatch: matchActor ? 'found' : 'not_found',
            actorId: matchActor?.id
          })
        })

        setParsedData(rows)
        setSummaryStats({
          totalRows: rows.length,
          uniquePetugas: uniquePetugasSet.size,
          matchedActors: matchedCount,
          provisionedUsers: 0
        })

        toast({
          title: "File Excel Berhasil Dibaca",
          description: `Ditemukan ${rows.length} baris data dan ${uniquePetugasSet.size} Petugas Survey unik.`
        })
      } catch (err: any) {
        console.error("Failed to parse excel:", err)
        toast({ variant: "destructive", title: "Gagal Membaca File", description: err.message || "Terjadi kesalahan saat memproses Excel." })
      } finally {
        setIsProcessing(false)
      }
    }
    reader.readAsBinaryString(uploadedFile)
  }

  const handleProcessImport = async () => {
    if (!database || parsedData.length === 0) return

    setIsProcessing(true)
    setProgress(0)

    try {
      // Step 1: Collect unique Petugas Survey & auto-provision user accounts
      const uniquePetugasMap = new Map<string, string>() // UpperName -> clean username
      parsedData.forEach(r => {
        if (r.petugasSurvey && r.petugasSurvey !== "-") {
          const cleanName = r.petugasSurvey.trim()
          const username = cleanName.toLowerCase().replace(/\s+/g, '_')
          uniquePetugasMap.set(cleanName.toUpperCase(), username)
        }
      })

      // Fetch existing system users
      const usersSnap = await get(ref(database, 'system_users'))
      const existingUsers = usersSnap.exists() ? usersSnap.val() : {}

      let createdUsersCount = 0
      for (const [upperName, username] of Array.from(uniquePetugasMap.entries())) {
        if (!existingUsers[username]) {
          // Provision default user account for petugas
          const newUserRef = ref(database, `system_users/${username}`)
          setDocumentNonBlocking(newUserRef, {
            fullName: upperName,
            password: "123456", // Default temporary password
            role: "petugas",
            uid: null,
            addedAt: new Date().toISOString(),
            status: 'active'
          })
          createdUsersCount++
        }
      }

      // Step 2: Batch update businessActors with petugasSurvey & coordinator
      let updatedActorsCount = 0
      const totalToProcess = parsedData.length

      for (let i = 0; i < parsedData.length; i++) {
        const item = parsedData[i]
        if (item.actorId && item.petugasSurvey && item.petugasSurvey !== "-") {
          const actorRef = ref(database, `businessActors/${item.actorId}`)
          const updates: any = {
            petugasSurvey: item.petugasSurvey.toUpperCase().trim()
          }
          if (item.coordinator && item.coordinator !== "-") {
            updates.coordinator = item.coordinator.toUpperCase().trim()
          }

          updateDocumentNonBlocking(actorRef, updates)
          updatedActorsCount++
        }

        if (i % 10 === 0 || i === totalToProcess - 1) {
          setProgress(Math.round(((i + 1) / totalToProcess) * 100))
        }
      }

      setSummaryStats(prev => ({
        ...prev,
        provisionedUsers: createdUsersCount
      }))

      setIsSuccess(true)

      logActivity({
        query: `IMPORT EXCEL PETUGAS SURVEY: ${parsedData.length} Data, ${uniquePetugasMap.size} Petugas`,
        results: `Berhasil update ${updatedActorsCount} pelaku usaha & buat ${createdUsersCount} akun`,
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'IMPORT PETUGAS SURVEY',
        userId: user?.email || user?.uid || 'Admin'
      })

      toast({
        title: "Import Pembagian Data Berhasil!",
        description: `Memperbarui ${updatedActorsCount} data Pelaku Usaha & menyiapkan ${createdUsersCount} akun Petugas Survey.`
      })
    } catch (err: any) {
      console.error("Import error:", err)
      toast({ variant: "destructive", title: "Import Gagal", description: err.message || "Terjadi kesalahan saat menyimpan data." })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle Edit Password for Petugas Survey
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPetugas || !newPasswordInput.trim() || !database) return

    const userRef = ref(database, `system_users/${editingPetugas.id}`)
    const updates = {
      password: newPasswordInput.trim(),
      pwdVersion: (editingPetugas.pwdVersion || 0) + 1,
      uid: null, // Reset device locking so user logs in with new password
      addedAt: new Date().toISOString()
    }

    updateDocumentNonBlocking(userRef, updates)

    logActivity({
      query: `UPDATE PASSWORD PETUGAS: ${editingPetugas.fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'MANAJEMEN PETUGAS SURVEY',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({
      title: "Password Berhasil Diubah",
      description: `Kata sandi untuk Petugas Survey ${editingPetugas.fullName} telah diperbarui.`
    })

    setEditingPetugas(null)
    setNewPasswordInput("")
  }

  // Handle Add New Petugas Survey Manually
  const handleAddPetugasManual = (e: React.FormEvent) => {
    e.preventDefault()
    if (!addFullName.trim() || !addPassword.trim() || !database) return

    const cleanName = addFullName.trim().toUpperCase()
    const username = cleanName.toLowerCase().replace(/\s+/g, '_')
    const userRef = ref(database, `system_users/${username}`)

    setDocumentNonBlocking(userRef, {
      fullName: cleanName,
      password: addPassword.trim(),
      role: "petugas",
      uid: null,
      addedAt: new Date().toISOString(),
      status: 'active'
    })

    logActivity({
      query: `TAMBAH PETUGAS SURVEY MANUAL: ${cleanName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'MANAJEMEN PETUGAS SURVEY',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({
      title: "Akun Petugas Survey Dibuat",
      description: `Akun untuk ${cleanName} (Username: ${username}) berhasil dibuat.`
    })

    setIsAddingPetugas(false)
    setAddFullName("")
    setAddPassword("123456")
  }

  // Toggle Password visibility
  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Reset Device UID
  const handleResetUID = (id: string, fullName: string) => {
    if (!database) return
    const userRef = ref(database, `system_users/${id}`)
    updateDocumentNonBlocking(userRef, { uid: null, addedAt: new Date().toISOString() })
    toast({ title: "Perangkat Direset", description: `Penguncian perangkat ${fullName} telah dihapus.` })
  }

  if (!isAllowed) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground">Halaman ini hanya dapat diakses oleh Administrator & Koordinator.</p>
        <Button asChild><Link href="/dashboard">Kembali ke Dashboard</Link></Button>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Upload Excel & Pengaturan Akun Petugas Survey</h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold">
                {petugasAccounts.length} Petugas Terdaftar
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Upload file Excel pembagian data petugas survey (~40 petugas), atur Username & Password login, dan otomatis sinkronkan hak akses data pelaku usaha.
            </p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-purple-600 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Total Petugas Survey</p>
              <p className="text-2xl font-black text-purple-700">{petugasAccounts.length} Akun</p>
            </div>
            <Users className="w-8 h-8 text-purple-600 opacity-80" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-600 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Total Baris Excel Upload</p>
              <p className="text-2xl font-black text-slate-800">{summaryStats.totalRows}</p>
            </div>
            <FileSpreadsheet className="w-8 h-8 text-blue-600 opacity-80" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-600 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Data Pelaku Terhubung</p>
              <p className="text-2xl font-black text-emerald-700">{summaryStats.matchedActors}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-600 opacity-80" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-600 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Password Default</p>
              <p className="text-2xl font-black text-amber-700">123456</p>
            </div>
            <Lock className="w-8 h-8 text-amber-600 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Upload Zone & Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-dashed border-2 border-primary/30 hover:border-primary/60 transition-colors shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
              <UploadCloud className="w-5 h-5" /> Step 1: Upload Excel Pembagian Data Petugas Survey
            </CardTitle>
            <CardDescription>
              Mendukung file format <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>. File harus memiliki kolom <strong>PETUGAS SURVEY</strong> (Kolom R).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative border-2 border-dashed border-slate-200 hover:border-primary/50 rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-primary/5 transition-all">
              <FileSpreadsheet className="w-12 h-12 text-primary mb-3 animate-bounce" />
              <p className="font-bold text-slate-700">Klik untuk memilih file Excel atau seret ke sini</p>
              <p className="text-xs text-muted-foreground mt-1">Sistem akan memetakan data pelaku usaha ke masing-masing Petugas Survey</p>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileUpload} 
                className="absolute inset-0 opacity-0 cursor-pointer" 
              />
            </div>

            {file && (
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm text-slate-800">{file.name}</span>
                  <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <Badge variant="secondary" className="font-mono">{parsedData.length} baris terbaca</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Execute Card */}
        <Card className="border-primary/20 shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" /> Informasi Pemetaan
            </CardTitle>
            <CardDescription className="text-xs">
              Sistem akan memproses pembagian data dan otorisasi:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border font-mono">
              <p className="text-primary font-bold">✓ PETUGAS SURVEY (Kolom R)</p>
              <p className="text-slate-600">✓ KOORDINATOR (Kolom P)</p>
              <p className="text-slate-600">✓ REG ID / NIK / NAMA LENGKAP</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              *Petugas survey yang login dengan username-nya hanya akan dapat melihat data pelaku usaha yang ditugaskan kepadanya.
            </p>
          </CardContent>
          <div className="p-6 pt-0 mt-auto">
            {isProcessing && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Memproses Import...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <Button 
              onClick={handleProcessImport} 
              disabled={parsedData.length === 0 || isProcessing} 
              className="w-full font-bold h-11 text-sm shadow-md"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses Import...
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Selesai! Klik untuk Re-Import
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-2" /> Proses Pembagian Data
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Step 2: Dedicated Petugas Survey Accounts & Passwords Manager */}
      <Card className="border shadow-md overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black uppercase flex items-center gap-2 text-white">
                <ShieldCheck className="w-5 h-5 text-amber-400" /> Step 2: Kelola Username & Password Petugas Survey (~40 Petugas)
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs mt-1">
                Daftar akun login Petugas Survey. Admin dapat mengubah username, password, atau mereset perangkat di sini.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Cari Nama Petugas..." 
                  value={searchPetugasQuery} 
                  onChange={(e) => setSearchPetugasQuery(e.target.value)} 
                  className="pl-9 bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-400 h-9 text-xs" 
                />
              </div>

              <Dialog open={isAddingPetugas} onOpenChange={setIsAddingPetugas}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold gap-1 shadow-sm">
                    <UserPlus className="w-4 h-4" /> Tambah Petugas Manual
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleAddPetugasManual}>
                    <DialogHeader>
                      <DialogTitle className="text-primary font-black uppercase">Tambah Akun Petugas Survey Baru</DialogTitle>
                      <CardDescription>Buat akun login baru untuk Petugas Survey.</CardDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="font-bold">Nama Lengkap Petugas Survey</Label>
                        <Input 
                          placeholder="Contoh: KASMINAH" 
                          value={addFullName} 
                          onChange={(e) => setAddFullName(e.target.value)} 
                          required 
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Username otomatis: <strong>{(addFullName.trim().toLowerCase().replace(/\s+/g, '_') || 'username_petugas')}</strong>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Kata Sandi (Password)</Label>
                        <Input 
                          placeholder="Password" 
                          value={addPassword} 
                          onChange={(e) => setAddPassword(e.target.value)} 
                          required 
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full font-bold">Simpan Akun Petugas</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isUsersLoading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Memuat daftar akun Petugas Survey...
            </div>
          ) : filteredPetugasAccounts.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic">
              Belum ada akun Petugas Survey terdaftar. Upload file Excel di atas untuk membuat akun secara otomatis.
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="bg-slate-100 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold">No</TableHead>
                    <TableHead className="font-bold">Nama Petugas Survey</TableHead>
                    <TableHead className="font-bold">Username Login</TableHead>
                    <TableHead className="font-bold">Kata Sandi (Password)</TableHead>
                    <TableHead className="font-bold text-center">Data Terhubung</TableHead>
                    <TableHead className="font-bold text-center">Status Login</TableHead>
                    <TableHead className="text-right font-bold pr-6">Aksi Pengaturan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPetugasAccounts.map((u: any, idx: number) => {
                    const isPassVisible = !!visiblePasswords[u.id]
                    return (
                      <TableRow key={u.id} className="hover:bg-slate-50">
                        <TableCell className="text-center font-mono text-xs">{idx + 1}</TableCell>
                        <TableCell className="font-black text-sm uppercase text-slate-800">
                          {u.fullName}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-primary font-bold">
                          {u.id}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 px-2 py-1 rounded border font-mono">
                              {isPassVisible ? (u.password || "123456") : "••••••••"}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-slate-500 hover:text-slate-800" 
                              onClick={() => togglePasswordVisibility(u.id)}
                            >
                              {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-bold">
                            {u.linkedCount} Pelaku Usaha
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {u.uid ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] uppercase font-bold">
                              Terkunci di HP/Device
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px] uppercase font-bold">
                              Siap Login
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setEditingPetugas(u)
                                setNewPasswordInput(u.password || "123456")
                              }}
                              className="h-8 border-primary/30 text-primary hover:bg-primary/10 font-bold text-xs gap-1"
                            >
                              <Key className="w-3.5 h-3.5" /> Edit Password
                            </Button>

                            {u.uid && (
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => handleResetUID(u.id, u.fullName)}
                                className="h-8 w-8 text-amber-600 border-amber-200 hover:bg-amber-50"
                                title="Reset Penguncian HP/Perangkat"
                              >
                                <RefreshCcw className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Password Dialog Modal */}
      <Dialog open={!!editingPetugas} onOpenChange={(open) => !open && setEditingPetugas(null)}>
        <DialogContent>
          <form onSubmit={handleSavePassword}>
            <DialogHeader>
              <DialogTitle className="text-primary font-black uppercase">Ubah Kata Sandi Petugas Survey</DialogTitle>
              <CardDescription>
                Set password baru untuk <strong>{editingPetugas?.fullName}</strong> (Username: <code>{editingPetugas?.id}</code>).
              </CardDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label className="font-bold">Username Login</Label>
                <Input value={editingPetugas?.id || ""} disabled className="bg-slate-100 font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Password Baru</Label>
                <Input 
                  type="text" 
                  value={newPasswordInput} 
                  onChange={(e) => setNewPasswordInput(e.target.value)} 
                  placeholder="Masukkan password baru"
                  required 
                />
                <p className="text-[11px] text-muted-foreground">
                  Perangkat petugas akan direset sehingga petugas harus login ulang menggunakan password baru ini.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingPetugas(null)}>Batal</Button>
              <Button type="submit" className="font-bold">Simpan Password Baru</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
