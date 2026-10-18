import { NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const requestedRole = body?.role || 'farmer'

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

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('telegram_chat_id')
      .eq('id', userId)
      .maybeSingle()

    if (profile?.telegram_chat_id) {
      const { deleteMyCommands, sendTelegramMessage } = await import('@/lib/telegram')
      await sendTelegramMessage(
        profile.telegram_chat_id,
        'Your AgriTrails host account has been disconnected. You will no longer receive booking alerts here. Reconnect any time from your dashboard.',
      ).catch(() => {})
      await deleteMyCommands({ type: 'chat', chat_id: profile.telegram_chat_id }).catch(() => {})
    }

    await serviceClient
      .from('profiles')
      .update({
        telegram_chat_id: null,
        telegram_linked_at: null,
      })
      .eq('id', userId)

    return NextResponse.json({
      success: true,
      linked: false,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error disconnecting Telegram' },
      { status: 500 },
    )
  }
}
