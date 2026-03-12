"use client"

import { useState } from "react"
import { useFirestore } from "@/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { SearchCheck, Loader2, CheckCircle2, XCircle, Info, Database, UserSearch } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function CheckDataPage() {
  const firestore = useFirestore()
  const [loading, setLoading] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [searchType, setSearchType] = useState<"nik" | "noKK">("nik")
  const [inputValue, setInputValue] = useState("")

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    setLoading(true)
    setSearchDone(false)
    setResults([])

    try {
      const q = query(
        collection(firestore, 'master_data'),
        where(searchType, '==', inputValue.trim())
      )
      
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => doc.data())
      setResults(data)
      setSearchDone(true)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-[95rem] mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2">
          <Database className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-black text-primary font-headline">Cek Data Master</h1>
        <p className="text-muted-foreground max-w-xl mx-auto font-medium">
          Lakukan pengecekan data penduduk berdasarkan NIK individu atau seluruh anggota dalam satu Kartu Keluarga.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <Card className="lg:col-span-3 border-none shadow-xl h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Parameter Pencarian</CardTitle>
            <CardDescription>Pilih salah satu metode pencarian.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheck} className="space-y-6">
              <div className="space-y-4">
                <Label className="text-sm font-bold text-foreground">Tipe Pencarian</Label>
                <RadioGroup 
                  value={searchType} 
                  onValueChange={(v: any) => {
                    setSearchType(v)
                    setInputValue("")
                    setSearchDone(false)
                  }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-xl border border-muted hover:bg-muted/50 cursor-pointer transition-colors">
                    <RadioGroupItem value="nik" id="r-nik" />
                    <Label htmlFor="r-nik" className="flex-1 cursor-pointer font-bold">Berdasarkan NIK</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-xl border border-muted hover:bg-muted/50 cursor-pointer transition-colors">
                    <RadioGroupItem value="noKK" id="r-kk" />
                    <Label htmlFor="r-kk" className="flex-1 cursor-pointer font-bold">Berdasarkan Nomor KK</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inputValue" className="font-bold text-foreground">
                  {searchType === "nik" ? "NIK (16 Digit)" : "Nomor KK (16 Digit)"}
                </Label>
                <Input 
                  id="inputValue" 
                  placeholder={searchType === "nik" ? "Input NIK" : "Input No KK"} 
                  maxLength={16}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex h-12 w-full text-lg font-mono tracking-widest"
                  required 
                />
              </div>

              <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <SearchCheck className="w-5 h-5 mr-2" />}
                Cari Data
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-9 space-y-6">
          {!searchDone && !loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] border-2 border-dashed rounded-3xl border-muted bg-card/50 p-8 text-center">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Info className="w-8 h-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Siap Melakukan Pengecekan</h3>
              <p className="text-sm text-muted-foreground">
                Silakan pilih metode pencarian dan masukkan nomor yang valid pada form di samping.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-card rounded-3xl shadow-sm border p-8 text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-primary font-bold animate-pulse">Menghubungkan ke Database Master...</p>
            </div>
          )}

          {searchDone && (
            <div className="animate-in fade-in duration-500 space-y-6">
              {results.length > 0 ? (
                <div className="space-y-6">
                  <Alert className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 rounded-2xl p-6">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    <AlertTitle className="text-xl font-black mb-1 uppercase">DATA DITEMUKAN</AlertTitle>
                    <AlertDescription className="font-medium">
                      Ditemukan <strong>{results.length}</strong> record data yang terhubung dengan pencarian Anda.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    {results.map((res, idx) => (
                      <Card key={idx} className="border-none shadow-sm bg-muted/20 dark:bg-muted/10 p-8 rounded-xl">
                        <div className="flex items-center gap-3 mb-10">
                          <UserSearch className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                          <h3 className="text-2xl font-black text-foreground tracking-tight uppercase">Data Ditemukan!</h3>
                        </div>
                        
                        <div className="grid gap-y-6 max-w-4xl">
                          {[
                            { label: "NOMOR KK", value: res.noKK },
                            { label: "NIK", value: res.nik },
                            { label: "NO", value: res.nomor },
                            { label: "TAHUN PENGAJUAN", value: res.tahunPengajuan },
                            { label: "NAMA", value: res.nama },
                            { label: "STATUS", value: res.status },
                            { label: "STATUS LPJ", value: res.statusLpj },
                            { label: "NOMINAL", value: res.nominal },
                            { label: "USAHA", value: res.usaha },
                            { label: "ALAMAT", value: res.alamat },
                            { label: "KELURAHAN", value: res.kelurahan },
                          ].map((item, i) => (
                            <div key={i} className="grid grid-cols-1 md:grid-cols-[250px_1fr] items-start gap-2 md:gap-8">
                              <span className="text-sm font-black text-foreground/80 uppercase leading-relaxed">
                                {item.label}
                              </span>
                              <span className="text-sm font-medium text-foreground uppercase leading-relaxed">
                                {item.value || "-"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <Alert className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100 rounded-2xl p-6">
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    <AlertTitle className="text-xl font-black mb-2 uppercase">DATA TIDAK TERDAFTAR</AlertTitle>
                    <AlertDescription className="font-medium">
                      Mohon maaf, nomor <strong>{inputValue}</strong> tidak ditemukan dalam database master.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800 flex gap-4">
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-2 h-fit rounded-lg">
                      <Info className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Saran Tindakan:</p>
                      <ul className="text-xs text-amber-800 dark:text-amber-400 space-y-1 list-disc pl-4">
                        <li>Pastikan angka yang dimasukkan sudah benar (16 Digit).</li>
                        <li>Pastikan pencarian sesuai dengan jenis identitas (NIK/KK).</li>
                        <li>Hubungi Administrator jika yakin data seharusnya sudah terdaftar.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full h-11 rounded-xl" 
                onClick={() => {
                  setSearchDone(false);
                  setInputValue("");
                  setResults([]);
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
