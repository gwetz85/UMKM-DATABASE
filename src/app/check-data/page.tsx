
"use client"

import { useState } from "react"
import { useFirestore } from "@/firebase"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SearchCheck, Loader2, CheckCircle2, XCircle, Info, Database } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function CheckDataPage() {
  const firestore = useFirestore()
  const [loading, setLoading] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const [found, setFound] = useState(false)
  const [formData, setFormData] = useState({ nik: "", noKK: "" })

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nik || !formData.noKK) return

    setLoading(true)
    setSearchDone(false)
    try {
      const q = query(
        collection(firestore, 'master_data'),
        where('nik', '==', formData.nik.trim()),
        where('noKK', '==', formData.noKK.trim()),
        limit(1)
      )
      
      const snapshot = await getDocs(q)
      setFound(!snapshot.empty)
      setSearchDone(true)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2">
          <Database className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-black text-primary font-headline">Cek Data Master</h1>
        <p className="text-muted-foreground max-w-xl mx-auto font-medium">
          Lakukan pengecekan NIK dan Nomor KK untuk memastikan data terdaftar dalam database master.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-5">
        <Card className="md:col-span-2 border-none shadow-xl bg-white h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Form Pencarian</CardTitle>
            <CardDescription>Masukkan data yang ingin divalidasi.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheck} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="noKK" className="font-bold text-slate-700">Nomor Kartu Keluarga</Label>
                <Input 
                  id="noKK" 
                  placeholder="16 Digit No KK" 
                  maxLength={16}
                  value={formData.noKK}
                  onChange={(e) => setFormData({ ...formData, noKK: e.target.value })}
                  className="h-11"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nik" className="font-bold text-slate-700">NIK (No Induk Kependudukan)</Label>
                <Input 
                  id="nik" 
                  placeholder="16 Digit NIK" 
                  maxLength={16}
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  className="h-11"
                  required 
                />
              </div>
              <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <SearchCheck className="w-5 h-5 mr-2" />}
                Verifikasi Data
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-6">
          {!searchDone && !loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed rounded-3xl border-muted bg-white/50 p-8 text-center">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Info className="w-8 h-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">Belum Ada Hasil</h3>
              <p className="text-sm text-muted-foreground">
                Silakan isi Nomor KK dan NIK pada form di samping untuk mulai melakukan pengecekan data master.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-white rounded-3xl shadow-sm border p-8 text-center animate-pulse">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-primary font-bold">Sedang Menghubungkan ke Database Master...</p>
            </div>
          )}

          {searchDone && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {found ? (
                <div className="space-y-6">
                  <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900 rounded-2xl p-6">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <AlertTitle className="text-xl font-black mb-2">DATA DITEMUKAN!</AlertTitle>
                    <AlertDescription className="font-medium">
                      Pasangan NIK <strong>{formData.nik}</strong> dan KK <strong>{formData.noKK}</strong> terdaftar valid dalam database master.
                    </AlertDescription>
                  </Alert>
                  
                  <Card className="border-none shadow-lg bg-emerald-600 text-white overflow-hidden">
                    <CardContent className="p-8 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest opacity-80">Status Verifikasi</p>
                        <p className="text-3xl font-black">VALID / REGISTERED</p>
                      </div>
                      <CheckCircle2 className="w-16 h-16 opacity-20" />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="space-y-6">
                  <Alert className="bg-red-50 border-red-200 text-red-900 rounded-2xl p-6">
                    <XCircle className="w-6 h-6 text-red-600" />
                    <AlertTitle className="text-xl font-black mb-2">DATA TIDAK TERDAFTAR</AlertTitle>
                    <AlertDescription className="font-medium">
                      Mohon maaf, kombinasi NIK dan KK yang Anda masukkan tidak ditemukan dalam database master kami.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 flex gap-4">
                    <div className="bg-amber-100 p-2 h-fit rounded-lg">
                      <Info className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-amber-900">Saran Tindakan:</p>
                      <ul className="text-xs text-amber-800 space-y-1 list-disc pl-4">
                        <li>Pastikan angka yang dimasukkan sudah benar (16 Digit).</li>
                        <li>Pastikan NIK dan KK berasal dari satu kartu keluarga yang sama.</li>
                        <li>Jika data Anda baru, hubungi Admin untuk pembaruan database master.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full mt-6 h-11 rounded-xl" 
                onClick={() => {
                  setSearchDone(false);
                  setFormData({ nik: "", noKK: "" });
                }}
              >
                Ulangi Pencarian
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
