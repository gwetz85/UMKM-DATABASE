"use client"

import React, { useState, useEffect } from "react"
import { Timer } from "lucide-react"

interface EventCountdownProps {
  targetDate: string
  startDate?: string
  small?: boolean
}

export function EventCountdown({ targetDate, startDate, small }: EventCountdownProps) {
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
      const target = +new Date(targetDate)
      const now = +new Date()
      const difference = target - now
      
      let isStarted = true;
      if (startDate) {
        const start = +new Date(startDate)
        if (now < start) {
          isStarted = false;
        }
      }

      if (isNaN(difference) || difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true, isStarted }
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
  }, [targetDate])

  if (!mounted || timeLeft.isEnded) return null

  if (small) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col items-center min-w-[24px]">
            <span className="text-[14px] font-black text-blue-600 leading-none">{timeLeft.days}</span>
            <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter">Hari</span>
          </div>
          <span className="text-blue-600/30 font-black text-[12px]">:</span>
          <div className="flex flex-col items-center min-w-[24px]">
            <span className="text-[14px] font-black text-blue-600 leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter">Jam</span>
          </div>
          <span className="text-blue-600/30 font-black text-[12px]">:</span>
          <div className="flex flex-col items-center min-w-[24px]">
            <span className="text-[14px] font-black text-blue-600 leading-none">{timeLeft.minutes.toString().padStart(2, '0')}</span>
            <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter">Menit</span>
          </div>
          <span className="text-blue-600/30 font-black text-[12px]">:</span>
          <div className="flex flex-col items-center min-w-[24px]">
            <span className="text-[14px] font-black text-blue-600 leading-none">{timeLeft.seconds.toString().padStart(2, '0')}</span>
            <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter">Detik</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {startDate && !timeLeft.isStarted && (
        <span className="text-xs md:text-sm font-black text-amber-500 uppercase tracking-[0.2em] animate-pulse border-2 border-amber-500/30 bg-amber-500/10 px-6 py-2 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.3)]">Segera Hadir</span>
      )}
      {startDate && timeLeft.isStarted && !timeLeft.isEnded && (
        <span className="text-xs md:text-sm font-black text-emerald-500 uppercase tracking-[0.2em] animate-pulse border-2 border-emerald-500/30 bg-emerald-500/10 px-6 py-2 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.3)]">Sedang Berlangsung</span>
      )}
      
      <div className="flex items-center gap-3 md:gap-6">
        {/* Days */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-white/20 backdrop-blur-3xl border border-white/30 w-16 h-16 md:w-28 md:h-28 rounded-2xl md:rounded-[32px] flex items-center justify-center shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
            <span className="text-3xl md:text-6xl font-black text-white leading-none relative z-10 [text-shadow:_0_4px_12px_rgba(0,0,0,0.4)]">
              {timeLeft.days}
            </span>
          </div>
          <span className="text-[8px] md:text-xs font-black text-white/80 uppercase tracking-[0.2em]">Hari</span>
        </div>

        <span className="text-blue-400 font-black animate-pulse text-2xl md:text-5xl mt-[-20px] md:mt-[-40px] opacity-80">:</span>

        {/* Hours */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-white/20 backdrop-blur-3xl border border-white/30 w-16 h-16 md:w-28 md:h-28 rounded-2xl md:rounded-[32px] flex items-center justify-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
            <span className="text-3xl md:text-6xl font-black text-white leading-none relative z-10 [text-shadow:_0_4px_12px_rgba(0,0,0,0.4)]">
              {timeLeft.hours.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="text-[8px] md:text-xs font-black text-white/80 uppercase tracking-[0.2em]">Jam</span>
        </div>

        <span className="text-blue-400 font-black animate-pulse text-2xl md:text-5xl mt-[-20px] md:mt-[-40px] opacity-80">:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-white/20 backdrop-blur-3xl border border-white/30 w-16 h-16 md:w-28 md:h-28 rounded-2xl md:rounded-[32px] flex items-center justify-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
            <span className="text-3xl md:text-6xl font-black text-white leading-none relative z-10 [text-shadow:_0_4px_12px_rgba(0,0,0,0.4)]">
              {timeLeft.minutes.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="text-[8px] md:text-xs font-black text-white/80 uppercase tracking-[0.2em]">Menit</span>
        </div>

        <span className="text-blue-400 font-black animate-pulse text-2xl md:text-5xl mt-[-20px] md:mt-[-40px] opacity-80">:</span>

        {/* Seconds */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-white/20 backdrop-blur-3xl border border-white/30 w-16 h-16 md:w-28 md:h-28 rounded-2xl md:rounded-[32px] flex items-center justify-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
            <span className="text-3xl md:text-6xl font-black text-blue-400 leading-none relative z-10 [text-shadow:_0_0_20px_rgba(96,165,250,0.5)]">
              {timeLeft.seconds.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="text-[8px] md:text-xs font-black text-white/80 uppercase tracking-[0.2em]">Detik</span>
        </div>
      </div>
    </div>
  )
}
