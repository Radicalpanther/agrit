import { NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

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
