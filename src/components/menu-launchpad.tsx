"use client"

import React from "react"
import { useNavigation } from "@/hooks/use-navigation"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { useObject, useDatabase } from "@/firebase"
import { ref } from "firebase/database"

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog"
import { 
  Building2, 
  ArrowRight, 
  ChevronRight, 
  Sparkles, 
  Layers, 
  Search, 
  X, 
  ShieldCheck, 
  Activity, 
  Compass, 
  LayoutGrid, 
  CheckCircle2, 
  User,
  SlidersHorizontal,
  Flame
} from "lucide-react"

interface MenuLaunchpadProps {
  onSelect?: () => void
  className?: string
}

const getInitials = (name?: string) => {
  if (!name) return "UM"
  const clean = name.trim().split(/\s+/)
  if (clean.length === 1) return clean[0].substring(0, 2).toUpperCase()
  return (clean[0][0] + clean[1][0]).toUpperCase()
}

const getModuleCategory = (item: any): string => {
  const href = (item.href || '').toLowerCase()
  const name = (item.name || '').toLowerCase()
  if (
    href.includes('verifikasi') || 
    href.includes('hasil-verifikasi') || 
    href.includes('rekening') || 
    href.includes('finish') || 
    href.includes('portal-survey') || 
    name.includes('verifikasi') || 
    name.includes('survey')
  ) {
    return 'Alur Verifikasi'
  }
  if (
    href.includes('input') || 
    href.includes('actor') || 
    href.includes('check') || 
    href.includes('cek') || 
    href.includes('rejected') || 
    href.includes('daftar') || 
    name.includes('input') || 
    name.includes('data')
  ) {
    return 'Data Pelaku Usaha'
  }
  if (
    href.includes('dashboard') || 
    href.includes('rekapan') || 
    href.includes('gbas') || 
    href.includes('layar') || 
    href.includes('cetak') || 
    name.includes('dashboard') || 
    name.includes('rekapan')
  ) {
    return 'Laporan & Statistik'
  }
  return 'Sistem & Pengaturan'
}

