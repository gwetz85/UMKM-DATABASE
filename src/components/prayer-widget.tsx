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
  CheckCircle2, 
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

  // Fetch Prayer Times from Kemenag API (Aladhan method=20)
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
          // ignore error
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
      // ignore audio restriction
    }
  }, [soundEnabled])

  // 5 Main Prayers
  const fivePrayers = useMemo(() => {
    return [
      { id: "fajr", name: "Subuh", time: timings.Fajr, icon: Sunrise },
      { id: "dhuhr", name: "Dzuhur", time: timings.Dhuhr, icon: Sun },
      { id: "asr", name: "Ashar", time: timings.Asr, icon: SunMedium },
      { id: "maghrib", name: "Maghrib", time: timings.Maghrib, icon: Sunset },
      { id: "isha", name: "Isya", time: timings.Isha, icon: Moon }
    ]
  }, [timings])

  // Active / Entered Prayer and Next Prayer calculations
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
        "w-full bg-white dark:bg-[#0B132B] rounded-[28px] border border-slate-100 dark:border-slate-800 p-3.5 sm:p-4 shadow-sm flex flex-col justify-between transition-all duration-300 relative group overflow-hidden",
        className
      )}
    >
      {/* Subtle Dynamic Ambient Background Glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 blur-2xl pointer-events-none" />

      {/* ─── 1. HEADER (Countdown menggantikan info tanggal) ─── */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight">
                Jadwal Waktu Sholat
              </h3>
              <span className="relative flex h-1.5 w-1.5" title="Waktu Sholat Realtime">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
            </div>
            <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 tracking-tight block mt-0.5">
              {CITY_NAME}, Kepri • Kemenag RI
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 🌟 COUNTDOWN WAKTU SHOLAT SELANJUTNYA (MENGGANTIKAN INFO TANGGAL) */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10px] sm:text-[11px] font-bold shadow-2xs"
            title={`Hitung mundur menuju Sholat ${calculation.nextPrayer.name} (${calculation.nextPrayer.time} WIB)`}
          >
            <Hourglass className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-pulse shrink-0" />
            <span className="text-slate-600 dark:text-slate-300 font-semibold text-[9.5px] sm:text-[10px]">
              {calculation.isNextTomorrow ? "Subuh Besok" : calculation.nextPrayer.name}:
            </span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
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
            title={soundEnabled ? "Pengingat suara aktif" : "Aktifkan pengingat suara"}
            className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center transition-all border shadow-2xs",
              soundEnabled
                ? "bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700"
                : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 hover:text-slate-600"
            )}
          >
            {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchTimings(true)}
            disabled={isRefreshing}
            title="Perbarui Jadwal"
            className="w-6 h-6 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-all shadow-2xs active:scale-95"
          >
            <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin text-emerald-500")} />
          </button>
        </div>
      </div>

      {/* ─── 2. INFO MASUK WAKTU SHOLAT BANNER (Tampil khusus saat masuk waktu) ─── */}
      {calculation.activeEnteredPrayer && (
        <div className="my-2 p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-sm flex items-center justify-between gap-2 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0 border border-white/30 animate-pulse">
              <BellRing className="w-3.5 h-3.5 text-yellow-300" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                <span className="text-[8.5px] font-black uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded-md border border-white/20">
                  Masuk Waktu
                </span>
                <span className="text-xs font-black tracking-tight drop-shadow-sm">
                  Sholat {calculation.activeEnteredPrayer.name} ({calculation.activeEnteredPrayer.time} WIB)
                </span>
              </div>
              <span className="text-[9.5px] text-emerald-100 font-medium truncate block mt-0.5">
                Waktunya menunaikan sholat untuk wilayah Kota Tanjungpinang.
              </span>
            </div>
          </div>

          <span className="shrink-0 px-2 py-0.5 rounded bg-yellow-400 text-slate-900 text-[8.5px] font-black uppercase tracking-wide">
            Adzan
          </span>
        </div>
      )}

      {/* ─── 3. DISPLAY 5 WAKTU SHOLAT ─── */}
      <div className={cn("grid grid-cols-5 gap-1.5", !calculation.activeEnteredPrayer && "my-2")}>
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
                "p-2 rounded-xl border transition-all flex flex-col justify-between text-center relative group/card",
                isCurrentActive
                  ? "bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-500 ring-1 ring-emerald-500/30 shadow-2xs"
                  : isNext
                  ? "bg-sky-50/80 dark:bg-sky-950/40 border-sky-300 dark:border-sky-600 shadow-2xs"
                  : isPassed
                  ? "bg-slate-50/60 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/80 opacity-65"
                  : "bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-slate-200"
              )}
            >
              {/* Header: Icon + Name */}
              <div className="flex items-center justify-center gap-1 mb-1">
                <IconComp
                  className={cn(
                    "w-3 h-3",
                    isCurrentActive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isNext
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-slate-400"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] sm:text-[11px] font-black truncate",
                    isCurrentActive
                      ? "text-emerald-700 dark:text-emerald-300"
                      : isNext
                      ? "text-sky-700 dark:text-sky-300"
                      : "text-slate-700 dark:text-slate-300"
                  )}
                >
                  {prayer.name}
                </span>
              </div>

              {/* Time */}
              <span
                className={cn(
                  "font-mono text-xs sm:text-[13px] font-black leading-tight tracking-tight",
                  isCurrentActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isNext
                    ? "text-sky-600 dark:text-sky-400"
                    : "text-slate-800 dark:text-slate-200"
                )}
              >
                {prayer.time}
              </span>

              {/* Status Mini Pill */}
              <div className="mt-1 flex items-center justify-center">
                {isCurrentActive ? (
                  <span className="text-[7.5px] font-black uppercase px-1 rounded bg-emerald-500 text-white animate-pulse">
                    Waktunya
                  </span>
                ) : isNext ? (
                  <span className="text-[7.5px] font-black uppercase px-1 rounded bg-sky-500 text-white">
                    Berikutnya
                  </span>
                ) : isPassed ? (
                  <span className="text-[7.5px] font-semibold text-slate-400">
                    Lewat
                  </span>
                ) : (
                  <span className="text-[7.5px] font-semibold text-slate-400">
                    Mendatang
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── 4. FOOTER (Ultra Compact Single Line) ─── */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[8px] sm:text-[9px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
        <div className="flex items-center gap-2">
          <span>
            Imsak: <strong className="font-mono text-slate-700 dark:text-slate-300">{timings.Imsak}</strong>
          </span>
          <span>•</span>
          <span>
            Terbit: <strong className="font-mono text-slate-700 dark:text-slate-300">{timings.Sunrise}</strong>
          </span>
          <span>•</span>
          <span>
            Dhuha: <strong className="font-mono text-slate-700 dark:text-slate-300">{timings.Dhuha || "06:05"}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1 font-mono text-slate-600 dark:text-slate-300 font-bold">
          <Clock className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
          <span>{timeString} WIB</span>
        </div>
      </div>
    </div>
  )
}
