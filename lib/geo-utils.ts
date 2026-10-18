const CODE_ALPHABET = '23456789CFGHJMPQRVWX'

/**
 * Encodes latitude and longitude into an Open Location Code (Plus Code).
 * Generates an 8+2 character code, e.g. 7J9M2826+JR.
 */
export function encodePlusCode(lat: number, lng: number): string {
  let vLat = Math.min(90, Math.max(-90, lat)) + 90
  let vLng = Math.min(180, Math.max(-180, lng)) + 180
  vLat = Math.min(vLat, 180 - 1e-10)
  vLng = Math.min(vLng, 360 - 1e-10)

  let code = ''
  let latVal = vLat
  let lngVal = vLng
  const resolutions = [20, 1, 0.05, 0.0025, 0.000125]

  for (let i = 0; i < 5; i++) {
    const res = resolutions[i]
    const latDigit = Math.floor(latVal / res)
    const lngDigit = Math.floor(lngVal / res)
    latVal -= latDigit * res
    lngVal -= lngDigit * res
    code += CODE_ALPHABET[latDigit] + CODE_ALPHABET[lngDigit]
    if (i === 3) code += '+'
  }

  return code
}

/**
 * Converts decimal coordinates to Degrees, Minutes, and Seconds (DMS) string.
 */
export function formatDms(
  lat: number,
  lng: number,
): { latDms: string; lngDms: string; text: string } {
  const formatCoord = (degDecimal: number, posDir: string, negDir: string) => {
    const dir = degDecimal >= 0 ? posDir : negDir
    const absVal = Math.abs(degDecimal)
    const d = Math.floor(absVal)
    const minVal = (absVal - d) * 60
    const m = Math.floor(minVal)
    const s = ((minVal - m) * 60).toFixed(1)
    const paddedM = String(m).padStart(2, '0')
    const paddedS = Number(s) < 10 ? `0${s}` : s
    return `${d}° ${paddedM}' ${paddedS}" ${dir}`
  }

  const latDms = formatCoord(lat, 'N', 'S')
  const lngDms = formatCoord(lng, 'E', 'W')
  return {
    latDms,
    lngDms,
    text: `${latDms}, ${lngDms}`,
  }
}

/**
 * Calculates a suggested departure time:
 * Target arrival minus estimated drive time minus a 30-minute safety buffer.
 */
