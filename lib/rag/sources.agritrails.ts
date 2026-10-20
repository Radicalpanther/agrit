import { RagSourceConfig, RagSourceDefinition, RetrievedPassage } from './types'

// Cache for compact catalogue by locale
const compactCatalogueCache = new Map<string, { catalogue: string; cachedAt: number }>()
const CATALOGUE_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Invalidates compact catalogue cache when listings change.
 */
export function invalidateCatalogueCache(): void {
  compactCatalogueCache.clear()
}

/**
 * Splits long text into ~200-300 word chunks with small overlap,
 * prefixing each chunk with entity header context.
 */
function chunkLongText(
  headerPrefix: string,
  text: string,
  maxWords: number = 250,
  overlap: number = 30,
): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  if (words.length <= maxWords) {
    return [`${headerPrefix}: ${text.trim()}`]
  }

  const chunks: string[] = []
  let start = 0
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length)
    const slice = words.slice(start, end).join(' ')
    chunks.push(`${headerPrefix}: ${slice}`)
    if (end >= words.length) break
    start += maxWords - overlap
  }

  return chunks
}

/**
 * Source 1: Farms
 */
const farmsSource: RagSourceDefinition = {
  name: 'farms',
  table: 'farms',
  fetchRows: async (supabase) => {
    const { data, error } = await supabase
      .from('farms')
      .select(`
        *,
        activities (*),
        products (*),
        farm_crops (
          crop:crops (*)
        )
      `)
      .eq('published', true)
      .order('rating_avg', { ascending: false })

    if (error) {
      console.error('[sources.agritrails] Error fetching farms:', error.message)
      return []
    }
    return data || []
  },
  fetchSingle: async (supabase, entityId) => {
    const { data } = await supabase
      .from('farms')
      .select(`
        *,
        activities (*),
        products (*),
        farm_crops (
          crop:crops (*)
        )
      `)
      .eq('id', entityId)
      .maybeSingle()
    return data
  },
  buildChunks: async (farm, locale) => {
    const chunks = []
    const priceInr = Math.round((farm.price_paise || 250000) / 100)
    const dayPriceInr = farm.day_visit_price_paise ? Math.round(farm.day_visit_price_paise / 100) : null
    const activitiesList = (farm.activities || []).map((a: any) => a.name).join(', ')
    const cropsList = (farm.farm_crops || []).map((fc: any) => fc.crop?.name).filter(Boolean).join(', ')

    const header = `[Farm Stay] ${farm.name} located in ${farm.place}, ${farm.region}`

    // Base overview chunk
    const overviewContent = [
      `${header}.`,
      `Overnight stay price: ₹${priceInr.toLocaleString('en-IN')} per guest.`,
      farm.allows_day_visit && dayPriceInr
        ? `Day visit allowed at ₹${dayPriceInr.toLocaleString('en-IN')} per guest (${farm.day_visit_start || '09:00'} to ${farm.day_visit_end || '17:00'}).`
        : 'Overnight stay only (no day visits).',
      `Accommodates up to ${farm.max_guests || 4} guests.`,
      farm.verified ? 'Verified authentic farm stay.' : '',
      farm.organic_pct ? `${farm.organic_pct}% certified organic farming.` : 'Natural chemical-free farming.',
      farm.rating_avg ? `Guest rating: ${farm.rating_avg} / 5 stars (${farm.review_count || 0} reviews).` : '',
      farm.description ? `Description: ${farm.description}` : '',
      activitiesList ? `Available activities: ${activitiesList}.` : '',
      cropsList ? `Active crops & harvests: ${cropsList}.` : '',
      farm.landmark_note ? `Landmark note: ${farm.landmark_note}.` : '',
      farm.host_name ? `Host: ${farm.host_name}.` : '',
      `Link: /farms/${farm.slug}`,
    ]
      .filter(Boolean)
      .join(' ')

    chunks.push({
      entity_type: 'farm',
      entity_id: String(farm.id),
      slug: farm.slug,
      locale,
      chunk_index: 0,
      content: overviewContent,
      metadata: {
        slug: farm.slug,
        name: farm.name,
        place: farm.place,
        region: farm.region,
        state: farm.region,
        price_inr: priceInr,
        day_price_inr: dayPriceInr,
        max_guests: farm.max_guests,
        rating: farm.rating_avg,
        allows_day_visit: farm.allows_day_visit,
        entity_type: 'farm',
      },
    })

    // Directions & Landmarks chunk if available
    const directionsText = Array.isArray(farm.directions_steps) ? farm.directions_steps.join('. ') : ''
    if (directionsText || farm.landmark_note) {
      const directionsContent = [
        `${header} - Travel Directions & Arrival:`,
        farm.landmark_note ? `Main landmark: ${farm.landmark_note}.` : '',
        directionsText ? `Directions: ${directionsText}.` : '',
        `Link: /farms/${farm.slug}`,
      ]
        .filter(Boolean)
        .join(' ')

      chunks.push({
        entity_type: 'farm_directions',
        entity_id: String(farm.id),
        slug: farm.slug,
        locale,
        chunk_index: 1,
        content: directionsContent,
        metadata: {
          slug: farm.slug,
          name: farm.name,
          place: farm.place,
          region: farm.region,
          entity_type: 'farm_directions',
        },
      })
    }

    return chunks
  },
}

