"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { 
  Clock, 
  MapPin, 
  Compass, 
  Sunrise, 
  Sun, 
  SunMedium, 
  Sunset, 
  Moon, 
  BellRing, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Hourglass
} from "lucide-react"
import { cn } from "@/lib/utils"

// Tanjungpinang, Kepulauan Riau Coordinates
const LATITUDE = 0.9186
const LONGITUDE = 104.4586
const CITY_NAME = "Tanjungpinang"
const PROVINCE = "Kepulauan Riau"
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

// Default fallback timings for Tanjungpinang (Kemenag standard approximation)
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
  
  // Equation of time & solar declination
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B) // minutes
  const declination = 23.45 * Math.sin(B) * (Math.PI / 180) // radians
  
  const rad = Math.PI / 180
  const deg = 180 / Math.PI
  const latRad = LATITUDE * rad
  
  // Solar Noon
  const solarNoon = 12 + (TIMEZONE * 15 - LONGITUDE) / 15 - (EoT / 60)
  
  // Dhuhr (solar noon + 2 min ihtiyat)
  const dhuhr = solarNoon + (2 / 60)
  
  const hourAngle = (angle: number) => {
    const cosHA = (Math.sin(angle * rad) - Math.sin(latRad) * Math.sin(declination)) / 
                  (Math.cos(latRad) * Math.cos(declination))
    if (cosHA > 1 || cosHA < -1) return 0
    return (Math.acos(cosHA) * deg) / 15
  }
  
  // Fajr: Sun altitude -20° (Kemenag RI standard)
  const fajrHA = hourAngle(-20)
  const fajr = solarNoon - fajrHA
  
  // Sunrise: Sun altitude -0.833°
  const sunriseHA = hourAngle(-0.833)
  const sunrise = solarNoon - sunriseHA
  
  // Asr: Shafi'i shadow factor 1
  const asrAltitude = Math.atan(1 / (1 + Math.tan(Math.abs(latRad - declination)))) * deg
  const asrHA = hourAngle(asrAltitude)
  const asr = solarNoon + asrHA
  
  // Maghrib: Sun altitude -0.833° + 2 min ihtiyat
  const maghrib = solarNoon + sunriseHA + (2 / 60)
  
  // Isha: Sun altitude -18° (Kemenag RI standard)
  const ishaHA = hourAngle(-18)
  const isha = solarNoon + ishaHA + (2 / 60)
  
  // Imsak: 10 mins before Fajr
  const imsak = fajr - (10 / 60)
  
  // Dhuha: ~20 mins after sunrise
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

// Format Hijri Date
function getFallbackHijriDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat("id-ID-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date)
  } catch {
    return "18 Jumadilawal 1448 H"
  }
}

interface PrayerWidgetProps {
  className?: string
}

