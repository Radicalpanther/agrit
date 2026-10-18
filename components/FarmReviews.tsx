'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Star,
  Camera,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  AlertCircle,
  MessageSquare,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { FarmReview, ReviewPhoto } from '@/lib/mock-data'

export interface FarmReviewsProps {
  farmId: string
  farmSlug: string
  farmName: string
  initialRatingAvg: number | string
  initialReviewCount: number
  initialReviews: FarmReview[]
}

// Flat Star Rating Helper
function StarRating({
  rating,
  size = 14,
  interactive = false,
  onChange,
}: {
  rating: number
  size?: number
  interactive?: boolean
  onChange?: (val: number) => void
}) {
  const [hoverVal, setHoverVal] = useState<number | null>(null)

  const activeRating = hoverVal !== null ? hoverVal : rating

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
      }}
      role={interactive ? 'radiogroup' : undefined}
      onMouseLeave={() => interactive && setHoverVal(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= activeRating
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange && onChange(star)}
            onMouseEnter={() => interactive && setHoverVal(star)}
            onFocus={() => interactive && setHoverVal(star)}
            onBlur={() => interactive && setHoverVal(null)}
            aria-label={interactive ? `${star} star${star > 1 ? 's' : ''}` : undefined}
            style={{
              padding: 0,
              background: 'none',
              border: 'none',
              cursor: interactive ? 'pointer' : 'default',
              display: 'inline-flex',
              alignItems: 'center',
              color: isFilled ? 'var(--gold)' : '#d5ddd3',
              transition: 'transform 0.1s ease',
            }}
          >
            <Star
              size={size}
              strokeWidth={1.5}
              fill={isFilled ? 'currentColor' : 'none'}
            />
          </button>
        )
      })}
    </div>
  )
}

