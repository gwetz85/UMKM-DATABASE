"use client"

import { useState } from "react"
import { useUser, useDatabase, useMemoFirebase, useObject } from "@/firebase"
import { ref } from "firebase/database"
import { ShieldAlert, Eye, FileText, User, Database, SearchCheck, UserSearch, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { BusinessActor } from "@/app/lib/types"
import { formatCurrency } from "@/lib/utils"

interface CheckDataIndicatorProps {
  actor: BusinessActor;
  data2023?: any[] | null;
  data2024?: any[] | null;
  data2025?: any[] | null;
  dataBlacklist?: any[] | null;
  showText?: boolean;
}

export function CheckDataIndicator({ actor, data2023, data2024, data2025, dataBlacklist, showText = true }: CheckDataIndicatorProps) {
  const { user } = useUser()
  const database = useDatabase()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])

  const { data: adminRole } = useObject(adminRef)
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

  if (!isAdmin) return null

  const checkMatches = (data: any[] | null, label: string) => 
    (data || []).filter((m: any) => (m.noKK && m.noKK === actor.noKK) || (m.nik && m.nik === actor.nik))
      .map(m => ({ ...m, source: label }));

  const matches2023 = checkMatches(data2023, 'Sheet 2 (2023 - 1m)');
  const matches2024 = checkMatches(data2024, 'Sheet 1 (2024 - 10m)');
  const matches2025 = checkMatches(data2025, 'Sheet 3 (2025 - HOLD)');
  const matchesBlacklist = checkMatches(dataBlacklist, 'Sheet 4 (Blacklist - REJECT)');

  const combinedMatches = [...matchesBlacklist, ...matches2023, ...matches2024, ...matches2025]
  const hasBlacklistMatch = matchesBlacklist.length > 0
  const hasMatch = combinedMatches.length > 0

  if (!hasMatch) return null

  const indicatorColor = hasBlacklistMatch 
    ? "bg-red-100 text-red-800 border-red-300 hover:bg-red-200" 
    : matches2025.length > 0
    ? "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200"
    : "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
  
  const Icon = hasBlacklistMatch ? ShieldAlert : ShieldAlert
  const labelText = hasBlacklistMatch ? "BLACKLIST DETECTED" : "CheckData Found"

  return (
    <>
      <div 
        onClick={(e) => {
          e.stopPropagation()
          setIsDialogOpen(true)
        }}
        className={`mt-1.5 inline-flex items-center gap-1 ${indicatorColor} border px-2 py-0.5 rounded cursor-pointer transition-colors shadow-sm w-max group`}
      >
        <Icon className={`w-3 h-3 ${hasBlacklistMatch ? "text-red-600" : "text-yellow-600"} group-hover:scale-110 transition-transform`} />
        {showText && (
          <span className="text-[10px] font-black uppercase tracking-wider">{labelText} ({combinedMatches.length})</span>
        )}
        <Eye className="w-3 h-3 ml-1 opacity-70" />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`max-w-3xl max-h-[90vh] overflow-y-auto ${hasBlacklistMatch ? "bg-rose-50/50" : "bg-slate-50/50"} border-none shadow-2xl rounded-2xl`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 uppercase flex items-center gap-2">
              <ShieldAlert className={`w-6 h-6 ${hasBlacklistMatch ? "text-red-600" : "text-amber-600"}`} /> 
              {hasBlacklistMatch ? "PERINGATAN: DATA BLACKLIST DITEMUKAN" : "Data Master Pengecekkan"}
            </DialogTitle>
            <DialogDescription className="text-slate-800 font-medium">
              Sistem mendeteksi NIK/KK ini memiliki {combinedMatches.length} riwayat pada database pembanding:
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6 py-2">
            {combinedMatches.map((data: any, idx: number) => {
              const itemIsBlacklist = data.source.includes('Blacklist');
              const itemIs2025 = data.source.includes('2025');
              
              const borderCol = itemIsBlacklist ? "border-red-200" : (itemIs2025 ? "border-blue-200" : "border-amber-200");
              const bgBadge = itemIsBlacklist ? "bg-red-600" : (itemIs2025 ? "bg-blue-600" : "bg-amber-500");

              return (
                <div key={idx} className={`relative grid gap-4 p-5 bg-white rounded-xl shadow-sm border ${borderCol} mt-2`}>
                  <div className={`absolute -top-3 left-4 ${bgBadge} text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase shadow-sm flex items-center gap-1.5`}>
                    {itemIsBlacklist ? <Info className="w-3 h-3"/> : <Database className="w-3 h-3"/>}
                    {data.source}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                    <div className="space-y-1 border-b pb-2 md:border-b-0 md:pb-0">
                      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5"><User className="w-3 h-3"/> Nama Lengkap (Data Cek)</p>
                      <p className={`text-sm font-bold uppercase ${itemIsBlacklist ? "text-red-700" : "text-slate-800"}`}>{data.nama || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5"><FileText className="w-3 h-3"/> No. KK / NIK</p>
                      <p className="text-sm font-bold text-slate-800 font-mono">{data.noKK || "-"} <span className="opacity-40">/</span> {data.nik || "-"}</p>
                    </div>
                    <div className="space-y-1 border-b pb-2 md:border-b-0 md:pb-0">
                      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5"><SearchCheck className="w-3 h-3"/> Nomor (ID Program)</p>
                      <p className="text-sm font-bold text-slate-800">{data.nomor || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5"><Database className="w-3 h-3"/> Sektor Usaha</p>
                      <p className="text-sm font-bold text-slate-800 uppercase">{data.usaha || "-"}</p>
                    </div>
                    <div className="space-y-1 md:col-span-2 border-t pt-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">📍 Alamat & Kelurahan</p>
                      <p className="text-xs font-bold text-slate-800 uppercase">{data.alamat || "-"} <span className="text-primary px-1 font-black"> / </span> {data.kelurahan || "-"}</p>
                    </div>
                    <div className="space-y-1 border-t pt-2 md:col-span-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Tahun</p>
                          <p className="text-xs font-bold">{data.tahunPengajuan || "-"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Status</p>
                          <p className={`text-xs font-bold ${itemIsBlacklist ? "text-red-600" : "text-primary"}`}>{data.status || "-"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Status LPJ</p>
                          <p className="text-[11px] font-bold text-amber-600">{data.statusLpj || "-"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Nominal</p>
                          <p className="text-xs font-bold text-emerald-600">{formatCurrency(data.nominal)}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Kecamatan</p>
                          <p className="text-xs font-bold">{data.kecamatan || "-"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Koordinator</p>
                          <p className="text-xs font-bold">{data.coordinator || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="pt-4">
            <Button className="w-full font-bold h-12 bg-slate-900 hover:bg-slate-800 text-white" onClick={() => setIsDialogOpen(false)}>
              TUTUP DATA PEMBANDING
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                    <div className="space-y-1 border-b pb-2 md:border-b-0 md:pb-0">
                      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5"><User className="w-3 h-3"/> Nama Lengkap (Data Cek)</p>
                      <p className={`text-sm font-bold uppercase ${itemIsBlacklist ? "text-red-700" : "text-slate-800"}`}>{data.nama || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5"><FileText className="w-3 h-3"/> No. KK / NIK</p>
                      <p className="text-sm font-bold text-slate-800 font-mono">{data.noKK || "-"} <span className="opacity-40">/</span> {data.nik || "-"}</p>
                    </div>
                    <div className="space-y-1 border-b pb-2 md:border-b-0 md:pb-0">
                      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5"><SearchCheck className="w-3 h-3"/> Nomor (ID Program)</p>
                      <p className="text-sm font-bold text-slate-800">{data.nomor || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5"><Database className="w-3 h-3"/> Sektor Usaha</p>
                      <p className="text-sm font-bold text-slate-800 uppercase">{data.usaha || "-"}</p>
                    </div>
                    <div className="space-y-1 md:col-span-2 border-t pt-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">📍 Alamat & Kelurahan</p>
                      <p className="text-xs font-bold text-slate-800 uppercase">{data.alamat || "-"} <span className="text-primary px-1 font-black"> / </span> {data.kelurahan || "-"}</p>
                    </div>
                    <div className="space-y-1 border-t pt-2 md:col-span-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Tahun</p>
                          <p className="text-xs font-bold">{data.tahunPengajuan || "-"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Status</p>
                          <p className={`text-xs font-bold ${itemIsBlacklist ? "text-red-600" : "text-primary"}`}>{data.status || "-"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Status LPJ</p>
                          <p className="text-[11px] font-bold text-amber-600">{data.statusLpj || "-"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Nominal</p>
                          <p className="text-xs font-bold text-emerald-600">{formatCurrency(data.nominal)}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Kecamatan</p>
                          <p className="text-xs font-bold">{data.kecamatan || "-"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Koordinator</p>
                          <p className="text-xs font-bold">{data.coordinator || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="pt-4">
            <Button className="w-full font-bold h-12 bg-slate-900 hover:bg-slate-800 text-white" onClick={() => setIsDialogOpen(false)}>
              TUTUP DATA PEMBANDING
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
