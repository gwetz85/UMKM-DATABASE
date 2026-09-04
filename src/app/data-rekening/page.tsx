"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject, deleteDocumentNonBlocking } from "@/firebase"
import { ref, query, equalTo, orderByChild } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { 
  Printer, 
  Edit3, 
  Loader2, 
  Save, 
  RotateCcw, 
  User, 
  CreditCard, 
  History, 
  Building2, 
  MapPin, 
  BadgeCheck, 
  FileText, 
  Search, 
  Trash2, 
  Folder, 
  FileSpreadsheet, 
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import { cn, extractDobFromNik, parsePobDob, calculateAge } from "@/lib/utils"
import { SidebarTrigger } from "@/components/ui/sidebar"
import ExcelJS from "exceljs"

const BANK_LIST = [
  "BCA", "BNI", "BRI", "BRK", "MANDIRI", "BSI", "BTN", "OCBC", "PANIN", "MUAMALAT", "MAYBANK", "BUKOPIN", "DANAMON", "PERMATA"
]

export default function DataRekeningPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <DataRekeningContent />
    </Suspense>
  )
}

function DataRekeningContent() {
  const { user, userProfile } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const filterCoordinatorParam = searchParams.get("coordinator")
  const filterBankParam = searchParams.get("bank")

  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBank, setSelectedBank] = useState<string>(filterBankParam || "")
  const [category, setCategory] = useState<string>("")
  const [filterCoordinator, setFilterCoordinator] = useState<string>(filterCoordinatorParam || "")
  const [pageLimit, setPageLimit] = useState(60)
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showRevertDialog, setShowRevertDialog] = useState(false)
  const [revertPending, setRevertPending] = useState<{ actorId: string; fullName: string } | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePending, setDeletePending] = useState<{ actorId: string; fullName: string } | null>(null)
  const [editNik, setEditNik] = useState("")
  const [editPob, setEditPob] = useState("")
  const [editDob, setEditDob] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 250)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPageLimit(60)
  }, [searchQuery, selectedBank, category, filterCoordinator])

  useEffect(() => {
    if (viewingActor) {
      const parsed = parsePobDob(viewingActor.pobDob || "")
      setEditNik(viewingActor.nik || "")
      setEditPob(parsed.pob || viewingActor.pob || "")
      setEditDob(parsed.dob || viewingActor.dob || "")
    } else {
      setEditNik("")
      setEditPob("")
      setEditDob("")
      setIsEditMode(false)
    }
  }, [viewingActor])

  // ── Firebase Roles ────────────────────────────────────────────────────────
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole } = useObject(adminRef)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === "agus@umkm.id") || userProfile?.role === "admin"
  const isKoordinator = userProfile?.role === "koordinator"

  // Ambil data yang memiliki status finish (atau yang sudah terinput rekeningnya)
  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return query(ref(database, "businessActors"), orderByChild("status"), equalTo("finish"))
  }, [database])

  const kuotaRef = useMemoFirebase(() => database ? ref(database, "koordinator_kuotas") : null, [database])
  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  const { data: kuotaData } = useList<any>(kuotaRef)

  // Filter khusus: semua data yang memiliki rekening bank terinput (yang sekarang datanya berada di menu Selesai)
  const actors = useMemo(() => {
    if (!allActorsRaw) return undefined

    return allActorsRaw
      .filter(a => {
        // Harus memiliki nomor rekening yang telah terinput
        const hasBank = !!(a.bankNumber && a.bankNumber.trim() !== "")
        if (!hasBank) return false

        const matchesSearch =
          a.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.nik?.includes(searchQuery) ||
          a.bankNumber?.includes(searchQuery) ||
          a.bankName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.coordinator?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesCategory = !category || a.businessCategory === category

        const matchesBank = !selectedBank || (a.bankName && a.bankName.toUpperCase().includes(selectedBank.toUpperCase()))

        if (isKoordinator) {
          if (!a.coordinator || !userProfile?.fullName) return false
          return matchesSearch && matchesCategory && matchesBank && a.coordinator.toLowerCase() === userProfile.fullName.toLowerCase()
        }

        if (filterCoordinator) {
          return matchesSearch && matchesCategory && matchesBank && a.coordinator === filterCoordinator
        }

        return matchesSearch && matchesCategory && matchesBank
      })
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
  }, [allActorsRaw, searchQuery, category, selectedBank, filterCoordinator, isKoordinator, userProfile])

  // List koordinator untuk dropdown filter
  const coordinatorList = useMemo(() => {
    if (!allActorsRaw) return []
    const set = new Set<string>()
    allActorsRaw.forEach(a => {
      if (a.coordinator && a.bankNumber) set.add(a.coordinator)
    })
    return Array.from(set).sort()
  }, [allActorsRaw])

  // Hitung ringkasan statistik
  const statsSummary = useMemo(() => {
    if (!allActorsRaw) return { total: 0, lpjSelesai: 0, lpjProses: 0, belumLpj: 0 }
    const withBank = allActorsRaw.filter(a => a.bankNumber && a.bankNumber.trim() !== "")
    const lpjSelesai = withBank.filter(a => !!a.lpjNominal && Number(a.lpjNominal) > 0).length
    const lpjProses = withBank.filter(a => a.readyForLPJ && (!a.lpjNominal || Number(a.lpjNominal) <= 0)).length
    const belumLpj = withBank.filter(a => !a.readyForLPJ && (!a.lpjNominal || Number(a.lpjNominal) <= 0)).length

    return {
      total: withBank.length,
      lpjSelesai,
      lpjProses,
      belumLpj
    }
  }, [allActorsRaw])

  // ── Print Formulir ────────────────────────────────────────────────────────
  const handlePrintActor = (actor: BusinessActor) => {
    const a = actor as any
    const sd = a.surveyData || {}
    const parsed = parsePobDob(actor.pobDob || "")
    const dob = actor.dob || parsed.dob || "-"
    const pob = actor.pob || parsed.pob || "-"
    const regCode = actor.registrationCode || "-"

    const row = (label: string, value: string | undefined) =>
      `<tr><td class="lbl">${label}</td><td class="sep">:</td><td class="val">${value || "-"}</td></tr>`

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Data Rekening Pelaku Usaha - ${actor.fullName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Arial',sans-serif;font-size:11px;color:#222;background:white;}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:15mm;}
  .kop{display:flex;align-items:center;justify-content:center;gap:20px;padding-bottom:10px;}
  .kop-logo img{width:80px;height:auto;object-fit:contain;}
  .kop-center{text-align:center;padding-top:4px;}
  .kop-center .org{font-size:16px;font-weight:bold;color:#059669;text-transform:uppercase;letter-spacing:0.5px;}
  .kop-center .sub{font-size:10px;font-weight:bold;color:#555;text-transform:uppercase;margin-top:4px;}
  .kop-line{height:2px;background:#059669;margin-top:2px;margin-bottom:20px;}
  .judul-row{text-align:center;margin-bottom:20px;}
  .judul-text{font-size:16px;font-weight:bold;text-transform:uppercase;color:#059669;letter-spacing:0.5px;}
  .judul-underline{width:90px;height:4px;background:#10b981;margin:6px auto 0 auto;}
  .section{margin-bottom:12px;page-break-inside:avoid;}
  .sec-hdr{background:#ECFDF5;color:#059669;font-weight:bold;font-size:11px;padding:6px 12px;text-transform:uppercase;}
  .sec-body{padding:0;}
  table{width:100%;border-collapse:collapse;}
  td.lbl{width:30%;font-weight:bold;font-size:11px;padding:7px 12px;color:#222;}
  td.sep{width:10px;padding:7px 2px;color:#555;}
  td.val{font-size:11px;padding:7px 12px;color:#555;text-transform:uppercase;}
  tr{border-bottom:1px solid #F0F0F0;page-break-inside:avoid;}
  tr:last-child{border-bottom:none;}
  .footer{margin-top:15px;border-top:1px solid #F0F0F0;padding-top:10px;text-align:center;font-size:9px;color:#888;}
  @media print{
    @page{size:A4;margin:15mm;}
    .page{width:100%;min-height:auto;margin:0;padding:0;}
    .sec-hdr{background:#ECFDF5 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  }
</style>
</head>
<body>
<div class="page">
<div class="kop">
  <div class="kop-logo"><img src="${window.location.origin}/logo-tunas-bangsa.png" alt="Logo"/></div>
  <div class="kop-center">
    <div class="org">Tunas Bangsa Kepulauan Riau</div>
    <div class="sub">Data Rekening Bank Penerima Bantuan UMKM</div>
  </div>
</div>
<div class="kop-line"></div>
<div class="judul-row">
  <div class="judul-text">Lembar Konfirmasi Rekening Bank</div>
  <div class="judul-underline"></div>
</div>

<div class="section">
  <div class="sec-hdr">I. DATA REKENING BANK</div>
  <div class="sec-body"><table>
    ${row("Nama Bank", actor.bankName)}
    ${row("Nomor Rekening", actor.bankNumber)}
    ${row("Nama Pemilik Rekening", actor.bankOwner)}
    ${row("Status LPJ", actor.lpjNominal ? `Sudah LPJ (Rp ${Number(actor.lpjNominal).toLocaleString("id-ID")})` : (actor.readyForLPJ ? "Dalam Proses LPJ" : "Tercatat"))}
  </table></div>
</div>

<div class="section">
  <div class="sec-hdr">II. DATA PRIBADI PELAKU USAHA</div>
  <div class="sec-body"><table>
    ${row("Nomor Registrasi", regCode)}
    ${row("Nama Lengkap", actor.fullName)}
    ${row("NIK", actor.nik)}
    ${row("Nomor Kartu Keluarga", actor.noKK)}
    ${row("Jenis Kelamin", actor.gender)}
    ${row("Nomor HP / WhatsApp", actor.phone)}
    ${row("Kecamatan / Kelurahan", (actor.kecamatan && actor.kelurahan) ? actor.kecamatan + " / " + actor.kelurahan : (actor.kecamatan || actor.kelurahan || "-"))}
    ${row("Alamat Domisili", actor.address)}
  </table></div>
</div>

<div class="section">
  <div class="sec-hdr">III. INFORMASI USAHA &amp; PENGUSUL</div>
  <div class="sec-body"><table>
    ${row("Nama Usaha", actor.businessName)}
    ${row("Kategori Usaha", actor.businessCategory)}
    ${row("Alamat Lokasi Usaha", actor.businessLocation)}
    ${row("Pengusul / Koordinator", actor.coordinator)}
  </table></div>
</div>

<div class="footer">
  Sistem Informasi SIMPU &bull; Dicetak: ${new Date().toLocaleString("id-ID")} &bull; Bank: ${actor.bankName || "-"} &bull; Rek: ${actor.bankNumber || "-"}
</div>
</div>
</body>
</html>`

    let iframe = document.getElementById("__print_iframe_rekening__") as HTMLIFrameElement | null
    if (!iframe) {
      iframe = document.createElement("iframe")
      iframe.id = "__print_iframe_rekening__"
      iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;"
      document.body.appendChild(iframe)
    }

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) return

    iframeDoc.open()
    iframeDoc.write(htmlContent)
    iframeDoc.close()

    setTimeout(() => {
      iframe!.contentWindow?.focus()
      iframe!.contentWindow?.print()
    }, 500)
  }

  // ── Excel Export ──────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    try {
      if (!actors || actors.length === 0) {
        toast({ variant: "destructive", title: "Data Kosong", description: "Tidak ada data rekening untuk di-export." })
        return
      }

      toast({ title: "⏳ Memproses Excel", description: "Sedang menyusun file Excel Data Rekening..." })

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Data Rekening Bank")

      const headers = [
        { header: "NO", key: "no", width: 6 },
        { header: "NAMA BANK", key: "bankName", width: 16 },
        { header: "NOMOR REKENING", key: "bankNumber", width: 22 },
        { header: "PEMILIK REKENING", key: "bankOwner", width: 25 },
        { header: "NAMA PELAKU USAHA", key: "fullName", width: 25 },
        { header: "NIK", key: "nik", width: 20 },
        { header: "NOMOR KK", key: "noKK", width: 20 },
        { header: "NO HP / WA", key: "phone", width: 16 },
        { header: "NAMA USAHA", key: "businessName", width: 25 },
        { header: "KATEGORI USAHA", key: "businessCategory", width: 18 },
        { header: "LOKASI USAHA", key: "businessLocation", width: 30 },
        { header: "PENGUSUL / KOORDINATOR", key: "coordinator", width: 25 },
        { header: "KECAMATAN", key: "kecamatan", width: 18 },
        { header: "KELURAHAN", key: "kelurahan", width: 18 },
        { header: "RT / RW", key: "rtRw", width: 10 },
        { header: "STATUS LPJ", key: "statusLpj", width: 20 },
        { header: "NOMINAL LPJ", key: "lpjNominal", width: 18 },
      ]

      worksheet.columns = headers

      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } }
      headerRow.height = 25
      headerRow.alignment = { vertical: "middle", horizontal: "center" }

      actors.forEach((actor, index) => {
        let statusLpj = "Belum Kirim ke LPJ"
        if (actor.lpjNominal && Number(actor.lpjNominal) > 0) {
          statusLpj = "Selesai LPJ"
        } else if (actor.readyForLPJ) {
          statusLpj = "Menunggu LPJ"
        }

        worksheet.addRow({
          no: index + 1,
          bankName: actor.bankName || "-",
          bankNumber: actor.bankNumber || "-",
          bankOwner: actor.bankOwner || "-",
          fullName: actor.fullName || "-",
          nik: actor.nik || "-",
          noKK: actor.noKK || "-",
          phone: actor.phone || "-",
          businessName: actor.businessName || "-",
          businessCategory: actor.businessCategory || "-",
          businessLocation: actor.businessLocation || "-",
          coordinator: actor.coordinator || "-",
          kecamatan: actor.kecamatan || "-",
          kelurahan: actor.kelurahan || "-",
          rtRw: actor.rtRw || "-",
          statusLpj,
          lpjNominal: actor.lpjNominal || 0,
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const nowStr = new Date().toISOString().split("T")[0]
      a.href = url
      a.download = `Data_Rekening_Bank_${nowStr}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)

      toast({ title: "✅ Export Berhasil", description: `${actors.length} data rekening berhasil di-export ke Excel.` })
    } catch (error: any) {
      console.error("Export Excel Exception:", error)
      toast({ variant: "destructive", title: "Gagal Export", description: error?.message || "Terjadi kesalahan saat membuat file Excel." })
    }
  }

  // ── Edit Data Rekening & Pribadi ──────────────────────────────────────────
  const handleSaveFullEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAdmin || !database || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    const lpjVal = formData.get("lpjNominal") as string
    const lpjNum = lpjVal ? parseInt(lpjVal) : viewingActor.lpjNominal || 0

    const updates: Partial<BusinessActor> = {
      fullName: formData.get("fullName") as string,
      nik: editNik,
      noKK: formData.get("noKK") as string,
      gender: formData.get("gender") as "Laki-laki" | "Perempuan",
      pobDob: `${editPob}, ${editDob}`,
      pob: editPob,
      dob: editDob,
      phone: formData.get("phone") as string,
      kecamatan: formData.get("kecamatan") as string,
      kelurahan: formData.get("kelurahan") as string,
      rtRw: formData.get("rtRw") as string,
      address: formData.get("address") as string,
      businessName: formData.get("businessName") as string,
      businessCategory: formData.get("businessCategory") as "Kuliner" | "Bukan Kuliner",
      businessLocation: formData.get("businessLocation") as string,
      coordinator: formData.get("coordinator") as string,
      bankName: formData.get("bankName") as string,
      bankNumber: formData.get("bankNumber") as string,
      bankOwner: formData.get("bankOwner") as string,
      lpjNominal: lpjNum,
    }

    updateDocumentNonBlocking(ref(database, `businessActors/${viewingActor.id}`), updates)

    import("@/lib/stats-service").then(({ updateStatsOnEdit }) => {
      updateStatsOnEdit(database, viewingActor, { ...viewingActor, ...updates }).catch(e => console.error(e))
    })

    toast({ title: "Tersimpan", description: "Data rekening pelaku usaha berhasil diperbarui." })
    setIsEditMode(false)
    setViewingActor({ ...viewingActor, ...updates } as BusinessActor)
  }

  // ── Revert ────────────────────────────────────────────────────────────────
  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    setRevertPending({ actorId, fullName })
    setShowRevertDialog(true)
  }

  const executeRevert = () => {
    if (!revertPending || !database) return
    const { actorId, fullName } = revertPending
    const actorObj = allActorsRaw?.find(a => a.id === actorId)

    const hasDinasData = actorObj?.surveyData || actorObj?.pejabatData || (actorObj as any)?.verifikatorDinas
    const newStatus = hasDinasData ? "verified_dinas" : "pending"

    const updates: any = {
      status: newStatus,
      bankName: null,
      bankNumber: null,
      bankOwner: null,
      readyForLPJ: false,
      lpjNominal: null,
    }

    if (hasDinasData) {
      updates.berkasDinasVerified = false
      updates.berkasDinasVerifiedAt = null
      updates.berkasDinasVerifiedBy = null
      updates.hasilVerifikasiDinas = "Lolos"
      updates.dikembalikanKeVerifikatorAt = new Date().toISOString()
      updates.dikembalikanKeVerifikatorBy = userProfile?.fullName || user?.email || user?.uid || "Administrator"
    }

    updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), updates)
    if (actorObj) {
      import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
        const updatedActor = { ...actorObj, ...updates }
        updateStatsOnStatusChange(database, actorObj, updatedActor, updatedActor).catch(e => console.error(e))
      })
    }
    toast({
      title: "Berhasil Dikembalikan",
      description: hasDinasData
        ? `Data ${fullName} berhasil dikembalikan ke antrean Verifikator Dinas.`
        : `Data ${fullName} dikembalikan ke antrean Pending.`
    })
    setViewingActor(null)
    setShowRevertDialog(false)
    setRevertPending(null)
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    setDeletePending({ actorId, fullName })
    setShowDeleteDialog(true)
  }

  const executeDelete = () => {
    if (!deletePending || !database) return
    const { actorId, fullName } = deletePending
    const actorObj = allActorsRaw?.find(a => a.id === actorId)
    deleteDocumentNonBlocking(ref(database, `businessActors/${actorId}`))
    if (actorObj) {
      import("@/lib/stats-service").then(({ updateStatsOnDelete }) => {
        updateStatsOnDelete(database, actorObj).catch(e => console.error(e))
      })
    }
    toast({ title: "Data Dihapus", description: `Data ${fullName} telah dihapus dari sistem.` })
    setViewingActor(null)
    setShowDeleteDialog(false)
    setDeletePending(null)
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-card/80 backdrop-blur sticky top-0 z-10 shrink-0">
        <SidebarTrigger />
        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" />
            <h1 className="font-black text-base md:text-lg uppercase text-emerald-700">Data Rekening</h1>
            <Badge className="bg-emerald-600 text-white font-black text-xs">{actors?.length ?? 0}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:ml-4">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama / NIK / no rek…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <select
              value={selectedBank}
              onChange={e => setSelectedBank(e.target.value)}
              className="h-8 text-xs px-2 rounded-md border border-input bg-background font-semibold"
            >
              <option value="">Semua Bank</option>
              {BANK_LIST.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="h-8 text-xs px-2 rounded-md border border-input bg-background"
            >
              <option value="">Semua Kategori</option>
              <option value="Kuliner">Kuliner</option>
              <option value="Bukan Kuliner">Bukan Kuliner</option>
            </select>
            {!isKoordinator && coordinatorList.length > 0 && (
              <select
                value={filterCoordinator}
                onChange={e => setFilterCoordinator(e.target.value)}
                className="h-8 text-xs px-2 rounded-md border border-input bg-background max-w-[160px] truncate"
              >
                <option value="">Semua Koordinator</option>
                {coordinatorList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            className="border-emerald-500 text-emerald-700 font-bold hover:bg-emerald-50 text-xs shrink-0"
            disabled={!actors || actors.length === 0}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Export Excel
          </Button>
        )}
      </header>

      {/* Ringkasan Statistik */}
      <div className="p-4 pb-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Total Rekening Terinput</p>
          <p className="text-xl md:text-2xl font-black text-emerald-900 mt-1">{statsSummary.total}</p>
        </div>
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Selesai LPJ (Final)</p>
          <p className="text-xl md:text-2xl font-black text-blue-900 mt-1">{statsSummary.lpjSelesai}</p>
        </div>
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Menunggu LPJ</p>
          <p className="text-xl md:text-2xl font-black text-amber-900 mt-1">{statsSummary.lpjProses}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Belum Diteruskan ke LPJ</p>
          <p className="text-xl md:text-2xl font-black text-slate-900 mt-1">{statsSummary.belumLpj}</p>
        </div>
      </div>

      {/* Card Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {actors?.slice(0, pageLimit).map(actor => {
                const hasLpj = !!actor.lpjNominal && Number(actor.lpjNominal) > 0
                const isLpjWaiting = actor.readyForLPJ && !hasLpj

                return (
                  <Card
                    key={actor.id}
                    className="cursor-pointer hover:shadow-lg hover:border-emerald-400 transition-all group border-emerald-100"
                    onClick={() => setViewingActor(actor)}
                  >
                    <CardContent className="p-3 flex flex-col gap-1.5 h-full">
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-tighter">
                            {actor.bankName || "BANK"}
                          </span>
                          {hasLpj ? (
                            <span className="text-[8px] font-black text-blue-700 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">
                              SELESAI LPJ
                            </span>
                          ) : isLpjWaiting ? (
                            <span className="text-[8px] font-black text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                              PROSES LPJ
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                              TERCATAT
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] font-black uppercase line-clamp-1 leading-tight text-emerald-950 group-hover:text-emerald-700" title={actor.bankOwner || actor.fullName}>
                          {actor.bankOwner || actor.fullName}
                        </p>
                        <p className="text-[11px] font-mono font-bold text-emerald-700 tracking-wider">
                          {actor.bankNumber || "-"}
                        </p>

                        <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[9px] text-muted-foreground space-y-0.5">
                          <p className="line-clamp-1 font-semibold uppercase text-slate-700" title={actor.businessName}>
                            {actor.businessName || "-"}
                          </p>
                          <p className="line-clamp-1 flex items-center gap-1" title={actor.fullName}>
                            <User className="w-2.5 h-2.5 shrink-0" /> {actor.fullName}
                          </p>
                          <p className="font-mono text-[8.5px]">
                            NIK: {actor.nik || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="text-[9px] font-black uppercase bg-emerald-600 text-white w-full justify-center shrink-0 mt-auto rounded-full py-0.5 px-2 flex items-center">
                        DETAIL REKENING
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {(!actors || actors.length === 0) && (
                <div className="col-span-full py-20 text-center text-muted-foreground grid place-items-center">
                  <CreditCard className="w-12 h-12 mb-4 opacity-20" />
                  <p>Tidak ada data rekening yang ditemukan.</p>
                </div>
              )}
            </div>

            {actors && actors.length > pageLimit && (
              <div className="p-4 flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => setPageLimit(prev => prev + 60)} 
                  className="font-bold border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                >
                  Tampilkan Lebih Banyak Data (+60)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!viewingActor} onOpenChange={(open) => {
        if (!open) { setViewingActor(null); setIsEditMode(false) }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingActor && (
            <div className="flex flex-col gap-2 relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-4">
                <DialogTitle className="text-xl md:text-2xl font-black text-emerald-700 uppercase">
                  {isEditMode ? "Edit Data Rekening & Pelaku Usaha" : "Detail Data Rekening"}
                </DialogTitle>
                <div className="flex flex-wrap gap-2">
                  {!isEditMode && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintActor(viewingActor)}
                      className="border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50"
                    >
                      <Printer className="w-4 h-4 mr-2" /> Cetak Lembar Rekening
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant={isEditMode ? "outline" : "default"}
                      size="sm"
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={cn("font-bold", isEditMode ? "border-amber-500 text-amber-600" : "bg-emerald-600 hover:bg-emerald-700 text-white")}
                    >
                      {isEditMode ? "Batal Edit" : <><Edit3 className="w-4 h-4 mr-2" />Edit Semua Data</>}
                    </Button>
                  )}
                  {isAdmin && !isEditMode && (
                    <Button size="sm" variant="outline" onClick={() => handleRevert(viewingActor.id, viewingActor.fullName)} className="border-amber-500 text-amber-600 font-bold" title="Kembalikan ke antrean awal">
                      <RotateCcw className="w-4 h-4 mr-1" /> <span className="md:hidden">Revert</span>
                    </Button>
                  )}
                  {isAdmin && !isEditMode && (
                    <Button size="sm" variant="outline" onClick={() => handleDelete(viewingActor.id, viewingActor.fullName)} className="border-red-500 text-red-600 font-bold hover:bg-red-50" title="Hapus Data">
                      <Trash2 className="w-4 h-4 mr-1" /> <span className="md:hidden">Hapus</span>
                    </Button>
                  )}
                </div>
              </div>

              {isEditMode ? (
                <form onSubmit={handleSaveFullEdit} className="grid gap-6 py-4">
                  {/* Bagian Perbankan Diutamakan */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-700 font-black text-sm uppercase border-b pb-1">
                      <CreditCard className="w-4 h-4" /> Data Perbankan (Edit)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase">Nama Bank</Label>
                        <Input name="bankName" defaultValue={viewingActor.bankName} required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase">Nomor Rekening</Label>
                        <Input name="bankNumber" defaultValue={viewingActor.bankNumber} required className="font-mono font-bold" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase">Pemilik Rekening</Label>
                        <Input name="bankOwner" defaultValue={viewingActor.bankOwner} required className="uppercase" />
                      </div>
                      <div className="space-y-1 md:col-span-3 pt-2">
                        <Label className="text-xs font-bold uppercase text-emerald-600">Nominal LPJ Terlaporkan</Label>
                        <Input name="lpjNominal" type="number" defaultValue={viewingActor.lpjNominal || 0} className="font-mono" />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1">
                      <User className="w-4 h-4" /> Informasi Pribadi (Edit)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase">Nama Lengkap</Label>
                        <Input name="fullName" defaultValue={viewingActor.fullName} required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase">NIK</Label>
                        <Input 
                          name="nik" 
                          value={editNik} 
                          required 
                          onChange={(e) => {
                            const clean = e.target.value.replace(/[^0-9]/g, "")
                            setEditNik(clean)
                            if (clean.length >= 12) {
                              const ex = extractDobFromNik(clean)
                              if (ex) setEditDob(ex)
                            } else setEditDob("")
                          }} 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase">Nomor KK</Label>
                        <Input name="noKK" defaultValue={viewingActor.noKK} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase">Jenis Kelamin</Label>
                        <select name="gender" defaultValue={viewingActor.gender || ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                          <option value="L">Laki-Laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase">Tempat Lahir</Label>
                        <Input name="pob" value={editPob} onChange={e => setEditPob(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase">Tanggal Lahir</Label>
                        <Input name="dob" value={editDob} readOnly className="bg-muted font-semibold" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase">Nomor HP</Label>
                        <Input name="phone" defaultValue={viewingActor.phone} />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1">
                      <MapPin className="w-4 h-4" /> Alamat &amp; Domisili (Edit)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Kecamatan</Label><Input name="kecamatan" defaultValue={viewingActor.kecamatan} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Kelurahan</Label><Input name="kelurahan" defaultValue={viewingActor.kelurahan} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">RT/RW</Label><Input name="rtRw" defaultValue={viewingActor.rtRw} /></div>
                      <div className="space-y-1 md:col-span-3"><Label className="text-xs font-bold uppercase">Alamat Lengkap</Label><Input name="address" defaultValue={viewingActor.address} /></div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1">
                      <Building2 className="w-4 h-4" /> Informasi Usaha (Edit)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nama Usaha</Label><Input name="businessName" defaultValue={viewingActor.businessName} required /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Kategori</Label><Input name="businessCategory" defaultValue={viewingActor.businessCategory} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Lokasi Usaha</Label><Input name="businessLocation" defaultValue={viewingActor.businessLocation} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Koordinator</Label><Input name="coordinator" defaultValue={viewingActor.coordinator} /></div>
                    </div>
                  </section>

                  <div className="sticky bottom-0 bg-white dark:bg-zinc-950 p-4 border-t flex justify-end gap-2 mt-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] rounded-b-lg z-10">
                    <Button type="button" variant="outline" onClick={() => setIsEditMode(false)} className="font-bold">Batal</Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</Button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-6 py-4">
                  {/* Card Data Rekening Teratas */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-700 font-black text-sm uppercase border-b pb-1">
                      <CreditCard className="w-4 h-4" /> Data Perbankan &amp; Status Rekening
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
                      {[
                        { label: "Nama Bank", value: viewingActor.bankName },
                        { label: "Nomor Rekening", value: viewingActor.bankNumber, isMono: true },
                        { label: "Nama Pemilik Rekening", value: viewingActor.bankOwner, isUpper: true },
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-emerald-800 uppercase">{item.label}</p>
                          <p className={cn("text-base font-black text-emerald-950", item.isMono && "font-mono text-lg text-emerald-800", item.isUpper && "uppercase")}>
                            {item.value || "BELUM TERISI"}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-muted/30 p-3 rounded-xl border flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Status Alur LPJ</p>
                          <p className="text-xs font-black uppercase text-slate-800 mt-0.5">
                            {viewingActor.lpjNominal && Number(viewingActor.lpjNominal) > 0 
                              ? "Sudah Menyelesaikan LPJ" 
                              : (viewingActor.readyForLPJ ? "Sedang Dalam Antrean LPJ" : "Belum Diteruskan ke LPJ")}
                          </p>
                        </div>
                        <Badge className={cn(
                          "font-black text-[10px]",
                          viewingActor.lpjNominal && Number(viewingActor.lpjNominal) > 0 ? "bg-blue-600" : (viewingActor.readyForLPJ ? "bg-amber-500" : "bg-slate-400")
                        )}>
                          {viewingActor.lpjNominal && Number(viewingActor.lpjNominal) > 0 ? "SELESAI" : (viewingActor.readyForLPJ ? "MENUNGGU" : "HOLD")}
                        </Badge>
                      </div>

                      <div className="bg-muted/30 p-3 rounded-xl border flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Nominal LPJ Terinput</p>
                          <p className="text-xs font-black font-mono text-emerald-700 mt-0.5">
                            Rp {Number(viewingActor.lpjNominal || 0).toLocaleString("id-ID")}
                          </p>
                        </div>
                        {viewingActor.lpjNominal && Number(viewingActor.lpjNominal) > 0 ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Informasi Pribadi */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1">
                      <User className="w-4 h-4" /> Informasi Pribadi Pelaku Usaha
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Nama Lengkap", value: viewingActor.fullName },
                        { label: "NIK", value: viewingActor.nik },
                        { label: "Nomor KK", value: viewingActor.noKK },
                        { label: "Jenis Kelamin", value: viewingActor.gender },
                        { label: "Tempat Lahir", value: viewingActor.pob || parsePobDob(viewingActor.pobDob).pob },
                        { label: "Tanggal Lahir", value: viewingActor.dob || parsePobDob(viewingActor.pobDob).dob },
                        { label: "Usia", value: calculateAge(viewingActor.dob || parsePobDob(viewingActor.pobDob).dob || extractDobFromNik(viewingActor.nik || "")) },
                        { label: "Nomor HP", value: viewingActor.phone, isPhone: true },
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          {(item as any).isPhone && item.value ? (
                            <a href={`https://wa.me/${String(item.value).replace(/\D/g, "").replace(/^0/, "62")}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-green-600 hover:underline flex items-center gap-1">
                              {item.value}
                            </a>
                          ) : (
                            <p className="text-sm font-bold">{item.value || "-"}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Alamat & Domisili */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1">
                      <MapPin className="w-4 h-4" /> Alamat &amp; Domisili
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Kecamatan", value: viewingActor.kecamatan },
                        { label: "Kelurahan", value: viewingActor.kelurahan },
                        { label: "RT/RW", value: viewingActor.rtRw },
                        { label: "Alamat Lengkap", value: viewingActor.address, fullWidth: true },
                      ].map((item, i) => (
                        <div key={i} className={item.fullWidth ? "md:col-span-3 space-y-1" : "space-y-1"}>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold">{item.value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Usaha */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1">
                      <Building2 className="w-4 h-4" /> Informasi Usaha &amp; Pengusul
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Nama Usaha", value: viewingActor.businessName },
                        { label: "Kategori Usaha", value: viewingActor.businessCategory },
                        { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                        { label: "Pengusul / Koordinator", value: viewingActor.coordinator },
                        { label: "Petugas Survey", value: viewingActor.petugasSurvey || "-" },
                      ].map((item: any, i: number) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold">{item.value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Audit Info */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1">
                      <History className="w-4 h-4" /> Informasi Pendaftaran &amp; Sistem
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl text-xs font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Status Terakhir</p>
                        <p className="capitalize text-primary">{viewingActor.status?.replace("_", " ")}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Petugas Input</p>
                        <p>{viewingActor.createdBy || "System"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Waktu Pendaftaran</p>
                        <p>{viewingActor.createdAt ? new Date(viewingActor.createdAt).toLocaleString("id-ID") : "-"}</p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={showRevertDialog}
        onOpenChange={(open) => { setShowRevertDialog(open); if (!open) setRevertPending(null) }}
        icon={<RotateCcw className="w-6 h-6" />}
        title="Kembalikan ke antrean awal?"
        description={`Kembalikan ${revertPending?.fullName || ""} ke antrean awal?`}
        confirmText="Ya, Kembalikan"
        confirmIcon={<RotateCcw className="w-4 h-4" />}
        variant="default"
        onConfirm={executeRevert}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) setDeletePending(null) }}
        icon={<Trash2 className="w-6 h-6" />}
        title="Hapus Permanen?"
        description={`HAPUS PERMANEN data ${deletePending?.fullName || ""}? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        variant="destructive"
        onConfirm={executeDelete}
      />
    </div>
  )
}