export function FarmReviews({
  farmId,
  farmSlug,
  farmName,
  initialRatingAvg,
  initialReviewCount,
  initialReviews,
}: FarmReviewsProps) {
  const [reviews, setReviews] = useState<FarmReview[]>(initialReviews)
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [userChecked, setUserChecked] = useState(false)
  const [eligibleBooking, setEligibleBooking] = useState<any | null>(null)

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Form state
  const [ratingFood, setRatingFood] = useState(5)
  const [ratingCleanliness, setRatingCleanliness] = useState(5)
  const [ratingHospitality, setRatingHospitality] = useState(5)
  const [ratingLocation, setRatingLocation] = useState(5)
  const [comment, setComment] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check user authentication and confirmed booking status
  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    async function checkUserEligibility() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!isMounted) return
        setCurrentUser(user)
        setUserChecked(true)

        if (user) {
          const { data: bookings } = await supabase
            .from('bookings')
            .select('id, status, check_in')
            .eq('farm_id', farmId)
            .eq('tourist_id', user.id)
            .in('status', ['confirmed', 'completed'])

          if (isMounted && bookings && bookings.length > 0) {
            setEligibleBooking(bookings[0])
          }
        }
      } catch {
        if (isMounted) setUserChecked(true)
      }
    }

    checkUserEligibility()
    return () => {
      isMounted = false
    }
  }, [farmId])

  // Extract all photos across all reviews for gallery strip and lightbox
  const allPhotos = useMemo(() => {
    const list: { id: string; url: string; guestName: string }[] = []
    reviews.forEach((r) => {
      if (r.review_photos && r.review_photos.length > 0) {
        r.review_photos.forEach((p) => {
          if (p.url) {
            list.push({
              id: p.id,
              url: p.url,
              guestName: r.profiles?.full_name || 'Verified guest',
            })
          }
        })
      }
    })
    return list
  }, [reviews])

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) =>
          prev !== null ? (prev + 1) % allPhotos.length : 0,
        )
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev !== null ? (prev - 1 + allPhotos.length) % allPhotos.length : 0,
        )
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex, allPhotos.length])

  // Computed rating metrics
  const { foodAvg, cleanlinessAvg, hospitalityAvg, locationAvg, overallAvg, totalCount } =
    useMemo(() => {
      if (reviews.length === 0) {
        const fallbackVal = Number(initialRatingAvg) || 4.8
        return {
          foodAvg: fallbackVal,
          cleanlinessAvg: fallbackVal,
          hospitalityAvg: fallbackVal,
          locationAvg: fallbackVal,
          overallAvg: fallbackVal.toFixed(1),
          totalCount: initialReviewCount || 0,
        }
      }

      let fSum = 0
      let cSum = 0
      let hSum = 0
      let lSum = 0

      reviews.forEach((r) => {
        fSum += r.rating_food || 5
        cSum += r.rating_cleanliness || 5
        hSum += r.rating_hospitality || 5
        lSum += r.rating_location || 5
      })

      const len = reviews.length
      const fAvg = Math.round((fSum / len) * 10) / 10
      const cAvg = Math.round((cSum / len) * 10) / 10
      const hAvg = Math.round((hSum / len) * 10) / 10
      const lAvg = Math.round((lSum / len) * 10) / 10
      const oAvg = (
        Math.round(((fSum + cSum + hSum + lSum) / (len * 4)) * 10) / 10
      ).toFixed(1)

      return {
        foodAvg: fAvg,
        cleanlinessAvg: cAvg,
        hospitalityAvg: hAvg,
        locationAvg: lAvg,
        overallAvg: oAvg,
        totalCount: len,
      }
    }, [reviews, initialRatingAvg, initialReviewCount])

  // File selection handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null)
    if (!e.target.files) return

    const filesArray = Array.from(e.target.files)
    const combinedFiles = [...selectedFiles, ...filesArray].slice(0, 3)

    if (filesArray.length + selectedFiles.length > 3) {
      setFormError('You can upload a maximum of 3 photos.')
    }

    // Validate size and mime type
    for (const file of combinedFiles) {
      if (file.size > 3 * 1024 * 1024) {
        setFormError(`File "${file.name}" exceeds the 3 MB size limit.`)
        return
      }
      if (!file.type.startsWith('image/')) {
        setFormError(`File "${file.name}" is not a supported image file.`)
        return
      }
    }

    setSelectedFiles(combinedFiles)

    // Generate previews
    const previews = combinedFiles.map((file) => URL.createObjectURL(file))
    setFilePreviews(previews)
  }

  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(updatedFiles)
    const updatedPreviews = filePreviews.filter((_, i) => i !== index)
    setFilePreviews(updatedPreviews)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle review form submit
  const handleSubmitReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!comment || comment.trim().length < 5) {
      setFormError('Please enter at least 5 characters in your review.')
      return
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('farmId', farmId)
      if (eligibleBooking?.id) {
        formData.append('bookingId', eligibleBooking.id)
      }
      formData.append('ratingFood', String(ratingFood))
      formData.append('ratingCleanliness', String(ratingCleanliness))
      formData.append('ratingHospitality', String(ratingHospitality))
      formData.append('ratingLocation', String(ratingLocation))
      formData.append('comment', comment.trim())

      selectedFiles.forEach((file) => {
        formData.append('photos', file)
      })

      const res = await fetch('/api/reviews', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Failed to submit review. Please try again.')
        return
      }

      // Prepend review to live feed
      const createdReview: FarmReview = {
        ...data.review,
        profiles: {
          full_name: currentUser?.user_metadata?.full_name || 'Verified Guest',
        },
      }
      setReviews((prev) => [createdReview, ...prev])

      // Reset form
      setComment('')
      setSelectedFiles([])
      setFilePreviews([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setFormSuccess('Thank you! Your verified review has been published.')
    } catch {
      setFormError('An unexpected network error occurred while posting your review.')
    } finally {
      setSubmitting(false)
    }
  }

  const openLightboxForPhotoUrl = (url: string) => {
    const index = allPhotos.findIndex((p) => p.url === url)
    if (index !== -1) {
      setLightboxIndex(index)
    } else {
      // If photo not in allPhotos, push it temporarily or view single
      setLightboxIndex(0)
    }
  }

  return (
    <section
      id="reviews"
      style={{
        marginTop: '40px',
        borderTop: '1px solid var(--line)',
        paddingTop: '32px',
      }}
    >
      {/* 1. Photo Gallery Strip from all review photos */}
      {allPhotos.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '12px',
            }}
          >
            <div>
              <p className="section-kicker" style={{ margin: '0 0 2px' }}>
                Guest snapshots
              </p>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--ink)',
                  margin: 0,
                  letterSpacing: '-0.3px',
                }}
              >
                Photos from verified travellers ({allPhotos.length})
              </h3>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Click photo to enlarge
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              paddingBottom: '8px',
              scrollbarWidth: 'thin',
            }}
          >
            {allPhotos.map((photo, index) => (
              <button
                key={`${photo.id}-${index}`}
                type="button"
                onClick={() => setLightboxIndex(index)}
                aria-label={`View photo ${index + 1} from ${photo.guestName}`}
                style={{
                  flexShrink: 0,
                  width: '115px',
                  height: '85px',
                  border: '1px solid var(--line)',
                  background: '#f0f3ee',
                  padding: 0,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <img
                  src={photo.url}
                  alt={`Guest snapshot ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Rating Summary with four horizontal bars */}
      <div style={{ marginBottom: '36px' }}>
        <p className="section-kicker" style={{ margin: '0 0 4px' }}>
          Verified ratings
        </p>
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 800,
            letterSpacing: '-0.6px',
            margin: '0 0 20px',
            color: 'var(--ink)',
          }}
        >
          Guest satisfaction
        </h2>

        <div
          className="reviews-summary-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(200px, 260px) 1fr',
            gap: '32px',
            background: '#ffffff',
            border: '1px solid var(--line)',
            padding: '24px 26px',
            alignItems: 'center',
          }}
        >
          {/* Big Score Box */}
          <div
            className="reviews-score-box"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              borderRight: '1px solid var(--line)',
              paddingRight: '24px',
            }}
          >
            <div
              style={{
                fontSize: '44px',
                fontWeight: 800,
                letterSpacing: '-1.5px',
                lineHeight: 1,
                color: 'var(--ink)',
              }}
            >
              {overallAvg}
            </div>
            <div>
              <StarRating rating={Math.round(Number(overallAvg))} size={18} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              Based on {totalCount} verified stay{totalCount === 1 ? '' : 's'}
            </div>
          </div>

          {/* Four Horizontal Progress Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Food authenticity', value: foodAvg },
              { label: 'Cleanliness', value: cleanlinessAvg },
              { label: 'Hospitality', value: hospitalityAvg },
              { label: 'Location', value: locationAvg },
            ].map((item) => (
              <div
                key={item.label}
                className="rating-bar-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 34px',
                  alignItems: 'center',
                  gap: '14px',
                  fontSize: '12.5px',
                }}
              >
                <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{item.label}</span>
                <div
                  style={{
                    height: '7px',
                    background: '#eef2ec',
                    overflow: 'hidden',
                    borderRadius: '2px',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--forest)',
                      width: `${(Math.min(5, item.value) / 5) * 100}%`,
                      borderRadius: '2px',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontWeight: 700,
                    textAlign: 'right',
                    color: 'var(--ink)',
                  }}
                >
                  {item.value.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Review Submission Form for signed-in guests with completed booking */}
      <div
        style={{
          border: '1px solid var(--line)',
          background: '#ffffff',
          padding: '24px',
          marginBottom: '36px',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <p className="section-kicker" style={{ margin: '0 0 2px' }}>
            Share your experience
          </p>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--ink)',
              margin: 0,
              letterSpacing: '-0.4px',
            }}
          >
            Leave a verified review
          </h3>
        </div>

        {!userChecked ? (
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
            Checking review eligibility...
          </p>
        ) : !currentUser ? (
          <div
            style={{
              background: 'var(--mint)',
              border: '1px solid #c8dcc4',
              padding: '16px 18px',
              fontSize: '13px',
              color: 'var(--forest)',
              lineHeight: 1.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <strong>Have you stayed at {farmName}?</strong>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                Sign in with the account you used for your booking to post a verified review.
              </div>
            </div>
            <Link
              href={`/login?redirect=/farms/${farmSlug}#reviews`}
              className="primary-btn"
              style={{
                textDecoration: 'none',
                padding: '8px 14px',
                fontSize: '12px',
              }}
            >
              Sign in to write review
            </Link>
          </div>
        ) : !eligibleBooking ? (
          <div
            style={{
              background: '#fdf7f0',
              border: '1px solid #f2dec4',
              padding: '14px 16px',
              fontSize: '12.5px',
              lineHeight: 1.5,
              color: '#87561f',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Verified Stays Only:</strong> To protect host reputations and prevent fraudulent feedback, reviews are reserved exclusively for travellers with a completed booking at {farmName}.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitReview}>
            {formError && (
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
                {formError}
              </div>
            )}

            {formSuccess && (
              <div
                style={{
                  background: 'var(--mint)',
                  border: '1px solid #c8dcc4',
                  color: 'var(--forest)',
                  padding: '10px 14px',
                  fontSize: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* Four Star Inputs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                marginBottom: '20px',
                background: '#fafcfa',
                border: '1px solid var(--line)',
                padding: '16px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    marginBottom: '4px',
                    letterSpacing: '0.6px',
                  }}
                >
                  Food authenticity
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StarRating
                    rating={ratingFood}
                    size={18}
                    interactive
                    onChange={setRatingFood}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                    {ratingFood}/5
                  </span>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    marginBottom: '4px',
                    letterSpacing: '0.6px',
                  }}
                >
                  Cleanliness
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StarRating
                    rating={ratingCleanliness}
                    size={18}
                    interactive
                    onChange={setRatingCleanliness}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                    {ratingCleanliness}/5
                  </span>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    marginBottom: '4px',
                    letterSpacing: '0.6px',
                  }}
                >
                  Hospitality
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StarRating
                    rating={ratingHospitality}
                    size={18}
                    interactive
                    onChange={setRatingHospitality}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                    {ratingHospitality}/5
                  </span>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    marginBottom: '4px',
                    letterSpacing: '0.6px',
                  }}
                >
                  Location
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StarRating
                    rating={ratingLocation}
                    size={18}
                    interactive
                    onChange={setRatingLocation}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                    {ratingLocation}/5
                  </span>
                </div>
              </div>
            </div>

            {/* Comment Input */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  marginBottom: '6px',
                }}
              >
                Your written review
              </label>
              <textarea
                required
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your stay experience: traditional food cooked by the family, farm walk highlights, room comfort, or advice for future travellers..."
                style={{
                  width: '100%',
                  border: '1px solid var(--line)',
                  padding: '12px',
                  fontSize: '13px',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  color: 'var(--ink)',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Optional Photo Upload */}
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '6px',
                }}
              >
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--ink)',
                  }}
                >
                  Guest photos (optional)
                </label>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  Max 3 images · up to 3 MB each · JPEG, PNG, WebP
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png, image/jpeg, image/webp, image/gif, image/jpg"
                onChange={handleFileChange}
                disabled={selectedFiles.length >= 3}
                style={{ display: 'none' }}
                id="review-photo-upload"
              />

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {selectedFiles.length < 3 && (
                  <label
                    htmlFor="review-photo-upload"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      border: '1px dashed var(--leaf)',
                      background: 'var(--mint)',
                      color: 'var(--forest)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Upload size={14} />
                    <span>Choose photos ({3 - selectedFiles.length} remaining)</span>
                  </label>
                )}

                {/* Previews */}
                {filePreviews.map((url, i) => (
                  <div
                    key={url}
                    style={{
                      position: 'relative',
                      width: '64px',
                      height: '64px',
                      border: '1px solid var(--line)',
                      background: '#f4f6f3',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={url}
                      alt={`Upload preview ${i + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      aria-label="Remove photo"
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        background: 'rgba(23, 53, 43, 0.8)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <X size={11} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="primary-btn"
              style={{
                fontSize: '13px',
                padding: '12px 20px',
              }}
            >
              {submitting ? 'Publishing review...' : 'Submit verified review'}
            </button>
          </form>
        )}
      </div>

      {/* 4. Review Feed */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '16px',
          }}
        >
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--ink)',
              margin: 0,
              letterSpacing: '-0.4px',
            }}
          >
            Verified traveller reviews ({reviews.length})
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Showing all authentic reviews
          </span>
        </div>

        {reviews.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--line)',
              padding: '28px',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: '13px',
            }}
          >
            No reviews posted for this farm yet. Be the first verified guest to share your story!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {reviews.map((rev) => {
              const guestName = rev.profiles?.full_name || 'Verified Guest'
              const dateStr = rev.created_at
                ? new Date(rev.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Recent stay'

              const revAvg = Math.round(
                ((rev.rating_food +
                  rev.rating_cleanliness +
                  rev.rating_hospitality +
                  rev.rating_location) /
                  4) *
                  10,
              ) / 10

              const photos: ReviewPhoto[] = rev.review_photos || []

              return (
                <article
                  key={rev.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--line)',
                    padding: '20px 22px',
                  }}
                >
                  {/* Review Top Row */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '2px',
                        }}
                      >
                        <strong
                          style={{
                            fontSize: '14px',
                            color: 'var(--ink)',
                          }}
                        >
                          {guestName}
                        </strong>
                        <span
                          style={{
                            background: 'var(--mint)',
                            color: 'var(--forest)',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <CheckCircle2 size={10} /> Verified stay
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {dateStr}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <StarRating rating={Math.round(revAvg)} size={14} />
                      <div
                        style={{
                          fontSize: '10.5px',
                          color: 'var(--muted)',
                          marginTop: '2px',
                        }}
                      >
                        Food {rev.rating_food} · Clean {rev.rating_cleanliness} · Host {rev.rating_hospitality} · Loc {rev.rating_location}
                      </div>
                    </div>
                  </div>

                  {/* Comment */}
                  <p
                    style={{
                      fontSize: '13.5px',
                      lineHeight: 1.65,
                      color: '#405247',
                      margin: '12px 0 0',
                    }}
                  >
                    {rev.comment}
                  </p>

                  {/* Photo Thumbnails */}
                  {photos.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '14px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {photos.map((photo, pIdx) => (
                        <button
                          key={`${photo.id || pIdx}`}
                          type="button"
                          onClick={() => openLightboxForPhotoUrl(photo.url)}
                          aria-label={`Enlarge photo by ${guestName}`}
                          style={{
                            width: '72px',
                            height: '72px',
                            border: '1px solid var(--line)',
                            background: '#f4f6f3',
                            padding: 0,
                            cursor: 'pointer',
                            overflow: 'hidden',
                          }}
                        >
                          <img
                            src={photo.url}
                            alt="Guest review photo thumbnail"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* 5. Simple Lightbox Modal */}
      {lightboxIndex !== null && allPhotos[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged photo view"
          onClick={() => setLightboxIndex(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 35, 27, 0.94)',
            backdropFilter: 'blur(3px)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          {/* Header Controls */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '16px',
              left: '20px',
              right: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#ffffff',
            }}
          >
            <div style={{ fontSize: '12.5px', color: '#c7d6c9' }}>
              Photo {lightboxIndex + 1} of {allPhotos.length} ·{' '}
              <span style={{ color: '#ffffff', fontWeight: 600 }}>
                {allPhotos[lightboxIndex].guestName}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              aria-label="Close photo lightbox"
              style={{
                color: '#ffffff',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <X size={16} /> Close
            </button>
          </div>

          {/* Image & Navigation */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              maxWidth: '92vw',
              maxHeight: '82vh',
            }}
          >
            {allPhotos.length > 1 && (
              <button
                type="button"
                className="lightbox-prev-btn"
                onClick={() =>
                  setLightboxIndex(
                    (lightboxIndex - 1 + allPhotos.length) % allPhotos.length,
                  )
                }
                aria-label="Previous photo"
                style={{
                  position: 'absolute',
                  left: '-48px',
                  color: '#ffffff',
                  background: 'rgba(23, 53, 43, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  width: '36px',
                  height: '36px',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  zIndex: 2,
                }}
              >
                <ChevronLeft size={22} />
              </button>
            )}

            <img
              src={allPhotos[lightboxIndex].url}
              alt={`Enlarged view by ${allPhotos[lightboxIndex].guestName}`}
              style={{
                maxWidth: '90vw',
                maxHeight: '78vh',
                objectFit: 'contain',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              }}
            />

            {allPhotos.length > 1 && (
              <button
                type="button"
                className="lightbox-next-btn"
                onClick={() =>
                  setLightboxIndex((lightboxIndex + 1) % allPhotos.length)
                }
                aria-label="Next photo"
                style={{
                  position: 'absolute',
                  right: '-48px',
                  color: '#ffffff',
                  background: 'rgba(23, 53, 43, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  width: '36px',
                  height: '36px',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  zIndex: 2,
                }}
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
