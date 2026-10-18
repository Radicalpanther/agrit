import Link from 'next/link'
import { Compass, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div
      style={{
        maxWidth: '540px',
        margin: '80px auto',
        padding: '40px 24px',
        textAlign: 'center',
        background: '#ffffff',
        border: '1px solid var(--line)',
      }}
    >
      <p
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '1.2px',
          fontWeight: 800,
          color: 'var(--leaf)',
          margin: 0,
        }}
      >
        404 Not Found
      </p>

      <h1
        style={{
          fontSize: '28px',
          fontWeight: 800,
          letterSpacing: '-1px',
          color: 'var(--ink)',
          margin: '10px 0 12px',
        }}
      >
        Farm stay not found
      </h1>

      <p
        style={{
          fontSize: '13.5px',
          color: 'var(--muted)',
          lineHeight: 1.6,
          maxWidth: '420px',
          margin: '0 auto 28px',
        }}
      >
        The farm stay or rural trail you are looking for may have been unpublished, moved, or the link may be mistyped.
      </p>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/explore"
          className="primary-btn"
          style={{
            padding: '10px 18px',
            fontSize: '12px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Compass size={14} /> Explore farm stays
        </Link>
        <Link
          href="/"
          className="outline-btn"
          style={{
            padding: '10px 18px',
            fontSize: '12px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Home size={14} /> Return home
        </Link>
      </div>
    </div>
  )
}
