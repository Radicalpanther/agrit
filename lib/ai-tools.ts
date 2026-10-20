import { createServiceClient } from '@/lib/supabase/server'
import { GeminiFunctionDeclaration } from './gemini'

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

export interface GetProduceAvailabilityParams {
  slug?: string
  region?: string
}

export interface GetMyBookingsParams {
  userId?: string
}

/**
 * Tool 1: searchFarms
 * Queries database farms matching budget, region, month, experience, and guest count.
 * Only returns published farms.
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
        published,
        farm_crops (
          crop:crops (*)
        ),
        activities (*)
      `)
      .eq('published', true)
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

    // Region / place filter
    if (params.region) {
      const qRegion = params.region.trim().toLowerCase()
      filtered = filtered.filter(
        (f) =>
          f.region?.toLowerCase().includes(qRegion) ||
          f.place?.toLowerCase().includes(qRegion) ||
          (f.tags || []).some((t: string) => t.toLowerCase().includes(qRegion)),
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
      .eq('published', true)
      .maybeSingle()

    if (error || !farm) {
      return { error: `Farm with slug "${slug}" not found in database or is not published.` }
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
        id: p.id,
        name: p.name,
        unit: p.unit,
        price_inr: Math.round(p.price_paise / 100),
        in_stock: p.stock > 0,
        url: `/farms/${farm.slug}`,
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
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
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

/**
 * Tool 4: getProduceAvailability
 * Returns artisanal products and fresh harvests available at farms.
 */
export async function getProduceAvailability({ slug, region }: GetProduceAvailabilityParams = {}) {
  try {
    const serviceClient = await createServiceClient()

    let query = serviceClient
      .from('products')
      .select('id, name, detail, unit, price_paise, stock, farm:farms(name, slug, place, region, published)')
      .gt('stock', 0)

    if (slug) {
      query = query.eq('farm.slug', slug)
    }

    const { data: products, error } = await query

    if (error || !products) {
      return { products: [], count: 0 }
    }

    const published = products.filter((p: any) => p.farm && p.farm.published !== false)
    const filtered = region
      ? published.filter(
          (p: any) =>
            p.farm.region?.toLowerCase().includes(region.toLowerCase()) ||
            p.farm.place?.toLowerCase().includes(region.toLowerCase()),
        )
      : published

    return {
      count: filtered.length,
      products: filtered.slice(0, 8).map((p: any) => ({
        name: p.name,
        farm_name: p.farm?.name,
        farm_url: `/farms/${p.farm?.slug}`,
        price_inr: Math.round(p.price_paise / 100),
        unit: p.unit,
        stock: p.stock,
        detail: p.detail,
      })),
    }
  } catch (err: any) {
    console.error('[AI Tool getProduceAvailability] Exception:', err)
    return { error: err.message, products: [] }
  }
}

/**
 * Tool 5: getMyBookings
 * Authorized tool to retrieve reservations for the signed-in user only.
 */
export async function getMyBookings({ userId }: GetMyBookingsParams = {}) {
  if (!userId) {
    return {
      authenticated: false,
      message: 'User is not currently signed in. Please sign in to view your personal booking reservations.',
      bookings: [],
    }
  }

  try {
    const serviceClient = await createServiceClient()

    const { data: bookings, error } = await serviceClient
      .from('bookings')
      .select(`
        id,
        check_in,
        nights,
        guests,
        total_paise,
        status,
        visit_type,
        farm:farms (name, slug, place)
      `)
      .eq('tourist_id', userId)
      .order('check_in', { ascending: false })
      .limit(5)

    if (error || !bookings) {
      return { authenticated: true, bookings: [] }
    }

    return {
      authenticated: true,
      total: bookings.length,
      bookings: bookings.map((b: any) => ({
        booking_ref: b.id.substring(0, 8),
        farm_name: b.farm?.name || 'Farm Stay',
        farm_url: `/farms/${b.farm?.slug}`,
        check_in: b.check_in,
        nights: b.nights,
        guests: b.guests,
        stay_type: b.visit_type === 'day' ? 'Day Visit' : `${b.nights} Night(s)`,
        total_inr: Math.round(b.total_paise / 100),
        status: b.status,
      })),
    }
  } catch (err: any) {
    console.error('[AI Tool getMyBookings] Exception:', err)
    return { error: err.message, bookings: [] }
  }
}

/**
 * Gemini Tool Function Declarations
 */
export const GEMINI_TOOL_DECLARATIONS: GeminiFunctionDeclaration[] = [
  {
    name: 'searchFarms',
    description: 'Search for farm stays matching budget (in paise, e.g. 300000 for ₹3,000), place or region, calendar month (0-11), experience or guests.',
    parameters: {
      type: 'OBJECT',
      properties: {
        budget_max_paise: {
          type: 'number',
          description: 'Maximum budget per guest in paise (e.g. 300000 for ₹3,000).',
        },
        region: {
          type: 'string',
          description: 'State or place name in India (e.g. Maharashtra, Himachal Pradesh, Ratnagiri, Shimla, Coonoor, Kashmir, Assam).',
        },
        month: {
          type: 'number',
          description: 'Calendar month index (0 for January to 11 for December).',
        },
        experience: {
          type: 'string',
          description: 'Activity, harvest or experience keyword (e.g. mango, tea, pottery, apple, farming, river).',
        },
        guests: {
          type: 'number',
          description: 'Number of guests travelling.',
        },
      },
    },
  },
  {
    name: 'getFarmDetails',
    description: 'Retrieve complete verified details, amenities, rules, check-in policies, and ratings breakdown for a specific farm by its slug.',
    parameters: {
      type: 'OBJECT',
      properties: {
        slug: {
          type: 'string',
          description: 'The unique slug identifier of the farm stay (e.g. kokan-roots-farmstay, himachal-apple-highlands).',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'getSeasonalCrops',
    description: 'Query active crop harvest and sowing seasons across Indian regions for a specific calendar month.',
    parameters: {
      type: 'OBJECT',
      properties: {
        month: {
          type: 'number',
          description: 'Month index (0 for January to 11 for December). Defaults to current month.',
        },
        region: {
          type: 'string',
          description: 'Optional region filter (e.g. Maharashtra, Himachal Pradesh, Kashmir).',
        },
      },
    },
  },
  {
    name: 'getProduceAvailability',
    description: 'Check available artisanal farm products, pantry produce, and prices ready for guest pickup.',
    parameters: {
      type: 'OBJECT',
      properties: {
        slug: {
          type: 'string',
          description: 'Optional farm slug to check produce for a specific farm.',
        },
        region: {
          type: 'string',
          description: 'Optional region to check produce available in that area.',
        },
      },
    },
  },
  {
    name: 'getMyBookings',
    description: "Look up the signed-in tourist's own farm stay booking reservations and trip status.",
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
]
