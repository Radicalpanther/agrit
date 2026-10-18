import { NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const serviceClient = await createServiceClient()

    // Signed in tourist or fallback to demo tourist (tourist@agritrails.dev)
    let touristId = user?.id

    if (!touristId) {
      const { data: demoTourist } = await serviceClient
        .from('profiles')
        .select('id, full_name, phone, role')
        .eq('role', 'tourist')
        .limit(1)
        .maybeSingle()

      touristId = demoTourist?.id || '04e3e740-2591-4af8-9a7d-f6397fa198d8'
    }

    // Fetch tourist profile
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', touristId)
      .maybeSingle()

    // Fetch bookings with farm and product reservations
    const { data: bookings, error: bookingsError } = await serviceClient
      .from('bookings')
      .select(`
        *,
        farm:farms (
          id,
          name,
          slug,
          place,
          region,
          lat,
          lng,
          image_url,
          host_name,
          host_phone,
          directions_steps,
          landmark_note,
          verified,
          organic_pct,
          allows_day_visit
        ),
        reservations:product_reservations (
          id,
          qty,
          status,
          product:products (id, name, price_paise, unit)
        )
      `)
      .eq('tourist_id', touristId)
      .order('created_at', { ascending: false })

    if (bookingsError) {
      console.error('Error fetching tourist bookings:', bookingsError)
      return NextResponse.json({ error: bookingsError.message }, { status: 500 })
    }

    return NextResponse.json({
      touristId,
      profile: profile || {
        full_name: 'Ananya Sharma (Tourist)',
        role: 'tourist',
        phone: '+91 98200 11111',
      },
      bookings: bookings || [],
    })
  } catch (err: any) {
    console.error('API /api/tourist/bookings error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
