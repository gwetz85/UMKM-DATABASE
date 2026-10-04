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

function parseTimeToSeconds(timeStr: any, defaultHour = 10, defaultMin = 0): { hours: number, minutes: number, seconds: number } {
  if (typeof timeStr !== 'string' || !timeStr.trim()) {
    return { hours: defaultHour, minutes: defaultMin, seconds: defaultHour * 3600 + defaultMin * 60 }
  }
  const clean = timeStr.trim().replace(/[^0-9:\.]/g, '')
  const parts = clean.includes(':') ? clean.split(':') : clean.split('.')
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  const safeH = isNaN(h) ? defaultHour : Math.max(0, Math.min(23, h))
  const safeM = isNaN(m) ? defaultMin : Math.max(0, Math.min(59, m))
  return { hours: safeH, minutes: safeM, seconds: safeH * 3600 + safeM * 60 }
}

export function useOfficeStatus() {
  const [status, setStatus] = useState<OfficeStatus | null>(null)
  const database = useDatabase()

  const officeHoursRef = useMemoFirebase(() => {
    if (!database) return null
    try {
      return ref(database, 'settings/office_hours')
    } catch {
      return null
    }
  }, [database])

  const { data: settings } = useObject(officeHoursRef)

  useEffect(() => {
    const calculateStatus = () => {
      try {
        const now = new Date()
        const day = now.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
        
        // Safe time parsing
        const openParsed = parseTimeToSeconds(settings?.openHour, 10, 0)
        const closeWeekdayParsed = parseTimeToSeconds(settings?.closeHourWeekday, 15, 0)
        const closeWeekendParsed = parseTimeToSeconds(settings?.closeHourWeekend, 14, 30)

        const openHourStr = `${String(openParsed.hours).padStart(2, '0')}:${String(openParsed.minutes).padStart(2, '0')}`
        const closeWeekdayStr = `${String(closeWeekdayParsed.hours).padStart(2, '0')}:${String(closeWeekdayParsed.minutes).padStart(2, '0')}`
        const closeWeekendStr = `${String(closeWeekendParsed.hours).padStart(2, '0')}:${String(closeWeekendParsed.minutes).padStart(2, '0')}`

        const closeParsed = day === 6 ? closeWeekendParsed : closeWeekdayParsed
        const closeHourStr = day === 6 ? closeWeekendStr : closeWeekdayStr

        const openTimeInSeconds = openParsed.seconds
        const closeTimeInSeconds = closeParsed.seconds

        const currentTimeInSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

        // Safe holidays array extraction
        let holidays: { date: string, name: string }[] = []
        if (settings?.holidays && typeof settings.holidays === 'object') {
          holidays = Object.values(settings.holidays)
            .filter((h: any) => h && typeof h === 'object' && typeof h.date === 'string')
            .map((h: any) => ({ date: String(h.date).trim(), name: String(h.name || '').trim() }))
        }

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
        let nextOpenDayName = "Hari ini"

        if (!isClosedAllDay && currentTimeInSeconds >= openTimeInSeconds && currentTimeInSeconds < closeTimeInSeconds) {
          // Kantor sedang BUKA
          isOpen = true
          targetSeconds = Math.max(0, closeTimeInSeconds - currentTimeInSeconds)
          label = "KANTOR BUKA"
          statusTitle = "Jam Kantor Buka"
          subLabel = `Tutup Pk ${closeHourStr}`
          colorClass = "bg-emerald-500/10 text-emerald-600 border-emerald-200"
        } else {
          // Kantor sedang TUTUP / LIBUR
          isOpen = false
          label = isClosedAllDay ? (isHoliday ? "KANTOR LIBUR" : "HARI MINGGU") : "KANTOR TUTUP"
          statusTitle = "Buka Jam Kantor"
          colorClass = isClosedAllDay ? "bg-rose-500/10 text-rose-600 border-rose-200" : "bg-amber-500/10 text-amber-600 border-amber-200"
          
          if (!isClosedAllDay && currentTimeInSeconds < openTimeInSeconds) {
            // Hari ini sebelum jam buka
            targetSeconds = Math.max(0, openTimeInSeconds - currentTimeInSeconds)
            subLabel = `Buka Pk ${openHourStr}`
            nextOpenDayName = "Hari ini"
          } else {
            // Melewati jam tutup atau hari libur -> cari hari kerja berikutnya
            let nextOpenDate = new Date(now)
            nextOpenDate.setHours(openParsed.hours, openParsed.minutes, 0, 0)
            
            if (currentTimeInSeconds >= openTimeInSeconds) {
              nextOpenDate.setDate(nextOpenDate.getDate() + 1)
            }
            
            let loopCount = 0
            while (loopCount < 14) {
              loopCount++
              const nY = nextOpenDate.getFullYear()
              const nM = String(nextOpenDate.getMonth() + 1).padStart(2, '0')
              const nD = String(nextOpenDate.getDate()).padStart(2, '0')
              const nextStr = `${nY}-${nM}-${nD}`
              
              const nextIsHoliday = holidays.some(h => h.date === nextStr)
              if (nextOpenDate.getDay() !== 0 && !nextIsHoliday) {
                break
              }
              nextOpenDate.setDate(nextOpenDate.getDate() + 1)
            }
            
            targetSeconds = Math.max(0, Math.floor((nextOpenDate.getTime() - now.getTime()) / 1000))
            nextOpenDayName = INDO_DAY_NAMES[nextOpenDate.getDay()] || "Hari Kerja"
            subLabel = `Buka ${nextOpenDayName} Pk ${openHourStr}`
          }
        }

        const safeTarget = Math.max(0, isNaN(targetSeconds) ? 0 : targetSeconds)
        const days = Math.floor(safeTarget / 86400)
        const hours = Math.floor((safeTarget % 86400) / 3600)
        const minutes = Math.floor((safeTarget % 3600) / 60)
        const seconds = safeTarget % 60
        
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
          targetSeconds: safeTarget
        })
      } catch (err) {
        console.error("calculateStatus error:", err)
      }
    }

    calculateStatus()
    const interval = setInterval(calculateStatus, 1000)
    return () => clearInterval(interval)
  }, [settings])

  return status
}
