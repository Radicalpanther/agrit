'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Globe, Check } from 'lucide-react'
import { locales, localeLabels, type Locale } from '@/i18n/config'
import { createClient } from '@/lib/supabase/client'

interface LanguageSwitcherProps {
  className?: string
  isMobile?: boolean
}

export function LanguageSwitcher({ className, isMobile = false }: LanguageSwitcherProps) {
  const currentLocale = useLocale() as Locale
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelectLocale = (nextLocale: Locale) => {
    if (nextLocale === currentLocale) {
      setIsOpen(false)
      return
    }

    // Set cookie for 1 year
    document.cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=31536000;SameSite=Lax`
    setIsOpen(false)

    // Save language if user is signed in
    try {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          Promise.resolve(
            supabase
              .from('profiles')
              .update({ preferred_language: nextLocale })
              .eq('id', user.id)
          ).catch(() => {})
        }
      }).catch(() => {})
    } catch {}

    startTransition(() => {
      router.refresh()
    })
  }

  if (isMobile) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '12px 0',
          borderTop: '1px solid var(--line)',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: 'var(--muted)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Globe size={14} style={{ color: 'var(--forest)' }} />
          Language
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {locales.map((loc) => {
            const isSelected = loc === currentLocale
            return (
              <button
                key={loc}
                type="button"
                onClick={() => handleSelectLocale(loc)}
                disabled={isPending}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? 'var(--mint)' : '#f5f7f3',
                  color: isSelected ? 'var(--forest)' : 'var(--ink)',
                  border: isSelected ? '1px solid var(--forest)' : '1px solid var(--line)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected && <Check size={13} style={{ color: 'var(--forest)' }} />}
                {localeLabels[loc]}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={dropdownRef}
      className={className}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--forest)',
          background: 'transparent',
          border: '1px solid var(--line)',
          padding: '7px 11px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <Globe size={15} style={{ color: 'var(--leaf)' }} />
        <span>{localeLabels[currentLocale] || 'English'}</span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Available languages"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: '#ffffff',
            border: '1px solid var(--line)',
            boxShadow: '0 8px 24px rgba(16, 54, 39, 0.12)',
            minWidth: '140px',
            zIndex: 100,
            padding: '4px 0',
          }}
        >
          {locales.map((loc) => {
            const isSelected = loc === currentLocale
            return (
              <button
                key={loc}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelectLocale(loc)}
                disabled={isPending}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? 'var(--forest)' : 'var(--ink)',
                  background: isSelected ? 'var(--mint)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#f4f7f2'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <span>{localeLabels[loc]}</span>
                {isSelected && <Check size={14} style={{ color: 'var(--forest)' }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
