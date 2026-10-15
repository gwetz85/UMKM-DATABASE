"use client"

import React, { useMemo, useCallback, useEffect, useState, useRef } from "react"
import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip, useMap } from "react-leaflet"
import L from "leaflet"
import { RotateCcw, Layers, MapPin, ArrowRight, Eye, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export interface KelurahanMapData {
  name: string
  count: number
  percent: number
  badgeColor?: string
}

// Koordinat resmi & akurat 18 Kelurahan di Kota Tanjungpinang
export const REAL_KELURAHAN_COORDS: Record<string, { pos: [number, number]; kec: string }> = {
  // ── Kecamatan Tanjungpinang Kota ─────────────────────────
  "Penyengat": { pos: [0.9282, 104.4183], kec: "Tanjungpinang Kota" }, // Pulau Penyengat
  "Kampung Bugis": { pos: [0.9420, 104.4360], kec: "Tanjungpinang Kota" }, // Seberang Teluk Utara
  "Senggarang": { pos: [0.9520, 104.4560], kec: "Tanjungpinang Kota" }, // Pesisir Utara
  "Tanjungpinang Kota": { pos: [0.9274, 104.4436], kec: "Tanjungpinang Kota" }, // Pusat Kota Lama / Pelabuhan

  // ── Kecamatan Tanjungpinang Barat ────────────────────────
  "Kemboja": { pos: [0.9210, 104.4420], kec: "Tanjungpinang Barat" }, // Kawasan Kemboja
  "Tanjungpinang Barat": { pos: [0.9150, 104.4380], kec: "Tanjungpinang Barat" }, // Pesisir Barat / Teluk Keriting
  "Bukit Cermin": { pos: [0.9250, 104.4530], kec: "Tanjungpinang Barat" }, // Perbukitan Barat
  "Kampung Baru": { pos: [0.9150, 104.4520], kec: "Tanjungpinang Barat" }, // Pemukiman Pusat

  // ── Kecamatan Bukit Bestari ─────────────────────────────
  "Tanjung Ayun Sakti": { pos: [0.9030, 104.4500], kec: "Bukit Bestari" }, // Basuki Rahmat
  "Tanjungpinang Timur": { pos: [0.9060, 104.4620], kec: "Bukit Bestari" }, // Ahmad Yani
  "Sei jang": { pos: [0.8950, 104.4620], kec: "Bukit Bestari" }, // Sei Jang
  "Tanjung Unggat": { pos: [0.8850, 104.4660], kec: "Bukit Bestari" }, // Pesisir Selatan
  "Dompak": { pos: [0.8659, 104.4824], kec: "Bukit Bestari" }, // Pulau Dompak (Pusat Pemprov)

  // ── Kecamatan Tanjungpinang Timur ────────────────────────
  "Kampung Bulang": { pos: [0.9120, 104.4750], kec: "Tanjungpinang Timur" }, // Km 7 - Km 8
  "Melayu Kota Piring": { pos: [0.9180, 104.4880], kec: "Tanjungpinang Timur" }, // Wonosari / Sungai Carang
  "Air Raja": { pos: [0.9060, 104.5080], kec: "Tanjungpinang Timur" }, // Km 14
  "Batu IX": { pos: [0.9220, 104.5120], kec: "Tanjungpinang Timur" }, // Bintan Center / Km 9
  "Pinang Kencana": { pos: [0.9420, 104.5260], kec: "Tanjungpinang Timur" }, // Bandara RHF / Km 11+
}

// Pusat Kota Tanjungpinang (mencakup daratan & pulau-pulau)
const DEFAULT_CENTER: [number, number] = [0.9140, 104.4680]
const DEFAULT_ZOOM = 12

function normalizeName(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function injectCustomMapStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('tpi-map-clean-styles')) return
  const style = document.createElement('style')
  style.id = 'tpi-map-clean-styles'
  style.textContent = `
    .tpi-badge-marker {
      background: transparent !important;
      border: none !important;
      cursor: pointer;
    }
    .tpi-bubble {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      padding: 0 6px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 900;
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28), 0 0 0 2px #ffffff;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
    }
    .tpi-bubble:hover {
      transform: scale(1.18) translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 3px #ffffff;
      z-index: 9999 !important;
    }
    .tpi-bubble.tier-top {
      background: linear-gradient(135deg, #059669, #10b981);
    }
    .tpi-bubble.tier-high {
      background: linear-gradient(135deg, #0284c7, #38bdf8);
    }
    .tpi-bubble.tier-med {
      background: linear-gradient(135deg, #0891b2, #06b6d4);
    }
    .tpi-bubble.tier-low {
      background: linear-gradient(135deg, #64748b, #94a3b8);
    }
    .leaflet-popup-content-wrapper {
      border-radius: 18px !important;
      box-shadow: 0 16px 36px -4px rgba(15, 23, 42, 0.25) !important;
      padding: 0 !important;
      overflow: hidden !important;
      border: 1px solid rgba(226, 232, 240, 0.9) !important;
    }
    .leaflet-popup-content {
      margin: 0 !important;
      width: 250px !important;
      line-height: 1.4 !important;
    }
    .leaflet-popup-tip {
      background: #ffffff !important;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1) !important;
    }
    .tpi-tooltip {
      background: rgba(15, 23, 42, 0.92) !important;
      backdrop-filter: blur(6px) !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      border-radius: 10px !important;
      color: #ffffff !important;
      font-weight: 800 !important;
      font-size: 11px !important;
      padding: 4px 8px !important;
      box-shadow: 0 8px 20px rgba(0,0,0,0.3) !important;
      white-space: nowrap !important;
    }
    .tpi-tooltip:before {
      border-top-color: rgba(15, 23, 42, 0.92) !important;
    }
  `
  document.head.appendChild(style)
}

