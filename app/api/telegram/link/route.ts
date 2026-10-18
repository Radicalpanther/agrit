import { NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const requestedRole = body?.role || 'farmer'

    if (requestedRole !== 'farmer') {
      return NextResponse.json(
        { error: 'Telegram alerts are available for farm hosts only. Use the AgriTrails website for your bookings.' },
        { status: 403 },
      )
    }

    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const serviceClient = await createServiceClient()

    let userId = user?.id

    if (!userId) {
      const { data: demoFarmer } = await serviceClient
        .from('profiles')
        .select('id')
        .eq('role', 'farmer')
        .limit(1)
        .maybeSingle()
      userId = demoFarmer?.id || '93db1b1a-046c-40a3-a078-829e11b2a42d'
    }

    // Verify user profile is indeed a farmer
    const { data: userProfile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (userProfile && userProfile.role !== 'farmer') {
      return NextResponse.json(
        { error: 'Telegram alerts are available for farm hosts only. Use the AgriTrails website for your bookings.' },
        { status: 403 },
      )
    }

    // Generate random one-time token
    const token = crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Insert token record into telegram_link_tokens with 10-min expiry
    const { error: insErr } = await serviceClient
      .from('telegram_link_tokens')
      .insert({
        token,
        user_id: userId,
        expires_at: expiresAt,
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
