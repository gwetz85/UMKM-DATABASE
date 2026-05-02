"use client"

import React from "react"
import { useNavigation } from "@/hooks/use-navigation"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { TrendingUp } from "lucide-react"

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
      <div className="flex flex-col mb-12 space-y-2">
        <h2 className="text-4xl md:text-6xl font-black text-primary tracking-tighter uppercase">
          Sistem Navigasi
        </h2>
        <p className="text-slate-500 font-bold text-sm md:text-base uppercase tracking-[0.3em]">
          Pilih Modul Untuk Melanjutkan
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {navigation.map((item, index) => (
          <button
            key={item.name}
            onClick={() => handleNavigate(item.href)}
            style={{ animationDelay: `${index * 40}ms` }}
            className={cn(
              "group relative flex flex-col p-6 rounded-3xl transition-all duration-500 overflow-hidden shadow-md border cursor-pointer active:scale-95 animate-in fade-in slide-in-from-bottom-4",
              "hover:shadow-2xl hover:-translate-y-1.5",
              item.color || "bg-primary",
              item.hoverColor || "hover:bg-primary/90",
              item.borderColor || "border-white/20"
            )}
          >
            {/* Header Section */}
            <div className="flex items-start justify-between mb-8">
              <h3 className="text-xs md:text-sm font-black text-white/80 uppercase tracking-widest text-left max-w-[70%]">
                {item.name}
              </h3>
              <div className="bg-white/20 p-2.5 rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <item.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>

            {/* Value/Content Section (Emulating Dashboard) */}
            <div className="mt-auto">
              <div className="text-xl md:text-2xl font-black text-white leading-tight uppercase tracking-tighter mb-2 text-left">
                {item.name.split(' ').length > 2 
                  ? item.name.split(' ').slice(0, 2).join(' ') 
                  : item.name}
              </div>
              <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-black text-white/70 uppercase tracking-widest">
                <TrendingUp className="w-3 h-3 text-white" />
                Akses Modul
              </div>
            </div>

            {/* Decorative Background Element */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          </button>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-20 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 opacity-40">
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
           <span>v4.0.0 Stable</span>
           <span>&copy; 2024 Dinas Koperasi & UKM</span>
        </div>
      </div>
    </div>
  )
}
