import L from 'leaflet'
import { toPng } from 'html-to-image'

export interface MapCaptureParams {
  origin?: { lat: number; lng: number; name?: string } | null
  destination: { lat: number; lng: number; name: string }
  routeGeometry?: any | null
  distanceKm?: string | number
  durationText?: string
}

/**
 * Creates an offline vector schematic fallback when map tiles cannot load.
 */
function createVectorFallback(
  width: number,
  height: number,
  title: string,
  originName?: string,
  destName?: string,
  distanceText?: string,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // Background
  ctx.fillStyle = '#f6f8f4'
  ctx.fillRect(0, 0, width, height)

  // Border
  ctx.strokeStyle = '#d4ded1'
  ctx.lineWidth = 2
  ctx.strokeRect(4, 4, width - 8, height - 8)

  // Subtle grid
  ctx.strokeStyle = '#e9efe6'
  ctx.lineWidth = 1
  for (let x = 30; x < width; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 10)
    ctx.lineTo(x, height - 10)
    ctx.stroke()
  }
  for (let y = 30; y < height; y += 40) {
    ctx.beginPath()
    ctx.moveTo(10, y)
    ctx.lineTo(width - 10, y)
    ctx.stroke()
  }

  // Title banner
  ctx.fillStyle = '#1e3a2b'
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif'
  ctx.fillText(title, 20, 28)

  ctx.fillStyle = '#556b2f'
  ctx.font = '11px system-ui, -apple-system, sans-serif'
  ctx.fillText('Offline Schematic View · Scan QR code for live Google Maps', 20, 46)

  // Compass Rose in top-right
  const cx = width - 40
  const cy = 40
  ctx.beginPath()
  ctx.arc(cx, cy, 18, 0, 2 * Math.PI)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = '#1e3a2b'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#1e3a2b'
  ctx.font = 'bold 10px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('N', cx, cy - 6)
  ctx.beginPath()
  ctx.moveTo(cx, cy - 4)
  ctx.lineTo(cx - 3, cy + 8)
  ctx.lineTo(cx, cy + 4)
  ctx.lineTo(cx + 3, cy + 8)
  ctx.closePath()
  ctx.fillStyle = '#c0392b'
  ctx.fill()

  // Route drawing
  const startX = 80
  const startY = height - 70
  const endX = width - 100
  const endY = 110

  // Route line
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.bezierCurveTo(startX + 80, startY - 40, endX - 80, endY + 60, endX, endY)
  ctx.strokeStyle = '#1e3a2b'
  ctx.lineWidth = 4
  ctx.setLineDash([8, 6])
  ctx.stroke()
  ctx.setLineDash([])

  // Start marker
  ctx.beginPath()
  ctx.arc(startX, startY, 7, 0, 2 * Math.PI)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = '#1e3a2b'
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.fillStyle = '#17352b'
  ctx.font = 'bold 11px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`Origin: ${originName || 'Your location'}`, startX - 20, startY + 24)

  // End marker
  ctx.beginPath()
  ctx.arc(endX, endY, 8, 0, 2 * Math.PI)
  ctx.fillStyle = '#1e3a2b'
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#1e3a2b'
  ctx.font = 'bold 11px system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`Destination: ${destName || 'Farm Gate'}`, endX + 20, endY - 14)

  // Distance / time badge
  if (distanceText) {
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(midX - 55, midY - 12, 110, 24)
    ctx.strokeStyle = '#1e3a2b'
    ctx.lineWidth = 1
    ctx.strokeRect(midX - 55, midY - 12, 110, 24)
    ctx.fillStyle = '#1e3a2b'
    ctx.font = 'bold 10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(distanceText, midX, midY + 4)
  }

  return canvas.toDataURL('image/png')
}

/**
 * Renders an off-screen Leaflet map and captures it as a clean data URL.
 */
async function captureOffscreenMap(
  setupFn: (map: L.Map, container: HTMLDivElement) => void,
  fallbackFn: () => string,
  width = 600,
  height = 320,
): Promise<string> {
  if (typeof window === 'undefined') return ''

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '-9999px'
  container.style.width = `${width}px`
  container.style.height = `${height}px`
  container.style.overflow = 'hidden'
  container.style.zIndex = '-9999'
  container.style.background = '#f5f7f3'
  document.body.appendChild(container)

  let map: L.Map | null = null

  try {
    map = L.map(container, {
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: false,
      zoomAnimation: false,
    })

    // CARTO Light English tiles (clean and printable)
    const tileLayer = L.tileLayer(
      'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        crossOrigin: 'anonymous',
      },
    ).addTo(map)

    setupFn(map, container)
    map.invalidateSize()

    // Wait for tiles to finish loading or fallback after timeout
    await new Promise<void>((resolve) => {
      let resolved = false
      const done = () => {
        if (!resolved) {
          resolved = true
          resolve()
        }
      }
      tileLayer.once('load', done)
      setTimeout(done, 2200) // Fallback timeout if slow or offline
    })

    // Short buffer for render pipeline
    await new Promise((r) => setTimeout(r, 150))

    const dataUrl = await toPng(container, {
      pixelRatio: 1.5,
      cacheBust: false,
    })

    return dataUrl || fallbackFn()
  } catch (err) {
    console.warn('Map capture failed, using vector fallback:', err)
    return fallbackFn()
  } finally {
    if (map) {
      try {
        map.remove()
      } catch {
        // ignore
      }
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  }
}

