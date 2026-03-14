
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
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Check, ShieldAlert, Loader2, Trash2, Eye, Search, User, Building2, FileText, Edit3, Save } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"

export default function VerifyActorPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const firestore = useFirestore()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)
  
  // States for Edit Form
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

  // Kecamatan Auto-fill Logic for Edit
  useEffect(() => {
    if (!editKelurahan) {
      setEditKecamatan("")
      return
    }

    const groupKota = ["Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat"]
    const groupBarat = ["Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru"]
    const groupTimur = ["Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana", "Air Raja"]
    const groupBestari = ["Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"]

    if (groupKota.includes(editKelurahan)) {
      setEditKecamatan("Tanjungpinang Kota")
    } else if (groupBarat.includes(editKelurahan)) {
      setEditKecamatan("Tanjungpinang Barat")
    } else if (groupTimur.includes(editKelurahan)) {
      setEditKecamatan("Tanjungpinang Timur")
    } else if (groupBestari.includes(editKelurahan)) {
      setEditKecamatan("Bukit Bestari")
    } else {
      setEditKecamatan("")
    }
  }, [editKelurahan])

  const handleVerify = (actorId: string) => {
    if (!isAdmin) return
    const actorRef = doc(firestore, 'businessActors', actorId)
    updateDocumentNonBlocking(actorRef, { status: 'verified_actor' })
    toast({ title: "Verifikasi Berhasil", description: "Data telah dipindahkan ke tahap pengisian rekening." })
  }

  const handleSaveEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingActor || !firestore || !isAdmin) return

    const formData = new FormData(e.currentTarget)
    const actorRef = doc(firestore, 'businessActors', editingActor.id)
    
    const updatedData = {
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
    }

    updateDocumentNonBlocking(actorRef, updatedData)
    toast({ title: "Perubahan Disimpan", description: "Data pelaku usaha telah diperbarui." })
    setEditingActor(null)
  }

  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin) return
    if (confirm(`Hapus data pending milik "${fullName}"? Data ini tidak akan bisa dilanjutkan ke tahap berikutnya.`)) {
      const actorRef = doc(firestore, 'businessActors', actorId)
      deleteDocumentNonBlocking(actorRef)
      toast({ variant: "destructive", title: "Data Dibatalkan", description: "Data telah dihapus dari antrean verifikasi." })
    }
  }

  const openEditDialog = (actor: BusinessActor) => {
    setEditingActor(actor)
    setEditKelurahan(actor.kelurahan || "")
    setEditKecamatan(actor.kecamatan || "")
  }

  if (isMonitoring) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center">
        <ShieldAlert className="w-16 h-16 text-emerald-600" />
        <h1 className="text-2xl font-bold">Akses Terbatas</h1>
        <p className="text-muted-foreground">Role Monitoring tidak memiliki izin untuk melakukan verifikasi data.</p>
      </div>
    )
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
          <input 
            placeholder="Cari Nama, NIK, atau Usaha..." 
            className="flex h-11 w-full rounded-md border border-primary/20 bg-card px-3 py-2 pl-9 text-sm text-card-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-card text-card-foreground">
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
                      <TableCell className="font-bold whitespace-nowrap">{actor.fullName}</TableCell>
                      <TableCell className="font-mono text-xs">{actor.nik}</TableCell>
                      <TableCell className="whitespace-nowrap">{actor.businessCategory}</TableCell>
                      <TableCell className="font-medium">{actor.businessName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* View Dialog */}
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
                                      { label: "Kecamatan", value: actor.kecamatan },
                                      { label: "Kelurahan", value: actor.kelurahan },
                                      { label: "RT / RW", value: actor.rtRw },
                                    ].map((item, i) => (
                                      <div key={i} className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                        <p className="text-sm font-bold text-foreground">{item.value || "-"}</p>
                                      </div>
                                    ))}
                                    <div className="md:col-span-2 space-y-1">
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Alamat Lengkap</p>
                                      <p className="text-sm font-bold text-foreground">{actor.address || "-"}</p>
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
                                      { label: "Koordinator", value: actor.coordinator },
                                    ].map((item, i) => (
                                      <div key={i} className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                        <p className="text-sm font-bold text-foreground">{item.value || "-"}</p>
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              </div>
                              <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setViewingActor(null)} className="font-bold">Tutup</Button>
                                <Button onClick={() => { handleVerify(actor.id); setViewingActor(null); }} className="bg-green-600 hover:bg-green-700 font-bold text-white">
                                  <Check className="w-4 h-4 mr-2" /> VERIFIKASI SEKARANG
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {/* Edit Dialog */}
                          <Dialog open={!!editingActor && editingActor.id === actor.id} onOpenChange={(open) => !open && setEditingActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary" onClick={() => openEditDialog(actor)} className="h-9 font-bold">
                                <Edit3 className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">EDIT</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                              <form onSubmit={handleSaveEdit}>
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
                                    <Edit3 className="w-6 h-6" /> Edit & Lengkapi Data
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-6 py-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label className="font-bold">Nama Lengkap</Label>
                                      <Input name="fullName" defaultValue={actor.fullName} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">Jenis Kelamin</Label>
                                      <Select name="gender" defaultValue={actor.gender} required>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                                          <SelectItem value="Perempuan">Perempuan</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">NIK (16 Digit)</Label>
                                      <Input name="nik" defaultValue={actor.nik} maxLength={16} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">Nomor KK (16 Digit)</Label>
                                      <Input name="noKK" defaultValue={actor.noKK} maxLength={16} required />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                      <Label className="font-bold">Tempat / Tanggal Lahir</Label>
                                      <Input name="pobDob" defaultValue={actor.pobDob} placeholder="Contoh: Jakarta, 01-01-1990" required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">Nomor Ponsel</Label>
                                      <Input name="phone" defaultValue={actor.phone} required />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="font-bold">Alamat Lengkap</Label>
                                    <Textarea name="address" defaultValue={actor.address} required />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label className="font-bold">RT / RW</Label>
                                      <Input name="rtRw" defaultValue={actor.rtRw} placeholder="001 / 002" required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">Kelurahan</Label>
                                      <Select value={editKelurahan} onValueChange={setEditKelurahan} required>
                                        <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                                        <SelectContent className="max-h-[250px]">
                                          {kelurahanList.map((k) => (
                                            <SelectItem key={k} value={k}>{k}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                      <Label className="font-bold text-muted-foreground">Kecamatan (Otomatis)</Label>
                                      <Input name="kecamatan" value={editKecamatan} readOnly className="bg-muted font-bold" />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                                    <div className="space-y-2">
                                      <Label className="font-bold">Nama Usaha</Label>
                                      <Input name="businessName" defaultValue={actor.businessName} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold">Jenis Usaha</Label>
                                      <Select name="businessCategory" defaultValue={actor.businessCategory} required>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Kuliner">Kuliner</SelectItem>
                                          <SelectItem value="Bukan Kuliner">Bukan Kuliner</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                      <Label className="font-bold">Lokasi Usaha</Label>
                                      <Input name="businessLocation" defaultValue={actor.businessLocation} required />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                      <Label className="font-bold">Koordinator</Label>
                                      <Input name="coordinator" defaultValue={actor.coordinator} placeholder="Nama Koordinator Lapangan" required />
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button type="button" variant="outline" onClick={() => setEditingActor(null)}>Batal</Button>
                                  <Button type="submit" className="bg-primary font-bold"><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>

                          <Button size="sm" onClick={() => handleVerify(actor.id)} className="bg-green-600 hover:bg-green-700 font-bold h-9 text-white">
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
