import QRCode from 'qrcode'

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

  // Parse target time string (e.g. "09:00", "09:00:00", "12:00 PM", "1:30 PM")
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

  // Drive time minutes + 30 min buffer
  const driveMinutes = Math.round(driveTimeSeconds / 60)
  const totalSubMinutes = driveMinutes + 30

  let totalTargetMin = targetHours * 60 + targetMinutes
  let departureMin = totalTargetMin - totalSubMinutes

  // Handle midnight roll-over if needed
  if (departureMin < 0) {
    departureMin = (departureMin % 1440) + 1440
  }

  const depH = Math.floor(departureMin / 60) % 24
  const depM = departureMin % 60

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(depH)}:${pad(depM)}`
}

/**
 * Client-side QR code generator as PNG Data URL.
 */
export async function generateQrDataUrl(
  text: string,
  options?: { margin?: number; width?: number; darkColor?: string },
): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: options?.margin ?? 1,
      width: options?.width ?? 240,
      color: {
        dark: options?.darkColor ?? '#17352b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
  } catch (err) {
    console.error('Failed to generate QR code:', err)
    return ''
  }
}

/**
 * Merges turn-by-turn road steps and farm curated landmarks into 4 to 8 milestones.
 */
export function mergeRouteMilestones(
  routeSteps: any[],
  farmLandmarks: any[],
  totalDistanceKm?: number,
): Array<{
  name: string
  type: string
  note?: string
  distance_from_origin_km?: number
  distance_km_to_farm?: number
}> {
  const result: Array<{
    name: string
    type: string
    note?: string
    distance_from_origin_km?: number
    distance_km_to_farm?: number
  }> = []

  const totalKm = Number(totalDistanceKm) || 0

  // 1. Process farm curated landmarks
  if (Array.isArray(farmLandmarks) && farmLandmarks.length > 0) {
    farmLandmarks.forEach((lm) => {
      const distToFarm =
        typeof lm.distance_km_to_farm === 'number'
          ? lm.distance_km_to_farm
          : undefined
      const distFromOrigin =
        totalKm && distToFarm !== undefined ? Math.max(0, totalKm - distToFarm) : undefined

      result.push({
        name: lm.name,
        type: lm.type || 'town',
        note: lm.note || '',
        distance_km_to_farm: distToFarm,
        distance_from_origin_km: distFromOrigin ? Number(distFromOrigin.toFixed(1)) : undefined,
      })
    })
  }

  // 2. Extract highway refs or turn towns from route steps if available
  if (Array.isArray(routeSteps) && routeSteps.length > 0) {
    let accumulatedDistMeters = 0
    routeSteps.forEach((step) => {
      accumulatedDistMeters += step.distance || 0
      const ref = step.ref || ''
      const name = step.name || ''
      if ((ref || name) && !result.some((r) => r.name.toLowerCase().includes(name.toLowerCase()))) {
        const isHighway = /NH|SH|Expressway|National Highway|State Highway/i.test(ref || name)
        if (isHighway || step.maneuver?.type === 'turn') {
          const stepKm = Number((accumulatedDistMeters / 1000).toFixed(1))
          const distToFarm = totalKm ? Math.max(0, Number((totalKm - stepKm).toFixed(1))) : undefined
          result.push({
            name: ref ? `${ref} (${name || 'Highway Corridor'})` : name,
            type: isHighway ? 'highway_junction' : 'town',
            note: step.maneuver?.instruction || 'Follow road signs',
            distance_from_origin_km: stepKm,
            distance_km_to_farm: distToFarm,
          })
        }
      }
    })
  }

  // Sort by distance from origin (or reverse distance to farm)
  result.sort((a, b) => {
    if (a.distance_from_origin_km !== undefined && b.distance_from_origin_km !== undefined) {
      return a.distance_from_origin_km - b.distance_from_origin_km
    }
    if (a.distance_km_to_farm !== undefined && b.distance_km_to_farm !== undefined) {
      return b.distance_km_to_farm - a.distance_km_to_farm
    }
    return 0
  })

  // Return a clean list of 4 to 8 milestones
  return result.slice(0, 8)
}
