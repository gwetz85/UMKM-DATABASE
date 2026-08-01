import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, Building2, MapPin, TrendingUp, TrendingDown, RefreshCw } from "lucide-react"
import MonitoringMap from "./monitoring-map"
import { useMemo } from "react"

export interface KelurahanStat {
  name: string
  count: number
}

const KELURAHAN_LIST = [
  "Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat",
  "Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru",
  "Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana",
  "Air Raja", "Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"
]

export function MonitoringDialog({ 
  open, 
  onOpenChange, 
  systemStats,
  isLoading
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  systemStats: any,
  isLoading?: boolean
}) {
  
  const { totalData, totalLaki, totalPerempuan, detailedStatus, top5, bottom5, kelurahanStats } = useMemo(() => {
    let td = 0
    let tl = 0
    let tp = 0
    let ds = { survey: 0, verifikasi: 0, lpj: 0, selesai: 0 }
    let kStats: KelurahanStat[] = []
    
    if (systemStats) {
      td = systemStats.status?.verified || 0
      tl = systemStats.verifiedGender?.['Laki-laki'] || systemStats.verifiedGender?.laki || 0
      tp = systemStats.verifiedGender?.['Perempuan'] || systemStats.verifiedGender?.perempuan || 0
      if (systemStats.detailedStatus) {
        ds = systemStats.detailedStatus
      }
      
      const kelMap = systemStats.kelurahan || {}
      kStats = KELURAHAN_LIST.map(k => {
        // match case-insensitively
        const foundKey = Object.keys(kelMap).find(key => key.toLowerCase() === k.toLowerCase())
        return {
          name: k,
          count: foundKey ? kelMap[foundKey] : 0
        }
      })
    } else {
      kStats = KELURAHAN_LIST.map(k => ({ name: k, count: 0 }))
    }

    const sorted = [...kStats].sort((a, b) => b.count - a.count)
    const t5 = sorted.slice(0, 5)
    // Bottom 5 (can include 0s)
    const b5 = [...sorted].reverse().slice(0, 5)

    return {
      totalData: td,
      totalLaki: tl,
      totalPerempuan: tp,
      detailedStatus: ds,
      kelurahanStats: kStats,
      top5: t5,
      bottom5: b5
    }
  }, [systemStats])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-4 md:p-6 bg-slate-50 overflow-hidden">
        <DialogHeader className="mb-4 shrink-0">
          <DialogTitle className="text-2xl font-black text-primary uppercase flex items-center gap-3">
            <MapPin className="w-6 h-6" /> MONITORING PEMETAAN PELAKU USAHA
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-10 h-10 animate-spin mb-4 text-primary" />
            <p className="font-bold animate-pulse">Memuat Data Statistik...</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
            {/* KIRI - PETA & KPI */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* KPI ROW */}
              <div className="grid grid-cols-3 gap-3 md:gap-4 shrink-0">
                <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-primary relative overflow-hidden group">
                  <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Total Data</p>
                  <p className="text-xl md:text-3xl font-black text-primary mt-1">{totalData}</p>
                  <Building2 className="absolute -right-2 -bottom-2 w-12 h-12 text-primary/10 group-hover:scale-110 transition-transform" />
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-pink-500 relative overflow-hidden group">
                  <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Perempuan</p>
                  <p className="text-xl md:text-3xl font-black text-pink-600 mt-1">{totalPerempuan}</p>
                  <Users className="absolute -right-2 -bottom-2 w-12 h-12 text-pink-500/10 group-hover:scale-110 transition-transform" />
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-blue-500 relative overflow-hidden group">
                  <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Laki-Laki</p>
                  <p className="text-xl md:text-3xl font-black text-blue-600 mt-1">{totalLaki}</p>
                  <Users className="absolute -right-2 -bottom-2 w-12 h-12 text-blue-500/10 group-hover:scale-110 transition-transform" />
                </div>
              </div>

              {/* MAP */}
              <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden relative z-0">
                <MonitoringMap data={kelurahanStats} />
              </div>
            </div>

            {/* KANAN - STATUS TABLE & LEADERBOARD */}
            <div className="w-full lg:w-[360px] flex flex-col gap-4 shrink-0 overflow-y-auto pr-2">
              
              {/* TABLE STATUS DETAIL */}
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col shrink-0">
                <div className="bg-indigo-50 border-b border-indigo-100 p-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-black text-indigo-800 uppercase">Status Data (Terverifikasi)</h3>
                </div>
                <div className="p-0">
                  <table className="w-full text-left border-collapse text-sm">
                    <tbody>
                      <tr className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-600 text-xs">Survey Dinas</td>
                        <td className="p-3 text-right font-black text-slate-800">{detailedStatus.survey}</td>
                      </tr>
                      <tr className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-600 text-xs">Verifikasi Dinas</td>
                        <td className="p-3 text-right font-black text-slate-800">{detailedStatus.verifikasi}</td>
                      </tr>
                      <tr className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-600 text-xs">LPJ</td>
                        <td className="p-3 text-right font-black text-slate-800">{detailedStatus.lpj}</td>
                      </tr>
                      <tr className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-600 text-xs">Selesai</td>
                        <td className="p-3 text-right font-black text-emerald-600">{detailedStatus.selesai}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex-1 flex flex-col min-h-[200px]">
                <div className="bg-emerald-50 border-b border-emerald-100 p-3 flex items-center gap-2 shrink-0">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black text-emerald-800 uppercase">Top 5 Kelurahan Terbanyak</h3>
                </div>
                <div className="p-0 overflow-y-auto flex-1">
                  {top5.map((k, i) => (
                    <div key={k.name} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-slate-300 w-4">{i + 1}</span>
                        <span className="text-xs font-bold text-slate-700 uppercase">{k.name}</span>
                      </div>
                      <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{k.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="bg-rose-50 border-b border-rose-100 p-3 flex items-center gap-2 shrink-0">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  <h3 className="text-xs font-black text-rose-800 uppercase">Bottom 5 Kelurahan Paling Sedikit</h3>
                </div>
                <div className="p-0 overflow-y-auto flex-1">
                  {bottom5.map((k, i) => (
                    <div key={k.name} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-slate-300 w-4">{i + 1}</span>
                        <span className="text-xs font-bold text-slate-700 uppercase">{k.name}</span>
                      </div>
                      <span className="text-xs font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{k.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
