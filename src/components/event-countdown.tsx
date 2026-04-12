"use client"

import React, { useState, useEffect } from "react"
import { Timer } from "lucide-react"

interface EventCountdownProps {
  targetDate: string
}

export function EventCountdown({ targetDate }: EventCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isEnded: boolean
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: false })

  useEffect(() => {
    if (!targetDate) return

    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date()
      
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true }
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isEnded: false,
      }
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    setTimeLeft(calculateTimeLeft())

    return () => clearInterval(timer)
  }, [targetDate])

  if (timeLeft.isEnded) return null

  return (
    <div className="flex items-center gap-1.5 md:gap-3 bg-white/40 dark:bg-slate-900/40 border border-white/40 dark:border-slate-800/40 px-3 py-1.5 md:px-5 md:py-2.5 rounded-2xl shadow-sm backdrop-blur-md">
      <div className="flex flex-col items-center">
        <span className="text-[10px] md:text-sm font-black text-primary leading-none">{timeLeft.days}</span>
        <span className="text-[6px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Hari</span>
      </div>
      <span className="text-primary font-black animate-pulse opacity-40">:</span>
      <div className="flex flex-col items-center">
        <span className="text-[10px] md:text-sm font-black text-primary leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
        <span className="text-[6px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Jam</span>
      </div>
      <span className="text-primary font-black animate-pulse opacity-40">:</span>
      <div className="flex flex-col items-center">
        <span className="text-[10px] md:text-sm font-black text-primary leading-none">{timeLeft.minutes.toString().padStart(2, '0')}</span>
        <span className="text-[6px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Menit</span>
      </div>
      <span className="text-primary font-black animate-pulse opacity-40">:</span>
      <div className="flex flex-col items-center">
        <span className="text-[10px] md:text-sm font-black text-primary leading-none">{timeLeft.seconds.toString().padStart(2, '0')}</span>
        <span className="text-[6px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Detik</span>
      </div>
    </div>
  )
}
