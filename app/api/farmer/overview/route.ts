import { NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const serviceClient = await createServiceClient()

    // Resolve farmer ID: signed-in user or demo farmer
    let farmerId = user?.id

    if (user) {
      const { data: userProfile } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (userProfile?.role === 'tourist') {
        return NextResponse.json(
          { error: 'Forbidden: Farmer access only' },
          { status: 403 },
        )
      }
    }

    if (!farmerId) {
      // Fallback to seeded farmer Rajesh Patil
      const { data: demoFarmer } = await serviceClient
        .from('profiles')
        .select('id, full_name, phone, role')
        .eq('role', 'farmer')
        .limit(1)
        .maybeSingle()

      farmerId = demoFarmer?.id || '93db1b1a-046c-40a3-a078-829e11b2a42d'
    }

    // 1. Fetch farmer profile
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', farmerId)
      .maybeSingle()

    // 2. Fetch farms owned by this farmer
    const { data: farmsData, error: farmsError } = await serviceClient
      .from('farms')
      .select(`
        *,
        crops:farm_crops (
          crop:crops (*)
        )
      `)
      .eq('owner_id', farmerId)
      .order('created_at', { ascending: false })

    const farms = farmsData || []
    const farmIds = farms.map((f: any) => f.id)

    // 3. Fetch bookings for farmer's farms
    let bookings: any[] = []
    if (farmIds.length > 0) {
      const { data: bData } = await serviceClient
        .from('bookings')
        .select(`
          *,
          farm:farms (id, name, slug),
          tourist:profiles (id, full_name, phone)
        `)
        .in('farm_id', farmIds)
        .order('created_at', { ascending: false })

      bookings = bData || []
    }

    // 4. Fetch products for farmer's farms
    let products: any[] = []
    if (farmIds.length > 0) {
      const { data: pData } = await serviceClient
        .from('products')
        .select(`
          *,
          farm:farms (id, name, slug)
        `)
        .in('farm_id', farmIds)
        .order('name', { ascending: true })

      products = pData || []
    }

    // 5. Fetch product reservations for farmer's farms
    let reservations: any[] = []
    if (farmIds.length > 0) {
      const { data: resData } = await serviceClient
        .from('product_reservations')
        .select(`
          *,
          product:products (*),
          tourist:profiles (id, full_name, phone),
          farm:farms (id, name)
        `)
        .in('pickup_farm_id', farmIds)
        .order('created_at', { ascending: false })

      reservations = resData || []
    }

    // 6. Fetch all available crops for selection
    const { data: allCrops } = await serviceClient
      .from('crops')
      .select('*')
      .order('name', { ascending: true })

    // 7. Calculate overview stats from real bookings
    // Upcoming guests: confirmed or pending bookings
    const upcomingGuests = bookings
      .filter((b) => b.status === 'confirmed' || b.status === 'pending')
      .reduce((sum, b) => sum + (Number(b.guests) || 1), 0)

    // This month's earnings: sum of total_paise for confirmed bookings
    const thisMonthEarningsPaise = bookings
      .filter((b) => b.status === 'confirmed')
      .reduce((sum, b) => sum + (Number(b.total_paise) || 0), 0)

    // New produce orders: reservations in 'reserved' or 'ready' status
    const newProduceOrders = reservations.filter(
      (r) => r.status === 'reserved' || r.status === 'ready',
    ).length

    return NextResponse.json({
      farmerId,
      profile: profile || { full_name: 'Rajesh Patil', role: 'farmer' },
      isDemo: !user,
      stats: {
        upcomingGuests,
        thisMonthEarningsPaise,
        newProduceOrders,
      },
      farms,
      bookings,
      products,
      reservations,
      availableCrops: allCrops || [],
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error fetching farmer overview' },
      { status: 500 },
    )
  }
}
