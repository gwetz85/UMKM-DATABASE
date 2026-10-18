export interface WeatherCurrent {
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number // km/h
  windSpeedMs: number // m/s
  windDirection: number // degrees
  windGusts: number // km/h
  weatherCode: number
  isDay: boolean
  pressureMsl: number
  surfacePressure: number
  cloudCover: number
  precipitation: number // mm
  dewPoint: number // °C
  lastUpdated: Date
}

export interface HourlyForecastItem {
  time: string // ISO string
  displayTime: string // "14:00"
  displayDate: string // "Min, 18 Okt"
  temperature: number
  feelsLike: number
  precipitationProbability: number // %
  precipitation: number // mm
  weatherCode: number
  windSpeed: number
  windDirection: number
  humidity: number
  cloudCover: number
  uvIndex: number
  visibility: number // km
  isDay: boolean
}

export interface DailyForecastItem {
  date: string
  displayDay: string // "Senin", "Selasa"
  displayDate: string // "19 Okt"
  weatherCode: number
  temperatureMax: number
  temperatureMin: number
  apparentTempMax: number
  apparentTempMin: number
  sunrise: string // "05:44"
  sunset: string // "17:50"
  precipitationSum: number // mm
  precipitationProbabilityMax: number // %
  windSpeedMax: number // km/h
  windGustsMax: number // km/h
  windDirectionDominant: number
  uvIndexMax: number
}

export interface AirQualityDetails {
  aqi: number // US AQI
  europeanAqi: number
  pm25: number // µg/m³
  pm10: number // µg/m³
  co?: number // µg/m³
  no2?: number // µg/m³
  so2?: number // µg/m³
  o3?: number // µg/m³
  dust?: number
  uvIndex?: number
}

export interface FullWeatherForecastData {
  current: WeatherCurrent
  hourly: HourlyForecastItem[]
  daily: DailyForecastItem[]
  airQuality: AirQualityDetails
  location: {
    city: string
    province: string
    country: string
    latitude: number
    longitude: number
    elevation: number
    timezone: string
  }
}
