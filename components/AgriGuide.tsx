'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Bot,
  X,
  Send,
  Square,
  RotateCcw,
  Copy,
  Check,
  ArrowDown,
  Star,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

export interface FarmCardData {
  id: string
  slug: string
  name: string
  place: string
  state: string
  price: number
  rating: number
  reviewCount: number
  imageUrl: string | null
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  status?: 'streaming' | 'complete' | 'stopped' | 'error'
  statusText?: string
  chips?: string[]
  farms?: FarmCardData[]
}

/**
 * Trims incomplete markdown links or bracket sequences while streaming,
 * preventing raw "[...](..." syntax or UI flickering until link is complete.
 */
export function trimIncompleteMarkdownLink(text: string, isStreaming: boolean): string {
  if (!isStreaming || !text) return text

  // 1. Unclosed link URL: [Label](...
  const unclosedUrl = text.match(/\[([^\]]+)\]\([^\)]*$/)
  if (unclosedUrl && unclosedUrl.index !== undefined) {
    return text.substring(0, unclosedUrl.index)
  }

  // 2. Closed label without opening URL yet: [Label]
  const labelOnly = text.match(/\[[^\]]+\]$/)
  if (labelOnly && labelOnly.index !== undefined) {
    return text.substring(0, labelOnly.index)
  }

  // 3. Unclosed bracket label: [Label...
  const unclosedBracket = text.match(/\[[^\]]*$/)
  if (unclosedBracket && unclosedBracket.index !== undefined) {
    return text.substring(0, unclosedBracket.index)
  }

  return text
}

/**
 * Parses inline bold **text** and markdown links [Label](/farms/slug).
 * Sets prefetch={false} on all Next.js Links to prevent background fetching.
 */
function renderInlineTokens(raw: string) {
  const regex = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g
  const parts: (string | React.ReactNode)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      parts.push(raw.substring(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      const inner = token.substring(2, token.length - 2)
      parts.push(
        <strong key={`bold-${match.index}`} style={{ fontWeight: 700 }}>
          {inner}
        </strong>,
      )
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch) {
        parts.push(
          <Link
            key={`link-${match.index}`}
            href={linkMatch[2]}
            prefetch={false}
            className="agriguide-link"
          >
            {linkMatch[1]}
          </Link>,
        )
      } else {
        parts.push(token)
      }
    }
    lastIndex = match.index + token.length
  }

  if (lastIndex < raw.length) {
    parts.push(raw.substring(lastIndex))
  }

  return parts.length > 0 ? parts : raw
}

/**
 * Renders structured markdown: bullet points, paragraphs, bold, links.
 * Cursor is rendered strictly as a CSS pseudo-element on the last inline element
 * only while the message status is 'streaming'.
 */
function FormattedMessage({
  text,
  isStreaming,
}: {
  text: string
  isStreaming?: boolean
}) {
  const visibleText = trimIncompleteMarkdownLink(text, Boolean(isStreaming))
  const lines = visibleText.split('\n')
  const elements: React.ReactNode[] = []
  let currentList: React.ReactNode[] = []

  const flushList = (key: string) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={key} className="agriguide-ul">
          {currentList}
        </ul>,
      )
      currentList = []
    }
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ')

    if (isBullet) {
      const content = trimmed.substring(2)
      currentList.push(
        <li key={`li-${idx}`} className="agriguide-li">
          {renderInlineTokens(content)}
        </li>,
      )
    } else {
      flushList(`list-before-${idx}`)
      if (trimmed.length > 0) {
        elements.push(
          <p key={`p-${idx}`} className="agriguide-para">
            {renderInlineTokens(line)}
          </p>,
        )
      }
    }
  })

  flushList(`list-final`)

  return (
    <div
      className={`agriguide-formatted-text ${isStreaming ? 'is-streaming' : ''}`}
    >
      {elements.length > 0 ? elements : <span>{renderInlineTokens(visibleText)}</span>}
    </div>
  )
}

