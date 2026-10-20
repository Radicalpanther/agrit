import { NextResponse } from 'next/server'
import { streamChatWorkflow, ChatMessage } from '@/lib/ai'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// In-memory daily usage tracking
let dailyCount = 0
let currentDay = new Date().toISOString().slice(0, 10)

function checkDailyUsage(): boolean {
  const today = new Date().toISOString().slice(0, 10)
  if (today !== currentDay) {
    currentDay = today
    dailyCount = 0
  }

  const limit = parseInt(process.env.CHAT_DAILY_LIMIT || '5000', 10)
  if (dailyCount >= limit) {
    return false
  }
  dailyCount++
  return true
}

export async function POST(request: Request) {
  const startTime = Date.now()
  let firstTokenTime: number | null = null

  try {
    // 1. Daily usage guard
    if (!checkDailyUsage()) {
      return NextResponse.json(
        { error: 'Daily chat assistant limit reached. Please try again tomorrow.' },
        { status: 429 },
      )
    }

    // 2. Per-IP Rate Limit (25 requests per minute)
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`ip:${ip}`, 25, 60 * 1000)

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please wait a minute before sending another question.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
          },
        },
      )
    }

    // 3. User session lookup (for personalized bookings tool)
    let userId: string | undefined
    try {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
        // Per-user rate limit (40 requests per minute)
        const userRate = checkRateLimit(`user:${user.id}`, 40, 60 * 1000)
        if (!userRate.allowed) {
          return NextResponse.json(
            { error: 'User rate limit reached. Please pause a moment before asking again.' },
            { status: 429 },
          )
        }
      }
    } catch {}

    // 4. Validate payload
    const body = await request.json().catch(() => ({}))
    const messages: ChatMessage[] = body.messages

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: "messages" array is required.' },
        { status: 400 },
      )
    }

    // Trim history to last 8 messages and cap message text at 1000 chars
    const cleanMessages: ChatMessage[] = messages.slice(-8).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').trim().substring(0, 1000),
    }))

    const locale: 'en' | 'hi' | 'mr' =
      body.locale === 'hi' || body.locale === 'mr' ? body.locale : 'en'

    // 5. Construct SSE ReadableStream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamChatWorkflow(cleanMessages, locale, userId)) {
            if (event.type === 'delta' && firstTokenTime === null) {
              firstTokenTime = Date.now()
              const ttft = firstTokenTime - startTime
              console.info(`[Chat TTFT]: ${ttft}ms`)
            }

            const payload = `data: ${JSON.stringify(event)}\n\n`
            controller.enqueue(encoder.encode(payload))
          }

          const totalDuration = Date.now() - startTime
          console.info(`[Chat Completed]: Total duration ${totalDuration}ms`)
          controller.close()
        } catch (streamErr: any) {
          console.error('[Chat Stream Error]:', streamErr)
          const fallbackEvent = {
            type: 'error',
            text: 'I am here to help you find verified farm stays across India. Would you like to explore stays under ₹3,000 or search by region?',
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackEvent)}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err: any) {
    console.error('[API /api/chat Error]:', err)
    return NextResponse.json(
      { error: err?.message || 'Internal server error processing chat request' },
      { status: 500 },
    )
  }
}
