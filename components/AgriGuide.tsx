'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { MessageSquare, X, Send, CornerDownLeft, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_PROMPTS = [
  'Weekend stay under ₹2,500',
  'What is in season this month?',
  'Farm rules and check-in',
]

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content:
    'Hello. I am AgriGuide, your rural farm stay and seasonal harvest assistant. Ask about farm stays, harvest dates, prices, or check-in rules across Maharashtra, Kerala, and Punjab.',
}

/**
 * Renders message text with clickable markdown links [Label](/farms/slug).
 */
function FormattedMessage({ text }: { text: string }) {
  // Regex matches [Label](url)
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
        key={match.index}
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
    </div>
  )
}

export function AgriGuide() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, messages, isLoading])

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText ?? input).trim()
    if (!textToSend || isLoading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: textToSend }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errMessage =
          errorData.error || `Server returned error (${response.status})`
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: errMessage },
        ])
        return
      }

      if (!response.body) {
        throw new Error('No readable stream received from server')
      }

      // Append blank assistant response to stream into
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk

        setMessages((prev) => {
          const updated = [...prev]
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              role: 'assistant',
              content: accumulated,
            }
          }
          return updated
        })
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to connect to AgriGuide service. Please try again shortly.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend()
  }

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        type="button"
        className="agriguide-launcher"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close AgriGuide' : 'Open AgriGuide Assistant'}
        title="AgriGuide rural assistant"
      >
        {isOpen ? (
          <X size={20} strokeWidth={2} />
        ) : (
          <MessageSquare size={20} strokeWidth={2} />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="agriguide-panel" role="dialog" aria-label="AgriGuide Assistant">
          {/* Header */}
          <div className="agriguide-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="agriguide-title">AgriGuide</span>
              </div>
              <p className="agriguide-subtitle">Rural farm stays and harvest advisor</p>
            </div>
            <button
              type="button"
              className="agriguide-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close AgriGuide"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="agriguide-messages">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`agriguide-bubble-row ${m.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className={`agriguide-bubble ${m.role}`}>
                  <FormattedMessage text={m.content} />
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="agriguide-bubble-row assistant">
                <div className="agriguide-bubble assistant thinking">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts (shown when conversation is new) */}
          {messages.length <= 2 && (
            <div className="agriguide-prompts">
              <span className="prompts-label">Suggested:</span>
              <div className="prompts-list">
                {SUGGESTED_PROMPTS.map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    className="prompt-chip"
                    onClick={() => handleSend(prompt)}
                    disabled={isLoading}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form className="agriguide-input-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about farm stays, harvest seasons..."
              disabled={isLoading}
              className="agriguide-input"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="agriguide-send-btn"
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
