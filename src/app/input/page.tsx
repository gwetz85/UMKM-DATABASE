"use client"

import { useState, useEffect, useMemo } from "react"
import { useDatabase, useUser, addDocumentNonBlocking, useMemoFirebase, useList } from "@/firebase"
import { ref, query, equalTo, get, limitToFirst } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { SidebarTrigger } from "@/components/ui/sidebar"
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


export default function InputDataPage() {
  const { toast } = useToast()
  const { user } = useUser()
  const database = useDatabase()
  const [loading, setLoading] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [kelurahan, setKelurahan] = useState<string>("")
  const [kecamatan, setKecamatan] = useState<string>("")
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>("")

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
      
      // Tahap 1: Cek duplikasi di Database Aktif (businessActors)
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
      // Kita tidak memblokir di sini karena akan ditangani oleh Verifikasi Otomatis di menu Admin.
      const checkMaster = (data: any[] | null) => {
        return (data || []).find((m: any) => (m.noKK && String(m.noKK).trim() === noKK) || (m.nik && String(m.nik).trim() === nik))
      }
      const matchMaster = checkMaster(dataBlacklist) || checkMaster(data2025) || checkMaster(data2024) || checkMaster(data2023)
      
      if (matchMaster) {
        console.log("Data ditemukan di database pembanding, akan diproses oleh verifikasi otomatis.")
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
        fullName: formData.get("fullName"),
        nik: nik,
        noKK: noKK,
        registrationCode: registrationCode,
        pobDob: formData.get("pobDob"),
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
      
      // Log Input Activity
      await logActivity({
        query: `INPUT: ${data.fullName} (${nik})`,
        results: "Berhasil Simpan",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'INPUT DATA',
        userId: data.createdBy
      }, database)

      // Munculkan Pop Out Sukses
      setShowSuccessDialog(true)
      
      // Reset Form
      formElement.reset()
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
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <h1 className="text-3xl font-bold text-primary font-headline">Input Data Pelaku Usaha Baru</h1>
        </div>
        <p className="text-muted-foreground">Silakan isi formulir di bawah ini dengan lengkap dan benar untuk pendaftaran pelaku usaha.</p>
        {isMonitoring && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-sm shadow-sm animate-pulse">
            <span className="text-xl">👁️</span>
            MODE MONITORING: Anda hanya dapat melihat data dan tidak diizinkan melakukan input.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-none shadow-sm bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="text-lg">Biodata Pribadi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input id="fullName" name="fullName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Jenis Kelamin</Label>
              <Select name="gender" required>
                <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                  <SelectItem value="Perempuan">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nik">NIK</Label>
              <Input id="nik" name="nik" maxLength={16} placeholder="Masukkan 16 digit NIK..." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noKK">Nomor KK</Label>
              <Input id="noKK" name="noKK" maxLength={16} placeholder="Masukkan 16 digit Nomor KK..." required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pobDob">Tempat / Tanggal Lahir</Label>
              <Input id="pobDob" name="pobDob" placeholder="Contoh: Jakarta, 01-01-1990" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor HP</Label>
              <Input id="phone" name="phone" required />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="text-lg">Alamat & Lokasi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Alamat Lengkap</Label>
              <Textarea id="address" name="address" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rtRw">RT / RW</Label>
              <Input id="rtRw" name="rtRw" placeholder="001 / 002" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kelurahan">Kelurahan</Label>
              <Select value={kelurahan} onValueChange={setKelurahan} required>
                <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {kelurahanList.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="kecamatan">Kecamatan (Otomatis)</Label>
              <Input id="kecamatan" name="kecamatan" value={kecamatan} readOnly className="bg-muted font-bold" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="text-lg">Data Usaha</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessCategory">Jenis Usaha</Label>
              <Select name="businessCategory" required>
                <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kuliner">Kuliner</SelectItem>
                  <SelectItem value="Bukan Kuliner">Bukan Kuliner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">Nama Usaha / Produk</Label>
              <Input id="businessName" name="businessName" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="businessLocation">Lokasi Usaha</Label>
              <Input id="businessLocation" name="businessLocation" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="coordinator">KORLAP / DEWAN AKTIF</Label>
              <Select value={selectedCoordinator} onValueChange={setSelectedCoordinator} required>
                <SelectTrigger>
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
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button 
            type="submit" 
            disabled={loading || isMonitoring} 
            className={cn(
              "w-full md:w-auto min-w-[200px] font-bold shadow-lg",
              isMonitoring ? "bg-slate-400 cursor-not-allowed" : "bg-primary text-primary-foreground"
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isMonitoring ? "Akses Terbatas" : "Simpan Data Pendaftaran"}
          </Button>
        </div>
      </form>

      {/* Pop Out Sukses */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="max-w-[400px] border-none shadow-2xl rounded-2xl">
          <AlertDialogHeader className="items-center text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-primary uppercase tracking-tight">
              DATA BERHASIL DISIMPAN!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-bold text-slate-700 leading-relaxed pt-2">
              Data pelaku usaha telah masuk ke sistem dan sedang menunggu verifikasi oleh Admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction className="w-full h-12 bg-primary hover:bg-primary/90 font-bold text-white rounded-xl">
              SAYA MENGERTI
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  )
}
