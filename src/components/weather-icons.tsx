"use client"

import React from 'react'
import { cn } from "@/lib/utils"

export function SunnyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon drop-shadow-md", className)} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="sunGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="65%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
        <filter id="sunGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer ambient glow */}
      <circle cx="50" cy="50" r="23" fill="#FDE047" opacity="0.35" className="animate-weather-pulse-ring" />
      <circle cx="50" cy="50" r="20" fill="none" stroke="#FBBF24" strokeWidth="1.5" opacity="0.6" />

      {/* Rotating Sun Rays */}
      <g className="animate-weather-spin-slow">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180
          const x1 = 50 + 24 * Math.cos(rad)
          const y1 = 50 + 24 * Math.sin(rad)
          const x2 = 50 + 33 * Math.cos(rad)
          const y2 = 50 + 33 * Math.sin(rad)
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#F59E0B"
              strokeWidth="3.2"
              strokeLinecap="round"
              className="animate-weather-ray"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          )
        })}
      </g>

      {/* Sun Core */}
      <circle
        cx="50"
        cy="50"
        r="17"
        fill="url(#sunGradient)"
        filter="url(#sunGlow)"
        className="animate-weather-pulse"
      />
    </svg>
  )
}

export function ClearNightIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon drop-shadow-md", className)} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="50%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <radialGradient id="moonGlowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#93C5FD" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Night Sky Glow */}
      <circle cx="50" cy="50" r="30" fill="url(#moonGlowGrad)" />

      {/* Crescent Moon */}
      <path
        d="M62 23C49 23 38 34 38 47C38 60 49 71 62 71C65.5 71 69 70 72 68.5C66.5 74 59 77 50.5 77C36.5 77 25 64.5 25 50C25 35.5 36.5 23 50.5 23C54.8 23 58.8 24.2 62.2 26.5C62.1 25.3 62 24.2 62 23Z"
        fill="url(#moonGrad)"
        className="animate-weather-float"
      />

      {/* Moon Crater Accents */}
      <circle cx="45" cy="46" r="2" fill="#CBD5E1" opacity="0.5" />
      <circle cx="50" cy="57" r="2.8" fill="#CBD5E1" opacity="0.4" />
      <circle cx="41" cy="54" r="1.4" fill="#CBD5E1" opacity="0.5" />

      {/* Sparkling Stars */}
      <g className="animate-weather-twinkle" style={{ animationDelay: '0s' }}>
        <circle cx="74" cy="30" r="2" fill="#F8FAFC" />
        <line x1="74" y1="26" x2="74" y2="34" stroke="#F8FAFC" strokeWidth="1" strokeLinecap="round" />
        <line x1="70" y1="30" x2="78" y2="30" stroke="#F8FAFC" strokeWidth="1" strokeLinecap="round" />
      </g>
      <circle cx="82" cy="44" r="1.5" fill="#E2E8F0" className="animate-weather-twinkle" style={{ animationDelay: '0.6s' }} />
      <circle cx="76" cy="58" r="1.8" fill="#CBD5E1" className="animate-weather-twinkle" style={{ animationDelay: '1.2s' }} />
      <circle cx="32" cy="32" r="1.2" fill="#CBD5E1" className="animate-weather-twinkle" style={{ animationDelay: '1.8s' }} />
    </svg>
  )
}

export function PartlyCloudyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon drop-shadow-md", className)} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="pcSunGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
        <linearGradient id="cloudGradFront" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>

      {/* Sun Peeking */}
      <g className="animate-weather-pulse">
        <circle cx="36" cy="36" r="14" fill="url(#pcSunGrad)" />
        <circle cx="36" cy="36" r="17" fill="none" stroke="#FBBF24" strokeWidth="1.5" opacity="0.4" className="animate-weather-pulse-ring" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180
          const x1 = 36 + 18 * Math.cos(rad)
          const y1 = 36 + 18 * Math.sin(rad)
          const x2 = 36 + 24 * Math.cos(rad)
          const y2 = 36 + 24 * Math.sin(rad)
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#F59E0B"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="animate-weather-ray"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          )
        })}
      </g>

      {/* Floating Foreground Cloud */}
      <g className="animate-weather-float" style={{ animationDelay: '0.4s' }}>
        {/* Soft shadow under cloud */}
        <ellipse cx="58" cy="67" rx="23" ry="5" fill="#64748B" opacity="0.15" />
        {/* Cloud Puff Bulbs */}
        <ellipse cx="58" cy="58" rx="21" ry="13" fill="url(#cloudGradFront)" />
        <circle cx="47" cy="50" r="11" fill="url(#cloudGradFront)" />
        <circle cx="63" cy="46" r="13" fill="url(#cloudGradFront)" />
        <ellipse cx="56" cy="62" rx="24" ry="9" fill="url(#cloudGradFront)" />
      </g>
    </svg>
  )
}

