"use client"
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { KelurahanStat } from './monitoring-dialog'
import { useEffect, useMemo, useCallback, useRef } from 'react'
import L from 'leaflet'
import { KELURAHAN_GEOJSON } from '@/data/kelurahan-geo'

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
    .kelurahan-tooltip {
      background: rgba(10, 15, 40, 0.92) !important;
      border: 1px solid rgba(255,255,255,0.15) !important;
      border-radius: 12px !important;
      color: #fff !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.45) !important;
      padding: 10px 16px !important;
      backdrop-filter: blur(10px);
      pointer-events: none;
    }
    .kelurahan-tooltip::before { display: none !important; }

    .leaflet-interactive {
      transition: filter 0.22s ease, stroke-width 0.22s ease;
      cursor: pointer;
    }
    .leaflet-interactive.hovered {
      filter: brightness(1.30) drop-shadow(0 0 14px rgba(59,130,246,0.65));
    }
  `
  document.head.appendChild(style)
}

// ── Legend component ──────────────────────────────────────────────────────────
function MapLegend({ maxCount }: { maxCount: number }) {
  const map = useMap()

  useEffect(() => {
    const legend = new (L.Control.extend({
      onAdd() {
        const div = L.DomUtil.create('div', '')
        div.innerHTML = `
          <div style="
            background: rgba(10,15,40,0.88);
            color:#fff;
            border-radius:10px;
            padding:10px 14px;
            font-family:system-ui,sans-serif;
            font-size:11px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.12);
            backdrop-filter:blur(8px);
            min-width:130px;
          ">
            <p style="font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin:0 0 8px">Jumlah Pelaku</p>
            ${[
              ['#1e3a8a', '≥ 90%'],
              ['#1d4ed8', '65–90%'],
              ['#2563eb', '50–65%'],
              ['#3b82f6', '30–50%'],
              ['#60a5fa', '15–30%'],
              ['#93c5fd', '< 15%'],
              ['#dbeafe', '0 / Tidak ada'],
            ].map(([color, label]) => `
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
                <div style="width:16px;height:16px;border-radius:4px;background:${color};border:1px solid rgba(255,255,255,0.2);flex-shrink:0"></div>
                <span style="color:#e2e8f0;font-weight:600">${label}</span>
              </div>
            `).join('')}
          </div>
        `
        return div
      }
    }))({ position: 'bottomleft' })
    legend.addTo(map)
    return () => { legend.remove() }
  }, [map])

  return null
}

// ── Main renderer ─────────────────────────────────────────────────────────────
export default function MapRenderer({ data }: { data: KelurahanStat[] }) {
  const center: [number, number] = [0.9100, 104.4700]

  const dataMap = useMemo(() => {
    const m: Record<string, number> = {}
    data.forEach(d => { m[d.name] = d.count })
    return m
  }, [data])

  const maxCount = useMemo(() => Math.max(...data.map(d => d.count), 1), [data])

  // Keep a ref to the GeoJSON layer so we can re-style on data change
  const geoRef = useRef<L.GeoJSON | null>(null)

  const styleFeature = useCallback((feature: any): L.PathOptions => {
    const name = feature?.properties?.name as string
    const count = dataMap[name] ?? 0
    return {
      fillColor: getChoroColor(count, maxCount),
      fillOpacity: 0.70,
      color: '#ffffff',
      weight: 1.5,
      opacity: 0.85,
    }
  }, [dataMap, maxCount])

  const onEachFeature = useCallback((feature: any, layer: L.Layer) => {
    const name = feature.properties?.name as string
    const count = dataMap[name] ?? 0

    const tooltipContent = `
      <div style="text-align:center;min-width:130px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;letter-spacing:.06em;margin:0 0 6px">${name}</p>
        <p style="font-size:22px;font-weight:900;color:#fff;margin:0;line-height:1">${count}</p>
        <p style="font-size:10px;color:#64748b;margin:4px 0 0">pelaku usaha</p>
      </div>
    `
    layer.bindTooltip(tooltipContent, {
      sticky: true,
      opacity: 1,
      className: 'kelurahan-tooltip',
      offset: [12, 0],
    })

    const pathLayer = layer as L.Path

    layer.on('mouseover', (e: L.LeafletMouseEvent) => {
      pathLayer.setStyle({
        fillOpacity: 0.92,
        weight: 3,
        color: '#ffffff',
      })
      // CSS "timbul" glow effect on the SVG element
      const el = (e.target as any).getElement?.() as SVGPathElement | null
      el?.classList.add('hovered')
    })

    layer.on('mouseout', (e: L.LeafletMouseEvent) => {
      const name = feature.properties?.name as string
      const count = dataMap[name] ?? 0
      pathLayer.setStyle({
        fillColor: getChoroColor(count, maxCount),
        fillOpacity: 0.70,
        weight: 1.5,
        color: '#ffffff',
        opacity: 0.85,
      })
      const el = (e.target as any).getElement?.() as SVGPathElement | null
      el?.classList.remove('hovered')
    })
  }, [dataMap, maxCount])

  // Re-apply styles when data changes
  useEffect(() => {
    if (geoRef.current) {
      geoRef.current.setStyle(styleFeature)
    }
  }, [styleFeature])

  useEffect(() => {
    injectMapStyles()
  }, [])

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={true}
      className="w-full h-full min-h-[400px] rounded-xl"
      style={{ zIndex: 0, background: '#dde8f0' }}
      zoomControl={true}
    >
      {/* Clean light basemap — labels still visible beneath translucent polygons */}
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        maxZoom={19}
      />

      {/* Choropleth polygons */}
      <GeoJSON
        ref={geoRef as any}
        data={KELURAHAN_GEOJSON as any}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />

      <MapLegend maxCount={maxCount} />
    </MapContainer>
  )
}
