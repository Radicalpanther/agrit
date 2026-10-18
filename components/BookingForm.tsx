'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Clock3,
  Leaf,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Star,
  Sun,
  Users,
  Copy,
  Check,
  Loader2,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
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
  const t = useTranslations('booking')
  const tFarm = useTranslations('farmDetail')
  const locale = useLocale()

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
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({})
  const [showAllProduce, setShowAllProduce] = useState(false)

  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [bookingId, setBookingId] = useState<string>('')
  const [bookingStatus, setBookingStatus] = useState<'pending' | 'confirmed' | 'declined'>('pending')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [notificationPreview, setNotificationPreview] = useState<{
    template: string
    toPhone: string
    status: 'sent' | 'failed' | 'mock'
    previewText: string
  } | null>(null)
  const [copiedRef, setCopiedRef] = useState(false)

  const handleCopyRef = () => {
    if (!bookingId) return
    navigator.clipboard.writeText(bookingId).then(() => {
      setCopiedRef(true)
      setTimeout(() => setCopiedRef(false), 2000)
    })
  }

  // Poll status every 20 seconds while on the confirmation view
  useEffect(() => {
    if (!sent || !bookingId) return

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data.booking?.status) {
            setBookingStatus(data.booking.status)
          }
        }
      } catch {
        // Fail-safe: ignore polling errors
      }
    }

    const interval = setInterval(pollStatus, 20000)
    return () => clearInterval(interval)
  }, [sent, bookingId])

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) => {
      const exists = prev.includes(id)
      if (exists) {
        return prev.filter((item) => item !== id)
      } else {
        if (!productQuantities[id]) {
          setProductQuantities((q) => ({ ...q, [id]: 1 }))
        }
        return [...prev, id]
      }
    })
  }

  const updateProductQty = (id: string, delta: number, maxStock: number) => {
    setProductQuantities((prev) => {
      const current = prev[id] || 1
      const next = Math.max(1, Math.min(maxStock, current + delta))
      return { ...prev, [id]: next }
    })
  }

  // Active rate per guest based on selected visit type
  const activeRate = visitType === 'day' ? dayRate : overnightRate

  // Dynamic pricing calculation with real product quantities
  const pricing = useMemo(() => {
    const selectedProduce = produce.filter((p) => selectedAddOns.includes(p.id))
    const addOns = selectedProduce.map((p) => ({
      id: p.id,
      pricePaise: p.pricePaise,
      qty: productQuantities[p.id] || 1,
    }))

    return calculateBookingPrice({
      visitType,
      guests,
      nights,
      ratePerGuestPaise: activeRate,
      addOns,
    })
  }, [visitType, guests, nights, activeRate, produce, selectedAddOns, productQuantities])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!phone || phone.trim().length < 8) {
      setErrorMsg(t('errors.invalidPhone'))
      return
    }

    if (!checkInDate) {
      setErrorMsg(t('errors.selectDate'))
      return
    }

    setLoading(true)

    try {
      const productReservations = selectedAddOns.map((id) => ({
        id,
        qty: productQuantities[id] || 1,
      }))

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
          products: productReservations,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMsg(data.error || t('errors.submitFailed'))
        return
      }

      const bookedId = data.id || 'BK-CONFIRMED'
      setBookingId(bookedId)
      setBookingStatus(data.booking?.status || 'pending')
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
      setErrorMsg(t('errors.serverError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Two-column booking layout: Left keeps farm info; Right shows form or short confirmation */}
      <div className={`booking-layout ${sent ? 'booking-confirmed' : ''}`} style={sent ? { position: 'static' } : undefined}>
        {/* Left column: Farm photo, title, verified status, description and amenities */}
        <div className={`booking-left-column ${sent ? 'order-2 lg:order-1' : 'order-1'} min-w-0 w-full`}>
          <div className="booking-photo">
            <FarmImage src={farm.image} alt={farm.name} />
          </div>
          <div className="booking-copy">
            <p className="section-kicker">{tFarm('ruralReset')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h1 className="text-[clamp(22px,5vw,40px)] font-bold text-[var(--ink)] m-0 leading-tight break-words [overflow-wrap:anywhere]">{farm.name}</h1>
              {farm.verified && <VerifiedBadge size="md" />}
            </div>
            <p className="muted">
              <MapPin size={14} /> {farm.place} ·{' '}
              <Star size={14} fill="currentColor" /> {farm.rating} (
              {tFarm('reviewsCount', { count: farm.reviews })})
            </p>
            <p className="break-words [overflow-wrap:anywhere]">{farm.description}</p>
            <div className="amenities">
              <span>
                <Leaf size={16} /> {tFarm('amenities.organicMeals')}
              </span>
              <span>
                <Users size={16} /> {tFarm('amenities.sleeps', { count: farm.sleeps })}
              </span>
              <span>
                <Clock3 size={16} /> {tFarm('amenities.flexibleCheckIn')}
              </span>
              {raw.allows_day_visit && (
                <span>
                  <Sun size={16} /> {tFarm('amenities.dayVisitsAllowed')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Form or Confirmation card */}
        <div className={`booking-right-column ${sent ? 'order-1 lg:order-2' : 'order-2'} min-w-0 w-full`}>
          {sent ? (
            <div
              className="booking-form booking-confirmed w-full max-w-full bg-white border border-[var(--line)] p-5 sm:p-7 shadow-xs box-border"
            >
              <div className="flex flex-col items-center gap-3 sm:gap-4 text-center w-full max-w-full">
                {/* 1. Icon */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--mint)] text-[var(--forest)] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>

                {/* 2. Heading */}
                <h3 className="text-lg sm:text-xl font-bold text-[var(--ink)] m-0 leading-tight">
                  {t('confirmation.requestReceived')}
                </h3>

                {/* 3. Booking Reference */}
                <div className="flex flex-col items-center gap-1 w-full max-w-full">
                  <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--muted)]">
                    {t('confirmation.bookingRefLabel')}
                  </span>
                  <div className="flex items-center justify-center gap-2 max-w-full flex-wrap">
                    <code className="font-mono text-xs sm:text-sm font-bold text-[var(--forest)] bg-[var(--cream)] px-2.5 py-1 rounded-xs border border-[var(--line)] break-all [overflow-wrap:anywhere] max-w-full">
                      {bookingId}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyRef}
                      aria-label={t('confirmation.copyRef')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--forest)] bg-white border border-[var(--line)] px-2.5 py-1 min-h-[36px] transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedRef ? <Check className="w-3.5 h-3.5 text-[var(--forest)]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRef ? t('confirmation.copiedRef') : t('confirmation.copyRef')}</span>
                    </button>
                  </div>
                </div>

                {/* 4. Status Pill */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider border rounded-xs ${
                      bookingStatus === 'confirmed'
                        ? 'bg-[#e4f0e1] text-[var(--forest)] border-[#c4dec0]'
                        : bookingStatus === 'declined'
                        ? 'bg-[#f8d7da] text-[#842029] border-[#f5c2c7]'
                        : 'bg-[#fff1dd] text-[#a86f27] border-[#ffe5c4]'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        bookingStatus === 'confirmed'
                          ? 'bg-[var(--forest)]'
                          : bookingStatus === 'declined'
                          ? 'bg-[#842029]'
                          : 'bg-[#d9984a]'
                      }`}
                    />
                    {t('confirmation.statusLabel', {
                      status:
                        bookingStatus === 'confirmed'
                          ? t('statuses.confirmed')
                          : bookingStatus === 'declined'
                          ? t('statuses.declined')
                          : t('statuses.pending'),
                    })}
                  </span>

                  {/* 5. Auto-refresh note with small spinner icon */}
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                    <Loader2 className="w-3 h-3 animate-spin text-[var(--muted)] shrink-0" />
                    {t('confirmation.autoRefresh')}
                  </span>
                </div>

                {/* 6. Message Paragraph */}
                <p className="text-xs sm:text-[13px] text-[#53685d] leading-relaxed max-w-md m-0">
                  {t('confirmation.requestSummary', {
                    visitType: visitType === 'day' ? t('visitTypes.day') : t('visitTypes.overnight'),
                    guests,
                    farmName: farm.name,
                  })}
                  {phone ? ` ${t('confirmation.hostContactNote', { phone })}` : ''}
                  {' '}{t('confirmation.noPaymentRequired')}
                </p>
              </div>
            </div>
          ) : (
          <form className="booking-form" onSubmit={handleSubmit}>
            <div className="form-header">
              <div>
                <p className="section-kicker">{t('reserveStay')}</p>
                <h2>{t('makeItAVisit')}</h2>
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
                    {t('packageDiscount', { packageName: pricing.packageName, pct: pricing.discountPct })}
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
                      {formatRupees(activeRate, locale)}
                    </del>
                    <strong style={{ fontSize: '18px', color: 'var(--ink)' }}>
                      {formatRupees(pricing.effectiveRatePerGuestPaise, locale)}
                    </strong>
                    <small style={{ display: 'block', fontSize: '10px', color: 'var(--muted)' }}>
                      {t('perGuest')} {visitType === 'overnight' ? t('perNight') : ''}
                    </small>
                  </div>
                ) : (
                  <div>
                    <strong style={{ fontSize: '18px', color: 'var(--ink)' }}>
                      {formatRupees(activeRate, locale)}
                    </strong>
                    <small style={{ display: 'block', fontSize: '10px', color: 'var(--muted)' }}>
                      {t('perGuest')} {visitType === 'overnight' ? t('perNight') : ''}
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
                <Sun size={15} /> {t('dayVisit')}
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
                {t('overnightStay')}
              </button>
            </div>

            <div className="form-grid">
              <label>
                {t('yourName')}
                <input
                  required
                  type="text"
                  placeholder={t('namePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>

              <label>
                {t('emailAddress')}
                <input
                  required
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label>
                {t('mobileNumber')}
                <input
                  type="tel"
                  placeholder={t('mobilePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>

              <label>
                {t('checkInDate')}
                <input
                  required
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
              </label>

              {visitType === 'day' ? (
                <label>
                  {t('arrivalTime')}
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                  />
                </label>
              ) : (
                <label>
                  {t('nights')}
                  <select
                    value={nights}
                    onChange={(e) => setNights(Number(e.target.value))}
                  >
                    <option value={1}>{t('nightsCount', { count: 1 })}</option>
                    <option value={2}>{t('nightsCount', { count: 2 })}</option>
                    <option value={3}>{t('nightsCount', { count: 3 })}</option>
                    <option value={4}>{t('nightsCount', { count: 4 })}</option>
                    <option value={5}>{t('nightsCount', { count: 5 })}</option>
                    <option value={7}>{t('nightsCount', { count: 7 })}</option>
                  </select>
                </label>
              )}

              <label>
                {t('guests')}
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                >
                  <option value={1}>{t('guestsCount', { count: 1 })}</option>
                  <option value={2}>{t('guestsCount', { count: 2 })}</option>
                  <option value={3}>{t('guestsCount', { count: 3 })}</option>
                  <option value={4}>{t('guestsCountWithPkg', { count: 4, pkg: t('familyPkg') })}</option>
                  <option value={6}>{t('guestsCountWithPkg', { count: 6, pkg: t('familyPkg') })}</option>
                  <option value={8}>{t('guestsCountWithPkg', { count: 8, pkg: t('familyPkg') })}</option>
                  <option value={10}>{t('guestsCountWithPkg', { count: 10, pkg: t('groupPkg') })}</option>
                  <option value={12}>{t('guestsCountWithPkg', { count: 12, pkg: t('groupPkg') })}</option>
                  <option value={15}>{t('guestsCountWithPkg', { count: 15, pkg: t('groupPkg') })}</option>
                </select>
              </label>
            </div>

            {/* Reserve products to collect at the farm */}
            {produce.length > 0 && (
              <div className="add-ons" style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--line)' }}>
                <div className="add-on-heading" style={{ marginBottom: '14px' }}>
                  <div>
                    <p className="section-kicker" style={{ margin: '0 0 4px' }}>{t('productsKicker')}</p>
                    <h3 style={{ margin: 0, fontSize: '15px' }}>{t('optionalProducts')}</h3>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{t('payAtFarm')}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(showAllProduce ? produce : produce.slice(0, 6)).map((item) => {
                    const isSelected = selectedAddOns.includes(item.id)
                    const qty = productQuantities[item.id] || 1
                    const maxStock = typeof (item as any).stock === 'number' && (item as any).stock > 0 ? (item as any).stock : 20
                    const lineTotal = item.pricePaise * qty

                    return (
                      <div
                        key={item.id}
                        className={`booking-produce-item ${isSelected ? 'is-selected' : ''}`}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px',
                              flex: 1,
                              cursor: 'pointer',
                              margin: 0,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleAddOn(item.id)}
                              style={{
                                accentColor: 'var(--forest)',
                                width: '16px',
                                height: '16px',
                                marginTop: '2px',
                                cursor: 'pointer',
                              }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>
                                {item.name}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.4 }}>
                                {(item as any).unit ? `${(item as any).unit} · ` : ''}{item.detail}
                              </span>
                            </div>
                          </label>

                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                            {formatRupees(item.pricePaise, locale)}
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginTop: '10px',
                              paddingTop: '8px',
                              borderTop: '1px solid #edf1eb',
                              paddingLeft: '26px',
                            }}
                          >
                            <div className="booking-produce-stepper">
                              <button
                                type="button"
                                aria-label={t('decreaseQty')}
                                onClick={() => updateProductQty(item.id, -1, maxStock)}
                                disabled={qty <= 1}
                              >
                                <Minus size={13} />
                              </button>
                              <span>{qty}</span>
                              <button
                                type="button"
                                aria-label={t('increaseQty')}
                                onClick={() => updateProductQty(item.id, 1, maxStock)}
                                disabled={qty >= maxStock}
                              >
                                <Plus size={13} />
                              </button>
                            </div>

                            <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                              {t('lineTotal')}{' '}
                              <strong style={{ color: 'var(--ink)', fontSize: '12.5px' }}>
                                {formatRupees(lineTotal, locale)}
                              </strong>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {produce.length > 6 && (
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAllProduce(!showAllProduce)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--forest)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {showAllProduce ? t('showFewer') : t('showMore', { count: produce.length - 6 })}
                    </button>
                  </div>
                )}
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
                gap: '7px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                <span>
                  {visitType === 'day' ? t('visitTypes.day') : t('visitTypes.overnight')} ({t('guestsCount', { count: pricing.guests })}
                  {visitType === 'overnight' ? ` × ${t('nightsCount', { count: pricing.nights })}` : ''})
                </span>
                <span>{formatRupees(pricing.subtotalPaise, locale)}</span>
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
                    {t('packageDiscount', { packageName: pricing.packageName, pct: pricing.discountPct })}
                  </span>
                  <span>-{formatRupees(pricing.discountPaise, locale)}</span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'var(--ink)',
                  fontWeight: 600,
                  borderTop: '1px dashed var(--line)',
                  paddingTop: '6px',
                  marginTop: '2px',
                }}
              >
                <span>{t('stayTotal')}</span>
                <span>{formatRupees(pricing.discountedBasePaise, locale)}</span>
              </div>

              {pricing.addOnsTotalPaise > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: 'var(--forest)',
                    fontWeight: 600,
                    borderTop: '1px dashed var(--line)',
                    paddingTop: '6px',
                    marginTop: '2px',
                  }}
                >
                  <span>{t('productsSummary')}</span>
                  <span>+{formatRupees(pricing.addOnsTotalPaise, locale)}</span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--line)',
                  marginTop: '6px',
                  paddingTop: '8px',
                  fontSize: '15px',
                  fontWeight: 800,
                  color: 'var(--ink)',
                }}
              >
                <span>{t('total')}</span>
                <span>{formatRupees(pricing.totalPaise, locale)}</span>
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
              {loading ? t('submitting') : t('requestToBook')}{' '}
              <ArrowRight size={17} />
            </button>

            <p className="form-note">
              {t('formNote')}
            </p>
          </form>
        )}
        </div>
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
                {t('confirmation.reservedProductsHeading', { count: selectedAddOns.length })}
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#53685d', lineHeight: 1.65 }}>
                {produce
                  .filter((p) => selectedAddOns.includes(p.id))
                  .map((p) => {
                    const qty = productQuantities[p.id] || 1
                    return (
                      <li key={p.id}>
                        <strong>{p.name} x {qty}</strong> · {formatRupees(p.pricePaise * qty, locale)} ({t('confirmation.payAtFarmUponPickup')})
                      </li>
                    )
                  })}
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

          {/* Notification Message Preview Panel */}
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
                  {t('notification.previewTitle')}
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
                    ? t('notification.mockMode')
                    : t('notification.sentViaTelegram')}
                </span>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 10px', wordBreak: 'break-word' }}>
                {t('notification.channel')} <strong>{notificationPreview.status === 'mock' ? t('notification.mockChannel') : t('notification.telegramChannel')}</strong> · {t('notification.event')} <code>{notificationPreview.template || 'booking_created'}</code>
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
                {t('notification.loggedNote')}
              </p>
            </div>
          )}

          {/* Travel & Route Map */}
          {(() => {
            const reservations = Object.entries(productQuantities)
              .filter(([, qty]) => qty > 0)
              .map(([prodId, qty]) => {
                const prod = produce.find((p) => p.id === prodId)
                return {
                  id: prodId,
                  qty,
                  status: 'reserved',
                  product: prod
                    ? { name: prod.name, unit: prod.unit, price_paise: prod.pricePaise }
                    : undefined,
                }
              })

            return (
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
                  landmarks: (raw as any).landmarks || farm.landmarks || [],
                  nearby_services: (raw as any).nearby_services || farm.nearbyServices,
                  allows_day_visit: raw.allows_day_visit ?? farm.allowsDayVisit,
                  day_visit_start: raw.day_visit_start || farm.dayVisitStart,
                  day_visit_end: raw.day_visit_end || farm.dayVisitEnd,
                  check_in_time: raw.check_in_time || farm.checkInTime,
                  check_out_time: raw.check_out_time || farm.checkOutTime,
                  last_safe_arrival: raw.last_safe_arrival || farm.lastSafeArrival,
                  host_contact_hours: raw.host_contact_hours || farm.hostContactHours,
                  rules: (raw as any).rules || farm.rules || [],
                  activities: (raw as any).activities || farm.activities || [],
                  crops: (raw as any).farm_crops || farm.crops || [],
                }}
                bookingId={bookingId}
                guestName={fullName}
                checkInDate={checkInDate}
                visitType={visitType}
                guests={guests}
                bookingStatus={bookingStatus}
                reservations={reservations}
              />
            )
          })()}

          <div className="mt-6 flex gap-3 flex-wrap w-full">
            <Link
              className="primary-btn min-h-[44px] px-6 py-3 inline-flex items-center justify-center text-xs sm:text-sm font-bold no-underline w-full sm:w-auto"
              href="/explore"
            >
              {t('confirmation.exploreMoreStays')}
            </Link>
          </div>
        </section>
      )}
    </>
  )
}
