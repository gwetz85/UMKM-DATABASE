
"use client"

import { useState, useEffect, Suspense } from "react"
import { useMemoFirebase, useCollection, useUser, useFirestore, updateDocumentNonBlocking, useDoc, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc, limit } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Printer, Edit3, Loader2, Save, Trash2, ShieldCheck, Eye, User, Building2, CreditCard, History, X, RotateCcw, Image as ImageIcon, FileText } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"

function ActorDataContent() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterCoordinator = searchParams.get('coordinator')
  
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [printDate, setPrintDate] = useState<string>("")

  useEffect(() => {
    setPrintDate(new Date().toLocaleString('id-ID'))
  }, [])

  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])
  const { data: adminRole } = useDoc(adminRef)

  const userProfileQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return query(collection(firestore, 'system_users'), where('uid', '==', user.uid), limit(1))
  }, [user, firestore])
  const { data: userProfiles } = useCollection(userProfileQuery)
  const userProfile = userProfiles?.[0]

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isMonitoring = userProfile?.role === 'monitoring'

  const memoQuery = useMemoFirebase(() => {
    if (!firestore) return null
    let q = query(collection(firestore, 'businessActors'), where('status', 'in', ['verified_actor', 'bank_pending', 'finish']))
    if (filterCoordinator) q = query(q, where('coordinator', '==', filterCoordinator))
    return q
  }, [firestore, filterCoordinator])

  const { data: actors, isLoading } = useCollection<BusinessActor>(memoQuery)

  const handleSaveBank = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingActor || !firestore || isMonitoring) return
    const formData = new FormData(e.currentTarget)
    updateDocumentNonBlocking(doc(firestore, 'businessActors', editingActor.id), {
      bankNumber: formData.get('bankNumber'),
      bankOwner: formData.get('bankOwner'),
      bankName: formData.get('bankName'),
      status: 'bank_pending'
    })
    toast({ title: "Tersimpan", description: "Data rekening telah dikirim." })
    setEditingActor(null)
  }

  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !firestore) return
    if (confirm(`Revert ${fullName}?`)) {
      updateDocumentNonBlocking(doc(firestore, 'businessActors', actorId), { status: 'pending' })
      toast({ title: "Berhasil", description: "Status dikembalikan ke Pending." })
    }
  }

  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin || !firestore) return
    if (confirm(`Hapus permanen ${fullName}?`)) {
      deleteDocumentNonBlocking(doc(firestore, 'businessActors', actorId))
      toast({ variant: "destructive", title: "Terhapus", description: "Data dihapus permanen." })
    }
  }

  const renderFileDisplay = (uri: string, label: string) => {
    if (!uri) return <div className="flex flex-col items-center gap-1 opacity-20"><ImageIcon className="w-8 h-8" /><span className="text-[10px] font-bold">KOSONG</span></div>
    if (uri.startsWith('data:application/pdf')) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-slate-100 p-2 gap-2 text-center">
          <FileText className="w-8 h-8 text-red-500" />
          <span className="text-[9px] font-black text-slate-600 uppercase">PDF</span>
          <a href={uri} target="_blank" rel="noopener noreferrer" className="text-[8px] bg-primary text-white px-2 py-1 rounded font-bold hover:bg-primary/80 transition-colors">LIHAT PDF</a>
        </div>
      )
    }
    return <Image src={uri} alt={label} fill className="object-contain" unoptimized />
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="hidden print:block text-center space-y-2 mb-8 border-b-2 border-black pb-4"><h1 className="text-xl font-black uppercase">LAPORAN DATA PELAKU USAHA UMKM</h1><p className="text-xs font-bold">Sistem Manajemen Terpadu Database UMKM</p></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="space-y-1"><h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">Data Pelaku Usaha</h1><p className="text-xs md:text-sm text-muted-foreground">Data lolos verifikasi awal.</p>
          {filterCoordinator && (<div className="flex items-center gap-2 mt-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 w-fit"><span className="text-[10px] font-black text-primary uppercase">Filter: {filterCoordinator}</span><button onClick={() => router.push('/actor-data')} className="text-primary"><X className="w-3.5 h-3.5" /></button></div>)}
        </div>
        <div className="flex items-center gap-2"><Button onClick={() => window.print()} className="bg-primary font-bold shadow-md"><Printer className="w-4 h-4 mr-2" /> CETAK</Button></div>
      </div>

      <Card className="border-none shadow-sm bg-card print:shadow-none print:border">
        <CardContent className="p-0">
          {isLoading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div> : (
            <div className="overflow-x-auto print:overflow-visible">
              <Table className="print:text-[9px] print:w-full">
                <TableHeader className="bg-muted/30 print:bg-gray-100"><TableRow><TableHead className="font-bold">Nama Pelaku</TableHead><TableHead className="font-bold">NIK</TableHead><TableHead className="font-bold">Nama Usaha</TableHead><TableHead className="font-bold">Bank</TableHead><TableHead className="font-bold">No. Rekening</TableHead><TableHead className="text-right font-bold print:hidden">Aksi</TableHead></TableRow></TableHeader>
                <TableBody>
                  {actors?.map((actor) => (
                    <TableRow key={actor.id} className="hover:bg-muted/10 print:border-b">
                      <TableCell className="font-bold">{actor.fullName}</TableCell><TableCell className="font-mono">{actor.nik}</TableCell><TableCell className="font-medium">{actor.businessName}</TableCell><TableCell>{actor.bankName || "-"}</TableCell><TableCell className="font-mono">{actor.bankNumber || "-"}</TableCell>
                      <TableCell className="text-right print:hidden">
                        <div className="flex justify-end gap-1.5 md:gap-2">
                          <Dialog open={!!viewingActor && viewingActor.id === actor.id} onOpenChange={(open) => !open && setViewingActor(null)}>
                            <DialogTrigger asChild><Button size="sm" variant="outline" onClick={() => setViewingActor(actor)} className="h-9 text-primary font-bold"><Eye className="w-4 h-4" /></Button></DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              {viewingActor && (<><DialogHeader><DialogTitle className="text-2xl font-black text-primary uppercase">Detail Pelaku Usaha</DialogTitle></DialogHeader>
                                <div className="grid gap-6 py-4">
                                  <section className="space-y-4"><div className="flex items-center gap-2 text-primary font-black text-sm uppercase"><User className="w-4 h-4" /> Informasi Pribadi</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                                      {[{ label: "Nama", value: actor.fullName }, { label: "NIK", value: actor.nik }, { label: "KK", value: actor.noKK }, { label: "Gender", value: actor.gender }, { label: "Lahir", value: actor.pobDob }, { label: "HP", value: actor.phone }, { label: "Kecamatan", value: actor.kecamatan }, { label: "Kelurahan", value: actor.kelurahan }, { label: "RT/RW", value: actor.rtRw }].map((item, i) => (<div key={i} className="space-y-1"><p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p><p className="text-sm font-bold">{item.value || "-"}</p></div>))}
                                    </div></section>
                                  <section className="space-y-4"><div className="flex items-center gap-2 text-primary font-black text-sm uppercase"><ImageIcon className="w-4 h-4" /> Lampiran Berkas</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                      {[{ label: "KTP", uri: actor.ktpUri }, { label: "KK", uri: actor.kkUri }, { label: "NIB", uri: actor.nibUri }, { label: "Foto Usaha", uri: actor.photoUsahaUri }].map((doc, idx) => (<div key={idx} className="space-y-2"><p className="text-[10px] font-black text-muted-foreground uppercase text-center">{doc.label}</p><div className="aspect-[3/4] rounded-xl border-2 border-dashed bg-slate-50 relative overflow-hidden flex items-center justify-center">{renderFileDisplay(doc.uri || "", doc.label)}</div></div>))}
                                    </div></section>
                                  <section className="space-y-4"><div className="flex items-center gap-2 text-primary font-black text-sm uppercase"><CreditCard className="w-4 h-4" /> Rekening</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                                      {[{ label: "Bank", value: actor.bankName }, { label: "No. Rek", value: actor.bankNumber }, { label: "Pemilik", value: actor.bankOwner }].map((item, i) => (<div key={i} className="space-y-1"><p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p><p className="text-sm font-black text-primary">{item.value || "BELUM TERISI"}</p></div>))}
                                    </div></section>
                                  <section className="space-y-4"><div className="flex items-center gap-2 text-primary font-black text-sm uppercase"><History className="w-4 h-4" /> Audit</div><div className="bg-slate-50 p-4 rounded-xl text-sm font-bold flex justify-between"><span>Input Oleh: <span className="text-primary">{actor.createdBy || "System"}</span></span><span>Daftar: {actor.createdAt ? new Date(actor.createdAt).toLocaleDateString('id-ID') : "-"}</span></div></section>
                                </div></>)}
                            </DialogContent>
                          </Dialog>
                          {!isMonitoring && (<Dialog open={!!editingActor && editingActor.id === actor.id} onOpenChange={(open) => !open && setEditingActor(null)}><DialogTrigger asChild><Button size="sm" variant="secondary" onClick={() => setEditingActor(actor)} className="h-9 font-bold"><Edit3 className="w-3.5 h-3.5" /></Button></DialogTrigger><DialogContent className="sm:max-w-[425px]"><form onSubmit={handleSaveBank}><DialogHeader><DialogTitle className="text-xl font-black text-primary">INPUT REKENING</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div className="space-y-2"><Label className="font-bold">Nomor Rekening</Label><Input name="bankNumber" defaultValue={actor.bankNumber} required /></div><div className="space-y-2"><Label className="font-bold">Nama Pemilik</Label><Input name="bankOwner" defaultValue={actor.bankOwner} className="uppercase" required /></div><div className="space-y-2"><Label className="font-bold">Nama Bank</Label><Input name="bankName" defaultValue={actor.bankName} required /></div></div><DialogFooter><Button type="submit" className="w-full bg-primary font-bold"><Save className="w-4 h-4 mr-2" /> Simpan</Button></DialogFooter></form></DialogContent></Dialog>)}
                          {isAdmin && (<><Button size="sm" variant="outline" onClick={() => handleRevert(actor.id, actor.fullName)} className="h-9 border-amber-500 text-amber-600"><RotateCcw className="w-3.5 h-3.5" /></Button><Button size="sm" variant="destructive" onClick={() => handleDelete(actor.id, actor.fullName)} className="h-9"><Trash2 className="w-3.5 h-3.5" /></Button></>)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ActorDataPage() {
  return (<Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}><ActorDataContent /></Suspense>)
}
