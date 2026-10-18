import { NextResponse, NextRequest } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const requestedRole = request.nextUrl.searchParams.get('role') || 'tourist'
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
