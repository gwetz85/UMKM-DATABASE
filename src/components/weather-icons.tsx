"use client"

import React from 'react'
import { cn } from "@/lib/utils"

export function SunnyIcon({ className }: { className?: string }) {
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

export function ClearNightIcon({ className }: { className?: string }) {
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

export function CloudyIcon({ className }: { className?: string }) {
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

export function PartlyCloudyIcon({ className }: { className?: string }) {
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

export function RainyIcon({ className }: { className?: string }) {
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

export function HeavyRainIcon({ className }: { className?: string }) {
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

export function DrizzleIcon({ className }: { className?: string }) {
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

export function ThunderstormIcon({ className }: { className?: string }) {
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

export function FoggyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon", className)} viewBox="0 0 100 100" fill="none">
      <g className="animate-weather-float">
        <ellipse cx="50" cy="40" rx="24" ry="14" fill="#CBD5E1" opacity="0.6" />
        <line x1="25" y1="58" x2="75" y2="58" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" className="animate-weather-fog" />
        <line x1="30" y1="66" x2="70" y2="66" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" className="animate-weather-fog" style={{ animationDelay: '0.4s' }} />
        <line x1="20" y1="74" x2="80" y2="74" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" className="animate-weather-fog" style={{ animationDelay: '0.8s' }} />
      </g>
    </svg>
  )
}

export function WeatherIcon({ icon, className }: { icon: string; className?: string }) {
  const iconMap: Record<string, React.FC<{ className?: string }>> = {
    "sunny": SunnyIcon,
    "clear-night": ClearNightIcon,
    "partly-cloudy": PartlyCloudyIcon,
    "partly-cloudy-night": PartlyCloudyIcon,
    "cloudy": CloudyIcon,
    "foggy": FoggyIcon,
    "drizzle": DrizzleIcon,
    "rainy": RainyIcon,
    "heavy-rain": HeavyRainIcon,
    "thunderstorm": ThunderstormIcon,
    "snowy": CloudyIcon,
  }
  const IconComponent = iconMap[icon] || CloudyIcon
  return <IconComponent className={className} />
}
