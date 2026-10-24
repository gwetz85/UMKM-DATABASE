import { 
  FullWeatherForecastData, 
  WeatherCurrent, 
  HourlyForecastItem, 
  DailyForecastItem, 
  AirQualityDetails 
} from "@/types/weather"

export const LATITUDE = 0.9186
export const LONGITUDE = 104.4586
export const CITY_NAME = "Tanjungpinang"
export const PROVINCE = "Kepulauan Riau"
export const ELEVATION = 18

export interface WeatherDescription {
  label: string
  icon: string
  detail: string
  color: string
}

export function getWeatherDescription(code: number, isDay: boolean = true): WeatherDescription {
  const descriptions: Record<number, WeatherDescription> = {
    0: { 
      label: "Cerah", 
      icon: isDay ? "sunny" : "clear-night", 
      detail: "Langit cerah dengan sinar matahari optimal", 
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20" 
    },
    1: { 
      label: "Cerah Berawan", 
      icon: isDay ? "partly-cloudy" : "partly-cloudy-night", 
      detail: "Sebagian besar cerah dengan sedikit gumpalan awan", 
      color: "text-sky-500 bg-sky-500/10 border-sky-500/20" 
    },
    2: { 
      label: "Berawan Sebagian", 
      icon: isDay ? "partly-cloudy" : "partly-cloudy-night", 
      detail: "Kondisi berawan berselang dengan paparan sinar matahari", 
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20" 
    },
    3: { 
      label: "Mendung", 
      icon: "cloudy", 
      detail: "Langit tertutup awan mendung secara menyeluruh", 
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" 
    },
    45: { 
      label: "Berkabut", 
      icon: "foggy", 
      detail: "Uap air berkabut di permukaan, jarak pandang berkurang", 
      color: "text-slate-500 bg-slate-500/10 border-slate-500/20" 
    },
    48: { 
      label: "Kabut Tebal", 
      icon: "foggy", 
      detail: "Kabut tebal dengan kelembaban jenuh tinggi", 
      color: "text-slate-600 bg-slate-600/10 border-slate-600/20" 
    },
    51: { 
      label: "Gerimis Ringan", 
      icon: "drizzle", 
      detail: "Tetesan hujan rintik-rintik halus sesaat", 
      color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" 
    },
    53: { 
      label: "Gerimis Sedang", 
      icon: "drizzle", 
      detail: "Presipitasi gerimis merata berintensitas sedang", 
      color: "text-cyan-600 bg-cyan-600/10 border-cyan-600/20" 
    },
    55: { 
      label: "Gerimis Lebat", 
      icon: "drizzle", 
      detail: "Tetesan gerimis lebat dengan intensitas tinggi", 
      color: "text-cyan-700 bg-cyan-700/10 border-cyan-700/20" 
    },
    61: { 
      label: "Hujan Ringan", 
      icon: "rainy", 
      detail: "Curah hujan ringan dengan tetesan sedang", 
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20" 
    },
    63: { 
      label: "Hujan Sedang", 
      icon: "rainy", 
      detail: "Hujan stabil dengan curah air moderat", 
      color: "text-blue-600 bg-blue-600/10 border-blue-600/20" 
    },
    65: { 
      label: "Hujan Lebat", 
      icon: "heavy-rain", 
      detail: "Curah hujan sangat lebat, waspada genangan air", 
      color: "text-blue-700 bg-blue-700/10 border-blue-700/20" 
    },
    71: { 
      label: "Salju Ringan", 
      icon: "snowy", 
      detail: "Presipitasi kristal es ringan", 
      color: "text-slate-400 bg-slate-400/10 border-slate-400/20" 
    },
    80: { 
      label: "Hujan Singkat", 
      icon: "rainy", 
      detail: "Hujan lokal berdurasi singkat", 
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20" 
    },
    81: { 
      label: "Hujan Lokal Sedang", 
      icon: "rainy", 
      detail: "Hujan lokal dengan curahan moderat", 
      color: "text-blue-600 bg-blue-600/10 border-blue-600/20" 
    },
    82: { 
      label: "Hujan Deras Berulang", 
      icon: "heavy-rain", 
      detail: "Hujan lokal deras berulang dalam durasi waktu tertentu", 
      color: "text-blue-800 bg-blue-800/10 border-blue-800/20" 
    },
    95: { 
      label: "Badai Petir", 
      icon: "thunderstorm", 
      detail: "Awan konvektif disertai kilat petir dan gemuruh", 
      color: "text-amber-600 bg-amber-600/10 border-amber-600/20" 
    },
    96: { 
      label: "Badai Petir & Es", 
      icon: "thunderstorm", 
      detail: "Badai petir disertai butiran es kecil", 
      color: "text-amber-700 bg-amber-700/10 border-amber-700/20" 
    },
    99: { 
      label: "Badai Petir Hebat", 
      icon: "thunderstorm", 
      detail: "Badai petir ekstrem berintensitas curah tinggi", 
      color: "text-rose-600 bg-rose-600/10 border-rose-600/20" 
    },
  }
  return descriptions[code] || {
    label: "Berawan",
    icon: "cloudy",
    detail: "Kondisi langit didominasi tutupan awan",
    color: "text-slate-500 bg-slate-500/10 border-slate-500/20"
  }
}

