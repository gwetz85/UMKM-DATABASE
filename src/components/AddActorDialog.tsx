"use client"

import { useState, useEffect, useMemo } from "react"
import { useDatabase, useUser, addDocumentNonBlocking, useMemoFirebase, useList, useObject } from "@/firebase"
import { ref, get, query, orderByChild, equalTo, limitToFirst } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, CheckCircle2, UserPlus } from "lucide-react"
import { cn, extractDobFromNik } from "@/lib/utils"
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
  const { user, userProfile: currentUserProfile } = useUser()
  const database = useDatabase()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [kelurahan, setKelurahan] = useState<string>("")
  const [kecamatan, setKecamatan] = useState<string>("")
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>("")
  const [nik, setNik] = useState("")
  const [pob, setPob] = useState("")
  const [dob, setDob] = useState("")
  const [isEditingDob, setIsEditingDob] = useState(false)

  // Fetch Quotas
  const quotaRef = useMemoFirebase(() => database ? ref(database, 'koordinator_kuotas') : null, [database])
  const { data: rawQuotaData } = useList<any>(quotaRef)
  
  // Fetch System Stats for efficient usage calculation
  const statsRef = useMemoFirebase(() => database ? ref(database, 'system_stats') : null, [database])
  const { data: systemStats } = useObject(statsRef)

  const availableCoordinators = useMemo(() => {
    if (!rawQuotaData) return []
    
    // Use pre-calculated stats for usage calculation
    const usageStats = (systemStats as any)?.coordinator || {}

    return rawQuotaData
      .map((q: any) => {
        const nameUpper = (q.name || "").toUpperCase().trim()
        const used = usageStats[nameUpper] || 0
        const quota = q.quota || 0
        const isFull = quota > 0 && (quota - used) <= 0
        return { ...q, isFull, remaining: quota - used }
      })
      .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [rawQuotaData, systemStats])

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
      
      // Tahap 1: Cek duplikasi di Database Aktif
      // Fetch all to avoid Firebase index requirement errors since nik/noKK are not indexed
      const snap = await get(actorsRef)
      let duplicateInActors: any = null
      
      if (snap.exists()) {
        const allActors = Object.values(snap.val()) as any[]
        duplicateInActors = allActors.find(a => a.nik === nik || a.noKK === noKK)
      }

      if (duplicateInActors) {
        const actor = duplicateInActors as any
        toast({ 
          variant: "destructive", 
          title: "DATA TELAH DI INPUT", 
          description: `NIK atau Nomor KK ini sudah terdaftar dengan Nomor Registrasi: ${actor.registrationCode || '-'} dan Koordinator: ${actor.coordinator || '-'}` 
        })
        setLoading(false)
        return
      }

      // Tahap 2: Cek di Database Pembanding (Informasi) secara efisien
      const checkInMaster = async (path: string, field: string, value: string) => {
        const q = query(ref(database, path), orderByChild(field), equalTo(value), limitToFirst(1))
        const snap = await get(q)
        return snap.exists()
      }
      
      const matchBlacklist = await checkInMaster('blacklist_data', 'nik', nik) || await checkInMaster('blacklist_data', 'noKK', noKK)
      const matchPrevious = await checkInMaster('master_data_2025', 'nik', nik) || 
                            await checkInMaster('master_data_2024', 'nik', nik) || 
                            await checkInMaster('master_data_2023', 'nik', nik)

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

      const petugasSurveyName = (currentUserProfile?.fullName || "").toUpperCase().trim()

      const data = {
        ownerId: user.uid,
        createdBy: currentUserProfile?.fullName || user.email?.split('@')[0] || "Unknown",
        petugasSurvey: petugasSurveyName,
        fullName: formData.get("fullName"),
        nik: nik,
        noKK: noKK,
        registrationCode: registrationCode,
        pobDob: `${pob}, ${dob}`,
        pob: pob,
        dob: dob,
        gender: formData.get("gender"),
        phone: formData.get("phone"),
        address: formData.get("address"),
        rtRw: formData.get("rtRw"),
        kelurahan: kelurahan,
        kecamatan: kecamatan,
        businessCategory: formData.get("businessCategory"),
        businessName: formData.get("businessName"),
        businessLocation: formData.get("businessLocation"),
        coordinator: selectedCoordinator,
        status: "pending",
        createdAt: new Date().toISOString(),
      }

      addDocumentNonBlocking(actorsRef, data)
      
      // Update global stats for dashboard
      import("@/lib/stats-service").then(({ updateStatsOnNewActor }) => {
        updateStatsOnNewActor(database, data).catch(err => console.error("Stats update error:", err));
      });

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
      setKelurahan("")
      setKecamatan("")
      setSelectedCoordinator("")
      setNik("")
      setPob("")
      setDob("")
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
                    <Input id="fullName" name="fullName" required className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Jenis Kelamin</Label>
                    <Select name="gender" required>
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
                      maxLength={16} 
                      placeholder="16 digit NIK..." 
                      required 
                      className="rounded-xl font-mono" 
                      value={nik}
                      onChange={(e) => {
                        const cleanNik = e.target.value.replace(/[^0-9]/g, "");
                        setNik(cleanNik);
                        if (cleanNik.length >= 12) {
                          const extracted = extractDobFromNik(cleanNik);
                          if (extracted) {
                            setDob(extracted);
                          }
                        } else {
                          setDob("");
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noKK">Nomor KK</Label>
                    <Input id="noKK" name="noKK" maxLength={16} placeholder="16 digit Nomor KK..." required className="rounded-xl font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pob">Tempat Lahir</Label>
                    <Input 
                      id="pob" 
                      name="pob" 
                      placeholder="Masukkan tempat lahir..." 
                      required 
                      className="rounded-xl" 
                      value={pob}
                      onChange={(e) => setPob(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="dob">Tanggal Lahir {isEditingDob ? "(Manual)" : "(Otomatis)"}</Label>
                      <button
                        type="button"
                        onClick={() => setIsEditingDob(!isEditingDob)}
                        className="text-xs text-primary font-bold hover:underline"
                      >
                        {isEditingDob ? "Kunci" : "Edit Manual"}
                      </button>
                    </div>
                    <Input 
                      id="dob" 
                      name="dob" 
                      placeholder="Terisi otomatis dari NIK" 
                      readOnly={!isEditingDob}
                      required 
                      className={cn("rounded-xl font-semibold", !isEditingDob && "bg-muted")}
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor HP</Label>
                    <Input id="phone" name="phone" required className="rounded-xl" />
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
                    <Textarea id="address" name="address" required className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rtRw">RT / RW</Label>
                    <Input id="rtRw" name="rtRw" placeholder="001 / 002" required className="rounded-xl" />
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
                    <Select name="businessCategory" required>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kuliner">Kuliner</SelectItem>
                        <SelectItem value="Bukan Kuliner">Bukan Kuliner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Nama Usaha / Produk</Label>
                    <Input id="businessName" name="businessName" required className="rounded-xl" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="businessLocation">Lokasi Usaha</Label>
                    <Input id="businessLocation" name="businessLocation" required className="rounded-xl" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="coordinator">USULAN</Label>
                    <Select value={selectedCoordinator} onValueChange={setSelectedCoordinator} required>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Pilih Usulan..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCoordinators.filter(c => c.remaining > 0).map((c) => (
                          <SelectItem key={c.id} value={c.name} className="group focus:bg-primary focus:text-white">
                            <div className="flex justify-between items-center w-full min-w-[300px]">
                              <span className="font-bold group-focus:text-white">{c.name}</span>
                              <span className="text-[10px] bg-primary/10 text-primary group-focus:bg-white/20 group-focus:text-white px-2 py-0.5 rounded-full">
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
