'use client'

import { useState, useEffect } from 'react'
import { Send, Check, RefreshCw, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

export interface TelegramConnectProps {
  title?: string
  subtitle?: string
  compact?: boolean
  showDisconnect?: boolean
  role?: 'farmer' | 'tourist'
  onStatusChange?: (isLinked: boolean) => void
}

export function TelegramConnect({
  compact = false,
  role = 'farmer',
  onStatusChange,
}: TelegramConnectProps) {
  // Telegram is strictly for farm hosts only
  if (role === 'tourist') {
    return null
  }

  const t = useTranslations('telegram')

  const [isLinked, setIsLinked] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)

  const checkStatus = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/telegram/status?role=farmer', { cache: 'no-store' })
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

  // Re-check status on page load
  useEffect(() => {
    checkStatus()
  }, [])

  // Re-check status when the tab regains focus or visibility
  useEffect(() => {
    const handleFocus = () => {
      checkStatus()
    }
    const handleVisibility = () => {
      if (!document.hidden) {
        checkStatus()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Connect: generate one-time token and open in new tab
  const [disconnectedNotice, setDisconnectedNotice] = useState<string | null>(null)

  const handleConnect = async () => {
    setConnectError(null)
    setDisconnectedNotice(null)
    setIsConnecting(true)

    // Open a blank tab synchronously within user click event to prevent popup blocker
    let newTab: Window | null = null
    try {
      newTab = window.open('about:blank', '_blank')
    } catch {
      // Ignored
    }

    try {
      const res = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'farmer' }),
      })
      const data = await res.json()

      if (!res.ok || !data.linkUrl) {
        if (newTab) newTab.close()
        setConnectError(data.error || 'Failed to create link')
        setIsConnecting(false)
        return
      }

      // Navigate new tab to Telegram link
      if (newTab) {
        newTab.opener = null
        newTab.location.href = data.linkUrl
      } else {
        window.open(data.linkUrl, '_blank', 'noopener,noreferrer')
      }
      setIsConnecting(false)
    } catch {
      if (newTab) newTab.close()
      setConnectError('Network error connecting to Telegram')
      setIsConnecting(false)
    }
  }

  // Disconnect: call unlink endpoint, notify farmer, and return to Connect button
  const handleDisconnect = async () => {
    setDisconnectError(null)
    setIsDisconnecting(true)

    try {
      const res = await fetch('/api/telegram/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'farmer' }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || data.error) {
        setDisconnectError(data.error || 'Failed to disconnect')
        setIsDisconnecting(false)
        return
      }

      setIsLinked(false)
      setShowConfirm(false)
      setIsDisconnecting(false)
      setDisconnectedNotice('Telegram disconnected. Notification sent.')
      if (onStatusChange) onStatusChange(false)
    } catch {
      setDisconnectError('Network error disconnecting')
      setIsDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          fontSize: '11.5px',
          color: 'var(--muted)',
        }}
      >
        <RefreshCw size={12} className="spin" />
        <span>{t('checking')}</span>
      </div>
    )
  }

  const confirmationModal = showConfirm && (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disconnect-dialog-title"
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
        if (e.target === e.currentTarget && !isDisconnecting) {
          setShowConfirm(false)
          setDisconnectError(null)
        }
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--line)',
          maxWidth: '380px',
          width: '100%',
          padding: '22px 24px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18)',
          borderRadius: '4px',
        }}
      >
        <p
          id="disconnect-dialog-title"
          style={{
            margin: '0 0 16px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--ink)',
            lineHeight: 1.5,
          }}
        >
          Disconnect Telegram? You will stop receiving booking alerts.
        </p>

        {disconnectError && (
          <p
            style={{
              margin: '0 0 12px',
              fontSize: '11.5px',
              color: '#dc2626',
              fontWeight: 600,
            }}
          >
            {disconnectError}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setShowConfirm(false)
              setDisconnectError(null)
            }}
            disabled={isDisconnecting}
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
              background: '#ffffff',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              cursor: isDisconnecting ? 'not-allowed' : 'pointer',
              borderRadius: '2px',
              minHeight: '32px',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 700,
              background: '#dc2626',
              border: 'none',
              color: '#ffffff',
              cursor: isDisconnecting ? 'wait' : 'pointer',
              borderRadius: '2px',
              minHeight: '32px',
            }}
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>
    </div>
  )

  // Auto-dismiss floating disconnect notification after 5 seconds
  useEffect(() => {
    if (disconnectedNotice) {
      const timer = setTimeout(() => {
        setDisconnectedNotice(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [disconnectedNotice])

  return (
    <>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
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
              padding: '4px 6px 4px 10px',
              fontWeight: 700,
              fontSize: '11.5px',
              borderRadius: '3px',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            <Check size={14} style={{ color: 'var(--forest)', flexShrink: 0 }} />
            <span>{t('connected')}</span>
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              aria-label="Disconnect Telegram"
              title="Disconnect Telegram"
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                padding: 0,
                marginLeft: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '32px',
                minHeight: '32px',
                borderRadius: '2px',
              }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--forest)',
                background: 'var(--mint)',
                border: '1px solid var(--line)',
                cursor: isConnecting ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                minHeight: '36px',
                borderRadius: '3px',
                whiteSpace: 'nowrap',
              }}
            >
              {isConnecting ? (
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

            {connectError && (
              <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {connectError}
              </span>
            )}
          </div>
        )}
      </div>

      {confirmationModal}

      {/* Floating toast notification — never breaks or shifts header layout */}
      {disconnectedNotice && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            fontSize: '12.5px',
            fontWeight: 600,
            color: '#ffffff',
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '6px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          }}
        >
          <span>{disconnectedNotice}</span>
          <button
            type="button"
            onClick={() => setDisconnectedNotice(null)}
            aria-label="Dismiss notice"
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  )
}
