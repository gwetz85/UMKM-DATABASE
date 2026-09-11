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
import { Building2, ArrowRight, ChevronRight } from "lucide-react"

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
    <div className={cn("w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-8 animate-in fade-in zoom-in duration-500 flex flex-col", className)}>
      <div className="flex flex-col mb-4 md:mb-6 space-y-1.5 md:space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">
            Sistem Navigasi
          </h2>
          {userProfile && (
            <span className="md:hidden text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {userProfile.role || 'Staff'}
            </span>
          )}
        </div>
        <p className="text-slate-400 dark:text-slate-500 font-bold text-xs sm:text-sm md:text-base uppercase tracking-[0.15em] md:tracking-[0.3em]">
          Pilih Modul Untuk Melanjutkan
        </p>
      </div>

      <div className="w-full md:flex-1 md:min-h-0 md:overflow-y-auto overflow-x-hidden md:pr-1 custom-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3 md:gap-5 pb-6 md:pb-16">
        {navigation.map((item: any, index) => (
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
              animationDelay: `${index * 30}ms`,
              backgroundColor: item.color,
              borderColor: `${item.color}55`
            }}
            className={cn(
              "group relative flex flex-col justify-between p-3 sm:p-4 md:p-5 rounded-2xl md:rounded-[2rem] transition-all duration-300 ease-out overflow-hidden shadow-md md:shadow-lg border cursor-pointer active:scale-95 animate-in fade-in slide-in-from-bottom-3",
              "h-[110px] sm:h-[125px] md:h-[150px] lg:h-[160px]",
              "hover:shadow-2xl hover:-translate-y-1.5 hover:brightness-110"
            )}
          >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-white/10 to-transparent pointer-events-none" />

            {/* Top Bar: Icon on left, Badges on right */}
            <div className="relative z-10 flex items-start justify-between w-full">
              {/* Icon Container */}
              <div className="bg-white/25 backdrop-blur-md p-2 sm:p-2.5 md:p-3 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform duration-300 ease-out shadow-md">
                <item.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>

              {/* Badges */}
              <div className="flex items-center gap-1">
                {item.badge !== undefined && (
                  <div className="flex items-center gap-1 px-2 py-0.5 md:px-2.5 md:py-1 bg-white/30 rounded-full backdrop-blur-md border border-white/30 animate-pulse shadow-md">
                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                    <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-wider">{item.badge}</span>
                  </div>
                )}

                {item.items && item.items.length > 0 && (
                  <div className="flex items-center gap-0.5 sm:gap-1 text-[8px] md:text-[10px] font-black text-white/90 uppercase tracking-wider bg-black/15 px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-full backdrop-blur-md border border-white/10">
                    <ChevronRight className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                    <span className="hidden sm:inline">Sub-Menu</span>
                    <span className="sm:hidden text-[7px]">Sub</span>
                  </div>
                )}
              </div>
            </div>

            {/* Title Section */}
            <div className="relative z-10 flex flex-col items-start md:items-center justify-end md:justify-center md:flex-1 mt-auto">
              <div className="text-xs sm:text-sm md:text-base font-black text-white leading-tight uppercase tracking-tight text-left md:text-center break-words line-clamp-2 w-full drop-shadow-sm">
                {item.name}
              </div>
            </div>

            {/* Decorative Light Effect */}
            <div className="absolute -bottom-8 -right-8 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
          </div>
        ))}
        </div>
      </div>

      {/* Sub-Menu Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-primary/20 to-transparent z-50" />
          
          <div className="p-8 pb-4">
            <DialogHeader className="mb-4">
              <div className="flex items-center gap-4">
                <div 
                  className="p-4 rounded-2xl shadow-lg shadow-primary/10" 
                  style={{ backgroundColor: selectedItem?.color }}
                >
                  {selectedItem && <selectedItem.icon className="w-6 h-6 text-white" />}
                </div>
                <div className="flex flex-col text-left">
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-800">
                    {selectedItem?.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Pilih Sub-Menu Untuk Melanjutkan
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-8 pb-8 overflow-y-auto custom-scrollbar flex-1">
            <div className={cn(
              "grid gap-3",
              selectedItem?.items?.length > 6 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
            )}>
              {selectedItem?.items?.map((sub: any, idx: number) => (
                <button
                  key={sub.name}
                  onClick={() => handleNavigate(sub.href)}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-primary text-slate-700 hover:text-white transition-all duration-300 border border-slate-100 hover:border-primary shadow-sm hover:shadow-xl hover:-translate-y-0.5 animate-in fade-in slide-in-from-right-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/50 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <Building2 className="w-4 h-4 text-primary group-hover:text-white" />
                    </div>
                    <span className="font-black uppercase tracking-tight text-sm">{sub.name}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </button>
              ))}
            </div>

            <button 
              onClick={() => setSelectedItem(null)}
              className="w-full mt-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-primary transition-colors border-t border-slate-100"
            >
              Tutup Menu
            </button>
          </div>
          

        </DialogContent>
      </Dialog>
    </div>
  )
}
