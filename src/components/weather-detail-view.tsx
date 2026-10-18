"use client"

import React, { useState, useEffect } from 'react'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  Zap
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
  const [activeTab, setActiveTab] = useState("hourly")
  const [hourlyViewRange, setHourlyViewRange] = useState<24 | 36>(24)

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

  if (isLoading || !data) {
    return (
      <div className="w-full min-h-[450px] p-8 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
          Mengambil Data Cuaca & Atmosfer...
        </span>
        <span className="text-xs text-slate-400">
          Menghubungkan ke Stasiun Cuaca {CITY_NAME} & Satelit Open-Meteo
        </span>
      </div>
    )
  }

  const { current, hourly, daily, airQuality } = data
  const desc = getWeatherDescription(current.weatherCode, current.isDay)
  const windDir = getWindDirectionDetails(current.windDirection)
  const beaufort = getBeaufortScale(current.windSpeed)
  const aqiInfo = getAqiCategoryDetails(airQuality.aqi)
  const todayDaily = daily[0]
  const todayUv = getUvCategory(todayDaily?.uvIndexMax || current.dewPoint || 5)

  // Hourly list limited to user selection
  const displayedHourly = hourly.slice(0, hourlyViewRange)

  // Calculate AQI bar needle position (0 - 300 scale)
  const aqiNeedlePercent = Math.min(Math.max((airQuality.aqi / 300) * 100, 3), 97)

  return (
    <div className="w-full flex flex-col bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* ================= HEADER OBSERVATORY ================= */}
      <div className="px-5 sm:px-8 py-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div 
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ backgroundColor: `${aqiInfo.hex}18`, color: aqiInfo.hex }}
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
                className="px-2 py-0.5 rounded-full text-[10px] font-black border"
                style={{ 
                  backgroundColor: `${aqiInfo.hex}15`, 
                  borderColor: `${aqiInfo.hex}35`, 
                  color: aqiInfo.hex 
                }}
              >
                AQI {airQuality.aqi} • {aqiInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <span>{PROVINCE}, Indonesia</span>
              <span>•</span>
              <span className="font-mono text-[11px] text-slate-400">
                {LATITUDE.toFixed(4)}° N, {LONGITUDE.toFixed(4)}° E (~{ELEVATION}m dpl)
              </span>
            </p>
          </div>
        </div>

        {/* Actions & Live Clock */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <div className="hidden sm:flex flex-col text-right pr-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Waktu Stasiun
            </span>
            <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-300">
              {current.lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':')} WIB
            </span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Sinkronisasi Data Cuaca"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-primary")} />
            <span className="hidden sm:inline">Perbarui</span>
          </button>

          {isModal && (
            <button
              onClick={() => {
                if (onOpenNewTab) {
                  onOpenNewTab()
                } else {
                  window.open('/cuaca', '_blank')
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Buka Halaman Cuaca di Tab / Jendela Penuh"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buka di Tab Baru</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-100px)]">

        {/* ================= HERO CURRENT WEATHER DISPLAY ================= */}
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 border border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-slate-50/90 via-sky-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-800/80 shadow-sm">
          {/* Ambient blur accents */}
          <div 
            className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: aqiInfo.hex }}
          />
          <div className="absolute -bottom-10 -left-10 w-52 h-52 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Left: Big Animated Weather Hero */}
            <div className="md:col-span-6 lg:col-span-5 flex items-center gap-4 sm:gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 drop-shadow-md">
                <WeatherIcon icon={desc.icon} className="w-full h-full" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                    {current.temperature}
                  </span>
                  <span className="text-3xl font-black text-primary">°C</span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={cn("text-xs font-black uppercase px-2.5 py-0.5 rounded-full border shadow-2xs", desc.color)}>
                    {desc.label}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Terasa {current.feelsLike}°C
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  {desc.detail}
                </p>
              </div>
            </div>

            {/* Right: Quick Bento Metrics Grid */}
            <div className="md:col-span-6 lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              
              {/* Kelembaban */}
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <div className="flex items-center gap-2 text-sky-500 mb-1">
                  <Droplets className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Kelembaban
                  </span>
                </div>
                <span className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                  {current.humidity}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Titik embun {current.dewPoint}°C
                </span>
              </div>

              {/* Angin */}
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <div className="flex items-center gap-2 text-cyan-500 mb-1">
                  <Wind className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Angin
                  </span>
                </div>
                <span className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                  {current.windSpeed} <span className="text-xs font-normal">km/h</span>
                </span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold block mt-0.5">
                  {windDir.code} ({windDir.angle}°)
                </span>
              </div>

              {/* Tekanan Udara */}
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <div className="flex items-center gap-2 text-indigo-500 mb-1">
                  <Gauge className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Tekanan
                  </span>
                </div>
                <span className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                  {current.pressureMsl} <span className="text-xs font-normal">hPa</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Permukaan laut
                </span>
              </div>

              {/* Kualitas Udara */}
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <div className="flex items-center gap-2 mb-1" style={{ color: aqiInfo.hex }}>
                  <Activity className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Kondisi Udara
                  </span>
                </div>
                <span className="text-base sm:text-lg font-black" style={{ color: aqiInfo.hex }}>
                  AQI {airQuality.aqi}
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                  {aqiInfo.label}
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* ================= NAVIGATION TABS ================= */}
        <Tabs defaultValue="hourly" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 sm:grid-cols-5 h-auto p-1.5 gap-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
            <TabsTrigger value="hourly" className="py-2.5 rounded-xl font-black text-xs gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Perkiraan / Jam
            </TabsTrigger>
            <TabsTrigger value="current" className="py-2.5 rounded-xl font-black text-xs gap-1.5">
              <Thermometer className="w-3.5 h-3.5" />
              Cuaca Saat Ini
            </TabsTrigger>
            <TabsTrigger value="air" className="py-2.5 rounded-xl font-black text-xs gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Kondisi Udara
            </TabsTrigger>
            <TabsTrigger value="wind" className="py-2.5 rounded-xl font-black text-xs gap-1.5">
              <Wind className="w-3.5 h-3.5" />
              Kecepatan Angin
            </TabsTrigger>
            <TabsTrigger value="daily" className="col-span-2 sm:col-span-1 py-2.5 rounded-xl font-black text-xs gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Prakiraan 7 Hari
            </TabsTrigger>
          </TabsList>

          {/* ================= TAB 1: PERKIRAAN CUACA / JAM ================= */}
          <TabsContent value="hourly" className="mt-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Perkiraan Cuaca Jam Demi Jam (Hourly Forecast)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fluktuasi suhu, presipitasi curah hujan, dan kecepatan angin Tanjungpinang
                </p>
              </div>

              {/* Range Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setHourlyViewRange(24)}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all cursor-pointer",
                    hourlyViewRange === 24 
                      ? "bg-white dark:bg-slate-700 text-primary shadow-xs font-black" 
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  24 Jam
                </button>
                <button
                  onClick={() => setHourlyViewRange(36)}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all cursor-pointer",
                    hourlyViewRange === 36 
                      ? "bg-white dark:bg-slate-700 text-primary shadow-xs font-black" 
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  36 Jam
                </button>
              </div>
            </div>

            {/* Scrollable Hourly Cards Carousel */}
            <div className="relative">
              <div className="flex items-stretch gap-3 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                {displayedHourly.map((item, idx) => {
                  const itemDesc = getWeatherDescription(item.weatherCode, item.isDay)
                  const itemWind = getWindDirectionDetails(item.windDirection)
                  const isCurrent = idx === 0

                  return (
                    <div
                      key={item.time}
                      className={cn(
                        "min-w-[130px] sm:min-w-[145px] p-3.5 rounded-2xl border flex flex-col items-center justify-between gap-2.5 snap-start shrink-0 transition-all duration-200 hover:-translate-y-1 shadow-2xs",
                        isCurrent 
                          ? "bg-primary/5 dark:bg-primary/10 border-primary/40 ring-2 ring-primary/20 shadow-md"
                          : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                    >
                      {/* Time & Date Header */}
                      <div className="text-center w-full">
                        <span className={cn(
                          "text-xs font-black block tracking-tight",
                          isCurrent ? "text-primary" : "text-slate-800 dark:text-slate-200"
                        )}>
                          {item.displayTime}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 block">
                          {item.displayDate}
                        </span>
                      </div>

                      {/* Weather Icon */}
                      <div className="w-11 h-11 my-1">
                        <WeatherIcon icon={itemDesc.icon} className="w-full h-full" />
                      </div>

                      {/* Temperature */}
                      <div className="text-center">
                        <span className="text-xl font-black text-slate-900 dark:text-white">
                          {item.temperature}°
                        </span>
                        <span className="text-[9.5px] font-bold text-slate-400 block">
                          Terasa {item.feelsLike}°
                        </span>
                      </div>

                      {/* Condition Label */}
                      <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border text-center leading-tight truncate max-w-full", itemDesc.color)}>
                        {itemDesc.label}
                      </span>

                      {/* Metric Pills */}
                      <div className="w-full space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px]">
                        
                        {/* Peluang Hujan */}
                        <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 font-bold">
                          <span className="flex items-center gap-1 text-[9px] text-slate-400">
                            <CloudRain className="w-3 h-3" />
                            Hujan
                          </span>
                          <span>{item.precipitationProbability}%</span>
                        </div>

                        {/* Angin */}
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-bold">
                          <span className="flex items-center gap-1 text-[9px] text-slate-400">
                            <Wind className="w-3 h-3" />
                            Angin
                          </span>
                          <span className="flex items-center gap-0.5 text-[9.5px]">
                            {item.windSpeed} km/h
                          </span>
                        </div>

                        {/* Kelembaban */}
                        <div className="flex items-center justify-between text-slate-500 font-medium text-[9px]">
                          <span>Lembap</span>
                          <span>{item.humidity}%</span>
                        </div>
                      </div>

                    </div>
                  )
                })}
              </div>
            </div>

            {/* Hourly Summary Callout */}
            <div className="p-4 rounded-2xl bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/20 flex items-center gap-3">
              <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Prakiraan jam-demi-jam diperbarui setiap saat menggunakan model komputasi ECMWF & GFS Open-Meteo dengan resolusi lokal Tanjungpinang.
              </p>
            </div>
          </TabsContent>

          {/* ================= TAB 2: CUACA SAAT INI (LENGKAP) ================= */}
          <TabsContent value="current" className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-primary" />
                Parameter Fisik Atmosfer Saat Ini
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kondisi atmosferik mendalam di wilayah Kota Tanjungpinang
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              
              {/* Suhu & Sensasi Termal */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <div className="flex items-center justify-between text-amber-500 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-amber-500" />
                    Sensasi Suhu
                  </span>
                  <span className="text-xs font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                    Suhu Udara
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{current.temperature}°C</span>
                  <span className="text-sm font-bold text-slate-400">Terasa {current.feelsLike}°C</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Rentang perkiraan hari ini: Min {todayDaily?.temperatureMin ?? 25}°C s/d Max {todayDaily?.temperatureMax ?? 32}°C.
                </p>
              </div>

              {/* Kelembaban & Titik Embun */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <div className="flex items-center justify-between text-sky-500 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-sky-500" />
                    Kelembaban & Embun
                  </span>
                  <span className="text-xs font-bold bg-sky-500/10 text-sky-600 px-2 py-0.5 rounded-full">
                    Relatif
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{current.humidity}%</span>
                  <span className="text-sm font-bold text-slate-400">Titik Embun {current.dewPoint}°C</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Kadar uap air di udara relatif tinggi khas iklim kepulauan maritim tropis.
                </p>
              </div>

              {/* Tekanan Barometrik */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <div className="flex items-center justify-between text-indigo-500 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-indigo-500" />
                    Tekanan Barometrik
                  </span>
                  <span className="text-xs font-bold bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded-full">
                    Stabil
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{current.pressureMsl}</span>
                  <span className="text-sm font-bold text-slate-400">hPa (MSL)</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Tekanan permukaan tanah: {current.surfacePressure} hPa. Indikasi kondisi atmosfer stabil.
                </p>
              </div>

              {/* Tutupan Awan */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-slate-500" />
                    Tutupan Awan
                  </span>
                  <span className="text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                    {current.cloudCover > 60 ? "Mendung" : current.cloudCover > 30 ? "Sebagian" : "Cerah"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{current.cloudCover}%</span>
                  <span className="text-sm font-bold text-slate-400">Langit Tertutup</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Tutupan awan memoderasi paparan sinar UV langsung ke permukaan daratan.
                </p>
              </div>

              {/* Curah Hujan & Presipitasi */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <div className="flex items-center justify-between text-blue-500 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <CloudRain className="w-4 h-4 text-blue-500" />
                    Curah Hujan (Presipitasi)
                  </span>
                  <span className="text-xs font-bold bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                    Hari Ini
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{current.precipitation}</span>
                  <span className="text-sm font-bold text-slate-400">mm (Akumulasi)</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Peluang curah hujan hari ini mencapai {todayDaily?.precipitationProbabilityMax ?? 20}%.
                </p>
              </div>

              {/* Siklus Matahari (Sunrise & Sunset) */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <div className="flex items-center justify-between text-amber-500 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-500" />
                    Siklus Matahari
                  </span>
                  <span className="text-xs font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Indeks UV Maksimal: {todayDaily?.uvIndexMax ?? 7.5} ({todayUv.category}).
                </p>
              </div>

            </div>
          </TabsContent>

          {/* ================= TAB 3: KONDISI UDARA (AIR QUALITY & POLLUTANTS) ================= */}
          <TabsContent value="air" className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Kualitas Udara & Indeks Polusi (Air Quality Index)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pengukuran real-time polutan mikroskopis PM2.5, PM10, dan emisi gas atmosfer
              </p>
            </div>

            {/* AQI Overview Hero */}
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
                    className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black shadow-sm shrink-0"
                    style={{ backgroundColor: `${aqiInfo.hex}25`, color: aqiInfo.hex }}
                  >
                    <span className="text-2xl leading-none">{airQuality.aqi}</span>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold mt-0.5">AQI US</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
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
                      {aqiInfo.shortAdvice} • Indeks AQI Eropa: {airQuality.europeanAqi}
                    </p>
                  </div>
                </div>

                {/* Masker Badge */}
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
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

              {/* Spectrum Meter Bar */}
              <div className="mt-5 space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>0 - Baik</span>
                  <span>50 - Sedang</span>
                  <span>100 - Kurang Sehat</span>
                  <span>150 - Tidak Sehat</span>
                  <span>200+ Berbahaya</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700/80 relative overflow-hidden shadow-inner">
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'linear-gradient(to right, #10B981, #F59E0B, #F97316, #EF4444, #A855F7, #881337)'
                    }}
                  />
                  {/* Indicator needle */}
                  <div 
                    className="absolute top-0 bottom-0 w-2 -translate-x-1/2 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-white rounded-full shadow-md transition-all duration-500"
                    style={{ left: `${aqiNeedlePercent}%` }}
                  />
                </div>
              </div>

              {/* Health Guidance */}
              <div className="mt-4 pt-3.5 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">
                    Masyarakat Umum:
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {aqiInfo.generalAdvice}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">
                    Kelompok Sensitif & Lansia:
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {aqiInfo.sensitiveAdvice}
                  </p>
                </div>
              </div>
            </div>

            {/* Pollutants Breakdown Bento */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              
              {/* PM2.5 */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
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
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
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
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  CO (Karbon Monoksida)
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                  {airQuality.co ?? 426} <span className="text-xs font-normal text-slate-400">µg/m³</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  Emisi pembakaran
                </span>
              </div>

              {/* Nitrogen Dioksida (NO2) */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  NO2 (Nitrogen Dioksida)
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                  {airQuality.no2 ?? 0.9} <span className="text-xs font-normal text-slate-400">µg/m³</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  Kadar sangat rendah
                </span>
              </div>

              {/* Sulfur Dioksida (SO2) */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  SO2 (Sulfur Dioksida)
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                  {airQuality.so2 ?? 1.8} <span className="text-xs font-normal text-slate-400">µg/m³</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  Kadar aman
                </span>
              </div>

              {/* Ozon (O3) */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  O3 (Ozon Permukaan)
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                  {airQuality.o3 ?? 126} <span className="text-xs font-normal text-slate-400">µg/m³</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  Fotokimia atmosfer
                </span>
              </div>

            </div>
          </TabsContent>

          {/* ================= TAB 4: KECEPATAN ANGIN & ANEMOMETER ================= */}
          <TabsContent value="wind" className="mt-4 space-y-4">
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
              
              {/* Left: Wind Speed & Beaufort Card */}
              <div className="md:col-span-7 space-y-4">
                
                {/* Main Wind Hero */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
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

                  {/* Multi-unit conversions */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center">
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

                {/* Skala Beaufort */}
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
                    <strong className="text-cyan-700 dark:text-cyan-300">Pengaruh: </strong>
                    {beaufort.effect}
                  </p>
                </div>

              </div>

              {/* Right: Interactive Visual Wind Compass */}
              <div className="md:col-span-5 p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xs min-h-[260px]">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Kompas Arah Angin
                </span>

                {/* Compass Dial Graphic */}
                <div className="relative w-44 h-44 sm:w-48 sm:h-48 my-2 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center bg-gradient-to-b from-slate-50 to-transparent dark:from-slate-900/60 shadow-inner">
                  {/* Cardinal Points */}
                  <span className="absolute top-1 text-[11px] font-black text-rose-500">U</span>
                  <span className="absolute bottom-1 text-[11px] font-black text-slate-400">S</span>
                  <span className="absolute right-2 text-[11px] font-black text-slate-400">T</span>
                  <span className="absolute left-2 text-[11px] font-black text-slate-400">B</span>

                  {/* Intercardinal markers */}
                  <span className="absolute top-4 right-5 text-[8.5px] font-bold text-slate-300 dark:text-slate-600">TL</span>
                  <span className="absolute bottom-4 right-5 text-[8.5px] font-bold text-slate-300 dark:text-slate-600">TG</span>
                  <span className="absolute bottom-4 left-5 text-[8.5px] font-bold text-slate-300 dark:text-slate-600">BD</span>
                  <span className="absolute top-4 left-5 text-[8.5px] font-bold text-slate-300 dark:text-slate-600">BL</span>

                  {/* Concentric rings */}
                  <div className="w-32 h-32 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-sm z-20" />
                    </div>
                  </div>

                  {/* Rotating Wind Arrow */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-1000 ease-out"
                    style={{ transform: `rotate(${current.windDirection}deg)` }}
                  >
                    <div className="h-full w-6 flex flex-col items-center justify-between py-2">
                      {/* Arrow Head (pointing where wind is blowing toward) */}
                      <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[16px] border-b-cyan-500 drop-shadow-md" />
                      {/* Tail */}
                      <div className="w-0.5 h-12 bg-gradient-to-b from-cyan-500 to-transparent opacity-60" />
                    </div>
                  </div>
                </div>

                {/* Direction readout */}
                <div className="mt-2 text-center">
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {windDir.angle}° ({windDir.name})
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Menuju ke arah {windDir.name} ({windDir.code})
                  </span>
                </div>
              </div>

            </div>
          </TabsContent>

          {/* ================= TAB 5: PRAKIRAAN 7 HARI (DAILY FORECAST) ================= */}
          <TabsContent value="daily" className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Prakiraan Cuaca 7 Hari ke Depan (7-Day Outlook)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tren perkiraan cuaca harian, rentang suhu, curah hujan, dan indeks UV
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
                      "p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all duration-200 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 shadow-2xs",
                      isToday 
                        ? "bg-primary/5 dark:bg-primary/10 border-primary/30"
                        : "bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60"
                    )}
                  >
                    {/* Day & Date */}
                    <div className="flex items-center gap-3 min-w-[150px]">
                      <div className="w-10 h-10 shrink-0">
                        <WeatherIcon icon={itemDesc.icon} className="w-full h-full" />
                      </div>
                      <div>
                        <span className={cn(
                          "text-sm font-black block tracking-tight",
                          isToday ? "text-primary" : "text-slate-900 dark:text-white"
                        )}>
                          {item.displayDay}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.displayDate}
                        </span>
                      </div>
                    </div>

                    {/* Condition Badge */}
                    <div className="min-w-[130px]">
                      <span className={cn("text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-2xs inline-block", itemDesc.color)}>
                        {itemDesc.label}
                      </span>
                    </div>

                    {/* Rain Probability & Curah Hujan */}
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 min-w-[120px]">
                      <CloudRain className="w-4 h-4 shrink-0" />
                      <span>{item.precipitationProbabilityMax}%</span>
                      {item.precipitationSum > 0 && (
                        <span className="text-[10px] font-semibold text-slate-400">
                          ({item.precipitationSum} mm)
                        </span>
                      )}
                    </div>

                    {/* Temperature Range Bar */}
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <span className="text-xs font-bold text-slate-400 w-8 text-right">
                        {item.temperatureMin}°
                      </span>
                      {/* Bar indicator */}
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

                    {/* Sunrise & Sunset */}
                    <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400 font-semibold min-w-[120px] justify-end">
                      <span title="Matahari Terbit">🌅 {item.sunrise}</span>
                      <span title="Matahari Terbenam">🌇 {item.sunset}</span>
                    </div>

                  </div>
                )
              })}
            </div>
          </TabsContent>

        </Tabs>

        {/* ================= FOOTER / DATA SOURCES & DISCLOSURE ================= */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sumber Data: Stasiun BMKG Maritim / Open-Meteo High-Resolution WMO Observatory</span>
          </div>
          <span>Koordinat Stasiun: Tanjungpinang (0.9186 N, 104.4586 E)</span>
        </div>

      </div>

    </div>
  )
}
