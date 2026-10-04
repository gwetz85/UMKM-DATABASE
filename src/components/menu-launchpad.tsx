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
import { Building2, ArrowRight, ChevronRight, Sparkles, Layers } from "lucide-react"

interface MenuLaunchpadProps {
  onSelect?: () => void
  className?: string
}

export function MenuLaunchpad({ onSelect, className }: MenuLaunchpadProps) {
  const { navigation, userProfile } = useNavigation()
  const router = useRouter()
  const { playSound } = useSoundEffect()
  const database = useDatabase()
  const [selectedItem, setSelectedItem] = React.useState<any | null>(null)

  // Fetch dynamic system config
  const systemConfigRef = database ? ref(database, 'settings/system_config') : null
  const { data: systemConfig } = useObject(systemConfigRef)

  const handleNavigate = (href: string) => {
    playSound('click')
    router.push(href)
    if (onSelect) onSelect()
    setSelectedItem(null)
  }

  return (
    <div className={cn("w-full max-w-none p-0 animate-in fade-in zoom-in-95 duration-300 flex flex-col", className)}>
      {/* Modern Frosted Glass Canvas Container */}
      <div className="relative bg-white/75 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/70 dark:border-white/10 rounded-[28px] sm:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-[0_16px_45px_-10px_rgba(15,23,42,0.06)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] space-y-5 overflow-hidden">
        
        {/* Subtle Ambient Background Mesh for Glass Effect */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/70 dark:border-white/10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/25 text-primary text-[10.5px] font-black uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span>Pusat Navigasi Sistem SIMPU</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Sistem Navigasi Modul
            </h2>
            <p className="text-slate-600 dark:text-slate-300 font-semibold text-xs sm:text-sm">
              Pilih modul kerja untuk mengakses database, alur verifikasi dinas, atau statistik.
            </p>
          </div>
          {userProfile && (
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <span className="text-[11px] font-black text-primary bg-primary/10 dark:bg-primary/20 border border-primary/25 px-3.5 py-1.5 rounded-2xl uppercase tracking-wider shadow-xs backdrop-blur-md">
                Role: {userProfile.role || 'Staff'}
              </span>
            </div>
          )}
        </div>

        {/* Modules Grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 pb-1">
          {navigation.map((item: any, index: number) => {
            const itemColor = item.color || '#2563eb'
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
                  borderColor: `${itemColor}40`,
                }}
                className={cn(
                  "group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-[22px] transition-all duration-300 ease-out overflow-hidden border cursor-pointer active:scale-95 animate-in fade-in slide-in-from-bottom-2 aspect-square",
                  "bg-white/65 dark:bg-slate-900/65 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-800/85 hover:-translate-y-1.5 shadow-[0_6px_22px_-2px_rgba(15,23,42,0.05)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.3)] hover:shadow-2xl"
                )}
              >
                {/* Top Accent Gradient Pill */}
                <div 
                  className="absolute top-0 left-3 right-3 h-1.5 rounded-b-full transition-all duration-300 group-hover:h-2 z-10 shadow-xs"
                  style={{ 
                    background: `linear-gradient(90deg, ${itemColor}, ${itemColor}ee, ${itemColor})` 
                  }} 
                />

                {/* Subtle Refractive Glass Tint Overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-50 group-hover:opacity-90"
                  style={{ 
                    background: `linear-gradient(145deg, transparent 30%, ${itemColor}12 75%, ${itemColor}22 100%)` 
                  }}
                />

                {/* Ambient Soft Glow Orb */}
                <div 
                  className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl transition-all duration-700 pointer-events-none opacity-20 group-hover:opacity-45 group-hover:scale-150"
                  style={{ backgroundColor: itemColor }} 
                />

                {/* Large Decorative Watermark Icon (Bottom-Right) */}
                <div 
                  className="absolute -bottom-2 -right-2 pointer-events-none transition-all duration-500 ease-out opacity-[0.07] dark:opacity-[0.14] group-hover:opacity-[0.22] group-hover:scale-125 group-hover:-rotate-12"
                  style={{ color: itemColor }}
                >
                  <item.icon className="w-20 h-20 sm:w-24 sm:h-24 stroke-[1.5]" />
                </div>

                {/* Top Bar: Icon with theme color, Badges on right */}
                <div className="relative z-10 flex items-start justify-between w-full pt-1">
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

                  {/* Badges */}
                  <div className="flex flex-col items-end gap-1">
                    {item.badge !== undefined && (
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-500 text-white rounded-full shadow-md animate-pulse">
                        <span className="w-1.5 h-1.5 bg-white rounded-full" />
                        <span className="text-[9.5px] font-black uppercase tracking-wider">{item.badge}</span>
                      </div>
                    )}

                    {item.items && item.items.length > 0 && (
                      <div 
                        className="flex items-center gap-1 text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-xs backdrop-blur-md"
                        style={{ 
                          backgroundColor: `${itemColor}18`,
                          borderColor: `${itemColor}40`,
                          color: itemColor
                        }}
                      >
                        <ChevronRight className="w-3 h-3" />
                        <span>Sub-Menu</span>
                      </div>
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

                {/* Action Footer */}
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
      </div>

      {/* Sub-Menu Dialog (Glassmorphism Modal) */}
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
