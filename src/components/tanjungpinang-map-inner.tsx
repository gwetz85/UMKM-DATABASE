"use client"

import React, { useMemo, useCallback, useEffect, useState, useRef } from "react"
import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import { KELURAHAN_GEOJSON } from "@/data/kelurahan-geo"
import { RotateCcw, Layers, MapPin, Building2, ArrowRight, Sparkles, Navigation } from "lucide-react"
import { cn } from "@/lib/utils"

export interface KelurahanMapData {
  name: string
  count: number
  percent: number
  badgeColor?: string
}

export const KELURAHAN_CENTROIDS: Record<string, [number, number]> = {
  "Kampung Bugis": [0.9362, 104.4298],
  "Senggarang": [0.9383, 104.4584],
  "Tanjungpinang Kota": [0.9216, 104.4325],
  "Penyengat": [0.9278, 104.4081],
  "Tanjungpinang Barat": [0.9065, 104.4173],
  "Kemboja": [0.9062, 104.4486],
  "Bukit Cermin": [0.9210, 104.4692],
  "Kampung Baru": [0.9202, 104.4998],
  "Melayu Kota Piring": [0.9029, 104.5062],
  "Kampung Bulang": [0.8886, 104.4986],
  "Batu IX": [0.9158, 104.5310],
  "Pinang Kencana": [0.9323, 104.5365],
  "Air Raja": [0.9069, 104.5291],
  "Dompak": [0.8758, 104.4669],
  "Sei jang": [0.8786, 104.4469],
  "Tanjung Unggat": [0.8896, 104.4684],
  "Tanjung Ayun Sakti": [0.8910, 104.4360],
  "Tanjungpinang Timur": [0.9043, 104.4780],
}

export const KELURAHAN_KECAMATAN_MAP: Record<string, string> = {
  "Kampung Bugis": "Tanjungpinang Kota",
  "Senggarang": "Tanjungpinang Kota",
  "Tanjungpinang Kota": "Tanjungpinang Kota",
  "Penyengat": "Tanjungpinang Kota",
  "Tanjungpinang Barat": "Tanjungpinang Barat",
  "Kemboja": "Tanjungpinang Barat",
  "Bukit Cermin": "Tanjungpinang Barat",
  "Kampung Baru": "Tanjungpinang Barat",
  "Melayu Kota Piring": "Tanjungpinang Timur",
  "Kampung Bulang": "Tanjungpinang Timur",
  "Batu IX": "Tanjungpinang Timur",
  "Pinang Kencana": "Tanjungpinang Timur",
  "Air Raja": "Tanjungpinang Timur",
  "Dompak": "Bukit Bestari",
  "Sei jang": "Bukit Bestari",
  "Tanjung Unggat": "Bukit Bestari",
  "Tanjung Ayun Sakti": "Bukit Bestari",
  "Tanjungpinang Timur": "Bukit Bestari",
}

const DEFAULT_CENTER: [number, number] = [0.9100, 104.4700]
const DEFAULT_ZOOM = 12

