'use client'

import { useState, useEffect, useRef, memo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapPin,
  Navigation,
  Compass,
  Phone,
  PhoneCall,
  ExternalLink,
  Download,
  Copy,
  Check,
  Search,
  LocateFixed,
  AlertCircle,
  Clock,
  Route as RouteIcon,
  Printer,
} from 'lucide-react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { useTranslations } from 'next-intl'
import { haversineDistanceKm } from '@/lib/geo'

export interface TripMapProps {
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
    [key: string]: any
  }
  bookingId?: string
  checkInDate?: string
  visitType?: string
  guests?: number
  onInteraction?: () => void
}

interface SourceLocation {
  name: string
  lat: number
  lng: number
}

interface RouteSummary {
  distanceKm: string
  durationText: string
  isFallback: boolean
}

const PRESET_CITIES: SourceLocation[] = [
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Navi Mumbai', lat: 19.033, lng: 73.0297 },
  { name: 'Panvel', lat: 18.9894, lng: 73.1175 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Thane', lat: 19.2183, lng: 72.9781 },
  { name: 'Nashik', lat: 19.9975, lng: 73.7898 },
]

export const TripMap = memo(
  function TripMap({
    farm,
    bookingId,
    checkInDate,
    visitType,
    guests,
    onInteraction,
  }: TripMapProps) {

  const t = useTranslations('travelCard')
  const destLat = Number(farm.lat) || Number(farm.raw?.lat) || 17.0016
  const destLng = Number(farm.lng) || Number(farm.raw?.lng) || 73.312
  const hostName =
    farm.host_name || farm.hostName || farm.raw?.host_name || 'Rajesh Patil'
  const hostPhone =
    farm.host_phone || farm.hostPhone || farm.raw?.host_phone || '+919800000002'

  const directionsSteps: string[] =
    Array.isArray(farm.directions_steps) && farm.directions_steps.length > 0
      ? farm.directions_steps
      : Array.isArray(farm.directionsSteps) && farm.directionsSteps.length > 0
      ? farm.directionsSteps
      : Array.isArray(farm.raw?.directions_steps) &&
        farm.raw.directions_steps.length > 0
      ? farm.raw.directions_steps
      : [
          'Take NH66 towards Ratnagiri',
          'Turn at Mirya phata',
          'Follow the board at the mango grove',
        ]

  const landmarkNote =
    farm.landmark_note ?? farm.landmarkNote ?? farm.raw?.landmark_note ?? null

  const storageKey = `agritrail:origin:${bookingId || farm.slug || 'default'}`

  const [source, setSource] = useState<SourceLocation | null>(null)
  const [otherInput, setOtherInput] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const [routeInfo, setRouteInfo] = useState<RouteSummary | null>(null)
  const [isRouting, setIsRouting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const sourceMarkerRef = useRef<L.Marker | null>(null)
  const routeLayerRef = useRef<L.Layer | null>(null)

  // 1. Restore saved source from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (
          parsed &&
          typeof parsed.lat === 'number' &&
          typeof parsed.lng === 'number'
        ) {
          setSource(parsed)
        }
      }
    } catch {
      // ignore
    }
  }, [storageKey])

  // Helper to persist chosen source
  const handleSaveSource = (newSource: SourceLocation | null) => {
    onInteraction?.()
    setSource(newSource)
    setGeocodeError(null)
    try {
      if (newSource) {
        localStorage.setItem(storageKey, JSON.stringify(newSource))
      } else {
        localStorage.removeItem(storageKey)
      }
    } catch {
      // ignore
    }
  }

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    // Clean previous map instance if any
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const map = L.map(mapContainerRef.current, {
      center: [destLat, destLng],
      zoom: 12,
      zoomControl: true,
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      crossOrigin: true,
    }).addTo(map)

    // Destination Marker: Filled circle labelled with farm name
    const destIcon = L.divIcon({
      className: 'trip-map-dest-marker',
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);pointer-events:none;">
          <div style="width:14px;height:14px;border-radius:50%;background:#245441;border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>
          <span style="background:#245441;color:#ffffff;font-size:10px;font-weight:700;padding:2px 7px;margin-top:3px;white-space:nowrap;border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.25);">${farm.name}</span>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    })

    L.marker([destLat, destLng], { icon: destIcon }).addTo(map)

    mapRef.current = map

    // Invalidate size after mount and observe size changes
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 350)

    const handleResize = () => {
      map.invalidateSize()
    }
    window.addEventListener('resize', handleResize)

    const ro = new ResizeObserver(() => {
      map.invalidateSize()
    })
    ro.observe(mapContainerRef.current)

    const handleMapUserAction = () => {
      onInteraction?.()
    }
    map.on('movestart zoomstart dragstart', handleMapUserAction)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', handleResize)
      ro.disconnect()
      map.off('movestart zoomstart dragstart', handleMapUserAction)
      map.remove()
      mapRef.current = null
    }
  }, [destLat, destLng, farm.name, onInteraction])

  // 3. Update route and source marker when source changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clean existing source marker
    if (sourceMarkerRef.current) {
      map.removeLayer(sourceMarkerRef.current)
      sourceMarkerRef.current = null
    }

    // Clean existing route layer
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current)
      routeLayerRef.current = null
    }

    if (!source) {
      setRouteInfo(null)
      map.setView([destLat, destLng], 12)
      return
    }

    // Source Marker: Hollow circle labelled "You"
    const sourceIcon = L.divIcon({
      className: 'trip-map-source-marker',
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);pointer-events:none;">
          <div style="width:14px;height:14px;border-radius:50%;border:3px solid #245441;background:#ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>
          <span style="background:#ffffff;color:#17352b;font-size:10px;font-weight:700;padding:1px 6px;border:1px solid #dce4da;margin-top:3px;white-space:nowrap;border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.15);">You</span>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    })

    const srcMarker = L.marker([source.lat, source.lng], {
      icon: sourceIcon,
    }).addTo(map)
    sourceMarkerRef.current = srcMarker

    // Call Public OSRM Demo routing API
    setIsRouting(true)
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${source.lng},${source.lat};${destLng},${destLat}?overview=full&geometries=geojson`

    fetch(osrmUrl)
      .then((res) => {
        if (!res.ok) throw new Error('OSRM routing request failed')
        return res.json()
      })
      .then((data) => {
        if (data && data.routes && data.routes.length > 0) {
          const route = data.routes[0]
          const km = (route.distance / 1000).toFixed(1)
          const totalSec = route.duration
          const hrs = Math.floor(totalSec / 3600)
          const mins = Math.round((totalSec % 3600) / 60)
          const timeText =
            hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min driving`

          setRouteInfo({
            distanceKm: km,
            durationText: timeText,
            isFallback: false,
          })

          const geoLayer = L.geoJSON(route.geometry, {
            style: {
              color: '#245441',
              weight: 5,
              opacity: 0.85,
            },
          }).addTo(map)
          routeLayerRef.current = geoLayer
          map.fitBounds(geoLayer.getBounds(), { padding: [35, 35] })
        } else {
          throw new Error('No route returned')
        }
      })
      .catch(() => {
        // Fallback straight-line
        const straightKm = haversineDistanceKm(
          source.lat,
          source.lng,
          destLat,
          destLng,
        ).toFixed(1)
        setRouteInfo({
          distanceKm: straightKm,
          durationText: '',
          isFallback: true,
        })

        const line = L.polyline(
          [
            [source.lat, source.lng],
            [destLat, destLng],
          ],
          {
            color: '#245441',
            weight: 3,
            dashArray: '6, 8',
            opacity: 0.8,
          },
        ).addTo(map)
        routeLayerRef.current = line
        map.fitBounds(
          L.latLngBounds([
            [source.lat, source.lng],
            [destLat, destLng],
          ]),
          { padding: [35, 35] },
        )
      })
      .finally(() => {
        setIsRouting(false)
        map.invalidateSize()
      })
  }, [source, destLat, destLng])

  // Handle "Use my location"
  const handleUseLocation = () => {
    onInteraction?.()
    if (!navigator.geolocation) {
      setGeocodeError('Geolocation is not supported by your browser')
      return
    }
    setIsLocating(true)
    setGeocodeError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        handleSaveSource({
          name: 'My location',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      (err) => {
        setIsLocating(false)
        setGeocodeError(err.message || 'Unable to retrieve location')
      },
      { timeout: 10000, enableHighAccuracy: true },
    )
  }

  // Handle Nominatim search for "Other place"
  const handleOtherSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    onInteraction?.()
    const query = otherInput.trim()
    if (!query || isGeocoding) return

    setIsGeocoding(true)
    setGeocodeError(null)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { Accept: 'application/json' } },
      )
      if (!res.ok) throw new Error('Geocoding error')
      const results = await res.json()
      if (Array.isArray(results) && results.length > 0) {
        const item = results[0]
        const lat = parseFloat(item.lat)
        const lng = parseFloat(item.lon)
        const name = item.display_name.split(',')[0].trim() || query
        handleSaveSource({ name, lat, lng })
        setOtherInput('')
      } else {
        setGeocodeError(`No location found for "${query}". Try a nearby town.`)
      }
    } catch {
      setGeocodeError(`Unable to geocode "${query}". Please check connection.`)
    } finally {
      setIsGeocoding(false)
    }
  }

  // Copy GPS Coordinates
  const handleCopyCoords = () => {
    const text = `${destLat.toFixed(6)}, ${destLng.toFixed(6)}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Generate Map PDF with html-to-image and jsPDF
  const handleDownloadPdf = async () => {
    if (!mapContainerRef.current) return
    setIsGeneratingPdf(true)
    try {
      const dataUrl = await toPng(mapContainerRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      })

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 40
      let y = margin

      // Header Banner
      doc.setFillColor(36, 84, 65) // var(--forest)
      doc.rect(margin, y, pageWidth - margin * 2, 44, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text('AGRITRAILS  TRAVEL & ROUTE MAP', margin + 14, y + 26)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(
        'Printable rural access details and emergency coordinates',
        margin + 14,
        y + 38,
      )
      y += 56

      // Farm Information
      doc.setTextColor(23, 53, 43)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(15)
      doc.text(farm.name, margin, y)
      y += 16

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(110, 127, 116)
      doc.text(`${farm.place || ''} · ${farm.region || ''}`, margin, y)
      y += 16

      // Route Info
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(23, 53, 43)
      if (source) {
        doc.text(
          `Origin: ${source.name} (${source.lat.toFixed(4)}, ${source.lng.toFixed(4)})`,
          margin,
          y,
        )
        y += 14
        const routeText = routeInfo
          ? routeInfo.isFallback
            ? `Approximate straight-line distance: ${routeInfo.distanceKm} km (driving route unavailable)`
            : `Driving Distance: ${routeInfo.distanceKm} km · Estimated drive time: ${routeInfo.durationText}`
          : `Straight-line distance: ${haversineDistanceKm(source.lat, source.lng, destLat, destLng)} km`
        doc.text(routeText, margin, y)
        y += 16
      }
      doc.text(
        `Destination Gate GPS: ${destLat.toFixed(6)} N, ${destLng.toFixed(6)} E`,
        margin,
        y,
      )
      y += 18

      // Map Image
      const imgWidth = pageWidth - margin * 2
      const imgHeight = 180
      doc.addImage(dataUrl, 'PNG', margin, y, imgWidth, imgHeight)
      y += imgHeight + 18

      // Numbered Directions
      if (directionsSteps.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10.5)
        doc.setTextColor(36, 84, 65)
        doc.text('Landmark-based Directions:', margin, y)
        y += 14

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(40, 40, 40)
        directionsSteps.forEach((step, idx) => {
          const split = doc.splitTextToSize(
            `${idx + 1}. ${step}`,
            pageWidth - margin * 2,
          )
          doc.text(split, margin + 2, y)
          y += split.length * 11 + 2
        })
        y += 6
      }

      // Landmark Note
      if (landmarkNote) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(36, 84, 65)
        doc.text(`Key Visual Landmark: ${landmarkNote}`, margin, y)
        y += 16
      }

      // Host Emergency Contact Box
      doc.setFillColor(232, 240, 228)
      doc.rect(margin, y, pageWidth - margin * 2, 38, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(36, 84, 65)
      doc.text(
        `Host Contact: ${hostName} · Phone: ${hostPhone}`,
        margin + 12,
        y + 16,
      )
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(110, 127, 116)
      doc.text(
        'Cellular voice and SMS work even when mobile data drops along rural roads.',
        margin + 12,
        y + 28,
      )

      doc.save(`AgriTrails-${farm.slug || 'farm'}-route-map.pdf`)
    } catch (err) {
      console.error('Failed to generate PDF:', err)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Google Maps Directions Link
  const googleMapsUrl = source
    ? `https://www.google.com/maps/dir/?api=1&origin=${source.lat},${source.lng}&destination=${destLat},${destLng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`

  return (
    <div
      className="trip-map-container"
      onPointerDown={onInteraction}
      onFocusCapture={onInteraction}
    >
      {/* Top Source Selection Bar */}
      <div className="trip-map-source-bar">
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--ink)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Navigation size={13} color="var(--forest)" /> {t('travellingFrom')}
        </span>

        {/* 1. Use My Location Button */}
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={isLocating}
          className="trip-map-source-btn"
          title={t('detectLocationTitle')}
        >
          <LocateFixed size={12} />
          {isLocating ? t('detecting') : t('useMyLocation')}
        </button>

        {/* 2. Preset City Select */}
        <select
          value={
            PRESET_CITIES.find(
              (c) =>
                source &&
                Math.abs(c.lat - source.lat) < 0.01 &&
                Math.abs(c.lng - source.lng) < 0.01,
            )?.name || ''
          }
          onChange={(e) => {
            const city = PRESET_CITIES.find((c) => c.name === e.target.value)
            if (city) handleSaveSource(city)
          }}
          className="trip-map-select"
          aria-label={t('selectCity')}
        >
          <option value="">{t('selectCity')}</option>
          {PRESET_CITIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        {/* 3. Other Place Geocoding Form */}
        <form onSubmit={handleOtherSubmit} className="trip-map-geocode-form">
          <input
            type="text"
            placeholder={t('otherTownPlaceholder')}
            value={otherInput}
            onChange={(e) => setOtherInput(e.target.value)}
            disabled={isGeocoding}
            className="trip-map-geocode-input"
          />
          <button
            type="submit"
            disabled={isGeocoding || !otherInput.trim()}
            className="trip-map-source-btn"
          >
            <Search size={11} />
            {isGeocoding ? t('finding') : t('set')}
          </button>
        </form>

        {source && (
          <button
            type="button"
            onClick={() => handleSaveSource(null)}
            style={{
              fontSize: '11px',
              color: 'var(--muted)',
              textDecoration: 'underline',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            {t('clearOrigin')}
          </button>
        )}
      </div>

      {geocodeError && (
        <div
          style={{
            background: '#fff2f0',
            borderBottom: '1px solid #ffccc7',
            padding: '7px 14px',
            fontSize: '11px',
            color: '#cf1322',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <AlertCircle size={13} />
          <span>{geocodeError}</span>
        </div>
      )}

      {/* Prompt when source is not chosen */}
      {!source && (
        <div
          style={{
            background: 'var(--mint)',
            borderBottom: '1px solid var(--line)',
            padding: '8px 14px',
            fontSize: '12px',
            color: 'var(--forest)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Compass size={14} />
          <span>{t('whereTravellingFrom')}</span>
        </div>
      )}

      {/* Route Status Summary when source chosen */}
      {source && (
        <div
          style={{
            background: '#f9faf7',
            borderBottom: '1px solid var(--line)',
            padding: '8px 14px',
            fontSize: '12px',
            color: 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <RouteIcon size={13} color="var(--forest)" />
            <span>
              {t('route')} <strong>{source.name}</strong> &rarr; <strong>{farm.name}</strong>
            </span>
          </div>

          {isRouting ? (
            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{t('calculatingRoute')}</span>
          ) : routeInfo ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
              <span style={{ fontWeight: 700, color: 'var(--forest)' }}>
                {routeInfo.distanceKm} km
              </span>
              {routeInfo.durationText && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontSize: '11px' }}>
                  <Clock size={12} /> {routeInfo.durationText}
                </span>
              )}
              {routeInfo.isFallback && (
                <span style={{ color: '#d97706', fontSize: '11px' }}>
                  {t('straightLineNotice')}
                </span>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Leaflet Map View Container */}
      <div
        ref={mapContainerRef}
        className="trip-map-view h-64 sm:h-72 md:h-80 lg:h-96 w-full relative overflow-hidden z-0 [isolation:isolate] bg-[#eef3eb]"
        style={{
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          isolation: 'isolate',
          zIndex: 0,
        }}
      />

      {/* Map Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-white border-t border-[var(--line)] w-full box-border">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="trip-map-source-btn min-h-[44px] px-3.5 py-2.5 w-full justify-center"
          style={{ textDecoration: 'none' }}
        >
          <ExternalLink size={13} /> {t('openGoogleMaps')}
        </a>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="trip-map-source-btn min-h-[44px] px-3.5 py-2.5 w-full justify-center"
        >
          <Download size={13} />
          {isGeneratingPdf ? t('generatingPdf') : t('downloadPdf')}
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="trip-map-source-btn min-h-[44px] px-3.5 py-2.5 w-full justify-center"
        >
          <Printer size={13} />
          {t('printCard')}
        </button>
      </div>

      {/* GPS Coordinates & Emergency Safety Block (Level 1 & Level 2) */}
      <div className="p-3.5 sm:p-4 bg-[#fafbf9] border-t border-[var(--line)] w-full box-border">
        {/* Farm GPS Coordinates */}
        <div className="gps-coordinate-box w-full m-0 mb-3.5 box-border">
          <div className="gps-header-row flex justify-between items-center flex-wrap gap-2 mb-2">
            <span className="gps-label inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--forest)]">
              <MapPin size={13} /> {t('destinationGps')}
            </span>
            <button
              type="button"
              className="copy-coords-btn min-h-[44px] px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer bg-white border border-[var(--line)] hover:border-[var(--forest)] hover:text-[var(--forest)] transition-colors"
              onClick={handleCopyCoords}
            >
              {copied ? <Check size={13} color="var(--forest)" /> : <Copy size={13} />}
              {copied ? t('copied') : t('copyCoordinates')}
            </button>
          </div>
          <div className="gps-display-large font-mono text-lg sm:text-2xl font-extrabold text-[var(--ink)] break-all [overflow-wrap:anywhere] flex items-center gap-2 flex-wrap my-1.5">
            <span>{destLat.toFixed(6)}° N</span>
            <span className="gps-sep text-[var(--leaf)]">,</span>
            <span>{destLng.toFixed(6)}° E</span>
          </div>
          <div className="gps-sub-info text-xs text-[var(--muted)] break-words [overflow-wrap:anywhere]">
            {t('decimalNote', { coords: `${destLat.toFixed(6)}, ${destLng.toFixed(6)}` })}
          </div>
        </div>

        {/* Numbered Directions */}
        {directionsSteps.length > 0 && (
          <div className="mt-3 w-full break-words [overflow-wrap:anywhere]">
            <h4
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--ink)',
                margin: '0 0 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Navigation size={13} color="var(--forest)" /> {t('landmarkDirections')}
            </h4>
            <ol className="m-0 pl-5 text-xs text-[#53685d] leading-relaxed break-words [overflow-wrap:anywhere]">
              {directionsSteps.map((step, idx) => (
                <li key={idx} className="mb-1 break-words [overflow-wrap:anywhere]">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {landmarkNote && (
          <div
            className="mt-2.5 p-2.5 bg-[var(--cream)] border border-[var(--line)] text-xs text-[var(--ink)] flex items-center gap-2 break-words [overflow-wrap:anywhere] w-full box-border"
          >
            <AlertCircle size={14} color="var(--forest)" style={{ flexShrink: 0 }} />
            <span className="break-words [overflow-wrap:anywhere]">
              <strong>{t('keyVisualLandmark')}</strong> {landmarkNote}
            </span>
          </div>
        )}

        {/* Safety Links: Call Host, Call 112, Share location SMS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3.5 w-full box-border">
          <a
            href={`tel:${hostPhone}`}
            className="trip-map-source-btn min-h-[44px] px-3.5 py-2.5 w-full justify-center"
            style={{
              background: 'var(--mint)',
              color: 'var(--forest)',
              border: '1px solid var(--forest)',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            <Phone size={14} /> {t('callHost', { phone: hostPhone })}
          </a>
          <a
            href="tel:112"
            className="trip-map-source-btn min-h-[44px] px-3.5 py-2.5 w-full justify-center"
            style={{
              background: '#fdf2f2',
              color: '#c53030',
              border: '1px solid #c53030',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            <Phone size={14} /> {t('call112')}
          </a>
          <a
            href={`sms:?body=${encodeURIComponent(
              t('smsLocationBody', {
                farmName: farm.name,
                bookingId: bookingId || 'N/A',
                lat: destLat.toFixed(4),
                lng: destLng.toFixed(4),
                origin: source ? source.name : 'Current location',
              }),
            )}`}
            className="trip-map-source-btn min-h-[44px] px-3.5 py-2.5 w-full justify-center"
            style={{
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            <PhoneCall size={14} /> {t('shareLocationSms')}
          </a>
        </div>
      </div>
    </div>
  )
}, (prev, next) => {
  return (
    prev.bookingId === next.bookingId &&
    prev.checkInDate === next.checkInDate &&
    prev.visitType === next.visitType &&
    prev.guests === next.guests &&
    prev.farm?.id === next.farm?.id &&
    prev.farm?.name === next.farm?.name &&
    prev.farm?.slug === next.farm?.slug &&
    Number(prev.farm?.lat) === Number(next.farm?.lat) &&
    Number(prev.farm?.lng) === Number(next.farm?.lng) &&
    (prev.farm?.host_name || prev.farm?.hostName) ===
      (next.farm?.host_name || next.farm?.hostName) &&
    (prev.farm?.host_phone || prev.farm?.hostPhone) ===
      (next.farm?.host_phone || next.farm?.hostPhone) &&
    prev.farm?.landmark_note === next.farm?.landmark_note
  )
})

