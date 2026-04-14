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
      </div>
    </div>
  )
}