/**
 * Generates both Overview and Close-up maps for the Travel Safety Card PDF.
 */
export async function generateDualMaps(params: MapCaptureParams): Promise<{
  overviewMapDataUrl: string
  closeUpMapDataUrl: string
}> {
  const destLat = params.destination.lat
  const destLng = params.destination.lng
  const destName = params.destination.name
  const origin = params.origin

  // 1. Overview Map
  const overviewMapDataUrl = await captureOffscreenMap(
    (map) => {
      // Destination Marker
      const destIcon = L.divIcon({
        className: 'pdf-dest-marker',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);pointer-events:none;">
            <div style="width:14px;height:14px;border-radius:50%;background:#1e3a2b;border:2.5px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
            <span style="background:#1e3a2b;color:#ffffff;font-size:9.5px;font-weight:700;padding:2px 6px;margin-top:2px;border-radius:2px;white-space:nowrap;">${destName}</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })
      L.marker([destLat, destLng], { icon: destIcon }).addTo(map)

      if (origin && origin.lat && origin.lng) {
        // Origin Marker
        const srcIcon = L.divIcon({
          className: 'pdf-src-marker',
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);pointer-events:none;">
              <div style="width:14px;height:14px;border-radius:50%;background:#ffffff;border:3px solid #1e3a2b;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
              <span style="background:#ffffff;color:#17352b;font-size:9.5px;font-weight:700;padding:1px 5px;border:1px solid #c5d3c2;margin-top:2px;border-radius:2px;white-space:nowrap;">${origin.name || 'Origin'}</span>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        })
        L.marker([origin.lat, origin.lng], { icon: srcIcon }).addTo(map)

        if (params.routeGeometry) {
          const routeLayer = L.geoJSON(params.routeGeometry, {
            style: {
              color: '#1e3a2b',
              weight: 5,
              opacity: 0.9,
            },
          }).addTo(map)
          map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] })
        } else {
          const line = L.polyline(
            [
              [origin.lat, origin.lng],
              [destLat, destLng],
            ],
            {
              color: '#1e3a2b',
              weight: 3.5,
              dashArray: '6, 8',
              opacity: 0.85,
            },
          ).addTo(map)
          map.fitBounds(line.getBounds(), { padding: [40, 40] })
        }
      } else {
        // No origin: overview of surrounding district
        map.setView([destLat, destLng], 11)
      }
    },
    () =>
      createVectorFallback(
        600,
        320,
        'Route Overview Schematic',
        origin?.name,
        destName,
        params.distanceKm ? `${params.distanceKm} km · ${params.durationText || ''}` : undefined,
      ),
    600,
    320,
  )

  // 2. Close-up Map (last 5 to 10 km around farm gate)
  const closeUpMapDataUrl = await captureOffscreenMap(
    (map) => {
      map.setView([destLat, destLng], 14)

      // Prominent Farm Gate Marker
      const gateIcon = L.divIcon({
        className: 'pdf-gate-marker',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);pointer-events:none;">
            <div style="width:16px;height:16px;border-radius:50%;background:#c0392b;border:2.5px solid #ffffff;box-shadow:0 1px 5px rgba(0,0,0,0.45);"></div>
            <span style="background:#1e3a2b;color:#ffffff;font-size:10px;font-weight:700;padding:2px 7px;margin-top:3px;border-radius:2px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.25);">Farm Gate: ${destName}</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })
      L.marker([destLat, destLng], { icon: gateIcon }).addTo(map)

      // Radius circle showing immediate 2 km vicinity
      L.circle([destLat, destLng], {
        radius: 1200,
        color: '#1e3a2b',
        fillColor: '#245441',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '4, 6',
      }).addTo(map)
    },
    () =>
      createVectorFallback(
        600,
        320,
        'Farm Gate Vicinity (Last 5-10 km)',
        'Rural access road',
        `${destName} Gate`,
        'Immediate vicinity',
      ),
    600,
    320,
  )

  return {
    overviewMapDataUrl,
    closeUpMapDataUrl,
  }
}
