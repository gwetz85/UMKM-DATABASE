"use client"

import { useState, useMemo, useEffect, useDeferredValue } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, useObject, updateDocumentNonBlocking, sanitizeForFirebase } from "@/firebase"
import { ref, query, orderByChild, equalTo } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { 
  ShieldAlert, 
  Loader2, 
  Search, 
  Eye, 
  FileDown, 
  Building2, 
  MapPin, 
  FileText, 
  ClipboardCheck, 
  Check, 
  Calendar, 
  UserCheck, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  SlidersHorizontal,
  FileSpreadsheet,
  Edit,
  Phone,
  User,
  Award,
  Layers,
  Sparkles,
  LayoutGrid,
  List,
  RotateCcw,
  Undo2,
  AlertCircle
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { BusinessActor, PejabatData, SurveyDinasData } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { generateBeritaAcaraPDF, formatTanggalIndonesia } from "@/lib/generate-berita-acara-pdf"
import { logActivity, getDeviceType } from "@/lib/logger"
import { Textarea } from "@/components/ui/textarea"
import * as XLSX from "xlsx"

export default function GBASPage() {
  const { user, userProfile } = useUser()
  const { toast } = useToast()
  const database = useDatabase()

  // State pencarian & filter
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearch = useDeferredValue(searchQuery)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [kecamatanFilter, setKecamatanFilter] = useState<string>("ALL")
  const [kelurahanFilter, setKelurahanFilter] = useState<string>("ALL")
  const [verifikatorFilter, setVerifikatorFilter] = useState<string>("ALL")
  const [petugasFilter, setPetugasFilter] = useState<string>("ALL")
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [pageLimit, setPageLimit] = useState(50)

  useEffect(() => {
    setPageLimit(50)
  }, [deferredSearch, statusFilter, kecamatanFilter, kelurahanFilter, verifikatorFilter, petugasFilter])

  // State multi-selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal Download Berita Acara Satuan
  const [printModalActor, setPrintModalActor] = useState<BusinessActor | null>(null)
  const [selectedPrintDate, setSelectedPrintDate] = useState<string>("")
  const [saveDateToSurvey, setSaveDateToSurvey] = useState<boolean>(true)
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null)

  // Modal Detail View
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)

  // Modal Kembali ke Verifikator Dinas
  const [returnVerifikatorActor, setReturnVerifikatorActor] = useState<BusinessActor | null>(null)
  const [returnVerifikatorReason, setReturnVerifikatorReason] = useState<string>("")
  const [isSubmittingReturnVerifikator, setIsSubmittingReturnVerifikator] = useState<boolean>(false)

  // Modal Edit Pejabat / Tanggal
  const [editPejabatActor, setEditPejabatActor] = useState<BusinessActor | null>(null)
  const [pejabatEditForm, setPejabatEditForm] = useState({
    tanggalSurvey: "",
    verifikatorNama: "",
    verifikatorNipppk: "",
    verifikatorPangkat: "",
    verifikatorJabatan: "",
    petugasNama: "",
    petugasNipppk: "",
    petugasPangkat: "",
    petugasJabatan: "",
  })
  const [isSavingPejabat, setIsSavingPejabat] = useState(false)

  // State Batch Download
  const [isBatchDownloading, setIsBatchDownloading] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentName: string }>({
    current: 0,
    total: 0,
    currentName: ""
  })
  const [cancelBatch, setCancelBatch] = useState(false)

  // Admin Check
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin' || userProfile?.role === 'superadmin'

  // Query system_users untuk lookup data pejabat / verifikator
  const systemUsersRef = useMemoFirebase(() => database ? ref(database, 'system_users') : null, [database])
  const { data: systemUsers } = useList<any>(systemUsersRef)

  // Query data businessActors
  const actorsRef = useMemoFirebase(() => {
    if (!database || !isAdmin) return null
    return ref(database, 'businessActors')
  }, [database, isAdmin])

  const { data: allActorsRaw, isLoading: isDataLoading } = useList<BusinessActor>(actorsRef)

  // ─────────────────────────────────────────────────────────────────────────────
  // PENGUMPULAN & DEDUP: PASTIKAN TEPAT 1 DATA PER PELAKU USAHA (BY NIK / ID)
  // ─────────────────────────────────────────────────────────────────────────────
  const uniqueGbasActors = useMemo(() => {
    if (!allActorsRaw) return []

    // Saring data yang telah masuk ke Verifikasi Dinas atau Hasil Verifikasi
    // Syarat: Berstatus verified_dinas dengan hasilVerifikasiDinas === 'Lolos', atau status finish dari verifikasi dinas
    const eligibleActors = allActorsRaw.filter(a => {
      if (!a) return false
      const s = a.status || ""
      const isLolos = a.hasilVerifikasiDinas === 'Lolos'
      
      // Data yang masuk ke Menu Verifikasi Dinas (baik yang masih di Verifikasi Dinas maupun Hasil Verifikasi)
      if (s === 'verified_dinas' && isLolos) return true
      if ((s === 'finish' || s === 'bank_pending') && isLolos) return true
      
      return false
    })

    // Dedup ketat 1 per Pelaku Usaha berdasarkan NIK unik (atau ID jika NIK kosong)
    const map = new Map<string, BusinessActor>()

    eligibleActors.forEach(actor => {
      const key = (actor.nik && actor.nik.trim() !== "") ? actor.nik.trim() : actor.id
      const existing = map.get(key)

      if (!existing) {
        map.set(key, actor)
      } else {
        const existingScore = (existing.surveyData ? 2 : 0) + 
                              ((existing as any).berkasDinasVerified ? 3 : 0) + 
                              (existing.status === 'verified_dinas' || existing.status === 'finish' ? 2 : 0) +
                              ((existing as any).updatedAt || existing.createdAt ? 1 : 0)
        
        const currentScore = (actor.surveyData ? 2 : 0) + 
                             ((actor as any).berkasDinasVerified ? 3 : 0) + 
                             (actor.status === 'verified_dinas' || actor.status === 'finish' ? 2 : 0) +
                             ((actor as any).updatedAt || actor.createdAt ? 1 : 0)

        if (currentScore > existingScore) {
          map.set(key, actor)
        }
      }
    })

    return Array.from(map.values())
  }, [allActorsRaw])

  // Helper untuk menentukan posisi status menu
  const getActorMenuStage = (actor: BusinessActor): { key: 'verifikasi_dinas' | 'hasil_verifikasi' | 'selesai'; label: string; badgeClass: string } => {
    const isBerkasVerified = !!(actor as any).berkasDinasVerified
    const s = actor.status

    if (s === 'finish' || s === 'bank_pending') {
      return {
        key: 'selesai',
        label: 'Selesai / Rekening',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200'
      }
    }
    if (isBerkasVerified && actor.hasilVerifikasiDinas === 'Lolos') {
      return {
        key: 'hasil_verifikasi',
        label: 'Hasil Verifikasi',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
      }
    }
    return {
      key: 'verifikasi_dinas',
      label: 'Verifikasi Dinas',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-300'
    }
  }

  // Daftar opsi filter unik
  const kecamatanList = useMemo(() => {
    const setKec = new Set<string>()
    uniqueGbasActors.forEach(a => {
      if (a.kecamatan && a.kecamatan.trim() !== "") setKec.add(a.kecamatan.trim().toUpperCase())
    })
    return Array.from(setKec).sort()
  }, [uniqueGbasActors])

  const kelurahanList = useMemo(() => {
    const setKel = new Set<string>()
    uniqueGbasActors.forEach(a => {
      if (kecamatanFilter === "ALL" || (a.kecamatan && a.kecamatan.trim().toUpperCase() === kecamatanFilter)) {
        if (a.kelurahan && a.kelurahan.trim() !== "") setKel.add(a.kelurahan.trim().toUpperCase())
      }
    })
    return Array.from(setKel).sort()
  }, [uniqueGbasActors, kecamatanFilter])

  const verifikatorList = useMemo(() => {
    const setVerif = new Set<string>()
    uniqueGbasActors.forEach(a => {
      const vNama = a.surveyData?.pejabatData?.verifikator?.nama || (a as any).verifikatorDinas || (a as any).verifiedDinasBy
      if (vNama && String(vNama).trim() !== "" && String(vNama).trim() !== "-") {
        setVerif.add(String(vNama).trim().toUpperCase())
      }
    })
    return Array.from(setVerif).sort()
  }, [uniqueGbasActors])

  const petugasList = useMemo(() => {
    const setPet = new Set<string>()
    uniqueGbasActors.forEach(a => {
      const pNama = a.surveyData?.pejabatData?.petugas?.nama || a.petugasSurvey || a.createdBy
      if (pNama && String(pNama).trim() !== "" && String(pNama).trim() !== "-") {
        setPet.add(String(pNama).trim().toUpperCase())
      }
    })
    return Array.from(setPet).sort()
  }, [uniqueGbasActors])

  // Filter gabungan
  const filteredActors = useMemo(() => {
    return uniqueGbasActors.filter(actor => {
      const stage = getActorMenuStage(actor)

      if (statusFilter !== "ALL" && stage.key !== statusFilter) return false

      if (kecamatanFilter !== "ALL") {
        const actorKec = (actor.kecamatan || "").trim().toUpperCase()
        if (actorKec !== kecamatanFilter) return false
      }

      if (kelurahanFilter !== "ALL") {
        const actorKel = (actor.kelurahan || "").trim().toUpperCase()
        if (actorKel !== kelurahanFilter) return false
      }

      if (verifikatorFilter !== "ALL") {
        const vNama = (actor.surveyData?.pejabatData?.verifikator?.nama || (actor as any).verifikatorDinas || (actor as any).verifiedDinasBy || "").trim().toUpperCase()
        if (vNama !== verifikatorFilter) return false
      }

      if (petugasFilter !== "ALL") {
        const pNama = (actor.surveyData?.pejabatData?.petugas?.nama || actor.petugasSurvey || actor.createdBy || "").trim().toUpperCase()
        if (pNama !== petugasFilter) return false
      }

      if (deferredSearch.trim() !== "") {
        const q = deferredSearch.toLowerCase().trim()
        const matchName = actor.fullName && actor.fullName.toLowerCase().includes(q)
        const matchNik = actor.nik && actor.nik.includes(q)
        const matchBusiness = actor.businessName && actor.businessName.toLowerCase().includes(q)
        const matchPhone = actor.phone && actor.phone.includes(q)
        const matchKel = actor.kelurahan && actor.kelurahan.toLowerCase().includes(q)
        const matchKec = actor.kecamatan && actor.kecamatan.toLowerCase().includes(q)
        const matchPetugas = (actor.petugasSurvey || "").toLowerCase().includes(q)
        const matchVerif = ((actor as any).verifikatorDinas || "").toLowerCase().includes(q)

        return matchName || matchNik || matchBusiness || matchPhone || matchKel || matchKec || matchPetugas || matchVerif
      }

      return true
    })
  }, [uniqueGbasActors, statusFilter, kecamatanFilter, kelurahanFilter, verifikatorFilter, petugasFilter, deferredSearch])

  // Ringkasan Statistik
  const stats = useMemo(() => {
    let totalVerifDinas = 0
    let totalHasilVerif = 0
    let totalSelesai = 0

    uniqueGbasActors.forEach(a => {
      const stage = getActorMenuStage(a)
      if (stage.key === 'verifikasi_dinas') totalVerifDinas++
      else if (stage.key === 'hasil_verifikasi') totalHasilVerif++
      else if (stage.key === 'selesai') totalSelesai++
    })

    return {
      total: uniqueGbasActors.length,
      verifikasiDinas: totalVerifDinas,
      hasilVerifikasi: totalHasilVerif,
      selesai: totalSelesai,
      filtered: filteredActors.length
    }
  }, [uniqueGbasActors, filteredActors])

  // Selection helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredActors.map(a => a.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RESOLVE PEJABAT DATA UNTUK DOKUMEN PDF
  // ─────────────────────────────────────────────────────────────────────────────
  const resolvePejabatData = async (actor: BusinessActor): Promise<PejabatData | undefined> => {
    const existing = actor.surveyData?.pejabatData || actor.pejabatData
    if (existing?.verifikator?.nama && existing?.verifikator?.nipppk) {
      return existing
    }

    const verifikatorNama = existing?.verifikator?.nama || (actor as any).verifikatorDinas || (actor as any).verifiedDinasBy || "Verifikator Dinas"
    const petugasNama = existing?.petugas?.nama || actor.petugasSurvey || actor.createdBy || "-"

    let resolvedVerifNip = existing?.verifikator?.nipppk || ""
    let resolvedVerifPangkat = existing?.verifikator?.pangkat || ""
    let resolvedVerifJabatan = existing?.verifikator?.jabatan || "Verifikator Dinas"

    if (systemUsers && verifikatorNama && verifikatorNama !== "-") {
      const vUpper = verifikatorNama.toUpperCase().trim()
      const foundU = systemUsers.find((u: any) => u.fullName && String(u.fullName).trim().toUpperCase() === vUpper)
      if (foundU) {
        if (!resolvedVerifNip && foundU.nipppk) resolvedVerifNip = String(foundU.nipppk).trim()
        if (!resolvedVerifPangkat && foundU.pangkat) resolvedVerifPangkat = String(foundU.pangkat).trim()
        if (!resolvedVerifJabatan && foundU.jabatan) resolvedVerifJabatan = String(foundU.jabatan).trim()
      }
    }

    let resolvedPetugasNip = existing?.petugas?.nipppk || ""
    let resolvedPetugasPangkat = existing?.petugas?.pangkat || ""
    let resolvedPetugasJabatan = existing?.petugas?.jabatan || "Petugas Survey"

    if (systemUsers && petugasNama && petugasNama !== "-") {
      const pUpper = petugasNama.toUpperCase().trim()
      const foundP = systemUsers.find((u: any) => u.fullName && String(u.fullName).trim().toUpperCase() === pUpper)
      if (foundP) {
        if (!resolvedPetugasNip && foundP.nipppk) resolvedPetugasNip = String(foundP.nipppk).trim()
        if (!resolvedPetugasPangkat && foundP.pangkat) resolvedPetugasPangkat = String(foundP.pangkat).trim()
        if (!resolvedPetugasJabatan && foundP.jabatan) resolvedPetugasJabatan = String(foundP.jabatan).trim()
      }
    }

    return {
      verifikator: {
        nama: verifikatorNama,
        nipppk: resolvedVerifNip,
        pangkat: resolvedVerifPangkat,
        jabatan: resolvedVerifJabatan
      },
      petugas: {
        nama: petugasNama,
        nipppk: resolvedPetugasNip,
        pangkat: resolvedPetugasPangkat,
        jabatan: resolvedPetugasJabatan
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERATE PDF BERITA ACARA SATUAN
  // ─────────────────────────────────────────────────────────────────────────────
  const handleOpenPrintModal = (actor: BusinessActor) => {
    setPrintModalActor(actor)
    const existingDate = actor.surveyData?.tanggalSurvey || new Date().toISOString().split('T')[0]
    setSelectedPrintDate(existingDate)
    setSaveDateToSurvey(true)
  }

  const handleGeneratePDF = async (actor: BusinessActor, customDate?: string, saveToSurvey?: boolean) => {
    const surveyToUse: SurveyDinasData = actor.surveyData || {
      tanggalSurvey: customDate || new Date().toISOString().split('T')[0],
      namaUsaha: actor.businessName || '',
      namaPemilik: actor.fullName || '',
      jenisKelamin: actor.gender?.toLowerCase().includes('perempuan') ? 'Perempuan' : 'Laki-Laki',
      status: 'Milik Sendiri',
      alamatRumah: actor.address || '',
      noHp: actor.phone || '',
      email: '',
      sosmed: '',
      bidangUsaha: actor.businessCategory || '',
      peralatan: 'Standar Operasional',
      tahunBerdiri: '2020',
      modalUsaha: 'Rp 5.000.000',
      omset: 'Rp 3.000.000',
      rencanaPenggunaan: 'Pengembangan Usaha',
      hasilSurvey: 'Layak',
      dtks: { masuk: false },
      hibah: { pernah: false },
      izin: ['NIB'],
      fotoSurveyUrl: actor.photoUsahaUri || actor.comparisonPhotoUrl
    }

    setGeneratingPdfId(actor.id)
    try {
      const pejabatData = await resolvePejabatData(actor)
      const targetDate = customDate || actor.surveyData?.tanggalSurvey || new Date().toISOString().split('T')[0]
      await generateBeritaAcaraPDF(actor, surveyToUse, pejabatData, targetDate)

      if (saveDateToSurvey && customDate && database) {
        const actorRef = ref(database, `businessActors/${actor.id}`)
        updateDocumentNonBlocking(actorRef, {
          "surveyData/tanggalSurvey": customDate
        })
      }

      logActivity({
        query: `DOWNLOAD GBAS PDF: ${actor.fullName} (${actor.nik})`,
        results: 'Berhasil',
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'DOWNLOAD GBAS PDF',
        userId: user?.email || user?.uid || 'Admin'
      })

      toast({ title: "PDF Berhasil Diunduh", description: `Berita Acara Survey untuk ${actor.fullName} telah siap.` })
      setPrintModalActor(null)
    } catch (err: any) {
      console.error("Error generating PDF:", err)
      toast({ variant: "destructive", title: "Gagal Membuat PDF", description: err?.message || "Terjadi kesalahan saat membuat dokumen PDF Berita Acara." })
    } finally {
      setGeneratingPdfId(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BATCH DOWNLOAD BERITA ACARA PDF
  // ─────────────────────────────────────────────────────────────────────────────
  const handleBatchDownload = async (targetActors: BusinessActor[]) => {
    if (targetActors.length === 0) {
      toast({ variant: "destructive", title: "Tidak Ada Data", description: "Pilih minimal 1 data untuk didownload." })
      return
    }

    setIsBatchDownloading(true)
    setCancelBatch(false)
    setBatchProgress({ current: 0, total: targetActors.length, currentName: targetActors[0].fullName || "" })

    let successCount = 0
    let failedCount = 0

    for (let i = 0; i < targetActors.length; i++) {
      if (cancelBatch) break

      const actor = targetActors[i]
      setBatchProgress({
        current: i + 1,
        total: targetActors.length,
        currentName: actor.fullName || `Data ke-${i + 1}`
      })

      try {
        const surveyToUse: SurveyDinasData = actor.surveyData || {
          tanggalSurvey: new Date().toISOString().split('T')[0],
          namaUsaha: actor.businessName || '',
          namaPemilik: actor.fullName || '',
          jenisKelamin: actor.gender?.toLowerCase().includes('perempuan') ? 'Perempuan' : 'Laki-Laki',
          status: 'Milik Sendiri',
          alamatRumah: actor.address || '',
          noHp: actor.phone || '',
          email: '',
          sosmed: '',
          bidangUsaha: actor.businessCategory || '',
          peralatan: 'Standar Operasional',
          tahunBerdiri: '2020',
          modalUsaha: 'Rp 5.000.000',
          omset: 'Rp 3.000.000',
          rencanaPenggunaan: 'Pengembangan Usaha',
          hasilSurvey: 'Layak',
          dtks: { masuk: false },
          hibah: { pernah: false },
          izin: ['NIB'],
          fotoSurveyUrl: actor.photoUsahaUri || actor.comparisonPhotoUrl
        }

        const pejabatData = await resolvePejabatData(actor)
        const targetDate = actor.surveyData?.tanggalSurvey || new Date().toISOString().split('T')[0]
        await generateBeritaAcaraPDF(actor, surveyToUse, pejabatData, targetDate)
        successCount++

        await new Promise(res => setTimeout(res, 600))
      } catch (e) {
        console.error("Batch download error on actor:", actor.id, e)
        failedCount++
      }
    }

    setIsBatchDownloading(false)
    toast({
      title: "Batch Download Selesai",
      description: `Berhasil mengunduh ${successCount} file Berita Acara Survey${failedCount > 0 ? `, gagal: ${failedCount}` : ''}.`
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPORT REKAPAN KE EXCEL (.XLSX)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (filteredActors.length === 0) {
      toast({ variant: "destructive", title: "Data Kosong", description: "Tidak ada data untuk diekspor ke Excel." })
      return
    }

    const dataRows = filteredActors.map((actor, idx) => {
      const stage = getActorMenuStage(actor)
      const survey = actor.surveyData
      const pejabats = survey?.pejabatData || actor.pejabatData
      const vNama = pejabats?.verifikator?.nama || (actor as any).verifikatorDinas || (actor as any).verifiedDinasBy || "-"
      const vNip = pejabats?.verifikator?.nipppk || "-"
      const pNama = pejabats?.petugas?.nama || actor.petugasSurvey || actor.createdBy || "-"
      const pNip = pejabats?.petugas?.nipppk || "-"

      return {
        "No": idx + 1,
        "NIK": actor.nik || "-",
        "Nama Pelaku Usaha": actor.fullName || "-",
        "No. HP / WhatsApp": actor.phone || "-",
        "Nama Usaha": actor.businessName || survey?.namaUsaha || "-",
        "Bidang Usaha": actor.businessCategory || survey?.bidangUsaha || "-",
        "Alamat Usaha": actor.address || survey?.alamatRumah || "-",
        "Kelurahan": actor.kelurahan || "-",
        "Kecamatan": actor.kecamatan || "-",
        "Tanggal Survey": survey?.tanggalSurvey ? formatTanggalIndonesia(survey.tanggalSurvey).fullText : "-",
        "Hasil Survey": survey?.hasilSurvey || "Layak",
        "Petugas Survey": pNama,
        "NIPPPK Petugas": pNip,
        "Verifikator Dinas": vNama,
        "NIPPPK Verifikator": vNip,
        "Posisi Menu": stage.label,
        "Status Verifikasi Berkas": (actor as any).berkasDinasVerified ? "Terverifikasi (Lolos)" : "Menunggu Cek Berkas"
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(dataRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "GBAS_Berita_Acara")

    worksheet["!cols"] = [
      { wch: 6 },  { wch: 18 }, { wch: 25 }, { wch: 16 }, { wch: 25 }, 
      { wch: 20 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, 
      { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 20 }, 
      { wch: 18 }, { wch: 25 }
    ]

    const todayStr = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `Rekap_GBAS_Berita_Acara_Survey_${todayStr}.xlsx`)

    logActivity({
      query: `EXPORT EXCEL GBAS: ${filteredActors.length} records`,
      results: 'Berhasil',
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'EXPORT EXCEL GBAS',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({ title: "Excel Berhasil Diunduh", description: `${filteredActors.length} data Berita Acara Survey diekspor.` })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MODAL EDIT PEJABAT & TANGGAL SURVEY (ADMIN ONLY)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleOpenEditPejabat = async (actor: BusinessActor) => {
    setEditPejabatActor(actor)
    const pd = await resolvePejabatData(actor)
    setPejabatEditForm({
      tanggalSurvey: actor.surveyData?.tanggalSurvey || new Date().toISOString().split('T')[0],
      verifikatorNama: pd?.verifikator?.nama || "",
      verifikatorNipppk: pd?.verifikator?.nipppk || "",
      verifikatorPangkat: pd?.verifikator?.pangkat || "",
      verifikatorJabatan: pd?.verifikator?.jabatan || "Verifikator Dinas",
      petugasNama: pd?.petugas?.nama || "",
      petugasNipppk: pd?.petugas?.nipppk || "",
      petugasPangkat: pd?.petugas?.pangkat || "",
      petugasJabatan: pd?.petugas?.jabatan || "Petugas Survey",
    })
  }

  const handleSavePejabatEdit = async () => {
    if (!editPejabatActor || !database) return
    setIsSavingPejabat(true)

    try {
      const updatedPejabatData: PejabatData = {
        verifikator: {
          nama: pejabatEditForm.verifikatorNama.trim(),
          nipppk: pejabatEditForm.verifikatorNipppk.trim(),
          pangkat: pejabatEditForm.verifikatorPangkat.trim(),
          jabatan: pejabatEditForm.verifikatorJabatan.trim() || "Verifikator Dinas"
        },
        petugas: {
          nama: pejabatEditForm.petugasNama.trim(),
          nipppk: pejabatEditForm.petugasNipppk.trim(),
          pangkat: pejabatEditForm.petugasPangkat.trim(),
          jabatan: pejabatEditForm.petugasJabatan.trim() || "Petugas Survey"
        }
      }

      const actorRef = ref(database, `businessActors/${editPejabatActor.id}`)
      await updateDocumentNonBlocking(actorRef, {
        "surveyData/tanggalSurvey": pejabatEditForm.tanggalSurvey,
        "surveyData/pejabatData": updatedPejabatData,
        pejabatData: updatedPejabatData
      })

      logActivity({
        query: `UPDATE PEJABAT GBAS: ${editPejabatActor.fullName}`,
        results: 'Berhasil',
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'UPDATE PEJABAT GBAS',
        userId: user?.email || user?.uid || 'Admin'
      })

      toast({
        title: "Data Pejabat & Tanggal Disimpan",
        description: `Perubahan Berita Acara untuk ${editPejabatActor.fullName} telah disimpan.`
      })
      setEditPejabatActor(null)
    } catch (err: any) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: err?.message || "Terjadi kesalahan saat menyimpan data pejabat."
      })
    } finally {
      setIsSavingPejabat(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // KEMBALIKAN KE VERIFIKATOR DINAS (RESET NOMOR REKENING / STATUS SELESAI)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleExecuteReturnVerifikator = async () => {
    if (!returnVerifikatorActor || !database || !isAdmin) return
    setIsSubmittingReturnVerifikator(true)

    try {
      const pd = await resolvePejabatData(returnVerifikatorActor)
      const vNama = pd?.verifikator?.nama || (returnVerifikatorActor as any).verifikatorDinas || (returnVerifikatorActor as any).verifiedDinasBy || "Verifikator Dinas"
      const vNip = pd?.verifikator?.nipppk || ""

      const actorRef = ref(database, `businessActors/${returnVerifikatorActor.id}`)
      
      const updates: any = {
        status: 'verified_dinas',
        hasilVerifikasiDinas: 'Lolos',
        berkasDinasVerified: false,
        berkasDinasVerifiedAt: null,
        berkasDinasVerifiedBy: null,
        bankName: null,
        bankNumber: null,
        bankOwner: null,
        readyForLPJ: false,
        lpjNominal: null,
        dikembalikanKeVerifikatorAt: new Date().toISOString(),
        dikembalikanKeVerifikatorBy: userProfile?.fullName || user?.email || user?.uid || 'Administrator',
        dikembalikanKeVerifikatorReason: returnVerifikatorReason.trim() || 'Dikembalikan dari GBAS oleh Admin'
      }

      if (vNama && vNama !== "-" && !returnVerifikatorActor.verifikatorDinas) {
        updates.verifikatorDinas = vNama
      }

      const cleanData = sanitizeForFirebase(updates)
      const { update } = await import('firebase/database')
      await update(actorRef, cleanData)

      // Update global stats (Tahap Selesai -> Tahap Verifikasi Dinas)
      import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
        const updatedActor = { ...returnVerifikatorActor, ...updates }
        updateStatsOnStatusChange(database, returnVerifikatorActor, updatedActor, updatedActor).catch(e => console.error(e))
      })

      logActivity({
        query: `KEMBALIKAN KE VERIFIKATOR (GBAS): ${returnVerifikatorActor.fullName}`,
        results: `Verifikator: ${vNama} (${vNip || '-'}) | Alasan: ${returnVerifikatorReason.trim() || '-'}`,
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'KEMBALIKAN KE VERIFIKATOR',
        userId: user?.email || user?.uid || 'Admin'
      })

      toast({
        title: "✅ Berhasil Dikembalikan",
        description: `Data ${returnVerifikatorActor.fullName} berhasil dikembalikan ke antrean Verifikator Dinas (${vNama}).`
      })

      setReturnVerifikatorActor(null)
      setReturnVerifikatorReason("")
      if (viewingActor?.id === returnVerifikatorActor.id) {
        setViewingActor(null)
      }
    } catch (err: any) {
      console.error("Error returning to verifikator:", err)
      toast({
        variant: "destructive",
        title: "Gagal Mengembalikan Data",
        description: err?.message || "Terjadi kesalahan saat mengembalikan data."
      })
    } finally {
      setIsSubmittingReturnVerifikator(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CEK HAK AKSES KHUSUS ADMINISTRATOR
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isAdminLoading && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Akses Terbatas: Menu GBAS</h2>
          <p className="text-sm text-slate-600">
            Halaman ini merupakan menu khusus yang hanya dapat diakses oleh petugas dengan role <strong>Administrator</strong>.
          </p>
          <Button 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold"
            onClick={() => window.location.href = "/dashboard"}
          >
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 w-full">
      {/* Header Utama - Full Width */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 lg:px-8 py-3.5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full max-w-[1700px] mx-auto">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-9 w-9 text-slate-600 hover:bg-slate-100 rounded-lg shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
                  GBAS
                </h1>
                <Badge className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 shadow-sm">
                  <ShieldAlert className="w-3 h-3 mr-1" /> ADMINISTRATOR ONLY
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Pusat Pengelolaan & Download Berita Acara Survey (Verifikasi Dinas & Hasil Verifikasi)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2.5 rounded-lg text-xs font-bold ${viewMode === 'table' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                onClick={() => setViewMode('table')}
                title="Tampilan Tabel"
              >
                <List className="w-3.5 h-3.5 mr-1" />
                Tabel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2.5 rounded-lg text-xs font-bold ${viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                onClick={() => setViewMode('grid')}
                title="Tampilan Kartu"
              >
                <LayoutGrid className="w-3.5 h-3.5 mr-1" />
                Kartu
              </Button>
            </div>

            {selectedIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs"
                onClick={() => {
                  const selectedActors = filteredActors.filter(a => selectedIds.includes(a.id))
                  handleBatchDownload(selectedActors)
                }}
                disabled={isBatchDownloading}
              >
                <FileDown className="w-3.5 h-3.5 mr-1.5" />
                Download Terpilih ({selectedIds.length})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border-slate-300"
              onClick={handleExportExcel}
              disabled={filteredActors.length === 0}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Export Excel ({filteredActors.length})
            </Button>

            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200"
              onClick={() => handleBatchDownload(filteredActors)}
              disabled={filteredActors.length === 0 || isBatchDownloading}
            >
              <FileDown className="w-3.5 h-3.5 mr-1.5" />
              Download Semua ({filteredActors.length})
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Banner Penjelasan */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-base md:text-lg font-bold">Dokumen Berita Acara Survey Terpadu</h2>
            </div>
            <p className="text-xs text-indigo-200 max-w-3xl leading-relaxed">
              Menu ini menghimpun seluruh dokumen Berita Acara Survey dari tahap <strong>Verifikasi Dinas</strong> dan <strong>Hasil Verifikasi</strong> dalam 1 data unik per pelaku usaha untuk mempermudah cetak dan download dokumen resmi.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-xs text-indigo-100 font-mono shrink-0">
            <Layers className="w-4 h-4 text-indigo-300" />
            <span>Tepat 1 Data / Pelaku Usaha</span>
          </div>
        </div>

        {/* Statistik Ringkas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <Card className="border-slate-200 shadow-sm bg-white hover:shadow transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Pelaku Usaha</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Memiliki Berita Acara</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <ClipboardCheck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white hover:shadow transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Verifikasi Dinas</p>
                <h3 className="text-2xl font-black text-purple-700 mt-1">{stats.verifikasiDinas}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Menunggu Cek Berkas</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white hover:shadow transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Hasil Verifikasi</p>
                <h3 className="text-2xl font-black text-emerald-700 mt-1">{stats.hasilVerifikasi}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Berkas Terverifikasi (Lolos)</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white hover:shadow transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Selesai / Lanjut</p>
                <h3 className="text-2xl font-black text-blue-700 mt-1">{stats.selesai}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Tahap Rekening / LPJ</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bar Filter & Pencarian */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 md:p-5 space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Cari NIK, Nama Pelaku Usaha, Nama Usaha, No HP, Kelurahan, Petugas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-slate-50/50 border-slate-200 rounded-xl text-xs focus-visible:ring-indigo-500"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status Tab Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                {[
                  { key: "ALL", label: `Semua (${stats.total})` },
                  { key: "verifikasi_dinas", label: `Verif Dinas (${stats.verifikasiDinas})` },
                  { key: "hasil_verifikasi", label: `Hasil Verif (${stats.hasilVerifikasi})` },
                  { key: "selesai", label: `Selesai (${stats.selesai})` }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      statusFilter === tab.key 
                        ? 'bg-white text-indigo-700 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
              <div>
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Kecamatan</Label>
                <Select value={kecamatanFilter} onValueChange={(val) => { setKecamatanFilter(val); setKelurahanFilter("ALL"); }}>
                  <SelectTrigger className="h-8 text-xs bg-slate-50/60 border-slate-200 rounded-lg">
                    <SelectValue placeholder="Semua Kecamatan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Kecamatan</SelectItem>
                    {kecamatanList.map(kec => (
                      <SelectItem key={kec} value={kec}>{kec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Kelurahan</Label>
                <Select value={kelurahanFilter} onValueChange={setKelurahanFilter}>
                  <SelectTrigger className="h-8 text-xs bg-slate-50/60 border-slate-200 rounded-lg">
                    <SelectValue placeholder="Semua Kelurahan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Kelurahan</SelectItem>
                    {kelurahanList.map(kel => (
                      <SelectItem key={kel} value={kel}>{kel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Verifikator Dinas</Label>
                <Select value={verifikatorFilter} onValueChange={setVerifikatorFilter}>
                  <SelectTrigger className="h-8 text-xs bg-slate-50/60 border-slate-200 rounded-lg">
                    <SelectValue placeholder="Semua Verifikator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Verifikator</SelectItem>
                    {verifikatorList.map(v => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Petugas Survey</Label>
                <Select value={petugasFilter} onValueChange={setPetugasFilter}>
                  <SelectTrigger className="h-8 text-xs bg-slate-50/60 border-slate-200 rounded-lg">
                    <SelectValue placeholder="Semua Petugas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Petugas</SelectItem>
                    {petugasList.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CONTROLLER HEADER LIST */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">
              Menampilkan {filteredActors.length} Berita Acara Survey
            </span>
            {selectedIds.length > 0 && (
              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                {selectedIds.length} dipilih
              </Badge>
            )}
          </div>

          {(kecamatanFilter !== "ALL" || kelurahanFilter !== "ALL" || verifikatorFilter !== "ALL" || petugasFilter !== "ALL" || statusFilter !== "ALL" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-slate-500 hover:text-slate-800"
              onClick={() => {
                setSearchQuery("")
                setStatusFilter("ALL")
                setKecamatanFilter("ALL")
                setKelurahanFilter("ALL")
                setVerifikatorFilter("ALL")
                setPetugasFilter("ALL")
              }}
            >
              Reset Semua Filter
            </Button>
          )}
        </div>

        {/* ───────────────────────────────────────────────────────────────────────────── */}
        {/* TAMPILAN TABEL RESPONSIVE DENGAN STICKY ACTION COLUMN */}
        {/* ───────────────────────────────────────────────────────────────────────────── */}
        {viewMode === 'table' ? (
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-2xl">
            <div className="overflow-x-auto w-full">
              <Table className="w-full min-w-[1200px]">
                <TableHeader className="bg-slate-100/80">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 text-center px-3">
                      <Checkbox
                        checked={filteredActors.length > 0 && selectedIds.length === filteredActors.length}
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        aria-label="Pilih Semua"
                      />
                    </TableHead>
                    <TableHead className="w-12 text-center text-[11px] font-bold text-slate-600 uppercase">No</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-600 uppercase min-w-[190px]">Pelaku Usaha & NIK</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-600 uppercase min-w-[180px]">Usaha & Alamat</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-600 uppercase min-w-[130px]">Wilayah</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-600 uppercase min-w-[140px]">Tgl Survey</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-600 uppercase min-w-[160px]">Petugas Survey</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-600 uppercase min-w-[160px]">Verifikator Dinas</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-600 uppercase text-center min-w-[130px]">Posisi Status</TableHead>
                    {/* Sticky Header untuk Aksi agar TIDAK PERNAH TERPOTONG */}
                    <TableHead className="text-[11px] font-bold text-slate-600 uppercase text-center w-32 sticky right-0 bg-slate-100 z-20 shadow-[-4px_0_8px_rgba(0,0,0,0.06)]">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isDataLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                          <span className="text-xs font-semibold">Memuat data Berita Acara Survey...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredActors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                          <ClipboardCheck className="w-8 h-8 text-slate-300" />
                          <span className="text-sm font-bold text-slate-700">Tidak ada Berita Acara Survey ditemukan</span>
                          <p className="text-xs text-slate-400">Coba sesuaikan kata kunci pencarian atau filter yang dipilih.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActors.slice(0, pageLimit).map((actor, idx) => {
                      const stage = getActorMenuStage(actor)
                      const survey = actor.surveyData
                      const pejabats = survey?.pejabatData || actor.pejabatData
                      const vNama = pejabats?.verifikator?.nama || (actor as any).verifikatorDinas || (actor as any).verifiedDinasBy || "-"
                      const vNip = pejabats?.verifikator?.nipppk || ""
                      const pNama = pejabats?.petugas?.nama || actor.petugasSurvey || actor.createdBy || "-"
                      const pNip = pejabats?.petugas?.nipppk || ""
                      const isSelected = selectedIds.includes(actor.id)
                      const isGeneratingThis = generatingPdfId === actor.id

                      return (
                        <TableRow 
                          key={actor.id} 
                          className={`group hover:bg-indigo-50/40 transition-colors ${isSelected ? 'bg-indigo-50/60' : ''}`}
                        >
                          <TableCell className="text-center px-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleSelect(actor.id)}
                              aria-label={`Pilih ${actor.fullName}`}
                            />
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                          
                          {/* Pelaku Usaha */}
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-slate-900 whitespace-nowrap">{actor.fullName}</span>
                              <span className="text-[11px] font-mono text-slate-500 tracking-tight">{actor.nik || "-"}</span>
                              {actor.phone && (
                                <a
                                  href={`https://wa.me/${actor.phone.replace(/\D/g, "").replace(/^0/, "62")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium mt-0.5"
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  {actor.phone}
                                </a>
                              )}
                            </div>
                          </TableCell>

                          {/* Usaha */}
                          <TableCell>
                            <div className="flex flex-col max-w-[220px]">
                              <span className="font-bold text-xs text-slate-800 truncate">{actor.businessName || survey?.namaUsaha || "-"}</span>
                              <span className="text-[10px] text-indigo-600 font-semibold truncate">{actor.businessCategory || survey?.bidangUsaha || "-"}</span>
                              <span className="text-[10px] text-slate-400 truncate mt-0.5">{actor.address || survey?.alamatRumah || "-"}</span>
                            </div>
                          </TableCell>

                          {/* Wilayah */}
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span className="font-medium text-slate-700 whitespace-nowrap">{actor.kelurahan || "-"}</span>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">{actor.kecamatan || "-"}</span>
                            </div>
                          </TableCell>

                          {/* Tanggal Survey */}
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium whitespace-nowrap">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>
                                {survey?.tanggalSurvey ? formatTanggalIndonesia(survey.tanggalSurvey).fullText : "-"}
                              </span>
                            </div>
                          </TableCell>

                          {/* Petugas Survey */}
                          <TableCell>
                            <div className="flex flex-col max-w-[160px]">
                              <span className="font-semibold text-xs text-slate-800 truncate" title={pNama}>{pNama}</span>
                              {pNip && <span className="text-[10px] font-mono text-slate-500 truncate">NIP: {pNip}</span>}
                            </div>
                          </TableCell>

                          {/* Verifikator Dinas */}
                          <TableCell>
                            <div className="flex flex-col max-w-[160px]">
                              <span className="font-semibold text-xs text-slate-800 truncate" title={vNama}>{vNama}</span>
                              {vNip && <span className="text-[10px] font-mono text-indigo-600 truncate">NIP: {vNip}</span>}
                            </div>
                          </TableCell>

                          {/* Posisi Status */}
                          <TableCell className="text-center whitespace-nowrap">
                            <Badge className={`text-[10px] font-bold border ${stage.badgeClass}`}>
                              {stage.label}
                            </Badge>
                          </TableCell>

                          {/* Aksi - STICKY AGAR SELALU TERLIHAT */}
                          <TableCell className="text-center sticky right-0 bg-white group-hover:bg-indigo-50/80 transition-colors z-10 shadow-[-4px_0_8px_rgba(0,0,0,0.06)] px-2">
                            <div className="flex items-center justify-center gap-1">
                              {/* Download Berita Acara PDF */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg shadow-sm"
                                title="Download Berita Acara Survey (PDF)"
                                onClick={() => handleOpenPrintModal(actor)}
                                disabled={isGeneratingThis}
                              >
                                {isGeneratingThis ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <FileDown className="w-4 h-4" />
                                )}
                              </Button>

                              {/* View Detail Survey */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                                title="Lihat Detail Data Survey"
                                onClick={() => setViewingActor(actor)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              {/* Edit Pejabat / Tanggal Survey */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg"
                                title="Koreksi Data Pejabat & Tanggal Survey"
                                onClick={() => handleOpenEditPejabat(actor)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>

                              {/* Kembali ke Verifikator Dinas untuk data yang sudah selesai / diinput rekening */}
                              {(stage.key === 'selesai' || actor.status === 'finish' || (actor.bankNumber && String(actor.bankNumber).trim() !== '')) && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded-lg shadow-sm"
                                  title="Kembalikan ke Verifikator Dinas (Reset Rekening)"
                                  onClick={() => {
                                    setReturnVerifikatorActor(actor)
                                    setReturnVerifikatorReason("")
                                  }}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredActors.length > pageLimit && (
              <div className="p-4 flex justify-center border-t bg-slate-50">
                <Button 
                  variant="outline" 
                  onClick={() => setPageLimit(prev => prev + 50)} 
                  className="font-bold border-indigo-600 text-indigo-700 hover:bg-indigo-50 text-xs"
                >
                  Tampilkan Lebih Banyak Data (+50)
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredActors.slice(0, pageLimit).map((actor, idx) => {
                const stage = getActorMenuStage(actor)
                const survey = actor.surveyData
                const pejabats = survey?.pejabatData || actor.pejabatData
                const vNama = pejabats?.verifikator?.nama || (actor as any).verifikatorDinas || (actor as any).verifiedDinasBy || "-"
                const vNip = pejabats?.verifikator?.nipppk || ""
                const pNama = pejabats?.petugas?.nama || actor.petugasSurvey || actor.createdBy || "-"
                const pNip = pejabats?.petugas?.nipppk || ""
                const isSelected = selectedIds.includes(actor.id)
                const isGeneratingThis = generatingPdfId === actor.id

                return (
                  <Card 
                    key={actor.id} 
                    className={`border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden bg-white ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Header Kartu */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelect(actor.id)}
                            aria-label={`Pilih ${actor.fullName}`}
                          />
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-xs text-slate-900 truncate" title={actor.fullName}>
                              {actor.fullName}
                            </h4>
                            <p className="text-[10px] font-mono text-slate-500">{actor.nik || "-"}</p>
                          </div>
                        </div>
                        <Badge className={`text-[9px] font-bold border shrink-0 ${stage.badgeClass}`}>
                          {stage.label}
                        </Badge>
                      </div>

                      {/* Info Usaha */}
                      <div className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1 border border-slate-100">
                        <div className="flex justify-between">
                          <span className="text-[10px] text-slate-500 font-medium">Usaha:</span>
                          <span className="font-bold text-slate-800 truncate max-w-[160px]">{actor.businessName || survey?.namaUsaha || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[10px] text-slate-500 font-medium">Kategori:</span>
                          <span className="font-semibold text-indigo-600 truncate">{actor.businessCategory || survey?.bidangUsaha || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[10px] text-slate-500 font-medium">Wilayah:</span>
                          <span className="text-slate-700 truncate">{actor.kelurahan || "-"}, {actor.kecamatan || "-"}</span>
                        </div>
                      </div>

                      {/* Info Pejabat & Tanggal */}
                      <div className="text-[11px] space-y-1 border-t border-slate-100 pt-2 text-slate-600">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Tgl Survey:</span>
                          <span className="font-semibold text-slate-800">
                            {survey?.tanggalSurvey ? formatTanggalIndonesia(survey.tanggalSurvey).fullText : "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Petugas:</span>
                          <span className="font-medium text-slate-700 truncate max-w-[150px]">{pNama}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Verifikator:</span>
                          <span className="font-medium text-indigo-700 truncate max-w-[150px]">{vNama}</span>
                        </div>
                      </div>

                      {/* Tombol Aksi */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                        <Button
                          size="sm"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 rounded-xl shadow-sm"
                          onClick={() => handleOpenPrintModal(actor)}
                          disabled={isGeneratingThis}
                        >
                          {isGeneratingThis ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                          ) : (
                            <FileDown className="w-3.5 h-3.5 mr-1" />
                          )}
                          Cetak PDF
                        </Button>

                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-xl border-slate-200 text-slate-600"
                          title="Lihat Detail"
                          onClick={() => setViewingActor(actor)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50"
                          title="Edit Pejabat"
                          onClick={() => handleOpenEditPejabat(actor)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>

                        {(stage.key === 'selesai' || actor.status === 'finish' || (actor.bankNumber && String(actor.bankNumber).trim() !== '')) && (
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                            title="Kembalikan ke Verifikator Dinas (Reset Rekening)"
                            onClick={() => {
                              setReturnVerifikatorActor(actor)
                              setReturnVerifikatorReason("")
                            }}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {filteredActors.length > pageLimit && (
              <div className="p-4 flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => setPageLimit(prev => prev + 50)} 
                  className="font-bold border-indigo-600 text-indigo-700 hover:bg-indigo-50 text-xs"
                >
                  Tampilkan Lebih Banyak Data (+50)
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL DOWNLOAD BERITA ACARA PDF DENGAN PILIHAN TANGGAL */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!printModalActor} onOpenChange={(open) => !open && setPrintModalActor(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileDown className="w-5 h-5 text-indigo-600" />
              Download Berita Acara Survey (PDF)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pilih tanggal pelaksanaan survey untuk dokumen Berita Acara resmi.
            </DialogDescription>
          </DialogHeader>

          {printModalActor && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pelaku Usaha:</span>
                  <span className="font-bold text-slate-800">{printModalActor.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NIK:</span>
                  <span className="font-mono text-slate-700">{printModalActor.nik}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Usaha:</span>
                  <span className="font-semibold text-slate-800">{printModalActor.businessName || printModalActor.surveyData?.namaUsaha || "-"}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Tanggal Dokumen Berita Acara
                </Label>
                <Input
                  type="date"
                  value={selectedPrintDate}
                  onChange={(e) => setSelectedPrintDate(e.target.value)}
                  className="h-10 text-xs font-semibold bg-white border-slate-300 rounded-xl"
                />
              </div>

              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 space-y-1">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" /> Bunyi Kalimat Pada Berita Acara:
                </span>
                <p className="text-[11px] font-medium text-slate-700 italic leading-relaxed">
                  &ldquo;{formatTanggalIndonesia(selectedPrintDate).formattedText}&rdquo;
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="save-date-gbas"
                  checked={saveDateToSurvey}
                  onCheckedChange={(c) => setSaveDateToSurvey(!!c)}
                />
                <label
                  htmlFor="save-date-gbas"
                  className="text-xs text-slate-600 cursor-pointer select-none font-medium"
                >
                  Simpan tanggal ini ke data survey di database
                </label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold rounded-xl"
              onClick={() => setPrintModalActor(null)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200"
              onClick={() => printModalActor && handleGeneratePDF(printModalActor, selectedPrintDate, saveDateToSurvey)}
              disabled={generatingPdfId === printModalActor?.id}
            >
              {generatingPdfId === printModalActor?.id ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Membuat PDF...
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 mr-1.5" />
                  Download Berita Acara (PDF)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL BATCH DOWNLOAD PROGRESS */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isBatchDownloading} onOpenChange={() => {}}>
        <DialogContent className="max-w-md rounded-2xl p-6 text-center">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              Mengunduh Dokumen Berita Acara
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Harap jangan menutup halaman ini sampai proses download selesai.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Progres Download</span>
                <span>{batchProgress.current} dari {batchProgress.total} file</span>
              </div>
              <Progress value={(batchProgress.current / Math.max(1, batchProgress.total)) * 100} className="h-2.5 bg-slate-100" />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
              Sedang memproses: <strong className="text-indigo-700">{batchProgress.currentName}</strong>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-xs text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setCancelBatch(true)}
            >
              Batalkan Sisa Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL DETAIL DATA SURVEY */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!viewingActor} onOpenChange={(open) => !open && setViewingActor(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              Detail Berita Acara & Data Survey
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Rincian hasil verifikasi lapangan dan data pejabat penandatangan.
            </DialogDescription>
          </DialogHeader>

          {viewingActor && (
            <div className="space-y-5 pt-2 text-xs">
              {(viewingActor.surveyData?.fotoSurveyUrl || viewingActor.photoUsahaUri || viewingActor.comparisonPhotoUrl) && (
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Foto Survey Lapangan</Label>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-64 flex items-center justify-center">
                    <img 
                      src={viewingActor.surveyData?.fotoSurveyUrl || viewingActor.photoUsahaUri || viewingActor.comparisonPhotoUrl} 
                      alt="Foto Survey"
                      className="w-full h-auto object-cover max-h-64"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Pelaku Usaha</span>
                  <p className="font-bold text-slate-800 text-sm">{viewingActor.fullName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">NIK</span>
                  <p className="font-mono font-bold text-slate-800 text-sm">{viewingActor.nik}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Usaha</span>
                  <p className="font-semibold text-slate-800">{viewingActor.businessName || viewingActor.surveyData?.namaUsaha || "-"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Bidang Usaha</span>
                  <p className="font-semibold text-indigo-600">{viewingActor.businessCategory || viewingActor.surveyData?.bidangUsaha || "-"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Alamat Usaha / Rumah</span>
                  <p className="text-slate-700">{viewingActor.address || viewingActor.surveyData?.alamatRumah || "-"}</p>
                </div>
              </div>

              {viewingActor.surveyData && (
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Hasil Kuesioner Survey Dinas</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-white p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Tahun Berdiri</span>
                      <span className="font-semibold text-slate-800">{viewingActor.surveyData.tahunBerdiri || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Modal Usaha</span>
                      <span className="font-semibold text-slate-800">{viewingActor.surveyData.modalUsaha || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Omset Bulanan</span>
                      <span className="font-semibold text-slate-800">{viewingActor.surveyData.omset || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Status Tempat Usaha</span>
                      <span className="font-semibold text-slate-800">{viewingActor.surveyData.status || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Hasil Kelayakan</span>
                      <span className="font-bold text-emerald-600">{viewingActor.surveyData.hasilSurvey || "Layak"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Pernah Terima Hibah</span>
                      <span className="font-semibold text-slate-800">{viewingActor.surveyData.hibah?.pernah ? "Pernah" : "Belum Pernah"}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Pejabat Penandatangan Berita Acara</Label>
                <div className="grid grid-cols-2 gap-3 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase block">Petugas Survey</span>
                    <p className="font-bold text-slate-800">{viewingActor.surveyData?.pejabatData?.petugas?.nama || viewingActor.petugasSurvey || "-"}</p>
                    <p className="text-[10px] font-mono text-slate-500">NIP: {viewingActor.surveyData?.pejabatData?.petugas?.nipppk || "-"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase block">Verifikator Dinas</span>
                    <p className="font-bold text-slate-800">{viewingActor.surveyData?.pejabatData?.verifikator?.nama || (viewingActor as any).verifikatorDinas || "-"}</p>
                    <p className="text-[10px] font-mono text-slate-500">NIP: {viewingActor.surveyData?.pejabatData?.verifikator?.nipppk || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 gap-2 flex-col sm:flex-row">
            {viewingActor && (viewingActor.status === 'finish' || (viewingActor.bankNumber && String(viewingActor.bankNumber).trim() !== '')) && (
              <Button
                variant="outline"
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 font-bold text-xs rounded-xl"
                onClick={() => {
                  const target = viewingActor
                  setViewingActor(null)
                  setReturnVerifikatorActor(target)
                  setReturnVerifikatorReason("")
                }}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Kembalikan ke Verifikator Dinas
              </Button>
            )}
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
              onClick={() => {
                const target = viewingActor
                setViewingActor(null)
                if (target) handleOpenPrintModal(target)
              }}
            >
              <FileDown className="w-3.5 h-3.5 mr-1.5" />
              Download Berita Acara (PDF)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL KONFIRMASI KEMBALIKAN KE VERIFIKATOR DINAS */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!returnVerifikatorActor} onOpenChange={(open) => !open && setReturnVerifikatorActor(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-600" />
              Kembalikan ke Verifikator Dinas
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Data akan dikembalikan ke antrean Verifikator Dinas sesuai Berita Acara.
            </DialogDescription>
          </DialogHeader>

          {returnVerifikatorActor && (() => {
            const pejabats = returnVerifikatorActor.surveyData?.pejabatData || returnVerifikatorActor.pejabatData
            const vNama = pejabats?.verifikator?.nama || (returnVerifikatorActor as any).verifikatorDinas || (returnVerifikatorActor as any).verifiedDinasBy || "Verifikator Dinas"
            const vNip = pejabats?.verifikator?.nipppk || "-"
            const pNama = pejabats?.petugas?.nama || returnVerifikatorActor.petugasSurvey || returnVerifikatorActor.createdBy || "-"

            return (
              <div className="space-y-4 pt-2 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pelaku Usaha:</span>
                    <span className="font-bold text-slate-800">{returnVerifikatorActor.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">NIK:</span>
                    <span className="font-mono text-slate-700">{returnVerifikatorActor.nik}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nama Usaha:</span>
                    <span className="font-semibold text-slate-800">{returnVerifikatorActor.businessName || returnVerifikatorActor.surveyData?.namaUsaha || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Petugas Survey:</span>
                    <span className="font-medium text-slate-700">{pNama}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5">
                    <span className="text-indigo-700 font-bold">Verifikator Tujuan:</span>
                    <span className="font-bold text-indigo-700">{vNama} {vNip !== '-' ? `(NIP: ${vNip})` : ''}</span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 space-y-1">
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Informasi Pengembalian:
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Data lengkap (kuesioner, foto survey, lokasi GPS, biodata) akan kembali utuh ke antrean <strong>Verifikasi Dinas (Cek Berkas)</strong> milik <strong>{vNama}</strong>. Data nomor rekening yang telah diinput sebelumnya akan di-reset.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Catatan / Alasan Pengembalian (Opsional)</Label>
                  <Textarea
                    value={returnVerifikatorReason}
                    onChange={(e) => setReturnVerifikatorReason(e.target.value)}
                    placeholder="Contoh: Perbaikan verifikasi berkas oleh verifikator dinas terkait..."
                    className="h-20 text-xs rounded-xl bg-white border-slate-300"
                  />
                </div>
              </div>
            )
          })()}

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold rounded-xl"
              onClick={() => setReturnVerifikatorActor(null)}
              disabled={isSubmittingReturnVerifikator}
            >
              Batal
            </Button>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-200"
              onClick={handleExecuteReturnVerifikator}
              disabled={isSubmittingReturnVerifikator}
            >
              {isSubmittingReturnVerifikator ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Mengembalikan...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Kembalikan ke Verifikator
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL EDIT PEJABAT & TANGGAL SURVEY */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!editPejabatActor} onOpenChange={(open) => !open && setEditPejabatActor(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit className="w-5 h-5 text-amber-600" />
              Koreksi Data Pejabat & Tanggal Survey
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Perubahan otomatis tercetak pada dokumen Berita Acara Survey PDF.
            </DialogDescription>
          </DialogHeader>

          {editPejabatActor && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Tanggal Survey / Berita Acara</Label>
                <Input
                  type="date"
                  value={pejabatEditForm.tanggalSurvey}
                  onChange={(e) => setPejabatEditForm(prev => ({ ...prev, tanggalSurvey: e.target.value }))}
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <span className="font-bold text-indigo-900 text-[11px] uppercase tracking-wider block">
                  Data Verifikator Dinas
                </span>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-500">Nama Verifikator</Label>
                  <Input
                    value={pejabatEditForm.verifikatorNama}
                    onChange={(e) => setPejabatEditForm(prev => ({ ...prev, verifikatorNama: e.target.value }))}
                    placeholder="Nama Lengkap Verifikator"
                    className="h-8 text-xs bg-white rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-slate-500">NIPPPK / NIP</Label>
                    <Input
                      value={pejabatEditForm.verifikatorNipppk}
                      onChange={(e) => setPejabatEditForm(prev => ({ ...prev, verifikatorNipppk: e.target.value }))}
                      placeholder="NIPPPK Verifikator"
                      className="h-8 text-xs bg-white rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500">Jabatan</Label>
                    <Input
                      value={pejabatEditForm.verifikatorJabatan}
                      onChange={(e) => setPejabatEditForm(prev => ({ ...prev, verifikatorJabatan: e.target.value }))}
                      placeholder="Jabatan"
                      className="h-8 text-xs bg-white rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 p-3 bg-slate-100/70 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                  Data Petugas Survey
                </span>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-500">Nama Petugas</Label>
                  <Input
                    value={pejabatEditForm.petugasNama}
                    onChange={(e) => setPejabatEditForm(prev => ({ ...prev, petugasNama: e.target.value }))}
                    placeholder="Nama Petugas Survey"
                    className="h-8 text-xs bg-white rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-slate-500">NIPPPK / NIP</Label>
                    <Input
                      value={pejabatEditForm.petugasNipppk}
                      onChange={(e) => setPejabatEditForm(prev => ({ ...prev, petugasNipppk: e.target.value }))}
                      placeholder="NIPPPK Petugas"
                      className="h-8 text-xs bg-white rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500">Jabatan</Label>
                    <Input
                      value={pejabatEditForm.petugasJabatan}
                      onChange={(e) => setPejabatEditForm(prev => ({ ...prev, petugasJabatan: e.target.value }))}
                      placeholder="Jabatan"
                      className="h-8 text-xs bg-white rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-xl"
              onClick={() => setEditPejabatActor(null)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl"
              onClick={handleSavePejabatEdit}
              disabled={isSavingPejabat}
            >
              {isSavingPejabat ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
