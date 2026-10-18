'use client'

import { useState, useEffect } from 'react'
import { Check, X, UserCheck, ClipboardCheck, PhoneCall, ShieldAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'

export interface VerifiedBadgeProps {
  size?: 'sm' | 'md'
  className?: string
  style?: React.CSSProperties
}

export function VerifiedBadge({ size = 'sm', className, style }: VerifiedBadgeProps) {
  const t = useTranslations('farmDetail.trust')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(true)
        }}
        className={className}
        title={t('badgeTitle')}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: size === 'md' ? '6px' : '4px',
          padding: size === 'md' ? '4px 10px' : '2px 7px',
          background: 'var(--mint)',
          border: '1px solid #c2d6be',
          borderRadius: '3px',
          color: 'var(--forest)',
          fontSize: size === 'md' ? '12px' : '10.5px',
          fontWeight: 700,
          letterSpacing: '-0.1px',
          lineHeight: 1.4,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        <Check size={size === 'md' ? 13 : 11} strokeWidth={2.2} style={{ color: 'var(--leaf)' }} />
        <span>{t('badge')}</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="verified-dialog-title"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsOpen(false)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(23, 53, 43, 0.55)',
            backdropFilter: 'blur(2px)',
            zIndex: 9999,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation()
            }}
            style={{
              background: '#ffffff',
              border: '1px solid var(--line)',
              maxWidth: '480px',
              width: '100%',
              padding: '24px 22px',
              boxShadow: '0 16px 36px rgba(23, 53, 43, 0.22)',
              position: 'relative',
              textAlign: 'left',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <p
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: '1.2px',
                    fontSize: '10px',
                    fontWeight: 800,
                    color: 'var(--leaf)',
                    margin: '0 0 4px',
                  }}
                >
                  {t('modalKicker')}
                </p>
                <h3
                  id="verified-dialog-title"
                  style={{
                    fontSize: '20px',
                    letterSpacing: '-0.5px',
                    color: 'var(--ink)',
                    margin: 0,
                  }}
                >
                  {t('modalHeading')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t('closeDialog')}
                style={{
                  color: 'var(--muted)',
                  padding: '4px',
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '3px',
                }}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#53685d', margin: '0 0 16px' }}>
              {t('modalIntro')}
            </p>

            {/* Checklist items in plain words */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--leaf)', marginTop: '2px' }}>
                  <UserCheck size={16} strokeWidth={1.75} />
                </div>
                <div style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--ink)', display: 'block' }}>{t('hostIdentityTitle')}</strong>
                  <span style={{ color: 'var(--muted)' }}>
                    {t('hostIdentityDesc')}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--leaf)', marginTop: '2px' }}>
                  <ClipboardCheck size={16} strokeWidth={1.75} />
                </div>
                <div style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--ink)', display: 'block' }}>{t('checklistTitle')}</strong>
                  <span style={{ color: 'var(--muted)' }}>
                    {t('checklistDesc')}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--leaf)', marginTop: '2px' }}>
                  <PhoneCall size={16} strokeWidth={1.75} />
                </div>
                <div style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--ink)', display: 'block' }}>{t('contactTitle')}</strong>
                  <span style={{ color: 'var(--muted)' }}>
                    {t('contactDesc')}
                  </span>
                </div>
              </div>
            </div>

            {/* Clear explicit note on government checks & data privacy */}
            <div
              style={{
                background: 'var(--mint)',
                border: '1px solid #c8dcc4',
                padding: '12px 14px',
                fontSize: '11.5px',
                lineHeight: 1.55,
                color: 'var(--forest)',
                display: 'flex',
                gap: '9px',
                alignItems: 'flex-start',
              }}
            >
              <ShieldAlert size={16} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--leaf)' }} />
              <div>
                <strong>{t('privacyNoteLabel')}</strong> {t('privacyNoteDesc')}
              </div>
            </div>

            {/* Action */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="primary-btn"
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '10px 16px',
                fontSize: '12px',
              }}
            >
              {t('understoodBtn')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
