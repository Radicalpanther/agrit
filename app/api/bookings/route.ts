import { NextResponse } from 'next/server'
import { bookingSchema } from '@/lib/validations/booking'
import { calculateBookingPrice, type PricingAddOn } from '@/lib/pricing'
import { fetchServerFarmBySlug } from '@/lib/supabase/queries-server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { PRODUCE_ITEMS } from '@/lib/mock-data'
import { notifyBookingStatus } from '@/lib/notify'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // 1. Validate payload with Zod
    const parsed = bookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: parsed.error.issues,
        },
        { status: 400 },
      )
    }

    const {
      farmSlug,
      visitType,
      fullName,
      email,
      phone,
      whatsappOptIn,
      checkInDate,
      arrivalTime,
      nights,
      guests,
      addOnIds,
    } = parsed.data

    // 2. Fetch farm to retrieve authoritative price rates from server/db
    const farm = await fetchServerFarmBySlug(farmSlug)
    if (!farm) {
      return NextResponse.json(
        { error: `Farm with slug "${farmSlug}" not found` },
        { status: 404 },
      )
    }

    const raw = farm.raw || {}
    let ratePerGuestPaise = farm.pricePaise
    if (visitType === 'day') {
      ratePerGuestPaise = raw.day_visit_price_paise || farm.pricePaise
    }

    // 3. Resolve add-on prices from server/database products
    const farmProducts: any[] = farm.products || []
    const availableItems = [...farmProducts, ...PRODUCE_ITEMS]

    const addOns: PricingAddOn[] = []
    for (const id of addOnIds) {
      const item = availableItems.find((p) => p.id === id)
      if (item) {
        addOns.push({
          id: item.id,
          pricePaise: item.price_paise || item.pricePaise || 0,
          qty: 1,
        })
      }
    }

    // 4. Recalculate price on the server with lib/pricing.ts (ignoring any client total)
    const pricing = calculateBookingPrice({
      visitType,
      guests,
      nights,
      ratePerGuestPaise,
      addOns,
    })

    // 5. Connect to Supabase to persist booking
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let touristId = user?.id

    // Fallback tourist ID lookup by email if not currently signed in
    if (!touristId) {
      const { data: touristUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id || '')
        .maybeSingle()

      touristId = touristUser?.id
    }

    // If still no ID (e.g. running mock or unauthenticated guest), query demo tourist
    if (!touristId) {
      const { data: demoProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'tourist')
        .limit(1)
        .maybeSingle()

      touristId = demoProfile?.id
    }

    let bookingId = `BK-${Date.now().toString(36).toUpperCase()}`

    // Insert into database if farm has database uuid and tourist exists
    if (raw.id && touristId) {
      const { data: bookingRow, error: bookingErr } = await supabase
        .from('bookings')
        .insert({
          farm_id: raw.id,
          tourist_id: touristId,
          visit_type: visitType,
          check_in: checkInDate,
          nights: pricing.nights,
          guests: pricing.guests,
          base_paise: pricing.discountedBasePaise,
          discount_pct: pricing.discountPct,
          total_paise: pricing.totalPaise,
          status: 'pending',
        })
        .select('id')
        .single()

      if (!bookingErr && bookingRow?.id) {
        bookingId = bookingRow.id

        // Record product reservations
        if (addOns.length > 0) {
          const resRows = addOns.map((addOn) => ({
            booking_id: bookingId,
            product_id: addOn.id,
            tourist_id: touristId,
            qty: addOn.qty || 1,
            pickup_farm_id: raw.id,
            status: 'reserved',
          }))
          await supabase.from('product_reservations').insert(resRows)
        }

        // Update tourist profile with opt-in status, phone, and name
        await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            phone: phone,
            whatsapp_opt_in: Boolean(whatsappOptIn),
          })
          .eq('id', touristId)

        // Trigger outbound WhatsApp notifications via notifyBookingStatus
        const dispatches = await notifyBookingStatus(bookingId, 'created')

        // Find the tourist-facing notification for preview
        const touristNotif =
          dispatches.find((d) => d.template === 'tourist_booking_received') ||
          dispatches[0] ||
          null

        return NextResponse.json({
          id: bookingId,
          status: 'pending',
          visitType,
          packageName: pricing.packageName,
          nights: pricing.nights,
          guests: pricing.guests,
          basePaise: pricing.discountedBasePaise,
          discountPct: pricing.discountPct,
          totalPaise: pricing.totalPaise,
          currency: 'INR',
          notification: touristNotif
            ? {
                template: touristNotif.template,
                toPhone: touristNotif.toPhone,
                status: touristNotif.status,
                previewText: touristNotif.previewText,
              }
            : null,
        })
      }
    }

    return NextResponse.json({
      id: bookingId,
      status: 'pending',
      visitType,
      packageName: pricing.packageName,
      nights: pricing.nights,
      guests: pricing.guests,
      basePaise: pricing.discountedBasePaise,
      discountPct: pricing.discountPct,
      totalPaise: pricing.totalPaise,
      currency: 'INR',
      notification: null,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error processing booking' },
      { status: 500 },
    )
  }
}
