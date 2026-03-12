"use client"

import { useState } from "react"
import { aiBusinessComplianceGuide } from "@/ai/flows/ai-business-compliance-guide"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { 
  ShieldCheck, 
  Search, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  Info,
  Building2,
  MapPin
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ComplianceGuidePage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<string[] | null>(null)
  const [form, setForm] = useState({ businessType: "", location: "" })

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.businessType || !form.location) return

    setLoading(true)
    try {
      const response = await aiBusinessComplianceGuide(form)
      setResults(response.complianceChecklist)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-2 bg-accent/20 rounded-full mb-2">
          <Sparkles className="w-6 h-6 text-accent" />
        </div>
        <h1 className="text-3xl font-bold text-primary font-headline">AI Business Compliance Guide</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Dapatkan panduan kepatuhan dan perizinan bisnis secara otomatis berdasarkan klasifikasi usaha dan lokasi Anda.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-2 border-none shadow-sm h-fit">
          <CardHeader>
            <CardTitle>Analisis Kepatuhan</CardTitle>
            <CardDescription>Masukan detail bisnis untuk memulai.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessType">Tipe Bisnis</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="businessType" 
                    placeholder="Contoh: Coffee Shop, Fintech..." 
                    className="pl-9"
                    value={form.businessType}
                    onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Lokasi (Kota/Provinsi)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="location" 
                    placeholder="Contoh: Jakarta Pusat" 
                    className="pl-9"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    required 
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Analisis Sekarang
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          {!results && !loading && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl border-muted bg-white">
              <Info className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-center px-6">
                Belum ada data analisis. Silakan isi form di sebelah kiri untuk melihat checklist kepatuhan.
              </p>
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-blue-100 animate-pulse">
                <div className="w-8 h-8 bg-blue-100 rounded-full" />
                <div className="h-4 bg-blue-50 rounded w-full" />
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-blue-100 animate-pulse">
                <div className="w-8 h-8 bg-blue-100 rounded-full" />
                <div className="h-4 bg-blue-50 rounded w-full" />
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-blue-100 animate-pulse">
                <div className="w-8 h-8 bg-blue-100 rounded-full" />
                <div className="h-4 bg-blue-50 rounded w-full" />
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              <Alert className="bg-green-50 border-green-200 text-green-900">
                <ShieldCheck className="w-4 h-4 text-green-700" />
                <AlertTitle className="font-bold">Analisis Selesai</AlertTitle>
                <AlertDescription>
                  Berikut adalah estimasi kebutuhan kepatuhan untuk usaha <strong>{form.businessType}</strong> di <strong>{form.location}</strong>.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                {results.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm border border-muted hover:border-accent transition-colors group">
                    <div className="bg-accent/10 p-2 rounded-lg group-hover:bg-accent/20 transition-colors">
                      <CheckCircle2 className="w-5 h-5 text-accent" />
                    </div>
                    <p className="text-sm font-medium pt-2 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex gap-2 text-blue-700 text-xs font-medium uppercase tracking-wider mb-2">
                  <Info className="w-3 h-3" /> Catatan AI
                </div>
                <p className="text-xs text-blue-900/70 leading-relaxed">
                  Data ini dihasilkan oleh sistem AI dan bertujuan sebagai referensi awal. Kami menyarankan untuk tetap berkonsultasi dengan ahli hukum atau dinas terkait (OSS/BKPM) untuk kepastian legalitas yang lebih akurat.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}