"use client"

import React, { useState, useEffect } from "react"
import { Clock, DoorOpen, DoorClosed } from "lucide-react"

import { useOfficeStatus } from "@/hooks/useOfficeStatus"

export function OfficeHoursTimer({ 
  large = false, 
  onClick 
}: { 
  large?: boolean,
  onClick?: (e: React.MouseEvent) => void
}) {
  const status = useOfficeStatus()

  const [currentTime, setCurrentTime] = useState("")
  const [currentDate, setCurrentDate] = useState("")

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const hh = now.getHours().toString().padStart(2, "0")
      const mm = now.getMinutes().toString().padStart(2, "0")
      const ss = now.getSeconds().toString().padStart(2, "0")
      const dd = now.getDate().toString().padStart(2, "0")
      const mo = (now.getMonth() + 1).toString().padStart(2, "0")
      const yy = now.getFullYear().toString().slice(-2)
      setCurrentTime(`${hh}:${mm}:${ss}`)
      setCurrentDate(`${dd}/${mo}/${yy}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (!status) return null

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 ${large ? "px-6 py-4 rounded-3xl" : "px-3 py-1.5 md:px-4 md:py-2 rounded-2xl"} border transition-all duration-300 shadow-lg bg-white/95 backdrop-blur-md ${status.colorClass.split(' ').filter(c => !c.startsWith('bg-')).join(' ')} ${onClick ? "cursor-pointer hover:scale-105 active:scale-95" : ""}`}
    >
      <div className={`flex flex-col ${large ? "items-center" : "items-start md:items-end"}`}>
        <div className="flex items-center gap-1.5 shrink-0">
          {status.isOpen ? <DoorOpen className={`${large ? "w-5 h-5" : "w-4 h-4 md:w-3.5 md:h-3.5"} animate-bounce`} /> : <DoorClosed className={`${large ? "w-5 h-5" : "w-4 h-4 md:w-3.5 md:h-3.5"}`} />}
          <span className={`${large ? "text-xs" : "text-[10px] md:text-[10px]"} font-black tracking-widest uppercase`}>
            {status.label === 'KANTOR BUKA' ? 'Kantor Buka' : status.label === 'KANTOR LIBUR' ? 'Kantor Libur' : 'Kantor Tutup'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 md:mt-0">
          <Clock className={`${large ? "w-5 h-5" : "w-4 h-4 md:w-3.5 md:h-3.5"} opacity-70`} />
          <span className={`${large ? "text-3xl" : "text-[13px] md:text-sm"} font-mono font-black tracking-tighter leading-none`}>
            {status.timeLeft}
          </span>
          <span className={`${large ? "text-[10px]" : "text-[9px]"} font-bold opacity-60 uppercase ml-1 ${large ? "inline" : "hidden lg:inline"}`}>
            {status.isOpen ? 'Menuju Tutup' : 'Menuju Buka'}
          </span>
        </div>
        {currentTime && (
          <div className={`flex items-center gap-1.5 ${large ? "mt-1" : "mt-0.5"}`}>
            {/* Tanggal */}
            <span className={`${large ? "text-sm" : "text-[10px] md:text-[11px]"} font-mono font-black tracking-tight text-black leading-none`}>
              {currentDate}
            </span>
            {/* Pemisah */}
            <span className="text-black/30 font-black leading-none">·</span>
            {/* Jam */}
            <span className={`${large ? "text-xl" : "text-[12px] md:text-sm"} font-mono font-black tracking-tighter text-black leading-none`}>
              {currentTime}
            </span>
            <span className={`${large ? "text-[9px]" : "text-[8px]"} font-black text-black/50 uppercase`}>
              WIB
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

