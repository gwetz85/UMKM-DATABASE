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
        <div className="flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex flex-col items-center min-w-[20px]">
            <span className="text-xs font-black text-primary leading-none">{timeLeft.days}</span>
            <span className="text-[6px] font-bold text-slate-400 uppercase tracking-tighter">Hari</span>
          </div>
          <span className="text-primary font-black opacity-30 text-[10px]">:</span>
          <div className="flex flex-col items-center min-w-[20px]">
            <span className="text-xs font-black text-primary leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className="text-[6px] font-bold text-slate-400 uppercase tracking-tighter">Jam</span>
          </div>
          <span className="text-primary font-black opacity-30 text-[10px]">:</span>
          <div className="flex flex-col items-center min-w-[20px]">
            <span className="text-xs font-black text-primary leading-none">{timeLeft.minutes.toString().padStart(2, '0')}</span>
            <span className="text-[6px] font-bold text-slate-400 uppercase tracking-tighter">Menit</span>
          </div>
          <span className="text-primary font-black opacity-30 text-[10px]">:</span>
          <div className="flex flex-col items-center min-w-[20px]">
            <span className="text-xs font-black text-primary leading-none">{timeLeft.seconds.toString().padStart(2, '0')}</span>
            <span className="text-[6px] font-bold text-slate-400 uppercase tracking-tighter">Detik</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {startDate && !timeLeft.isStarted && (
        <span className="text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-widest animate-pulse border-2 border-amber-500/30 bg-amber-500/10 px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.2)]">Segera Hadir</span>
      )}
      {startDate && timeLeft.isStarted && !timeLeft.isEnded && (
        <span className="text-[10px] md:text-xs font-black text-emerald-500 uppercase tracking-widest animate-pulse border-2 border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.2)]">Sedang Berlangsung</span>
      )}
      <div className="flex items-center gap-2 md:gap-4 bg-white/10 dark:bg-slate-900/40 border border-white/20 dark:border-slate-800/40 px-4 py-3 md:px-8 md:py-6 rounded-[32px] shadow-2xl backdrop-blur-xl mt-2">
        <div className="flex flex-col items-center min-w-[50px] md:min-w-[80px]">
          <span className="text-3xl md:text-6xl font-black text-primary leading-none tracking-tighter">{timeLeft.days}</span>
          <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 md:mt-2 opacity-70">Hari</span>
        </div>
        <span className="text-primary font-black animate-pulse opacity-30 text-xl md:text-4xl -mt-4 md:-mt-6">:</span>
        <div className="flex flex-col items-center min-w-[50px] md:min-w-[80px]">
          <span className="text-3xl md:text-6xl font-black text-primary leading-none tracking-tighter">{timeLeft.hours.toString().padStart(2, '0')}</span>
          <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 md:mt-2 opacity-70">Jam</span>
        </div>
        <span className="text-primary font-black animate-pulse opacity-30 text-xl md:text-4xl -mt-4 md:-mt-6">:</span>
        <div className="flex flex-col items-center min-w-[50px] md:min-w-[80px]">
          <span className="text-3xl md:text-6xl font-black text-primary leading-none tracking-tighter">{timeLeft.minutes.toString().padStart(2, '0')}</span>
          <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 md:mt-2 opacity-70">Menit</span>
        </div>
        <span className="text-primary font-black animate-pulse opacity-30 text-xl md:text-4xl -mt-4 md:-mt-6">:</span>
        <div className="flex flex-col items-center min-w-[50px] md:min-w-[80px]">
          <span className="text-3xl md:text-6xl font-black text-primary leading-none tracking-tighter">{timeLeft.seconds.toString().padStart(2, '0')}</span>
          <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 md:mt-2 opacity-70">Detik</span>
        </div>
      </div>
    </div>
  )
}
