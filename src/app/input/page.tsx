"use client"

import { useState, useEffect, useMemo } from "react"
import { useDatabase, useUser, addDocumentNonBlocking, useMemoFirebase, useList, useObject } from "@/firebase"
import { ref, query, equalTo, get, limitToFirst, orderByChild } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, CheckCircle2 } from "lucide-react"
import { cn, extractDobFromNik } from "@/lib/utils"
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
  const [nik, setNik] = useState("")
  const [pob, setPob] = useState("")
  const [dob, setDob] = useState("")

  // Fetch Quotas - still needed for selection, but we'll optimize the usage calculation
  const quotaRef = useMemoFirebase(() => database ? ref(database, 'koordinator_kuotas') : null, [database])
  const { data: rawQuotaData } = useList<any>(quotaRef)

  // NOTE: Removed full fetching of businessActors and master_data to improve performance.
  // Duplicate checks and auto-verification will now use targeted queries.

  // Fetch System Stats for efficient usage calculation
  const statsRef = useMemoFirebase(() => database ? ref(database, 'system_stats') : null, [database])
  const { data: systemStats } = useObject<any>(statsRef)

  const availableCoordinators = useMemo(() => {
    if (!rawQuotaData) return []
    
    const usageStats = (systemStats as any)?.coordinator || {}

    return rawQuotaData
      .map((q: any) => {
        const nameUpper = (q.name || "").toUpperCase().trim()
        const used = usageStats[nameUpper] || 0
        const rawQuota = parseInt(String(q.quota)) || 0
        const remaining = rawQuota - used
        return { ...q, remaining: Math.max(0, remaining) }
      })
      .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [rawQuotaData, systemStats])

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
      // We fetch all to avoid Firebase index requirement errors since nik/noKK are not indexed
      const snap = await get(actorsRef)
      let duplicateInActors: any = null
      let currentCoordCount = 0
      
      if (snap.exists()) {
        const allActors = Object.values(snap.val()) as any[]
        duplicateInActors = allActors.find(a => a.nik === nik || a.noKK === noKK)
        if (selectedCoordinator) {
          currentCoordCount = allActors.filter(a => a.coordinator === selectedCoordinator).length
        }
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

      // Tahap 2: Cek di Database Pembanding (Informasi) secara efisien
      const checkInMaster = async (path: string, field: string, value: string) => {
        const q = query(ref(database, path), orderByChild(field), equalTo(value), limitToFirst(1))
        const snap = await get(q)
        return snap.exists()
      }

      // Cek satu per satu untuk menghemat resource (bisa dioptimalkan lebih lanjut)
      const isBlacklisted = await checkInMaster('blacklist_data', 'nik', nik) || await checkInMaster('blacklist_data', 'noKK', noKK)
      
      if (isBlacklisted) {
        console.log("Data ditemukan di blacklist.")
      }

      // Coordinator Quota Check (Safeguard)
      if (selectedCoordinator) {
        const quotaItem = rawQuotaData?.find((q: any) => q.name === selectedCoordinator)
        if (quotaItem && currentCoordCount >= quotaItem.quota) {
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
      
      // Update global stats for dashboard (Efficient alternative to fetching all docs)
      import("@/lib/stats-service").then(({ updateStatsOnNewActor }) => {
        updateStatsOnNewActor(database, data).catch(err => console.error("Stats update error:", err));
      });
      
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
      setNik("")
      setPob("")
      setDob("")
    } catch (error: any) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Terjadi Kesalahan",
        description: `Gagal menyimpan data: ${error.message || "Silakan coba lagi."}`
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
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header Tunas Bangsa */}
      <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] shadow-xl shadow-primary/5 border border-primary/10 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="flex flex-col text-center md:text-left gap-1">
          <h2 className="text-2xl md:text-4xl font-black text-primary font-headline leading-none uppercase tracking-tight">TUNAS BANGSA KEPULAUAN RIAU</h2>
          <h3 className="text-lg md:text-2xl font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">PENGAJUAN BANTUAN UMKM TAHUN 2026</h3>
          <div className="h-1 w-20 bg-primary mt-2 mx-auto md:mx-0 rounded-full" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <h1 className="text-3xl font-bold text-primary font-headline uppercase tracking-tighter">Formulir Pendaftaran</h1>
        </div>
        <p className="text-muted-foreground font-medium">Silakan isi formulir di bawah ini dengan lengkap dan benar untuk pendaftaran pelaku usaha.</p>
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
              <Input 
                id="nik" 
                name="nik" 
                maxLength={16} 
                placeholder="Masukkan 16 digit NIK..." 
                required 
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
              <Input id="noKK" name="noKK" maxLength={16} placeholder="Masukkan 16 digit Nomor KK..." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pob">Tempat Lahir</Label>
              <Input 
                id="pob" 
                name="pob" 
                placeholder="Masukkan tempat lahir..." 
                required 
                value={pob}
                onChange={(e) => setPob(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Tanggal Lahir (Otomatis)</Label>
              <Input 
                id="dob" 
                name="dob" 
                placeholder="Terisi otomatis dari NIK" 
                readOnly 
                required 
                value={dob}
                className="bg-muted font-semibold"
              />
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
                  {availableCoordinators.filter(c => c.remaining > 0).map((c) => (
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
