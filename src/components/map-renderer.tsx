"use client"
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, GeoJSON, useMap, Marker } from 'react-leaflet'
import { KelurahanStat } from './monitoring-dialog'
import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import L from 'leaflet'
import { KELURAHAN_GEOJSON } from '@/data/kelurahan-geo'
import { KECAMATAN_KELURAHAN } from '@/data/kecamatan-geo'
import { ChevronLeft } from 'lucide-react'

// ── Color scale (light → dark blue) based on count intensity ──────────────────
function getChoroColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return '#dbeafe' // blue-100
  const pct = count / maxCount
  if (pct < 0.15) return '#bfdbfe' // blue-200
  if (pct < 0.30) return '#93c5fd' // blue-300
  if (pct < 0.50) return '#60a5fa' // blue-400
  if (pct < 0.65) return '#3b82f6' // blue-500
  if (pct < 0.80) return '#2563eb' // blue-600
  if (pct < 0.92) return '#1d4ed8' // blue-700
  return '#1e3a8a'                  // blue-900
}

// ── Inject CSS once for tooltip & hover styles ────────────────────────────────
function injectMapStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('choropleth-map-styles')) return
  const style = document.createElement('style')
  style.id = 'choropleth-map-styles'
  style.textContent = `
    .kecamatan-marker-icon {
      background: transparent !important;
      border: none !important;
    }
    .kec-label-box {
      background: white;
      border: 2px solid #3b82f6;
      color: #1e3a8a;
      font-weight: 900;
      font-size: 11px;
      padding: 8px 14px;
      border-radius: 20px;
      box-shadow: 0 4px 15px rgba(59,130,246,0.3);
      white-space: nowrap;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .kec-label-box:hover {
      background: #3b82f6;
      color: white;
      transform: scale(1.05) translateY(-2px);
      box-shadow: 0 6px 20px rgba(59,130,246,0.5);
    }
    .kec-label-box .kec-total {
      font-size: 14px;
      background: #eff6ff;
      color: #2563eb;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .kec-label-box:hover .kec-total {
      background: white;
    }

    .kelurahan-tooltip {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      pointer-events: none;
    }
    .kelurahan-tooltip::before { display: none !important; }
    .kel-label-inner {
      background: rgba(255,255,255,0.9);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      color: #0f172a;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      border: 1px solid rgba(0,0,0,0.05);
      backdrop-filter: blur(4px);
      text-transform: uppercase;
    }
    .kel-label-inner span {
      display: block;
      color: #3b82f6;
      font-size: 12px;
      margin-top: 1px;
    }

    .leaflet-interactive {
      transition: filter 0.22s ease, stroke-width 0.22s ease;
    }
    .leaflet-interactive.hovered {
      filter: brightness(1.15) drop-shadow(0 0 10px rgba(255,255,255,0.5));
    }
  `
  document.head.appendChild(style)
}

// ── Map Bounds Controller ─────────────────────────────────────────────────────
function MapBoundsController({ selectedKec, geoData }: { selectedKec: string | null, geoData: any }) {
  const map = useMap()
  
  useEffect(() => {
    if (selectedKec && geoData.features.length > 0) {
      const layer = L.geoJSON(geoData)
      const bounds = layer.getBounds()
      if (bounds.isValid()) {
        map.flyToBounds(bounds, { padding: [40, 40], duration: 1 })
      }
    } else if (!selectedKec) {
      map.flyTo([0.9100, 104.4700], 12, { duration: 1 })
    }
  }, [selectedKec, geoData, map])

  return null
}

const KEC_CENTERS = [
  { name: 'Tanjungpinang Barat', pos: [0.915, 104.435] },
  { name: 'Tanjungpinang Kota', pos: [0.940, 104.425] },
  { name: 'Bukit Bestari', pos: [0.895, 104.460] },
  { name: 'Tanjungpinang Timur', pos: [0.925, 104.495] }
]

// Helper to find which Kecamatan a Kelurahan belongs to
const getKecamatanForKelurahan = (kelName: string) => {
  const kelLower = kelName.toLowerCase()
  for (const [kec, kelList] of Object.entries(KECAMATAN_KELURAHAN)) {
    if (kelList.some(k => k.toLowerCase() === kelLower)) {
      return kec
    }
  }
  return null
}

