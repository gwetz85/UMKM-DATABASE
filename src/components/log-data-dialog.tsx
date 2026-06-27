import React, { useMemo } from "react"
import { useDatabase, useList, useMemoFirebase } from "@/firebase"
import { ref } from "firebase/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, User, MapPin, Building2, CreditCard, History, AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"

interface LogDataDialogProps {
  query: string | null
  onClose: () => void
}

export function LogDataDialog({ query: searchTerm, onClose }: LogDataDialogProps) {
  const database = useDatabase()

  const actorsRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, "businessActors")
  }, [database])
  const { data: allActors, isLoading: isActorsLoading } = useList(actorsRef)

  const masterRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, "master_data")
  }, [database])
  const { data: allMaster, isLoading: isMasterLoading } = useList(masterRef)

  const blacklistRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, "blacklist_data")
  }, [database])
  const { data: allBlacklist, isLoading: isBlacklistLoading } = useList(blacklistRef)

  const isLoading = isActorsLoading || isMasterLoading || isBlacklistLoading

  const results = useMemo(() => {
    if (!searchTerm || isLoading) return []

    const q = searchTerm.trim()
    const qLower = q.toLowerCase()
    const matches: any[] = []

    const matchesQuery = (item: any) => {
      // Check NIK with exact match (String conversion for numeric NIK values)
      if (item.nik && String(item.nik).trim() === q) return true
      // Check NoKK with exact match
      if (item.noKK && String(item.noKK).trim() === q) return true
      // Check name fields with partial match (case-insensitive)
      if (item.fullName && String(item.fullName).toLowerCase().includes(qLower)) return true
      if (item.nama && String(item.nama).toLowerCase().includes(qLower)) return true
      if (item.businessName && String(item.businessName).toLowerCase().includes(qLower)) return true
      if (item.usaha && String(item.usaha).toLowerCase().includes(qLower)) return true
      return false
    }

    // Search in Business Actors
    if (allActors) {
      allActors.filter(matchesQuery).forEach(a => matches.push({ ...a, _sourceType: 'Registration' }))
    }

    // Search in Master Data
    if (allMaster) {
      allMaster.filter(matchesQuery).forEach(m => matches.push({ ...m, _sourceType: 'Master (Accepted)' }))
    }

    // Search in Blacklist Data
    if (allBlacklist) {
      allBlacklist.filter(matchesQuery).forEach(b => matches.push({ ...b, _sourceType: 'Blacklist (Rejected)' }))
    }

    return matches
  }, [searchTerm, allActors, allMaster, allBlacklist, isLoading])

  return (
    <Dialog open={!!searchTerm} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0 border-none shadow-2xl rounded-3xl">
        <div className="bg-primary p-4 sm:p-6 text-white sticky top-0 z-10">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-2.5 sm:p-3 rounded-2xl backdrop-blur-md">
                <Search className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                  Detail Data Pencarian
                </DialogTitle>
                <DialogDescription className="text-white/70 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest mt-0.5">
                  Menampilkan hasil untuk: "{searchTerm}"
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-primary font-black uppercase text-xs tracking-widest animate-pulse">
                Mencari data di semua server...
              </p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Ditemukan {results.length} record data
                </span>
              </div>
              <div className="grid gap-4">
                {results.map((res, idx) => (
                  <Card key={idx} className="overflow-hidden border-none bg-slate-50/50 hover:bg-slate-100 transition-colors shadow-sm relative group">
                    <div className={cn(
                      "absolute top-0 left-0 w-1.5 h-full",
                      res._sourceType?.includes('Registration') ? "bg-emerald-500" :
                      res._sourceType?.includes('Master') ? "bg-blue-500" : "bg-red-500"
                    )} />
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                             <Badge className={cn(
                               "text-[9px] font-black uppercase px-2 py-0",
                               res._sourceType?.includes('Registration') ? "bg-emerald-500 text-white" :
                               res._sourceType?.includes('Master') ? "bg-blue-500 text-white" : "bg-red-500 text-white"
                             )}>
                               {res._sourceType}
                             </Badge>
                             {res.status && (
                               <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0 border-primary/20 text-primary">
                                 Status: {(res.status || "UNKNOWN").replace('_', ' ')}
                               </Badge>
                             )}
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="font-black text-slate-800 uppercase text-base sm:text-lg leading-tight">
                              {res.fullName || res.nama || "TANPA NAMA"}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5" />
                                NIK: <span className="text-slate-700 font-mono tracking-wider">{res.nik || "-"}</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                KK: <span className="text-slate-700 font-mono tracking-wider">{res.noKK || "-"}</span>
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/50">
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <Building2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Usaha / Bisnis</p>
                                  <p className="text-xs font-bold text-slate-700 uppercase">{res.businessName || res.usaha || "-"}</p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wilayah / Alamat</p>
                                  <p className="text-xs font-bold text-slate-700 uppercase truncate">
                                    {res.kelurahan || "-"}, {res.kecamatan || "-"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-start md:items-end justify-between gap-3 text-right">
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nominal / Tahun</p>
                            <p className="text-sm font-black text-primary">{formatCurrency(res.nominal || 0)}</p>
                            <p className="text-[10px] font-bold text-slate-500">{res.tahunPengajuan || res.tahun || "-"}</p>
                          </div>
                          
                          {res.statusLpj && (
                            <Badge variant="secondary" className="text-[9px] font-black uppercase">
                              LPJ: {res.statusLpj}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                <XCircle className="w-8 h-8 text-slate-300" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-slate-400 uppercase tracking-tight">Data Tidak Ditemukan</h3>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase max-w-[280px] leading-relaxed mx-auto">
                  Tidak ditemukan record data yang cocok dengan kriteria "{searchTerm}" di server pendaftaran, master, maupun blacklist.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 sm:p-6 flex justify-center border-t border-slate-100 mt-auto">
          <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center italic">
            &copy; {new Date().getFullYear()} SIMPU - Sistem Informasi Manajemen Pelaku Usaha
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
