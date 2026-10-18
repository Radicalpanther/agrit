import { NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
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

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('telegram_chat_id, telegram_linked_at')
      .eq('id', userId)
      .maybeSingle()

    const isLinked = Boolean(profile?.telegram_chat_id)

    return NextResponse.json({
      linked: isLinked,
      telegramChatId: profile?.telegram_chat_id || null,
      linkedAt: profile?.telegram_linked_at || null,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error checking status' },
      { status: 500 },
    )
  }
}