export function MenuLaunchpad({ onSelect, className }: MenuLaunchpadProps) {
  const { navigation, userProfile } = useNavigation()
  const router = useRouter()
  const { playSound } = useSoundEffect()
  const database = useDatabase()
  
  const [selectedItem, setSelectedItem] = React.useState<any | null>(null)
  const [selectedCategory, setSelectedCategory] = React.useState<string>("Semua")
  const [searchQuery, setSearchQuery] = React.useState<string>("")

  // Fetch dynamic system config
  const systemConfigRef = database ? ref(database, 'settings/system_config') : null
  const { data: systemConfig } = useObject(systemConfigRef)

  const handleNavigate = (href: string) => {
    playSound('click')
    router.push(href)
    if (onSelect) onSelect()
    setSelectedItem(null)
  }

  // Categories list & counts
  const categories = ["Semua", "Alur Verifikasi", "Data Pelaku Usaha", "Laporan & Statistik", "Sistem & Pengaturan"]

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { "Semua": navigation.length }
    navigation.forEach((item: any) => {
      const cat = getModuleCategory(item)
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [navigation])

  // Filtered navigation list
  const filteredItems = React.useMemo(() => {
    return navigation.filter((item: any) => {
      const cat = getModuleCategory(item)
      const matchesCategory = selectedCategory === "Semua" || cat === selectedCategory
      const query = searchQuery.toLowerCase().trim()
      const matchesSearch = !query || 
        item.name.toLowerCase().includes(query) || 
        (item.description && item.description.toLowerCase().includes(query)) ||
        cat.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [navigation, selectedCategory, searchQuery])

  const userName = userProfile?.name || 'Administrator'
  const userInitials = getInitials(userName)
  const userRole = userProfile?.role || 'Staff'

  return (
    <div className={cn("w-full max-w-none p-0 animate-in fade-in zoom-in-95 duration-300 flex flex-col space-y-5", className)}>
      {/* ─── GROWLY-INSPIRED BENTO HERO BANNER ─── */}
      <div className="relative bg-white/80 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 shadow-[0_12px_40px_-10px_rgba(15,23,42,0.06)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Subtle Ambient Mesh Gradients */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-500/15 dark:bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-indigo-500/15 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-teal-400/10 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: User Identity & System Overview */}
          <div className="flex items-start sm:items-center gap-4">
            {/* Growly Avatar with Gradient Ring */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#005e61] via-[#008f8c] to-[#00C48C] p-[2.5px] shadow-lg shadow-teal-700/25">
                <div className="w-full h-full rounded-[14px] bg-white dark:bg-slate-900 flex items-center justify-center">
                  <span className="font-black text-base sm:text-lg text-primary tracking-tight font-headline">
                    {userInitials}
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </div>
            </div>

            {/* Greetings & Subtitle */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-[10.5px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 animate-pulse" />
                  <span>SIMPU KOTA TANJUNGPINANG</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[10.5px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Role: {userRole}</span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Selamat Datang, {userName.split(' ')[0]} 👋
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Pusat Kendali Data & Sistem Navigasi Terpadu Dinas Tenaga Kerja, Koperasi dan Usaha Mikro.
              </p>
            </div>
          </div>

          {/* Right: Growly Quick-KPI Bento Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
            {/* KPI 1 */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>Modul Aktif</span>
                <LayoutGrid className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                {navigation.length} <span className="text-[10px] font-bold text-slate-500">Menu</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300">
                <span>Alur Dinas</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-teal-800 dark:text-teal-200 mt-1">
                4 <span className="text-[10px] font-bold text-teal-600">Tahapan</span>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="col-span-2 sm:col-span-1 p-3 sm:p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                <span>Cloud Sync</span>
                <Activity className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              </div>
              <div className="text-lg sm:text-xl font-black text-indigo-800 dark:text-indigo-200 mt-1">
                Live <span className="text-[10px] font-bold text-indigo-600">Realtime</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── GROWLY LMS FILTER BAR & QUICK SEARCH ─── */}
      <div className="relative bg-white/80 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-[24px] sm:rounded-[28px] p-3.5 sm:p-4 shadow-[0_8px_30px_rgb(15,23,42,0.04)] dark:shadow-none flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills (Tabs) */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat
            const count = categoryCounts[cat] || 0
            if (cat !== "Semua" && count === 0) return null

            return (
              <button
                key={cat}
                onClick={() => {
                  playSound('click')
                  setSelectedCategory(cat)
                }}
                className={cn(
                  "px-3.5 py-2 rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all duration-200 shrink-0 flex items-center gap-2 active:scale-95",
                  isActive
                    ? "bg-[#005e61] text-white shadow-md shadow-[#005e61]/25 border border-[#005e61]"
                    : "bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/70 dark:border-white/10 shadow-2xs"
                )}
              >
                <span>{cat}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[9.5px] font-mono font-black",
                  isActive 
                    ? "bg-white/25 text-white" 
                    : "bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300"
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Quick Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari modul atau menu..."
            className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/40 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── MODULES BENTO GRID (GROWLY LMS STYLE) ─── */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-white/60 dark:border-white/10">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-black uppercase text-slate-700 dark:text-slate-200">Modul Tidak Ditemukan</h3>
          <p className="text-xs font-semibold text-slate-500 mt-1">Coba gunakan kata kunci lain atau pilih tab kategori &quot;Semua&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 sm:gap-4 pb-2">
          {filteredItems.map((item: any, index: number) => {
            const itemColor = item.color || '#2563eb'
            const moduleCategory = getModuleCategory(item)

            return (
              <div
                key={item.name}
                onClick={() => {
                  if (item.items && item.items.length > 0) {
                    playSound('click')
                    setSelectedItem(item)
                  } else {
                    handleNavigate(item.href)
                  }
                }}
                style={{ 
                  animationDelay: `${index * 25}ms`,
                  borderColor: `${itemColor}45`,
                }}
                className={cn(
                  "group relative flex flex-col justify-between p-4 rounded-[26px] transition-all duration-300 ease-out overflow-hidden border cursor-pointer active:scale-95 animate-in fade-in slide-in-from-bottom-2 aspect-square",
                  "bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl hover:bg-white/95 dark:hover:bg-slate-800/90 hover:-translate-y-1.5 shadow-[0_8px_25px_-4px_rgba(15,23,42,0.05)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.3)] hover:shadow-2xl"
                )}
              >
                {/* Top Accent Gradient Bar */}
                <div 
                  className="absolute top-0 left-4 right-4 h-1.5 rounded-b-full transition-all duration-300 group-hover:h-2 z-10 shadow-xs"
                  style={{ 
                    background: `linear-gradient(90deg, ${itemColor}, ${itemColor}dd, ${itemColor})` 
                  }} 
                />

                {/* Subtle Refractive Glass Tint Overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-40 group-hover:opacity-85"
                  style={{ 
                    background: `linear-gradient(145deg, transparent 35%, ${itemColor}10 75%, ${itemColor}20 100%)` 
                  }}
                />

                {/* Ambient Soft Glow Orb */}
                <div 
                  className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl transition-all duration-700 pointer-events-none opacity-20 group-hover:opacity-50 group-hover:scale-150"
                  style={{ backgroundColor: itemColor }} 
                />

                {/* Large Decorative Watermark Icon (Bottom-Right) */}
                <div 
                  className="absolute -bottom-2 -right-2 pointer-events-none transition-all duration-500 ease-out opacity-[0.06] dark:opacity-[0.12] group-hover:opacity-[0.20] group-hover:scale-125 group-hover:-rotate-12"
                  style={{ color: itemColor }}
                >
                  <item.icon className="w-20 h-20 sm:w-24 sm:h-24 stroke-[1.5]" />
                </div>

                {/* Top Bar: Icon in Squircle Box, Badges on right */}
                <div className="relative z-10 flex items-start justify-between w-full pt-1">
                  {/* Growly Squircle Icon Box */}
                  <div 
                    className="p-2.5 sm:p-3 rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-md flex items-center justify-center shrink-0 border border-white/60 dark:border-white/10 backdrop-blur-md"
                    style={{ 
                      backgroundColor: itemColor, 
                      color: '#ffffff',
                      boxShadow: `0 8px 18px -4px ${itemColor}60`
                    }}
                  >
                    <item.icon className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
                  </div>

                  {/* Badges / Category Micro Pill */}
                  <div className="flex flex-col items-end gap-1">
                    {item.badge !== undefined ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-500 text-white rounded-full shadow-md animate-pulse">
                        <span className="w-1.5 h-1.5 bg-white rounded-full" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider">{item.badge}</span>
                      </div>
                    ) : item.items && item.items.length > 0 ? (
                      <div 
                        className="flex items-center gap-1 text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs backdrop-blur-md"
                        style={{ 
                          backgroundColor: `${itemColor}15`,
                          borderColor: `${itemColor}35`,
                          color: itemColor
                        }}
                      >
                        <ChevronRight className="w-2.5 h-2.5" />
                        <span>Sub-Menu</span>
                      </div>
                    ) : (
                      <span 
                        className="text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border opacity-75 group-hover:opacity-100 transition-opacity"
                        style={{
                          backgroundColor: `${itemColor}10`,
                          borderColor: `${itemColor}25`,
                          color: itemColor
                        }}
                      >
                        {moduleCategory.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Description Section */}
                <div className="relative z-10 flex flex-col justify-center my-auto space-y-1 py-1">
                  <div className="flex items-start gap-1.5">
                    <span 
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0 transition-transform duration-300 group-hover:scale-150 shadow-xs" 
                      style={{ backgroundColor: itemColor }} 
                    />
                    <div className="text-[13px] sm:text-[14px] font-black text-slate-900 dark:text-white leading-snug uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                      {item.name}
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-[11px] sm:text-[11.5px] font-semibold text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed pl-3.5">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Growly Action Footer */}
                <div 
                  className="relative z-10 pt-2 border-t flex items-center justify-between text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider"
                  style={{ borderColor: `${itemColor}25` }}
                >
                  <span 
                    className="transition-colors font-extrabold tracking-wider"
                    style={{ color: itemColor }}
                  >
                    {item.items && item.items.length > 0 ? "Pilih Opsi" : "Buka Modul"}
                  </span>
                  <div 
                    className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 shadow-xs"
                    style={{ 
                      backgroundColor: itemColor,
                      color: '#ffffff',
                      boxShadow: `0 4px 12px -2px ${itemColor}50`
                    }}
                  >
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── GROWLY SUB-MENU DIALOG ─── */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-2xl rounded-[32px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Top Indicator Strip */}
          <div 
            className="h-2.5 w-full"
            style={{ 
              background: `linear-gradient(90deg, ${selectedItem?.color || 'var(--primary)'}, ${(selectedItem?.color || '#2563eb')}99)` 
            }}
          />
          
          <div className="p-6 sm:p-8 pb-4">
            <DialogHeader className="mb-2">
              <div className="flex items-center gap-4">
                <div 
                  className="p-3.5 sm:p-4 rounded-2xl shadow-lg border border-white/40 dark:border-white/10 backdrop-blur-md" 
                  style={{ 
                    backgroundColor: selectedItem?.color || '#2563eb', 
                    color: '#ffffff',
                    boxShadow: `0 10px 25px -4px ${(selectedItem?.color || '#2563eb')}50`
                  }}
                >
                  {selectedItem && <selectedItem.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
                </div>
                <div className="flex flex-col text-left">
                  <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    {selectedItem?.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mt-1">
                    Pilih sub-menu untuk melanjutkan
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-6 sm:px-8 pb-6 overflow-y-auto custom-scrollbar flex-1">
            <div className={cn(
              "grid gap-3",
              selectedItem?.items?.length > 6 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
            )}>
              {selectedItem?.items?.map((sub: any, idx: number) => {
                const itemColor = selectedItem?.color || '#2563eb'
                return (
                  <button
                    key={sub.name}
                    onClick={() => handleNavigate(sub.href)}
                    style={{ 
                      animationDelay: `${idx * 30}ms`,
                      borderColor: `${itemColor}45`,
                      boxShadow: `0 4px 16px -2px ${itemColor}15`
                    }}
                    className="group relative flex items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl transition-all duration-300 border overflow-hidden hover:bg-white/95 dark:hover:bg-slate-800/90 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 animate-in fade-in"
                  >
                    {/* Gradient wash overlay */}
                    <div 
                      className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-30 group-hover:opacity-70"
                      style={{ 
                        background: `linear-gradient(135deg, transparent 40%, ${itemColor}18 100%)` 
                      }}
                    />

                    {/* Watermark Icon */}
                    <div 
                      className="absolute -bottom-2 -right-2 pointer-events-none transition-all duration-500 ease-out opacity-[0.06] dark:opacity-[0.14] group-hover:opacity-[0.20] group-hover:scale-125 group-hover:-rotate-6"
                      style={{ color: itemColor }}
                    >
                      <Building2 className="w-16 h-16 stroke-[1.5]" />
                    </div>

                    <div className="relative z-10 flex items-center gap-3.5 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm shrink-0 border border-white/50"
                        style={{ 
                          backgroundColor: itemColor, 
                          color: '#ffffff',
                          boxShadow: `0 4px 12px -2px ${itemColor}40`
                        }}
                      >
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-extrabold uppercase tracking-tight text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-primary transition-colors text-left truncate">
                        {sub.name}
                      </span>
                    </div>

                    <div 
                      className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 shadow-xs shrink-0"
                      style={{ 
                        backgroundColor: `${itemColor}20`,
                        color: itemColor
                      }}
                    >
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </button>
                )
              })}
            </div>

            <button 
              onClick={() => setSelectedItem(null)}
              className="w-full mt-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all border-t border-slate-200/60 dark:border-white/10"
            >
              Tutup Menu
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
