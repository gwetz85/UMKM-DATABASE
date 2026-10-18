"use client"

import React from 'react'
import Link from 'next/link'
import { WeatherDetailView } from "@/components/weather-detail-view"
import { ArrowLeft, CloudSun } from 'lucide-react'

export default function CuacaPage() {
  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#0B132B] py-6 sm:py-8 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <CloudSun className="w-4 h-4 text-primary" />
            <span>Observatorium Cuaca & Polusi Tanjungpinang</span>
          </div>
        </div>

        {/* Main Observatory Container */}
        <div className="rounded-[32px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-xl overflow-hidden backdrop-blur-2xl">
          <WeatherDetailView isModal={false} />
        </div>

      </div>
    </div>
  )
}
