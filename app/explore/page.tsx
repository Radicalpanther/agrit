'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpDown, Calendar, ChevronDown, Filter } from 'lucide-react'
import { FarmGrid } from '@/components/FarmGrid'
import { fetchBrowserFarmsWithCrops } from '@/lib/supabase/queries'
import type { Farm, CropData } from '@/lib/mock-data'

type FilterKey = 'all' | 'top-rated' | 'budget' | 'fruit-season' | 'coast'
type SortKey = 'recommended' | 'price-asc' | 'rating'

function ExploreContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [farms, setFarms] = useState<Farm[]>([])
  const [crops, setCrops] = useState<CropData[]>([])
  const [farmCropsMap, setFarmCropsMap] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)

  // Fetch Supabase data on mount
  useEffect(() => {
    let isMounted = true
    fetchBrowserFarmsWithCrops().then((data) => {
      if (isMounted) {
        setFarms(data.farms)
        setCrops(data.crops)
        setFarmCropsMap(data.farmCropsMap)
        setLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Read current filters from URL search params
  const currentFilter = (searchParams.get('filter') as FilterKey) || 'all'
  const currentSort = (searchParams.get('sort') as SortKey) || 'recommended'
  const searchWhere = searchParams.get('where')?.trim().toLowerCase() || ''
  const searchWhen = searchParams.get('when')?.trim().toLowerCase() || ''
  const searchExperience = searchParams.get('experience')?.trim().toLowerCase() || ''

  const currentMonth = useMemo(() => new Date().getMonth(), [])

  // Helper to update search params in URL
  const updateQuery = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || (key === 'filter' && value === 'all') || (key === 'sort' && value === 'recommended')) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    const query = params.toString()
    router.push(query ? `/explore?${query}` : '/explore')
  }

  // Active harvest crops for the current month
  const currentMonthHarvestCropIds = useMemo(() => {
    const set = new Set<string>()
    crops.forEach((c) => {
      if (c.harvestMonths.includes(currentMonth)) {
        set.add(c.id)
      }
    })
    return set
  }, [crops, currentMonth])

  // Farms with active fruit / harvest season this month
  const fruitSeasonFarmSlugs = useMemo(() => {
    const set = new Set<string>()
    Object.entries(farmCropsMap).forEach(([slug, cropIds]) => {
      if (cropIds.some((cid) => currentMonthHarvestCropIds.has(cid))) {
        set.add(slug)
      }
    })
    return set
  }, [farmCropsMap, currentMonthHarvestCropIds])

  // Filtered & sorted farms
  const filteredFarms = useMemo(() => {
    let result = [...farms]

    // 1. SearchBar where query
    if (searchWhere) {
      result = result.filter(
        (f) =>
          f.place.toLowerCase().includes(searchWhere) ||
          f.region.toLowerCase().includes(searchWhere) ||
          f.name.toLowerCase().includes(searchWhere),
      )
    }

    // 1b. SearchBar when query (e.g. "october", "oct", "may")
    if (searchWhen) {
      const monthShorts = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
      const monthFulls = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
      let mIdx = monthShorts.findIndex((m) => searchWhen.startsWith(m))
      if (mIdx === -1) {
        mIdx = monthFulls.findIndex((m) => searchWhen.startsWith(m))
      }
      if (mIdx !== -1) {
        const activeCropSlugs = new Set<string>()
        crops.forEach((c) => {
          if (c.harvestMonths.includes(mIdx)) {
            c.linkedFarmSlugs.forEach((slug) => activeCropSlugs.add(slug))
          }
        })
        result = result.filter((f) => activeCropSlugs.has(f.slug))
      }
    }

    // 2. SearchBar experience query
    if (searchExperience) {
      result = result.filter(
        (f) =>
          f.type.toLowerCase().includes(searchExperience) ||
          f.tag.toLowerCase().includes(searchExperience) ||
          f.description.toLowerCase().includes(searchExperience),
      )
    }

    // 3. Tab filter
    if (currentFilter === 'top-rated') {
      result = result.filter((f) => Number(f.rating) >= 4.7)
    } else if (currentFilter === 'budget') {
      result = result.filter((f) => f.pricePaise <= 200000)
    } else if (currentFilter === 'fruit-season') {
      result = result.filter(
        (f) =>
          fruitSeasonFarmSlugs.has(f.slug) ||
          f.type.toLowerCase().includes('fruit') ||
          f.tag.toLowerCase().includes('seasonal'),
      )
    } else if (currentFilter === 'coast') {
      result = result.filter(
        (f) =>
          f.place.toLowerCase().includes('ratnagiri') ||
          f.region.toLowerCase().includes('konkan') ||
          f.amenities.some((a) => a.toLowerCase().includes('coast')) ||
          f.description.toLowerCase().includes('konkan') ||
          f.description.toLowerCase().includes('coastal'),
      )
    }

    // 4. Sorting
    if (currentSort === 'price-asc') {
      result.sort((a, b) => a.pricePaise - b.pricePaise)
    } else if (currentSort === 'rating' || currentFilter === 'top-rated') {
      result.sort((a, b) => Number(b.rating) - Number(a.rating))
    }

    return result
  }, [
    farms,
    crops,
    currentFilter,
    currentSort,
    searchWhere,
    searchWhen,
    searchExperience,
    fruitSeasonFarmSlugs,
  ])

  return (
    <>
      <section className="page-intro">
        <div>
          <p className="section-kicker">The good kind of getaway</p>
          <h1>Explore farm stays.</h1>
          <p>
            Trade the city rush for muddy feet, open skies and a table set by
            the people who grew it.
          </p>
          {(searchWhere || searchWhen || searchExperience) && (
            <p
              style={{
                fontSize: '12px',
                color: 'var(--forest)',
                fontWeight: 700,
                marginTop: '6px',
              }}
            >
              Active search:{' '}
              {[searchWhere, searchWhen, searchExperience]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
        <div className="result-count">
          <strong>{filteredFarms.length}</strong>
          <span>stays &amp; experiences</span>
        </div>
      </section>

      {/* Filter Row */}
      <div className="filter-row">
        <button
          className={currentFilter === 'all' ? 'filter-active' : ''}
          onClick={() => updateQuery('filter', 'all')}
          type="button"
        >
          All stays
        </button>
        <button
          className={currentFilter === 'top-rated' ? 'filter-active' : ''}
          onClick={() => updateQuery('filter', 'top-rated')}
          type="button"
        >
          Top rated
        </button>
        <button
          className={currentFilter === 'budget' ? 'filter-active' : ''}
          onClick={() => updateQuery('filter', 'budget')}
          type="button"
        >
          Under ₹2,000
        </button>
        <button
          className={currentFilter === 'fruit-season' ? 'filter-active' : ''}
          onClick={() => updateQuery('filter', 'fruit-season')}
          type="button"
        >
          Fruit season
        </button>
        <button
          className={currentFilter === 'coast' ? 'filter-active' : ''}
          onClick={() => updateQuery('filter', 'coast')}
          type="button"
        >
          Near the coast
        </button>

        {/* Sort Control */}
        <div
          className="filter-more"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span
            style={{
              fontSize: '11px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '0.8px',
            }}
          >
            Sort
          </span>
          <select
            value={currentSort}
            onChange={(e) => updateQuery('sort', e.target.value)}
            style={{
              border: '1px solid var(--line)',
              padding: '7px 10px',
              fontSize: '11px',
              color: 'var(--ink)',
              background: '#ffffff',
              cursor: 'pointer',
            }}
            aria-label="Sort stays"
          >
            <option value="recommended">Recommended</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="rating">Rating</option>
          </select>
        </div>
      </div>

      {/* Results Grid */}
      <section className="section explore-section">
        {loading ? (
          <div className="farm-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="farm-card"
                style={{ background: '#ffffff', border: '1px solid var(--line)' }}
              >
                <div
                  style={{
                    height: '225px',
                    background: '#e4ebe1',
                    animation: 'pulse 1.5s infinite ease-in-out',
                  }}
                />
                <div style={{ padding: '17px' }}>
                  <div
                    style={{
                      height: '18px',
                      width: '70%',
                      background: '#dce5d8',
                      marginBottom: '10px',
                    }}
                  />
                  <div
                    style={{
                      height: '13px',
                      width: '45%',
                      background: '#edf2eb',
                      marginBottom: '16px',
                    }}
                  />
                  <div
                    style={{
                      height: '14px',
                      width: '85%',
                      background: '#edf2eb',
                      marginBottom: '18px',
                    }}
                  />
                  <div style={{ height: '20px', width: '100%', background: '#eef3eb' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredFarms.length > 0 ? (
          <FarmGrid farms={filteredFarms} alternateTags={true} />
        ) : (
          <div
            style={{
              border: '1px solid var(--line)',
              background: '#ffffff',
              padding: '60px 24px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--ink)',
                margin: '0 0 8px',
              }}
            >
              No farm stays match these filters
            </p>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--muted)',
                lineHeight: 1.6,
                maxWidth: '460px',
                margin: '0 auto 20px',
              }}
            >
              Try clearing specific filters or resetting your search to explore all available farm stays.
            </p>
            <button
              type="button"
              onClick={() => router.push('/explore')}
              className="primary-btn"
              style={{ padding: '10px 18px', fontSize: '12px' }}
            >
              Reset all filters
            </button>
          </div>
        )}
      </section>
    </>
  )
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <section className="page-intro">
          <div>
            <p className="section-kicker">The good kind of getaway</p>
            <h1>Explore farm stays.</h1>
            <p>Loading available farm stays...</p>
          </div>
        </section>
      }
    >
      <ExploreContent />
    </Suspense>
  )
}
