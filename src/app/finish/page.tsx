
"use client"

import { useState, useEffect } from "react"
import { useMemoFirebase, useCollection, useFirestore, useUser } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, Loader2, BadgeCheck, Printer } from "lucide-react"
import { BusinessActor } from "../lib/types"

export default function FinishPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [selectedActor, setSelectedActor] = useState<BusinessActor | null>(null)
  const [printDate, setPrintDate] = useState<string>("")

  useEffect(() => {
    setPrintDate(new Date().toLocaleString('id-ID'))
  }, [])

  const memoQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'businessActors'), where('status', '==', 'finish'))
  }, [firestore])

  const { data: actors, isLoading } = useCollection<BusinessActor>(memoQuery)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header Cetak - Hanya Muncul Saat Print */}
      <div className="hidden print:block text-center space-y-2 mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-black uppercase">LAPORAN PENYELESAIAN DATA (FINISH)</h1>
        <p className="text-sm font-bold">Sistem Manajemen Terpadu Database UMKM</p>
        <p className="text-xs italic">Dicetak pada: {printDate}</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <BadgeCheck className="w-8 h-8 text-green-600" />
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-primary font-headline leading-tight">Finish</h1>
            <p className="text-muted-foreground text-sm">Daftar data yang telah melewati semua tahap verifikasi.</p>
          </div>
        </div>
        <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 font-bold shadow-md w-full md:w-auto">
          <Printer className="w-4 h-4 mr-2" /> CETAK SEMUA
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-card text-card-foreground print:shadow-none print:border print:rounded-none">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center print:hidden"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <Table className="print:text-[12px]">
              <TableHeader className="bg-muted/30 print:bg-gray-100">
                <TableRow>
                  <TableHead className="font-bold">Nama Lengkap</TableHead>
                  <TableHead className="font-bold">NIK</TableHead>
                  <TableHead className="font-bold print:hidden">Usaha</TableHead>
                  <TableHead className="font-bold print:hidden">Bank</TableHead>
                  <TableHead className="text-right font-bold print:hidden">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actors?.map((actor) => (
                  <TableRow key={actor.id} className="hover:bg-green-50/50 print:border-b print:border-gray-300">
                    <TableCell className="font-bold text-green-700 print:text-black uppercase">{actor.fullName}</TableCell>
                    <TableCell className="font-mono">{actor.nik}</TableCell>
                    <TableCell className="print:hidden">{actor.businessName}</TableCell>
                    <TableCell className="print:hidden">{actor.bankName}</TableCell>
                    <TableCell className="text-right print:hidden">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedActor(actor)} className="text-primary font-bold">
                            <Eye className="w-4 h-4 mr-2" /> VIEW
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-black text-primary uppercase">Detail Lengkap Pelaku Usaha</DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm pt-4">
                            <div className="col-span-2 bg-muted/50 p-2 font-black rounded text-[10px] uppercase tracking-widest">INFORMASI PRIBADI</div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Nama Lengkap</p>
                              <p className="font-bold">{actor.fullName}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Gender</p>
                              <p className="font-bold">{actor.gender}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">NIK</p>
                              <p className="font-mono font-bold">{actor.nik}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">No KK</p>
                              <p className="font-mono font-bold">{actor.noKK}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Tempat / Tgl Lahir</p>
                              <p className="font-bold">{actor.pobDob}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">HP</p>
                              <p className="font-bold">{actor.phone}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Kecamatan</p>
                              <p className="font-bold">{actor.kecamatan || "-"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Kelurahan</p>
                              <p className="font-bold">{actor.kelurahan}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Alamat</p>
                              <p className="font-bold">{actor.address} (RT/RW: {actor.rtRw})</p>
                            </div>

                            <div className="col-span-2 bg-muted/50 p-2 font-black rounded text-[10px] uppercase tracking-widest mt-4">DATA USAHA</div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Nama Usaha</p>
                              <p className="font-bold">{actor.businessName}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Kategori</p>
                              <p className="font-bold">{actor.businessCategory}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Lokasi Usaha</p>
                              <p className="font-bold">{actor.businessLocation}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Koordinator</p>
                              <p className="font-bold">{actor.coordinator}</p>
                            </div>

                            <div className="col-span-2 bg-muted/50 p-2 font-black rounded text-[10px] uppercase tracking-widest mt-4">DATA REKENING</div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Bank</p>
                              <p className="font-bold text-primary">{actor.bankName}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Nomor Rekening</p>
                              <p className="font-mono font-black text-primary text-lg">{actor.bankNumber}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Nama Pemilik Rekening</p>
                              <p className="font-black uppercase text-primary">{actor.bankOwner}</p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {(!actors || actors.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-medium italic">
                      Tidak ada data pelaku usaha yang telah selesai diverifikasi.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Footer Cetak - Hanya Muncul Saat Print */}
      <div className="hidden print:flex justify-end mt-12 pr-12">
        <div className="text-center space-y-16">
          <p className="font-bold">Dicetak oleh Admin Database,</p>
          <div className="space-y-1">
            <p className="font-black underline uppercase">{user?.email?.split('@')[0]}</p>
            <p className="text-[10px]">ID: {user?.uid}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
