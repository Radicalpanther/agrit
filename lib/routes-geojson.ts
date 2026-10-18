export interface GeoJsonFeature {
  type: 'Feature'
  properties: {
    name: string
    kind?: 'start' | 'turn' | 'landmark' | 'destination'
    description?: string
    distance_km?: number
  }
  geometry: {
    type: 'Point' | 'LineString'
    coordinates: number[] | number[][]
  }
}

export interface FarmRouteGeoJson {
  type: 'FeatureCollection'
  properties: {
    farmSlug: string
    startPointName: string
    destinationName: string
    totalDistanceKm: number
  }
  features: GeoJsonFeature[]
}

// Hand-made GeoJSON route for Kokan Roots Farmstay (Flagship Farm 1)
// Route from Ratnagiri Bus Stand (MSRTC) -> Mirya Phata -> Banyan Tree -> Kokan Roots Gate
export const kokanRootsRouteGeoJson: FarmRouteGeoJson = {
  type: 'FeatureCollection',
  properties: {
    farmSlug: 'kokan-roots-farmstay',
    startPointName: 'Ratnagiri MSRTC Bus Station',
    destinationName: 'Kokan Roots Farmstay Gate',
    totalDistanceKm: 4.8,
  },
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Turn-by-turn route to Kokan Roots',
        kind: 'turn',
        distance_km: 4.8,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [73.285, 17.0065],
          [73.291, 17.0058],
          [73.298, 17.005],
          [73.302, 17.0042],
          [73.305, 17.0035],
          [73.309, 17.0025],
          [73.312, 17.0016],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Ratnagiri MSRTC Bus Station',
        kind: 'start',
        description: 'Nearest transit hub. Auto-rickshaws and state buses available.',
      },
      geometry: {
        type: 'Point',
        coordinates: [73.285, 17.0065],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Mirya Phata Junction',
        kind: 'turn',
        description: 'Turn off NH66 onto the coastal village link road.',
      },
      geometry: {
        type: 'Point',
        coordinates: [73.298, 17.005],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Ancient Banyan Tree',
        kind: 'landmark',
        description: 'Key visual landmark. Stone shrine under the banyan canopy.',
      },
      geometry: {
        type: 'Point',
        coordinates: [73.309, 17.0025],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Kokan Roots Farmstay Gate',
        kind: 'destination',
        description: 'Wooden archway with hand-carved Alphonso orchard sign.',
      },
      geometry: {
        type: 'Point',
        coordinates: [73.312, 17.0016],
      },
    },
  ],
}

// Hand-made GeoJSON route for Spice Hills Homestay (Flagship Farm 2)
// Route from Ambalavayal Bus Stop -> Pepper Vine Archway -> Spice Hills Gate
export const spiceHillsRouteGeoJson: FarmRouteGeoJson = {
  type: 'FeatureCollection',
  properties: {
    farmSlug: 'spice-hills-homestay',
    startPointName: 'Ambalavayal Bus Stop',
    destinationName: 'Spice Hills Homestay Gate',
    totalDistanceKm: 3.6,
  },
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Turn-by-turn route to Spice Hills',
        kind: 'turn',
        distance_km: 3.6,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [76.105, 11.615],
          [76.098, 11.611],
          [76.092, 11.607],
          [76.086, 11.604],
          [76.082, 11.601],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Ambalavayal Bus Stop',
        kind: 'start',
        description: 'Nearest local bus stop on Sulthan Bathery road.',
      },
      geometry: {
        type: 'Point',
        coordinates: [76.105, 11.615],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Pepper Vine Archway',
        kind: 'landmark',
        description: 'Green archway flanked by silver oak and black pepper vines.',
      },
      geometry: {
        type: 'Point',
        coordinates: [76.086, 11.604],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Spice Hills Homestay Gate',
        kind: 'destination',
        description: 'Stone gate with tea estate & cardamom terrace entrance.',
      },
      geometry: {
        type: 'Point',
        coordinates: [76.082, 11.601],
      },
    },
  ],
}

export function getFarmGeoJsonRoute(
  slug: string,
  lat: number,
  lng: number,
): FarmRouteGeoJson | null {
  if (slug === 'kokan-roots-farmstay') {
    return kokanRootsRouteGeoJson
  }
  if (slug === 'spice-hills-homestay') {
    return spiceHillsRouteGeoJson
  }
  return null
}
