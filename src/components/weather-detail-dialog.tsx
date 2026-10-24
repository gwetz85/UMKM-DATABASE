"use client"

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { WeatherDetailView } from "@/components/weather-detail-view"
import { FullWeatherForecastData } from "@/types/weather"

interface WeatherDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: FullWeatherForecastData | null
  onRefresh?: () => void
}

export function WeatherDetailDialog({
  open,
  onOpenChange,
  initialData,
  onRefresh,
}: WeatherDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[96vw] max-w-6xl p-0 overflow-hidden h-[92vh] max-h-[92vh] rounded-[28px] border border-slate-200/90 dark:border-slate-800/90 bg-slate-50 dark:bg-slate-900 shadow-2xl focus:outline-none flex flex-col"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Detail Informasi Cuaca & Kualitas Udara Tanjungpinang</DialogTitle>
          <DialogDescription>
            Prakiraan cuaca per jam, kondisi udara AQI, kecepatan angin, dan parameter cuaca lengkap Stasiun BMKG & WMO Tanjungpinang
          </DialogDescription>
        </DialogHeader>

        <WeatherDetailView
          initialData={initialData}
          onRefresh={onRefresh}
          onOpenNewTab={() => {
            window.open('/cuaca', '_blank')
          }}
          isModal={true}
        />
      </DialogContent>
    </Dialog>
  )
}
