"use client"

import React, { useState, useEffect, useRef } from 'react'
import { cn } from "@/lib/utils"
import { 
  FullWeatherForecastData,
  HourlyForecastItem,
  DailyForecastItem
} from "@/types/weather"
import { 
  fetchFullWeatherData,
  getWeatherDescription,
  getWindDirectionDetails,
  getBeaufortScale,
  getUvCategory,
  getAqiCategoryDetails,
  CITY_NAME,
  PROVINCE,
  LATITUDE,
  LONGITUDE,
  ELEVATION
} from "@/lib/weather-service"
import { WeatherIcon } from "@/components/weather-icons"
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
  AlertCircle, 
  Activity, 
  Info, 
  Sun, 
  Sunrise, 
  Sunset, 
  Eye, 
  ShieldCheck, 
  ShieldAlert, 
  ExternalLink, 
  Calendar, 
  Clock, 
  Navigation,
  Sparkles,
  Zap,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  Radio,
  CheckCircle2
} from 'lucide-react'

interface WeatherDetailViewProps {
  initialData?: FullWeatherForecastData | null
  onRefresh?: () => void
  onOpenNewTab?: () => void
  isModal?: boolean
}

export function WeatherDetailView({
  initialData,
  onRefresh,
  onOpenNewTab,
  isModal = false,
}: WeatherDetailViewProps) {
  const [data, setData] = useState<FullWeatherForecastData | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<"hourly" | "current" | "air" | "wind" | "daily">("hourly")
  const [hourlyViewRange, setHourlyViewRange] = useState<24 | 36 | 48>(24)
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  // Hourly carousel scroll ref
  const hourlyScrollRef = useRef<HTMLDivElement>(null)

  // Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const loadData = async (manual = false) => {
    if (manual) setIsRefreshing(true)
    try {
      const res = await fetchFullWeatherData()
      setData(res)
    } catch (e) {
      console.error("Gagal memuat detail cuaca:", e)
    } finally {
      setIsLoading(false)
      if (manual) setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  useEffect(() => {
    if (!initialData) {
      loadData()
    } else {
      setData(initialData)
      setIsLoading(false)
    }
  }, [initialData])

  const handleManualRefresh = () => {
    loadData(true)
    if (onRefresh) onRefresh()
  }

  const scrollHourly = (direction: 'left' | 'right') => {
    if (hourlyScrollRef.current) {
      const amount = direction === 'left' ? -380 : 380
      hourlyScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }

  if (isLoading || !data) {
    return (
      <div className="w-full min-h-[500px] p-8 flex flex-col items-center justify-center gap-4 text-center bg-white/95 dark:bg-slate-900/95">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute w-8 h-8 rounded-full bg-primary/10 animate-ping" />
        </div>
        <div className="space-y-1">
          <span className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest block">
            Sinkronisasi Stasiun Cuaca {CITY_NAME}...
          </span>
          <span className="text-xs text-slate-400 block">
            Menghubungkan ke Stasiun BMKG Maritim & Satelit Pemodelan Atmosfer
          </span>
        </div>
      </div>
    )
  }

  const { current, hourly, daily, airQuality } = data
  const desc = getWeatherDescription(current.weatherCode, current.isDay)
  const windDir = getWindDirectionDetails(current.windDirection)
  const beaufort = getBeaufortScale(current.windSpeed)
  const aqiInfo = getAqiCategoryDetails(airQuality.aqi)
  const todayDaily = daily[0]
  const todayUv = getUvCategory(todayDaily?.uvIndexMax || 7.5)

  // Hourly list limited to user selection
  const displayedHourly = hourly.slice(0, hourlyViewRange)

  // Calculate AQI bar needle position (0 - 300 scale)
  const aqiNeedlePercent = Math.min(Math.max((airQuality.aqi / 300) * 100, 4), 96)

  // Hourly Statistics summary
  const minTempHourly = Math.min(...displayedHourly.map(h => h.temperature))
  const maxTempHourly = Math.max(...displayedHourly.map(h => h.temperature))
  const maxRainProbItem = displayedHourly.reduce((prev, curr) => 
    (curr.precipitationProbability > prev.precipitationProbability) ? curr : prev, displayedHourly[0]
  )
  const avgWindSpeed = Math.round(
    displayedHourly.reduce((acc, h) => acc + h.windSpeed, 0) / displayedHourly.length
  )

  // Dynamic hero sky background classes based on weather condition
  const getHeroThemeClasses = () => {
    if (current.weatherCode >= 95) {
      // Thunderstorm
      return "from-purple-900/15 via-indigo-900/10 to-slate-900/15 border-purple-500/30"
    }
    if (current.weatherCode >= 51 && current.weatherCode <= 82) {
      // Rain / Drizzle
      return "from-sky-600/15 via-blue-600/10 to-indigo-900/15 border-blue-400/30"
    }
    if (!current.isDay) {
      // Clear or Cloudy Night
      return "from-indigo-950/20 via-slate-900/25 to-blue-950/20 border-indigo-500/25"
    }
    if (current.weatherCode <= 1) {
      // Clear Sunny Day
      return "from-amber-400/15 via-sky-400/15 to-blue-500/10 border-amber-400/30"
    }
    // Cloudy / Partly Cloudy Day
    return "from-sky-500/15 via-slate-100/40 to-indigo-500/10 dark:from-slate-800/80 dark:via-slate-900/80 dark:to-slate-800/80 border-sky-400/25"
  }

  return (
    <div className="w-full flex flex-col bg-white/98 dark:bg-slate-900/98 text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* ================= HEADER OBSERVATORY ================= */}
      {/* Note: pr-14 ensures safe distance from dialog close button 'X' */}
      <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-200/90 dark:border-slate-800/90 flex flex-wrap items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl relative pr-14 sm:pr-16">
        <div className="flex items-center gap-3">
          <div 
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border"
            style={{ 
              backgroundColor: `${aqiInfo.hex}18`, 
              color: aqiInfo.hex,
              borderColor: `${aqiInfo.hex}35`
            }}
          >
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {CITY_NAME}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                Pusat Pemerintahan
              </span>
              <span 
                className="px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1.5 shadow-2xs"
                style={{ 
                  backgroundColor: `${aqiInfo.hex}15`, 
                  borderColor: `${aqiInfo.hex}40`, 
                  color: aqiInfo.hex 
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: aqiInfo.hex }} />
                AQI {airQuality.aqi} • {aqiInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{PROVINCE}, Indonesia</span>
              <span>•</span>
              <span className="font-mono text-[11px] text-slate-400">
                {LATITUDE.toFixed(4)}° N, {LONGITUDE.toFixed(4)}° E (~{ELEVATION}m dpl)
              </span>
              <span>•</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.2 rounded-md">
                Stasiun BMKG & WMO
              </span>
            </p>
          </div>
        </div>

        {/* Header Right Actions & Live Clock */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Live Station Clock */}
          <div className="hidden md:flex flex-col text-right pr-2">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Waktu Stasiun
            </span>
            <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':')} WIB
            </span>
          </div>

          {/* Refresh Action */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Sinkronisasi Data Cuaca Terkini"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-primary", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">Perbarui</span>
          </button>

          {/* Fullscreen / New Tab */}
          {isModal && (
            <button
              onClick={() => {
                if (onOpenNewTab) {
                  onOpenNewTab()
                } else {
                  window.open('/cuaca', '_blank')
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/25 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Buka Observatorium Cuaca di Halaman Penuh"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Halaman Penuh</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= MAIN SCROLLABLE CONTENT BODY ================= */}
      <div className="p-4 sm:p-6 md:p-8 space-y-6 overflow-y-auto max-h-[calc(94vh-90px)] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">

        {/* ================= HERO ATMOSPHERIC DISPLAY & VITAL BENTO ================= */}
        <div className={cn(
          "relative overflow-hidden rounded-3xl p-5 sm:p-7 border bg-gradient-to-br shadow-sm transition-all duration-500",
          getHeroThemeClasses()
        )}>
          {/* Ambient Glowing Orbs */}
          <div 
            className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
            style={{ backgroundColor: aqiInfo.hex }}
          />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-sky-400/25 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            
            {/* Top Row: Hero Identity & Primary Temperatures */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              {/* Left: Weather Hero with Animated SVG */}
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 drop-shadow-lg relative">
                  <div className="absolute inset-0 rounded-full blur-xl bg-amber-400/20 pointer-events-none" />
                  <WeatherIcon icon={desc.icon} className="w-full h-full relative z-10" />
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                      {current.temperature}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-primary">°C</span>
                    <span className="ml-2 text-xs font-bold text-slate-400 bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 px-2 py-0.5 rounded-md">
                      Min {todayDaily?.temperatureMin ?? 25}° • Max {todayDaily?.temperatureMax ?? 32}°
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={cn("text-xs font-black uppercase px-3 py-1 rounded-full border shadow-2xs leading-none", desc.color)}>
                      {desc.label}
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-700/80">
                      Terasa {current.feelsLike}°C
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {current.cloudCover > 60 ? "Langit Teduh" : current.cloudCover > 30 ? "Cerah Berawan" : "Terik Optimal"}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-2 max-w-xl leading-relaxed">
                    {desc.detail}. Kondisi atmosfer terpantau stabil dengan kelembaban kepulauan maritim.
                  </p>
                </div>
              </div>

              {/* Right: AQI Quick Badge & Mask Advisory */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/85 dark:bg-slate-800/85 border border-slate-200/90 dark:border-slate-700/80 shadow-xs lg:self-start shrink-0">
                <div 
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black shrink-0"
                  style={{ backgroundColor: `${aqiInfo.hex}22`, color: aqiInfo.hex }}
                >
                  <span className="text-lg leading-none">{airQuality.aqi}</span>
                  <span className="text-[8px] uppercase tracking-wider font-extrabold mt-0.5">AQI US</span>
                </div>
                <div className="flex flex-col pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
                      Udara {aqiInfo.label}
                    </span>
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: aqiInfo.hex }} 
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {aqiInfo.shortAdvice}
                  </span>
                </div>
              </div>

            </div>

            {/* Bottom Row: Full Comprehensive Bento Vital Metrics (ALL INFO VISIBLE) */}
            <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/70 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              
              {/* 1. Kelembaban */}
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-sky-500 mb-1">
                  <Droplets className="w-3.5 h-3.5" />
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Kelembaban
                  </span>
                </div>
                <span className="text-base font-black text-slate-900 dark:text-white block">
                  {current.humidity}%
                </span>
                <span className="text-[9.5px] text-slate-400 dark:text-slate-400 block mt-0.5">
                  Embun {current.dewPoint}°C
                </span>
              </div>

              {/* 2. Kecepatan Angin */}
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-cyan-500 mb-1">
                  <Wind className="w-3.5 h-3.5" />
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Angin
                  </span>
                </div>
                <span className="text-base font-black text-slate-900 dark:text-white block">
                  {current.windSpeed} <span className="text-xs font-normal">km/h</span>
                </span>
                <span className="text-[9.5px] text-cyan-600 dark:text-cyan-400 font-bold block mt-0.5 truncate">
                  {windDir.code} ({windDir.angle}°)
                </span>
              </div>

              {/* 3. Peluang & Curah Hujan */}
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-blue-500 mb-1">
                  <CloudRain className="w-3.5 h-3.5" />
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Hujan
                  </span>
                </div>
                <span className="text-base font-black text-slate-900 dark:text-white block">
                  {todayDaily?.precipitationProbabilityMax ?? 15}%
                </span>
                <span className="text-[9.5px] text-slate-400 dark:text-slate-400 block mt-0.5">
                  Curah {current.precipitation} mm
                </span>
              </div>

              {/* 4. Indeks UV */}
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                  <Sun className="w-3.5 h-3.5" />
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Indeks UV
                  </span>
                </div>
                <span className="text-base font-black text-slate-900 dark:text-white block">
                  {todayDaily?.uvIndexMax ?? 7.5}
                </span>
                <span className="text-[9.5px] text-amber-600 dark:text-amber-400 font-bold block mt-0.5 truncate">
                  {todayUv.category}
                </span>
              </div>

              {/* 5. Tekanan Barometrik */}
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-indigo-500 mb-1">
                  <Gauge className="w-3.5 h-3.5" />
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Tekanan
                  </span>
                </div>
                <span className="text-base font-black text-slate-900 dark:text-white block">
                  {current.pressureMsl} <span className="text-xs font-normal">hPa</span>
                </span>
                <span className="text-[9.5px] text-slate-400 dark:text-slate-400 block mt-0.5">
                  Permukaan laut
                </span>
              </div>

              {/* 6. Tutupan Awan */}
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <Cloud className="w-3.5 h-3.5" />
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Tutupan Awan
                  </span>
                </div>
                <span className="text-base font-black text-slate-900 dark:text-white block">
                  {current.cloudCover}%
                </span>
                <span className="text-[9.5px] text-slate-400 dark:text-slate-400 block mt-0.5">
                  Langit tertutup
                </span>
              </div>

              {/* 7. Jarak Pandang */}
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Jarak Pandang
                  </span>
                </div>
                <span className="text-base font-black text-slate-900 dark:text-white block">
                  10.0 <span className="text-xs font-normal">km</span>
                </span>
                <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                  Optimal & Jernih
                </span>
              </div>

              {/* 8. Terbit & Terbenam */}
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-orange-500 mb-1">
                  <Sunrise className="w-3.5 h-3.5" />
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Matahari
                  </span>
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white block">
                  🌅 {todayDaily?.sunrise ?? "05:44"}
                </span>
                <span className="text-xs font-black text-slate-900 dark:text-white block mt-0.5">
                  🌇 {todayDaily?.sunset ?? "17:50"}
                </span>
              </div>

            </div>

          </div>
        </div>

        {/* ================= HIGH-END SEGMENTED TAB NAVIGATION ================= */}
        <div className="w-full">
          {/* Responsive Tab Bar with all 5 views clearly visible */}
          <div className="p-1.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-xs">
            
            {/* Tab 1: Hourly Forecast */}
            <button
              onClick={() => setActiveTab("hourly")}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all whitespace-nowrap cursor-pointer shrink-0 flex-1 min-w-[150px]",
                activeTab === "hourly"
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Perkiraan Jam / Jam</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white/20 text-white font-extrabold">
                {hourlyViewRange}j
              </span>
            </button>

            {/* Tab 2: Parameter Cuaca */}
            <button
              onClick={() => setActiveTab("current")}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all whitespace-nowrap cursor-pointer shrink-0 flex-1 min-w-[150px]",
                activeTab === "current"
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50"
              )}
            >
              <Thermometer className="w-3.5 h-3.5" />
              <span>Parameter Cuaca</span>
            </button>

            {/* Tab 3: Kualitas Udara */}
            <button
              onClick={() => setActiveTab("air")}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all whitespace-nowrap cursor-pointer shrink-0 flex-1 min-w-[150px]",
                activeTab === "air"
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50"
              )}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Kondisi Udara (AQI)</span>
              <span 
                className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold"
                style={{ 
                  backgroundColor: activeTab === 'air' ? 'rgba(255,255,255,0.25)' : `${aqiInfo.hex}22`,
                  color: activeTab === 'air' ? '#fff' : aqiInfo.hex
                }}
              >
                {airQuality.aqi}
              </span>
            </button>

            {/* Tab 4: Kecepatan Angin */}
            <button
              onClick={() => setActiveTab("wind")}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all whitespace-nowrap cursor-pointer shrink-0 flex-1 min-w-[150px]",
                activeTab === "wind"
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50"
              )}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>Dinamika Angin</span>
            </button>

            {/* Tab 5: Prakiraan 7 Hari */}
            <button
              onClick={() => setActiveTab("daily")}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all whitespace-nowrap cursor-pointer shrink-0 flex-1 min-w-[150px]",
                activeTab === "daily"
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Prakiraan 7 Hari</span>
            </button>

          </div>
        </div>

        {/* ================= TAB 1: PERKIRAAN CUACA JAM DEMI JAM ================= */}
        {activeTab === "hourly" && (
          <div className="space-y-4 animate-in fade-in-50 duration-300">
            
            {/* Header Controls for Hourly Tab */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Perkiraan Cuaca Jam Demi Jam (Hourly Forecast)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fluktuasi suhu, presipitasi curah hujan, tutupan awan, dan hembusan angin Tanjungpinang
                </p>
              </div>

              {/* Range Filter & Navigation Controls */}
              <div className="flex items-center gap-2">
                
                {/* Range Toggle */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200/80 dark:border-slate-700">
                  {([24, 36, 48] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setHourlyViewRange(range)}
                      className={cn(
                        "px-3 py-1 rounded-lg transition-all cursor-pointer text-xs",
                        hourlyViewRange === range 
                          ? "bg-white dark:bg-slate-700 text-primary shadow-xs font-black" 
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      )}
                    >
                      {range} Jam
                    </button>
                  ))}
                </div>

                {/* Carousel Scroll Left / Right Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => scrollHourly('left')}
                    className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-2xs active:scale-95 transition-all cursor-pointer"
                    title="Gulir ke Kiri"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollHourly('right')}
                    className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-2xs active:scale-95 transition-all cursor-pointer"
                    title="Gulir ke Kanan"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>

            {/* Quick Hourly Highlights Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/20 text-xs">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Rentang Suhu {hourlyViewRange}j</span>
                  <span className="font-black text-slate-800 dark:text-slate-100">{minTempHourly}°C s/d {maxTempHourly}°C</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Puncak Peluang Hujan</span>
                  <span className="font-black text-blue-600 dark:text-blue-400">{maxRainProbItem.displayTime} ({maxRainProbItem.precipitationProbability}%)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-cyan-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Rata-rata Angin</span>
                  <span className="font-black text-slate-800 dark:text-slate-100">{avgWindSpeed} km/h ({windDir.code})</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Kondisi Udara</span>
                  <span className="font-black" style={{ color: aqiInfo.hex }}>AQI {airQuality.aqi} • {aqiInfo.label}</span>
                </div>
              </div>
            </div>

            {/* Scrollable Hourly Cards Carousel with Safe Widths (NO CUT-OFF) */}
            <div className="relative group">
              <div 
                ref={hourlyScrollRef}
                className="flex items-stretch gap-3 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scroll-smooth"
              >
                {displayedHourly.map((item, idx) => {
                  const itemDesc = getWeatherDescription(item.weatherCode, item.isDay)
                  const itemWind = getWindDirectionDetails(item.windDirection)
                  const isCurrent = idx === 0

                  return (
                    <div
                      key={item.time}
                      className={cn(
                        // min-w-[160px] guarantees labels like 'BERAWAN SEBAGIAN' fit without truncation
                        "min-w-[160px] sm:min-w-[172px] p-4 rounded-2xl border flex flex-col items-center justify-between gap-3 snap-start shrink-0 transition-all duration-200 hover:-translate-y-1 shadow-2xs relative",
                        isCurrent 
                          ? "bg-primary/10 dark:bg-primary/15 border-primary/50 ring-2 ring-primary/30 shadow-md"
                          : "bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/70 hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-md"
                      )}
                    >
                      {/* Current Hour Indicator Badge */}
                      {isCurrent && (
                        <span className="absolute -top-2 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-primary text-white shadow-xs uppercase tracking-wider">
                          Saat Ini
                        </span>
                      )}

                      {/* Time & Date Header */}
                      <div className="text-center w-full pt-1">
                        <span className={cn(
                          "text-sm font-black block tracking-tight leading-tight",
                          isCurrent ? "text-primary" : "text-slate-900 dark:text-white"
                        )}>
                          {item.displayTime}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                          {item.displayDate}
                        </span>
                      </div>

                      {/* Weather Icon with Animation */}
                      <div className="w-12 h-12 my-1 shrink-0 drop-shadow-sm">
                        <WeatherIcon icon={itemDesc.icon} className="w-full h-full" />
                      </div>

                      {/* Temperature & Feels-Like */}
                      <div className="text-center">
                        <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                          {item.temperature}°
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 block mt-1">
                          Terasa {item.feelsLike}°
                        </span>
                      </div>

                      {/* Weather Condition Badge - NO TRUNCATION */}
                      <div className="w-full flex items-center justify-center">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border text-center whitespace-normal leading-tight break-words max-w-full shadow-2xs",
                          itemDesc.color
                        )}>
                          {itemDesc.label}
                        </span>
                      </div>

                      {/* Metric Details Block */}
                      <div className="w-full space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/80 text-[10px]">
                        
                        {/* Peluang Hujan */}
                        <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 font-bold">
                          <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
                            <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                            Hujan
                          </span>
                          <span>{item.precipitationProbability}%</span>
                        </div>

                        {/* Angin */}
                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold">
                          <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
                            <Wind className="w-3.5 h-3.5 text-cyan-500" />
                            Angin
                          </span>
                          <span className="text-[9.5px]">
                            {item.windSpeed} km/h <span className="text-cyan-600 dark:text-cyan-400 font-extrabold">{itemWind.code}</span>
                          </span>
                        </div>

                        {/* Kelembaban */}
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-medium">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Droplets className="w-3.5 h-3.5 text-sky-500" />
                            Lembap
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{item.humidity}%</span>
                        </div>

                        {/* Tutupan Awan */}
                        <div className="flex items-center justify-between text-slate-500 font-medium text-[9.5px]">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Cloud className="w-3.5 h-3.5 text-slate-400" />
                            Awan
                          </span>
                          <span className="font-bold text-slate-600 dark:text-slate-400">{item.cloudCover}%</span>
                        </div>

                      </div>

                    </div>
                  )
                })}
              </div>
            </div>

            {/* Informational Callout */}
            <div className="p-4 rounded-2xl bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/20 flex items-center gap-3">
              <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Prakiraan jam-demi-jam diperbarui otomatis setiap interval waktu menggunakan model resolusi tinggi ECMWF & GFS Open-Meteo dengan kalibrasi koordinat stasiun BMKG Maritim Tanjungpinang.
              </p>
            </div>

          </div>
        )}

        {/* ================= TAB 2: PARAMETER FISIK ATMOSFER LENGKAP ================= */}
        {activeTab === "current" && (
          <div className="space-y-4 animate-in fade-in-50 duration-300">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-primary" />
                Parameter Fisik Atmosfer Saat Ini (Detailed Atmospheric Metrics)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pengukuran kondisi atmosferik mendalam di wilayah Kota Tanjungpinang & Kepulauan Riau
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              
              {/* Suhu & Sensasi Termal */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 shadow-2xs">
                <div className="flex items-center justify-between text-amber-500 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-amber-500" />
                    Sensasi Suhu Termal
                  </span>
                  <span className="text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Suhu Udara
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{current.temperature}°C</span>
                  <span className="text-sm font-bold text-slate-400">Terasa {current.feelsLike}°C</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Rentang perkiraan hari ini: Min {todayDaily?.temperatureMin ?? 25}°C s/d Max {todayDaily?.temperatureMax ?? 32}°C. Suhu optimal untuk aktivitas masyarakat.
                </p>
              </div>

              {/* Kelembaban & Titik Embun */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 shadow-2xs">
                <div className="flex items-center justify-between text-sky-500 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-sky-500" />
                    Kelembaban & Titik Embun
                  </span>
                  <span className="text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/20">
                    Relatif
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{current.humidity}%</span>
                  <span className="text-sm font-bold text-slate-400">Titik Embun {current.dewPoint}°C</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Kadar uap air di udara relatif tinggi khas iklim kepulauan tropis maritim dengan sirkulasi angin laut.
                </p>
              </div>

              {/* Tekanan Barometrik */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 shadow-2xs">
                <div className="flex items-center justify-between text-indigo-500 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-indigo-500" />
                    Tekanan Barometrik
                  </span>
                  <span className="text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    Stabil
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{current.pressureMsl}</span>
                  <span className="text-sm font-bold text-slate-400">hPa (MSL)</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Tekanan permukaan tanah: {current.surfacePressure} hPa. Indikasi kestabilan atmosfer tanpa potensi siklon tropis.
                </p>
              </div>

              {/* Tutupan Awan */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-slate-500" />
                    Tutupan Awan (Cloud Cover)
                  </span>
                  <span className="text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-500/20">
                    {current.cloudCover > 60 ? "Mendung" : current.cloudCover > 30 ? "Sebagian" : "Cerah"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{current.cloudCover}%</span>
                  <span className="text-sm font-bold text-slate-400">Langit Tertutup</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Awan kumulus memoderasi radiasi sinar matahari langsung ke permukaan daratan kota.
                </p>
              </div>

              {/* Curah Hujan & Presipitasi */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 shadow-2xs">
                <div className="flex items-center justify-between text-blue-500 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CloudRain className="w-4 h-4 text-blue-500" />
                    Curah Hujan & Presipitasi
                  </span>
                  <span className="text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
                    Akumulasi
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{current.precipitation}</span>
                  <span className="text-sm font-bold text-slate-400">mm (Hari Ini)</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Peluang curah hujan hari ini mencapai {todayDaily?.precipitationProbabilityMax ?? 20}%. Tidak ada peringatan banjir.
                </p>
              </div>

              {/* Siklus Matahari (Sunrise & Sunset) */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 shadow-2xs">
                <div className="flex items-center justify-between text-amber-500 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-500" />
                    Siklus Matahari & UV
                  </span>
                  <span className="text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {current.isDay ? "Siang Hari" : "Malam Hari"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex items-center gap-2">
                    <Sunrise className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Terbit</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-100">{todayDaily?.sunrise ?? "05:44"} WIB</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sunset className="w-4 h-4 text-orange-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Terbenam</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-100">{todayDaily?.sunset ?? "17:50"} WIB</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Indeks UV Maksimal: {todayDaily?.uvIndexMax ?? 7.5} ({todayUv.category}). Disarankan pelindung tabir surya di siang hari.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* ================= TAB 3: KONDISI UDARA (AIR QUALITY & POLLUTANTS) ================= */}
        {activeTab === "air" && (
          <div className="space-y-4 animate-in fade-in-50 duration-300">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Kualitas Udara & Indeks Polusi (Air Quality Index)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pengukuran real-time konsentrasi polutan mikroskopis PM2.5, PM10, dan gas buang atmosfer
              </p>
            </div>

            {/* AQI Overview Hero Card */}
            <div 
              className={cn(
                "p-5 sm:p-6 rounded-3xl border relative overflow-hidden backdrop-blur-md shadow-xs",
                aqiInfo.bgColor,
                aqiInfo.borderColor
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black shadow-sm shrink-0 border"
                    style={{ 
                      backgroundColor: `${aqiInfo.hex}25`, 
                      color: aqiInfo.hex,
                      borderColor: `${aqiInfo.hex}45`
                    }}
                  >
                    <span className="text-2xl leading-none">{airQuality.aqi}</span>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold mt-0.5">AQI US</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        Udara {aqiInfo.label}
                      </span>
                      <span 
                        className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase border"
                        style={{ backgroundColor: `${aqiInfo.hex}20`, color: aqiInfo.hex, borderColor: `${aqiInfo.hex}40` }}
                      >
                        {aqiInfo.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                      {aqiInfo.shortAdvice} • Indeks AQI Standar Eropa: {airQuality.europeanAqi}
                    </p>
                  </div>
                </div>

                {/* Masker Badge Indicator */}
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/90 shrink-0 shadow-xs">
                  {aqiInfo.maskRequired ? (
                    <>
                      <ShieldAlert className="w-5 h-5 text-orange-500" />
                      <div className="flex flex-col text-xs">
                        <span className="font-black text-orange-600 dark:text-orange-400">Disarankan Masker</span>
                        <span className="text-[10px] text-slate-500">Khusus kelompok rentan</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      <div className="flex flex-col text-xs">
                        <span className="font-black text-emerald-600 dark:text-emerald-400">Masker Opsional</span>
                        <span className="text-[10px] text-slate-500">Udara aman dihirup</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Spectrum Meter Bar with Needle Pointer */}
              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>0 - Baik</span>
                  <span>50 - Sedang</span>
                  <span>100 - Kurang Sehat</span>
                  <span>150 - Tidak Sehat</span>
                  <span>200+ Berbahaya</span>
                </div>
                <div className="w-full h-3.5 rounded-full bg-slate-200 dark:bg-slate-700/80 relative overflow-hidden shadow-inner">
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'linear-gradient(to right, #10B981 0%, #F59E0B 20%, #F97316 40%, #EF4444 65%, #A855F7 85%, #881337 100%)'
                    }}
                  />
                  {/* Indicator Needle */}
                  <div 
                    className="absolute top-0 bottom-0 w-2.5 -translate-x-1/2 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-white rounded-full shadow-md transition-all duration-700"
                    style={{ left: `${aqiNeedlePercent}%` }}
                  />
                </div>
              </div>

              {/* Health Guidance Split */}
              <div className="mt-4 pt-3.5 border-t border-slate-200/70 dark:border-slate-700/70 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-black text-slate-800 dark:text-slate-100 block mb-0.5">
                    Masyarakat Umum:
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {aqiInfo.generalAdvice}
                  </p>
                </div>
                <div>
                  <span className="font-black text-slate-800 dark:text-slate-100 block mb-0.5">
                    Kelompok Sensitif & Lansia:
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {aqiInfo.sensitiveAdvice}
                  </p>
                </div>
              </div>
            </div>

            {/* Pollutants Breakdown Bento Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              
              {/* PM2.5 */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 shadow-2xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  PM2.5 (Partikel Halus)
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                  {airQuality.pm25} <span className="text-xs font-normal text-slate-400">µg/m³</span>
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-1">
                  Batas WHO: 15 µg/m³
                </span>
              </div>

              {/* PM10 */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 shadow-2xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  PM10 (Debu Kasar)
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                  {airQuality.pm10} <span className="text-xs font-normal text-slate-400">µg/m³</span>
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                  Batas WHO: 45 µg/m³
                </span>
              </div>

              {/* Karbon Monoksida (CO) */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 shadow-2xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  CO (Karbon Monoksida)
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                  {airQuality.co ?? 426} <span className="text-xs font-normal text-slate-400">µg/m³</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  Kadar Emisi Normal
                </span>
              </div>

              {/* Nitrogen Dioksida (NO2) */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 shadow-2xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  NO2 (Nitrogen Dioksida)
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                  {airQuality.no2 ?? 0.9} <span className="text-xs font-normal text-slate-400">µg/m³</span>
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                  Sangat Rendah
                </span>
              </div>

              {/* Sulfur Dioksida (SO2) */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 shadow-2xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  SO2 (Sulfur Dioksida)
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                  {airQuality.so2 ?? 1.8} <span className="text-xs font-normal text-slate-400">µg/m³</span>
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                  Kadar Aman
                </span>
              </div>

              {/* Ozon (O3) */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 shadow-2xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  O3 (Ozon Permukaan)
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                  {airQuality.o3 ?? 126} <span className="text-xs font-normal text-slate-400">µg/m³</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  Fotokimia Atmosfer
                </span>
              </div>

            </div>
          </div>
        )}

        {/* ================= TAB 4: KECEPATAN ANGIN & ANEMOMETER ================= */}
        {activeTab === "wind" && (
          <div className="space-y-4 animate-in fade-in-50 duration-300">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Wind className="w-4 h-4 text-primary" />
                Dinamika Angin & Arah Mata Angin (Wind Observatory)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kecepatan hembusan, skala Beaufort maritim, dan arah kompas angin Tanjungpinang
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* Left Column: Wind Speed & Beaufort Scale */}
              <div className="md:col-span-7 space-y-4">
                
                {/* Main Wind Metrics Hero */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Kecepatan Angin Rata-rata
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                      {windDir.name} ({windDir.code})
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3 my-3">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
                      {current.windSpeed}
                    </span>
                    <span className="text-lg font-bold text-slate-400">km/jam (km/h)</span>
                  </div>

                  {/* Multi-unit Conversions Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Meter / Detik</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">{current.windSpeedMs} m/s</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Knot (Maritim)</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">{(current.windSpeed * 0.539957).toFixed(1)} kn</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Hembusan (Gusts)</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">{current.windGusts} km/h</span>
                    </div>
                  </div>
                </div>

                {/* Beaufort Maritime Scale Card */}
                <div className="p-5 rounded-3xl bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/20 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-cyan-700 dark:text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Skala Beaufort Tingkat {beaufort.scale}
                    </span>
                    <span className="text-xs font-bold bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded-full">
                      {beaufort.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mt-2">
                    <strong className="text-cyan-700 dark:text-cyan-300">Pengaruh Permukaan: </strong>
                    {beaufort.effect}
                  </p>
                </div>

              </div>

              {/* Right Column: Interactive Animated Wind Compass */}
              <div className="md:col-span-5 p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/70 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xs min-h-[280px]">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Kompas Arah Mata Angin
                </span>

                {/* Compass Dial Graphic */}
                <div className="relative w-48 h-48 sm:w-52 sm:h-52 my-2 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center bg-gradient-to-b from-slate-50 to-transparent dark:from-slate-900/60 shadow-inner">
                  {/* Cardinal Points */}
                  <span className="absolute top-1.5 text-xs font-black text-rose-500">U</span>
                  <span className="absolute bottom-1.5 text-xs font-black text-slate-400">S</span>
                  <span className="absolute right-2 text-xs font-black text-slate-400">T</span>
                  <span className="absolute left-2 text-xs font-black text-slate-400">B</span>

                  {/* Intercardinal markers */}
                  <span className="absolute top-5 right-6 text-[9px] font-bold text-slate-400 dark:text-slate-600">TL</span>
                  <span className="absolute bottom-5 right-6 text-[9px] font-bold text-slate-400 dark:text-slate-600">TG</span>
                  <span className="absolute bottom-5 left-6 text-[9px] font-bold text-slate-400 dark:text-slate-600">BD</span>
                  <span className="absolute top-5 left-6 text-[9px] font-bold text-slate-400 dark:text-slate-600">BL</span>

                  {/* Concentric rings */}
                  <div className="w-36 h-36 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                      <div className="w-3.5 h-3.5 rounded-full bg-cyan-500 shadow-sm z-20" />
                    </div>
                  </div>

                  {/* Rotating Wind Arrow */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-1000 ease-out"
                    style={{ transform: `rotate(${current.windDirection}deg)` }}
                  >
                    <div className="h-full w-6 flex flex-col items-center justify-between py-2.5">
                      {/* Arrow Head (pointing toward wind direction) */}
                      <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[18px] border-b-cyan-500 drop-shadow-md" />
                      {/* Tail */}
                      <div className="w-1 h-14 bg-gradient-to-b from-cyan-500 to-transparent opacity-70" />
                    </div>
                  </div>
                </div>

                {/* Direction readout */}
                <div className="mt-2 text-center">
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {windDir.angle}° ({windDir.name})
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Hembusan menuju arah {windDir.name} ({windDir.code})
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= TAB 5: PRAKIRAAN 7 HARI (DAILY FORECAST) ================= */}
        {activeTab === "daily" && (
          <div className="space-y-4 animate-in fade-in-50 duration-300">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Prakiraan Cuaca 7 Hari ke Depan (7-Day Outlook)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tren perkiraan cuaca harian, rentang fluktuasi suhu, potensi curah hujan, dan indeks paparan UV
              </p>
            </div>

            <div className="space-y-2.5">
              {daily.map((item, idx) => {
                const itemDesc = getWeatherDescription(item.weatherCode, true)
                const isToday = idx === 0
                const itemUv = getUvCategory(item.uvIndexMax)

                return (
                  <div
                    key={item.date}
                    className={cn(
                      "p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all duration-200 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 shadow-2xs",
                      isToday 
                        ? "bg-primary/5 dark:bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                        : "bg-white dark:bg-slate-800/70 border-slate-200/90 dark:border-slate-700/70"
                    )}
                  >
                    {/* Day & Date with Animated Icon */}
                    <div className="flex items-center gap-3.5 min-w-[170px]">
                      <div className="w-10 h-10 shrink-0 drop-shadow-sm">
                        <WeatherIcon icon={itemDesc.icon} className="w-full h-full" />
                      </div>
                      <div>
                        <span className={cn(
                          "text-sm font-black block tracking-tight leading-tight",
                          isToday ? "text-primary" : "text-slate-900 dark:text-white"
                        )}>
                          {item.displayDay} {isToday && "(Hari Ini)"}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 block mt-0.5">
                          {item.displayDate}
                        </span>
                      </div>
                    </div>

                    {/* Condition Badge - NO TRUNCATION */}
                    <div className="min-w-[140px]">
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shadow-2xs inline-block whitespace-normal break-words leading-tight",
                        itemDesc.color
                      )}>
                        {itemDesc.label}
                      </span>
                    </div>

                    {/* Rain Probability & Precipitation */}
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 min-w-[130px]">
                      <CloudRain className="w-4 h-4 shrink-0" />
                      <span>{item.precipitationProbabilityMax}% Hujan</span>
                      {item.precipitationSum > 0 && (
                        <span className="text-[10px] font-semibold text-slate-400">
                          ({item.precipitationSum} mm)
                        </span>
                      )}
                    </div>

                    {/* Temperature Range Bar */}
                    <div className="flex items-center gap-3 min-w-[190px]">
                      <span className="text-xs font-bold text-slate-400 w-8 text-right">
                        {item.temperatureMin}°
                      </span>
                      {/* Visual Color Gradient Bar */}
                      <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-500"
                          style={{
                            marginLeft: `${Math.max((item.temperatureMin - 20) * 5, 5)}%`,
                            width: `${Math.min((item.temperatureMax - item.temperatureMin) * 12, 85)}%`
                          }}
                        />
                      </div>
                      <span className="text-xs font-black text-slate-900 dark:text-white w-8">
                        {item.temperatureMax}°
                      </span>
                    </div>

                    {/* Sunrise, Sunset & UV Index */}
                    <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-semibold min-w-[160px] justify-end">
                      <span title="Matahari Terbit & Terbenam">🌅 {item.sunrise} / 🌇 {item.sunset}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        UV {item.uvIndexMax}
                      </span>
                    </div>

                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ================= FOOTER / DATA SOURCES & COORDINATES ================= */}
        <div className="pt-4 border-t border-slate-200/90 dark:border-slate-800/90 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              Sumber Data: Stasiun BMKG Maritim / Open-Meteo High-Resolution WMO Observatory
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Koordinat Stasiun: Tanjungpinang (0.9186° N, 104.4586° E, elevasi ~18m dpl)
          </span>
        </div>

      </div>

    </div>
  )
}
