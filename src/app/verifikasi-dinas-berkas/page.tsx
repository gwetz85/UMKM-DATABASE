"use client"

import { useState, useMemo } from "react"
import { parsePobDob } from "@/lib/utils"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject } from "@/firebase"
import { ref } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { BusinessActor } from "../lib/types"
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
  Folder
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function VerifikasiDinasBerkasPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")
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

  const fetchLocation = () => {
    setIsFetchingLocation(true);

    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Geolocation tidak didukung", description: "Browser Anda tidak mendukung fitur lokasi." });
      setIsFetchingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setIsFetchingLocation(false);
        toast({ title: "Lokasi berhasil diambil", description: `Akurasi: ${pos.coords.accuracy ? Math.round(pos.coords.accuracy) + ' meter' : 'Tinggi'}` });
      },
      (err) => {
        setIsFetchingLocation(false);
        let errorMsg = err.message;
        if (err.code === err.PERMISSION_DENIED) errorMsg = "Izin akses lokasi ditolak. Izinkan akses lokasi di pengaturan browser Anda.";
        else if (err.code === err.POSITION_UNAVAILABLE) errorMsg = "Sinyal GPS tidak ditemukan. Harap gunakan perangkat HP/Smartphone atau pastikan GPS aktif.";
        else if (err.code === err.TIMEOUT) errorMsg = "Waktu habis mencari sinyal GPS. Harap gunakan perangkat HP/Smartphone di tempat terbuka.";
        
        toast({ variant: "destructive", title: "Gagal ambil lokasi akurat", description: errorMsg });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

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
  const isDinas = userProfile?.role === 'dinas'
  const isPetugas = userProfile?.role === 'petugas'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'businessActors')
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  
  const master2023Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2023') : null, [database])
  const master2024Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2024') : null, [database])
  const master2025Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2025') : null, [database])
  const blacklistRef = useMemoFirebase(() => database ? ref(database, 'blacklist_data') : null, [database])

  const { data: data2023 } = useList<any>(master2023Ref)
  const { data: data2024 } = useList<any>(master2024Ref)
  const { data: data2025 } = useList<any>(master2025Ref)
  const { data: dataBlacklist } = useList<any>(blacklistRef)

  const actors = allActorsRaw?.filter(a => a.status === 'verified_dinas' && a.hasilVerifikasiDinas === 'Lolos' && !(a as any).berkasDinasVerified)

  const filteredActors = actors?.filter(actor =>
    actor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    actor.nik.includes(searchQuery) ||
    actor.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedActors = useMemo(() => {
    if (!filteredActors) return {}
    return filteredActors.reduce((acc, actor) => {
      const kel = actor.kelurahan || "Lainnya"
      if (!acc[kel]) acc[kel] = []
      acc[kel].push(actor)
      return acc
    }, {} as Record<string, BusinessActor[]>)
  }, [filteredActors])

  const handleVerifyBerkas = () => {
    if (!verifyingActor || !database || (!isAdmin && !isDinas && !isPetugas)) return
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

    toast({ title: "Berhasil Diverifikasi", description: `Data pelaku usaha telah diverifikasi berkas.` })
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

  if (!isAdmin && !isDinas && !isPetugas && !isAdminLoading) return <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center"><ShieldAlert className="w-16 h-16 text-destructive" /><h1 className="text-2xl font-bold">Akses Ditolak</h1></div>

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in-up duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-3xl font-bold text-primary font-headline">VERIFIKASI DINAS</h1>
            {filteredActors && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20 shadow-sm flex items-center gap-2">
                <span>Total Data:</span>
                <span className="bg-primary text-white px-2 py-0.5 rounded-full">{filteredActors.length}</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Verifikasi kelengkapan berkas untuk data pelaku usaha yang telah lolos Survey Dinas.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Cari Nama, NIK, atau Usaha..."
              className="flex h-11 w-full rounded-md border border-primary/20 bg-card px-3 py-2 pl-9 text-sm text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                    Tindakan ini akan menghapus semua data pelaku usaha yang berstatus <strong>lpj_pending</strong> secara permanen dan tidak dapat dibatalkan.
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
        </Card>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedActors).sort().map(([kelurahan, actors]) => (
            <div key={kelurahan} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary bg-primary/5 px-6 py-2 rounded-full border border-primary/10 shadow-sm">
                  Kelurahan {kelurahan}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <span className="text-[10px] font-bold text-muted-foreground bg-white border px-3 py-1 rounded-full shadow-sm">
                  {actors.length} Data
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {actors.map((actor) => (
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

                        <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-100">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Usaha</span>
                            <p className="text-[11px] font-black text-slate-700 truncate uppercase">{actor.businessName}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Kategori</span>
                            <div className="flex">
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                                {actor.businessCategory}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Koordinator</span>
                            <span className="text-[10px] font-black text-primary truncate max-w-[120px] uppercase">
                              {actor.coordinator || "Tanpa Korlap"}
                            </span>
                          </div>

                          <div className="flex gap-2 w-full">
                            {(isAdmin || isDinas || isPetugas) && (
                              <Dialog open={!!verifyingActor && verifyingActor.id === actor.id} onOpenChange={(open) => {
                                if (!open) {
                                  setVerifyingActor(null);
                                  setShowChecklist(false);
                                  setChecks({ ktp: false, kk: false, nib: false, foto: false });
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button size="sm" onClick={() => { setVerifyingActor(actor); setShowChecklist(false); }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all duration-300">
                                    <ClipboardCheck className="w-4 h-4 mr-2" /> Verifikasi
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className={`max-h-[95vh] overflow-y-auto transition-all duration-300 ${showChecklist ? 'max-w-[95vw] lg:max-w-7xl' : 'max-w-5xl'}`}>
                                  {verifyingActor && (
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

                                          <section className="space-y-4">
                                            <div className="flex items-center gap-2 text-emerald-600 font-black text-sm uppercase border-b pb-1"><ClipboardCheck className="w-4 h-4" /> Data Hasil Survey Dinas</div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                              {[
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
                                              Verifikasi Data <ClipboardCheck className="w-4 h-4 ml-2" />
                                            </Button>
                                          </DialogFooter>
                                        )}
                                      </div>

                                      {/* Kanan: Checklist Berkas */}
                                      {showChecklist && (
                                        <div className="w-full lg:w-[400px] shrink-0 lg:border-l lg:pl-6 flex flex-col gap-4 animate-in slide-in-from-right-8 duration-300">
                                          <DialogHeader>
                                            <DialogTitle className="text-xl font-black text-emerald-600 uppercase">Cek Kelengkapan</DialogTitle>
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
                                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} BERHASIL
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
                                  )}
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
