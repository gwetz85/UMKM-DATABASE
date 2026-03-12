"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { saveBusiness, uploadDocument } from "@/app/actions/business"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileUp, 
  Check,
  ChevronLeft,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function NewBusinessPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docData, setDocData] = useState<{ url: string, name: string } | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const result = await uploadDocument(formData)
      setDocData(result)
      toast({
        title: "Dokumen terunggah",
        description: `File ${result.name} berhasil disimpan di Google Drive.`
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal unggah",
        description: "Terjadi kesalahan saat mengunggah dokumen."
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      companyName: formData.get("companyName") as string,
      ownerName: formData.get("ownerName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      businessType: formData.get("businessType") as string,
      registrationNumber: formData.get("registrationNumber") as string,
      documentUrl: docData?.url,
      documentName: docData?.name,
    }

    try {
      await saveBusiness(data)
      toast({
        title: "Data Disimpan",
        description: "Profil pelaku usaha berhasil ditambahkan ke database Google Sheets."
      })
      router.push("/business")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan",
        description: "Terjadi kesalahan sistem."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Link href="/business" className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" /> Kembali ke Daftar
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-primary font-headline">Input Data Pelaku Usaha</h1>
        <p className="text-muted-foreground">Silakan lengkapi formulir di bawah ini dengan data yang valid.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Informasi Perusahaan
            </CardTitle>
            <CardDescription>Detail legalitas dan operasional bisnis.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nama Perusahaan / Usaha</Label>
              <Input id="companyName" name="companyName" placeholder="Contoh: PT Sumber Rejeki" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessType">Tipe Bisnis / Kategori</Label>
              <Input id="businessType" name="businessType" placeholder="Contoh: Kuliner, Jasa TI, Ritel" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Nomor Induk Berusaha (NIB)</Label>
              <Input id="registrationNumber" name="registrationNumber" placeholder="Masukan NIB" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Kota Domisili</Label>
              <Input id="city" name="city" placeholder="Jakarta, Surabaya, dsb." required />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Kontak & Alamat
            </CardTitle>
            <CardDescription>Informasi penanggung jawab dan lokasi fisik.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Nama Pemilik / Direktur</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="ownerName" name="ownerName" placeholder="Nama Lengkap" className="pl-9" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon / WA</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="phone" name="phone" placeholder="08xxxx" className="pl-9" required />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Alamat Email Resmi</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" name="email" type="email" placeholder="kontak@bisnis.com" className="pl-9" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat Lengkap</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Textarea id="address" name="address" placeholder="Jalan, RT/RW, Kecamatan..." className="pl-9 min-h-[100px]" required />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" /> Berkas & Dokumen
            </CardTitle>
            <CardDescription>Unggah dokumen pendukung ke Google Drive (Izin, Legalitas, dsb).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 bg-muted/5">
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-sm font-medium">Sedang mengunggah...</span>
                </div>
              ) : docData ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center text-accent">
                    <Check className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium">{docData.name}</span>
                  <Button variant="outline" size="sm" onClick={() => setDocData(null)}>Hapus & Ganti</Button>
                </div>
              ) : (
                <>
                  <FileUp className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                      Pilih Dokumen
                    </div>
                    <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} />
                  </Label>
                  <p className="mt-2 text-xs text-muted-foreground">PDF, JPG, atau PNG (Max. 5MB)</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-12">
          <Button variant="outline" type="button" onClick={() => router.back()}>Batal</Button>
          <Button type="submit" disabled={loading} className="bg-accent text-accent-foreground hover:bg-accent/90 min-w-[150px]">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Simpan Data
          </Button>
        </div>
      </form>
    </div>
  )
}