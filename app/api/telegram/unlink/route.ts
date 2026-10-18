import { NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const serviceClient = await createServiceClient()

    let userId = user?.id
    if (!userId) {
      const { data: demoProfile } = await serviceClient
        .from('profiles')
        .select('id')
        .limit(1)
        .maybeSingle()
      userId = demoProfile?.id || '93db1b1a-046c-40a3-a078-829e11b2a42d'
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