/**
 * Compact Farm Stay preview card with fixed 4:3 thumbnail, loading skeleton,
 * error fallback, and prefetch={false}.
 */
function FarmCard({ farm, viewLabel }: { farm: FarmCardData; viewLabel: string }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const hasImage = Boolean(farm.imageUrl) && !imageError

  return (
    <div className="agriguide-farm-card">
      <div className="agriguide-farm-thumb-wrapper">
        {!imageLoaded && hasImage && (
          <div className="agriguide-farm-skeleton" aria-hidden="true" />
        )}
        {hasImage ? (
          <img
            src={farm.imageUrl!}
            alt={farm.name}
            className={`agriguide-farm-img ${imageLoaded ? 'loaded' : 'loading'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="agriguide-farm-placeholder" aria-hidden="true">
            <Bot size={18} style={{ opacity: 0.35 }} />
          </div>
        )}
      </div>

      <div className="agriguide-farm-info">
        <div className="agriguide-farm-header">
          <span className="agriguide-farm-name" title={farm.name}>
            {farm.name}
          </span>
          {farm.rating > 0 && (
            <span className="agriguide-farm-rating">
              <Star size={11} className="star-icon" fill="var(--gold)" />
              <span>{farm.rating.toFixed(1)}</span>
              {farm.reviewCount > 0 && (
                <span className="review-count">({farm.reviewCount})</span>
              )}
            </span>
          )}
        </div>
        <p className="agriguide-farm-location">
          {farm.place}
          {farm.state ? `, ${farm.state}` : ''}
        </p>
        <div className="agriguide-farm-footer">
          <span className="agriguide-farm-price">
            ₹{farm.price.toLocaleString('en-IN')}{' '}
            <span className="per-guest">/ guest</span>
          </span>
          <Link
            href={`/farms/${farm.slug}`}
            prefetch={false}
            className="agriguide-farm-btn"
          >
            {viewLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Subtle one-click copy button with temporary "Copied" indicator.
 */
function CopyButton({
  text,
  label,
  copiedLabel,
}: {
  text: string
  label: string
  copiedLabel: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard write failures in restricted contexts
    }
  }

  return (
    <button
      type="button"
      className="agriguide-copy-btn"
      onClick={handleCopy}
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
    >
      {copied ? (
        <Check size={12} className="copied-icon" />
      ) : (
        <Copy size={12} />
      )}
      <span className="copy-label">{copied ? copiedLabel : ''}</span>
    </button>
  )
}

const STORAGE_KEY = 'agriguide_chat_messages_v1'
const SCROLL_STORAGE_KEY = 'agriguide_chat_scroll_v1'

export function AgriGuide() {
  const locale = useLocale()
  const t = useTranslations('agriGuide')
  const [isOpen, setIsOpen] = useState(false)
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeStatus, setActiveStatus] = useState<string>('')
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [completedAnnouncement, setCompletedAnnouncement] = useState<string>('')

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: t('welcome'),
      status: 'complete',
      chips: [
        t('suggestedPrompts.prompt1'),
        t('suggestedPrompts.prompt2'),
        t('suggestedPrompts.prompt3'),
      ],
    },
  ])

  const panelRef = useRef<HTMLDivElement | null>(null)
  const launcherRef = useRef<HTMLButtonElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isNearBottomRef = useRef(true)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // 1. Restore conversation and scroll position from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized: Message[] = parsed.slice(-20).map((m: any) => ({
            id: m.id || `msg-${Math.random().toString(36).substring(2, 9)}`,
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content || ''),
            chips: Array.isArray(m.chips) ? m.chips : undefined,
            farms: Array.isArray(m.farms) ? m.farms : undefined,
            status: m.status === 'error' ? 'error' : 'complete',
            statusText: undefined,
          }))
          setMessages(sanitized)
        }
      }
    } catch (e) {
      console.warn('Failed to restore AgriGuide session messages', e)
    }
  }, [])

  // 2. Persist up to last 20 messages to sessionStorage whenever updated (while not actively streaming)
  useEffect(() => {
    if (!isStreaming) {
      try {
        const toSave = messages.slice(-20).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          chips: m.chips,
          farms: m.farms,
          status: m.status,
        }))
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
      } catch (e) {
        console.warn('Failed to save AgriGuide session messages', e)
      }
    }
  }, [messages, isStreaming])

  // 3. Update welcome message on locale change if conversation is pristine
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [
          {
            id: 'welcome',
            role: 'assistant',
            content: t('welcome'),
            status: 'complete',
            chips: [
              t('suggestedPrompts.prompt1'),
              t('suggestedPrompts.prompt2'),
              t('suggestedPrompts.prompt3'),
            ],
          },
        ]
      }
      return prev
    })
  }, [locale, t])

  // 4. Auto-scroll tracking and scroll-to-bottom toggle
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isNearBottomRef.current = distanceFromBottom < 80
    setShowScrollBottom(distanceFromBottom > 140)

    try {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, String(el.scrollTop))
    } catch {}
  }, [])

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      isNearBottomRef.current = true
      setShowScrollBottom(false)
    }
  }, [])

  const scrollToBottomIfNeeded = useCallback(() => {
    if (isNearBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    scrollToBottomIfNeeded()
  }, [messages, activeStatus, scrollToBottomIfNeeded])

  // 5. Auto-grow textarea up to 4 lines (~96px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.min(textareaRef.current.scrollHeight, 100)
      textareaRef.current.style.height = `${Math.max(38, newHeight)}px`
    }
  }, [input])

  // 6. Focus management, Escape key, and panel restoration
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement | null
      setTimeout(() => {
        try {
          const savedScroll = sessionStorage.getItem(SCROLL_STORAGE_KEY)
          if (savedScroll && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = Number(savedScroll)
          } else {
            scrollToBottomIfNeeded()
          }
        } catch {}
        textareaRef.current?.focus()
      }, 100)
    } else {
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      } else {
        launcherRef.current?.focus()
      }
      setShowNewChatConfirm(false)
    }
  }, [isOpen, scrollToBottomIfNeeded])

  // Escape key closes panel
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isOpen])

  // Mobile focus trap
  const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel || window.innerWidth > 640) return

    const focusableElements = panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]',
    )
    if (focusableElements.length === 0) return
    const firstEl = focusableElements[0]
    const lastEl = focusableElements[focusableElements.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      }
    } else {
      if (document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
  }

  // 7. Stop active generation
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setActiveStatus('')
    setMessages((prev) => {
      const updated = [...prev]
      if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          status: 'stopped',
          statusText: undefined,
        }
      }
      return updated
    })
  }

  // 8. Confirm and Clear New Chat
  const handleConfirmNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setActiveStatus('')
    setShowNewChatConfirm(false)
    setInput('')
    try {
      sessionStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(SCROLL_STORAGE_KEY)
    } catch {}

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: t('welcome'),
        status: 'complete',
        chips: [
          t('suggestedPrompts.prompt1'),
          t('suggestedPrompts.prompt2'),
          t('suggestedPrompts.prompt3'),
        ],
      },
    ])
    setTimeout(() => textareaRef.current?.focus(), 80)
  }

  // 9. Send Message Handler
  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText ?? input).trim()
    if (!textToSend || isStreaming) return

    // Cancel prior stream if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Check offline status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', content: textToSend },
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: t('offline'),
          status: 'error',
        },
      ])
      setInput('')
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
    }
    const updatedMessages = [...messages, userMessage]

    const initialStatus = t('searching') || 'Searching farms...'
    const assistantMessageId = `assistant-${Date.now()}`
    const assistantPlaceholder: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      statusText: initialStatus,
    }

    setMessages([...updatedMessages, assistantPlaceholder])
    setInput('')
    setIsStreaming(true)
    setActiveStatus(initialStatus)
    isNearBottomRef.current = true

    let accumulatedText = ''
    let finalChips: string[] = []
    let finalFarms: FarmCardData[] = []

    const processEvent = (event: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[AgriGuide SSE Event]:', event.type, event)
      }

      if (event.type === 'status') {
        const newStatus = (event.status || '').trim()
        if (newStatus) {
          setActiveStatus(newStatus)
          setMessages((prev) => {
            const copy = [...prev]
            if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                statusText: newStatus,
              }
            }
            return copy
          })
        }
      } else if (event.type === 'delta') {
        setActiveStatus('')
        accumulatedText += event.text || ''
        const currentText = accumulatedText

        setMessages((prev) => {
          const copy = [...prev]
          if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
            copy[copy.length - 1] = {
              ...copy[copy.length - 1],
              content: currentText,
              status: 'streaming',
              statusText: undefined,
            }
          }
          return copy
        })
        scrollToBottomIfNeeded()
      } else if (event.type === 'done') {
        finalChips = Array.isArray(event.chips) ? event.chips : []
        finalFarms = Array.isArray(event.farms) ? event.farms : []

        setMessages((prev) => {
          const copy = [...prev]
          if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
            copy[copy.length - 1] = {
              ...copy[copy.length - 1],
              content: accumulatedText,
              chips: finalChips,
              farms: finalFarms,
              status: 'complete',
              statusText: undefined,
            }
          }
          return copy
        })
        setIsStreaming(false)
        setCompletedAnnouncement(accumulatedText)
        scrollToBottomIfNeeded()
      } else if (event.type === 'error') {
        accumulatedText = event.text || accumulatedText
        setMessages((prev) => {
          const copy = [...prev]
          if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
            copy[copy.length - 1] = {
              ...copy[copy.length - 1],
              content: accumulatedText,
              status: 'error',
              statusText: undefined,
            }
          }
          return copy
        })
        setIsStreaming(false)
      }
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          locale,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        if (response.status === 429) {
          setMessages((prev) => {
            const updated = [...prev]
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: t('rateLimited'),
                status: 'error',
                statusText: undefined,
              }
            }
            return updated
          })
          return
        }

        const errJson = await response.json().catch(() => ({}))
        const errorMsg = errJson?.error || `Server error (${response.status})`
        setMessages((prev) => {
          const updated = [...prev]
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: errorMsg,
              status: 'error',
              statusText: undefined,
            }
          }
          return updated
        })
        return
      }

      if (!response.body) {
        throw new Error('No streaming body received')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          // Flush TextDecoder of any residual bytes
          buffer += decoder.decode()
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const jsonStr = trimmed.substring(5).trim()
          if (!jsonStr) continue

          try {
            const event = JSON.parse(jsonStr)
            processEvent(event)
          } catch (parseErr) {
            console.warn('[AgriGuide SSE parse error]:', parseErr)
          }
        }
      }

      // Process any residual data remaining in buffer after stream closes
      if (buffer.trim()) {
        const remainingLines = buffer.split('\n')
        for (const line of remainingLines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const jsonStr = trimmed.substring(5).trim()
          if (!jsonStr) continue

          try {
            const event = JSON.parse(jsonStr)
            processEvent(event)
          } catch (parseErr) {
            console.warn('[AgriGuide residual SSE parse error]:', parseErr)
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return
      }
      setMessages((prev) => {
        const copy = [...prev]
        if (copy.length > 0) {
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            content: t('connectionError'),
            status: 'error',
            statusText: undefined,
          }
        }
        return copy
      })
    } finally {
      setIsStreaming(false)
      setActiveStatus('')
      abortControllerRef.current = null

      // Guaranteed cleanup: message status is set to 'complete' if still marked 'streaming'
      setMessages((prev) => {
        const copy = [...prev]
        if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
          const last = copy[copy.length - 1]
          if (last.status === 'streaming') {
            copy[copy.length - 1] = {
              ...last,
              content: accumulatedText || last.content,
              chips: finalChips.length > 0 ? finalChips : last.chips,
              farms: finalFarms.length > 0 ? finalFarms : last.farms,
              status: 'complete',
              statusText: undefined,
            }
          }
        }
        return copy
      })
      scrollToBottomIfNeeded()
    }
  }

  // 10. Retry on Failed Message
  const handleRetry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUser) return

    setMessages((prev) => {
      const filtered = [...prev]
      if (
        filtered.length > 0 &&
        filtered[filtered.length - 1].role === 'assistant' &&
        filtered[filtered.length - 1].status === 'error'
      ) {
        filtered.pop()
      }
      return filtered
    })

    handleSend(lastUser.content)
  }

  // 11. Enter / Shift+Enter key handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isConversationEmpty =
    messages.length === 1 && messages[0].role === 'assistant'

  return (
    <>
      {/* Screen reader polite announcement region for completed answers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {completedAnnouncement}
      </div>

      {/* Floating Dark Green Launcher Pill (or round close button when open on desktop) */}
      <button
        ref={launcherRef}
        type="button"
        className={`agriguide-launcher ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={
          isOpen
            ? t('closeAriaLabel')
            : 'Open AgriGuide chat, Ask the AgriBot!'
        }
        aria-expanded={isOpen}
        aria-controls="agriguide-chat-panel"
        title="Ask the AgriBot!"
      >
        {isOpen ? (
          <X size={20} strokeWidth={2.2} />
        ) : (
          <>
            <Bot size={18} strokeWidth={2.2} className="agriguide-launcher-icon" />
            <span className="agriguide-launcher-label">Ask the AgriBot!</span>
          </>
        )}
      </button>

      {/* Chat Assistant Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          id="agriguide-chat-panel"
          className="agriguide-panel"
          role="dialog"
          aria-label={t('openAriaLabel')}
          aria-modal="true"
          onKeyDown={handlePanelKeyDown}
        >
          {/* Header */}
          <div className="agriguide-header">
            {showNewChatConfirm ? (
              <div className="agriguide-confirm-bar">
                <span className="agriguide-confirm-text">
                  {t('newChatConfirm')}
                </span>
                <div className="agriguide-confirm-actions">
                  <button
                    type="button"
                    className="agriguide-confirm-btn confirm-clear"
                    onClick={handleConfirmNewChat}
                  >
                    {t('clearChat')}
                  </button>
                  <button
                    type="button"
                    className="agriguide-confirm-btn confirm-cancel"
                    onClick={() => setShowNewChatConfirm(false)}
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="agriguide-header-info">
                  <div className="agriguide-title-row">
                    <span className="agriguide-title">{t('title')}</span>
                  </div>
                  <p className="agriguide-subtitle">{t('subtitle')}</p>
                </div>

                <div className="agriguide-header-actions">
                  {!isConversationEmpty && (
                    <button
                      type="button"
                      className="agriguide-header-btn"
                      onClick={() => setShowNewChatConfirm(true)}
                      aria-label={t('newChat')}
                      title={t('newChat')}
                    >
                      <RotateCcw size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="agriguide-header-btn"
                    onClick={() => setIsOpen(false)}
                    aria-label={t('closeAriaLabel')}
                    title={t('closeAriaLabel')}
                  >
                    <X size={17} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Messages Container */}
          <div
            className="agriguide-messages"
            ref={messagesContainerRef}
            onScroll={handleScroll}
          >
            {messages.map((m, idx) => {
              const isLatestMessage = idx === messages.length - 1
              const showStarterChips =
                isConversationEmpty && idx === 0 && m.chips && m.chips.length > 0
              const showFollowUpChips =
                !isConversationEmpty &&
                isLatestMessage &&
                m.role === 'assistant' &&
                m.status === 'complete' &&
                !isStreaming &&
                m.chips &&
                m.chips.length > 0

              const isMessageStreaming = m.status === 'streaming'

              return (
                <div
                  key={m.id || idx}
                  className={`agriguide-bubble-row ${m.role === 'user' ? 'user' : 'assistant'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="agriguide-avatar" aria-hidden="true">
                      <Bot size={15} />
                    </div>
                  )}

                  <div className="agriguide-bubble-container">
                    <div
                      className={`agriguide-bubble ${m.role} ${m.status === 'error' ? 'error-bubble' : ''}`}
                    >
                      {/* Single assistant bubble: shows typing dots + status text until first delta */}
                      {m.role === 'assistant' && m.content.length === 0 ? (
                        <div className="agriguide-bubble-status">
                          <span className="agriguide-thinking-dots">
                            <span className="dot" />
                            <span className="dot" />
                            <span className="dot" />
                          </span>
                          <span className="status-label">
                            {m.statusText || activeStatus || t('searching')}
                          </span>
                        </div>
                      ) : (
                        <>
                          <FormattedMessage
                            text={m.content}
                            isStreaming={isMessageStreaming}
                          />

                          {/* Compact Farm Preview Cards from done event */}
                          {m.farms && m.farms.length > 0 && (
                            <div className="agriguide-farm-cards-container">
                              {m.farms.map((farm, fIdx) => (
                                <FarmCard
                                  key={`${farm.slug}-${fIdx}`}
                                  farm={farm}
                                  viewLabel={t('viewStay')}
                                />
                              ))}
                            </div>
                          )}

                          {/* Retry button on failed messages */}
                          {m.status === 'error' && (
                            <div className="agriguide-retry-row">
                              <button
                                type="button"
                                className="agriguide-retry-btn"
                                onClick={handleRetry}
                              >
                                <RotateCcw size={12} />
                                <span>{t('retry')}</span>
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Copy button for completed assistant messages */}
                    {m.role === 'assistant' &&
                      m.status === 'complete' &&
                      m.content.length > 0 && (
                        <CopyButton
                          text={m.content}
                          label={t('copy')}
                          copiedLabel={t('copied')}
                        />
                      )}

                    {/* Starter chips directly under welcome message while conversation is empty */}
                    {showStarterChips && m.chips && (
                      <div className="agriguide-chips-row">
                        {m.chips.map((chip, cIdx) => (
                          <button
                            key={cIdx}
                            type="button"
                            className="prompt-chip"
                            onClick={() => handleSend(chip)}
                            disabled={isStreaming}
                          >
                            <span>{chip}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Follow-up chips directly under LATEST answer only */}
                    {showFollowUpChips && m.chips && (
                      <div className="agriguide-chips-row">
                        {m.chips.map((chip, cIdx) => (
                          <button
                            key={cIdx}
                            type="button"
                            className="prompt-chip"
                            onClick={() => handleSend(chip)}
                            disabled={isStreaming}
                          >
                            <span>{chip}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div ref={messagesEndRef} />

            {/* Scroll-to-bottom floating button */}
            {showScrollBottom && (
              <button
                type="button"
                className="agriguide-scroll-bottom-btn"
                onClick={scrollToBottom}
                aria-label={t('scrollToBottom')}
                title={t('scrollToBottom')}
              >
                <ArrowDown size={14} />
              </button>
            )}
          </div>

          {/* Input Area with Auto-growing Textarea & Controls */}
          <form
            className="agriguide-input-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
          >
            <div className="agriguide-input-row">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                maxLength={500}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('inputPlaceholder')}
                disabled={isStreaming}
                className="agriguide-textarea"
                aria-label={t('inputPlaceholder')}
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="agriguide-stop-btn"
                  aria-label={t('stopAriaLabel') || 'Stop generating response'}
                  title={t('stop') || 'Stop'}
                >
                  <Square size={14} fill="#dc2626" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="agriguide-send-btn"
                  aria-label={t('sendAriaLabel')}
                  title="Send"
                >
                  <Send size={15} />
                </button>
              )}
            </div>

            {/* Subtle counter near the 500-char limit */}
            {input.length >= 400 && (
              <div className="agriguide-char-counter">
                <span>{input.length}/500</span>
              </div>
            )}
          </form>
        </div>
      )}
    </>
  )
}
