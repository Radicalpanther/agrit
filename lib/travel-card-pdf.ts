import { jsPDF } from 'jspdf'
import {
  encodePlusCode,
  formatDms,
  calculateEstimatedDeparture,
  generateQrDataUrl,
  mergeRouteMilestones,
} from '@/lib/geo-utils'
import { generateDualMaps } from '@/lib/pdf/map-capture'

export interface TravelCardPdfOptions {
  farm: {
    id?: string
    name: string
    slug: string
    place?: string
    region?: string
    lat: number
    lng: number
    host_name?: string
    host_phone?: string
    hostName?: string
    hostPhone?: string
    directions_steps?: string[]
    directionsSteps?: string[]
    landmark_note?: string | null
    landmarkNote?: string | null
    landmarks?: any[]
    nearby_services?: any
    nearbyServices?: any
    allows_day_visit?: boolean
    allowsDayVisit?: boolean
    day_visit_start?: string | null
    dayVisitStart?: string | null
    day_visit_end?: string | null
    dayVisitEnd?: string | null
    check_in_time?: string | null
    check_out_time?: string | null
    last_safe_arrival?: string | null
    host_contact_hours?: string | null
    rules?: string[]
    activities?: any[]
    crops?: any[]
    [key: string]: any
  }
  bookingId?: string
  guestName?: string
  checkInDate?: string
  visitType?: string
  guests?: number
  bookingStatus?: string
  reservations?: Array<{
    id?: string
    qty: number
    status?: string
    product?: { name: string; unit?: string; price_paise?: number }
  }>
  source?: {
    lat: number
    lng: number
    name: string
  } | null
  routeInfo?: {
    distanceKm: string | number
    durationText: string
    durationSeconds?: number
    isFallback?: boolean
    steps?: any[]
    geometry?: any
  } | null
}

/**
 * Redesigns and generates a complete, professional, 2-page A4 Travel Safety Card PDF.
 * Uses real selectable text, vector shapes, embedded QR codes, and clickable links.
 */
