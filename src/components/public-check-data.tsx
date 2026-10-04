import React, { useState, useMemo } from "react"
import { useDatabase, useList, useMemoFirebase } from "@/firebase"
import { ref } from "firebase/database"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchCheck, Loader2, CheckCircle2, XCircle, User, Eye, FileText, Database, Info, CreditCard, Users2, Camera } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn, formatCurrency } from "@/lib/utils"
import { logActivity, getDeviceType } from "@/lib/logger"
import { useUser } from "@/firebase"
import { useEffect } from "react"
import { KtpKkScannerDialog } from "@/components/ktp-kk-scanner-dialog"

export function PublicCheckData() {
  const { user } = useUser()
  const database = useDatabase()
  const [loading, setLoading] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchMethod, setSearchMethod] = useState<'nik' | 'kk' | 'nama'>('nik')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const performSearchWithVal = async (method: 'nik' | 'kk' | 'nama', val: string) => {
    const cleanVal = val.trim()
    if (!cleanVal) return

    setLoading(true)
    setSearchQuery(cleanVal)
    setSearchDone(false)

    try {
      const typeParam = method === 'kk' ? 'noKK' : method
      const res = await fetch(`/api/cek-data?type=${typeParam}&q=${encodeURIComponent(cleanVal)}`)
      const json = await res.json()

      const results = json.success && Array.isArray(json.results) ? json.results : []
      setSearchResults(results)
      setSearchDone(true)

      // Log search activity
      const resultStatus = results.length > 0 ? `Ditemukan ${results.length} data` : "Tidak ditemukan"
      const methodLabel = method === 'nik' ? 'NIK' : method === 'kk' ? 'Nomor KK' : 'NAMA'

      logActivity({
        query: cleanVal,
        results: resultStatus,
        device: getDeviceType(navigator.userAgent),
        method: methodLabel,
        source: 'Web',
        userId: user?.uid || 'Public'
      }, database || undefined).catch(err => console.error("Log error:", err))

    } catch (err) {
      console.error("Public search error:", err)
      setSearchResults([])
      setSearchDone(true)
    } finally {
      setLoading(false)
    }
  }

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    performSearchWithVal(searchMethod, inputValue)
  }

  const handleScanComplete = (extractedNumber: string, scanMode: "ktp" | "noKK") => {
    const targetMethod: 'nik' | 'kk' = scanMode === "ktp" ? "nik" : "kk"
    setSearchMethod(targetMethod)
    setInputValue(extractedNumber)
    performSearchWithVal(targetMethod, extractedNumber)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/75 dark:bg-slate-900/80 backdrop-blur-2xl p-5 sm:p-7 rounded-[26px] border border-white/70 dark:border-white/10 shadow-[0_12px_36px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.4)] mb-6">
        <h3 className="font-black text-primary uppercase text-center mb-6 text-xl tracking-wide">Cek Data Pelaku Usaha</h3>
        
        {/* Method Selection */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
          <button
            type="button"
            onClick={() => setSearchMethod('nik')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase transition-all duration-300 active:scale-95",
              searchMethod === 'nik' 
                ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105 ring-2 ring-primary/20" 
                : "bg-white/75 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border border-white/70 dark:border-white/10 backdrop-blur-md hover:bg-white dark:hover:bg-slate-800 shadow-xs"
            )}
          >
            <CreditCard className="w-3.5 h-3.5" />
            NIK
          </button>
          <button
            type="button"
            onClick={() => setSearchMethod('kk')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase transition-all duration-300 active:scale-95",
              searchMethod === 'kk' 
                ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105 ring-2 ring-primary/20" 
                : "bg-white/75 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border border-white/70 dark:border-white/10 backdrop-blur-md hover:bg-white dark:hover:bg-slate-800 shadow-xs"
            )}
          >
            <Database className="w-3.5 h-3.5" />
            NOMOR KK
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchMethod('nama')
              setInputValue("")
              setSearchDone(false)
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase transition-all duration-300 active:scale-95",
              searchMethod === 'nama' 
                ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105 ring-2 ring-primary/20" 
                : "bg-white/75 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border border-white/70 dark:border-white/10 backdrop-blur-md hover:bg-white dark:hover:bg-slate-800 shadow-xs"
            )}
          >
            <User className="w-3.5 h-3.5" />
            NAMA
          </button>
        </div>

        <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3">
          <Input 
            placeholder={
              searchMethod === 'nik' ? "Masukkan 16 Digit NIK..." : 
              searchMethod === 'kk' ? "Masukkan 16 Digit Nomor KK..." :
              "Masukkan Nama Lengkap..."
            }
            className={cn(
              "flex-1 h-12 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-center sm:text-left border border-slate-200/90 dark:border-slate-800 shadow-xs text-slate-900 dark:text-white",
              searchMethod !== 'nama' ? "font-mono font-black tracking-wider text-base" : "font-sans font-bold text-base"
            )}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            required
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsScannerOpen(true)}
            className="h-12 rounded-2xl border-teal-500/40 bg-teal-50/80 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-extrabold px-5 gap-2 backdrop-blur-md shadow-xs active:scale-95 transition-all"
            title="Scan NIK KTP atau Nomor KK dengan kamera"
          >
            <Camera className="w-4 h-4 text-teal-600" />
            <span>Scan KTP / KK</span>
          </Button>
          <Button type="submit" className="h-12 rounded-2xl font-black px-8 shadow-md hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all" disabled={loading}>
             {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <SearchCheck className="w-5 h-5 mr-2" />}
             CARI
          </Button>
        </form>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-primary font-black animate-pulse uppercase text-sm tracking-wider">Menghubungkan ke Database...</p>
        </div>
      )}

      {searchDone && !loading && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           {searchResults && searchResults.length > 0 ? (
             <div className="space-y-4">
               <Alert className="bg-emerald-50/90 dark:bg-emerald-950/50 backdrop-blur-xl border-emerald-200/80 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-100 rounded-2xl shadow-sm">
                 <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                 <AlertTitle className="font-black uppercase tracking-tight">DATA DITEMUKAN</AlertTitle>
                 <AlertDescription className="font-bold text-xs">
                   Ditemukan <strong>{searchResults.length}</strong> tiket pendaftaran untuk nomor tersebut.
                 </AlertDescription>
               </Alert>
               
               <div className="grid gap-4">
                 {searchResults.map((res, idx) => (
                   <div key={idx} className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border border-white/70 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-[0_6px_24px_rgba(15,23,42,0.04)] hover:shadow-lg transition-all relative overflow-hidden">
                      <div className={cn("absolute top-0 left-0 w-1.5 h-full", String(res._source || '').includes('BLACKLIST') ? "bg-red-500" : "bg-emerald-500")} />
                      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                         <div>
                           <div className="flex flex-wrap items-center gap-2 mb-2">
                             <span className={cn(
                               "text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs backdrop-blur-md",
                               String(res._source || '').includes('BLACKLIST') ? "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" : "bg-primary/10 text-primary border-primary/20"
                             )}>
                               {String(res._source || '').includes('BLACKLIST') ? "BLACKLIST / DITOLAK" : (res._source || "MASTER DATA")}
                             </span>
                             <span className={cn(
                               "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border shadow-2xs backdrop-blur-md",
                               String(res._displayStatus || res.status || '').toLowerCase().includes("finish") ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                             )}>
                               {(res._displayStatus || res.status || "TERDAFTAR").replace(/_/g, " ")}
                             </span>
                           </div>
                           <h4 className="font-black text-slate-900 dark:text-white uppercase text-lg sm:text-xl tracking-tight">{res._displayName || res.nama || res.fullName || "-"}</h4>
                           <div className="text-xs font-mono font-black text-slate-600 dark:text-slate-300 mt-1">NIK: {res._displayNik || res.nik || "-"}</div>
                         </div>
                         <div className="text-left sm:text-right mt-2 sm:mt-0">
                           <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Usaha</div>
                           <div className="font-black text-primary uppercase text-sm sm:text-base">{res._displayBusiness || res.businessName || res.usaha || "-"}</div>
                         </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200/70 dark:border-white/10">
                        <div>
                          <div className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kategori</div>
                          <div className="text-xs font-black uppercase text-slate-900 dark:text-white mt-0.5">{res.businessCategory || res.kategori || "-"}</div>
                        </div>
                        <div>
                          <div className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tahun</div>
                          <div className="text-xs font-black uppercase text-slate-900 dark:text-white mt-0.5">{res._displayYear || res.tahunPengajuan || "-"}</div>
                        </div>
                        <div>
                          <div className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kelurahan</div>
                          <div className="text-xs font-black uppercase text-slate-900 dark:text-white mt-0.5">{res._displayKelurahan || res.kelurahan || "-"}</div>
                        </div>
                        <div>
                          <div className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nominal</div>
                          <div className="text-xs font-black uppercase text-slate-900 dark:text-white mt-0.5">{formatCurrency(res._displayNominal || res.lpjNominal || res.nominal || 0)}</div>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
             </div>
           ) : (
             <Alert className="bg-red-50/90 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 rounded-xl">
               <XCircle className="w-5 h-5 text-red-600" />
               <AlertTitle className="font-black uppercase">TIDAK DITEMUKAN</AlertTitle>
               <AlertDescription className="font-medium text-xs">
                 {searchMethod === 'nik' ? 'NIK' : searchMethod === 'kk' ? 'Nomor KK' : 'Nama'} <strong>{searchQuery}</strong> tidak terdaftar dalam database master kami.
               </AlertDescription>
             </Alert>
           )}
        </div>
      )}

      {/* Dialog Scanner Kamera KTP & KK */}
      <KtpKkScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        initialMode={searchMethod === "kk" ? "noKK" : "ktp"}
        onScanComplete={handleScanComplete}
      />
    </div>
  )
}
