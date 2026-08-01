"use client"
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { KelurahanStat } from './monitoring-dialog'
import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import L from 'leaflet'
import { KECAMATAN_GEOJSON, KECAMATAN_KELURAHAN } from '@/data/kecamatan-geo'

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
    .kecamatan-tooltip {
      background: rgba(255, 255, 255, 0.95) !important;
      border: 1px solid rgba(0,0,0,0.1) !important;
      border-radius: 8px !important;
      color: #0f172a !important;
      box-shadow: 0 4px 15px rgba(0,0,0,0.15) !important;
      padding: 6px 12px !important;
      font-weight: 700;
      font-size: 11px;
      pointer-events: none;
    }
    .kecamatan-tooltip::before { display: none !important; }

    .leaflet-interactive {
      transition: filter 0.22s ease, stroke-width 0.22s ease;
      cursor: pointer;
    }
    .leaflet-interactive.hovered {
      filter: brightness(1.20) drop-shadow(0 0 10px rgba(59,130,246,0.5));
    }
    
    .custom-popup .leaflet-popup-content-wrapper {
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      padding: 0;
      overflow: hidden;
    }
    .custom-popup .leaflet-popup-content {
      margin: 0;
      width: 280px !important;
    }
    .custom-popup .leaflet-popup-tip-container {
      margin-top: -1px;
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
            background: rgba(255,255,255,0.95);
            color:#0f172a;
            border-radius:10px;
            padding:10px 14px;
            font-family:system-ui,sans-serif;
            font-size:11px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            border: 1px solid rgba(0,0,0,0.05);
            backdrop-filter:blur(8px);
            min-width:130px;
          ">
            <p style="font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin:0 0 8px">Jumlah Pelaku</p>
            ${[
              ['#1e3a8a', 'Sangat Padat'],
              ['#3b82f6', 'Padat'],
              ['#93c5fd', 'Sedang'],
              ['#dbeafe', 'Rendah / Kosong'],
            ].map(([color, label]) => `
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
                <div style="width:16px;height:16px;border-radius:4px;background:${color};border:1px solid rgba(0,0,0,0.1);flex-shrink:0"></div>
                <span style="color:#334155;font-weight:600">${label}</span>
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

  // data = kelurahan stats.
  // We need to aggregate them by Kecamatan
  const kecamatanStats = useMemo(() => {
    const stats: Record<string, { total: number, kelurahan: { name: string, count: number }[] }> = {}
    
    // Initialize
    Object.keys(KECAMATAN_KELURAHAN).forEach(kec => {
      stats[kec] = { total: 0, kelurahan: [] }
    })

    // Map kelurahan to kecamatan mapping safely
    const dataMap: Record<string, number> = {}
    data.forEach(d => { dataMap[d.name.toLowerCase()] = d.count })

    Object.entries(KECAMATAN_KELURAHAN).forEach(([kecName, kelList]) => {
      let total = 0
      const kelData = kelList.map(kelName => {
        const count = dataMap[kelName.toLowerCase()] || 0
        total += count
        return { name: kelName, count }
      })
      
      // sort kelurahan by count desc
      kelData.sort((a, b) => b.count - a.count)
      
      stats[kecName] = { total, kelurahan: kelData }
    })

    return stats
  }, [data])

  const maxCount = useMemo(() => {
    const totals = Object.values(kecamatanStats).map(s => s.total)
    return Math.max(...totals, 1)
  }, [kecamatanStats])

  const geoRef = useRef<L.GeoJSON | null>(null)

  const styleFeature = useCallback((feature: any): L.PathOptions => {
    const name = feature?.properties?.name as string
    const stat = kecamatanStats[name]
    const count = stat ? stat.total : 0
    return {
      fillColor: getChoroColor(count, maxCount),
      fillOpacity: 0.75,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
    }
  }, [kecamatanStats, maxCount])

  const onEachFeature = useCallback((feature: any, layer: L.Layer) => {
    const name = feature.properties?.name as string
    const stat = kecamatanStats[name]
    const count = stat ? stat.total : 0

    // Tooltip for quick hover info
    layer.bindTooltip(`
      <div style="text-align:center;">
        <span style="text-transform:uppercase">${name}</span>
      </div>
    `, {
      sticky: true,
      className: 'kecamatan-tooltip',
      direction: 'top',
      offset: [0, -10]
    })

    // Popup for detailed click info (Mimicking the requested UI)
    const popupContent = `
      <div style="font-family: system-ui, sans-serif; color: #1e293b;">
        <div style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">${name.toUpperCase()}</h3>
        </div>
        <div style="padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
            <span style="color: #64748b; font-size: 13px; font-weight: 600;">Total Pelaku Usaha</span>
            <span style="background: #3b82f6; color: white; padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 13px;">${count}</span>
          </div>
          <div style="max-height: 200px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tbody>
                ${stat?.kelurahan.map((kel, i) => `
                  <tr>
                    <td style="padding: 6px 0; color: #475569; ${i !== stat.kelurahan.length - 1 ? 'border-bottom: 1px dashed #e2e8f0;' : ''}">${kel.name}</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a; ${i !== stat.kelurahan.length - 1 ? 'border-bottom: 1px dashed #e2e8f0;' : ''}">${kel.count}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `

    layer.bindPopup(popupContent, {
      className: 'custom-popup'
    })

    const pathLayer = layer as L.Path

    layer.on('mouseover', (e: L.LeafletMouseEvent) => {
      pathLayer.setStyle({
        fillOpacity: 0.95,
        weight: 3,
        color: '#ffffff',
      })
      const el = (e.target as any).getElement?.() as SVGPathElement | null
      el?.classList.add('hovered')
    })

    layer.on('mouseout', (e: L.LeafletMouseEvent) => {
      pathLayer.setStyle({
        fillColor: getChoroColor(count, maxCount),
        fillOpacity: 0.75,
        weight: 2,
        color: '#ffffff',
        opacity: 1,
      })
      const el = (e.target as any).getElement?.() as SVGPathElement | null
      el?.classList.remove('hovered')
    })
  }, [kecamatanStats, maxCount])

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
      style={{ zIndex: 0, background: '#e0e7ff' }} // light indigo background for sea
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        maxZoom={19}
      />

      <GeoJSON
        ref={geoRef as any}
        data={KECAMATAN_GEOJSON as any}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />

      <MapLegend maxCount={maxCount} />
    </MapContainer>
  )
}