export async function generateTravelSafetyCardPdf(
  options: TravelCardPdfOptions,
): Promise<jsPDF> {
  const { farm, bookingId, guestName, checkInDate, visitType, guests, bookingStatus, source, routeInfo } =
    options

  const destLat = Number(farm.lat) || 17.0016
  const destLng = Number(farm.lng) || 73.312
  const farmName = farm.name || 'AgriTrails Farm Stay'
  const place = farm.place || 'Rural Haven'
  const region = farm.region || 'Maharashtra'
  const hostName = farm.host_name || farm.hostName || 'Rajesh Patil'
  const hostPhone = farm.host_phone || farm.hostPhone || '+919800000002'

  const directionsSteps: string[] =
    Array.isArray(farm.directions_steps) && farm.directions_steps.length > 0
      ? farm.directions_steps
      : Array.isArray(farm.directionsSteps) && farm.directionsSteps.length > 0
      ? farm.directionsSteps
      : ['Follow main road towards village', 'Look for AgriTrails wooden board at the gate']

  const landmarkNote = farm.landmark_note || farm.landmarkNote || null
  const landmarks = Array.isArray(farm.landmarks) ? farm.landmarks : []
  const nearbyServices = farm.nearby_services || farm.nearbyServices || {}

  // Coordinates
  const dms = formatDms(destLat, destLng)
  const plusCode = encodePlusCode(destLat, destLng)

  // Navigation URLs
  const directionsUrl = source
    ? `https://www.google.com/maps/dir/?api=1&origin=${source.lat},${source.lng}&destination=${destLat},${destLng}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`

  const destinationUrl = `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`
  const bookingRefShort = bookingId ? bookingId.slice(0, 8).toUpperCase() : 'CONFIRMED'

  // Pre-generate QR codes and Map images concurrently
  const [directionsQr, destinationQr, bookingQr, dualMaps] = await Promise.all([
    generateQrDataUrl(directionsUrl, { width: 180, margin: 1 }),
    generateQrDataUrl(destinationUrl, { width: 180, margin: 1 }),
    generateQrDataUrl(`https://agritrails.dev/farms/${farm.slug || ''}`, { width: 140, margin: 1 }),
    generateDualMaps({
      origin: source,
      destination: { lat: destLat, lng: destLng, name: farmName },
      routeGeometry: routeInfo?.geometry,
      distanceKm: routeInfo?.distanceKm,
      durationText: routeInfo?.durationText,
    }),
  ])

  // Initialize jsPDF A4 portrait
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: true,
  })

  const pageWidth = doc.internal.pageSize.getWidth() // 595.28 pt
  const margin = 42
  const contentWidth = pageWidth - margin * 2 // 511.28 pt

  const nowFormatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date())

  // ============================================================================
  // PAGE 1: HEADER, ARRIVAL SCHEDULE, NAVIGATION & MAPS
  // ============================================================================

  // 1. Top Green Header Band
  let y = 36
  doc.setFillColor(30, 58, 43) // Forest green #1e3a2b
  doc.rect(margin, y, contentWidth, 42, 'F')

  // AgriTrails Wordmark / Logo mark on Header
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('AGRITRAILS  TRAVEL & ROUTE MAP', margin + 14, y + 23)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(215, 235, 222)
  doc.text('OFFLINE RURAL ACCESS & EMERGENCY NAVIGATION - KEEP SAVED', margin + 14, y + 35)

  y += 50 // Advance with generous space to prevent any overlap

  // 2. Farm Name, Location & Verified Tag
  doc.setTextColor(23, 53, 43)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  const splitTitle = doc.splitTextToSize(farmName, contentWidth - 110)
  doc.text(splitTitle, margin, y + 4)

  // Verified Badge on Right
  const badgeX = pageWidth - margin - 105
  doc.setFillColor(232, 244, 235)
  doc.roundedRect(badgeX, y - 8, 105, 18, 3, 3, 'F')
  doc.setTextColor(30, 85, 55)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('VERIFIED BY AGRITRAILS', badgeX + 7, y + 4)

  y += splitTitle.length * 15 + 4

  // Location line
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(83, 104, 93)
  doc.text(`${place} · ${region}`, margin, y)
  y += 14

  // 3. Booking Summary Strip
  doc.setFillColor(248, 250, 246)
  doc.setDrawColor(220, 228, 218)
  doc.setLineWidth(0.8)
  doc.roundedRect(margin, y, contentWidth, 36, 4, 4, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 58, 43)
  doc.text('REF:', margin + 10, y + 14)
  doc.setFont('courier', 'bold')
  doc.setFontSize(9)
  doc.text(bookingRefShort, margin + 35, y + 14)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('GUEST:', margin + 115, y + 14)
  doc.setFont('helvetica', 'normal')
  doc.text(guestName || 'Registered Guest', margin + 155, y + 14)

  doc.setFont('helvetica', 'bold')
  doc.text('VISIT:', margin + 270, y + 14)
  doc.setFont('helvetica', 'normal')
  doc.text(visitType === 'day' ? 'Day Visit' : 'Overnight Stay', margin + 305, y + 14)

  doc.setFont('helvetica', 'bold')
  doc.text('STATUS:', margin + 395, y + 14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(bookingStatus === 'confirmed' ? 36 : 180, bookingStatus === 'confirmed' ? 120 : 100, 30)
  doc.text((bookingStatus || 'CONFIRMED').toUpperCase(), margin + 440, y + 14)

  // Second row of strip
  doc.setTextColor(83, 104, 93)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('CHECK-IN DATE:', margin + 10, y + 28)
  doc.setFont('helvetica', 'normal')
  doc.text(checkInDate || 'Scheduled', margin + 85, y + 28)

  doc.setFont('helvetica', 'bold')
  doc.text('GUESTS:', margin + 175, y + 28)
  doc.setFont('helvetica', 'normal')
  doc.text(`${guests || 2} Persons`, margin + 225, y + 28)

  if (bookingQr) {
    doc.addImage(bookingQr, 'PNG', pageWidth - margin - 32, y + 3, 30, 30)
  }

  y += 44

  // 4. Section 1: ARRIVAL & REPORTING SCHEDULE (Prominent Box)
  doc.setFillColor(251, 252, 249)
  doc.setDrawColor(30, 58, 43)
  doc.setLineWidth(1)
  doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'FD')

  doc.setFillColor(30, 58, 43)
  doc.rect(margin + 10, y + 8, 3, 11, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 58, 43)
  doc.text('ARRIVAL & REPORTING SCHEDULE', margin + 18, y + 17)

  // Times row
  const dayStart = farm.day_visit_start || farm.dayVisitStart || '09:00'
  const dayEnd = farm.day_visit_end || farm.dayVisitEnd || '17:00'
  const checkInTime = farm.check_in_time || '12:00 PM'
  const checkOutTime = farm.check_out_time || '10:00 AM'
  const lastArrival = farm.last_safe_arrival || '06:00 PM (before dark)'
  const hostHours = farm.host_contact_hours || '07:00 AM - 09:00 PM'

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(23, 53, 43)

  let scheduleText = ''
  if (visitType === 'day') {
    scheduleText = `Gate Report: ${dayStart}   ·   Day Visit Hours: ${dayStart} to ${dayEnd}   ·   Last Safe Arrival: ${lastArrival}`
  } else {
    scheduleText = `Overnight Check-in: ${checkInTime}   ·   Check-out: ${checkOutTime}   ·   Last Safe Arrival: ${lastArrival}`
  }
  doc.text(scheduleText, margin + 12, y + 32)

  // "Plan to leave by HH:MM" suggestion with 30 min buffer
  const driveSecs =
    routeInfo?.durationSeconds ||
    (routeInfo?.distanceKm ? Math.round((Number(routeInfo.distanceKm) / 45) * 3600) : 0)

  const targetArrival = visitType === 'day' ? dayStart : '13:00'
  const plannedDeparture = calculateEstimatedDeparture(targetArrival, driveSecs)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(83, 104, 93)
  const planNote = plannedDeparture
    ? `Suggestion: Plan to leave by ${plannedDeparture} (computed from ~${routeInfo?.durationText || 'drive time'} + 30m safety buffer, labeled estimate). Host contact hours: ${hostHours}.`
    : `Host contact hours: ${hostHours}. Drive with caution along rural single-lane roads.`
  doc.text(planNote, margin + 12, y + 46)

  y += 62

  // 5. Section 2: NAVIGATION & GPS COORDINATES
  doc.setFillColor(246, 248, 244)
  doc.setDrawColor(220, 228, 218)
  doc.setLineWidth(0.8)
  doc.roundedRect(margin, y, contentWidth, 78, 4, 4, 'FD')

  // GPS Coordinates Left Column
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 58, 43)
  doc.text('TARGET FARM GATE GPS COORDINATES:', margin + 10, y + 14)

  doc.setFont('courier', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(23, 53, 43)
  doc.text(`${destLat.toFixed(6)}° N, ${destLng.toFixed(6)}° E`, margin + 10, y + 29)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(83, 104, 93)
  doc.text(`DMS: ${dms.text}`, margin + 10, y + 41)
  doc.text(`Plus Code: ${plusCode}   (Save in vehicle GPS or Google Maps)`, margin + 10, y + 53)

  // Interactive Styled Buttons with real clickable links and printed QR codes
  const btnW = 120
  const btnH = 24

  // Button 1: Open in Google Maps
  const btn1X = margin + 250
  const btn1Y = y + 12
  doc.setFillColor(30, 58, 43)
  doc.roundedRect(btn1X, btn1Y, btnW, btnH, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('Open Google Maps', btn1X + 16, btn1Y + 15)
  doc.link(btn1X, btn1Y, btnW, btnH, { url: directionsUrl })

  // Short URL text
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(83, 104, 93)
  doc.text('maps.google.com/directions', btn1X + 8, btn1Y + 34)

  // QR 1 next to button
  if (directionsQr) {
    doc.addImage(directionsQr, 'PNG', btn1X + btnW + 8, y + 6, 42, 42)
    doc.link(btn1X + btnW + 8, y + 6, 42, 42, { url: directionsUrl })
  }

  // Button 2: Open Destination Pin
  const btn2X = margin + 250
  const btn2Y = y + 44
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(30, 58, 43)
  doc.setLineWidth(1)
  doc.roundedRect(btn2X, btn2Y, btnW, btnH, 3, 3, 'FD')
  doc.setTextColor(30, 58, 43)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('Open Destination Pin', btn2X + 13, btn2Y + 15)
  doc.link(btn2X, btn2Y, btnW, btnH, { url: destinationUrl })

  // Short URL text
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(83, 104, 93)
  doc.text('maps.google.com/search', btn2X + 15, btn2Y + 31)

  // QR 2 next to destination button
  if (destinationQr) {
    doc.addImage(destinationQr, 'PNG', btn2X + btnW + 8, y + 36, 40, 40)
    doc.link(btn2X + btnW + 8, y + 36, 40, 40, { url: destinationUrl })
  }

  y += 88

  // 6. Section 3: MAPS (Overview & Close-up Side by Side)
  const mapW = (contentWidth - 12) / 2 // ~249 pt
  const mapH = 145

  // Map 1: Overview
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 58, 43)
  doc.text(
    source
      ? `1. ROUTE OVERVIEW (${routeInfo?.distanceKm || '—'} km · ${routeInfo?.durationText || 'Direct'})`
      : '1. ROUTE OVERVIEW (APPROACH CORRIDOR)',
    margin,
    y,
  )

  if (dualMaps.overviewMapDataUrl) {
    doc.addImage(dualMaps.overviewMapDataUrl, 'JPEG', margin, y + 6, mapW, mapH, undefined, 'FAST')
    doc.setDrawColor(200, 210, 200)
    doc.setLineWidth(0.8)
    doc.rect(margin, y + 6, mapW, mapH, 'S')
  }

  // Map 2: Close-up (Last 5-10 km)
  doc.text('2. FARM GATE VICINITY (LAST 5-10 KM)', margin + mapW + 12, y)

  if (dualMaps.closeUpMapDataUrl) {
    doc.addImage(
      dualMaps.closeUpMapDataUrl,
      'JPEG',
      margin + mapW + 12,
      y + 6,
      mapW,
      mapH,
      undefined,
      'FAST',
    )
    doc.setDrawColor(200, 210, 200)
    doc.setLineWidth(0.8)
    doc.rect(margin + mapW + 12, y + 6, mapW, mapH, 'S')
  }

  y += mapH + 18

  // Small attribution caption
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(115, 130, 120)
  doc.text(
    'Map tiles © OpenStreetMap contributors & CARTO · Clean vector route displayed if offline. Save offline maps in advance.',
    margin,
    y,
  )

  // Page 1 Footer Rule and Text
  renderFooter(doc, pageWidth, margin, contentWidth, bookingRefShort, nowFormatted, 1, 2)

  // ============================================================================
  // PAGE 2: LANDMARKS, ACTIVITIES & EXPERIENCES, SAFETY PROTOCOL
  // ============================================================================
  doc.addPage('a4', 'portrait')

  let p2Y = 36

  // Page 2 Compact Header Band
  doc.setFillColor(30, 58, 43)
  doc.rect(margin, p2Y, contentWidth, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(`AGRITRAILS  ·  ${farmName.toUpperCase()}  ·  REF: ${bookingRefShort}`, margin + 12, p2Y + 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(215, 235, 222)
  doc.text('PAGE 2: ROUTE LANDMARKS, EXPERIENCES & SAFETY', pageWidth - margin - 230, p2Y + 16)

  p2Y += 38

  // 1. Major Landmarks & Turn Milestones
  doc.setFillColor(30, 58, 43)
  doc.rect(margin, p2Y, 3, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 58, 43)
  doc.text('MAJOR LANDMARKS & ROUTE MILESTONES', margin + 8, p2Y + 9)
  p2Y += 15

  const milestones = mergeRouteMilestones(
    routeInfo?.steps || [],
    landmarks,
    typeof routeInfo?.distanceKm === 'number'
      ? routeInfo.distanceKm
      : parseFloat(String(routeInfo?.distanceKm || '0')),
  )

  if (milestones.length > 0) {
    const colW = (contentWidth - 10) / 2
    milestones.slice(0, 6).forEach((ms, idx) => {
      const col = idx % 2
      const row = Math.floor(idx / 2)
      const msX = margin + col * (colW + 10)
      const msY = p2Y + row * 22

      doc.setFillColor(248, 250, 246)
      doc.setDrawColor(225, 232, 222)
      doc.setLineWidth(0.6)
      doc.roundedRect(msX, msY, colW, 19, 2, 2, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(30, 58, 43)
      const distInfo =
        ms.distance_km_to_farm !== undefined
          ? `${ms.distance_km_to_farm} km to farm`
          : ms.distance_from_origin_km !== undefined
          ? `${ms.distance_from_origin_km} km`
          : ''
      const label = `${idx + 1}. ${ms.name}`
      doc.text(doc.splitTextToSize(label, colW - 65)[0], msX + 6, msY + 12)

      if (distInfo) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(83, 104, 93)
        doc.text(distInfo, msX + colW - 55, msY + 12)
      }
    })
    p2Y += Math.ceil(Math.min(milestones.length, 6) / 2) * 22 + 4
  }

  // Numbered Turn-by-Turn Landmark Directions
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(23, 53, 43)
  doc.text('Landmark-based Directions:', margin, p2Y)
  p2Y += 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(50, 50, 50)
  directionsSteps.slice(0, 4).forEach((step, idx) => {
    const stepText = `${idx + 1}. ${step}`
    const wrapped = doc.splitTextToSize(stepText, contentWidth - 10)
    doc.text(wrapped, margin + 4, p2Y)
    p2Y += wrapped.length * 10 + 2
  })

  // Key Visual Landmark Callout Box
  if (landmarkNote) {
    p2Y += 2
    doc.setFillColor(254, 252, 246)
    doc.setDrawColor(200, 150, 60) // Gold accent
    doc.setLineWidth(1)
    doc.roundedRect(margin, p2Y, contentWidth, 22, 3, 3, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(150, 95, 20)
    doc.text('KEY VISUAL LANDMARK:', margin + 10, p2Y + 14)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 40)
    doc.text(landmarkNote, margin + 130, p2Y + 14)
    p2Y += 28
  } else {
    p2Y += 6
  }

  // Last Services Before Farm Strip
  doc.setFillColor(245, 248, 243)
  doc.setDrawColor(220, 228, 218)
  doc.setLineWidth(0.6)
  doc.roundedRect(margin, p2Y, contentWidth, 24, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(30, 58, 43)
  doc.text('LAST SERVICES BEFORE FARM:', margin + 8, p2Y + 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(70, 80, 75)

  const fuelText = nearbyServices.fuel?.name
    ? `Fuel: ${nearbyServices.fuel.name} (${nearbyServices.fuel.distance_km || 3}km)`
    : 'Fuel: Nearest town'
  const atmText = nearbyServices.atm?.name
    ? `ATM: ${nearbyServices.atm.name} (${nearbyServices.atm.distance_km || 3}km)`
    : 'ATM: Nearest town'
  const pharmText = nearbyServices.pharmacy?.name
    ? `Medical: ${nearbyServices.pharmacy.name} (${nearbyServices.pharmacy.distance_km || 3}km)`
    : 'Pharmacy: In village'
  const grocText = nearbyServices.grocery?.name
    ? `Grocery: ${nearbyServices.grocery.name} (${nearbyServices.grocery.distance_km || 2}km)`
    : 'Grocery: Farm gate'

  doc.text(`${fuelText}  ·  ${atmText}  ·  ${pharmText}  ·  ${grocText}`, margin + 145, p2Y + 15)
  p2Y += 34

  // 2. Section 5: ACTIVITIES AND EXPERIENCES
  doc.setFillColor(30, 58, 43)
  doc.rect(margin, p2Y, 3, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 58, 43)
  doc.text('ON-FARM ACTIVITIES & SEASONAL EXPERIENCES', margin + 8, p2Y + 9)
  p2Y += 15

  const farmActivities = Array.isArray(farm.activities) && farm.activities.length > 0
    ? farm.activities
    : [
        { name: 'Traditional Farm Walk', duration_min: 60, sort_hint: 'morning' },
        { name: 'Organic Hearth Cooking Tasting', duration_min: 45, sort_hint: 'afternoon' },
        { name: 'Cattle & Shed Interaction', duration_min: 45, sort_hint: 'morning' },
        { name: 'Sunset Valley / Orchard Stroll', duration_min: 60, sort_hint: 'evening' },
      ]

  const actColW = (contentWidth - 10) / 2
  farmActivities.slice(0, 4).forEach((act: any, idx: number) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const ax = margin + col * (actColW + 10)
    const ay = p2Y + row * 24

    doc.setFillColor(250, 252, 248)
    doc.setDrawColor(225, 232, 222)
    doc.setLineWidth(0.6)
    doc.roundedRect(ax, ay, actColW, 21, 2, 2, 'FD')

    // Small icon circle
    doc.setFillColor(30, 85, 55)
    doc.circle(ax + 10, ay + 10.5, 3.5, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(23, 53, 43)
    doc.text(doc.splitTextToSize(act.name, actColW - 75)[0], ax + 18, ay + 13)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(83, 104, 93)
    const duration = act.duration_min ? `${act.duration_min}m` : '45m'
    const bestTime = act.sort_hint ? ` · ${act.sort_hint}` : ''
    doc.text(`${duration}${bestTime} · Included`, ax + actColW - 65, ay + 13)
  })

  p2Y += Math.ceil(Math.min(farmActivities.length, 4) / 2) * 24 + 4

  // Reserved Products basket note if exists
  if (Array.isArray(options.reservations) && options.reservations.length > 0) {
    const resSummary = options.reservations
      .map((r) => `${r.product?.name || 'Produce'} (Qty: ${r.qty})`)
      .join(', ')

    doc.setFillColor(242, 247, 240)
    doc.setDrawColor(180, 210, 175)
    doc.setLineWidth(0.8)
    doc.roundedRect(margin, p2Y, contentWidth, 20, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(30, 85, 55)
    doc.text('BOOKED PRODUCE RESERVATION:', margin + 8, p2Y + 13)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 40)
    doc.text(doc.splitTextToSize(resSummary, contentWidth - 165)[0], margin + 155, p2Y + 13)
    p2Y += 25
  }

  // Crop & harvest season line
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(70, 95, 80)
  doc.text('BEST SEASON & HARVEST:', margin, p2Y + 2)
  doc.setFont('helvetica', 'normal')
  doc.text('Peak rural visits October to May. Fresh seasonal crops harvested morning and evening.', margin + 120, p2Y + 2)

  p2Y += 16

  // 3. Section 6: SAFETY AND PRACTICAL PROTOCOL
  doc.setFillColor(30, 58, 43)
  doc.rect(margin, p2Y, 3, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 58, 43)
  doc.text('SAFETY, HOST CONTACT & EMERGENCY PROTOCOL', margin + 8, p2Y + 9)
  p2Y += 14

  // Emergency Numbers Table
  const hospName = nearbyServices.hospital?.name || 'District Civil Hospital'
  const hospDist = nearbyServices.hospital?.distance_km ? `${nearbyServices.hospital.distance_km} km` : '7 km'
  const hospPhone = nearbyServices.hospital?.phone || '108'

  const polName = nearbyServices.police?.name || 'Taluka Police Station'
  const polDist = nearbyServices.police?.distance_km ? `${nearbyServices.police.distance_km} km` : '5 km'
  const polPhone = nearbyServices.police?.phone || '100'

  const emgW = (contentWidth - 15) / 4
  const emgItems = [
    { label: 'All-India Emergency', num: 'Dial 112', sub: 'Police, Fire, Ambulance' },
    { label: 'Medical Ambulance', num: 'Dial 108', sub: 'State emergency dispatch' },
    { label: hospName.slice(0, 18), num: hospPhone, sub: `${hospDist} · Local Hospital` },
    { label: polName.slice(0, 18), num: polPhone, sub: `${polDist} · Police Station` },
  ]

  emgItems.forEach((emg, i) => {
    const ex = margin + i * (emgW + 5)
    doc.setFillColor(254, 246, 246)
    doc.setDrawColor(240, 205, 205)
    doc.setLineWidth(0.6)
    doc.roundedRect(ex, p2Y, emgW, 30, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(180, 40, 40)
    doc.text(emg.label, ex + 6, p2Y + 10)

    doc.setFont('courier', 'bold')
    doc.setFontSize(9.5)
    doc.text(emg.num, ex + 6, p2Y + 21)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(120, 60, 60)
    doc.text(emg.sub, ex + 6, p2Y + 28)
  })

  p2Y += 36

  // Local Host Contact Box with Clickable Links
  doc.setFillColor(242, 248, 240)
  doc.setDrawColor(30, 85, 55)
  doc.setLineWidth(0.8)
  doc.roundedRect(margin, p2Y, contentWidth, 32, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 58, 43)
  doc.text(`Host: ${hostName}`, margin + 10, p2Y + 14)

  doc.setTextColor(30, 85, 55)
  doc.text(`Phone: ${hostPhone}`, margin + 140, p2Y + 14)
  doc.link(margin + 135, p2Y + 4, 110, 16, { url: `tel:${hostPhone}` })

  const waUrl = `https://wa.me/${hostPhone.replace(/[^0-9]/g, '')}`
  doc.text('WhatsApp: Tap to message', margin + 270, p2Y + 14)
  doc.link(margin + 265, p2Y + 4, 120, 16, { url: waUrl })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(83, 104, 93)
  doc.text('Cellular voice and SMS work even when mobile data drops along rural roads.', margin + 10, p2Y + 26)

  p2Y += 38

  // Offline Tips & "What to Carry" Checklist
  doc.setFillColor(252, 253, 250)
  doc.setDrawColor(220, 228, 218)
  doc.setLineWidth(0.6)
  doc.roundedRect(margin, p2Y, contentWidth, 48, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 58, 43)
  doc.text('OFFLINE TIPS & ESSENTIAL PREPARATION', margin + 10, p2Y + 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(60, 70, 65)
  doc.text(
    '1. Tap "Download Offline Map" in Google Maps for this district before you leave home.',
    margin + 10,
    p2Y + 23,
  )
  doc.text(
    '2. Carry adequate cash (rural village shops and roadside stalls do not accept UPI or cards during power cuts).',
    margin + 10,
    p2Y + 33,
  )
  doc.text(
    '3. What to carry: sturdy walking shoes, hat/umbrella, reusable water bottle, mosquito repellent, and a power bank.',
    margin + 10,
    p2Y + 43,
  )

  p2Y += 54

  // Farm Rules & SMS Template Box
  doc.setFillColor(248, 250, 246)
  doc.setDrawColor(220, 228, 218)
  doc.setLineWidth(0.6)
  doc.roundedRect(margin, p2Y, contentWidth, 42, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 58, 43)
  doc.text('FARM RULES & LIVE COORDINATES SMS TEMPLATE', margin + 10, p2Y + 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(70, 80, 75)
  doc.text(
    'Rules: Respect active agricultural rows. Silence after 10 PM. Strictly no single-use plastic or littering.',
    margin + 10,
    p2Y + 23,
  )

  const smsText = `SMS text: "Heading to ${farmName} (Booking ${bookingRefShort}) at GPS ${destLat.toFixed(4)}, ${destLng.toFixed(4)}. Host: ${hostPhone}"`
  doc.setFont('courier', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(30, 58, 43)
  doc.text(smsText, margin + 10, p2Y + 34)

  // Page 2 Footer
  renderFooter(doc, pageWidth, margin, contentWidth, bookingRefShort, nowFormatted, 2, 2)

  return doc
}

/**
 * Standard Footer on every page
 */
function renderFooter(
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  contentWidth: number,
  bookingRef: string,
  dateFormatted: string,
  pageNumber: number,
  totalPages: number,
) {
  const footerY = 810

  // Thin green rule
  doc.setDrawColor(30, 85, 55)
  doc.setLineWidth(0.8)
  doc.line(margin, footerY, margin + contentWidth, footerY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 58, 43)
  doc.text('agritrails', margin, footerY + 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 115, 105)
  doc.text(`Generated on ${dateFormatted} (Asia/Kolkata)`, margin + 55, footerY + 14)
  doc.text(`Booking Ref: ${bookingRef}`, margin + 280, footerY + 14)
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin - 75, footerY + 14)
  doc.text('https://agritrails.dev', pageWidth - margin - 75, footerY + 24)
}

/**
 * Direct browser download trigger
 */
export async function downloadTravelSafetyCardPdf(
  options: TravelCardPdfOptions,
): Promise<void> {
  const doc = await generateTravelSafetyCardPdf(options)
  const slug = options.farm.slug || 'farm'
  doc.save(`AgriTrails-${slug}-travel-map.pdf`)
}
