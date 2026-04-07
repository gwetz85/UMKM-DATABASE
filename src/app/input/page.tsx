
"use client"

import { useState, useEffect } from "react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function InputDataPage() {
  const { toast } = useToast()
  const { user } = useUser()
  const database = useDatabase()
  const [loading, setLoading] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [kelurahan, setKelurahan] = useState<string>("")
  const [kecamatan, setKecamatan] = useState<string>("")

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
      
      // In-memory duplicate check to avoid orderByChild ReferenceError
      const actorsSnapshot = await get(actorsRef)
      let duplicateFound = false
      
      if (actorsSnapshot.exists()) {
        actorsSnapshot.forEach((child) => {
          const val = child.val()
          if (val.nik === nik || val.noKK === noKK) {
            duplicateFound = true
          }
        })
      }

      if (duplicateFound) {
        toast({ 
          variant: "destructive", 
          title: "DATA TELAH DI INPUT", 
          description: "NIK atau Nomor KK ini sudah terdaftar dalam sistem." 
        })
        setLoading(false)
        return
      }

      // Coordinator Quota Check
      const selectedCoordinator = (formData.get("coordinator") as string)?.toUpperCase().trim()
      if (selectedCoordinator) {
        const quotaRef = ref(database, 'koordinator_kuotas')
        const quotaSnapshot = await get(quotaRef)
        
        if (quotaSnapshot.exists()) {
          const quotaData = Object.values(quotaSnapshot.val()) as any[]
          const coordQuota = quotaData.find(q => (q.name || "").toUpperCase().trim() === selectedCoordinator)
          
          if (coordQuota) {
            const limit = coordQuota.quota || 0
            let achieved = 0
            
            // Count from the actorsSnapshot we already have
            if (actorsSnapshot.exists()) {
              actorsSnapshot.forEach((child) => {
                const val = child.val()
                if (val.status !== 'rejected' && (val.coordinator || "").toUpperCase().trim() === selectedCoordinator) {
                  achieved++
                }
              })
            }
            
            if (achieved >= limit) {
              toast({
                variant: "destructive",
                title: "KUOTA HABIS",
                description: "DATA TIDAK BISA DIINPUT , DIKARENAKAN KUOTA KOORDINATOR TELAH HABIS"
              })
              setLoading(false)
              return
            }
          }
        }
      }

      const data = {
        ownerId: user.uid,
        createdBy: currentUserProfile?.fullName || user.email?.split('@')[0] || "Unknown",
        fullName: formData.get("fullName"),
        nik: nik,
        noKK: noKK,
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
        coordinator: formData.get("coordinator"),
        status: "pending",
        createdAt: new Date().toISOString(),
      }

      addDocumentNonBlocking(actorsRef, data)
      
      // Munculkan Pop Out Sukses
      setShowSuccessDialog(true)
      
      // Reset Form
      formElement.reset()
      setKelurahan("")
      setKecamatan("")
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
        <h1 className="text-3xl font-bold text-primary font-headline">Input Data Baru</h1>
        <p className="text-muted-foreground">Lengkapi formulir untuk mendaftarkan pelaku usaha baru.</p>
        {isMonitoring && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-sm shadow-sm animate-pulse">
            <span className="text-xl">👁️</span>
            MODE MONITORING: Anda hanya dapat melihat formulir ini tanpa izin menyimpan data.
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
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                  <SelectItem value="Perempuan">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nik">NIK</Label>
              <Input id="nik" name="nik" maxLength={16} placeholder="16 Digit NIK" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noKK">Nomor KK</Label>
              <Input id="noKK" name="noKK" maxLength={16} placeholder="16 Digit No KK" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pobDob">Tempat / Tanggal Lahir</Label>
              <Input id="pobDob" name="pobDob" placeholder="Contoh: Jakarta, 01-01-1990" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Ponsel</Label>
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
                <SelectTrigger><SelectValue placeholder="Pilih Kelurahan" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kuliner">Kuliner</SelectItem>
                  <SelectItem value="Bukan Kuliner">Bukan Kuliner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">Nama Usaha</Label>
              <Input id="businessName" name="businessName" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="businessLocation">Lokasi Usaha</Label>
              <Input id="businessLocation" name="businessLocation" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="coordinator">Koordinator</Label>
              <Input id="coordinator" name="coordinator" placeholder="Nama Koordinator Lapangan" required />
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
            {isMonitoring ? "AKSES TERBATAS" : "Simpan Data Input"}
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
              DATA TELAH TERSIMPAN
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-bold text-slate-700 leading-relaxed pt-2">
              Mohon menunggu ADMIN memverifikasi data anda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction className="w-full h-12 bg-primary hover:bg-primary/90 font-bold text-white rounded-xl">
              OKE, MENGERTI
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
