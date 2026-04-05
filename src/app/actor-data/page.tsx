
"use client"

import { useState, useEffect, Suspense } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject, deleteDocumentNonBlocking } from "@/firebase"
import { ref, query, equalTo, limitToFirst } from "firebase/database"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Printer, Edit3, Loader2, Save, Trash2, Eye, User, CreditCard, History, X, RotateCcw, Building2, MapPin, CheckCircle2, Store, Search } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { generateRegistrationForm } from "@/lib/pdf-generator"


function ActorDataContent() {
  const { user } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterCoordinator = searchParams.get('coordinator')
  
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [printDate, setPrintDate] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")


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
  const isMonitoring = userProfile?.role === 'monitoring'
  const isKoordinator = userProfile?.role === 'koordinator'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'businessActors')
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  
  const actors = allActorsRaw ? allActorsRaw.filter(a => {
    // Status filter - equivalent to previous orderByChild('status').equalTo('verified_actor')
    if (a.status !== 'verified_actor') return false;

    if (isKoordinator) {
      if (!a.coordinator || !userProfile?.fullName) return false;
      return a.coordinator.toLowerCase() === userProfile.fullName.toLowerCase();
    }
    if (filterCoordinator) {
      return a.coordinator === filterCoordinator;
    }
    return true;
  }) : undefined

  const filteredActors = actors ? actors.filter(a => 
    a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.nik.includes(searchQuery) ||
    a.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.address?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : undefined


  const [isEditMode, setIsEditMode] = useState(false)
  const [editingBankMode, setEditingBankMode] = useState(false)

  const handleSaveFullEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAdmin || !database || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    
    const updates: Partial<BusinessActor> = {
      fullName: formData.get('fullName') as string,
      nik: formData.get('nik') as string,
      noKK: formData.get('noKK') as string,
      gender: formData.get('gender') as "Laki-laki" | "Perempuan",
      pobDob: formData.get('pobDob') as string,
      phone: formData.get('phone') as string,
      kecamatan: formData.get('kecamatan') as string,
      kelurahan: formData.get('kelurahan') as string,
      rtRw: formData.get('rtRw') as string,
      address: formData.get('address') as string,
      businessName: formData.get('businessName') as string,
      businessCategory: formData.get('businessCategory') as "Kuliner" | "Bukan Kuliner",
      businessLocation: formData.get('businessLocation') as string,
      coordinator: formData.get('coordinator') as string,
      bankName: formData.get('bankName') as string,
      bankNumber: formData.get('bankNumber') as string,
      bankOwner: formData.get('bankOwner') as string,
    }

    updateDocumentNonBlocking(ref(database, `businessActors/${viewingActor.id}`), updates)
    toast({ title: "Tersimpan", description: "Data pelaku usaha berhasil diperbarui." })
    setIsEditMode(false)
    setViewingActor({ ...viewingActor, ...updates } as BusinessActor)
  }

  const handleSaveBank = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || isMonitoring || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    const updates = {
      bankNumber: formData.get('bankNumber'),
      bankOwner: formData.get('bankOwner'),
      bankName: formData.get('bankName'),
      status: 'bank_pending'
    }
    updateDocumentNonBlocking(ref(database, `businessActors/${viewingActor.id}`), updates)
    toast({ title: "Tersimpan", description: "Data rekening telah dikirim." })
    setEditingBankMode(false)
    setViewingActor(null)
  }

  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    if (confirm(`Kembalikan status ${fullName} ke Pending?`)) {
      updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), { status: 'pending' })
      toast({ title: "Berhasil", description: "Status dikembalikan ke Pending." })
      setViewingActor(null)
    }
  }

  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    if (confirm(`Hapus permanen ${fullName}? Semua data terkait akan hilang.`)) {
      deleteDocumentNonBlocking(ref(database, `businessActors/${actorId}`))
      toast({ variant: "destructive", title: "Terhapus", description: "Data dihapus permanen." })
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
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">Data Pelaku Usaha</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Data lolos verifikasi siap diisi rekening.</p>
          {filterCoordinator && (
            <div className="flex items-center gap-2 mt-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 w-fit">
              <span className="text-[10px] font-black text-primary uppercase">Filter Koordinator: {filterCoordinator}</span>
              <a href="/actor-data" className="text-primary hover:text-primary/70 transition-transform active:scale-90">
                <X className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto print:hidden">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari Nama, NIK, Usaha..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-primary/20 bg-white"
            />
          </div>
          <Button onClick={() => window.print()} className="bg-primary font-bold shadow-md w-full md:w-auto h-10">
            <Printer className="w-4 h-4 mr-2" /> CETAK
          </Button>
        </div>
      </div>


      <div className="bg-card print:bg-transparent">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold text-primary py-4 pl-6">NAMA</TableHead>
                  <TableHead className="font-bold text-primary py-4">NIK / NO. KK</TableHead>
                  <TableHead className="font-bold text-primary py-4">ALAMAT</TableHead>
                  <TableHead className="font-bold text-primary py-4">USAHA</TableHead>
                  <TableHead className="font-bold text-primary py-4 pr-6 text-right">AKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActors?.map((actor) => (
                  <TableRow key={actor.id} className="hover:bg-primary/5 transition-colors group">
                    <TableCell className="py-4 pl-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 uppercase text-[13px]">{actor.fullName}</span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{actor.coordinator || "Tanpa Koordinator"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] h-4 font-bold border-emerald-100 bg-emerald-50/50 text-emerald-700">NIK</Badge>
                          <span className="font-mono text-[11px] text-slate-600">{actor.nik}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] h-4 font-bold border-amber-100 bg-amber-50/50 text-amber-700">KK</Badge>
                          <span className="font-mono text-[11px] text-slate-600">{actor.noKK}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 max-w-[200px]">
                      <span className="text-xs font-medium text-slate-600 line-clamp-2 uppercase" title={actor.address}>
                        {actor.address}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-primary uppercase text-[12px]">{actor.businessName}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{actor.businessCategory}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200"
                          onClick={() => {
                            setViewingActor(actor)
                            setIsEditMode(false)
                            setEditingBankMode(false)
                          }}
                          title="Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200"
                          onClick={() => generateRegistrationForm(actor)}
                          title="Cetak Formulir"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredActors || filteredActors.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-muted-foreground bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search className="w-8 h-8 opacity-20" />
                        <p className="font-bold">Tidak ada data pelaku usaha ditemukan.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!viewingActor} onOpenChange={(open) => {
        if (!open) {
          setViewingActor(null)
          setIsEditMode(false)
          setEditingBankMode(false)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingActor && !editingBankMode && (
            <div className="flex flex-col gap-2 relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-4">
                <DialogTitle className="text-xl md:text-2xl font-black text-primary uppercase">
                  {isEditMode ? "Edit Data Pelaku Usaha" : "Detail Pelaku Usaha"}
                </DialogTitle>
                <div className="flex flex-wrap gap-2">
                  {!isEditMode && viewingActor && (
                    <Button 
                      size="sm" 
                      onClick={() => generateRegistrationForm(viewingActor)}
                      className="font-bold bg-primary hover:bg-primary/90 text-white"
                    >
                      <Printer className="w-4 h-4 mr-2" /> Cetak Formulir
                    </Button>
                  )}
                  {!isAdmin && !isMonitoring && !isEditMode && viewingActor.status === 'verified_actor' && (

                    <Button 
                      size="sm" 
                      onClick={() => setEditingBankMode(true)}
                      className="font-bold bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      <CreditCard className="w-4 h-4 mr-2" /> Input Rekening
                    </Button>
                  )}
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
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleRevert(viewingActor.id, viewingActor.fullName)} className="border-amber-500 text-amber-600 font-bold" title="Kembalikan ke antrean awal (Pending)">
                        <RotateCcw className="w-4 h-4 mr-1 md:mr-0" /> <span className="md:hidden">Revert</span>
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(viewingActor.id, viewingActor.fullName)} className="font-bold" title="Hapus Permanen">
                        <Trash2 className="w-4 h-4 mr-1 md:mr-0" /> <span className="md:hidden">Delete</span>
                      </Button>
                    </>
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
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Data Perbankan (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nama Bank</Label><Input name="bankName" defaultValue={viewingActor.bankName} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor Rekening</Label><Input name="bankNumber" defaultValue={viewingActor.bankNumber} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Pemilik Rekening</Label><Input name="bankOwner" defaultValue={viewingActor.bankOwner} className="uppercase" /></div>
                    </div>
                  </section>

                  <div className="sticky bottom-0 bg-white dark:bg-zinc-950 p-4 border-t flex justify-end gap-2 mt-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] rounded-b-lg">
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Nama Bank", value: viewingActor.bankName },
                        { label: "Nomor Rekening", value: viewingActor.bankNumber },
                        { label: "Nama Pemilik Rekening", value: viewingActor.bankOwner }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-black text-primary">{item.value || "BELUM TERISI"}</p>
                        </div>
                      ))}
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

          {viewingActor && editingBankMode && (
            <div className="flex flex-col gap-4">
              <div className="border-b pb-2 flex justify-between items-center">
                <DialogTitle className="text-xl font-black text-amber-600 flex items-center gap-2">
                  <CreditCard className="w-5 h-5"/> INPUT REKENING
                </DialogTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditingBankMode(false)}>Batal</Button>
              </div>
              <form onSubmit={handleSaveBank}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Nomor Rekening</Label>
                    <Input name="bankNumber" defaultValue={viewingActor.bankNumber} placeholder="Contoh: 00129384812" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Nama Pemilik Sesuai Rekening</Label>
                    <Input name="bankOwner" defaultValue={viewingActor.bankOwner} className="uppercase" placeholder="Contoh: AGUS SURIYADI" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Nama Bank</Label>
                    <Input name="bankName" defaultValue={viewingActor.bankName} placeholder="Contoh: BPD BALI" required />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="submit" className="w-full bg-primary font-bold"><Save className="w-4 h-4 mr-2" /> Simpan & Proses LPJ</Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ActorDataPage() {
  return (<Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}><ActorDataContent /></Suspense>)
}
