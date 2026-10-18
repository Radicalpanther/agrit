'use client'

import { useState } from 'react'
import { Leaf, TrendingDown, HeartHandshake, Info } from 'lucide-react'
import { calculateEcoImpact } from '@/lib/eco'

export interface EcoScoreProps {
  guests?: number
  nights?: number
  visitType?: 'day' | 'overnight'
  organicPct?: number
  variant?: 'card' | 'summary' | 'receipt'
  className?: string
  style?: React.CSSProperties
}

export function EcoScore({
  guests = 2,
  nights = 1,
  visitType = 'overnight',
  organicPct = 85,
  variant = 'card',
  className,
  style,
}: EcoScoreProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const { co2SavedKg, organicPct: effectiveOrganicPct, supportsLocalEconomy, assumptionFootnote } =
    calculateEcoImpact({
      guests,
      nights,
      visitType,
      organicPct,
    })

  if (variant === 'receipt') {
    return (
      <div
        className={className}
        style={{
          background: 'var(--mint)',
          border: '1px solid #c2d6be',
          padding: '16px 18px',
          margin: '20px 0',
          textAlign: 'left',
          ...style,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--forest)',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '8px',
          }}
        >
          <Leaf size={14} strokeWidth={1.5} style={{ color: 'var(--leaf)' }} />
          <span>Your Environmental &amp; Community Impact</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', margin: '10px 0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={15} strokeWidth={1.5} style={{ color: 'var(--leaf)' }} />
            <span style={{ fontSize: '13px', color: 'var(--ink)' }}>
              <strong>~{co2SavedKg} kg CO2 saved</strong> vs urban hotel
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Leaf size={15} strokeWidth={1.5} style={{ color: 'var(--leaf)' }} />
            <span style={{ fontSize: '13px', color: 'var(--ink)' }}>
              <strong>{effectiveOrganicPct}% organic farmland</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HeartHandshake size={15} strokeWidth={1.5} style={{ color: 'var(--leaf)' }} />
            <span style={{ fontSize: '13px', color: 'var(--ink)' }}>
              <strong>{supportsLocalEconomy}</strong>
            </span>
          </div>
        </div>

        <p
          style={{
            fontSize: '10.5px',
            lineHeight: 1.5,
            color: 'var(--muted)',
            margin: '8px 0 0',
            borderTop: '1px dashed #c2d6be',
            paddingTop: '8px',
          }}
        >
          * {assumptionFootnote}
        </p>
      </div>
    )
  }

  if (variant === 'summary') {
    return (
      <div
        className={className}
        style={{
          background: 'var(--mint)',
          border: '1px solid #c2d6be',
          padding: '12px 14px',
          margin: '12px 0',
          ...style,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--forest)',
              fontSize: '10.5px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
            }}
          >
            <Leaf size={13} strokeWidth={1.5} style={{ color: 'var(--leaf)' }} />
            <span>Eco Impact Summary</span>
          </div>
          <button
            type="button"
            onClick={() => setShowTooltip(!showTooltip)}
            aria-label="View eco impact calculation assumptions"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              color: 'var(--forest)',
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 4px',
            }}
          >
            <Info size={12} strokeWidth={1.5} />
            <span>{showTooltip ? 'Hide info' : 'Assumptions'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', color: 'var(--ink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingDown size={13} strokeWidth={1.5} style={{ color: 'var(--leaf)' }} />
            <span>
              <strong>~{co2SavedKg} kg CO2 saved</strong> vs urban hotel stay
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Leaf size={13} strokeWidth={1.5} style={{ color: 'var(--leaf)' }} />
            <span>
              <strong>{effectiveOrganicPct}% organic farm</strong> · Zero chemical runoff
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HeartHandshake size={13} strokeWidth={1.5} style={{ color: 'var(--leaf)' }} />
            <span>
              <strong>{supportsLocalEconomy}</strong>
            </span>
          </div>
        </div>

        {showTooltip ? (
          <p
            style={{
              fontSize: '10px',
              lineHeight: 1.45,
              color: 'var(--forest)',
              background: '#ffffff',
              padding: '6px 8px',
              margin: '8px 0 0',
              border: '1px solid #c2d6be',
            }}
          >
            {assumptionFootnote}
          </p>
        ) : (
          <p
            style={{
              fontSize: '9.5px',
              lineHeight: 1.4,
              color: 'var(--muted)',
              margin: '6px 0 0',
            }}
          >
            * Estimated impact based on ~14.5 kg CO2e saved per guest-night. Indicative estimate.
          </p>
        )}
      </div>
    )
  }

  // Default 'card' variant for Farm Detail
  return (
    <div
      className={className}
      style={{
        background: '#ffffff',
        border: '1px solid var(--line)',
        padding: '16px 18px',
        margin: '20px 0',
        ...style,
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'var(--mint)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--leaf)',
            }}
          >
            <Leaf size={14} strokeWidth={1.5} />
          </div>
          <div>
            <span
              style={{
                display: 'block',
                textTransform: 'uppercase',
                fontSize: '9.5px',
                fontWeight: 800,
                letterSpacing: '1px',
                color: 'var(--leaf)',
              }}
            >
              Sustainability &amp; Community
            </span>
            <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>EcoScore &amp; Footprint</strong>
          </div>
        </div>
        <span
          style={{
            background: 'var(--mint)',
            color: 'var(--forest)',
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '2px',
          }}
        >
          {effectiveOrganicPct}% Organic
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px', color: 'var(--ink)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
          <TrendingDown size={15} strokeWidth={1.5} style={{ color: 'var(--leaf)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>~{co2SavedKg} kg CO2 saved</strong> per standard 2-guest overnight stay compared to an urban hotel.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
          <Leaf size={15} strokeWidth={1.5} style={{ color: 'var(--leaf)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>{effectiveOrganicPct}% certified organic soil</strong> with natural ventilation and local water harvesting.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
          <HeartHandshake size={15} strokeWidth={1.5} style={{ color: 'var(--leaf)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>{supportsLocalEconomy}</strong> directly preserving rural land stewardship.
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--line)',
          marginTop: '12px',
          paddingTop: '9px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '6px',
          color: 'var(--muted)',
          fontSize: '10px',
          lineHeight: 1.45,
        }}
      >
        <Info size={12} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--leaf)' }} />
        <span>{assumptionFootnote}</span>
      </div>
    </div>
  )
}
