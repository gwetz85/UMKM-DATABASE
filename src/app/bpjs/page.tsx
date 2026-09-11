"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useDatabase, useList, useMemoFirebase, useUser } from "@/firebase"
import { ref, update } from "firebase/database"
import { addTunasBangsaHeader } from "@/lib/pdf-generator"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Printer, 
  FileSpreadsheet, 
  Search, 
  ShieldCheck, 
  Loader2, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Database, 
  Download, 
  X, 
  Check, 
  Info,
  Layers
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { BusinessActor } from "../lib/types"
import { cn, parsePobDob } from "@/lib/utils"

// Normalization Helpers
const normalizeNik = (nik: string): string => String(nik || "").replace(/\D/g, "").replace(/^0+/, "")
const normalizeName = (name: string): string =>
  String(name || "").toUpperCase().replace(/[^A-Z0-9\s]/g, "").replace(/\s+/g, " ").trim()

const fuzzyNameMatch = (a: string, b: string): boolean => {
  const wa = normalizeName(a).split(" ").filter(Boolean)
  const wb = normalizeName(b).split(" ").filter(Boolean)
  if (wa.length === 0 || wb.length === 0) return false
  const shorter = wa.length <= wb.length ? wa : wb
  const longer  = wa.length <= wb.length ? wb : wa
  return shorter.every(word => longer.includes(word))
}

const cleanNik = (val: any): string => {
  if (val === null || val === undefined) return ""
  let str = String(val).trim()
  if (str.startsWith("'")) str = str.slice(1).trim()
  if (str.includes("e+") || str.includes("E+")) {
    const num = Number(str)
    if (!isNaN(num)) {
      str = BigInt(Math.round(num)).toString()
    }
  }
  return str.replace(/\D/g, "")
}

const cleanKey = (k: string) => k.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()

const getColValue = (row: any, candidates: string[], colIndexFallback?: number): string => {
  if (!row) return ""

  // If row is an array
  if (Array.isArray(row)) {
    if (colIndexFallback !== undefined && row[colIndexFallback] !== undefined && row[colIndexFallback] !== null) {
      return String(row[colIndexFallback]).trim()
    }
    return ""
  }

  // If row is an object
  const keys = Object.keys(row)
  for (const c of candidates) {
    const foundKey = keys.find(k => k.trim().toUpperCase() === c.toUpperCase())
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== "") {
      return String(row[foundKey]).trim()
    }
  }
  for (const c of candidates) {
    const cClean = cleanKey(c)
    const foundKey = keys.find(k => cleanKey(k) === cClean)
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== "") {
      return String(row[foundKey]).trim()
    }
  }
  for (const c of candidates) {
    const foundKey = keys.find(k => k.trim().toUpperCase().includes(c.toUpperCase()))
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== "") {
      return String(row[foundKey]).trim()
    }
  }

  if (colIndexFallback !== undefined && keys.length > colIndexFallback) {
    const keyAtIdx = keys[colIndexFallback]
    if (row[keyAtIdx] !== undefined && row[keyAtIdx] !== null) {
      return String(row[keyAtIdx]).trim()
    }
  }

  return ""
}

export interface BpjsMatchInfo {
  excelRow: number
  excelNik: string
  excelName: string
  excelStatus: string
  excelKpj?: string
  matchMethod: "nik_and_name" | "nik_exact" | "nik_normalized" | "name_exact" | "name_fuzzy"
  isNikMatched: boolean
  isNameMatched: boolean
}

export interface UnmatchedExcelRow {
  rowNum: number
  nik: string
  name: string
  status: string
  kpj?: string
  reason: string
}

// Reference date for age calculations (1 Sep 2026)
const referenceDate = new Date(2026, 8, 1);

