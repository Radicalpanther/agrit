import { createClient as createServerClient } from './server'
import {
  FARMS,
  PRODUCE_ITEMS,
  getFallbackReviews,
  type Farm,
  type Produce,
} from '@/lib/mock-data'
import { mapDbFarmToFarm, mapDbProductToProduce } from './queries'

export async function fetchServerFarms(): Promise<Farm[]> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .order('rating_avg', { ascending: false })

    if (error || !data || data.length === 0) {
      return FARMS
    }
    return data.map(mapDbFarmToFarm)
  } catch {
    return FARMS
  }
}

export async function fetchServerFarmBySlug(slug: string): Promise<any | null> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('farms')
      .select(`
        *,
        activities (*),
        products (*),
        reviews (
          *,
          review_photos (*),
          profiles (full_name)
        ),
        farm_crops (
          crop:crops (*)
        )
      `)
      .eq('slug', slug)
      .maybeSingle()

    if (error || !data) {
      const fallback = FARMS.find((f) => f.slug === slug)
      const fallbackList = getFallbackReviews(slug)
      return fallback
        ? {
            ...fallback,
            activities: [],
            products: getFallbackProductsForFarm(slug, fallback.id),
            reviews: fallback.reviews || fallbackList.length,
            reviewCount: fallback.reviews || fallbackList.length,
            reviewList: fallbackList,
          }
        : null
    }

    const rawReviews: any[] = data.reviews || []
    const sortedReviews = rawReviews.slice().sort((a: any, b: any) => {
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0
      return tB - tA
    })

    const reviewItems = sortedReviews.length > 0 ? sortedReviews : getFallbackReviews(slug)
    const reviewCountNum = typeof data.review_count === 'number'
      ? data.review_count
      : reviewItems.length

    const farmProducts =
      data.products && data.products.length > 0
        ? data.products
        : getFallbackProductsForFarm(slug, data.id)

    return {
      ...mapDbFarmToFarm(data),
      raw: data,
      activities: data.activities || [],
      products: farmProducts,
      reviews: reviewCountNum,
      reviewCount: reviewCountNum,
      reviewList: reviewItems,
      crops: data.farm_crops ? data.farm_crops.map((fc: any) => fc.crop).filter(Boolean) : [],
    }
  } catch {
    const fallback = FARMS.find((f) => f.slug === slug)
    const fallbackList = getFallbackReviews(slug)
    return fallback
      ? {
          ...fallback,
          activities: [],
          products: getFallbackProductsForFarm(slug, fallback.id),
          reviews: fallback.reviews || fallbackList.length,
          reviewCount: fallback.reviews || fallbackList.length,
          reviewList: fallbackList,
        }
      : null
  }
}

export function getFallbackProductsForFarm(slug: string, farmId: string) {
  const mapped = PRODUCE_ITEMS.map((p, idx) => ({
    p,
    farm: FARMS[idx % FARMS.length],
  })).filter((item) => item.farm && item.farm.slug === slug)

  if (mapped.length > 0) {
    return mapped.map(({ p }) => ({
      id: p.id,
      farm_id: farmId,
      name: p.name,
      detail: p.detail,
      unit: '1 pack',
      price_paise: p.pricePaise,
      stock: 25,
      in_season_months: [],
    }))
  }

  return [
    {
      id: `prod-${slug}-1`,
      farm_id: farmId,
      name: 'Organic Farm Harvest Basket',
      detail: 'Seasonal hand-picked farm harvest',
      unit: '3 kg box',
      price_paise: 35000,
      stock: 20,
      in_season_months: [],
    },
    {
      id: `prod-${slug}-2`,
      farm_id: farmId,
      name: 'Raw Floral Blossom Honey',
      detail: 'Cold-extracted unpasteurised apiary honey',
      unit: '350 g jar',
      price_paise: 42000,
      stock: 15,
      in_season_months: [],
    },
  ]
}

import { haversineDistanceKm } from '@/lib/geo'

export interface ProductWithFarm {
  id: string
  name: string
  detail: string
  unit: string
  pricePaise: number
  stock: number
  inSeasonMonths: number[]
  image?: string
  farm: {
    id: string
    name: string
    slug: string
    place?: string
    distanceKm?: number
  }
}

export async function fetchServerProduce(): Promise<Produce[]> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(30)

    if (error || !data || data.length === 0) {
      return PRODUCE_ITEMS
    }
    return data.map(mapDbProductToProduce)
  } catch {
    return PRODUCE_ITEMS
  }
}