/**
 * Source 2: Activities
 */
const activitiesSource: RagSourceDefinition = {
  name: 'activities',
  table: 'activities',
  fetchRows: async (supabase) => {
    const { data } = await supabase
      .from('activities')
      .select('*, farm:farms (id, name, slug, place, region, published)')

    return (data || []).filter((a: any) => a.farm && a.farm.published !== false)
  },
  buildChunks: async (act, locale) => {
    const farm = act.farm || {}
    const months = Array.isArray(act.best_months) && act.best_months.length > 0
      ? `Best months: ${act.best_months.join(', ')}`
      : 'Available throughout the year'

    const content = `[Farm Activity] ${act.name} at ${farm.name} in ${farm.place}, ${farm.region}. Category: ${act.kind}. Duration: ${act.duration_min} minutes. ${months}. Timing: ${act.sort_hint || 'flexible'}. Experience hands-on rural agriculture and authentic village lifestyle at ${farm.name}. Link: /farms/${farm.slug}`

    return [
      {
        entity_type: 'activity',
        entity_id: String(act.id),
        slug: farm.slug,
        locale,
        chunk_index: 0,
        content,
        metadata: {
          activity_name: act.name,
          kind: act.kind,
          slug: farm.slug,
          farm_name: farm.name,
          place: farm.place,
          region: farm.region,
          duration_min: act.duration_min,
          entity_type: 'activity',
        },
      },
    ]
  },
}

/**
 * Source 3: Products (Farm Pantry & Produce)
 */
const productsSource: RagSourceDefinition = {
  name: 'products',
  table: 'products',
  fetchRows: async (supabase) => {
    const { data } = await supabase
      .from('products')
      .select('*, farm:farms (id, name, slug, place, region, published)')

    return (data || []).filter((p: any) => p.farm && p.farm.published !== false)
  },
  buildChunks: async (prod, locale) => {
    const farm = prod.farm || {}
    const priceInr = Math.round((prod.price_paise || 0) / 100)
    const stockStatus = prod.stock > 0 ? `In stock (${prod.stock} ${prod.unit} available)` : 'Currently out of stock'

    const content = `[Artisanal Produce & Pantry] ${prod.name} from ${farm.name} in ${farm.place}, ${farm.region}. Price: ₹${priceInr} per ${prod.unit}. ${stockStatus}. Details: ${prod.detail || 'Farm fresh harvest ready for pickup during stay.'} Link: /farms/${farm.slug}`

    return [
      {
        entity_type: 'product',
        entity_id: String(prod.id),
        slug: farm.slug,
        locale,
        chunk_index: 0,
        content,
        metadata: {
          product_name: prod.name,
          price_inr: priceInr,
          unit: prod.unit,
          in_stock: prod.stock > 0,
          slug: farm.slug,
          farm_name: farm.name,
          place: farm.place,
          region: farm.region,
          entity_type: 'product',
        },
      },
    ]
  },
}

/**
 * Source 4: Crops (Regional & Seasonal Crops)
 */
const cropsSource: RagSourceDefinition = {
  name: 'crops',
  table: 'crops',
  fetchRows: async (supabase) => {
    const { data } = await supabase.from('crops').select('*')
    return data || []
  },
  buildChunks: async (crop, locale) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]
    const monthsText = Array.isArray(crop.months)
      ? crop.months.map((m: number) => monthNames[m]).filter(Boolean).join(', ')
      : 'Year-round'

    const content = `[Seasonal Agricultural Crop] ${crop.name} in ${crop.place}, ${crop.region}. Season type: ${crop.kind || 'harvest'}. Active harvest/sowing calendar months: ${monthsText}. Tourists visiting during these months can observe or participate in farm harvest routines.`

    return [
      {
        entity_type: 'crop',
        entity_id: String(crop.id),
        locale,
        chunk_index: 0,
        content,
        metadata: {
          crop_name: crop.name,
          place: crop.place,
          region: crop.region,
          kind: crop.kind,
          months: crop.months,
          entity_type: 'crop',
        },
      },
    ]
  },
}

/**
 * Source 5: Reviews (Verified Guest Experiences)
 */
