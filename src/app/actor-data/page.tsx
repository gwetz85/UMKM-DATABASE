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
import { Printer, Edit3, Loader2, Save, Trash2, ShieldCheck, Eye, User, Building2, CreditCard, FileText } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"

export default function ActorDataPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)

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

  const handlePrintAll = () => {
    window.print()
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header Cetak (Hanya terlihat saat diprint) */}
      <div className="hidden print:block text-center space-y-2 mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-black uppercase">LAPORAN DATA PELAKU USAHA UMKM</h1>
        <p className="text-sm font-bold">Sistem Manajemen Terpadu Database UMKM</p>
        <p className="text-xs italic">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">Data Pelaku Usaha</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Data yang telah lolos verifikasi awal.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrintAll} variant="default" className="bg-primary hover:bg-primary/90 font-bold shadow-md">
            <Printer className="w-4 h-4 mr-2" /> CETAK SEMUA DATA
          </Button>
          {isAdmin && (
            <div className="hidden md:flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-xl text-primary font-bold text-xs uppercase tracking-widest border border-primary/20">
              <ShieldCheck className="w-4 h-4" /> Akses Admin
            </div>
          )}
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white print:shadow-none print:border print:rounded-none">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center print:hidden"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="print:text-[10px] print:w-full">
                <TableHeader className="bg-muted/30 print:bg-gray-100">
                  <TableRow>
                    <TableHead className="whitespace-nowrap font-bold">Nama Pelaku</TableHead>
                    <TableHead className="whitespace-nowrap font-bold">NIK</TableHead>
                    <TableHead className="whitespace-nowrap font-bold">Nama Usaha</TableHead>
                    <TableHead className="whitespace-nowrap font-bold">Kategori</TableHead>
                    <TableHead className="whitespace-nowrap font-bold">Bank</TableHead>
                    <TableHead className="whitespace-nowrap font-bold">No. Rekening</TableHead>
                    <TableHead className="text-right whitespace-nowrap font-bold print:hidden">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actors?.map((actor) => (
                    <TableRow key={actor.id} className="hover:bg-muted/10 transition-colors print:border-b print:border-gray-300">
                      <TableCell className="font-bold text-slate-700 whitespace-nowrap">{actor.fullName}</TableCell>
                      <TableCell className="font-mono">{actor.nik}</TableCell>
                      <TableCell className="font-medium">{actor.businessName}</TableCell>
                      <TableCell>{actor.businessCategory}</TableCell>
                      <TableCell>{actor.bankName || "-"}</TableCell>
                      <TableCell className="font-mono">{actor.bankNumber || "-"}</TableCell>
                      <TableCell className="text-right print:hidden">
                        <div className="flex justify-end gap-1.5 md:gap-2">
                          <Dialog open={!!viewingActor && viewingActor.id === actor.id} onOpenChange={(open) => !open && setViewingActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setViewingActor(actor)} className="h-8 px-2 md:h-9 md:px-3 border-primary/20 hover:bg-primary/5 text-primary font-bold">
                                <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden lg:inline ml-2">VIEW</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
                                  <Eye className="w-6 h-6" /> Detail Pelaku Usaha
                                </DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-6 py-4">
                                <section className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase">
                                    <User className="w-4 h-4" /> Informasi Pribadi
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                                    {[
                                      { label: "Nama Lengkap", value: actor.fullName },
                                      { label: "NIK", value: actor.nik },
                                      { label: "Nomor KK", value: actor.noKK },
                                      { label: "Gender", value: actor.gender },
                                      { label: "Tempat / Tgl Lahir", value: actor.pobDob },
                                      { label: "No HP / WA", value: actor.phone },
                                      { label: "Kelurahan", value: actor.kelurahan },
                                      { label: "RT / RW", value: actor.rtRw },
                                    ].map((item, i) => (
                                      <div key={i} className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                        <p className="text-sm font-bold text-slate-700">{item.value || "-"}</p>
                                      </div>
                                    ))}
                                    <div className="md:col-span-2 space-y-1">
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Alamat Lengkap</p>
                                      <p className="text-sm font-bold text-slate-700">{actor.address || "-"}</p>
                                    </div>
                                  </div>
                                </section>

                                <section className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase">
                                    <Building2 className="w-4 h-4" /> Data Usaha
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                                    {[
                                      { label: "Nama Usaha", value: actor.businessName },
                                      { label: "Kategori Usaha", value: actor.businessCategory },
                                      { label: "Lokasi Usaha", value: actor.businessLocation },
                                    ].map((item, i) => (
                                      <div key={i} className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                        <p className="text-sm font-bold text-slate-700">{item.value || "-"}</p>
                                      </div>
                                    ))}
                                  </div>
                                </section>

                                <section className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase">
                                    <CreditCard className="w-4 h-4" /> Data Rekening
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-primary/10">
                                    {[
                                      { label: "Nama Bank", value: actor.bankName },
                                      { label: "Nomor Rekening", value: actor.bankNumber },
                                      { label: "Nama Pemilik Rekening", value: actor.bankOwner },
                                    ].map((item, i) => (
                                      <div key={i} className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                        <p className="text-sm font-black text-primary">{item.value || "BELUM TERISI"}</p>
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              </div>
                              <DialogFooter className="print:hidden">
                                <Button onClick={() => window.print()} variant="secondary" className="w-full sm:w-auto font-bold">
                                  <Printer className="w-4 h-4 mr-2" /> Cetak Detail Ini
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog open={!!editingActor && editingActor.id === actor.id} onOpenChange={(open) => !open && setEditingActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary" onClick={() => setEditingActor(actor)} className="h-8 px-2 md:h-9 md:px-3 font-bold">
                                <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden lg:inline ml-2">EDIT BANK</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <form onSubmit={handleSaveBank}>
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-black text-primary">INPUT REKENING</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="space-y-2">
                                    <Label className="font-bold">Nomor Rekening</Label>
                                    <Input name="bankNumber" defaultValue={actor.bankNumber} className="font-mono" required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold">Nama Pemilik Rekening</Label>
                                    <Input name="bankOwner" defaultValue={actor.bankOwner} className="uppercase font-bold" required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold">Nama Bank</Label>
                                    <Input name="bankName" defaultValue={actor.bankName} placeholder="Contoh: BANK NTB SYARIAH" required />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button type="submit" className="w-full bg-primary font-bold"><Save className="w-4 h-4 mr-2" /> Simpan Rekening</Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>

                          {isAdmin && (
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => handleDelete(actor.id, actor.fullName)}
                              className="bg-red-500 hover:bg-red-600 h-8 px-2 md:h-9 md:px-3 font-bold"
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
                      <TableCell colSpan={7} className="text-center py-20 text-muted-foreground font-medium italic print:hidden">
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

      {/* Tanda Tangan Cetak (Hanya terlihat saat diprint) */}
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
