"use client"

import { useState, useMemo } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, useObject, sanitizeForFirebase } from "@/firebase"
import { ref, query, orderByChild, equalTo } from "firebase/database"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ShieldAlert, Loader2, Eye, Search, User, FileText, Building2, MapPin, History, BadgeCheck, XSquare, CreditCard, ChevronRight, MessageCircle, RotateCcw } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { BusinessActor } from "../lib/types"
import { updateDocumentNonBlocking } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
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
  
  // Kembalikan ke Petugas Survey states
  const [returnTargetActor, setReturnTargetActor] = useState<BusinessActor | null>(null)
  const [returnReason, setReturnReason] = useState<string>("")
  const [isSubmittingReturn, setIsSubmittingReturn] = useState<boolean>(false)
  
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)
  const { userProfile } = useUser()

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin' || userProfile?.role === 'superadmin'
  const isPetugas = userProfile?.role === 'petugas_survey' || userProfile?.role === 'petugas'
  const isKoordinator = userProfile?.role === 'koordinator'
  const isDinas = userProfile?.role === 'dinas' || userProfile?.role === 'verifikator_dinas'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('verified_dinas'))
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  
  const kuotaRef = useMemoFirebase(() => database ? ref(database, 'koordinator_kuotas') : null, [database])
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
    try {
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
    } catch (err: any) {
      console.error("Error saving bank data:", err)
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err?.message || "Terjadi kesalahan saat menyimpan data rekening." })
    } finally {
      setIsSubmittingBank(false)
    }
  }

  const handleKembalikanKePetugas = async () => {
    if (!returnTargetActor || !database || (!isAdmin && !isDinas && !isPetugas)) return
    if (!returnReason.trim()) {
      toast({ variant: "destructive", title: "Alasan Wajib Diisi", description: "Harap masukkan catatan / alasan pengembalian data ke petugas survey." })
      return
    }

    setIsSubmittingReturn(true)
    try {
      const actorRef = ref(database, `businessActors/${returnTargetActor.id}`)
      const officerName = returnTargetActor.petugasSurvey || returnTargetActor.createdBy || returnTargetActor.surveyData?.pejabatData?.petugas?.nama || ''

      const updates: any = {
        status: 'lpj_pending',
        hasilVerifikasiDinas: 'Dikembalikan',
        keteranganDinas: returnReason.trim(),
        catatanPengembalian: returnReason.trim(),
        dikembalikanKePetugasAt: new Date().toISOString(),
        dikembalikanKePetugasBy: userProfile?.fullName || user?.email || user?.uid || 'Verifikator Dinas',
        dikembalikanKePetugasReason: returnReason.trim(),
        berkasDinasVerified: false,
        berkasDinasVerifiedAt: null,
        berkasDinasVerifiedBy: null,
        verifiedDinasAt: null,
        verifiedDinasBy: null,
      }

      if (officerName && (!returnTargetActor.petugasSurvey || returnTargetActor.petugasSurvey.trim() === '-' || returnTargetActor.petugasSurvey.trim() === '')) {
        updates.petugasSurvey = officerName.toUpperCase().trim()
      }

      const cleanData = sanitizeForFirebase(updates)
      const { update } = await import('firebase/database')
      await update(actorRef, cleanData)

      logActivity({
        query: `KEMBALIKAN KE PETUGAS SURVEY (HASIL VERIFIKASI): ${returnTargetActor.fullName}`,
        results: `Petugas: ${officerName || 'Semua'} | Alasan: ${returnReason.trim()}`,
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'KEMBALIKAN KE PETUGAS',
        userId: userProfile?.fullName || user?.email || user?.uid || 'Verifikator Dinas'
      })

      toast({
        title: "✅ Berhasil Dikembalikan",
        description: `Data ${returnTargetActor.fullName} berhasil dikembalikan ke antrean Petugas Survey (${officerName || 'Petugas Terkait'}).`
      })

      setReturnTargetActor(null)
      setReturnReason("")
      if (viewingActor?.id === returnTargetActor.id) {
        setViewingActor(null)
      }
    } catch (err: any) {
      console.error("Error returning actor to survey officer:", err)
      toast({
        variant: "destructive",
        title: "Gagal Mengembalikan Data",
        description: err?.message || "Terjadi kesalahan sistem saat mengembalikan data."
      })
    } finally {
      setIsSubmittingReturn(false)
    }
  }

  if (!isAdmin && !isPetugas && !isKoordinator && !isDinas && !isAdminLoading) return <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center"><ShieldAlert className="w-16 h-16 text-destructive" /><h1 className="text-2xl font-bold">Akses Ditolak</h1></div>

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
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {[...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b last:border-0 animate-pulse">
                    <td className="px-4 py-4 w-10"><div className="h-3 bg-slate-200 rounded w-6 mx-auto" /></td>
                    <td className="px-4 py-4">
                      <div className="space-y-1.5">
                        <div className="h-3.5 bg-slate-200 rounded w-48" />
                        <div className="h-2.5 bg-slate-100 rounded w-32" />
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="h-3 bg-slate-200 rounded w-28" /></td>
                    <td className="px-4 py-4 text-center"><div className="h-6 bg-slate-200 rounded-full w-20 mx-auto" /></td>
                    <td className="px-4 py-4"><div className="h-3 bg-slate-100 rounded w-24" /></td>
                    <td className="px-4 py-4 text-right"><div className="h-8 bg-slate-200 rounded-xl w-20 ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                                        const found = kuotaData?.find((q: any) => (q.name || q.coordinator || "").toUpperCase().trim() === (viewingActor.coordinator || "").toUpperCase().trim());
                                        const coordPhone = found?.phone || found?.noHp || found?.hp || "";
                                        
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
                                <DialogFooter className="flex-col sm:flex-row items-center justify-between gap-2 border-t pt-4">
                                  {(isAdmin || isDinas) && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        setReturnTargetActor(viewingActor);
                                        setReturnReason("");
                                      }}
                                      className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 font-bold gap-1.5"
                                    >
                                      <RotateCcw className="w-4 h-4" /> Kembalikan ke Petugas Survey
                                    </Button>
                                  )}
                                  <Button variant="ghost" onClick={() => setViewingActor(null)}>Tutup</Button>
                                </DialogFooter>
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

      {/* ─── MODAL KEMBALIKAN KE PETUGAS SURVEY ─── */}
      <Dialog open={!!returnTargetActor} onOpenChange={(open) => { if (!open) { setReturnTargetActor(null); setReturnReason(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700 font-black uppercase text-lg">
              <RotateCcw className="w-5 h-5 text-orange-600" /> Kembalikan ke Petugas Survey
            </DialogTitle>
            <DialogDescription>
              Data pelaku usaha ini akan dikembalikan ke antrean status survey lapangan agar petugas survey dapat merevisi/memperbaiki data atau berkas.
            </DialogDescription>
          </DialogHeader>

          {returnTargetActor && (
            <div className="space-y-4 py-2">
              <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-orange-800 font-bold uppercase tracking-wider">Pelaku Usaha</p>
                    <p className="text-sm font-black text-slate-900 uppercase">{returnTargetActor.fullName}</p>
                    <p className="text-xs text-slate-600 font-mono">NIK: {returnTargetActor.nik}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-orange-200 text-orange-900 rounded-lg uppercase">
                    {returnTargetActor.kelurahan || "Kelurahan"}
                  </span>
                </div>

                <div className="pt-2 border-t border-orange-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-bold uppercase text-[10px]">Tujuan Petugas Survey:</span>
                  <span className="font-black text-emerald-800 uppercase flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {returnTargetActor.petugasSurvey || returnTargetActor.createdBy || returnTargetActor.surveyData?.pejabatData?.petugas?.nama || "Petugas Terkait"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="return-reason-hv" className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1">
                  Catatan / Alasan Pengembalian <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="return-reason-hv"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Contoh: Foto usaha kurang jelas, alamat mohon disesuaikan dengan RT/RW terbaru, atau data peralatan perlu diperbaiki..."
                  className="min-h-[110px] text-sm rounded-xl border-slate-300 focus-visible:ring-orange-500 bg-white"
                />
                <p className="text-[11px] text-slate-500">
                  💡 Catatan ini akan langsung tampil pada akun Petugas Survey terkait sebagai instruksi perbaikan.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setReturnTargetActor(null); setReturnReason(""); }}
              disabled={isSubmittingReturn}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleKembalikanKePetugas}
              disabled={isSubmittingReturn || !returnReason.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2 min-w-[160px]"
            >
              {isSubmittingReturn ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Kembalikan Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
