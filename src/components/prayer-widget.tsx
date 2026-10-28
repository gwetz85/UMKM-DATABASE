"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { 
  Clock, 
  MapPin, 
  Sunrise, 
  Sun, 
  SunMedium, 
  Sunset, 
  Moon, 
  BellRing, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Calendar,
  Sparkles,
  CheckCircle2
} from "lucide-react"
import { cn } from "@/lib/utils"

// Tanjungpinang, Kepulauan Riau Coordinates & Metadata
const LATITUDE = 0.9186
const LONGITUDE = 104.4586
const CITY_NAME = "Tanjungpinang"
const PROVINCE = "Kepri"
const TIMEZONE = 7 // WIB (UTC+7)

export interface PrayerTimings {
  Fajr: string
  Sunrise: string
  Dhuhr: string
  Asr: string
  Sunset: string
  Maghrib: string
  Isha: string
  Imsak: string
  Dhuha?: string
}

const DEFAULT_TIMINGS: PrayerTimings = {
  Imsak: "04:15",
  Fajr: "04:25",
  Sunrise: "05:43",
  Dhuhr: "11:46",
  Asr: "15:06",
  Sunset: "17:48",
  Maghrib: "17:48",
  Isha: "18:59",
  Dhuha: "06:05"
}

// Offline Astronomical Calculator for Tanjungpinang fallback
function calculateLocalPrayerTimes(date: Date): PrayerTimings {
  const d = new Date(date)
  const startOfYear = new Date(d.getFullYear(), 0, 0)
  const diff = d.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180)
  
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)
  const declination = 23.45 * Math.sin(B) * (Math.PI / 180)
  
  const rad = Math.PI / 180
  const deg = 180 / Math.PI
  const latRad = LATITUDE * rad
  
  const solarNoon = 12 + (TIMEZONE * 15 - LONGITUDE) / 15 - (EoT / 60)
  const dhuhr = solarNoon + (2 / 60)
  
  const hourAngle = (angle: number) => {
    const cosHA = (Math.sin(angle * rad) - Math.sin(latRad) * Math.sin(declination)) / 
                  (Math.cos(latRad) * Math.cos(declination))
    if (cosHA > 1 || cosHA < -1) return 0
    return (Math.acos(cosHA) * deg) / 15
  }
  
  const fajrHA = hourAngle(-20)
  const fajr = solarNoon - fajrHA
  
  const sunriseHA = hourAngle(-0.833)
  const sunrise = solarNoon - sunriseHA
  
  const asrAltitude = Math.atan(1 / (1 + Math.tan(Math.abs(latRad - declination)))) * deg
  const asrHA = hourAngle(asrAltitude)
  const asr = solarNoon + asrHA
  
  const maghrib = solarNoon + sunriseHA + (2 / 60)
  const ishaHA = hourAngle(-18)
  const isha = solarNoon + ishaHA + (2 / 60)
  const imsak = fajr - (10 / 60)
  const dhuha = sunrise + (22 / 60)
  
  const toTimeStr = (decimalHour: number) => {
    let h = Math.floor(decimalHour)
    let m = Math.floor((decimalHour - h) * 60)
    if (m >= 60) {
      h += 1
      m -= 60
    }
    if (h >= 24) h -= 24
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }
  
  return {
    Imsak: toTimeStr(imsak),
    Fajr: toTimeStr(fajr),
    Sunrise: toTimeStr(sunrise),
    Dhuhr: toTimeStr(dhuhr),
    Asr: toTimeStr(asr),
    Sunset: toTimeStr(maghrib),
    Maghrib: toTimeStr(maghrib),
    Isha: toTimeStr(isha),
    Dhuha: toTimeStr(dhuha)
  }
}

