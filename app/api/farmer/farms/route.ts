import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { farmListingSchema, generateFarmSlug } from '@/lib/validations/farm'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const serviceClient = await createServiceClient()

    let farmerId = user?.id

    if (user) {
      const { data: userProfile } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (userProfile?.role === 'tourist') {
        return NextResponse.json(
          { error: 'Forbidden: Farmers only' },
          { status: 403 },
        )
      }
    }

    if (!farmerId) {
      const { data: demoFarmer } = await serviceClient
        .from('profiles')
        .select('id')
        .eq('role', 'farmer')
        .limit(1)
        .maybeSingle()
      farmerId = demoFarmer?.id || '93db1b1a-046c-40a3-a078-829e11b2a42d'
    }

    const body = await request.json()
    const parsed = farmListingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 },
      )
    }

    // Generate unique slug
    let baseSlug = generateFarmSlug(parsed.data.name)
    let uniqueSlug = baseSlug
    let counter = 1

    while (true) {
      const { data: existing } = await serviceClient
        .from('farms')
        .select('id')
        .eq('slug', uniqueSlug)
        .maybeSingle()

      if (!existing) break
      counter++
      uniqueSlug = `${baseSlug}-${counter}`
    }

    const farmPayload: Record<string, any> = {
      owner_id: farmerId,
      slug: uniqueSlug,
      name: parsed.data.name,
      place: parsed.data.place,
      region: parsed.data.region,
      description: parsed.data.description,
      price_paise: parsed.data.pricePaise,
      allows_day_visit: parsed.data.allowsDayVisit,
      day_visit_price_paise: parsed.data.dayVisitPricePaise || null,
      day_visit_start: parsed.data.dayVisitStart || null,
      day_visit_end: parsed.data.dayVisitEnd || null,
      max_guests: parsed.data.maxGuests,
      tags: parsed.data.tags,
      host_name: parsed.data.hostName,
      host_phone: parsed.data.hostPhone,
      landmark_note: parsed.data.landmarkNote || '',
      directions_steps: parsed.data.directionsSteps,
      image_url: parsed.data.imageUrl,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      published: parsed.data.published ?? true,
      verified: true,
      organic_pct: 85,
    }

    // Insert farm, handling optional published column gracefully if migration pending
    let newFarm: any = null
    let { data: inserted, error: insertError } = await serviceClient
      .from('farms')
      .insert(farmPayload)
      .select('*')
      .single()

    if (insertError && insertError.message?.includes('published')) {
      delete farmPayload.published
      const retry = await serviceClient
        .from('farms')
        .insert(farmPayload)
        .select('*')
        .single()
      inserted = retry.data
      insertError = retry.error
    }

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message || 'Failed to create farm stay listing' },
        { status: 500 },
      )
    }

    newFarm = inserted

    // Link seasonal crops in farm_crops
    if (parsed.data.cropIds && parsed.data.cropIds.length > 0) {
      const cropLinks = parsed.data.cropIds.map((cropId) => ({
        farm_id: newFarm.id,
        crop_id: cropId,
      }))
      await serviceClient.from('farm_crops').insert(cropLinks)
    }

    // Revalidate affected pages so new listing appears at once on Home, Explore, and farm detail
    revalidatePath('/')
    revalidatePath('/explore')
    revalidatePath(`/farms/${uniqueSlug}`)
    revalidatePath('/dashboard')

    return NextResponse.json({
      success: true,
      farm: newFarm,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error creating listing' },
      { status: 500 },
    )
  }
}
