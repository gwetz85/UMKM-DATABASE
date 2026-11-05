"use client"

import React, { useState, useEffect } from "react"
import { useOfficeStatus } from "@/hooks/useOfficeStatus"
import { Clock, DoorOpen, DoorClosed } from "lucide-react"

export function HeaderOfficeHoursCountdown() {
  const [mounted, setMounted] = useState(false)
  const status = useOfficeStatus()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent any hydration mismatch or SSR rendering issues
  if (!mounted || !status) return null

  const {
    isOpen,
    isHoliday,
    statusTitle,
    subLabel,
    timeLeft
  } = status

  return (
    <div
      title={
        isOpen
          ? "Kantor sedang buka. Sisa waktu operasional hari ini."
          : `Kantor saat ini tutup. Menghitung mundur menuju buka kantor (${subLabel}).`
      }
      className={`group relative flex items-center gap-1 sm:gap-2 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border transition-all duration-300 shadow-xs select-none shrink-0 ${
        isOpen
          ? "bg-emerald-50 border-emerald-500 text-emerald-950 dark:bg-[#072416] dark:border-emerald-400 dark:text-emerald-50"
          : isHoliday
          ? "bg-rose-50 border-rose-500 text-rose-950 dark:bg-[#280812] dark:border-rose-400 dark:text-rose-50"
          : "bg-amber-50 border-amber-500 text-amber-950 dark:bg-[#281804] dark:border-amber-400 dark:text-amber-50"
      }`}
    >
      {/* Pulsing Status Dot */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isOpen
              ? "bg-emerald-500 dark:bg-emerald-400"
              : isHoliday
              ? "bg-rose-500 dark:bg-rose-400"
              : "bg-amber-500 dark:bg-amber-400"
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isOpen
              ? "bg-emerald-600 dark:bg-emerald-400"
              : isHoliday
              ? "bg-rose-600 dark:bg-rose-400"
              : "bg-amber-600 dark:bg-amber-400"
          }`}
        />
      </span>

      {/* Status Label (Desktop & Tablet) */}
      <div className="hidden md:flex items-center gap-1 shrink-0">
        {isOpen ? (
          <DoorOpen className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-300 shrink-0" />
        ) : (
          <DoorClosed
            className={`w-3.5 h-3.5 shrink-0 ${
              isHoliday
                ? "text-rose-800 dark:text-rose-300"
                : "text-amber-800 dark:text-amber-300"
            }`}
          />
        )}
        <span
          className={`text-[11px] font-black uppercase tracking-wider ${
            isOpen
              ? "text-emerald-950 dark:text-emerald-300"
              : isHoliday
              ? "text-rose-950 dark:text-rose-300"
              : "text-amber-950 dark:text-amber-300"
          }`}
        >
          {statusTitle}
        </span>
      </div>

      {/* Separator on desktop */}
      <span
        className={`hidden md:inline-block w-px h-3.5 ${
          isOpen
            ? "bg-emerald-400/80 dark:bg-emerald-700/80"
            : isHoliday
            ? "bg-rose-400/80 dark:bg-rose-700/80"
            : "bg-amber-400/80 dark:bg-amber-700/80"
        }`}
      />

      {/* Digital Countdown Timer */}
      <div className="flex items-center gap-1 shrink-0">
        <Clock
          className={`w-3 h-3 text-current opacity-80 shrink-0 hidden sm:inline-block`}
        />
        <span
          className={`font-mono font-black text-xs tracking-tight leading-none tabular-nums ${
            isOpen
              ? "text-emerald-950 dark:text-emerald-100"
              : isHoliday
              ? "text-rose-950 dark:text-rose-100"
              : "text-amber-950 dark:text-amber-100"
          }`}
        >
          {timeLeft}
        </span>
      </div>

      {/* Sub-label badge (Desktop) */}
      <span
        className={`hidden lg:inline-flex items-center text-[10px] font-black px-1.5 py-0.2 rounded border shadow-2xs ${
          isOpen
            ? "bg-emerald-200/90 text-emerald-950 border-emerald-400 dark:bg-emerald-900/90 dark:text-emerald-200 dark:border-emerald-600"
            : isHoliday
            ? "bg-rose-200/90 text-rose-950 border-rose-400 dark:bg-rose-900/90 dark:text-rose-200 dark:border-rose-600"
            : "bg-amber-200/90 text-amber-950 border-amber-400 dark:bg-amber-900/90 dark:text-amber-200 dark:border-amber-600"
        }`}
      >
        {subLabel}
      </span>
    </div>
  )
}
