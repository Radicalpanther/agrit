import { jsPDF } from 'jspdf'
import { NOTO_SANS_BASE64 } from '@/lib/pdf/noto-font'
import { formatDms } from '@/lib/geo-utils'

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
    landmarks?: Array<{
      name: string
      type?: string
      note?: string
      distance_km_to_farm?: number | string
      [key: string]: any
    }>
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
    activities?: Array<{
      id?: string
      name: string
      duration_min?: number
      sort_hint?: string
      kind?: string
      is_paid?: boolean
      price_paise?: number
      [key: string]: any
    }>
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
  mapImage?: {
    dataUrl: string
    width: number
    height: number
  } | null
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

export function format12HourTime(timeStr?: string | null): string {
  if (!timeStr) return ''
  const clean = timeStr.trim()
  const m = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM))?$/i)
  if (!m) return clean
  let h = parseInt(m[1], 10)
  const min = m[2]
  const ampm = m[3]?.toUpperCase()
  if (ampm) {
    return `${h}:${min} ${ampm}`
  }
  const period = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${min} ${period}`
}

function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM))?$/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const ampm = m[3]?.toUpperCase()
  if (ampm === 'PM' && h < 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return h * 60 + min
}

export function formatIstDate(dateStr?: string | null): string {
  if (!dateStr) return 'Scheduled'
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00+05:30`)
    if (isNaN(d.getTime())) return dateStr
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch {
    return dateStr
  }
}

