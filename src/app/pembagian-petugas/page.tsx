"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { 
  useMemoFirebase, 
  useList, 
  useUser, 
  useDatabase, 
  useObject, 
  setDocumentNonBlocking, 
  deleteDocumentNonBlocking, 
  updateDocumentNonBlocking 
} from "@/firebase"
import { ref, update, remove, get } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Upload, 
  FileSpreadsheet, 
  UserCheck, 
  Users, 
  Key, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Trash2, 
  Printer, 
  FileDown, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X,
  FileText,
  User,
  ExternalLink,
  Lock,
  Smartphone
} from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { addTunasBangsaHeader } from "@/lib/pdf-generator"

export default function PembagianPetugasSurveyPage() {
  const [mounted, setMounted] = useState(false)
  const { user, userProfile } = useUser()
  const database = useDatabase()
  const { toast } = useToast()

  // State for File Upload & Processing
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessingExcel, setIsProcessingExcel] = useState(false)
  const [excelSummary, setExcelSummary] = useState<{
    totalRows: number
    matchedActors: number
    surveyorCounts: Record<string, number>
    unmatchedRows: number
  } | null>(null)
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State for Step 2: Management
  const [searchQuery, setSearchQuery] = useState("")
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSurveyor, setEditingSurveyor] = useState<any>(null)
  const [newSurveyorName, setNewSurveyorName] = useState("")
  const [newSurveyorUsername, setNewSurveyorUsername] = useState("")
  const [newSurveyorPassword, setNewSurveyorPassword] = useState("")

  // State for Delete Surveyor Confirmation Dialog (Feature requested)
  const [deletingSurveyor, setDeletingSurveyor] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // State for Connected Data Detail Dialog
  const [viewingConnectedSurveyor, setViewingConnectedSurveyor] = useState<{
    surveyor: any
    actors: BusinessActor[]
  } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Admin Check
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'

  // Fetch all system users
  const systemUsersRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'system_users')
  }, [database])
  const { data: systemUsersRaw, isLoading: isUsersLoading } = useList(systemUsersRef)

  // Fetch all business actors
  const businessActorsRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'businessActors')
  }, [database])
  const { data: businessActorsRaw, isLoading: isActorsLoading } = useList<BusinessActor>(businessActorsRef)

  // Filter surveyors from system_users (role === 'petugas' or role === 'petugas_survey')
  const surveyors = useMemo(() => {
    if (!systemUsersRaw) return []
    return systemUsersRaw
      .filter((u: any) => u.role === 'petugas' || u.role === 'petugas_survey')
      .map((u: any) => ({
        id: u.id || u.username,
        username: u.id || u.username,
        fullName: u.fullName || u.name || u.id,
        password: u.password || '12345678',
        role: u.role,
        uid: u.uid || null,
        addedAt: u.addedAt
      }))
  }, [systemUsersRaw])

  // Map connected actors to each surveyor
  const surveyorConnectedMap = useMemo(() => {
    const map: Record<string, BusinessActor[]> = {}
    if (!businessActorsRaw) return map

    businessActorsRaw.forEach((actor) => {
      if (actor && actor.petugasSurvey && actor.petugasSurvey.trim() !== '' && actor.petugasSurvey.trim() !== '-' && actor.petugasSurvey.trim().toUpperCase() !== 'BELUM ADA') {
        const key = actor.petugasSurvey.trim().toUpperCase()
        if (!map[key]) map[key] = []
        map[key].push(actor)
      }
    })
    return map
  }, [businessActorsRaw])

  // Count unassigned actors (including BELUM ADA)
  const unassignedActorsCount = useMemo(() => {
    if (!businessActorsRaw) return 0
    return businessActorsRaw.filter(a => !a.petugasSurvey || a.petugasSurvey.trim() === '' || a.petugasSurvey.trim() === '-' || a.petugasSurvey.trim().toUpperCase() === 'BELUM ADA').length
  }, [businessActorsRaw])

  // Helper to get connected actors for a surveyor
  const getConnectedActors = (surveyor: any): BusinessActor[] => {
    if (!surveyor) return []
    const nameKey = (surveyor.fullName || '').trim().toUpperCase()
    const usernameKey = (surveyor.username || surveyor.id || '').trim().toUpperCase()
    
    const byName = surveyorConnectedMap[nameKey] || []
    const byUsername = surveyorConnectedMap[usernameKey] || []

    // Merge and deduplicate by actor id
    const merged = [...byName]
    byUsername.forEach(a => {
      if (!merged.some(m => m.id === a.id)) {
        merged.push(a)
      }
    })
    return merged
  }

  // Filter surveyors based on search query
  const filteredSurveyors = useMemo(() => {
    if (!surveyors) return []
    const query = searchQuery.toLowerCase().trim()
    if (!query) return surveyors

    return surveyors.filter((s: any) => 
      (s.fullName || '').toLowerCase().includes(query) ||
      (s.username || '').toLowerCase().includes(query)
    )
  }, [surveyors, searchQuery])

  // Toggle password visibility
  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  // File Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        setSelectedFile(file)
      } else {
        toast({
          variant: "destructive",
          title: "Format Tidak Didukung",
          description: "Harap unggah file dengan format .xlsx, .xls, atau .csv"
        })
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  // Process Excel Pembagian Data Petugas Survey
  const handleProcessExcel = async () => {
    if (!selectedFile || !database) {
      toast({
        variant: "destructive",
        title: "Pilih File Terlebih Dahulu",
        description: "Silakan pilih atau seret file Excel pembagian data sebelum memproses."
      })
      return
    }

    setIsProcessingExcel(true)

    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const wb = XLSX.read(arrayBuffer, { type: 'array' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })
      if (rows.length <= 1) {
        throw new Error("File Excel kosong atau hanya berisi baris judul.")
      }

      // Check header row (row 0)
      const headerRow = rows[0].map((h: any) => String(h || "").trim().toUpperCase())
      
      // Look for columns by name or index
      // Kolom R (index 17), Kolom P (index 15), Kolom NIK / No KK / Nama
      let colPetugasIdx = headerRow.findIndex((h: string) => h.includes("PETUGAS SURVEY") || h.includes("PETUGAS") || h.includes("SURVEYOR"))
      if (colPetugasIdx === -1 && rows[0].length > 17) colPetugasIdx = 17 // Column R fallback

      let colKoorIdx = headerRow.findIndex((h: string) => h.includes("KOORDINATOR") || h.includes("KORLAP"))
      if (colKoorIdx === -1 && rows[0].length > 15) colKoorIdx = 15 // Column P fallback

      let colNikIdx = headerRow.findIndex((h: string) => h === "NIK" || h.includes("NIK"))
      let colKkIdx = headerRow.findIndex((h: string) => h.includes("NO KK") || h.includes("KK") || h.includes("KARTU KELUARGA"))
      let colNamaIdx = headerRow.findIndex((h: string) => h === "NAMA" || h.includes("NAMA PELAKU") || h.includes("NAMA LENGKAP"))
      let colRegIdIdx = headerRow.findIndex((h: string) => h.includes("REG ID") || h.includes("REGISTRATION") || h.includes("ID"))

      // If indices not found, use standard 0, 1, 4
      if (colNikIdx === -1) colNikIdx = 1
      if (colKkIdx === -1) colKkIdx = 0
      if (colNamaIdx === -1) colNamaIdx = 4

      // Build lookup maps from current businessActors in database
      const actors = businessActorsRaw || []
      const actorByNik = new Map<string, BusinessActor>()
      const actorByKkName = new Map<string, BusinessActor>()
      const actorByName = new Map<string, BusinessActor>()
      const actorByRegId = new Map<string, BusinessActor>()

      actors.forEach(a => {
        if (a.nik) actorByNik.set(String(a.nik).trim(), a)
        if (a.noKK && a.fullName) actorByKkName.set(`${String(a.noKK).trim()}_${String(a.fullName).trim().toUpperCase()}`, a)
        if (a.fullName) actorByName.set(String(a.fullName).trim().toUpperCase(), a)
        if (a.registrationCode) actorByRegId.set(String(a.registrationCode).trim().toUpperCase(), a)
        if (a.id) actorByRegId.set(String(a.id).trim(), a)
      })

      const updates: Record<string, any> = {}
      const surveyorCounts: Record<string, number> = {}
      const newSurveyorsToCreate: Set<string> = new Set()
      let matchedCount = 0
      let unmatchedCount = 0

      // Process rows from index 1
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r]
        if (!row || row.length === 0) continue

        const rawPetugas = colPetugasIdx >= 0 && row[colPetugasIdx] !== undefined ? String(row[colPetugasIdx]).trim() : ""
        const rawKoor = colKoorIdx >= 0 && row[colKoorIdx] !== undefined ? String(row[colKoorIdx]).trim() : ""
        const rawNik = colNikIdx >= 0 && row[colNikIdx] !== undefined ? String(row[colNikIdx]).trim() : ""
        const rawKk = colKkIdx >= 0 && row[colKkIdx] !== undefined ? String(row[colKkIdx]).trim() : ""
        const rawNama = colNamaIdx >= 0 && row[colNamaIdx] !== undefined ? String(row[colNamaIdx]).trim() : ""
        const rawRegId = colRegIdIdx >= 0 && row[colRegIdIdx] !== undefined ? String(row[colRegIdIdx]).trim() : ""

        if (!rawPetugas && !rawNik && !rawNama && !rawKk) continue

        // Try to match actor
        let matchedActor: BusinessActor | undefined = undefined
        if (rawNik && actorByNik.has(rawNik)) {
          matchedActor = actorByNik.get(rawNik)
        } else if (rawRegId && actorByRegId.has(rawRegId.toUpperCase())) {
          matchedActor = actorByRegId.get(rawRegId.toUpperCase())
        } else if (rawKk && rawNama && actorByKkName.has(`${rawKk}_${rawNama.toUpperCase()}`)) {
          matchedActor = actorByKkName.get(`${rawKk}_${rawNama.toUpperCase()}`)
        } else if (rawNama && actorByName.has(rawNama.toUpperCase())) {
          matchedActor = actorByName.get(rawNama.toUpperCase())
        }

        if (matchedActor && rawPetugas) {
          const surveyorName = rawPetugas.toUpperCase()
          updates[`businessActors/${matchedActor.id}/petugasSurvey`] = surveyorName
          
          if (rawKoor && (!matchedActor.coordinator || matchedActor.coordinator.trim() === '')) {
            updates[`businessActors/${matchedActor.id}/coordinator`] = rawKoor.toUpperCase()
          }

          surveyorCounts[surveyorName] = (surveyorCounts[surveyorName] || 0) + 1
          matchedCount++

          // Queue surveyor account creation if not existing
          const username = surveyorName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
          const exists = surveyors.some((s: any) => s.fullName.toUpperCase() === surveyorName || s.username === username)
          if (!exists) {
            newSurveyorsToCreate.add(surveyorName)
          }
        } else if (rawPetugas) {
          unmatchedCount++
        }
      }

      // Auto-create new surveyor accounts in system_users
      newSurveyorsToCreate.forEach(sName => {
        const username = sName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
        updates[`system_users/${username}`] = {
          fullName: sName,
          role: 'petugas',
          password: 'password123',
          uid: null,
          addedAt: new Date().toISOString()
        }
      })

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates)
      }

      logActivity({
        query: `PROSES PEMBAGIAN PETUGAS SURVEY: ${selectedFile.name} (${matchedCount} Data Dipetakan)`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'PEMBAGIAN PETUGAS SURVEY',
        userId: user?.email || user?.uid || 'Admin'
      })

      setExcelSummary({
        totalRows: rows.length - 1,
        matchedActors: matchedCount,
        surveyorCounts,
        unmatchedRows: unmatchedCount
      })
      setShowSummaryDialog(true)

      toast({
        title: "Pembagian Selesai",
        description: `Berhasil memetakan ${matchedCount} data pelaku usaha ke Petugas Survey.`
      })
    } catch (err: any) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Gagal Memproses Excel",
        description: err.message || "Terjadi kesalahan saat memproses data Excel pembagian."
      })
    } finally {
      setIsProcessingExcel(false)
    }
  }

  // Handle Manual Add Surveyor
  const handleAddSurveyor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!database || !newSurveyorName || !newSurveyorPassword) return

    const username = (newSurveyorUsername || newSurveyorName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    try {
      await setDocumentNonBlocking(ref(database, `system_users/${username}`), {
        fullName: newSurveyorName.toUpperCase().trim(),
        role: 'petugas',
        password: newSurveyorPassword,
        uid: null,
        addedAt: new Date().toISOString()
      })

      logActivity({
        query: `TAMBAH PETUGAS SURVEY: ${newSurveyorName} (${username})`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'PEMBAGIAN PETUGAS SURVEY',
        userId: user?.email || user?.uid || 'Admin'
      })

      toast({
        title: "Petugas Ditambahkan",
        description: `Akun Petugas Survey ${newSurveyorName} berhasil dibuat.`
      })

      setNewSurveyorName("")
      setNewSurveyorUsername("")
      setNewSurveyorPassword("")
      setIsAddDialogOpen(false)
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Menambahkan",
        description: err.message || "Terjadi kesalahan saat menambahkan petugas."
      })
    }
  }

  // Handle Edit Password & Surveyor Data
  const handleUpdateSurveyor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!database || !editingSurveyor) return

    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const fullName = (formData.get("fullName") as string || "").toUpperCase().trim()
    const password = formData.get("password") as string

    try {
      await updateDocumentNonBlocking(ref(database, `system_users/${editingSurveyor.id}`), {
        fullName,
        password
      })

      logActivity({
        query: `EDIT PETUGAS SURVEY: ${editingSurveyor.fullName}`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'PEMBAGIAN PETUGAS SURVEY',
        userId: user?.email || user?.uid || 'Admin'
      })

      toast({
        title: "Data Diperbarui",
        description: `Informasi login untuk ${fullName} berhasil diubah.`
      })

      setEditingSurveyor(null)
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Mengubah",
        description: err.message || "Gagal memperbarui data login."
      })
    }
  }

  // Handle Reset Device
  const handleResetDevice = async (surveyor: any) => {
    if (!database) return
    if (confirm(`Reset penguncian perangkat untuk ${surveyor.fullName}? Petugas akan dapat login kembali dari perangkat baru.`)) {
      try {
        await updateDocumentNonBlocking(ref(database, `system_users/${surveyor.id}`), {
          uid: null
        })

        logActivity({
          query: `RESET PERANGKAT PETUGAS: ${surveyor.fullName}`,
          results: "Berhasil",
          device: getDeviceType(navigator.userAgent),
          source: 'Web',
          method: 'PEMBAGIAN PETUGAS SURVEY',
          userId: user?.email || user?.uid || 'Admin'
        })

        toast({
          title: "Perangkat Direset",
          description: `Penguncian perangkat ${surveyor.fullName} telah dihapus.`
        })
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Gagal Reset Perangkat",
          description: err.message || "Gagal mereset perangkat."
        })
      }
    }
  }

  // CORE REQUESTED FEATURE: Delete Surveyor and Unassign connected Business Actors
  const handleExecuteDeleteSurveyor = async () => {
    if (!database || !deletingSurveyor) return

    setIsDeleting(true)
    const surveyor = deletingSurveyor
    const connectedActors = getConnectedActors(surveyor)

    try {
      const updates: Record<string, any> = {}

      // 1. Unassign all connected business actors (set petugasSurvey to empty string / clear it)
      // NOTE: We do NOT delete any actor, preserving 100% of their data!
      connectedActors.forEach(actor => {
        updates[`businessActors/${actor.id}/petugasSurvey`] = ""
      })

      // 2. Remove surveyor from system_users
      updates[`system_users/${surveyor.id}`] = null

      // Apply batch updates
      await update(ref(database), updates)

      logActivity({
        query: `HAPUS PEMBAGIAN PETUGAS SURVEY: ${surveyor.fullName} (${connectedActors.length} Data Dikosongkan)`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'PEMBAGIAN PETUGAS SURVEY',
        userId: user?.email || user?.uid || 'Admin'
      })

      toast({
        title: "Petugas Survey Dihapus",
        description: `Petugas ${surveyor.fullName} berhasil dihapus. ${connectedActors.length} data pelaku usaha telah dikosongkan petugas survey-nya (data UMKM tetap aman).`
      })

      setDeletingSurveyor(null)
    } catch (err: any) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Gagal Menghapus Petugas",
        description: err.message || "Terjadi kesalahan saat menghapus data petugas."
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleReassignSingleActor = (actorId: string, actorName: string, newPetugas: string) => {
    if (!database || !isAdmin) return
    const val = (newPetugas === 'BELUM ADA' || !newPetugas) ? 'BELUM ADA' : newPetugas.toUpperCase().trim()

    updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), {
      petugasSurvey: val
    })

    logActivity({
      query: `REASSIGN PETUGAS: ${actorName} -> ${val}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'PEMBAGIAN PETUGAS SURVEY',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({
      title: "Petugas Berhasil Dialihkan",
      description: val === 'BELUM ADA' ? `${actorName} diubah menjadi BELUM ADA (Hanya Admin yang dapat mengakses).` : `${actorName} dialihkan ke ${val}.`
    })

    if (viewingConnectedSurveyor) {
      setViewingConnectedSurveyor(prev => {
        if (!prev) return null
        return {
          ...prev,
          actors: prev.actors.map(a => a.id === actorId ? { ...a, petugasSurvey: val } : a)
        }
      })
    }
  }

  // Generate PDF Report of Surveyors
  const handleExportPDF = () => {
    if (!surveyors || surveyors.length === 0) {
      toast({
        variant: "destructive",
        title: "Data Kosong",
        description: "Tidak ada data petugas survey untuk dicetak."
      })
      return
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 14

      // Header
      addTunasBangsaHeader(doc, false)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(30, 41, 59)
      doc.text('DAFTAR AKUN LOGIN & PEMBAGIAN PETUGAS SURVEY', pageWidth / 2, 45, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100)
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')} | Total Petugas: ${surveyors.length}`, pageWidth / 2, 50, { align: 'center' })

      const tableData = surveyors.map((s: any, idx: number) => {
        const count = getConnectedActors(s).length
        const status = s.uid ? 'TERKUNCI' : 'SIAP LOGIN'
        return [
          idx + 1,
          s.fullName || '-',
          s.username || '-',
          s.password || '-',
          `${count} Pelaku Usaha`,
          status
        ]
      })

      autoTable(doc, {
        startY: 55,
        head: [['NO', 'NAMA PETUGAS SURVEY', 'USERNAME LOGIN', 'KATA SANDI', 'DATA TERHUBUNG', 'STATUS LOGIN']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: 50
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { fontStyle: 'bold' },
          2: { fontStyle: 'normal', textColor: [225, 29, 72] },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' }
        },
        margin: { left: margin, right: margin }
      })

      doc.save(`Daftar_Petugas_Survey_${new Date().toISOString().split('T')[0]}.pdf`)
      toast({
        title: "PDF Berhasil Diunduh",
        description: "Daftar akun login Petugas Survey telah disimpan."
      })
    } catch (err: any) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Gagal Cetak PDF",
        description: err.message || "Terjadi kesalahan saat membuat dokumen PDF."
      })
    }
  }

  if (!mounted) return null

  if (isAdminLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold text-slate-800">Akses Ditolak</h1>
        <p className="text-muted-foreground max-w-md">
          Hanya Administrator yang memiliki wewenang untuk mengelola pembagian data dan akun Petugas Survey.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-primary uppercase flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-rose-600" /> Pembagian Petugas Survey
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium">
            Distribusi pemetaan data pelaku usaha dan manajemen akun login Petugas Survey (~40 Petugas).
          </p>
        </div>
      </div>

      {/* STEP 1: Upload Excel Pembagian Data Petugas Survey */}
      <Card className="border border-rose-100 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="pb-4 border-b border-rose-50 bg-rose-50/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg md:text-xl font-black text-rose-600">
                Step 1: Upload Excel Pembagian Data Petugas Survey
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 font-medium mt-0.5">
                Mendukung file format <span className="font-bold text-slate-700">.xlsx, .xls, atau .csv</span>. File harus memiliki kolom <span className="font-bold text-rose-600">PETUGAS SURVEY (Kolom R)</span>.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Drag & Drop Dropzone */}
            <div className="lg:col-span-7">
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                onChange={handleFileChange}
              />
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[220px] ${
                  isDragging 
                    ? "border-rose-500 bg-rose-50 scale-[0.99]" 
                    : selectedFile 
                      ? "border-emerald-400 bg-emerald-50/40" 
                      : "border-rose-200 bg-rose-50/20 hover:bg-rose-50/40 hover:border-rose-300"
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-100/80 text-rose-600 flex items-center justify-center mb-3 shadow-inner">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                {selectedFile ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{selectedFile.name}</span>
                      <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px]">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">Klik atau seret file lain untuk mengganti</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-black text-slate-800 text-sm md:text-base">
                      Klik untuk memilih file Excel atau seret ke sini
                    </p>
                    <p className="text-xs text-slate-500">
                      Sistem akan memetakan data pelaku usaha ke masing-masing Petugas Survey
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Mapping Information & Action */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-rose-600" />
                  <h3 className="font-black text-slate-800 text-sm uppercase">Informasi Pemetaan</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Sistem akan memproses pembagian data dan otorisasi:
                </p>

                <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3.5 space-y-2 text-xs font-semibold">
                  <div className="flex items-center gap-2 text-rose-600 font-black">
                    <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>PETUGAS SURVEY (Kolom R)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>KOORDINATOR (Kolom P)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>REG ID / NIK / NAMA LENGKAP</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  *Petugas survey yang login dengan username-nya hanya akan dapat melihat data pelaku usaha yang ditugaskan kepadanya.
                </p>
              </div>

              <Button
                onClick={handleProcessExcel}
                disabled={!selectedFile || isProcessingExcel}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold h-11 shadow-md shadow-rose-200 transition-all active:scale-[0.99]"
              >
                {isProcessingExcel ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses Pemetaan Data...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Proses Pembagian Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STEP 2: Kelola Username & Password Petugas Survey */}
      <div className="space-y-4">
        {/* Navy Header Banner */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h2 className="text-base md:text-lg font-black uppercase tracking-wide">
                STEP 2: KELOLA USERNAME & PASSWORD PETUGAS SURVEY (~{surveyors.length} PETUGAS)
              </h2>
            </div>
            <p className="text-slate-400 text-xs font-normal">
              Daftar akun login Petugas Survey. Admin dapat mengubah username, password, atau mereset perangkat di sini.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari Nama Petugas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 text-xs rounded-xl focus-visible:ring-rose-500"
              />
            </div>

            {/* Print PDF */}
            <Button
              onClick={handleExportPDF}
              className="bg-red-600 hover:bg-red-700 text-white font-bold h-9 text-xs rounded-xl gap-1.5 shadow-sm"
            >
              <FileDown className="w-3.5 h-3.5" /> Cetak PDF
            </Button>

            {/* Add Manual */}
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black h-9 text-xs rounded-xl gap-1.5 shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-950" /> Tambah Petugas Manual
            </Button>
          </div>
        </div>

        {/* Surveyors Table Card */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-0">
            {isUsersLoading || isActorsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
                <p className="text-xs text-slate-500 font-semibold">Memuat data Petugas Survey...</p>
              </div>
            ) : filteredSurveyors.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">Belum Ada Petugas Survey</p>
                <p className="text-xs text-slate-400">
                  {searchQuery ? "Tidak ditemukan petugas dengan kata kunci tersebut." : "Unggah file Excel pembagian di Step 1 atau tambahkan secara manual."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-100">
                    <TableRow>
                      <TableHead className="font-black text-slate-600 text-[10px] uppercase w-12 text-center">NO</TableHead>
                      <TableHead className="font-black text-slate-600 text-[10px] uppercase min-w-[200px]">NAMA PETUGAS SURVEY</TableHead>
                      <TableHead className="font-black text-slate-600 text-[10px] uppercase">USERNAME LOGIN</TableHead>
                      <TableHead className="font-black text-slate-600 text-[10px] uppercase">KATA SANDI (PASSWORD)</TableHead>
                      <TableHead className="font-black text-slate-600 text-[10px] uppercase text-center">DATA TERHUBUNG</TableHead>
                      <TableHead className="font-black text-slate-600 text-[10px] uppercase text-center">STATUS LOGIN</TableHead>
                      <TableHead className="font-black text-slate-600 text-[10px] uppercase text-right pr-6">AKSI PENGATURAN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSurveyors.map((s: any, idx: number) => {
                      const connectedList = getConnectedActors(s)
                      const isLocked = !!s.uid
                      const isPasswordShown = visiblePasswords[s.id]

                      return (
                        <TableRow key={s.id} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100">
                          {/* No */}
                          <TableCell className="text-center font-bold text-slate-500 text-xs">
                            {idx + 1}
                          </TableCell>

                          {/* Nama Petugas */}
                          <TableCell className="font-black text-slate-900 text-xs">
                            {s.fullName}
                          </TableCell>

                          {/* Username */}
                          <TableCell className="font-mono text-xs font-semibold text-rose-600">
                            {s.username}
                          </TableCell>

                          {/* Password */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded-md min-w-[70px] text-center">
                                {isPasswordShown ? s.password : "••••••••"}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(s.id)}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
                                title={isPasswordShown ? "Sembunyikan" : "Tampilkan"}
                              >
                                {isPasswordShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </TableCell>

                          {/* Data Terhubung */}
                          <TableCell className="text-center">
                            <button
                              type="button"
                              onClick={() => setViewingConnectedSurveyor({ surveyor: s, actors: connectedList })}
                              className="group inline-flex items-center gap-1 transition-transform hover:scale-105"
                              title="Klik untuk melihat daftar pelaku usaha"
                            >
                              <Badge className="bg-sky-100 hover:bg-sky-200 text-sky-700 border-none font-bold text-xs px-3 py-1 rounded-full cursor-pointer">
                                {connectedList.length} Pelaku Usaha
                              </Badge>
                            </button>
                          </TableCell>

                          {/* Status Login */}
                          <TableCell className="text-center">
                            {isLocked ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase font-black text-[9px] px-2.5 py-0.5 rounded-full">
                                TERKUNCI DI HP/DEVICE
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-700 border border-amber-200 uppercase font-black text-[9px] px-2.5 py-0.5 rounded-full">
                                SIAP LOGIN
                              </Badge>
                            )}
                          </TableCell>

                          {/* Aksi Pengaturan */}
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Password */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingSurveyor(s)}
                                className="h-7 text-[10px] font-bold border-rose-200 text-rose-600 hover:bg-rose-50 px-2.5 rounded-lg"
                              >
                                <Key className="w-3 h-3 mr-1" /> Edit Password
                              </Button>

                              {/* Reset Device / Belum Login */}
                              {isLocked ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResetDevice(s)}
                                  className="h-7 text-[10px] font-bold border-amber-200 text-amber-600 hover:bg-amber-50 px-2.5 rounded-lg"
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" /> Reset Device
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled
                                  className="h-7 text-[10px] font-bold border-slate-200 text-slate-400 bg-slate-50/50 px-2.5 rounded-lg cursor-not-allowed"
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" /> Belum Login
                                </Button>
                              )}

                              {/* HAPUS BUTTON (Feature requested) */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingSurveyor(s)}
                                className="h-7 text-[10px] font-bold border-red-200 text-red-600 hover:bg-red-50 px-2.5 rounded-lg"
                                title="Hapus Petugas Survey dan kosongkan pembagian data"
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> Hapus
                              </Button>
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
      </div>

      {/* DIALOG: Detail Data Terhubung */}
      <Dialog open={!!viewingConnectedSurveyor} onOpenChange={() => setViewingConnectedSurveyor(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-primary font-black uppercase flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-600" />
              Data Pelaku Usaha Terhubung ({viewingConnectedSurveyor?.actors.length || 0} Data)
            </DialogTitle>
            <DialogDescription>
              Daftar pelaku usaha yang ditugaskan kepada petugas survey <span className="font-bold text-slate-800">{viewingConnectedSurveyor?.surveyor?.fullName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 my-2 border rounded-xl">
            {viewingConnectedSurveyor?.actors && viewingConnectedSurveyor.actors.length > 0 ? (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase w-10">No</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Nama Pelaku Usaha</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">NIK / KK</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Nama Usaha</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Kelurahan / Kecamatan</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-center">Status</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-center">Petugas Survey (Ganti)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingConnectedSurveyor.actors.map((actor, idx) => (
                    <TableRow key={actor.id}>
                      <TableCell className="text-xs font-bold text-slate-500">{idx + 1}</TableCell>
                      <TableCell className="text-xs font-black text-slate-900">{actor.fullName}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-600">
                        <div>{actor.nik || '-'}</div>
                        <div className="text-[10px] text-muted-foreground">{actor.noKK || ''}</div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">{actor.businessName || '-'}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {actor.kelurahan || '-'}, {actor.kecamatan || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[9px] font-bold uppercase">
                          {actor.status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <select
                          value={actor.petugasSurvey && actor.petugasSurvey.trim() !== '' && actor.petugasSurvey.trim() !== '-' ? actor.petugasSurvey.toUpperCase().trim() : "BELUM ADA"}
                          onChange={(e) => handleReassignSingleActor(actor.id, actor.fullName, e.target.value)}
                          className="text-[11px] font-bold h-7 rounded border border-slate-300 dark:border-slate-700 bg-background px-2 py-0.5 shadow-sm text-primary cursor-pointer hover:border-primary transition-all w-[180px]"
                        >
                          <option value="BELUM ADA" className="text-rose-600 font-bold">🔴 BELUM ADA (Hanya Admin)</option>
                          {surveyors.map((s: any) => (
                            <option key={s.id} value={s.fullName.toUpperCase().trim()}>
                              🟢 {s.fullName.toUpperCase().trim()}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                Belum ada data pelaku usaha yang ditugaskan ke petugas ini.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingConnectedSurveyor(null)} className="font-bold">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Tambah Petugas Survey Manual */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddSurveyor}>
            <DialogHeader>
              <DialogTitle className="text-primary font-black uppercase flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                Tambah Petugas Survey Manual
              </DialogTitle>
              <DialogDescription>
                Daftarkan akun login untuk Petugas Survey baru.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-xs">Nama Lengkap Petugas</Label>
                <Input
                  placeholder="Contoh: AIDA SUFIA"
                  value={newSurveyorName}
                  onChange={(e) => {
                    setNewSurveyorName(e.target.value)
                    setNewSurveyorUsername(
                      e.target.value
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]/g, '_')
                        .replace(/_+/g, '_')
                    )
                  }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs">Username Login</Label>
                <Input
                  placeholder="Contoh: aida_sufia"
                  value={newSurveyorUsername}
                  onChange={(e) => setNewSurveyorUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs">Kata Sandi (Password)</Label>
                <Input
                  type="text"
                  placeholder="Contoh: 12345678"
                  value={newSurveyorPassword}
                  onChange={(e) => setNewSurveyorPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black">
                Simpan Petugas
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Edit Password / Nama Petugas */}
      <Dialog open={!!editingSurveyor} onOpenChange={() => setEditingSurveyor(null)}>
        <DialogContent className="max-w-md">
          {editingSurveyor && (
            <form onSubmit={handleUpdateSurveyor}>
              <DialogHeader>
                <DialogTitle className="text-primary font-black uppercase flex items-center gap-2">
                  <Key className="w-5 h-5 text-rose-600" />
                  Edit Password & Akun Petugas
                </DialogTitle>
                <DialogDescription>
                  Ubah kata sandi atau nama untuk akun <span className="font-mono text-rose-600 font-bold">{editingSurveyor.username}</span>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Nama Petugas Survey</Label>
                  <Input
                    name="fullName"
                    defaultValue={editingSurveyor.fullName}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs">Kata Sandi (Password Baru)</Label>
                  <Input
                    name="password"
                    defaultValue={editingSurveyor.password}
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingSurveyor(null)}>
                  Batal
                </Button>
                <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG: Hapus Petugas Survey (Feature Requested by User) */}
      <AlertDialog open={!!deletingSurveyor} onOpenChange={() => setDeletingSurveyor(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2 mx-auto sm:mx-0">
              <Trash2 className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-slate-900 font-black text-lg">
              Hapus Petugas Survey & Pembagian Data?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 text-xs space-y-3 pt-2">
              <div>
                Apakah Anda yakin ingin menghapus petugas survey <span className="font-black text-slate-900">{deletingSurveyor?.fullName}</span> (<span className="font-mono text-rose-600">{deletingSurveyor?.username}</span>)?
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5 text-amber-800">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Konsekuensi Penghapusan:
                </div>
                <ul className="list-disc list-inside text-[11px] space-y-1 font-medium">
                  <li>
                    Akun login petugas survey ini akan <strong>dihapus</strong>.
                  </li>
                  <li>
                    Sebanyak <strong className="text-red-700">{deletingSurveyor ? getConnectedActors(deletingSurveyor).length : 0} Data Pelaku Usaha</strong> yang terhubung akan <strong>dikosongkan status petugas survey-nya</strong> (menjadi Belum Ada Petugas Survey).
                  </li>
                  <li className="text-emerald-800 font-bold">
                    Data Pelaku Usaha (nama, NIK, KK, alamat, usaha, dll) <u>TIDAK AKAN DIHAPUS</u> dan tetap tersimpan aman di database.
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteDeleteSurveyor}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isDeleting ? (
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
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG: Ringkasan Hasil Upload Excel */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary font-black uppercase flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Hasil Pemetaan Petugas Survey
            </DialogTitle>
            <DialogDescription>
              Ringkasan pemrosesan file Excel pembagian data.
            </DialogDescription>
          </DialogHeader>

          {excelSummary && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border rounded-xl p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Baris Excel</p>
                  <p className="text-lg font-black text-slate-800">{excelSummary.totalRows}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase">Data Berhasil Dipetakan</p>
                  <p className="text-lg font-black text-emerald-700">{excelSummary.matchedActors}</p>
                </div>
              </div>

              {excelSummary.unmatchedRows > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{excelSummary.unmatchedRows} baris data</span> tidak cocok dengan database pelaku usaha yang ada di sistem.
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-slate-700 uppercase mb-2">Sebaran Data Per Petugas:</p>
                <div className="max-h-48 overflow-y-auto border rounded-xl divide-y">
                  {Object.entries(excelSummary.surveyorCounts).map(([name, count]) => (
                    <div key={name} className="flex justify-between items-center px-3 py-2 text-xs">
                      <span className="font-bold text-slate-800">{name}</span>
                      <Badge className="bg-rose-100 text-rose-700 border-none font-bold">
                        {count} Pelaku Usaha
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowSummaryDialog(false)} className="w-full font-bold">
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
