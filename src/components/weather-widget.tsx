"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from "@/lib/utils"
import { 
  MapPin, 
  Droplets, 
  Wind, 
  Gauge, 
  Cloud, 
  CloudRain, 
  RefreshCw, 
  Thermometer, 
  Clock,
  Maximize2
} from 'lucide-react'
import { WeatherDetailDialog } from '@/components/weather-detail-dialog'

// Tanjungpinang, Kepulauan Riau coordinates & metadata
const LATITUDE = 0.9186
const LONGITUDE = 104.4586
const CITY_NAME = "TANJUNGPINANG"
const PROVINCE = "KEPULAUAN RIAU, INDONESIA"

export interface AirQualityData {
  aqi: number
  europeanAqi: number
  pm25: number
  pm10: number
  co?: number
  no2?: number
  so2?: number
  o3?: number
}

export interface AqiTier {
  level: number
  category: string
  label: string
  shortAdvice: string
  detailedAdvice: string
  color: string
  bgColor: string
  borderBadge: string
  badgeClass: string
  accentHex: string
}

export function getAqiTier(aqi: number): AqiTier {
  if (aqi <= 50) {
    return {
      level: 1,
      category: "BAIK",
      label: "Baik",
      shortAdvice: "Udara Bersih & Segar",
      detailedAdvice: "Kualitas udara sangat baik. Aman dan ideal untuk seluruh kegiatan luar ruangan.",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10 dark:bg-emerald-950/40",
      borderBadge: "border-emerald-500/30 dark:border-emerald-700/60",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      accentHex: "#10B981"
    }
  }
  if (aqi <= 100) {
    return {
      level: 2,
      category: "SEDANG",
      label: "Sedang",
      shortAdvice: "Kualitas Cukup Baik",
      detailedAdvice: "Kualitas udara dapat diterima. Sebagian besar orang dapat beraktivitas normal tanpa keluhan.",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10 dark:bg-amber-950/40",
      borderBadge: "border-amber-500/30 dark:border-amber-700/60",
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      accentHex: "#F59E0B"
    }
  }
  if (aqi <= 150) {
    return {
      level: 3,
      category: "SENSITIF",
      label: "Kurang Sehat",
      shortAdvice: "Sensitif: Gunakan Masker",
      detailedAdvice: "Kelompok sensitif (anak-anak, lansia, penderita asma/paru) dianjurkan memakai masker di luar.",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10 dark:bg-orange-950/40",
      borderBadge: "border-orange-500/30 dark:border-orange-700/60",
      badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
      accentHex: "#F97316"
    }
  }
  if (aqi <= 200) {
    return {
      level: 4,
      category: "TIDAK SEHAT",
      label: "Tidak Sehat",
      shortAdvice: "Kenakan Masker",
      detailedAdvice: "Udara tidak sehat. Seluruh warga disarankan memakai masker dan membatasi aktivitas fisik di luar ruangan.",
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-500/10 dark:bg-rose-950/40",
      borderBadge: "border-rose-500/30 dark:border-rose-700/60",
      badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
      accentHex: "#EF4444"
    }
  }
  return {
    level: 5,
    category: "BERBAHAYA",
    label: "Berbahaya",
    shortAdvice: "Hindari Luar Ruang",
    detailedAdvice: "Tingkat polusi berbahaya bagi seluruh populasi. Tetap di dalam ruangan dan tutup ventilasi.",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-500/15 dark:bg-purple-950/60",
    borderBadge: "border-purple-500/40 dark:border-purple-700/70",
    badgeClass: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40",
    accentHex: "#881337"
  }
}

interface WeatherData {
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  windDirection: number
  weatherCode: number
  isDay: boolean
  pressure: number
  cloudCover: number
  precipitation: number
  lastUpdated: Date
}