export function computeSuggestedDeparture(
  checkInDateStr?: string | null,
  gateReportTimeStr?: string | null,
  driveTimeSeconds?: number | null,
): string | null {
  if (!checkInDateStr || !gateReportTimeStr || !driveTimeSeconds || driveTimeSeconds <= 0) {
    return null
  }

  const cleanTime = gateReportTimeStr.trim()
  const m = cleanTime.match(/^(\d{1,2}):(\d{2})/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (/PM/i.test(cleanTime) && h < 12) h += 12
  if (/AM/i.test(cleanTime) && h === 12) h = 0

  const dateMatch = checkInDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  let visitDate: Date
  if (dateMatch) {
    const yr = parseInt(dateMatch[1], 10)
    const mo = parseInt(dateMatch[2], 10) - 1
    const dy = parseInt(dateMatch[3], 10)
    visitDate = new Date(Date.UTC(yr, mo, dy, h - 5, min - 30))
  } else {
    visitDate = new Date(
      `${checkInDateStr}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00+05:30`,
    )
  }

  if (isNaN(visitDate.getTime())) return null

  // Subtract drive time + 60 min safety buffer
  const totalSubMs = (driveTimeSeconds + 3600) * 1000
  const departureDate = new Date(visitDate.getTime() - totalSubMs)

  // Omit line if departure moment is already in the past
  if (departureDate.getTime() < Date.now()) {
    return null
  }

  const timeStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(departureDate)

  const dayStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(departureDate)

  return `Latest suggested departure: ${timeStr}, ${dayStr} (estimate)`
}

// ============================================================================
// MAJOR LANDMARKS FILTER
// ============================================================================

export interface MajorLandmark {
  name: string
  info: string
  shortLabel: string
  lat?: number
  lng?: number
  isNearFarm?: boolean
}

export function filterMajorLandmarks(
  routeSteps: any[],
  farmLandmarks: any[],
  totalDistanceKm: number,
): MajorLandmark[] {
  const result: MajorLandmark[] = []
  const totalKm = Number(totalDistanceKm) || 0
  const minSpacing = Math.max(4, totalKm * 0.1) // 10% spacing rule

  // 1. Filter route steps hard
  if (Array.isArray(routeSteps) && routeSteps.length > 0) {
    let accumulatedMeters = 0
    let lastRecordedKm = -minSpacing
    const seenHighwayNames = new Set<string>()

    for (const step of routeSteps) {
      accumulatedMeters += step.distance || 0
      const currentKm = accumulatedMeters / 1000

      // Ignore steps shorter than 3 km
      if ((step.distance || 0) < 3000) continue

      const name = (step.name || '').trim()
      const ref = (step.ref || '').trim()
      const combined = `${ref} ${name}`.trim()

      if (!combined) continue

      // Ignore flyovers, bridges, junctions, roundabouts, local roads, ramps
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

      // Deduplicate highway names
      const highwayMatch = combined.match(/(?:NH|NE|SH|Expressway)[ -]?\d+/i)
      const highwayKey = highwayMatch ? highwayMatch[0].toUpperCase() : ''
      if (highwayKey && seenHighwayNames.has(highwayKey)) {
        continue
      }

      // Enforce minimum spacing along route (10% of total distance)
      if (currentKm - lastRecordedKm < minSpacing) {
        continue
      }

      if (highwayKey) seenHighwayNames.add(highwayKey)
      lastRecordedKm = currentKm

      const label = ref ? (name ? `${ref} (${name})` : ref) : name
      const shortLabel = ref || (name.length > 14 ? name.slice(0, 12) : name)
      const stepLocation = step.maneuver?.location
      const stepLng = Array.isArray(stepLocation) ? stepLocation[0] : undefined
      const stepLat = Array.isArray(stepLocation) ? stepLocation[1] : undefined

      result.push({
        name: label,
        shortLabel,
        info: `${currentKm.toFixed(1)} km from start`,
        lat: stepLat,
        lng: stepLng,
      })

      if (result.length >= 6) break
    }
  }

  // 2. Merge farm curated landmarks (marked 'near farm' with distance to farm)
  if (Array.isArray(farmLandmarks) && farmLandmarks.length > 0) {
    farmLandmarks.forEach((lm) => {
      const name = (lm.name || '').trim()
      if (!name) return

      const dist =
        typeof lm.distance_km_to_farm === 'number'
          ? `${lm.distance_km_to_farm} km`
          : lm.distance_km_to_farm
          ? `${lm.distance_km_to_farm} km`
          : ''

      const infoText = dist ? `near farm (${dist} to gate)` : 'near farm'

      result.push({
        name,
        shortLabel: name.length > 14 ? `${name.slice(0, 12)}…` : name,
        info: infoText,
        isNearFarm: true,
      })
    })
  }

  // If fewer than 2 qualify, hide section
  if (result.length < 2) return []

  return result
}

// ============================================================================
// CURSOR-BASED FLOW LAYOUT ENGINE
// ============================================================================

class PdfFlowDoc {
  doc: jsPDF
  margin = 15 // mm
  contentWidth = 180 // mm (210 - 30)
  pageHeight = 297 // mm
  maxY = 278 // mm (footer area starts at 283mm)
  y = 15 // mm cursor

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    try {
      this.doc.addFileToVFS('NotoSans.ttf', NOTO_SANS_BASE64)
      this.doc.addFont('NotoSans.ttf', 'NotoSans', 'normal')
      this.doc.addFont('NotoSans.ttf', 'NotoSans', 'bold')
      this.doc.setFont('NotoSans', 'normal')
    } catch (e) {
      console.warn('Failed to register NotoSans, using helvetica fallback', e)
      this.doc.setFont('helvetica', 'normal')
    }
  }

  ensureSpace(neededHeight: number) {
    if (this.y + neededHeight > this.maxY) {
      this.doc.addPage()
      this.y = this.margin
    }
  }

  sectionTitle(title: string, minFollowupHeight = 25) {
    this.ensureSpace(3.2 + 4.6 + minFollowupHeight)
    if (this.y > this.margin) {
      this.y += 3.2 // Spacing before section
    }
    this.doc.setFont('NotoSans', 'bold')
    this.doc.setFontSize(10.5)
    this.doc.setTextColor(20, 50, 35) // #143223
    this.doc.text(title.toUpperCase(), this.margin, this.y + 3.2)
    this.y += 4.6
  }

  paragraph(
    text: string,
    options?: {
      fontSize?: number
      bold?: boolean
      color?: [number, number, number]
      lineHeight?: number
      hangingIndent?: number
      spacingAfter?: number
    },
  ) {
    if (!text || !text.trim()) return
    const fontSize = options?.fontSize ?? 9
    const bold = options?.bold ?? false
    const color = options?.color ?? [45, 55, 50]
    const lineHeight = options?.lineHeight ?? 3.9
    const hangingIndent = options?.hangingIndent ?? 0
    const spacingAfter = options?.spacingAfter ?? 1.5

    this.doc.setFont('NotoSans', bold ? 'bold' : 'normal')
    this.doc.setFontSize(fontSize)
    this.doc.setTextColor(...color)

    const lines: string[] = this.doc.splitTextToSize(text, this.contentWidth - hangingIndent)
    const needed = lines.length * lineHeight + spacingAfter

    this.ensureSpace(needed)
    lines.forEach((line, idx) => {
      const x = this.margin + (idx > 0 ? hangingIndent : 0)
      this.doc.text(line, x, this.y + fontSize * 0.3528)
      this.y += lineHeight
    })
    this.y += spacingAfter
  }

  /**
   * Draws a container box whose total height is strictly measured from contents.
   */
  drawBox(
    builderFn: (box: BoxBuilder) => void,
    options?: {
      bg?: [number, number, number]
      border?: [number, number, number]
      padding?: number
      spacingAfter?: number
    },
  ) {
    const padding = options?.padding ?? 2.2
    const spacingAfter = options?.spacingAfter ?? 2.2
    const bg = options?.bg ?? [249, 251, 248]
    const border = options?.border ?? [220, 228, 218]

    const builder = new BoxBuilder(this.doc, this.contentWidth - padding * 2)
    builderFn(builder)

    const totalHeight = builder.computeHeight(padding)
    this.ensureSpace(totalHeight + spacingAfter)

    const boxTop = this.y

    // Background & rounded border
    this.doc.setFillColor(...bg)
    this.doc.setDrawColor(...border)
    this.doc.setLineWidth(0.35)
    this.doc.roundedRect(this.margin, boxTop, this.contentWidth, totalHeight, 2, 2, 'FD')

    // Render contents inside box
    builder.render(this.margin + padding, boxTop + padding)

    this.y = boxTop + totalHeight + spacingAfter
  }

  /**
   * Draws a balanced two-column section
   */
  twoColumn(
    col1Fn: (b: BoxBuilder) => void,
    col2Fn: (b: BoxBuilder) => void,
    options?: { gap?: number; spacingAfter?: number },
  ) {
    const gap = options?.gap ?? 5
    const colWidth = (this.contentWidth - gap) / 2
    const spacingAfter = options?.spacingAfter ?? 2.5

    const b1 = new BoxBuilder(this.doc, colWidth)
    const b2 = new BoxBuilder(this.doc, colWidth)

    col1Fn(b1)
    col2Fn(b2)

    const h1 = b1.computeHeight(0)
    const h2 = b2.computeHeight(0)
    const maxH = Math.max(h1, h2)

    this.ensureSpace(maxH + spacingAfter)

    const topY = this.y
    b1.render(this.margin, topY)
    b2.render(this.margin + colWidth + gap, topY)

    this.y = topY + maxH + spacingAfter
  }
}

