
"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useDatabase, useUser, addDocumentNonBlocking, useMemoFirebase, useList } from "@/firebase"
import { ref, query, equalTo, get, limitToFirst } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, CheckCircle2, Scan, Camera } from "lucide-react"
import { ktpOCR } from "@/ai/flows/ktp-ocr"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function InputDataForm() {
  const { toast } = useToast()
  const { user } = useUser()
  const database = useDatabase()
  const [loading, setLoading] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [kelurahan, setKelurahan] = useState<string>("")
  const [kecamatan, setKecamatan] = useState<string>("")
  const searchParams = useSearchParams()
  const scanTriggered = searchParams.get("scan") === "true"
  
  // States for auto-fill
  const [formDataState, setFormDataState] = useState({
    fullName: "",
    nik: "",
    pobDob: "",
    address: "",
    rtRw: "",
    gender: "",
  })
  const [ocrLoading, setOcrLoading] = useState(false)

  const handleOcrChange = (field: string, value: string) => {
    setFormDataState((prev: typeof formDataState) => ({ ...prev, [field]: value }))
  }

  // Get current user profile to record who created the entry
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])

  const { data: allUsersForProfile } = useList(userProfileRef)
  const currentUserProfile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)

  const [currentTime, setCurrentTime] = useState<string>("")
  const [currentDate, setCurrentDate] = useState<string>("")

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
      setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)

    // Handle auto-scan from URL
    if (scanTriggered) {
      const timer = setTimeout(() => {
        document.getElementById('ktp-upload-top')?.click()
      }, 800)
      return () => {
        clearInterval(interval)
        clearTimeout(timer)
      }
    }

    return () => clearInterval(interval)
  }, [scanTriggered])

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
        actorsSnapshot.forEach((child: any) => {
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

  const handleScanKTP = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setOcrLoading(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        const result = await ktpOCR(base64)
        
        if (result) {
          setFormDataState({
            fullName: result.fullName || "",
            nik: result.nik || "",
            pobDob: result.pobDob || "",
            address: result.address || "",
            rtRw: result.rtRw || "",
            gender: result.gender || "",
          })
          
          if (result.kelurahan) {
            // Find best match in kelurahanList
            const match = kelurahanList.find(k => 
              k.toLowerCase().includes(result.kelurahan.toLowerCase()) || 
              result.kelurahan.toLowerCase().includes(k.toLowerCase())
            )
            if (match) setKelurahan(match)
          }
          
          toast({
            title: "KTP Berhasil Dipindai",
            description: "Data telah diisi otomatis ke formulir.",
          })
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Gagal Pindai KTP",
        description: "Terjadi kesalahan saat mengekstrak data dari gambar.",
      })
    } finally {
      setOcrLoading(false)
      // Reset input value so it can be used again
      e.target.value = ""
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-primary font-headline">Input Data Baru</h1>
          <p className="text-muted-foreground">Lengkapi formulir untuk mendaftarkan pelaku usaha baru.</p>
        </div>
        <div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="ktp-upload-top"
            onChange={handleScanKTP}
          />
          <Button 
            type="button" 
            variant="default" 
            size="lg" 
            disabled={ocrLoading}
            onClick={() => document.getElementById('ktp-upload-top')?.click()}
            className="w-full md:w-auto bg-primary text-primary-foreground font-black shadow-xl hover:scale-105 transition-transform"
          >
            {ocrLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Camera className="w-12 h-12 mr-3" />
            )}
            EKSEKUSI SCAN KTP (AI)
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-none shadow-sm bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Biodata Pribadi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input 
                id="fullName" 
                name="fullName" 
                value={formDataState.fullName} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOcrChange("fullName", e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Jenis Kelamin</Label>
              <Select 
                name="gender" 
                value={formDataState.gender} 
                onValueChange={(v: string) => handleOcrChange("gender", v)}
                required
              >
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
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
                placeholder="16 Digit NIK" 
                value={formDataState.nik}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOcrChange("nik", e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noKK">Nomor KK</Label>
              <Input id="noKK" name="noKK" maxLength={16} placeholder="16 Digit No KK" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pobDob">Tempat / Tanggal Lahir</Label>
              <Input 
                id="pobDob" 
                name="pobDob" 
                placeholder="Contoh: Jakarta, 01-01-1990" 
                value={formDataState.pobDob}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOcrChange("pobDob", e.target.value)}
                required 
              />
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
              <Textarea 
                id="address" 
                name="address" 
                value={formDataState.address}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleOcrChange("address", e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rtRw">RT / RW</Label>
              <Input 
                id="rtRw" 
                name="rtRw" 
                placeholder="001 / 002" 
                value={formDataState.rtRw}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOcrChange("rtRw", e.target.value)}
                required 
              />
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
          <Button type="submit" disabled={loading} className="w-full md:w-auto min-w-[200px] bg-primary text-primary-foreground font-bold shadow-lg">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Data Input
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

export default function InputDataPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <InputDataForm />
    </Suspense>
  )
}