const DEFAULT_WEATHER: WeatherData = {
  temperature: 25,
  feelsLike: 30,
  humidity: 95,
  windSpeed: 7,
  windDirection: 90,
  weatherCode: 53,
  isDay: true,
  pressure: 1012,
  cloudCover: 91,
  precipitation: 0.2,
  lastUpdated: new Date(),
}

interface WeatherDescription {
  label: string
  icon: string
  color: string
}

function getWeatherDescription(code: number, isDay: boolean): WeatherDescription {
  const descriptions: Record<number, WeatherDescription> = {
    0: { label: "CERAH", icon: isDay ? "sunny" : "clear-night", color: "bg-emerald-500 text-white" },
    1: { label: "CERAH BERAWAN", icon: isDay ? "partly-cloudy" : "partly-cloudy-night", color: "bg-teal-500 text-white" },
    2: { label: "BERAWAN SEBAGIAN", icon: isDay ? "partly-cloudy" : "partly-cloudy-night", color: "bg-teal-600 text-white" },
    3: { label: "MENDUNG", icon: "cloudy", color: "bg-slate-600 text-white" },
    45: { label: "BERKABUT", icon: "foggy", color: "bg-slate-600 text-white" },
    48: { label: "KABUT TEBAL", icon: "foggy", color: "bg-slate-700 text-white" },
    51: { label: "GERIMIS RINGAN", icon: "drizzle", color: "bg-teal-600 text-white" },
    53: { label: "GERIMIS", icon: "drizzle", color: "bg-[#0D7465] text-white" },
    55: { label: "GERIMIS LEBAT", icon: "drizzle", color: "bg-[#0B6356] text-white" },
    61: { label: "HUJAN RINGAN", icon: "rainy", color: "bg-blue-600 text-white" },
    63: { label: "HUJAN SEDANG", icon: "rainy", color: "bg-blue-700 text-white" },
    65: { label: "HUJAN LEBAT", icon: "heavy-rain", color: "bg-blue-800 text-white" },
    80: { label: "HUJAN SINGKAT", icon: "rainy", color: "bg-blue-600 text-white" },
    81: { label: "HUJAN DERAS", icon: "rainy", color: "bg-blue-700 text-white" },
    82: { label: "HUJAN SANGAT DERAS", icon: "heavy-rain", color: "bg-blue-800 text-white" },
    95: { label: "BADAI PETIR", icon: "thunderstorm", color: "bg-amber-600 text-white" },
    96: { label: "BADAI PETIR", icon: "thunderstorm", color: "bg-amber-700 text-white" },
    99: { label: "BADAI PETIR HEBAT", icon: "thunderstorm", color: "bg-rose-700 text-white" },
  }
  return descriptions[code] || { 
    label: "BERAWAN", 
    icon: "cloudy", 
    color: "bg-teal-600 text-white" 
  }
}

function getWindDirectionLabel(deg: number): string {
  const dirs = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"]
  const idx = Math.round(deg / 45) % 8
  return dirs[idx]
}

function MosqueEmblem({ className }: { className?: string }) {
  return (
    <div className={cn("w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-gradient-to-br from-[#065F46] to-[#047857] flex items-center justify-center text-white shadow-sm shrink-0 border border-emerald-400/30", className)}>
      <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 C8 6, 8 10, 12 10 C16 10, 16 6, 12 2 Z" fill="currentColor" fillOpacity="0.2" />
        <path d="M12 2 L12 4" strokeWidth="2" />
        <rect x="5" y="10" width="14" height="11" rx="1.5" />
        <path d="M10 21 V15 C10 13.9 10.9 13 12 13 C13.1 13 14 13.9 14 15 V21" fill="currentColor" fillOpacity="0.3" />
        <path d="M3 21 V9 L4 7 L5 9 V21" />
        <path d="M19 21 V9 L20 7 L21 9 V21" />
      </svg>
    </div>
  )
}

