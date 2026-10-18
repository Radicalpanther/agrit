/**
 * Eco and community impact estimation for AgriTrails stays.
 * Calculates estimated kg CO2e saved vs. an average urban hotel stay,
 * along with organic farmland ratio and direct local economic support.
 */

// Named constant: estimated kg CO2e saved per guest-night vs average urban hotel stay
// (Baseline: ~14.5 kg CO2e/guest-night from central HVAC, power grid, daily high-temp commercial laundry)
export const KG_CO2_SAVED_PER_GUEST_NIGHT = 14.5

// Named constant: estimated kg CO2e saved per guest for a day visit vs conventional day tour
export const KG_CO2_SAVED_PER_DAY_GUEST = 4.2

export interface EcoImpactInput {
  guests: number
  nights?: number
  visitType?: 'day' | 'overnight'
  organicPct?: number
}

export interface EcoImpactResult {
  co2SavedKg: number
  organicPct: number
  supportsLocalEconomy: string
  assumptionFootnote: string
  baselineDescription: string
}

/**
 * Pure calculation function that estimates kg CO2 saved versus an average urban hotel stay
 * (nights x guests x KG_CO2_SAVED_PER_GUEST_NIGHT), plus organic_pct and local economy support line.
 */
export function calculateEcoImpact({
  guests,
  nights = 1,
  visitType = 'overnight',
  organicPct = 85,
}: EcoImpactInput): EcoImpactResult {
  const g = Math.max(1, Number(guests) || 1)
  const n = Math.max(1, Number(nights) || 1)
  const isDayVisit = visitType === 'day'

  const co2SavedKg = isDayVisit
    ? Math.round(g * KG_CO2_SAVED_PER_DAY_GUEST * 10) / 10
    : Math.round(n * g * KG_CO2_SAVED_PER_GUEST_NIGHT * 10) / 10

  const safeOrganicPct = Math.min(100, Math.max(0, Number(organicPct) || 85))

  return {
    co2SavedKg,
    organicPct: safeOrganicPct,
    supportsLocalEconomy: '100% direct host income · zero intermediary leakage',
    assumptionFootnote: `Assumptions: estimate based on ${KG_CO2_SAVED_PER_GUEST_NIGHT} kg CO2e saved per guest-night against conventional urban hotels (accounting for natural ventilation, local solar/clean energy, and farm-harvested dining). Figures are indicative estimates.`,
    baselineDescription: isDayVisit
      ? `${g} guest${g > 1 ? 's' : ''} day visit`
      : `${g} guest${g > 1 ? 's' : ''} × ${n} night${n > 1 ? 's' : ''}`,
  }
}

// Named aliases for compatibility
export const estimateEcoImpact = calculateEcoImpact
export const calculateEcoScore = calculateEcoImpact