// ============================================================================
// BOX BUILDER FOR PRECISE HEIGHT MEASUREMENT
// ============================================================================

interface BoxItem {
  height: number
  render: (doc: jsPDF, x: number, y: number, width: number) => void
}

class BoxBuilder {
  doc: jsPDF
  width: number
  items: BoxItem[] = []

  constructor(doc: jsPDF, width: number) {
    this.doc = doc
    this.width = width
  }

  addText(
    text: string,
    options?: {
      fontSize?: number
      bold?: boolean
      color?: [number, number, number]
      lineHeight?: number
    },
  ) {
    if (!text || !text.trim()) return
    const fontSize = options?.fontSize ?? 8.5
    const bold = options?.bold ?? false
    const color = options?.color ?? [45, 55, 50]
    const lineHeight = options?.lineHeight ?? 3.8

    this.doc.setFont('NotoSans', bold ? 'bold' : 'normal')
    this.doc.setFontSize(fontSize)

    const lines: string[] = this.doc.splitTextToSize(text, this.width)
    const height = lines.length * lineHeight

    this.items.push({
      height,
      render: (doc, x, y) => {
        doc.setFont('NotoSans', bold ? 'bold' : 'normal')
        doc.setFontSize(fontSize)
        doc.setTextColor(...color)
        lines.forEach((line, idx) => {
          doc.text(line, x, y + idx * lineHeight + fontSize * 0.3528)
        })
      },
    })
  }

  addKeyValue(
    label: string,
    value: string,
    options?: {
      labelWidth?: number
      fontSize?: number
      valueColor?: [number, number, number]
    },
  ) {
    if (!value || !value.trim()) return
    const fontSize = options?.fontSize ?? 8.5
    const labelWidth = options?.labelWidth ?? 44
    const valueColor = options?.valueColor ?? [40, 50, 45]
    const valueWidth = this.width - labelWidth - 2

    this.doc.setFont('NotoSans', 'normal')
    this.doc.setFontSize(fontSize)

    const lines: string[] = this.doc.splitTextToSize(value, valueWidth)
    const lineHeight = 3.6
    const height = Math.max(lines.length * lineHeight, 3.8)

    this.items.push({
      height,
      render: (doc, x, y) => {
        doc.setFont('NotoSans', 'bold')
        doc.setFontSize(fontSize)
        doc.setTextColor(20, 50, 35)
        doc.text(label, x, y + fontSize * 0.3528)

        doc.setFont('NotoSans', 'normal')
        doc.setTextColor(...valueColor)
        lines.forEach((line, idx) => {
          doc.text(line, x + labelWidth, y + idx * lineHeight + fontSize * 0.3528)
        })
      },
    })
  }

