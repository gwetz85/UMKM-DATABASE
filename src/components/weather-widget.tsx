"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { cn } from "@/lib/utils"

// Tanjungpinang, Kepulauan Riau coordinates (Pusat Kota Tanjungpinang)
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
  uvIndex: number
  visibility: number
  precipitation: number
  lastUpdated: Date
}

interface WeatherDescription {
  label: string
  icon: string
}

function getWeatherDescription(code: number, isDay: boolean): WeatherDescription {
  const descriptions: Record<number, WeatherDescription> = {
    0: { label: "Cerah", icon: isDay ? "sunny" : "clear-night" },
    1: { label: "Sebagian Cerah", icon: isDay ? "partly-cloudy" : "partly-cloudy-night" },
    2: { label: "Berawan Sebagian", icon: isDay ? "partly-cloudy" : "partly-cloudy-night" },
    3: { label: "Mendung", icon: "cloudy" },
    45: { label: "Berkabut", icon: "foggy" },
    48: { label: "Kabut Tebal", icon: "foggy" },
    51: { label: "Gerimis Ringan", icon: "drizzle" },
    53: { label: "Gerimis", icon: "drizzle" },
    55: { label: "Gerimis Lebat", icon: "drizzle" },
    61: { label: "Hujan Ringan", icon: "rainy" },
    63: { label: "Hujan Sedang", icon: "rainy" },
    65: { label: "Hujan Lebat", icon: "heavy-rain" },
    71: { label: "Salju Ringan", icon: "snowy" },
    73: { label: "Salju Sedang", icon: "snowy" },
    75: { label: "Salju Lebat", icon: "snowy" },
    80: { label: "Hujan Singkat", icon: "rainy" },
    81: { label: "Hujan Singkat Sedang", icon: "rainy" },
    82: { label: "Hujan Singkat Lebat", icon: "heavy-rain" },
    95: { label: "Badai Petir", icon: "thunderstorm" },
    96: { label: "Badai Petir + Hujan Es", icon: "thunderstorm" },
    99: { label: "Badai Petir Berat", icon: "thunderstorm" },
  }
  return descriptions[code] || { label: "Tidak Diketahui", icon: "cloudy" }
}

function getWindDirectionLabel(deg: number): string {
  const dirs = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"]
  const idx = Math.round(deg / 45) % 8
  return dirs[idx]
}

// --- Animated Weather Icons as SVG ---

function SunnyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="18" fill="#FBBF24" className="animate-weather-pulse" />
      <circle cx="50" cy="50" r="22" fill="none" stroke="#FCD34D" strokeWidth="2" opacity="0.5" className="animate-weather-pulse-ring" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const x1 = 50 + 28 * Math.cos(rad)
        const y1 = 50 + 28 * Math.sin(rad)
        const x2 = 50 + 36 * Math.cos(rad)
        const y2 = 50 + 36 * Math.sin(rad)
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
        fill="#CBD5E1"
        className="animate-weather-float"
      />
      <circle cx="70" cy="32" r="1.5" fill="#E2E8F0" className="animate-weather-twinkle" style={{ animationDelay: '0s' }} />
      <circle cx="78" cy="42" r="1" fill="#E2E8F0" className="animate-weather-twinkle" style={{ animationDelay: '0.5s' }} />
      <circle cx="73" cy="52" r="1.5" fill="#E2E8F0" className="animate-weather-twinkle" style={{ animationDelay: '1s' }} />
      <circle cx="82" cy="35" r="1" fill="#E2E8F0" className="animate-weather-twinkle" style={{ animationDelay: '1.5s' }} />
      <circle cx="65" cy="22" r="1" fill="#E2E8F0" className="animate-weather-twinkle" style={{ animationDelay: '0.7s' }} />
    </svg>
  )
}

function CloudyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      <g className="animate-weather-float">
        <ellipse cx="42" cy="52" rx="18" ry="12" fill="#94A3B8" opacity="0.5" />
        <ellipse cx="55" cy="48" rx="22" ry="15" fill="#CBD5E1" />
        <circle cx="42" cy="42" r="12" fill="#CBD5E1" />
        <circle cx="58" cy="38" r="14" fill="#E2E8F0" />
        <ellipse cx="50" cy="55" rx="25" ry="10" fill="#E2E8F0" />
      </g>
    </svg>
  )
}

function PartlyCloudyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      <g>
        <circle cx="35" cy="38" r="14" fill="#FBBF24" className="animate-weather-pulse" />
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180
          const x1 = 35 + 18 * Math.cos(rad)
          const y1 = 38 + 18 * Math.sin(rad)
          const x2 = 35 + 23 * Math.cos(rad)
          const y2 = 38 + 23 * Math.sin(rad)
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"
              className="animate-weather-ray" style={{ animationDelay: `${i * 0.2}s` }}
            />
          )
        })}
      </g>
      <g className="animate-weather-float" style={{ animationDelay: '0.5s' }}>
        <ellipse cx="58" cy="55" rx="20" ry="12" fill="#E2E8F0" />
        <circle cx="48" cy="48" r="10" fill="#E2E8F0" />
        <circle cx="62" cy="45" r="12" fill="#F1F5F9" />
        <ellipse cx="55" cy="60" rx="22" ry="8" fill="#F1F5F9" />
      </g>
    </svg>
  )
}

function PartlyCloudyNightIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      <path
        d="M40 22C32 22 26 28 26 36C26 44 32 50 40 50C42 50 43 49.5 44.5 49C42 52 38 54 34 54C26 54 20 48 20 40C20 32 26 26 34 26C36 26 38 27 40 28C40 25 40 23 40 22Z"
        fill="#CBD5E1" className="animate-weather-float"
      />
      <g className="animate-weather-float" style={{ animationDelay: '0.5s' }}>
        <ellipse cx="60" cy="58" rx="20" ry="12" fill="#94A3B8" opacity="0.7" />
        <circle cx="50" cy="50" r="10" fill="#94A3B8" opacity="0.8" />
        <circle cx="64" cy="48" r="12" fill="#CBD5E1" />
        <ellipse cx="58" cy="62" rx="22" ry="8" fill="#CBD5E1" />
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
          stroke="#60A5FA" strokeWidth="2" strokeLinecap="round"
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
      {[40, 55].map((x, i) => (
        <circle key={i + 3} cx={x} cy={65 + i * 6} r="1.5"
          fill="#93C5FD"
          className="animate-weather-drizzle"
          style={{ animationDelay: `${(i + 3) * 0.3}s` }}
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
      {[35, 62].map((x, i) => (
        <line key={i} x1={x} y1={48} x2={x - 4} y2={68}
          stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"
          className="animate-weather-rain"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </svg>
  )
}

function FoggyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      {[35, 45, 55, 65].map((y, i) => (
        <line key={i} x1={20 + i * 3} y1={y} x2={80 - i * 3} y2={y}
          stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round"
          opacity={0.4 + i * 0.15}
          className="animate-weather-fog"
          style={{ animationDelay: `${i * 0.5}s` }}
        />
      ))}
    </svg>
  )
}

function SnowyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      <g className="animate-weather-float">
        <ellipse cx="50" cy="35" rx="22" ry="14" fill="#CBD5E1" />
        <circle cx="38" cy="28" r="12" fill="#CBD5E1" />
        <circle cx="55" cy="26" r="14" fill="#E2E8F0" />
        <ellipse cx="48" cy="40" rx="25" ry="8" fill="#E2E8F0" />
      </g>
      {[35, 50, 65, 42, 58].map((x, i) => (
        <text key={i} x={x} y={58 + (i % 2) * 12} fontSize="8" fill="#93C5FD" textAnchor="middle"
          className="animate-weather-snow" style={{ animationDelay: `${i * 0.3}s` }}
        >❄</text>
      ))}
    </svg>
  )
}

function WeatherIcon({ icon, className }: { icon: string; className?: string }) {
  const iconMap: Record<string, React.FC<{ className?: string }>> = {
    "sunny": SunnyIcon,
    "clear-night": ClearNightIcon,
    "partly-cloudy": PartlyCloudyIcon,
    "partly-cloudy-night": PartlyCloudyNightIcon,
    "cloudy": CloudyIcon,
    "foggy": FoggyIcon,
    "drizzle": DrizzleIcon,
    "rainy": RainyIcon,
    "heavy-rain": HeavyRainIcon,
    "thunderstorm": ThunderstormIcon,
    "snowy": SnowyIcon,
  }
  const IconComponent = iconMap[icon] || CloudyIcon
  return <IconComponent className={className} />
}

// --- Main Widget ---

