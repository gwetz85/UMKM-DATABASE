"use client"
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet'
import { KelurahanStat } from './monitoring-dialog'
import { useEffect } from 'react'
import L from 'leaflet'

const KELURAHAN_COORDS: Record<string, [number, number]> = {
  "Tanjungpinang Kota":    [0.9267, 104.4440],
  "Senggarang":            [0.9500, 104.4500],
  "Kampung Bugis":         [0.9350, 104.4400],
  "Penyengat":             [0.9280, 104.4160],
  "Tanjungpinang Barat":   [0.9167, 104.4400],
  "Kemboja":               [0.9180, 104.4450],
  "Bukit Cermin":          [0.9250, 104.4550],
  "Kampung Baru":          [0.9200, 104.4550],
  "Batu IX":               [0.9250, 104.5000],
  "Kampung Bulang":        [0.9150, 104.4800],
  "Melayu Kota Piring":    [0.9200, 104.4800],
  "Pinang Kencana":        [0.9400, 104.5300],
  "Air Raja":              [0.9300, 104.5200],
  "Sei jang":              [0.9050, 104.4650],
  "Dompak":                [0.8800, 104.4700],
  "Tanjung Unggat":        [0.9080, 104.4700],
  "Tanjungpinang Timur":   [0.9200, 104.4650],
  "Tanjung Ayun Sakti":    [0.9120, 104.4600],
}

// Color scale: low = teal, mid = blue, high = gold/amber
function getColor(pct: number): string {
  if (pct < 0.25) return '#06b6d4'  // cyan-500
  if (pct < 0.5)  return '#3b82f6'  // blue-500
  if (pct < 0.75) return '#8b5cf6'  // violet-500
  return '#f59e0b'                   // amber-500
}

function getGlowColor(pct: number): string {
  if (pct < 0.25) return 'rgba(6,182,212,0.5)'
  if (pct < 0.5)  return 'rgba(59,130,246,0.5)'
  if (pct < 0.75) return 'rgba(139,92,246,0.5)'
  return 'rgba(245,158,11,0.5)'
}

function create3DIcon(count: number, maxCount: number) {
  const pct = maxCount > 0 ? count / maxCount : 0
  const size = Math.max(44, Math.min(88, 44 + pct * 44))
  const color = getColor(pct)
  const glow = getGlowColor(pct)
  // Lighter highlight color for 3D sphere lighting
  const lighterPct = pct < 0.5 ? pct + 0.3 : pct + 0.15

  return L.divIcon({
    html: `
      <div class="marker-3d-wrap" style="width:${size}px;height:${size + 12}px;position:relative;transition:all 0.25s cubic-bezier(.34,1.56,.64,1);">
        <!-- 3D Sphere -->
        <div style="
          width:${size}px;
          height:${size}px;
          border-radius:50%;
          background: radial-gradient(circle at 35% 32%, ${color}ee, ${color}88 50%, ${color}33 100%);
          box-shadow:
            inset -4px -4px 10px rgba(0,0,0,0.35),
            inset 3px 3px 8px rgba(255,255,255,0.25),
            0 8px 24px ${glow},
            0 2px 4px rgba(0,0,0,0.4);
          display:flex;
          align-items:center;
          justify-content:center;
          position:relative;
          transition:all 0.25s cubic-bezier(.34,1.56,.64,1);
        ">
          <!-- Inner shine -->
          <div style="
            position:absolute;
            top:12%;left:20%;
            width:35%;height:30%;
            border-radius:50%;
            background:rgba(255,255,255,0.4);
            filter:blur(2px);
            pointer-events:none;
          "></div>
          <span style="
            font-size:${Math.max(10, size * 0.25)}px;
            font-weight:900;
            color:#fff;
            text-shadow:0 1px 3px rgba(0,0,0,0.6);
            letter-spacing:-0.5px;
            position:relative;
            z-index:1;
          ">${count}</span>
        </div>
        <!-- Ground shadow -->
        <div style="
          width:${size * 0.7}px;
          height:10px;
          margin:0 auto;
          border-radius:50%;
          background:radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, transparent 70%);
          margin-top:2px;
          transition:all 0.25s ease;
        "></div>
      </div>
    `,
    className: 'marker-3d-container',
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size + 12],
  })
}