function MapController({ 
  selectedKelurahan, 
  resetSignal 
}: { 
  selectedKelurahan: string | null
  resetSignal: number
}) {
  const map = useMap()

  useEffect(() => {
    map.invalidateSize()
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 250)
    return () => clearTimeout(timer)
  }, [map])

  useEffect(() => {
    if (selectedKelurahan) {
      const norm = normalizeName(selectedKelurahan)
      const foundEntry = Object.entries(REAL_KELURAHAN_COORDS).find(
        ([k]) => normalizeName(k) === norm
      )
      if (foundEntry) {
        const coords = foundEntry[1].pos
        map.flyTo(coords, 14, { duration: 1.2 })
      }
    }
  }, [selectedKelurahan, map])

  useEffect(() => {
    if (resetSignal > 0) {
      map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1.0 })
    }
  }, [resetSignal, map])

  return null
}

interface TanjungpinangMapInnerProps {
  data: KelurahanMapData[]
  totalUmkm?: number
  onSelectKelurahan?: (kelurahanName: string) => void
  selectedKelurahan?: string | null
  className?: string
}

export default function TanjungpinangMapInner({
  data,
  totalUmkm = 0,
  onSelectKelurahan,
  selectedKelurahan = null,
  className
}: TanjungpinangMapInnerProps) {
  const [tileProvider, setTileProvider] = useState<"osm" | "esri" | "satellite">("esri")
  const [resetCount, setResetCount] = useState(0)
  const [activeKelurahan, setActiveKelurahan] = useState<string | null>(selectedKelurahan)

  useEffect(() => {
    injectCustomMapStyles()
  }, [])

  useEffect(() => {
    if (selectedKelurahan) {
      setActiveKelurahan(selectedKelurahan)
    }
  }, [selectedKelurahan])

  // Lookup data cepat
  const statsLookup = useMemo(() => {
    const map: Record<string, { count: number; percent: number; rank: number; originalName: string }> = {}
    data.forEach((item, idx) => {
      const key = normalizeName(item.name)
      map[key] = {
        count: item.count,
        percent: item.percent,
        rank: idx + 1,
        originalName: item.name
      }
    })
    return map
  }, [data])

  const maxCount = useMemo(() => {
    if (data.length === 0) return 1
    return Math.max(...data.map(d => d.count), 1)
  }, [data])

  const getTierClass = (count: number) => {
    const ratio = count / maxCount
    if (ratio >= 0.70) return "tier-top"
    if (ratio >= 0.40) return "tier-high"
    if (ratio >= 0.15) return "tier-med"
    return "tier-low"
  }

  const getCircleColor = (count: number) => {
    const ratio = count / maxCount
    if (ratio >= 0.70) return { fill: "#10b981", stroke: "#059669", radius: 24 }
    if (ratio >= 0.40) return { fill: "#0284c7", stroke: "#0369a1", radius: 19 }
    if (ratio >= 0.15) return { fill: "#06b6d4", stroke: "#0891b2", radius: 15 }
    return { fill: "#64748b", stroke: "#475569", radius: 12 }
  }

  const createMarkerIcon = useCallback((kelName: string, count: number) => {
    const tier = getTierClass(count)
    return L.divIcon({
      html: `
        <div class="tpi-bubble ${tier}" title="${kelName}: ${count} UMKM">
          ${count}
        </div>
      `,
      className: "tpi-badge-marker",
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    })
  }, [maxCount])

  const handleKelurahanClick = (kelName: string) => {
    setActiveKelurahan(kelName)
    if (onSelectKelurahan) {
      onSelectKelurahan(kelName)
    }
  }

  return (
    <div className={cn("w-full h-full relative overflow-hidden rounded-2xl select-none", className)}>
      {/* ─── Leaflet Map Container ─── */}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[260px] rounded-2xl z-0"
        style={{ background: "#e2e8f0" }}
        zoomControl={false}
      >
        <MapController 
          selectedKelurahan={activeKelurahan} 
          resetSignal={resetCount} 
        />

        {/* ─── Basemap Tiles (100% Free, No Watermark, No API Key Required) ─── */}
        {tileProvider === "esri" && (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
          />
        )}
        {tileProvider === "osm" && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}
        {tileProvider === "satellite" && (
          <TileLayer
            attribution='&copy; Esri &mdash; Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
          />
        )}

        {/* ─── Real Geographic Markers for 18 Kelurahan ─── */}
        {Object.entries(REAL_KELURAHAN_COORDS).map(([kelName, item]) => {
          const stat = statsLookup[normalizeName(kelName)]
          const count = stat ? stat.count : 0
          const percent = stat ? stat.percent : 0
          const rank = stat ? stat.rank : "-"
          const kec = item.kec
          const circle = getCircleColor(count)
          const isSelected = activeKelurahan && normalizeName(activeKelurahan) === normalizeName(kelName)

          return (
            <React.Fragment key={kelName}>
              {/* Radiant Density Glow Halo */}
              <CircleMarker
                center={item.pos}
                radius={isSelected ? circle.radius + 6 : circle.radius}
                pathOptions={{
                  fillColor: isSelected ? "#3b82f6" : circle.fill,
                  fillOpacity: isSelected ? 0.75 : 0.45,
                  color: isSelected ? "#1d4ed8" : circle.stroke,
                  weight: isSelected ? 3 : 1.5
                }}
              />

              {/* Center Number Marker */}
              <Marker
                position={item.pos}
                icon={createMarkerIcon(kelName, count)}
                eventHandlers={{
                  click: () => {
                    setActiveKelurahan(kelName)
                  }
                }}
              >
                {/* Floating Tooltip on Hover */}
                <Tooltip direction="top" offset={[0, -14]} className="tpi-tooltip">
                  <span>{kelName} &bull; {count} UMKM</span>
                </Tooltip>

                {/* Rich Popup on Click */}
                <Popup closeButton={false}>
                  <div className="p-3.5 font-sans text-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                      <div>
                        <span className="text-[9.5px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
                          Kec. {kec}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 uppercase leading-tight mt-0.5">
                          Kel. {kelName}
                        </h4>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        #{rank}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                      <span className="text-xs font-bold text-slate-500">Jumlah UMKM</span>
                      <div className="text-right">
                        <span className="text-base font-black text-sky-600">{count}</span>
                        <span className="text-[11px] text-slate-400 font-bold ml-1">({percent}%)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleKelurahanClick(kelName)}
                      className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-sky-600/30"
                    >
                      <span>Buka Rincian Data UMKM</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          )
        })}
      </MapContainer>

      {/* ─── Floating Top Controls Overlay ─── */}
      <div className="absolute top-2.5 right-2.5 z-[400] flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200/80 dark:border-slate-700/80">
        {/* Reset View Button */}
        <button
          type="button"
          onClick={() => {
            setActiveKelurahan(null)
            setResetCount(prev => prev + 1)
          }}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Pusatkan Tampilan Peta Tanjungpinang"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Toggle Peta Jalan / Satelit / OSM */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[9.5px] font-black uppercase">
          <button
            type="button"
            onClick={() => setTileProvider("esri")}
            className={cn(
              "px-2 py-1 rounded-md transition-all",
              tileProvider === "esri"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            Peta
          </button>
          <button
            type="button"
            onClick={() => setTileProvider("osm")}
            className={cn(
              "px-2 py-1 rounded-md transition-all",
              tileProvider === "osm"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            OSM
          </button>
          <button
            type="button"
            onClick={() => setTileProvider("satellite")}
            className={cn(
              "px-2 py-1 rounded-md transition-all",
              tileProvider === "satellite"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            Satelit
          </button>
        </div>
      </div>

      {/* ─── Floating Density Legend (Bottom Left Overlay) ─── */}
      <div className="absolute bottom-2.5 left-2.5 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-md border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2">
        <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Sebaran:</span>
        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-600 dark:text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-[#64748b] inline-block shadow-xs" title="< 20 UMKM" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4] inline-block shadow-xs" title="20-45 UMKM" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] inline-block shadow-xs" title="45-80 UMKM" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block shadow-xs" title="> 80 UMKM" />
          <span className="text-[9px] font-bold text-slate-400 ml-0.5">Tinggi</span>
        </div>
      </div>
    </div>
  )
}
