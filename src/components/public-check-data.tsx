import React, { useState, useMemo } from "react"
import { useDatabase, useList, useMemoFirebase } from "@/firebase"
import { ref } from "firebase/database"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchCheck, Loader2, CheckCircle2, XCircle, User, Eye, FileText, Database, Info } from "lucide-react"
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

  const masterDataRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'master_data')
  }, [database])
  const { data: allMasterData, isLoading: isMasterLoading } = useList(masterDataRef)

  const blacklistDataRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'blacklist_data')
  }, [database])
  const { data: allBlacklistData, isLoading: isBlacklistLoading } = useList(blacklistDataRef)

  const isSearchLoading = isMasterLoading || isBlacklistLoading

  const realTimeResults = useMemo(() => {
    if (!searchQuery) return null
    
    const master = allMasterData || []
    const blacklist = allBlacklistData || []
    
    const combinedData = [
      ...master.map(m => ({ ...m, _source: 'DATA PEMBANDING' })),
      ...blacklist.map(m => ({ ...m, _source: 'DATA CANCELL / BLACKLIST' }))
    ]

    const val = String(searchQuery).trim()
    return combinedData.filter((m: any) => 
      (m.nik && String(m.nik).trim() === val) || 
      (m.noKK && String(m.noKK).trim() === val) 
    )
  }, [allMasterData, allBlacklistData, searchQuery])

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    setSearchDone(false)
    setSearchQuery(inputValue.trim())
    setSearchDone(true)
  }

  // Effect to log search activity when results are ready
  useEffect(() => {
    if (searchDone && !isSearchLoading && searchQuery) {
      const resultStatus = realTimeResults && realTimeResults.length > 0 
        ? `Ditemukan ${realTimeResults.length} data` 
        : "Tidak ditemukan"

      logActivity({
        query: searchQuery,
        results: resultStatus,
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        userId: user?.uid || 'Public'
      })
    }
  }, [searchDone, isSearchLoading, searchQuery, realTimeResults, user?.uid])

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border mb-6">
        <h3 className="font-black text-primary uppercase text-center mb-4 text-lg">Cek Data Pelaku Usaha</h3>
        <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3">
          <Input 
            placeholder="Ketik NIK atau Nomor KK..." 
            className="flex-1 h-12 bg-white font-mono tracking-wider text-center sm:text-left"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            required
            maxLength={16}
          />
          <Button type="submit" className="h-12 font-bold px-8 shadow-md hover:bg-primary/90" disabled={isSearchLoading}>
             {isSearchLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <SearchCheck className="w-5 h-5 mr-2" />}
             CARI
          </Button>
        </form>
      </div>

      {isSearchLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-primary font-bold animate-pulse uppercase text-sm">Menghubungkan ke Database...</p>
        </div>
      )}

      {searchDone && !isSearchLoading && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           {realTimeResults && realTimeResults.length > 0 ? (
             <div className="space-y-4">
               <Alert className="bg-emerald-50/90 border-emerald-200 text-emerald-900 rounded-xl">
                 <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                 <AlertTitle className="font-black uppercase">DATA DITEMUKAN</AlertTitle>
                 <AlertDescription className="font-medium text-xs">
                   Ditemukan <strong>{realTimeResults.length}</strong> tiket pendaftaran untuk nomor tersebut.
                 </AlertDescription>
               </Alert>
               
               <div className="grid gap-4">
                 {realTimeResults.map((res, idx) => (
                   <div key={idx} className="bg-white border rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                      <div className={cn("absolute top-0 left-0 w-1 h-full", res._source === 'DATA CANCELL / BLACKLIST' ? "bg-red-500" : "bg-emerald-500")} />
                      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                         <div>
                           <div className="flex flex-wrap items-center gap-2 mb-2">
                             <span className={cn(
                               "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border",
                               res._source === 'DATA CANCELL / BLACKLIST' ? "bg-red-50 text-red-600 border-red-200" : "bg-primary/10 text-primary border-primary/20"
                             )}>
                               {res._source === 'DATA CANCELL / BLACKLIST' ? "BLACKLIST / DITOLAK" : "TERDAFTAR"}
                             </span>
                             <span className={cn(
                               "text-[10px] font-bold px-2 py-0.5 rounded uppercase border",
                               res.status?.toLowerCase().includes("finish") ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                             )}>
                               {(res.status || "PENDING").replace(/_/g, " ")}
                             </span>
                           </div>
                           <h4 className="font-black text-slate-800 uppercase text-lg">{res.nama}</h4>
                           <div className="text-xs font-mono font-bold text-slate-500 mt-1">NIK: {res.nik}</div>
                         </div>
                         <div className="text-left sm:text-right mt-2 sm:mt-0">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Usaha</div>
                           <div className="font-black text-primary uppercase text-sm">{res.usaha || "-"}</div>
                         </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Kategori</div>
                          <div className="text-xs font-bold uppercase">{res.kategori || "-"}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Tahun</div>
                          <div className="text-xs font-bold uppercase">{res.tahunPengajuan || "-"}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Kelurahan</div>
                          <div className="text-xs font-bold uppercase">{res.kelurahan || "-"}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Nominal</div>
                          <div className="text-xs font-bold uppercase">{formatCurrency(res.nominal)}</div>
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
                 Nomor NIK/KK <strong>{searchQuery}</strong> tidak terdaftar dalam database master kami.
               </AlertDescription>
             </Alert>
           )}
        </div>
      )}
    </div>
  )
}
