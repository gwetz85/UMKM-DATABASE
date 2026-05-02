"use client"

import React from "react"
import { useNavigation } from "@/hooks/use-navigation"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { TrendingUp } from "lucide-react"
import { useObject } from "@/firebase"
import { ref } from "firebase/database"

interface MenuLaunchpadProps {
  onSelect?: () => void
  className?: string
}

export function MenuLaunchpad({ onSelect, className }: MenuLaunchpadProps) {
  const { navigation, userProfile } = useNavigation()
  const router = useRouter()
  const { playSound } = useSoundEffect()
  const { database } = useNavigation() // Get database from the same hook or useDatabase

  // Fetch dynamic system config
  const systemConfigRef = database ? ref(database, 'settings/system_config') : null
  const { data: systemConfig } = useObject(systemConfigRef)

  const handleNavigate = (href: string) => {
    playSound('click')
    router.push(href)
    if (onSelect) onSelect()
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {navigation.map((item, index) => (
          <button
            key={item.name}
            onClick={() => handleNavigate(item.href)}
            style={{ 
              animationDelay: `${index * 40}ms`,
              backgroundColor: item.color,
              borderColor: `${item.color}44` // Add some transparency to border
            }}
            className={cn(
              "group relative flex flex-col p-6 rounded-[2rem] transition-all duration-500 overflow-hidden shadow-lg border cursor-pointer active:scale-95 animate-in fade-in slide-in-from-bottom-4",
              "hover:shadow-2xl hover:-translate-y-1.5 hover:brightness-110"
            )}
          >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

            {/* Header Section */}
            <div className="flex items-start justify-between mb-10 relative z-10">
              <h3 className="text-[10px] md:text-[11px] font-black text-white/70 uppercase tracking-[0.2em] text-left max-w-[75%] leading-relaxed">
                Modul Aplikasi
              </h3>
              <div className="bg-white/20 p-3 rounded-2xl group-hover:scale-110 transition-transform duration-500 shadow-xl backdrop-blur-sm">
                <item.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>

            {/* Title Section */}
            <div className="mt-auto relative z-10">
              <div className="text-xl md:text-2xl font-black text-white leading-tight uppercase tracking-tight mb-3 text-left">
                {item.name}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-white/80 uppercase tracking-widest bg-black/10 w-fit px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                <TrendingUp className="w-3 h-3 text-white" />
                <span>Akses Modul</span>
              </div>
            </div>

            {/* Decorative Light Effect */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
          </button>
        ))}
      </div>

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