export function getWindDirectionDetails(deg: number): {
  code: string
  name: string
  angle: number
} {
  const directions = [
    { code: "U", name: "Utara" },
    { code: "UTL", name: "Utara Timur Laut" },
    { code: "TL", name: "Timur Laut" },
    { code: "TTL", name: "Timur Timur Laut" },
    { code: "T", name: "Timur" },
    { code: "TTG", name: "Timur Menenggara" },
    { code: "TG", name: "Tenggara" },
    { code: "STG", name: "Selatan Menenggara" },
    { code: "S", name: "Selatan" },
    { code: "SBD", name: "Selatan Barat Daya" },
    { code: "BD", name: "Barat Daya" },
    { code: "BBD", name: "Barat Barat Daya" },
    { code: "B", name: "Barat" },
    { code: "BBL", name: "Barat Barat Laut" },
    { code: "BL", name: "Barat Laut" },
    { code: "UBL", name: "Utara Barat Laut" },
  ]
  const idx = Math.round(deg / 22.5) % 16
  return {
    code: directions[idx].code,
    name: directions[idx].name,
    angle: deg,
  }
}

export function getBeaufortScale(kmh: number): {
  scale: number
  label: string
  effect: string
} {
  if (kmh < 1) return { scale: 0, label: "Tenang (Calm)", effect: "Asap naik tegak lurus, permukaan laut seperti kaca." }
  if (kmh <= 5) return { scale: 1, label: "Udara Ringan", effect: "Arah angin terlihat dari asap, daun belum bergerak." }
  if (kmh <= 11) return { scale: 2, label: "Sepoi Lemah", effect: "Angin terasa di wajah, dedaunan berbisik halus." }
  if (kmh <= 19) return { scale: 3, label: "Sepoi Lembut", effect: "Daun dan ranting kecil terus bergoyang pelan." }
  if (kmh <= 28) return { scale: 4, label: "Sepoi Sedang", effect: "Debu dan kertas terangkat, ranting pohon bergoyang." }
  if (kmh <= 38) return { scale: 5, label: "Sepoi Segar", effect: "Pohon kecil mulai bergoyang, ombak berbusa di pantai." }
  if (kmh <= 49) return { scale: 6, label: "Angin Kuat", effect: "Cabang besar bergerak, payung sulit digunakan." }
  if (kmh <= 61) return { scale: 7, label: "Angin Kencang", effect: "Seluruh pohon bergoyang, sulit berjalan melawan angin." }
  if (kmh <= 74) return { scale: 8, label: "Badai Sedang", effect: "Ranting patah dari pohon, laju kendaraan terganggu." }
  return { scale: 9, label: "Badai Kuat / Ribut", effect: "Kerusakan atap dan pohon tumbang, cuaca berbahaya." }
}

export function getUvCategory(uv: number): {
  category: string
  color: string
  textColor: string
  advice: string
} {
  if (uv < 3) {
    return {
      category: "Rendah",
      color: "bg-emerald-500/15 border-emerald-500/30",
      textColor: "text-emerald-600 dark:text-emerald-400",
      advice: "Risiko radiasi matahari sangat minimal. Aman beraktivitas di luar ruangan.",
    }
  }
  if (uv < 6) {
    return {
      category: "Sedang",
      color: "bg-amber-500/15 border-amber-500/30",
      textColor: "text-amber-600 dark:text-amber-400",
      advice: "Gunakan pelindung seperti topi, kacamata hitam, atau pakaian tertutup saat terik.",
    }
  }
  if (uv < 8) {
    return {
      category: "Tinggi",
      color: "bg-orange-500/15 border-orange-500/30",
      textColor: "text-orange-600 dark:text-orange-400",
      advice: "Gunakan tabir surya SPF 30+. Hindari terpapar langsung matahari pukul 10:00 - 15:00.",
    }
  }
  if (uv < 11) {
    return {
      category: "Sangat Tinggi",
      color: "bg-rose-500/15 border-rose-500/30",
      textColor: "text-rose-600 dark:text-rose-400",
      advice: "Diperlukan perlindungan ekstra. Usahakan berada di tempat teduh.",
    }
  }
  return {
    category: "Ekstrem",
    color: "bg-purple-500/15 border-purple-500/30",
    textColor: "text-purple-600 dark:text-purple-400",
    advice: "Hindari paparan sinar matahari langsung di luar ruangan karena berpotensi merusak kulit dan mata.",
  }
}

