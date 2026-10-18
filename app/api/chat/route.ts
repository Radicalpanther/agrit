import { NextResponse } from 'next/server'
import { streamChatResponse, ChatMessage } from '@/lib/ai'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    // 1. Rate limit check per IP (20 requests per minute)
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(ip, 20, 60 * 1000)

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit reached. Please wait a minute before sending more messages.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
          },
        },
      )
    }

    // 2. Validate payload
    const body = await request.json()
    const messages: ChatMessage[] = body.messages

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: "messages" array is required.' },
        { status: 400 },
      )
    }

    // Sanitize messages to only role and content
    const cleanMessages: ChatMessage[] = messages.slice(-10).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').substring(0, 1000),
    }))

    // 3. Obtain streaming response
    const stream = streamChatResponse(cleanMessages)

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
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
