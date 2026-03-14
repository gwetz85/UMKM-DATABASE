
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
import { Printer, Edit3, Loader2, Save, Trash2, Eye, User, CreditCard, History, X, RotateCcw, Building2, MapPin, CheckCircle2 } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"

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

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="hidden print:block text-center space-y-2 mb-8 border-b-2 border-black pb-4">
        <h1 className="text-xl font-black uppercase">LAPORAN DATA PELAKU USAHA UMKM</h1>
        <p className="text-xs font-bold">Sistem Manajemen Terpadu Database UMKM</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">Data Pelaku Usaha</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Data lolos verifikasi awal.</p>
          {filterCoordinator && (
            <div className="flex items-center gap-2 mt-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 w-fit">
              <span className="text-[10px] font-black text-primary uppercase">Filter: {filterCoordinator}</span>
              <button onClick={() => router.push('/actor-data')} className="text-primary"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => window.print()} className="bg-primary font-bold shadow-md">
            <Printer className="w-4 h-4 mr-2" /> CETAK
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-card print:shadow-none print:border">
        <CardContent className="p-0">
          {isLoading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div> : (
            <div className="overflow-x-auto print:overflow-visible">
              <Table className="print:text-[9px] print:w-full">
                <TableHeader className="bg-muted/30 print:bg-gray-100">
                  <TableRow>
                    <TableHead className="font-bold">Nama Pelaku</TableHead>
                    <TableHead className="font-bold">NIK</TableHead>
                    <TableHead className="font-bold">Nama Usaha</TableHead>
                    <TableHead className="font-bold">Bank</TableHead>
                    <TableHead className="font-bold">No. Rekening</TableHead>
                    <TableHead className="text-right font-bold print:hidden">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actors?.map((actor) => (
                    <TableRow key={actor.id} className="hover:bg-muted/10 print:border-b">
                      <TableCell className="font-bold">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 p-1.5 rounded-full shrink-0 print:hidden">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <span className="uppercase whitespace-nowrap">{actor.fullName}</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{actor.nik}</TableCell>
                      <TableCell className="font-medium">{actor.businessName}</TableCell>
                      <TableCell>{actor.bankName || "-"}</TableCell>
                      <TableCell className="font-mono">{actor.bankNumber || "-"}</TableCell>
                      <TableCell className="text-right print:hidden">
                        <div className="flex justify-end gap-1.5 md:gap-2">
                          <Dialog open={!!viewingActor && viewingActor.id === actor.id} onOpenChange={(open) => !open && setViewingActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setViewingActor(actor)} className="h-9 text-primary font-bold">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              {viewingActor && (
                                <>
                                  <DialogHeader>
                                    <DialogTitle className="text-2xl font-black text-primary uppercase">Detail Lengkap Pelaku Usaha</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid gap-6 py-4">
                                    <section className="space-y-4">
                                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                                        {[
                                          { label: "Nama Lengkap", value: viewingActor.fullName },
                                          { label: "NIK", value: viewingActor.nik },
                                          { label: "Nomor KK", value: viewingActor.noKK },
                                          { label: "Jenis Kelamin", value: viewingActor.gender },
                                          { label: "Tempat/Tgl Lahir", value: viewingActor.pobDob },
                                          { label: "Nomor HP", value: viewingActor.phone }
                                        ].map((item, i) => (
                                          <div key={i} className="space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                            <p className="text-sm font-bold">{item.value || "-"}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </section>

                                    <section className="space-y-4">
                                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat & Domisili</div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                                        {[
                                          { label: "Kecamatan", value: viewingActor.kecamatan },
                                          { label: "Kelurahan", value: viewingActor.kelurahan },
                                          { label: "RT/RW", value: viewingActor.rtRw },
                                          { label: "Alamat Lengkap", value: viewingActor.address, fullWidth: true }
                                        ].map((item, i) => (
                                          <div key={i} className={item.fullWidth ? "md:col-span-3 space-y-1" : "space-y-1"}>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                            <p className="text-sm font-bold">{item.value || "-"}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </section>

                                    <section className="space-y-4">
                                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Building2 className="w-4 h-4" /> Informasi Usaha</div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                                        {[
                                          { label: "Nama Usaha", value: viewingActor.businessName },
                                          { label: "Kategori Usaha", value: viewingActor.businessCategory },
                                          { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                                          { label: "Koordinator Lapangan", value: viewingActor.coordinator }
                                        ].map((item, i) => (
                                          <div key={i} className="space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                            <p className="text-sm font-bold">{item.value || "-"}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </section>

                                    <section className="space-y-4">
                                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Data Perbankan</div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                                        {[
                                          { label: "Nama Bank", value: viewingActor.bankName },
                                          { label: "Nomor Rekening", value: viewingActor.bankNumber },
                                          { label: "Nama Pemilik Rekening", value: viewingActor.bankOwner }
                                        ].map((item, i) => (
                                          <div key={i} className="space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                            <p className="text-sm font-black text-primary">{item.value || "BELUM TERISI"}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </section>

                                    <section className="space-y-4">
                                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> Informasi Sistem & Audit</div>
                                      <div className="bg-slate-50 p-4 rounded-xl text-xs font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border">
                                        <div className="space-y-1">
                                          <p className="text-[9px] text-muted-foreground uppercase">Status Terakhir</p>
                                          <p className="capitalize text-primary">{viewingActor.status.replace('_', ' ')}</p>
                                        </div>
                                        <div className="space-y-1">
                                          <p className="text-[9px] text-muted-foreground uppercase">Petugas Input</p>
                                          <p>{viewingActor.createdBy || "System"}</p>
                                        </div>
                                        <div className="space-y-1">
                                          <p className="text-[9px] text-muted-foreground uppercase">Waktu Pendaftaran</p>
                                          <p>{viewingActor.createdAt ? new Date(viewingActor.createdAt).toLocaleString('id-ID') : "-"}</p>
                                        </div>
                                      </div>
                                    </section>
                                  </div>
                                </>
                              )}
                            </DialogContent>
                          </Dialog>
                          {!isMonitoring && (
                            <Dialog open={!!editingActor && editingActor.id === actor.id} onOpenChange={(open) => !open && setEditingActor(null)}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="secondary" onClick={() => setEditingActor(actor)} className="h-9 font-bold">
                                  <Edit3 className="w-3.5 h-3.5" />
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
                                      <Input name="bankNumber" defaultValue={actor.bankNumber} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">Nama Pemilik</Label>
                                      <Input name="bankOwner" defaultValue={actor.bankOwner} className="uppercase" required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">Nama Bank</Label>
                                      <Input name="bankName" defaultValue={actor.bankName} required />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button type="submit" className="w-full bg-primary font-bold"><Save className="w-4 h-4 mr-2" /> Simpan</Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            </Dialog>
                          )}
                          {isAdmin && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleRevert(actor.id, actor.fullName)} className="h-9 border-amber-500 text-amber-600">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(actor.id, actor.fullName)} className="h-9">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
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