export function PartlyCloudyNightIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon drop-shadow-md", className)} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="nightMoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <linearGradient id="nightCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
      </defs>

      {/* Moon Peeking */}
      <path
        d="M48 24C41 24 35 30 35 37C35 44 41 50 48 50C49.8 50 51.5 49.5 53 48.5C50 51.5 45.8 53 41 53C33 53 27 46.5 27 38.5C27 30.5 33 24 41 24C43.5 24 46 24.8 48 26C48 25.3 48 24.6 48 24Z"
        fill="url(#nightMoonGrad)"
        className="animate-weather-float"
      />
      {/* Stars */}
      <circle cx="68" cy="28" r="1.5" fill="#E2E8F0" className="animate-weather-twinkle" style={{ animationDelay: '0.2s' }} />
      <circle cx="78" cy="38" r="1.2" fill="#E2E8F0" className="animate-weather-twinkle" style={{ animationDelay: '0.8s' }} />

      {/* Floating Cloud */}
      <g className="animate-weather-float" style={{ animationDelay: '0.5s' }}>
        <ellipse cx="58" cy="59" rx="21" ry="13" fill="url(#nightCloudGrad)" />
        <circle cx="47" cy="51" r="11" fill="url(#nightCloudGrad)" />
        <circle cx="63" cy="47" r="13" fill="url(#nightCloudGrad)" />
        <ellipse cx="56" cy="63" rx="24" ry="9" fill="url(#nightCloudGrad)" />
      </g>
    </svg>
  )
}

export function CloudyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon drop-shadow-md", className)} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="cloudBackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <linearGradient id="cloudMainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
      </defs>

      {/* Back drifting cloud */}
      <g className="animate-weather-float-back">
        <ellipse cx="40" cy="46" rx="20" ry="12" fill="url(#cloudBackGrad)" opacity="0.65" />
        <circle cx="34" cy="38" r="10" fill="url(#cloudBackGrad)" opacity="0.65" />
        <circle cx="48" cy="38" r="12" fill="url(#cloudBackGrad)" opacity="0.65" />
      </g>

      {/* Foreground main cloud */}
      <g className="animate-weather-float">
        <ellipse cx="56" cy="56" rx="23" ry="14" fill="url(#cloudMainGrad)" />
        <circle cx="44" cy="46" r="12" fill="url(#cloudMainGrad)" />
        <circle cx="62" cy="42" r="14" fill="url(#cloudMainGrad)" />
        <ellipse cx="54" cy="60" rx="26" ry="10" fill="url(#cloudMainGrad)" />
      </g>
    </svg>
  )
}

export function RainyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon drop-shadow-md", className)} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="rainCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <linearGradient id="rainDropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>

      {/* Rain Cloud */}
      <g className="animate-weather-float">
        <ellipse cx="52" cy="40" rx="23" ry="14" fill="url(#rainCloudGrad)" />
        <circle cx="39" cy="32" r="12" fill="url(#rainCloudGrad)" />
        <circle cx="58" cy="29" r="14" fill="url(#rainCloudGrad)" />
        <ellipse cx="50" cy="44" rx="26" ry="8" fill="url(#rainCloudGrad)" />
      </g>

      {/* Smooth Animated Rain Drops */}
      {[
        { x: 33, delay: '0s' },
        { x: 44, delay: '0.4s' },
        { x: 55, delay: '0.2s' },
        { x: 67, delay: '0.6s' }
      ].map((drop, i) => (
        <line
          key={i}
          x1={drop.x}
          y1={54}
          x2={drop.x - 4}
          y2={72}
          stroke="url(#rainDropGrad)"
          strokeWidth="2.8"
          strokeLinecap="round"
          className="animate-weather-rain"
          style={{ animationDelay: drop.delay }}
        />
      ))}
    </svg>
  )
}

