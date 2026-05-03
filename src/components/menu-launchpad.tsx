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
    <div className={cn("w-full max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in zoom-in duration-500", className)}>
      <div className="flex flex-col mb-12 space-y-2">
        <h2 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tighter uppercase">
          Sistem Navigasi
        </h2>
        <p className="text-slate-500 font-bold text-sm md:text-base uppercase tracking-[0.3em]">
          Pilih Modul Untuk Melanjutkan
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
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
              animationDelay: `${index * 40}ms`,
              backgroundColor: item.color,
              borderColor: `${item.color}44`
            }}
            className={cn(
              "group relative flex flex-col p-4 md:p-5 rounded-[2rem] transition-all duration-300 ease-out overflow-hidden shadow-lg border cursor-pointer active:scale-95 animate-in fade-in slide-in-from-bottom-4 h-[160px] md:h-[180px]",
              "hover:shadow-2xl hover:-translate-y-1.5 hover:brightness-110"
            )}
          >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

            {/* Header Section */}
            <div className="flex items-start justify-between mb-6 relative z-10">
              <h3 className="text-[10px] md:text-[11px] font-black text-white/70 uppercase tracking-[0.2em] text-left max-w-[75%] leading-relaxed">
                Modul Aplikasi
              </h3>
              <div className="bg-white/20 p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300 ease-out shadow-xl backdrop-blur-sm">
                <item.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>

            {/* Title Section */}
            <div className="mt-auto relative z-10 flex flex-col gap-3">
              <div className="text-sm md:text-base font-black text-white leading-tight uppercase tracking-tight text-left break-words line-clamp-2 w-full">
                {item.name}
              </div>
              
              <div className="flex items-center gap-2 text-[10px] font-black text-white/80 uppercase tracking-widest bg-black/10 w-fit px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                {item.items && item.items.length > 0 ? (
                  <>
                    <ChevronRight className="w-3 h-3 text-white" />
                    <span>Pilih Sub-Menu</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3 h-3 text-white" />
                    <span>Akses Modul</span>
                  </>
                )}
              </div>
            </div>

            {/* Decorative Light Effect */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
          </div>
        ))}
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
          
          <style jsx global>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #e2e8f0;
              border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #cbd5e1;
            }
          `}</style>
        </DialogContent>
      </Dialog>

      {/* Footer Info */}
      <div className="mt-20 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-widest text-slate-900">SIMPU TANJUNGPINANG</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">Sistem Informasi Manajemen Pelaku Usaha</span>
          </div>
        </div>
        <div className="flex gap-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
           <span>{systemConfig?.version || "v4.0.0 Stable"}</span>
           <span>{systemConfig?.copyright || "© 2024 Dinas Koperasi & UKM"}</span>
        </div>
      </div>
    </div>
  )
}
