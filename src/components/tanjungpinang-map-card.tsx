"use client"

import React, { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { 
  MapPin, 
  Maximize2, 
  ChevronDown, 
  Loader2, 
  Building2, 
  BadgeCheck, 
  TrendingUp, 
  Search, 
  X,
  Compass,
  ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { KelurahanMapData } from "./tanjungpinang-map-inner"

// Dynamic import with SSR disabled to ensure Leaflet works smoothly in Next.js
const DynamicTanjungpinangMap = dynamic(
  () => import("./tanjungpinang-map-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[240px] bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-3 animate-pulse">
        <div className="w-9 h-9 rounded-full border-3 border-sky-500/20 border-t-sky-500 animate-spin" />
        <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Memuat Peta Tanjungpinang...
        </span>
      </div>
    )
  }
)

interface TanjungpinangMapCardProps {
  kelurahanStats: KelurahanMapData[]
  totalUmkm: number
  totalVerified: number
  selesaiCount?: number
  isLoading?: boolean
  onSelectKelurahan?: (kelurahanName: string) => void
  className?: string
}

export function TanjungpinangMapCard({
  kelurahanStats,
  totalUmkm,
  totalVerified,
  selesaiCount = 0,
  isLoading = false,
  onSelectKelurahan,
  className
}: TanjungpinangMapCardProps) {
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const [selectedKelurahan, setSelectedKelurahan] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Top kelurahan with highest UMKM count
  const topKelurahan = useMemo(() => {
    if (!kelurahanStats || kelurahanStats.length === 0) return null
    return [...kelurahanStats].sort((a, b) => b.count - a.count)[0]
  }, [kelurahanStats])

  // Filtered list for the modal sidebar
  const filteredKelurahan = useMemo(() => {
    if (!kelurahanStats) return []
    if (!searchQuery.trim()) return kelurahanStats
    const q = searchQuery.toLowerCase()
    return kelurahanStats.filter(k => k.name.toLowerCase().includes(q))
  }, [kelurahanStats, searchQuery])

  const maxCount = useMemo(() => {
    if (!kelurahanStats || kelurahanStats.length === 0) return 1
    return Math.max(...kelurahanStats.map(k => k.count), 1)
  }, [kelurahanStats])

  return (
    <>
      <div 
        className={cn(
          "rounded-[28px] bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-all duration-300 relative group overflow-hidden",
          className
        )}
      >
        {/* Subtle Ambient Aura */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-sky-400/10 dark:bg-sky-500/10 blur-2xl pointer-events-none" />

        {/* ─── CARD HEADER ─── */}
        <div className="flex items-center justify-between pb-3 shrink-0 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight">
                  Peta Sebaran UMKM
                </h3>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Kota Tanjungpinang • 18 Kelurahan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Kelurahan Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedKelurahan || ""}
                onChange={(e) => setSelectedKelurahan(e.target.value || null)}
                className="appearance-none bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold pl-2.5 pr-6 py-1 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors max-w-[130px] truncate focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Semua Kelurahan</option>
                {kelurahanStats.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name} ({item.count})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Maximize to Modal Button */}
            <button
              type="button"
              onClick={() => setIsFullscreenOpen(true)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              title="Perbesar Peta Interaktif"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ─── INTERACTIVE MAP CONTAINER ─── */}
        <div className="relative flex-1 min-h-[220px] sm:min-h-[240px] my-2 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700/70 shadow-inner">
          <DynamicTanjungpinangMap
            data={kelurahanStats}
            totalUmkm={totalUmkm}
            selectedKelurahan={selectedKelurahan}
            onSelectKelurahan={onSelectKelurahan}
            className="w-full h-full min-h-[220px]"
          />
        </div>

        {/* ─── 3 KPI METRICS AT BOTTOM (Matches Dashboard Aesthetic) ─── */}
        <div className="grid grid-cols-3 gap-2 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-center shrink-0">
          <div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              {isLoading ? "..." : totalUmkm.toLocaleString("id-ID")}
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Total UMKM
            </div>
          </div>

          <div>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {isLoading ? "..." : totalVerified.toLocaleString("id-ID")}
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Terverifikasi
            </div>
          </div>

          <div>
            <div className="text-base sm:text-lg font-black text-sky-600 dark:text-sky-400 leading-tight">
              {isLoading ? "..." : selesaiCount.toLocaleString("id-ID")}
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Rekening Selesai
            </div>
          </div>
        </div>
      </div>

      {/* ─── FULLSCREEN GIS MODAL DIALOG ─── */}
      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent className="max-w-[94vw] w-full h-[90vh] flex flex-col p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 dark:border-slate-800 overflow-hidden rounded-3xl">
          <DialogHeader className="shrink-0 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    Monitoring Pemetaan UMKM Kota Tanjungpinang
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Peta geospasial sebaran pelaku usaha berdasarkan 18 kelurahan dan 4 kecamatan. Klik pada kelurahan untuk rincian data.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 sm:gap-5">
            {/* Map Column (Left / Main) */}
            <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative">
              <DynamicTanjungpinangMap
                data={kelurahanStats}
                totalUmkm={totalUmkm}
                selectedKelurahan={selectedKelurahan}
                onSelectKelurahan={(name) => {
                  if (onSelectKelurahan) {
                    onSelectKelurahan(name)
                  }
                  setIsFullscreenOpen(false)
                }}
                className="w-full h-full min-h-[380px]"
              />
            </div>

            {/* Sidebar Column (Right: 18 Kelurahan Ranking List) */}
            <div className="w-full lg:w-80 shrink-0 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">
                    Daftar 18 Kelurahan
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                    {totalVerified} Terverifikasi
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative mt-3 mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari kelurahan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 dark:text-slate-100"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Scrollable Kelurahan List */}
                <div className="max-h-[420px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1 pt-1">
                  {filteredKelurahan.map((item, idx) => {
                    const isSelected = selectedKelurahan === item.name
                    const percentOfMax = Math.round((item.count / maxCount) * 100)

                    return (
                      <div
                        key={item.name}
                        onClick={() => setSelectedKelurahan(item.name)}
                        className={cn(
                          "p-2.5 rounded-xl cursor-pointer transition-all duration-200 relative overflow-hidden border group",
                          isSelected 
                            ? "bg-sky-50/80 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 shadow-xs" 
                            : "hover:bg-slate-50 dark:hover:bg-slate-700/50 border-slate-100 dark:border-slate-700/60"
                        )}
                      >
                        {/* Progress bar background */}
                        <div 
                          className="absolute inset-y-0 left-0 bg-sky-500/[0.06] dark:bg-sky-500/[0.12] pointer-events-none transition-all"
                          style={{ width: `${percentOfMax}%` }}
                        />

                        <div className="relative z-10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-300 shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                              {item.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                {item.count}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({item.percent}%)
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (onSelectKelurahan) {
                                  onSelectKelurahan(item.name)
                                }
                                setIsFullscreenOpen(false)
                              }}
                              className="p-1 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/60 text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 transition-colors"
                              title="Buka Data UMKM"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Bottom Quick Action */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 mt-2">
                <button
                  type="button"
                  onClick={() => setIsFullscreenOpen(false)}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-extrabold text-xs transition-colors"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