const reviewsSource: RagSourceDefinition = {
  name: 'reviews',
  table: 'reviews',
  fetchRows: async (supabase) => {
    const { data } = await supabase
      .from('reviews')
      .select('*, farm:farms (id, name, slug, place, region, published)')
      .order('created_at', { ascending: false })
      .limit(60)

    return (data || []).filter((r: any) => r.farm && r.farm.published !== false && r.comment)
  },
  buildChunks: async (rev, locale) => {
    const farm = rev.farm || {}
    const avgScore = Number(
      ((rev.rating_food + rev.rating_cleanliness + rev.rating_hospitality + rev.rating_location) / 4).toFixed(1),
    )

    const prefix = `[Guest Review] For ${farm.name} in ${farm.place}, ${farm.region} (Rating: ${avgScore}/5 stars - Food: ${rev.rating_food}/5, Cleanliness: ${rev.rating_cleanliness}/5, Hospitality: ${rev.rating_hospitality}/5, Location: ${rev.rating_location}/5)`

    const subchunks = chunkLongText(prefix, rev.comment, 200, 25)

    return subchunks.map((content, idx) => ({
      entity_type: 'review',
      entity_id: String(rev.id),
      slug: farm.slug,
      locale,
      chunk_index: idx,
      content: `${content} Link: /farms/${farm.slug}`,
      metadata: {
        slug: farm.slug,
        farm_name: farm.name,
        place: farm.place,
        region: farm.region,
        rating: avgScore,
        entity_type: 'review',
      },
    }))
  },
}

/**
 * AgriTrails RAG Source Configuration
 */
export const agritrailsSourceConfig: RagSourceConfig = {
  sourceName: 'agritrails',
  locales: ['en', 'hi', 'mr'],
  sources: [farmsSource, activitiesSource, productsSource, cropsSource, reviewsSource],

  /**
   * Generates compact catalogue of all published farms.
   * Cached and invalidated on listing updates.
   */
  getCompactCatalogue: async (supabase, locale) => {
    const cached = compactCatalogueCache.get(locale)
    const now = Date.now()
    if (cached && now - cached.cachedAt < CATALOGUE_TTL_MS) {
      return cached.catalogue
    }

    try {
      const { data: farms } = await supabase
        .from('farms')
        .select(`
          name,
          slug,
          place,
          region,
          price_paise,
          day_visit_price_paise,
          allows_day_visit,
          max_guests,
          rating_avg,
          review_count,
          tags,
          activities (name)
        `)
        .eq('published', true)
        .order('rating_avg', { ascending: false })

      if (!farms || farms.length === 0) {
        return ''
      }

      const lines = farms.map((f: any) => {
        const overnightInr = Math.round((f.price_paise || 0) / 100)
        const dayInr = f.allows_day_visit && f.day_visit_price_paise ? Math.round(f.day_visit_price_paise / 100) : null
        const stayTypes = f.allows_day_visit ? `Overnight (₹${overnightInr}) or Day visit (₹${dayInr})` : `Overnight only (₹${overnightInr})`
        const topActs = (f.activities || []).slice(0, 3).map((a: any) => a.name).join(', ')

        return `- [${f.name}](/farms/${f.slug}): ${f.place}, ${f.region} | Price: ${stayTypes} | Max guests: ${f.max_guests || 4} | Rating: ${f.rating_avg || 4.5} (${f.review_count || 0} reviews) | Activities: ${topActs || 'Farming'}`
      })

      const catalogue = `PUBLISHED FARM CATALOGUE (${lines.length} stays available):\n${lines.join('\n')}`
      compactCatalogueCache.set(locale, { catalogue, cachedAt: now })
      return catalogue
    } catch {
      return ''
    }
  },

  /**
   * Direct database fallback via ILIKE if vector and keyword search return empty.
   */
  getDirectFallbackResults: async (supabase, query, locale) => {
    const clean = query.trim().replace(/[^\w\s\u0900-\u097F]/g, ' ')
    const words = clean.split(/\s+/).filter((w) => w.length > 2).slice(0, 4)

    const passages: RetrievedPassage[] = []

    try {
      let builder = supabase
        .from('farms')
        .select('id, name, slug, place, region, price_paise, description, rating_avg, max_guests')
        .eq('published', true)

      if (words.length > 0) {
        const orClause = words.map((w) => `name.ilike.%${w}%,place.ilike.%${w}%,region.ilike.%${w}%,description.ilike.%${w}%`).join(',')
        builder = builder.or(orClause)
      }

      const { data: farms } = await builder.limit(6)
      if (farms && farms.length > 0) {
        farms.forEach((f: any, idx: number) => {
          const priceInr = Math.round((f.price_paise || 0) / 100)
          passages.push({
            id: `fallback:farm:${f.id}`,
            source: 'agritrails',
            entity_type: 'farm',
            entity_id: String(f.id),
            slug: f.slug,
            locale,
            content: `[Farm Stay] ${f.name} in ${f.place}, ${f.region}. Overnight stay: ₹${priceInr}/guest. Max guests: ${f.max_guests}. Rating: ${f.rating_avg}/5. ${f.description || ''} Link: /farms/${f.slug}`,
            metadata: {
              slug: f.slug,
              name: f.name,
              place: f.place,
              region: f.region,
              price_inr: priceInr,
            },
            score: 0.5 - idx * 0.05,
          })
        })
      }
    } catch (e) {
      console.warn('[sources.agritrails direct fallback error]:', e)
    }

    return passages
  },
}
