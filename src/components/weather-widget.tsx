"use client"

import React, { useState, useEffect, useCallback } from 'react'
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
  Compass,
  AlertCircle
} from 'lucide-react'

// Tanjungpinang, Kepulauan Riau coordinates
const LATITUDE = 0.9186
const LONGITUDE = 104.4586
const CITY_NAME = "Tanjungpinang"
const PROVINCE = "Kepulauan Riau"

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

interface WeatherDescription {
  label: string
  icon: string
  color: string
}

function getWeatherDescription(code: number, isDay: boolean): WeatherDescription {
  const descriptions: Record<number, WeatherDescription> = {
    0: { label: "Cerah", icon: isDay ? "sunny" : "clear-night", color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60" },
    1: { label: "Sebagian Cerah", icon: isDay ? "partly-cloudy" : "partly-cloudy-night", color: "text-sky-600 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60" },
    2: { label: "Berawan Sebagian", icon: isDay ? "partly-cloudy" : "partly-cloudy-night", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60" },
    3: { label: "Mendung", icon: "cloudy", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60" },
    45: { label: "Berkabut", icon: "foggy", color: "text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700" },
    48: { label: "Kabut Tebal", icon: "foggy", color: "text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700" },
    51: { label: "Gerimis Ringan", icon: "drizzle", color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60" },
    53: { label: "Gerimis", icon: "drizzle", color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60" },
    55: { label: "Gerimis Lebat", icon: "drizzle", color: "text-cyan-700 bg-cyan-100 dark:bg-cyan-900/40 border-cyan-300 dark:border-cyan-800" },
    61: { label: "Hujan Ringan", icon: "rainy", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60" },
    63: { label: "Hujan Sedang", icon: "rainy", color: "text-blue-700 bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-800" },
    65: { label: "Hujan Lebat", icon: "heavy-rain", color: "text-blue-800 bg-blue-100 dark:bg-blue-950/80 border-blue-400 dark:border-blue-700" },
    71: { label: "Salju Ringan", icon: "snowy", color: "text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200" },
    80: { label: "Hujan Singkat", icon: "rainy", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200" },
    81: { label: "Hujan Singkat", icon: "rainy", color: "text-blue-700 bg-blue-100 dark:bg-blue-900/40 border-blue-300" },
    82: { label: "Hujan Lebat", icon: "heavy-rain", color: "text-blue-800 bg-blue-100 dark:bg-blue-950/80 border-blue-400" },
    95: { label: "Badai Petir", icon: "thunderstorm", color: "text-amber-700 bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800" },
    96: { label: "Badai Petir", icon: "thunderstorm", color: "text-amber-800 bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-800" },
    99: { label: "Badai Petir Berat", icon: "thunderstorm", color: "text-rose-700 bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800" },
  }
  return descriptions[code] || { 
    label: "Berawan", 
    icon: "cloudy", 
    color: "text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
  }
}

function getWindDirectionLabel(deg: number): string {
  const dirs = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"]
  const idx = Math.round(deg / 45) % 8
  return dirs[idx]
}

// --- Animated Weather SVG Icons ---
function SunnyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="18" fill="#FBBF24" className="animate-weather-pulse" />
      <circle cx="50" cy="50" r="22" fill="none" stroke="#FCD34D" strokeWidth="2" opacity="0.5" className="animate-weather-pulse-ring" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const x1 = 50 + 26 * Math.cos(rad)
        const y1 = 50 + 26 * Math.sin(rad)
        const x2 = 50 + 34 * Math.cos(rad)
        const y2 = 50 + 34 * Math.sin(rad)
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#FBBF24"
            strokeWidth="3"
            strokeLinecap="round"
            className="animate-weather-ray"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        )
      })}
    </svg>
  )
}

function ClearNightIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      <path
        d="M60 25C48 25 38 35 38 47C38 59 48 69 60 69C63 69 66 68.5 68.5 67.5C64 72 58 75 51 75C38 75 27 64 27 51C27 38 38 27 51 27C55.5 27 59.5 28.5 63 31C62 30.5 61 30 60 25Z"
        fill="#94A3B8"
        className="animate-weather-float"
      />
      <circle cx="70" cy="32" r="1.5" fill="#CBD5E1" className="animate-weather-twinkle" style={{ animationDelay: '0s' }} />
      <circle cx="78" cy="42" r="1" fill="#CBD5E1" className="animate-weather-twinkle" style={{ animationDelay: '0.5s' }} />
      <circle cx="73" cy="52" r="1.5" fill="#CBD5E1" className="animate-weather-twinkle" style={{ animationDelay: '1s' }} />
    </svg>
  )
}

function CloudyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      <g className="animate-weather-float">
        <ellipse cx="42" cy="54" rx="18" ry="12" fill="#94A3B8" opacity="0.4" />
        <ellipse cx="55" cy="50" rx="22" ry="15" fill="#CBD5E1" />
        <circle cx="42" cy="44" r="12" fill="#CBD5E1" />
        <circle cx="58" cy="40" r="14" fill="#E2E8F0" />
        <ellipse cx="50" cy="56" rx="25" ry="10" fill="#E2E8F0" />
      </g>
    </svg>
  )
}

function PartlyCloudyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      <circle cx="36" cy="38" r="14" fill="#FBBF24" className="animate-weather-pulse" />
      <g className="animate-weather-float" style={{ animationDelay: '0.5s' }}>
        <ellipse cx="58" cy="56" rx="20" ry="12" fill="#CBD5E1" />
        <circle cx="48" cy="48" r="10" fill="#CBD5E1" />
        <circle cx="62" cy="46" r="12" fill="#F1F5F9" />
        <ellipse cx="55" cy="60" rx="22" ry="8" fill="#F1F5F9" />
      </g>
    </svg>
  )
}

function RainyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      <g className="animate-weather-float">
        <ellipse cx="50" cy="40" rx="22" ry="14" fill="#94A3B8" />
        <circle cx="38" cy="32" r="12" fill="#94A3B8" />
        <circle cx="55" cy="30" r="14" fill="#CBD5E1" />
        <ellipse cx="48" cy="44" rx="25" ry="8" fill="#CBD5E1" />
      </g>
      {[32, 45, 58, 68].map((x, i) => (
        <line key={i} x1={x} y1={55} x2={x - 4} y2={72}
          stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round"
          className="animate-weather-rain"
          style={{ animationDelay: `${i * 0.3}s` }}
        />
      ))}
    </svg>
  )
}

function HeavyRainIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      <g className="animate-weather-float">
        <ellipse cx="50" cy="35" rx="24" ry="15" fill="#64748B" />
        <circle cx="36" cy="28" r="13" fill="#64748B" />
        <circle cx="56" cy="25" r="15" fill="#94A3B8" />
        <ellipse cx="48" cy="40" rx="27" ry="9" fill="#94A3B8" />
      </g>
      {[28, 38, 48, 58, 68].map((x, i) => (
        <line key={i} x1={x} y1={52} x2={x - 6} y2={75}
          stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"
          className="animate-weather-rain-heavy"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </svg>
  )
}

function DrizzleIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      <g className="animate-weather-float">
        <ellipse cx="50" cy="40" rx="22" ry="14" fill="#CBD5E1" />
        <circle cx="38" cy="34" r="11" fill="#CBD5E1" />
        <circle cx="55" cy="32" r="13" fill="#E2E8F0" />
        <ellipse cx="48" cy="45" rx="24" ry="8" fill="#E2E8F0" />
      </g>
      {[35, 50, 65].map((x, i) => (
        <circle key={i} cx={x} cy={60 + i * 5} r="1.5"
          fill="#93C5FD"
          className="animate-weather-drizzle"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </svg>
  )
}

function ThunderstormIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      <g className="animate-weather-float">
        <ellipse cx="50" cy="32" rx="25" ry="16" fill="#475569" />
        <circle cx="35" cy="24" r="14" fill="#475569" />
        <circle cx="58" cy="22" r="16" fill="#64748B" />
        <ellipse cx="48" cy="38" rx="28" ry="9" fill="#64748B" />
      </g>
      <path d="M52 45 L46 58 L54 58 L48 75" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" className="animate-weather-lightning" />
    </svg>
  )
}

function WeatherIcon({ icon, className }: { icon: string; className?: string }) {
  const iconMap: Record<string, React.FC<{ className?: string }>> = {
    "sunny": SunnyIcon,
    "clear-night": ClearNightIcon,
    "partly-cloudy": PartlyCloudyIcon,
    "partly-cloudy-night": PartlyCloudyIcon,
    "cloudy": CloudyIcon,
    "foggy": CloudyIcon,
    "drizzle": DrizzleIcon,
    "rainy": RainyIcon,
    "heavy-rain": HeavyRainIcon,
    "thunderstorm": ThunderstormIcon,
    "snowy": CloudyIcon,
  }
  const IconComponent = iconMap[icon] || CloudyIcon
  return <IconComponent className={className} />
}

