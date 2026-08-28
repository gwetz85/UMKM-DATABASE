"use client"

import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Calendar, Radio, Sparkles } from "lucide-react"

interface EventCountdownProps {
  targetDate: string
  startDate?: string
  size?: 'sm' | 'md' | 'lg'
  title?: string
}

export function EventCountdown({ targetDate, startDate, size = 'lg', title }: EventCountdownProps) {
  const [mounted, setMounted] = React.useState(false)
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isEnded: boolean
    isStarted: boolean
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: false, isStarted: false })

  useEffect(() => {
    setMounted(true)
    if (!targetDate) return

    const calculateTimeLeft = () => {
      const now = +new Date()
      const start = startDate ? +new Date(startDate) : 0
      const end = +new Date(targetDate)
      
      let targetTime = end
      let isStarted = true
      
      if (start && now < start) {
        isStarted = false
        targetTime = start
      }

      const difference = targetTime - now
      
      if (isNaN(difference) || (isStarted && difference <= 0)) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: now >= end, isStarted }
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isEnded: false,
        isStarted
      }
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    setTimeLeft(calculateTimeLeft())

    return () => clearInterval(timer)
  }, [targetDate, startDate])

  if (!mounted || timeLeft.isEnded) return null

  // ─────────────────────────────────────────────────────────────────────────────
  // SVG Graphic Illustration (Pen tool, pencil, floating spheres & bezier curve)
  // ─────────────────────────────────────────────────────────────────────────────
  const CreativeGraphic = ({ className = "w-14 h-14" }: { className?: string }) => (
    <div className={cn("relative shrink-0 flex items-center justify-center select-none pointer-events-none", className)}>
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
        {/* Glowing aura */}
        <circle cx="60" cy="60" r="45" fill="url(#aura_glow)" opacity="0.35" />
        
        {/* Bezier Vector curve */}
        <path d="M 20 85 C 35 45, 85 45, 100 85" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="3 3" />
        <path d="M 25 78 Q 60 30 95 78" stroke="#facc15" strokeWidth="2" opacity="0.85" />
        
        {/* Vector Anchor Points */}
        <rect x="26" y="58" width="6" height="6" rx="1.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
        <rect x="88" y="58" width="6" height="6" rx="1.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />

        {/* Floating 3D Geometric shapes */}
        {/* Yellow 3D Cube (top left) */}
        <g transform="translate(18, 22) rotate(-15)">
          <path d="M 8 0 L 16 4.5 L 8 9 L 0 4.5 Z" fill="#fbbf24" />
          <path d="M 0 4.5 L 8 9 L 8 18 L 0 13.5 Z" fill="#f59e0b" />
          <path d="M 8 9 L 16 4.5 L 16 13.5 L 8 18 Z" fill="#d97706" />
        </g>
        
        {/* Blue/Cyan Sphere (top right) */}
        <circle cx="85" cy="24" r="5.5" fill="url(#cyan_ball)" />
        
        {/* Pink Sphere (bottom right) */}
        <circle cx="102" cy="74" r="6" fill="url(#pink_ball)" />

        {/* Small Yellow Star/Dot */}
        <circle cx="28" cy="76" r="3" fill="#fef08a" />

        {/* Diagonal Pencil (Yellow & Pink Eraser) */}
        <g transform="translate(68, 12) rotate(42)">
          {/* Eraser */}
          <rect x="0" y="0" width="8" height="6" rx="2" fill="#f472b6" />
          {/* Metal Band */}
          <rect x="0" y="6" width="8" height="3" fill="#cbd5e1" />
          {/* Body */}
          <rect x="0" y="9" width="8" height="24" fill="#fbbf24" />
          <rect x="3" y="9" width="2" height="24" fill="#f59e0b" />
          {/* Wooden Tip */}
          <polygon points="0,33 8,33 4,41" fill="#fed7aa" />
          {/* Graphite Lead */}
          <polygon points="3,38 5,38 4,41" fill="#334155" />
        </g>

        {/* Pen Tool / Nib (Foreground Left) */}
        <g transform="translate(42, 42)">
          {/* Nib Body */}
          <path d="M 18 10 L 26 28 C 26 34 22 38 18 42 C 14 38 10 34 10 28 Z" fill="url(#nib_gradient)" stroke="#ffffff" strokeWidth="1.5" />
          {/* Nib Center Line */}
          <line x1="18" y1="12" x2="18" y2="28" stroke="#0f766e" strokeWidth="1.5" />
          <circle cx="18" cy="28" r="2" fill="#0f766e" />
          {/* Base Mount Ring */}
          <rect x="12" y="40" width="12" height="4" rx="2" fill="#6366f1" stroke="#ffffff" strokeWidth="1" />
          {/* Pen Handle Base */}
          <rect x="14" y="44" width="8" height="10" rx="3" fill="#4338ca" />
        </g>

        {/* Gradients */}
        <defs>
          <radialGradient id="aura_glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cyan_ball" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#0891b2" />
          </radialGradient>
          <radialGradient id="pink_ball" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </radialGradient>
          <linearGradient id="nib_gradient" x1="10" y1="10" x2="26" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Size SM: Compact Header & Floating Widget (Pill Capsule Layout)
  // ─────────────────────────────────────────────────────────────────────────────
  if (size === 'sm') {
    return (
      <div className={cn(
        "relative flex items-center justify-between gap-2 overflow-hidden rounded-full shadow-[0_4px_25px_rgba(6,182,212,0.45)] border-[2.5px] border-cyan-300 dark:border-cyan-400 text-white transition-all duration-300 hover:shadow-[0_6px_30px_rgba(6,182,212,0.6)] hover:scale-[1.01]",
        "bg-gradient-to-r from-[#0284c7] via-[#0d9488] to-[#10b981] pl-4 pr-2 py-1.5 md:pl-5 md:pr-2.5 md:py-2 max-w-[440px]"
      )}>
        {/* Center: Badge NEXT/NOW + Title + Countdown Numbers with Labels */}
        <div className="flex flex-col items-center justify-center text-center min-w-0 flex-1">
          {/* Row 1: Icon + NEXT / NOW Badge + Title */}
          <div className="flex items-center justify-center gap-1.5 leading-none w-full">
            {timeLeft.isStarted ? (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm shrink-0">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                </span>
                NOW
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm shrink-0">
                <Calendar className="w-2.5 h-2.5 text-white" />
                NEXT
              </span>
            )}

            {title && (
              <span className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-wider drop-shadow-sm truncate max-w-[160px] md:max-w-[210px]">
                {title}
              </span>
            )}
          </div>

          {/* Row 2: Big Countdown Numbers with Subtitles underneath - CENTERED */}
          <div className="flex items-center justify-center gap-1.5 md:gap-2.5 mt-1">
            {/* Hari */}
            <div className="flex flex-col items-center min-w-[28px]">
              <span className="text-sm md:text-base font-black text-white font-mono leading-none drop-shadow-md">{timeLeft.days}</span>
              <span className="text-[8px] md:text-[9px] font-bold text-cyan-100 uppercase tracking-tighter mt-0.5">Hari</span>
            </div>

            <span className="text-xs md:text-sm font-black text-cyan-200 animate-pulse -mt-2.5">:</span>

            {/* Jam */}
            <div className="flex flex-col items-center min-w-[28px]">
              <span className="text-sm md:text-base font-black text-white font-mono leading-none drop-shadow-md">{timeLeft.hours.toString().padStart(2, '0')}</span>
              <span className="text-[8px] md:text-[9px] font-bold text-cyan-100 uppercase tracking-tighter mt-0.5">Jam</span>
            </div>

            <span className="text-xs md:text-sm font-black text-cyan-200 animate-pulse -mt-2.5">:</span>

            {/* Menit */}
            <div className="flex flex-col items-center min-w-[28px]">
              <span className="text-sm md:text-base font-black text-white font-mono leading-none drop-shadow-md">{timeLeft.minutes.toString().padStart(2, '0')}</span>
              <span className="text-[8px] md:text-[9px] font-bold text-cyan-100 uppercase tracking-tighter mt-0.5">Menit</span>
            </div>

            <span className="text-xs md:text-sm font-black text-cyan-200 animate-pulse -mt-2.5">:</span>

            {/* Detik */}
            <div className="flex flex-col items-center min-w-[28px]">
              <span className="text-sm md:text-base font-black text-white font-mono leading-none drop-shadow-md">{timeLeft.seconds.toString().padStart(2, '0')}</span>
              <span className="text-[8px] md:text-[9px] font-bold text-cyan-100 uppercase tracking-tighter mt-0.5">Detik</span>
            </div>
          </div>
        </div>

        {/* Right Side: Creative Graphic */}
        <CreativeGraphic className="w-12 h-12 md:w-14 md:h-14 shrink-0" />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Size MD: Medium Capsule Card
  // ─────────────────────────────────────────────────────────────────────────────
  if (size === 'md') {
    return (
      <div className={cn(
        "relative flex items-center justify-between gap-4 overflow-hidden rounded-full shadow-[0_6px_30px_rgba(6,182,212,0.45)] border-[3px] border-cyan-300 dark:border-cyan-400 text-white transition-all duration-300 hover:shadow-[0_8px_35px_rgba(6,182,212,0.6)] hover:scale-[1.01]",
        "bg-gradient-to-r from-[#0284c7] via-[#0d9488] to-[#10b981] pl-6 pr-3 py-2.5 md:pl-8 md:pr-4 md:py-3 max-w-[540px]"
      )}>
        {/* Center: NEXT/NOW + Title + Numbers */}
        <div className="flex flex-col items-center justify-center text-center min-w-0 flex-1">
          {/* Row 1: NEXT/NOW + Title */}
          <div className="flex items-center justify-center gap-2 leading-none w-full">
            {timeLeft.isStarted ? (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[10px] md:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                NOW
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white text-[10px] md:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md shrink-0">
                <Calendar className="w-3 h-3 text-white" />
                NEXT
              </span>
            )}

            {title && (
              <span className="text-xs md:text-sm font-black text-white uppercase tracking-wider drop-shadow-md truncate max-w-[200px] md:max-w-[260px]">
                {title}
              </span>
            )}
          </div>

          {/* Row 2: Countdown Digits with Labels - CENTERED */}
          <div className="flex items-center justify-center gap-2 md:gap-3.5 mt-1.5">
            {/* Hari */}
            <div className="flex flex-col items-center min-w-[36px]">
              <span className="text-lg md:text-2xl font-black text-white font-mono leading-none drop-shadow-md">{timeLeft.days}</span>
              <span className="text-[9px] md:text-[10px] font-bold text-cyan-100 uppercase tracking-tighter mt-0.5">Hari</span>
            </div>

            <span className="text-base md:text-xl font-black text-cyan-200 animate-pulse -mt-3">:</span>

            {/* Jam */}
            <div className="flex flex-col items-center min-w-[36px]">
              <span className="text-lg md:text-2xl font-black text-white font-mono leading-none drop-shadow-md">{timeLeft.hours.toString().padStart(2, '0')}</span>
              <span className="text-[9px] md:text-[10px] font-bold text-cyan-100 uppercase tracking-tighter mt-0.5">Jam</span>
            </div>

            <span className="text-base md:text-xl font-black text-cyan-200 animate-pulse -mt-3">:</span>

            {/* Menit */}
            <div className="flex flex-col items-center min-w-[36px]">
              <span className="text-lg md:text-2xl font-black text-white font-mono leading-none drop-shadow-md">{timeLeft.minutes.toString().padStart(2, '0')}</span>
              <span className="text-[9px] md:text-[10px] font-bold text-cyan-100 uppercase tracking-tighter mt-0.5">Menit</span>
            </div>

            <span className="text-base md:text-xl font-black text-cyan-200 animate-pulse -mt-3">:</span>

            {/* Detik */}
            <div className="flex flex-col items-center min-w-[36px]">
              <span className="text-lg md:text-2xl font-black text-white font-mono leading-none drop-shadow-md">{timeLeft.seconds.toString().padStart(2, '0')}</span>
              <span className="text-[9px] md:text-[10px] font-bold text-cyan-100 uppercase tracking-tighter mt-0.5">Detik</span>
            </div>
          </div>
        </div>

        {/* Right Side: Creative Graphic */}
        <CreativeGraphic className="w-16 h-16 md:w-20 md:h-20 shrink-0" />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Size LG: Large Hero / Modal Capsule (Exact matching reference image)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      "relative flex items-center justify-between gap-6 overflow-hidden rounded-full shadow-[0_8px_40px_rgba(6,182,212,0.5)] border-[3.5px] border-cyan-300 dark:border-cyan-400 text-white transition-all duration-300 hover:shadow-[0_12px_50px_rgba(6,182,212,0.65)] hover:scale-[1.01] w-full max-w-2xl",
      "bg-gradient-to-r from-[#0284c7] via-[#0d9488] to-[#10b981] pl-8 pr-4 py-3.5 md:pl-10 md:pr-6 md:py-5"
    )}>
      {/* Center Content */}
      <div className="flex flex-col items-center justify-center text-center min-w-0 flex-1">
        {/* Row 1: 🗓️ NEXT / NOW */}
        <div className="flex items-center justify-center gap-2">
          {timeLeft.isStarted ? (
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs md:text-sm font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              NOW
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white text-xs md:text-sm font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
              <Calendar className="w-3.5 h-3.5 text-white" />
              NEXT
            </span>
          )}
        </div>

        {/* Row 2: Event Title */}
        {title && (
          <h2 className="text-sm md:text-lg lg:text-xl font-black text-white uppercase tracking-wider drop-shadow-md mt-1.5 truncate max-w-[280px] md:max-w-[380px]">
            {title}
          </h2>
        )}

        {/* Row 3: Big Digits with Subtitle Labels - CENTERED */}
        <div className="flex items-center justify-center gap-3 md:gap-5 mt-2">
          {/* Hari */}
          <div className="flex flex-col items-center min-w-[44px]">
            <span className="text-2xl md:text-3xl lg:text-4xl font-black text-white font-mono leading-none drop-shadow-lg">{timeLeft.days}</span>
            <span className="text-[10px] md:text-xs font-bold text-cyan-100 uppercase tracking-wider mt-1">Hari</span>
          </div>

          <span className="text-xl md:text-2xl lg:text-3xl font-black text-cyan-200 animate-pulse -mt-4">:</span>

          {/* Jam */}
          <div className="flex flex-col items-center min-w-[44px]">
            <span className="text-2xl md:text-3xl lg:text-4xl font-black text-white font-mono leading-none drop-shadow-lg">{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className="text-[10px] md:text-xs font-bold text-cyan-100 uppercase tracking-wider mt-1">Jam</span>
          </div>

          <span className="text-xl md:text-2xl lg:text-3xl font-black text-cyan-200 animate-pulse -mt-4">:</span>

          {/* Menit */}
          <div className="flex flex-col items-center min-w-[44px]">
            <span className="text-2xl md:text-3xl lg:text-4xl font-black text-white font-mono leading-none drop-shadow-lg">{timeLeft.minutes.toString().padStart(2, '0')}</span>
            <span className="text-[10px] md:text-xs font-bold text-cyan-100 uppercase tracking-wider mt-1">Menit</span>
          </div>

          <span className="text-xl md:text-2xl lg:text-3xl font-black text-cyan-200 animate-pulse -mt-4">:</span>

          {/* Detik */}
          <div className="flex flex-col items-center min-w-[44px]">
            <span className="text-2xl md:text-3xl lg:text-4xl font-black text-white font-mono leading-none drop-shadow-lg">{timeLeft.seconds.toString().padStart(2, '0')}</span>
            <span className="text-[10px] md:text-xs font-bold text-cyan-100 uppercase tracking-wider mt-1">Detik</span>
          </div>
        </div>
      </div>

      {/* Right Side: Creative 3D Graphic */}
      <CreativeGraphic className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 shrink-0" />
    </div>
  )
}


