"use client"

import { KelurahanStat } from './monitoring-dialog'
import dynamic from 'next/dynamic'

const MapComponent = dynamic(
  () => import('./map-renderer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[400px] bg-slate-100 animate-pulse flex flex-col items-center justify-center rounded-xl">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-slate-500 font-bold text-sm">Memuat Peta...</p>
      </div>
    )
  }
)

export default function MonitoringMap({ data }: { data: KelurahanStat[] }) {
  return <MapComponent data={data} />
}
