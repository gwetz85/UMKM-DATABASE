// Approximate GeoJSON for 4 Kecamatan in Tanjungpinang
// Coordinates are [longitude, latitude] — GeoJSON spec
// TPI Kota & Bukit Bestari are MultiPolygon (mainland + island)

export const KECAMATAN_GEOJSON = {
  type: "FeatureCollection",
  features: [
    // ── 1. Tanjungpinang Kota (mainland + Penyengat island) ────────────────
    {
      type: "Feature",
      properties: { name: "Tanjungpinang Kota" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          // Mainland — northern coastal strip
          [[
            [104.408, 0.907], [104.432, 0.906], [104.455, 0.905],
            [104.478, 0.905], [104.492, 0.907],
            [104.498, 0.920], [104.497, 0.934],
            [104.484, 0.944], [104.465, 0.952],
            [104.447, 0.962], [104.428, 0.963],
            [104.412, 0.956], [104.408, 0.944],
            [104.408, 0.928], [104.408, 0.907]
          ]],
          // Penyengat island
          [[
            [104.388, 0.920], [104.408, 0.917],
            [104.428, 0.918], [104.432, 0.930],
            [104.424, 0.940], [104.408, 0.943],
            [104.392, 0.938], [104.385, 0.928],
            [104.388, 0.920]
          ]]
        ]
      }
    },
    // ── 2. Tanjungpinang Barat (mainland strip, center-west) ────────────────
    {
      type: "Feature",
      properties: { name: "Tanjungpinang Barat" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [104.396, 0.892], [104.424, 0.892], [104.450, 0.891],
          [104.476, 0.891], [104.492, 0.892],
          [104.498, 0.900], [104.498, 0.907],
          [104.492, 0.907], [104.408, 0.907],
          [104.400, 0.907], [104.396, 0.900],
          [104.396, 0.892]
        ]]
      }
    },
    // ── 3. Tanjungpinang Timur (large eastern area) ─────────────────────────
    {
      type: "Feature",
      properties: { name: "Tanjungpinang Timur" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [104.492, 0.874], [104.518, 0.872], [104.542, 0.872],
          [104.560, 0.876], [104.568, 0.892],
          [104.570, 0.910], [104.568, 0.928],
          [104.562, 0.945], [104.550, 0.960],
          [104.530, 0.966], [104.510, 0.968],
          [104.492, 0.963],
          [104.492, 0.944], [104.492, 0.920],
          [104.492, 0.907], [104.494, 0.892],
          [104.492, 0.874]
        ]]
      }
    },
    // ── 4. Bukit Bestari (southern mainland + Dompak island) ────────────────
    {
      type: "Feature",
      properties: { name: "Bukit Bestari" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          // Mainland southern strip
          [[
            [104.408, 0.857], [104.435, 0.856], [104.460, 0.856],
            [104.484, 0.857], [104.496, 0.862],
            [104.498, 0.876], [104.496, 0.892],
            [104.492, 0.892], [104.450, 0.892],
            [104.410, 0.892], [104.396, 0.892],
            [104.396, 0.876], [104.396, 0.862],
            [104.408, 0.857]
          ]],
          // Dompak island
          [[
            [104.432, 0.848], [104.458, 0.846],
            [104.482, 0.847], [104.502, 0.853],
            [104.508, 0.865], [104.504, 0.876],
            [104.490, 0.882], [104.470, 0.882],
            [104.448, 0.878], [104.432, 0.870],
            [104.428, 0.858], [104.432, 0.848]
          ]]
        ]
      }
    }
  ]
}

// Kelurahan belonging to each kecamatan
export const KECAMATAN_KELURAHAN: Record<string, string[]> = {
  "Tanjungpinang Kota":  ["Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat"],
  "Tanjungpinang Barat": ["Tanjungpinang Barat", "Kemboja", "Kampung Baru", "Bukit Cermin"],
  "Tanjungpinang Timur": ["Melayu Kota Piring", "Kampung Bulang", "Batu IX", "Pinang Kencana", "Air Raja"],
  "Bukit Bestari":       ["Dompak", "Sei jang", "Tanjung Unggat", "Tanjung Ayun Sakti", "Tanjungpinang Timur"],
}
