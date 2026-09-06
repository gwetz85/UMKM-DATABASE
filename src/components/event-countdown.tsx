"use client"

import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Calendar } from "lucide-react"

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

  // ─── UNIT BLOCK: Reusable enlarged digit block (no sub-labels) ───────────
  const UnitBlock = ({
    value,
    textSize = "text-xl md:text-2xl",
    minW = "min-w-[34px]",
    padding = "px-2.5 py-1",
    glass = true,
  }: {
    value: string | number
    textSize?: string
    minW?: string
    padding?: string
    glass?: boolean
  }) => (
    <div className={cn(
      "flex items-center justify-center leading-none",
      minW,
      glass && cn("bg-white/15 backdrop-blur-md rounded-lg md:rounded-xl border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] shadow-black/10", padding)
    )}>
      <span className={cn("font-black font-mono leading-none text-white tabular-nums drop-shadow-md", textSize)}>
        {typeof value === 'number' ? String(value).padStart(2, '0') : value}
      </span>
    </div>
  )

  // ─── SEPARATOR ────────────────────────────────────────────────────────────
  const Sep = ({ className = "text-base md:text-lg" }: { className?: string }) => (
    <span className={cn("font-black text-white/70 select-none animate-pulse px-0.5 leading-none", className)}>:</span>
  )

  // ─── LIVE BADGE ───────────────────────────────────────────────────────────
  const LiveBadge = ({ compact = false }: { compact?: boolean }) =>
    timeLeft.isStarted ? (
      <span className={cn(
        "inline-flex items-center gap-1 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-full shadow-md shadow-emerald-500/40 shrink-0 leading-none",
        compact ? "text-[8px] px-1.5 py-0.5" : "text-[9px] px-2.5 py-0.5"
      )}>
        <span className="relative flex w-1.5 h-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
          <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-white" />
        </span>
        NOW
      </span>
    ) : (
      <span className={cn(
        "inline-flex items-center gap-1 bg-amber-500 text-white font-black uppercase tracking-widest rounded-full shadow-md shadow-amber-500/40 shrink-0 leading-none",
        compact ? "text-[8px] px-1.5 py-0.5" : "text-[9px] px-2.5 py-0.5"
      )}>
        <Calendar className={compact ? "w-2 h-2" : "w-2.5 h-2.5"} />
        NEXT
      </span>
    )

  // ─── SIZE SM ──────────────────────────────────────────────────────────────
  if (size === 'sm') {
    return (
      <div className={cn(
        "relative flex flex-col items-center justify-center text-center overflow-hidden rounded-2xl px-5 py-2 my-auto",
        "bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500",
        "shadow-[0_4px_18px_rgba(99,102,241,0.4)] border border-white/25",
        "transition-all duration-300 hover:shadow-[0_6px_24px_rgba(99,102,241,0.55)] hover:scale-[1.01]",
        "max-w-[420px] mx-auto"
      )}>
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none rounded-2xl" />

        {/* Top: Live Badge + Title (Centered with proper breathing room) */}
        <div className="flex items-center justify-center gap-2 mb-1.5 z-10 leading-none">
          <LiveBadge compact />
          {title && (
            <span className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-wider drop-shadow truncate max-w-[210px] leading-tight">
              {title}
            </span>
          )}
        </div>

        {/* Center: Enlarged Digits with comfortable breathing room */}
        <div className="flex items-center justify-center gap-1.5 z-10 leading-none">
          <UnitBlock value={timeLeft.days} textSize="text-base md:text-lg font-black" minW="min-w-[32px]" padding="px-2 py-0.5" />
          <Sep className="text-sm md:text-base" />
          <UnitBlock value={timeLeft.hours} textSize="text-base md:text-lg font-black" minW="min-w-[32px]" padding="px-2 py-0.5" />
          <Sep className="text-sm md:text-base" />
          <UnitBlock value={timeLeft.minutes} textSize="text-base md:text-lg font-black" minW="min-w-[32px]" padding="px-2 py-0.5" />
          <Sep className="text-sm md:text-base" />
          <UnitBlock value={timeLeft.seconds} textSize="text-base md:text-lg font-black" minW="min-w-[32px]" padding="px-2 py-0.5" />
        </div>
      </div>
    )
  }

  // ─── SIZE MD ──────────────────────────────────────────────────────────────
  if (size === 'md') {
    return (
      <div className={cn(
        "relative flex flex-col items-center justify-center text-center overflow-hidden rounded-2xl px-7 py-3.5",
        "bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500",
        "shadow-[0_6px_30px_rgba(99,102,241,0.45)] border border-white/25",
        "transition-all duration-300 hover:shadow-[0_8px_38px_rgba(99,102,241,0.6)] hover:scale-[1.01]",
        "max-w-[540px] mx-auto"
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none rounded-2xl" />
        <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-violet-400/25 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-cyan-400/25 blur-2xl pointer-events-none" />

        {/* Top: Live Badge + Title (Centered) */}
        <div className="flex items-center justify-center gap-2 mb-2 z-10">
          <LiveBadge />
          {title && (
            <span className="text-xs md:text-sm font-black text-white uppercase tracking-wider drop-shadow truncate max-w-[280px]">
              {title}
            </span>
          )}
        </div>

        {/* Center: Enlarged Digits without labels */}
        <div className="flex items-center justify-center gap-2 md:gap-2.5 z-10">
          <UnitBlock value={timeLeft.days} textSize="text-2xl md:text-3xl font-black" minW="min-w-[48px]" />
          <Sep className="text-xl md:text-2xl" />
          <UnitBlock value={timeLeft.hours} textSize="text-2xl md:text-3xl font-black" minW="min-w-[48px]" />
          <Sep className="text-xl md:text-2xl" />
          <UnitBlock value={timeLeft.minutes} textSize="text-2xl md:text-3xl font-black" minW="min-w-[48px]" />
          <Sep className="text-xl md:text-2xl" />
          <UnitBlock value={timeLeft.seconds} textSize="text-2xl md:text-3xl font-black" minW="min-w-[48px]" />
        </div>
      </div>
    )
  }

  // ─── SIZE LG ──────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      "relative flex flex-col items-center justify-center text-center overflow-hidden rounded-3xl w-full max-w-2xl mx-auto",
      "bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500",
      "shadow-[0_8px_40px_rgba(99,102,241,0.5)] border border-white/25",
      "transition-all duration-300 hover:shadow-[0_12px_55px_rgba(99,102,241,0.65)] hover:scale-[1.01]",
      "px-8 py-6 md:px-12 md:py-8"
    )}>
      {/* Background ambient light */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/15 pointer-events-none rounded-3xl" />
      <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-violet-400/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-cyan-400/30 blur-3xl pointer-events-none" />

      {/* Top: Badge + Title (Centered) */}
      <div className="flex items-center justify-center gap-3 mb-4 flex-wrap z-10">
        {timeLeft.isStarted ? (
          <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs md:text-sm font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow-lg shadow-emerald-500/40">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-white" />
            </span>
            NOW
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-xs md:text-sm font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow-lg shadow-amber-500/40">
            <Calendar className="w-3.5 h-3.5" />
            NEXT
          </span>
        )}

        {title && (
          <h2 className="text-base md:text-xl lg:text-2xl font-black text-white uppercase tracking-wider drop-shadow truncate max-w-[320px] md:max-w-[440px]">
            {title}
          </h2>
        )}
      </div>

      {/* Center: Extra Large Digits without labels */}
      <div className="flex items-center justify-center gap-2.5 md:gap-4 z-10">
        <UnitBlock value={timeLeft.days} textSize="text-3xl md:text-5xl lg:text-6xl font-black" minW="min-w-[62px] md:min-w-[84px]" />
        <Sep className="text-2xl md:text-4xl lg:text-5xl" />
        <UnitBlock value={timeLeft.hours} textSize="text-3xl md:text-5xl lg:text-6xl font-black" minW="min-w-[62px] md:min-w-[84px]" />
        <Sep className="text-2xl md:text-4xl lg:text-5xl" />
        <UnitBlock value={timeLeft.minutes} textSize="text-3xl md:text-5xl lg:text-6xl font-black" minW="min-w-[62px] md:min-w-[84px]" />
        <Sep className="text-2xl md:text-4xl lg:text-5xl" />
        <UnitBlock value={timeLeft.seconds} textSize="text-3xl md:text-5xl lg:text-6xl font-black" minW="min-w-[62px] md:min-w-[84px]" />
      </div>
    </div>
  )
}