export function PrayerWidget({ className }: PrayerWidgetProps) {
  const [timings, setTimings] = useState<PrayerTimings>(DEFAULT_TIMINGS)
  const [hijriDate, setHijriDate] = useState<string>("18 Jumadilawal 1448 H")
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState<boolean>(true)
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

  // Fetch Prayer Times from Kemenag API (Aladhan method=20) with localStorage caching
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
            if (parsed.hijri) setHijriDate(parsed.hijri)
            setIsLoading(false)
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
        
        let hijriStr = getFallbackHijriDate(new Date())
        if (json.data.date?.hijri) {
          const h = json.data.date.hijri
          const monthName = h.month?.en || "Jumadilawal"
          hijriStr = `${h.day} ${monthName} ${h.year} H`
        }

        setTimings(cleanTimings)
        setHijriDate(hijriStr)

        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ timings: cleanTimings, hijri: hijriStr })
          )
        } catch {
          // ignore localStorage error
        }
      } else {
        throw new Error("Format respon API tidak valid")
      }
    } catch (err) {
      console.warn("Using offline astronomical calculation fallback:", err)
      const fallback = calculateLocalPrayerTimes(new Date())
      setTimings(fallback)
      setHijriDate(getFallbackHijriDate(new Date()))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchTimings()
  }, [fetchTimings])

  // Play gentle chime tone when prayer time enters
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

      // Gentle Islamic chime melody
      playTone(523.25, 0, 0.6)   // C5
      playTone(659.25, 0.4, 0.6) // E5
      playTone(783.99, 0.8, 1.2) // G5
    } catch {
      // ignore audio restriction
    }
  }, [soundEnabled])

  // 5 Main Waktu Sholat definitions
  const fivePrayers = useMemo(() => {
    return [
      {
        id: "fajr",
        name: "Subuh",
        time: timings.Fajr,
        icon: Sunrise,
        description: "Fajar Shiddiq",
        gradient: "from-indigo-500/10 to-sky-500/10 dark:from-indigo-950/40 dark:to-sky-950/30",
        borderActive: "border-indigo-400 dark:border-indigo-500",
        badgeColor: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
      },
      {
        id: "dhuhr",
        name: "Dzuhur",
        time: timings.Dhuhr,
        icon: Sun,
        description: "Matahari Tergelincir",
        gradient: "from-amber-500/10 to-yellow-500/10 dark:from-amber-950/40 dark:to-yellow-950/30",
        borderActive: "border-amber-400 dark:border-amber-500",
        badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
      },
      {
        id: "asr",
        name: "Ashar",
        time: timings.Asr,
        icon: SunMedium,
        description: "Bayangan Memanjang",
        gradient: "from-orange-500/10 to-amber-500/10 dark:from-orange-950/40 dark:to-amber-950/30",
        borderActive: "border-orange-400 dark:border-orange-500",
        badgeColor: "bg-orange-50 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
      },
      {
        id: "maghrib",
        name: "Maghrib",
        time: timings.Maghrib,
        icon: Sunset,
        description: "Matahari Terbenam",
        gradient: "from-rose-500/10 to-purple-500/10 dark:from-rose-950/40 dark:to-purple-950/30",
        borderActive: "border-rose-400 dark:border-rose-500",
        badgeColor: "bg-rose-50 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
      },
      {
        id: "isha",
        name: "Isya",
        time: timings.Isha,
        icon: Moon,
        description: "Malam Gelap",
        gradient: "from-violet-500/10 to-indigo-500/10 dark:from-violet-950/40 dark:to-indigo-950/30",
        borderActive: "border-violet-400 dark:border-violet-500",
        badgeColor: "bg-violet-50 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
      }
    ]
  }, [timings])

  // Calculation of Active Prayer (sudah masuk waktu sholat) & Next Prayer with Countdown
  const calculation = useMemo(() => {
    const now = currentTime
    const prayerDates = fivePrayers.map((p) => {
      const [h, m] = p.time.split(":").map(Number)
      const d = new Date(now)
      d.setHours(h, m, 0, 0)
      return {
        ...p,
        date: d
      }
    })

    // 1. Check if actively in "Sudah Masuk Waktu Sholat" window (e.g. within 25 minutes after adzan)
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

    // 2. Determine Next Prayer
    let next = prayerDates.find((p) => p.date.getTime() > now.getTime())
    let isNextTomorrow = false

    if (!next) {
      // If all today's prayers have passed, next is tomorrow's Subuh
      const [h, m] = timings.Fajr.split(":").map(Number)
      const tmrw = new Date(now)
      tmrw.setDate(tmrw.getDate() + 1)
      tmrw.setHours(h, m, 0, 0)
      next = {
        ...fivePrayers[0],
        date: tmrw
      }
      isNextTomorrow = true
    }

    // 3. Countdown calculations
    const remainingMs = Math.max(0, next.date.getTime() - now.getTime())
    const totalSec = Math.floor(remainingMs / 1000)
    const hours = Math.floor(totalSec / 3600)
    const minutes = Math.floor((totalSec % 3600) / 60)
    const seconds = totalSec % 60

    const formattedCountdown = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

    return {
      activeEnteredPrayer: currentEnteredPrayer,
      nextPrayer: next,
      isNextTomorrow,
      remainingSec: totalSec,
      hours,
      minutes,
      seconds,
      formattedCountdown,
      prayerDates
    }
  }, [currentTime, fivePrayers, timings.Fajr])

  // Trigger sound when entering prayer time
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

  // Formatted Current Time String: HH:mm:ss WIB
  const timeString = useMemo(() => {
    const h = String(currentTime.getHours()).padStart(2, "0")
    const m = String(currentTime.getMinutes()).padStart(2, "0")
    const s = String(currentTime.getSeconds()).padStart(2, "0")
    return `${h}:${m}:${s}`
  }, [currentTime])

  const dateStringMasehi = useMemo(() => {
    return currentTime.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  }, [currentTime])

  return (
    <div
      className={cn(
        "rounded-[28px] bg-white dark:bg-[#0B132B] border border-slate-100 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-all duration-300 relative group overflow-hidden min-h-[260px]",
        className
      )}
    >
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-teal-500/10 dark:bg-teal-400/10 blur-3xl pointer-events-none" />

      <div>
        {/* ─── 1. HEADER: IDENTITAS WILAYAH & REALTIME TIME ─── */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Compass className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-tight">
                  Jadwal Waktu Sholat
                </h3>
                <span className="relative flex h-2 w-2" title="Waktu Sholat Realtime Aktif">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-tight">
                  {CITY_NAME}, {PROVINCE} • Kemenag RI
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Hijri Date Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px] font-bold shadow-2xs">
              <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>{hijriDate}</span>
            </div>

            {/* Audio chime toggle */}
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
                  : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchTimings(true)}
              disabled={isRefreshing}
              title="Sinkronkan ulang data jadwal sholat hari ini"
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-all shadow-2xs active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-emerald-500")} />
            </button>
          </div>
        </div>

        {/* ─── 2. INFO MASUK WAKTU SHOLAT BANNER (Jika sedang masuk waktu) ─── */}
        {calculation.activeEnteredPrayer && (
          <div className="mt-3.5 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/20 animate-in fade-in slide-in-from-top-2 duration-300 relative overflow-hidden">
            {/* Sparkle decorative effect */}
            <div className="absolute right-2 -bottom-2 opacity-15 pointer-events-none">
              <Sparkles className="w-20 h-20 text-white" />
            </div>

            <div className="flex items-center justify-between relative z-10 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 animate-pulse">
                  <BellRing className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full border border-white/25">
                      Sudah Masuk Waktu
                    </span>
                    <span className="text-xs sm:text-sm font-black tracking-tight drop-shadow-sm">
                      Sholat {calculation.activeEnteredPrayer.name} ({calculation.activeEnteredPrayer.time} WIB)
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-emerald-50/90 font-medium leading-tight mt-0.5">
                    Mari tunaikan ibadah Sholat {calculation.activeEnteredPrayer.name} untuk wilayah Kota Tanjungpinang & sekitarnya.
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="px-2.5 py-1 rounded-full bg-yellow-400 text-slate-900 text-[10px] font-black uppercase tracking-wide shadow-sm inline-block">
                  Waktu Adzan
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ─── 3. COUNTDOWN KE WAKTU SHOLAT TERDEKAT ─── */}
        <div className="mt-3.5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-slate-50/80 to-emerald-50/30 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-emerald-950/20 border border-slate-200/80 dark:border-slate-800 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Target Prayer Info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  {calculation.isNextTomorrow ? "Sholat Subuh Esok Hari" : "Waktu Sholat Terdekat"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {calculation.nextPrayer.name} • {calculation.nextPrayer.time} WIB
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">
                  Menuju Adzan {calculation.nextPrayer.name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  (Pukul {calculation.nextPrayer.time} WIB)
                </span>
              </div>
            </div>

            {/* Live Countdown Clock Digital */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-2xs">
              <Hourglass className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse shrink-0" />
              <div className="flex items-center font-mono">
                {/* Hours */}
                <div className="flex flex-col items-center">
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-none">
                    {String(calculation.hours).padStart(2, "0")}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                    Jam
                  </span>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-black text-base px-1 leading-none -mt-2">
                  :
                </span>
                {/* Minutes */}
                <div className="flex flex-col items-center">
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-none">
                    {String(calculation.minutes).padStart(2, "0")}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                    Menit
                  </span>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-black text-base px-1 leading-none -mt-2">
                  :
                </span>
                {/* Seconds */}
                <div className="flex flex-col items-center">
                  <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">
                    {String(calculation.seconds).padStart(2, "0")}
                  </span>
                  <span className="text-[8px] font-bold text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-tighter mt-0.5">
                    Detik
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 4. DISPLAY 5 WAKTU SHOLAT ─── */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Jadwal Sholat 5 Waktu Hari Ini
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              Waktu Lokal: <strong className="font-mono text-slate-800 dark:text-slate-200">{timeString} WIB</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {fivePrayers.map((prayer) => {
              const IconComp = prayer.icon
              const isNext = calculation.nextPrayer.id === prayer.id && !calculation.isNextTomorrow
              const isCurrentActive = calculation.activeEnteredPrayer?.id === prayer.id
              
              // Check if passed
              const [h, m] = prayer.time.split(":").map(Number)
              const pDate = new Date(currentTime)
              pDate.setHours(h, m, 0, 0)
              const isPassed = currentTime.getTime() > pDate.getTime() + (25 * 60 * 1000)

              return (
                <div
                  key={prayer.id}
                  className={cn(
                    "p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 relative flex flex-col justify-between group/card",
                    isCurrentActive
                      ? "bg-gradient-to-b from-emerald-50 to-teal-50/60 dark:from-emerald-950/60 dark:to-teal-950/40 border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                      : isNext
                      ? "bg-gradient-to-b from-sky-50 to-slate-50 dark:from-sky-950/50 dark:to-slate-800/80 border-sky-300 dark:border-sky-600 shadow-2xs"
                      : isPassed
                      ? "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-75"
                      : "bg-white dark:bg-slate-800/70 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
                  )}
                >
                  {/* Top: Icon + Status Pill */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover/card:scale-110",
                        isCurrentActive
                          ? "bg-emerald-500 text-white"
                          : isNext
                          ? "bg-sky-500 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                    </div>

                    {isCurrentActive ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase bg-emerald-500 text-white animate-pulse">
                        Waktunya
                      </span>
                    ) : isNext ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase bg-sky-500 text-white">
                        Berikutnya
                      </span>
                    ) : isPassed ? (
                      <span className="flex items-center gap-0.5 text-[8.5px] font-bold text-slate-400">
                        <CheckCircle2 className="w-2.5 h-2.5 text-slate-400" />
                        Lewat
                      </span>
                    ) : (
                      <span className="text-[8.5px] font-bold text-slate-400">
                        Mendatang
                      </span>
                    )}
                  </div>

                  {/* Middle: Prayer Name */}
                  <div className="mt-0.5">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 block leading-tight">
                      {prayer.name}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 hidden sm:block truncate">
                      {prayer.description}
                    </span>
                  </div>

                  {/* Bottom: Time */}
                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-baseline justify-between">
                    <span
                      className={cn(
                        "font-mono text-sm sm:text-base font-black tracking-tight",
                        isCurrentActive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isNext
                          ? "text-sky-600 dark:text-sky-400"
                          : "text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {prayer.time}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 ml-0.5">
                      WIB
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── 5. EXTRA INFO FOOTER: IMSAK, TERBIT & DHUHA ─── */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 font-medium">
              <span className="text-slate-400">Imsak:</span>
              <strong className="font-mono font-bold text-slate-700 dark:text-slate-200">{timings.Imsak} WIB</strong>
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <div className="flex items-center gap-1 font-medium">
              <span className="text-slate-400">Terbit:</span>
              <strong className="font-mono font-bold text-slate-700 dark:text-slate-200">{timings.Sunrise} WIB</strong>
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <div className="flex items-center gap-1 font-medium">
              <span className="text-slate-400">Dhuha:</span>
              <strong className="font-mono font-bold text-slate-700 dark:text-slate-200">{timings.Dhuha || "06:05"} WIB</strong>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">
            <span>Zona Waktu: <strong>WIB (UTC+7)</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}
