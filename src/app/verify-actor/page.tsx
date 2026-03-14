
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
import { Check, ShieldAlert, Loader2, Trash2, Eye, Search, User, Building2, FileText, Edit3, Save, History, Upload, Image as ImageIcon, AlertCircle } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function VerifyActorPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const firestore = useFirestore()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  
  // States for Edit Form & Uploads
  const [editKelurahan, setEditKelurahan] = useState<string>("")
  const [editKecamatan, setEditKecamatan] = useState<string>("")
  const [ktpUri, setKtpUri] = useState<string>("")
  const [kkUri, setKkUri] = useState<string>("")
  const [nibUri, setNibUri] = useState<string>("")
  const [photoUsahaUri, setPhotoUsahaUri] = useState<string>("")

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (uri: string) => void) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setter(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleVerify = (actorId: string) => {
    if (!isAdmin) return
    const actorRef = doc(firestore, 'businessActors', actorId)
    updateDocumentNonBlocking(actorRef, { status: 'verified_actor' })
    toast({ title: "Verifikasi Berhasil", description: "Data telah dipindahkan ke tahap pengisian rekening." })
  }

  const handleSaveAndVerify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingActor || !firestore || !isAdmin) return

    const uploadCount = [ktpUri, kkUri, nibUri, photoUsahaUri].filter(Boolean).length
    if (uploadCount < 2) {
      toast({ 
        variant: "destructive", 
        title: "Dokumen Kurang", 
        description: "Wajib mengunggah minimal 2 berkas (KTP, KK, NIB, atau Foto Usaha) untuk verifikasi." 
      })
      return
    }

    setIsVerifying(true)
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
      ktpUri,
      kkUri,
      nibUri,
      photoUsahaUri,
      status: 'verified_actor'
    }

    updateDocumentNonBlocking(actorRef, updatedData)
    toast({ title: "Berhasil diverifikasi", description: "Data pelaku dan dokumen lampiran telah disimpan." })
    setEditingActor(null)
    setIsVerifying(false)
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
    setKtpUri(actor.ktpUri || "")
    setKkUri(actor.kkUri || "")
    setNibUri(actor.nibUri || "")
    setPhotoUsahaUri(actor.photoUsahaUri || "")
  }

  const uploadCount = [ktpUri, kkUri, nibUri, photoUsahaUri].filter(Boolean).length

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
          <p className="text-muted-foreground">Lengkapi dokumen lampiran (Min. 2 berkas) untuk memverifikasi data.</p>
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
                          <Dialog open={!!viewingActor && viewingActor.id === actor.id} onOpenChange={(open) => !open && setViewingActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setViewingActor(actor)} className="h-9 border-primary/20 hover:bg-primary/5 text-primary font-bold">
                                <Eye className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">VIEW</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
                                  <FileText className="w-6 h-6" /> Detail Inputan & Lampiran
                                </DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-6 py-4">
                                <section className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase">
                                    <User className="w-4 h-4" /> Informasi Pribadi
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border border-muted">
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
                                        <p className="text-xs font-bold text-foreground">{item.value || "-"}</p>
                                      </div>
                                    ))}
                                    <div className="md:col-span-3 space-y-1 pt-2 border-t">
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Alamat Lengkap</p>
                                      <p className="text-xs font-bold text-foreground">{actor.address || "-"}</p>
                                    </div>
                                  </div>
                                </section>

                                <section className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase">
                                    <ImageIcon className="w-4 h-4" /> Berkas Lampiran (Upload Admin)
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                      { label: "KTP", uri: actor.ktpUri },
                                      { label: "KK", uri: actor.kkUri },
                                      { label: "NIB", uri: actor.nibUri },
                                      { label: "Foto Usaha", uri: actor.photoUsahaUri },
                                    ].map((doc, idx) => (
                                      <div key={idx} className="space-y-2">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase text-center">{doc.label}</p>
                                        <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-muted bg-slate-50 relative overflow-hidden flex items-center justify-center">
                                          {doc.uri ? (
                                            <Image 
                                              src={doc.uri} 
                                              alt={doc.label} 
                                              fill 
                                              className="object-contain" 
                                              unoptimized 
                                            />
                                          ) : (
                                            <div className="flex flex-col items-center gap-1 opacity-20">
                                              <ImageIcon className="w-8 h-8" />
                                              <span className="text-[10px] font-bold">TIDAK ADA</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </section>

                                <section className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase">
                                    <History className="w-4 h-4" /> Audit Data
                                  </div>
                                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 flex justify-between">
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Petugas Input</p>
                                      <p className="text-sm font-black text-primary uppercase">{actor.createdBy || "-"}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Waktu Input</p>
                                      <p className="text-sm font-bold text-slate-700">{actor.createdAt ? new Date(actor.createdAt).toLocaleString('id-ID') : "-"}</p>
                                    </div>
                                  </div>
                                </section>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={!!editingActor && editingActor.id === actor.id} onOpenChange={(open) => !open && setEditingActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary" onClick={() => openEditDialog(actor)} className="h-9 font-bold">
                                <Upload className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">VERIFIKASI</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <form onSubmit={handleSaveAndVerify}>
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-black text-primary uppercase flex items-center gap-2">
                                    <ShieldAlert className="w-6 h-6" /> Proses Verifikasi Admin
                                  </DialogTitle>
                                </DialogHeader>
                                
                                <div className="grid gap-6 py-6">
                                  <Alert className="bg-amber-50 border-amber-200">
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                    <AlertTitle className="font-bold text-amber-800">Syarat Verifikasi</AlertTitle>
                                    <AlertDescription className="text-amber-700 text-xs">
                                      Wajib melampirkan minimal **2 dokumen** pendukung (KTP, KK, NIB, atau Foto Usaha) sebelum data diproses.
                                    </AlertDescription>
                                  </Alert>

                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <Label className="font-black text-primary uppercase text-xs">A. Upload Berkas Lampiran</Label>
                                      <Badge className={uploadCount >= 2 ? "bg-emerald-500" : "bg-amber-500"}>
                                        {uploadCount} / 4 Terpilih
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                      {[
                                        { id: "ktp", label: "KTP", value: ktpUri, setter: setKtpUri },
                                        { id: "kk", label: "KK", value: kkUri, setter: setKkUri },
                                        { id: "nib", label: "NIB", value: nibUri, setter: setNibUri },
                                        { id: "photo", label: "Foto Usaha", value: photoUsahaUri, setter: setPhotoUsahaUri },
                                      ].map((upload) => (
                                        <div key={upload.id} className="space-y-2">
                                          <Label htmlFor={upload.id} className="text-[10px] font-bold uppercase block text-center cursor-pointer hover:text-primary transition-colors">
                                            {upload.label}
                                          </Label>
                                          <div 
                                            className={cn(
                                              "aspect-[3/4] rounded-xl border-2 border-dashed transition-all relative overflow-hidden flex flex-col items-center justify-center gap-2 cursor-pointer",
                                              upload.value ? "border-primary bg-primary/5" : "border-muted bg-slate-50 hover:border-primary/50"
                                            )}
                                            onClick={() => document.getElementById(upload.id)?.click()}
                                          >
                                            {upload.value ? (
                                              <>
                                                <Image src={upload.value} alt={upload.label} fill className="object-cover" unoptimized />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                  <span className="text-white font-bold text-[10px] uppercase">Ganti File</span>
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <Upload className="w-6 h-6 text-muted-foreground" />
                                                <span className="text-[8px] font-bold text-muted-foreground uppercase">Klik Upload</span>
                                              </>
                                            )}
                                            <input 
                                              id={upload.id} 
                                              type="file" 
                                              accept="image/*" 
                                              className="hidden" 
                                              onChange={(e) => handleFileChange(e, upload.setter)} 
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="space-y-4 border-t pt-4">
                                    <Label className="font-black text-primary uppercase text-xs">B. Koreksi Data Pelaku (Jika Perlu)</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label className="font-bold">Nama Lengkap</Label>
                                        <Input name="fullName" defaultValue={editingActor.fullName} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">NIK (16 Digit)</Label>
                                        <Input name="nik" defaultValue={editingActor.nik} maxLength={16} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Nomor KK (16 Digit)</Label>
                                        <Input name="noKK" defaultValue={editingActor.noKK} maxLength={16} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Nama Usaha</Label>
                                        <Input name="businessName" defaultValue={editingActor.businessName} required />
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                      <div className="space-y-2">
                                        <Label className="font-bold text-muted-foreground">Kecamatan (Auto)</Label>
                                        <Input value={editKecamatan} readOnly className="bg-muted font-bold" />
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label className="font-bold">Koordinator Lapangan</Label>
                                      <Input name="coordinator" defaultValue={editingActor.coordinator} required />
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter className="gap-2">
                                  <Button type="button" variant="outline" onClick={() => setEditingActor(null)}>Batal</Button>
                                  <Button 
                                    type="submit" 
                                    disabled={uploadCount < 2 || isVerifying} 
                                    className="bg-primary font-bold min-w-[150px]"
                                  >
                                    {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                    SIMPAN & VERIFIKASI
                                  </Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                          
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
