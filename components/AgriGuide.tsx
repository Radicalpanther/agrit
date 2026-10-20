'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Bot, X, Send, Square, Sparkles } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

interface Message {
  role: 'user' | 'assistant'
  content: string
  chips?: string[]
  isStreaming?: boolean
  status?: string
}

/**
 * Renders message text with clickable markdown links [Label](/farms/slug).
 * Handles partial markdown gracefully while streaming.
 */
function FormattedMessage({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
  const parts: (string | React.ReactNode)[] = []
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    const label = match[1]
    const url = match[2]
    parts.push(
      <Link
        key={`${match.index}-${url}`}
        href={url}
        className="agriguide-link"
        style={{
          color: 'var(--forest)',
          fontWeight: 700,
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
        }}
      >
        {label}
      </Link>,
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return (
    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
      {parts.length > 0 ? parts : text}
      {isStreaming && <span className="agriguide-cursor" aria-hidden="true" />}
    </div>
  )
}

export function AgriGuide() {
  const locale = useLocale()
  const t = useTranslations('agriGuide')
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: t('welcome'),
      chips: [
        t('suggestedPrompts.prompt1'),
        t('suggestedPrompts.prompt2'),
        t('suggestedPrompts.prompt3'),
      ],
    },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeStatus, setActiveStatus] = useState<string>('')

  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isNearBottomRef = useRef(true)

  // Update welcome message if language switches while no conversation has occurred
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [
          {
            role: 'assistant',
            content: t('welcome'),
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

  // Track if user is scrolled near bottom
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isNearBottomRef.current = distanceFromBottom < 80
  }, [])

  // Auto-scroll only when user is near bottom
  const scrollToBottomIfNeeded = useCallback(() => {
    if (isNearBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    scrollToBottomIfNeeded()
  }, [messages, activeStatus, scrollToBottomIfNeeded])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120)
    } else {
      // Abort active stream if panel is closed
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
        setIsStreaming(false)
        setActiveStatus('')
      }
    }
  }, [isOpen])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Abort / Stop generation handler
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
        updated[updated.length - 1].isStreaming = false
      }
      return updated
    })
  }

  // Send message handler
  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText ?? input).trim()
    if (!textToSend || isStreaming) return

    // Cancel any prior stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const userMessage: Message = { role: 'user', content: textToSend }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInput('')
    setIsStreaming(true)
    setActiveStatus(t('searching') || 'Searching farms...')
    isNearBottomRef.current = true

    // Add empty assistant response to stream into
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        isStreaming: true,
      },
    ])

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
        const errJson = await response.json().catch(() => ({}))
        const errorMsg = errJson?.error || `Server error (${response.status})`
        setMessages((prev) => {
          const updated = [...prev]
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              role: 'assistant',
              content: errorMsg,
              isStreaming: false,
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
      let accumulatedText = ''
      let finalChips: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

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

            if (event.type === 'status') {
              if (event.status) {
                setActiveStatus(event.status)
              } else {
                setActiveStatus('')
              }
            } else if (event.type === 'delta') {
              setActiveStatus('')
              accumulatedText += event.text || ''

              // Batch UI update via requestAnimationFrame
              window.requestAnimationFrame(() => {
                setMessages((prev) => {
                  const copy = [...prev]
                  if (copy.length > 0) {
                    copy[copy.length - 1] = {
                      role: 'assistant',
                      content: accumulatedText,
                      isStreaming: true,
                    }
                  }
                  return copy
                })
                scrollToBottomIfNeeded()
              })
            } else if (event.type === 'done') {
              finalChips = event.chips || []
            } else if (event.type === 'error') {
              accumulatedText = event.text || accumulatedText
            }
          } catch {
            // Ignore partial SSE lines
          }
        }
      }

      // Finalize the completed message
      setMessages((prev) => {
        const copy = [...prev]
        if (copy.length > 0) {
          copy[copy.length - 1] = {
            role: 'assistant',
            content: accumulatedText,
            chips: finalChips,
            isStreaming: false,
          }
        }
        return copy
      })
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User stopped generation manually
        return
      }
      setMessages((prev) => {
        const copy = [...prev]
        if (copy.length > 0) {
          copy[copy.length - 1] = {
            role: 'assistant',
            content: t('connectionError'),
            isStreaming: false,
          }
        }
        return copy
      })
    } finally {
      setIsStreaming(false)
      setActiveStatus('')
      abortControllerRef.current = null
      scrollToBottomIfNeeded()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend()
  }

  return (
    <>
      {/* Floating Dark Green Pill Launcher */}
      <button
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

      {/* Chat Assistant Panel (accessible, responsive at 320px) */}
      {isOpen && (
        <div
          id="agriguide-chat-panel"
          className="agriguide-panel"
          role="dialog"
          aria-label={t('openAriaLabel')}
          aria-modal="false"
        >
          {/* Header */}
          <div className="agriguide-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="agriguide-title">{t('title')}</span>
              </div>
              <p className="agriguide-subtitle">{t('subtitle')}</p>
            </div>
            <button
              type="button"
              className="agriguide-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label={t('closeAriaLabel')}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Container */}
          <div
            className="agriguide-messages"
            ref={messagesContainerRef}
            onScroll={handleScroll}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`agriguide-bubble-row ${m.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className={`agriguide-bubble ${m.role}`}>
                  <FormattedMessage text={m.content} isStreaming={m.isStreaming} />

                  {/* Follow-up suggestion chips */}
                  {m.role === 'assistant' && !m.isStreaming && m.chips && m.chips.length > 0 && (
                    <div className="agriguide-chips-row">
                      {m.chips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          className="prompt-chip"
                          onClick={() => handleSend(chip)}
                          disabled={isStreaming}
                        >
                          <Sparkles size={11} style={{ opacity: 0.7 }} />
                          <span>{chip}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Live Status Indicator (e.g. Searching farms...) */}
            {activeStatus && (
              <div className="agriguide-bubble-row assistant">
                <div className="agriguide-status-line">
                  <span className="agriguide-bubble thinking" style={{ padding: '4px 8px', background: 'transparent' }}>
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </span>
                  <span>{activeStatus}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form with Stop & Send controls */}
          <form className="agriguide-input-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('inputPlaceholder')}
              disabled={isStreaming}
              className="agriguide-input"
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
          </form>
        </div>
      )}
    </>
  )
}