export function getAqiCategoryDetails(aqi: number) {
  if (aqi <= 50) {
    return {
      tier: 1,
      category: "BAIK",
      label: "Baik",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10 dark:bg-emerald-950/40",
      borderColor: "border-emerald-500/30 dark:border-emerald-700/50",
      hex: "#10B981",
      shortAdvice: "Kualitas Udara Sangat Bersih",
      generalAdvice: "Tingkat kualitas udara sangat baik, tidak memberikan efek negatif terhadap manusia maupun hewan.",
      sensitiveAdvice: "Aman untuk seluruh kelompok masyarakat dan aktivitas fisik di luar ruangan.",
      maskRequired: false,
    }
  }
  if (aqi <= 100) {
    return {
      tier: 2,
      category: "SEDANG",
      label: "Sedang",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10 dark:bg-amber-950/40",
      borderColor: "border-amber-500/30 dark:border-amber-700/50",
      hex: "#F59E0B",
      shortAdvice: "Kualitas Udara Cukup Baik",
      generalAdvice: "Kualitas udara dapat diterima untuk umum, polusi udara berada pada kadar wajar.",
      sensitiveAdvice: "Kelompok yang sangat sensitif disarankan membatasi paparan berlebihan dalam waktu lama.",
      maskRequired: false,
    }
  }
  if (aqi <= 150) {
    return {
      tier: 3,
      category: "KURANG SEHAT",
      label: "Kurang Sehat",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10 dark:bg-orange-950/40",
      borderColor: "border-orange-500/30 dark:border-orange-700/50",
      hex: "#F97316",
      shortAdvice: "Sensitif: Gunakan Masker",
      generalAdvice: "Masyarakat umum mulai merasakan dampak ringan bila terpapar dalam jangka waktu panjang.",
      sensitiveAdvice: "Kelompok sensitif (anak-anak, lansia, pengidap asma/gangguan paru) WAJIB menggunakan masker saat keluar.",
      maskRequired: true,
    }
  }
  if (aqi <= 200) {
    return {
      tier: 4,
      category: "TIDAK SEHAT",
      label: "Tidak Sehat",
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-500/10 dark:bg-rose-950/40",
      borderColor: "border-rose-500/30 dark:border-rose-700/50",
      hex: "#EF4444",
      shortAdvice: "Seluruh Warga Kenakan Masker",
      generalAdvice: "Kualitas udara dapat merugikan kesehatan pada sejumlah segmen populasi yang terpapar.",
      sensitiveAdvice: "Hindari aktivitas luar ruangan. Nyalakan pemurni udara (air purifier) di dalam ruangan.",
      maskRequired: true,
    }
  }
  if (aqi <= 300) {
    return {
      tier: 5,
      category: "SANGAT TIDAK SEHAT",
      label: "Sangat Tidak Sehat",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10 dark:bg-purple-950/40",
      borderColor: "border-purple-500/30 dark:border-purple-700/50",
      hex: "#A855F7",
      shortAdvice: "Peringatan Bahaya Udara",
      generalAdvice: "Kualitas udara sangat buruk dan dapat memicu gangguan pernapasan serta iritasi berat.",
      sensitiveAdvice: "Tetap di dalam ruangan tertutup dan tutup semua ventilasi keluar.",
      maskRequired: true,
    }
  }
  return {
    tier: 6,
    category: "BERBAHAYA",
    label: "Berbahaya",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-950/30 dark:bg-red-950/60",
    borderColor: "border-red-600/50 dark:border-red-700/60",
    hex: "#881337",
    shortAdvice: "DARURAT POLUSI UDARA",
    generalAdvice: "Tingkat berbahaya secara umum dapat mengakibatkan dampak kesehatan serius bagi seluruh populasi.",
    sensitiveAdvice: "Keadaan darurat kesehatan masyarakat. Dilarang melakukan aktivitas di luar ruangan.",
    maskRequired: true,
  }
}

