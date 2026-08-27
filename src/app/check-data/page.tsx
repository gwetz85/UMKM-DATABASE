"use client"

import React, { useState } from "react"
import { useDatabase, useList, useMemoFirebase, useUser, useObject } from "@/firebase"
import { ref, query, orderByChild, equalTo, startAt, endAt } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { SearchCheck, Loader2, CheckCircle2, XCircle, Info, Database, UserSearch, User, Eye, FileText, ShieldAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn, formatCurrency } from "@/lib/utils"
import { logActivity, getDeviceType } from "@/lib/logger"


export default function CheckDataPage() {
  const { user, userProfile } = useUser()
  const database = useDatabase()
  const [loading, setLoading] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const [searchType, setSearchType] = useState<"nik" | "noKK" | "nama">("nik")
  const [inputValue, setInputValue] = useState("")
  const [selectedResult, setSelectedResult] = useState<any | null>(null)
  const [searchCriteria, setSearchCriteria] = useState<{ type: string, value: string } | null>(null)


  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])

  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)
  
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isPetugas = userProfile?.role === 'petugas_survey' || userProfile?.role === 'petugas'
  const hasAccess = isAdmin || isPetugas

  const [searchResults, setSearchResults] = useState<any[]>([])

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    const processedValue = inputValue.trim()
    if (!processedValue) return
    
    setLoading(true)
    setSearchDone(false)
    setSearchCriteria({ 
      type: searchType, 
      value: processedValue 
    })

    try {
      const res = await fetch(`/api/cek-data?type=${searchType}&q=${encodeURIComponent(processedValue)}`)
      const json = await res.json()
      const results = json.success && Array.isArray(json.results) ? json.results : []
      setSearchResults(results)
      setSearchDone(true)

      // Log Search Activity
      const logResults = results.length > 0 
        ? `Ditemukan ${results.length} Data` 
        : "Data Tidak Ditemukan";
        
      logActivity({
        query: `CEK ${searchType.toUpperCase()}: ${processedValue}`,
        results: logResults,
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'CEK MASTER',
        userId: userProfile?.fullName || user?.email || "Public"
      }, database || undefined).catch(err => console.error("Log error:", err))

    } catch (err) {
      console.error("Error searching check-data:", err)
      setSearchResults([])
      setSearchDone(true)
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="p-4 md:p-8 max-w-[95rem] mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl">
            <Database className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-black text-primary font-headline">Cek Master Data & Blacklist</h1>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto font-medium">
          Validasi NIK, No KK, atau Nama terhadap Database Master UMKM dan Daftar Blacklist.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <Card className="lg:col-span-3 border-none shadow-xl h-fit bg-white/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg">Parameter Pencarian</CardTitle>
            <CardDescription>Pilih metode validasi data.</CardDescription>
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
                  <div className="flex items-center space-x-3 p-3 rounded-xl border border-muted hover:bg-muted/50 cursor-pointer transition-colors">
                    <RadioGroupItem value="nama" id="r-nama" />
                    <Label htmlFor="r-nama" className="flex-1 cursor-pointer font-bold">Berdasarkan Nama</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inputValue" className="font-bold text-foreground">
                  {searchType === "nik" ? "NIK" : searchType === "noKK" ? "Nomor KK" : "Nama Lengkap"}
                </Label>
                <Input 
                  id="inputValue" 
                  placeholder={searchType === "nik" ? "Masukkan 16 digit NIK..." : searchType === "noKK" ? "Masukkan 16 digit Nomor KK..." : "Masukkan Nama Lengkap..."} 
                  maxLength={searchType === "nama" ? 100 : 16}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className={cn(
                    "flex h-12 w-full text-lg bg-white",
                    searchType !== "nama" ? "font-mono tracking-widest" : "font-sans font-bold"
                  )}
                  required 
                />
              </div>

              <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <SearchCheck className="w-5 h-5 mr-2" />}
                Cek Database
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-9 space-y-6">
          {!searchDone && !loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] border-2 border-dashed rounded-3xl border-muted bg-white/30 backdrop-blur-sm p-8 text-center">
              <div className="bg-white/50 p-4 rounded-full mb-4">
                <Info className="w-8 h-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Siap Melakukan Validasi</h3>
              <p className="text-sm text-muted-foreground">
                Silakan pilih tipe pencarian dan masukkan data yang ingin divalidasi.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border p-8 text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-primary font-bold animate-pulse">Menghubungkan ke Database...</p>
            </div>
          )}

          {searchDone && !loading && (
            <div className="animate-in fade-in duration-500 space-y-6">
              {searchResults && searchResults.length > 0 ? (
                <div className="space-y-6">
                  <Alert className="bg-emerald-50/90 backdrop-blur-sm border-emerald-200 text-emerald-900 rounded-2xl p-6">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <AlertTitle className="text-xl font-black mb-1 uppercase">DATA DITEMUKAN!</AlertTitle>
                    <AlertDescription className="font-medium">
                      Terdapat kecocokan data pada database sistem ({searchResults.length} data ditemukan). Silakan tinjau detail di bawah.
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((res, idx) => (
                      <Card 
                        key={idx} 
                        className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm cursor-pointer group active:scale-95"
                        onClick={() => setSelectedResult(res)}
                      >
                        <CardContent className="p-6 flex items-center gap-4">
                          <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                            <User className="w-6 h-6" />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                String(res._source || '').includes('BLACKLIST') ? "text-red-600" : "text-primary"
                              )}>
                                {String(res._source || '').includes('BLACKLIST') ? "BLACKLIST / DITOLAK" : (res._source || "MASTER DATA")}
                              </span>
                              <span className={cn(
                                "text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-tighter border",
                                String(res._source || '').includes('BLACKLIST') 
                                  ? "bg-red-50 text-red-600 border-red-200"
                                  : String(res._displayStatus || res.status || '').toLowerCase().includes("terdaftar") || String(res._displayStatus || res.status || '').toLowerCase().includes("finish") 
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                                    : "bg-amber-50 text-amber-600 border-amber-200"
                              )}>
                                {String(res._source || '').includes('BLACKLIST') ? "DITOLAK" : (res._displayStatus || res.status || "TERDAFTAR")}
                              </span>
                            </div>
                            <span className="text-sm font-black text-slate-800 uppercase truncate">
                              {res._displayName || res.nama || res.fullName || "-"}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-muted-foreground mt-0.5">
                              NIK: {res._displayNik || res.nik || "-"}
                            </span>
                          </div>
                          <Eye className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <Alert className="bg-red-50/90 backdrop-blur-sm border-red-200 text-red-900 rounded-2xl p-6">
                    <XCircle className="w-6 h-6 text-red-600" />
                    <AlertTitle className="text-xl font-black mb-2 uppercase">DATA TIDAK DITEMUKAN</AlertTitle>
                    <AlertDescription className="font-medium">
                      Data yang Anda masukkan tidak terdaftar di Database Pembanding manapun maupun Blacklist.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full h-11 rounded-xl bg-white/50 backdrop-blur-sm border-primary/20 hover:bg-primary/5 text-primary font-bold" 
                onClick={() => {
                  setSearchCriteria(null);
                  setSearchDone(false);
                }}
              >
                Reset & Cari Lagi
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Pop Out Detail */}
      <Dialog open={!!selectedResult} onOpenChange={(open) => !open && setSelectedResult(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className={cn(
              "text-2xl font-black uppercase flex items-center gap-2",
              selectedResult?._source === "DATA BLACKLIST" ? "text-red-600" : "text-primary"
            )}>
              <UserSearch className="w-6 h-6" /> 
              {selectedResult?._source}
            </DialogTitle>
            <DialogDescription className="font-bold text-muted-foreground">
              {selectedResult?._source === "DATA BLACKLIST" 
                ? "Informasi Detail Data Pembatalan / Blacklist" 
                : "Informasi Detail Data Pelaku Usaha"}
            </DialogDescription>
          </DialogHeader>
          {selectedResult && (
            <div className="py-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                   { label: "Nomor", value: selectedResult.nomor || selectedResult.registrationCode, icon: FileText },
                   { label: "Nomor KK", value: selectedResult._displayKk || selectedResult.noKK, icon: FileText },
                   { label: "NIK", value: selectedResult._displayNik || selectedResult.nik, icon: FileText },
                   { label: "Nama Lengkap", value: selectedResult._displayName || selectedResult.nama || selectedResult.fullName, icon: User, full: true },
                   { label: "Usaha", value: selectedResult._displayBusiness || selectedResult.usaha || selectedResult.businessName, icon: Database, full: true },
                   { label: "Kategori Status", value: selectedResult._displayStatus || selectedResult.status, icon: Info },
                   { label: "Status LPJ", value: selectedResult.statusLpj, icon: Info },
                   { label: "Nominal", value: formatCurrency(selectedResult._displayNominal || selectedResult.nominal || selectedResult.lpjNominal || 0), icon: SearchCheck },
                   { label: "Tahun Pengajuan", value: selectedResult._displayYear || selectedResult.tahunPengajuan, icon: SearchCheck },
                   { label: "Kelurahan", value: selectedResult._displayKelurahan || selectedResult.kelurahan, icon: UserSearch },
                   { label: "Kecamatan", value: selectedResult._displayKecamatan || selectedResult.kecamatan, icon: UserSearch },
                   { label: "Koordinator", value: selectedResult.coordinator, icon: UserSearch },
                   { label: "Alamat", value: selectedResult._displayAddress || selectedResult.alamat || selectedResult.address, icon: UserSearch, full: true },
                ].map((item, i) => (
                  <div key={i} className={item.full ? "md:col-span-2 space-y-1" : "space-y-1"}>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                      {item.icon && <item.icon className="w-3 h-3" />} {item.label}
                    </div>
                    <div className="p-3 bg-muted/50 rounded-xl border border-muted text-sm font-bold text-slate-800 uppercase">
                      {item.value || "-"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="pt-4">
            <Button className="w-full font-bold h-12" onClick={() => setSelectedResult(null)}>
              Tutup Detail
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  )
}
