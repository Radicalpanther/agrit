export type VisitType = 'day' | 'overnight'

export interface PricingAddOn {
  id: string
  pricePaise: number
  qty?: number
}

export interface PricingInput {
  visitType: VisitType
  guests: number
  nights?: number
  ratePerGuestPaise: number
  addOns?: PricingAddOn[]
}

export interface PricingResult {
  visitType: VisitType
  guests: number
  nights: number
  ratePerGuestPaise: number
  subtotalPaise: number
  discountPct: number
  discountPaise: number
  discountedBasePaise: number
  packageName: 'Standard Rate' | 'Family Package' | 'Group and Educational Package'
  effectiveRatePerGuestPaise: number
  addOnsTotalPaise: number
  totalPaise: number
}

/**
 * Calculates booking prices, applying tier discounts and add-ons.
 * Single source of truth for both client previews and server verification.
 * 
 * Rules:
 * - 1 to 3 guests: Standard Rate (0% off)
 * - 4 to 9 guests: Family Package (10% off)
 * - 10+ guests: Group and Educational Package (20% off)
 * - Discounts apply to both Day visit and Overnight rates.
 */
export function calculateBookingPrice(input: PricingInput): PricingResult {
  const guests = Math.max(1, Math.floor(input.guests || 1))
  const visitType = input.visitType === 'day' ? 'day' : 'overnight'
  const nights = visitType === 'day' ? 1 : Math.max(1, Math.floor(input.nights || 1))
  const ratePerGuestPaise = Math.max(0, Math.floor(input.ratePerGuestPaise || 0))

  let discountPct = 0
  let packageName: PricingResult['packageName'] = 'Standard Rate'

  if (guests >= 10) {
    discountPct = 20
    packageName = 'Group and Educational Package'
  } else if (guests >= 4) {
    discountPct = 10
    packageName = 'Family Package'
  }

  // Base calculation before discount
  const subtotalPaise = ratePerGuestPaise * guests * nights
  const discountPaise = Math.round((subtotalPaise * discountPct) / 100)
  const discountedBasePaise = subtotalPaise - discountPaise

  const effectiveRatePerGuestPaise =
    ratePerGuestPaise - Math.round((ratePerGuestPaise * discountPct) / 100)

  // Add-ons total
  const addOnsTotalPaise = (input.addOns || []).reduce((acc, addOn) => {
    const qty = Math.max(1, addOn.qty || 1)
    return acc + Math.max(0, addOn.pricePaise) * qty
  }, 0)

  const totalPaise = discountedBasePaise + addOnsTotalPaise

  return {
    visitType,
    guests,
    nights,
    ratePerGuestPaise,
    subtotalPaise,
    discountPct,
    discountPaise,
    discountedBasePaise,
    packageName,
    effectiveRatePerGuestPaise,
    addOnsTotalPaise,
    totalPaise,
  }
}