// Islamic Corner Geometric Ornament SVG
function IslamicCornerPattern({ className }: { className?: string }) {
  return (
    <svg 
      className={cn("pointer-events-none opacity-40 select-none", className)} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 0 L100 0 L100 15 L15 15 L15 100 L0 100 Z" fill="url(#goldGrad)" opacity="0.4" />
      <path d="M20 20 L80 20 L80 30 L30 30 L30 80 L20 80 Z" stroke="url(#goldGrad)" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="16" stroke="url(#goldGrad)" strokeWidth="1" strokeDasharray="3 3" />
      <polygon points="50,38 54,46 62,50 54,54 50,62 46,54 38,50 46,46" fill="url(#goldGrad)" opacity="0.6" />
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Custom Mosque Emblem Icon
function MosqueEmblem({ className }: { className?: string }) {
  return (
    <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#065F46] to-[#047857] flex items-center justify-center text-white shadow-sm shrink-0 border border-emerald-400/30", className)}>
      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {/* Main Dome */}
        <path d="M12 2 C8 6, 8 10, 12 10 C16 10, 16 6, 12 2 Z" fill="currentColor" fillOpacity="0.2" />
        {/* Crescent */}
        <path d="M12 2 L12 4" strokeWidth="2" />
        {/* Building Base */}
        <rect x="5" y="10" width="14" height="11" rx="1.5" />
        {/* Main Arch Door */}
        <path d="M10 21 V15 C10 13.9 10.9 13 12 13 C13.1 13 14 13.9 14 15 V21" fill="currentColor" fillOpacity="0.3" />
        {/* Left Minaret */}
        <path d="M3 21 V9 L4 7 L5 9 V21" />
        {/* Right Minaret */}
        <path d="M19 21 V9 L20 7 L21 9 V21" />
      </svg>
    </div>
  )
}

// Mosque Arch Watermark for Prayer Cards
function MosqueArchWatermark({ className }: { className?: string }) {
  return (
    <svg className={cn("absolute bottom-0 right-0 w-16 h-16 pointer-events-none opacity-[0.06] select-none", className)} viewBox="0 0 100 100" fill="currentColor">
      <path d="M10 100 V40 C10 15, 50 5, 50 5 C50 5, 90 15, 90 40 V100 Z" />
      <path d="M30 100 V60 C30 45, 50 35, 50 35 C50 35, 70 45, 70 60 V100 Z" />
    </svg>
  )
}

interface PrayerWidgetProps {
  className?: string
}

export function PrayerWidget({ className }: PrayerWidgetProps) {
  const [timings, setTimings] = useState<PrayerTimings>(DEFAULT_TIMINGS)
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false)
  const alertedPrayerRef = useRef<string | null>(null)

  // Real-time second clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch Prayer Times from Kemenag API (Aladhan method=20) with caching
  const fetchTimings = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setIsRefreshing(true)
    const todayStr = new Date().toISOString().split("T")[0]
    const cacheKey = `prayer_times_tpi_${todayStr}`

    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.timings) {
            setTimings(parsed.timings)
            return
          }
        }
      } catch (err) {
        console.error("Cache read error:", err)
      }
    }

    try {
      const res = await fetch(
        `https://api.aladhan.com/v1/timings?latitude=${LATITUDE}&longitude=${LONGITUDE}&method=20`
      )
      if (!res.ok) throw new Error("Gagal mengambil data jadwal sholat")
      const json = await res.json()
      if (json.code === 200 && json.data?.timings) {
        const t = json.data.timings
        const cleanTimings: PrayerTimings = {
          Imsak: t.Imsak || "04:15",
          Fajr: t.Fajr || "04:25",
          Sunrise: t.Sunrise || "05:43",
          Dhuhr: t.Dhuhr || "11:46",
          Asr: t.Asr || "15:06",
          Sunset: t.Sunset || "17:48",
          Maghrib: t.Maghrib || "17:48",
          Isha: t.Isha || "18:59",
          Dhuha: "06:05"
        }

        setTimings(cleanTimings)

        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ timings: cleanTimings })
          )
        } catch {
          // ignore
        }
      } else {
        throw new Error("Format API tidak valid")
      }
    } catch {
      const fallback = calculateLocalPrayerTimes(new Date())
      setTimings(fallback)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchTimings()
  }, [fetchTimings])

  // Play gentle chime tone when prayer enters
  const playChimeTone = useCallback(() => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      
      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "sine"
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
        gain.gain.setValueAtTime(0.001, ctx.currentTime + start)
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + start + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + dur)
      }

      playTone(523.25, 0, 0.5)
      playTone(659.25, 0.35, 0.5)
      playTone(783.99, 0.7, 1.0)
    } catch {
      // ignore
    }
  }, [soundEnabled])

  // 5 Main Prayers
  const fivePrayers = useMemo(() => {
    return [
      { id: "fajr", name: "Subuh", time: timings.Fajr, icon: Sunrise, activeColor: "text-sky-400" },
      { id: "dhuhr", name: "Dzuhur", time: timings.Dhuhr, icon: Sun, activeColor: "text-amber-300" },
      { id: "asr", name: "Ashar", time: timings.Asr, icon: SunMedium, activeColor: "text-amber-400" },
      { id: "maghrib", name: "Maghrib", time: timings.Maghrib, icon: Sunset, activeColor: "text-rose-400" },
      { id: "isha", name: "Isya", time: timings.Isha, icon: Moon, activeColor: "text-indigo-400" }
    ]
  }, [timings])

  // Calculation of Active Prayer & Next Prayer with Countdown
  const calculation = useMemo(() => {
    const now = currentTime
    const prayerDates = fivePrayers.map((p) => {
      const [h, m] = p.time.split(":").map(Number)
      const d = new Date(now)
      d.setHours(h, m, 0, 0)
      return { ...p, date: d }
    })

    // Active prayer window: within 25 minutes after adzan
    const ENTERED_WINDOW_MS = 25 * 60 * 1000
    let currentEnteredPrayer = null

    for (const p of prayerDates) {
      const diffMs = now.getTime() - p.date.getTime()
      if (diffMs >= 0 && diffMs <= ENTERED_WINDOW_MS) {
        currentEnteredPrayer = {
          ...p,
          minutesPassed: Math.floor(diffMs / 60000)
        }
        break
      }
    }

    let next = prayerDates.find((p) => p.date.getTime() > now.getTime())
    let isNextTomorrow = false

    if (!next) {
      const [h, m] = timings.Fajr.split(":").map(Number)
      const tmrw = new Date(now)
      tmrw.setDate(tmrw.getDate() + 1)
      tmrw.setHours(h, m, 0, 0)
      next = { ...fivePrayers[0], date: tmrw }
      isNextTomorrow = true
    }

    const remainingMs = Math.max(0, next.date.getTime() - now.getTime())
    const totalSec = Math.floor(remainingMs / 1000)
    const hours = Math.floor(totalSec / 3600)
    const minutes = Math.floor((totalSec % 3600) / 60)
    const seconds = totalSec % 60

    return {
      activeEnteredPrayer: currentEnteredPrayer,
      nextPrayer: next,
      isNextTomorrow,
      remainingSec: totalSec,
      hours,
      minutes,
      seconds
    }
  }, [currentTime, fivePrayers, timings.Fajr])

  useEffect(() => {
    if (calculation.activeEnteredPrayer) {
      const prayerId = calculation.activeEnteredPrayer.id
      if (alertedPrayerRef.current !== prayerId) {
        alertedPrayerRef.current = prayerId
        playChimeTone()
      }
    } else {
      alertedPrayerRef.current = null
    }
  }, [calculation.activeEnteredPrayer, playChimeTone])

  const timeString = useMemo(() => {
    const h = String(currentTime.getHours()).padStart(2, "0")
    const m = String(currentTime.getMinutes()).padStart(2, "0")
    const s = String(currentTime.getSeconds()).padStart(2, "0")
    return `${h}:${m}:${s}`
  }, [currentTime])

  const formattedCountdown = `${String(calculation.hours).padStart(2, "0")}:${String(calculation.minutes).padStart(2, "0")}:${String(calculation.seconds).padStart(2, "0")}`

  return (
    <div
      className={cn(
        "w-full bg-white dark:bg-[#07161A] rounded-[28px] border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex flex-col justify-between transition-all duration-300 relative group overflow-hidden",
        className
      )}
    >
      {/* ─── 1. HEADER (Logo Masjid, Judul, Info Lokasi, Countdown Pill, Suara, Refresh) ─── */}
      <div className="flex items-center justify-between pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <MosqueEmblem />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight leading-tight">
                Jadwal Waktu Sholat
              </h3>
              <span className="relative flex h-2 w-2" title="Waktu Sholat Realtime Aktif">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{CITY_NAME}, {PROVINCE} • Kemenag RI</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Top Right Countdown Pill (Matches Reference) */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 text-xs sm:text-sm font-bold shadow-2xs"
            title={`Hitung mundur menuju ${calculation.nextPrayer.name}`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {calculation.isNextTomorrow ? "Subuh Besok" : calculation.nextPrayer.name}
            </span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 tracking-tight text-xs sm:text-sm">
              {formattedCountdown}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const nextVal = !soundEnabled
              setSoundEnabled(nextVal)
              if (nextVal) playChimeTone()
            }}
            title={soundEnabled ? "Pengingat suara aktif (Klik untuk senyapkan)" : "Aktifkan bunyi pengingat masuk waktu"}
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-all border shadow-2xs",
              soundEnabled
                ? "bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700"
                : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 hover:text-slate-600"
            )}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchTimings(true)}
            disabled={isRefreshing}
            title="Perbarui Jadwal"
            className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-all shadow-2xs active:scale-95"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-emerald-500")} />
          </button>
        </div>
      </div>

      {/* ─── 2. AREA UTAMA: PANORAMIC MOSQUE HERO + ISLAMIC ARCH DISPLAY ─── */}
      <div className="my-2.5 rounded-[22px] overflow-hidden relative shadow-md border border-slate-200/80 dark:border-slate-800 min-h-[160px] sm:min-h-[175px] flex items-center">
        {/* Background Photograph (Coastal Grand Mosque at Golden Sunset) */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{
            backgroundImage: "url('/images/prayer-hero-mosque.jpg'), url('/images/mosque-sunset.jpg')",
            backgroundPosition: "center right"
          }}
        />

        {/* Cinematic Gradient Overlay (Dark Navy on Left -> Translucent on Right) */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#041D22]/95 via-[#082E36]/75 to-transparent pointer-events-none" />

        {/* Content Inside Hero Banner */}
        <div className="relative z-10 w-full h-full p-3.5 sm:p-5 flex items-center justify-between gap-4">
          {/* Islamic Mihrab Arch (Left Side - Prominent Focal Point) */}
          <div className="relative rounded-t-[44px] rounded-b-2xl border-t-2 border-x-2 border-amber-300/40 bg-gradient-to-b from-[#092B32]/95 via-[#051C20]/95 to-[#031114]/98 backdrop-blur-md shadow-2xl px-5 py-3 sm:py-3.5 text-center flex flex-col items-center justify-center shrink-0 min-w-[170px] sm:min-w-[200px]">
            {/* Top Golden Dome Ornament */}
            <div className="flex items-center gap-1.5 text-amber-300 text-[10px] sm:text-[11px] font-semibold tracking-wide">
              <svg className="w-3.5 h-3.5 fill-amber-300" viewBox="0 0 24 24">
                <path d="M12 2C8 6, 8 10, 12 10C16 10, 16 6, 12 2Z" />
                <path d="M5 10H19V12H5z" />
              </svg>
              <span>{calculation.activeEnteredPrayer ? "Sedang Berlangsung" : "Menuju Waktu"}</span>
            </div>

            {/* Prayer Name */}
            <h4 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
              {calculation.activeEnteredPrayer ? calculation.activeEnteredPrayer.name : calculation.nextPrayer.name}
            </h4>

            {/* Huge Time / Time Display */}
            <div className="font-mono text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none my-1 drop-shadow-md">
              {calculation.activeEnteredPrayer ? calculation.activeEnteredPrayer.time : calculation.nextPrayer.time}
            </div>

            {/* Status Pill Badge */}
            <div className="mt-1">
              {calculation.activeEnteredPrayer ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-yellow-400 text-slate-950 shadow-sm animate-pulse">
                  <BellRing className="w-2.5 h-2.5" />
                  SUDAH MASUK WAKTU
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/90 text-white shadow-sm border border-emerald-300/40">
                  <Clock className="w-2.5 h-2.5" />
                  BERIKUTNYA
                </span>
              )}
            </div>
          </div>

          {/* Center Motivational Quote (Inspirational Islamic Typography) */}
          <div className="hidden md:flex flex-col items-center justify-center text-center max-w-[280px] lg:max-w-[320px] px-2 py-1 bg-black/25 backdrop-blur-xs rounded-xl border border-white/10">
            <span className="text-amber-300 text-lg sm:text-xl font-serif leading-none opacity-80">“</span>
            <p className="text-xs sm:text-sm font-medium text-emerald-50/95 italic leading-snug drop-shadow-sm px-2">
              Semoga setiap langkah kita dalam keberkahan Allah
            </p>
            <span className="text-amber-300 text-lg sm:text-xl font-serif leading-none opacity-80">”</span>
            
            {/* Elegant Golden Divider Ornament */}
            <div className="flex items-center gap-2 mt-1 w-full justify-center opacity-70">
              <div className="h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent w-16" />
              <div className="w-1.5 h-1.5 rotate-45 bg-amber-400" />
              <div className="h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent w-16" />
            </div>
          </div>

          {/* Right Spacer (Preserves clean view of the Golden Mosque Dome on right side) */}
          <div className="w-8 sm:w-16 shrink-0" />
        </div>
      </div>

      {/* ─── 3. LIMA KARTU WAKTU SHOLAT (Subuh, Dzuhur, Ashar, Maghrib, Isya) ─── */}
      <div className="grid grid-cols-5 gap-2 sm:gap-2.5 my-2">
        {fivePrayers.map((prayer) => {
          const IconComp = prayer.icon
          const isNext = calculation.nextPrayer.id === prayer.id && !calculation.isNextTomorrow
          const isCurrentActive = calculation.activeEnteredPrayer?.id === prayer.id

          const [h, m] = prayer.time.split(":").map(Number)
          const pDate = new Date(currentTime)
          pDate.setHours(h, m, 0, 0)
          const isPassed = currentTime.getTime() > pDate.getTime() + 25 * 60 * 1000

          return (
            <div
              key={prayer.id}
              className={cn(
                "p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 flex flex-col justify-between text-center relative group/card overflow-hidden",
                // Active or Next Highlighted Card (Deep Emerald Gradient with Gold/Emerald Ring)
                isCurrentActive || isNext
                  ? "bg-gradient-to-b from-[#0D5C4E] to-[#083B32] text-white border-emerald-300 dark:border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-950/20 scale-[1.02]"
                  // Passed Card
                  : isPassed
                  ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 opacity-75"
                  // Upcoming Card
                  : "bg-white dark:bg-slate-800/70 border-slate-100 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              {/* Subtle Mosque Silhouette Watermark */}
              <MosqueArchWatermark className={isCurrentActive || isNext ? "opacity-[0.12] text-white" : "opacity-[0.05]"} />

              {/* Card Header: Icon + Name */}
              <div className="flex items-center justify-center gap-1.5 mb-1.5 relative z-10">
                <IconComp
                  className={cn(
                    "w-4 h-4",
                    isCurrentActive || isNext
                      ? prayer.activeColor
                      : isPassed
                      ? "text-slate-400"
                      : "text-amber-500 dark:text-amber-400"
                  )}
                />
                <span
                  className={cn(
                    "text-xs sm:text-sm font-black tracking-tight",
                    isCurrentActive || isNext
                      ? "text-white"
                      : "text-slate-900 dark:text-slate-100"
                  )}
                >
                  {prayer.name}
                </span>
              </div>

              {/* Card Time Display */}
              <div
                className={cn(
                  "font-mono text-base sm:text-lg font-black tracking-tight leading-none my-1 relative z-10",
                  isCurrentActive || isNext
                    ? "text-white drop-shadow-sm"
                    : "text-slate-800 dark:text-slate-200"
                )}
              >
                {prayer.time}
              </div>

              {/* Card Status Pill Badge */}
              <div className="mt-1.5 flex items-center justify-center relative z-10">
                {isCurrentActive ? (
                  <span className="text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-yellow-400 text-slate-950 shadow-sm animate-pulse">
                    Waktunya
                  </span>
                ) : isNext ? (
                  <span className="text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-extrabold shadow-sm">
                    Berikutnya
                  </span>
                ) : isPassed ? (
                  <span className="text-[8px] sm:text-[8.5px] font-semibold text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-700/60">
                    Lewat
                  </span>
                ) : (
                  <span className="text-[8px] sm:text-[8.5px] font-semibold text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    Mendatang
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── 4. PANEL INFORMASI WAKTU TAMBAHAN (Imsak, Terbit, Dhuha & Jam WIB) ─── */}
      <div className="mt-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#041D22] via-[#092E36] to-[#041D22] text-white border border-teal-800/50 shadow-inner px-4 py-2 sm:py-2.5 flex items-center justify-between relative overflow-hidden text-[9px] sm:text-[10px] font-semibold">
        {/* Subtle Islamic Corner Geometric Ornaments */}
        <IslamicCornerPattern className="absolute top-0 left-0 w-8 h-8" />
        <IslamicCornerPattern className="absolute bottom-0 right-0 w-8 h-8 rotate-180" />

        {/* Left Timing Stats (Imsak, Terbit, Dhuha) */}
        <div className="flex items-center gap-3 sm:gap-4 relative z-10">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-teal-300 shrink-0" />
            <span className="text-teal-200/80">Imsak</span>
            <strong className="font-mono text-white font-bold">{timings.Imsak}</strong>
          </div>
          <span className="text-teal-700">|</span>
          <div className="flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-teal-200/80">Terbit</span>
            <strong className="font-mono text-white font-bold">{timings.Sunrise}</strong>
          </div>
          <span className="text-teal-700">|</span>
          <div className="flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-amber-200 shrink-0" />
            <span className="text-teal-200/80">Dhuha</span>
            <strong className="font-mono text-white font-bold">{timings.Dhuha || "06:05"}</strong>
          </div>
        </div>

        {/* Right Real-time Clock (WIB) */}
        <div className="flex items-center gap-1.5 font-mono font-bold text-white relative z-10 shrink-0">
          <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] sm:text-xs tracking-tight">{timeString} WIB</span>
        </div>
      </div>
    </div>
  )
}