  addClickableButtonWithUrl(
    buttonText: string,
    url: string,
    options?: {
      isPrimary?: boolean
      buttonHeight?: number
    },
  ) {
    const isPrimary = options?.isPrimary ?? false
    const buttonHeight = options?.buttonHeight ?? 6.5

    this.doc.setFont('NotoSans', 'normal')
    this.doc.setFontSize(8)
    const urlLines: string[] = this.doc.splitTextToSize(url, this.width - 2)
    const urlLineHeight = 3.2
    const urlHeight = urlLines.length * urlLineHeight + 1.0

    const totalHeight = buttonHeight + 1.0 + urlHeight

    this.items.push({
      height: totalHeight,
      render: (doc, x, y, width) => {
        // Draw Button Rectangle
        if (isPrimary) {
          doc.setFillColor(20, 50, 35)
          doc.setDrawColor(20, 50, 35)
          doc.roundedRect(x, y, width, buttonHeight, 1.5, 1.5, 'F')
          doc.setTextColor(255, 255, 255)
        } else {
          doc.setFillColor(242, 247, 240)
          doc.setDrawColor(180, 205, 178)
          doc.setLineWidth(0.3)
          doc.roundedRect(x, y, width, buttonHeight, 1.5, 1.5, 'FD')
          doc.setTextColor(20, 50, 35)
        }

        doc.setFont('NotoSans', 'bold')
        doc.setFontSize(8.5)
        const btnTextWidth = doc.getTextWidth(buttonText)
        doc.text(buttonText, x + (width - btnTextWidth) / 2, y + buttonHeight / 2 + 1.1)

        // Real clickable link over full button rectangle
        doc.link(x, y, width, buttonHeight, { url })

        // URL printed beneath in small grey text
        doc.setFont('NotoSans', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(100, 105, 100)
        urlLines.forEach((uLine, uIdx) => {
          doc.text(uLine, x + 0.5, y + buttonHeight + 2.2 + uIdx * urlLineHeight)
        })
      },
    })
  }

  addRawItem(
    height: number,
    renderFn: (doc: jsPDF, x: number, y: number, width: number) => void,
  ) {
    this.items.push({ height, render: renderFn })
  }

  itemSpacing = 1.2

  computeHeight(padding: number): number {
    if (this.items.length === 0) return padding * 2
    const itemsSum = this.items.reduce((acc, it) => acc + it.height, 0)
    const internalSpacing = (this.items.length - 1) * this.itemSpacing
    return itemsSum + internalSpacing + padding * 2
  }

  render(startX: number, startY: number) {
    let curY = startY
    this.items.forEach((item) => {
      item.render(this.doc, startX, curY, this.width)
      curY += item.height + this.itemSpacing
    })
  }
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

export async function generateTravelSafetyCardPdf(
  options: TravelCardPdfOptions,
): Promise<jsPDF> {
  const {
    farm,
    bookingId,
    guestName,
    checkInDate,
    visitType = 'day',
    guests = 2,
    bookingStatus = 'Confirmed',
    source,
    routeInfo,
    mapImage,
  } = options

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
  const farmLandmarks = Array.isArray(farm.landmarks) ? farm.landmarks : []
  const nearbyServices = farm.nearby_services || farm.nearbyServices || {}

  const dms = formatDms(destLat, destLng)
  const bookingRefShort = bookingId
    ? bookingId.replace(/-/g, '').slice(0, 8).toUpperCase()
    : 'CONFIRMED'

  // Initialize Layout Engine
  const flow = new PdfFlowDoc()
  const doc = flow.doc

  // ============================================================================
  // 1. HEADER: Green Band & Farm Header
  // ============================================================================
  const headerBandHeight = 12
  doc.setFillColor(20, 50, 35) // #143223
  doc.rect(flow.margin, flow.y, flow.contentWidth, headerBandHeight, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(10.5)
  doc.text('AGRITRAILS TRAVEL AND ROUTE MAP', flow.margin + 5, flow.y + 5.2)

  doc.setFont('NotoSans', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(205, 224, 213)
  doc.text('Offline Rural Access & Practical Travel Guide', flow.margin + 5, flow.y + 9.5)

  flow.y += headerBandHeight + 4 // 4mm gap

  // Farm Name, Location & Verified Tag
  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(20, 50, 35)

  const nameLines = doc.splitTextToSize(farmName, flow.contentWidth - 46)
  doc.text(nameLines, flow.margin, flow.y + 5.5)

  // Verified Tag on the right, inside the margin
  const tagWidth = 38
  const tagHeight = 6
  const tagX = flow.margin + flow.contentWidth - tagWidth
  const tagY = flow.y + 0.5

  doc.setFillColor(232, 244, 235)
  doc.setDrawColor(184, 220, 191)
  doc.setLineWidth(0.3)
  doc.roundedRect(tagX, tagY, tagWidth, tagHeight, 1.5, 1.5, 'FD')
  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(20, 85, 43)
  doc.text('Verified by AgriTrails', tagX + 3, tagY + 4.2)

  flow.y += nameLines.length * 6.5 + 1.0

  // Location line
  doc.setFont('NotoSans', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(83, 104, 93)
  doc.text(`${place} · ${region}`, flow.margin, flow.y + 2.5)
  flow.y += 5

  // ============================================================================
  // 2. BOOKING SUMMARY: 2-Column Grid Box
  // ============================================================================
  flow.drawBox((box) => {
    const colW = (box.width - 6) / 2
    const statusColor: [number, number, number] =
      bookingStatus.toLowerCase() === 'confirmed'
        ? [24, 110, 48]
        : bookingStatus.toLowerCase() === 'declined'
        ? [180, 40, 40]
        : [190, 100, 20]

    box.addRawItem(14, (d, x, y) => {
      // Row 1: Ref & Guest
      d.setFont('NotoSans', 'bold')
      d.setFontSize(8.5)
      d.setTextColor(20, 50, 35)
      d.text('Reference:', x, y + 2.8)
      d.setFont('NotoSans', 'bold')
      d.setTextColor(40, 50, 45)
      d.text(bookingRefShort, x + 22, y + 2.8)

      d.setFont('NotoSans', 'bold')
      d.setTextColor(20, 50, 35)
      d.text('Guest:', x + colW + 4, y + 2.8)
      d.setFont('NotoSans', 'normal')
      d.setTextColor(40, 50, 45)
      d.text(guestName || 'Registered Guest', x + colW + 18, y + 2.8)

      // Row 2: Visit type & Check-in date
      d.setFont('NotoSans', 'bold')
      d.setTextColor(20, 50, 35)
      d.text('Visit Type:', x, y + 7.4)
      d.setFont('NotoSans', 'normal')
      d.setTextColor(40, 50, 45)
      d.text(visitType === 'day' ? 'Day Visit' : 'Overnight Stay', x + 22, y + 7.4)

      d.setFont('NotoSans', 'bold')
      d.setTextColor(20, 50, 35)
      d.text('Date:', x + colW + 4, y + 7.4)
      d.setFont('NotoSans', 'normal')
      d.setTextColor(40, 50, 45)
      d.text(formatIstDate(checkInDate), x + colW + 18, y + 7.4)

      // Row 3: Guests & Status
      d.setFont('NotoSans', 'bold')
      d.setTextColor(20, 50, 35)
      d.text('Guests:', x, y + 12.0)
      d.setFont('NotoSans', 'normal')
      d.setTextColor(40, 50, 45)
      d.text(`${guests} Persons`, x + 22, y + 12.0)

      d.setFont('NotoSans', 'bold')
      d.setTextColor(20, 50, 35)
      d.text('Status:', x + colW + 4, y + 12.0)
      d.setFont('NotoSans', 'bold')
      d.setTextColor(...statusColor)
      d.text(bookingStatus.toUpperCase(), x + colW + 18, y + 12.0)
    })
  })

  // ============================================================================
  // 3. REPORTING TIMES BOX (Prominent)
  // ============================================================================
  const dayStart = farm.day_visit_start || farm.dayVisitStart || '09:30'
  const dayEnd = farm.day_visit_end || farm.dayVisitEnd || '17:00'
  const checkInTime = farm.check_in_time || '1:00 PM'
  const checkOutTime = farm.check_out_time || '11:00 AM'
  const hostHours = farm.host_contact_hours || '7:00 AM - 9:00 PM'

  // Gate report time
  const gateReportBy =
    visitType === 'day'
      ? format12HourTime(dayStart)
      : format12HourTime(checkInTime)

  // Visit hours or Check-in/Check-out
  const hoursText =
    visitType === 'day'
      ? `${format12HourTime(dayStart)} - ${format12HourTime(dayEnd)}`
      : `Check-in: ${format12HourTime(checkInTime)} | Check-out: ${format12HourTime(checkOutTime)}`

  // Last safe arrival condition: only if stored and earlier than visit end time
  let safeArrivalValid: string | null = null
  if (farm.last_safe_arrival) {
    const endMinutes = parseTimeToMinutes(visitType === 'day' ? dayEnd : checkOutTime)
    const arrivalMinutes = parseTimeToMinutes(farm.last_safe_arrival)
    if (endMinutes && arrivalMinutes && arrivalMinutes < endMinutes) {
      safeArrivalValid = format12HourTime(farm.last_safe_arrival)
    }
  }

  flow.drawBox(
    (box) => {
      box.addText('ARRIVAL & REPORTING SCHEDULE', {
        bold: true,
        fontSize: 9,
        color: [20, 50, 35],
      })
      box.addKeyValue('Report at farm gate by:', gateReportBy, { labelWidth: 42 })
      box.addKeyValue(
        visitType === 'day' ? 'Day Visit Hours:' : 'Stay Timings:',
        hoursText,
        { labelWidth: 42 },
      )
      if (hostHours) {
        box.addKeyValue('Host Reachable Hours:', hostHours, { labelWidth: 42 })
      }
      if (safeArrivalValid) {
        box.addKeyValue('Last Safe Arrival:', `${safeArrivalValid} (before dark)`, {
          labelWidth: 42,
        })
      }
    },
    { bg: [251, 252, 249], border: [20, 50, 35] },
  )

  // ============================================================================
  // 4. NAVIGATION BOX: Farm Gate GPS Coordinates
  // ============================================================================
  flow.drawBox((box) => {
    box.addText('FARM GATE LOCATION & COORDINATES', {
      bold: true,
      fontSize: 9,
      color: [20, 50, 35],
    })
    box.addKeyValue(
      'GPS Coordinates:',
      `${destLat.toFixed(6)}° N, ${destLng.toFixed(6)}° E  (DMS: ${dms.text})`,
      { labelWidth: 35 },
    )
  })

  // ============================================================================
  // 5. ROUTE SUMMARY
  // ============================================================================
  const originName = source?.name || 'Not specified'
  const distanceKm = routeInfo?.distanceKm ? Number(routeInfo.distanceKm).toFixed(1) : ''
  const durationText = routeInfo?.durationText || ''

  flow.sectionTitle('Route Summary')

  if (source && distanceKm) {
    flow.paragraph(
      `Origin: ${originName} | Distance: ${distanceKm} km | Drive time: ${durationText}`,
      { bold: true, fontSize: 8.5, color: [20, 50, 35] },
    )
  } else {
    flow.paragraph(
      'Origin: Not specified | Select your starting city on the booking page to see the full route and drive estimates.',
      { fontSize: 8.5, color: [80, 90, 85] },
    )
  }

  // Long journey plain note if drive is > 10 hours (36000 seconds)
  const driveSecs =
    routeInfo?.durationSeconds ||
    (distanceKm ? Math.round((Number(distanceKm) / 45) * 3600) : 0)

  if (driveSecs >= 36000) {
    flow.paragraph('Long journey: plan an overnight stop.', {
      bold: true,
      fontSize: 8.5,
      color: [180, 80, 20],
    })
  }

  // Suggested departure line
  const departureLine = computeSuggestedDeparture(checkInDate, gateReportBy, driveSecs)
  if (departureLine) {
    flow.paragraph(departureLine, {
      fontSize: 8.5,
      bold: true,
      color: [20, 50, 35],
    })
  }

  // Filter qualifying landmarks for Section 7 on Page 2
  const qualifyingLandmarks = filterMajorLandmarks(
    routeInfo?.steps || [],
    farmLandmarks,
    Number(distanceKm) || 0,
  )

  // ============================================================================
  // 6. ROUTE MAP: Captured Rendered Map Image or Destination Coordinates Fallback
  // ============================================================================
  flow.sectionTitle('Route & Location Map')

  function drawCoordinatesFallback() {
    flow.drawBox((box) => {
      box.addText('DESTINATION GPS & ACCESS COORDINATES', {
        bold: true,
        fontSize: 9,
        color: [20, 50, 35],
      })
      box.addKeyValue(
        'Farm Gate Coordinates:',
        `${destLat.toFixed(6)}° N, ${destLng.toFixed(6)}° E  (DMS: ${dms.text})`,
        { labelWidth: 42 },
      )
      if (source?.name) {
        box.addKeyValue(
          'Driving Origin:',
          `${source.name} (${distanceKm ? `${distanceKm} km` : 'Direct'})`,
          { labelWidth: 42 },
        )
      }
      box.addText(
        'Offline Note: Use your vehicle GPS or enter decimal coordinates into offline maps navigation before leaving network coverage.',
        { fontSize: 8, color: [80, 95, 85] },
      )
    })
  }

  if (mapImage && mapImage.dataUrl) {
    const origW = mapImage.width || 800
    const origH = mapImage.height || 360
    const aspect = origW / Math.max(origH, 1)

    // Fit across content width (180mm), keeping aspect ratio
    let imgW = flow.contentWidth
    let imgH = imgW / aspect

    // Cap maximum height to 70mm so it fits comfortably on Page 1
    if (imgH > 70) {
      imgH = 70
      imgW = imgH * aspect
    }

    const imgX = flow.margin + (flow.contentWidth - imgW) / 2
    const totalBoxH = imgH + 7 // image + caption + padding

    flow.ensureSpace(totalBoxH)

    try {
      doc.addImage(mapImage.dataUrl, 'JPEG', imgX, flow.y, imgW, imgH)
      flow.y += imgH + 2.5

      doc.setFont('NotoSans', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(110, 120, 115)
      doc.text('Map data (c) OpenStreetMap contributors', flow.margin, flow.y)
      flow.y += 6
    } catch (e) {
      console.warn('Failed to embed map image in PDF, drawing coordinates:', e)
      drawCoordinatesFallback()
    }
  } else {
    // If map is not on page or capture fails: skip image and show destination coordinates only. Never leave a blank box.
    drawCoordinatesFallback()
  }

  // Start Page 2 cleanly after the Page 1 Route Map
  flow.doc.addPage()
  flow.y = flow.margin

  // ============================================================================
  // 7. MAJOR LANDMARKS (Filtered Hard; Hidden if < 2 qualify)
  // ============================================================================
  if (qualifyingLandmarks.length >= 2) {
    flow.sectionTitle('Major Landmarks & Milestones')
    flow.drawBox((box) => {
      qualifyingLandmarks.forEach((lm) => {
        box.addKeyValue(lm.name, lm.info, { labelWidth: 90, fontSize: 8.5 })
      })
    })
  }

  // ============================================================================
  // 8. DIRECTIONS TO THE FARM
  // ============================================================================
  if (directionsSteps.length > 0) {
    flow.sectionTitle('Directions to Farm')
    directionsSteps.forEach((step, idx) => {
      flow.paragraph(`${idx + 1}.  ${step}`, {
        hangingIndent: 5.5,
        fontSize: 8.5,
        lineHeight: 3.5,
        spacingAfter: 0.8,
        color: [40, 50, 45],
      })
    })

    if (landmarkNote) {
      flow.drawBox(
        (box) => {
          box.addText('KEY VISUAL LANDMARK', {
            bold: true,
            fontSize: 8,
            color: [140, 95, 20],
          })
          box.addText(landmarkNote, {
            fontSize: 8.5,
            color: [45, 55, 45],
            lineHeight: 3.5,
          })
        },
        { bg: [253, 250, 243], border: [230, 212, 175], padding: 2.0, spacingAfter: 2.0 },
      )
    }
  }

  // ============================================================================
  // 9. LAST SERVICES BEFORE THE FARM
  // ============================================================================
  const servicesList: Array<{ label: string; text: string }> = []

  const isVague = (val?: string) =>
    !val ||
    /nearest|unknown|none|^-$|^n\/a$/i.test(val.trim()) ||
    val.trim().length < 2

  if (nearbyServices.fuel?.name && !isVague(nearbyServices.fuel.name)) {
    const dist = nearbyServices.fuel.distance_km ? ` (${nearbyServices.fuel.distance_km} km)` : ''
    servicesList.push({ label: 'Fuel Station', text: `${nearbyServices.fuel.name}${dist}` })
  }
  if (nearbyServices.atm?.name && !isVague(nearbyServices.atm.name)) {
    const dist = nearbyServices.atm.distance_km ? ` (${nearbyServices.atm.distance_km} km)` : ''
    servicesList.push({ label: 'ATM / Cash', text: `${nearbyServices.atm.name}${dist}` })
  }
  if (nearbyServices.pharmacy?.name && !isVague(nearbyServices.pharmacy.name)) {
    const dist = nearbyServices.pharmacy.distance_km ? ` (${nearbyServices.pharmacy.distance_km} km)` : ''
    servicesList.push({ label: 'Pharmacy', text: `${nearbyServices.pharmacy.name}${dist}` })
  }
  if (nearbyServices.grocery?.name && !isVague(nearbyServices.grocery.name)) {
    const dist = nearbyServices.grocery.distance_km ? ` (${nearbyServices.grocery.distance_km} km)` : ''
    servicesList.push({ label: 'Grocery Store', text: `${nearbyServices.grocery.name}${dist}` })
  }

  if (servicesList.length > 0) {
    flow.sectionTitle('Last Services Before Farm')
    flow.drawBox(
      (box) => {
        servicesList.forEach((s) => {
          box.addKeyValue(`${s.label}:`, s.text, { labelWidth: 35, fontSize: 8.5 })
        })
      },
      { padding: 2.2, spacingAfter: 2.2 },
    )
  }

  // ============================================================================
  // 10. ACTIVITIES (Clean 2-Column List)
  // ============================================================================
  const farmActivities = Array.isArray(farm.activities) ? farm.activities : []
  if (farmActivities.length > 0) {
    flow.sectionTitle('Farm Activities & Experiences')

    const mid = Math.ceil(farmActivities.length / 2)
    const col1 = farmActivities.slice(0, mid)
    const col2 = farmActivities.slice(mid)

    flow.twoColumn(
      (b) => {
        col1.forEach((act) => {
          const timing = act.sort_hint || 'morning'
          const dur = act.duration_min ? `${act.duration_min} min` : '45 min'
          const cost = act.is_paid ? 'Extra cost' : 'Included in visit'
          b.addText(act.name, { bold: true, fontSize: 8.5, color: [20, 50, 35] })
          b.addText(`${dur} | ${timing} | ${cost}`, {
            fontSize: 8,
            color: [90, 105, 95],
            lineHeight: 3.3,
          })
        })
      },
      (b) => {
        col2.forEach((act) => {
          const timing = act.sort_hint || 'morning'
          const dur = act.duration_min ? `${act.duration_min} min` : '45 min'
          const cost = act.is_paid ? 'Extra cost' : 'Included in visit'
          b.addText(act.name, { bold: true, fontSize: 8.5, color: [20, 50, 35] })
          b.addText(`${dur} | ${timing} | ${cost}`, {
            fontSize: 8,
            color: [90, 105, 95],
            lineHeight: 3.3,
          })
        })
      },
      { spacingAfter: 2.2 },
    )
  }

  // ============================================================================
  // 11. SAFETY: Emergency Table & Nearest Emergency Facilities
  // ============================================================================
  flow.sectionTitle('Safety & Emergency Assistance')

  const hospName = nearbyServices.hospital?.name || 'Local Rural Hospital'
  const hospDist = nearbyServices.hospital?.distance_km
    ? `${nearbyServices.hospital.distance_km} km`
    : 'District HQ'
  const hospPhone = nearbyServices.hospital?.phone || 'Dial 112'

  const polName = nearbyServices.police?.name || 'Local Police Station'
  const polDist = nearbyServices.police?.distance_km
    ? `${nearbyServices.police.distance_km} km`
    : 'Taluka HQ'
  const polPhone = nearbyServices.police?.phone || 'Dial 112'

  flow.drawBox(
    (box) => {
      const colW = (box.width - 6) / 3
      box.addRawItem(8.0, (d, x, y) => {
        d.setFont('NotoSans', 'bold')
        d.setFontSize(7.5)
        d.setTextColor(180, 40, 40)
        d.text('National Emergency', x, y + 2.2)
        d.setFontSize(10)
        d.setTextColor(20, 50, 35)
        d.text('112', x, y + 6.8)

        d.setFontSize(7.5)
        d.setTextColor(180, 40, 40)
        d.text('Medical Ambulance', x + colW + 3, y + 2.2)
        d.setFontSize(10)
        d.setTextColor(20, 50, 35)
        d.text('108', x + colW + 3, y + 6.8)

        d.setFontSize(7.5)
        d.setTextColor(180, 40, 40)
        d.text('Police Control', x + (colW + 3) * 2, y + 2.2)
        d.setFontSize(10)
        d.setTextColor(20, 50, 35)
        d.text('100', x + (colW + 3) * 2, y + 6.8)
      })

      box.addKeyValue('Nearest Hospital:', `${hospName} | ${hospDist} | Phone: ${hospPhone}`, {
        labelWidth: 32,
        fontSize: 8,
      })
      box.addKeyValue('Nearest Police:', `${polName} | ${polDist} | Phone: ${polPhone}`, {
        labelWidth: 32,
        fontSize: 8,
      })
    },
    { bg: [255, 252, 252], border: [238, 215, 215], padding: 2.2, spacingAfter: 2.2 },
  )

  // ============================================================================
  // 12. HOST CONTACT
  // ============================================================================
  flow.sectionTitle('Host Contact')
  flow.drawBox(
    (box) => {
      box.addKeyValue('Host Name:', hostName, { labelWidth: 28, fontSize: 8.5 })
      box.addKeyValue('Direct Phone:', hostPhone, { labelWidth: 28, fontSize: 8.5 })

      box.addRawItem(6.0, (d, x, y) => {
        // Clickable Phone Link
        d.setFont('NotoSans', 'bold')
        d.setFontSize(8.5)
        d.setTextColor(20, 50, 35)
        const telText = `Call Host: ${hostPhone}`
        d.text(telText, x, y + 4.2)
        const telW = d.getTextWidth(telText)
        d.link(x, y, telW + 4, 5.5, { url: `tel:${hostPhone}` })

        // WhatsApp Link if available
        const cleanPhone = hostPhone.replace(/\D/g, '')
        if (cleanPhone) {
          const waText = 'Message on WhatsApp'
          d.setTextColor(18, 120, 60)
          d.text(waText, x + telW + 12, y + 4.2)
          const waW = d.getTextWidth(waText)
          d.link(x + telW + 12, y, waW + 4, 5.5, {
            url: `https://wa.me/${cleanPhone}`,
          })
        }
      })
    },
    { padding: 2.2, spacingAfter: 2.2 },
  )

  // ============================================================================
  // 13. OFFLINE TIPS, WHAT TO CARRY, RULES & SMS TEMPLATE
  // ============================================================================
  flow.sectionTitle('Offline Readiness & Guidelines')

  const rulesText =
    Array.isArray(farm.rules) && farm.rules.length > 0
      ? farm.rules.join(' · ')
      : 'Respect farm livestock and crops · No littering; take all plastics back · Quiet hours after 9 PM'

  flow.paragraph(
    '1. Download offline map region & save host phone before departing mobile coverage.\n' +
      '2. Carry sufficient physical cash for local village tolls, fuel and farm produce.\n' +
      '3. What to Carry: Comfortable walking shoes, water bottle, hat/sun protection, valid ID, medications.\n' +
      `4. Farm Guidelines: ${rulesText}`,
    { fontSize: 8, lineHeight: 3.4, color: [45, 55, 50], spacingAfter: 1.5 },
  )

  const smsTemplate =
    `I am travelling to ${farmName} (Booking ${bookingRefShort}). ` +
    `Destination coordinates: ${destLat.toFixed(4)}, ${destLng.toFixed(4)}. Host: ${hostName} (${hostPhone}).`

  flow.drawBox(
    (box) => {
      box.addText('EMERGENCY SMS TEXT TEMPLATE (COPY / FORWARD TO FAMILY)', {
        bold: true,
        fontSize: 7.5,
        color: [70, 85, 75],
      })
      box.addText(smsTemplate, {
        fontSize: 8,
        color: [40, 50, 45],
        lineHeight: 3.4,
      })
    },
    { bg: [247, 249, 246], border: [215, 225, 215], padding: 2.0, spacingAfter: 2.0 },
  )

  // ============================================================================
  // 14. FOOTER ON EVERY PAGE (Post-pass)
  // ============================================================================
  const totalPages = doc.getNumberOfPages()
  const generatedTimestamp = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date())

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)

    // Divider line
    doc.setDrawColor(215, 225, 215)
    doc.setLineWidth(0.3)
    doc.line(flow.margin, 284, flow.margin + flow.contentWidth, 284)

    // Footer text
    doc.setFont('NotoSans', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 115, 105)

    const footerText = `AgriTrails | Booking ${bookingRefShort} | Generated ${generatedTimestamp} IST | Page ${p} of ${totalPages}`
    const textWidth = doc.getTextWidth(footerText)

    doc.text(footerText, flow.margin + (flow.contentWidth - textWidth) / 2, 288.5)
  }

  return doc
}

/**
 * Client-side download helper
 */
export async function downloadTravelSafetyCardPdf(
  options: TravelCardPdfOptions,
): Promise<void> {
  const doc = await generateTravelSafetyCardPdf(options)
  const safeName = (options.farm.name || 'agritrails')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30)
  const filename = `AgriTrails-Route-${safeName}-${options.bookingId ? options.bookingId.slice(0, 8) : 'card'}.pdf`
  doc.save(filename)
}