export function WeatherWidget({ className }: { className?: string }) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextUpdate, setNextUpdate] = useState(300)

  const fetchWeather = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true)
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m&timezone=Asia%2FJakarta`
      
      const res = await fetch(url)
      if (!res.ok) throw new Error('Gagal mengambil data cuaca')
      
      const data = await res.json()
      const current = data.current
      
      setWeather({
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        windDirection: current.wind_direction_10m,
        weatherCode: current.weather_code,
        isDay: current.is_day === 1,
        pressure: Math.round(current.pressure_msl),
        cloudCover: current.cloud_cover,
        precipitation: current.precipitation,
        lastUpdated: new Date(),
      })
      setError(null)
      setNextUpdate(300)
    } catch (err) {
      setError('Gagal memuat cuaca')
      console.error('Weather fetch error:', err)
    } finally {
      setIsLoading(false)
      if (manual) setTimeout(() => setIsRefreshing(false), 600)
    }
  }, [])

  useEffect(() => {
    fetchWeather()
    const interval = setInterval(() => fetchWeather(false), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchWeather])

  useEffect(() => {
    const timer = setInterval(() => {
      setNextUpdate(prev => (prev <= 0 ? 300 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  if (isLoading) {
    return (
      <div className={cn("w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/70 dark:border-slate-800/80 p-5 shadow-lg flex flex-col items-center justify-center gap-3 min-h-[220px]", className)}>
        <div className="w-10 h-10 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Memuat Prakiraan Cuaca...</span>
      </div>
    )
  }

  if (error || !weather) {
    return (
      <div className={cn("w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/70 dark:border-slate-800/80 p-5 shadow-lg flex flex-col items-center justify-center gap-2.5 text-center min-h-[160px]", className)}>
        <AlertCircle className="w-6 h-6 text-rose-500" />
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{error || 'Data tidak tersedia'}</span>
        <button 
          onClick={() => fetchWeather(true)} 
          className="text-[10px] font-black uppercase tracking-wider text-primary px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-all"
        >
          Coba Lagi
        </button>
      </div>
    )
  }

  const desc = getWeatherDescription(weather.weatherCode, weather.isDay)
  const windDir = getWindDirectionLabel(weather.windDirection)
  const updateMin = Math.floor(nextUpdate / 60)
  const updateSec = nextUpdate % 60

  return (
    <div
      className={cn(
        "w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/70 dark:border-slate-800/80 shadow-[0_8px_25px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:border-primary/30 dark:hover:border-primary/30 group",
        className
      )}
    >
      {/* Location & Live Status Header */}
      <div className="p-3 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight block leading-none">
              {CITY_NAME}
            </span>
            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block leading-tight mt-0.5">
              {PROVINCE}, Indonesia
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[8px] font-bold uppercase tracking-wider">
            {updateMin}:{updateSec.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Main Weather Hero Display */}
      <div className="px-4 py-3 flex items-center justify-between relative overflow-hidden bg-gradient-to-b from-transparent via-blue-50/20 to-transparent dark:via-blue-950/10">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 relative flex items-center justify-center shrink-0 drop-shadow-md">
            <div className="absolute inset-0 bg-blue-400/10 dark:bg-blue-400/5 rounded-full blur-lg" />
            <WeatherIcon icon={desc.icon} className="w-full h-full relative z-10" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline">
              <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                {weather.temperature}
              </span>
              <span className="text-2xl font-black text-primary leading-none ml-0.5">°</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className={cn("text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs", desc.color)}>
                {desc.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end justify-center text-right pl-2">
          <div className="flex items-center gap-1 text-[9.5px] font-bold text-slate-500 dark:text-slate-400">
            <Thermometer className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Terasa {weather.feelsLike}°C</span>
          </div>
          {weather.precipitation > 0 && (
            <div className="flex items-center gap-1 text-[8.5px] font-bold text-blue-600 dark:text-blue-400 mt-1">
              <CloudRain className="w-2.5 h-2.5" />
              <span>{weather.precipitation} mm</span>
            </div>
          )}
        </div>
      </div>

      {/* Modern Bento Weather Stats Grid */}
      <div className="grid grid-cols-2 gap-1.5 px-3 pb-2.5">
        {/* Kelembaban */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-colors">
          <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Droplets className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">
              {weather.humidity}%
            </span>
            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Kelembaban
            </span>
          </div>
        </div>

        {/* Angin */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-colors">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <Wind className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 truncate">
              {weather.windSpeed} km/h <span className="text-[8.5px] font-bold text-cyan-600 dark:text-cyan-400">({windDir})</span>
            </span>
            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Angin
            </span>
          </div>
        </div>

        {/* Tekanan */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-colors">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Gauge className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">
              {weather.pressure} hPa
            </span>
            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Tekanan
            </span>
          </div>
        </div>

        {/* Awan */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-colors">
          <div className="w-6 h-6 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
            <Cloud className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">
              {weather.cloudCover}%
            </span>
            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Awan
            </span>
          </div>
        </div>
      </div>

      {/* Footer & Source */}
      <div className="px-3 py-2 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider">
        <div className="flex items-center gap-1 truncate">
          <span>Diperbarui:</span>
          <span className="text-slate-600 dark:text-slate-300 font-black">
            {weather.lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':')} WIB
          </span>
        </div>

        <button 
          onClick={() => fetchWeather(true)} 
          disabled={isRefreshing}
          className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-primary transition-all active:scale-90 shrink-0" 
          title="Perbarui Cuaca Sekarang"
        >
          <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin text-primary")} />
        </button>
      </div>
    </div>
  )
}
