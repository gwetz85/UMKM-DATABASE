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

  // Ultra-Compact Horizontal Layout Card for Header (size="sm")
  if (size === 'sm') {
    return (
      <div className={cn(
        "flex flex-row items-center justify-between gap-2 bg-white/95 dark:bg-slate-900/95 border p-1.5 px-2.5 rounded-2xl shadow-md backdrop-blur-xl transition-all max-w-[380px]",
        isUrgent ? "border-rose-300 ring-2 ring-rose-400/30" : "border-slate-200 dark:border-slate-800"
      )}>
        {/* Left Side: Title (Marquee Scroll) & Status Badge */}
        <div className="flex flex-col items-start justify-center gap-0.5 min-w-0 flex-1 overflow-hidden">
          {title && (
            <div className="w-full overflow-hidden">
              <h3
                className="text-[10px] md:text-xs font-black text-rose-600 dark:text-rose-400 uppercase leading-tight drop-shadow-sm whitespace-nowrap"
                style={{
                  display: 'inline-block',
                  animation: 'marquee-scroll 25s linear infinite',
                  paddingRight: '4rem'
                }}
              >
                {title}
              </h3>
            </div>
          )}
          {startDate && (
            <span className={cn(
              "text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-sm shrink-0",
              timeLeft.isStarted
                ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800"
            )}>
              {timeLeft.isStarted ? "Berakhir Dalam" : "Dimulai Dalam"}
            </span>
          )}
        </div>

        {/* Vertical Divider Line */}
        {title && (
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-rose-300 dark:via-rose-700 to-transparent shrink-0 mx-1" />
        )}

        {/* Right Side: 4 Countdown Time Boxes - LARGER */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex flex-col items-center justify-center min-w-[36px] md:min-w-[40px] px-1.5 py-1 rounded-xl bg-gradient-to-b from-rose-50 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-100 dark:border-slate-700 shadow-sm">
            <span className="text-sm md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.days}</span>
            <span className="text-[7px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-tight mt-0.5">HARI</span>
          </div>

          <span className="text-sm font-black text-rose-400 animate-pulse -mt-1">:</span>

          <div className="flex flex-col items-center justify-center min-w-[36px] md:min-w-[40px] px-1.5 py-1 rounded-xl bg-gradient-to-b from-rose-50 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-100 dark:border-slate-700 shadow-sm">
            <span className="text-sm md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className="text-[7px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-tight mt-0.5">JAM</span>
          </div>

          <span className="text-sm font-black text-rose-400 animate-pulse -mt-1">:</span>

          <div className="flex flex-col items-center justify-center min-w-[36px] md:min-w-[40px] px-1.5 py-1 rounded-xl bg-gradient-to-b from-rose-50 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-100 dark:border-slate-700 shadow-sm">
            <span className="text-sm md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.minutes.toString().padStart(2, '0')}</span>
            <span className="text-[7px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-tight mt-0.5">MENIT</span>
          </div>

          <span className="text-sm font-black text-rose-400 animate-pulse -mt-1">:</span>

          <div className="flex flex-col items-center justify-center min-w-[36px] md:min-w-[40px] px-1.5 py-1 rounded-xl bg-gradient-to-b from-rose-50 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-100 dark:border-slate-700 shadow-sm">
            <span className="text-sm md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.seconds.toString().padStart(2, '0')}</span>
            <span className="text-[7px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-tight mt-0.5">DETIK</span>
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


  if (size === 'md') {
    return (
      <div className={cn(
        "flex flex-row items-center justify-between gap-3 md:gap-4 bg-white/95 dark:bg-slate-900/95 border p-2 md:p-2.5 px-3 md:px-4 rounded-2xl md:rounded-3xl shadow-lg backdrop-blur-xl transition-all",
        isUrgent ? "border-rose-300 ring-2 ring-rose-400/30" : "border-slate-200 dark:border-slate-800"
      )}>
        {/* Left Side: Title & Status Badge */}
        <div className="flex flex-col items-start justify-center gap-1 min-w-0 flex-1">
          {title && (
            <h3 className="text-xs md:text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.15em] leading-tight truncate max-w-[180px] md:max-w-[280px] drop-shadow-sm">
              {title}
            </h3>
          )}
          {startDate && (
            <span className={cn(
              "text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border shadow-sm",
              timeLeft.isStarted
                ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800"
            )}>
              {timeLeft.isStarted ? "Berakhir Dalam" : "Dimulai Dalam"}
            </span>
          )}
        </div>

        {/* Vertical Divider Line */}
        {title && (
          <div className="w-px h-7 md:h-9 bg-gradient-to-b from-transparent via-rose-300 dark:via-rose-700 to-transparent shrink-0 mx-1" />
        )}

        {/* Right Side: 4 Countdown Time Boxes */}
        <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
          <div className="flex flex-col items-center justify-center min-w-[34px] md:min-w-[44px] px-1.5 md:px-2 py-1 rounded-xl bg-gradient-to-b from-rose-50 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-100 dark:border-slate-700 shadow-sm">
            <span className="text-xs md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.days}</span>
            <span className="text-[7px] md:text-[8px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider mt-0.5">HARI</span>
          </div>

          <span className="text-xs md:text-sm font-black text-rose-400 animate-pulse -mt-1">:</span>

          <div className="flex flex-col items-center justify-center min-w-[34px] md:min-w-[44px] px-1.5 md:px-2 py-1 rounded-xl bg-gradient-to-b from-rose-50 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-100 dark:border-slate-700 shadow-sm">
            <span className="text-xs md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className="text-[7px] md:text-[8px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider mt-0.5">JAM</span>
          </div>

          <span className="text-xs md:text-sm font-black text-rose-400 animate-pulse -mt-1">:</span>

          <div className="flex flex-col items-center justify-center min-w-[34px] md:min-w-[44px] px-1.5 md:px-2 py-1 rounded-xl bg-gradient-to-b from-rose-50 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-100 dark:border-slate-700 shadow-sm">
            <span className="text-xs md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.minutes.toString().padStart(2, '0')}</span>
            <span className="text-[7px] md:text-[8px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider mt-0.5">MENIT</span>
          </div>

          <span className="text-xs md:text-sm font-black text-rose-400 animate-pulse -mt-1">:</span>

          <div className="flex flex-col items-center justify-center min-w-[34px] md:min-w-[44px] px-1.5 md:px-2 py-1 rounded-xl bg-gradient-to-b from-rose-50 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-100 dark:border-slate-700 shadow-sm">
            <span className="text-xs md:text-base font-black text-rose-600 dark:text-rose-400 font-mono leading-none">{timeLeft.seconds.toString().padStart(2, '0')}</span>
            <span className="text-[7px] md:text-[8px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider mt-0.5">DETIK</span>
          </div>
        </div>
      </div>
    )
  }

  // Large size (Hero / Full Screen Modal)
  return (
    <div className={cn(
      "flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 max-w-3xl w-full bg-white/95 dark:bg-slate-900/95 border-2 p-4 md:p-6 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl backdrop-blur-2xl transition-all",
      isUrgent ? "border-rose-400 ring-4 ring-rose-500/20 shadow-rose-500/10" : "border-rose-200/80 dark:border-slate-800"
    )}>
      {/* Left Side: Title & Status */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2 flex-1 min-w-0">
        {title && (
          <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.15em] leading-snug drop-shadow-md">
            {title}
          </h2>
        )}
        {startDate && (
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border shadow-md backdrop-blur-md animate-pulse bg-rose-50/80 border-rose-200">
            <span className={cn(
              "text-xs font-black uppercase tracking-[0.2em]",
              timeLeft.isStarted ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
            )}>
              {timeLeft.isStarted ? "BERAKHIR DALAM" : "DIMULAI DALAM"}
            </span>
          </div>
        )}
      </div>

      {/* Vertical Divider (Desktop) / Horizontal Divider (Mobile) */}
      {title && (
        <div className="w-full md:w-px h-px md:h-16 bg-gradient-to-r md:bg-gradient-to-b from-transparent via-rose-300 dark:via-rose-700 to-transparent shrink-0 my-1 md:my-0 md:mx-2" />
      )}

      {/* Right Side: 4 Large Countdown Boxes */}
      <div className="flex items-center justify-center gap-2 md:gap-3 shrink-0">
        <div className="flex flex-col items-center justify-center min-w-[56px] md:min-w-[76px] lg:min-w-[86px] px-2.5 py-2 md:py-3 rounded-2xl bg-gradient-to-b from-rose-50/80 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-200/70 dark:border-slate-700 shadow-md hover:scale-105 transition-transform">
          <span className="text-xl md:text-3xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none drop-shadow-sm">{timeLeft.days}</span>
          <span className="text-[8px] md:text-[10px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-[0.15em] mt-1.5">HARI</span>
        </div>

        <span className="text-lg md:text-2xl font-black text-rose-400 animate-pulse -mt-2 md:-mt-4">:</span>

        <div className="flex flex-col items-center justify-center min-w-[56px] md:min-w-[76px] lg:min-w-[86px] px-2.5 py-2 md:py-3 rounded-2xl bg-gradient-to-b from-rose-50/80 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-200/70 dark:border-slate-700 shadow-md hover:scale-105 transition-transform">
          <span className="text-xl md:text-3xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none drop-shadow-sm">{timeLeft.hours.toString().padStart(2, '0')}</span>
          <span className="text-[8px] md:text-[10px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-[0.15em] mt-1.5">JAM</span>
        </div>

        <span className="text-lg md:text-2xl font-black text-rose-400 animate-pulse -mt-2 md:-mt-4">:</span>

        <div className="flex flex-col items-center justify-center min-w-[56px] md:min-w-[76px] lg:min-w-[86px] px-2.5 py-2 md:py-3 rounded-2xl bg-gradient-to-b from-rose-50/80 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-200/70 dark:border-slate-700 shadow-md hover:scale-105 transition-transform">
          <span className="text-xl md:text-3xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none drop-shadow-sm">{timeLeft.minutes.toString().padStart(2, '0')}</span>
          <span className="text-[8px] md:text-[10px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-[0.15em] mt-1.5">MENIT</span>
        </div>

        <span className="text-lg md:text-2xl font-black text-rose-400 animate-pulse -mt-2 md:-mt-4">:</span>

        <div className="flex flex-col items-center justify-center min-w-[56px] md:min-w-[76px] lg:min-w-[86px] px-2.5 py-2 md:py-3 rounded-2xl bg-gradient-to-b from-rose-50/80 to-white dark:from-slate-800 dark:to-slate-900 border border-rose-200/70 dark:border-slate-700 shadow-md hover:scale-105 transition-transform">
          <span className="text-xl md:text-3xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 font-mono leading-none drop-shadow-sm">{timeLeft.seconds.toString().padStart(2, '0')}</span>
          <span className="text-[8px] md:text-[10px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-[0.15em] mt-1.5">DETIK</span>
        </div>
      </div>
    </div>
  )
}