const calculateAge = (dobString: string) => {
  if (!dobString || dobString === "-") return 0;
  
  // Ambil bagian tanggalnya saja (setelah koma jika ada)
  const datePart = dobString.includes(',') ? dobString.split(',').pop()?.trim() : dobString.trim();
  if (!datePart) return 0;
  
  const monthsIndo: { [key: string]: number } = {
    'JANUARI': 0, 'FEBRUARI': 1, 'MARET': 2, 'APRIL': 3, 'MEI': 4, 'JUNI': 5,
    'JULI': 6, 'AGUSTUS': 7, 'SEPTEMBER': 8, 'OKTOBER': 9, 'NOVEMBER': 10, 'DESEMBER': 11
  };

  let day, month, year;

  // Cek jika formatnya DD-MM-YYYY (angka)
  if (datePart.includes('-')) {
    const parts = datePart.split('-').map(Number);
    day = parts[0];
    month = parts[1] - 1;
    year = parts[2];
  } else {
    // Format DD NamaBulan YYYY
    const parts = datePart.split(' ');
    if (parts.length < 3) return 0;
    
    day = parseInt(parts[0]);
    const monthName = parts[1].toUpperCase();
    month = monthsIndo[monthName];
    year = parseInt(parts[2]);
  }

  if (isNaN(day) || month === undefined || isNaN(year)) return 0;

  const birthDate = new Date(year, month, day);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export default function BpjsPage() {
  const { user } = useUser()
  const database = useDatabase()
  const { toast } = useToast()

  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [pageLimit, setPageLimit] = useState(50)

  // Upload & Comparison State
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessingExcel, setIsProcessingExcel] = useState(false)
  const [isSavingToDb, setIsSavingToDb] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState("")
  const [matchedActorsMap, setMatchedActorsMap] = useState<Map<string, BpjsMatchInfo>>(new Map())
  const [unmatchedRows, setUnmatchedRows] = useState<UnmatchedExcelRow[]>([])
  const [comparisonStats, setComparisonStats] = useState<{
    totalRows: number
    matchedCount: number
    unmatchedCount: number
  } | null>(null)

  // Tab State: 'all' | 'matched' | 'unmatched_excel' | 'db_verified'
  const [activeTab, setActiveTab] = useState<"all" | "matched" | "unmatched_excel" | "db_verified">("all")

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 250)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPageLimit(50)
  }, [searchQuery, activeTab])

  const actorsRef = useMemoFirebase(() => database ? ref(database, 'businessActors') : null, [database])
  const { data: allActors, isLoading } = useList<BusinessActor>(actorsRef)

  // Calculate age as of a reference date (e.g., 1 Sep 2026)
  const calculateAgeOn = (dobString: string, refDate: Date): number => {
    if (!dobString || dobString === "-") return 0;

    const monthsIndo: { [key: string]: number } = {
      'JANUARI': 0, 'FEBRUARI': 1, 'MARET': 2, 'APRIL': 3, 'MEI': 4, 'JUNI': 5,
      'JULI': 6, 'AGUSTUS': 7, 'SEPTEMBER': 8, 'OKTOBER': 9, 'NOVEMBER': 10, 'DESEMBER': 11
    };

    let day: number, month: number, year: number;
    const datePart = dobString.includes(',') ? dobString.split(',').pop()?.trim() : dobString.trim();
    if (!datePart) return 0;

    if (datePart.includes('-')) {
      const parts = datePart.split('-').map(Number);
      day = parts[0];
      month = parts[1] - 1;
      year = parts[2];
    } else {
      const parts = datePart.split(' ');
      if (parts.length < 3) return 0;
      day = parseInt(parts[0]);
      month = monthsIndo[parts[1].toUpperCase()];
      year = parseInt(parts[2]);
    }
    if (isNaN(day) || month === undefined || isNaN(year)) return 0;

    const birthDate = new Date(year, month, day);
    let age = refDate.getFullYear() - birthDate.getFullYear();
    const m = refDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && refDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Base eligible actors (< 65 years on 1 Sep 2026)
  const refDate = useMemo(() => new Date(2026, 8, 1), [])

  const baseEligibleActors = useMemo(() => {
    if (!allActors) return []
    return allActors.filter(a => {
      if (!a || !a.fullName) return false
      const age = calculateAgeOn(a.pobDob || "", refDate)
      return age > 0 && age < 65
    })
  }, [allActors, refDate])

  // Process and filter actors depending on activeTab and search query
  const filteredActors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    let list: BusinessActor[] = []

    if (activeTab === "matched") {
      // In matched tab, show all actors matched with Excel BPJS
      list = (allActors || []).filter(a => matchedActorsMap.has(a.id))
    } else if (activeTab === "db_verified") {
      list = (allActors || []).filter(a => {
        const actorAny = a as any
        return (
          actorAny.bpjsSubmissionStatus === 'accepted' || 
          actorAny.bpjsCheckStatus === 'sesuai'
        )
      })
    } else {
      list = baseEligibleActors || []
    }

    if (q) {
      list = list.filter(a =>
        (a.fullName || "").toLowerCase().includes(q) ||
        (a.nik || "").includes(q) ||
        (a.coordinator || "").toLowerCase().includes(q) ||
        (a.kelurahan || "").toLowerCase().includes(q)
      )
    }

    return [...list].sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
  }, [allActors, baseEligibleActors, activeTab, matchedActorsMap, searchQuery])

  // Count verified in database
  const dbVerifiedCount = useMemo(() => {
    if (!baseEligibleActors) return 0
    return baseEligibleActors.filter(a => {
      const actorAny = a as any
      return actorAny.bpjsSubmissionStatus === 'accepted' || actorAny.bpjsCheckStatus === 'sesuai'
    }).length
  }, [baseEligibleActors])

  // Filtered unmatched rows for the unmatched tab
  const filteredUnmatchedRows = useMemo(() => {
    if (!unmatchedRows) return []
    const q = searchQuery.toLowerCase().trim()
    if (!q) return unmatchedRows
    return unmatchedRows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.nik.includes(q) ||
      r.status.toLowerCase().includes(q)
    )
  }, [unmatchedRows, searchQuery])

  // Handle Excel file processing & comparison (Matching NIK in Column D / Nomor Identitas*)
  const processExcelBuffer = async (file: File) => {
    setIsProcessingExcel(true)
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array" })
      const firstSheetName = wb.SheetNames[0]
      const ws = wb.Sheets[firstSheetName]

      // Read both as 2D row array and objects with raw: false to retain clean 16-digit strings
      const rows2d: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false })

      if (!rows2d || rows2d.length <= 1) {
        throw new Error("File Excel kosong atau tidak memiliki baris data.")
      }

      // Check header row (row 0)
      const headerRow = (rows2d[0] || []).map((h: any) => String(h || "").trim().toUpperCase())

      // 1. Column D (Index 3) for NIK (Nomor Identitas*)
      let colNikIdx = headerRow.findIndex((h: string) =>
        h.includes("NOMOR IDENTITAS") ||
        h.includes("NO IDENTITAS") ||
        h.includes("IDENTITAS") ||
        h === "NIK" ||
        h.includes("NIK") ||
        h.includes("KTP")
      )
      // Fallback to Column D (index 3) as specified
      if (colNikIdx === -1 && rows2d[0] && rows2d[0].length > 3) {
        colNikIdx = 3 // Kolom D
      } else if (colNikIdx === -1) {
        colNikIdx = 3
      }

      // 2. Column E (Index 4) for Nama Lengkap
      let colNamaIdx = headerRow.findIndex((h: string) =>
        h.includes("NAMA LENGKAP") ||
        h === "NAMA" ||
        h.includes("NAMA") ||
        h.includes("PESERTA")
      )
      if (colNamaIdx === -1 && rows2d[0] && rows2d[0].length > 4) {
        colNamaIdx = 4 // Kolom E
      }

      // 3. Column C (Index 2) for Keterangan Status (e.g. BISA DAFTAR)
      let colStatusKetIdx = headerRow.findIndex((h: string) =>
        h.includes("KETERANGAN STATUS") ||
        h.includes("KETERANGAN") ||
        h.includes("HASIL") ||
        h.includes("CATATAN")
      )
      if (colStatusKetIdx === -1 && rows2d[0] && rows2d[0].length > 2) {
        colStatusKetIdx = 2 // Kolom C
      }

      // 4. Column B (Index 1) for Status (e.g. Y)
      let colStatusIdx = headerRow.findIndex((h: string) =>
        h === "STATUS" || h.includes("STATUS")
      )
      if (colStatusIdx === -1 && rows2d[0] && rows2d[0].length > 1) {
        colStatusIdx = 1 // Kolom B
      }

      // 5. Column for KPJ / No Kartu if present
      let colKpjIdx = headerRow.findIndex((h: string) =>
        h.includes("KPJ") || h.includes("KARTU")
      )

      // Build database actor lookup maps (Nomor Identitas = NIK)
      const actors = allActors || []
      const actorByNikExact = new Map<string, BusinessActor>()
      const actorByNikClean = new Map<string, BusinessActor>()
      const actorByNameExact = new Map<string, BusinessActor>()

      actors.forEach(a => {
        const aNik = String(a.nik || (a as any).nomorIdentitas || (a as any).noKtp || "").trim()
        const aName = String(a.fullName || (a as any).nama || "").trim()

        if (aNik) {
          actorByNikExact.set(aNik, a)
          const norm = cleanNik(aNik)
          if (norm.length >= 8) {
            actorByNikClean.set(norm, a)
          }
        }
        if (aName) {
          actorByNameExact.set(normalizeName(aName), a)
        }
      })

      const matchedMap = new Map<string, BpjsMatchInfo>()
      const unmatchedList: UnmatchedExcelRow[] = []

      // Process each row starting from row index 1 (skipping header)
      for (let r = 1; r < rows2d.length; r++) {
        const rowArr = rows2d[r]
        if (!rowArr || rowArr.length === 0) continue

        // Extract values from detected columns (specifically Column D for NIK, Column E for Nama)
        const rawNikColD = colNikIdx >= 0 && rowArr[colNikIdx] !== undefined ? String(rowArr[colNikIdx]).trim() : ""
        const rawNama = colNamaIdx >= 0 && rowArr[colNamaIdx] !== undefined ? String(rowArr[colNamaIdx]).trim() : ""
        const rawKet = colStatusKetIdx >= 0 && rowArr[colStatusKetIdx] !== undefined ? String(rowArr[colStatusKetIdx]).trim() : ""
        const rawStatusB = colStatusIdx >= 0 && rowArr[colStatusIdx] !== undefined ? String(rowArr[colStatusIdx]).trim() : ""
        const rawKpj = colKpjIdx >= 0 && rowArr[colKpjIdx] !== undefined ? String(rowArr[colKpjIdx]).trim() : ""

        if (!rawNikColD && !rawNama) continue

        const cleanedNik = cleanNik(rawNikColD)
        const normNama = normalizeName(rawNama)

        let matchedActor: BusinessActor | undefined = undefined
        let matchMethod: "nik_and_name" | "nik_exact" | "nik_normalized" | "name_exact" | "name_fuzzy" = "nik_exact"
        let isNikMatched = false
        let isNameMatched = false

        // 1. Cek NIK di database (Nomor Identitas = NIK)
        let foundByNik: BusinessActor | undefined = undefined
        if (rawNikColD && actorByNikExact.has(rawNikColD)) {
          foundByNik = actorByNikExact.get(rawNikColD)
        } else if (cleanedNik && cleanedNik.length >= 8 && actorByNikClean.has(cleanedNik)) {
          foundByNik = actorByNikClean.get(cleanedNik)
        }

        // 2. Cek Nama Pelaku Usaha di database
        let foundByName: BusinessActor | undefined = undefined
        if (normNama && actorByNameExact.has(normNama)) {
          foundByName = actorByNameExact.get(normNama)
        } else if (rawNama) {
          foundByName = actors.find(a => {
            const aName = String(a.fullName || (a as any).nama || "")
            return fuzzyNameMatch(aName, rawNama)
          })
        }

        // 3. Gabungkan hasil pengecekan NIK dan Nama
        if (foundByNik) {
          matchedActor = foundByNik
          isNikMatched = true

          const aName = String(foundByNik.fullName || (foundByNik as any).nama || "")
          if (rawNama && (normalizeName(aName) === normNama || fuzzyNameMatch(aName, rawNama))) {
            isNameMatched = true
            matchMethod = "nik_and_name" // Cocok NIK & Nama!
          } else {
            matchMethod = rawNikColD && actorByNikExact.has(rawNikColD) ? "nik_exact" : "nik_normalized"
          }
        } else if (foundByName) {
          matchedActor = foundByName
          isNameMatched = true
          isNikMatched = false
          matchMethod = normNama && actorByNameExact.has(normNama) ? "name_exact" : "name_fuzzy"
        }

        const displayStatus = rawKet || (rawStatusB === "Y" ? "Bisa Daftar" : rawStatusB) || "Sesuai Pengecekan BPJS"

        if (matchedActor) {
          matchedMap.set(matchedActor.id, {
            excelRow: r + 1,
            excelNik: rawNikColD || matchedActor.nik || "-",
            excelName: rawNama || matchedActor.fullName,
            excelStatus: displayStatus,
            excelKpj: rawKpj || undefined,
            matchMethod,
            isNikMatched,
            isNameMatched
          })
        } else {
          unmatchedList.push({
            rowNum: r + 1,
            nik: rawNikColD || "-",
            name: rawNama || "Tanpa Nama",
            status: displayStatus,
            kpj: rawKpj || undefined,
            reason: rawNikColD && rawNama 
              ? "NIK (Nomor Identitas) dan Nama tidak ditemukan di database pelaku usaha" 
              : (rawNikColD ? "NIK (Nomor Identitas) tidak ditemukan di database" : "Nama tidak ditemukan di database")
          })
        }
      }

      setUploadedFileName(file.name)
      setMatchedActorsMap(matchedMap)
      setUnmatchedRows(unmatchedList)
      setComparisonStats({
        totalRows: rows2d.length - 1,
        matchedCount: matchedMap.size,
        unmatchedCount: unmatchedList.length
      })

      toast({
        title: "Perbandingan NIK (Kolom D) Berhasil!",
        description: `Ditemukan ${matchedMap.size} data pelaku usaha yang sesuai dengan NIK Kolom D dari total ${rows2d.length - 1} baris.`
      })

      // Otomatis aktifkan tab matched
      setActiveTab("matched")
    } catch (err: any) {
      console.error("Gagal memproses file Excel:", err)
      toast({
        variant: "destructive",
        title: "Gagal Memproses Excel",
        description: err.message || "Pastikan format file Excel valid (.xlsx, .xls, atau .csv)."
      })
    } finally {
      setIsProcessingExcel(false)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        processExcelBuffer(file)
      } else {
        toast({
          variant: "destructive",
          title: "Format Tidak Sesuai",
          description: "Harap unggah file berformat .xlsx, .xls, atau .csv."
        })
      }
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processExcelBuffer(file)
    }
  }

  // Action handlers for accept / reject
  const handleAccept = async (actorId: string) => {
    if (!database) return;
    const actorRef = ref(database, `businessActors/${actorId}`);
    await update(actorRef, { 
      bpjsSubmissionStatus: 'accepted',
      bpjsCheckStatus: 'sesuai'
    });
    toast({
      title: "Data Disetujui",
      description: "Status pelaku usaha diubah menjadi Diterima BPJS."
    })
  };

  const handleReject = async (actorId: string) => {
    if (!database) return;
    const actorRef = ref(database, `businessActors/${actorId}`);
    await update(actorRef, { 
      bpjsSubmissionStatus: 'rejected',
      bpjsCheckStatus: 'ditolak'
    });
    toast({
      variant: "destructive",
      title: "Data Ditolak",
      description: "Status pelaku usaha diubah menjadi Ditolak BPJS."
    })
  };

  // Batch Save Matched to Firebase Realtime Database
  const handleSaveMatchedToDatabase = async () => {
    if (!database || matchedActorsMap.size === 0) return
    setIsSavingToDb(true)
    try {
      const updates: Record<string, any> = {}
      const now = new Date().toISOString()

      matchedActorsMap.forEach((info, actorId) => {
        updates[`businessActors/${actorId}/bpjsSubmissionStatus`] = 'accepted'
        updates[`businessActors/${actorId}/bpjsCheckStatus`] = 'sesuai'
        updates[`businessActors/${actorId}/bpjsCheckNote`] = info.excelStatus || 'Sesuai Hasil Pengecekan BPJS'
        updates[`businessActors/${actorId}/bpjsCheckedAt`] = now
        updates[`businessActors/${actorId}/bpjsSourceFile`] = uploadedFileName
        if (info.excelKpj) {
          updates[`businessActors/${actorId}/bpjsKpj`] = info.excelKpj
        }
      })

      await update(ref(database), updates)
      toast({
        title: "Pembaruan Berhasil!",
        description: `${matchedActorsMap.size} data pelaku usaha berhasil disimpan ke database dengan status Sesuai BPJS.`
      })
      setIsUploadOpen(false)
    } catch (err: any) {
      console.error("Gagal menyimpan ke database:", err)
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan Data",
        description: err.message || "Terjadi kesalahan saat memperbarui database."
      })
    } finally {
      setIsSavingToDb(false)
    }
  }

  // Export to Excel (Respects activeTab)
  const handleExportExcel = () => {
    if (activeTab === "unmatched_excel") {
      if (unmatchedRows.length === 0) return
      const exportData = unmatchedRows.map((r, i) => ({
        "NO": i + 1,
        "BARIS EXCEL ASAL": r.rowNum,
        "NIK": r.nik,
        "NAMA LENGKAP": r.name,
        "STATUS/KETERANGAN BPJS": r.status,
        "NO KPJ": r.kpj || "-",
        "KETERANGAN MASALAH": r.reason
      }))
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Data Tidak Cocok")
      XLSX.writeFile(wb, `BPJS_Data_Tidak_Cocok_${new Date().toISOString().split("T")[0]}.xlsx`)
      return
    }

    const eligibleActors = filteredActors.filter(a => calculateAgeOn(a.pobDob || "", refDate) < 65)
    if (eligibleActors.length === 0) {
      toast({
        variant: "destructive",
        title: "Tidak Ada Data",
        description: "Tidak ada data untuk diekspor pada filter ini."
      })
      return
    }

    const exportData = eligibleActors.map((actor, idx) => {
      const age = calculateAgeOn(actor.pobDob || "", refDate)
      const parsed = parsePobDob(actor.pobDob || "")
      const matchInfo = matchedActorsMap.get(actor.id)
      const actorAny = actor as any

      return {
        "NO": idx + 1,
        "NAMA LENGKAP": (actor.fullName || "").toUpperCase(),
        "NIK": actor.nik || "-",
        "NOMOR KK": actor.noKK || "-",
        "TEMPAT LAHIR": (actor.pob || parsed.pob || "-").toUpperCase(),
        "TANGGAL LAHIR": actor.dob || parsed.dob || "-",
        "USIA": age,
        "NOMOR PONSEL": actor.phone || "-",
        "ALAMAT": (actor.address || "").toUpperCase(),
        "RT/RW": actor.rtRw || "-",
        "KELURAHAN": (actor.kelurahan || "").toUpperCase(),
        "KOORDINATOR": (actor.coordinator || "").toUpperCase(),
        "STATUS CEK BPJS": matchInfo ? "SESUAI BPJS (EXCEL)" : (actorAny.bpjsCheckStatus === 'sesuai' ? "TERVERIFIKASI DATABASE" : (age < 65 ? "Bisa Didaftarkan" : "Tidak Bisa Didaftarkan")),
        "CATATAN / KET BPJS": matchInfo?.excelStatus || actorAny.bpjsCheckNote || "-",
        "NO KPJ": matchInfo?.excelKpj || actorAny.bpjsKpj || "-"
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    const sheetName = activeTab === "matched" ? "Data Sesuai BPJS" : "Data BPJS"
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    const wscols = [
      { wch: 6 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 8 },
      { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 15 }
    ]
    worksheet['!cols'] = wscols

    const filename = activeTab === "matched" 
      ? `Hasil_Cocok_BPJS_${new Date().toISOString().split('T')[0]}.xlsx`
      : `Data_BPJS_Ketenagakerjaan_${new Date().toISOString().split('T')[0]}.xlsx`

    XLSX.writeFile(workbook, filename)
  }

  // Print PDF using reference date (1 Sep 2026)
  const handlePrintPDF = () => {
    const eligibleActors = filteredActors.filter(a => calculateAgeOn(a.pobDob || "", refDate) < 65)
    if (eligibleActors.length === 0) return

    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()

    addTunasBangsaHeader(doc)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0)
    const titleText = activeTab === "matched" ? "DATA SESUAI HASIL PENGECEKAN BPJS" : "DATA BPJS KETENAGAKERJAAN"
    doc.text(titleText, pageWidth - 14, 17, { align: 'right' })
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, pageWidth - 14, 21, { align: 'right' })
    doc.setTextColor(0)

    const tableData = eligibleActors.map((actor, index) => {
      const age = calculateAgeOn(actor.pobDob || "", refDate)
      const matchInfo = matchedActorsMap.get(actor.id)
      const note = matchInfo ? `Sesuai BPJS (${matchInfo.excelStatus})` : "Bisa Didaftarkan"
      return [
        index + 1,
        (actor.fullName || "").toUpperCase(),
        (actor.nik || "-"),
        age,
        (actor.coordinator || "-").toUpperCase(),
        note
      ]
    })

    autoTable(doc, {
      startY: 30,
      head: [['NO', 'NAMA LENGKAP', 'NIK', 'USIA', 'KOORDINATOR', 'KETERANGAN']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 117, 188], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 32, halign: 'center' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 35, halign: 'center' },
        5: { cellWidth: 48, halign: 'center' }
      }
    })

    doc.save(`Laporan_BPJS_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Clear upload results and reset to default
  const handleResetUpload = () => {
    setUploadedFileName("")
    setMatchedActorsMap(new Map())
    setUnmatchedRows([])
    setComparisonStats(null)
    setActiveTab("all")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    toast({
      title: "Filter Direset",
      description: "Menampilkan kembali semua data pelaku usaha layak BPJS."
    })
  }

  return (
    <div className="p-4 md:p-8 max-w-[92rem] mx-auto space-y-6">
      {/* Hidden File Input for dialog */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-emerald-600" /> BPJS Ketenagakerjaan
            </h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Monitoring kelayakan dan komparasi hasil pengecekan BPJS Ketenagakerjaan dengan data pelaku usaha.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari Nama atau NIK..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-10 border-primary/20 bg-white text-xs md:text-sm shadow-sm"
            />
          </div>

          {/* Upload BPJS Excel Button */}
          <Button 
            onClick={() => setIsUploadOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md h-10 flex-1 sm:flex-none transition-all"
          >
            <UploadCloud className="w-4 h-4 mr-2" /> UPLOAD HASIL BPJS
          </Button>

          {/* Export Excel */}
          <Button 
            onClick={handleExportExcel} 
            variant="outline"
            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold shadow-sm h-10 flex-1 sm:flex-none"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> EXPORT EXCEL
          </Button>

          {/* Print PDF */}
          <Button 
            onClick={handlePrintPDF} 
            className="bg-primary hover:bg-primary/90 font-bold shadow-md h-10 flex-1 sm:flex-none"
          >
            <Printer className="w-4 h-4 mr-2" /> PRINT DATA
          </Button>
        </div>
      </div>

      {/* Uploaded Comparison Active Banner */}
      {comparisonStats && uploadedFileName && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-emerald-800 tracking-wider">Hasil Pengecekan Terhubung:</span>
                <span className="text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  {uploadedFileName}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Ditemukan <strong className="text-emerald-700 font-black">{comparisonStats.matchedCount} data cocok/sesuai</strong> dari total {comparisonStats.totalRows} baris di Excel BPJS.
                {comparisonStats.unmatchedCount > 0 && (
                  <span className="text-amber-700 ml-1 font-semibold">
                    ({comparisonStats.unmatchedCount} baris tidak ditemukan di database)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button
              size="sm"
              onClick={handleSaveMatchedToDatabase}
              disabled={isSavingToDb || matchedActorsMap.size === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm h-9"
            >
              {isSavingToDb ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 mr-1.5" /> Simpan ke Database
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsUploadOpen(true)}
              className="font-bold text-xs h-9 bg-white"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Ganti File
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetUpload}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs h-9"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Reset Filter
            </Button>
          </div>
        </div>
      )}

      {/* Tabs Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-2">
        <Tabs 
          value={activeTab} 
          onValueChange={(v: any) => setActiveTab(v)}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-slate-100/90 p-1 rounded-xl h-auto flex flex-wrap gap-1">
            <TabsTrigger 
              value="all" 
              className="text-xs font-bold px-3 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5" /> Semua Layak (&lt;65 Thn)
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 bg-slate-200 text-slate-700 font-bold">
                {baseEligibleActors.length}
              </Badge>
            </TabsTrigger>

            {/* Matched from Excel Tab */}
            {matchedActorsMap.size > 0 && (
              <TabsTrigger 
                value="matched" 
                className="text-xs font-bold px-3 py-2 rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-emerald-800"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Hasil Cek Excel BPJS (Sesuai)
                <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-white/90 text-emerald-800 font-black">
                  {matchedActorsMap.size}
                </Badge>
              </TabsTrigger>
            )}

            {/* Unmatched Rows Tab */}
            {unmatchedRows.length > 0 && (
              <TabsTrigger 
                value="unmatched_excel" 
                className="text-xs font-bold px-3 py-2 rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-amber-800"
              >
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Excel Tidak Cocok
                <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-amber-100 text-amber-900 font-black">
                  {unmatchedRows.length}
                </Badge>
              </TabsTrigger>
            )}

            {/* Database Verified Tab */}
            <TabsTrigger 
              value="db_verified" 
              className="text-xs font-bold px-3 py-2 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-blue-800"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Terverifikasi di Database
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800 font-bold">
                {dbVerifiedCount}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Counter Text */}
        <p className="text-xs font-bold text-slate-500">
          {activeTab === "unmatched_excel" ? (
            <>
              Menampilkan <span className="text-amber-600 font-black">{Math.min(filteredUnmatchedRows.length, pageLimit)}</span> dari <span className="font-bold text-slate-700">{filteredUnmatchedRows.length}</span> baris Excel tidak ditemukan
            </>
          ) : (
            <>
              Menampilkan <span className="text-primary font-black">{Math.min(filteredActors.length, pageLimit)}</span> dari <span className="font-bold text-slate-700">{filteredActors.length}</span> data pelaku usaha
              {activeTab === "matched" && " yang sesuai dengan Excel BPJS"}
            </>
          )}
        </p>
      </div>

      {/* Main Content Area */}
      {activeTab === "unmatched_excel" ? (
        /* Unmatched Excel Rows View */
        <Card className="border-none shadow-xl bg-white/90 backdrop-blur-md overflow-hidden rounded-2xl border-amber-100">
          <div className="bg-amber-500/10 px-6 py-4 border-b border-amber-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-black text-amber-900 text-sm uppercase flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Data Excel yang Tidak Ditemukan di Database Pelaku Usaha
              </h3>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Baris-baris berikut ada di sheet Excel BPJS tetapi NIK maupun namanya tidak cocok dengan database Simpu.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportExcel}
              className="border-amber-400 text-amber-900 hover:bg-amber-100 font-bold text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Unduh Data Tidak Cocok (.xlsx)
            </Button>
          </div>

          <CardContent className="p-0">
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUnmatchedRows.slice(0, pageLimit).map((row, idx) => (
                <div key={idx} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-black text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase leading-tight">
                          {row.name}
                        </h4>
                        <span className="font-mono text-xs text-slate-500 font-bold">{row.nik}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                      Row #{row.rowNum}
                    </Badge>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">No KPJ:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{row.kpj || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Status Excel:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{row.status}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-muted-foreground font-medium">Penyebab:</span>
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                        {row.reason}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {filteredUnmatchedRows.length === 0 && (
                <div className="py-16 text-center text-muted-foreground text-sm font-semibold">
                  Tidak ada data yang tidak cocok dengan pencarian Anda.
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-black text-slate-700 py-3 pl-6 w-14 text-center uppercase text-[10px]">NO</TableHead>
                    <TableHead className="font-black text-slate-700 py-3 text-center uppercase text-[10px] w-24">BARIS EXCEL</TableHead>
                    <TableHead className="font-black text-slate-700 py-3 uppercase text-[10px]">NAMA (DARI EXCEL)</TableHead>
                    <TableHead className="font-black text-slate-700 py-3 text-center uppercase text-[10px]">NIK (DARI EXCEL)</TableHead>
                    <TableHead className="font-black text-slate-700 py-3 text-center uppercase text-[10px]">NO KPJ</TableHead>
                    <TableHead className="font-black text-slate-700 py-3 text-center uppercase text-[10px]">STATUS / KET DARI EXCEL</TableHead>
                    <TableHead className="font-black text-slate-700 py-3 text-center uppercase text-[10px]">PENYEBAB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnmatchedRows.slice(0, pageLimit).map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-amber-50/40">
                      <TableCell className="py-3 pl-6 text-center font-bold text-slate-400 text-xs">{idx + 1}</TableCell>
                      <TableCell className="py-3 text-center">
                        <Badge variant="outline" className="text-[10px] font-mono">Row #{row.rowNum}</Badge>
                      </TableCell>
                      <TableCell className="py-3 font-bold text-slate-800 uppercase text-xs">{row.name}</TableCell>
                      <TableCell className="py-3 text-center font-mono text-xs font-bold text-slate-600">{row.nik}</TableCell>
                      <TableCell className="py-3 text-center font-mono text-xs text-slate-600">{row.kpj || "-"}</TableCell>
                      <TableCell className="py-3 text-center">
                        <span className="text-xs text-slate-700 font-medium">{row.status}</span>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                          {row.reason}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUnmatchedRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center text-muted-foreground text-sm font-semibold">
                        Tidak ada data yang tidak cocok dengan pencarian Anda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredUnmatchedRows.length > pageLimit && (
              <div className="p-4 flex justify-center border-t bg-slate-50">
                <Button 
                  variant="outline" 
                  onClick={() => setPageLimit(prev => prev + 50)} 
                  className="font-bold text-xs"
                >
                  Tampilkan Lebih Banyak Data (+50)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Regular & Matched Actors Table View */
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md overflow-hidden rounded-2xl">
          <CardContent className="p-0">
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-2 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-8 bg-slate-200 rounded" />
                  </div>
                ))
              ) : (
                <>
                  {filteredActors.slice(0, pageLimit).map((actor, index) => {
                    const age = calculateAge(actor.pobDob || "")
                    const matchInfo = matchedActorsMap.get(actor.id)
                    const actorAny = actor as any
                    const isAccepted = actorAny.bpjsSubmissionStatus === 'accepted'
                    const isRejected = actorAny.bpjsSubmissionStatus === 'rejected'

                    return (
                      <div key={actor.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs shrink-0">
                              {index + 1}
                            </span>
                            <div>
                              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase leading-tight">
                                {actor.fullName}
                              </h4>
                              <p className="text-[11px] text-muted-foreground uppercase">{actor.kelurahan || "-"}</p>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
                            {actor.nik}
                          </span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground font-medium">Usia:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{age} Tahun</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground font-medium">Tempat / Tgl Lahir:</span>
                            <span className="font-semibold uppercase text-slate-700 dark:text-slate-300">
                              {actor.pob || parsePobDob(actor.pobDob || "").pob || "-"}, {actor.dob || parsePobDob(actor.pobDob || "").dob || "-"}
                            </span>
                          </div>
                          {actor.coordinator && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground font-medium">Koordinator:</span>
                              <span className="font-semibold uppercase text-slate-700 dark:text-slate-300">
                                {actor.coordinator}
                              </span>
                            </div>
                          )}
                          <div className="pt-1 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-col gap-1 items-start">
                            <span className="text-[10px] text-muted-foreground font-black uppercase">Status BPJS:</span>
                            {matchInfo ? (
                              <>
                                <Badge className={cn(
                                  "font-black uppercase tracking-wider text-[9px] px-2.5 py-1 shadow-sm flex items-center gap-1 border",
                                  matchInfo.matchMethod === "nik_and_name" 
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : matchInfo.isNikMatched 
                                    ? "bg-teal-100 text-teal-800 border-teal-300"
                                    : "bg-blue-100 text-blue-800 border-blue-300"
                                )}>
                                  <Check className="w-3 h-3" />
                                  {matchInfo.matchMethod === "nik_and_name" 
                                    ? "Cocok NIK & Nama" 
                                    : matchInfo.isNikMatched 
                                    ? "Cocok NIK" 
                                    : "Cocok Nama"}
                                </Badge>
                                {matchInfo.excelStatus && (
                                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                    Ket: {matchInfo.excelStatus}
                                  </span>
                                )}
                                {matchInfo.excelKpj && (
                                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                                    KPJ: {matchInfo.excelKpj}
                                  </span>
                                )}
                              </>
                            ) : actorAny.bpjsCheckStatus === 'sesuai' ? (
                              <>
                                <Badge className="font-black uppercase tracking-wider text-[9px] px-3 py-1 bg-blue-50 text-blue-700 border-blue-200 shadow-sm">
                                  Terverifikasi BPJS
                                </Badge>
                                {actorAny.bpjsCheckNote && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {actorAny.bpjsCheckNote}
                                  </span>
                                )}
                              </>
                            ) : (
                              <Badge className={cn(
                                "font-black uppercase tracking-wider text-[9px] px-3 py-1 border shadow-sm",
                                age < 65
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              )}>
                                {age < 65 ? "Bisa Didaftarkan" : "Tidak Bisa Didaftarkan"}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-1">
                          <Button 
                            size="sm" 
                            variant={isAccepted ? "default" : "outline"} 
                            onClick={() => handleAccept(actor.id)}
                            className={cn(
                              "flex-1 h-8 text-xs font-bold rounded-xl",
                              isAccepted ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-600/30 text-emerald-700 hover:bg-emerald-50"
                            )}
                          >
                            {isAccepted ? (
                              <>
                                <Check className="w-3.5 h-3.5 mr-1" /> Accepted
                              </>
                            ) : "Accept"}
                          </Button>
                          <Button 
                            size="sm" 
                            variant={isRejected ? "destructive" : "outline"} 
                            onClick={() => handleReject(actor.id)}
                            className={cn(
                              "flex-1 h-8 text-xs font-bold rounded-xl",
                              !isRejected && "border-rose-300 text-rose-600 hover:bg-rose-50"
                            )}
                          >
                            {isRejected ? "Rejected" : "Reject"}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  {!isLoading && filteredActors.length === 0 && (
                    <div className="py-16 text-center text-muted-foreground text-sm font-semibold">
                      Data tidak ditemukan
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-primary/5">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-black text-primary py-4 pl-6 w-12 text-center uppercase text-[10px]">NO</TableHead>
                    <TableHead className="font-black text-primary py-4 uppercase text-[10px]">NAMA LENGKAP</TableHead>
                    <TableHead className="font-black text-primary py-4 text-center uppercase text-[10px]">NIK</TableHead>
                    <TableHead className="font-black text-primary py-4 text-center uppercase text-[10px]">TEMPAT LAHIR</TableHead>
                    <TableHead className="font-black text-primary py-4 text-center uppercase text-[10px]">TANGGAL LAHIR</TableHead>
                    <TableHead className="font-black text-primary py-4 text-center uppercase text-[10px]">USIA</TableHead>
                    <TableHead className="font-black text-primary py-4 text-center uppercase text-[10px]">KOORDINATOR</TableHead>
                    <TableHead className="font-black text-primary py-4 text-center uppercase text-[10px]">
                      {activeTab === "matched" ? "HASIL CEK BPJS (EXCEL)" : "NOTE / KETERANGAN"}
                    </TableHead>
                    <TableHead className="font-black text-primary py-4 text-center uppercase text-[10px]">AKSI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell className="py-4 pl-6 text-center"><div className="h-4 bg-slate-200 rounded w-6 mx-auto" /></TableCell>
                        <TableCell className="py-4"><div className="h-4 bg-slate-200 rounded w-40" /></TableCell>
                        <TableCell className="py-4 text-center"><div className="h-4 bg-slate-200 rounded w-36 mx-auto" /></TableCell>
                        <TableCell className="py-4 text-center"><div className="h-4 bg-slate-200 rounded w-24 mx-auto" /></TableCell>
                        <TableCell className="py-4 text-center"><div className="h-4 bg-slate-200 rounded w-24 mx-auto" /></TableCell>
                        <TableCell className="py-4 text-center"><div className="h-4 bg-slate-200 rounded w-10 mx-auto" /></TableCell>
                        <TableCell className="py-4 text-center"><div className="h-4 bg-slate-200 rounded w-28 mx-auto" /></TableCell>
                        <TableCell className="py-4 text-center"><div className="h-6 bg-slate-200 rounded-full w-32 mx-auto" /></TableCell>
                        <TableCell className="py-4 text-center"><div className="h-8 bg-slate-200 rounded w-24 mx-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <>
                      {filteredActors.slice(0, pageLimit).map((actor, index) => {
                        const age = calculateAge(actor.pobDob || "")
                        const matchInfo = matchedActorsMap.get(actor.id)
                        const actorAny = actor as any
                        const isAccepted = actorAny.bpjsSubmissionStatus === 'accepted'
                        const isRejected = actorAny.bpjsSubmissionStatus === 'rejected'

                        return (
                          <TableRow key={actor.id} className="hover:bg-primary/5 transition-colors group">
                            <TableCell className="py-4 pl-6 text-center font-bold text-slate-400 text-xs">
                              {index + 1}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col">
                                <span className="font-black text-slate-800 uppercase text-[13px] tracking-tight">
                                  {actor.fullName}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase">
                                  {actor.kelurahan || "-"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                {actor.nik}
                              </span>
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              <span className="text-[11px] font-bold text-slate-600 uppercase">
                                {actor.pob || parsePobDob(actor.pobDob || "").pob || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              <span className="text-[11px] font-bold text-slate-600 uppercase">
                                {actor.dob || parsePobDob(actor.pobDob || "").dob || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-black text-slate-800 leading-none">{age}</span>
                                <span className="text-[8px] font-black text-muted-foreground uppercase mt-0.5">TAHUN</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              <span className="text-[11px] font-bold text-slate-600 uppercase">
                                {actor.coordinator || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {matchInfo ? (
                                  <>
                                    <Badge className={cn(
                                      "font-black uppercase tracking-wider text-[9px] px-2.5 py-1 shadow-sm flex items-center gap-1 border",
                                      matchInfo.matchMethod === "nik_and_name" 
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                        : matchInfo.isNikMatched 
                                        ? "bg-teal-100 text-teal-800 border-teal-300"
                                        : "bg-blue-100 text-blue-800 border-blue-300"
                                    )}>
                                      <Check className="w-3 h-3" />
                                      {matchInfo.matchMethod === "nik_and_name" 
                                        ? "Cocok NIK & Nama" 
                                        : matchInfo.isNikMatched 
                                        ? "Cocok NIK (Identitas)" 
                                        : "Cocok Nama"}
                                    </Badge>
                                    {matchInfo.excelStatus && (
                                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title={matchInfo.excelStatus}>
                                        {matchInfo.excelStatus}
                                      </span>
                                    )}
                                    {matchInfo.excelKpj && (
                                      <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                        KPJ: {matchInfo.excelKpj}
                                      </span>
                                    )}
                                  </>
                                ) : actorAny.bpjsCheckStatus === 'sesuai' ? (
                                  <>
                                    <Badge className="font-black uppercase tracking-wider text-[9px] px-3 py-1 bg-blue-50 text-blue-700 border-blue-200 shadow-sm">
                                      Terverifikasi BPJS
                                    </Badge>
                                    {actorAny.bpjsCheckNote && (
                                      <span className="text-[10px] text-muted-foreground">
                                        {actorAny.bpjsCheckNote}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <Badge className={cn(
                                    "font-black uppercase tracking-wider text-[9px] px-3 py-1.5 border shadow-sm",
                                    age < 65
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                      : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                  )}>
                                    {age < 65 ? "Bisa Didaftarkan" : "Tidak Bisa Didaftarkan"}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              <div className="flex gap-1.5 justify-center">
                                <Button 
                                  size="sm" 
                                  variant={isAccepted ? "default" : "outline"} 
                                  onClick={() => handleAccept(actor.id)}
                                  className={cn(
                                    "h-8 text-xs font-bold transition-all",
                                    isAccepted ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-600/30 text-emerald-700 hover:bg-emerald-50"
                                  )}
                                >
                                  {isAccepted ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 mr-1" /> Accepted
                                    </>
                                  ) : "Accept"}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant={isRejected ? "destructive" : "outline"} 
                                  onClick={() => handleReject(actor.id)}
                                  className={cn(
                                    "h-8 text-xs font-bold transition-all",
                                    !isRejected && "border-rose-300 text-rose-600 hover:bg-rose-50"
                                  )}
                                >
                                  {isRejected ? "Rejected" : "Reject"}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {!isLoading && filteredActors.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="py-24 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <div className="bg-slate-100 p-4 rounded-full">
                                <Search className="w-10 h-10 text-slate-300" />
                              </div>
                              <div className="space-y-1">
                                <p className="font-black text-slate-800 text-lg uppercase">Data Tidak Ditemukan</p>
                                <p className="text-sm text-muted-foreground">
                                  {activeTab === "matched" 
                                    ? "Belum ada data yang cocok dengan pencarian Anda pada hasil upload Excel BPJS." 
                                    : "Silakan coba kata kunci pencarian lain."}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredActors.length > pageLimit && (
              <div className="p-4 flex justify-center border-t bg-slate-50">
                <Button 
                  variant="outline" 
                  onClick={() => setPageLimit(prev => prev + 50)} 
                  className="font-bold border-primary text-primary hover:bg-primary/10"
                >
                  Tampilkan Lebih Banyak Data (+50)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card Footer */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 items-start">
        <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-black text-amber-900 uppercase">Informasi Kelayakan & Verifikasi BPJS</p>
          <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
            Kriteria kelayakan BPJS Ketenagakerjaan berdasarkan usia di bawah 65 tahun (&lt;65) pada saat pendaftaran. 
            Anda dapat mengunggah file Excel hasil pengecekan dari pihak BPJS menggunakan tombol <strong>UPLOAD HASIL BPJS</strong> untuk secara otomatis mencocokkan data NIK dan Nama dengan database pelaku usaha.
          </p>
        </div>
      </div>

      {/* Modal Dialog: Upload & Komparasi Excel BPJS */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-headline text-emerald-800">
              <UploadCloud className="w-6 h-6 text-emerald-600" /> Upload & Komparasi Hasil Cek BPJS
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Unggah file Excel sheet hasil verifikasi BPJS Ketenagakerjaan. Sistem akan otomatis membandingkan NIK dan Nama dengan data pelaku usaha di database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3",
                isDragging 
                  ? "border-emerald-500 bg-emerald-50/70 scale-[0.99]" 
                  : "border-slate-200 hover:border-emerald-500 hover:bg-slate-50/80 bg-slate-50/40"
              )}
            >
              {isProcessingExcel ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                  <p className="font-bold text-slate-700 text-sm">Sedang memproses & membandingkan data Excel...</p>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-inner">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      Tarik & lepas file Excel di sini, atau <span className="text-emerald-700 underline">klik untuk memilih</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mendukung format .XLSX, .XLS, atau .CSV
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Column Guide Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <p className="font-bold text-slate-700 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600" /> Panduan Kolom Excel BPJS:
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200">
                  <strong className="text-emerald-900 block mb-0.5 font-black">Kolom D - NIK (Utama):</strong>
                  <span className="text-emerald-800 font-medium">Header: <code>Nomor Identitas*</code> atau NIK. Dicocokkan langsung dengan NIK database.</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <strong className="text-slate-800 block mb-0.5 font-black">Kolom C - Keterangan:</strong>
                  <span className="text-slate-600">Header: <code>Keterangan Status</code> (misal: <em>BISA DAFTAR</em>).</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <strong className="text-slate-800 block mb-0.5 font-black">Kolom E - Nama Lengkap:</strong>
                  <span className="text-slate-600">Header: <code>Nama Lengkap*</code> (pencocokan fallback bila NIK memerlukan verifikasi).</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <strong className="text-slate-800 block mb-0.5 font-black">Kolom B & F - Status & TTL:</strong>
                  <span className="text-slate-600">Header: <code>Status</code> (Y) dan <code>Tgl. Lahir*</code>.</span>
                </div>
              </div>
            </div>

            {/* Comparison Results Card in Modal */}
            {comparisonStats && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-100/90 rounded-xl p-3 text-center border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">Total Baris Excel</span>
                    <span className="text-2xl font-black text-slate-800">{comparisonStats.totalRows}</span>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-200">
                    <span className="text-[10px] font-black uppercase text-emerald-700 block">Data Sesuai / Cocok</span>
                    <span className="text-2xl font-black text-emerald-700">{comparisonStats.matchedCount}</span>
                  </div>
                  <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-200">
                    <span className="text-[10px] font-black uppercase text-rose-700 block">Tidak Ditemukan</span>
                    <span className="text-2xl font-black text-rose-700">{comparisonStats.unmatchedCount}</span>
                  </div>
                </div>

                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    File <strong>{uploadedFileName}</strong> telah berhasil diproses. 
                    Klik tombol di bawah untuk langsung menampilkan <strong>{comparisonStats.matchedCount} data yang sesuai</strong> pada tabel menu ini.
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            {comparisonStats ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsUploadOpen(false)}
                  className="font-bold text-xs"
                >
                  Tutup
                </Button>
                <Button
                  onClick={handleSaveMatchedToDatabase}
                  disabled={isSavingToDb || matchedActorsMap.size === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  {isSavingToDb ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5 mr-1.5" /> Simpan Hasil ke Database
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setActiveTab("matched")
                    setIsUploadOpen(false)
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                >
                  Tampilkan {comparisonStats.matchedCount} Data Sesuai di Menu Ini
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsUploadOpen(false)}
                className="font-bold text-xs"
              >
                Batal
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
