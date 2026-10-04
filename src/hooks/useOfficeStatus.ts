"use client"

import { useState, useEffect } from "react"
import { useDatabase, useObject, useMemoFirebase } from "@/firebase"
import { ref } from "firebase/database"

export interface OfficeStatus {
  isOpen: boolean
  isHoliday: boolean
  isSunday: boolean
  holidayName?: string
  label: string // 'KANTOR BUKA' | 'KANTOR TUTUP' | 'KANTOR LIBUR'
  statusTitle: string // 'Buka Jam Kantor' | 'Jam Kantor Buka' | 'Libur Kantor'
  subLabel: string // 'Buka Pk 10:00' | 'Tutup Pk 15:00' | 'Buka Senin Pk 10:00'
  timeLeft: string // '06:18:24' or '1h 04:12:30'
  days: number
  hours: number
  minutes: number
  seconds: number
  openHourStr: string
  closeHourStr: string
  closeWeekdayStr: string
  closeWeekendStr: string
  colorClass: string
  nextOpenDayName?: string
  targetSeconds: number
}

const INDO_DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

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
      const closeWeekendStr = settings?.closeHourWeekend || "14:30"
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
      
      const todayHoliday = holidays.find(h => h.date === todayStr)
      const isHoliday = !!todayHoliday
      const isSunday = day === 0
      
      const isClosedAllDay = isSunday || isHoliday
      
      let isOpen = false
      let targetSeconds = 0
      let label = ""
      let statusTitle = ""
      let subLabel = ""
      let colorClass = ""
      let nextOpenDayName = ""

      if (!isClosedAllDay && currentTimeInSeconds >= openTimeInSeconds && currentTimeInSeconds < closeTimeInSeconds) {
        // Office is currently OPEN
        isOpen = true
        targetSeconds = closeTimeInSeconds - currentTimeInSeconds
        label = "KANTOR BUKA"
        statusTitle = "Jam Kantor Buka"
        subLabel = `Tutup Pk ${closeHourStr}`
        colorClass = "bg-emerald-500/10 text-emerald-600 border-emerald-200"
      } else {
        // Office is CLOSED / HOLIDAY
        isOpen = false
        label = isClosedAllDay ? (isHoliday ? "KANTOR LIBUR" : "HARI MINGGU") : "KANTOR TUTUP"
        statusTitle = "Buka Jam Kantor"
        colorClass = isClosedAllDay ? "bg-rose-500/10 text-rose-600 border-rose-200" : "bg-amber-500/10 text-amber-600 border-amber-200"
        
        if (!isClosedAllDay && currentTimeInSeconds < openTimeInSeconds) {
          // Normal day, earlier than open hour
          targetSeconds = openTimeInSeconds - currentTimeInSeconds
          subLabel = `Buka Pk ${openHourStr}`
          nextOpenDayName = "Hari ini"
        } else {
          // Past closing or on weekend/holiday -> calculate next opening day
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
          
          targetSeconds = Math.max(0, Math.floor((nextOpenDate.getTime() - now.getTime()) / 1000))
          nextOpenDayName = INDO_DAY_NAMES[nextOpenDate.getDay()]
          subLabel = `Buka ${nextOpenDayName} Pk ${openHourStr}`
        }
      }

      const days = Math.floor(targetSeconds / 86400)
      const hours = Math.floor((targetSeconds % 86400) / 3600)
      const minutes = Math.floor((targetSeconds % 3600) / 60)
      const seconds = targetSeconds % 60
      
      const hStr = hours.toString().padStart(2, '0')
      const mStr = minutes.toString().padStart(2, '0')
      const sStr = seconds.toString().padStart(2, '0')

      let timeLeft = `${hStr}:${mStr}:${sStr}`
      if (days > 0) {
        timeLeft = `${days}h ${hStr}:${mStr}:${sStr}`
      }
      
      setStatus({ 
        isOpen, 
        isHoliday,
        isSunday,
        holidayName: todayHoliday?.name,
        label, 
        statusTitle,
        subLabel,
        timeLeft, 
        days,
        hours,
        minutes,
        seconds,
        openHourStr,
        closeHourStr,
        closeWeekdayStr,
        closeWeekendStr,
        colorClass,
        nextOpenDayName,
        targetSeconds
      })
    }

    calculateStatus()
    const interval = setInterval(calculateStatus, 1000)
    return () => clearInterval(interval)
  }, [settings])

  return status
}
