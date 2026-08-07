"use client"

import { useState } from "react"
import { useDatabase, useUser, setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { ref, get } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  UserCheck
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
  const [summaryStats, setSummaryStats] = useState({
    totalRows: 0,
    uniquePetugas: 0,
    matchedActors: 0,
    provisionedUsers: 0
  })

  const isAllowed = userProfile?.role === 'admin' || userProfile?.role === 'koordinator' || userProfile?.role === 'monitoring' || user?.email?.toLowerCase() === 'agus@umkm.id'

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
          const regId = getColValue(r, ["REG ID", "REGISTRATION CODE", "REG_ID", "REGISTRATIONCODE", "REGISTRATION CODE"])
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
      const uniquePetugasMap = new Map<string, string>() // Name -> clean username
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
        title: "Import Petugas Survey Berhasil!",
        description: `Memperbarui ${updatedActorsCount} data Pelaku Usaha & menyiapkan ${createdUsersCount} akun Petugas Survey baru.`
      })
    } catch (err: any) {
      console.error("Import error:", err)
      toast({ variant: "destructive", title: "Import Gagal", description: err.message || "Terjadi kesalahan saat menyimpan data." })
    } finally {
      setIsProcessing(false)
    }
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
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Upload Excel Data Petugas Survey</h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold">
                ~40 Petugas Survey
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Import file Excel data pemetaan Petugas Survey (Kolom R) untuk memperbarui data pelaku usaha dan memprovisi akun petugas secara massal.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {parsedData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Total Baris Excel</p>
                <p className="text-2xl font-black text-slate-800">{summaryStats.totalRows}</p>
              </div>
              <FileSpreadsheet className="w-8 h-8 text-blue-500 opacity-80" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Petugas Survey Unik</p>
                <p className="text-2xl font-black text-purple-700">{summaryStats.uniquePetugas}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500 opacity-80" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Cocok Dgn Pelaku Usaha</p>
                <p className="text-2xl font-black text-emerald-700">{summaryStats.matchedActors}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-80" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Akun Baru Diprovisi</p>
                <p className="text-2xl font-black text-amber-700">{summaryStats.provisionedUsers}</p>
              </div>
              <ShieldCheck className="w-8 h-8 text-amber-500 opacity-80" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Zone & Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-dashed border-2 border-primary/30 hover:border-primary/60 transition-colors shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
              <UploadCloud className="w-5 h-5" /> Pilih atau Drag-and-Drop File Excel
            </CardTitle>
            <CardDescription>
              Mendukung file format <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>. File harus memiliki kolom <strong>PETUGAS SURVEY</strong> (Kolom R).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative border-2 border-dashed border-slate-200 hover:border-primary/50 rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-primary/5 transition-all">
              <FileSpreadsheet className="w-12 h-12 text-primary mb-3 animate-bounce" />
              <p className="font-bold text-slate-700">Klik untuk memilih file Excel atau seret ke sini</p>
              <p className="text-xs text-muted-foreground mt-1">Ukuran maksimal file: 10MB</p>
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

        {/* Instructions & Execute Box */}
        <Card className="border-primary/20 shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" /> Format Kolom Excel
            </CardTitle>
            <CardDescription className="text-xs">
              Sistem akan membaca kolom berikut dari Excel:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border font-mono">
              <p className="text-primary font-bold">✓ PETUGAS SURVEY (Kolom R)</p>
              <p className="text-slate-600">✓ REG ID / REGISTRATION CODE</p>
              <p className="text-slate-600">✓ NIK / NOMOR KK</p>
              <p className="text-slate-600">✓ NAMA LENGKAP</p>
              <p className="text-slate-600">✓ KOORDINATOR (Kolom P)</p>
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              *Petugas survey yang belum memiliki akun otomatis akan dibuatkan akun login dengan password awal: <strong>123456</strong>.
            </p>
          </CardContent>
          <div className="p-6 pt-0 mt-auto">
            {isProcessing && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Memproses Data...</span>
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
                  <UploadCloud className="w-4 h-4 mr-2" /> Proses & Update Petugas Survey
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Preview Table */}
      {parsedData.length > 0 && (
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Pratinjau Data Pemetaan Petugas Survey</CardTitle>
                <CardDescription className="text-xs">
                  Menampilkan {parsedData.length} baris data yang siap dihubungkan ke sistem.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-bold bg-white">
                {summaryStats.matchedActors} / {summaryStats.totalRows} Matched
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[450px] overflow-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold">No</TableHead>
                    <TableHead className="font-bold">Reg ID / NIK</TableHead>
                    <TableHead className="font-bold">Nama Pelaku Usaha</TableHead>
                    <TableHead className="font-bold">Koordinator (Kolom P)</TableHead>
                    <TableHead className="font-bold text-primary">Petugas Survey (Kolom R)</TableHead>
                    <TableHead className="text-right font-bold pr-6">Status Match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 100).map((r) => (
                    <TableRow key={r.rowNum} className="hover:bg-slate-50/80">
                      <TableCell className="text-center font-mono text-xs">{r.rowNum}</TableCell>
                      <TableCell className="font-mono text-xs">
                        <span className="block font-bold">{r.regId}</span>
                        <span className="text-[10px] text-muted-foreground">{r.nik}</span>
                      </TableCell>
                      <TableCell className="font-bold text-xs uppercase">{r.fullName}</TableCell>
                      <TableCell className="text-xs text-slate-700 font-medium">{r.coordinator}</TableCell>
                      <TableCell className="text-xs font-black text-primary uppercase">
                        {r.petugasSurvey !== "-" ? (
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                            {r.petugasSurvey}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground italic">Kosong</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {r.statusMatch === 'found' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Terhubung
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px] font-bold">
                            Akun Baru / Unmatched
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedData.length > 100 && (
              <div className="p-3 bg-slate-50 border-t text-center text-xs text-muted-foreground italic">
                Menampilkan 100 dari total {parsedData.length} baris data.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
