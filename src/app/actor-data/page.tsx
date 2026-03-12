
"use client"

import { useState } from "react"
import { useMemoFirebase, useCollection, useFirestore, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Printer, Edit3, Loader2, Save } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"

export default function ActorDataPage() {
  const firestore = useFirestore()
  const { toast } = useToast()
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)

  const memoQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'businessActors'), where('status', 'in', ['verified_actor', 'bank_pending', 'finish']))
  }, [firestore])

  const { data: actors, isLoading } = useCollection<BusinessActor>(memoQuery)

  const handleSaveBank = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingActor) return

    const formData = new FormData(e.currentTarget)
    const actorRef = doc(firestore, 'businessActors', editingActor.id)
    
    updateDocumentNonBlocking(actorRef, {
      bankNumber: formData.get('bankNumber'),
      bankOwner: formData.get('bankOwner'),
      bankName: formData.get('bankName'),
      status: 'bank_pending'
    })

    toast({ title: "Tersimpan", description: "Data rekening telah dikirim untuk verifikasi." })
    setEditingActor(null)
  }

  const handlePrint = (actor: BusinessActor) => {
    window.print()
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-primary font-headline">Data Pelaku Usaha</h1>
      <p className="text-muted-foreground">Data yang telah diverifikasi admin. Lanjutkan dengan mengisi data rekening atau cetak.</p>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Usaha</TableHead>
                  <TableHead>Status Rekening</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actors?.map((actor) => (
                  <TableRow key={actor.id}>
                    <TableCell className="font-medium">{actor.fullName}</TableCell>
                    <TableCell>{actor.businessName}</TableCell>
                    <TableCell>
                      {actor.bankNumber ? (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold">TERISI</span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-bold">BELUM</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handlePrint(actor)}>
                        <Printer className="w-4 h-4 mr-2" /> PRINT
                      </Button>
                      <Dialog open={!!editingActor && editingActor.id === actor.id} onOpenChange={(open) => !open && setEditingActor(null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="secondary" onClick={() => setEditingActor(actor)}>
                            <Edit3 className="w-4 h-4 mr-2" /> EDIT
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <form onSubmit={handleSaveBank}>
                            <DialogHeader>
                              <DialogTitle>Input Data Rekening</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="space-y-2">
                                <Label>Nomor Rekening</Label>
                                <Input name="bankNumber" defaultValue={actor.bankNumber} required />
                              </div>
                              <div className="space-y-2">
                                <Label>Nama Pemilik Rekening</Label>
                                <Input name="bankOwner" defaultValue={actor.bankOwner} required />
                              </div>
                              <div className="space-y-2">
                                <Label>Nama Bank</Label>
                                <Input name="bankName" defaultValue={actor.bankName} required />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="submit"><Save className="w-4 h-4 mr-2" /> Simpan Rekening</Button>
                            </DialogFooter>
                          </form>
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
