
"use client"

import { useState } from "react"
import { useMemoFirebase, useCollection, useFirestore, updateDocumentNonBlocking, useDoc, useUser, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Printer, Edit3, Loader2, Save, Trash2, ShieldCheck } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"

export default function ActorDataPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)

  // Admin Check
  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])

  const { data: adminRole } = useDoc(adminRef)
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

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

  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin) return
    
    if (confirm(`Hapus permanen data pelaku "${fullName}"? Tindakan ini tidak dapat dibatalkan.`)) {
      deleteDocumentNonBlocking(doc(firestore, 'businessActors', actorId))
      toast({ 
        variant: "destructive",
        title: "Data Terhapus", 
        description: `Data ${fullName} telah dihapus dari sistem.` 
      })
    }
  }

  const handlePrint = (actor: BusinessActor) => {
    window.print()
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-primary font-headline">Data Pelaku Usaha</h1>
          <p className="text-muted-foreground">Data yang telah diverifikasi admin. Lanjutkan dengan mengisi data rekening atau cetak.</p>
        </div>
        {isAdmin && (
          <div className="hidden md:flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-xl text-primary font-bold text-xs uppercase tracking-widest border border-primary/20">
            <ShieldCheck className="w-4 h-4" /> Mode Admin Aktif
          </div>
        )}
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
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
                  <TableRow key={actor.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="font-medium text-slate-700">{actor.fullName}</TableCell>
                    <TableCell>{actor.businessName}</TableCell>
                    <TableCell>
                      {actor.bankNumber ? (
                        <span className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded-full font-black uppercase">TERISI</span>
                      ) : (
                        <span className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-black uppercase">BELUM</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handlePrint(actor)} title="Cetak Data">
                          <Printer className="w-4 h-4" /> <span className="hidden lg:inline ml-2">PRINT</span>
                        </Button>
                        
                        <Dialog open={!!editingActor && editingActor.id === actor.id} onOpenChange={(open) => !open && setEditingActor(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="secondary" onClick={() => setEditingActor(actor)} title="Edit Rekening">
                              <Edit3 className="w-4 h-4" /> <span className="hidden lg:inline ml-2">EDIT</span>
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

                        {isAdmin && (
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleDelete(actor.id, actor.fullName)}
                            title="Hapus Data Pelaku"
                            className="bg-red-500 hover:bg-red-600"
                          >
                            <Trash2 className="w-4 h-4" /> <span className="hidden lg:inline ml-2">HAPUS</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!actors || actors.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 text-muted-foreground font-medium italic">
                      Belum ada data pelaku usaha yang terverifikasi.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
