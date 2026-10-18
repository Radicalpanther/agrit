import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const serviceClient = await createServiceClient()

    const { data: notif, error } = await serviceClient
      .from('notifications')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!notif) {
      return NextResponse.json({ notification: null }, { status: 404 })
    }

    return NextResponse.json({
      notification: {
        id: notif.id,
        bookingId: notif.booking_id,
        toPhone: notif.to_phone,
        template: notif.template,
        status: notif.status,
        previewText: notif.payload?.preview_text || '',
        createdAt: notif.created_at,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