// Inject CSS styles once
function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('map-3d-styles')) return
  const style = document.createElement('style')
  style.id = 'map-3d-styles'
  style.textContent = `
    .marker-3d-container { background: transparent !important; border: none !important; }
    .marker-3d-container:focus { outline: none; }
    .marker-3d-wrap {
      cursor: pointer;
      transform-origin: bottom center;
    }
    .marker-3d-wrap.elevated {
      transform: translateY(-18px) scale(1.25);
      filter: drop-shadow(0 18px 24px rgba(0,0,0,0.5));
    }
    .marker-3d-wrap.elevated > div:first-child {
      box-shadow:
        inset -4px -4px 10px rgba(0,0,0,0.35),
        inset 3px 3px 8px rgba(255,255,255,0.25),
        0 20px 40px rgba(0,0,0,0.4) !important;
    }
    .leaflet-tooltip {
      background: rgba(15,15,35,0.92) !important;
      border: 1px solid rgba(255,255,255,0.12) !important;
      border-radius: 10px !important;
      color: #fff !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
      padding: 8px 14px !important;
      backdrop-filter: blur(8px);
    }
    .leaflet-tooltip-top:before {
      border-top-color: rgba(15,15,35,0.92) !important;
    }
  `
  document.head.appendChild(style)
}

// Mouse proximity effect via direct DOM manipulation (no re-renders)
function ProximityEffect() {
  const map = useMap()

  useEffect(() => {
    injectStyles()

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      const mousePoint = map.latLngToContainerPoint(e.latlng)
      const mapContainer = map.getContainer()
      const mapRect = mapContainer.getBoundingClientRect()

      document.querySelectorAll<HTMLElement>('.marker-3d-wrap').forEach((el) => {
        const rect = el.getBoundingClientRect()
        const cx = rect.left - mapRect.left + rect.width / 2
        const cy = rect.top - mapRect.top + rect.height / 2
        const dist = Math.sqrt(
          Math.pow(mousePoint.x - cx, 2) + Math.pow(mousePoint.y - cy, 2)
        )
        if (dist < 80) {
          el.classList.add('elevated')
        } else {
          el.classList.remove('elevated')
        }
      })
    }

    const onMouseOut = () => {
      document.querySelectorAll<HTMLElement>('.marker-3d-wrap').forEach((el) => {
        el.classList.remove('elevated')
      })
    }

    map.on('mousemove', onMouseMove)
    map.on('mouseout', onMouseOut)
    return () => {
      map.off('mousemove', onMouseMove)
      map.off('mouseout', onMouseOut)
    }
  }, [map])

  return null
}

export default function MapRenderer({ data }: { data: KelurahanStat[] }) {
  const center: [number, number] = [0.9167, 104.4700]
  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={true}
      className="w-full h-full min-h-[400px] rounded-xl"
      style={{ zIndex: 0, background: '#0f1729' }}
    >
      {/* Satellite/3D base tile */}
      <TileLayer
        attribution='&copy; Esri, Maxar, Earthstar Geographics'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
      {/* Place labels overlay */}
      <TileLayer
        attribution=""
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
        opacity={0.75}
      />

      <ProximityEffect />

      {data.map((stat) => {
        let lookupName = stat.name
        if (lookupName.toLowerCase() === 'sei jang') lookupName = 'Sei jang'
        const coords = KELURAHAN_COORDS[lookupName] || KELURAHAN_COORDS[stat.name] || center
        const icon = create3DIcon(stat.count, maxCount)

        return (
          <Marker key={stat.name} position={coords} icon={icon}>
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div style={{ textAlign: 'center', minWidth: 120 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 4px' }}>{stat.name}</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>{stat.count}</p>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>Pelaku Usaha</p>
              </div>
            </Tooltip>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
