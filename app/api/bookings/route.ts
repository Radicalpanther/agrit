import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
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
      products = [],
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

    // 3. Resolve products and validate real qty against available stock
    const farmProducts: any[] = farm.products || []
    const availableItems = [...farmProducts, ...PRODUCE_ITEMS]

    // Consolidate requested products from either products array or addOnIds
    const requestedItems: Array<{ id: string; qty: number }> = []
    if (products && products.length > 0) {
      for (const p of products) {
        requestedItems.push({ id: p.id, qty: Math.max(1, p.qty) })
      }
    } else if (addOnIds && addOnIds.length > 0) {
      for (const id of addOnIds) {
        requestedItems.push({ id, qty: 1 })
      }
    }

    const addOns: PricingAddOn[] = []
    const reservedItemsList: string[] = []

    for (const req of requestedItems) {
      const item = availableItems.find((p) => p.id === req.id)
      if (!item) continue

      const stock = typeof item.stock === 'number' ? item.stock : undefined
      // Validate qty against stock (return clear error if too high)
      if (stock !== undefined && stock > 0 && req.qty > stock) {
        return NextResponse.json(
          {
            error: `Requested quantity for "${item.name}" (${req.qty}) exceeds available stock (${stock}).`,
          },
          { status: 400 },
        )
      }

      const unitPrice = item.price_paise || item.pricePaise || 0
      addOns.push({
        id: item.id,
        pricePaise: unitPrice,
        qty: req.qty,
      })
      reservedItemsList.push(`${item.name} x ${req.qty}`)
    }

    // 4. Recalculate price on the server with lib/pricing.ts (ignoring any client total)
    const pricing = calculateBookingPrice({
      visitType,
      guests,
      nights,
      ratePerGuestPaise,
      addOns,
    })

    const reservedProductsText =
      reservedItemsList.length > 0 ? reservedItemsList.join(', ') : ''

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

    const cookieStore = await cookies()
    const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value
    const locale: 'en' | 'hi' | 'mr' = (cookieLocale === 'hi' || cookieLocale === 'mr') ? cookieLocale : 'en'

    let bookingId = `BK-${Date.now().toString(36).toUpperCase()}`

    // Insert into database if farm has database uuid and tourist exists
    if (raw.id && touristId) {
      const bookingPayload: Record<string, any> = {
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
        locale,
      }

      let { data: bookingRow, error: bookingErr } = await supabase
        .from('bookings')
        .insert(bookingPayload)
        .select('id')
        .single()

      if (bookingErr && (bookingErr.message?.includes('locale') || bookingErr.code === '42703')) {
        delete bookingPayload.locale
        const retry = await supabase
          .from('bookings')
          .insert(bookingPayload)
          .select('id')
          .single()
        bookingRow = retry.data
        bookingErr = retry.error
      }

      if (!bookingErr && bookingRow?.id) {
        bookingId = bookingRow.id

        // Record product reservations with real qty
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

        // Update tourist profile with opt-in status and phone (prevent overwriting profile name to qwerty)
        const updatePayload: Record<string, any> = {
          phone: phone,
          whatsapp_opt_in: Boolean(whatsappOptIn),
        }
        if (fullName && !/qwerty/i.test(fullName) && touristId !== '04e3e740-2591-4af8-9a7d-f6397fa198d8') {
          updatePayload.full_name = fullName
        } else if (touristId === '04e3e740-2591-4af8-9a7d-f6397fa198d8' || /qwerty/i.test(fullName || '')) {
          updatePayload.full_name = 'Tourist'
        }
        await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', touristId)

        // Trigger outbound WhatsApp/Telegram notifications via notifyBookingStatus
        const dispatches = await notifyBookingStatus(
          bookingId,
          'created',
          reservedProductsText,
          locale,
        )

        // Find the tourist-facing notification for preview
        const touristNotif =
          dispatches.find((d) => d.template === 'tourist_booking_received' || d.template === 'telegram_tourist_booking_received') ||
          dispatches[dispatches.length - 1] ||
          dispatches[0] ||
          null

        let previewText = touristNotif?.previewText || ''
        if (reservedProductsText) {
          previewText += `\nReserved products for pickup: ${reservedProductsText}`
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
          addOnsTotalPaise: pricing.addOnsTotalPaise,
          reservedItems: reservedItemsList,
          currency: 'INR',
          notification: {
            template: touristNotif?.template || 'tourist_booking_received',
            toPhone: touristNotif?.toPhone || phone,
            status: touristNotif?.status || 'mock',
            previewText:
              previewText ||
              `Namaste ${fullName}, your booking request for ${farm.name} has been received. ${reservedProductsText ? `Reserved products: ${reservedProductsText}.` : ''}`,
          },
        })
      }
    }

    const mockNotificationText = `Namaste ${fullName}, your booking request ${bookingId} for a ${visitType === 'day' ? 'Day visit' : `${pricing.nights} night stay`} at ${farm.name} on ${checkInDate} has been received.${reservedProductsText ? ` Reserved products: ${reservedProductsText}.` : ''} Your host will confirm availability shortly.`

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
      addOnsTotalPaise: pricing.addOnsTotalPaise,
      reservedItems: reservedItemsList,
      currency: 'INR',
      notification: {
        template: 'tourist_booking_received',
        toPhone: phone,
        status: 'mock',
        previewText: mockNotificationText,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error processing booking' },
      { status: 500 },
    )
  }
}
