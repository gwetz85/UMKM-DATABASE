import React, { useState, useMemo } from "react"
import { useDatabase, useList, useMemoFirebase } from "@/firebase"
import { ref } from "firebase/database"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchCheck, Loader2, CheckCircle2, XCircle, User, Eye, FileText, Database, Info, CreditCard, Users2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn, formatCurrency } from "@/lib/utils"
import { logActivity, getDeviceType } from "@/lib/logger"
import { useUser } from "@/firebase"
import { useEffect } from "react"

export function PublicCheckData() {
  const { user } = useUser()
  const database = useDatabase()
  const [loading, setLoading] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchMethod, setSearchMethod] = useState<'nik' | 'kk' | 'nama'>('nik')
  const [searchResults, setSearchResults] = useState<any[]>([])

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanVal = inputValue.trim()
    if (!cleanVal) return

    setLoading(true)
    setSearchQuery(cleanVal)
    setSearchDone(false)

    try {
      const typeParam = searchMethod === 'kk' ? 'noKK' : searchMethod
      const res = await fetch(`/api/cek-data?type=${typeParam}&q=${encodeURIComponent(cleanVal)}`)
      const json = await res.json()

      const results = json.success && Array.isArray(json.results) ? json.results : []
      setSearchResults(results)
      setSearchDone(true)

      // Log search activity
      const resultStatus = results.length > 0 ? `Ditemukan ${results.length} data` : "Tidak ditemukan"
      const methodLabel = searchMethod === 'nik' ? 'NIK' : searchMethod === 'kk' ? 'Nomor KK' : 'NAMA'

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

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border mb-6">
        <h3 className="font-black text-primary uppercase text-center mb-6 text-lg tracking-wider">Cek Data Pelaku Usaha</h3>
        
        {/* Method Selection */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setSearchMethod('nik')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all duration-300",
              searchMethod === 'nik' ? "bg-primary text-white shadow-lg scale-105" : "bg-white text-slate-400 border hover:bg-slate-100"
            )}
          >
            <CreditCard className="w-3.5 h-3.5" />
            NIK
          </button>
          <button
            type="button"
            onClick={() => setSearchMethod('kk')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all duration-300",
              searchMethod === 'kk' ? "bg-primary text-white shadow-lg scale-105" : "bg-white text-slate-400 border hover:bg-slate-100"
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
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all duration-300",
              searchMethod === 'nama' ? "bg-primary text-white shadow-lg scale-105" : "bg-white text-slate-400 border hover:bg-slate-100"
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
              "flex-1 h-12 bg-white text-center sm:text-left shadow-inner",
              searchMethod !== 'nama' ? "font-mono tracking-wider" : "font-sans font-bold"
            )}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            required
          />
          <Button type="submit" className="h-12 font-bold px-8 shadow-md hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all" disabled={loading}>
             {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <SearchCheck className="w-5 h-5 mr-2" />}
             CARI
          </Button>
        </form>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-primary font-bold animate-pulse uppercase text-sm">Menghubungkan ke Database...</p>
        </div>
      )}

      {searchDone && !loading && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           {searchResults && searchResults.length > 0 ? (
             <div className="space-y-4">
               <Alert className="bg-emerald-50/90 border-emerald-200 text-emerald-900 rounded-xl">
                 <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                 <AlertTitle className="font-black uppercase">DATA DITEMUKAN</AlertTitle>
                 <AlertDescription className="font-medium text-xs">
                   Ditemukan <strong>{searchResults.length}</strong> tiket pendaftaran untuk nomor tersebut.
                 </AlertDescription>
               </Alert>
               
               <div className="grid gap-4">
                 {searchResults.map((res, idx) => (
                   <div key={idx} className="bg-white border rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                      <div className={cn("absolute top-0 left-0 w-1 h-full", String(res._source || '').includes('BLACKLIST') ? "bg-red-500" : "bg-emerald-500")} />
                      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                         <div>
                           <div className="flex flex-wrap items-center gap-2 mb-2">
                             <span className={cn(
                               "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border",
                               String(res._source || '').includes('BLACKLIST') ? "bg-red-50 text-red-600 border-red-200" : "bg-primary/10 text-primary border-primary/20"
                             )}>
                               {String(res._source || '').includes('BLACKLIST') ? "BLACKLIST / DITOLAK" : (res._source || "MASTER DATA")}
                             </span>
                             <span className={cn(
                               "text-[10px] font-bold px-2 py-0.5 rounded uppercase border",
                               String(res._displayStatus || res.status || '').toLowerCase().includes("finish") ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                             )}>
                               {(res._displayStatus || res.status || "TERDAFTAR").replace(/_/g, " ")}
                             </span>
                           </div>
                           <h4 className="font-black text-slate-800 uppercase text-lg">{res._displayName || res.nama || res.fullName || "-"}</h4>
                           <div className="text-xs font-mono font-bold text-slate-500 mt-1">NIK: {res._displayNik || res.nik || "-"}</div>
                         </div>
                         <div className="text-left sm:text-right mt-2 sm:mt-0">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Usaha</div>
                           <div className="font-black text-primary uppercase text-sm">{res._displayBusiness || res.businessName || res.usaha || "-"}</div>
                         </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Kategori</div>
                          <div className="text-xs font-bold uppercase">{res.businessCategory || res.kategori || "-"}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Tahun</div>
                          <div className="text-xs font-bold uppercase">{res._displayYear || res.tahunPengajuan || "-"}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Kelurahan</div>
                          <div className="text-xs font-bold uppercase">{res._displayKelurahan || res.kelurahan || "-"}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Nominal</div>
                          <div className="text-xs font-bold uppercase">{formatCurrency(res._displayNominal || res.lpjNominal || res.nominal || 0)}</div>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
             </div>
           ) : (
             <Alert className="bg-red-50/90 border-red-200 text-red-900 rounded-xl">
               <XCircle className="w-5 h-5 text-red-600" />
               <AlertTitle className="font-black uppercase">TIDAK DITEMUKAN</AlertTitle>
               <AlertDescription className="font-medium text-xs">
                 {searchMethod === 'nik' ? 'NIK' : searchMethod === 'kk' ? 'Nomor KK' : 'Nama'} <strong>{searchQuery}</strong> tidak terdaftar dalam database master kami.
               </AlertDescription>
             </Alert>
           )}
        </div>
      )}
    </div>
  )
}
