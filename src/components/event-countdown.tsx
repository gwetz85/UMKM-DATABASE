"use client"

import React, { useState, useEffect } from "react"
import { Timer } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

interface EventCountdownProps {
  targetDate: string
  startDate?: string
}

export function EventCountdown({ targetDate, startDate }: EventCountdownProps) {
  const { t } = useTranslation()
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

  return (
    <div className="flex flex-col items-center gap-1">
      {startDate && !timeLeft.isStarted && (
        <span className="text-[8px] md:text-[10px] font-bold text-amber-500 uppercase tracking-widest animate-pulse border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 md:px-3 md:py-1 rounded-full">{t('coming_soon')}</span>
      )}
      {startDate && timeLeft.isStarted && !timeLeft.isEnded && (
        <span className="text-[8px] md:text-[10px] font-bold text-emerald-500 uppercase tracking-widest animate-pulse border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 md:px-3 md:py-1 rounded-full">{t('ongoing')}</span>
      )}
      <div className="flex items-center gap-1.5 md:gap-3 bg-white/40 dark:bg-slate-900/40 border border-white/40 dark:border-slate-800/40 px-3 py-1.5 md:px-5 md:py-2.5 rounded-2xl shadow-sm backdrop-blur-md mt-1">
      <div className="flex flex-col items-center">
        <span className="text-[10px] md:text-2xl font-black text-primary leading-none">{timeLeft.days}</span>
        <span className="text-[6px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter md:tracking-wider md:mt-1">{t('days')}</span>
      </div>
      <span className="text-primary font-black animate-pulse opacity-40 md:text-lg">:</span>
      <div className="flex flex-col items-center">
        <span className="text-[10px] md:text-2xl font-black text-primary leading-none">{timeLeft.hours.toString().padStart(2, '0')}</span>
        <span className="text-[6px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter md:tracking-wider md:mt-1">{t('hours')}</span>
      </div>
      <span className="text-primary font-black animate-pulse opacity-40 md:text-lg">:</span>
      <div className="flex flex-col items-center">
        <span className="text-[10px] md:text-2xl font-black text-primary leading-none">{timeLeft.minutes.toString().padStart(2, '0')}</span>
        <span className="text-[6px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter md:tracking-wider md:mt-1">{t('minutes')}</span>
      </div>
      <span className="text-primary font-black animate-pulse opacity-40 md:text-lg">:</span>
      <div className="flex flex-col items-center">
        <span className="text-[10px] md:text-2xl font-black text-primary leading-none">{timeLeft.seconds.toString().padStart(2, '0')}</span>
        <span className="text-[6px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter md:tracking-wider md:mt-1">{t('seconds')}</span>
      </div>
      </div>
    </div>
  )
}
