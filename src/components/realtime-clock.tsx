"use client"

import React, { useState, useEffect } from 'react'

export function RealtimeClock() {
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
    <div className="flex flex-col items-end text-right">
      <span className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter">
        {formattedTime}
      </span>
      <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">
        {formattedDate}
      </span>
    </div>
  )
}
