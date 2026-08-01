"use client"
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { KelurahanStat } from './monitoring-dialog'
import { useMemo, useCallback, useEffect } from 'react'
import L from 'leaflet'
import { KECAMATAN_KELURAHAN } from '@/data/kecamatan-geo'

function injectMapStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('clean-map-styles')) return
  const style = document.createElement('style')
  style.id = 'clean-map-styles'
  style.textContent = `
    .kecamatan-marker-clean {
      background: transparent !important;
      border: none !important;
      color: #1e3a8a;
      font-weight: 900;
      font-size: 14px;
      text-transform: uppercase;
      text-shadow: 2px 2px 0 rgba(255,255,255,0.9), -2px -2px 0 rgba(255,255,255,0.9), 2px -2px 0 rgba(255,255,255,0.9), -2px 2px 0 rgba(255,255,255,0.9);
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .kecamatan-marker-clean:hover {
      color: #2563eb;
      transform: scale(1.1) translateY(-2px);
      text-shadow: 2px 2px 0 rgba(255,255,255,1), -2px -2px 0 rgba(255,255,255,1), 2px -2px 0 rgba(255,255,255,1), -2px 2px 0 rgba(255,255,255,1);
    }
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      padding: 0;
      overflow: hidden;
    }
    .leaflet-popup-content {
      margin: 0 !important;
      width: 280px !important;
    }
  `
  document.head.appendChild(style)
}

const KEC_CENTERS = [
  { name: 'Tanjungpinang Barat', pos: [0.916, 104.435] },
  { name: 'Tanjungpinang Kota', pos: [0.940, 104.425] },
  { name: 'Bukit Bestari', pos: [0.890, 104.455] },
  { name: 'Tanjungpinang Timur', pos: [0.925, 104.495] }
]

export default function MapRenderer({ data }: { data: KelurahanStat[] }) {
  // Aggregate data by Kecamatan
  const kecamatanStats = useMemo(() => {
    const stats: Record<string, { total: number, kelurahan: { name: string, count: number }[] }> = {}
    
    Object.keys(KECAMATAN_KELURAHAN).forEach(kec => {
      stats[kec] = { total: 0, kelurahan: [] }
    })

    const dataMap: Record<string, number> = {}
    data.forEach(d => { dataMap[d.name.toLowerCase()] = d.count })

    Object.entries(KECAMATAN_KELURAHAN).forEach(([kecName, kelList]) => {
      let total = 0
      const kelData = kelList.map(kelName => {
        const count = dataMap[kelName.toLowerCase()] || 0
        total += count
        return { name: kelName, count }
      })
      kelData.sort((a, b) => b.count - a.count)
      stats[kecName] = { total, kelurahan: kelData }
    })

    return stats
  }, [data])

  useEffect(() => {
    injectMapStyles()
  }, [])

  const createKecIcon = useCallback((name: string) => {
    return L.divIcon({
      html: `<div class="kecamatan-marker-clean">${name}</div>`,
      className: 'kecamatan-marker-icon', // Container class, custom styling is applied to inner div
      iconSize: [180, 40],
      iconAnchor: [90, 20]
    })
  }, [])

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[0.9100, 104.4700]}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[400px] rounded-xl"
        style={{ zIndex: 0, background: '#f8fafc' }} 
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {KEC_CENTERS.map((kec, i) => {
          const stat = kecamatanStats[kec.name]
          if (!stat) return null

          return (
            <Marker 
              key={i} 
              position={kec.pos as [number, number]} 
              icon={createKecIcon(kec.name)}
            >
              <Popup closeButton={false}>
                <div className="p-4 font-sans text-slate-800">
                  <div className="border-b border-slate-200 pb-3 mb-3">
                    <h3 className="m-0 text-base font-black text-slate-900 uppercase tracking-wide">{kec.name}</h3>
                  </div>
                  
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                    <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Total Pelaku Usaha</span>
                    <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-black shadow-sm">{stat.total}</span>
                  </div>
                  
                  <div className="max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                    <table className="w-full text-[13px]">
                      <tbody>
                        {stat.kelurahan.map((kel, idx) => (
                          <tr key={kel.name}>
                            <td className={`py-2 text-slate-600 font-medium ${idx !== stat.kelurahan.length - 1 ? 'border-b border-dashed border-slate-200' : ''}`}>
                              {kel.name}
                            </td>
                            <td className={`py-2 text-right font-bold text-slate-900 ${idx !== stat.kelurahan.length - 1 ? 'border-b border-dashed border-slate-200' : ''}`}>
                              {kel.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
      
      {/* Custom scrollbar styles for popup */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9; 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1; 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8; 
        }
      `}} />
    </div>
  )
}
