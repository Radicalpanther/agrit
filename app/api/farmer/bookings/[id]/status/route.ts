import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { notifyBookingStatus } from '@/lib/notifications'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const newStatus = body.status

    if (!['confirmed', 'declined', 'cancelled'].includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid booking status' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const serviceClient = await createServiceClient()

    let farmerId = user?.id
    if (!farmerId) {
      const { data: demoFarmer } = await serviceClient
        .from('profiles')
        .select('id')
        .eq('role', 'farmer')
        .limit(1)
        .maybeSingle()
      farmerId = demoFarmer?.id || '93db1b1a-046c-40a3-a078-829e11b2a42d'
    }

    // Verify booking and farm ownership
    const { data: booking, error: bErr } = await serviceClient
      .from('bookings')
      .select('id, farm_id, farm:farms(owner_id)')
      .eq('id', id)
      .maybeSingle()

    if (bErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const farmOwner = (booking.farm as any)?.owner_id
    if (farmOwner && farmOwner !== farmerId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only manage bookings for your own farm' },
        { status: 403 },
      )
    }

    const { error: updateErr } = await serviceClient
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Trigger notification module
    await notifyBookingStatus(id, newStatus as any)

    revalidatePath('/dashboard')

    return NextResponse.json({ success: true, status: newStatus })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error updating booking status' },
      { status: 500 },
    )
  }
}
