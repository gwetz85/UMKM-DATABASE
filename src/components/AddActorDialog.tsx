"use client"

import { useState, useEffect, useMemo } from "react"
import { useDatabase, useUser, addDocumentNonBlocking, useMemoFirebase, useList } from "@/firebase"
import { ref, get } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, CheckCircle2, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { logActivity, getDeviceType } from "@/lib/logger"

export function AddActorDialog() {
  const { toast } = useToast()
  const { user } = useUser()
  const database = useDatabase()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [kelurahan, setKelurahan] = useState<string>("")
  const [kecamatan, setKecamatan] = useState<string>("")
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>("")
  const [formDataState, setFormDataState] = useState({
    fullName: "",
    nik: "",
    noKK: "",
    pobDob: "",
    phone: "",
    address: "",
    rtRw: "",
    gender: "",
    businessCategory: "",
    businessName: "",
    businessLocation: ""
  })

  // Fetch Quotas and All Actors for validation
  const quotaRef = useMemoFirebase(() => database ? ref(database, 'koordinator_kuotas') : null, [database])
  const actorsRef = useMemoFirebase(() => database ? ref(database, 'businessActors') : null, [database])
  
  const { data: rawQuotaData } = useList<any>(quotaRef)
  const { data: rawActorsData } = useList<any>(actorsRef)

  // Fetch Master Data for auto-verification
  const master2023Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2023') : null, [database])
  const master2024Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2024') : null, [database])
  const master2025Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2025') : null, [database])
  const blacklistRef = useMemoFirebase(() => database ? ref(database, 'blacklist_data') : null, [database])

  const { data: data2023 } = useList<any>(master2023Ref)
  const { data: data2024 } = useList<any>(master2024Ref)
  const { data: data2025 } = useList<any>(master2025Ref)
  const { data: dataBlacklist } = useList<any>(blacklistRef)

  const availableCoordinators = useMemo(() => {
    if (!rawQuotaData) return []
    
    // Calculate current usage for each coordinator
    const activeStatuses = ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish'];
    const usageCounts: Record<string, number> = {}
    
    if (rawActorsData) {
      rawActorsData.forEach((actor: any) => {
        if (activeStatuses.includes(actor.status) && actor.coordinator) {
          const name = actor.coordinator.toUpperCase().trim()
          usageCounts[name] = (usageCounts[name] || 0) + 1
        }
      })
    }

    return rawQuotaData
      .map((q: any) => {
        const nameUpper = (q.name || "").toUpperCase().trim()
        const quota = q.quota || 0
        const used = usageCounts[nameUpper] || 0
        const remaining = quota - used
        return { ...q, remaining }
      })
      .filter((q: any) => q.remaining > 0)
      .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [rawQuotaData, rawActorsData])

  // Get current user profile to record who created the entry
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])

  const { data: allUsersForProfile } = useList(userProfileRef)
  const currentUserProfile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)
  const isMonitoring = currentUserProfile?.role === 'monitoring'

  useEffect(() => {
    if (!kelurahan) {
      setKecamatan("")
      return
    }

    const groupKota = ["Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat"]
    const groupBarat = ["Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru"]
    const groupTimur = ["Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana", "Air Raja"]
    const groupBestari = ["Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"]

    if (groupKota.includes(kelurahan)) {
      setKecamatan("Tanjungpinang Kota")
    } else if (groupBarat.includes(kelurahan)) {
      setKecamatan("Tanjungpinang Barat")
    } else if (groupTimur.includes(kelurahan)) {
      setKecamatan("Tanjungpinang Timur")
    } else if (groupBestari.includes(kelurahan)) {
      setKecamatan("Bukit Bestari")
    } else {
      setKecamatan("")
    }
  }, [kelurahan])

  // Auto-fill logic based on NIK
  useEffect(() => {
    const nik = formDataState.nik.trim();
    if (nik.length < 12) return; // Wait for at least 12 digits

    const timer = setTimeout(() => {
      const allMasterData = [
        ...(data2025 || []).map(m => ({ ...m, _s: "2025" })),
        ...(data2024 || []).map(m => ({ ...m, _s: "2024" })),
        ...(data2023 || []).map(m => ({ ...m, _s: "2023" })),
        ...(dataBlacklist || []).map(m => ({ ...m, _s: "BLACKLIST" }))
      ];

      if (allMasterData.length === 0) return;

      // Clean NIK for comparison (remove spaces, dots, etc)
      const cleanInputNik = nik.replace(/\D/g, "");

      // Find first match by NIK
      const match = allMasterData.find(m => {
        const mNik = String(m.nik || "").replace(/\D/g, "");
        return mNik === cleanInputNik && mNik.length > 0;
      });

      if (match) {
        setFormDataState(prev => ({
          ...prev,
          fullName: match.nama || match.fullName || prev.fullName,
          noKK: match.noKK || prev.noKK,
          pobDob: match.pobDob || match.ttl || prev.pobDob,
          phone: match.phone || match.noHp || match.nomorPonsel || prev.phone,
          address: match.alamat || match.address || prev.address,
          rtRw: match.rtRw || prev.rtRw,
          gender: match.gender || match.jenisKelamin || prev.gender,
        }));
        
        if (match.kelurahan) setKelurahan(match.kelurahan);
        
        toast({
          title: "DATA DITEMUKAN",
          description: `Data untuk NIK "${nik}" ditemukan di Database ${match._s}. Form telah diisi otomatis.`,
          className: "bg-primary border-none text-white font-black"
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formDataState.nik, data2023, data2024, data2025, dataBlacklist, toast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !database) return

    setLoading(true)
    const formElement = e.currentTarget
    const formData = new FormData(formElement)
    const nik = formData.get("nik") as string
    const noKK = formData.get("noKK") as string

    try {
      const actorsRef = ref(database, 'businessActors')
      
      const actorsSnapshot = await get(actorsRef)
      let duplicateInActors: any = null
      
      if (actorsSnapshot.exists()) {
        actorsSnapshot.forEach((child) => {
          const val = child.val()
          if (val.nik === nik || val.noKK === noKK) {
            duplicateInActors = val
          }
        })
      }

      if (duplicateInActors) {
        toast({ 
          variant: "destructive", 
          title: "DATA TELAH DI INPUT", 
          description: `NIK atau Nomor KK ini sudah terdaftar dengan Nomor Registrasi: ${duplicateInActors.registrationCode || '-'} dan Koordinator: ${duplicateInActors.coordinator || '-'}` 
        })
        setLoading(false)
        return
      }

      // Tahap 2: Cek di Database Pembanding (Informasi)
      const checkMaster = (data: any[] | null) => {
        return (data || []).find((m: any) => (m.noKK && String(m.noKK).trim() === noKK) || (m.nik && String(m.nik).trim() === nik))
      }
      
      const matchBlacklist = checkMaster(dataBlacklist)
      const matchPrevious = checkMaster(data2025) || checkMaster(data2024) || checkMaster(data2023)

      if (matchBlacklist) {
        toast({
          variant: "destructive",
          title: "PERINGATAN BLACKLIST",
          description: "NIK/KK ini terdeteksi dalam database BLACKLIST. Data tetap dapat disimpan namun akan otomatis ditolak oleh sistem verifikasi."
        })
      } else if (matchPrevious) {
        toast({
          title: "DATA PEMBANDING DITEMUKAN",
          description: "NIK/KK ini terdeteksi sudah pernah terdaftar di tahun sebelumnya. Data akan diverifikasi lebih lanjut oleh Admin.",
          className: "bg-amber-50 border-amber-200"
        })
      }

      // Coordinator Quota Check (Safeguard)
      if (selectedCoordinator) {
        const coord = availableCoordinators.find(c => c.name === selectedCoordinator)
        if (!coord || coord.remaining <= 0) {
          toast({
            variant: "destructive",
            title: "KUOTA HABIS",
            description: "DATA TIDAK BISA DIINPUT , DIKARENAKAN KUOTA KOORDINATOR TELAH HABIS"
          })
          setLoading(false)
          return
        }
      }

      const registrationCode = Math.floor(10000000 + Math.random() * 90000000).toString()

      const data = {
        ownerId: user.uid,
        createdBy: currentUserProfile?.fullName || user.email?.split('@')[0] || "Unknown",
        fullName: formDataState.fullName,
        nik: formDataState.nik,
        noKK: formDataState.noKK,
        registrationCode: registrationCode,
        pobDob: formDataState.pobDob,
        gender: formDataState.gender,
        phone: formDataState.phone,
        address: formDataState.address,
        rtRw: formDataState.rtRw,
        kelurahan: kelurahan,
        kecamatan: kecamatan,
        businessCategory: formDataState.businessCategory,
        businessName: formDataState.businessName,
        businessLocation: formDataState.businessLocation,
        coordinator: selectedCoordinator,
        status: "pending",
        createdAt: new Date().toISOString(),
      }

      addDocumentNonBlocking(actorsRef, data)
      
      await logActivity({
        query: `INPUT (DIRECT): ${data.fullName} (${nik})`,
        results: "Berhasil Simpan",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'INPUT DATA',
        userId: data.createdBy
      }, database)

      setShowSuccessDialog(true)
      setOpen(false) // Close the main dialog
      
      formElement.reset()
      setFormDataState({
        fullName: "",
        nik: "",
        noKK: "",
        pobDob: "",
        phone: "",
        address: "",
        rtRw: "",
        gender: "",
        businessCategory: "",
        businessName: "",
        businessLocation: ""
      })
      setKelurahan("")
      setKecamatan("")
      setSelectedCoordinator("")
    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Terjadi Kesalahan",
        description: "Gagal melakukan validasi data. Silakan coba lagi."
      })
    } finally {
      setLoading(false)
    }
  }

  const kelurahanList = [
    "Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat",
    "Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru",
    "Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana",
    "Air Raja", "Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="bg-primary hover:bg-primary/90 font-black shadow-lg shadow-primary/20 h-10 rounded-xl px-6">
            <UserPlus className="w-4 h-4 mr-2" /> TAMBAH PELAKU
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          <div className="bg-primary p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                <UserPlus className="w-8 h-8" /> Input Pelaku Usaha Baru
              </DialogTitle>
            </DialogHeader>
            <p className="text-primary-foreground/80 font-medium mt-2">Masukkan data lengkap pelaku usaha untuk pendaftaran baru.</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1">
                  Biodata Pribadi
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nama Lengkap</Label>
                    <Input 
                      id="fullName" 
                      name="fullName" 
                      value={formDataState.fullName}
                      onChange={(e) => setFormDataState(prev => ({ ...prev, fullName: e.target.value }))}
                      required 
                      className="rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Jenis Kelamin</Label>
                    <Select 
                      name="gender" 
                      value={formDataState.gender}
                      onValueChange={(val) => setFormDataState(prev => ({ ...prev, gender: val }))}
                      required
                    >
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                        <SelectItem value="Perempuan">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nik">NIK</Label>
                    <Input 
                      id="nik" 
                      name="nik" 
                      value={formDataState.nik}
                      onChange={(e) => setFormDataState(prev => ({ ...prev, nik: e.target.value }))}
                      maxLength={16} 
                      placeholder="16 digit NIK..." 
                      required 
                      className="rounded-xl font-mono" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noKK">Nomor KK</Label>
                    <Input 
                      id="noKK" 
                      name="noKK" 
                      value={formDataState.noKK}
                      onChange={(e) => setFormDataState(prev => ({ ...prev, noKK: e.target.value }))}
                      maxLength={16} 
                      placeholder="16 digit Nomor KK..." 
                      required 
                      className="rounded-xl font-mono" 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="pobDob">Tempat / Tanggal Lahir</Label>
                    <Input 
                      id="pobDob" 
                      name="pobDob" 
                      value={formDataState.pobDob}
                      onChange={(e) => setFormDataState(prev => ({ ...prev, pobDob: e.target.value }))}
                      placeholder="Contoh: Jakarta, 01-01-1990" 
                      required 
                      className="rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor HP</Label>
                    <Input 
                      id="phone" 
                      name="phone" 
                      value={formDataState.phone}
                      onChange={(e) => setFormDataState(prev => ({ ...prev, phone: e.target.value }))}
                      required 
                      className="rounded-xl" 
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1">
                  Alamat & Lokasi
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Alamat Lengkap</Label>
                    <Textarea 
                      id="address" 
                      name="address" 
                      value={formDataState.address}
                      onChange={(e) => setFormDataState(prev => ({ ...prev, address: e.target.value }))}
                      required 
                      className="rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rtRw">RT / RW</Label>
                    <Input 
                      id="rtRw" 
                      name="rtRw" 
                      value={formDataState.rtRw}
                      onChange={(e) => setFormDataState(prev => ({ ...prev, rtRw: e.target.value }))}
                      placeholder="001 / 002" 
                      required 
                      className="rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kelurahan">Kelurahan</Label>
                    <Select value={kelurahan} onValueChange={setKelurahan} required>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {kelurahanList.map((k) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="kecamatan">Kecamatan (Otomatis)</Label>
                    <Input id="kecamatan" name="kecamatan" value={kecamatan} readOnly className="bg-muted font-bold rounded-xl" />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1">
                  Data Usaha
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="businessCategory">Jenis Usaha</Label>
                    <Select 
                      name="businessCategory" 
                      value={formDataState.businessCategory}
                      onValueChange={(val) => setFormDataState(prev => ({ ...prev, businessCategory: val }))}
                      required
                    >
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kuliner">Kuliner</SelectItem>
                        <SelectItem value="Bukan Kuliner">Bukan Kuliner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Nama Usaha / Produk</Label>
                    <Input 
                      id="businessName" 
                      name="businessName" 
                      value={formDataState.businessName}
                      onChange={(e) => setFormDataState(prev => ({ ...prev, businessName: e.target.value }))}
                      required 
                      className="rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="businessLocation">Lokasi Usaha</Label>
                    <Input 
                      id="businessLocation" 
                      name="businessLocation" 
                      value={formDataState.businessLocation}
                      onChange={(e) => setFormDataState(prev => ({ ...prev, businessLocation: e.target.value }))}
                      required 
                      className="rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="coordinator">KORLAP / DEWAN AKTIF</Label>
                    <Select value={selectedCoordinator} onValueChange={setSelectedCoordinator} required>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Pilih Korlap/Dewan Aktif..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCoordinators.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            <div className="flex justify-between items-center w-full min-w-[300px]">
                              <span className="font-bold">{c.name}</span>
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                Sisa Kuota: {c.remaining}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <div className="flex justify-end pt-4 border-t gap-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl font-bold">
                  BATAL
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || isMonitoring} 
                  className="min-w-[150px] font-black bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  SIMPAN DATA
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="max-w-[400px] border-none shadow-2xl rounded-2xl">
          <AlertDialogHeader className="items-center text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-primary uppercase tracking-tight">
              BERHASIL DISIMPAN!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-bold text-slate-700 leading-relaxed pt-2">
              Data pelaku usaha telah berhasil ditambahkan ke sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction className="w-full h-12 bg-primary hover:bg-primary/90 font-bold text-white rounded-xl">
              SAYA MENGERTI
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
