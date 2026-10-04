"use client"

import React, { useState, useMemo } from "react"
import { useDatabase, useList, useMemoFirebase, useUser, useObject } from "@/firebase"
import { ref, update } from "firebase/database"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  ExternalLink,
  Search,
  Copy,
  Check,
  FileSpreadsheet,
  HelpCircle,
  Phone,
  User,
  Building2,
  MapPin,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Edit,
  ArrowRight,
  ShieldAlert,
  Info
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { BusinessActor } from "../lib/types"
import * as XLSX from "xlsx"

const PERISAI_PORTAL_URL = "https://perisai2.bpjsketenagakerjaan.go.id/"

export default function PerisaiPage() {
  const { user, userProfile } = useUser()
  const database = useDatabase()
  const router = useRouter()
  const { toast } = useToast()

  // 1. Role Protection: Admin & Staff only
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isStaff = userProfile?.role === 'staff'
  const hasAccess = isAdmin || isStaff

  // 2. Fetch Business Actors
  const actorsRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'businessActors')
  }, [database])
  const { data: allActors, isLoading: isActorsLoading } = useList<BusinessActor>(actorsRef)

  // 3. UI State
  const [activeTab, setActiveTab] = useState<"needs_registration" | "all" | "registered">("needs_registration")
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)
  const [kpjInput, setKpjInput] = useState("")
  const [statusInput, setStatusInput] = useState<"sesuai" | "ditolak">("sesuai")
  const [noteInput, setNoteInput] = useState("Didaftarkan via Agen Perisai")
  const [isSaving, setIsSaving] = useState(false)
  const [pageLimit, setPageLimit] = useState(50)

  // 4. Copy Helper
  const handleCopy = (text: string, key: string, label: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast({
      title: `${label} Disalin`,
      description: text,
      duration: 2000
    })
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev))
    }, 2000)
  }

  // 5. Copy Full Registration Template
  const handleCopyRegistrationFormat = (actor: BusinessActor) => {
    const formatted = `--- FORMAT PENDAFTARAN PERISAI BPJS TK ---
NIK: ${actor.nik || "-"}
Nama: ${actor.fullName || "-"}
No KK: ${actor.noKK || "-"}
TTL: ${actor.pobDob || "-"}
Jenis Kelamin: ${actor.gender || "-"}
No HP: ${actor.phone || "-"}
Alamat: ${actor.address || "-"}
Kelurahan: ${actor.kelurahan || "-"}
Kecamatan: ${actor.kecamatan || "-"}
Nama Usaha: ${actor.businessName || "-"}
Kategori: ${actor.businessCategory || "-"}
------------------------------------------`

    handleCopy(formatted, `format-${actor.id}`, "Format Pendaftaran")
  }

  // 6. Filter & Statistics
  const stats = useMemo(() => {
    if (!allActors) return { total: 0, needsReg: 0, registered: 0, rejected: 0 }
    let needsReg = 0
    let registered = 0
    let rejected = 0

    allActors.forEach(actor => {
      const isSesuai = actor.bpjsCheckStatus === 'sesuai' || (!!actor.bpjsKpj && actor.bpjsKpj.trim() !== '')
      const isDitolak = actor.bpjsCheckStatus === 'ditolak'

      if (isSesuai) registered++
      else if (isDitolak) rejected++
      else needsReg++
    })

    return {
      total: allActors.length,
      needsReg,
      registered,
      rejected
    }
  }, [allActors])

  const filteredActors = useMemo(() => {
    if (!allActors) return []
    const q = searchQuery.toLowerCase().trim()

    return allActors.filter(actor => {
      // Tab filter
      const isRegistered = actor.bpjsCheckStatus === 'sesuai' || (!!actor.bpjsKpj && actor.bpjsKpj.trim() !== '')
      if (activeTab === "needs_registration" && isRegistered) return false
      if (activeTab === "registered" && !isRegistered) return false

      // Search query filter
      if (!q) return true
      const nik = (actor.nik || "").toLowerCase()
      const name = (actor.fullName || "").toLowerCase()
      const business = (actor.businessName || "").toLowerCase()
      const kelurahan = (actor.kelurahan || "").toLowerCase()
      const kecamatan = (actor.kecamatan || "").toLowerCase()
      const phone = (actor.phone || "").toLowerCase()
      const kpj = (actor.bpjsKpj || "").toLowerCase()

      return (
        nik.includes(q) ||
        name.includes(q) ||
        business.includes(q) ||
        kelurahan.includes(q) ||
        kecamatan.includes(q) ||
        phone.includes(q) ||
        kpj.includes(q)
      )
    })
  }, [allActors, activeTab, searchQuery])

  // 7. Modal Handlers
  const handleOpenEdit = (actor: BusinessActor) => {
    setEditingActor(actor)
    setKpjInput(actor.bpjsKpj || "")
    setStatusInput(actor.bpjsCheckStatus === "ditolak" ? "ditolak" : "sesuai")
    setNoteInput(actor.bpjsCheckNote || actor.bpjsKeterangan || "Didaftarkan via Agen Perisai")
  }

  const handleSaveKpj = async () => {
    if (!editingActor || !database) return
    setIsSaving(true)
    try {
      const isSesuai = statusInput === "sesuai"
      const now = new Date().toISOString()
      const updates: Record<string, any> = {
        [`businessActors/${editingActor.id}/bpjsCheckStatus`]: isSesuai ? "sesuai" : "ditolak",
        [`businessActors/${editingActor.id}/bpjsSubmissionStatus`]: isSesuai ? "accepted" : "rejected",
        [`businessActors/${editingActor.id}/bpjsStatus`]: isSesuai ? "Y" : "T",
        [`businessActors/${editingActor.id}/bpjsKpj`]: kpjInput.trim(),
        [`businessActors/${editingActor.id}/bpjsKeterangan`]: noteInput.trim() || (isSesuai ? "Terdaftar Agen Perisai" : "Ditolak"),
        [`businessActors/${editingActor.id}/bpjsCheckNote`]: noteInput.trim() || (isSesuai ? "Terdaftar Agen Perisai" : "Ditolak"),
        [`businessActors/${editingActor.id}/bpjsCheckedAt`]: now
      }

      await update(ref(database), updates)

      toast({
        title: "Data BPJS Diperbarui",
        description: `Status pelaku usaha ${editingActor.fullName} berhasil disimpan.`,
      })
      setEditingActor(null)
    } catch (err: any) {
      toast({
        title: "Gagal Menyimpan",
        description: err.message || "Terjadi kesalahan saat menyimpan data.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 8. Excel Export
  const handleExportExcel = () => {
    if (!filteredActors || filteredActors.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Tidak ada data yang dapat diekspor saat ini.",
        variant: "destructive"
      })
      return
    }

    const rows = filteredActors.map((a, idx) => ({
      "NO": idx + 1,
      "NIK": a.nik || "",
      "NAMA LENGKAP": a.fullName || "",
      "NO KK": a.noKK || "",
      "TTL": a.pobDob || "",
      "JENIS KELAMIN": a.gender || "",
      "NO HP": a.phone || "",
      "NAMA USAHA": a.businessName || "",
      "KATEGORI USAHA": a.businessCategory || "",
      "ALAMAT": a.address || "",
      "KELURAHAN": a.kelurahan || "",
      "KECAMATAN": a.kecamatan || "",
      "STATUS BPJS": a.bpjsCheckStatus || "belum_dicek",
      "NOMOR KPJ": a.bpjsKpj || "",
      "KETERANGAN": a.bpjsCheckNote || a.bpjsKeterangan || ""
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Calon Peserta Perisai")

    const dateStr = new Date().toISOString().split("T")[0]
    XLSX.writeFile(wb, `Data_Calon_Peserta_Perisai_BPJS_${dateStr}.xlsx`)

    toast({
      title: "Ekspor Berhasil",
      description: `${rows.length} data berhasil diunduh ke Excel.`
    })
  }

  // Loading state
  if (isAdminLoading || isActorsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  // Access Denied guard
  if (!hasAccess) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <h1 className="text-2xl font-black font-headline">Perisai BPJS TK</h1>
        </div>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-6 h-6" />
              <CardTitle className="text-lg">Akses Terbatas</CardTitle>
            </div>
            <CardDescription className="text-red-700 dark:text-red-300">
              Halaman <strong>Perisai BPJS TK</strong> khusus diperuntukkan bagi pengguna dengan peran <strong>Administrator</strong> dan <strong>Staff</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600 dark:text-red-300 mb-4">
              Silakan hubungi Administrator sistem jika Anda memerlukan hak akses untuk mengelola pendaftaran peserta keagenan BPJS Ketenagakerjaan.
            </p>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-emerald-700 hover:bg-emerald-50 transition-colors" />
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 font-headline">
                Perisai BPJS TK
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            Pusat Integrasi & Layanan Agen Penggerak Jaminan Sosial Indonesia (BPJS Ketenagakerjaan)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGuideOpen(true)}
            className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
          >
            <HelpCircle className="w-4 h-4" />
            Panduan Alur Agen
          </Button>
          <Button
            asChild
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
          >
            <a href={PERISAI_PORTAL_URL} target="_blank" rel="noopener noreferrer">
              <span>Buka Portal Resmi Perisai 2</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* ─── Banner Portal Perisai ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              Sistem Portal Keagenan Resmi BPJS Ketenagakerjaan
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Akses Langsung Sistem Keagenan PERISAI 2
            </h2>
            <p className="text-sm text-emerald-50 leading-relaxed">
              Daftarkan pelaku usaha sektor Bukan Penerima Upah (BPU), terbitkan nomor KPJ, dan cetak kode bayar EPS langsung melalui portal resmi. Gunakan data di bawah ini untuk kemudahan input data tanpa kesalahan.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <Button
              asChild
              className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold shadow-md"
            >
              <a href={PERISAI_PORTAL_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Masuk ke Perisai 2
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/bpjs")}
              className="bg-transparent border-white/40 text-white hover:bg-white/10 font-semibold"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Verifikasi BPJS (Sheet 5)
            </Button>
          </div>
        </div>

        {/* Browser Notice */}
        <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2 text-xs text-emerald-100">
          <Info className="w-4 h-4 shrink-0 text-emerald-200" />
          <span>
            Portal Perisai mewajibkan peramban <strong>Google Chrome Desktop</strong>. Petugas dapat menyandingkan jendela portal di sebelah aplikasi SIMPU untuk proses salin data cepat.
          </span>
        </div>
      </div>

      {/* ─── Statistik ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Pelaku Usaha</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.total.toLocaleString("id-ID")}</p>
            <p className="text-[11px] text-muted-foreground">Basis data pendaftar SIMPU</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">Perlu Didaftarkan</p>
            <p className="text-2xl font-black text-amber-800 dark:text-amber-300">{stats.needsReg.toLocaleString("id-ID")}</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">Belum memiliki status / KPJ</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Terdaftar / Sesuai</p>
            <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300">{stats.registered.toLocaleString("id-ID")}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Sudah ada KPJ / aktif BPJS</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wider">Ditolak / Belum Memenuhi</p>
            <p className="text-2xl font-black text-red-800 dark:text-red-300">{stats.rejected.toLocaleString("id-ID")}</p>
            <p className="text-[11px] text-red-600 dark:text-red-400">Tidak memenuhi kriteria</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Panel Kerja Data Pelaku Usaha ─── */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Data Pelaku Usaha untuk Pendaftaran Perisai
              </CardTitle>
              <CardDescription>
                Salin NIK, Nama, dan data profil pelaku usaha untuk diinput ke portal Perisai, lalu simpan nomor KPJ yang terbit.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="gap-2 font-semibold border-slate-300 dark:border-slate-700"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Ekspor Excel ({filteredActors.length})
              </Button>
            </div>
          </div>

          {/* Tab Filter & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 mt-3">
            <Tabs
              value={activeTab}
              onValueChange={(val: any) => setActiveTab(val)}
              className="w-full md:w-auto"
            >
              <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
                <TabsTrigger value="needs_registration" className="font-semibold text-xs">
                  Perlu Didaftarkan ({stats.needsReg})
                </TabsTrigger>
                <TabsTrigger value="all" className="font-semibold text-xs">
                  Semua Data ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="registered" className="font-semibold text-xs">
                  Sudah Terdaftar ({stats.registered})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari NIK, Nama, No HP, Usaha..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-sm h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                  <TableHead className="text-xs font-bold">NIK & Nama Lengkap</TableHead>
                  <TableHead className="text-xs font-bold">Usaha & Kategori</TableHead>
                  <TableHead className="text-xs font-bold">Wilayah & Kontak</TableHead>
                  <TableHead className="text-xs font-bold">Status BPJS / KPJ</TableHead>
                  <TableHead className="text-right text-xs font-bold pr-6">Aksi Petugas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-slate-400" />
                        <p className="font-medium text-sm">Tidak ada data pelaku usaha yang sesuai filter.</p>
                        {searchQuery && (
                          <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                            Reset Pencarian
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActors.slice(0, pageLimit).map((actor, idx) => {
                    const isSesuai = actor.bpjsCheckStatus === "sesuai" || (!!actor.bpjsKpj && actor.bpjsKpj.trim() !== "")
                    const isDitolak = actor.bpjsCheckStatus === "ditolak"

                    return (
                      <TableRow key={actor.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                        <TableCell className="text-center text-xs font-mono text-muted-foreground">
                          {idx + 1}
                        </TableCell>

                        {/* NIK & Nama */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                {actor.nik || "-"}
                              </span>
                              {actor.nik && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(actor.nik, `nik-${actor.id}`, "NIK")}
                                  className="text-muted-foreground hover:text-emerald-600 transition-colors"
                                  title="Salin NIK"
                                >
                                  {copiedKey === `nik-${actor.id}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {actor.fullName || "-"}
                              </span>
                              {actor.fullName && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(actor.fullName, `name-${actor.id}`, "Nama")}
                                  className="text-muted-foreground hover:text-emerald-600 transition-colors"
                                  title="Salin Nama"
                                >
                                  {copiedKey === `name-${actor.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {actor.gender || "-"} • TTL: {actor.pobDob || "-"}
                            </div>
                          </div>
                        </TableCell>

                        {/* Usaha */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {actor.businessName || "-"}
                            </div>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {actor.businessCategory || "UMKM"}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Wilayah & Kontak */}
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[180px]">
                                {actor.kelurahan || "-"}, {actor.kecamatan || "-"}
                              </span>
                            </div>
                            {actor.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="font-mono text-[11px]">{actor.phone}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(actor.phone, `phone-${actor.id}`, "No HP")}
                                  className="text-muted-foreground hover:text-emerald-600 transition-colors ml-1"
                                  title="Salin No HP"
                                >
                                  {copiedKey === `phone-${actor.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Status BPJS */}
                        <TableCell>
                          <div className="space-y-1">
                            {isSesuai ? (
                              <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-xs font-bold">Terdaftar</span>
                              </div>
                            ) : isDitolak ? (
                              <div className="flex items-center gap-1 text-red-700 dark:text-red-400">
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-xs font-bold">Ditolak</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-xs font-semibold">Belum Terdaftar</span>
                              </div>
                            )}

                            {actor.bpjsKpj ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                                  KPJ: {actor.bpjsKpj}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(actor.bpjsKpj || "", `kpj-${actor.id}`, "Nomor KPJ")}
                                  className="text-muted-foreground hover:text-emerald-600"
                                  title="Salin KPJ"
                                >
                                  {copiedKey === `kpj-${actor.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">Belum ada KPJ</p>
                            )}
                          </div>
                        </TableCell>

                        {/* Aksi Petugas */}
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1 border-slate-200 dark:border-slate-800 hover:border-emerald-300"
                              onClick={() => handleCopyRegistrationFormat(actor)}
                              title="Salin semua data untuk pendaftaran di portal"
                            >
                              {copiedKey === `format-${actor.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600 font-bold">Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3 h-3" />
                                  <span>Salin Format</span>
                                </>
                              )}
                            </Button>

                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              onClick={() => handleOpenEdit(actor)}
                            >
                              <Edit className="w-3 h-3" />
                              <span>Update KPJ</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination / Load More */}
          {filteredActors.length > pageLimit && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageLimit(prev => prev + 50)}
                className="text-xs font-semibold"
              >
                Muat Lebih Banyak ({filteredActors.length - pageLimit} data tersisa)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Modal Update KPJ & Status BPJS ─── */}
      <Dialog open={!!editingActor} onOpenChange={open => !open && setEditingActor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Update Status & Nomor KPJ
            </DialogTitle>
            <DialogDescription>
              Masukkan nomor KPJ yang terbit dari portal Perisai atau perbarui status kepesertaan.
            </DialogDescription>
          </DialogHeader>

          {editingActor && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-1 text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {editingActor.fullName}
                </div>
                <div className="text-muted-foreground font-mono">
                  NIK: {editingActor.nik}
                </div>
                <div className="text-muted-foreground">
                  Usaha: {editingActor.businessName} ({editingActor.kelurahan})
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nomor KPJ (Kartu Peserta Jamsostek)
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: 21012345678"
                  value={kpjInput}
                  onChange={e => setKpjInput(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Nomor kepesertaan yang terbit setelah pendaftaran BPU berhasil.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Status Verifikasi
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={statusInput === "sesuai" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusInput("sesuai")}
                    className={statusInput === "sesuai" ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex-1" : "flex-1"}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Terdaftar / Sesuai
                  </Button>
                  <Button
                    type="button"
                    variant={statusInput === "ditolak" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setStatusInput("ditolak")}
                    className="flex-1"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Ditolak
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Catatan / Keterangan
                </label>
                <Input
                  type="text"
                  placeholder="Catatan pendaftaran..."
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingActor(null)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveKpj}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal Panduan Alur Agen Perisai ─── */}
      <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-600" />
              Panduan Alur Pendaftaran Agen Perisai
            </DialogTitle>
            <DialogDescription>
              Tahapan integrasi pendaftaran pelaku usaha ke portal BPJS Ketenagakerjaan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                1
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Pilih Data Pelaku Usaha
                </p>
                <p className="text-muted-foreground">
                  Gunakan tab <strong>"Perlu Didaftarkan"</strong> untuk melihat warga/pelaku UMKM yang belum memiliki kepesertaan BPJS Ketenagakerjaan.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Salin Data (1-Click Copy)
                </p>
                <p className="text-muted-foreground">
                  Klik tombol <strong>"Salin Format"</strong> atau salin NIK dan Nama langsung untuk mempercepat pengisian formulir tanpa risiko salah ketik.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Buka Portal Resmi Perisai 2
                </p>
                <p className="text-muted-foreground">
                  Klik tombol <strong>"Buka Portal Resmi Perisai 2"</strong> (pastikan membuka dengan Google Chrome), lalu login dengan akun Agen Perisai Anda.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                4
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Pendaftaran BPU & Terbitkan Billing
                </p>
                <p className="text-muted-foreground">
                  Masuk ke menu Pendaftaran Peserta BPU, tempel NIK, pilih program (JKK + JKM), lalu generate kode bayar/billing EPS.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                5
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Simpan Nomor KPJ ke SIMPU
                </p>
                <p className="text-muted-foreground">
                  Setelah KPJ terbit, kembali ke halaman SIMPU ini dan klik <strong>"Update KPJ"</strong> pada baris data bersangkutan. Status otomatis menjadi Terdaftar!
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={() => setIsGuideOpen(false)}
            >
              Saya Mengerti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
