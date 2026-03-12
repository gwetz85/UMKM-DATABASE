"use client"

import { useState } from "react"
import { useMemoFirebase, useCollection, useUser, useFirestore, updateDocumentNonBlocking, useDoc, deleteDocumentNonBlocking } from "@/firebase"
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
    if (!editingActor || !firestore) return

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
    if (!isAdmin || !firestore) return
    
    if (confirm(`Hapus permanen data pelaku "${fullName}"? Data ini tidak akan bisa diakses lagi di tahapan manapun.`)) {
      const actorRef = doc(firestore, 'businessActors', actorId)
      deleteDocumentNonBlocking(actorRef)
      toast({ 
        variant: "destructive",
        title: "Data Dihapus Permanen", 
        description: `Data ${fullName} telah dihapus dari database.` 
      })
    }
  }

  const handlePrint = (actor: BusinessActor) => {
    window.print()
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">Data Pelaku Usaha</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Data yang telah lolos verifikasi awal. {isAdmin ? "Kelola atau hapus data di sini." : "Isi data rekening atau cetak data."}</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-primary font-bold text-[10px] md:text-xs uppercase tracking-widest border border-primary/20">
            <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" /> Akses Admin
          </div>
        )}
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Nama</TableHead>
                    <TableHead className="whitespace-nowrap">Usaha</TableHead>
                    <TableHead className="whitespace-nowrap">Status Rekening</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actors?.map((actor) => (
                    <TableRow key={actor.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-medium text-slate-700 whitespace-nowrap">{actor.fullName}</TableCell>
                      <TableCell className="whitespace-nowrap">{actor.businessName}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {actor.bankNumber ? (
                          <span className="text-[9px] md:text-[10px] px-2 py-0.5 md:py-1 bg-green-100 text-green-700 rounded-full font-black uppercase">TERISI</span>
                        ) : (
                          <span className="text-[9px] md:text-[10px] px-2 py-0.5 md:py-1 bg-amber-100 text-amber-700 rounded-full font-black uppercase">BELUM</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5 md:gap-2">
                          <Button size="sm" variant="outline" onClick={() => handlePrint(actor)} title="Cetak Data" className="h-8 px-2 md:h-9 md:px-3">
                            <Printer className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden lg:inline ml-2">PRINT</span>
                          </Button>
                          
                          <Dialog open={!!editingActor && editingActor.id === actor.id} onOpenChange={(open) => !open && setEditingActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary" onClick={() => setEditingActor(actor)} title="Edit Rekening" className="h-8 px-2 md:h-9 md:px-3">
                                <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden lg:inline ml-2">EDIT</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
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
                                  <Button type="submit" className="w-full sm:w-auto"><Save className="w-4 h-4 mr-2" /> Simpan Rekening</Button>
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
                              className="bg-red-500 hover:bg-red-600 h-8 px-2 md:h-9 md:px-3"
                            >
                              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden lg:inline ml-2">HAPUS</span>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
