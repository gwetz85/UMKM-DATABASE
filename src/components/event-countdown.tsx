"use client"

import React, { useState, useEffect } from "react"
import { Timer } from "lucide-react"

interface EventCountdownProps {
  targetDate: string
  startDate?: string
  size?: 'sm' | 'md' | 'lg'
}

export function EventCountdown({ targetDate, startDate, size = 'lg' }: EventCountdownProps) {
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
      
      // If end time is reached, it's ended
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

  const config = {
    sm: {
      container: "gap-1 bg-white/80 dark:bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm",
      unit: "min-w-[24px]",
      number: "text-[14px]",
      label: "text-[6px]",
      colon: "text-[12px]",
      gap: "gap-0.5"
    },
    md: {
      container: "gap-2 bg-white/40 dark:bg-slate-900/40 border border-white/40 dark:border-slate-800/40 px-4 py-2 rounded-2xl shadow-sm backdrop-blur-md",
      unit: "min-w-[40px] md:min-w-[50px]",
      number: "text-lg md:text-2xl",
      label: "text-[7px] md:text-[8px]",
      colon: "text-base md:text-xl",
      gap: "gap-1.5"
    },
    lg: {
      container: "gap-3 md:gap-6",
      unit: "w-16 h-16 md:w-28 md:h-28 rounded-2xl md:rounded-[32px] bg-white/20 backdrop-blur-3xl border border-white/30 flex items-center justify-center shadow-2xl relative overflow-hidden group",
      number: "text-3xl md:text-6xl",
      label: "text-[8px] md:text-xs",
      colon: "text-2xl md:text-5xl mt-[-20px] md:mt-[-40px]",
      gap: "gap-4"
    }
  }[size]

  const isUrgent = timeLeft.days < 10;

  if (size === 'lg') {
    return (
      <div className="flex flex-col items-center gap-4">
        {startDate && !timeLeft.isStarted && (
          <span className="text-xs md:text-sm font-black text-amber-500 uppercase tracking-[0.2em] animate-pulse border-2 border-amber-500/30 bg-amber-500/10 px-6 py-2 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.3)]">Dimulai Dalam</span>
        )}
        {startDate && timeLeft.isStarted && !timeLeft.isEnded && (
          <span className="text-xs md:text-sm font-black text-emerald-500 uppercase tracking-[0.2em] animate-pulse border-2 border-emerald-500/30 bg-emerald-500/10 px-6 py-2 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.3)]">Berakhir Dalam</span>
        )}
        
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className={config.unit}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
              <span className={cn(config.number, "font-black text-white leading-none relative z-10 [text-shadow:_0_4px_12px_rgba(0,0,0,0.4)]")}>
                {timeLeft.days}
              </span>
            </div>
            <span className={cn(config.label, "font-black text-white/80 uppercase tracking-[0.2em]")}>Hari</span>
          </div>
          <span className={cn(config.colon, "text-blue-400 font-black animate-pulse opacity-80")}>:</span>

          <div className="flex flex-col items-center gap-2">
            <div className={config.unit}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
              <span className={cn(config.number, "font-black text-white leading-none relative z-10 [text-shadow:_0_4px_12px_rgba(0,0,0,0.4)]")}>
                {timeLeft.hours.toString().padStart(2, '0')}
              </span>
            </div>
            <span className={cn(config.label, "font-black text-white/80 uppercase tracking-[0.2em]")}>Jam</span>
          </div>
          <span className={cn(config.colon, "text-blue-400 font-black animate-pulse opacity-80")}>:</span>

          <div className="flex flex-col items-center gap-2">
            <div className={config.unit}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
              <span className={cn(config.number, "font-black text-white leading-none relative z-10 [text-shadow:_0_4px_12px_rgba(0,0,0,0.4)]")}>
                {timeLeft.minutes.toString().padStart(2, '0')}
              </span>
            </div>
            <span className={cn(config.label, "font-black text-white/80 uppercase tracking-[0.2em]")}>Menit</span>
          </div>
          <span className={cn(config.colon, "text-blue-400 font-black animate-pulse opacity-80")}>:</span>

          <div className="flex flex-col items-center gap-2">
            <div className={config.unit}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
              <span className={cn(config.number, "font-black text-blue-400 leading-none relative z-10 [text-shadow:_0_0_20px_rgba(96,165,250,0.5)]")}>
                {timeLeft.seconds.toString().padStart(2, '0')}
              </span>
            </div>
            <span className={cn(config.label, "font-black text-white/80 uppercase tracking-[0.2em]")}>Detik</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center", config.gap)}>
      {startDate && (
        <span className={cn(
          "font-black uppercase tracking-widest",
          size === 'sm' ? "text-[6px] mb-0.5" : "text-[8px] mb-1",
          timeLeft.isStarted ? "text-emerald-500" : "text-amber-500"
        )}>
          {timeLeft.isStarted ? "Berakhir Dalam" : "Dimulai Dalam"}
        </span>
      )}
      <div className={cn(
        "flex items-center transition-all duration-1000", 
        config.container,
        isUrgent ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] ring-2 ring-red-500/20" : ""
      )}>
        <div className={cn("flex flex-col items-center", config.unit)}>
          <span className={cn(config.number, "font-black leading-none", isUrgent ? "text-red-600" : "text-primary")}>{timeLeft.days}</span>
          <span className={cn(config.label, "font-bold uppercase tracking-tighter", isUrgent ? "text-red-500/80" : "text-slate-500")}>Hari</span>
        </div>
        <span className={cn(config.colon, "font-black opacity-30", isUrgent ? "text-red-600" : "text-primary")}>:</span>
        <div className={cn("flex flex-col items-center", config.unit)}>
          <span className={cn(config.number, "font-black leading-none", isUrgent ? "text-red-600" : "text-primary")}>{timeLeft.hours.toString().padStart(2, '0')}</span>
          <span className={cn(config.label, "font-bold uppercase tracking-tighter", isUrgent ? "text-red-500/80" : "text-slate-500")}>Jam</span>
        </div>
        <span className={cn(config.colon, "font-black opacity-30", isUrgent ? "text-red-600" : "text-primary")}>:</span>
        <div className={cn("flex flex-col items-center", config.unit)}>
          <span className={cn(config.number, "font-black leading-none", isUrgent ? "text-red-600" : "text-primary")}>{timeLeft.minutes.toString().padStart(2, '0')}</span>
          <span className={cn(config.label, "font-bold uppercase tracking-tighter", isUrgent ? "text-red-500/80" : "text-slate-500")}>Menit</span>
        </div>
        <span className={cn(config.colon, "font-black opacity-30", isUrgent ? "text-red-600" : "text-primary")}>:</span>
        <div className={cn("flex flex-col items-center", config.unit)}>
          <span className={cn(config.number, "font-black leading-none", isUrgent ? "text-red-600" : "text-primary")}>{timeLeft.seconds.toString().padStart(2, '0')}</span>
          <span className={cn(config.label, "font-bold uppercase tracking-tighter", isUrgent ? "text-red-500/80" : "text-slate-500")}>Detik</span>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
