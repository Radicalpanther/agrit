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
    const newStock = Number(body.stock)

    if (isNaN(newStock) || newStock < 0) {
      return NextResponse.json({ error: 'Valid stock number is required' }, { status: 400 })
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

    // Verify product ownership via farm
    const { data: product } = await serviceClient
      .from('products')
      .select('id, farm:farms(owner_id)')
      .eq('id', id)
      .maybeSingle()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const farmOwner = (product.farm as any)?.owner_id
    if (farmOwner && farmOwner !== farmerId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update stock for your own farm' },
        { status: 403 },
      )
    }

    const { error: updateErr } = await serviceClient
      .from('products')
      .update({ stock: newStock })
      .eq('id', id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/dashboard')

    return NextResponse.json({ success: true, stock: newStock })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error updating stock' },
      { status: 500 },
    )
  }
}
