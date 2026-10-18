'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Check, RefreshCw, X, Copy, Clock, AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

export interface TelegramConnectProps {
  title?: string
  subtitle?: string
  compact?: boolean
  showDisconnect?: boolean
  role?: 'farmer' | 'tourist'
  onStatusChange?: (isLinked: boolean) => void
}

interface TokenData {
  token: string
  linkUrl: string
  botUsername: string
}

export function TelegramConnect({
  title,
  subtitle,
  compact = false,
  showDisconnect = false,
  role = 'farmer',
  onStatusChange,
}: TelegramConnectProps) {
  // Telegram is strictly for farm hosts only
  if (role === 'tourist') {
    return null
  }

  const t = useTranslations('telegram')
  const effectiveTitle = title ?? t('title')
  const effectiveSubtitle = subtitle ?? t('subtitle')

  const [isLinked, setIsLinked] = useState<boolean>(false)
  const [accountName, setAccountName] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState<boolean>(false)

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pollStartTimeRef = useRef<number>(0)

  const checkStatus = async (): Promise<boolean> => {
    try {
      const url = '/api/telegram/status?role=farmer'
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return false
      const data = await res.json()
      const linked = Boolean(data.linked)
      setIsLinked(linked)
      setAccountName(data.accountName || null)
      if (onStatusChange) onStatusChange(linked)
      return linked
    } catch {
      return false
    } finally {
      setLoading(false)
    }
  }

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
  }

  const startPollingInterval = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    // Poll every 3 seconds
    pollIntervalRef.current = setInterval(async () => {
      const linked = await checkStatus()
      if (linked) {
        stopPolling()
        setShowModal(false)
        setTokenData(null)
      }
    }, 3000)
  }

  const startPolling = () => {
    stopPolling()
    pollStartTimeRef.current = Date.now()
    startPollingInterval()

    // Stop polling after 10 minutes (600,000 ms)
    pollTimeoutRef.current = setTimeout(() => {
      stopPolling()
      setShowModal(false)
    }, 10 * 60 * 1000)
  }

  // Initial check on mount
  useEffect(() => {
    checkStatus()

    return () => {
      stopPolling()
    }
  }, [role])

  // Stop polling when tab is hidden, resume when tab is visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      } else {
        if (showModal && !isLinked) {
          // Immediately check status
          checkStatus().then((linked) => {
            if (linked) {
              stopPolling()
              setShowModal(false)
              setTokenData(null)
            } else if (!pollIntervalRef.current) {
              // Ensure 10-minute maximum hasn't elapsed
              const elapsed = Date.now() - pollStartTimeRef.current
              if (elapsed < 10 * 60 * 1000) {
                startPollingInterval()
              }
            }
          })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [showModal, isLinked])

  // Click handler to request token without opening popups
  const handleConnect = async () => {
    setErrorMessage(null)
    setIsGenerating(true)

    try {
      const res = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()

      if (!res.ok || !data.linkUrl) {
        setErrorMessage(data.error || 'Failed to generate Telegram connection link')
        setIsGenerating(false)
        return
      }

      setTokenData({
        token: data.token,
        linkUrl: data.linkUrl,
        botUsername: data.botUsername || 'Agritrail_bot',
      })
      setShowModal(true)
      setIsGenerating(false)
      startPolling()
    } catch {
      setErrorMessage('Network error initiating Telegram connection. Please try again.')
      setIsGenerating(false)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    stopPolling()
    setErrorMessage(null)
  }

  const handleCopyLink = async () => {
    if (!tokenData?.linkUrl) return
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tokenData.linkUrl)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = tokenData.linkUrl
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/telegram/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        setIsLinked(false)
        setAccountName(null)
        if (onStatusChange) onStatusChange(false)
      }
    } catch (e) {
      console.error('Error disconnecting Telegram', e)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          border: '1px solid var(--line)',
          background: '#ffffff',
          padding: compact ? '8px 12px' : '14px 16px',
          fontSize: '12px',
          color: 'var(--muted)',
        }}
      >
        {t('checking')}
      </div>
    )
  }

  // Render modal dialog when visible link is requested
  const modalContent = showModal && tokenData && (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="telegram-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseModal()
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--line)',
          maxWidth: '440px',
          width: '100%',
          padding: '24px 22px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2
            id="telegram-dialog-title"
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--ink)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Send size={16} style={{ color: 'var(--forest)' }} />
            <span>{t('connect')}</span>
          </h2>
          <button
            type="button"
            onClick={handleCloseModal}
            aria-label={t('close')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 16px' }}>
          {t('subtitle')}
        </p>

        {/* Primary Visible Anchor Button (Never blocked by popup blockers) */}
        <a
          href={tokenData.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px 18px',
            background: 'var(--forest)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '13px',
            textDecoration: 'none',
            minHeight: '44px',
            fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box',
          }}
        >
          <Send size={14} />
          <span>{t('openTelegram')}</span>
        </a>

        {/* Secondary Telegram Desktop App Link */}
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
          <a
            href={`tg://resolve?domain=${tokenData.botUsername}&start=${tokenData.token}`}
            style={{
              fontSize: '11.5px',
              color: 'var(--forest)',
              textDecoration: 'underline',
              fontWeight: 600,
            }}
          >
            {t('openDesktop')}
          </a>
        </div>

        {/* Copy Link Button */}
        <button
          type="button"
          onClick={handleCopyLink}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: '100%',
            marginTop: '12px',
            padding: '9px 14px',
            background: '#f6f8f5',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '38px',
          }}
        >
          <Copy size={13} />
          <span>{copied ? t('copied') : t('copyLink')}</span>
        </button>

        {/* 10-Minute Expiry Note */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--muted)',
            marginTop: '14px',
            lineHeight: 1.45,
          }}
        >
          <Clock size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{t('expiresIn')}</span>
        </div>

        {/* Live Polling Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11.5px',
            color: 'var(--forest)',
            background: 'var(--mint)',
            border: '1px solid var(--line)',
            padding: '10px 12px',
            marginTop: '14px',
          }}
        >
          <RefreshCw size={13} className="spin" style={{ flexShrink: 0 }} />
          <span>{t('waitingForStart')}</span>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleCloseModal}
          style={{
            width: '100%',
            marginTop: '14px',
            padding: '8px',
            background: 'transparent',
            border: '1px solid var(--line)',
            fontSize: '11.5px',
            fontWeight: 600,
            color: 'var(--muted)',
            cursor: 'pointer',
          }}
        >
          {t('close')}
        </button>
      </div>
    </div>
  )

  if (compact) {
    return (
      <>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
          }}
        >
          {isLinked ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--mint)',
                color: 'var(--forest)',
                border: '1px solid var(--line)',
                padding: '4px 10px',
                fontWeight: 700,
                fontSize: '11px',
              }}
            >
              <Check size={13} />
              <span>{accountName ? `@${accountName.replace(/^@/, '')}` : t('connected')}</span>
              {showDisconnect && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  title={t('disconnect')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#c0392b',
                    cursor: 'pointer',
                    padding: '0 0 0 6px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleConnect}
                disabled={isGenerating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--forest)',
                  background: 'var(--mint)',
                  border: '1px solid var(--line)',
                  cursor: isGenerating ? 'wait' : 'pointer',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={13} className="spin" />
                    <span>{t('waiting')}</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>{t('connect')}</span>
                  </>
                )}
              </button>

              {errorMessage && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#c0392b' }}>
                  <AlertCircle size={12} />
                  <span>{errorMessage}</span>
                  <button
                    type="button"
                    onClick={handleConnect}
                    style={{
                      background: 'none',
                      border: 'none',
                      textDecoration: 'underline',
                      color: 'var(--forest)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      padding: 0,
                      marginLeft: '4px',
                    }}
                  >
                    {t('retry')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {modalContent}
      </>
    )
  }

  return (
    <>
      <div
        style={{
          border: '1px solid var(--line)',
          background: '#ffffff',
          padding: '16px 18px',
          margin: '18px 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '8px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Send size={14} style={{ color: 'var(--forest)' }} />
              <span>{effectiveTitle}</span>
            </div>
            <p
              style={{
                fontSize: '11.5px',
                color: 'var(--muted)',
                margin: '4px 0 0',
                lineHeight: 1.5,
              }}
            >
              {effectiveSubtitle}
            </p>
          </div>

          <div>
            {isLinked ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'var(--mint)',
                    color: 'var(--forest)',
                    border: '1px solid var(--line)',
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                  }}
                >
                  <Check size={13} />
                  <span>{accountName ? `${accountName.startsWith('@') ? accountName : '@' + accountName} (${t('connected')})` : t('connected')}</span>
                </span>

                {showDisconnect && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    style={{
                      background: 'none',
                      border: '1px solid var(--line)',
                      padding: '5px 10px',
                      fontSize: '11px',
                      color: '#c0392b',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {t('disconnect')}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isGenerating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#ffffff',
                    background: 'var(--forest)',
                    border: 'none',
                    cursor: isGenerating ? 'wait' : 'pointer',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={13} className="spin" />
                      <span>{t('waiting')}</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>{t('connect')}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {errorMessage && (
          <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#c0392b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={13} />
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={handleConnect}
              style={{
                background: 'none',
                border: 'none',
                textDecoration: 'underline',
                color: 'var(--forest)',
                cursor: 'pointer',
                fontWeight: 700,
                padding: 0,
              }}
            >
              {t('retry')}
            </button>
          </div>
        )}
      </div>
      {modalContent}
    </>
  )
}
