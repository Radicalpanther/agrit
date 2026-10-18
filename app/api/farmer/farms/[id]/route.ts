import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { farmListingSchema } from '@/lib/validations/farm'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
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

    // Verify farm exists and is owned by this farmer
    const { data: existingFarm, error: fetchErr } = await serviceClient
      .from('farms')
      .select('id, owner_id, slug')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !existingFarm) {
      return NextResponse.json({ error: 'Farm listing not found' }, { status: 404 })
    }

    if (existingFarm.owner_id && existingFarm.owner_id !== farmerId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit your own listings' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const parsed = farmListingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const updatePayload: Record<string, any> = {
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
    }

    let updated: any = null
    let { data: farmData, error: updateError } = await serviceClient
      .from('farms')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError && updateError.message?.includes('published')) {
      delete updatePayload.published
      const retry = await serviceClient
        .from('farms')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single()
      farmData = retry.data
      updateError = retry.error
    }

    if (updateError || !farmData) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update listing' },
        { status: 500 },
      )
    }

    updated = farmData

    // Update crop associations in farm_crops
    await serviceClient.from('farm_crops').delete().eq('farm_id', id)
    if (parsed.data.cropIds && parsed.data.cropIds.length > 0) {
      const cropLinks = parsed.data.cropIds.map((cropId) => ({
        farm_id: id,
        crop_id: cropId,
      }))
      await serviceClient.from('farm_crops').insert(cropLinks)
    }

    revalidatePath('/')
    revalidatePath('/explore')
    revalidatePath(`/farms/${existingFarm.slug}`)
    revalidatePath('/dashboard')

    return NextResponse.json({
      success: true,
      farm: updated,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error updating listing' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
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

    const { data: existingFarm } = await serviceClient
      .from('farms')
      .select('id, owner_id, slug')
      .eq('id', id)
      .maybeSingle()

    if (!existingFarm) {
      return NextResponse.json({ error: 'Farm listing not found' }, { status: 404 })
    }

    if (existingFarm.owner_id && existingFarm.owner_id !== farmerId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own listings' },
        { status: 403 },
      )
    }

    const { error: delError } = await serviceClient.from('farms').delete().eq('id', id)
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/explore')
    revalidatePath('/dashboard')

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error deleting listing' },
      { status: 500 },
    )
  }
}
