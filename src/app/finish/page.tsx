
"use client"

import { useState, useEffect } from "react"
import { useMemoFirebase, useCollection, useFirestore, useUser, useDoc, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, Loader2, BadgeCheck, Printer, History, RotateCcw, User, Building2, MapPin, CreditCard } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"

export default function FinishPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const [printDate, setPrintDate] = useState<string>("")

  useEffect(() => {
    setPrintDate(new Date().toLocaleString('id-ID'))
  }, [])

  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])
  const { data: adminRole } = useDoc(adminRef)
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

  const memoQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'businessActors'), where('status', '==', 'finish'))
  }, [firestore])

  const { data: actors, isLoading } = useCollection<BusinessActor>(memoQuery)

  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !firestore) return
    if (confirm(`Kembalikan ${fullName} ke antrean awal?`)) {
      updateDocumentNonBlocking(doc(firestore, 'businessActors', actorId), { status: 'pending' })
      toast({ title: "Berhasil", description: "Data dikembalikan ke antrean." })
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="hidden print:block text-center space-y-2 mb-8 border-b-2 border-black pb-4"><h1 className="text-2xl font-black uppercase">LAPORAN PENYELESAIAN DATA (FINISH)</h1><p className="text-sm font-bold">Sistem Manajemen Terpadu UMKM</p></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3"><BadgeCheck className="w-8 h-8 text-green-600" /><div className="flex flex-col"><h1 className="text-3xl font-bold text-primary font-headline">Finish</h1><p className="text-muted-foreground text-sm">Data final yang telah diverifikasi penuh.</p></div></div>
        <Button onClick={() => window.print()} className="bg-primary font-bold shadow-md w-full md:w-auto"><Printer className="w-4 h-4 mr-2" /> CETAK SEMUA</Button>
      </div>

      <Card className="border-none shadow-sm bg-card print:shadow-none print:border">
        <CardContent className="p-0">
          {isLoading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div> : (
            <div className="overflow-x-auto">
              <Table className="print:text-[8px]">
                <TableHeader className="bg-muted/30"><TableRow><TableHead className="font-bold">Nama</TableHead><TableHead className="font-bold">NIK</TableHead><TableHead className="font-bold">Rekening</TableHead><TableHead className="font-bold">Bank</TableHead><TableHead className="font-bold">Usaha</TableHead><TableHead className="font-bold">Kelurahan</TableHead><TableHead className="text-right font-bold print:hidden">Detail</TableHead></TableRow></TableHeader>
                <TableBody>
                  {actors?.map((actor) => (
                    <TableRow key={actor.id} className="hover:bg-green-50/50 print:border-b">
                      <TableCell className="font-bold text-green-700 uppercase">{actor.fullName}</TableCell><TableCell className="font-mono">{actor.nik}</TableCell><TableCell className="font-mono">{actor.bankNumber}</TableCell><TableCell>{actor.bankName}</TableCell><TableCell>{actor.businessName}</TableCell><TableCell>{actor.kelurahan}</TableCell>
                      <TableCell className="text-right print:hidden">
                        <div className="flex justify-end gap-2">
                          {isAdmin && <Button size="sm" variant="ghost" onClick={() => handleRevert(actor.id, actor.fullName)} className="text-amber-600 font-bold"><RotateCcw className="w-4 h-4" /></Button>}
                          <Dialog>
                            <DialogTrigger asChild><Button size="sm" variant="ghost" className="text-primary font-bold"><Eye className="w-4 h-4" /></Button></DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader><DialogTitle className="text-2xl font-black text-primary uppercase">Detail Lengkap Data Final</DialogTitle></DialogHeader>
                              <div className="grid grid-cols-1 gap-8 pt-4">
                                <section className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-muted/30 p-4 rounded-xl">
                                    {[{ l: "Nama Lengkap", v: actor.fullName }, { l: "NIK", v: actor.nik }, { l: "Nomor KK", v: actor.noKK }, { l: "Gender", v: actor.gender }, { l: "Lahir", v: actor.pobDob }, { l: "HP", v: actor.phone }].map((x, i) => (<div key={i}><p className="text-[10px] font-bold text-muted-foreground uppercase">{x.l}</p><p className="font-bold">{x.v}</p></div>))}
                                  </div>
                                </section>

                                <section className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat & Domisili</div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-muted/30 p-4 rounded-xl">
                                    {[{ l: "Alamat", v: actor.address }, { l: "RT/RW", v: actor.rtRw }, { l: "Kelurahan", v: actor.kelurahan }, { l: "Kecamatan", v: actor.kecamatan }].map((x, i) => (<div key={i}><p className="text-[10px] font-bold text-muted-foreground uppercase">{x.l}</p><p className="font-bold">{x.v}</p></div>))}
                                  </div>
                                </section>

                                <section className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Building2 className="w-4 h-4" /> Informasi Usaha</div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-muted/30 p-4 rounded-xl">
                                    {[{ l: "Nama Usaha", v: actor.businessName }, { l: "Kategori", v: actor.businessCategory }, { l: "Lokasi", v: actor.businessLocation }, { l: "Koordinator", v: actor.coordinator }].map((x, i) => (<div key={i}><p className="text-[10px] font-bold text-muted-foreground uppercase">{x.l}</p><p className="font-bold">{x.v}</p></div>))}
                                  </div>
                                </section>

                                <section className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Data Rekening</div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                                    <div><p className="text-[10px] font-bold text-muted-foreground uppercase">Bank</p><p className="font-bold text-primary">{actor.bankName}</p></div>
                                    <div><p className="text-[10px] font-bold text-muted-foreground uppercase">Nomor Rekening</p><p className="font-mono font-black text-primary text-lg">{actor.bankNumber}</p></div>
                                    <div><p className="text-[10px] font-bold text-muted-foreground uppercase">Nama Pemilik</p><p className="font-black text-primary uppercase">{actor.bankOwner}</p></div>
                                  </div>
                                </section>

                                <section className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> Informasi Audit</div>
                                  <div className="bg-slate-50 p-4 rounded-xl text-[10px] font-bold flex justify-between border">
                                    <span>DIINPUT OLEH: <span className="text-primary">{actor.createdBy || "System"}</span></span>
                                    <span>TANGGAL INPUT: {actor.createdAt ? new Date(actor.createdAt).toLocaleDateString('id-ID') : "-"}</span>
                                  </div>
                                </section>
                              </div>
                            </DialogContent>
                          </Dialog>
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
