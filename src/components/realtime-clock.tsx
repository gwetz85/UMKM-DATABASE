"use client"

import React, { useState, useEffect } from 'react'
import { cn } from "@/lib/utils"

interface RealtimeClockProps {
  className?: string;
  timeClassName?: string;
  dateClassName?: string;
}

export function RealtimeClock({ className, timeClassName, dateClassName }: RealtimeClockProps) {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!time) return null

  const formattedTime = time.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\./g, ':')

  const formattedDate = time.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className={cn("flex flex-col items-end text-right", className)}>
      <span className={cn("text-4xl md:text-5xl font-black text-slate-800 tracking-tighter", timeClassName)}>
        {formattedTime}
      </span>
      <span className={cn("text-sm md:text-base font-bold text-slate-500 uppercase tracking-widest", dateClassName)}>
        {formattedDate}
      </span>
    </div>
  )
}
