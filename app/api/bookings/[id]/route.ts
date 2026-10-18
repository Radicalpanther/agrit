import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const serviceClient = await createServiceClient()

    const { data: booking, error } = await serviceClient
      .from('bookings')
      .select(`
        id,
        status,
        check_in,
        visit_type,
        nights,
        guests,
        total_paise,
        created_at,
        farm:farms (
          id,
          name,
          slug,
          place,
          region,
          host_name,
          host_phone
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        status: booking.status,
        checkIn: booking.check_in,
        visitType: booking.visit_type,
        nights: booking.nights,
        guests: booking.guests,
        totalPaise: booking.total_paise,
        farm: booking.farm,
        createdAt: booking.created_at,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error fetching booking' },
      { status: 500 },
    )
  }
}
