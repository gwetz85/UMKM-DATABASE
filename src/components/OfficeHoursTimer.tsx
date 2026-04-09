"use client"

import React, { useState, useEffect } from "react"
import { Clock, DoorOpen, DoorClosed } from "lucide-react"

export function OfficeHoursTimer() {
  const [status, setStatus] = useState<{
    isOpen: boolean
    label: string
    timeLeft: string
    colorClass: string
  } | null>(null)

  useEffect(() => {
    const calculateStatus = () => {
      const now = new Date()
      const day = now.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const currentHour = now.getHours()
      const currentMin = now.getMinutes()
      const currentSec = now.getSeconds()
      
      const currentTimeInSeconds = currentHour * 3600 + currentMin * 60 + currentSec
      
      const openTimeInSeconds = 10 * 3600 // 10:00 AM
      
      // Determine closing time based on day
      let closeHour = 15 // Default Mon-Fri
      if (day === 6) closeHour = 14 // Saturday
      const closeTimeInSeconds = closeHour * 3600
      
      let isOpen = false
      let targetSeconds = 0
      let label = ""
      let colorClass = ""

      const isSunday = day === 0
      
      if (!isSunday && currentTimeInSeconds >= openTimeInSeconds && currentTimeInSeconds < closeTimeInSeconds) {
        isOpen = true
        targetSeconds = closeTimeInSeconds - currentTimeInSeconds
        label = "KANTOR BUKA"
        colorClass = "bg-emerald-500/10 text-emerald-600 border-emerald-200"
      } else {
        isOpen = false
        label = isSunday ? "KANTOR LIBUR" : "KANTOR TUTUP"
        colorClass = "bg-rose-500/10 text-rose-600 border-rose-200"
        
        if (!isSunday && currentTimeInSeconds < openTimeInSeconds) {
          targetSeconds = openTimeInSeconds - currentTimeInSeconds
        } else {
          // Calculate time to next opening
          // Skip to next day until we find a non-Sunday
          let nextOpenDate = new Date(now)
          nextOpenDate.setHours(10, 0, 0, 0)
          
          if (currentTimeInSeconds >= openTimeInSeconds) {
            nextOpenDate.setDate(nextOpenDate.getDate() + 1)
          }
          
          while (nextOpenDate.getDay() === 0) {
            nextOpenDate.setDate(nextOpenDate.getDate() + 1)
          }
          
          targetSeconds = Math.floor((nextOpenDate.getTime() - now.getTime()) / 1000)
        }
      }

      const h = Math.floor(targetSeconds / 3600)
      const m = Math.floor((targetSeconds % 3600) / 60)
      const s = targetSeconds % 60
      
      const timeLeft = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      
      setStatus({ isOpen, label, timeLeft, colorClass })
    }


    calculateStatus()
    const interval = setInterval(calculateStatus, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!status) return null

  return (
    <div className={`flex items-center gap-3 px-3 py-1.5 md:px-4 md:py-2 rounded-2xl border transition-all duration-500 shadow-sm ${status.colorClass}`}>
      <div className="flex flex-col items-start md:items-end">
        <div className="flex items-center gap-1.5 shrink-0">
          {status.isOpen ? <DoorOpen className="w-3 h-3 md:w-3.5 md:h-3.5 animate-bounce" /> : <DoorClosed className="w-3 h-3 md:w-3.5 md:h-3.5" />}
          <span className="text-[9px] md:text-[10px] font-black tracking-widest uppercase">{status.label}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 md:mt-0">
          <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 opacity-70" />
          <span className="text-[10px] md:text-sm font-mono font-black tracking-tighter">
            {status.timeLeft}
          </span>
          <span className="text-[8px] md:text-[9px] font-bold opacity-60 uppercase ml-1 hidden lg:inline">
            {status.isOpen ? "Menuju Tutup" : "Menuju Buka"}
          </span>
        </div>
      </div>
    </div>
  )
}
