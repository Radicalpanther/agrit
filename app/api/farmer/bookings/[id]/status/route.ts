import { NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { updateBookingStatus } from '@/lib/booking-status'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const newStatus = body.status

    if (!['confirmed', 'declined'].includes(newStatus)) {
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

    const result = await updateBookingStatus(id, newStatus, {
      type: 'farmer',
      id: farmerId,
    })

    if (!result.success) {
      const code = result.alreadyHandled ? 200 : result.error?.includes('Forbidden') ? 403 : 400
      return NextResponse.json(result, { status: code })
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error updating booking status' },
      { status: 500 },
    )
  }
}
