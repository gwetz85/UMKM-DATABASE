"use client"

import { useState, useEffect } from "react"
import { useDatabase, useObject, useMemoFirebase } from "@/firebase"
import { ref } from "firebase/database"

export interface OfficeStatus {
  isOpen: boolean
  label: string
  timeLeft: string
  colorClass: string
}

export function useOfficeStatus() {
  const [status, setStatus] = useState<OfficeStatus | null>(null)
  const database = useDatabase()

  const officeHoursRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'settings/office_hours')
  }, [database])

  const { data: settings } = useObject(officeHoursRef)

  useEffect(() => {
    const calculateStatus = () => {
      const now = new Date()
      const day = now.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
      
      // Get settings or use defaults
      const openHourStr = settings?.openHour || "10:00"
      const closeWeekdayStr = settings?.closeHourWeekday || "15:00"
      const closeWeekendStr = settings?.closeHourWeekend || "14:00"
      const holidays = settings?.holidays ? Object.values(settings.holidays) as { date: string, name: string }[] : []

      // Parse times
      const [oH, oM] = openHourStr.split(':').map(Number)
      const openTimeInSeconds = oH * 3600 + (oM || 0) * 60

      let closeHourStr = closeWeekdayStr
      if (day === 6) closeHourStr = closeWeekendStr // Saturday
      
      const [cH, cM] = closeHourStr.split(':').map(Number)
      const closeTimeInSeconds = cH * 3600 + (cM || 0) * 60

      const currentHour = now.getHours()
      const currentMin = now.getMinutes()
      const currentSec = now.getSeconds()
      const currentTimeInSeconds = currentHour * 3600 + currentMin * 60 + currentSec

      // Check for holidays
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const todayStr = `${yyyy}-${mm}-${dd}`
      
      const isHoliday = holidays.some(h => h.date === todayStr)
      const isSunday = day === 0
      
      const isClosedAllDay = isSunday || isHoliday
      
      let isOpen = false
      let targetSeconds = 0
      let label = ""
      let colorClass = ""

      if (!isClosedAllDay && currentTimeInSeconds >= openTimeInSeconds && currentTimeInSeconds < closeTimeInSeconds) {
        isOpen = true
        targetSeconds = closeTimeInSeconds - currentTimeInSeconds
        label = "KANTOR BUKA"
        colorClass = "bg-emerald-500/10 text-emerald-600 border-emerald-200"
      } else {
        isOpen = false
        label = isClosedAllDay ? "KANTOR LIBUR" : "KANTOR TUTUP"
        colorClass = "bg-rose-500/10 text-rose-600 border-rose-200"
        
        if (!isClosedAllDay && currentTimeInSeconds < openTimeInSeconds) {
          targetSeconds = openTimeInSeconds - currentTimeInSeconds
        } else {
          // Calculate time to next opening
          let nextOpenDate = new Date(now)
          nextOpenDate.setHours(oH, oM || 0, 0, 0)
          
          if (currentTimeInSeconds >= openTimeInSeconds) {
            nextOpenDate.setDate(nextOpenDate.getDate() + 1)
          }
          
          // Skip Sundays and Holidays
          while (true) {
            const nY = nextOpenDate.getFullYear()
            const nM = String(nextOpenDate.getMonth() + 1).padStart(2, '0')
            const nD = String(nextOpenDate.getDate()).padStart(2, '0')
            const nextStr = `${nY}-${nM}-${nD}`
            
            const nextIsHoliday = holidays.some(h => h.date === nextStr)
            
            if (nextOpenDate.getDay() !== 0 && !nextIsHoliday) {
              break;
            }
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
  }, [settings])

  return status
}
