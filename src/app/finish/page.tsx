"use client"

import { useState, useEffect, Suspense } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject } from "@/firebase"
import { ref, query, equalTo, limitToFirst } from "firebase/database"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Printer, Edit3, Loader2, Save, RotateCcw, Eye, User, CreditCard, History, X, Building2, MapPin, BadgeCheck, FileText, Search } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"

import { cn } from "@/lib/utils"

function FinishContent() {
  const { user } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterCoordinator = searchParams.get('coordinator')
  
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState<string>("")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [printDate, setPrintDate] = useState<string>("")

  useEffect(() => {
    setPrintDate(new Date().toLocaleString('id-ID'))
  }, [])

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole } = useObject(adminRef)

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  const { data: allUsersForProfile } = useList(userProfileRef)
  const userProfile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isKoordinator = userProfile?.role === 'koordinator'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'businessActors')
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  
  const actors = allActorsRaw ? allActorsRaw.filter(a => {
    // Status filter - equivalent to previous orderByChild('status').equalTo('finish')
    if (a.status !== 'finish') return false;

    const matchesSearch = 
      a.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.nik?.includes(searchQuery)
    const matchesCategory = !category || a.businessCategory === category

    if (isKoordinator) {
      if (!a.coordinator || !userProfile?.fullName) return false;
      const matchesKoor = a.coordinator.toLowerCase() === userProfile.fullName.toLowerCase();
      return matchesSearch && matchesCategory && matchesKoor;
    }
    if (filterCoordinator) {
      const matchesKoor = a.coordinator === filterCoordinator;
      return matchesSearch && matchesCategory && matchesKoor;
    }
    return matchesSearch && matchesCategory;
  }) : undefined

  const [isEditMode, setIsEditMode] = useState(false)

  const handleSaveFullEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAdmin || !database || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    
    const lpjVal = formData.get('lpjNominal') as string;
    const lpjNum = lpjVal ? parseInt(lpjVal) : viewingActor.lpjNominal || 0;

    const updates: Partial<BusinessActor> = {
      fullName: formData.get('fullName') as string,
      nik: formData.get('nik') as string,
      noKK: formData.get('noKK') as string,
      gender: formData.get('gender') as string,
      pobDob: formData.get('pobDob') as string,
      phone: formData.get('phone') as string,
      kecamatan: formData.get('kecamatan') as string,
      kelurahan: formData.get('kelurahan') as string,
      rtRw: formData.get('rtRw') as string,
      address: formData.get('address') as string,
      businessName: formData.get('businessName') as string,
      businessCategory: formData.get('businessCategory') as string,
      businessLocation: formData.get('businessLocation') as string,
      coordinator: formData.get('coordinator') as string,
      bankName: formData.get('bankName') as string,
      bankNumber: formData.get('bankNumber') as string,
      bankOwner: formData.get('bankOwner') as string,
      lpjNominal: lpjNum,
    }

    updateDocumentNonBlocking(ref(database, `businessActors/${viewingActor.id}`), updates)
    toast({ title: "Tersimpan", description: "Data pelaku usaha berhasil diperbarui." })
    setIsEditMode(false)
    setViewingActor({ ...viewingActor, ...updates } as BusinessActor)
  }

  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    if (confirm(`Kembalikan ${fullName} ke antrean awal (Pending)?`)) {
      updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), { status: 'pending' })
      toast({ title: "Berhasil", description: "Status dikembalikan ke Pending." })
      setViewingActor(null)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="hidden print:block text-center space-y-2 mb-8 border-b-2 border-black pb-4">
        <h1 className="text-xl font-black uppercase">LAPORAN DATA PELAKU USAHA (SIMPU)</h1>
        <p className="text-xs font-bold uppercase tracking-widest">Sistem Informasi Manajemen Pelaku Usaha</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <BadgeCheck className="w-8 h-8 text-green-600" />
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">Finish</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Arsip data yang telah dinyatakan SELESAI.</p>
            {filterCoordinator && (
              <div className="flex items-center gap-2 mt-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 w-fit">
                <span className="text-[10px] font-black text-primary uppercase">Filter Koordinator: {filterCoordinator}</span>
                <a href="/finish" className="text-primary hover:text-primary/70 transition-transform active:scale-90">
                  <X className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
        <Button onClick={() => window.print()} className="bg-primary font-bold shadow-md w-full md:w-auto">
          <Printer className="w-4 h-4 mr-2" /> CETAK
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Cari Nama / Usaha / NIK..." 
            className="pl-10 h-10 md:h-12 bg-card border-primary/20 focus-visible:ring-primary rounded-xl md:rounded-2xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="h-10 md:h-12 px-4 rounded-xl md:rounded-2xl border border-primary/20 bg-card text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            <option value="Kuliner">Kuliner</option>
            <option value="Bukan Kuliner">Bukan Kuliner</option>
          </select>
        </div>
      </div>

      <div className="bg-card print:bg-transparent">
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 print:flex print:flex-col print:gap-1">
            {actors?.map((actor) => (
              <Card 
                key={actor.id} 
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group relative overflow-hidden print:shadow-none print:border-b print:rounded-none"
                onClick={() => {
                  setViewingActor(actor)
                  setIsEditMode(false)
                }}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-3 print:flex-row print:justify-between print:text-left print:p-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 group-hover:scale-110 transition-transform print:hidden shrink-0">
                    <BadgeCheck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 w-full justify-center">
                    <p className="font-bold text-[13px] md:text-sm line-clamp-2 uppercase leading-tight print:line-clamp-none text-green-800" title={actor.businessName}>
                      {actor.businessName || "NAMA USAHA KOSONG"}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase line-clamp-1 print:line-clamp-none font-bold flex items-center justify-center print:justify-start gap-1" title={actor.fullName}>
                      <User className="w-3 h-3 print:hidden" /> {actor.fullName}
                    </p>
                    <p className="text-[9px] text-muted-foreground font-mono hidden print:block">
                      NIK: {actor.nik} | Koor: {actor.coordinator} | Bank: {actor.bankName} - {actor.bankNumber}
                    </p>
                  </div>
                  <div className="text-[9px] font-black uppercase bg-green-500 text-white w-full justify-center print:w-auto shrink-0 mt-auto rounded-full py-0.5 px-2 flex items-center">
                    SELESAI
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!actors || actors.length === 0) && (
              <div className="col-span-full py-20 text-center text-muted-foreground grid place-items-center">
                <BadgeCheck className="w-12 h-12 mb-4 opacity-20" />
                <p>Tidak ada data selesai yang ditemukan.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!viewingActor} onOpenChange={(open) => {
        if (!open) {
          setViewingActor(null)
          setIsEditMode(false)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingActor && (
            <div className="flex flex-col gap-2 relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-4">
                <DialogTitle className="text-xl md:text-2xl font-black text-green-700 uppercase">
                  {isEditMode ? "Edit Data Selesai" : "Detail Lengkap Data Final"}
                </DialogTitle>
                <div className="flex flex-wrap gap-2">
                  {isAdmin && (
                    <Button 
                      variant={isEditMode ? "outline" : "default"} 
                      size="sm" 
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={cn("font-bold", isEditMode ? "border-amber-500 text-amber-600" : "bg-primary")}
                    >
                      {isEditMode ? "Batal Edit" : <><Edit3 className="w-4 h-4 mr-2"/> Edit Semua Data</>}
                    </Button>
                  )}
                  {isAdmin && !isEditMode && (
                    <Button size="sm" variant="outline" onClick={() => handleRevert(viewingActor.id, viewingActor.fullName)} className="border-amber-500 text-amber-600 font-bold" title="Kembalikan ke antrean awal (Pending)">
                      <RotateCcw className="w-4 h-4 mr-1 md:mr-0" /> <span className="md:hidden">Revert</span>
                    </Button>
                  )}
                </div>
              </div>

              {isEditMode ? (
                <form onSubmit={handleSaveFullEdit} className="grid gap-6 py-4">
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nama Lengkap</Label><Input name="fullName" defaultValue={viewingActor.fullName} required /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">NIK</Label><Input name="nik" defaultValue={viewingActor.nik} required /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor KK</Label><Input name="noKK" defaultValue={viewingActor.noKK} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Jenis Kelamin</Label>
                        <select name="gender" defaultValue={viewingActor.gender || ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                          <option value="L">Laki-Laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Tempat/Tgl Lahir</Label><Input name="pobDob" defaultValue={viewingActor.pobDob} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor HP</Label><Input name="phone" defaultValue={viewingActor.phone} /></div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat & Domisili (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Kecamatan</Label><Input name="kecamatan" defaultValue={viewingActor.kecamatan} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Kelurahan</Label><Input name="kelurahan" defaultValue={viewingActor.kelurahan} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">RT/RW</Label><Input name="rtRw" defaultValue={viewingActor.rtRw} /></div>
                      <div className="space-y-1 md:col-span-3"><Label className="text-xs font-bold uppercase">Alamat Lengkap</Label><Input name="address" defaultValue={viewingActor.address} /></div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Building2 className="w-4 h-4" /> Informasi Usaha (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nama Usaha</Label><Input name="businessName" defaultValue={viewingActor.businessName} required /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Kategori</Label><Input name="businessCategory" defaultValue={viewingActor.businessCategory} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Lokasi Usaha</Label><Input name="businessLocation" defaultValue={viewingActor.businessLocation} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Koordinator</Label><Input name="coordinator" defaultValue={viewingActor.coordinator} /></div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Data Perbankan & LPJ (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nama Bank</Label><Input name="bankName" defaultValue={viewingActor.bankName} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor Rekening</Label><Input name="bankNumber" defaultValue={viewingActor.bankNumber} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Pemilik Rekening</Label><Input name="bankOwner" defaultValue={viewingActor.bankOwner} className="uppercase" /></div>
                      <div className="space-y-1 md:col-span-3 pt-2">
                        <Label className="text-xs font-bold uppercase text-emerald-600">Nominal LPJ Terlaporkan</Label>
                        <Input name="lpjNominal" type="number" defaultValue={viewingActor.lpjNominal || 0} className="font-mono" />
                      </div>
                    </div>
                  </section>

                  <div className="sticky bottom-0 bg-white dark:bg-zinc-950 p-4 border-t flex justify-end gap-2 mt-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] rounded-b-lg z-10">
                    <Button type="button" variant="outline" onClick={() => setIsEditMode(false)} className="font-bold">Batal</Button>
                    <Button type="submit" className="bg-primary font-bold"><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</Button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-6 py-4">
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
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
                          <p className="text-sm font-bold">{item.value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat & Domisili</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Kecamatan", value: viewingActor.kecamatan },
                        { label: "Kelurahan", value: viewingActor.kelurahan },
                        { label: "RT/RW", value: viewingActor.rtRw },
                        { label: "Alamat Lengkap", value: viewingActor.address, fullWidth: true }
                      ].map((item, i) => (
                        <div key={i} className={item.fullWidth ? "md:col-span-3 space-y-1" : "space-y-1"}>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold">{item.value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Building2 className="w-4 h-4" /> Informasi Usaha</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Nama Usaha", value: viewingActor.businessName },
                        { label: "Kategori Usaha", value: viewingActor.businessCategory },
                        { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                        { label: "Koordinator Lapangan", value: viewingActor.coordinator }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold">{item.value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Data Perbankan</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                      {[
                        { label: "Nama Bank", value: viewingActor.bankName },
                        { label: "Nomor Rekening", value: viewingActor.bankNumber, isMono: true },
                        { label: "Nama Pemilik Rekening", value: viewingActor.bankOwner, isUpper: true }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className={cn("text-sm font-black text-primary", item.isMono && "font-mono text-lg", item.isUpper && "uppercase")}>{item.value || "BELUM TERISI"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-black text-sm uppercase border-b pb-1">
                      <FileText className="w-4 h-4" /> Laporan Pertanggung Jawaban (LPJ)
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                          <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Nominal Terlaporkan</p>
                          <p className="text-3xl font-black text-emerald-600 font-mono">
                              RP {viewingActor.lpjNominal?.toLocaleString('id-ID') || "0"}
                          </p>
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] font-bold text-emerald-800 uppercase">Status Verifikasi LPJ</p>
                          <Badge className="bg-emerald-600 font-black uppercase text-[10px] mt-1 px-4 py-1 hover:bg-emerald-600">TELAH TERVERIFIKASI</Badge>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> Informasi Sistem & Audit</div>
                    <div className="bg-slate-50 p-4 rounded-xl text-xs font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Status Terakhir</p>
                        <p className="capitalize text-primary">{viewingActor.status.replace('_', ' ')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Petugas Input</p>
                        <p>{viewingActor.createdBy || "System"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Waktu Pendaftaran</p>
                        <p>{viewingActor.createdAt ? new Date(viewingActor.createdAt).toLocaleString('id-ID') : "-"}</p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function FinishPage() {
  return (<Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}><FinishContent /></Suspense>)
}
