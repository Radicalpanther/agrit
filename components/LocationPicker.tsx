'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export interface LocationPickerProps {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}

export function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    let isMounted = true

    // Dynamically import Leaflet in browser
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return

      // Clean up previous map if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      const initialLat = lat || 18.5204
      const initialLng = lng || 73.8567

      // Fix default Leaflet icon paths in Next.js bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapContainerRef.current).setView(
        [initialLat, initialLng],
        lat && lng ? 11 : 7,
      )
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map)

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
      }).addTo(map)
      markerRef.current = marker

      // Handle marker drag
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        const newLat = Math.round(pos.lat * 1000000) / 1000000
        const newLng = Math.round(pos.lng * 1000000) / 1000000
        onChange(newLat, newLng)
      })

      // Handle click on map to move pin
      map.on('click', (e: any) => {
        const clickLat = Math.round(e.latlng.lat * 1000000) / 1000000
        const clickLng = Math.round(e.latlng.lng * 1000000) / 1000000
        marker.setLatLng([clickLat, clickLng])
        onChange(clickLat, clickLng)
      })

      setTimeout(() => {
        map.invalidateSize()
      }, 200)
    })

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update marker position if external lat/lng changes
  useEffect(() => {
    if (markerRef.current && lat && lng) {
      markerRef.current.setLatLng([lat, lng])
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([lat, lng])
      }
    }
  }, [lat, lng])

  return (
    <div style={{ marginTop: '4px' }}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '240px',
          border: '1px solid var(--line)',
          background: '#eef2ec',
          borderRadius: '2px',
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: 'var(--muted)',
          marginTop: '6px',
        }}
      >
        <span>
          Pinned coordinates:{' '}
          <strong style={{ color: 'var(--forest)' }}>
            {lat.toFixed(6)}° N, {lng.toFixed(6)}° E
          </strong>
        </span>
        <span>Tap map or drag pin to adjust</span>
      </div>
    </div>
  )
}
