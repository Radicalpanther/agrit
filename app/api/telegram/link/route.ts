import { NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const requestedRole = body?.role || 'tourist'

    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const serviceClient = await createServiceClient()

    let userId = user?.id

    if (!userId) {
      if (requestedRole === 'farmer') {
        const { data: demoFarmer } = await serviceClient
          .from('profiles')
          .select('id')
          .eq('role', 'farmer')
          .limit(1)
          .maybeSingle()
        userId = demoFarmer?.id || '93db1b1a-046c-40a3-a078-829e11b2a42d'
      } else {
        const { data: demoTourist } = await serviceClient
          .from('profiles')
          .select('id')
          .eq('role', 'tourist')
          .limit(1)
          .maybeSingle()
        userId = demoTourist?.id || '04e3e740-2591-4af8-9a7d-f6397fa198d8'
      }
    }

    // Generate random one-time token
    const token = crypto.randomUUID().replace(/-/g, '')

    // Insert token record into telegram_link_tokens
    const { error: insErr } = await serviceClient
      .from('telegram_link_tokens')
      .insert({
        token,
        user_id: userId,
        used: false,
      })

    if (insErr) {
      console.error('[Telegram Link Token Error]', insErr)
      return NextResponse.json({ error: insErr.message || 'Failed to create connection token' }, { status: 500 })
    }

    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'Agritrail_bot'
    const linkUrl = `https://t.me/${botUsername}?start=${token}`

    return NextResponse.json({
      success: true,
      token,
      linkUrl,
      botUsername,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error creating link' },
      { status: 500 },
    )
  }
}