export function HeavyRainIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon drop-shadow-md", className)} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="heavyCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="heavyDropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      {/* Dark Ominous Cloud */}
      <g className="animate-weather-float">
        <ellipse cx="50" cy="36" rx="25" ry="15" fill="url(#heavyCloudGrad)" />
        <circle cx="36" cy="28" r="13" fill="url(#heavyCloudGrad)" />
        <circle cx="57" cy="25" r="15" fill="url(#heavyCloudGrad)" />
        <ellipse cx="48" cy="41" rx="28" ry="9" fill="url(#heavyCloudGrad)" />
      </g>

      {/* Heavy Rain Streams */}
      {[
        { x: 28, delay: '0.1s' },
        { x: 38, delay: '0.35s' },
        { x: 48, delay: '0.0s' },
        { x: 58, delay: '0.25s' },
        { x: 68, delay: '0.45s' }
      ].map((drop, i) => (
        <line
          key={i}
          x1={drop.x}
          y1={52}
          x2={drop.x - 6}
          y2={76}
          stroke="url(#heavyDropGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          className="animate-weather-rain-heavy"
          style={{ animationDelay: drop.delay }}
        />
      ))}
    </svg>
  )
}

export function DrizzleIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon drop-shadow-md", className)} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="drizzleCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>

      <g className="animate-weather-float">
        <ellipse cx="50" cy="40" rx="23" ry="14" fill="url(#drizzleCloudGrad)" />
        <circle cx="38" cy="33" r="11" fill="url(#drizzleCloudGrad)" />
        <circle cx="56" cy="31" r="13" fill="url(#drizzleCloudGrad)" />
        <ellipse cx="48" cy="45" rx="25" ry="8" fill="url(#drizzleCloudGrad)" />
      </g>

      {/* Fine Drizzle Mist Particles */}
      {[
        { x: 34, y: 58, delay: '0s' },
        { x: 44, y: 64, delay: '0.5s' },
        { x: 53, y: 60, delay: '0.2s' },
        { x: 63, y: 66, delay: '0.7s' }
      ].map((drop, i) => (
        <circle
          key={i}
          cx={drop.x}
          cy={drop.y}
          r="1.8"
          fill="#60A5FA"
          className="animate-weather-drizzle"
          style={{ animationDelay: drop.delay }}
        />
      ))}
    </svg>
  )
}

export function ThunderstormIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon drop-shadow-md", className)} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="stormCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#64748B" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <filter id="lightningGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="glow" />
          <feComposite in="SourceGraphic" in2="glow" operator="over" />
        </filter>
      </defs>

      {/* Dark Thunder Cloud */}
      <g className="animate-weather-float">
        <ellipse cx="50" cy="34" rx="26" ry="16" fill="url(#stormCloudGrad)" />
        <circle cx="35" cy="25" r="14" fill="url(#stormCloudGrad)" />
        <circle cx="59" cy="23" r="16" fill="url(#stormCloudGrad)" />
        <ellipse cx="48" cy="40" rx="29" ry="9" fill="url(#stormCloudGrad)" />
      </g>

      {/* Electric Lightning Bolt with Flash */}
      <path
        d="M52 42 L43 56 L53 56 L46 76 L62 53 L51 53 Z"
        fill="#FBBF24"
        stroke="#F59E0B"
        strokeWidth="1.2"
        strokeLinejoin="round"
        filter="url(#lightningGlow)"
        className="animate-weather-lightning"
      />
    </svg>
  )
}

export function FoggyIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("weather-icon drop-shadow-md", className)} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="fogCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>

      <g className="animate-weather-float">
        <ellipse cx="50" cy="38" rx="23" ry="13" fill="url(#fogCloudGrad)" opacity="0.6" />
        <circle cx="38" cy="32" r="10" fill="url(#fogCloudGrad)" opacity="0.6" />
        <circle cx="56" cy="30" r="12" fill="url(#fogCloudGrad)" opacity="0.6" />
      </g>

      {/* Drifting Mist Layers */}
      <line x1="22" y1="56" x2="78" y2="56" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" className="animate-weather-fog" />
      <line x1="28" y1="65" x2="72" y2="65" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" className="animate-weather-fog" style={{ animationDelay: '0.5s' }} />
      <line x1="18" y1="74" x2="82" y2="74" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" className="animate-weather-fog" style={{ animationDelay: '1s' }} />
    </svg>
  )
}

export function WeatherIcon({ icon, className }: { icon: string; className?: string }) {
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
    "snowy": CloudyIcon,
  }
  const IconComponent = iconMap[icon] || CloudyIcon
  return <IconComponent className={className} />
}