export function calculateEstimatedDeparture(
  targetTimeStr: string | null | undefined,
  driveTimeSeconds: number,
): string | null {
  if (!targetTimeStr || !driveTimeSeconds || driveTimeSeconds <= 0) return null

  let targetHours = 9
  let targetMinutes = 0

  const timeMatch = targetTimeStr.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i)
  if (!timeMatch) return null

  let h = parseInt(timeMatch[1], 10)
  const m = parseInt(timeMatch[2], 10)
  const mer = timeMatch[3]?.toUpperCase()

  if (mer === 'PM' && h < 12) h += 12
  if (mer === 'AM' && h === 12) h = 0

  targetHours = h
  targetMinutes = m

  const driveMinutes = Math.round(driveTimeSeconds / 60)
  const totalSubMinutes = driveMinutes + 30

  const totalTargetMin = targetHours * 60 + targetMinutes
  let departureMin = totalTargetMin - totalSubMinutes

  if (departureMin < 0) {
    departureMin = (departureMin % 1440) + 1440
  }

  const depH = Math.floor(departureMin / 60) % 24
  const depM = departureMin % 60

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(depH)}:${pad(depM)}`
}

export interface RouteMilestone {
  name: string
  type: string
  note?: string
  distance_from_origin_km?: number
  distance_km_to_farm?: number
  lat?: number
  lng?: number
  isNearFarm?: boolean
}

/**
 * Merges turn-by-turn road steps and farm curated landmarks with strict filtering:
 * Only major towns / cities and highway changes (NH/NE/SH/Expressway), >= 3 km,
 * >= 10% spacing along the route, deduplicated highways, plus farm curated landmarks.
 * If fewer than 2 qualify, returns an empty array.
 */
export function mergeRouteMilestones(
  routeSteps: any[],
  farmLandmarks: any[],
  totalDistanceKm?: number,
): RouteMilestone[] {
  const result: RouteMilestone[] = []
  const totalKm = Number(totalDistanceKm) || 0
  const minSpacing = Math.max(4, totalKm * 0.1)

  // 1. Process route steps
  if (Array.isArray(routeSteps) && routeSteps.length > 0) {
    let accumulatedMeters = 0
    let lastRecordedKm = -minSpacing
    const seenHighwayNames = new Set<string>()

    for (const step of routeSteps) {
      accumulatedMeters += step.distance || 0
      const currentKm = accumulatedMeters / 1000

      if ((step.distance || 0) < 3000) continue

      const name = (step.name || '').trim()
      const ref = (step.ref || '').trim()
      const combined = `${ref} ${name}`.trim()
      if (!combined) continue

      if (
        /flyover|bridge|junction|roundabout|service road|crossroad|ramp|toll|chowk|signal/i.test(
          combined,
        )
      ) {
        continue
      }

      const isHighway = /NH|NE|SH|Expressway|National Highway|State Highway/i.test(combined)
      const hasNamedTown =
        name.length > 2 &&
        !/road|street|bypass|highway|expressway|corridor|route/i.test(name)

      if (!isHighway && !hasNamedTown) continue

      const highwayMatch = combined.match(/(?:NH|NE|SH|Expressway)[ -]?\d+/i)
      const highwayKey = highwayMatch ? highwayMatch[0].toUpperCase() : ''
      if (highwayKey && seenHighwayNames.has(highwayKey)) {
        continue
      }

      if (currentKm - lastRecordedKm < minSpacing) {
        continue
      }

      if (highwayKey) seenHighwayNames.add(highwayKey)
      lastRecordedKm = currentKm

      const label = ref ? (name ? `${ref} (${name})` : ref) : name
      const stepLocation = step.maneuver?.location
      const stepLng = Array.isArray(stepLocation) ? stepLocation[0] : undefined
      const stepLat = Array.isArray(stepLocation) ? stepLocation[1] : undefined

      result.push({
        name: label,
        type: isHighway ? 'highway_corridor' : 'town',
        note: `${currentKm.toFixed(1)} km from start`,
        distance_from_origin_km: Number(currentKm.toFixed(1)),
        distance_km_to_farm: totalKm ? Math.max(0, Number((totalKm - currentKm).toFixed(1))) : undefined,
        lat: stepLat,
        lng: stepLng,
      })

      if (result.length >= 6) break
    }
  }

  // 2. Process farm curated landmarks
  if (Array.isArray(farmLandmarks) && farmLandmarks.length > 0) {
    farmLandmarks.forEach((lm) => {
      const name = (lm.name || '').trim()
      if (!name) return

      const dist =
        typeof lm.distance_km_to_farm === 'number'
          ? lm.distance_km_to_farm
          : typeof lm.distance_km_to_farm === 'string' && lm.distance_km_to_farm.trim()
          ? Number(lm.distance_km_to_farm)
          : undefined

      result.push({
        name,
        type: lm.type || 'landmark',
        note: dist !== undefined ? `near farm (${dist} km to gate)` : 'near farm',
        distance_km_to_farm: dist,
        distance_from_origin_km:
          totalKm && dist !== undefined ? Math.max(0, Number((totalKm - dist).toFixed(1))) : undefined,
        isNearFarm: true,
      })
    })
  }

  // If fewer than 2 qualify, hide the section
  if (result.length < 2) return []

  // Sort by distance from start
  result.sort((a, b) => {
    if (a.distance_from_origin_km !== undefined && b.distance_from_origin_km !== undefined) {
      return a.distance_from_origin_km - b.distance_from_origin_km
    }
    return 0
  })

  return result
}
