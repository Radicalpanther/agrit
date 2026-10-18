import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
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

    const { data: farm, error: farmErr } = await serviceClient
      .from('farms')
      .select('id, owner_id, slug, published')
      .eq('id', id)
      .maybeSingle()

    if (farmErr || !farm) {
      return NextResponse.json({ error: 'Farm listing not found' }, { status: 404 })
    }

    if (farm.owner_id && farm.owner_id !== farmerId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only publish/unpublish your own listings' },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const targetPublished =
      typeof body.published === 'boolean' ? body.published : !(farm.published ?? true)

    const { data: updated, error: updateErr } = await serviceClient
      .from('farms')
      .update({ published: targetPublished })
      .eq('id', id)
      .select('id, published')
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/explore')
    revalidatePath(`/farms/${farm.slug}`)
    revalidatePath('/dashboard')

    return NextResponse.json({ success: true, published: targetPublished })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error updating published status' },
      { status: 500 },
    )
  }
}
