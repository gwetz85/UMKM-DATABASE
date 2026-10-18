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
        className="w-[96vw] max-w-5xl p-0 overflow-hidden max-h-[92vh] rounded-[28px] border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Detail Informasi Cuaca Tanjungpinang</DialogTitle>
          <DialogDescription>
            Prakiraan cuaca per jam, kondisi udara AQI, kecepatan angin, dan parameter cuaca lengkap
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
