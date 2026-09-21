"use client"

import React from "react"
import { useNavigation } from "@/hooks/use-navigation"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { TrendingUp } from "lucide-react"
import { useObject, useDatabase } from "@/firebase"
import { ref } from "firebase/database"

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Building2, ArrowRight, ChevronRight, Sparkles } from "lucide-react"

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
    <div className={cn("w-full max-w-none p-0 animate-in fade-in zoom-in duration-300 flex flex-col", className)}>
      {/* Modern Frosted Canvas Container */}
      <div className="bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl border border-white/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 lg:p-6 shadow-xl shadow-slate-300/30 dark:shadow-none space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-primary" />
              Pusat Navigasi Sistem SIMPU
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Sistem Navigasi Modul
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">
              Pilih modul kerja untuk mengakses database, alur verifikasi dinas, atau statistik.
            </p>
          </div>
          {userProfile && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-xl uppercase tracking-wider shadow-sm">
                Role: {userProfile.role || 'Staff'}
              </span>
            </div>
          )}
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 pb-1">
          {navigation.map((item: any, index: number) => (
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
                animationDelay: `${index * 20}ms`,
                borderColor: `${item.color}50`,
                boxShadow: `0 4px 18px -2px ${item.color}20`
              }}
              className={cn(
                "group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl transition-all duration-300 ease-out overflow-hidden border-2 cursor-pointer active:scale-95 animate-in fade-in slide-in-from-bottom-2",
                "bg-white dark:bg-slate-900 hover:-translate-y-1.5 hover:shadow-xl aspect-square"
              )}
            >
              {/* Top Accent Gradient Stripe */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 group-hover:h-2 z-10"
                style={{ 
                  background: `linear-gradient(90deg, ${item.color}, ${item.color}dd, ${item.color})` 
                }} 
              />

              {/* Colorful Gradient Wash Overlay */}
              <div 
                className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-60 group-hover:opacity-100"
                style={{ 
                  background: `linear-gradient(145deg, transparent 35%, ${item.color}15 80%, ${item.color}25 100%)` 
                }}
              />

              {/* Ambient Soft Glow Orb */}
              <div 
                className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl transition-all duration-700 pointer-events-none opacity-25 group-hover:opacity-50 group-hover:scale-150"
                style={{ backgroundColor: item.color }} 
              />

              {/* Large Decorative Watermark Icon (Bottom-Right) */}
              <div 
                className="absolute -bottom-2.5 -right-2.5 pointer-events-none transition-all duration-500 ease-out opacity-[0.08] dark:opacity-[0.14] group-hover:opacity-[0.24] group-hover:scale-125 group-hover:-rotate-12"
                style={{ color: item.color }}
              >
                <item.icon className="w-20 h-20 sm:w-24 sm:h-24 stroke-[1.5]" />
              </div>

              {/* Top Bar: Icon with theme color, Badges on right */}
              <div className="relative z-10 flex items-start justify-between w-full pt-0.5">
                <div 
                  className="p-2 sm:p-2.5 rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-md flex items-center justify-center shrink-0"
                  style={{ 
                    backgroundColor: item.color, 
                    color: '#ffffff',
                    boxShadow: `0 8px 16px -4px ${item.color}60`
                  }}
                >
                  <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>

                {/* Badges */}
                <div className="flex flex-col items-end gap-1">
                  {item.badge !== undefined && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-500 text-white rounded-full shadow-sm animate-pulse">
                      <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      <span className="text-[9px] font-black uppercase tracking-wider">{item.badge}</span>
                    </div>
                  )}

                  {item.items && item.items.length > 0 && (
                    <div 
                      className="flex items-center gap-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-xs"
                      style={{ 
                        backgroundColor: `${item.color}15`,
                        borderColor: `${item.color}35`,
                        color: item.color
                      }}
                    >
                      <ChevronRight className="w-2.5 h-2.5" />
                      <span>Sub-Menu</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Description Section */}
              <div className="relative z-10 flex flex-col justify-center my-auto space-y-1 py-1">
                <div className="flex items-start gap-1.5">
                  <span 
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 transition-transform duration-300 group-hover:scale-150" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <div className="text-xs sm:text-[13px] font-black text-slate-900 dark:text-white leading-snug uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                    {item.name}
                  </div>
                </div>
                {item.description && (
                  <p className="text-[10px] sm:text-[10.5px] font-medium text-slate-500 dark:text-slate-300 line-clamp-2 leading-relaxed pl-3">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Action Footer */}
              <div 
                className="relative z-10 pt-2 border-t flex items-center justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-wider"
                style={{ borderColor: `${item.color}25` }}
              >
                <span 
                  className="transition-colors font-bold"
                  style={{ color: item.color }}
                >
                  {item.items && item.items.length > 0 ? "Pilih Opsi" : "Buka Modul"}
                </span>
                <div 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 shadow-xs"
                  style={{ 
                    backgroundColor: item.color,
                    color: '#ffffff',
                    boxShadow: `0 4px 10px -2px ${item.color}50`
                  }}
                >
                  <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-Menu Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <div 
            className="h-2 w-full"
            style={{ backgroundColor: selectedItem?.color || 'var(--primary)' }}
          />
          
          <div className="p-6 sm:p-8 pb-4">
            <DialogHeader className="mb-2">
              <div className="flex items-center gap-3.5">
                <div 
                  className="p-3 sm:p-3.5 rounded-2xl shadow-lg" 
                  style={{ backgroundColor: selectedItem?.color, color: '#ffffff' }}
                >
                  {selectedItem && <selectedItem.icon className="w-6 h-6 text-white" />}
                </div>
                <div className="flex flex-col text-left">
                  <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    {selectedItem?.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-widest mt-0.5">
                    Pilih sub-menu untuk melanjutkan
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-6 sm:px-8 pb-6 overflow-y-auto custom-scrollbar flex-1">
            <div className={cn(
              "grid gap-2.5 sm:gap-3",
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
                      boxShadow: `0 4px 14px -2px ${itemColor}18`
                    }}
                    className="group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 transition-all duration-300 border-2 overflow-hidden hover:-translate-y-0.5 hover:shadow-lg active:scale-95 animate-in fade-in"
                  >
                    {/* Gradient wash overlay */}
                    <div 
                      className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-40 group-hover:opacity-80"
                      style={{ 
                        background: `linear-gradient(135deg, transparent 40%, ${itemColor}18 100%)` 
                      }}
                    />

                    {/* Watermark Icon */}
                    <div 
                      className="absolute -bottom-2 -right-2 pointer-events-none transition-all duration-500 ease-out opacity-[0.08] dark:opacity-[0.14] group-hover:opacity-[0.22] group-hover:scale-125 group-hover:-rotate-6"
                      style={{ color: itemColor }}
                    >
                      <Building2 className="w-16 h-16 stroke-[1.5]" />
                    </div>

                    <div className="relative z-10 flex items-center gap-3 min-w-0">
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm shrink-0"
                        style={{ 
                          backgroundColor: itemColor,
                          color: '#ffffff'
                        }}
                      >
                        <Building2 className="w-4.5 h-4.5 text-white" />
                      </div>
                      <span className="font-black uppercase tracking-tight text-xs sm:text-sm text-slate-800 dark:text-white group-hover:text-primary transition-colors text-left truncate">
                        {sub.name}
                      </span>
                    </div>

                    <div 
                      className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 shadow-xs shrink-0"
                      style={{ 
                        backgroundColor: `${itemColor}20`,
                        color: itemColor
                      }}
                    >
                      <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  </button>
                )
              })}
            </div>

            <button 
              onClick={() => setSelectedItem(null)}
              className="w-full mt-6 py-2.5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors border-t border-slate-100 dark:border-slate-800"
            >
              Tutup Menu
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
