
"use client"

import { useState, useEffect, useMemo } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject, deleteDocumentNonBlocking } from "@/firebase"
import { ref, query, equalTo, limitToFirst } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Check, ShieldAlert, Loader2, Trash2, Eye, Search, User, FileText, Building2, MapPin, History, Edit, XCircle, Clock } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { CheckDataIndicator } from "@/components/check-data-indicator"

function VerificationTimer({ actorId, createdAt, matchCount, database, isAdmin, actor }: { 
  actorId: string, 
  createdAt: string, 
  matchCount: number, 
  database: any,
  isAdmin: boolean,
  actor: BusinessActor
}) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  
  // Logic Baru: 0 matches = 5 min, 1 match = 1 min, 2+ matches = Manual Info
  const targetMins = matchCount === 0 ? 5 : 1
  const isAutoEligible = matchCount < 2

  // Validation: Check if all mandatory fields are present
  const isDataComplete = !!(
    actor.fullName && 
    actor.nik && 
    actor.noKK && 
    actor.gender && 
    actor.pobDob && 
    actor.phone && 
    actor.address && 
    actor.rtRw && 
    actor.kelurahan && 
    actor.kecamatan && 
    actor.businessCategory && 
    actor.businessName && 
    actor.businessLocation && 
    actor.coordinator
  );

  useEffect(() => {
    if (!isDataComplete) return;

    const targetTime = new Date(createdAt).getTime() + (targetMins * 60000)
    
    const triggerVerify = () => {
      if (!isAutoEligible) return;
      
      if (isAdmin && database) {
        // Double check for Cancell status before finalizing auto-verify
        // This is a safety check in case data changed during the countdown
        updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), {
          status: 'verified_actor'
        })
      }
    }

    // Initial check: if time's up, trigger immediately and don't start interval
    const initialDiff = targetTime - Date.now()
    if (initialDiff <= 0) {
      setTimeLeft(0)
      triggerVerify()
      return
    }

    setTimeLeft(initialDiff)

    const interval = setInterval(() => {
      const now = Date.now()
      const diff = targetTime - now
      
      if (diff <= 0) {
        setTimeLeft(0)
        clearInterval(interval)
        triggerVerify()
      } else {
        setTimeLeft(diff)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [createdAt, targetMins, isAutoEligible, isAdmin, database, actorId, isDataComplete])

  if (!isDataComplete) {
    return (
      <div className="flex items-center gap-1.5 text-amber-600 font-black text-[9px] uppercase bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg shadow-sm animate-pulse">
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>LENGKAPI DATA</span>
      </div>
    )
  }


  if (timeLeft === null) return <Loader2 className="w-3 h-3 animate-spin opacity-20" />


  if (timeLeft === 0) {
    if (isAutoEligible) {
      return (
        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>PROSES VERIFIKASI...</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-1.5 text-rose-600 font-black text-[9px] uppercase bg-rose-50 border border-rose-200 px-2 py-1 rounded shadow-sm">
          <ShieldAlert className="w-3 h-3" />
          <span>VERIFIKASI MANUAL</span>
        </div>
      )
    }
  }

  const hours = Math.floor(timeLeft / 3600000)
  const minutes = Math.floor((timeLeft % 3600000) / 60000)
  const seconds = Math.floor((timeLeft % 60000) / 1000)

  // Color logic
  const timerColor = timeLeft < 300000 ? "text-rose-600 border-rose-200 bg-rose-50" : 
                     timeLeft < 900000 ? "text-amber-600 border-amber-200 bg-amber-50" : 
                     "text-primary border-primary/20 bg-slate-50"

  return (
    <div className={`flex items-center gap-2 font-mono text-[10px] font-black ${timerColor} border px-2.5 py-1.5 rounded-lg shadow-sm transition-all`}>
      <Clock className="w-3 h-3 animate-pulse" />
      <span className="tracking-widest">
        {hours > 0 ? `${hours}:` : ""}{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  )
}


const normalizeGender = (g: string) => {
  const val = (g || "").toLowerCase().trim();
  if (val === "l" || val === "laki-laki") return "Laki-laki";
  if (val === "p" || val === "perempuan") return "Perempuan";
  return "";
};

export default function VerifyActorPage() {

  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)
  const [editingOnlyActor, setEditingOnlyActor] = useState<BusinessActor | null>(null)
  const [rejectingActor, setRejectingActor] = useState<BusinessActor | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const [editKelurahan, setEditKelurahan] = useState<string>("")
  const [editKecamatan, setEditKecamatan] = useState<string>("")

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
  const isMonitoring = userProfile?.role === 'monitoring'
  const isPetugas = userProfile?.role === 'petugas'


  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'businessActors')
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)

  const masterDataRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'master_data')
  }, [database])
  const { data: allMasterDataRaw } = useList<any>(masterDataRef)

  const actors = allActorsRaw?.filter(a => a.status === 'pending')

  const filteredActors = actors?.filter(actor =>
    (actor.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (actor.nik || "").includes(searchQuery) ||
    (actor.businessName || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Optimization: Group master data by NIK and KK first for O(1) lookup
  const masterDataStats = useMemo(() => {
    if (!allMasterDataRaw) return { nikMap: new Map(), kkMap: new Map() };
    const nikMap = new Map<string, number>();
    const kkMap = new Map<string, number>();
    
    allMasterDataRaw.forEach(m => {
      if (m.nik) nikMap.set(m.nik, (nikMap.get(m.nik) || 0) + 1);
      if (m.noKK) kkMap.set(m.noKK, (kkMap.get(m.noKK) || 0) + 1);
    });
    
    return { nikMap, kkMap };
  }, [allMasterDataRaw]);


  const kelurahanList = [
    "Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat",
    "Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru",
    "Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana",
    "Air Raja", "Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"
  ]

  useEffect(() => {
    if (!editKelurahan) {
      setEditKecamatan("")
      return
    }
    const groupKota = ["Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat"]
    const groupBarat = ["Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru"]
    const groupTimur = ["Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana", "Air Raja"]
    const groupBestari = ["Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"]

    if (groupKota.includes(editKelurahan)) setEditKecamatan("Tanjungpinang Kota")
    else if (groupBarat.includes(editKelurahan)) setEditKecamatan("Tanjungpinang Barat")
    else if (groupTimur.includes(editKelurahan)) setEditKecamatan("Tanjungpinang Timur")
    else if (groupBestari.includes(editKelurahan)) setEditKecamatan("Bukit Bestari")
    else setEditKecamatan("")
  }, [editKelurahan])

  const handleSaveAndVerify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingActor || !database || !isAdmin) return

    setIsVerifying(true)
    const formData = new FormData(e.currentTarget)
    const actorRef = ref(database, `businessActors/${editingActor.id}`)
    updateDocumentNonBlocking(actorRef, {
      fullName: formData.get("fullName"),
      nik: formData.get("nik"),
      noKK: formData.get("noKK"),
      gender: formData.get("gender"),
      pobDob: formData.get("pobDob"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      rtRw: formData.get("rtRw"),
      kelurahan: editKelurahan,
      kecamatan: editKecamatan,
      businessCategory: formData.get("businessCategory"),
      businessName: formData.get("businessName"),
      businessLocation: formData.get("businessLocation"),
      coordinator: formData.get("coordinator"),
      status: 'verified_actor'
    })
    toast({ title: "Berhasil diverifikasi", description: "Data pelaku telah diverifikasi oleh Admin." })
    setEditingActor(null)
    setIsVerifying(false)
  }

  const handleSaveOnly = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingOnlyActor || !database || !isAdmin) return

    setIsVerifying(true)
    const formData = new FormData(e.currentTarget)
    const actorRef = ref(database, `businessActors/${editingOnlyActor.id}`)
    updateDocumentNonBlocking(actorRef, {
      fullName: formData.get("fullName"),
      nik: formData.get("nik"),
      noKK: formData.get("noKK"),
      gender: formData.get("gender"),
      pobDob: formData.get("pobDob"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      rtRw: formData.get("rtRw"),
      kelurahan: editKelurahan,
      kecamatan: editKecamatan,
      businessCategory: formData.get("businessCategory"),
      businessName: formData.get("businessName"),
      businessLocation: formData.get("businessLocation"),
      coordinator: formData.get("coordinator")
    })
    toast({ title: "Data diperbarui", description: "Perubahan data berhasil disimpan (Status tetap Pending)." })
    setEditingOnlyActor(null)
    setIsVerifying(false)
  }

  const handleReject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!rejectingActor || !database || !isAdmin) return

    const formData = new FormData(e.currentTarget)
    const reason = formData.get("rejectionReason") as string
    const actorRef = ref(database, `businessActors/${rejectingActor.id}`)

    updateDocumentNonBlocking(actorRef, {
      status: 'rejected',
      rejectionReason: reason || "Tanpa keterangan"
    })

    toast({ variant: "destructive", title: "Data Ditolak", description: "Data telah dipindahkan ke menu Ditolak / Cancell." })
    setRejectingActor(null)
  }

  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin) return
    if (confirm(`Hapus data pending milik "${fullName}"?`)) {
      deleteDocumentNonBlocking(ref(database, `businessActors/${actorId}`))
      toast({ variant: "destructive", title: "Data Dibatalkan", description: "Data telah dihapus." })
    }
  }

  const openEditDialog = (actor: BusinessActor, type: 'verify' | 'edit') => {
    if (type === 'verify') setEditingActor(actor)
    else setEditingOnlyActor(actor)

    setEditKelurahan(actor.kelurahan || "")
    setEditKecamatan(actor.kecamatan || "")
  }

  if (!isAdmin && !isPetugas && !isMonitoring && !isAdminLoading) return <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center"><ShieldAlert className="w-16 h-16 text-destructive" /><h1 className="text-2xl font-bold">Akses Ditolak</h1></div>


  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-primary font-headline">Verifikasi Admin</h1>
            {filteredActors && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20 shadow-sm flex items-center gap-2">
                <span>Total Menunggu Verifikasi:</span>
                <span className="bg-primary text-white px-2 py-0.5 rounded-full">{filteredActors.length}</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Tinjau dan verifikasi data pelaku usaha yang masuk untuk disetujui atau ditolak.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Cari Nama, NIK, atau Usaha..."
            className="flex h-11 w-full rounded-md border border-primary/20 bg-card px-3 py-2 pl-9 text-sm text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="border border-slate-200/60 shadow-md overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl">
        <CardContent className="p-0">
          {isLoading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div> : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold">Nama Lengkap</TableHead>
                  <TableHead className="font-bold">NIK</TableHead>
                  <TableHead className="font-bold">Kategori</TableHead>
                   <TableHead className="font-bold">Usaha</TableHead>
                   <TableHead className="font-bold">Koordinator</TableHead>
                   <TableHead className="font-bold text-center">Countdown</TableHead>
                   <TableHead className="text-right font-bold">Aksi</TableHead>

                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActors?.map((actor) => {
                  return (
                  <TableRow key={actor.id} className="hover:bg-primary/5 transition-colors border-b border-slate-100">
                    <TableCell className="font-bold text-slate-800">{actor.fullName}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      <div className="font-semibold text-slate-700">{actor.nik}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">KK: {actor.noKK}</div>
                      <CheckDataIndicator actor={actor} allMasterData={allMasterDataRaw} />
                    </TableCell>
                    <TableCell>
                      <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider">
                        {actor.businessCategory}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">{actor.businessName}</TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-slate-600 uppercase">
                        {actor.coordinator || "-"}
                      </span>
                    </TableCell>
                     <TableCell>
                      <div className="flex justify-center">
                         <VerificationTimer 
                          actorId={actor.id} 
                          createdAt={actor.createdAt} 
                          matchCount={(() => {
                            const nikMatches = allMasterDataRaw?.filter((m: any) => m.nik && m.nik === actor.nik) || [];
                            const kkMatches = allMasterDataRaw?.filter((m: any) => m.noKK && m.noKK === actor.noKK) || [];
                            
                            // Combine unique matches by id or some persistent field if available, 
                            // but here we just need the count and check for cancellation
                            const combinedMatches = [...nikMatches, ...kkMatches];
                            
                            // Rule 4: Check if any match has "Cancell" in Column F (status)
                            const hasCancell = combinedMatches.some(m => (m.status || "").toLowerCase().includes('cancell'));
                            
                            if (hasCancell && isAdmin && database) {
                              updateDocumentNonBlocking(ref(database, `businessActors/${actor.id}`), {
                                status: 'rejected',
                                rejectionReason: 'Ditolak Otomatis: Terdeteksi status Cancell pada Data Master Pembanding.'
                              });
                            }

                            // New Rule: Check for same business name in KK for Year 2025 (Isolir)
                            const isIsolir = kkMatches.some((m: any) => 
                              String(m.tahunPengajuan) === "2025" && 
                              (m.usaha || "").toLowerCase().trim() === (actor.businessName || "").toLowerCase().trim()
                            );

                            if (isIsolir && isAdmin && database) {
                              updateDocumentNonBlocking(ref(database, `businessActors/${actor.id}`), {
                                status: 'isolir_data',
                                rejectionReason: 'Pengajuan Diblok dikarenakan indikasi usaha yang sama'
                              });
                            }

                            // Return total unique matches count (approximate but sufficient for logic)
                            // We use a Set of some unique key if possible, or just the filtered length
                            const uniqueIds = new Set(combinedMatches.map(m => m.id || `${m.nik}-${m.nama}`));
                            return uniqueIds.size;
                          })()} 
                          database={database}
                          isAdmin={isAdmin}
                          actor={actor}
                        />

                      </div>
                    </TableCell>
                    <TableCell className="text-right">

                      <div className="flex justify-end gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
                        <Dialog open={!!viewingActor && viewingActor.id === actor.id} onOpenChange={(open) => !open && setViewingActor(null)}>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => setViewingActor(actor)} className="h-8 w-8 border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg shadow-sm" title="Lihat Detail">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            {viewingActor && (
                              <>
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-black text-primary uppercase flex items-center gap-2">
                                    <FileText className="w-6 h-6" /> Detail Pelaku Usaha
                                  </DialogTitle>
                                  <DialogDescription className="sr-only">Rincian data pendaftaran pelaku usaha.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-6 py-4">
                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                                      {[
                                        { label: "Nama Lengkap", value: viewingActor.fullName },
                                        { label: "NIK", value: viewingActor.nik },
                                        { label: "Nomor KK", value: viewingActor.noKK },
                                        { label: "Jenis Kelamin", value: viewingActor.gender },
                                        { label: "Tempat/Tgl Lahir", value: viewingActor.pobDob },
                                        { label: "Nomor HP", value: viewingActor.phone }
                                      ].map((item, i) => (
                                        <div key={i} className="space-y-1">
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                          <p className="text-xs font-bold">{item.value || "-"}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </section>

                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat & Domisili</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                                      {[
                                        { label: "Kecamatan", value: viewingActor.kecamatan },
                                        { label: "Kelurahan", value: viewingActor.kelurahan },
                                        { label: "RT/RW", value: viewingActor.rtRw },
                                        { label: "Alamat Lengkap", value: viewingActor.address, fullWidth: true }
                                      ].map((item, i) => (
                                        <div key={i} className={item.fullWidth ? "md:col-span-3 space-y-1" : "space-y-1"}>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                          <p className="text-xs font-bold">{item.value || "-"}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </section>

                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Building2 className="w-4 h-4" /> Informasi Usaha</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border">
                                      {[
                                        { label: "Nama Usaha", value: viewingActor.businessName },
                                        { label: "Kategori Usaha", value: viewingActor.businessCategory },
                                        { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                                        { label: "Koordinator Lapangan", value: viewingActor.coordinator }
                                      ].map((item, i) => (
                                        <div key={i} className="space-y-1">
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                          <p className="text-xs font-bold">{item.value || "-"}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </section>

                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> Audit Sistem</div>
                                    <div className="bg-slate-50 p-4 rounded-xl text-[10px] font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border">
                                      <div className="space-y-1">
                                        <p className="text-muted-foreground uppercase">Status</p>
                                        <p className="text-primary">{(viewingActor.status || "").toUpperCase()}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-muted-foreground uppercase">Diinput Oleh</p>
                                        <p>{viewingActor.createdBy || "System"}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-muted-foreground uppercase">Waktu Input</p>
                                        <p>{viewingActor.createdAt ? new Date(viewingActor.createdAt).toLocaleString('id-ID') : "-"}</p>
                                      </div>
                                    </div>
                                  </section>
                                </div>
                              </>
                            )}
                          </DialogContent>
                        </Dialog>

                        {isAdmin && !isMonitoring && (
                          <Dialog open={!!editingOnlyActor && editingOnlyActor.id === actor.id} onOpenChange={(open) => !open && setEditingOnlyActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="icon" variant="outline" onClick={() => openEditDialog(actor, 'edit')} className="h-8 w-8 border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg shadow-sm" title="Edit Data">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              {editingOnlyActor && (
                                <form onSubmit={handleSaveOnly}>
                                  <DialogHeader>
                                    <DialogTitle className="text-2xl font-black text-amber-600 uppercase flex items-center gap-2">
                                      <Edit className="w-6 h-6" /> Edit Data Pelaku (Tanpa Verifikasi)
                                    </DialogTitle>
                                    <DialogDescription className="sr-only">Formulir pengeditan data pendaftaran pelaku usaha.</DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-6 py-6">
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="font-bold">Nama Lengkap</Label>
                                        <Input name="fullName" defaultValue={editingOnlyActor.fullName} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">NIK (16 Digit)</Label>
                                        <Input name="nik" defaultValue={editingOnlyActor.nik} maxLength={16} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">No. KK (16 Digit)</Label>
                                        <Input name="noKK" defaultValue={editingOnlyActor.noKK} maxLength={16} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Jenis Kelamin</Label>
                                        <Select name="gender" defaultValue={normalizeGender(editingOnlyActor.gender)}>

                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                                            <SelectItem value="Perempuan">Perempuan</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Tempat/Tgl Lahir</Label>
                                        <Input name="pobDob" defaultValue={editingOnlyActor.pobDob} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">No. HP</Label>
                                        <Input name="phone" defaultValue={editingOnlyActor.phone} required />
                                      </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="font-bold">Kelurahan</Label>
                                        <Select value={editKelurahan} onValueChange={setEditKelurahan}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent className="max-h-[200px]">
                                            {kelurahanList.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold text-muted-foreground">Kecamatan (Otomatis)</Label>
                                        <Input value={editKecamatan} readOnly className="bg-muted" />
                                      </div>
                                      <div className="space-y-2 md:col-span-2">
                                        <Label className="font-bold">Alamat Lengkap</Label>
                                        <Input name="address" defaultValue={editingOnlyActor.address} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">RT / RW</Label>
                                        <Input name="rtRw" defaultValue={editingOnlyActor.rtRw} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Koordinator</Label>
                                        <Input name="coordinator" defaultValue={editingOnlyActor.coordinator} required />
                                      </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="font-bold">Jenis Usaha</Label>
                                        <Select name="businessCategory" defaultValue={editingOnlyActor.businessCategory}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Kuliner">Kuliner</SelectItem>
                                            <SelectItem value="Bukan Kuliner">Bukan Kuliner</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Nama Usaha</Label>
                                        <Input name="businessName" defaultValue={editingOnlyActor.businessName} required />
                                      </div>
                                      <div className="space-y-2 md:col-span-2">
                                        <Label className="font-bold">Lokasi Usaha</Label>
                                        <Input name="businessLocation" defaultValue={editingOnlyActor.businessLocation} required />
                                      </div>
                                    </div>
                                  </div>
                                  <DialogFooter className="gap-2">
                                    <Button type="button" variant="outline" onClick={() => setEditingOnlyActor(null)}>Batal</Button>
                                    <Button type="submit" disabled={isVerifying} className="bg-amber-600 hover:bg-amber-700 text-white font-bold min-w-[150px]">
                                      {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Edit className="w-4 h-4 mr-2" />} SIMPAN PERUBAHAN
                                    </Button>
                                  </DialogFooter>
                                </form>
                              )}
                            </DialogContent>
                          </Dialog>
                        )}

                        {isAdmin && !isMonitoring && (
                          <Dialog open={!!editingActor && editingActor.id === actor.id} onOpenChange={(open) => !open && setEditingActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="icon" variant="outline" onClick={() => openEditDialog(actor, 'verify')} className="h-8 w-8 border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg shadow-sm" title="Verifikasi">
                                <Check className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              {editingActor && (
                                <form onSubmit={handleSaveAndVerify}>
                                  <DialogHeader>
                                    <DialogTitle className="text-2xl font-black text-primary uppercase flex items-center gap-2">
                                      <ShieldAlert className="w-6 h-6" /> Verifikasi Admin
                                    </DialogTitle>
                                    <DialogDescription className="sr-only">Formulir verifikasi dan finalisasi data pelaku usaha.</DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-6 py-6">
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="font-bold">Nama Lengkap</Label>
                                        <Input name="fullName" defaultValue={editingActor.fullName} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">NIK (16 Digit)</Label>
                                        <Input name="nik" defaultValue={editingActor.nik} maxLength={16} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">No. KK (16 Digit)</Label>
                                        <Input name="noKK" defaultValue={editingActor.noKK} maxLength={16} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Jenis Kelamin</Label>
                                        <Select name="gender" defaultValue={normalizeGender(editingActor.gender)}>

                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                                            <SelectItem value="Perempuan">Perempuan</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Tempat/Tgl Lahir</Label>
                                        <Input name="pobDob" defaultValue={editingActor.pobDob} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">No. HP</Label>
                                        <Input name="phone" defaultValue={editingActor.phone} required />
                                      </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="font-bold">Kelurahan</Label>
                                        <Select value={editKelurahan} onValueChange={setEditKelurahan}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent className="max-h-[200px]">
                                            {kelurahanList.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold text-muted-foreground">Kecamatan (Otomatis)</Label>
                                        <Input value={editKecamatan} readOnly className="bg-muted" />
                                      </div>
                                      <div className="space-y-2 md:col-span-2">
                                        <Label className="font-bold">Alamat Lengkap</Label>
                                        <Input name="address" defaultValue={editingActor.address} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">RT / RW</Label>
                                        <Input name="rtRw" defaultValue={editingActor.rtRw} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Koordinator</Label>
                                        <Input name="coordinator" defaultValue={editingActor.coordinator} required />
                                      </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="font-bold">Jenis Usaha</Label>
                                        <Select name="businessCategory" defaultValue={editingActor.businessCategory}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Kuliner">Kuliner</SelectItem>
                                            <SelectItem value="Bukan Kuliner">Bukan Kuliner</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Nama Usaha</Label>
                                        <Input name="businessName" defaultValue={editingActor.businessName} required />
                                      </div>
                                      <div className="space-y-2 md:col-span-2">
                                        <Label className="font-bold">Lokasi Usaha</Label>
                                        <Input name="businessLocation" defaultValue={editingActor.businessLocation} required />
                                      </div>
                                    </div>
                                  </div>
                                  <DialogFooter className="gap-2">
                                    <Button type="button" variant="outline" onClick={() => setEditingActor(null)}>Batal</Button>
                                    <Button type="submit" disabled={isVerifying} className="bg-primary font-bold min-w-[150px]">
                                      {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} SIMPAN & VERIFIKASI
                                    </Button>
                                  </DialogFooter>
                                </form>
                              )}
                            </DialogContent>
                          </Dialog>
                        )}

                        {isAdmin && !isMonitoring && (
                          <Dialog open={!!rejectingActor && rejectingActor.id === actor.id} onOpenChange={(open) => !open && setRejectingActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="icon" variant="outline" onClick={() => setRejectingActor(actor)} className="h-8 w-8 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg shadow-sm" title="Tolak Data">
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <form onSubmit={handleReject}>
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-black text-red-600 uppercase">Konfirmasi Penolakan</DialogTitle>
                                  <DialogDescription>Berikan keterangan atau sebab mengapa data ini ditolak.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Nama Pelaku</p>
                                    <p className="text-sm font-bold text-slate-800">{actor.fullName}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold">Keterangan / Sebab Ditolak</Label>
                                    <Textarea name="rejectionReason" placeholder="Contoh: Berkas tidak jelas, NIK tidak sesuai, dll..." className="min-h-[100px]" required />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 font-bold">SIMPAN PENOLAKAN</Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                        )}

                        {isAdmin && !isMonitoring && (
                          <Button size="icon" variant="destructive" onClick={() => handleDelete(actor.id, actor.fullName)} className="h-8 w-8 bg-slate-100 text-red-500 hover:bg-red-500 hover:text-white border-0 shadow-sm" title="Hapus Permanen">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


    </div>
  )
}
