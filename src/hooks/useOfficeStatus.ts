"use client"

import { useState, useEffect } from "react"

export interface OfficeStatus {
  isOpen: boolean
  label: string
  timeLeft: string
  colorClass: string
}

export function useOfficeStatus() {
  const [status, setStatus] = useState<OfficeStatus | null>(null)

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

  return status
}
