"use client"

import { useState, useMemo } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject } from "@/firebase"
import { ref } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
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
  Check
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function VerifikasiDinasPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [verifyingActor, setVerifyingActor] = useState<BusinessActor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)

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

  const actors = allActorsRaw?.filter(a => a.status === 'lpj_pending')

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

  const handleVerifyDinas = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!verifyingActor || !database || (!isAdmin && !isDinas && !isPetugas)) return

    if (!location) {
      toast({ variant: "destructive", title: "Lokasi belum diambil", description: "Harap ambil lokasi sebelum menyimpan keputusan verifikasi." })
      return;
    }

    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const hasilVerifikasi = formData.get("hasilVerifikasi") as string
    const keterangan = formData.get("keterangan") as string

    const actorRef = ref(database, `businessActors/${verifyingActor.id}`)
    updateDocumentNonBlocking(actorRef, {
      status: 'verified_dinas',
      hasilVerifikasiDinas: hasilVerifikasi,
      keteranganDinas: keterangan || "Tanpa keterangan tambahan",
      verificationLocationDinas: { lat: location.lat, lon: location.lon }
    })

    logActivity({
      query: `VERIFIKASI DINAS: ${verifyingActor.fullName} - ${hasilVerifikasi.toUpperCase()}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'VERIFIKASI DINAS',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({ title: "Berhasil Difinalisasi", description: `Data pelaku usaha telah di-update dengan hasil: ${hasilVerifikasi}.` })
    setVerifyingActor(null)
    setIsSubmitting(false)
  }

  if (!isAdmin && !isDinas && !isPetugas && !isAdminLoading) return <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center"><ShieldAlert className="w-16 h-16 text-destructive" /><h1 className="text-2xl font-bold">Akses Ditolak</h1></div>

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in-up duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-3xl font-bold text-primary font-headline">Verifikasi & Validasi Dinas</h1>
            {filteredActors && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20 shadow-sm flex items-center gap-2">
                <span>Total Data:</span>
                <span className="bg-primary text-white px-2 py-0.5 rounded-full">{filteredActors.length}</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Lakukan verifikasi tingkat dinas untuk data pelaku usaha yang telah diloloskan Admin.</p>
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

                          <div className="flex gap-2">
                            {/* Viewer Dialog */}
                            <Dialog open={!!viewingActor && viewingActor.id === actor.id} onOpenChange={(open) => !open && setViewingActor(null)}>
                              <DialogTrigger asChild>
                                <Button size="icon" variant="outline" onClick={() => setViewingActor(actor)} className="h-9 w-9 border-blue-100 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl shadow-sm transition-all duration-300" title="Lihat Detail">
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
                                      <DialogDescription className="sr-only">Detail Pelaku Usaha</DialogDescription>
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
                                          <div className="md:col-span-3 pt-2 border-t">
                                            <CheckDataIndicator 
                                              actor={viewingActor} 
                                              data2023={data2023}
                                              data2024={data2024}
                                              data2025={data2025}
                                              dataBlacklist={dataBlacklist}
                                            />
                                          </div>
                                        </div>
                                      </section>
    
                                      <section className="space-y-4">
                                        <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat & Domisili</div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                                          {[
                                            { label: "Kecamatan", value: viewingActor.kecamatan },
                                            { label: "Kelurahan", value: viewingActor.kelurahan },
                                            { label: "RT/RW", value: viewingActor.rtRw },
                                            { label: "Alamat", value: viewingActor.address, fullWidth: true }
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
                                            { label: "Usaha", value: viewingActor.businessName },
                                            { label: "Kategori Usaha", value: viewingActor.businessCategory },
                                            { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                                            { label: "KORLAP / DEWAN AKTIF", value: viewingActor.coordinator }
                                          ].map((item, i) => (
                                            <div key={i} className="space-y-1">
                                              <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                              <p className="text-xs font-bold">{item.value || "-"}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </section>
    
                                      <section className="space-y-4">
                                        <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Informasi Perbankan</div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                                          {[
                                            { label: "Nama Bank", value: viewingActor.bankName },
                                            { label: "Nomor Rekening", value: viewingActor.bankNumber },
                                            { label: "Nama Pemilik Rekening", value: viewingActor.bankOwner }
                                          ].map((item, i) => (
                                            <div key={i} className="space-y-1">
                                              <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                              <p className="text-xs font-black text-primary">{item.value || "BELUM TERISI"}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </section>
    
                                      <section className="space-y-4">
                                        <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Data Titik Lokasi Verifikasi</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {(viewingActor as any).verificationLocation && (
                                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                              <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Sumber: Verifikasi Admin</p>
                                              <p className="text-xs font-mono text-emerald-800 font-semibold">{(viewingActor as any).verificationLocation.lat}, {(viewingActor as any).verificationLocation.lon}</p>
                                              <a href={`https://www.google.com/maps?q=${(viewingActor as any).verificationLocation.lat},${(viewingActor as any).verificationLocation.lon}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline mt-2 inline-block">Lihat di Peta</a>
                                            </div>
                                          )}
                                          {(viewingActor as any).verificationBypass?.isBypassed && (
                                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                              <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Sumber: Verifikasi Admin (Bypass)</p>
                                              <p className="text-xs text-amber-800 font-medium">Alasan: {(viewingActor as any).verificationBypass.reason}</p>
                                            </div>
                                          )}
                                          {(viewingActor as any).verificationLocationDinas && (
                                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                              <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Sumber: Verifikasi Dinas</p>
                                              <p className="text-xs font-mono text-indigo-800 font-semibold">{(viewingActor as any).verificationLocationDinas.lat}, {(viewingActor as any).verificationLocationDinas.lon}</p>
                                              <a href={`https://www.google.com/maps?q=${(viewingActor as any).verificationLocationDinas.lat},${(viewingActor as any).verificationLocationDinas.lon}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline mt-2 inline-block">Lihat di Peta</a>
                                            </div>
                                          )}
                                          {!(viewingActor as any).verificationLocation && !(viewingActor as any).verificationLocationDinas && !(viewingActor as any).verificationBypass?.isBypassed && (
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-full">
                                              <p className="text-xs font-medium text-slate-500 text-center">Belum ada titik lokasi yang direkam.</p>
                                            </div>
                                          )}
                                        </div>
                                      </section>

                                      <section className="space-y-4">
                                        <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> Audit Sistem</div>
                                        <div className="bg-slate-50 p-4 rounded-xl text-[10px] font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border">
                                          <div className="space-y-1">
                                            <p className="text-muted-foreground uppercase">Status</p>
                                            <p className="text-primary">{(viewingActor.status || "").replace('_', ' ').toUpperCase()}</p>
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
                            
                            {/* Verifikasi Dinas Dialog */}
                            {(isAdmin || isDinas || isPetugas) && (
                              <Dialog open={!!verifyingActor && verifyingActor.id === actor.id} onOpenChange={(open) => !open && setVerifyingActor(null)}>
                                <DialogTrigger asChild>
                                  <Button size="icon" variant="outline" onClick={() => { setVerifyingActor(actor); setLocation(null); }} className="h-9 w-9 border-emerald-100 text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl shadow-sm transition-all duration-300" title="Verifikasi Dinas">
                                    <ClipboardCheck className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <form onSubmit={handleVerifyDinas}>
                                    <DialogHeader>
                                      <DialogTitle className="text-xl font-black text-emerald-600 uppercase">Verifikasi & Validasi Dinas</DialogTitle>
                                      <DialogDescription>Lakukan verifikasi tingkat dinas untuk data pelaku usaha yang telah diloloskan Admin.</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-6 space-y-4">
                                      <div className="space-y-2">
                                        <div className="text-sm font-semibold">Hasil Verifikasi</div>
                                        <Select name="hasilVerifikasi" required>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Pilih Hasil Verifikasi" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Lolos">Lolos</SelectItem>
                                            <SelectItem value="Tidak Lolos">Tidak Lolos</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="text-sm font-semibold">Keterangan / Alasan</div>
                                        <Textarea 
                                          name="keterangan" 
                                          placeholder="Masukkan alasan..." 
                                          className="min-h-[100px]" 
                                          required 
                                        />
                                      </div>
                                      
                                      <div className="space-y-3 pt-2">
                                        <div className="text-sm font-semibold flex items-center gap-2 text-primary">
                                          <MapPin className="w-4 h-4" /> Validasi Titik Lokasi (Wajib)
                                        </div>
                                        {location ? (
                                           <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                                             <div className="flex items-center gap-3">
                                               <div className="bg-emerald-100 p-2 rounded-lg">
                                                 <Check className="w-5 h-5 text-emerald-600" />
                                               </div>
                                               <div className="space-y-1">
                                                 <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Lokasi Tersimpan</p>
                                                 <p className="text-[10px] text-emerald-600 font-mono bg-emerald-100/50 px-2 py-0.5 rounded w-fit">
                                                   Lat: {location.lat.toFixed(6)}, Lon: {location.lon.toFixed(6)}
                                                 </p>
                                               </div>
                                             </div>
                                             <Button type="button" variant="outline" size="sm" onClick={fetchLocation} disabled={isFetchingLocation} className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-100">
                                               {isFetchingLocation ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Ubah Titik
                                             </Button>
                                           </div>
                                        ) : (
                                          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                                            <MapPin className="w-8 h-8 text-slate-400 mb-2" />
                                            <p className="text-xs font-medium text-slate-500 mb-4 text-center">Data titik lokasi wajib diambil untuk proses verifikasi dinas. Tidak dapat dibypass.</p>
                                            <Button type="button" onClick={fetchLocation} disabled={isFetchingLocation} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                                              {isFetchingLocation ? (
                                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sedang Mengambil...</>
                                              ) : "Ambil Lokasi Sekarang"}
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button type="button" variant="ghost" onClick={() => setVerifyingActor(null)}>Batal</Button>
                                      <Button type="submit" disabled={isSubmitting} className="min-w-[150px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardCheck className="w-4 h-4 mr-2" />} Simpan Keputusan
                                      </Button>
                                    </DialogFooter>
                                  </form>
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
