'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <div
      style={{
        maxWidth: '560px',
        margin: '60px auto',
        padding: '36px 24px',
        border: '1px solid var(--line)',
        background: '#ffffff',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: '#fdf2f2',
          color: '#b33939',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 16px',
        }}
      >
        <AlertCircle size={22} />
      </div>

      <p
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          fontWeight: 800,
          color: '#b33939',
          margin: 0,
        }}
      >
        Service Notice
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
        Something went wrong
      </h2>

      <p
        style={{
          fontSize: '13px',
          lineHeight: 1.6,
          color: 'var(--muted)',
          margin: '0 auto 24px',
          maxWidth: '420px',
        }}
      >
        We were unable to load this page. Please try refreshing or return to the home page.
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
          <RefreshCw size={14} /> Try again
        </button>

        <Link
          href="/"
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
          <Home size={14} /> Return home
        </Link>
      </div>
    </div>
  )
}
