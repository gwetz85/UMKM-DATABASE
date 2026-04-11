"use client"

import { useState } from "react"
import { ShieldAlert, Eye, FileText, User, Database, SearchCheck, UserSearch, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { BusinessActor } from "@/app/lib/types"
import { formatCurrency } from "@/lib/utils"

interface CheckDataIndicatorProps {
  actor: BusinessActor;
  allMasterData: any[] | null;
  showText?: boolean;
}

export function CheckDataIndicator({ actor, allMasterData, showText = true }: CheckDataIndicatorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  if (!allMasterData) return null

  const matchingMasterData = allMasterData.filter((m: any) => 
    (m.noKK && m.noKK === actor.noKK) || 
    (m.nik && m.nik === actor.nik)
  )

  const hasMatch = matchingMasterData.length > 0

  if (!hasMatch) return null

  return (
    <>
      <div 
        onClick={(e) => {
          e.stopPropagation()
          setIsDialogOpen(true)
        }}
        className="mt-1.5 inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 border border-yellow-300 px-2 py-0.5 rounded cursor-pointer hover:bg-yellow-200 transition-colors shadow-sm w-max group"
      >
        <ShieldAlert className="w-3 h-3 text-yellow-600 group-hover:scale-110 transition-transform" />
        {showText && (
          <span className="text-[10px] font-bold uppercase tracking-wider">CheckData ({matchingMasterData.length})</span>
        )}
        <Eye className="w-3 h-3 ml-1 opacity-70" />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-amber-50/50 border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 uppercase flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-amber-600" /> Data Master Ditemukan
            </DialogTitle>
            <DialogDescription className="text-slate-800 font-medium">
              Sistem mendeteksi bahwa Nomor KK atau NIK pengaju ini sekurang-kurangnya memiliki {matchingMasterData.length} riwayat pada Master Data Pembanding:
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6 py-2">
            {matchingMasterData.map((data: any, idx: number) => (
              <div key={idx} className="relative grid gap-4 p-5 bg-white rounded-xl shadow-sm border border-amber-200 mt-2">
                <div className="absolute -top-3 left-4 bg-amber-500 text-white px-3 py-0.5 rounded-full text-xs font-bold uppercase shadow-sm">
                  Riwayat #{idx + 1}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                  <div className="space-y-1 border-b pb-2 md:border-b-0 md:pb-0">
                    <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5"><User className="w-3 h-3"/> Nama Lengkap (Master)</p>
                    <p className="text-sm font-bold text-slate-800 uppercase">{data.nama || "-"}</p>
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
                  <div className="space-y-1 border-t pt-2 md:col-span-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Tahun</p>
                        <p className="text-xs font-bold">{data.tahunPengajuan || "-"}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Status</p>
                        <p className="text-xs font-bold text-primary">{data.status || "-"}</p>
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
            ))}
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
