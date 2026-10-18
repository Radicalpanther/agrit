import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const newStatus = body.status

    if (!['ready', 'collected', 'cancelled', 'reserved'].includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid reservation status' }, { status: 400 })
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

    // Verify pickup farm ownership
    const { data: reservation } = await serviceClient
      .from('product_reservations')
      .select('id, pickup_farm:farms(owner_id)')
      .eq('id', id)
      .maybeSingle()

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const farmOwner = (reservation.pickup_farm as any)?.owner_id
    if (farmOwner && farmOwner !== farmerId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only manage reservations for your own farm' },
        { status: 403 },
      )
    }

    const { error: updateErr } = await serviceClient
      .from('product_reservations')
      .update({ status: newStatus })
      .eq('id', id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    revalidatePath('/dashboard')

    return NextResponse.json({ success: true, status: newStatus })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error updating reservation status' },
      { status: 500 },
    )
  }
}
