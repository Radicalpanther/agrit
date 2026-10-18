export interface TravelCardPdfData {
  farmName: string
  farmSlug: string
  place: string
  region: string
  lat: number
  lng: number
  hostName: string
  hostPhone: string
  directionsSteps: string[]
  landmarkNote?: string | null
  bookingId?: string
  checkInDate?: string
  visitType?: string
  guests?: number
}

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' ')
}

export function generateTravelCardPdf(data: TravelCardPdfData): Uint8Array {
  const ops: string[] = []

  // Document setup - A4 is 595.28 x 841.89 points
  // Margins: left=40, right=555, top=800, bottom=40

  // 1. Header Banner Box
  ops.push('0.12 0.23 0.17 rg') // --forest: #1e3a2b
  ops.push('40 750 515 52 re f')

  ops.push('BT')
  ops.push('/F1 18 Tf') // Bold
  ops.push('1 1 1 rg') // White
  ops.push('55 776 Td')
  ops.push(`(${escapePdfText('AGRITRAILS  TRAVEL SAFETY CARD')}) Tj`)
  ops.push('/F2 10 Tf') // Regular
  ops.push('0 -15 Td')
  ops.push(
    `(${escapePdfText('OFFLINE RURAL ACCESS AND EMERGENCY INFORMATION - KEEP SAVED')}) Tj`,
  )
  ops.push('ET')

  // 2. Farm Name & Booking Meta
  ops.push('BT')
  ops.push('0.1 0.1 0.1 rg')
  ops.push('/F1 15 Tf')
  ops.push('40 720 Td')
  ops.push(`(${escapePdfText(data.farmName.toUpperCase())}) Tj`)

  ops.push('/F2 10 Tf')
  ops.push('0.3 0.35 0.3 rg')
  ops.push('0 -15 Td')
  const locLine = `${data.place} · ${data.region}`
  ops.push(`(${escapePdfText(locLine)}) Tj`)

  if (data.bookingId || data.checkInDate) {
    ops.push('0 -14 Td')
    const bookLine = `Booking Ref: ${data.bookingId || 'Confirmed'}   Date: ${data.checkInDate || 'Scheduled'}   Guests: ${data.guests || 2}`
    ops.push(`(${escapePdfText(bookLine)}) Tj`)
  }
  ops.push('ET')

  // Divider
  ops.push('0.85 0.88 0.85 RG')
  ops.push('40 665 m 555 665 l S')

  // 3. GPS Coordinates Box (LARGE)
  ops.push('0.95 0.97 0.95 rg')
  ops.push('40 595 515 60 re f')
  ops.push('0.7 0.8 0.7 RG')
  ops.push('40 595 515 60 re S')

  const latStr = `${Math.abs(data.lat).toFixed(4)} deg ${data.lat >= 0 ? 'N' : 'S'}`
  const lngStr = `${Math.abs(data.lng).toFixed(4)} deg ${data.lng >= 0 ? 'E' : 'W'}`

  ops.push('BT')
  ops.push('/F2 9 Tf')
  ops.push('0.2 0.35 0.2 rg')
  ops.push('55 638 Td')
  ops.push(`(${escapePdfText('TARGET GPS COORDINATES (DECIMAL & DEGREES):')}) Tj`)

  ops.push('/F1 16 Tf')
  ops.push('0.12 0.23 0.17 rg')
  ops.push('0 -18 Td')
  ops.push(
    `(${escapePdfText(`${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}  (${latStr}, ${lngStr})`)}) Tj`,
  )

  ops.push('/F2 8 Tf')
  ops.push('0.3 0.4 0.3 rg')
  ops.push('0 -12 Td')
  ops.push(
    `(${escapePdfText('Save coordinates in offline GPS / vehicle navigation before entering remote roads.')}) Tj`,
  )
  ops.push('ET')

  // 4. Host Contact Box
  ops.push('BT')
  ops.push('/F1 11 Tf')
  ops.push('0.1 0.1 0.1 rg')
  ops.push('40 570 Td')
  ops.push(`(${escapePdfText('LOCAL HOST CONTACT')}) Tj`)

  ops.push('/F2 10 Tf')
  ops.push('0 -16 Td')
  ops.push(
    `(${escapePdfText(`Host Name: ${data.hostName || 'Farm Host'}     Direct Phone: ${data.hostPhone || 'Local Contact'}`)}) Tj`,
  )
  ops.push('ET')

  // Divider
  ops.push('0.85 0.88 0.85 RG')
  ops.push('40 535 m 555 535 l S')

  // 5. Landmark-based Directions
  ops.push('BT')
  ops.push('/F1 11 Tf')
  ops.push('0.1 0.1 0.1 rg')
  ops.push('40 515 Td')
  ops.push(
    `(${escapePdfText('LANDMARK-BASED DIRECTIONS (FROM NEAREST TOWN / BUS STOP)')}) Tj`,
  )
  ops.push('ET')

  let curY = 495
  const steps =
    data.directionsSteps && data.directionsSteps.length > 0
      ? data.directionsSteps
      : ['Follow district road towards farm gate signboards.']

  steps.slice(0, 6).forEach((step, idx) => {
    ops.push('BT')
    ops.push('/F1 9 Tf')
    ops.push('0.2 0.35 0.25 rg')
    ops.push(`40 ${curY} Td`)
    ops.push(`(${escapePdfText(`[Step ${idx + 1}]`)}) Tj`)

    ops.push('/F2 9.5 Tf')
    ops.push('0.15 0.15 0.15 rg')
    ops.push(`45 0 Td`)
    // Wrap long lines
    const safeText = escapePdfText(step.substring(0, 95))
    ops.push(`(${safeText}) Tj`)
    ops.push('ET')
    curY -= 20
  })

  // Landmark note callout
  if (data.landmarkNote) {
    curY -= 6
    ops.push('0.98 0.98 0.95 rg')
    ops.push(`40 ${curY - 26} 515 30 re f`)
    ops.push('0.85 0.8 0.65 RG')
    ops.push(`40 ${curY - 26} 515 30 re S`)

    ops.push('BT')
    ops.push('/F1 8.5 Tf')
    ops.push('0.35 0.25 0.1 rg')
    ops.push(`52 ${curY - 12} Td`)
    ops.push(
      `(${escapePdfText(`VISUAL LANDMARK NOTE: ${data.landmarkNote}`)}) Tj`,
    )
    ops.push('ET')
    curY -= 40
  } else {
    curY -= 15
  }

  // 6. Emergency & Safety Section
  ops.push('0.96 0.94 0.94 rg')
  ops.push(`40 ${curY - 80} 515 80 re f`)
  ops.push('0.85 0.7 0.7 RG')
  ops.push(`40 ${curY - 80} 515 80 re S`)

  ops.push('BT')
  ops.push('/F1 11 Tf')
  ops.push('0.6 0.15 0.15 rg')
  ops.push(`55 ${curY - 20} Td`)
  ops.push(`(${escapePdfText('OFFLINE EMERGENCY & COMMUNICATION PROTOCOL')}) Tj`)

  ops.push('/F2 9 Tf')
  ops.push('0.2 0.2 0.2 rg')
  ops.push(`0 -16 Td`)
  ops.push(
    `(${escapePdfText(`1. Call Host: ${data.hostPhone || 'See above'}  (Direct cellular line)`)}) Tj`,
  )

  ops.push(`0 -14 Td`)
  ops.push(
    `(${escapePdfText('2. All-India Emergency Assistance: Dial 112 (Police, Fire, Ambulance)')}) Tj`,
  )

  ops.push(`0 -14 Td`)
  ops.push(
    `(${escapePdfText(`3. Location SMS text: "Target: ${data.farmName} at GPS ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}"`)}) Tj`,
  )
  ops.push('ET')

  curY -= 95

  // 7. Footer Offline Advisory & Legal note
  ops.push('BT')
  ops.push('/F2 8 Tf')
  ops.push('0.4 0.45 0.4 rg')
  ops.push(`40 ${curY} Td`)
  ops.push(
    `(${escapePdfText('OFFLINE PREPARATION: Open Google Maps and tap "Download Offline Map" for this rural district prior to travel.')}) Tj`,
  )
  ops.push('0 -12 Td')
  ops.push(
    `(${escapePdfText('DISCLAIMER: This document is an offline safety guidance card. Telecommunications rely on standard cellular carriers;')}) Tj`,
  )
  ops.push('0 -10 Td')
  ops.push(
    `(${escapePdfText('this service does not provide emergency dispatch or private rescue response.')}) Tj`,
  )
  ops.push('ET')

  const contentStream = ops.join('\n')
  const streamBytes = new TextEncoder().encode(contentStream)
  const streamLen = streamBytes.length

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamLen} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ]

  let body = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const xrefOffsets: number[] = [0]

  for (const obj of objects) {
    const encoder = new TextEncoder()
    xrefOffsets.push(encoder.encode(body).length)
    body += obj
  }

  const encoder = new TextEncoder()
  const startXref = encoder.encode(body).length
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(xrefOffsets[i]).padStart(10, '0')} 00000 n \n`
  }

  body += xref
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  body += `startxref\n${startXref}\n%%EOF\n`

  return new TextEncoder().encode(body)
}

export function downloadTravelCardPdf(data: TravelCardPdfData): void {
  if (typeof window === 'undefined') return

  const pdfBytes = generateTravelCardPdf(data)
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `travel-safety-card-${data.farmSlug || 'farm'}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
