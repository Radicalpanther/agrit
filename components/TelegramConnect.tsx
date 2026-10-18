'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Check, RefreshCw, X } from 'lucide-react'

export interface TelegramConnectProps {
  title?: string
  subtitle?: string
  compact?: boolean
  showDisconnect?: boolean
  role?: 'farmer' | 'tourist'
  onStatusChange?: (isLinked: boolean) => void
}

export function TelegramConnect({
  title = 'Get updates on Telegram',
  subtitle = 'Receive instant reservation status, arrival directions, and host messages directly in Telegram.',
  compact = false,
  showDisconnect = false,
  role = 'tourist',
  onStatusChange,
}: TelegramConnectProps) {
  const [isLinked, setIsLinked] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [isPolling, setIsPolling] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const checkStatus = async (): Promise<boolean> => {
    try {
      const url = role ? `/api/telegram/status?role=${role}` : '/api/telegram/status'
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return false
      const data = await res.json()
      const linked = Boolean(data.linked)
      setIsLinked(linked)
      if (onStatusChange) onStatusChange(linked)
      return linked
    } catch {
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    }
  }, [role])

  const startPolling = () => {
    setIsPolling(true)
    setErrorMessage(null)

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)

    // Poll every 3 seconds
    pollIntervalRef.current = setInterval(async () => {
      const linked = await checkStatus()
      if (linked) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
        setIsPolling(false)
      }
    }, 3000)

    // Stop polling after 2 minutes (120 seconds)
    pollTimeoutRef.current = setTimeout(() => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      setIsPolling(false)
    }, 120000)
  }

  const handleConnect = async () => {
    setErrorMessage(null)
    // Pre-open window synchronously to prevent browser popup blockers from intercepting async window.open
    const popup = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null

    try {
      const res = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()

      if (!res.ok || !data.linkUrl) {
        if (popup) popup.close()
        setErrorMessage(data.error || 'Failed to generate Telegram connection link')
        return
      }

      setGeneratedLink(data.linkUrl)
      if (popup) {
        popup.location.href = data.linkUrl
      } else {
        window.location.href = data.linkUrl
      }
      startPolling()
    } catch {
      if (popup) popup.close()
      setErrorMessage('Network error initiating Telegram connection')
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
        Checking Telegram status...
      </div>
    )
  }

  if (compact) {
    return (
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
            <span>Telegram connected</span>
            {showDisconnect && (
              <button
                type="button"
                onClick={handleDisconnect}
                title="Disconnect Telegram"
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
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
            <button
              type="button"
              onClick={handleConnect}
              disabled={isPolling}
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
                cursor: isPolling ? 'wait' : 'pointer',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              <Send size={13} />
              <span>{isPolling ? 'Waiting for bot...' : 'Connect Telegram'}</span>
            </button>
            {isPolling && generatedLink && (
              <a
                href={generatedLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '10px', color: 'var(--forest)', textDecoration: 'underline' }}
              >
                Open Telegram manually
              </a>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
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
            <span>{title}</span>
          </div>
          <p
            style={{
              fontSize: '11.5px',
              color: 'var(--muted)',
              margin: '4px 0 0',
              lineHeight: 1.5,
            }}
          >
            {subtitle}
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
                <span>Telegram connected</span>
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
                  Disconnect
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <button
                type="button"
                onClick={handleConnect}
                disabled={isPolling}
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
                  cursor: isPolling ? 'wait' : 'pointer',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                {isPolling ? (
                  <>
                    <RefreshCw size={13} className="spin" />
                    <span>Waiting for bot (/start)...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Connect Telegram</span>
                  </>
                )}
              </button>

              {isPolling && generatedLink && (
                <a
                  href={generatedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '11px',
                    color: 'var(--forest)',
                    textDecoration: 'underline',
                    fontWeight: 600,
                  }}
                >
                  Click here if Telegram did not open automatically
                </a>
              )}

              <span style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
                Optional. Booking works without connecting.
              </span>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#c0392b' }}>
          {errorMessage}
        </div>
      )}
    </div>
  )
}
