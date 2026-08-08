"use client"

import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

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

  if (size === 'sm') {
    return (
      <div className="flex flex-col items-center gap-1 w-full">
        {title && (
          <>
            <span className="text-[10px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-[0.15em] line-clamp-1 max-w-[220px] text-center">
              {title}
            </span>
            <div className="w-full max-w-[160px] h-px bg-gradient-to-r from-transparent via-rose-300 dark:via-rose-700 to-transparent my-0.5" />
          </>
        )}
        {startDate && (
          <span className={cn(
            "text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border",
            timeLeft.isStarted
              ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
              : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
          )}>
            {timeLeft.isStarted ? "Berakhir Dalam" : "Dimulai Dalam"}
          </span>
        )}
        <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 border border-rose-200/80 dark:border-slate-800 p-1.5 rounded-xl shadow-sm backdrop-blur-md">
          <div className="flex flex-col items-center justify-center min-w-[32px] px-1.5 py-0.5 rounded-lg bg-rose-50/80 dark:bg-slate-800 border border-rose-100 dark:border-slate-700">
            <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.days}</span>
            <span className="text-[7px] font-black text-rose-700/80 dark:text-rose-300 uppercase tracking-tighter">HARI</span>
          </div>
          <span className="text-[10px] font-black text-rose-400 animate-pulse -mt-1">:</span>
          <div className="flex flex-col items-center justify-center min-w-[32px] px-1.5 py-0.5 rounded-lg bg-rose-50/80 dark:bg-slate-800 border border-rose-100 dark:border-slate-700">
            <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className="text-[7px] font-black text-rose-700/80 dark:text-rose-300 uppercase tracking-tighter">JAM</span>
          </div>
          <span className="text-[10px] font-black text-rose-400 animate-pulse -mt-1">:</span>
          <div className="flex flex-col items-center justify-center min-w-[32px] px-1.5 py-0.5 rounded-lg bg-rose-50/80 dark:bg-slate-800 border border-rose-100 dark:border-slate-700">
            <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.minutes.toString().padStart(2, '0')}</span>
            <span className="text-[7px] font-black text-rose-700/80 dark:text-rose-300 uppercase tracking-tighter">MENIT</span>
          </div>
          <span className="text-[10px] font-black text-rose-400 animate-pulse -mt-1">:</span>
          <div className="flex flex-col items-center justify-center min-w-[32px] px-1.5 py-0.5 rounded-lg bg-rose-50/80 dark:bg-slate-800 border border-rose-100 dark:border-slate-700">
            <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.seconds.toString().padStart(2, '0')}</span>
            <span className="text-[7px] font-black text-rose-700/80 dark:text-rose-300 uppercase tracking-tighter">DETIK</span>
          </div>
        </div>
      </div>
    )
  }

  if (size === 'md') {
    return (
      <div className="flex flex-col items-center gap-2 w-full">
        {title && (
          <>
            <h3 className="text-xs md:text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.2em] text-center max-w-xs leading-tight drop-shadow-sm px-2">
              {title}
            </h3>
            <div className="w-full max-w-[200px] h-px bg-gradient-to-r from-transparent via-rose-300 dark:via-rose-700 to-transparent my-1" />
          </>
        )}
        {startDate && (
          <span className={cn(
            "text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border shadow-sm",
            timeLeft.isStarted
              ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
              : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800"
          )}>
            {timeLeft.isStarted ? "Berakhir Dalam" : "Dimulai Dalam"}
          </span>
        )}
        <div className={cn(
          "flex items-center gap-1.5 md:gap-2 bg-white/95 dark:bg-slate-900/95 p-2 md:p-3 rounded-2xl md:rounded-3xl border shadow-xl backdrop-blur-xl transition-all",
          isUrgent ? "border-rose-300 ring-2 ring-rose-400/30" : "border-slate-200 dark:border-slate-800"
        )}>
          <div className="flex flex-col items-center justify-center min-w-[44px] md:min-w-[56px] px-2 py-1.5 md:py-2 rounded-xl bg-gradient-to-b from-rose-50 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-100 dark:border-slate-700 shadow-sm">
            <span className="text-base md:text-xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.days}</span>
            <span className="text-[8px] md:text-[9px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider mt-1">HARI</span>
          </div>
          <span className="text-sm md:text-lg font-black text-rose-400 animate-pulse -mt-2">:</span>
          <div className="flex flex-col items-center justify-center min-w-[44px] md:min-w-[56px] px-2 py-1.5 md:py-2 rounded-xl bg-gradient-to-b from-rose-50 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-100 dark:border-slate-700 shadow-sm">
            <span className="text-base md:text-xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className="text-[8px] md:text-[9px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider mt-1">JAM</span>
          </div>
          <span className="text-sm md:text-lg font-black text-rose-400 animate-pulse -mt-2">:</span>
          <div className="flex flex-col items-center justify-center min-w-[44px] md:min-w-[56px] px-2 py-1.5 md:py-2 rounded-xl bg-gradient-to-b from-rose-50 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-100 dark:border-slate-700 shadow-sm">
            <span className="text-base md:text-xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.minutes.toString().padStart(2, '0')}</span>
            <span className="text-[8px] md:text-[9px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider mt-1">MENIT</span>
          </div>
          <span className="text-sm md:text-lg font-black text-rose-400 animate-pulse -mt-2">:</span>
          <div className="flex flex-col items-center justify-center min-w-[44px] md:min-w-[56px] px-2 py-1.5 md:py-2 rounded-xl bg-gradient-to-b from-rose-50 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-100 dark:border-slate-700 shadow-sm">
            <span className="text-base md:text-xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.seconds.toString().padStart(2, '0')}</span>
            <span className="text-[8px] md:text-[9px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider mt-1">DETIK</span>
          </div>
        </div>
      </div>
    )
  }

  // Large size (Hero / Full Screen)
  return (
    <div className="flex flex-col items-center gap-3 md:gap-5 max-w-xl w-full">
      {title && (
        <>
          <h2 className="text-xl md:text-3xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.2em] text-center leading-snug drop-shadow-md px-4">
            {title}
          </h2>
          <div className="w-48 md:w-64 h-1 bg-gradient-to-r from-transparent via-rose-400 dark:via-rose-600 to-transparent rounded-full my-1" />
        </>
      )}

      {startDate && (
        <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full border shadow-lg backdrop-blur-md animate-pulse bg-white/10 border-white/20">
          <span className={cn(
            "text-xs md:text-sm font-black uppercase tracking-[0.25em]",
            timeLeft.isStarted ? "text-emerald-500 dark:text-emerald-400" : "text-amber-500 dark:text-amber-400"
          )}>
            {timeLeft.isStarted ? "BERAKHIR DALAM" : "DIMULAI DALAM"}
          </span>
        </div>
      )}

      <div className={cn(
        "flex items-center justify-center gap-2 md:gap-4 p-3 md:p-6 bg-white/95 dark:bg-slate-900/95 border-2 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl backdrop-blur-2xl transition-all",
        isUrgent ? "border-rose-400 ring-4 ring-rose-500/20 shadow-rose-500/10" : "border-rose-200/80 dark:border-slate-800"
      )}>
        <div className="flex flex-col items-center justify-center min-w-[64px] md:min-w-[96px] lg:min-w-[110px] px-3 py-3 md:py-4 rounded-2xl md:rounded-3xl bg-gradient-to-b from-rose-50/80 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-200/70 dark:border-slate-700 shadow-md hover:scale-105 transition-transform">
          <span className="text-2xl md:text-4xl lg:text-5xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none drop-shadow-sm">{timeLeft.days}</span>
          <span className="text-[9px] md:text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-[0.2em] mt-2">HARI</span>
        </div>

        <span className="text-xl md:text-3xl lg:text-4xl font-black text-rose-400 animate-pulse -mt-3 md:-mt-5">:</span>

        <div className="flex flex-col items-center justify-center min-w-[64px] md:min-w-[96px] lg:min-w-[110px] px-3 py-3 md:py-4 rounded-2xl md:rounded-3xl bg-gradient-to-b from-rose-50/80 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-200/70 dark:border-slate-700 shadow-md hover:scale-105 transition-transform">
          <span className="text-2xl md:text-4xl lg:text-5xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none drop-shadow-sm">{timeLeft.hours.toString().padStart(2, '0')}</span>
          <span className="text-[9px] md:text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-[0.2em] mt-2">JAM</span>
        </div>

        <span className="text-xl md:text-3xl lg:text-4xl font-black text-rose-400 animate-pulse -mt-3 md:-mt-5">:</span>

        <div className="flex flex-col items-center justify-center min-w-[64px] md:min-w-[96px] lg:min-w-[110px] px-3 py-3 md:py-4 rounded-2xl md:rounded-3xl bg-gradient-to-b from-rose-50/80 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-200/70 dark:border-slate-700 shadow-md hover:scale-105 transition-transform">
          <span className="text-2xl md:text-4xl lg:text-5xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none drop-shadow-sm">{timeLeft.minutes.toString().padStart(2, '0')}</span>
          <span className="text-[9px] md:text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-[0.2em] mt-2">MENIT</span>
        </div>

        <span className="text-xl md:text-3xl lg:text-4xl font-black text-rose-400 animate-pulse -mt-3 md:-mt-5">:</span>

        <div className="flex flex-col items-center justify-center min-w-[64px] md:min-w-[96px] lg:min-w-[110px] px-3 py-3 md:py-4 rounded-2xl md:rounded-3xl bg-gradient-to-b from-rose-50/80 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-200/70 dark:border-slate-700 shadow-md hover:scale-105 transition-transform">
          <span className="text-2xl md:text-4xl lg:text-5xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none drop-shadow-sm">{timeLeft.seconds.toString().padStart(2, '0')}</span>
          <span className="text-[9px] md:text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-[0.2em] mt-2">DETIK</span>
        </div>
      </div>
    </div>
  )
}
