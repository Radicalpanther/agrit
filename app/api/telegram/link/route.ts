import { NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const serviceClient = await createServiceClient()

    let userId = user?.id

    if (!userId) {
      // Demo farmer fallback if not signed in
      const { data: demoProfile } = await serviceClient
        .from('profiles')
        .select('id')
        .limit(1)
        .maybeSingle()
      userId = demoProfile?.id || '93db1b1a-046c-40a3-a078-829e11b2a42d'
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
      return NextResponse.json({ error: 'Failed to create connection token' }, { status: 500 })
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
