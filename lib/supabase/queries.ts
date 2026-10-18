import { createClient as createBrowserClient } from './client'
import {
  FARMS,
  CROPS,
  PRODUCE_ITEMS,
  ACTIVITIES,
  type Farm,
  type CropData,
  type Produce,
  type FarmActivity,
} from '@/lib/mock-data'

export function mapDbFarmToFarm(row: any): Farm {
  const tags: string[] = Array.isArray(row.tags) ? row.tags : []
  const firstTag = tags[0]
    ? tags[0].charAt(0).toUpperCase() + tags[0].slice(1).replace('-', ' ')
    : 'Verified'

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    place: row.place,
    region: row.region || 'Maharashtra',
    type: row.type || 'Farm stay',
    pricePaise: row.price_paise,
    rating: row.rating_avg && Number(row.rating_avg) > 0 ? Number(row.rating_avg).toFixed(1) : '4.8',
    reviews: row.review_count ?? 0,
    image:
      row.image_url ||
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=85',
    tag: firstTag,
    description: row.description || '',
    amenities: tags.length > 0 ? tags.map((t) => t.replace('-', ' ')) : ['Organic meals', 'Farm tour'],
    sleeps: row.max_guests || 4,
    maxGuests: row.max_guests || 4,
    verified: row.verified !== undefined && row.verified !== null ? Boolean(row.verified) : true,
    organicPct: row.organic_pct !== null && row.organic_pct !== undefined ? Number(row.organic_pct) : 85,
    hostName: row.host_name || 'Rajesh Patil',
    hostPhone: row.host_phone || '+919800000002',
  }
}

export function mapDbProductToProduce(row: any): Produce {
  return {
    id: row.id,
    name: row.name,
    detail: row.detail ? `${row.unit} · ${row.detail}` : row.unit,
    pricePaise: row.price_paise,
    image:
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=85',
  }
}

export async function fetchBrowserFarmsWithCrops(): Promise<{
  farms: Farm[]
  crops: CropData[]
  farmCropsMap: Record<string, string[]>
  activities: FarmActivity[]
}> {
  try {
    const supabase = createBrowserClient()
    const [farmsRes, cropsRes, farmCropsRes, activitiesRes] = await Promise.all([
      supabase.from('farms').select('*').order('rating_avg', { ascending: false }),
      supabase.from('crops').select('*'),
      supabase.from('farm_crops').select('farm_id, crop_id'),
      supabase.from('activities').select('*'),
    ])

    if (farmsRes.error || !farmsRes.data || farmsRes.data.length === 0) {
      const farmCropsMap: Record<string, string[]> = {}
      CROPS.forEach((crop) => {
        crop.linkedFarmSlugs.forEach((slug) => {
          farmCropsMap[slug] = farmCropsMap[slug] || []
          farmCropsMap[slug].push(crop.id)
        })
      })
      return { farms: FARMS, crops: CROPS, farmCropsMap, activities: ACTIVITIES }
    }

    const farms = farmsRes.data.map(mapDbFarmToFarm)
    const farmIdToSlug: Record<string, string> = {}
    farmsRes.data.forEach((f: any) => {
      farmIdToSlug[f.id] = f.slug
    })

    const crops: CropData[] = (cropsRes.data || []).map((c: any) => {
      const linkedSlugs: string[] = []
      if (farmCropsRes.data) {
        farmCropsRes.data.forEach((fc: any) => {
          if (fc.crop_id === c.id && farmIdToSlug[fc.farm_id]) {
            linkedSlugs.push(farmIdToSlug[fc.farm_id])
          }
        })
      }
      return {
        id: c.id,
        name: c.name,
        place: c.place,
        region: c.region,
        harvestMonths: c.kind === 'harvest' ? c.months : [],
        sowingMonths: c.kind === 'sowing' ? c.months : [],
        linkedFarmSlugs: linkedSlugs,
      }
    })

    const farmCropsMap: Record<string, string[]> = {}
    if (farmCropsRes.data) {
      farmCropsRes.data.forEach((fc: any) => {
        const slug = farmIdToSlug[fc.farm_id]
        if (slug) {
          farmCropsMap[slug] = farmCropsMap[slug] || []
          farmCropsMap[slug].push(fc.crop_id)
        }
      })
    }

    const activities: FarmActivity[] =
      activitiesRes.data && activitiesRes.data.length > 0
        ? activitiesRes.data.map((a: any) => ({
            id: a.id,
            farmSlug: farmIdToSlug[a.farm_id] || '',
            farmId: a.farm_id,
            name: a.name,
            kind: a.kind,
            bestMonths: Array.isArray(a.best_months) ? a.best_months : [],
          }))
        : ACTIVITIES

    return {
      farms,
      crops: crops.length > 0 ? crops : CROPS,
      farmCropsMap,
      activities,
    }
  } catch {
    const farmCropsMap: Record<string, string[]> = {}
    CROPS.forEach((crop) => {
      crop.linkedFarmSlugs.forEach((slug) => {
        farmCropsMap[slug] = farmCropsMap[slug] || []
        farmCropsMap[slug].push(crop.id)
      })
    })
    return { farms: FARMS, crops: CROPS, farmCropsMap, activities: ACTIVITIES }
  }
}

