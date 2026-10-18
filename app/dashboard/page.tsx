'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Eye,
  EyeOff,
  MapPin,
  Plus,
  ShoppingBasket,
  Trash2,
  X,
  PackageCheck,
  Clock,
  Sparkles,
  Info,
  Compass,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  RotateCw,
} from 'lucide-react'
import { formatRupees } from '@/lib/money'
import { TelegramConnect } from '@/components/TelegramConnect'
import { useTranslations, useLocale } from 'next-intl'
import dynamic from 'next/dynamic'

const LocationPicker = dynamic(
  () => import('@/components/LocationPicker').then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: '240px',
          background: '#eef2ec',
          border: '1px solid var(--line)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--muted)',
          fontSize: '12px',
        }}
      >
        Loading map...
      </div>
    ),
  },
)

const TripMap = dynamic(
  () => import('@/components/TripMap').then((m) => m.TripMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: '240px',
          background: '#f4f6f2',
          border: '1px solid var(--line)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--muted)',
          fontSize: '12px',
        }}
      >
        Loading travel map...
      </div>
    ),
  },
)

interface FarmerData {
  farmerId: string
  profile: { full_name: string; phone?: string; role: string }
  isDemo: boolean
  stats: {
    upcomingGuests: number
    thisMonthEarningsPaise: number
    newProduceOrders: number
  }
  farms: any[]
  bookings: any[]
  products: any[]
  reservations: any[]
  availableCrops: any[]
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const tBooking = useTranslations('booking')
  const locale = useLocale()

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: tBooking('statuses.pending'),
      confirmed: tBooking('statuses.confirmed'),
      declined: tBooking('statuses.declined'),
      completed: tBooking('statuses.completed'),
      cancelled: tBooking('statuses.cancelled'),
    }
    return map[status.toLowerCase()] || status
  }

  const getReservationStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      reserved: t('inventory.reservationStatuses.reserved'),
      ready: t('inventory.reservationStatuses.ready'),
      collected: t('inventory.reservationStatuses.collected'),
      cancelled: t('inventory.reservationStatuses.cancelled'),
    }
    return map[status.toLowerCase()] || status
  }

  const [data, setData] = useState<FarmerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Listing modal state
  const [isListingModalOpen, setIsListingModalOpen] = useState(false)
  const [editingFarmId, setEditingFarmId] = useState<string | null>(null)
  const [listingSubmitting, setListingSubmitting] = useState(false)
  const [listingFormError, setListingFormError] = useState<string | null>(null)

  // Listing Form Fields
  const [name, setName] = useState('')
  const [place, setPlace] = useState('')
  const [region, setRegion] = useState('Maharashtra')
  const [description, setDescription] = useState('')
  const [pricePaise, setPricePaise] = useState(250000)
  const [allowsDayVisit, setAllowsDayVisit] = useState(false)
  const [dayVisitPricePaise, setDayVisitPricePaise] = useState<number | ''>(85000)
  const [dayVisitStart, setDayVisitStart] = useState('09:00')
  const [dayVisitEnd, setDayVisitEnd] = useState('17:00')
  const [maxGuests, setMaxGuests] = useState(4)
  const [tagsInput, setTagsInput] = useState('organic, family, harvest')
  const [hostName, setHostName] = useState('')
  const [hostPhone, setHostPhone] = useState('')
  const [landmarkNote, setLandmarkNote] = useState('')
  const [directionsSteps, setDirectionsSteps] = useState<string[]>([
    'Take state highway towards village exit',
    'Follow hand-painted farm stay signboard at the crossroad',
  ])
  const [landmarks, setLandmarks] = useState<
    Array<{ name: string; type: string; note: string; distance_km_to_farm: number | '' }>
  >([])
  const [nearbyServices, setNearbyServices] = useState<{
    fuel?: { name?: string; distance_km?: number | ''; phone?: string }
    atm?: { name?: string; distance_km?: number | '' }
    pharmacy?: { name?: string; distance_km?: number | ''; phone?: string }
    grocery?: { name?: string; distance_km?: number | '' }
    hospital?: { name?: string; distance_km?: number | ''; phone?: string }
    police?: { name?: string; distance_km?: number | ''; phone?: string }
  }>({})
  const [selectedCropIds, setSelectedCropIds] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState(
    'https://i.ibb.co/CsKRHJv0/images.jpg',
  )
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [additionalImageUrl, setAdditionalImageUrl] = useState('')
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [lat, setLat] = useState(17.0016)
  const [lng, setLng] = useState(73.312)
  const [published, setPublished] = useState(true)

  // Add Product Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [productFarmId, setProductFarmId] = useState('')
  const [productName, setProductName] = useState('')
  const [productDetail, setProductDetail] = useState('')
  const [productUnit, setProductUnit] = useState('1 kg')
  const [productPricePaise, setProductPricePaise] = useState(25000)
  const [productStock, setProductStock] = useState(20)
  const [productSubmitting, setProductSubmitting] = useState(false)
  const [productError, setProductError] = useState<string | null>(null)
  const [showAllProducts, setShowAllProducts] = useState(false)

  // View mode switcher: 'farmer' or 'tourist'
  const [viewMode, setViewMode] = useState<'farmer' | 'tourist'>('farmer')
  const [touristData, setTouristData] = useState<{ profile: any; bookings: any[] } | null>(null)
  const [touristLoading, setTouristLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [touristError, setTouristError] = useState<string | null>(null)
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null)

  const touristAbortControllerRef = useRef<AbortController | null>(null)
  const touristDataRef = useRef(touristData)
  touristDataRef.current = touristData
  const lastMapInteractionRef = useRef<number>(0)

  const handleMapInteraction = useCallback(() => {
    lastMapInteractionRef.current = Date.now()
  }, [])

  const loadTouristData = useCallback(async (isManualTrigger = false) => {
    if (touristAbortControllerRef.current) {
      touristAbortControllerRef.current.abort()
    }
    const controller = new AbortController()
    touristAbortControllerRef.current = controller

    // Full page loading state only when no cached data is present
    if (!touristDataRef.current) {
      setTouristLoading(true)
    } else if (isManualTrigger) {
      setIsRefreshing(true)
    }

    try {
      const res = await fetch('/api/tourist/bookings', {
        signal: controller.signal,
      })
      if (!res.ok) {
        throw new Error(`Failed to load tourist bookings (${res.status})`)
      }
      const json = await res.json()
      setTouristData(json)
      setTouristError(null)
      if (json.bookings?.length > 0) {
        setExpandedBookingId((prev) => prev || json.bookings[0].id)
      }
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string }
      if (err?.name === 'AbortError') {
        return
      }
      console.error('Error fetching tourist bookings', e)
      if (!touristDataRef.current) {
        setTouristError(err?.message || 'Failed to load bookings')
      }
    } finally {
      if (touristAbortControllerRef.current === controller) {
        touristAbortControllerRef.current = null
        setTouristLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      const res = await fetch('/api/farmer/overview')
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 403) {
          // Current user is a tourist viewing dashboard
          setViewMode('tourist')
          setError(null)
          await loadTouristData(false)
          return
        }
        setError(json.error || 'Failed to load dashboard')
        return
      }
      setData(json)
      if (json.farms?.length > 0 && !productFarmId) {
        setProductFarmId(json.farms[0].id)
      }
      if (json.profile?.full_name && !hostName) {
        const hName = /jbehd/i.test(json.profile.full_name) ? 'Rajesh Patil' : json.profile.full_name
        setHostName(hName)
      }
      if (json.profile?.phone && !hostPhone) {
        setHostPhone(json.profile.phone)
      }
      if (json.profile?.role === 'tourist') {
        setViewMode('tourist')
        await loadTouristData(false)
      } else {
        setViewMode('farmer')
      }
    } catch {
      setError('An error occurred while connecting to the dashboard service')
    } finally {
      setLoading(false)
    }
  }

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (touristAbortControllerRef.current) {
        touristAbortControllerRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    const isTouristParam =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('view') === 'tourist'

    if (isTouristParam) {
      setViewMode('tourist')
      loadTouristData(false).finally(() => setLoading(false))
    } else {
      loadDashboardData()
    }
  }, [loadTouristData])

  // Open Create Listing modal
  const openCreateListing = () => {
    setEditingFarmId(null)
    setName('')
    setPlace('')
    setRegion('Maharashtra')
    setDescription('')
    setPricePaise(250000)
    setAllowsDayVisit(false)
    setDayVisitPricePaise(85000)
    setDayVisitStart('09:00')
    setDayVisitEnd('17:00')
    setMaxGuests(4)
    setTagsInput('organic, family, harvest')
    const initialHost = data?.profile?.full_name && !/jbehd/i.test(data.profile.full_name) ? data.profile.full_name : 'Rajesh Patil'
    setHostName(initialHost)
    setHostPhone(data?.profile?.phone || '+919800000002')
    setLandmarkNote('')
    setDirectionsSteps([
      'Take state highway towards village exit',
      'Follow hand-painted farm stay signboard at the crossroad',
    ])
    setLandmarks([])
    setNearbyServices({})
    setSelectedCropIds([])
    setImageUrl('https://i.ibb.co/CsKRHJv0/images.jpg')
    setGalleryImages(['https://i.ibb.co/CsKRHJv0/images.jpg'])
    setAdditionalImageUrl('')
    setLat(17.0016)
    setLng(73.312)
    setPublished(true)
    setListingFormError(null)
    setIsListingModalOpen(true)
  }

  // Open Edit Listing modal
  const openEditListing = (farm: any) => {
    setEditingFarmId(farm.id)
    setName(farm.name || '')
    setPlace(farm.place || '')
    setRegion(farm.region || 'Maharashtra')
    setDescription(farm.description || '')
    setPricePaise(farm.price_paise || 200000)
    setAllowsDayVisit(Boolean(farm.allows_day_visit))
    setDayVisitPricePaise(farm.day_visit_price_paise || 80000)
    setDayVisitStart(farm.day_visit_start ? farm.day_visit_start.slice(0, 5) : '09:00')
    setDayVisitEnd(farm.day_visit_end ? farm.day_visit_end.slice(0, 5) : '17:00')
    setMaxGuests(farm.max_guests || 4)
    setTagsInput(Array.isArray(farm.tags) ? farm.tags.join(', ') : '')
    const editHost = farm.host_name && !/jbehd/i.test(farm.host_name)
      ? farm.host_name
      : (data?.profile?.full_name && !/jbehd/i.test(data.profile.full_name) ? data.profile.full_name : 'Rajesh Patil')
    setHostName(editHost)
    setHostPhone(farm.host_phone || data?.profile?.phone || '')
    setLandmarkNote(farm.landmark_note || '')
    setDirectionsSteps(
      Array.isArray(farm.directions_steps) && farm.directions_steps.length > 0
        ? farm.directions_steps
        : ['Take main road to the farm entrance gate'],
    )
    setLandmarks(
      Array.isArray(farm.landmarks)
        ? farm.landmarks
        : Array.isArray(farm.raw?.landmarks)
        ? farm.raw.landmarks
        : [],
    )
    setNearbyServices(farm.nearby_services || farm.nearbyServices || farm.raw?.nearby_services || {})
    const existingCropIds = farm.crops
      ? farm.crops.map((fc: any) => fc.crop?.id || fc.crop_id).filter(Boolean)
      : []
    setSelectedCropIds(existingCropIds)
    const farmPrimaryImage = farm.image_url || ''
    setImageUrl(farmPrimaryImage)
    const existingImgs: string[] = Array.isArray(farm.images) && farm.images.length > 0
      ? farm.images
      : (farmPrimaryImage ? [farmPrimaryImage] : [])
    setGalleryImages(existingImgs)
    setAdditionalImageUrl('')
    setLat(Number(farm.lat) || 17.0016)
    setLng(Number(farm.lng) || 73.312)
    setPublished(farm.published !== false)
    setListingFormError(null)
    setIsListingModalOpen(true)
  }

  // Handle uploading multiple image files via FileReader
  const handleMultipleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setIsUploadingImages(true)
    const fileList = Array.from(files)
    let processed = 0
    const loadedDataUrls: string[] = []

    fileList.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        if (result) loadedDataUrls.push(result)
        processed++
        if (processed === fileList.length) {
          setGalleryImages((prev) => {
            const updated = [...prev, ...loadedDataUrls]
            if (!imageUrl && updated.length > 0) {
              setImageUrl(updated[0])
            }
            return updated
          })
          setIsUploadingImages(false)
        }
      }
      reader.onerror = () => {
        processed++
        if (processed === fileList.length) {
          setGalleryImages((prev) => [...prev, ...loadedDataUrls])
          setIsUploadingImages(false)
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  // Handle adding an image URL to gallery
  const handleAddImageUrl = () => {
    const trimmed = additionalImageUrl.trim()
    if (!trimmed) return
    const formatted = trimmed.includes('ibb.co/R4TRDhPH')
      ? 'https://i.ibb.co/CsKRHJv0/images.jpg'
      : trimmed
    if (!galleryImages.includes(formatted)) {
      setGalleryImages((prev) => {
        const updated = [...prev, formatted]
        if (!imageUrl) setImageUrl(formatted)
        return updated
      })
    }
    setAdditionalImageUrl('')
  }

  // Handle removing an image from gallery
  const handleRemoveGalleryImage = (indexToRemove: number) => {
    setGalleryImages((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove)
      if (imageUrl === prev[indexToRemove] && updated.length > 0) {
        setImageUrl(updated[0])
      }
      return updated
    })
  }

  // Handle Save Listing (Create / Update)
  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault()
    setListingFormError(null)
    setListingSubmitting(true)

    const tagsArray = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)

    const cleanSteps = directionsSteps
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    const cleanLandmarks = landmarks
      .filter((l) => l.name && l.name.trim().length > 0)
      .map((l) => ({
        name: l.name.trim(),
        type: l.type || 'town',
        note: l.note?.trim() || '',
        distance_km_to_farm:
          l.distance_km_to_farm === '' || l.distance_km_to_farm === null || l.distance_km_to_farm === undefined
            ? null
            : Number(l.distance_km_to_farm),
      }))

    const cleanNearbyServices = {
      fuel: nearbyServices.fuel?.name ? {
        name: nearbyServices.fuel.name.trim(),
        distance_km: Number(nearbyServices.fuel.distance_km) || 0,
        phone: nearbyServices.fuel.phone?.trim() || '',
      } : undefined,
      atm: nearbyServices.atm?.name ? {
        name: nearbyServices.atm.name.trim(),
        distance_km: Number(nearbyServices.atm.distance_km) || 0,
      } : undefined,
      pharmacy: nearbyServices.pharmacy?.name ? {
        name: nearbyServices.pharmacy.name.trim(),
        distance_km: Number(nearbyServices.pharmacy.distance_km) || 0,
        phone: nearbyServices.pharmacy.phone?.trim() || '',
      } : undefined,
      grocery: nearbyServices.grocery?.name ? {
        name: nearbyServices.grocery.name.trim(),
        distance_km: Number(nearbyServices.grocery.distance_km) || 0,
      } : undefined,
      hospital: nearbyServices.hospital?.name ? {
        name: nearbyServices.hospital.name.trim(),
        distance_km: Number(nearbyServices.hospital.distance_km) || 0,
        phone: nearbyServices.hospital.phone?.trim() || '',
      } : undefined,
      police: nearbyServices.police?.name ? {
        name: nearbyServices.police.name.trim(),
        distance_km: Number(nearbyServices.police.distance_km) || 0,
        phone: nearbyServices.police.phone?.trim() || '',
      } : undefined,
    }

    const effectiveImageUrl = imageUrl.trim().includes('ibb.co/R4TRDhPH')
      ? 'https://i.ibb.co/CsKRHJv0/images.jpg'
      : (imageUrl.trim() || galleryImages[0] || 'https://i.ibb.co/CsKRHJv0/images.jpg')

    const cleanGallery = Array.from(
      new Set([effectiveImageUrl, ...galleryImages].filter(Boolean)),
    )

    const payload = {
      name: name.trim(),
      place: place.trim(),
      region: region.trim(),
      description: description.trim(),
      pricePaise: Number(pricePaise),
      allowsDayVisit,
      dayVisitPricePaise: allowsDayVisit ? Number(dayVisitPricePaise) || null : null,
      dayVisitStart: allowsDayVisit ? dayVisitStart : null,
      dayVisitEnd: allowsDayVisit ? dayVisitEnd : null,
      maxGuests: Number(maxGuests),
      tags: tagsArray,
      hostName: hostName.trim(),
      hostPhone: hostPhone.trim(),
      landmarkNote: landmarkNote.trim(),
      directionsSteps: cleanSteps,
      landmarks: cleanLandmarks,
      nearbyServices: cleanNearbyServices,
      cropIds: selectedCropIds,
      imageUrl: effectiveImageUrl,
      images: cleanGallery,
      lat: Number(lat),
      lng: Number(lng),
      published,
    }

    try {
      const url = editingFarmId
        ? `/api/farmer/farms/${editingFarmId}`
        : '/api/farmer/farms'
      const method = editingFarmId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) {
        setListingFormError(json.error || 'Failed to save listing')
        return
      }

      setIsListingModalOpen(false)
      loadDashboardData()
    } catch {
      setListingFormError('Network error saving listing')
    } finally {
      setListingSubmitting(false)
    }
  }

  // Toggle publish / unpublish
  const handleTogglePublish = async (farmId: string, currentPublished: boolean) => {
    try {
      const res = await fetch(`/api/farmer/farms/${farmId}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentPublished }),
      })
      if (res.ok) {
        loadDashboardData()
      }
    } catch (e) {
      console.error('Error toggling published status', e)
    }
  }

  // Delete listing
  const handleDeleteFarm = async (farmId: string, farmName: string) => {
    if (!confirm(t('listings.confirmDelete', { name: farmName }))) {
      return
    }
    try {
      const res = await fetch(`/api/farmer/farms/${farmId}`, { method: 'DELETE' })
      if (res.ok) {
        loadDashboardData()
      }
    } catch (e) {
      console.error('Error deleting listing', e)
    }
  }

  // Booking confirm / decline
  const handleBookingAction = async (bookingId: string, status: 'confirmed' | 'declined') => {
    try {
      const res = await fetch(`/api/farmer/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        loadDashboardData()
      }
    } catch (e) {
      console.error('Error updating booking status', e)
    }
  }

  // Update product stock
  const handleStockUpdate = async (productId: string, currentStock: number, delta: number) => {
    const newStock = Math.max(0, currentStock + delta)
    try {
      const res = await fetch(`/api/farmer/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      })
      if (res.ok) {
        setData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            products: prev.products.map((p) =>
              p.id === productId ? { ...p, stock: newStock } : p,
            ),
          }
        })
      }
    } catch (e) {
      console.error('Error updating stock', e)
    }
  }

  // Reservation mark ready / collected
  const handleReservationStatus = async (
    reservationId: string,
    status: 'ready' | 'collected' | 'cancelled',
  ) => {
    try {
      const res = await fetch(`/api/farmer/reservations/${reservationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        loadDashboardData()
      }
    } catch (e) {
      console.error('Error updating reservation status', e)
    }
  }

  // Add Product form submit
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setProductError(null)
    setProductSubmitting(true)

    try {
      const res = await fetch('/api/farmer/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId: productFarmId,
          name: productName.trim(),
          detail: productDetail.trim(),
          unit: productUnit.trim(),
          pricePaise: Number(productPricePaise),
          stock: Number(productStock),
          inSeasonMonths: [],
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setProductError(json.error || 'Failed to add product')
        return
      }

      setIsProductModalOpen(false)
      setProductName('')
      setProductDetail('')
      loadDashboardData()
    } catch {
      setProductError('Network error adding product')
    } finally {
      setProductSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="dashboard-page" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <p className="section-kicker">{t('farmerPortal')}</p>
        <h2>{t('loading')}</h2>
      </section>
    )
  }

  if (viewMode !== 'tourist' && error && !data) {
    return (
      <section className="dashboard-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <p className="section-kicker" style={{ color: '#b33939' }}>{t('portalError')}</p>
        <h2>{t('unableToLoad')}</h2>
        <p className="muted" style={{ maxWidth: '420px', margin: '10px auto 24px', lineHeight: 1.6 }}>
          {error}
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            setError(null)
            loadDashboardData()
          }}
          className="outline-btn"
          style={{ padding: '10px 20px', fontSize: '12px' }}
        >
          {t('retryConnection')}
        </button>
      </section>
    )
  }

  const rawFarmerName = data?.profile?.full_name?.trim() || ''
  const farmerName = (!rawFarmerName || /jbehd/i.test(rawFarmerName)) ? 'Rajesh Patil' : rawFarmerName
  const farms = data?.farms || []
  const bookings = data?.bookings || []
  const products = data?.products || []
  const INITIAL_PRODUCT_LIMIT = 6
  const displayedProducts = showAllProducts ? products : products.slice(0, INITIAL_PRODUCT_LIMIT)
  const hasMoreProducts = products.length > INITIAL_PRODUCT_LIMIT
  const reservations = data?.reservations || []
  const availableCrops = data?.availableCrops || []
  const stats = data?.stats || {
    upcomingGuests: 0,
    thisMonthEarningsPaise: 0,
    newProduceOrders: 0,
  }

  const isTouristRole =
    touristData?.profile?.role === 'tourist' || data?.profile?.role === 'tourist'

  return (
    <section className="dashboard-page">
      {viewMode === 'tourist' ? (
        <div>
          <div className="dashboard-head" style={{ marginBottom: '28px' }}>
            <div>
              <p className="section-kicker">{t('tourist.portalKicker')}</p>
              <h1>{t('tourist.heading')}</h1>
              <p>{t('tourist.subhead')}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="outline-btn"
                onClick={() => loadTouristData(true)}
                disabled={isRefreshing || touristLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  fontSize: '12px',
                  cursor: isRefreshing || touristLoading ? 'not-allowed' : 'pointer',
                  background: '#ffffff',
                }}
                title={t('tourist.refresh')}
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                <span>{isRefreshing ? t('tourist.refreshing') : t('tourist.refresh')}</span>
              </button>
              <button
                type="button"
                className="outline-btn"
                onClick={() => window.location.reload()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  background: '#ffffff',
                  color: 'var(--muted)',
                }}
                title={t('tourist.hardReload')}
              >
                <RotateCw size={13} />
                <span>{t('tourist.hardReload')}</span>
              </button>
              <Link className="primary-btn" href="/explore" style={{ textDecoration: 'none' }}>
                {t('tourist.exploreMore')}
              </Link>
            </div>
          </div>

          {touristLoading && !touristData ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', border: '1px solid var(--line)' }}>
              <p className="muted">{t('tourist.loadingBookings')}</p>
            </div>
          ) : touristError && !touristData ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', border: '1px solid var(--line)' }}>
              <p className="section-kicker" style={{ color: '#b33939' }}>{t('portalError')}</p>
              <h2>{t('unableToLoad')}</h2>
              <p className="muted" style={{ maxWidth: '420px', margin: '10px auto 24px', lineHeight: 1.6 }}>
                {touristError}
              </p>
              <button
                type="button"
                onClick={() => loadTouristData(false)}
                className="outline-btn"
                style={{ padding: '10px 20px', fontSize: '12px' }}
              >
                {t('retryConnection')}
              </button>
            </div>
          ) : !touristData?.bookings || touristData.bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', border: '1px solid var(--line)' }}>
              <p style={{ fontSize: '15px', color: 'var(--ink)', marginBottom: '8px' }}>
                {t('tourist.emptyHeading')}
              </p>
              <p className="muted" style={{ marginBottom: '20px' }}>
                {t('tourist.emptySubhead')}
              </p>
              <Link className="primary-btn" href="/explore" style={{ textDecoration: 'none' }}>
                {t('tourist.browseStays')}
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {touristData.bookings.map((booking: any) => {
                const farm = booking.farm || {}
                const checkInDate = booking.check_in
                const isPending = booking.status === 'pending'
                const reservations = booking.reservations || []

                return (
                  <div
                    key={booking.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--line)',
                      padding: '28px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        borderBottom: '1px solid var(--line)',
                        paddingBottom: '16px',
                        marginBottom: '16px',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span
                            className={`booking-status ${isPending ? 'pending' : ''}`}
                            style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 800 }}
                          >
                            {getStatusLabel(booking.status)}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.5px' }}>
                            {t('tourist.ref', { id: booking.id })}
                          </span>
                        </div>
                        <h2 style={{ fontSize: '24px', letterSpacing: '-0.5px', margin: '4px 0' }}>
                          {farm.name || 'Farm Stay'}
                        </h2>
                        <p className="muted" style={{ margin: '4px 0 0' }}>
                          <MapPin size={13} /> {farm.place || 'Rural district'} · {farm.region}
                        </p>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '20px', color: 'var(--ink)' }}>
                          {formatRupees(booking.total_paise, locale)}
                        </strong>
                        <small style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                          {booking.visit_type === 'day' ? t('bookings.dayVisit') : t('bookings.nightCount', { count: booking.nights })} · {t('bookings.guestCount', { count: booking.guests })}
                        </small>
                        {booking.check_in && (
                          <small style={{ display: 'block', fontSize: '11px', color: 'var(--forest)', fontWeight: 700, marginTop: '2px' }}>
                            {t('tourist.arrival', {
                              date: new Date(booking.check_in).toLocaleDateString(locale, {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              }),
                            })}
                          </small>
                        )}
                      </div>
                    </div>

                    {reservations.length > 0 && (
                      <div
                        style={{
                          background: 'var(--cream)',
                          border: '1px solid var(--line)',
                          padding: '12px 16px',
                          marginBottom: '20px',
                        }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--forest)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                          {t('tourist.reservedProducts', { count: reservations.length })}
                        </span>
                        <ul style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '12px', color: '#53685d' }}>
                          {reservations.map((res: any) => (
                            <li key={res.id}>
                              <strong>{res.product?.name}</strong> × {res.qty} ({res.product?.unit}) — {formatRupees((res.product?.price_paise || 0) * res.qty, locale)} · {t('tourist.status', { status: getReservationStatusLabel(res.status) })}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Collapsible Travel map section per booking */}
                    <details
                      className="tourist-travel-map-collapsible"
                      onToggle={handleMapInteraction}
                      style={{
                        marginTop: '16px',
                        border: '1px solid var(--line)',
                        background: '#ffffff',
                      }}
                    >
                      <summary
                        style={{
                          padding: '12px 16px',
                          fontWeight: 700,
                          fontSize: '13px',
                          color: 'var(--forest)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'var(--cream)',
                          userSelect: 'none',
                        }}
                      >
                        <Compass size={14} />
                        <span>{t('tourist.travelMapDirections')}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--muted)',
                            fontWeight: 400,
                            marginLeft: 'auto',
                          }}
                        >
                          {t('tourist.tapToViewRoute')}
                        </span>
                      </summary>
                      <div style={{ padding: '14px' }}>
                        <TripMap
                          key={`trip-map-${booking.id}`}
                          farm={farm}
                          bookingId={booking.id}
                          guestName={booking.guest_name || touristData?.profile?.full_name || 'Guest Traveller'}
                          checkInDate={checkInDate}
                          visitType={booking.visit_type}
                          guests={booking.guests}
                          bookingStatus={booking.status}
                          reservations={reservations}
                          onInteraction={handleMapInteraction}
                        />
                      </div>
                    </details>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Head */}
          <div className="dashboard-head">
            <div>
              <p className="section-kicker">{t('farmerPortal')}</p>
              <h1>{t('greeting', { name: farmerName })}</h1>
              <p>{t('subtitle')}</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <TelegramConnect compact showDisconnect role="farmer" />
              <button
                className="primary-btn"
                type="button"
                onClick={openCreateListing}
              >
                <span>+</span> {t('addNewListing')}
              </button>
            </div>
          </div>

      {/* Overview Stats */}
      <div className="dashboard-stats">
        <div>
          <span className="stat-icon green">
            <ClipboardList size={19} />
          </span>
          <span>
            <strong>{stats.upcomingGuests}</strong>
            <small>{t('stats.upcomingGuests')}</small>
          </span>
          <b>{t('stats.active')}</b>
        </div>

        <div>
          <span className="stat-icon yellow">
            <CalendarDays size={19} />
          </span>
          <span>
            <strong>{formatRupees(stats.thisMonthEarningsPaise, locale)}</strong>
            <small>{t('stats.monthEarnings')}</small>
          </span>
          <b>{t('stats.direct')}</b>
        </div>

        <div>
          <span className="stat-icon blue">
            <ShoppingBasket size={19} />
          </span>
          <span>
            <strong>{stats.newProduceOrders}</strong>
            <small>{t('stats.newOrders')}</small>
          </span>
          <b>{t('stats.pickup')}</b>
        </div>
      </div>

      {/* Main Grid: Listings + Bookings */}
      <div className="dashboard-grid">
        {/* Panel 1: My Listings */}
        <div className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="section-kicker">{t('listings.kicker', { count: farms.length })}</p>
              <h2>{t('listings.heading')}</h2>
            </div>
            <button
              className="text-btn"
              type="button"
              onClick={openCreateListing}
            >
              {t('listings.newStay')}
            </button>
          </div>

          {farms.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '20px 0' }}>
              {t('listings.empty')}
            </p>
          ) : (
            farms.map((farm) => {
              const isPub = farm.published !== false
              return (
                <div className="listing-row" key={farm.id}>
                  <img
                    src={farm.image_url}
                    alt={farm.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = '/placeholder.jpg'
                    }}
                  />
                  <div>
                    <h3 style={{ margin: '0 0 3px' }}>
                      <Link
                        href={`/farms/${farm.slug}`}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {farm.name}
                      </Link>
                    </h3>
                    <p style={{ margin: '0 0 5px' }}>
                      {farm.place} · {t('listings.guestsMax', { count: farm.max_guests })}
                    </p>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span
                        className="status-pill"
                        style={{
                          background: isPub ? '#e4f0e1' : '#f0f0f0',
                          color: isPub ? 'var(--forest)' : 'var(--muted)',
                        }}
                      >
                        {isPub ? t('listings.published') : t('listings.unpublished')}
                      </span>
                      {farm.allows_day_visit && (
                        <span className="status-pill" style={{ background: '#e8f0fe', color: '#1a56db' }}>
                          {t('listings.dayVisits')}
                        </span>
                      )}
                    </div>
                  </div>
                  <strong>
                    {formatRupees(farm.price_paise, locale)}
                    <small>{t('listings.perGuest')}</small>
                  </strong>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                      className="icon-only"
                      title={isPub ? t('listings.unpublishAction') : t('listings.publishAction')}
                      onClick={() => handleTogglePublish(farm.id, isPub)}
                      type="button"
                      style={{ padding: '6px', cursor: 'pointer' }}
                    >
                      {isPub ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button
                      className="icon-only"
                      title={t('listings.editAction')}
                      onClick={() => openEditListing(farm)}
                      type="button"
                      style={{ padding: '6px', cursor: 'pointer' }}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      className="icon-only"
                      title={t('listings.deleteAction')}
                      onClick={() => handleDeleteFarm(farm.id, farm.name)}
                      type="button"
                      style={{ padding: '6px', cursor: 'pointer', color: '#c0392b' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Panel 2: Visitor Bookings */}
        <div className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="section-kicker">{t('bookings.kicker', { count: bookings.length })}</p>
              <h2>{t('bookings.heading')}</h2>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {t('bookings.subhead')}
            </span>
          </div>

          {bookings.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '20px 0' }}>
              {t('bookings.empty')}
            </p>
          ) : (
            bookings.map((booking) => {
              const dateObj = booking.check_in ? new Date(booking.check_in) : new Date()
              const dayStr = dateObj.toLocaleDateString(locale, { day: 'numeric' })
              const monthStr = dateObj
                .toLocaleDateString(locale, { month: 'short' })
                .toUpperCase()

              const isPending = booking.status === 'pending'
              const isConfirmed = booking.status === 'confirmed'

              return (
                <div className="visitor-row" key={booking.id}>
                  <span className="date-block">
                    <b>{dayStr}</b>
                    <small>{monthStr}</small>
                  </span>
                  <div>
                    <h3>{booking.tourist?.full_name || 'Guest'}</h3>
                    <p>
                      {booking.farm?.name || 'Stay'} · {t('bookings.guestCount', { count: booking.guests })} ({booking.visit_type === 'day' ? t('bookings.dayVisit') : t('bookings.nightCount', { count: booking.nights })})
                    </p>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                      {t('bookings.total', { total: formatRupees(booking.total_paise, locale) })}
                      {booking.tourist?.phone && ` · ${booking.tourist.phone}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span
                      className={`booking-status ${isPending ? 'pending' : ''}`}
                      style={{
                        background: isConfirmed ? '#e4f0e1' : isPending ? '#fff1dd' : '#f0f0f0',
                        color: isConfirmed ? 'var(--forest)' : isPending ? '#a86f27' : 'var(--muted)',
                      }}
                    >
                      {getStatusLabel(booking.status)}
                    </span>

                    {isPending && (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          type="button"
                          onClick={() => handleBookingAction(booking.id, 'confirmed')}
                          style={{
                            padding: '3px 7px',
                            background: 'var(--forest)',
                            color: '#ffffff',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            borderRadius: '2px',
                          }}
                        >
                          {t('bookings.confirm')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBookingAction(booking.id, 'declined')}
                          style={{
                            padding: '3px 7px',
                            background: '#f8d7da',
                            color: '#842029',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            borderRadius: '2px',
                          }}
                        >
                          {t('bookings.decline')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Panel 3: Produce Inventory */}
      <div className="inventory-panel" style={{ marginTop: '24px' }}>
        <div className="panel-title">
          <div>
            <p className="section-kicker">
              {products.length > 0 ? t('inventory.kicker', { count: products.length }) : t('inventory.kickerEmpty')}
            </p>
            <h2>{t('inventory.heading')}</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {hasMoreProducts && (
              <button
                className="outline-btn"
                type="button"
                onClick={() => setShowAllProducts((prev) => !prev)}
                style={{ fontSize: '12px' }}
              >
                {showAllProducts ? t('inventory.showLess') : t('inventory.viewAll', { count: products.length })}
              </button>
            )}
            <button
              className="outline-btn"
              type="button"
              onClick={() => setIsProductModalOpen(true)}
            >
              {t('inventory.addProduct')}
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '20px 0' }}>
            {t('inventory.empty')}
          </p>
        ) : (
          <>
            <div className="inventory-grid">
              {displayedProducts.map((item) => {
                const stockPct = Math.min(100, Math.round((item.stock / 50) * 100))
                const isLow = item.stock <= 5

                return (
                  <div key={item.id} style={{ position: 'relative' }}>
                    <span>{item.name}</span>
                    <strong>
                      {item.stock} <small>{item.unit}</small>
                    </strong>
                    <div className="progress">
                      <i style={{ width: `${stockPct}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <em className={isLow ? 'low' : ''}>
                        {isLow ? t('inventory.lowStock') : t('inventory.inStock')} · {formatRupees(item.price_paise, locale)}
                      </em>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        <button
                          type="button"
                          aria-label={t('inventory.decreaseStock')}
                          onClick={() => handleStockUpdate(item.id, item.stock, -1)}
                          style={{
                            background: 'var(--mint)',
                            color: 'var(--forest)',
                            width: '20px',
                            height: '20px',
                            fontWeight: 800,
                            fontSize: '12px',
                            borderRadius: '2px',
                            lineHeight: 1,
                          }}
                        >
                          -
                        </button>
                        <button
                          type="button"
                          aria-label={t('inventory.increaseStock')}
                          onClick={() => handleStockUpdate(item.id, item.stock, 1)}
                          style={{
                            background: 'var(--forest)',
                            color: '#ffffff',
                            width: '20px',
                            height: '20px',
                            fontWeight: 800,
                            fontSize: '12px',
                            borderRadius: '2px',
                            lineHeight: 1,
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {hasMoreProducts && (
              <div
                style={{
                  textAlign: 'center',
                  marginTop: '18px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--line)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAllProducts((prev) => !prev)}
                  className="outline-btn"
                  style={{
                    fontSize: '12px',
                    padding: '8px 20px',
                    cursor: 'pointer',
                    background: '#ffffff',
                  }}
                >
                  {showAllProducts
                    ? t('inventory.showLess')
                    : t('inventory.viewAll', { count: products.length })}
                </button>
              </div>
            )}
          </>
        )}

        {/* Product Pickup Reservations */}
        {reservations.length > 0 && (
          <div style={{ marginTop: '28px', borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
              <div>
                <p className="section-kicker" style={{ margin: '0 0 2px' }}>
                  {t('inventory.pickupBasketKicker')}
                </p>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  {t('inventory.reservationsHeading', { count: reservations.length })}
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {t('inventory.payUponCollection')}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {reservations.map((res) => (
                <div
                  key={res.id}
                  style={{
                    border: '1px solid var(--line)',
                    background: '#ffffff',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>
                        {res.product?.name || 'Produce item'}
                      </strong>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {t('inventory.reservedBy', { qty: res.qty, name: res.tourist?.full_name || 'Guest' })}
                      </div>
                    </div>
                    <span
                      className="status-pill"
                      style={{
                        background:
                          res.status === 'collected'
                            ? '#e4f0e1'
                            : res.status === 'ready'
                            ? '#dcebd4'
                            : '#fff1dd',
                        color:
                          res.status === 'collected'
                            ? 'var(--forest)'
                            : res.status === 'ready'
                            ? 'var(--forest)'
                            : '#a86f27',
                      }}
                    >
                      {getReservationStatusLabel(res.status)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    {res.status === 'reserved' && (
                      <button
                        type="button"
                        onClick={() => handleReservationStatus(res.id, 'ready')}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--forest)',
                          background: 'var(--mint)',
                          padding: '4px 8px',
                          border: '1px solid #c2d6be',
                          borderRadius: '2px',
                        }}
                      >
                        {t('inventory.markReady')}
                      </button>
                    )}
                    {res.status === 'ready' && (
                      <button
                        type="button"
                        onClick={() => handleReservationStatus(res.id, 'collected')}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#ffffff',
                          background: 'var(--forest)',
                          padding: '4px 8px',
                          borderRadius: '2px',
                        }}
                      >
                        {t('inventory.markCollected')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* Listing Modal: Create or Edit */}
      {isListingModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 35, 27, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 10000,
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--line)',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px 24px',
              boxShadow: '0 20px 45px rgba(23, 53, 43, 0.25)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <p className="section-kicker" style={{ margin: '0 0 2px' }}>
                  {editingFarmId ? t('farmModal.editKicker') : t('farmModal.createKicker')}
                </p>
                <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  {editingFarmId ? t('farmModal.updateTitle', { name }) : t('farmModal.createTitle')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsListingModalOpen(false)}
                aria-label={t('farmModal.close')}
                style={{ padding: '6px', color: 'var(--muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {listingFormError && (
              <div
                style={{
                  background: '#fdf2f2',
                  border: '1px solid #f2c8c8',
                  color: '#992222',
                  padding: '10px 14px',
                  fontSize: '12px',
                  marginBottom: '16px',
                }}
              >
                {listingFormError}
              </div>
            )}

            <form onSubmit={handleSaveListing}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {t('farmModal.nameLabel')}
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('farmModal.namePlaceholder')}
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>

                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {t('farmModal.regionLabel')}
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px', background: '#fff' }}
                  >
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Kashmir">Kashmir</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Assam">Assam</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {t('farmModal.placeLabel')}
                  <input
                    required
                    type="text"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder={t('farmModal.placePlaceholder')}
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>

                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {t('farmModal.priceLabel')}
                  <input
                    required
                    type="number"
                    value={pricePaise}
                    onChange={(e) => setPricePaise(Number(e.target.value))}
                    placeholder={t('farmModal.pricePlaceholder')}
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>
              </div>

              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                {t('farmModal.descriptionLabel')}
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('farmModal.descriptionPlaceholder')}
                  style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px', resize: 'vertical' }}
                />
              </label>

              {/* Day visits support */}
              <div
                style={{
                  border: '1px solid var(--line)',
                  background: '#f9fbf8',
                  padding: '12px 14px',
                  marginBottom: '14px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={allowsDayVisit}
                    onChange={(e) => setAllowsDayVisit(e.target.checked)}
                    style={{ accentColor: 'var(--forest)' }}
                  />
                  {t('farmModal.allowDayVisits')}
                </label>

                {allowsDayVisit && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {t('farmModal.dayPriceLabel')}
                      <input
                        type="number"
                        value={dayVisitPricePaise}
                        onChange={(e) => setDayVisitPricePaise(Number(e.target.value))}
                        placeholder={t('farmModal.dayPricePlaceholder')}
                        style={{ border: '1px solid var(--line)', padding: '8px', fontSize: '12px' }}
                      />
                    </label>
                    <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {t('farmModal.startHourLabel')}
                      <input
                        type="time"
                        value={dayVisitStart}
                        onChange={(e) => setDayVisitStart(e.target.value)}
                        style={{ border: '1px solid var(--line)', padding: '8px', fontSize: '12px' }}
                      />
                    </label>
                    <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {t('farmModal.endHourLabel')}
                      <input
                        type="time"
                        value={dayVisitEnd}
                        onChange={(e) => setDayVisitEnd(e.target.value)}
                        style={{ border: '1px solid var(--line)', padding: '8px', fontSize: '12px' }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Host contact & limits */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {t('farmModal.maxGuestsLabel')}
                  <input
                    required
                    type="number"
                    min={1}
                    max={50}
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(Number(e.target.value))}
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {t('farmModal.hostNameLabel')}
                  <input
                    required
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder={t('farmModal.hostNamePlaceholder')}
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {t('farmModal.hostPhoneLabel')}
                  <input
                    type="tel"
                    value={hostPhone}
                    onChange={(e) => setHostPhone(e.target.value)}
                    placeholder={t('farmModal.hostPhonePlaceholder')}
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>
              </div>

              {/* Tags and Landmark */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {t('farmModal.tagsLabel')}
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder={t('farmModal.tagsPlaceholder')}
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {t('farmModal.landmarkLabel')}
                  <input
                    type="text"
                    value={landmarkNote}
                    onChange={(e) => setLandmarkNote(e.target.value)}
                    placeholder={t('farmModal.landmarkPlaceholder')}
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>
              </div>

              {/* Photo & Multi-Image Gallery */}
              <div style={{ border: '1px solid var(--line)', background: '#fafbfa', padding: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                    {t('farmModal.photosHeading', { count: galleryImages.length })}
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    {t('farmModal.firstPhotoNote')}
                  </span>
                </div>

                {/* Primary Cover Image URL */}
                <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                  {t('farmModal.coverUrlLabel')}
                  <input
                    required
                    type="url"
                    value={imageUrl}
                    onChange={(e) => {
                      const val = e.target.value
                      setImageUrl(val)
                      if (val && !galleryImages.includes(val)) {
                        setGalleryImages((prev) => [val, ...prev])
                      }
                    }}
                    placeholder="https://..."
                    style={{ border: '1px solid var(--line)', padding: '8px 10px', fontSize: '12px', background: '#fff' }}
                  />
                </label>

                {/* Multi-image file uploader & URL adder */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <div>
                    <input
                      type="file"
                      id="farm-multi-image-upload"
                      multiple
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleMultipleFilesUpload}
                    />
                    <label
                      htmlFor="farm-multi-image-upload"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        border: '1px dashed var(--line)',
                        background: '#ffffff',
                        padding: '9px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--forest)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        height: '100%',
                      }}
                    >
                      <Upload size={14} />
                      {isUploadingImages ? t('farmModal.readingFiles') : t('farmModal.uploadPhotos')}
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="url"
                      value={additionalImageUrl}
                      onChange={(e) => setAdditionalImageUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddImageUrl()
                        }
                      }}
                      placeholder={t('farmModal.pasteUrlPlaceholder')}
                      style={{ flex: 1, border: '1px solid var(--line)', padding: '8px 10px', fontSize: '12px', background: '#fff' }}
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      style={{
                        background: 'var(--forest)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '0 12px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {t('farmModal.addPhoto')}
                    </button>
                  </div>
                </div>

                {/* Image thumbnails preview strip */}
                {galleryImages.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      padding: '8px',
                      background: '#ffffff',
                      border: '1px solid var(--line)',
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}
                  >
                    {galleryImages.map((imgSrc, idx) => {
                      const isCover = imgSrc === imageUrl
                      return (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            width: '74px',
                            height: '74px',
                            border: isCover ? '2px solid var(--forest)' : '1px solid var(--line)',
                            background: '#f4f6f2',
                            flexShrink: 0,
                          }}
                        >
                          {/* Thumbnail preview */}
                          <img
                            src={imgSrc}
                            alt={`Farm preview ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />

                          {/* Cover badge */}
                          {isCover ? (
                            <span
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'var(--forest)',
                                color: '#fff',
                                fontSize: '9px',
                                fontWeight: 700,
                                textAlign: 'center',
                                padding: '1px 0',
                                textTransform: 'uppercase',
                              }}
                            >
                              {t('farmModal.coverBadge')}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setImageUrl(imgSrc)}
                              title={t('farmModal.setCover')}
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'rgba(0,0,0,0.65)',
                                color: '#fff',
                                fontSize: '9px',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px 0',
                                textAlign: 'center',
                              }}
                            >
                              {t('farmModal.setCover')}
                            </button>
                          )}

                          {/* Delete image button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(idx)}
                            title={t('farmModal.removePhoto')}
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              width: '18px',
                              height: '18px',
                              background: '#c0392b',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Directions steps */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                    {t('farmModal.directionsHeading')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setDirectionsSteps([...directionsSteps, ''])}
                    style={{
                      fontSize: '11px',
                      color: 'var(--forest)',
                      fontWeight: 700,
                      background: 'var(--mint)',
                      padding: '3px 8px',
                      borderRadius: '2px',
                    }}
                  >
                    {t('farmModal.addStep')}
                  </button>
                </div>
                {directionsSteps.map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => {
                        const copy = [...directionsSteps]
                        copy[idx] = e.target.value
                        setDirectionsSteps(copy)
                      }}
                      placeholder={t('farmModal.stepPlaceholder', { step: idx + 1 })}
                      style={{ flex: 1, border: '1px solid var(--line)', padding: '8px 10px', fontSize: '12px' }}
                    />
                    {directionsSteps.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDirectionsSteps(directionsSteps.filter((_, i) => i !== idx))
                        }
                        style={{
                          padding: '0 8px',
                          color: '#c0392b',
                          background: '#fff',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Landmarks on the Route (Repeatable rows) */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                    Landmarks on the Route
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setLandmarks([
                        ...landmarks,
                        { name: '', type: 'town', note: '', distance_km_to_farm: '' },
                      ])
                    }
                    style={{
                      fontSize: '11px',
                      color: 'var(--forest)',
                      fontWeight: 700,
                      background: 'var(--mint)',
                      padding: '3px 8px',
                      borderRadius: '2px',
                    }}
                  >
                    + Add Landmark
                  </button>
                </div>

                {landmarks.length === 0 && (
                  <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 6px' }}>
                    No landmarks added. Add 4 to 8 milestones along the route (e.g. junctions, bridges, towns).
                  </p>
                )}

                {landmarks.map((lm, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1fr 1.2fr 0.8fr auto',
                      gap: '6px',
                      marginBottom: '6px',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="text"
                      value={lm.name}
                      onChange={(e) => {
                        const copy = [...landmarks]
                        copy[idx] = { ...copy[idx], name: e.target.value }
                        setLandmarks(copy)
                      }}
                      placeholder="Name (e.g. River Bridge)"
                      style={{ border: '1px solid var(--line)', padding: '6px 8px', fontSize: '11px' }}
                    />
                    <select
                      value={lm.type}
                      onChange={(e) => {
                        const copy = [...landmarks]
                        copy[idx] = { ...copy[idx], type: e.target.value }
                        setLandmarks(copy)
                      }}
                      style={{ border: '1px solid var(--line)', padding: '6px 8px', fontSize: '11px', background: '#fff' }}
                    >
                      <option value="town">Town</option>
                      <option value="highway_junction">Highway Junction</option>
                      <option value="bridge">Bridge</option>
                      <option value="toll_plaza">Toll Plaza</option>
                      <option value="fuel_station">Fuel Station</option>
                      <option value="temple">Temple</option>
                      <option value="river">River</option>
                      <option value="landmark">Landmark</option>
                      <option value="gate">Farm Gate</option>
                    </select>
                    <input
                      type="text"
                      value={lm.note}
                      onChange={(e) => {
                        const copy = [...landmarks]
                        copy[idx] = { ...copy[idx], note: e.target.value }
                        setLandmarks(copy)
                      }}
                      placeholder="Note / guidance"
                      style={{ border: '1px solid var(--line)', padding: '6px 8px', fontSize: '11px' }}
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={lm.distance_km_to_farm}
                      onChange={(e) => {
                        const copy = [...landmarks]
                        copy[idx] = {
                          ...copy[idx],
                          distance_km_to_farm: e.target.value === '' ? '' : parseFloat(e.target.value),
                        }
                        setLandmarks(copy)
                      }}
                      placeholder="Km to farm"
                      style={{ border: '1px solid var(--line)', padding: '6px 8px', fontSize: '11px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setLandmarks(landmarks.filter((_, i) => i !== idx))}
                      style={{
                        padding: '6px 8px',
                        color: '#c0392b',
                        background: '#fff',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Nearby Services */}
              <div style={{ marginBottom: '18px', padding: '12px', background: '#f8faf6', border: '1px solid var(--line)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--forest)', marginBottom: '8px' }}>
                  Last Essential & Emergency Services Before Farm
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>Nearest Fuel Station</span>
                    <input
                      type="text"
                      placeholder="Station name"
                      value={nearbyServices.fuel?.name || ''}
                      onChange={(e) =>
                        setNearbyServices({
                          ...nearbyServices,
                          fuel: { ...nearbyServices.fuel, name: e.target.value },
                        })
                      }
                      style={{ width: '100%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px', marginTop: '2px' }}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <input
                        type="number"
                        placeholder="Dist (km)"
                        value={nearbyServices.fuel?.distance_km ?? ''}
                        onChange={(e) =>
                          setNearbyServices({
                            ...nearbyServices,
                            fuel: { ...nearbyServices.fuel, distance_km: e.target.value === '' ? '' : parseFloat(e.target.value) },
                          })
                        }
                        style={{ width: '50%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px' }}
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={nearbyServices.fuel?.phone || ''}
                        onChange={(e) =>
                          setNearbyServices({
                            ...nearbyServices,
                            fuel: { ...nearbyServices.fuel, phone: e.target.value },
                          })
                        }
                        style={{ width: '50%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>Nearest ATM / Bank</span>
                    <input
                      type="text"
                      placeholder="ATM / Bank name"
                      value={nearbyServices.atm?.name || ''}
                      onChange={(e) =>
                        setNearbyServices({
                          ...nearbyServices,
                          atm: { ...nearbyServices.atm, name: e.target.value },
                        })
                      }
                      style={{ width: '100%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px', marginTop: '2px' }}
                    />
                    <input
                      type="number"
                      placeholder="Dist (km)"
                      value={nearbyServices.atm?.distance_km ?? ''}
                      onChange={(e) =>
                        setNearbyServices({
                          ...nearbyServices,
                          atm: { ...nearbyServices.atm, distance_km: e.target.value === '' ? '' : parseFloat(e.target.value) },
                        })
                      }
                      style={{ width: '100%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px', marginTop: '4px' }}
                    />
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>Nearest Pharmacy</span>
                    <input
                      type="text"
                      placeholder="Medical store name"
                      value={nearbyServices.pharmacy?.name || ''}
                      onChange={(e) =>
                        setNearbyServices({
                          ...nearbyServices,
                          pharmacy: { ...nearbyServices.pharmacy, name: e.target.value },
                        })
                      }
                      style={{ width: '100%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px', marginTop: '2px' }}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <input
                        type="number"
                        placeholder="Dist (km)"
                        value={nearbyServices.pharmacy?.distance_km ?? ''}
                        onChange={(e) =>
                          setNearbyServices({
                            ...nearbyServices,
                            pharmacy: { ...nearbyServices.pharmacy, distance_km: e.target.value === '' ? '' : parseFloat(e.target.value) },
                          })
                        }
                        style={{ width: '50%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px' }}
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={nearbyServices.pharmacy?.phone || ''}
                        onChange={(e) =>
                          setNearbyServices({
                            ...nearbyServices,
                            pharmacy: { ...nearbyServices.pharmacy, phone: e.target.value },
                          })
                        }
                        style={{ width: '50%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>Nearest Hospital</span>
                    <input
                      type="text"
                      placeholder="Hospital name"
                      value={nearbyServices.hospital?.name || ''}
                      onChange={(e) =>
                        setNearbyServices({
                          ...nearbyServices,
                          hospital: { ...nearbyServices.hospital, name: e.target.value },
                        })
                      }
                      style={{ width: '100%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px', marginTop: '2px' }}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <input
                        type="number"
                        placeholder="Dist (km)"
                        value={nearbyServices.hospital?.distance_km ?? ''}
                        onChange={(e) =>
                          setNearbyServices({
                            ...nearbyServices,
                            hospital: { ...nearbyServices.hospital, distance_km: e.target.value === '' ? '' : parseFloat(e.target.value) },
                          })
                        }
                        style={{ width: '50%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px' }}
                      />
                      <input
                        type="text"
                        placeholder="Hospital phone"
                        value={nearbyServices.hospital?.phone || ''}
                        onChange={(e) =>
                          setNearbyServices({
                            ...nearbyServices,
                            hospital: { ...nearbyServices.hospital, phone: e.target.value },
                          })
                        }
                        style={{ width: '50%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>Nearest Police Station</span>
                    <input
                      type="text"
                      placeholder="Police station name"
                      value={nearbyServices.police?.name || ''}
                      onChange={(e) =>
                        setNearbyServices({
                          ...nearbyServices,
                          police: { ...nearbyServices.police, name: e.target.value },
                        })
                      }
                      style={{ width: '100%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px', marginTop: '2px' }}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <input
                        type="number"
                        placeholder="Dist (km)"
                        value={nearbyServices.police?.distance_km ?? ''}
                        onChange={(e) =>
                          setNearbyServices({
                            ...nearbyServices,
                            police: { ...nearbyServices.police, distance_km: e.target.value === '' ? '' : parseFloat(e.target.value) },
                          })
                        }
                        style={{ width: '50%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px' }}
                      />
                      <input
                        type="text"
                        placeholder="Police phone"
                        value={nearbyServices.police?.phone || ''}
                        onChange={(e) =>
                          setNearbyServices({
                            ...nearbyServices,
                            police: { ...nearbyServices.police, phone: e.target.value },
                          })
                        }
                        style={{ width: '50%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>Nearest Grocery / Store</span>
                    <input
                      type="text"
                      placeholder="Store name"
                      value={nearbyServices.grocery?.name || ''}
                      onChange={(e) =>
                        setNearbyServices({
                          ...nearbyServices,
                          grocery: { ...nearbyServices.grocery, name: e.target.value },
                        })
                      }
                      style={{ width: '100%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px', marginTop: '2px' }}
                    />
                    <input
                      type="number"
                      placeholder="Dist (km)"
                      value={nearbyServices.grocery?.distance_km ?? ''}
                      onChange={(e) =>
                        setNearbyServices({
                          ...nearbyServices,
                          grocery: { ...nearbyServices.grocery, distance_km: e.target.value === '' ? '' : parseFloat(e.target.value) },
                        })
                      }
                      style={{ width: '100%', border: '1px solid var(--line)', padding: '5px 8px', fontSize: '11px', marginTop: '4px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Seasonal Crops Picker */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
                  {t('farmModal.seasonalCropsHeading')}
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    maxHeight: '130px',
                    overflowY: 'auto',
                    border: '1px solid var(--line)',
                    padding: '8px',
                    background: '#fcfdfb',
                  }}
                >
                  {availableCrops.map((crop) => {
                    const isSelected = selectedCropIds.includes(crop.id)
                    return (
                      <button
                        key={crop.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCropIds(selectedCropIds.filter((id) => id !== crop.id))
                          } else {
                            setSelectedCropIds([...selectedCropIds, crop.id])
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: isSelected ? 700 : 500,
                          background: isSelected ? 'var(--forest)' : '#ffffff',
                          color: isSelected ? '#ffffff' : 'var(--ink)',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--forest)' : 'var(--line)',
                          borderRadius: '2px',
                          cursor: 'pointer',
                        }}
                      >
                        {crop.name} ({crop.region})
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Location Picker with Leaflet Map */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                  {t('farmModal.geolocationHeading')}
                </label>
                <LocationPicker
                  lat={lat}
                  lng={lng}
                  onChange={(newLat, newLng) => {
                    setLat(newLat)
                    setLng(newLng)
                  }}
                />
              </div>

              {/* Published toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', margin: '14px 0 20px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  style={{ accentColor: 'var(--forest)' }}
                />
                {t('farmModal.publishedImmediate')}
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={listingSubmitting}
                className="primary-btn"
                style={{ width: '100%', padding: '12px', fontSize: '13px' }}
              >
                {listingSubmitting ? t('farmModal.savingListing') : editingFarmId ? t('farmModal.updateListing') : t('farmModal.createListing')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isProductModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 35, 27, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 10000,
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--line)',
              maxWidth: '460px',
              width: '100%',
              padding: '24px 22px',
              boxShadow: '0 20px 45px rgba(23, 53, 43, 0.25)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <p className="section-kicker" style={{ margin: '0 0 2px' }}>
                  {t('productModal.kicker')}
                </p>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  {t('productModal.heading')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                aria-label={t('farmModal.close')}
                style={{ padding: '4px', color: 'var(--muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {productError && (
              <div
                style={{
                  background: '#fdf2f2',
                  border: '1px solid #f2c8c8',
                  color: '#992222',
                  padding: '8px 12px',
                  fontSize: '12px',
                  marginBottom: '14px',
                }}
              >
                {productError}
              </div>
            )}

            <form onSubmit={handleCreateProduct}>
              {farms.length > 1 && (
                <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginBottom: '10px' }}>
                  {t('productModal.pickupFarm')}
                  <select
                    value={productFarmId}
                    onChange={(e) => setProductFarmId(e.target.value)}
                    style={{ width: '100%', border: '1px solid var(--line)', padding: '8px', fontSize: '12.5px', marginTop: '3px' }}
                  >
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginBottom: '10px' }}>
                {t('productModal.nameLabel')}
                <input
                  required
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={t('productModal.namePlaceholder')}
                  style={{ width: '100%', border: '1px solid var(--line)', padding: '8px', fontSize: '12.5px', marginTop: '3px' }}
                />
              </label>

              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginBottom: '10px' }}>
                {t('productModal.detailLabel')}
                <input
                  type="text"
                  value={productDetail}
                  onChange={(e) => setProductDetail(e.target.value)}
                  placeholder={t('productModal.detailPlaceholder')}
                  style={{ width: '100%', border: '1px solid var(--line)', padding: '8px', fontSize: '12.5px', marginTop: '3px' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <label style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                  {t('productModal.unitLabel')}
                  <input
                    required
                    type="text"
                    value={productUnit}
                    onChange={(e) => setProductUnit(e.target.value)}
                    placeholder={t('productModal.unitPlaceholder')}
                    style={{ width: '100%', border: '1px solid var(--line)', padding: '8px', fontSize: '12.5px', marginTop: '3px' }}
                  />
                </label>

                <label style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                  {t('productModal.priceLabel')}
                  <input
                    required
                    type="number"
                    value={productPricePaise}
                    onChange={(e) => setProductPricePaise(Number(e.target.value))}
                    placeholder={t('productModal.pricePlaceholder')}
                    style={{ width: '100%', border: '1px solid var(--line)', padding: '8px', fontSize: '12.5px', marginTop: '3px' }}
                  />
                </label>
              </div>

              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginBottom: '16px' }}>
                {t('productModal.stockLabel')}
                <input
                  required
                  type="number"
                  min={0}
                  value={productStock}
                  onChange={(e) => setProductStock(Number(e.target.value))}
                  style={{ width: '100%', border: '1px solid var(--line)', padding: '8px', fontSize: '12.5px', marginTop: '3px' }}
                />
              </label>

              <button
                type="submit"
                disabled={productSubmitting}
                className="primary-btn"
                style={{ width: '100%', padding: '10px', fontSize: '12.5px' }}
              >
                {productSubmitting ? t('productModal.saving') : t('productModal.submit')}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
