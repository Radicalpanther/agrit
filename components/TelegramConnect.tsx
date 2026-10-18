'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

  const [mounted, setMounted] = useState<boolean>(false)
  const [isLinked, setIsLinked] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [manualLinkUrl, setManualLinkUrl] = useState<string | null>(null)

  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)

  // Floating toast state: { message, type: 'success' | 'error' }
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      setToast(null)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const checkStatus = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/telegram/status?role=farmer', { cache: 'no-store' })
      if (!res.ok) return false
      const data = await res.json()
      const linked = Boolean(data.linked)
      setIsLinked(linked)
      if (linked) {
        setManualLinkUrl(null)
      }
      if (onStatusChange) onStatusChange(linked)
      return linked
    } catch {
      return false
    } finally {
      setLoading(false)
    }
  }

  // Re-check status on initial load
  useEffect(() => {
    checkStatus()
  }, [])

  // When farmer returns to dashboard tab (visibilitychange to visible or window focus),
  // re-check link status once and switch to the "Telegram connected" pill if linked.
  // No continuous polling.
  useEffect(() => {
    const handleRecheck = () => {
      checkStatus()
    }
    const handleVisibility = () => {
      if (!document.hidden) {
        checkStatus()
      }
    }

    window.addEventListener('focus', handleRecheck)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', handleRecheck)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Connect: synchronous window.open, generate token, set tab location, no window.location navigation
  const handleConnect = async () => {
    // Ignore double clicks while loading
    if (isConnecting) return

    // Synchronously before any await, open about:blank
    let tab: Window | null = null
    try {
      tab = window.open('about:blank', '_blank')
    } catch {
      tab = null
    }

    setIsConnecting(true)

    try {
      const res = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'farmer' }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.linkUrl) {
        if (tab) {
          try {
            tab.close()
          } catch {}
        }
        const errorMsg = data?.error || 'Could not generate Telegram link. Please try again.'
        setToast({ message: errorMsg, type: 'error' })
        setIsConnecting(false)
        return
      }

      // Check if popup opened successfully
      if (tab && !tab.closed) {
        tab.location.href = data.linkUrl
        tab.opener = null
        setManualLinkUrl(null)
      } else {
        // Popup blocked: do NOT navigate the current page.
        // Instead, show a visible "Open Telegram" link button next to the Connect button
        setManualLinkUrl(data.linkUrl)
      }
    } catch {
      if (tab) {
        try {
          tab.close()
        } catch {}
      }
      setToast({ message: 'Could not generate Telegram link. Please try again.', type: 'error' })
    } finally {
      setIsConnecting(false)
    }
  }

  // Disconnect: call unlink endpoint, return to Connect button, show floating toast
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
        const errorMsg = data.error || 'Could not disconnect. Please try again.'
        setDisconnectError(errorMsg)
        setIsDisconnecting(false)
        setShowConfirm(false)
        setToast({ message: errorMsg, type: 'error' })
        return
      }

      setIsLinked(false)
      setShowConfirm(false)
      setIsDisconnecting(false)
      setManualLinkUrl(null)
      if (onStatusChange) onStatusChange(false)
      setToast({ message: 'Telegram disconnected.', type: 'success' })
    } catch {
      const errorMsg = 'Could not disconnect. Please try again.'
      setDisconnectError(errorMsg)
      setIsDisconnecting(false)
      setShowConfirm(false)
      setToast({ message: errorMsg, type: 'error' })
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
          whiteSpace: 'nowrap',
          flexShrink: 0,
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
              whiteSpace: 'nowrap',
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
              whiteSpace: 'nowrap',
            }}
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>
    </div>
  )

  const toastElement = toast && (
    <div
      role="status"
      aria-live="polite"
      className="telegram-disconnect-toast"
      style={{
        position: 'fixed',
        bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
        right: 'calc(24px + env(safe-area-inset-right, 0px))',
        zIndex: 9999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        fontSize: '12.5px',
        fontWeight: 600,
        borderRadius: '4px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
        backgroundColor: toast.type === 'success' ? '#f4f8f3' : '#fef2f2',
        color: toast.type === 'success' ? 'var(--forest)' : '#991b1b',
        border: toast.type === 'success' ? '1px solid #86efac' : '1px solid #fecaca',
        lineHeight: 1.3,
        maxWidth: 'calc(100vw - 32px)',
        pointerEvents: 'auto',
      }}
    >
      {toast.type === 'success' ? (
        <Check size={15} style={{ color: 'var(--forest)', flexShrink: 0 }} />
      ) : (
        <X size={15} style={{ color: '#dc2626', flexShrink: 0 }} />
      )}
      <span style={{ whiteSpace: 'nowrap' }}>{toast.message}</span>
      <button
        type="button"
        onClick={() => setToast(null)}
        aria-label="Close notification"
        style={{
          background: 'transparent',
          border: 'none',
          padding: '2px',
          marginLeft: '4px',
          cursor: 'pointer',
          color: toast.type === 'success' ? 'var(--forest)' : '#991b1b',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '2px',
          minWidth: '24px',
          minHeight: '24px',
        }}
      >
        <X size={13} />
      </button>
    </div>
  )

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
              flexShrink: 0,
            }}
          >
            <Check size={14} style={{ color: 'var(--forest)', flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap' }}>{t('connected')}</span>
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
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
                cursor: isConnecting ? 'wait' : 'pointer',
                fontFamily: 'Arial, sans-serif',
                minHeight: '32px',
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

            {manualLinkUrl && (
              <a
                href={manualLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#ffffff',
                  background: 'var(--forest)',
                  border: '1px solid var(--forest)',
                  fontFamily: 'Arial, sans-serif',
                  minHeight: '32px',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                }}
              >
                <Send size={13} />
                <span>Open Telegram</span>
              </a>
            )}
          </div>
        )}
      </div>

      {confirmationModal}
      {mounted && toastElement ? createPortal(toastElement, document.body) : null}
    </>
  )
}