function normalizeName(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function injectCustomMapStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('tpi-map-styles')) return
  const style = document.createElement('style')
  style.id = 'tpi-map-styles'
  style.textContent = `
    .tpi-map-marker {
      background: transparent !important;
      border: none !important;
      cursor: pointer;
    }
    .tpi-pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px 3px 6px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(8px);
      border: 1.5px solid #0284c7;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.28), 0 1px 3px rgba(0,0,0,0.1);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      user-select: none;
    }
    .tpi-pill-badge:hover {
      transform: scale(1.1) translateY(-2px);
      box-shadow: 0 8px 20px rgba(2, 132, 199, 0.45);
      border-color: #0ea5e9;
      background: #ffffff;
      z-index: 9999 !important;
    }
    .tpi-pill-name {
      font-size: 10px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.2px;
      text-transform: capitalize;
    }
    .tpi-pill-count {
      font-size: 9.5px;
      font-weight: 900;
      color: #ffffff;
      background: linear-gradient(135deg, #0284c7, #0369a1);
      padding: 1px 6px;
      border-radius: 9999px;
      line-height: 1.3;
      box-shadow: 0 1px 3px rgba(2, 132, 199, 0.4);
    }
    .leaflet-popup-content-wrapper {
      border-radius: 20px !important;
      box-shadow: 0 16px 40px -8px rgba(15, 23, 42, 0.25) !important;
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
      // Find coordinates
      const norm = normalizeName(selectedKelurahan)
      const foundKey = Object.keys(KELURAHAN_CENTROIDS).find(k => normalizeName(k) === norm)
      if (foundKey) {
        const coords = KELURAHAN_CENTROIDS[foundKey]
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
  const [mapType, setMapType] = useState<"streets" | "satellite">("streets")
  const [resetCount, setResetCount] = useState(0)
  const [activeKelurahan, setActiveKelurahan] = useState<string | null>(selectedKelurahan)
  const geoJsonRef = useRef<L.GeoJSON | null>(null)

  useEffect(() => {
    injectCustomMapStyles()
  }, [])

  useEffect(() => {
    if (selectedKelurahan) {
      setActiveKelurahan(selectedKelurahan)
    }
  }, [selectedKelurahan])

  // Normalized fast lookup map
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

  // Color generator for choropleth
  const getFeatureColor = useCallback((name: string) => {
    const stat = statsLookup[normalizeName(name)]
    const count = stat ? stat.count : 0
    const ratio = count / maxCount

    if (count === 0) return { fill: "#94a3b8", opacity: 0.25, stroke: "#64748b" }
    if (ratio >= 0.70) return { fill: "#059669", opacity: 0.65, stroke: "#047857" } // Top (Emerald)
    if (ratio >= 0.45) return { fill: "#0284c7", opacity: 0.60, stroke: "#0369a1" } // High (Sky Blue)
    if (ratio >= 0.20) return { fill: "#0ea5e9", opacity: 0.50, stroke: "#0284c7" } // Medium (Light Sky)
    return { fill: "#38bdf8", opacity: 0.40, stroke: "#0ea5e9" } // Low (Cyan)
  }, [statsLookup, maxCount])

  // GeoJSON polygon styling
  const geoJsonStyle = useCallback((feature: any) => {
    const name = feature?.properties?.name || ""
    const isSelected = activeKelurahan && normalizeName(activeKelurahan) === normalizeName(name)
    const { fill, opacity, stroke } = getFeatureColor(name)

    return {
      fillColor: isSelected ? "#3b82f6" : fill,
      fillOpacity: isSelected ? 0.85 : opacity,
      weight: isSelected ? 3 : 1.5,
      color: isSelected ? "#1d4ed8" : stroke,
      dashArray: "",
      transition: "all 0.3s ease"
    }
  }, [getFeatureColor, activeKelurahan])

  // Custom DivIcon marker generator
  const createMarkerIcon = useCallback((kelName: string, count: number) => {
    return L.divIcon({
      html: `
        <div class="tpi-pill-badge">
          <span class="tpi-pill-name">${kelName}</span>
          <span class="tpi-pill-count">${count}</span>
        </div>
      `,
      className: "tpi-map-marker",
      iconSize: [110, 28],
      iconAnchor: [55, 14]
    })
  }, [])

  const handleKelurahanClick = (kelName: string) => {
    setActiveKelurahan(kelName)
    if (onSelectKelurahan) {
      onSelectKelurahan(kelName)
    }
  }

  return (
    <div className={cn("w-full h-full relative overflow-hidden rounded-2xl select-none", className)}>
      {/* ─── Leaflet Map ─── */}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[260px] rounded-2xl z-0"
        style={{ background: "#f8fafc" }}
        zoomControl={false}
      >
        <MapController 
          selectedKelurahan={activeKelurahan} 
          resetSignal={resetCount} 
        />

        {mapType === "streets" ? (
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />
        ) : (
          <TileLayer
            attribution='&copy; Esri &mdash; Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
          />
        )}

        {/* ─── GeoJSON Polygons for 18 Kelurahan ─── */}
        <GeoJSON
          ref={geoJsonRef}
          data={KELURAHAN_GEOJSON as any}
          style={geoJsonStyle}
          onEachFeature={(feature, layer) => {
            const name = feature?.properties?.name || ""
            const stat = statsLookup[normalizeName(name)]
            const count = stat ? stat.count : 0
            const percent = stat ? stat.percent : 0
            const kec = KELURAHAN_KECAMATAN_MAP[name] || "Kota Tanjungpinang"

            layer.on({
              mouseover: (e) => {
                const l = e.target
                l.setStyle({
                  weight: 3,
                  color: "#0284c7",
                  fillOpacity: 0.82
                })
                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                  l.bringToFront()
                }
              },
              mouseout: (e) => {
                if (geoJsonRef.current) {
                  geoJsonRef.current.resetStyle(e.target)
                }
              },
              click: () => {
                setActiveKelurahan(name)
              }
            })

            layer.bindPopup(`
              <div style="padding: 14px; font-family: inherit; color: #0f172a;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 10px;">
                  <div>
                    <span style="font-size: 9px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px;">KEC. ${kec}</span>
                    <h4 style="margin: 2px 0 0; font-size: 14px; font-weight: 900; color: #0f172a; text-transform: uppercase;">KEL. ${name}</h4>
                  </div>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 8px 10px; border-radius: 12px; margin-bottom: 12px; border: 1px solid #e2e8f0;">
                  <span style="font-size: 11px; font-weight: 700; color: #64748b;">Jumlah UMKM</span>
                  <div style="text-align: right;">
                    <span style="font-size: 16px; font-weight: 900; color: #0284c7;">${count}</span>
                    <span style="font-size: 10px; color: #64748b; margin-left: 2px;">(${percent}%)</span>
                  </div>
                </div>
                <button 
                  id="btn-kel-${normalizeName(name)}" 
                  style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; background: #0284c7; color: #ffffff; border: none; padding: 7px 12px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer; transition: background 0.2s;"
                  onmouseover="this.style.background='#0369a1'"
                  onmouseout="this.style.background='#0284c7'"
                >
                  <span>Lihat Rincian Data UMKM</span>
                  <span>&rarr;</span>
                </button>
              </div>
            `)

            layer.on('popupopen', () => {
              const btn = document.getElementById(`btn-kel-${normalizeName(name)}`)
              if (btn) {
                btn.onclick = () => {
                  handleKelurahanClick(name)
                }
              }
            })
          }}
        />

        {/* ─── Centroid Pill Markers for 18 Kelurahan ─── */}
        {Object.entries(KELURAHAN_CENTROIDS).map(([kelName, coords]) => {
          const stat = statsLookup[normalizeName(kelName)]
          const count = stat ? stat.count : 0
          const percent = stat ? stat.percent : 0
          const rank = stat ? stat.rank : "-"
          const kec = KELURAHAN_KECAMATAN_MAP[kelName] || "Kota Tanjungpinang"

          return (
            <Marker
              key={kelName}
              position={coords}
              icon={createMarkerIcon(kelName, count)}
              eventHandlers={{
                click: () => {
                  setActiveKelurahan(kelName)
                }
              }}
            >
              <Popup closeButton={false}>
                <div className="p-3.5 font-sans text-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                    <div>
                      <span className="text-[9.5px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
                        KEC. {kec}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 uppercase leading-tight mt-0.5">
                        KEL. {kelName}
                      </h4>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      #{rank}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                    <span className="text-xs font-bold text-slate-500">Sebaran UMKM</span>
                    <div className="text-right">
                      <span className="text-base font-black text-sky-600">{count}</span>
                      <span className="text-[11px] text-slate-400 font-bold ml-1">({percent}%)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleKelurahanClick(kelName)}
                    className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-sky-600/30"
                  >
                    <span>Buka Rincian UMKM</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* ─── Floating Mini Controls (Top Right Overlay) ─── */}
      <div className="absolute top-2.5 right-2.5 z-[400] flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200/80 dark:border-slate-700/80">
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

        {/* Toggle Map / Satellite */}
        <button
          type="button"
          onClick={() => setMapType(prev => prev === "streets" ? "satellite" : "streets")}
          className={cn(
            "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors",
            mapType === "satellite" 
              ? "bg-sky-600 text-white shadow-xs" 
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
          title="Ganti Lapisan Peta"
        >
          <Layers className="w-3 h-3" />
          <span>{mapType === "streets" ? "Peta" : "Satelit"}</span>
        </button>
      </div>

      {/* ─── Floating Density Legend (Bottom Left Overlay) ─── */}
      <div className="absolute bottom-2.5 left-2.5 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-md border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2">
        <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Kepadatan:</span>
        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-600 dark:text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] inline-block shadow-xs" title="Rendah" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] inline-block shadow-xs" title="Sedang" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#059669] inline-block shadow-xs" title="Tinggi" />
          <span className="text-[9px] font-bold text-slate-400 ml-0.5">Tinggi</span>
        </div>
      </div>
    </div>
  )
}
