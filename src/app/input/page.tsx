
"use client"

import { useState, useEffect } from "react"
import { useFirestore, useUser, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save } from "lucide-react"

export default function InputDataPage() {
  const { toast } = useToast()
  const { user } = useUser()
  const firestore = useFirestore()
  const [loading, setLoading] = useState(false)
  const [kelurahan, setKelurahan] = useState<string>("")
  const [kecamatan, setKecamatan] = useState<string>("")

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
    if (!user || !firestore) return

    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const nik = formData.get("nik") as string
    const noKK = formData.get("noKK") as string

    try {
      const actorsRef = collection(firestore, 'businessActors')
      
      const qNik = query(actorsRef, where('nik', '==', nik))
      const qKK = query(actorsRef, where('noKK', '==', noKK))

      const [snapNik, snapKK] = await Promise.all([
        getDocs(qNik),
        getDocs(qKK)
      ])

      if (!snapNik.empty || !snapKK.empty) {
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
      
      toast({ 
        title: "DATA TELAH TERSIMPAN", 
        description: "Mohon menunggu ADMIN memverifikasi data anda" 
      })
      e.currentTarget.reset()
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
          <Button type="submit" disabled={loading} className="w-full md:w-auto min-w-[200px] bg-primary text-primary-foreground font-bold">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Data Input
          </Button>
        </div>
      </form>
    </div>
  )
}
