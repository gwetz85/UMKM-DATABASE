"use client"

import { useState, useEffect } from "react"
import { useMemoFirebase, useCollection, useUser, useFirestore, updateDocumentNonBlocking, useDoc, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Check, ShieldAlert, Loader2, Trash2, Eye, Search, User, FileText, Upload } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function VerifyActorPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const firestore = useFirestore()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  
  const [editKelurahan, setEditKelurahan] = useState<string>("")
  const [editKecamatan, setEditKecamatan] = useState<string>("")

  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])
  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)

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
    return query(collection(firestore, 'businessActors'), where('status', '==', 'pending'))
  }, [firestore])

  const { data: actors, isLoading } = useCollection<BusinessActor>(memoQuery)

  const filteredActors = actors?.filter(actor => 
    actor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    actor.nik.includes(searchQuery) ||
    actor.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const kelurahanList = [
    "Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat",
    "Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru",
    "Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana",
    "Air Raja", "Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"
  ]

  useEffect(() => {
    if (!editKelurahan) {
      setEditKecamatan("")
      return
    }
    const groupKota = ["Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat"]
    const groupBarat = ["Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru"]
    const groupTimur = ["Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana", "Air Raja"]
    const groupBestari = ["Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"]

    if (groupKota.includes(editKelurahan)) setEditKecamatan("Tanjungpinang Kota")
    else if (groupBarat.includes(editKelurahan)) setEditKecamatan("Tanjungpinang Barat")
    else if (groupTimur.includes(editKelurahan)) setEditKecamatan("Tanjungpinang Timur")
    else if (groupBestari.includes(editKelurahan)) setEditKecamatan("Bukit Bestari")
    else setEditKecamatan("")
  }, [editKelurahan])

  const handleSaveAndVerify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingActor || !firestore || !isAdmin) return
    
    setIsVerifying(true)
    const formData = new FormData(e.currentTarget)
    const actorRef = doc(firestore, 'businessActors', editingActor.id)
    updateDocumentNonBlocking(actorRef, {
      fullName: formData.get("fullName"),
      nik: formData.get("nik"),
      noKK: formData.get("noKK"),
      gender: formData.get("gender"),
      pobDob: formData.get("pobDob"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      rtRw: formData.get("rtRw"),
      kelurahan: editKelurahan,
      kecamatan: editKecamatan,
      businessCategory: formData.get("businessCategory"),
      businessName: formData.get("businessName"),
      businessLocation: formData.get("businessLocation"),
      coordinator: formData.get("coordinator"),
      status: 'verified_actor'
    })
    toast({ title: "Berhasil diverifikasi", description: "Data pelaku telah diverifikasi oleh Admin." })
    setEditingActor(null)
    setIsVerifying(false)
  }

  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin) return
    if (confirm(`Hapus data pending milik "${fullName}"?`)) {
      deleteDocumentNonBlocking(doc(firestore, 'businessActors', actorId))
      toast({ variant: "destructive", title: "Data Dibatalkan", description: "Data telah dihapus." })
    }
  }

  const openEditDialog = (actor: BusinessActor) => {
    setEditingActor(actor)
    setEditKelurahan(actor.kelurahan || "")
    setEditKecamatan(actor.kecamatan || "")
  }

  if (isMonitoring) return <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center"><ShieldAlert className="w-16 h-16 text-emerald-600" /><h1 className="text-2xl font-bold">Akses Terbatas</h1></div>
  if (!isAdmin && !isAdminLoading) return <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center"><ShieldAlert className="w-16 h-16 text-destructive" /><h1 className="text-2xl font-bold">Akses Ditolak</h1></div>

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-primary font-headline">Verifikasi Admin</h1>
          <p className="text-muted-foreground">Tinjau dan verifikasi data pelaku usaha yang masuk.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            placeholder="Cari Nama, NIK, atau Usaha..." 
            className="flex h-11 w-full rounded-md border border-primary/20 bg-card px-3 py-2 pl-9 text-sm text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-card">
        <CardContent className="p-0">
          {isLoading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div> : (
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
                  <TableRow key={actor.id} className="hover:bg-muted/5">
                    <TableCell className="font-bold">{actor.fullName}</TableCell>
                    <TableCell className="font-mono text-xs">{actor.nik}</TableCell>
                    <TableCell>{actor.businessCategory}</TableCell>
                    <TableCell className="font-medium">{actor.businessName}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog open={!!viewingActor && viewingActor.id === actor.id} onOpenChange={(open) => !open && setViewingActor(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setViewingActor(actor)} className="h-9 border-primary/20 text-primary font-bold">
                              <Eye className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">VIEW</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            {viewingActor && viewingActor.id === actor.id && (
                              <>
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-black text-primary uppercase flex items-center gap-2">
                                    <FileText className="w-6 h-6" /> Detail Pelaku Usaha
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-6 py-4">
                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase"><User className="w-4 h-4" /> Informasi Pribadi</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                                      {[
                                        { label: "Nama", value: viewingActor.fullName },
                                        { label: "NIK", value: viewingActor.nik },
                                        { label: "KK", value: viewingActor.noKK },
                                        { label: "Gender", value: viewingActor.gender },
                                        { label: "Lahir", value: viewingActor.pobDob },
                                        { label: "HP", value: viewingActor.phone },
                                        { label: "Kecamatan", value: viewingActor.kecamatan },
                                        { label: "Kelurahan", value: viewingActor.kelurahan },
                                        { label: "RT/RW", value: viewingActor.rtRw }
                                      ].map((item, i) => (
                                        <div key={i} className="space-y-1">
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                          <p className="text-xs font-bold">{item.value || "-"}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </section>
                                </div>
                              </>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Dialog open={!!editingActor && editingActor.id === actor.id} onOpenChange={(open) => !open && setEditingActor(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="secondary" onClick={() => openEditDialog(actor)} className="h-9 font-bold">
                              <Check className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">VERIFIKASI</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            {editingActor && (
                              <form onSubmit={handleSaveAndVerify}>
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-black text-primary uppercase flex items-center gap-2">
                                    <ShieldAlert className="w-6 h-6" /> Verifikasi Admin
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-6 py-6">
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label className="font-bold">Nama Lengkap</Label>
                                      <Input name="fullName" defaultValue={editingActor.fullName} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">NIK (16 Digit)</Label>
                                      <Input name="nik" defaultValue={editingActor.nik} maxLength={16} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">No. KK (16 Digit)</Label>
                                      <Input name="noKK" defaultValue={editingActor.noKK} maxLength={16} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">Jenis Kelamin</Label>
                                      <Select name="gender" defaultValue={editingActor.gender}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                                          <SelectItem value="Perempuan">Perempuan</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">Tempat/Tgl Lahir</Label>
                                      <Input name="pobDob" defaultValue={editingActor.pobDob} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">No. HP</Label>
                                      <Input name="phone" defaultValue={editingActor.phone} required />
                                    </div>
                                  </div>

                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label className="font-bold">Kelurahan</Label>
                                      <Select value={editKelurahan} onValueChange={setEditKelurahan}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                          {kelurahanList.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold text-muted-foreground">Kecamatan (Otomatis)</Label>
                                      <Input value={editKecamatan} readOnly className="bg-muted" />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                      <Label className="font-bold">Alamat Lengkap</Label>
                                      <Input name="address" defaultValue={editingActor.address} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">RT / RW</Label>
                                      <Input name="rtRw" defaultValue={editingActor.rtRw} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">Koordinator</Label>
                                      <Input name="coordinator" defaultValue={editingActor.coordinator} required />
                                    </div>
                                  </div>

                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label className="font-bold">Jenis Usaha</Label>
                                      <Select name="businessCategory" defaultValue={editingActor.businessCategory}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Kuliner">Kuliner</SelectItem>
                                          <SelectItem value="Bukan Kuliner">Bukan Kuliner</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">Nama Usaha</Label>
                                      <Input name="businessName" defaultValue={editingActor.businessName} required />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                      <Label className="font-bold">Lokasi Usaha</Label>
                                      <Input name="businessLocation" defaultValue={editingActor.businessLocation} required />
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter className="gap-2">
                                  <Button type="button" variant="outline" onClick={() => setEditingActor(null)}>Batal</Button>
                                  <Button type="submit" disabled={isVerifying} className="bg-primary font-bold min-w-[150px]">
                                    {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} SIMPAN & VERIFIKASI
                                  </Button>
                                </DialogFooter>
                              </form>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(actor.id, actor.fullName)} className="font-bold h-9"><Trash2 className="w-4 h-4" /></Button>
                      </div>
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
