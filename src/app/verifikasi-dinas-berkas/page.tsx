"use client"

import { useState, useMemo } from "react"
import { parsePobDob } from "@/lib/utils"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject } from "@/firebase"
import { ref } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { BusinessActor, PejabatData, PejabatItem } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { CheckDataIndicator } from "@/components/check-data-indicator"
import { 
  ShieldAlert, 
  Loader2, 
  Search, 
  Eye, 
  FileText, 
  User, 
  MapPin, 
  Building2, 
  CreditCard, 
  History, 
  ClipboardCheck,
  Check,
  Trash2,
  AlertTriangle,
  Folder,
  UserCheck,
  MessageCircle,
  Award,
  Briefcase,
  BadgeCheck,
  Filter,
  Users
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { formatTanggalIndonesia } from "@/lib/generate-berita-acara-pdf"

export default function VerifikasiDinasBerkasPage() {
  const { user, userProfile } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedVerifikatorFilter, setSelectedVerifikatorFilter] = useState<string>("ALL")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [verifyingActor, setVerifyingActor] = useState<BusinessActor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [checks, setChecks] = useState({ ktp: false, kk: false, nib: false, foto: false })
  const [showChecklist, setShowChecklist] = useState(false)

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isVerifikatorDinas = userProfile?.role === 'verifikator_dinas'
  const isPetugas = userProfile?.role === 'petugas_survey' || userProfile?.role === 'petugas'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'businessActors')
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  
  const master2023Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2023') : null, [database])
  const master2024Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2024') : null, [database])
  const master2025Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2025') : null, [database])
  const blacklistRef = useMemoFirebase(() => database ? ref(database, 'blacklist_data') : null, [database])
  const kuotaRef = useMemoFirebase(() => database ? ref(database, 'koordinator_kuotas') : null, [database])
  const systemUsersRef = useMemoFirebase(() => database ? ref(database, 'system_users') : null, [database])

  const { data: data2023 } = useList<any>(master2023Ref)
  const { data: data2024 } = useList<any>(master2024Ref)
  const { data: data2025 } = useList<any>(master2025Ref)
  const { data: dataBlacklist } = useList<any>(blacklistRef)
  const { data: kuotaData } = useList<any>(kuotaRef)
  const { data: systemUsers } = useList<any>(systemUsersRef)

  // Helper untuk mendapatkan PejabatData (Verifikator & Petugas) dari actor atau fallback system_users
  const getActorPejabat = (actor: BusinessActor): PejabatData | undefined => {
    if (actor.pejabatData?.verifikator?.nama) return actor.pejabatData
    if (actor.surveyData?.pejabatData?.verifikator?.nama) return actor.surveyData.pejabatData

    // Fallback: cari dari system_users berdasarkan petugasSurvey atau createdBy
    const petugasUpper = String(actor.petugasSurvey || actor.createdBy || "").toUpperCase().trim()
    if (petugasUpper && systemUsers) {
      const found = systemUsers.find((u: any) => 
        (u.fullName && String(u.fullName).toUpperCase().trim() === petugasUpper) ||
        (u.id && String(u.id).toUpperCase().trim() === petugasUpper)
      )
      if (found?.pejabatData?.verifikator?.nama) {
        return found.pejabatData
      }
    }
    return undefined
  }

  // Helper untuk mendapatkan Nama Verifikator yang diisi oleh Petugas Survey
  const getVerifikatorName = (actor: BusinessActor): string => {
    const pd = getActorPejabat(actor)
    if (pd?.verifikator?.nama && pd.verifikator.nama.trim()) {
      return pd.verifikator.nama.trim()
    }
    if (actor.verifikatorDinas && actor.verifikatorDinas.trim()) {
      return actor.verifikatorDinas.trim()
    }
    return "Belum Ditentukan"
  }

  // Filter hanya data yang lolos survey dinas dan belum diverifikasi berkas
  const actors = useMemo(() => {
    return allActorsRaw?.filter(a => a.status === 'verified_dinas' && a.hasilVerifikasiDinas === 'Lolos' && !(a as any).berkasDinasVerified)
  }, [allActorsRaw])

  // Daftar opsi Verifikator yang ada pada data
  const verifikatorOptions = useMemo(() => {
    if (!actors) return []
    const names = new Set<string>()
    actors.forEach(actor => {
      const vName = getVerifikatorName(actor)
      names.add(vName)
    })
    return Array.from(names).sort()
  }, [actors, systemUsers])

  // Filter berdasarkan search query dan pilihan verifikator
  const filteredActors = useMemo(() => {
    if (!actors) return []
    return actors.filter(actor => {
      const vName = getVerifikatorName(actor)
      
      // Filter Verifikator
      if (selectedVerifikatorFilter !== "ALL" && vName !== selectedVerifikatorFilter) {
        return false
      }

      // Filter Pencarian
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true

      const pd = getActorPejabat(actor)
      return (
        actor.fullName.toLowerCase().includes(q) ||
        actor.nik.includes(q) ||
        actor.businessName.toLowerCase().includes(q) ||
        (actor.kelurahan && actor.kelurahan.toLowerCase().includes(q)) ||
        (actor.coordinator && actor.coordinator.toLowerCase().includes(q)) ||
        (actor.petugasSurvey && actor.petugasSurvey.toLowerCase().includes(q)) ||
        vName.toLowerCase().includes(q) ||
        (pd?.verifikator?.nipppk && pd.verifikator.nipppk.includes(q)) ||
        (pd?.verifikator?.jabatan && pd.verifikator.jabatan.toLowerCase().includes(q))
      )
    })
  }, [actors, searchQuery, selectedVerifikatorFilter, systemUsers])

  // Mengelompokkan data berdasarkan Nama Verifikator yang diisi oleh Petugas Survey
  const groupedActorsByVerifikator = useMemo(() => {
    if (!filteredActors) return {}
    return filteredActors.reduce((acc, actor) => {
      const vName = getVerifikatorName(actor)
      if (!acc[vName]) {
        acc[vName] = {
          verifikatorInfo: getActorPejabat(actor)?.verifikator,
          actors: []
        }
      }
      // Update verifikator info jika sebelumnya belum lengkap
      if (!acc[vName].verifikatorInfo && getActorPejabat(actor)?.verifikator) {
        acc[vName].verifikatorInfo = getActorPejabat(actor)?.verifikator
      }
      acc[vName].actors.push(actor)
      return acc
    }, {} as Record<string, { verifikatorInfo?: PejabatItem; actors: BusinessActor[] }>)
  }, [filteredActors, systemUsers])

  const handleVerifyBerkas = () => {
    if (!verifyingActor || !database || (!isAdmin && !isVerifikatorDinas && !isPetugas)) return
    if (!checks.ktp || !checks.kk || !checks.nib || !checks.foto) return

    setIsSubmitting(true)

    const actorRef = ref(database, `businessActors/${verifyingActor.id}`)
    updateDocumentNonBlocking(actorRef, {
      berkasDinasVerified: true,
      berkasDinasVerifiedAt: new Date().toISOString(),
      berkasDinasVerifiedBy: user?.email || user?.uid || 'Admin'
    })

    logActivity({
      query: `VERIFIKASI BERKAS DINAS: ${verifyingActor.fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'VERIFIKASI BERKAS',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({ title: "Berhasil Diverifikasi", description: `Data pelaku usaha ${verifyingActor.fullName} telah diverifikasi berkas.` })
    setVerifyingActor(null)
    setChecks({ ktp: false, kk: false, nib: false, foto: false })
    setIsSubmitting(false)
  }

  const handleDeleteAll = () => {
    if (!database || !isAdmin || deleteConfirmText !== 'HAPUS SEMUA') return
    
    setIsDeletingAll(true)
    const pendingActors = actors || []
    let deletedCount = 0
    
    pendingActors.forEach((actor) => {
      const actorRef = ref(database, `businessActors/${actor.id}`)
      updateDocumentNonBlocking(actorRef, {
        status: 'dihapus_dinas',
        dihapusDinasAt: new Date().toISOString(),
        dihapusDinasBy: user?.email || user?.uid || 'Admin'
      })
      deletedCount++
    })

    logActivity({
      query: `HAPUS SEMUA DATA DARI MENU VERIFIKASI DINAS: ${deletedCount} data dihapus dari daftar`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'HAPUS DARI VERIFIKASI DINAS',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({ 
      title: "Data Berhasil Dihapus dari Daftar", 
      description: `${deletedCount} data pelaku usaha telah dihapus dari menu Verifikasi Dinas. Data tetap tersimpan di database.` 
    })
    setShowDeleteAllDialog(false)
    setDeleteConfirmText("")
    setIsDeletingAll(false)
  }

  if (!isAdmin && !isVerifikatorDinas && !isPetugas && !isAdminLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in-up duration-700">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-3xl font-bold text-primary font-headline">VERIFIKASI DINAS</h1>
            {filteredActors && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20 shadow-sm flex items-center gap-2">
                <span>Total Berkas:</span>
                <span className="bg-primary text-white px-2 py-0.5 rounded-full">{filteredActors.length}</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Data dikelompokkan berdasarkan <strong>Nama Verifikator</strong> yang diisi petugas survey pada Data Pejabat Berita Acara.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Dropdown Filter Verifikator */}
          {verifikatorOptions.length > 0 && (
            <div className="flex items-center gap-2 min-w-[200px]">
              <Select value={selectedVerifikatorFilter} onValueChange={setSelectedVerifikatorFilter}>
                <SelectTrigger className="h-11 rounded-xl border-purple-200 bg-purple-50/50 text-purple-900 font-semibold focus:ring-purple-500">
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="w-4 h-4 text-purple-600 shrink-0" />
                    <SelectValue placeholder="Pilih Verifikator" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="ALL" className="font-bold">
                    Semua Verifikator ({actors?.length || 0})
                  </SelectItem>
                  {verifikatorOptions.map((vName) => {
                    const count = actors?.filter(a => getVerifikatorName(a) === vName).length || 0
                    return (
                      <SelectItem key={vName} value={vName} className="font-medium">
                        {vName} ({count})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Search Input */}
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Cari Verifikator, Nama, NIK..."
              className="flex h-11 w-full rounded-xl border border-primary/20 bg-card px-3 py-2 pl-9 text-sm text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tombol Hapus Semua - Hanya Admin */}
          {isAdmin && filteredActors && filteredActors.length > 0 && (
            <Dialog open={showDeleteAllDialog} onOpenChange={(open) => { setShowDeleteAllDialog(open); if (!open) setDeleteConfirmText(""); }}>
              <DialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="h-11 gap-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 bg-red-600 hover:bg-red-700 font-bold shrink-0"
                  onClick={() => setShowDeleteAllDialog(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Hapus Semua Data</span>
                  <span className="sm:hidden">Hapus</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-red-600 uppercase flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6" /> Hapus Semua Data
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Tindakan ini akan menghapus semua data pelaku usaha yang berstatus <strong>verified_dinas</strong> secara permanen dan tidak dapat dibatalkan.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-sm font-bold uppercase">Peringatan!</span>
                    </div>
                    <p className="text-xs text-red-600">
                      Anda akan menghapus <strong className="text-red-800">{filteredActors?.length || 0} data</strong> pelaku usaha. Data yang sudah dihapus tidak dapat dikembalikan.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Ketik <span className="font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">HAPUS SEMUA</span> untuk konfirmasi:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Ketik HAPUS SEMUA"
                      className="flex h-11 w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button type="button" variant="ghost" onClick={() => { setShowDeleteAllDialog(false); setDeleteConfirmText(""); }}>
                    Batal
                  </Button>
                  <Button 
                    type="button"
                    disabled={deleteConfirmText !== 'HAPUS SEMUA' || isDeletingAll}
                    onClick={handleDeleteAll}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold min-w-[180px] gap-2"
                  >
                    {isDeletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Hapus {filteredActors?.length || 0} Data
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-primary w-10 h-10" />
        </div>
      ) : filteredActors?.length === 0 ? (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center py-20 text-muted-foreground bg-slate-50/50 rounded-3xl">
          <ClipboardCheck className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-bold uppercase tracking-widest text-xs">Tidak ada data untuk diverifikasi Dinas</p>
          {selectedVerifikatorFilter !== "ALL" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedVerifikatorFilter("ALL")}
              className="mt-4 text-xs font-bold rounded-xl"
            >
              Reset Filter Verifikator
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedActorsByVerifikator).sort().map(([verifikatorNama, group]) => {
            const vInfo = group.verifikatorInfo
            const isUnassigned = verifikatorNama === "Belum Ditentukan" || verifikatorNama === "Belum Ada Verifikator"

            return (
              <div key={verifikatorNama} className="space-y-6">
                {/* ─── HEADER GRUP VERIFIKATOR ──────────────────────────── */}
                <div className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isUnassigned 
                    ? "bg-amber-50/70 border-amber-200 text-amber-950" 
                    : "bg-gradient-to-r from-purple-50 via-indigo-50/60 to-white border-purple-200/80 text-purple-950"
                }`}>
                  <div className="flex items-start md:items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      isUnassigned ? "bg-amber-500 text-white" : "bg-purple-600 text-white"
                    }`}>
                      <BadgeCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isUnassigned ? "bg-amber-200/80 text-amber-800" : "bg-purple-200/80 text-purple-800"
                        }`}>
                          Verifikator Dinas
                        </span>
                        <h2 className="text-base md:text-lg font-black uppercase tracking-tight text-slate-900">
                          {verifikatorNama}
                        </h2>
                      </div>
                      
                      {/* Informasi NIPPPK, Pangkat, Jabatan Verifikator */}
                      {vInfo && (vInfo.nipppk || vInfo.pangkat || vInfo.jabatan) ? (
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 flex-wrap font-medium">
                          {vInfo.nipppk && (
                            <span className="flex items-center gap-1">
                              <span className="text-slate-400 font-bold">NIPPPK:</span> {vInfo.nipppk}
                            </span>
                          )}
                          {vInfo.pangkat && (
                            <span className="flex items-center gap-1">
                              <span className="text-slate-400 font-bold">•</span>
                              <span className="text-slate-400 font-bold">Pangkat:</span> {vInfo.pangkat}
                            </span>
                          )}
                          {vInfo.jabatan && (
                            <span className="flex items-center gap-1">
                              <span className="text-slate-400 font-bold">•</span>
                              <span className="text-slate-400 font-bold">Jabatan:</span> {vInfo.jabatan}
                            </span>
                          )}
                        </div>
                      ) : isUnassigned ? (
                        <p className="text-xs text-amber-700 mt-0.5">
                          Petugas survey belum mengisi data Verifikator pada Data Pejabat Berita Acara
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <strong>{group.actors.length}</strong> Berkas
                    </span>
                  </div>
                </div>

                {/* ─── GRID KARTU PELAKU USAHA ─────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.actors.map((actor) => {
                    const actorPejabat = getActorPejabat(actor)
                    const vDinas = actorPejabat?.verifikator || (actor.verifikatorDinas ? { nama: actor.verifikatorDinas } : null)

                    return (
                      <Card key={actor.id} className="group relative overflow-hidden border-slate-200/60 hover:border-primary/50 hover:shadow-2xl transition-all duration-500 rounded-[2rem] bg-white/80 backdrop-blur-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <CheckDataIndicator 
                            actor={actor} 
                            data2023={data2023}
                            data2024={data2024}
                            data2025={data2025}
                            dataBlacklist={dataBlacklist}
                          />
                        </div>
                        
                        <CardContent className="p-6">
                          <div className="flex flex-col h-full gap-4">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                                <User className="w-6 h-6" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-black text-slate-800 uppercase text-sm truncate" title={actor.fullName}>
                                  {actor.fullName}
                                </h3>
                                <p className="text-[10px] font-mono text-slate-500 mt-0.5 tracking-tighter">
                                  NIK: {actor.nik}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100">
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Usaha</span>
                                <p className="text-[11px] font-black text-slate-700 truncate uppercase">{actor.businessName}</p>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Kelurahan</span>
                                <p className="text-[11px] font-bold text-slate-600 truncate uppercase">{actor.kelurahan || "-"}</p>
                              </div>
                            </div>

                            {/* Section Info Aktor (USULAN, PETUGAS SURVEY, & VERIFIKATOR DINAS) */}
                            <div className="flex flex-col gap-2 mt-1">
                              <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                                {(() => {
                                  const found = kuotaData?.find((q: any) => (q.name || q.coordinator || "").toUpperCase().trim() === (actor.coordinator || "").toUpperCase().trim());
                                  const coordPhone = found?.phone || found?.noHp || found?.hp || "";
                                  const getWaLink = (phoneStr: string) => {
                                    if (!phoneStr) return "#";
                                    let clean = phoneStr.replace(/\D/g, "");
                                    if (clean.startsWith("0")) clean = "62" + clean.slice(1);
                                    else if (!clean.startsWith("62")) clean = "62" + clean;
                                    return `https://wa.me/${clean}`;
                                  };

                                  return (
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">USULAN</span>
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span className="text-[10px] font-black text-primary truncate uppercase" title={actor.coordinator || "Tanpa Korlap"}>
                                          {actor.coordinator || "Tanpa Korlap"}
                                        </span>
                                        {coordPhone && (
                                          <a
                                            href={getWaLink(coordPhone)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-0.5 text-emerald-600 hover:text-emerald-700 hover:scale-105 transition-all bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200/80 shrink-0"
                                            title={`Chat WA Usulan (${actor.coordinator}): ${coordPhone}`}
                                          >
                                            <MessageCircle className="w-3 h-3 text-emerald-600 fill-emerald-600/20" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}

                                <div className="flex flex-col min-w-0">
                                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">PETUGAS SURVEY</span>
                                  {actor.petugasSurvey && actor.petugasSurvey.trim() !== '-' && actor.petugasSurvey.trim() !== '' ? (
                                    <span className="text-[10px] font-black text-emerald-700 truncate uppercase flex items-center gap-1" title={actor.petugasSurvey}>
                                      <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span className="truncate">{actor.petugasSurvey}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-rose-500 uppercase flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                                      Belum Ada
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Badge Info Verifikator Dinas pada Kartu */}
                              <div className="bg-purple-50/70 border border-purple-100 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <BadgeCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-[8px] font-bold text-purple-600 uppercase tracking-tight">Verifikator Dinas</p>
                                    <p className="text-[10px] font-black text-purple-950 truncate uppercase" title={vDinas?.nama || verifikatorNama}>
                                      {vDinas?.nama || verifikatorNama}
                                    </p>
                                  </div>
                                </div>
                                {(vDinas as any)?.nipppk && (
                                  <span className="text-[9px] font-mono font-bold text-purple-700 bg-white px-1.5 py-0.5 rounded border border-purple-200 shrink-0">
                                    NIP: {(vDinas as any).nipppk}
                                  </span>
                                )}
                              </div>

                              <div className="flex gap-2 w-full pt-1">
                                {(isAdmin || isVerifikatorDinas || isPetugas) && (
                                  <Dialog open={!!verifyingActor && verifyingActor.id === actor.id} onOpenChange={(open) => {
                                    if (!open) {
                                      setVerifyingActor(null);
                                      setShowChecklist(false);
                                      setChecks({ ktp: false, kk: false, nib: false, foto: false });
                                    }
                                  }}>
                                    <DialogTrigger asChild>
                                      <Button size="sm" onClick={() => { setVerifyingActor(actor); setShowChecklist(false); }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all duration-300">
                                        <ClipboardCheck className="w-4 h-4 mr-2" /> Verifikasi Berkas
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className={`max-h-[95vh] overflow-y-auto transition-all duration-300 ${showChecklist ? 'max-w-[95vw] lg:max-w-7xl' : 'max-w-5xl'}`}>
                                      {verifyingActor && (() => {
                                        const modalPejabat = getActorPejabat(verifyingActor)

                                        return (
                                          <div className="flex flex-col lg:flex-row gap-6">
                                            {/* Kiri: Detail Pelaku Usaha */}
                                            <div className="flex flex-col flex-1">
                                              <DialogHeader>
                                                <DialogTitle className="text-2xl font-black text-primary uppercase flex items-center gap-2">
                                                  <FileText className="w-6 h-6" /> Detail Data & Hasil Survey
                                                </DialogTitle>
                                                <DialogDescription className="sr-only">Detail Pelaku Usaha</DialogDescription>
                                              </DialogHeader>
                                              
                                              <div className="grid gap-6 py-4">
                                                {/* DATA PEJABAT BERITA ACARA SURVEY */}
                                                <section className="space-y-3">
                                                  <div className="flex items-center gap-2 text-indigo-700 font-black text-sm uppercase border-b pb-1">
                                                    <BadgeCheck className="w-4 h-4" /> Data Pejabat Berita Acara Survey
                                                  </div>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {/* Kolom 1 - Verifikator Dinas */}
                                                    <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-1">
                                                      <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs uppercase">
                                                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">1</span>
                                                        Verifikator Dinas
                                                      </div>
                                                      <p className="text-xs font-black text-indigo-950 uppercase">{modalPejabat?.verifikator?.nama || getVerifikatorName(verifyingActor)}</p>
                                                      <div className="text-[11px] text-indigo-900/80 space-y-0.5">
                                                        <p><span className="text-slate-500">NIPPPK:</span> {modalPejabat?.verifikator?.nipppk || "-"}</p>
                                                        <p><span className="text-slate-500">Pangkat/Gol:</span> {modalPejabat?.verifikator?.pangkat || "-"}</p>
                                                        <p><span className="text-slate-500">Jabatan:</span> {modalPejabat?.verifikator?.jabatan || "-"}</p>
                                                      </div>
                                                    </div>

                                                    {/* Kolom 2 - Petugas Survey */}
                                                    <div className="bg-violet-50/60 p-3 rounded-xl border border-violet-100 space-y-1">
                                                      <div className="flex items-center gap-1.5 text-violet-700 font-bold text-xs uppercase">
                                                        <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
                                                        Petugas Survey
                                                      </div>
                                                      <p className="text-xs font-black text-violet-950 uppercase">{modalPejabat?.petugas?.nama || verifyingActor.petugasSurvey || "-"}</p>
                                                      <div className="text-[11px] text-violet-900/80 space-y-0.5">
                                                        <p><span className="text-slate-500">NIPPPK:</span> {modalPejabat?.petugas?.nipppk || "-"}</p>
                                                        <p><span className="text-slate-500">Pangkat/Gol:</span> {modalPejabat?.petugas?.pangkat || "-"}</p>
                                                        <p><span className="text-slate-500">Jabatan:</span> {modalPejabat?.petugas?.jabatan || "-"}</p>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </section>

                                                {/* INFORMASI PRIBADI */}
                                                <section className="space-y-4">
                                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                                                    {(() => {
                                                      const parsed = parsePobDob(verifyingActor.pobDob || "")
                                                      return [
                                                        { label: "Nama Lengkap", value: verifyingActor.fullName },
                                                        { label: "NIK", value: verifyingActor.nik },
                                                        { label: "Nomor KK", value: verifyingActor.noKK },
                                                        { label: "Jenis Kelamin", value: verifyingActor.gender },
                                                        { label: "Tempat Lahir", value: verifyingActor.pob || parsed.pob || "-" },
                                                        { label: "Tanggal Lahir", value: verifyingActor.dob || parsed.dob || "-" },
                                                        { label: "Nomor HP", value: verifyingActor.phone, isPhone: true }
                                                      ]
                                                    })().map((item, i) => (
                                                      <div key={i} className="space-y-1">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                                        {(item as any).isPhone && item.value ? (
                                                          <a
                                                            href={`https://wa.me/${String(item.value).replace(/\D/g, "").replace(/^0/, "62")}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs font-bold text-green-600 hover:text-green-700 hover:underline flex items-center gap-1"
                                                          >
                                                            {item.value}
                                                          </a>
                                                        ) : (
                                                          <p className="text-xs font-bold">{item.value || "-"}</p>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </section>

                                                {/* DATA HASIL SURVEY DINAS */}
                                                <section className="space-y-4">
                                                  <div className="flex items-center gap-2 text-emerald-600 font-black text-sm uppercase border-b pb-1"><ClipboardCheck className="w-4 h-4" /> Data Hasil Survey Dinas</div>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                                    {[
                                                      { label: "Tanggal Survey", value: verifyingActor.surveyData?.tanggalSurvey ? formatTanggalIndonesia(verifyingActor.surveyData.tanggalSurvey).fullText : "-" },
                                                      { label: "Nama Usaha", value: verifyingActor.surveyData?.namaUsaha },
                                                      { label: "Nama Pemilik", value: verifyingActor.surveyData?.namaPemilik },
                                                      { label: "Jenis Kelamin", value: verifyingActor.surveyData?.jenisKelamin },
                                                      { label: "Status", value: verifyingActor.surveyData?.status },
                                                      { label: "Alamat Rumah", value: verifyingActor.surveyData?.alamatRumah },
                                                      { label: "No HP", value: verifyingActor.surveyData?.noHp },
                                                      { label: "Email", value: verifyingActor.surveyData?.email },
                                                      { label: "Sosial Media", value: verifyingActor.surveyData?.sosmed },
                                                      { label: "DTKS", value: verifyingActor.surveyData?.dtks?.masuk ? `Ya (${verifyingActor.surveyData.dtks.jenis})` : 'Tidak' },
                                                      { label: "Bidang Usaha", value: verifyingActor.surveyData?.bidangUsaha },
                                                      { label: "Peralatan", value: verifyingActor.surveyData?.peralatan },
                                                      { label: "Tahun Berdiri", value: verifyingActor.surveyData?.tahunBerdiri },
                                                      { label: "Izin", value: verifyingActor.surveyData?.izin?.join(', ') },
                                                      { label: "Modal Usaha", value: verifyingActor.surveyData?.modalUsaha },
                                                      { label: "Omset", value: verifyingActor.surveyData?.omset },
                                                      { label: "Pernah Terima Hibah?", value: verifyingActor.surveyData?.hibah?.pernah ? `Ya (Dari: ${verifyingActor.surveyData.hibah.dariMana}, Tahun: ${verifyingActor.surveyData.hibah.tahun})` : 'Tidak' },
                                                      { label: "Rencana Penggunaan", value: verifyingActor.surveyData?.rencanaPenggunaan },
                                                      { label: "Hasil Survey", value: verifyingActor.surveyData?.hasilSurvey }
                                                    ].map((item, i) => (
                                                      <div key={i} className="space-y-1">
                                                        <p className="text-[10px] font-bold text-emerald-700/80 uppercase">{item.label}</p>
                                                        <p className="text-xs font-bold text-slate-800">{item.value || "-"}</p>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </section>

                                                {/* TITIK LOKASI & FOTO */}
                                                <section className="space-y-4">
                                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Titik Lokasi & Foto Survey</div>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-2">
                                                      <p className="text-[10px] font-bold text-slate-500 uppercase">Titik Lokasi Survey Dinas</p>
                                                      {verifyingActor.verificationLocationDinas ? (
                                                        <>
                                                          <p className="text-xs font-mono font-semibold">{verifyingActor.verificationLocationDinas.lat}, {verifyingActor.verificationLocationDinas.lon}</p>
                                                          <a href={`https://www.google.com/maps?q=${verifyingActor.verificationLocationDinas.lat},${verifyingActor.verificationLocationDinas.lon}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline inline-block mt-1">Buka di Google Maps</a>
                                                        </>
                                                      ) : (
                                                        <p className="text-xs font-medium text-slate-500">Belum ada titik lokasi yang direkam.</p>
                                                      )}
                                                    </div>
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-2 items-center justify-center">
                                                      <p className="text-[10px] font-bold text-slate-500 uppercase self-start">Foto Survey Dinas</p>
                                                      {verifyingActor.surveyData?.fotoSurveyUrl ? (
                                                        <img src={verifyingActor.surveyData.fotoSurveyUrl} alt="Foto Survey" className="max-h-[200px] object-contain rounded-lg border border-slate-200" />
                                                      ) : (
                                                        <p className="text-xs font-medium text-slate-500">Tidak ada foto.</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                </section>

                                                {verifyingActor.googleDriveLink && (
                                                  <section className="space-y-4">
                                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Folder className="w-4 h-4" /> Berkas Tambahan (Google Drive)</div>
                                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                      <div>
                                                        <p className="text-xs font-bold text-blue-800 uppercase">Folder Google Drive Pelaku Usaha</p>
                                                        <p className="text-[10px] font-medium text-blue-600 mt-1">Berisi foto, video, dokumen usulan, atau file lainnya</p>
                                                      </div>
                                                      <a href={verifyingActor.googleDriveLink} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold px-4 py-2.5 rounded-lg text-xs shadow flex items-center justify-center min-w-[140px]">
                                                        Buka Folder Drive
                                                      </a>
                                                    </div>
                                                  </section>
                                                )}
                                              </div>
                                              
                                              {!showChecklist && (
                                                <DialogFooter className="border-t pt-4">
                                                  <Button type="button" variant="ghost" onClick={() => setVerifyingActor(null)}>Tutup</Button>
                                                  <Button type="button" onClick={() => setShowChecklist(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                                                    Verifikasi Berkas <ClipboardCheck className="w-4 h-4 ml-2" />
                                                  </Button>
                                                </DialogFooter>
                                              )}
                                            </div>

                                            {/* Kanan: Checklist Berkas */}
                                            {showChecklist && (
                                              <div className="w-full lg:w-[400px] shrink-0 lg:border-l lg:pl-6 flex flex-col gap-4 animate-in slide-in-from-right-8 duration-300">
                                                <DialogHeader>
                                                  <DialogTitle className="text-xl font-black text-emerald-600 uppercase">Cek Kelengkapan Berkas</DialogTitle>
                                                  <DialogDescription>Pastikan 4 berkas ini lengkap.</DialogDescription>
                                                </DialogHeader>
                                                <div className="py-2 space-y-4">
                                                  <div className="flex flex-col gap-3">
                                                    <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                                                      <Checkbox id="ktp" checked={checks.ktp} onCheckedChange={(c) => setChecks(prev => ({...prev, ktp: !!c}))} />
                                                      <label htmlFor="ktp" className="text-sm font-semibold cursor-pointer select-none">KTP</label>
                                                    </div>
                                                    <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                                                      <Checkbox id="kk" checked={checks.kk} onCheckedChange={(c) => setChecks(prev => ({...prev, kk: !!c}))} />
                                                      <label htmlFor="kk" className="text-sm font-semibold cursor-pointer select-none">KK</label>
                                                    </div>
                                                    <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                                                      <Checkbox id="nib" checked={checks.nib} onCheckedChange={(c) => setChecks(prev => ({...prev, nib: !!c}))} />
                                                      <label htmlFor="nib" className="text-sm font-semibold cursor-pointer select-none">NIB</label>
                                                    </div>
                                                    <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                                                      <Checkbox id="foto" checked={checks.foto} onCheckedChange={(c) => setChecks(prev => ({...prev, foto: !!c}))} />
                                                      <label htmlFor="foto" className="text-sm font-semibold cursor-pointer select-none">Fhoto Pelaku Usaha</label>
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="mt-auto pt-4 border-t flex flex-col gap-2">
                                                  {checks.ktp && checks.kk && checks.nib && checks.foto ? (
                                                    <Button 
                                                      type="button" 
                                                      onClick={handleVerifyBerkas}
                                                      disabled={isSubmitting} 
                                                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                                    >
                                                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} BERHASIL VERIFIKASI
                                                    </Button>
                                                  ) : (
                                                    <Button type="button" disabled className="w-full bg-slate-200 text-slate-500 font-bold">
                                                      Ceklist 4 Berkas
                                                    </Button>
                                                  )}
                                                  <Button type="button" variant="ghost" className="w-full" onClick={() => setShowChecklist(false)}>Tutup Checklist</Button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })()}
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
