"use client"

import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Flame, Radio, Clock, Sparkles } from "lucide-react"

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

  const isUrgent = timeLeft.days < 3

  // ─────────────────────────────────────────────────────────────────────────────
  // Ultra-Compact Horizontal Layout Card for Header & Widgets (size="sm")
  // ─────────────────────────────────────────────────────────────────────────────
  if (size === 'sm') {
    return (
      <div className={cn(
        "relative flex flex-row items-center justify-between gap-2.5 bg-white/95 dark:bg-slate-900/95 border p-2 md:p-2.5 pl-3.5 pr-2.5 rounded-2xl shadow-xl backdrop-blur-2xl transition-all duration-300 hover:shadow-2xl max-w-[420px]",
        timeLeft.isStarted
          ? "border-emerald-300 dark:border-emerald-700/60 ring-2 ring-emerald-500/20"
          : isUrgent
            ? "border-rose-300 dark:border-rose-700/60 ring-2 ring-rose-500/20"
            : "border-slate-200 dark:border-slate-800"
      )}>
        {/* ── TOP-LEFT CORNER BADGE: NEXT (RED) / NOW (GREEN) ── */}
        <div className="absolute -top-2.5 -left-1.5 z-20 pointer-events-none drop-shadow-md">
          {timeLeft.isStarted ? (
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-lg ring-2 ring-white dark:ring-slate-900 animate-pulse">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              NOW
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-lg ring-2 ring-white dark:ring-slate-900">
              <Sparkles className="w-2.5 h-2.5 fill-white text-white" />
              NEXT
            </span>
          )}
        </div>

        {/* Left Side: Title & Status Indicator */}
        <div className="flex flex-col items-start justify-center gap-1 min-w-0 flex-1 overflow-hidden pt-1">
          {title && (
            <div className="w-full overflow-hidden">
              <h3
                className="text-[10px] md:text-xs font-black text-slate-800 dark:text-slate-100 uppercase leading-tight drop-shadow-sm whitespace-nowrap"
                style={{
                  display: 'inline-block',
                  animation: 'marquee-scroll 25s linear infinite',
                  paddingRight: '3rem'
                }}
              >
                {title}
              </h3>
            </div>
          )}
          {startDate && (
            <span className={cn(
              "inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-sm shrink-0",
              timeLeft.isStarted
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
            )}>
              {timeLeft.isStarted ? (
                <>
                  <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse shrink-0" />
                  <span>BERAKHIR DALAM</span>
                </>
              ) : (
                <>
                  <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                  <span>DIMULAI DALAM</span>
                </>
              )}
            </span>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-8 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-700 to-transparent shrink-0 mx-0.5" />

        {/* Right Side: 4 Countdown Time Boxes */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Hari */}
          <div className="flex flex-col items-center justify-center min-w-[36px] md:min-w-[40px] px-1.5 py-1 rounded-xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200/80 dark:border-slate-700 shadow-sm">
            <span className="text-sm md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.days}</span>
            <span className="text-[7px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight mt-0.5">HARI</span>
          </div>

          <span className="text-sm font-black text-rose-400 dark:text-rose-500 animate-pulse -mt-1">:</span>

          {/* Jam */}
          <div className="flex flex-col items-center justify-center min-w-[36px] md:min-w-[40px] px-1.5 py-1 rounded-xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200/80 dark:border-slate-700 shadow-sm">
            <span className="text-sm md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className="text-[7px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight mt-0.5">JAM</span>
          </div>

          <span className="text-sm font-black text-rose-400 dark:text-rose-500 animate-pulse -mt-1">:</span>

          {/* Menit */}
          <div className="flex flex-col items-center justify-center min-w-[36px] md:min-w-[40px] px-1.5 py-1 rounded-xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200/80 dark:border-slate-700 shadow-sm">
            <span className="text-sm md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.minutes.toString().padStart(2, '0')}</span>
            <span className="text-[7px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight mt-0.5">MENIT</span>
          </div>

          <span className="text-sm font-black text-rose-400 dark:text-rose-500 animate-pulse -mt-1">:</span>

          {/* Detik */}
          <div className="flex flex-col items-center justify-center min-w-[36px] md:min-w-[40px] px-1.5 py-1 rounded-xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200/80 dark:border-slate-700 shadow-sm">
            <span className="text-sm md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.seconds.toString().padStart(2, '0')}</span>
            <span className="text-[7px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight mt-0.5">DETIK</span>
          </div>
        </div>

        <style>{`
          @keyframes marquee-scroll {
            0%   { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Medium Card Layout (size="md")
  // ─────────────────────────────────────────────────────────────────────────────
  if (size === 'md') {
    return (
      <div className={cn(
        "relative flex flex-row items-center justify-between gap-3 md:gap-4 bg-white/95 dark:bg-slate-900/95 border p-2.5 md:p-3.5 pl-4 pr-3 rounded-2xl md:rounded-3xl shadow-xl backdrop-blur-2xl transition-all duration-300 hover:shadow-2xl",
        timeLeft.isStarted
          ? "border-emerald-300 dark:border-emerald-700/60 ring-2 ring-emerald-500/20"
          : isUrgent
            ? "border-rose-300 dark:border-rose-700/60 ring-2 ring-rose-500/20"
            : "border-slate-200 dark:border-slate-800"
      )}>
        {/* ── TOP-LEFT CORNER BADGE: NEXT (RED) / NOW (GREEN) ── */}
        <div className="absolute -top-3 -left-2 z-20 pointer-events-none drop-shadow-md">
          {timeLeft.isStarted ? (
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500 text-white text-[10px] md:text-xs font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-lg ring-2 ring-white dark:ring-slate-900 animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              NOW
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white text-[10px] md:text-xs font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-lg ring-2 ring-white dark:ring-slate-900">
              <Sparkles className="w-3 h-3 fill-white text-white" />
              NEXT
            </span>
          )}
        </div>

        {/* Left Side: Title & Status Badge */}
        <div className="flex flex-col items-start justify-center gap-1 min-w-0 flex-1 pt-1">
          {title && (
            <h3 className="text-xs md:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider leading-tight truncate max-w-[180px] md:max-w-[280px] drop-shadow-sm">
              {title}
            </h3>
          )}
          {startDate && (
            <span className={cn(
              "inline-flex items-center gap-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border shadow-sm",
              timeLeft.isStarted
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
            )}>
              {timeLeft.isStarted ? (
                <>
                  <Radio className="w-3 h-3 text-emerald-600 animate-pulse shrink-0" />
                  <span>BERAKHIR DALAM</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>DIMULAI DALAM</span>
                </>
              )}
            </span>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-8 md:h-10 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-700 to-transparent shrink-0 mx-1" />

        {/* Right Side: 4 Countdown Time Boxes */}
        <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
          {/* Hari */}
          <div className="flex flex-col items-center justify-center min-w-[36px] md:min-w-[46px] px-1.5 md:px-2 py-1.5 rounded-xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.days}</span>
            <span className="text-[7px] md:text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">HARI</span>
          </div>

          <span className="text-xs md:text-sm font-black text-rose-400 dark:text-rose-500 animate-pulse -mt-1">:</span>

          {/* Jam */}
          <div className="flex flex-col items-center justify-center min-w-[36px] md:min-w-[46px] px-1.5 md:px-2 py-1.5 rounded-xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className="text-[7px] md:text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">JAM</span>
          </div>

          <span className="text-xs md:text-sm font-black text-rose-400 dark:text-rose-500 animate-pulse -mt-1">:</span>

          {/* Menit */}
          <div className="flex flex-col items-center justify-center min-w-[36px] md:min-w-[46px] px-1.5 md:px-2 py-1.5 rounded-xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.minutes.toString().padStart(2, '0')}</span>
            <span className="text-[7px] md:text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">MENIT</span>
          </div>

          <span className="text-xs md:text-sm font-black text-rose-400 dark:text-rose-500 animate-pulse -mt-1">:</span>

          {/* Detik */}
          <div className="flex flex-col items-center justify-center min-w-[36px] md:min-w-[46px] px-1.5 md:px-2 py-1.5 rounded-xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-xs md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.seconds.toString().padStart(2, '0')}</span>
            <span className="text-[7px] md:text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">DETIK</span>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Large Hero / Modal Layout (size="lg")
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      "relative flex flex-col md:flex-row items-center justify-between gap-5 md:gap-7 max-w-3xl w-full bg-white/95 dark:bg-slate-900/95 border-2 p-5 md:p-8 pt-7 md:pt-8 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl backdrop-blur-2xl transition-all duration-300",
      timeLeft.isStarted
        ? "border-emerald-400 dark:border-emerald-600 ring-4 ring-emerald-500/20 shadow-emerald-500/10"
        : isUrgent
          ? "border-rose-400 dark:border-rose-600 ring-4 ring-rose-500/20 shadow-rose-500/10"
          : "border-rose-200/80 dark:border-slate-800"
    )}>
      {/* ── TOP-LEFT CORNER BADGE: NEXT (RED) / NOW (GREEN) ── */}
      <div className="absolute -top-4 -left-3 md:-top-5 md:-left-4 z-20 pointer-events-none drop-shadow-xl">
        {timeLeft.isStarted ? (
          <span className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500 text-white text-xs md:text-sm font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-2xl ring-4 ring-white dark:ring-slate-900 animate-pulse">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            NOW
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white text-xs md:text-sm font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-2xl ring-4 ring-white dark:ring-slate-900">
            <Sparkles className="w-3.5 h-3.5 fill-white text-white" />
            NEXT
          </span>
        )}
      </div>

      {/* Left Side: Title & Status Indicator */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left gap-3 flex-1 min-w-0">
        {title && (
          <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-wider leading-snug drop-shadow-md">
            {title}
          </h2>
        )}
        {startDate && (
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-md backdrop-blur-md",
            timeLeft.isStarted
              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700"
              : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700"
          )}>
            {timeLeft.isStarted ? (
              <>
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span className="text-xs md:text-sm font-black uppercase tracking-[0.2em]">BERAKHIR DALAM</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs md:text-sm font-black uppercase tracking-[0.2em]">DIMULAI DALAM</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Vertical Divider (Desktop) / Horizontal Divider (Mobile) */}
      <div className="w-full md:w-px h-px md:h-20 bg-gradient-to-r md:bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-700 to-transparent shrink-0 my-1 md:my-0 md:mx-2" />

      {/* Right Side: 4 Large Countdown Boxes */}
      <div className="flex items-center justify-center gap-2 md:gap-3 shrink-0">
        {/* Hari */}
        <div className="flex flex-col items-center justify-center min-w-[58px] md:min-w-[78px] lg:min-w-[88px] px-2.5 py-2 md:py-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-md hover:scale-105 transition-transform">
          <span className="text-2xl md:text-3xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none drop-shadow-sm">{timeLeft.days}</span>
          <span className="text-[8px] md:text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mt-1.5">HARI</span>
        </div>

        <span className="text-lg md:text-2xl font-black text-rose-400 dark:text-rose-500 animate-pulse -mt-2 md:-mt-4">:</span>

        {/* Jam */}
        <div className="flex flex-col items-center justify-center min-w-[58px] md:min-w-[78px] lg:min-w-[88px] px-2.5 py-2 md:py-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-md hover:scale-105 transition-transform">
          <span className="text-2xl md:text-3xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none drop-shadow-sm">{timeLeft.hours.toString().padStart(2, '0')}</span>
          <span className="text-[8px] md:text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mt-1.5">JAM</span>
        </div>

        <span className="text-lg md:text-2xl font-black text-rose-400 dark:text-rose-500 animate-pulse -mt-2 md:-mt-4">:</span>

        {/* Menit */}
        <div className="flex flex-col items-center justify-center min-w-[58px] md:min-w-[78px] lg:min-w-[88px] px-2.5 py-2 md:py-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-md hover:scale-105 transition-transform">
          <span className="text-2xl md:text-3xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none drop-shadow-sm">{timeLeft.minutes.toString().padStart(2, '0')}</span>
          <span className="text-[8px] md:text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mt-1.5">MENIT</span>
        </div>

        <span className="text-lg md:text-2xl font-black text-rose-400 dark:text-rose-500 animate-pulse -mt-2 md:-mt-4">:</span>

        {/* Detik */}
        <div className="flex flex-col items-center justify-center min-w-[58px] md:min-w-[78px] lg:min-w-[88px] px-2.5 py-2 md:py-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-md hover:scale-105 transition-transform">
          <span className="text-2xl md:text-3xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none drop-shadow-sm">{timeLeft.seconds.toString().padStart(2, '0')}</span>
          <span className="text-[8px] md:text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mt-1.5">DETIK</span>
        </div>
      </div>
    </div>
  )
}

