'use client'

import { useState, useEffect, useRef, memo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapPin,
  Navigation,
  Compass,
  ExternalLink,
  Download,
  Search,
  LocateFixed,
  AlertCircle,
  Clock,
  Route as RouteIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { haversineDistanceKm } from '@/lib/geo'
import { downloadTravelSafetyCardPdf } from '@/lib/travel-card-pdf'

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
  onInteraction?: () => void
}

interface SourceLocation {
  name: string
  lat: number
  lng: number
}

interface ExtendedRouteSummary {
  distanceKm: string
  durationText: string
  durationSeconds?: number
  isFallback: boolean
  steps?: any[]
  geometry?: any
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
    guestName,
    checkInDate,
    visitType,
    guests,
    bookingStatus,
    reservations,
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
        : Array.isArray(farm.raw?.directions_steps) && farm.raw.directions_steps.length > 0
        ? farm.raw.directions_steps
        : [
            'Take state highway towards village exit',
            'Follow hand-painted farm stay signboard at the crossroad',
          ]

    const landmarkNote =
      farm.landmark_note ?? farm.landmarkNote ?? farm.raw?.landmark_note ?? null
    const landmarks = Array.isArray(farm.landmarks)
      ? farm.landmarks
      : Array.isArray(farm.raw?.landmarks)
      ? farm.raw.landmarks
      : []
    const nearbyServices =
      farm.nearby_services || farm.nearbyServices || farm.raw?.nearby_services || {}

    const storageKey = `agritrail:origin:${bookingId || farm.slug || 'default'}`

    const [source, setSource] = useState<SourceLocation | null>(null)
    const [otherInput, setOtherInput] = useState('')
    const [isLocating, setIsLocating] = useState(false)
    const [isGeocoding, setIsGeocoding] = useState(false)
    const [geocodeError, setGeocodeError] = useState<string | null>(null)
    const [routeInfo, setRouteInfo] = useState<ExtendedRouteSummary | null>(null)
    const [isRouting, setIsRouting] = useState(false)
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<L.Map | null>(null)
    const sourceMarkerRef = useRef<L.Marker | null>(null)
    const routeLayerRef = useRef<L.Layer | null>(null)

    // Navigation URLs
    const googleMapsUrl = source
      ? `https://www.google.com/maps/dir/?api=1&origin=${source.lat},${source.lng}&destination=${destLat},${destLng}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`

    const destinationPinUrl = `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`

    // 1. Restore saved source from localStorage on mount
    useEffect(() => {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
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

      // Destination Marker
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

      const t1 = setTimeout(() => map.invalidateSize(), 100)
      const t2 = setTimeout(() => map.invalidateSize(), 350)

      const handleResize = () => map.invalidateSize()
      window.addEventListener('resize', handleResize)

      const ro = new ResizeObserver(() => map.invalidateSize())
      ro.observe(mapContainerRef.current)

      const handleMapUserAction = () => onInteraction?.()
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

      if (sourceMarkerRef.current) {
        map.removeLayer(sourceMarkerRef.current)
        sourceMarkerRef.current = null
      }

      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current)
        routeLayerRef.current = null
      }

      if (!source) {
        setRouteInfo(null)
        map.setView([destLat, destLng], 12)
        return
      }

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

      setIsRouting(true)
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${source.lng},${source.lat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`

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
            const timeText = hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min driving`

            setRouteInfo({
              distanceKm: km,
              durationText: timeText,
              durationSeconds: totalSec,
              isFallback: false,
              steps: route.legs && route.legs[0] ? route.legs[0].steps : [],
              geometry: route.geometry,
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
          const straightKm = haversineDistanceKm(
            source.lat,
            source.lng,
            destLat,
            destLng,
          ).toFixed(1)
          const fallbackSec = Math.round((Number(straightKm) / 45) * 3600)
          setRouteInfo({
            distanceKm: straightKm,
            durationText: '',
            durationSeconds: fallbackSec,
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

    // Download Redesigned 2-Page A4 PDF
    const handleDownloadPdf = async () => {
      setIsGeneratingPdf(true)
      try {
        await downloadTravelSafetyCardPdf({
          farm,
          bookingId,
          guestName,
          checkInDate,
          visitType,
          guests,
          bookingStatus,
          reservations,
          source,
          routeInfo,
        })
      } catch (err) {
        console.error('Failed to generate PDF:', err)
      } finally {
        setIsGeneratingPdf(false)
      }
    }

    return (
      <div
        className="trip-map-container"
        onPointerDown={onInteraction}
        onFocusCapture={onInteraction}
      >
        {/* ================================================================= */}
        {/* INTERACTIVE CONTROLS (Screen Only) */}
        {/* ================================================================= */}
        <div className="trip-map-source-bar print:hidden">
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
            className="print:hidden"
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

        {!source && (
          <div
            className="print:hidden"
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

        {source && (
          <div
            className="print:hidden"
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
              <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
                {t('calculatingRoute')}
              </span>
            ) : routeInfo ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginLeft: 'auto',
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--forest)' }}>
                  {routeInfo.distanceKm} km
                </span>
                {routeInfo.durationText && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--muted)',
                      fontSize: '11px',
                    }}
                  >
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

        {/* ================================================================= */}
        {/* LEAFLET MAP VIEW (On-screen) */}
        {/* ================================================================= */}
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

        {/* ================================================================= */}
        {/* ACTION BUTTONS (Interactive On-Screen) */}
        {/* ================================================================= */}
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

          <a
            href={destinationPinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="trip-map-source-btn min-h-[44px] px-3.5 py-2.5 w-full justify-center"
            style={{ textDecoration: 'none' }}
          >
            <MapPin size={13} /> {t('openDestinationPin')}
          </a>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="trip-map-source-btn min-h-[44px] px-3.5 py-2.5 w-full justify-center"
            style={{ background: 'var(--mint)', color: 'var(--forest)', fontWeight: 700 }}
          >
            <Download size={13} />
            {isGeneratingPdf ? t('generatingPdf') : t('downloadPdf')}
          </button>
        </div>
      </div>
    )
  },
(prev, next) => {
    return (
      prev.bookingId === next.bookingId &&
      prev.guestName === next.guestName &&
      prev.checkInDate === next.checkInDate &&
      prev.visitType === next.visitType &&
      prev.guests === next.guests &&
      prev.bookingStatus === next.bookingStatus &&
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
  },
)