function IslamicCornerPattern({ className }: { className?: string }) {
  return (
    <svg 
      className={cn("pointer-events-none opacity-40 select-none", className)} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 0 L100 0 L100 15 L15 15 L15 100 L0 100 Z" fill="url(#goldGradWeather)" opacity="0.4" />
      <path d="M20 20 L80 20 L80 30 L30 30 L30 80 L20 80 Z" stroke="url(#goldGradWeather)" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="16" stroke="url(#goldGradWeather)" strokeWidth="1" strokeDasharray="3 3" />
      <polygon points="50,38 54,46 62,50 54,54 50,62 46,54 38,50 46,46" fill="url(#goldGradWeather)" opacity="0.6" />
      <defs>
        <linearGradient id="goldGradWeather" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function MosqueArchWatermark({ className }: { className?: string }) {
  return (
    <svg className={cn("absolute bottom-0 right-0 w-14 h-14 pointer-events-none opacity-[0.06] select-none", className)} viewBox="0 0 100 100" fill="currentColor">
      <path d="M10 100 V40 C10 15, 50 5, 50 5 C50 5, 90 15, 90 40 V100 Z" />
      <path d="M30 100 V60 C30 45, 50 35, 50 35 C50 35, 70 45, 70 60 V100 Z" />
    </svg>
  )
}

function HeroWeatherIcon({ code, className }: { code: number; className?: string }) {
  return (
    <div className={cn("relative w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center shrink-0", className)}>
      <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-[#083038] border border-amber-300/40 shadow-inner flex items-center justify-center" />
      <svg className="w-7 h-7 sm:w-8.5 sm:h-8.5 relative z-10 text-white" viewBox="0 0 64 64" fill="none">
        <path 
          d="M20 40 C15 40 12 36 12 31 C12 26 16 23 21 23 C22 17 28 14 34 16 C39 12 47 14 49 20 C54 21 57 25 57 30 C57 35 53 40 47 40 Z" 
          fill="#FFFFFF" 
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
        />
        <line x1="22" y1="45" x2="19" y2="52" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="30" y1="45" x2="27" y2="52" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="38" y1="45" x2="35" y2="52" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="46" y1="45" x2="43" y2="52" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

interface WeatherWidgetProps {
  className?: string
}

export function WeatherWidget({ className }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData>(DEFAULT_WEATHER)
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [nextUpdate, setNextUpdate] = useState(300)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchWeather = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true)

    const cacheKey = 'tpi_weather_v2'
    const aqiCacheKey = 'tpi_aqi_v2'

    if (!isManualRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey)
        const cachedAqi = localStorage.getItem(aqiCacheKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          const cacheAge = Date.now() - new Date(parsed.lastUpdated).getTime()
          if (cacheAge < 10 * 60 * 1000) {
            setWeather({ ...parsed, lastUpdated: new Date(parsed.lastUpdated) })
            if (cachedAqi) setAirQuality(JSON.parse(cachedAqi))
            setIsLoading(false)
            return
          }
        }
      } catch {
        // ignore cache error
      }
    }

    try {
      const [weatherRes, aqiRes] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover,is_day&timezone=Asia%2FJakarta`
        ),
        fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=Asia%2FJakarta`
        ).catch(() => null)
      ])

      if (!weatherRes.ok) throw new Error("Gagal mengambil data cuaca")
      const weatherJson = await weatherRes.json()

      const cur = weatherJson.current
      const newWeather: WeatherData = {
        temperature: Math.round(cur.temperature_2m),
        feelsLike: Math.round(cur.apparent_temperature),
        humidity: cur.relative_humidity_2m,
        windSpeed: Math.round(cur.wind_speed_10m),
        windDirection: cur.wind_direction_10m,
        weatherCode: cur.weather_code,
        isDay: cur.is_day === 1,
        pressure: Math.round(cur.surface_pressure),
        cloudCover: cur.cloud_cover,
        precipitation: cur.precipitation,
        lastUpdated: new Date(),
      }

      setWeather(newWeather)

      if (aqiRes && aqiRes.ok) {
        const aqiJson = await aqiRes.json()
        const aqiCur = aqiJson.current
        const newAqi: AirQualityData = {
          aqi: aqiCur.us_aqi ?? 55,
          europeanAqi: aqiCur.european_aqi ?? 25,
          pm25: Math.round((aqiCur.pm2_5 ?? 11.5) * 10) / 10,
          pm10: Math.round((aqiCur.pm10 ?? 20) * 10) / 10,
          co: aqiCur.carbon_monoxide,
          no2: aqiCur.nitrogen_dioxide,
          so2: aqiCur.sulphur_dioxide,
          o3: aqiCur.ozone,
        }
        setAirQuality(newAqi)
        try { localStorage.setItem(aqiCacheKey, JSON.stringify(newAqi)) } catch {}
      }

      try { localStorage.setItem(cacheKey, JSON.stringify(newWeather)) } catch {}
      setNextUpdate(300)
    } catch {
      // Keep smooth UI
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchWeather()
  }, [fetchWeather])

  useEffect(() => {
    const timer = setInterval(() => {
      setNextUpdate(prev => (prev <= 0 ? 300 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const aqiValue = airQuality?.aqi ?? 73
  const tier = getAqiTier(aqiValue)
  const desc = getWeatherDescription(weather.weatherCode, weather.isDay)
  const windDir = getWindDirectionLabel(weather.windDirection)
  const updateMin = Math.floor(nextUpdate / 60)
  const updateSec = nextUpdate % 60
  const meterPos = Math.min(Math.max((aqiValue / 300) * 100, 4), 96)

  const timeString = useMemo(() => {
    const h = String(currentTime.getHours()).padStart(2, "0")
    const m = String(currentTime.getMinutes()).padStart(2, "0")
    const s = String(currentTime.getSeconds()).padStart(2, "0")
    return `${h}:${m}:${s}`
  }, [currentTime])

  return (
    <>
    <div
      className={cn(
        "w-full bg-white dark:bg-[#07161A] rounded-[24px] sm:rounded-[28px] border border-slate-200/90 dark:border-slate-800 px-3.5 sm:px-4 py-3 sm:py-3.5 shadow-sm flex flex-col justify-between transition-all duration-300 relative group overflow-hidden",
        className
      )}
    >
      {/* ─── 1. HEADER (Compact & Elegant) ─── */}
      <div className="flex items-center justify-between pb-2 sm:pb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <MosqueEmblem />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight leading-tight">
                {CITY_NAME}
              </h3>
              <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                Pusat Pemerintahan
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
              <span>{PROVINCE} • REALTIME MONITORING</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Detail Cuaca Button */}
          <button
            onClick={() => setIsDetailOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 transition-all shadow-2xs group-hover:border-primary/50"
            title="Klik untuk membuka jendela detail cuaca"
          >
            <Maximize2 className="w-2.5 h-2.5 text-primary" />
            <span>DETAIL CUACA</span>
          </button>

          {/* Next Update Beacon */}
          <div 
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] sm:text-xs font-bold shadow-2xs"
            title="Waktu hingga sinkronisasi otomatis berikutnya"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
            </span>
            <span className="font-mono font-black tracking-tight">
              {updateMin}:{String(updateSec).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 2. AREA UTAMA INFORMASI CUACA (Hero Pemandangan Masjid Pesisir & Arch Mihrab) ─── */}
      <div className="my-1.5 sm:my-2 rounded-[18px] sm:rounded-[20px] overflow-hidden relative shadow-sm border border-slate-200/80 dark:border-slate-800 min-h-[135px] sm:min-h-[145px] flex items-center">
        {/* Background Photograph */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{
            backgroundImage: "url('/images/weather-hero-mosque.jpg'), url('/images/prayer-hero-mosque.jpg')",
            backgroundPosition: "center right"
          }}
        />

        {/* Cinematic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#041D22]/95 via-[#082E36]/75 to-transparent pointer-events-none" />

        {/* Content Inside Hero Banner */}
        <div className="relative z-10 w-full h-full p-2.5 sm:p-3.5 flex items-center justify-between gap-3">
          {/* Islamic Mihrab Arch Box */}
          <div className="relative rounded-t-[36px] rounded-b-xl border-t-2 border-x-2 border-amber-300/40 bg-gradient-to-r from-[#092B32]/95 via-[#051C20]/95 to-[#031114]/98 backdrop-blur-md shadow-xl p-2.5 sm:p-3.5 flex items-center gap-3 shrink-0">
            {/* Weather Condition Icon */}
            <HeroWeatherIcon code={weather.weatherCode} />

            {/* Temperature & Description */}
            <div className="flex flex-col">
              <div className="flex items-baseline">
                <span className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none drop-shadow-md">
                  {weather.temperature}
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-300 ml-0.5 leading-none">
                  °C
                </span>
              </div>
              <div className="mt-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-[#0D7465] text-white shadow-sm border border-emerald-400/30">
                  {desc.label}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-10 bg-white/20 mx-0.5" />

            {/* Feels Like & Rain Intensity */}
            <div className="hidden sm:flex flex-col justify-center gap-1 text-left text-[11px] font-bold text-white/90">
              <div className="flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Terasa {weather.feelsLike}°C</span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-300">
                <CloudRain className="w-3.5 h-3.5 shrink-0" />
                <span>Curah Hujan {weather.precipitation} mm</span>
              </div>
            </div>
          </div>

          {/* Right Spacer */}
          <div className="w-6 sm:w-12 shrink-0" />
        </div>
      </div>

      {/* ─── 3. PANEL KUALITAS UDARA (Compact Banner) ─── */}
      <div className="my-1.5 rounded-xl bg-gradient-to-r from-amber-50/90 via-white to-amber-50/90 dark:from-[#0A2328] dark:via-[#0E2D33] dark:to-[#0A2328] border border-amber-200/80 dark:border-teal-700/50 p-2 sm:p-2.5 shadow-2xs flex items-center justify-between gap-2.5 relative overflow-hidden">
        {/* Left: Wind/Air Emblem + AQI Category */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7.5 h-7.5 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Wind className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                UDARA {tier.category}
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                AQI {aqiValue}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5">
              PM2.5: {airQuality?.pm25 ?? 10.7} µg/m³ • {tier.shortAdvice}
            </span>
          </div>
        </div>

        {/* Right: Live Spectrum Meter Bar */}
        <div className="hidden sm:flex flex-col items-end shrink-0 pl-1.5">
          <span className="text-[8.5px] font-black uppercase tracking-wider mb-0.5" style={{ color: tier.accentHex }}>
            • {tier.label}
          </span>
          <div className="w-20 sm:w-28 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/60 relative overflow-hidden shadow-inner">
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(to right, #10B981, #F59E0B, #F97316, #EF4444, #881337)'
              }}
            />
            <div 
              className="absolute -top-0.5 w-2 h-2.5 -translate-x-1/2 rounded-full border border-white dark:border-slate-900 shadow-sm"
              style={{ 
                left: `${meterPos}%`,
                backgroundColor: tier.accentHex 
              }}
            />
          </div>
        </div>
      </div>

      {/* ─── 4. KARTU PARAMETER CUACA (4 Kartu Sejajar Compact) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 my-1.5">
        {/* Kelembaban */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 shadow-2xs flex items-center gap-2 relative overflow-hidden group/card hover:border-sky-300 dark:hover:border-sky-700 transition-all">
          <MosqueArchWatermark className="opacity-[0.04]" />
          <div className="w-7.5 h-7.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20 shadow-2xs">
            <Droplets className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
              {weather.humidity}%
            </span>
            <span className="text-[7.5px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              KELEMBABAN
            </span>
          </div>
        </div>

        {/* Angin */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 shadow-2xs flex items-center gap-2 relative overflow-hidden group/card hover:border-teal-300 dark:hover:border-teal-700 transition-all">
          <MosqueArchWatermark className="opacity-[0.04]" />
          <div className="w-7.5 h-7.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20 shadow-2xs">
            <Wind className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate">
              {weather.windSpeed} km/h <span className="text-[8px] font-bold text-teal-600 dark:text-teal-400">({windDir})</span>
            </span>
            <span className="text-[7.5px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              ANGIN
            </span>
          </div>
        </div>

        {/* Tekanan Udara */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 shadow-2xs flex items-center gap-2 relative overflow-hidden group/card hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
          <MosqueArchWatermark className="opacity-[0.04]" />
          <div className="w-7.5 h-7.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-2xs">
            <Gauge className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
              {weather.pressure} hPa
            </span>
            <span className="text-[7.5px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              TEKANAN
            </span>
          </div>
        </div>

        {/* Awan */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 shadow-2xs flex items-center gap-2 relative overflow-hidden group/card hover:border-slate-400 dark:hover:border-slate-600 transition-all">
          <MosqueArchWatermark className="opacity-[0.04]" />
          <div className="w-7.5 h-7.5 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 border border-slate-500/20 shadow-2xs">
            <Cloud className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
              {weather.cloudCover}%
            </span>
            <span className="text-[7.5px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              AWAN
            </span>
          </div>
        </div>
      </div>

      {/* ─── 5. FOOTER (Compact Single Line) ─── */}
      <div className="mt-1.5 rounded-xl bg-gradient-to-r from-[#041D22] via-[#092E36] to-[#041D22] text-white border border-teal-800/50 shadow-inner px-3 sm:px-3.5 py-1.5 sm:py-2 flex items-center justify-between relative overflow-hidden text-[8.5px] sm:text-[9.5px] font-semibold">
        <IslamicCornerPattern className="absolute top-0 left-0 w-6 h-6" />
        <IslamicCornerPattern className="absolute bottom-0 right-0 w-6 h-6 rotate-180" />

        {/* Left Side: Stasiun & Realtime Clock */}
        <div className="flex items-center gap-2 sm:gap-2.5 relative z-10">
          <div className="flex items-center gap-1 font-bold">
            <div className="w-4.5 h-4.5 rounded-md bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <MapPin className="w-2.5 h-2.5" />
            </div>
            <span className="text-white uppercase tracking-wider">STASIUN CUACA TANJUNGPINANG</span>
          </div>

          <span className="text-teal-700">|</span>

          {/* Realtime Clock WIB */}
          <div className="flex items-center gap-1 font-mono text-emerald-400 font-bold">
            <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>{timeString} WIB</span>
          </div>
        </div>

        {/* Right Side: Detail Button & Sync Action */}
        <div className="flex items-center gap-2 sm:gap-2.5 relative z-10">
          <button
            onClick={() => setIsDetailOpen(true)}
            className="flex items-center gap-0.5 text-amber-300 hover:text-amber-200 transition-colors uppercase font-bold tracking-wider"
          >
            <span>KLIK UNTUK DETAIL LENGKAP</span>
            <span>&gt;</span>
          </button>

          <span className="text-teal-700">|</span>

          <button
            onClick={(e) => {
              e.stopPropagation()
              fetchWeather(true)
            }}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
            title="Perbarui Cuaca & Kualitas Udara"
          >
            <RefreshCw className={cn("w-2.5 h-2.5 text-teal-400", isRefreshing && "animate-spin text-amber-400")} />
            <span>Sinkronisasi</span>
          </button>
        </div>
      </div>
    </div>

    {/* Weather Detail Modal Window (Preserved) */}
    <WeatherDetailDialog
      open={isDetailOpen}
      onOpenChange={setIsDetailOpen}
      onRefresh={() => fetchWeather(true)}
    />
    </>
  )
}
