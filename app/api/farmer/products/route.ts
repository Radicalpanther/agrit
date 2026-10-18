import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

const productSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().trim().min(2, 'Product name is required'),
  detail: z.string().trim().optional().default(''),
  unit: z.string().trim().min(1, 'Unit (e.g. 1 kg, dozen, bottle) is required'),
  pricePaise: z.coerce.number().int().positive('Price must be greater than zero'),
  stock: z.coerce.number().int().min(0).default(10),
  inSeasonMonths: z.array(z.number().int().min(0).max(11)).default([]),
})

export async function POST(request: Request) {
  try {
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

    const body = await request.json()
    const parsed = productSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 },
      )
    }

    // Verify farm ownership
    const { data: farm } = await serviceClient
      .from('farms')
      .select('id, owner_id')
      .eq('id', parsed.data.farmId)
      .maybeSingle()

    if (!farm || (farm.owner_id && farm.owner_id !== farmerId)) {
      return NextResponse.json(
        { error: 'Forbidden: You can only add products to your own farm' },
        { status: 403 },
      )
    }

    const { data: newProduct, error: insertErr } = await serviceClient
      .from('products')
      .insert({
        farm_id: parsed.data.farmId,
        name: parsed.data.name,
        detail: parsed.data.detail || '',
        unit: parsed.data.unit,
        price_paise: parsed.data.pricePaise,
        stock: parsed.data.stock,
        in_season_months: parsed.data.inSeasonMonths,
      })
      .select('*')
      .single()

    if (insertErr || !newProduct) {
      return NextResponse.json(
        { error: insertErr?.message || 'Failed to add product' },
        { status: 500 },
      )
    }

    revalidatePath('/')
    revalidatePath('/dashboard')

    return NextResponse.json({ success: true, product: newProduct })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error creating product' },
      { status: 500 },
    )
  }
}
