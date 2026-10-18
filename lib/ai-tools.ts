import { createServiceClient } from '@/lib/supabase/server'

export interface SearchFarmsParams {
  budget_max_paise?: number
  region?: string
  month?: number
  experience?: string
  guests?: number
}

export interface GetFarmDetailsParams {
  slug: string
}

export interface GetSeasonalCropsParams {
  month?: number
  region?: string
}

/**
 * Tool 1: searchFarms
 * Queries database farms matching budget, region, month, experience, and guest count.
 */
export async function searchFarms(params: SearchFarmsParams = {}) {
  try {
    const serviceClient = await createServiceClient()

    const { data: farms, error } = await serviceClient
      .from('farms')
      .select(`
        id,
        slug,
        name,
        place,
        region,
        price_paise,
        day_visit_price_paise,
        allows_day_visit,
        rating_avg,
        review_count,
        tags,
        description,
        max_guests,
        farm_crops (
          crop:crops (*)
        ),
        activities (*)
      `)
      .order('rating_avg', { ascending: false })

    if (error || !farms) {
      console.error('[AI Tool searchFarms] Error:', error)
      return { farms: [], count: 0 }
    }

    let filtered = farms

    // Budget max filter (comparing paise)
    if (params.budget_max_paise && params.budget_max_paise > 0) {
      const maxPaise = params.budget_max_paise
      filtered = filtered.filter(
        (f) =>
          f.price_paise <= maxPaise ||
          (f.allows_day_visit && f.day_visit_price_paise && f.day_visit_price_paise <= maxPaise),
      )
    }

    // Region filter
    if (params.region) {
      const qRegion = params.region.trim().toLowerCase()
      filtered = filtered.filter(
        (f) =>
          f.region?.toLowerCase().includes(qRegion) ||
          f.place?.toLowerCase().includes(qRegion),
      )
    }

    // Guests filter
    if (params.guests && params.guests > 0) {
      filtered = filtered.filter((f) => (f.max_guests || 4) >= params.guests!)
    }

    // Month filter (0-11)
    if (params.month !== undefined && params.month >= 0 && params.month <= 11) {
      const m = Number(params.month)
      filtered = filtered.filter((f) => {
        const hasCrop = (f.farm_crops || []).some((fc: any) =>
          Array.isArray(fc.crop?.months) && fc.crop.months.includes(m),
        )
        const hasActivity = (f.activities || []).some(
          (act: any) =>
            !act.best_months || act.best_months.length === 0 || act.best_months.includes(m),
        )
        return hasCrop || hasActivity
      })
    }

    // Experience filter (tags or activity kinds)
    if (params.experience) {
      const qExp = params.experience.trim().toLowerCase()
      filtered = filtered.filter((f) => {
        const hasTag = (f.tags || []).some((t: string) => t.toLowerCase().includes(qExp))
        const hasActKind = (f.activities || []).some(
          (act: any) =>
            act.kind?.toLowerCase().includes(qExp) || act.name?.toLowerCase().includes(qExp),
        )
        const inDesc = f.description?.toLowerCase().includes(qExp)
        return hasTag || hasActKind || inDesc
      })
    }

    const results = filtered.slice(0, 5).map((f) => ({
      slug: f.slug,
      name: f.name,
      place: f.place,
      region: f.region,
      overnight_price_inr: Math.round(f.price_paise / 100),
      day_visit_price_inr: f.day_visit_price_paise ? Math.round(f.day_visit_price_paise / 100) : null,
      allows_day_visit: f.allows_day_visit,
      max_guests: f.max_guests,
      rating_avg: f.rating_avg ? Number(f.rating_avg.toFixed(2)) : null,
      review_count: f.review_count,
      tags: f.tags || [],
      summary: f.description?.substring(0, 140) || '',
      url: `/farms/${f.slug}`,
    }))

    return {
      farms: results,
      total_matches: results.length,
    }
  } catch (err: any) {
    console.error('[AI Tool searchFarms] Exception:', err)
    return { error: err.message, farms: [] }
  }
}

/**
 * Tool 2: getFarmDetails
 * Returns amenities, rules, check-in info, and rating breakdown for a specific farm.
 */
