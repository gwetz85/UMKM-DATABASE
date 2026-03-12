"use client"

import { useState } from "react"
import { useMemoFirebase, useCollection, useUser, useFirestore, updateDocumentNonBlocking, useDoc, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Check, ShieldAlert, Loader2, Trash2, Eye, Search, User, Building2, MapPin, FileText } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"

export default function VerifyActorPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const firestore = useFirestore()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)

  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])

  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

  const memoQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'businessActors'), where('status', '==', 'pending'))
  }, [firestore])

  const { data: actors, isLoading } = useCollection<BusinessActor>(memoQuery)

  // Filter data berdasarkan search query
  const filteredActors = actors?.filter(actor => 
    actor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    actor.nik.includes(searchQuery) ||
    actor.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleVerify = (actorId: string) => {
    if (!isAdmin) return
    const actorRef = doc(firestore, 'businessActors', actorId)
    updateDocumentNonBlocking(actorRef, { status: 'verified_actor' })
    toast({ title: "Verifikasi Berhasil", description: "Data telah dipindahkan ke tahap pengisian rekening." })
  }

  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin) return
    if (confirm(`Hapus data pending milik "${fullName}"? Data ini tidak akan bisa dilanjutkan ke tahap berikutnya.`)) {
      const actorRef = doc(firestore, 'businessActors', actorId)
      deleteDocumentNonBlocking(actorRef)
      toast({ variant: "destructive", title: "Data Dibatalkan", description: "Data telah dihapus dari antrean verifikasi." })
    }
  }

  if (!isAdmin && !isAdminLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground">Hanya akun Administrator yang dapat mengakses menu Verifikasi Admin.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-primary font-headline">Verifikasi Admin</h1>
          <p className="text-muted-foreground">Validasi data input sebelum diteruskan ke tahap pengisian data rekening.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Cari Nama, NIK, atau Usaha..." 
            className="pl-9 h-11 border-primary/20 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold">Nama Lengkap</TableHead>
                    <TableHead className="font-bold">NIK</TableHead>
                    <TableHead className="font-bold">Kategori</TableHead>
                    <TableHead className="font-bold">Usaha</TableHead>
                    <TableHead className="text-right font-bold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActors?.map((actor) => (
                    <TableRow key={actor.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell className="font-bold text-slate-700 whitespace-nowrap">{actor.fullName}</TableCell>
                      <TableCell className="font-mono text-xs">{actor.nik}</TableCell>
                      <TableCell className="whitespace-nowrap">{actor.businessCategory}</TableCell>
                      <TableCell className="font-medium">{actor.businessName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog open={!!viewingActor && viewingActor.id === actor.id} onOpenChange={(open) => !open && setViewingActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setViewingActor(actor)} className="h-9 border-primary/20 hover:bg-primary/5 text-primary font-bold">
                                <Eye className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">VIEW</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
                                  <FileText className="w-6 h-6" /> Detail Inputan Data
                                </DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-6 py-4">
                                <section className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase">
                                    <User className="w-4 h-4" /> Informasi Pribadi
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-muted">
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
                                        <p className="text-sm font-bold text-slate-800">{item.value || "-"}</p>
                                      </div>
                                    ))}
                                    <div className="md:col-span-2 space-y-1">
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Alamat Lengkap</p>
                                      <p className="text-sm font-bold text-slate-800">{actor.address || "-"}</p>
                                    </div>
                                  </div>
                                </section>

                                <section className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase">
                                    <Building2 className="w-4 h-4" /> Data Usaha
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-muted">
                                    {[
                                      { label: "Nama Usaha", value: actor.businessName },
                                      { label: "Kategori Usaha", value: actor.businessCategory },
                                      { label: "Lokasi Usaha", value: actor.businessLocation },
                                    ].map((item, i) => (
                                      <div key={i} className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                        <p className="text-sm font-bold text-slate-800">{item.value || "-"}</p>
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              </div>
                              <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setViewingActor(null)} className="font-bold">Tutup</Button>
                                <Button onClick={() => { handleVerify(actor.id); setViewingActor(null); }} className="bg-green-600 hover:bg-green-700 font-bold">
                                  <Check className="w-4 h-4 mr-2" /> VERIFIKASI SEKARANG
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Button size="sm" onClick={() => handleVerify(actor.id)} className="bg-green-600 hover:bg-green-700 font-bold h-9">
                            <Check className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">VERIFIKASI</span>
                          </Button>
                          
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(actor.id, actor.fullName)} className="font-bold h-9">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!filteredActors || filteredActors.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-medium italic">
                        {searchQuery ? "Tidak ada hasil pencarian yang cocok." : "Tidak ada data yang menunggu verifikasi admin."}
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
