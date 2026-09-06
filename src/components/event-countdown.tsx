"use client"

import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Calendar, Clock, Zap } from "lucide-react"

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

  // ─── UNIT BLOCK: Reusable digit + label ───────────────────────────────────
  const UnitBlock = ({
    value,
    label,
    textSize = "text-base",
    labelSize = "text-[8px]",
    minW = "min-w-[28px]",
    glass = false,
  }: {
    value: string | number
    label: string
    textSize?: string
    labelSize?: string
    minW?: string
    glass?: boolean
  }) => (
    <div className={cn(
      "flex flex-col items-center justify-center",
      minW,
      glass && "bg-white/10 backdrop-blur-sm rounded-xl px-2 py-1.5 border border-white/20 shadow-inner"
    )}>
      <span className={cn("font-black font-mono leading-none text-white tabular-nums drop-shadow-md", textSize)}>
        {typeof value === 'number' ? String(value).padStart(2, '0') : value}
      </span>
      <span className={cn("font-bold text-white/60 uppercase tracking-widest mt-0.5", labelSize)}>
        {label}
      </span>
    </div>
  )

  // ─── SEPARATOR ────────────────────────────────────────────────────────────
  const Sep = ({ className = "text-sm" }: { className?: string }) => (
    <span className={cn("font-black text-white/40 -translate-y-1 select-none", className)}>:</span>
  )

  // ─── LIVE BADGE ───────────────────────────────────────────────────────────
  const LiveBadge = ({ compact = false }: { compact?: boolean }) =>
    timeLeft.isStarted ? (
      <span className={cn(
        "inline-flex items-center gap-1 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-full shadow-lg shadow-emerald-500/40 shrink-0",
        compact ? "text-[8px] px-1.5 py-0.5" : "text-[9px] px-2 py-0.5"
      )}>
        <span className="relative flex w-1.5 h-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
          <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-white" />
        </span>
        NOW
      </span>
    ) : (
      <span className={cn(
        "inline-flex items-center gap-1 bg-amber-500 text-white font-black uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/40 shrink-0",
        compact ? "text-[8px] px-1.5 py-0.5" : "text-[9px] px-2 py-0.5"
      )}>
        <Calendar className={compact ? "w-2 h-2" : "w-2.5 h-2.5"} />
        NEXT
      </span>
    )

  // ─── SIZE SM ──────────────────────────────────────────────────────────────
  if (size === 'sm') {
    return (
      <div className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-2",
        "bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500",
        "shadow-[0_4px_20px_rgba(99,102,241,0.45)] border border-white/20",
        "transition-all duration-300 hover:shadow-[0_6px_28px_rgba(99,102,241,0.6)] hover:scale-[1.01]",
        "max-w-[440px]"
      )}>
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none rounded-2xl" />

        {/* Content */}
        <div className="flex flex-col gap-0.5 min-w-0 flex-1 z-10">
          <div className="flex items-center gap-1.5">
            <LiveBadge compact />
            {title && (
              <span className="text-[10px] font-black text-white/90 uppercase tracking-wide truncate">
                {title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <UnitBlock value={timeLeft.days} label="Hari" textSize="text-sm" labelSize="text-[7px]" minW="min-w-[22px]" />
            <Sep className="text-xs -translate-y-0.5" />
            <UnitBlock value={timeLeft.hours} label="Jam" textSize="text-sm" labelSize="text-[7px]" minW="min-w-[22px]" />
            <Sep className="text-xs -translate-y-0.5" />
            <UnitBlock value={timeLeft.minutes} label="Menit" textSize="text-sm" labelSize="text-[7px]" minW="min-w-[22px]" />
            <Sep className="text-xs -translate-y-0.5" />
            <UnitBlock value={timeLeft.seconds} label="Detik" textSize="text-sm" labelSize="text-[7px]" minW="min-w-[22px]" />
          </div>
        </div>

        {/* Icon */}
        <div className="shrink-0 z-10 bg-white/15 rounded-xl p-1.5 border border-white/20 backdrop-blur-sm">
          <Clock className="w-5 h-5 text-white drop-shadow" />
        </div>
      </div>
    )
  }

  // ─── SIZE MD ──────────────────────────────────────────────────────────────
  if (size === 'md') {
    return (
      <div className={cn(
        "relative flex items-center gap-5 overflow-hidden rounded-2xl px-6 py-3",
        "bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500",
        "shadow-[0_6px_30px_rgba(99,102,241,0.45)] border border-white/20",
        "transition-all duration-300 hover:shadow-[0_8px_38px_rgba(99,102,241,0.6)] hover:scale-[1.01]",
        "max-w-[540px]"
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none rounded-2xl" />
        <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-violet-400/20 blur-2xl pointer-events-none" />

        <div className="flex flex-col items-start gap-1.5 min-w-0 flex-1 z-10">
          <div className="flex items-center gap-2">
            <LiveBadge />
            {title && (
              <span className="text-xs font-black text-white uppercase tracking-wide truncate max-w-[240px]">
                {title}
              </span>
            )}
          </div>

          <div className="flex items-end gap-2">
            <UnitBlock value={timeLeft.days} label="Hari" textSize="text-2xl" labelSize="text-[9px]" minW="min-w-[36px]" glass />
            <Sep className="text-xl -translate-y-3" />
            <UnitBlock value={timeLeft.hours} label="Jam" textSize="text-2xl" labelSize="text-[9px]" minW="min-w-[36px]" glass />
            <Sep className="text-xl -translate-y-3" />
            <UnitBlock value={timeLeft.minutes} label="Menit" textSize="text-2xl" labelSize="text-[9px]" minW="min-w-[36px]" glass />
            <Sep className="text-xl -translate-y-3" />
            <UnitBlock value={timeLeft.seconds} label="Detik" textSize="text-2xl" labelSize="text-[9px]" minW="min-w-[36px]" glass />
          </div>
        </div>

        <div className="shrink-0 z-10 bg-white/15 rounded-xl p-2.5 border border-white/25 backdrop-blur-sm shadow-inner">
          <Zap className="w-7 h-7 text-yellow-300 drop-shadow" />
        </div>
      </div>
    )
  }

  // ─── SIZE LG ──────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      "relative flex items-center justify-between gap-6 overflow-hidden rounded-3xl w-full max-w-2xl",
      "bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500",
      "shadow-[0_8px_40px_rgba(99,102,241,0.5)] border border-white/20",
      "transition-all duration-300 hover:shadow-[0_12px_55px_rgba(99,102,241,0.65)] hover:scale-[1.01]",
      "px-8 py-5 md:px-10 md:py-6"
    )}>
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 pointer-events-none rounded-3xl" />
      <div className="absolute -top-12 -left-12 w-36 h-36 rounded-full bg-violet-400/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-cyan-400/30 blur-2xl pointer-events-none" />

      {/* Content */}
      <div className="flex flex-col items-start gap-2 min-w-0 flex-1 z-10">
        {/* Badge + Title */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {timeLeft.isStarted ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] md:text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-emerald-500/40">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
                <span className="relative inline-flex rounded-full w-2 h-2 bg-white" />
              </span>
              NOW
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-[10px] md:text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-amber-500/40">
              <Calendar className="w-3 h-3" />
              NEXT
            </span>
          )}

          {title && (
            <h2 className="text-sm md:text-base lg:text-lg font-black text-white uppercase tracking-wide drop-shadow truncate max-w-[260px] md:max-w-[360px]">
              {title}
            </h2>
          )}
        </div>

        {/* Digits */}
        <div className="flex items-end gap-2.5 md:gap-4 mt-1">
          <UnitBlock value={timeLeft.days} label="Hari" textSize="text-3xl md:text-4xl" labelSize="text-[9px] md:text-[10px]" minW="min-w-[48px]" glass />
          <Sep className="text-2xl md:text-3xl -translate-y-4" />
          <UnitBlock value={timeLeft.hours} label="Jam" textSize="text-3xl md:text-4xl" labelSize="text-[9px] md:text-[10px]" minW="min-w-[48px]" glass />
          <Sep className="text-2xl md:text-3xl -translate-y-4" />
          <UnitBlock value={timeLeft.minutes} label="Menit" textSize="text-3xl md:text-4xl" labelSize="text-[9px] md:text-[10px]" minW="min-w-[48px]" glass />
          <Sep className="text-2xl md:text-3xl -translate-y-4" />
          <UnitBlock value={timeLeft.seconds} label="Detik" textSize="text-3xl md:text-4xl" labelSize="text-[9px] md:text-[10px]" minW="min-w-[48px]" glass />
        </div>
      </div>

      {/* Right icon */}
      <div className="shrink-0 z-10 bg-white/15 rounded-2xl p-4 border border-white/25 backdrop-blur-sm shadow-inner">
        <Zap className="w-10 h-10 text-yellow-300 drop-shadow-lg" />
      </div>
    </div>
  )
}