export function WeatherWidget({ className }: { className?: string }) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextUpdate, setNextUpdate] = useState(300)

  const fetchWeather = useCallback(async () => {
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
        uvIndex: 0,
        visibility: 0,
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
    }
  }, [])

  useEffect(() => {
    fetchWeather()
    const interval = setInterval(fetchWeather, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchWeather])

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setNextUpdate(prev => (prev <= 0 ? 300 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  if (isLoading) {
    return (
      <div className={cn("weather-widget-container weather-loading", className)}>
        <div className="weather-loading-shimmer" />
        <span className="weather-loading-text">Memuat cuaca...</span>
      </div>
    )
  }

  if (error || !weather) {
    return (
      <div className={cn("weather-widget-container weather-error", className)}>
        <span className="weather-error-icon">⚠️</span>
        <span className="weather-error-text">{error || 'Data tidak tersedia'}</span>
        <button onClick={fetchWeather} className="weather-retry-btn">Coba Lagi</button>
      </div>
    )
  }

  const desc = getWeatherDescription(weather.weatherCode, weather.isDay)
  const windDir = getWindDirectionLabel(weather.windDirection)
  const updateMin = Math.floor(nextUpdate / 60)
  const updateSec = nextUpdate % 60

  return (
    <div className={cn("weather-widget-container", className)}>
      {/* Header */}
      <div className="weather-header">
        <div className="weather-location">
          <svg className="weather-loc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <div>
            <span className="weather-city">{CITY_NAME}</span>
            <span className="weather-province">{PROVINCE}, Indonesia</span>
          </div>
        </div>
        <div className="weather-update-badge">
          <div className="weather-live-dot" />
          <span>Update {updateMin}:{updateSec.toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* Main Weather */}
      <div className="weather-main">
        <div className="weather-icon-wrapper">
          <WeatherIcon icon={desc.icon} className="weather-main-icon" />
        </div>
        <div className="weather-temp-section">
          <span className="weather-temp">{weather.temperature}°</span>
          <span className="weather-condition">{desc.label}</span>
          <span className="weather-feels">Terasa seperti {weather.feelsLike}°C</span>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="weather-detail-grid">
        <div className="weather-detail-item">
          <svg className="weather-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
          </svg>
          <div className="weather-detail-info">
            <span className="weather-detail-value">{weather.humidity}%</span>
            <span className="weather-detail-label">Kelembaban</span>
          </div>
        </div>

        <div className="weather-detail-item">
          <svg className="weather-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="weather-detail-info">
            <span className="weather-detail-value">{weather.windSpeed} km/h</span>
            <span className="weather-detail-label">Angin {windDir}</span>
          </div>
        </div>

        <div className="weather-detail-item">
          <svg className="weather-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v1m0 16v1m-8-9H3m16 0h2m-3.636-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707" strokeLinecap="round" />
            <circle cx="12" cy="12" r="4" />
          </svg>
          <div className="weather-detail-info">
            <span className="weather-detail-value">{weather.pressure} hPa</span>
            <span className="weather-detail-label">Tekanan</span>
          </div>
        </div>

        <div className="weather-detail-item">
          <svg className="weather-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 12h2m16 0h2M12 2v2m0 16v2m-7-14l1.5 1.5M17.5 17.5l1.5 1.5M4.5 17.5L6 16M18 8l1.5-1.5" strokeLinecap="round" />
            <path d="M8 12a4 4 0 108 0 4 4 0 00-8 0z" fill="currentColor" opacity="0.15" />
          </svg>
          <div className="weather-detail-info">
            <span className="weather-detail-value">{weather.cloudCover}%</span>
            <span className="weather-detail-label">Awan</span>
          </div>
        </div>

        {weather.precipitation > 0 && (
          <div className="weather-detail-item weather-detail-rain">
            <svg className="weather-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 17.58A5 5 0 0018 8h-1.26A8 8 0 104 16.25" strokeLinecap="round" />
              <path d="M8 16l-2 3m6-3l-2 3m6-3l-2 3" strokeLinecap="round" />
            </svg>
            <div className="weather-detail-info">
              <span className="weather-detail-value">{weather.precipitation} mm</span>
              <span className="weather-detail-label">Curah Hujan</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="weather-footer flex-col items-start gap-1">
        <div className="flex items-center justify-between w-full">
          <span>Diperbarui: {weather.lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':')} WIB</span>
          <button onClick={fetchWeather} className="weather-refresh-btn" title="Perbarui Sekarang">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
          </button>
        </div>
        <div className="text-[7.5px] font-medium text-slate-400/90 tracking-tight">
          Sumber Data: <span className="font-bold text-slate-500">Open-Meteo API</span> (Model BMKG & High-Res Global Data)
        </div>
      </div>
    </div>
  )
}
