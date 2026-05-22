"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, deleteDocumentNonBlocking, useObject } from "@/firebase"
import { ref, query, equalTo, limitToFirst } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Printer, Edit3, Loader2, Save, RotateCcw, Trash2, Eye, User, CreditCard, History, X, Building2, MapPin, Ban, AlertCircle, Search, Info } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckDataIndicator } from "@/components/check-data-indicator"

import { cn, extractDobFromNik, parsePobDob } from "@/lib/utils"
import { SidebarTrigger } from "@/components/ui/sidebar"

function RejectedContent() {
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
  const [actorToPrint, setActorToPrint] = useState<BusinessActor | null>(null)

  useEffect(() => {
    setPrintDate(new Date().toLocaleString('id-ID'))
  }, [])

  const handlePrintActorForm = (actor: BusinessActor) => {
    setActorToPrint(actor)
    setTimeout(() => {
      window.print()
      setActorToPrint(null)
    }, 250)
  }

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
  
  const master2023Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2023') : null, [database])
  const master2024Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2024') : null, [database])
  const master2025Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2025') : null, [database])
  const blacklistRef = useMemoFirebase(() => database ? ref(database, 'blacklist_data') : null, [database])

  const { data: data2023 } = useList<any>(master2023Ref)
  const { data: data2024 } = useList<any>(master2024Ref)
  const { data: data2025 } = useList<any>(master2025Ref)
  const { data: dataBlacklist } = useList<any>(blacklistRef)

  const blacklistMatches = useMemo(() => {
    if (!actorToPrint || !dataBlacklist) return []
    return dataBlacklist.filter((m: any) => 
      (m.noKK && m.noKK === actorToPrint.noKK) || (m.nik && m.nik === actorToPrint.nik)
    )
  }, [actorToPrint, dataBlacklist])
  
  const actors = allActorsRaw ? allActorsRaw.filter(a => {
    // Status filter - equivalent to previous orderByChild('status').equalTo('rejected')
    if (a.status !== 'rejected') return false;

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
  const [editNik, setEditNik] = useState("")
  const [editPob, setEditPob] = useState("")
  const [editDob, setEditDob] = useState("")

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
  }, [viewingActor, isEditMode])

  const handleSaveFullEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAdmin || !database || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    
    const updates: Partial<BusinessActor> = {
      fullName: formData.get('fullName') as string,
      nik: editNik,
      noKK: formData.get('noKK') as string,
      gender: formData.get('gender') as "Perempuan" | "Laki-laki",
      pobDob: `${editPob}, ${editDob}`,
      pob: editPob,
      dob: editDob,
      phone: formData.get('phone') as string,
      kecamatan: formData.get('kecamatan') as string,
      kelurahan: formData.get('kelurahan') as string,
      rtRw: formData.get('rtRw') as string,
      address: formData.get('address') as string,
      businessName: formData.get('businessName') as string,
      businessCategory: formData.get('businessCategory') as "Bukan Kuliner" | "Kuliner",
      businessLocation: formData.get('businessLocation') as string,
      coordinator: formData.get('coordinator') as string,
      bankName: formData.get('bankName') as string,
      bankNumber: formData.get('bankNumber') as string,
      bankOwner: formData.get('bankOwner') as string,
      rejectionReason: formData.get('rejectionReason') as string,
    }

    updateDocumentNonBlocking(ref(database, `businessActors/${viewingActor.id}`), updates)
    
    logActivity({
      query: `EDIT DATA DITOLAK: ${viewingActor.fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'DATA DITOLAK',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Tersimpan", description: "Data pelaku usaha berhasil diperbarui." })
    setIsEditMode(false)
    setViewingActor({ ...viewingActor, ...updates } as BusinessActor)
  }

  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    if (confirm(`Kembalikan ${fullName} ke antrean awal (Pending)?`)) {
      updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), { status: 'pending' })
      
      // Update global stats
      import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
        updateStatsOnStatusChange(database, 'rejected', 'pending', { id: actorId }).catch(e => console.error(e));
      });
      
      logActivity({
        query: `KEMBALIKAN DATA DITOLAK: ${fullName}`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'DATA DITOLAK',
        userId: user?.email || user?.uid || 'Admin'
      })
      
      toast({ title: "Berhasil", description: "Status dikembalikan ke Pending." })
      setViewingActor(null)
    }
  }

  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    if (confirm(`Hapus permanen ${fullName}? Semua data terkait akan hilang.`)) {
      const actorToDelete = { id: actorId, status: 'rejected' }; // Minimal fallback
      deleteDocumentNonBlocking(ref(database, `businessActors/${actorId}`))
      
      // Update global stats
      import("@/lib/stats-service").then(({ updateStatsOnDelete }) => {
        updateStatsOnDelete(database, actorToDelete).catch(err => console.error(err));
      });
      
      logActivity({
        query: `HAPUS DATA DITOLAK: ${fullName}`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'DATA DITOLAK',
        userId: user?.email || user?.uid || 'Admin'
      })
      
      toast({ variant: "destructive", title: "Terhapus", description: "Data dihapus permanen." })
      setViewingActor(null)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className={cn("space-y-6", actorToPrint && "print:hidden")}>
        <div className="hidden print:block text-center space-y-2 mb-8 border-b-2 border-black pb-4">
          <h1 className="text-xl font-black uppercase">LAPORAN DATA DITOLAK / CANCEL (SIMPU)</h1>
          <p className="text-xs font-bold uppercase tracking-widest">Sistem Informasi Manajemen Pelaku Usaha</p>
        </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-red-700 hover:bg-red-50 transition-colors" />
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold text-red-700 font-headline">Data Ditolak / Batal</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Arsip data yang ditolak oleh Administrator.</p>
            {filterCoordinator && (
              <div className="flex items-center gap-2 mt-2 bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 w-fit">
                <span className="text-[10px] font-black text-red-700 uppercase">Filter Koordinator: {filterCoordinator}</span>
                <Link href="/rejected" className="text-red-700 hover:text-red-900 transition-transform active:scale-90">
                  <X className="w-3.5 h-3.5" />
                </Link>
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
            className="pl-10 h-10 md:h-12 bg-card border-red-200 focus-visible:ring-red-500 rounded-xl md:rounded-2xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="h-10 md:h-12 px-4 rounded-xl md:rounded-2xl border border-red-200 bg-card text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            <option value="Kuliner">Kuliner</option>
            <option value="Bukan Kuliner">Bukan Kuliner</option>
          </select>
        </div>
      </div>

      <div className="bg-card print:bg-transparent border border-red-100 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-4 space-y-4">
            <div className="flex gap-4 border-b pb-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-4 flex-1" />)}
            </div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-4 pt-2">
                {[...Array(6)].map((_, j) => <Skeleton key={j} className="h-10 flex-1" />)}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-red-50/50">
                <TableRow className="border-red-100 hover:bg-transparent">
                  <TableHead className="w-[50px] font-black text-red-700 text-center uppercase text-[10px]">No</TableHead>
                  <TableHead className="font-black text-red-700 uppercase text-[10px]">Nama Usaha</TableHead>
                  <TableHead className="font-black text-red-700 uppercase text-[10px]">Pelaku Usaha</TableHead>
                  <TableHead className="font-black text-red-700 uppercase text-[10px] text-center">Kategori</TableHead>
                  <TableHead className="font-black text-red-700 uppercase text-[10px]">Koordinator</TableHead>
                  <TableHead className="font-black text-red-700 uppercase text-[10px]">Alasan Penolakan</TableHead>
                  <TableHead className="font-black text-red-700 uppercase text-[10px] text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actors && actors.length > 0 ? (
                  actors.map((actor, index) => (
                    <TableRow 
                      key={actor.id} 
                      className="cursor-pointer hover:bg-red-50/30 border-red-50 transition-colors group print:border-b print:rounded-none"
                      onClick={() => {
                        setViewingActor(actor)
                        setIsEditMode(false)
                      }}
                    >
                      <TableCell className="text-center font-bold text-slate-400 text-xs">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-red-700 uppercase text-[12px] leading-tight">
                            {actor.businessName || "NAMA USAHA KOSONG"}
                          </span>
                          <div className="flex items-center gap-1 mt-1 print:hidden">
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
                          <span className="font-bold text-slate-700 text-[11px] uppercase">{actor.fullName}</span>
                          <span className="text-[9px] text-slate-400 font-mono tracking-tighter uppercase">{actor.nik}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase px-2 py-0 border-2",
                          actor.businessCategory === 'Kuliner' ? "border-amber-200 text-amber-600 bg-amber-50" : "border-blue-200 text-blue-600 bg-blue-50"
                        )}>
                          {actor.businessCategory || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-bold text-slate-600 uppercase">{actor.coordinator || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-[10px] italic text-red-500 line-clamp-2 max-w-[200px] leading-relaxed" title={actor.rejectionReason}>
                           {actor.rejectionReason || "Tidak ada alasan spesifik."}
                        </p>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                            onClick={() => handlePrintActorForm(actor)}
                            title="Cetak Form"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-all"
                            onClick={() => {
                              setViewingActor(actor)
                              setIsEditMode(false)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <Ban className="w-12 h-12 opacity-10" />
                        <p className="font-black text-[10px] uppercase tracking-[0.2em]">Tidak Ada Data Ditolak</p>
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
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingActor && (
            <div className="flex flex-col gap-2 relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-4">
                <DialogTitle className="text-xl md:text-2xl font-black text-red-700 uppercase">
                  {isEditMode ? "Edit Data Ditolak" : "Detail Lengkap Data Ditolak/Batal"}
                </DialogTitle>
                <div className="flex flex-wrap gap-2">
                  {!isEditMode && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handlePrintActorForm(viewingActor)}
                      className="border-blue-500 text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold"
                      title="Cetak Form Pembatalan"
                    >
                      <Printer className="w-4 h-4 mr-2" /> Cetak Form
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
                  <section className="p-4 bg-red-50 border border-red-200 rounded-2xl relative">
                    <p className="text-[10px] font-black text-red-600 uppercase mb-2 tracking-widest flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Alasan Penolakan (Edit)</p>
                    <Input name="rejectionReason" defaultValue={viewingActor.rejectionReason} className="font-bold text-red-700 bg-white" placeholder="Masukkan alasan penolakan" required />
                  </section>
                  
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nama Lengkap</Label><Input name="fullName" defaultValue={viewingActor.fullName} required /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">NIK</Label><Input value={editNik} onChange={(e) => { const v = e.target.value; setEditNik(v); const dob = extractDobFromNik(v); if (dob) setEditDob(dob); }} required /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor KK</Label><Input name="noKK" defaultValue={viewingActor.noKK} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Jenis Kelamin</Label>
                        <select name="gender" defaultValue={viewingActor.gender || ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                          <option value="L">Laki-Laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Tempat Lahir</Label><Input value={editPob} onChange={(e) => setEditPob(e.target.value)} placeholder="Masukkan tempat lahir" /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Tanggal Lahir</Label><Input value={editDob} readOnly className="bg-muted" /></div>
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
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Usaha</Label><Input name="businessName" defaultValue={viewingActor.businessName} required /></div>
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

                  <div className="sticky bottom-0 bg-white dark:bg-zinc-950 p-4 border-t flex justify-end gap-2 mt-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] rounded-b-lg z-10">
                    <Button type="button" variant="outline" onClick={() => setIsEditMode(false)} className="font-bold">Batal</Button>
                    <Button type="submit" className="bg-primary font-bold"><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</Button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-6 py-4">
                  <section className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                    <p className="text-[10px] font-black text-red-600 uppercase mb-2 tracking-widest flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Alasan Penolakan:</p>
                    <p className="text-sm font-black text-red-700 leading-relaxed italic">
                      "{viewingActor.rejectionReason || "Administrator tidak memberikan alasan spesifik."}"
                    </p>
                  </section>
                  
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {(() => {
                        const parsed = parsePobDob(viewingActor.pobDob || "")
                        return [
                          { label: "Nama Lengkap", value: viewingActor.fullName },
                          { label: "NIK", value: viewingActor.nik },
                          { label: "Nomor KK", value: viewingActor.noKK },
                          { label: "Jenis Kelamin", value: viewingActor.gender },
                          { label: "Tempat Lahir", value: viewingActor.pob || parsed.pob || "-" },
                          { label: "Tanggal Lahir", value: viewingActor.dob || parsed.dob || "-" },
                          { label: "Nomor HP", value: viewingActor.phone }
                        ]
                      })().map((item, i) => (
                         <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold">{item.value || "-"}</p>
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
                        { label: "Usaha", value: viewingActor.businessName },
                        { label: "Kategori Usaha", value: viewingActor.businessCategory },
                        { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                        { label: "KORLAP / DEWAN AKTIF", value: viewingActor.coordinator }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold">{item.value || "-"}</p>
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
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> Informasi Sistem & Audit</div>
                    <div className="bg-slate-50 p-4 rounded-xl text-xs font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Status Terakhir</p>
                        <p className="capitalize text-red-600">Ditolak / Batal</p>
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

      {/* SECTION CETAK FORM TUNGGAL - HANYA DI TAMPILAN PRINT */}
      {actorToPrint && (
        <div className="hidden print:block w-full bg-white text-black p-6 font-sans text-xs leading-relaxed">
          {/* Header Surat Resmi */}
          <div className="flex flex-col items-center text-center border-b-4 border-double border-black pb-4 mb-6">
            <h1 className="text-lg font-black uppercase tracking-wider">PEMERINTAH KOTA KEDIRI</h1>
            <h2 className="text-md font-bold uppercase tracking-wider">DINAS KOPERASI, USAHA MIKRO DAN TENAGA KERJA</h2>
            <p className="text-[10px] font-medium italic">Jl. Hasanudin No. 21 Kediri, Telp (0354) 682955</p>
            <div className="w-full border-t border-black mt-1"></div>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-sm font-black uppercase underline decoration-2">FORMULIR INFORMASI PEMBATALAN PELAKU USAHA</h3>
            <p className="text-[9px] font-mono mt-1 text-slate-500">ID Registrasi: {actorToPrint.id}</p>
          </div>

          {/* Section 1: Data Lengkap Pelaku Usaha */}
          <div className="mb-6">
            <h4 className="text-xs font-black uppercase border-b border-black pb-1 mb-3 flex items-center bg-slate-100 px-2 py-0.5">
              I. DATA LENGKAP PELAKU USAHA
            </h4>
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="w-1/3 py-1.5 font-bold uppercase text-[10px]">Nama Lengkap</td>
                  <td className="w-2/3 py-1.5 uppercase font-semibold">{actorToPrint.fullName || "-"}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 font-bold uppercase text-[10px]">Nomor Induk Kependudukan (NIK)</td>
                  <td className="py-1.5 font-mono font-semibold">{actorToPrint.nik || "-"}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 font-bold uppercase text-[10px]">Nomor Kartu Keluarga (KK)</td>
                  <td className="py-1.5 font-mono font-semibold">{actorToPrint.noKK || "-"}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 font-bold uppercase text-[10px]">Jenis Kelamin</td>
                  <td className="py-1.5 font-semibold">{actorToPrint.gender || "-"}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 font-bold uppercase text-[10px]">Tempat / Tanggal Lahir</td>
                  <td className="py-1.5 uppercase font-semibold">{actorToPrint.pobDob || `${actorToPrint.pob || "-"}, ${actorToPrint.dob || "-"}`}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 font-bold uppercase text-[10px]">Nomor Handphone (HP)</td>
                  <td className="py-1.5 font-semibold">{actorToPrint.phone || "-"}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 font-bold uppercase text-[10px]">Alamat Lengkap</td>
                  <td className="py-1.5 uppercase font-semibold">
                    {actorToPrint.address || "-"}
                    {actorToPrint.rtRw ? ` RT/RW ${actorToPrint.rtRw}` : ""}
                    {actorToPrint.kelurahan ? `, Kel. ${actorToPrint.kelurahan}` : ""}
                    {actorToPrint.kecamatan ? `, Kec. ${actorToPrint.kecamatan}` : ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Informasi Usaha & Perbankan */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-xs font-black uppercase border-b border-black pb-1 mb-3 bg-slate-100 px-2 py-0.5">
                II. INFORMASI USAHA
              </h4>
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="w-5/12 py-1 font-bold uppercase text-[9px]">Nama Usaha</td>
                    <td className="w-7/12 py-1 uppercase font-semibold">{actorToPrint.businessName || "-"}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 font-bold uppercase text-[9px]">Kategori Usaha</td>
                    <td className="py-1 uppercase font-semibold">{actorToPrint.businessCategory || "-"}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 font-bold uppercase text-[9px]">Lokasi Usaha</td>
                    <td className="py-1 uppercase font-semibold">{actorToPrint.businessLocation || "-"}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 font-bold uppercase text-[9px]">Koordinator / Dewan</td>
                    <td className="py-1 uppercase font-semibold">{actorToPrint.coordinator || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase border-b border-black pb-1 mb-3 bg-slate-100 px-2 py-0.5">
                III. DATA PERBANKAN
              </h4>
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="w-5/12 py-1 font-bold uppercase text-[9px]">Nama Bank</td>
                    <td className="w-7/12 py-1 uppercase font-semibold">{actorToPrint.bankName || "-"}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 font-bold uppercase text-[9px]">Nomor Rekening</td>
                    <td className="py-1 font-mono font-semibold">{actorToPrint.bankNumber || "-"}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 font-bold uppercase text-[9px]">Pemilik Rekening</td>
                    <td className="py-1 uppercase font-semibold">{actorToPrint.bankOwner || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: ALASAN PEMBATALAN / CANCEL */}
          <div className="mb-6">
            <h4 className="text-xs font-black uppercase border-b border-black pb-1 mb-2 bg-slate-100 px-2 py-0.5">
              IV. ALASAN DI-CANCEL / DITOLAK
            </h4>
            <div className="border border-black p-3 bg-slate-50 font-bold italic text-slate-800 text-[11px] leading-relaxed uppercase">
              "{actorToPrint.rejectionReason || "ADMINISTRATOR TIDAK MEMBERIKAN ALASAN SPESIFIK."}"
            </div>
          </div>

          {/* Section 4: DATA BLACKLIST PEMBANDING */}
          <div className="mb-8">
            <h4 className="text-xs font-black uppercase border-b border-black pb-1 mb-3 bg-slate-100 px-2 py-0.5">
              V. DATA HISTORI / BLACKLIST PEMBANDING
            </h4>
            {blacklistMatches && blacklistMatches.length > 0 ? (
              <div className="border border-black rounded overflow-hidden">
                <table className="w-full border-collapse text-[9px]">
                  <thead>
                    <tr className="bg-slate-200 border-b border-black">
                      <th className="border-r border-black p-1 text-center font-black uppercase">No</th>
                      <th className="border-r border-black p-1 text-left font-black uppercase">Nama Pembanding</th>
                      <th className="border-r border-black p-1 text-center font-black uppercase">NIK / KK</th>
                      <th className="border-r border-black p-1 text-left font-black uppercase">Sektor Usaha</th>
                      <th className="border-r border-black p-1 text-center font-black uppercase">Tahun</th>
                      <th className="border-r border-black p-1 text-right font-black uppercase">Nominal</th>
                      <th className="border-r border-black p-1 text-center font-black uppercase">Status</th>
                      <th className="p-1 text-left font-black uppercase">Keterangan Sumber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blacklistMatches.map((match: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-300 last:border-b-0">
                        <td className="border-r border-black p-1 text-center font-bold">{idx + 1}</td>
                        <td className="border-r border-black p-1 uppercase font-semibold">{match.nama || "-"}</td>
                        <td className="border-r border-black p-1 font-mono">{match.nik || match.noKK || "-"}</td>
                        <td className="border-r border-black p-1 uppercase">{match.usaha || "-"}</td>
                        <td className="border-r border-black p-1 text-center font-semibold">{match.tahunPengajuan || "-"}</td>
                        <td className="border-r border-black p-1 text-right font-mono font-semibold">
                          {match.nominal ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(match.nominal) : "-"}
                        </td>
                        <td className="border-r border-black p-1 text-center uppercase font-bold text-red-600">{match.status || "REJECT / BLACKLIST"}</td>
                        <td className="p-1 uppercase text-[8px] font-medium">{match.source || "SHEET 4 (BLACKLIST - REJECT)"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-dashed border-slate-400 p-4 text-center font-black uppercase text-[10px] text-emerald-600 tracking-wider bg-emerald-50/50 rounded">
                ✓ BERSIH - TIDAK ADA DATA PADA SHEET BLACKLIST PEMBANDING
              </div>
            )}
          </div>

          {/* Section 5: Lembar Pengesahan */}
          <div className="mt-12">
            <p className="text-right text-[10px] mb-8 font-medium">Kediri, {printDate || new Date().toLocaleString('id-ID')}</p>
            <div className="grid grid-cols-3 gap-4 text-center text-[10px]">
              <div>
                <p className="font-bold uppercase mb-16">Pelaku Usaha</p>
                <p className="font-black uppercase underline">({actorToPrint.fullName})</p>
                <p className="text-[8px] text-slate-500">Tanda Tangan & Nama Terang</p>
              </div>
              <div>
                <p className="font-bold uppercase mb-16">Koordinator / Korlap</p>
                <p className="font-black uppercase underline">({actorToPrint.coordinator || "........................................"})</p>
                <p className="text-[8px] text-slate-500">Tanda Tangan & Nama Terang</p>
              </div>
              <div>
                <p className="font-bold uppercase mb-16">Petugas Verifikasi / Admin</p>
                <p className="font-black uppercase underline">({user?.displayName || userProfile?.fullName || "........................................"})</p>
                <p className="text-[8px] text-slate-500">Dinas Koperasi, Usaha Mikro & Tenaga Kerja</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RejectedPage() {
  return (<Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}><RejectedContent /></Suspense>)
}
