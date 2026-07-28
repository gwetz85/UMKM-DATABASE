"use client"
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import 'leaflet-defaulticon-compatibility'
import { MapContainer, TileLayer, Tooltip, CircleMarker } from 'react-leaflet'
import { KelurahanStat } from './monitoring-dialog'

const KELURAHAN_COORDS: Record<string, [number, number]> = {
  "Tanjungpinang Kota": [0.9267, 104.4440],
  "Senggarang": [0.9500, 104.4500],
  "Kampung Bugis": [0.9350, 104.4400],
  "Penyengat": [0.9280, 104.4160],
  "Tanjungpinang Barat": [0.9167, 104.4400],
  "Kemboja": [0.9180, 104.4450],
  "Bukit Cermin": [0.9250, 104.4550],
  "Kampung Baru": [0.9200, 104.4550],
  "Batu IX": [0.9250, 104.5000],
  "Kampung Bulang": [0.9150, 104.4800],
  "Melayu Kota Piring": [0.9200, 104.4800],
  "Pinang Kencana": [0.9400, 104.5300],
  "Air Raja": [0.9300, 104.5200],
  "Sei jang": [0.9050, 104.4650], 
  "Dompak": [0.8800, 104.4700],
  "Tanjung Unggat": [0.9080, 104.4700],
  "Tanjungpinang Timur": [0.9200, 104.4650],
  "Tanjung Ayun Sakti": [0.9120, 104.4600]
}

export default function MapRenderer({ data }: { data: KelurahanStat[] }) {
  // Center of Tanjungpinang
  const center: [number, number] = [0.9167, 104.4700]

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom={true} className="w-full h-full min-h-[400px] rounded-xl z-0" style={{ zIndex: 0 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {data.map((stat) => {
        // Fallback to center if not found, but we should find them all
        let lookupName = stat.name;
        // Normalize "Sei Jang" vs "Sei jang"
        if (lookupName.toLowerCase() === "sei jang") lookupName = "Sei jang";
        const coords = KELURAHAN_COORDS[lookupName] || KELURAHAN_COORDS[stat.name] || center
        // Scale circle based on count (min 10, max 40)
        const radius = Math.max(10, Math.min(40, 10 + (stat.count / 3)))
        
        return (
          <CircleMarker 
            key={stat.name} 
            center={coords} 
            pathOptions={{ color: 'hsl(var(--primary))', fillColor: 'hsl(var(--primary))', fillOpacity: 0.7, weight: 2 }}
            radius={radius}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
              <div className="text-center p-1">
                <p className="font-bold uppercase text-[10px] text-slate-500">{stat.name}</p>
                <p className="font-black text-primary text-sm">{stat.count} Pelaku Usaha</p>
              </div>
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
