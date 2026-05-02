"use client"

import React from "react"
import { useNavigation } from "@/hooks/use-navigation"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { ChevronRight } from "lucide-react"

interface MenuLaunchpadProps {
  onSelect?: () => void
  className?: string
}

export function MenuLaunchpad({ onSelect, className }: MenuLaunchpadProps) {
  const { navigation } = useNavigation()
  const router = useRouter()
  const { playSound } = useSoundEffect()

  const handleNavigate = (href: string) => {
    playSound('click')
    router.push(href)
    if (onSelect) onSelect()
  }

  return (
    <div className={cn("w-full max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in zoom-in duration-500", className)}>
      <div className="flex flex-col mb-8 space-y-2">
        <h2 className="text-3xl md:text-5xl font-black text-primary tracking-tighter uppercase">
          Menu Utama
        </h2>
        <p className="text-slate-500 font-bold text-sm md:text-base uppercase tracking-widest">
          Silakan pilih modul yang ingin Anda akses
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {navigation.map((item, index) => (
          <button
            key={item.name}
            onClick={() => handleNavigate(item.href)}
            style={{ animationDelay: `${index * 50}ms` }}
            className={cn(
              "group relative flex flex-col items-center justify-center p-6 rounded-[2.5rem] transition-all duration-500 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 active:scale-95 animate-in fade-in slide-in-from-bottom-4 bg-white border border-slate-100",
              "hover:border-primary/20"
            )}
          >
            {/* Background Accent */}
            <div className={cn(
              "absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500",
              item.color || "bg-primary"
            )} />
            
            {/* Icon Container */}
            <div className={cn(
              "w-16 h-16 md:w-20 md:h-20 rounded-3xl flex items-center justify-center mb-4 transition-all duration-500 shadow-inner group-hover:scale-110 group-hover:rotate-3",
              item.color ? `${item.color} text-white` : "bg-primary text-white"
            )}>
              <item.icon className="w-8 h-8 md:w-10 md:h-10 stroke-[2.5px]" />
            </div>

            {/* Content */}
            <div className="flex flex-col items-center text-center space-y-1 z-10">
              <span className="text-sm md:text-base font-black text-slate-800 uppercase tracking-tight group-hover:text-primary transition-colors">
                {item.name}
              </span>
              {item.description && (
                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                  {item.description}
                </span>
              )}
            </div>

            {/* Corner Accent */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-2 group-hover:translate-x-0">
               <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </button>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 opacity-50">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 grayscale contrast-125" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">SIMPU TANJUNGPINANG</span>
            <span className="text-[8px] font-bold uppercase tracking-tighter text-slate-500">Sistem Informasi Manajemen Pelaku Usaha</span>
          </div>
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
           &copy; 2024 Dinas Koperasi & UKM
        </div>
      </div>
    </div>
  )
}
