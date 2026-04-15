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

    const q = searchTerm.toLowerCase().trim()
    const matches: any[] = []

    // Search in Business Actors
    if (allActors) {
      allActors.filter((a: any) => 
        (a.fullName || "").toLowerCase().includes(q) ||
        (a.nik || "").includes(q) ||
        (a.businessName || "").toLowerCase().includes(q)
      ).forEach(a => matches.push({ ...a, _sourceType: 'Registration' }))
    }

    // Search in Master Data
    if (allMaster) {
      allMaster.filter((m: any) => 
        (m.nama || "").toLowerCase().includes(q) ||
        (m.nik || "").includes(q) ||
        (m.fullName || "").toLowerCase().includes(q)
      ).forEach(m => matches.push({ ...m, _sourceType: 'Master (Accepted)' }))
    }

    // Search in Blacklist Data
    if (allBlacklist) {
      allBlacklist.filter((b: any) => 
        (b.nama || "").toLowerCase().includes(q) ||
        (b.nik || "").includes(q) ||
        (b.fullName || "").toLowerCase().includes(q)
      ).forEach(b => matches.push({ ...b, _sourceType: 'Blacklist (Rejected)' }))
    }

    // Deduplicate by NIK if possible, but keeping multiple records for same NIK if they are from different sources is better
    return matches
  }, [searchTerm, allActors, allMaster, allBlacklist, isLoading])

  return (
    <Dialog open={!!searchTerm} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0 border-none shadow-2xl rounded-3xl">
        <div className="bg-primary p-6 text-white sticky top-0 z-10">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-white">
                  Detail Data Pencarian
                </DialogTitle>
                <DialogDescription className="text-white/70 font-bold text-[10px] uppercase tracking-widest mt-0.5">
                  Menampilkan hasil untuk: "{searchTerm}"
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6">
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
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
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
                    <CardContent className="p-5">
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
                            <h4 className="font-black text-slate-800 uppercase text-lg leading-tight">
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
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-tight">Data Tidak Ditemukan</h3>
                <p className="text-xs font-bold text-slate-400 uppercase max-w-[280px] leading-relaxed">
                  Tidak ditemukan record data yang cocok dengan kriteria "{searchTerm}" di server pendaftaran, master, maupun blacklist.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-6 flex justify-center border-t border-slate-100 mt-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center italic">
            &copy; {new Date().getFullYear()} SIMPU - Sistem Informasi Manajemen Pelaku Usaha
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
