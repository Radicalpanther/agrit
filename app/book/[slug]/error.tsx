'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, RefreshCw, Compass } from 'lucide-react'

export default function BookingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Booking page error:', error)
  }, [error])

  return (
    <div
      style={{
        maxWidth: '540px',
        margin: '60px auto',
        padding: '36px 24px',
        border: '1px solid var(--line)',
        background: '#ffffff',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: '#fdf2f2',
          color: '#b33939',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 16px',
        }}
      >
        <AlertCircle size={20} />
      </div>

      <p className="section-kicker" style={{ color: '#b33939', margin: 0 }}>
        Booking request error
      </p>

      <h2
        style={{
          fontSize: '22px',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          color: 'var(--ink)',
          margin: '8px 0 12px',
        }}
      >
        Unable to load reservation form
      </h2>

      <p
        style={{
          fontSize: '13px',
          lineHeight: 1.6,
          color: 'var(--muted)',
          margin: '0 auto 24px',
          maxWidth: '400px',
        }}
      >
        There was a problem loading the farm booking details. Please try again or browse other partner farm stays.
      </p>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => reset()}
          className="primary-btn"
          style={{
            padding: '10px 18px',
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <RefreshCw size={14} /> Retry
        </button>

        <Link
          href="/explore"
          className="outline-btn"
          style={{
            padding: '10px 18px',
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
          }}
        >
          <Compass size={14} /> Browse farms
        </Link>
      </div>
    </div>
  )
}
