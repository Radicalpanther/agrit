'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Clock3,
  Leaf,
  MapPin,
  ShieldCheck,
  Star,
  Sun,
  Users,
} from 'lucide-react'
import type { Farm, Produce } from '@/lib/mock-data'
import { formatRupees } from '@/lib/money'
import { calculateBookingPrice } from '@/lib/pricing'
import { EcoScore } from '@/components/EcoScore'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { FarmImage } from '@/components/FarmImage'
import dynamic from 'next/dynamic'

const TripMap = dynamic(
  () => import('@/components/TripMap').then((m) => m.TripMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: '320px',
          background: '#f4f6f2',
          border: '1px solid var(--line)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--muted)',
          fontSize: '12px',
        }}
      >
        Loading interactive route map...
      </div>
    ),
  },
)

export interface BookingFormProps {
  farm: Farm & {
    lat?: number
    lng?: number
    hostName?: string
    hostPhone?: string
    directionsSteps?: string[]
    landmarkNote?: string | null
    raw?: {
      lat?: number
      lng?: number
      allows_day_visit?: boolean
      day_visit_price_paise?: number
      day_visit_start?: string
      day_visit_end?: string
      host_name?: string
      host_phone?: string
      directions_steps?: string[]
      landmark_note?: string | null
      organic_pct?: number
      verified?: boolean
      [key: string]: any
    }
    [key: string]: any
  }
  produce: Produce[]
}