export async function fetchFullWeatherData(): Promise<FullWeatherForecastData> {
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,pressure_msl,surface_pressure,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,dew_point_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant&timezone=Asia%2FJakarta&forecast_days=7`
  
  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=us_aqi,european_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index&timezone=Asia%2FJakarta&forecast_days=3`

  const [forecastRes, aqiRes] = await Promise.allSettled([
    fetch(forecastUrl, { cache: 'no-store' }),
    fetch(aqiUrl, { cache: 'no-store' }),
  ])

  let currentRaw: any = null
  let hourlyRaw: any = null
  let dailyRaw: any = null
  let aqiRaw: any = null

  if (forecastRes.status === 'fulfilled' && forecastRes.value.ok) {
    const fData = await forecastRes.value.json()
    currentRaw = fData.current
    hourlyRaw = fData.hourly
    dailyRaw = fData.daily
  }

  if (aqiRes.status === 'fulfilled' && aqiRes.value.ok) {
    const aData = await aqiRes.value.json()
    aqiRaw = aData.current
  }

  // Fallbacks
  const now = new Date()

  const current: WeatherCurrent = {
    temperature: Math.round(currentRaw?.temperature_2m ?? 30),
    feelsLike: Math.round(currentRaw?.apparent_temperature ?? 34),
    humidity: Math.round(currentRaw?.relative_humidity_2m ?? 70),
    windSpeed: Math.round(currentRaw?.wind_speed_10m ?? 11),
    windSpeedMs: Number(((currentRaw?.wind_speed_10m ?? 11) / 3.6).toFixed(1)),
    windDirection: Math.round(currentRaw?.wind_direction_10m ?? 140),
    windGusts: Math.round(currentRaw?.wind_gusts_10m ?? 18),
    weatherCode: currentRaw?.weather_code ?? 1,
    isDay: currentRaw?.is_day === 1,
    pressureMsl: Math.round(currentRaw?.pressure_msl ?? 1010),
    surfacePressure: Math.round(currentRaw?.surface_pressure ?? 1008),
    cloudCover: Math.round(currentRaw?.cloud_cover ?? 70),
    precipitation: Number((currentRaw?.precipitation ?? 0).toFixed(1)),
    dewPoint: Math.round(hourlyRaw?.dew_point_2m?.[0] ?? 23.5),
    lastUpdated: now,
  }

  // Parse Hourly (up to 48 hours starting from current hour)
  const hourly: HourlyForecastItem[] = []
  if (hourlyRaw?.time && Array.isArray(hourlyRaw.time)) {
    const currentIsoHour = now.toISOString().slice(0, 13) // "YYYY-MM-DDTHH"
    let startIndex = hourlyRaw.time.findIndex((t: string) => t.startsWith(currentIsoHour))
    if (startIndex < 0) startIndex = 0

    // Take next 36 hours for granular viewing
    const sliceEnd = Math.min(startIndex + 48, hourlyRaw.time.length)
    const daysIndo = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
    const monthsIndo = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"]

    for (let i = startIndex; i < sliceEnd; i++) {
      const rawTime = hourlyRaw.time[i]
      const d = new Date(rawTime)
      const isFirst = i === startIndex

      const timeStr = isFirst ? "Sekarang" : `${String(d.getHours()).padStart(2, '0')}:00`
      const dayName = daysIndo[d.getDay()]
      const dateNum = d.getDate()
      const monthName = monthsIndo[d.getMonth()]
      const displayDate = `${dayName}, ${dateNum} ${monthName}`

      const hourNumber = d.getHours()
      const isDayHour = hourNumber >= 6 && hourNumber < 18

      hourly.push({
        time: rawTime,
        displayTime: timeStr,
        displayDate,
        temperature: Math.round(hourlyRaw.temperature_2m?.[i] ?? 30),
        feelsLike: Math.round(hourlyRaw.apparent_temperature?.[i] ?? 34),
        precipitationProbability: Math.round(hourlyRaw.precipitation_probability?.[i] ?? 0),
        precipitation: Number((hourlyRaw.precipitation?.[i] ?? 0).toFixed(1)),
        weatherCode: hourlyRaw.weather_code?.[i] ?? 1,
        windSpeed: Math.round(hourlyRaw.wind_speed_10m?.[i] ?? 10),
        windDirection: Math.round(hourlyRaw.wind_direction_10m?.[i] ?? 120),
        humidity: Math.round(hourlyRaw.relative_humidity_2m?.[i] ?? 70),
        cloudCover: Math.round(hourlyRaw.cloud_cover?.[i] ?? 50),
        uvIndex: Number((hourlyRaw.uv_index?.[i] ?? 0).toFixed(1)),
        visibility: Number(((hourlyRaw.visibility?.[i] ?? 10000) / 1000).toFixed(1)),
        isDay: isDayHour,
      })
    }
  }

  // Parse Daily (7 days)
  const daily: DailyForecastItem[] = []
  if (dailyRaw?.time && Array.isArray(dailyRaw.time)) {
    const fullDaysIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
    const monthsIndo = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"]

    for (let i = 0; i < dailyRaw.time.length; i++) {
      const dateStr = dailyRaw.time[i]
      const d = new Date(dateStr)
      let dayName = fullDaysIndo[d.getDay()]
      if (i === 0) dayName = "Hari Ini"
      else if (i === 1) dayName = "Besok"

      const displayDate = `${d.getDate()} ${monthsIndo[d.getMonth()]}`

      const sunriseRaw = dailyRaw.sunrise?.[i] || ""
      const sunsetRaw = dailyRaw.sunset?.[i] || ""
      const sunrise = sunriseRaw ? sunriseRaw.split('T')[1]?.slice(0, 5) : "05:45"
      const sunset = sunsetRaw ? sunsetRaw.split('T')[1]?.slice(0, 5) : "17:50"

      daily.push({
        date: dateStr,
        displayDay: dayName,
        displayDate,
        weatherCode: dailyRaw.weather_code?.[i] ?? 1,
        temperatureMax: Math.round(dailyRaw.temperature_2m_max?.[i] ?? 32),
        temperatureMin: Math.round(dailyRaw.temperature_2m_min?.[i] ?? 25),
        apparentTempMax: Math.round(dailyRaw.apparent_temperature_max?.[i] ?? 35),
        apparentTempMin: Math.round(dailyRaw.apparent_temperature_min?.[i] ?? 26),
        sunrise,
        sunset,
        precipitationSum: Number((dailyRaw.precipitation_sum?.[i] ?? 0).toFixed(1)),
        precipitationProbabilityMax: Math.round(dailyRaw.precipitation_probability_max?.[i] ?? 20),
        windSpeedMax: Math.round(dailyRaw.wind_speed_10m_max?.[i] ?? 15),
        windGustsMax: Math.round(dailyRaw.wind_gusts_10m_max?.[i] ?? 22),
        windDirectionDominant: Math.round(dailyRaw.wind_direction_10m_dominant?.[i] ?? 150),
        uvIndexMax: Number((dailyRaw.uv_index_max?.[i] ?? 7.5).toFixed(1)),
      })
    }
  }

  // Parse Air Quality
  const airQuality: AirQualityDetails = {
    aqi: Math.round(aqiRaw?.us_aqi ?? 106),
    europeanAqi: Math.round(aqiRaw?.european_aqi ?? 48),
    pm25: Number((aqiRaw?.pm2_5 ?? 30.6).toFixed(1)),
    pm10: Number((aqiRaw?.pm10 ?? 35.5).toFixed(1)),
    co: aqiRaw?.carbon_monoxide ? Number(aqiRaw.carbon_monoxide.toFixed(1)) : 426.0,
    no2: aqiRaw?.nitrogen_dioxide ? Number(aqiRaw.nitrogen_dioxide.toFixed(1)) : 0.9,
    so2: aqiRaw?.sulphur_dioxide ? Number(aqiRaw.sulphur_dioxide.toFixed(1)) : 1.8,
    o3: aqiRaw?.ozone ? Number(aqiRaw.ozone.toFixed(1)) : 126.0,
    dust: aqiRaw?.dust ? Number(aqiRaw.dust.toFixed(1)) : undefined,
    uvIndex: aqiRaw?.uv_index ? Number(aqiRaw.uv_index.toFixed(1)) : undefined,
  }

  return {
    current,
    hourly,
    daily,
    airQuality,
    location: {
      city: CITY_NAME,
      province: PROVINCE,
      country: "Indonesia",
      latitude: LATITUDE,
      longitude: LONGITUDE,
      elevation: ELEVATION,
      timezone: "Asia/Jakarta (WIB)",
    },
  }
}