// ── Main renderer ─────────────────────────────────────────────────────────────
export default function MapRenderer({ data }: { data: KelurahanStat[] }) {
  const [selectedKec, setSelectedKec] = useState<string | null>(null)
  
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

  // Filter geojson for selected kecamatan only
  const filteredGeojson = useMemo(() => {
    if (!selectedKec) return { type: "FeatureCollection", features: [] }
    return {
      type: "FeatureCollection",
      features: (KELURAHAN_GEOJSON as any).features.filter((f: any) => {
        const kelName = f.properties.name
        return getKecamatanForKelurahan(kelName) === selectedKec
      })
    }
  }, [selectedKec])

  const maxKelCount = useMemo(() => {
    if (!selectedKec) return 1
    const kelData = kecamatanStats[selectedKec]?.kelurahan || []
    const counts = kelData.map(k => k.count)
    return Math.max(...counts, 1)
  }, [selectedKec, kecamatanStats])

  const geoRef = useRef<L.GeoJSON | null>(null)

  const styleFeature = useCallback((feature: any): L.PathOptions => {
    const kelName = feature?.properties?.name as string
    const statList = selectedKec ? kecamatanStats[selectedKec]?.kelurahan : []
    const count = statList?.find(k => k.name.toLowerCase() === kelName.toLowerCase())?.count || 0
    return {
      fillColor: getChoroColor(count, maxKelCount),
      fillOpacity: 0.85,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
    }
  }, [selectedKec, kecamatanStats, maxKelCount])

  const onEachFeature = useCallback((feature: any, layer: L.Layer) => {
    const kelName = feature.properties?.name as string
    const statList = selectedKec ? kecamatanStats[selectedKec]?.kelurahan : []
    const count = statList?.find(k => k.name.toLowerCase() === kelName.toLowerCase())?.count || 0

    // Permanent label directly on the polygon
    layer.bindTooltip(`
      <div class="kel-label-inner">
        ${kelName}
        <span>${count}</span>
      </div>
    `, {
      permanent: true,
      direction: 'center',
      className: 'kelurahan-tooltip'
    })

    const pathLayer = layer as L.Path

    layer.on('mouseover', (e: L.LeafletMouseEvent) => {
      pathLayer.setStyle({
        fillOpacity: 1,
        weight: 3,
      })
      const el = (e.target as any).getElement?.() as SVGPathElement | null
      el?.classList.add('hovered')
      pathLayer.bringToFront()
    })

    layer.on('mouseout', (e: L.LeafletMouseEvent) => {
      pathLayer.setStyle({
        fillOpacity: 0.85,
        weight: 2,
      })
      const el = (e.target as any).getElement?.() as SVGPathElement | null
      el?.classList.remove('hovered')
    })
  }, [selectedKec, kecamatanStats])

  useEffect(() => {
    injectMapStyles()
  }, [])

  // Create custom marker icons
  const createKecIcon = useCallback((name: string, count: number) => {
    return L.divIcon({
      html: `<div class="kec-label-box">${name} <div class="kec-total">${count}</div></div>`,
      className: 'kecamatan-marker-icon',
      iconSize: [160, 60],
      iconAnchor: [80, 30]
    })
  }, [])

  return (
    <div className="w-full h-full relative">
      {selectedKec && (
        <div className="absolute top-4 left-4 z-[400]">
          <button 
            onClick={() => setSelectedKec(null)}
            className="flex items-center gap-2 bg-white/95 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            KEMBALI KE SEMUA KECAMATAN
          </button>
        </div>
      )}

      <MapContainer
        center={[0.9100, 104.4700]}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[400px] rounded-xl"
        style={{ zIndex: 0, background: '#e0e7ff' }} 
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <MapBoundsController selectedKec={selectedKec} geoData={filteredGeojson} />

        {/* DEFAULT VIEW: MARKERS ONLY */}
        {!selectedKec && KEC_CENTERS.map((kec, i) => {
          const total = kecamatanStats[kec.name]?.total || 0
          return (
            <Marker 
              key={i} 
              position={kec.pos as [number, number]} 
              icon={createKecIcon(kec.name, total)}
              eventHandlers={{
                click: () => setSelectedKec(kec.name)
              }}
            />
          )
        })}

        {/* DRILL DOWN VIEW: KELURAHAN POLYGONS */}
        {selectedKec && (
          <GeoJSON
            key={selectedKec} // force remount when selectedKec changes
            data={filteredGeojson as any}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  )
}