export function BookingForm({ farm, produce }: BookingFormProps) {
  const raw = farm.raw || {}
  const dayRate = raw.day_visit_price_paise || farm.pricePaise
  const overnightRate = farm.pricePaise

  // Default to 'day' visit as requested in prompt
  const [visitType, setVisitType] = useState<'day' | 'overnight'>('day')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsappOptIn, setWhatsappOptIn] = useState(true)
  const [checkInDate, setCheckInDate] = useState('')
  const [arrivalTime, setArrivalTime] = useState(
    raw.day_visit_start ? raw.day_visit_start.slice(0, 5) : '09:30',
  )
  const [nights, setNights] = useState(1)
  const [guests, setGuests] = useState(2)
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [bookingId, setBookingId] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [notificationPreview, setNotificationPreview] = useState<{
    template: string
    toPhone: string
    status: 'sent' | 'failed' | 'mock'
    previewText: string
  } | null>(null)

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  // Active rate per guest based on selected visit type
  const activeRate = visitType === 'day' ? dayRate : overnightRate

  // Dynamic pricing calculation
  const pricing = useMemo(() => {
    const selectedProduce = produce.filter((p) => selectedAddOns.includes(p.id))
    const addOns = selectedProduce.map((p) => ({
      id: p.id,
      pricePaise: p.pricePaise,
      qty: 1,
    }))

    return calculateBookingPrice({
      visitType,
      guests,
      nights,
      ratePerGuestPaise: activeRate,
      addOns,
    })
  }, [visitType, guests, nights, activeRate, produce, selectedAddOns])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!phone || phone.trim().length < 8) {
      setErrorMsg('Please enter a valid phone number.')
      return
    }

    if (!checkInDate) {
      setErrorMsg('Please select a date for your visit.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmSlug: farm.slug,
          visitType,
          fullName,
          email,
          phone,
          whatsappOptIn,
          checkInDate,
          arrivalTime: visitType === 'day' ? arrivalTime : undefined,
          nights: visitType === 'overnight' ? nights : 1,
          guests,
          addOnIds: selectedAddOns,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMsg(data.error || 'Failed to submit booking request.')
        return
      }

      const bookedId = data.id || 'BK-CONFIRMED'
      setBookingId(bookedId)
      if (data.notification) {
        setNotificationPreview(data.notification)
      } else {
        // Fallback fetch if not returned directly in payload
        fetch(`/api/bookings/${bookedId}/notification`)
          .then((res) => res.json())
          .then((nData) => {
            if (nData?.notification) setNotificationPreview(nData.notification)
          })
          .catch(() => {})
      }
      setSent(true)
    } catch {
      setErrorMsg('An unexpected error occurred while communicating with the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Two-column booking layout: Left keeps farm info; Right shows form or short confirmation */}
      <div className={`booking-layout ${sent ? 'booking-confirmed' : ''}`} style={sent ? { position: 'static' } : undefined}>
        {/* Left column: Farm photo, title, verified status, description and amenities */}
        <div className="booking-left-column">
          <div className="booking-photo">
            <FarmImage src={farm.image} alt={farm.name} />
          </div>
          <div className="booking-copy">
            <p className="section-kicker">Your rural reset</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h1 style={{ margin: 0 }}>{farm.name}</h1>
              {farm.verified && <VerifiedBadge size="md" />}
            </div>
            <p className="muted">
              <MapPin size={14} /> {farm.place} ·{' '}
              <Star size={14} fill="currentColor" /> {farm.rating} (
              {farm.reviews} reviews)
            </p>
            <p>{farm.description}</p>
            <div className="amenities">
              <span>
                <Leaf size={16} /> Organic meals
              </span>
              <span>
                <Users size={16} /> Sleeps {farm.sleeps}
              </span>
              <span>
                <Clock3 size={16} /> Flexible check-in
              </span>
              {raw.allows_day_visit && (
                <span>
                  <Sun size={16} /> Day visits allowed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Form or Short "Request received by host" message */}
        {sent ? (
          <div
            className="booking-form booking-confirmed"
            style={{
              position: 'static',
              boxSizing: 'border-box',
              width: '100%',
              maxWidth: '100%',
            }}
          >
            <div className="success-state" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div
                style={{
                  color: 'var(--forest)',
                  margin: '0 auto 16px',
                  width: '52px',
                  height: '52px',
                  background: 'var(--mint)',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <ShieldCheck size={28} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: 'var(--ink)' }}>
                Request received by host.
              </h3>
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--forest)',
                  letterSpacing: '1px',
                  margin: '0 0 12px',
                }}
              >
                Booking Reference: {bookingId}
              </p>
              <p
                style={{
                  lineHeight: 1.6,
                  color: '#53685d',
                  fontSize: '13px',
                  margin: 0,
                }}
              >
                Your request for a {visitType === 'day' ? 'Day visit' : 'Overnight stay'} ({guests} guest{guests > 1 ? 's' : ''}) has been submitted to your host at {farm.name}.
                Your host will review availability and contact you directly at {phone}
                {whatsappOptIn ? ' and via WhatsApp' : ''} within 24 hours with arrival instructions. No payment is required today.
              </p>
            </div>
          </div>
        ) : (
          <form className="booking-form" onSubmit={handleSubmit}>
            <div className="form-header">
              <div>
                <p className="section-kicker">Reserve your stay</p>
                <h2>Make it a visit.</h2>
                {pricing.discountPct > 0 && (
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '10px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      color: 'var(--leaf)',
                      marginTop: '4px',
                    }}
                  >
                    {pricing.packageName} ({pricing.discountPct}% off)
                  </span>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                {pricing.discountPct > 0 ? (
                  <div>
                    <del
                      style={{
                        display: 'block',
                        color: 'var(--muted)',
                        fontSize: '12px',
                        textDecoration: 'line-through',
                      }}
                    >
                      {formatRupees(activeRate)}
                    </del>
                    <strong style={{ fontSize: '18px', color: 'var(--ink)' }}>
                      {formatRupees(pricing.effectiveRatePerGuestPaise)}
                    </strong>
                    <small style={{ display: 'block', fontSize: '10px', color: 'var(--muted)' }}>
                      / guest {visitType === 'overnight' ? '/ night' : ''}
                    </small>
                  </div>
                ) : (
                  <div>
                    <strong style={{ fontSize: '18px', color: 'var(--ink)' }}>
                      {formatRupees(activeRate)}
                    </strong>
                    <small style={{ display: 'block', fontSize: '10px', color: 'var(--muted)' }}>
                      / guest {visitType === 'overnight' ? '/ night' : ''}
                    </small>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <p
                style={{
                  color: 'var(--ink)',
                  background: 'var(--mint)',
                  padding: '8px 12px',
                  fontSize: '12px',
                  margin: '0 0 16px',
                  border: '1px solid var(--line)',
                }}
              >
                {errorMsg}
              </p>
            )}

            {/* Day Visit or Overnight Toggle */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: '18px',
              }}
            >
              <button
                type="button"
                onClick={() => setVisitType('day')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: visitType === 'day' ? 700 : 500,
                  border: '1px solid',
                  borderColor: visitType === 'day' ? 'var(--forest)' : 'var(--line)',
                  background: visitType === 'day' ? 'var(--forest)' : '#ffffff',
                  color: visitType === 'day' ? '#ffffff' : 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                <Sun size={15} /> Day visit
              </button>
              <button
                type="button"
                onClick={() => setVisitType('overnight')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: visitType === 'overnight' ? 700 : 500,
                  border: '1px solid',
                  borderColor: visitType === 'overnight' ? 'var(--forest)' : 'var(--line)',
                  background: visitType === 'overnight' ? 'var(--forest)' : '#ffffff',
                  color: visitType === 'overnight' ? '#ffffff' : 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                Overnight stay
              </button>
            </div>

            <div className="form-grid">
              <label>
                Your name
                <input
                  required
                  type="text"
                  placeholder="e.g. Ramesh Deshmukh"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>

              <label>
                Email address
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label>
                Mobile number
                <input
                  required
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>

              <label>
                Check-in date
                <input
                  required
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
              </label>

              {visitType === 'day' ? (
                <label>
                  Arrival time
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                  />
                </label>
              ) : (
                <label>
                  Nights
                  <select
                    value={nights}
                    onChange={(e) => setNights(Number(e.target.value))}
                  >
                    <option value={1}>1 night</option>
                    <option value={2}>2 nights</option>
                    <option value={3}>3 nights</option>
                    <option value={4}>4 nights</option>
                    <option value={5}>5 nights</option>
                    <option value={7}>7 nights</option>
                  </select>
                </label>
              )}

              <label>
                Guests
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                >
                  <option value={1}>1 guest</option>
                  <option value={2}>2 guests</option>
                  <option value={3}>3 guests</option>
                  <option value={4}>4 guests (Family Package 10% off)</option>
                  <option value={6}>6 guests (Family Package 10% off)</option>
                  <option value={8}>8 guests (Family Package 10% off)</option>
                  <option value={10}>10 guests (Group Package 20% off)</option>
                  <option value={12}>12 guests (Group Package 20% off)</option>
                  <option value={15}>15 guests (Group Package 20% off)</option>
                </select>
              </label>
            </div>

            {/* WhatsApp Updates Opt-in */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '12px',
                color: 'var(--ink)',
                margin: '16px 0 20px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={whatsappOptIn}
                onChange={(e) => setWhatsappOptIn(e.target.checked)}
                style={{ accentColor: 'var(--forest)', width: '16px', height: '16px' }}
              />
              Receive reservation status and host arrival directions on WhatsApp
            </label>

            {/* Reserve products to collect at the farm */}
            {produce.length > 0 && (
              <div className="add-ons">
                <div className="add-on-heading">
                  <div>
                    <p className="section-kicker">Reserve and collect at the farm</p>
                    <h3>Reserve products to collect at the farm</h3>
                  </div>
                  <span>Pay at the farm</span>
                </div>

                {produce.slice(0, 3).map((item) => (
                  <label className="addon-row" key={item.id}>
                    <input
                      type="checkbox"
                      checked={selectedAddOns.includes(item.id)}
                      onChange={() => toggleAddOn(item.id)}
                    />
                    <FarmImage src={item.image} alt={item.name} />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <b>{formatRupees(item.pricePaise)}</b>
                  </label>
                ))}
              </div>
            )}

            {/* Price Breakdown Box */}
            <div
              style={{
                borderTop: '1px solid var(--line)',
                marginTop: '20px',
                paddingTop: '16px',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                <span>
                  {visitType === 'day' ? 'Day visit' : 'Overnight'} ({pricing.guests} guests
                  {visitType === 'overnight' ? ` × ${pricing.nights} night${pricing.nights > 1 ? 's' : ''}` : ''})
                </span>
                <span>{formatRupees(pricing.subtotalPaise)}</span>
              </div>

              {pricing.discountPct > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: 'var(--leaf)',
                    fontWeight: 700,
                  }}
                >
                  <span>
                    {pricing.packageName} ({pricing.discountPct}% off)
                  </span>
                  <span>-{formatRupees(pricing.discountPaise)}</span>
                </div>
              )}

              {pricing.addOnsTotalPaise > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                  <span>Reserved products to collect at the farm ({selectedAddOns.length})</span>
                  <span>+{formatRupees(pricing.addOnsTotalPaise)} (pay at farm)</span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--line)',
                  marginTop: '8px',
                  paddingTop: '8px',
                  fontSize: '15px',
                  fontWeight: 800,
                  color: 'var(--ink)',
                }}
              >
                <span>Total</span>
                <span>{formatRupees(pricing.totalPaise)}</span>
              </div>

              <EcoScore
                variant="summary"
                guests={guests}
                nights={visitType === 'overnight' ? nights : 1}
                visitType={visitType}
                organicPct={raw.organic_pct ?? farm.organicPct ?? 85}
              />
            </div>

            <button
              className="primary-btn submit-btn"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Submitting request...' : 'Request to book'}{' '}
              <ArrowRight size={17} />
            </button>

            <p className="form-note">
              No payment today · Free cancellation up to 48 hours before arrival
            </p>
          </form>
        )}
      </div>

      {/* Confirmation content rendered as a normal full-width section BELOW the two-column booking layout */}
      {sent && (
        <section
          className="booking-confirmation-section"
          style={{
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            marginTop: '36px',
            borderTop: '1px solid var(--line)',
            paddingTop: '36px',
            position: 'static',
            overflow: 'hidden',
          }}
        >
          {/* Reserved products to collect at farm */}
          {selectedAddOns.length > 0 && (
            <div
              style={{
                border: '1px solid var(--line)',
                background: '#ffffff',
                padding: '16px 20px',
                marginBottom: '24px',
                textAlign: 'left',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--forest)', marginBottom: '8px' }}>
                Reserved products to collect at the farm ({selectedAddOns.length}):
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#53685d', lineHeight: 1.65 }}>
                {produce
                  .filter((p) => selectedAddOns.includes(p.id))
                  .map((p) => (
                    <li key={p.id}>
                      <strong>{p.name}</strong> · {formatRupees(p.pricePaise)} (Pay at the farm upon pickup)
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Eco-Impact Receipt Block */}
          <EcoScore
            variant="receipt"
            guests={guests}
            nights={visitType === 'overnight' ? nights : 1}
            visitType={visitType}
            organicPct={raw.organic_pct ?? farm.organicPct ?? 85}
            style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
          />

          {/* WhatsApp Message Preview Panel */}
          {notificationPreview && (
            <div
              className="message-preview-panel"
              style={{
                border: '1px solid var(--line)',
                background: '#ffffff',
                padding: '18px 20px',
                margin: '24px 0',
                textAlign: 'left',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--line)',
                  paddingBottom: '10px',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: 'var(--forest)',
                  }}
                >
                  Message preview
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    background: notificationPreview.status === 'mock' ? 'var(--mint)' : '#e2f0d9',
                    color: 'var(--forest)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {notificationPreview.status === 'mock'
                    ? 'Mock mode'
                    : 'Sent via WhatsApp'}
                </span>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 10px', wordBreak: 'break-word' }}>
                To: <strong>{notificationPreview.toPhone}</strong> · Template: <code>{notificationPreview.template}</code>
              </p>

              <div
                style={{
                  background: '#f9faf7',
                  border: '1px solid #e2e8df',
                  padding: '14px 16px',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: 'var(--ink)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {notificationPreview.previewText}
              </div>

              <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '10px 0 0' }}>
                Outbound WhatsApp Cloud API template dispatch logged to notifications table.
              </p>
            </div>
          )}

          {/* Travel & Route Map */}
          <TripMap
            farm={{
              name: farm.name,
              slug: farm.slug,
              place: farm.place,
              region: farm.region,
              lat: Number(farm.lat) || Number((raw as any).lat) || 17.0016,
              lng: Number(farm.lng) || Number((raw as any).lng) || 73.312,
              host_name: raw.host_name || farm.hostName || 'Rajesh Patil',
              host_phone: raw.host_phone || farm.hostPhone || '+919800000002',
              directions_steps: (raw.directions_steps && raw.directions_steps.length > 0)
                ? raw.directions_steps
                : farm.directionsSteps || [
                    'Take NH66 towards Ratnagiri',
                    'Turn at Mirya phata',
                    'Follow the board at the mango grove',
                  ],
              landmark_note: raw.landmark_note || farm.landmarkNote,
            }}
            bookingId={bookingId}
            checkInDate={checkInDate}
            visitType={visitType}
            guests={guests}
          />

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              className="primary-btn"
              href="/explore"
              style={{ textDecoration: 'none', display: 'inline-flex', padding: '12px 24px', fontSize: '13px' }}
            >
              Explore more stays
            </Link>
          </div>
        </section>
      )}
    </>
  )
}
