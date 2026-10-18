'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { formatRupees } from '@/lib/money'
import { LocationPicker } from '@/components/LocationPicker'
import dynamic from 'next/dynamic'

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
  const [selectedCropIds, setSelectedCropIds] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=85',
  )
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

  // View mode switcher: 'farmer' or 'tourist'
  const [viewMode, setViewMode] = useState<'farmer' | 'tourist'>('farmer')
  const [touristData, setTouristData] = useState<{ profile: any; bookings: any[] } | null>(null)
  const [touristLoading, setTouristLoading] = useState(false)
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null)

  const loadTouristData = async () => {
    setTouristLoading(true)
    try {
      const res = await fetch('/api/tourist/bookings')
      const json = await res.json()
      if (res.ok) {
        setTouristData(json)
        if (json.bookings?.length > 0 && !expandedBookingId) {
          setExpandedBookingId(json.bookings[0].id)
        }
      }
    } catch (e) {
      console.error('Error fetching tourist bookings', e)
    } finally {
      setTouristLoading(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      const res = await fetch('/api/farmer/overview')
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 403) {
          // Current user is a tourist viewing dashboard
          setViewMode('tourist')
          setError(null)
          await loadTouristData()
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
        setHostName(json.profile.full_name)
      }
      if (json.profile?.phone && !hostPhone) {
        setHostPhone(json.profile.phone)
      }
      if (json.profile?.role === 'tourist') {
        setViewMode('tourist')
        await loadTouristData()
      }
    } catch {
      setError('An error occurred while connecting to the dashboard service')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const isTouristParam =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('view') === 'tourist'

    if (isTouristParam) {
      setViewMode('tourist')
      loadTouristData().finally(() => setLoading(false))
    } else {
      loadDashboardData()
    }
  }, [])

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
    setHostName(data?.profile?.full_name || 'Rajesh Patil')
    setHostPhone(data?.profile?.phone || '+919800000002')
    setLandmarkNote('')
    setDirectionsSteps([
      'Take state highway towards village exit',
      'Follow hand-painted farm stay signboard at the crossroad',
    ])
    setSelectedCropIds([])
    setImageUrl(
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=85',
    )
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
    setHostName(farm.host_name || data?.profile?.full_name || '')
    setHostPhone(farm.host_phone || data?.profile?.phone || '')
    setLandmarkNote(farm.landmark_note || '')
    setDirectionsSteps(
      Array.isArray(farm.directions_steps) && farm.directions_steps.length > 0
        ? farm.directions_steps
        : ['Take main road to the farm entrance gate'],
    )
    const existingCropIds = farm.crops
      ? farm.crops.map((fc: any) => fc.crop?.id || fc.crop_id).filter(Boolean)
      : []
    setSelectedCropIds(existingCropIds)
    setImageUrl(farm.image_url || '')
    setLat(Number(farm.lat) || 17.0016)
    setLng(Number(farm.lng) || 73.312)
    setPublished(farm.published !== false)
    setListingFormError(null)
    setIsListingModalOpen(true)
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
      cropIds: selectedCropIds,
      imageUrl: imageUrl.trim(),
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
    if (!confirm(`Are you sure you want to delete "${farmName}"? This cannot be undone.`)) {
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
        <p className="section-kicker">Farmer portal</p>
        <h2>Loading your farm dashboard...</h2>
      </section>
    )
  }

  if (viewMode !== 'tourist' && error && !data) {
    return (
      <section className="dashboard-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <p className="section-kicker" style={{ color: '#b33939' }}>Portal Error</p>
        <h2>Unable to load dashboard</h2>
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
          Retry connection
        </button>
      </section>
    )
  }

  const farmerName = data?.profile?.full_name?.split(' ')[0] || 'Farmer'
  const farms = data?.farms || []
  const bookings = data?.bookings || []
  const products = data?.products || []
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
      {/* Portal Mode Switcher */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '28px',
          borderBottom: '1px solid var(--line)',
          paddingBottom: '12px',
        }}
      >
        {!isTouristRole && (
          <button
            type="button"
            onClick={() => setViewMode('farmer')}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 700,
              color: viewMode === 'farmer' ? 'var(--forest)' : 'var(--muted)',
              background: viewMode === 'farmer' ? 'var(--mint)' : 'transparent',
              border: '1px solid',
              borderColor: viewMode === 'farmer' ? 'var(--leaf)' : 'var(--line)',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          >
            Farmer portal
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setViewMode('tourist')
            if (!touristData) loadTouristData()
          }}
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 700,
            color: viewMode === 'tourist' ? 'var(--forest)' : 'var(--muted)',
            background: viewMode === 'tourist' ? 'var(--mint)' : 'transparent',
            border: '1px solid',
            borderColor: viewMode === 'tourist' ? 'var(--leaf)' : 'var(--line)',
            borderRadius: '2px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Compass size={14} /> My bookings &amp; travel safety cards
        </button>
      </div>

      {viewMode === 'tourist' ? (
        <div>
          <div className="dashboard-head" style={{ marginBottom: '28px' }}>
            <div>
              <p className="section-kicker">Tourist portal</p>
              <h1>My Rural Stays &amp; Travel Safety Cards</h1>
              <p>
                Offline directions, host contact details, and emergency travel cards for your farm reservations.
              </p>
            </div>
            <Link className="primary-btn" href="/explore" style={{ textDecoration: 'none' }}>
              Explore more stays
            </Link>
          </div>

          {touristLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', border: '1px solid var(--line)' }}>
              <p className="muted">Loading your bookings and travel safety cards...</p>
            </div>
          ) : !touristData?.bookings || touristData.bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', border: '1px solid var(--line)' }}>
              <p style={{ fontSize: '15px', color: 'var(--ink)', marginBottom: '8px' }}>
                No active bookings found.
              </p>
              <p className="muted" style={{ marginBottom: '20px' }}>
                Discover rural escapes and traditional farm stays across Maharashtra and Kerala.
              </p>
              <Link className="primary-btn" href="/explore" style={{ textDecoration: 'none' }}>
                Browse stays
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
                            {booking.status}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.5px' }}>
                            REF: {booking.id}
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
                          {formatRupees(booking.total_paise)}
                        </strong>
                        <small style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                          {booking.visit_type === 'day' ? 'Day visit' : `${booking.nights} night(s)`} · {booking.guests} guest{booking.guests > 1 ? 's' : ''}
                        </small>
                        {booking.check_in && (
                          <small style={{ display: 'block', fontSize: '11px', color: 'var(--forest)', fontWeight: 700, marginTop: '2px' }}>
                            Arrival: {booking.check_in}
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
                          Reserved farm products for pickup ({reservations.length}):
                        </span>
                        <ul style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '12px', color: '#53685d' }}>
                          {reservations.map((res: any) => (
                            <li key={res.id}>
                              <strong>{res.product?.name}</strong> × {res.qty} ({res.product?.unit}) — {formatRupees((res.product?.price_paise || 0) * res.qty)} · Status: <em>{res.status}</em>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Collapsible Travel map section per booking */}
                    <details
                      className="tourist-travel-map-collapsible"
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
                        <span>Travel map & directions</span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--muted)',
                            fontWeight: 400,
                            marginLeft: 'auto',
                          }}
                        >
                          (Tap to view route)
                        </span>
                      </summary>
                      <div style={{ padding: '14px' }}>
                        <TripMap
                          farm={farm}
                          bookingId={booking.id}
                          checkInDate={checkInDate}
                          visitType={booking.visit_type}
                          guests={booking.guests}
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
          <p className="section-kicker">Farmer portal</p>
          <h1>Good morning, {farmerName}.</h1>
          <p>
            Real-time management for your farm stays, bookings, and harvest pantry.
          </p>
        </div>
        <button
          className="primary-btn"
          type="button"
          onClick={openCreateListing}
        >
          <span>+</span> Add a new listing
        </button>
      </div>

      {/* Overview Stats */}
      <div className="dashboard-stats">
        <div>
          <span className="stat-icon green">
            <ClipboardList size={19} />
          </span>
          <span>
            <strong>{stats.upcomingGuests}</strong>
            <small>upcoming guests</small>
          </span>
          <b>Active</b>
        </div>

        <div>
          <span className="stat-icon yellow">
            <CalendarDays size={19} />
          </span>
          <span>
            <strong>{formatRupees(stats.thisMonthEarningsPaise)}</strong>
            <small>this month&apos;s earnings</small>
          </span>
          <b>Direct</b>
        </div>

        <div>
          <span className="stat-icon blue">
            <ShoppingBasket size={19} />
          </span>
          <span>
            <strong>{stats.newProduceOrders}</strong>
            <small>new produce orders</small>
          </span>
          <b>Pickup</b>
        </div>
      </div>

      {/* Main Grid: Listings + Bookings */}
      <div className="dashboard-grid">
        {/* Panel 1: My Listings */}
        <div className="dashboard-panel">
          <div className="panel-title">
            <div>
              <p className="section-kicker">Your stays ({farms.length})</p>
              <h2>Active farm stays</h2>
            </div>
            <button
              className="text-btn"
              type="button"
              onClick={openCreateListing}
            >
              + New stay
            </button>
          </div>

          {farms.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '20px 0' }}>
              No farm listings yet. Click &quot;Add a new listing&quot; to publish your stay!
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
                      {farm.place} · {farm.max_guests} guests max
                    </p>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span
                        className="status-pill"
                        style={{
                          background: isPub ? '#e4f0e1' : '#f0f0f0',
                          color: isPub ? 'var(--forest)' : 'var(--muted)',
                        }}
                      >
                        {isPub ? 'Published' : 'Unpublished'}
                      </span>
                      {farm.allows_day_visit && (
                        <span className="status-pill" style={{ background: '#e8f0fe', color: '#1a56db' }}>
                          Day visits
                        </span>
                      )}
                    </div>
                  </div>
                  <strong>
                    {formatRupees(farm.price_paise)}
                    <small>/ guest</small>
                  </strong>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                      className="icon-only"
                      title={isPub ? 'Unpublish listing' : 'Publish listing'}
                      onClick={() => handleTogglePublish(farm.id, isPub)}
                      type="button"
                      style={{ padding: '6px', cursor: 'pointer' }}
                    >
                      {isPub ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button
                      className="icon-only"
                      title="Edit stay"
                      onClick={() => openEditListing(farm)}
                      type="button"
                      style={{ padding: '6px', cursor: 'pointer' }}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      className="icon-only"
                      title="Delete stay"
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
              <p className="section-kicker">Next up ({bookings.length})</p>
              <h2>Visitor bookings</h2>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Confirm or decline pending stays
            </span>
          </div>

          {bookings.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '20px 0' }}>
              No bookings received yet.
            </p>
          ) : (
            bookings.map((booking) => {
              const dateObj = booking.check_in ? new Date(booking.check_in) : new Date()
              const dayStr = String(dateObj.getDate())
              const monthStr = dateObj
                .toLocaleString('en-US', { month: 'short' })
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
                      {booking.farm?.name || 'Stay'} · {booking.guests} guest
                      {booking.guests > 1 ? 's' : ''} ({booking.visit_type === 'day' ? 'Day visit' : `${booking.nights} night(s)`})
                    </p>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                      Total: <strong>{formatRupees(booking.total_paise)}</strong>
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
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
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
                          Confirm
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
                          Decline
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
            <p className="section-kicker">Reserve and collect at the farm</p>
            <h2>Pantry products &amp; inventory</h2>
          </div>
          <button
            className="outline-btn"
            type="button"
            onClick={() => setIsProductModalOpen(true)}
          >
            + Add product
          </button>
        </div>

        {products.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '20px 0' }}>
            No products listed yet. Click &quot;Add product&quot; to offer fresh harvests for guest pickup!
          </p>
        ) : (
          <div className="inventory-grid">
            {products.map((item) => {
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
                      {isLow ? 'Low stock' : 'In stock'} · {formatRupees(item.price_paise)}
                    </em>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <button
                        type="button"
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
        )}

        {/* Product Pickup Reservations */}
        {reservations.length > 0 && (
          <div style={{ marginTop: '28px', borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
              <div>
                <p className="section-kicker" style={{ margin: '0 0 2px' }}>
                  Guest pickup basket
                </p>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Active product reservations ({reservations.length})
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Pay directly upon collection
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
                        Qty: {res.qty} · Reserved by {res.tourist?.full_name || 'Guest'}
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
                      {res.status}
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
                        Mark ready for pickup
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
                        Mark collected &amp; paid
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
                  {editingFarmId ? 'Edit listing' : 'Create new listing'}
                </p>
                <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  {editingFarmId ? `Update ${name}` : 'List your working farm stay'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsListingModalOpen(false)}
                aria-label="Close modal"
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
                  Farm stay name *
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Kokan Roots Farmstay"
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>

                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Region *
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px', background: '#fff' }}
                  >
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Place / Village *
                  <input
                    required
                    type="text"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="e.g. Ratnagiri, Alphonso country"
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>

                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Overnight price per guest (paise) *
                  <input
                    required
                    type="number"
                    value={pricePaise}
                    onChange={(e) => setPricePaise(Number(e.target.value))}
                    placeholder="250000 = ₹2,500"
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>
              </div>

              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                Description *
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your working farm, family meals, crops cultivated, and stay highlights..."
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
                  Allow day visits at this farm
                </label>

                {allowsDayVisit && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      Day price per guest (paise)
                      <input
                        type="number"
                        value={dayVisitPricePaise}
                        onChange={(e) => setDayVisitPricePaise(Number(e.target.value))}
                        placeholder="85000 = ₹850"
                        style={{ border: '1px solid var(--line)', padding: '8px', fontSize: '12px' }}
                      />
                    </label>
                    <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      Start hour
                      <input
                        type="time"
                        value={dayVisitStart}
                        onChange={(e) => setDayVisitStart(e.target.value)}
                        style={{ border: '1px solid var(--line)', padding: '8px', fontSize: '12px' }}
                      />
                    </label>
                    <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      End hour
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
                  Max guests *
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
                  Host name *
                  <input
                    required
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="Host full name"
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Host phone *
                  <input
                    required
                    type="tel"
                    value={hostPhone}
                    onChange={(e) => setHostPhone(e.target.value)}
                    placeholder="+91 98000 00000"
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>
              </div>

              {/* Tags and Landmark */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Tags (comma-separated)
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="organic, mango, coastal, hurda-party"
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  Landmark note
                  <input
                    type="text"
                    value={landmarkNote}
                    onChange={(e) => setLandmarkNote(e.target.value)}
                    placeholder="e.g. Near old banyan tree at village crossroad"
                    style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                  />
                </label>
              </div>

              {/* Photo URL */}
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                Photo image URL *
                <input
                  required
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  style={{ border: '1px solid var(--line)', padding: '9px 11px', fontSize: '13px' }}
                />
              </label>

              {/* Directions steps */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                    Directions steps (road directions for arrival)
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
                    + Add step
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
                      placeholder={`Step ${idx + 1}`}
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

              {/* Seasonal Crops Picker */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
                  Seasonal crops (feeds harvest calendar)
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
                  Farm geolocation (interactive pin)
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
                Published immediately on website
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={listingSubmitting}
                className="primary-btn"
                style={{ width: '100%', padding: '12px', fontSize: '13px' }}
              >
                {listingSubmitting ? 'Saving listing...' : editingFarmId ? 'Update listing' : 'Create & publish listing'}
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
                  Harvest pantry
                </p>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Add farm produce for pickup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
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
                  Pickup farm
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
                Product name *
                <input
                  required
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Pure cold-pressed coconut oil"
                  style={{ width: '100%', border: '1px solid var(--line)', padding: '8px', fontSize: '12.5px', marginTop: '3px' }}
                />
              </label>

              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginBottom: '10px' }}>
                Detail / description
                <input
                  type="text"
                  value={productDetail}
                  onChange={(e) => setProductDetail(e.target.value)}
                  placeholder="e.g. Wood-pressed from estate coconuts"
                  style={{ width: '100%', border: '1px solid var(--line)', padding: '8px', fontSize: '12.5px', marginTop: '3px' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <label style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                  Unit *
                  <input
                    required
                    type="text"
                    value={productUnit}
                    onChange={(e) => setProductUnit(e.target.value)}
                    placeholder="e.g. 500 ml, 1 kg"
                    style={{ width: '100%', border: '1px solid var(--line)', padding: '8px', fontSize: '12.5px', marginTop: '3px' }}
                  />
                </label>

                <label style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                  Price (paise) *
                  <input
                    required
                    type="number"
                    value={productPricePaise}
                    onChange={(e) => setProductPricePaise(Number(e.target.value))}
                    placeholder="25000 = ₹250"
                    style={{ width: '100%', border: '1px solid var(--line)', padding: '8px', fontSize: '12.5px', marginTop: '3px' }}
                  />
                </label>
              </div>

              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginBottom: '16px' }}>
                Available stock quantity *
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
                {productSubmitting ? 'Saving product...' : 'Add to farm pantry'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
