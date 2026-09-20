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
    <div className={cn("w-full max-w-7xl mx-auto p-2 sm:p-4 md:p-6 animate-in fade-in zoom-in duration-500 flex flex-col", className)}>
      {/* Modern Frosted Canvas Container */}
      <div className="bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl border border-white/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl shadow-slate-300/40 dark:shadow-none space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] md:text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Pusat Navigasi Sistem SIMPU
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Sistem Navigasi Modul
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">
              Pilih modul kerja untuk mengakses database, alur verifikasi dinas, atau statistik.
            </p>
          </div>
          {userProfile && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] font-black text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-sm">
                Role: {userProfile.role || 'Staff'}
              </span>
            </div>
          )}
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-4 pb-2">
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
              style={{ animationDelay: `${index * 25}ms` }}
              className={cn(
                "group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl md:rounded-3xl transition-all duration-300 ease-out overflow-hidden shadow-sm hover:shadow-xl border border-slate-200/90 dark:border-slate-800 cursor-pointer active:scale-95 animate-in fade-in slide-in-from-bottom-2",
                "bg-white/95 dark:bg-slate-900/95 hover:-translate-y-1.5",
                "min-h-[140px] sm:min-h-[150px] md:min-h-[160px]"
              )}
            >
              {/* Top Accent Stripe */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 group-hover:h-2"
                style={{ backgroundColor: item.color }} 
              />

              {/* Top Bar: Icon with theme color, Badges on right */}
              <div className="relative z-10 flex items-start justify-between w-full pt-1">
                <div 
                  className="p-2 sm:p-2.5 rounded-xl md:rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: item.color, color: '#ffffff' }}
                >
                  <item.icon className="w-5 h-5 md:w-5.5 md:h-5.5 text-white" />
                </div>

                {/* Badges */}
                <div className="flex flex-col items-end gap-1">
                  {item.badge !== undefined && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-500 text-white rounded-full shadow-sm animate-pulse">
                      <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider">{item.badge}</span>
                    </div>
                  )}

                  {item.items && item.items.length > 0 && (
                    <div className="flex items-center gap-0.5 text-[8px] md:text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      <ChevronRight className="w-2.5 h-2.5" />
                      <span>Sub-Menu</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Description Section */}
              <div className="relative z-10 flex flex-col justify-end mt-3 space-y-0.5">
                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                  {item.name}
                </div>
                {item.description && (
                  <p className="text-[10px] md:text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Subtle Hover Action Footer */}
              <div className="relative z-10 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-2">
                <span>{item.items && item.items.length > 0 ? "Pilih Opsi" : "Buka Modul"}</span>
                <ArrowRight className="w-3 h-3 text-primary group-hover:translate-x-1 transition-transform" />
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
                  <DialogDescription className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
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
              {selectedItem?.items?.map((sub: any, idx: number) => (
                <button
                  key={sub.name}
                  onClick={() => handleNavigate(sub.href)}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-primary text-slate-700 dark:text-slate-200 hover:text-white transition-all duration-300 border border-slate-200/80 dark:border-slate-700/80 hover:border-primary shadow-sm hover:shadow-xl hover:-translate-y-0.5 active:scale-95 animate-in fade-in"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center group-hover:bg-white/20 transition-colors shadow-sm shrink-0">
                      <Building2 className="w-4 h-4 text-primary group-hover:text-white" />
                    </div>
                    <span className="font-black uppercase tracking-tight text-xs sm:text-sm text-left truncate">{sub.name}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all shrink-0" />
                </button>
              ))}
            </div>

            <button 
              onClick={() => setSelectedItem(null)}
              className="w-full mt-6 py-2.5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 hover:text-primary transition-colors border-t border-slate-100 dark:border-slate-800"
            >
              Tutup Menu
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
