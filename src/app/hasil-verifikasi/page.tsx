"use client"

import { useState, useMemo } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, useObject } from "@/firebase"
import { ref } from "firebase/database"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShieldAlert, Loader2, Eye, Search, User, FileText, Building2, MapPin, History, BadgeCheck, XSquare, CreditCard, ChevronRight, MessageCircle } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { BusinessActor } from "../lib/types"
import { updateDocumentNonBlocking } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckDataIndicator } from "@/components/check-data-indicator"
import { VerificationBadge } from "@/components/verification-badge"
import { cn, parsePobDob } from "@/lib/utils"
import { logActivity, getDeviceType } from "@/lib/logger"

const BANK_LIST = [
  "BCA", "BNI", "BRI", "BRK", "MANDIRI", "PANIN", "OCBC", "DANAMON", "BUKOPIN", "BTN"
]

export default function HasilVerifikasiPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [inputtingBankActor, setInputtingBankActor] = useState<BusinessActor | null>(null)
  const [isSubmittingBank, setIsSubmittingBank] = useState(false)

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
  const isPetugas = userProfile?.role === 'petugas_survey' || userProfile?.role === 'petugas'
  const isKoordinator = userProfile?.role === 'koordinator'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'businessActors')
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  
  const master2023Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2023') : null, [database])
  const master2024Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2024') : null, [database])
  const master2025Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2025') : null, [database])
  const blacklistRef = useMemoFirebase(() => database ? ref(database, 'blacklist_data') : null, [database])
  const kuotaRef = useMemoFirebase(() => database ? ref(database, 'kuotaKoordinator') : null, [database])

  const { data: data2023 } = useList<any>(master2023Ref)
  const { data: data2024 } = useList<any>(master2024Ref)
  const { data: data2025 } = useList<any>(master2025Ref)
  const { data: dataBlacklist } = useList<any>(blacklistRef)
  const { data: kuotaData } = useList<any>(kuotaRef)

  const actors = allActorsRaw ? allActorsRaw.filter(a => {
    if (a.status !== 'verified_dinas' || a.hasilVerifikasiDinas !== 'Lolos' || !(a as any).berkasDinasVerified) return false;
    if (isPetugas) {
      if (!userProfile?.fullName) return false;
      const userPetugasUpper = String(userProfile.fullName).toUpperCase().trim();
      const actorPetugasUpper = String(a.petugasSurvey || a.createdBy || "").toUpperCase().trim();
      return actorPetugasUpper === userPetugasUpper;
    }
    if (isKoordinator) {
      if (!a.coordinator || !userProfile?.fullName) return false;
      return a.coordinator.toLowerCase() === userProfile.fullName.toLowerCase();
    }
    return true;
  }) : []

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

  const handleInputBank = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!inputtingBankActor || !database) return

    setIsSubmittingBank(true)
    const formData = new FormData(e.currentTarget)
    const updates = {
      status: 'finish',
      readyForLPJ: false,
      bankName: formData.get('bankName') as string,
      bankNumber: formData.get('bankNumber') as string,
      bankOwner: formData.get('bankOwner') as string,
    }

    const actorRef = ref(database, `businessActors/${inputtingBankActor.id}`)
    updateDocumentNonBlocking(actorRef, updates)

    import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
      updateStatsOnStatusChange(database, 'verified_dinas', 'finish', { id: inputtingBankActor.id }).catch(e => console.error(e));
    });

    logActivity({
      query: `INPUT REKENING (HASIL VERIFIKASI): ${inputtingBankActor.fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'HASIL VERIFIKASI',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({ title: "Data Diselesaikan", description: "Data telah dipindahkan ke menu Rekening Bank." })
    setInputtingBankActor(null)
    setIsSubmittingBank(false)
  }

  if (!isAdmin && !isPetugas && !isKoordinator && !isAdminLoading) return <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center"><ShieldAlert className="w-16 h-16 text-destructive" /><h1 className="text-2xl font-bold">Akses Ditolak</h1></div>

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-3xl font-bold text-primary font-headline">HASIL VERIFIKASI</h1>
            {filteredActors && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20 shadow-sm flex items-center gap-2">
                <span>Total Data Selesai diverifikasi Dinas:</span>
                <span className="bg-primary text-white px-2 py-0.5 rounded-full">{filteredActors.length}</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Daftar pelaku usaha yang telah melewati tahapan verifikasi dan validasi dinas.</p>
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
          <BadgeCheck className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-bold uppercase tracking-widest text-xs">Belum ada data hasil verifikasi Dinas</p>
        </Card>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px] font-black uppercase text-[10px] text-center text-slate-500">No</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-slate-500">Pelaku Usaha</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-slate-500">Informasi Usaha</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-center text-slate-500">Keputusan</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-slate-500">Koordinator</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-right text-slate-500 pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActors.map((actor, index) => (
                  <TableRow key={actor.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="text-center font-bold text-slate-400 text-xs">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 uppercase text-sm leading-tight">{actor.fullName}</span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">{actor.nik}</span>
                        <div className="mt-1">
                          <CheckDataIndicator 
                            actor={actor} 
                            data2023={data2023}
                            data2024={data2024}
                            data2025={data2025}
                            dataBlacklist={dataBlacklist}
                            showText={false}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-[11px] uppercase">{actor.businessName}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-bold">{actor.businessCategory}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full uppercase border",
                        actor.hasilVerifikasiDinas === 'Lolos' 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-red-50 text-red-700 border-red-200"
                      )}>
                        {actor.hasilVerifikasiDinas === 'Lolos' ? "LOLOS" : "TIDAK LOLOS"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold text-slate-600 uppercase">{actor.coordinator || "-"}</span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        {/* Viewer Dialog */}
                        <Dialog open={!!viewingActor && viewingActor.id === actor.id} onOpenChange={(open) => !open && setViewingActor(null)}>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => setViewingActor(actor)} className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-full border-transparent transition-all" title="Lihat Detail">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            {viewingActor && (
                              <>
                                <DialogHeader>
                                  <DialogTitle className="text-xl md:text-2xl font-black text-primary uppercase flex items-center gap-2">
                                    <FileText className="w-6 h-6" /> Data Hasil Verifikasi
                                  </DialogTitle>
                                  <DialogDescription className="sr-only">Rincian data pelaku usaha purna verifikasi dinas.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-6 py-4">
                                  
                                  {/* Hasil Card */}
                                  <section>
                                    <Card className={viewingActor.hasilVerifikasiDinas === 'Lolos' ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}>
                                      <CardContent className="p-4">
                                        <h3 className={`font-black text-sm uppercase mb-2 ${viewingActor.hasilVerifikasiDinas === 'Lolos' ? 'text-emerald-700' : 'text-red-700'}`}>
                                          Keputusan Dinas: {viewingActor.hasilVerifikasiDinas}
                                        </h3>
                                        <div className="space-y-1 mt-3">
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Keterangan / Alasan</p>
                                          <p className="text-sm font-medium">{viewingActor.keteranganDinas || (viewingActor as any).surveyData?.hasilSurvey || "Tidak ada keterangan."}</p>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </section>

                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                                      {(() => {
                                        const parsed = parsePobDob(viewingActor.pobDob || "")
                                        return [
                                          { label: "Nama Lengkap", value: viewingActor.fullName },
                                          { label: "NIK", value: viewingActor.nik },
                                          { label: "Nomor KK", value: viewingActor.noKK },
                                          { label: "Jenis Kelamin", value: viewingActor.gender },
                                          { label: "Tempat Lahir", value: viewingActor.pob || parsed.pob || "-" },
                                          { label: "Tanggal Lahir", value: viewingActor.dob || parsed.dob || "-" },
                                          { label: "Nomor HP", value: viewingActor.phone, isPhone: true }
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
                                      {(() => {
                                        const coordPhone = kuotaData?.find((q: any) => (q.name || "").toUpperCase().trim() === (viewingActor.coordinator || "").toUpperCase().trim())?.phone;
                                        
                                        const getWaLink = (phoneStr: string) => {
                                          if (!phoneStr) return "#";
                                          let clean = phoneStr.replace(/\D/g, "");
                                          if (clean.startsWith("0")) clean = "62" + clean.slice(1);
                                          else if (!clean.startsWith("62")) clean = "62" + clean;
                                          return `https://wa.me/${clean}`;
                                        };

                                        return [
                                          { label: "Usaha", value: viewingActor.businessName },
                                          { label: "Kategori Usaha", value: viewingActor.businessCategory },
                                          { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                                          { label: "USULAN", value: viewingActor.coordinator },
                                          { label: "NO. HP USULAN", value: coordPhone, isPhone: true },
                                          { label: "PETUGAS SURVEY", value: (viewingActor as any).petugasSurvey || "Belum ada" }
                                        ].map((item: any, i: number) => (
                                          <div key={i} className="space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                            {item.isPhone && item.value ? (
                                              <a
                                                href={getWaLink(item.value)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-sm transition-all active:scale-95 w-fit"
                                                title="Klik untuk membuka obrolan WhatsApp"
                                              >
                                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-600/20" />
                                                <span>{item.value}</span>
                                              </a>
                                            ) : (
                                              <p className="text-xs font-bold">{item.value || "-"}</p>
                                            )}
                                          </div>
                                        ));
                                      })()}
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
                                          <p className="text-xs text-amber-800 font-medium mb-2">Alasan: {(viewingActor as any).verificationBypass.reason}</p>
                                          {(viewingActor as any).verificationBypass.fileBase64 && (
                                            <a href={(viewingActor as any).verificationBypass.fileBase64} target="_blank" rel="noreferrer" className="text-[10px] font-bold bg-amber-200 text-amber-800 px-3 py-1 rounded shadow-sm hover:bg-amber-300 transition-colors inline-block mt-1">Lihat Bukti Lampiran</a>
                                          )}
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
                                        <p className="text-primary">{viewingActor.status.toUpperCase()}</p>
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

                        {/* Input Bank Action */}
                        <Dialog open={!!inputtingBankActor && inputtingBankActor.id === actor.id} onOpenChange={(open) => !open && setInputtingBankActor(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setInputtingBankActor(actor)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-8 rounded-full px-3" title="Input Rekening & Teruskan">
                              <CreditCard className="w-4 h-4 mr-2" /> Input Rekening
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <form onSubmit={handleInputBank}>
                              <DialogHeader>
                                <DialogTitle className="text-xl font-black text-amber-600 uppercase flex items-center gap-2">
                                  <CreditCard className="w-5 h-5" /> Input Rekening & Penyaluran
                                </DialogTitle>
                                <DialogDescription>Silakan masukkan data rekening pelaku usaha {actor.fullName} dengan benar. Setelah dikonfirmasi, data akan masuk ke menu Rekening Bank.</DialogDescription>
                              </DialogHeader>
                              <div className="py-6 space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Pilih Nama Bank</Label>
                                    <Select name="bankName" defaultValue={actor.bankName || ""} required>
                                      <SelectTrigger className="w-full font-bold">
                                        <SelectValue placeholder="Pilih Bank" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {BANK_LIST.map(bank => (
                                          <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Nomor Rekening</Label>
                                    <Input name="bankNumber" defaultValue={actor.bankNumber} placeholder="Cth: 1234567890" className="font-mono font-bold" required />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Nama Pemilik Rekening</Label>
                                    <Input name="bankOwner" defaultValue={actor.bankOwner || actor.fullName} placeholder="Cth: BUDI SANTOSO" className="font-bold uppercase" required />
                                  </div>
                                </div>
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-700 font-bold leading-relaxed">
                                  PENTING: Pastikan data di atas sudah valid. Setelah disimpan, status akan berubah menjadi Selesai (Rekening Bank).
                                </div>
                              </div>
                              <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setInputtingBankActor(null)}>Batal</Button>
                                <Button type="submit" disabled={isSubmittingBank} className="min-w-[150px] bg-amber-500 hover:bg-amber-600 text-white font-bold">
                                  {isSubmittingBank ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "SIMPAN & TERUSKAN"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
