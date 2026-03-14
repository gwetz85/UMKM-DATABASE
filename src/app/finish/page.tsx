
"use client"

import { useState, useEffect } from "react"
import { useMemoFirebase, useCollection, useFirestore, useUser, useDoc, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, Loader2, BadgeCheck, Printer, History, RotateCcw, Image as ImageIcon, FileText } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

export default function FinishPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const [selectedActor, setSelectedActor] = useState<BusinessActor | null>(null)
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
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                <div className="space-y-4">
                                  <div className="bg-muted/50 p-2 font-black rounded text-[10px] uppercase">Informasi Pribadi</div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    {[{ l: "Nama", v: actor.fullName }, { l: "Gender", v: actor.gender }, { l: "NIK", v: actor.nik }, { l: "KK", v: actor.noKK }, { l: "HP", v: actor.phone }, { l: "Alamat", v: `${actor.address} (${actor.rtRw})` }].map((x, i) => (<div key={i}><p className="text-[10px] font-bold text-muted-foreground uppercase">{x.l}</p><p className="font-bold">{x.v}</p></div>))}
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <div className="bg-muted/50 p-2 font-black rounded text-[10px] uppercase">Lampiran Berkas</div>
                                  <div className="grid grid-cols-2 gap-4">
                                    {[{ l: "KTP", u: actor.ktpUri }, { l: "KK", u: actor.kkUri }, { l: "NIB", u: actor.nibUri }, { l: "Usaha", u: actor.photoUsahaUri }].map((d, i) => (<div key={i} className="space-y-1 text-center"><p className="text-[10px] font-bold text-muted-foreground uppercase">{d.l}</p><div className="aspect-[3/4] rounded-lg border bg-slate-50 relative overflow-hidden flex items-center justify-center">{renderFileDisplay(d.u || "", d.l)}</div></div>))}
                                  </div>
                                </div>
                                <div className="md:col-span-2 space-y-4">
                                  <div className="bg-muted/50 p-2 font-black rounded text-[10px] uppercase">Data Rekening</div>
                                  <div className="grid grid-cols-3 gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                                    <div><p className="text-[10px] font-bold text-muted-foreground">Bank</p><p className="font-bold text-primary">{actor.bankName}</p></div>
                                    <div><p className="text-[10px] font-bold text-muted-foreground">No. Rek</p><p className="font-mono font-black text-primary text-lg">{actor.bankNumber}</p></div>
                                    <div><p className="text-[10px] font-bold text-muted-foreground">Pemilik</p><p className="font-black text-primary uppercase">{actor.bankOwner}</p></div>
                                  </div>
                                </div>
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
