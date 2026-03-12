
"use client"

import { useState } from "react"
import { useMemoFirebase, useCollection, useFirestore } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, Loader2, BadgeCheck } from "lucide-react"
import { BusinessActor } from "../lib/types"

export default function FinishPage() {
  const firestore = useFirestore()
  const [selectedActor, setSelectedActor] = useState<BusinessActor | null>(null)

  const memoQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'businessActors'), where('status', '==', 'finish'))
  }, [firestore])

  const { data: actors, isLoading } = useCollection<BusinessActor>(memoQuery)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <BadgeCheck className="w-8 h-8 text-green-600" />
        <h1 className="text-3xl font-bold text-primary font-headline">Finish</h1>
      </div>
      <p className="text-muted-foreground">Daftar semua data pelaku usaha yang telah melewati semua tahap verifikasi.</p>

      <Card className="border-none shadow-sm overflow-hidden bg-card text-card-foreground">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Usaha</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actors?.map((actor) => (
                  <TableRow key={actor.id} className="hover:bg-green-50/50">
                    <TableCell className="font-medium text-green-700">{actor.fullName}</TableCell>
                    <TableCell>{actor.nik}</TableCell>
                    <TableCell>{actor.businessName}</TableCell>
                    <TableCell>{actor.bankName}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedActor(actor)} className="text-primary font-bold">
                            <Eye className="w-4 h-4 mr-2" /> VIEW
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Detail Lengkap Pelaku Usaha</DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm pt-4">
                            <div className="col-span-2 bg-muted/50 p-2 font-bold rounded">INFORMASI PRIBADI</div>
                            <div>
                              <p className="text-muted-foreground">Nama Lengkap</p>
                              <p className="font-medium">{actor.fullName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Gender</p>
                              <p className="font-medium">{actor.gender}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">NIK</p>
                              <p className="font-medium">{actor.nik}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">No KK</p>
                              <p className="font-medium">{actor.noKK}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Tempat / Tgl Lahir</p>
                              <p className="font-medium">{actor.pobDob}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">HP</p>
                              <p className="font-medium">{actor.phone}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Kecamatan</p>
                              <p className="font-medium">{actor.kecamatan || "-"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Kelurahan</p>
                              <p className="font-medium">{actor.kelurahan}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-muted-foreground">Alamat</p>
                              <p className="font-medium">{actor.address} (RT/RW: {actor.rtRw})</p>
                            </div>

                            <div className="col-span-2 bg-muted/50 p-2 font-bold rounded mt-4">DATA USAHA</div>
                            <div>
                              <p className="text-muted-foreground">Nama Usaha</p>
                              <p className="font-medium">{actor.businessName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Kategori</p>
                              <p className="font-medium">{actor.businessCategory}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-muted-foreground">Lokasi Usaha</p>
                              <p className="font-medium">{actor.businessLocation}</p>
                            </div>

                            <div className="col-span-2 bg-muted/50 p-2 font-bold rounded mt-4">DATA REKENING</div>
                            <div>
                              <p className="text-muted-foreground">Bank</p>
                              <p className="font-medium">{actor.bankName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Nomor Rekening</p>
                              <p className="font-medium">{actor.bankNumber}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-muted-foreground">Nama Pemilik Rekening</p>
                              <p className="font-medium uppercase">{actor.bankOwner}</p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