export async function fetchServerProductsWithFarm(limit = 20): Promise<ProductWithFarm[]> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        farm:farms (id, name, slug, place)
      `)
      .order('price_paise', { ascending: false })
      .limit(limit)

    if (error || !data || data.length === 0) {
      return PRODUCE_ITEMS.slice(0, limit).map((p, idx) => {
        let farm = FARMS[idx % FARMS.length]
        if (p.name.includes('Saffron') || p.name.includes('Mongra')) {
          const matched = FARMS.find((f) => f.slug === 'pampore-saffron-haven')
          if (matched) farm = matched
        } else if (p.name.includes('Alphonso') || p.name.includes('jaggery')) {
          const matched = FARMS.find((f) => f.slug === 'kokan-roots-farmstay')
          if (matched) farm = matched
        } else if (p.name.includes('Tea') || p.name.includes('chai')) {
          const matched = FARMS.find((f) => f.slug === 'brahmaputra-tea-estate')
          if (matched) farm = matched
        } else if (p.name.includes('Coffee') || p.name.includes('Arabica')) {
          const matched = FARMS.find((f) => f.slug === 'coorg-cloud-coffee-estate')
          if (matched) farm = matched
        } else if (p.name.includes('Apple')) {
          const matched = FARMS.find((f) => f.slug === 'himachal-apple-highlands')
          if (matched) farm = matched
        }
        return {
          id: p.id,
          name: p.name,
          detail: p.detail,
          unit: '1 pack',
          pricePaise: p.pricePaise,
          stock: 30,
          inSeasonMonths: [],
          image: p.image || '',
          farm: {
            id: farm.id,
            name: farm.name,
            slug: farm.slug,
            place: farm.place,
          },
        }
      })
    }

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      detail: item.detail ? `${item.unit} · ${item.detail}` : item.unit,
      unit: item.unit,
      pricePaise: item.price_paise,
      stock: item.stock || 0,
      inSeasonMonths: item.in_season_months || [],
      image: item.image_url || '',
      farm: item.farm || {
        id: 'farm-1',
        name: 'Kokan Roots Farmstay',
        slug: 'kokan-roots-farmstay',
        place: 'Ratnagiri',
      },
    }))
  } catch {
    return PRODUCE_ITEMS.slice(0, limit).map((p, idx) => {
      let farm = FARMS[idx % FARMS.length]
      if (p.name.includes('Saffron') || p.name.includes('Mongra')) {
        const matched = FARMS.find((f) => f.slug === 'pampore-saffron-haven')
        if (matched) farm = matched
      } else if (p.name.includes('Alphonso') || p.name.includes('jaggery')) {
        const matched = FARMS.find((f) => f.slug === 'kokan-roots-farmstay')
        if (matched) farm = matched
      } else if (p.name.includes('Tea') || p.name.includes('chai')) {
        const matched = FARMS.find((f) => f.slug === 'brahmaputra-tea-estate')
        if (matched) farm = matched
      } else if (p.name.includes('Coffee') || p.name.includes('Arabica')) {
        const matched = FARMS.find((f) => f.slug === 'coorg-cloud-coffee-estate')
        if (matched) farm = matched
      } else if (p.name.includes('Apple')) {
        const matched = FARMS.find((f) => f.slug === 'himachal-apple-highlands')
        if (matched) farm = matched
      }
      return {
        id: p.id,
        name: p.name,
        detail: p.detail,
        unit: '1 pack',
        pricePaise: p.pricePaise,
        stock: 30,
        inSeasonMonths: [],
        image: p.image || '',
        farm: {
          id: farm.id,
          name: farm.name,
          slug: farm.slug,
          place: farm.place,
        },
      }
    })
  }
}

export async function fetchNearbyFarmProducts(
  currentFarmId: string,
  lat: number,
  lng: number,
  maxDistanceKm = 15,
): Promise<ProductWithFarm[]> {
  try {
    const supabase = await createServerClient()
    const { data: allFarms } = await supabase
      .from('farms')
      .select('id, name, slug, place, lat, lng')

    if (!allFarms) return []

    const nearbyFarms = allFarms
      .filter(
        (f: any) =>
          f.id !== currentFarmId &&
          typeof f.lat === 'number' &&
          typeof f.lng === 'number',
      )
      .map((f: any) => ({
        ...f,
        distanceKm: haversineDistanceKm(lat, lng, Number(f.lat), Number(f.lng)),
      }))
      .filter((f) => f.distanceKm <= maxDistanceKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)

    if (nearbyFarms.length === 0) return []

    const nearbyFarmIds = nearbyFarms.map((f) => f.id)
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('farm_id', nearbyFarmIds)
      .limit(6)

    if (!products || products.length === 0) return []

    return products.map((item: any) => {
      const parentFarm = nearbyFarms.find((f) => f.id === item.farm_id)
      return {
        id: item.id,
        name: item.name,
        detail: item.detail ? `${item.unit} · ${item.detail}` : item.unit,
        unit: item.unit,
        pricePaise: item.price_paise,
        stock: item.stock || 0,
        inSeasonMonths: item.in_season_months || [],
        image: item.image_url || '',
        farm: {
          id: parentFarm?.id || item.farm_id,
          name: parentFarm?.name || 'Neighbouring farm',
          slug: parentFarm?.slug || 'explore',
          place: parentFarm?.place || '',
          distanceKm: parentFarm?.distanceKm,
        },
      }
    })
  } catch {
    return []
  }
}
