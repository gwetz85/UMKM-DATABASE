"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDatabase, useUser, addDocumentNonBlocking } from "@/firebase"
import { ref } from "firebase/database"
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
  Check,
  ChevronLeft,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function NewBusinessPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  const database = useDatabase()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) {
      toast({ variant: "destructive", title: "Gagal", description: "Anda harus masuk terlebih dahulu." })
      return
    }

    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const data = {
      ownerId: user.uid,
      companyName: formData.get("companyName") as string,
      ownerName: formData.get("ownerName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      businessType: formData.get("businessType") as string,
      registrationNumber: formData.get("registrationNumber") as string,
      createdAt: new Date().toISOString(),
    }

    try {
      const colRef = ref(database, `users/${user.uid}/businessActors`)
      addDocumentNonBlocking(colRef, data)
      
      toast({
        title: "Data Disimpan",
        description: "Profil pelaku usaha berhasil ditambahkan ke Firebase Firestore."
      })
      router.push("/business")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan",
        description: "Terjadi kesalahan saat menyimpan ke database."
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