export async function getFarmDetails({ slug }: GetFarmDetailsParams) {
  try {
    const serviceClient = await createServiceClient()

    const { data: farm, error } = await serviceClient
      .from('farms')
      .select(`
        *,
        activities (*),
        products (*),
        reviews (*),
        farm_crops (
          crop:crops (*)
        )
      `)
      .eq('slug', slug)
      .maybeSingle()

    if (error || !farm) {
      return { error: `Farm with slug "${slug}" not found in database.` }
    }

    // Compute review breakdown
    const reviews = farm.reviews || []
    let ratingBreakdown = {
      overall_avg: farm.rating_avg || 4.7,
      review_count: farm.review_count || reviews.length,
      food_authenticity: 4.8,
      cleanliness: 4.7,
      hospitality: 4.9,
      location: 4.6,
    }

    if (reviews.length > 0) {
      const sumFood = reviews.reduce((acc: number, r: any) => acc + (r.rating_food || 5), 0)
      const sumClean = reviews.reduce((acc: number, r: any) => acc + (r.rating_cleanliness || 5), 0)
      const sumHosp = reviews.reduce((acc: number, r: any) => acc + (r.rating_hospitality || 5), 0)
      const sumLoc = reviews.reduce((acc: number, r: any) => acc + (r.rating_location || 5), 0)
      const count = reviews.length

      ratingBreakdown = {
        overall_avg: Number((farm.rating_avg || 4.7).toFixed(2)),
        review_count: count,
        food_authenticity: Number((sumFood / count).toFixed(1)),
        cleanliness: Number((sumClean / count).toFixed(1)),
        hospitality: Number((sumHosp / count).toFixed(1)),
        location: Number((sumLoc / count).toFixed(1)),
      }
    }

    return {
      slug: farm.slug,
      name: farm.name,
      place: farm.place,
      region: farm.region,
      overnight_price_inr: Math.round(farm.price_paise / 100),
      day_visit_price_inr: farm.day_visit_price_paise
        ? Math.round(farm.day_visit_price_paise / 100)
        : null,
      max_guests: farm.max_guests,
      amenities: [
        'Organic traditional home-cooked meals included',
        `Accommodates up to ${farm.max_guests} guests`,
        'Flexible farm check-in',
        farm.organic_pct ? `${farm.organic_pct}% certified organic produce` : 'Natural farming',
        farm.allows_day_visit ? 'Day visits welcome' : 'Overnight stays only',
      ],
      check_in_info: {
        overnight_check_in: '12:00 PM check-in, 10:00 AM checkout',
        day_visit_hours: farm.allows_day_visit
          ? `${farm.day_visit_start || '09:00'} to ${farm.day_visit_end || '17:00'}`
          : 'Not available',
        host_name: farm.host_name || 'Farm Host',
        landmark_note: farm.landmark_note || 'Follow village signboards to the entrance gate',
        directions_steps: farm.directions_steps || [],
      },
      farm_rules: [
        'Respect quiet hours after 10:00 PM for rural community harmony.',
        'No synthetic fertilizers, plastics, or non-biodegradable waste left in the fields.',
        'Supervised farm activity participation during morning and evening chores.',
        'Free cancellation up to 48 hours prior to scheduled arrival.',
      ],
      rating_breakdown: ratingBreakdown,
      activities: (farm.activities || []).map((a: any) => ({
        name: a.name,
        kind: a.kind,
        duration_min: a.duration_min,
      })),
      products: (farm.products || []).map((p: any) => ({
        name: p.name,
        unit: p.unit,
        price_inr: Math.round(p.price_paise / 100),
        in_stock: p.stock > 0,
      })),
      url: `/farms/${farm.slug}`,
    }
  } catch (err: any) {
    console.error('[AI Tool getFarmDetails] Exception:', err)
    return { error: err.message }
  }
}

/**
 * Tool 3: getSeasonalCrops
 * Queries crops table for active harvests or sowings for a given month and region.
 */
export async function getSeasonalCrops({ month, region }: GetSeasonalCropsParams = {}) {
  try {
    const serviceClient = await createServiceClient()
    const targetMonth = month !== undefined ? Number(month) : new Date().getMonth()

    let query = serviceClient
      .from('crops')
      .select('*')
      .contains('months', [targetMonth])

    if (region) {
      query = query.ilike('region', `%${region.trim()}%`)
    }

    const { data: crops, error } = await query

    if (error || !crops) {
      console.error('[AI Tool getSeasonalCrops] Error:', error)
      return { crops: [], month: targetMonth }
    }

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]

    return {
      month_name: monthNames[targetMonth],
      month_index: targetMonth,
      region_filter: region || 'All regions',
      active_crops: crops.map((c) => ({
        name: c.name,
        place: c.place,
        region: c.region,
        kind: c.kind, // 'harvest' or 'sowing'
        months: c.months,
      })),
    }
  } catch (err: any) {
    console.error('[AI Tool getSeasonalCrops] Exception:', err)
    return { error: err.message, active_crops: [] }
  }
}
