"use client"

import { useState, useMemo } from "react"
import { useDatabase, useUser, setDocumentNonBlocking, updateDocumentNonBlocking, useList, useMemoFirebase } from "@/firebase"
import { ref, get, update } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
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
  Lock,
  FileDown,
  Trash2,
  AlertTriangle,
  Power,
  PowerOff
} from "lucide-react"
import * as XLSX from "xlsx"
import Link from "next/link"
import { addTunasBangsaHeader } from "@/lib/pdf-generator"

interface ParsedPetugasRow {
  rowNum: number
  regId: string
  nik: string
  fullName: string
  coordinator: string
  petugasSurvey: string
  statusMatch?: 'found' | 'not_found'
  actorId?: string
  matchMethod?: string // 'regId' | 'nik' | 'nik_normalized' | 'name_exact' | 'name_fuzzy'
}

// === NORMALIZATION HELPERS ===
const normalizeNik = (nik: string): string => nik.replace(/\D/g, '').replace(/^0+/, '')
const normalizeName = (name: string): string =>
  name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
const fuzzyNameMatch = (a: string, b: string): boolean => {
  const wa = normalizeName(a).split(' ').filter(Boolean)
  const wb = normalizeName(b).split(' ').filter(Boolean)
  if (wa.length === 0 || wb.length === 0) return false
  const shorter = wa.length <= wb.length ? wa : wb
  const longer  = wa.length <= wb.length ? wb : wa
  return shorter.every(word => longer.includes(word))
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

  // Force Assign state
  const [forceAssignRow, setForceAssignRow] = useState<ParsedPetugasRow | null>(null)
  const [forceAssignSearch, setForceAssignSearch] = useState("")
  const [allActorsCache, setAllActorsCache] = useState<any[]>([])

  // Dialog state for editing password
  const [editingPetugas, setEditingPetugas] = useState<any>(null)
  const [newPasswordInput, setNewPasswordInput] = useState("")
  const [isAddingPetugas, setIsAddingPetugas] = useState(false)
  const [addFullName, setAddFullName] = useState("")
  const [addPassword, setAddPassword] = useState("123456")

  const [showResetConfirm, setShowResetConfirm] = useState<{id: string, fullName: string} | null>(null)
  const [showStatusConfirm, setShowStatusConfirm] = useState<{id: string, fullName: string, currentStatus: string} | null>(null)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{id: string, fullName: string, linkedCount: number} | null>(null)
  const [isDeletingPetugas, setIsDeletingPetugas] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const [summaryStats, setSummaryStats] = useState({
    totalRows: 0,
    uniquePetugas: 0,
    matchedActors: 0,
    provisionedUsers: 0
  })

  // ── STATE TAHAP LANJUTAN (2, 3, 4) ──
  const [fileTahap2, setFileTahap2] = useState<File | null>(null)
  const [isProcessingTahap2, setIsProcessingTahap2] = useState(false)
  const [progressTahap2, setProgressTahap2] = useState(0)
  const [summaryTahap2, setSummaryTahap2] = useState<{
    totalRows: number; matchedActors: number; petugasCounts: Record<string, number>; createdUsers: number
  } | null>(null)

  const [fileTahap3, setFileTahap3] = useState<File | null>(null)
  const [isProcessingTahap3, setIsProcessingTahap3] = useState(false)
  const [progressTahap3, setProgressTahap3] = useState(0)
  const [summaryTahap3, setSummaryTahap3] = useState<{
    totalRows: number; matchedActors: number; petugasCounts: Record<string, number>; createdUsers: number
  } | null>(null)

  const [fileTahap4, setFileTahap4] = useState<File | null>(null)
  const [isProcessingTahap4, setIsProcessingTahap4] = useState(false)
  const [progressTahap4, setProgressTahap4] = useState(0)
  const [summaryTahap4, setSummaryTahap4] = useState<{
    totalRows: number; matchedActors: number; petugasCounts: Record<string, number>; createdUsers: number
  } | null>(null)

  const isAllowed = userProfile?.role === 'admin' || userProfile?.role === 'koordinator' || userProfile?.role === 'monitoring' || user?.email?.toLowerCase() === 'agus@umkm.id'

  // Fetch all system users to manage Petugas Survey accounts
  const usersRef = useMemoFirebase(() => database ? ref(database, 'system_users') : null, [database])
  const { data: rawUsersList, isLoading: isUsersLoading } = useList(usersRef)

  // Fetch all businessActors to calculate linked actor counts per Petugas Survey
  const actorsRef = useMemoFirebase(() => database ? ref(database, 'businessActors') : null, [database])
  const { data: rawActorsList } = useList(actorsRef)

  // Filter petugas survey accounts (role === 'petugas_survey')
  const petugasAccounts = useMemo(() => {
    if (!rawUsersList) return []
    
    // Filter only valid business actors with actual data and assigned petugas survey
    const validActors = (rawActorsList || []).filter((a: any) => 
      a && a.fullName && a.fullName.trim() &&
      a.petugasSurvey &&
      a.petugasSurvey.trim() !== '' &&
      a.petugasSurvey.trim() !== '-' &&
      a.petugasSurvey.trim().toUpperCase() !== 'BELUM ADA'
    )

    return rawUsersList
      .filter((u: any) => u.role === 'petugas_survey')
      .map((u: any) => {
        const fullNameUpper = (u.fullName || "").toUpperCase().trim()
        const idUpper = (u.id || "").toUpperCase().trim()
        const usernameUpper = (u.username || "").toUpperCase().trim()
        const normName = normalizeName(u.fullName || "")

        const linkedCount = validActors.filter((a: any) => {
          const p = (a.petugasSurvey || "").toUpperCase().trim()
          if (!p) return false
          if (p === fullNameUpper || (idUpper && p === idUpper) || (usernameUpper && p === usernameUpper)) return true
          if (normName && normalizeName(p) === normName) return true
          return false
        }).length

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

  const handleExportPDF = () => {
    setIsExportingPdf(true)
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(({ default: autoTable }) => {
        try {
          const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
          const pageWidth = doc.internal.pageSize.getWidth()
          const pageHeight = doc.internal.pageSize.getHeight()

          // Header Tunas Bangsa
          addTunasBangsaHeader(doc)
          
          // Header Info
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.setTextColor(0)
          doc.text('DATA USERNAME DAN PASSWORD PETUGAS SURVEY', pageWidth - 14, 17, { align: 'right' })
          doc.setFontSize(7)
          doc.setTextColor(130)
          doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - 14, 21, { align: 'right' })
          doc.setTextColor(0)

          // Table Rows
          const tableBody = filteredPetugasAccounts.map((u: any, index: number) => [
            index + 1,
            u.fullName || '-',
            u.id || '-',
            u.password || '123456',
            `${u.linkedCount || 0} Pelaku Usaha`,
            u.uid ? 'Terkunci di HP/Device' : 'Siap Login'
          ])

          const margin = 14
          const usableWidth = pageWidth - margin * 2

          autoTable(doc, {
            startY: 30,
            margin: { left: margin, right: margin, bottom: 48 },
            tableWidth: usableWidth,
            head: [['No', 'Nama Petugas', 'Username', 'Password', 'Data Terhubung', 'Status Login']],
            body: tableBody,
            styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, halign: 'center' },
            headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', halign: 'center' },
            columnStyles: {
              0: { cellWidth: 10 },
              1: { halign: 'left', cellWidth: 54 },
              2: { halign: 'left', cellWidth: 42 },
              3: { cellWidth: 24 },
              4: { cellWidth: 26 },
              5: { cellWidth: 26 }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] }
          })

          // Additional Information Section
          let finalY = (doc as any).lastAutoTable.finalY + 6

          if (finalY + 38 > pageHeight - 12) {
            doc.addPage()
            finalY = 20
          }

          // Card Background for Notes
          doc.setFillColor(248, 250, 252)
          doc.setDrawColor(226, 232, 240)
          doc.roundedRect(margin, finalY, usableWidth, 34, 3, 3, 'FD')

          // Title for Notes
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8)
          doc.setTextColor(15, 23, 42)
          doc.text('CATATAN & PETUNJUK PENGGUNAAN AKUN PETUGAS SURVEY:', margin + 4, finalY + 5.5)

          // Line divider
          doc.setDrawColor(203, 213, 225)
          doc.line(margin + 4, finalY + 7.5, margin + usableWidth - 4, finalY + 7.5)

          // Notes List
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7.5)
          doc.setTextColor(51, 65, 85)

          const notes = [
            '1. Link Login : https://tb2026ukm.qzz.io/',
            '2. Ketentuan 1 User 1 Perangkat',
            '3. Bantuan Layanan : Senin - Sabtu : 10.00 - 16.00',
            '4. Chat admin : 0817319885 , Email : simputeam@gmail.com',
            '5. Mohon tidak menyebarkan semua isi data di dalam aplikasi guna menjaga kerahasiaan data yang di tampilkan'
          ]

          let currentNoteY = finalY + 12
          notes.forEach(note => {
            doc.text(note, margin + 4, currentNoteY)
            currentNoteY += 4.5
          })

          doc.save(`DATA_USERNAME_DAN_PASSWORD_PETUGAS_SURVEY_${new Date().toISOString().split('T')[0]}.pdf`)

          logActivity({
            query: `DOWNLOAD PDF PETUGAS SURVEY (${filteredPetugasAccounts.length} akun)`,
            results: "Berhasil",
            device: getDeviceType(navigator.userAgent),
            source: 'Web',
            method: 'KELOLA AKUN PETUGAS SURVEY',
            userId: user?.email || user?.uid || 'Admin'
          })

          toast({ title: "PDF Berhasil Diunduh", description: "Data akun petugas survey telah disimpan dalam file PDF." })
        } catch (err: any) {
          console.error("PDF Export error:", err)
          toast({ variant: "destructive", title: "Gagal Membuat PDF", description: err.message || "Terjadi kesalahan." })
        } finally {
          setIsExportingPdf(false)
        }
      })
    })
  }

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
        setAllActorsCache(allActors)

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

          // Match actor — multi-strategy with normalization
          let matchActor: any = null
          let matchMethod = ''

          // Strategy 1: REG ID exact
          if (!matchActor && regId) {
            matchActor = allActors.find(a => String(a.registrationCode || "").trim() === regId.trim())
            if (matchActor) matchMethod = 'regId'
          }

          // Strategy 2: NIK exact
          if (!matchActor && nik) {
            matchActor = allActors.find(a => String(a.nik || "").trim() === nik.trim())
            if (matchActor) matchMethod = 'nik'
          }

          // Strategy 3: NIK normalized (digits only, no leading zeros)
          if (!matchActor && nik) {
            const normNik = normalizeNik(nik)
            if (normNik.length >= 10) {
              matchActor = allActors.find(a => normalizeNik(String(a.nik || "")) === normNik)
              if (matchActor) matchMethod = 'nik_normalized'
            }
          }

          // Strategy 4: Full name exact (case-insensitive)
          if (!matchActor && fullName) {
            matchActor = allActors.find(a =>
              normalizeName(String(a.fullName || "")) === normalizeName(fullName)
            )
            if (matchActor) matchMethod = 'name_exact'
          }

          // Strategy 5: Fuzzy name (all words match)
          if (!matchActor && fullName) {
            matchActor = allActors.find(a => fuzzyNameMatch(String(a.fullName || ""), fullName))
            if (matchActor) matchMethod = 'name_fuzzy'
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
            actorId: matchActor?.id,
            matchMethod
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
            role: "petugas_survey",
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

  // ── PROSES EXCEL TAHAP LANJUTAN (2, 3, 4) ──
  // Logika identik dengan Step 1: update petugasSurvey + buat akun baru jika belum ada
  const handleProcessTahapLanjutan = async (
    tahap: 2 | 3 | 4,
    file: File | null,
    setIsProcessing: (v: boolean) => void,
    setProgress: (v: number) => void,
    setSummary: (v: { totalRows: number; matchedActors: number; petugasCounts: Record<string, number>; createdUsers: number } | null) => void
  ) => {
    if (!database || !file) return

    setIsProcessing(true)
    setProgress(0)

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

        // Fetch businessActors & existing system_users
        const [actorsSnap, usersSnap] = await Promise.all([
          get(ref(database, 'businessActors')),
          get(ref(database, 'system_users'))
        ])
        const allActors: any[] = actorsSnap.exists()
          ? Object.keys(actorsSnap.val()).map(k => ({ id: k, ...actorsSnap.val()[k] }))
          : []
        const existingUsers: Record<string, any> = usersSnap.exists() ? usersSnap.val() : {}

        const petugasCounts: Record<string, number> = {}
        const uniquePetugasMap = new Map<string, string>() // UpperName -> username
        let matchedCount = 0
        const updates: Record<string, any> = {}
        const total = rawJson.length

        rawJson.forEach((r, idx) => {
          const regId      = getColValue(r, ["REG ID", "REGISTRATION CODE", "REG_ID", "REGISTRATIONCODE"])
          const nik        = getColValue(r, ["NIK", "NO NIK", "NOMOR NIK"])
          const fullName   = getColValue(r, ["NAMA LENGKAP", "NAMA", "PEMILIK", "NAMA PEMILIK"])
          const coordinator = getColValue(r, ["KOORDINATOR", "NAMA KOORDINATOR"])
          const petugasSurvey = getColValue(r, ["PETUGAS SURVEY", "PETUGAS", "PETUGAS_SURVEY", "SURVEYOR"])

          if (!petugasSurvey) return

          // Kumpulkan semua nama petugas unik untuk pembuatan akun
          const cleanName = petugasSurvey.trim()
          const username  = cleanName.toLowerCase().replace(/\s+/g, '_')
          uniquePetugasMap.set(cleanName.toUpperCase(), username)

          // Multi-strategy matching: REG ID → NIK → NIK normalized → Nama exact → Nama fuzzy
          let matchActor: any = null
          if (!matchActor && regId) {
            matchActor = allActors.find(a => String(a.registrationCode || "").trim() === regId.trim())
          }
          if (!matchActor && nik) {
            matchActor = allActors.find(a => String(a.nik || "").trim() === nik.trim())
          }
          if (!matchActor && nik) {
            const normNik = (v: string) => v.replace(/\D/g, '').replace(/^0+/, '')
            const normNikVal = normNik(nik)
            if (normNikVal.length >= 10) {
              matchActor = allActors.find(a => normNik(String(a.nik || "")) === normNikVal)
            }
          }
          if (!matchActor && fullName) {
            const normName = (n: string) => n.toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
            matchActor = allActors.find(a => normName(String(a.fullName || "")) === normName(fullName))
          }
          if (!matchActor && fullName) {
            const normName = (n: string) => n.toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
            const wb = normName(fullName).split(' ').filter(Boolean)
            matchActor = allActors.find(a => {
              const wa = normName(String(a.fullName || '')).split(' ').filter(Boolean)
              const shorter = wa.length <= wb.length ? wa : wb
              const longer  = wa.length <= wb.length ? wb : wa
              return shorter.length > 0 && shorter.every(w => longer.includes(w))
            })
          }

          if (matchActor && petugasSurvey) {
            const petugasUpper = petugasSurvey.toUpperCase().trim()
            // Update petugasSurvey (field SAMA dengan Step 1)
            updates[`businessActors/${matchActor.id}/petugasSurvey`] = petugasUpper
            if (coordinator && coordinator !== '-') {
              updates[`businessActors/${matchActor.id}/coordinator`] = coordinator.toUpperCase().trim()
            }
            petugasCounts[petugasUpper] = (petugasCounts[petugasUpper] || 0) + 1
            matchedCount++
          }

          if (idx % 50 === 0 || idx === total - 1) {
            setProgress(Math.round(((idx + 1) / total) * 100))
          }
        })

        // Buat akun baru untuk petugas yang belum terdaftar (sama dengan Step 1)
        let createdUsers = 0
        for (const [upperName, username] of Array.from(uniquePetugasMap.entries())) {
          if (!existingUsers[username]) {
            updates[`system_users/${username}`] = {
              fullName: upperName,
              password: "123456",
              role: "petugas_survey",
              uid: null,
              addedAt: new Date().toISOString(),
              status: 'active'
            }
            createdUsers++
          }
        }

        if (Object.keys(updates).length > 0) {
          await update(ref(database), updates)
        }

        setSummary({ totalRows: rawJson.length, matchedActors: matchedCount, petugasCounts, createdUsers })

        logActivity({
          query: `IMPORT EXCEL GELOMBANG ${tahap}: ${rawJson.length} Baris, ${matchedCount} Dipetakan, ${createdUsers} Akun Baru`,
          results: 'Berhasil update petugasSurvey & buat akun',
          device: getDeviceType(navigator.userAgent),
          source: 'Web',
          method: `PEMBAGIAN PETUGAS SURVEY - GELOMBANG ${tahap}`,
          userId: user?.email || user?.uid || 'Admin'
        })

        toast({
          title: `✅ Gelombang ${tahap}: Pembagian Berhasil!`,
          description: `${matchedCount} data dipetakan ke petugas survey.${createdUsers > 0 ? ` ${createdUsers} akun baru dibuat.` : ''}`
        })
      } catch (err: any) {
        console.error("Tahap lanjutan error:", err)
        toast({ variant: "destructive", title: `Gagal Proses Gelombang ${tahap}`, description: err.message || "Terjadi kesalahan saat memproses Excel." })
      } finally {
        setIsProcessing(false)
      }
    }
    reader.readAsBinaryString(file)
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
      role: "petugas_survey",
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
    // Clear both uid AND activeSessionId so the single-device lock is fully released
    updateDocumentNonBlocking(userRef, {
      uid: null,
      activeSessionId: null,
      addedAt: new Date().toISOString()
    })

    logActivity({
      query: `RESET PERANGKAT PETUGAS SURVEY: ${fullName}`,
      results: "Berhasil - Perangkat dilepas",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'MANAJEMEN PETUGAS SURVEY',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({
      title: "✅ Perangkat Berhasil Direset",
      description: `${fullName} kini dapat login di perangkat baru.`
    })
    setShowResetConfirm(null)
  }

  // Handle Toggle Aktif / Nonaktif Petugas Survey
  const handleToggleStatus = async () => {
    if (!showStatusConfirm || !database) return
    setIsTogglingStatus(true)
    const { id, fullName, currentStatus } = showStatusConfirm
    const isCurrentlyInactive = currentStatus === 'inactive' || currentStatus === 'nonaktif'
    const newStatus = isCurrentlyInactive ? 'active' : 'inactive'

    try {
      const userRef = ref(database, `system_users/${id}`)
      await update(userRef, {
        status: newStatus,
        isActive: isCurrentlyInactive,
        ...(newStatus === 'inactive' ? { activeSessionId: null } : {})
      })

      logActivity({
        query: `UBAH STATUS PETUGAS SURVEY: ${fullName} -> ${newStatus.toUpperCase()}`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'MANAJEMEN PETUGAS SURVEY',
        userId: user?.email || user?.uid || 'Admin'
      })

      toast({
        title: newStatus === 'inactive' ? "Akun Dinonaktifkan" : "Akun Diaktifkan",
        description: `Petugas "${fullName}" sekarang ${newStatus === 'inactive' ? 'TIDAK BISA login ke aplikasi' : 'BISA login ke aplikasi'}.`
      })
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Mengubah Status",
        description: err.message || "Terjadi kesalahan saat mengubah status akun."
      })
    } finally {
      setIsTogglingStatus(false)
      setShowStatusConfirm(null)
    }
  }

  // Handle Delete Petugas Survey & Unassign linked business actors
  const handleDeletePetugasSurvey = async () => {
    if (!showDeleteConfirm || !database) return

    setIsDeletingPetugas(true)
    const { id, fullName } = showDeleteConfirm

    try {
      // 1. Unassign all businessActors that have petugasSurvey matching fullName or id
      const normName = normalizeName(fullName)
      const snap = await get(ref(database, 'businessActors'))
      const updates: Record<string, any> = {}
      let unassignedCount = 0

      if (snap.exists()) {
        const val = snap.val()
        Object.keys(val).forEach(key => {
          const actor = val[key]
          if (
            actor.petugasSurvey &&
            (normalizeName(actor.petugasSurvey) === normName ||
             String(actor.petugasSurvey).toLowerCase().trim() === id.toLowerCase().trim())
          ) {
            updates[`businessActors/${key}/petugasSurvey`] = ""
            unassignedCount++
          }
        })
      }

      // 2. Remove user from system_users
      updates[`system_users/${id}`] = null

      const { update: updateDb } = await import("firebase/database")
      await updateDb(ref(database), updates)

      logActivity({
        query: `HAPUS PETUGAS SURVEY: ${fullName} (${unassignedCount} Data Dikosongkan)`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'MANAJEMEN PETUGAS SURVEY',
        userId: user?.email || user?.uid || 'Admin'
      })

      toast({
        title: "Petugas Survey Dihapus",
        description: `Akun ${fullName} berhasil dihapus. ${unassignedCount} data pelaku usaha telah dikosongkan petugas survey-nya (data UMKM tetap aman).`
      })

      setShowDeleteConfirm(null)
    } catch (err: any) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Gagal Menghapus Petugas",
        description: err.message || "Terjadi kesalahan saat menghapus data petugas."
      })
    } finally {
      setIsDeletingPetugas(false)
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

      {/* ── UNMATCHED ROWS WARNING PANEL ── */}
      {parsedData.length > 0 && parsedData.some(r => r.statusMatch === 'not_found') && (
        <Card className="border-2 border-amber-400 bg-amber-50 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-black text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              ⚠️ {parsedData.filter(r => r.statusMatch === 'not_found').length} Baris Excel Tidak Ter-match ke Data Firebase
            </CardTitle>
            <CardDescription className="text-amber-700 text-xs">
              Data di bawah ini tidak ditemukan di database (NIK/Nama berbeda). Klik <strong>Assign Manual</strong> untuk menghubungkan secara paksa, atau perbaiki NIK/Nama di file Excel lalu upload ulang.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-64">
              <Table>
                <TableHeader className="bg-amber-100">
                  <TableRow>
                    <TableHead className="font-bold text-amber-800 w-10">#</TableHead>
                    <TableHead className="font-bold text-amber-800">Nama di Excel</TableHead>
                    <TableHead className="font-bold text-amber-800">NIK di Excel</TableHead>
                    <TableHead className="font-bold text-amber-800">Petugas Survey</TableHead>
                    <TableHead className="font-bold text-amber-800 text-right pr-4">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData
                    .filter(r => r.statusMatch === 'not_found')
                    .map(row => (
                      <TableRow key={row.rowNum} className="bg-white hover:bg-amber-50">
                        <TableCell className="font-mono text-xs text-amber-600 font-bold">{row.rowNum}</TableCell>
                        <TableCell className="font-bold text-sm text-slate-800">{row.fullName}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">{row.nik}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold">{row.petugasSurvey}</Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs font-bold border-amber-400 text-amber-700 hover:bg-amber-100 gap-1"
                            onClick={() => {
                              setForceAssignRow(row)
                              setForceAssignSearch(row.fullName !== 'Tanpa Nama' ? row.fullName : row.nik)
                            }}
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Assign Manual
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* GELOMBANG 2: Upload Excel Pembagian Data                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-dashed border-2 border-indigo-300 hover:border-indigo-500 transition-colors shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-700">
              <UploadCloud className="w-5 h-5" />
              Step 1b: Upload Excel Pembagian Data — Gelombang 2
            </CardTitle>
            <CardDescription>
              Upload file Excel gelombang ke-2. Sistem akan membagi data pelaku usaha ke petugas survey, dan <strong>otomatis membuat akun</strong> untuk petugas baru yang belum terdaftar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer bg-indigo-50/30 hover:bg-indigo-50/60 transition-all">
              <FileSpreadsheet className="w-12 h-12 text-indigo-500 mb-3" />
              <p className="font-bold text-slate-700">Klik untuk memilih file Excel atau seret ke sini</p>
              <p className="text-xs text-muted-foreground mt-1">Format sama dengan Gelombang 1 — kolom PETUGAS SURVEY, REG ID/NIK/Nama</p>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => setFileTahap2(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            {fileTahap2 && (
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-sm text-slate-800">{fileTahap2.name}</span>
                  <span className="text-xs text-muted-foreground">({(fileTahap2.size / 1024).toFixed(1)} KB)</span>
                </div>
                <Badge variant="secondary" className="font-mono">Siap Diproses</Badge>
              </div>
            )}
            {summaryTahap2 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-emerald-700 uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Hasil Upload Terakhir — Gelombang 2
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-lg p-2 border text-center">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Baris</p>
                    <p className="text-lg font-black text-slate-800">{summaryTahap2.totalRows}</p>
                  </div>
                  <div className="bg-emerald-100 rounded-lg p-2 border border-emerald-200 text-center">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase">Dipetakan</p>
                    <p className="text-lg font-black text-emerald-700">{summaryTahap2.matchedActors}</p>
                  </div>
                  <div className="bg-indigo-100 rounded-lg p-2 border border-indigo-200 text-center">
                    <p className="text-[10px] text-indigo-700 font-bold uppercase">Akun Baru</p>
                    <p className="text-lg font-black text-indigo-700">{summaryTahap2.createdUsers}</p>
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto border rounded-lg divide-y bg-white">
                  {Object.entries(summaryTahap2.petugasCounts).map(([name, count]) => (
                    <div key={name} className="flex justify-between items-center px-3 py-1.5 text-xs">
                      <span className="font-bold text-slate-700">{name}</span>
                      <Badge className="bg-indigo-100 text-indigo-700 border-none font-bold">{count} Data</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-indigo-100 shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-700">
              <ShieldCheck className="w-5 h-5" /> Gelombang 2 — Informasi
            </CardTitle>
            <CardDescription className="text-xs">
              Sama persis dengan Gelombang 1. Update field <code className="bg-indigo-50 text-indigo-700 px-1 rounded font-mono text-[11px]">petugasSurvey</code> di database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1.5 bg-indigo-50 p-3 rounded-lg border border-indigo-100 font-mono">
              <p className="text-indigo-700 font-bold">✓ PETUGAS SURVEY (Kolom R)</p>
              <p className="text-slate-500">✓ KOORDINATOR (Kolom P)</p>
              <p className="text-slate-500">✓ REG ID / NIK / NAMA LENGKAP</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              ✅ Petugas lama → langsung tampil data baru.<br/>
              ✅ Petugas baru → akun dibuat otomatis (password: 123456).
            </p>
          </CardContent>
          <div className="p-6 pt-0 mt-auto">
            {isProcessingTahap2 && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Memproses Gelombang 2...</span><span>{progressTahap2}%</span>
                </div>
                <Progress value={progressTahap2} className="h-2" />
              </div>
            )}
            <Button
              onClick={() => handleProcessTahapLanjutan(2, fileTahap2, setIsProcessingTahap2, setProgressTahap2, setSummaryTahap2)}
              disabled={!fileTahap2 || isProcessingTahap2}
              className="w-full font-bold h-11 text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
            >
              {isProcessingTahap2 ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses Gelombang 2...</>
              ) : summaryTahap2 ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Selesai! Upload Ulang Gelombang 2</>
              ) : (
                <><UploadCloud className="w-4 h-4 mr-2" /> Proses Pembagian Gelombang 2</>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* GELOMBANG 3: Upload Excel Pembagian Data                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-dashed border-2 border-teal-300 hover:border-teal-500 transition-colors shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-teal-700">
              <UploadCloud className="w-5 h-5" />
              Step 1c: Upload Excel Pembagian Data — Gelombang 3
            </CardTitle>
            <CardDescription>
              Upload file Excel gelombang ke-3. Sistem akan membagi data pelaku usaha ke petugas survey, dan <strong>otomatis membuat akun</strong> untuk petugas baru yang belum terdaftar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative border-2 border-dashed border-teal-200 hover:border-teal-400 rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer bg-teal-50/30 hover:bg-teal-50/60 transition-all">
              <FileSpreadsheet className="w-12 h-12 text-teal-500 mb-3" />
              <p className="font-bold text-slate-700">Klik untuk memilih file Excel atau seret ke sini</p>
              <p className="text-xs text-muted-foreground mt-1">Format sama dengan Gelombang 1 — kolom PETUGAS SURVEY, REG ID/NIK/Nama</p>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => setFileTahap3(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            {fileTahap3 && (
              <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg border border-teal-200">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-teal-600" />
                  <span className="font-bold text-sm text-slate-800">{fileTahap3.name}</span>
                  <span className="text-xs text-muted-foreground">({(fileTahap3.size / 1024).toFixed(1)} KB)</span>
                </div>
                <Badge variant="secondary" className="font-mono">Siap Diproses</Badge>
              </div>
            )}
            {summaryTahap3 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-emerald-700 uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Hasil Upload Terakhir — Gelombang 3
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-lg p-2 border text-center">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Baris</p>
                    <p className="text-lg font-black text-slate-800">{summaryTahap3.totalRows}</p>
                  </div>
                  <div className="bg-emerald-100 rounded-lg p-2 border border-emerald-200 text-center">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase">Dipetakan</p>
                    <p className="text-lg font-black text-emerald-700">{summaryTahap3.matchedActors}</p>
                  </div>
                  <div className="bg-teal-100 rounded-lg p-2 border border-teal-200 text-center">
                    <p className="text-[10px] text-teal-700 font-bold uppercase">Akun Baru</p>
                    <p className="text-lg font-black text-teal-700">{summaryTahap3.createdUsers}</p>
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto border rounded-lg divide-y bg-white">
                  {Object.entries(summaryTahap3.petugasCounts).map(([name, count]) => (
                    <div key={name} className="flex justify-between items-center px-3 py-1.5 text-xs">
                      <span className="font-bold text-slate-700">{name}</span>
                      <Badge className="bg-teal-100 text-teal-700 border-none font-bold">{count} Data</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-teal-100 shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-teal-700">
              <ShieldCheck className="w-5 h-5" /> Gelombang 3 — Informasi
            </CardTitle>
            <CardDescription className="text-xs">
              Sama persis dengan Gelombang 1. Update field <code className="bg-teal-50 text-teal-700 px-1 rounded font-mono text-[11px]">petugasSurvey</code> di database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1.5 bg-teal-50 p-3 rounded-lg border border-teal-100 font-mono">
              <p className="text-teal-700 font-bold">✓ PETUGAS SURVEY (Kolom R)</p>
              <p className="text-slate-500">✓ KOORDINATOR (Kolom P)</p>
              <p className="text-slate-500">✓ REG ID / NIK / NAMA LENGKAP</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              ✅ Petugas lama → langsung tampil data baru.<br/>
              ✅ Petugas baru → akun dibuat otomatis (password: 123456).
            </p>
          </CardContent>
          <div className="p-6 pt-0 mt-auto">
            {isProcessingTahap3 && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Memproses Gelombang 3...</span><span>{progressTahap3}%</span>
                </div>
                <Progress value={progressTahap3} className="h-2" />
              </div>
            )}
            <Button
              onClick={() => handleProcessTahapLanjutan(3, fileTahap3, setIsProcessingTahap3, setProgressTahap3, setSummaryTahap3)}
              disabled={!fileTahap3 || isProcessingTahap3}
              className="w-full font-bold h-11 text-sm bg-teal-600 hover:bg-teal-700 text-white shadow-md"
            >
              {isProcessingTahap3 ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses Gelombang 3...</>
              ) : summaryTahap3 ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Selesai! Upload Ulang Gelombang 3</>
              ) : (
                <><UploadCloud className="w-4 h-4 mr-2" /> Proses Pembagian Gelombang 3</>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* GELOMBANG 4: Upload Excel Pembagian Data                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-dashed border-2 border-sky-300 hover:border-sky-500 transition-colors shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-sky-700">
              <UploadCloud className="w-5 h-5" />
              Step 1d: Upload Excel Pembagian Data — Gelombang 4
            </CardTitle>
            <CardDescription>
              Upload file Excel gelombang ke-4. Sistem akan membagi data pelaku usaha ke petugas survey, dan <strong>otomatis membuat akun</strong> untuk petugas baru yang belum terdaftar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative border-2 border-dashed border-sky-200 hover:border-sky-400 rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer bg-sky-50/30 hover:bg-sky-50/60 transition-all">
              <FileSpreadsheet className="w-12 h-12 text-sky-500 mb-3" />
              <p className="font-bold text-slate-700">Klik untuk memilih file Excel atau seret ke sini</p>
              <p className="text-xs text-muted-foreground mt-1">Format sama dengan Gelombang 1 — kolom PETUGAS SURVEY, REG ID/NIK/Nama</p>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => setFileTahap4(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            {fileTahap4 && (
              <div className="flex items-center justify-between p-3 bg-sky-50 rounded-lg border border-sky-200">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-sky-600" />
                  <span className="font-bold text-sm text-slate-800">{fileTahap4.name}</span>
                  <span className="text-xs text-muted-foreground">({(fileTahap4.size / 1024).toFixed(1)} KB)</span>
                </div>
                <Badge variant="secondary" className="font-mono">Siap Diproses</Badge>
              </div>
            )}
            {summaryTahap4 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-emerald-700 uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Hasil Upload Terakhir — Gelombang 4
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-lg p-2 border text-center">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Baris</p>
                    <p className="text-lg font-black text-slate-800">{summaryTahap4.totalRows}</p>
                  </div>
                  <div className="bg-emerald-100 rounded-lg p-2 border border-emerald-200 text-center">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase">Dipetakan</p>
                    <p className="text-lg font-black text-emerald-700">{summaryTahap4.matchedActors}</p>
                  </div>
                  <div className="bg-sky-100 rounded-lg p-2 border border-sky-200 text-center">
                    <p className="text-[10px] text-sky-700 font-bold uppercase">Akun Baru</p>
                    <p className="text-lg font-black text-sky-700">{summaryTahap4.createdUsers}</p>
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto border rounded-lg divide-y bg-white">
                  {Object.entries(summaryTahap4.petugasCounts).map(([name, count]) => (
                    <div key={name} className="flex justify-between items-center px-3 py-1.5 text-xs">
                      <span className="font-bold text-slate-700">{name}</span>
                      <Badge className="bg-sky-100 text-sky-700 border-none font-bold">{count} Data</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-sky-100 shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-sky-700">
              <ShieldCheck className="w-5 h-5" /> Gelombang 4 — Informasi
            </CardTitle>
            <CardDescription className="text-xs">
              Sama persis dengan Gelombang 1. Update field <code className="bg-sky-50 text-sky-700 px-1 rounded font-mono text-[11px]">petugasSurvey</code> di database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1.5 bg-sky-50 p-3 rounded-lg border border-sky-100 font-mono">
              <p className="text-sky-700 font-bold">✓ PETUGAS SURVEY (Kolom R)</p>
              <p className="text-slate-500">✓ KOORDINATOR (Kolom P)</p>
              <p className="text-slate-500">✓ REG ID / NIK / NAMA LENGKAP</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              ✅ Petugas lama → langsung tampil data baru.<br/>
              ✅ Petugas baru → akun dibuat otomatis (password: 123456).
            </p>
          </CardContent>
          <div className="p-6 pt-0 mt-auto">
            {isProcessingTahap4 && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Memproses Gelombang 4...</span><span>{progressTahap4}%</span>
                </div>
                <Progress value={progressTahap4} className="h-2" />
              </div>
            )}
            <Button
              onClick={() => handleProcessTahapLanjutan(4, fileTahap4, setIsProcessingTahap4, setProgressTahap4, setSummaryTahap4)}
              disabled={!fileTahap4 || isProcessingTahap4}
              className="w-full font-bold h-11 text-sm bg-sky-600 hover:bg-sky-700 text-white shadow-md"
            >
              {isProcessingTahap4 ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses Gelombang 4...</>
              ) : summaryTahap4 ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Selesai! Upload Ulang Gelombang 4</>
              ) : (
                <><UploadCloud className="w-4 h-4 mr-2" /> Proses Pembagian Gelombang 4</>
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

              <Button 
                size="sm" 
                onClick={handleExportPDF} 
                disabled={isExportingPdf || filteredPetugasAccounts.length === 0} 
                className="bg-red-600 hover:bg-red-700 text-white font-bold gap-1 shadow-sm"
              >
                {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                <span>Cetak PDF</span>
              </Button>

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
            <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
              <Table className="min-w-[900px]">
                <TableHeader className="bg-slate-100 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-10 text-center font-bold">No</TableHead>
                    <TableHead className="font-bold min-w-[140px]">Nama Petugas</TableHead>
                    <TableHead className="font-bold min-w-[140px]">Username</TableHead>
                    <TableHead className="font-bold min-w-[130px]">Password</TableHead>
                    <TableHead className="font-bold text-center min-w-[110px]">Data Terhubung</TableHead>
                    <TableHead className="font-bold text-center min-w-[100px]">Status Login</TableHead>
                    <TableHead className="font-bold text-center min-w-[90px]">Status Akun</TableHead>
                    <TableHead className="text-center font-bold min-w-[200px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPetugasAccounts.map((u: any, idx: number) => {
                    const isPassVisible = !!visiblePasswords[u.id]
                    const isInactive = u.status === 'inactive'
                    return (
                      <TableRow key={u.id} className={`transition-colors ${isInactive ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-slate-50'}`}>
                        {/* No */}
                        <TableCell className="text-center font-mono text-xs text-slate-500 w-10">{idx + 1}</TableCell>

                        {/* Nama */}
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className={`font-black text-sm uppercase leading-tight ${isInactive ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {u.fullName}
                            </span>
                            {isInactive && (
                              <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Akun Nonaktif</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Username */}
                        <TableCell className={`font-mono text-xs font-bold ${isInactive ? 'text-slate-400' : 'text-primary'}`}>
                          {u.id}
                        </TableCell>

                        {/* Password */}
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 font-mono tracking-widest text-slate-600">
                              {isPassVisible ? (u.password || "123456") : "••••••••"}
                            </span>
                            <button
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              onClick={() => togglePasswordVisibility(u.id)}
                            >
                              {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </TableCell>

                        {/* Data Terhubung */}
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1 bg-sky-100 text-sky-700 border border-sky-200 rounded-full px-2.5 py-1 text-[11px] font-bold">
                            <Users className="w-3 h-3" />
                            {u.linkedCount} Data
                          </div>
                        </TableCell>

                        {/* Status Login */}
                        <TableCell className="text-center">
                          {u.uid ? (
                            <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1 text-[10px] font-black uppercase">
                              <Lock className="w-2.5 h-2.5" /> Terkunci
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2.5 py-1 text-[10px] font-black uppercase">
                              <UserCheck className="w-2.5 h-2.5" /> Siap Login
                            </div>
                          )}
                        </TableCell>

                        {/* Status Akun */}
                        <TableCell className="text-center">
                          {isInactive ? (
                            <div className="inline-flex items-center gap-1 bg-red-100 text-red-600 border border-red-200 rounded-full px-2.5 py-1 text-[10px] font-black uppercase shadow-sm">
                              <PowerOff className="w-2.5 h-2.5" /> Nonaktif
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1 text-[10px] font-black uppercase shadow-sm">
                              <Power className="w-2.5 h-2.5" /> Aktif
                            </div>
                          )}
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className="text-center px-4">
                          <div className="inline-flex flex-col gap-1.5 items-stretch min-w-[120px]">
                            {/* Row 1: Password + Reset */}
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingPetugas(u)
                                  setNewPasswordInput(u.password || "123456")
                                }}
                                className="flex-1 flex items-center justify-center gap-1 h-7 px-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 font-bold text-[10px] transition-all hover:shadow-sm"
                                title="Ubah password"
                              >
                                <Key className="w-3 h-3 shrink-0" /> Password
                              </button>
                              <button
                                onClick={() => {
                                  if (u.uid) setShowResetConfirm({ id: u.id, fullName: u.fullName })
                                }}
                                disabled={!u.uid}
                                title={u.uid ? 'Reset perangkat' : 'Belum ada perangkat terkunci'}
                                className={`flex-1 flex items-center justify-center gap-1 h-7 px-2 rounded-lg font-bold text-[10px] border transition-all ${
                                  u.uid
                                    ? 'bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-200 hover:shadow-sm'
                                    : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60'
                                }`}
                              >
                                <RefreshCcw className="w-3 h-3 shrink-0" />
                                {u.uid ? 'Reset' : 'Belum Login'}
                              </button>
                            </div>

                            {/* Row 2: Toggle Status + Hapus */}
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setShowStatusConfirm({
                                  id: u.id,
                                  fullName: u.fullName,
                                  currentStatus: u.status || 'active'
                                })}
                                title={isInactive ? 'Aktifkan akun ini' : 'Nonaktifkan akun ini'}
                                className={`flex-1 flex items-center justify-center gap-1 h-7 px-2 rounded-lg font-bold text-[10px] border transition-all hover:shadow-sm ${
                                  isInactive
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                                    : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                                }`}
                              >
                                {isInactive
                                  ? <><Power className="w-3 h-3 shrink-0" /> Aktifkan</>
                                  : <><PowerOff className="w-3 h-3 shrink-0" /> Nonaktif</>
                                }
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm({
                                  id: u.id,
                                  fullName: u.fullName,
                                  linkedCount: u.linkedCount || 0
                                })}
                                title="Hapus akun petugas survey"
                                className="flex-1 flex items-center justify-center gap-1 h-7 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-[10px] transition-all hover:shadow-sm"
                              >
                                <Trash2 className="w-3 h-3 shrink-0" /> Hapus
                              </button>
                            </div>
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

      {/* Reset Device Confirmation Dialog */}
      <Dialog open={!!showResetConfirm} onOpenChange={(open) => !open && setShowResetConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-orange-600 font-black uppercase flex items-center gap-2">
              <RefreshCcw className="w-5 h-5" /> Konfirmasi Reset Perangkat
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
              <p className="font-bold text-slate-800 text-sm">
                Anda akan mereset perangkat untuk:
              </p>
              <p className="text-xl font-black text-orange-700 uppercase">{showResetConfirm?.fullName}</p>
              <p className="text-xs text-muted-foreground">
                Username: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{showResetConfirm?.id}</code>
              </p>
            </div>

            <div className="bg-slate-50 border rounded-xl p-4 space-y-1.5 text-xs text-slate-600">
              <p className="font-bold text-slate-700">Setelah reset perangkat:</p>
              <p>✅ Petugas survey dapat login di HP/tablet baru</p>
              <p>✅ Penguncian perangkat lama akan dilepas</p>
              <p>✅ Password tidak berubah, tetap sama</p>
              <p className="text-amber-600 font-bold mt-2">⚠️ Jika saat ini petugas sedang aktif di perangkat lama, mereka akan otomatis logout.</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(null)}
              className="font-bold"
            >
              Batal
            </Button>
            <Button
              onClick={() => showResetConfirm && handleResetUID(showResetConfirm.id, showResetConfirm.fullName)}
              className="font-bold bg-orange-600 hover:bg-orange-700 text-white gap-2"
            >
              <RefreshCcw className="w-4 h-4" /> Ya, Reset Perangkat Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── STATUS TOGGLE CONFIRM DIALOG ── */}
      <ConfirmDialog
        open={!!showStatusConfirm}
        onOpenChange={(open) => !open && setShowStatusConfirm(null)}
        title={showStatusConfirm?.currentStatus === 'inactive' ? 'Aktifkan Akun Petugas?' : 'Nonaktifkan Akun Petugas?'}
        description={
          showStatusConfirm?.currentStatus === 'inactive'
            ? `Akun "${showStatusConfirm?.fullName}" akan DIAKTIFKAN. Petugas ini akan bisa login ke aplikasi kembali.`
            : `Akun "${showStatusConfirm?.fullName}" akan DINONAKTIFKAN. Petugas ini TIDAK BISA login ke aplikasi sampai diaktifkan kembali.`
        }
        onConfirm={handleToggleStatus}
        variant={showStatusConfirm?.currentStatus === 'inactive' ? 'default' : 'destructive'}
        confirmText={showStatusConfirm?.currentStatus === 'inactive' ? 'Ya, Aktifkan' : 'Ya, Nonaktifkan'}
      />

      {/* ── FORCE ASSIGN DIALOG ── */}
      <Dialog open={!!forceAssignRow} onOpenChange={(open) => { if (!open) { setForceAssignRow(null); setForceAssignSearch('') } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-700 font-black uppercase flex items-center gap-2">
              <UserCheck className="w-5 h-5" /> Assign Manual Pelaku Usaha
            </DialogTitle>
            <CardDescription>
              Cari dan pilih data yang sesuai di Firebase untuk baris Excel:
              <strong className="text-slate-800 ml-1">{forceAssignRow?.fullName}</strong>
              <span className="text-slate-400 ml-1">(NIK: {forceAssignRow?.nik})</span>
            </CardDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari nama / NIK di database Firebase..."
                value={forceAssignSearch}
                onChange={(e) => setForceAssignSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="border rounded-lg overflow-auto max-h-72">
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Nama di Firebase</TableHead>
                    <TableHead className="font-bold text-xs">NIK</TableHead>
                    <TableHead className="font-bold text-xs text-right pr-4">Pilih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allActorsCache
                    .filter(a => {
                      const q = forceAssignSearch.toLowerCase().trim()
                      if (!q) return true
                      return (
                        (a.fullName || '').toLowerCase().includes(q) ||
                        (a.nik || '').includes(q)
                      )
                    })
                    .slice(0, 30)
                    .map(a => (
                      <TableRow key={a.id} className="hover:bg-blue-50">
                        <TableCell className="font-bold text-sm">{a.fullName || '-'}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">{a.nik || '-'}</TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            size="sm"
                            className="h-7 text-xs font-bold bg-primary hover:bg-primary/90 gap-1"
                            onClick={() => {
                              if (!forceAssignRow || !database) return

                              // Update parsedData: set actorId & statusMatch for this row
                              setParsedData(prev => prev.map(r =>
                                r.rowNum === forceAssignRow.rowNum
                                  ? { ...r, actorId: a.id, statusMatch: 'found', matchMethod: 'manual' }
                                  : r
                              ))

                              // Immediately write petugasSurvey to Firebase
                              const actorRef = ref(database, `businessActors/${a.id}`)
                              const updates: any = {
                                petugasSurvey: (forceAssignRow.petugasSurvey !== '-'
                                  ? forceAssignRow.petugasSurvey
                                  : forceAssignRow.petugasSurvey).toUpperCase().trim()
                              }
                              if (forceAssignRow.coordinator && forceAssignRow.coordinator !== '-') {
                                updates.coordinator = forceAssignRow.coordinator.toUpperCase().trim()
                              }
                              updateDocumentNonBlocking(actorRef, updates)

                              toast({
                                title: '✅ Berhasil Di-assign Manual',
                                description: `${forceAssignRow.fullName} → ${a.fullName} (${forceAssignRow.petugasSurvey})`
                              })

                              logActivity({
                                query: `FORCE ASSIGN MANUAL: ${forceAssignRow.fullName} → ${a.fullName} (${forceAssignRow.petugasSurvey})`,
                                results: 'Berhasil',
                                device: getDeviceType(navigator.userAgent),
                                source: 'Web',
                                method: 'UPLOAD PETUGAS SURVEY',
                                userId: user?.email || user?.uid || 'Admin'
                              })

                              setForceAssignRow(null)
                              setForceAssignSearch('')
                            }}
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Pilih Ini
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {allActorsCache.filter(a => {
                    const q = forceAssignSearch.toLowerCase().trim()
                    if (!q) return true
                    return (a.fullName || '').toLowerCase().includes(q) || (a.nik || '').includes(q)
                  }).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground italic py-8">
                        Tidak ada data ditemukan untuk pencarian "{forceAssignSearch}"
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Menampilkan maks. 30 hasil. Gunakan pencarian untuk mempersempit data.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setForceAssignRow(null); setForceAssignSearch('') }}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog Modal */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2 mx-auto sm:mx-0">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-slate-900 font-black text-lg">
              Hapus Petugas Survey & Pembagian Data?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-slate-600 text-xs space-y-3 pt-2">
                <div>
                  Apakah Anda yakin ingin menghapus petugas survey <span className="font-black text-slate-900">{showDeleteConfirm?.fullName}</span> (<span className="font-mono text-rose-600 font-semibold">{showDeleteConfirm?.id}</span>)?
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2 text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Konsekuensi Penghapusan:
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-1 font-medium">
                    <li>
                      Akun login petugas survey ini akan <strong>dihapus</strong> dari sistem.
                    </li>
                    <li>
                      Sebanyak <strong className="text-red-700">{showDeleteConfirm?.linkedCount || 0} Data Pelaku Usaha</strong> yang terhubung akan <strong>dikosongkan status petugas survey-nya</strong> (menjadi Belum Ada Petugas Survey).
                    </li>
                    <li className="text-emerald-800 font-bold">
                      Data Pelaku Usaha (nama, NIK, KK, alamat, jenis usaha, rekening, dll) <u>TIDAK AKAN DIHAPUS</u> dan tetap tersimpan aman di database.
                    </li>
                  </ul>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
              disabled={isDeletingPetugas}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleDeletePetugasSurvey}
              disabled={isDeletingPetugas}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isDeletingPetugas ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Ya, Hapus Petugas & Kosongkan Pembagian
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
