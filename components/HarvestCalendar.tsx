'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  getAllCrops,
  getAllFarms,
  getAllActivities,
  type CropData,
  type Farm,
  type FarmActivity,
} from '@/lib/mock-data'
import { formatRupees } from '@/lib/money'
import { fetchBrowserFarmsWithCrops } from '@/lib/supabase/queries'

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const FULL_MONTH_NAMES = [
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

function getMatchingActivity(
  farm: Farm,
  monthIndex: number,
  activities: FarmActivity[],
): string {
  // 1. Check for an activity specifically suited for this month
  const monthActivity = activities.find(
    (a) => a.farmSlug === farm.slug && a.bestMonths.includes(monthIndex),
  )
  if (monthActivity) {
    return monthActivity.name
  }

  // 2. Check for any agricultural or culinary experience
  const farmActivity = activities.find(
    (a) =>
      a.farmSlug === farm.slug &&
      (a.kind === 'farming' || a.kind === 'culinary'),
  )
  if (farmActivity) {
    return farmActivity.name
  }

  // 3. Fallback to farm's primary experience
  if (farm.type) {
    const parts = farm.type.split('·').map((p) => p.trim())
    return parts[1] || parts[0] || 'Farm harvest tour'
  }

  return 'Seasonal farm walk'
}

export function HarvestCalendar() {
  const [crops, setCrops] = useState<CropData[]>(() => getAllCrops())
  const [allFarms, setAllFarms] = useState<Farm[]>(() => getAllFarms())
  const [activities, setActivities] = useState<FarmActivity[]>(() =>
    getAllActivities(),
  )

  useEffect(() => {
    fetchBrowserFarmsWithCrops().then((data) => {
      if (data.crops && data.crops.length > 0) setCrops(data.crops)
      if (data.farms && data.farms.length > 0) setAllFarms(data.farms)
      if (data.activities && data.activities.length > 0) {
        setActivities(data.activities)
      }
    })
  }, [])

  // Current calendar month (0-indexed: 0 = Jan ... 11 = Dec)
  const actualCurrentMonth = useMemo(() => new Date().getMonth(), [])
  const [selectedMonth, setSelectedMonth] = useState<number>(actualCurrentMonth)

  // Stays having crops in season for each of the 12 months
  const staysPerMonth = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const activeCrops = crops.filter((crop) => crop.harvestMonths.includes(m))
      const activeSlugs = new Set(
        activeCrops.flatMap((crop) => crop.linkedFarmSlugs),
      )
      return allFarms.filter((farm) => activeSlugs.has(farm.slug))
    })
  }, [crops, allFarms])

  // Crops in season for the selected month
  const activeCrops = useMemo(() => {
    return crops.filter((crop) => crop.harvestMonths.includes(selectedMonth))
  }, [crops, selectedMonth])

  // Stays for the selected month
  const matchingFarms = useMemo(() => {
    return staysPerMonth[selectedMonth] || []
  }, [staysPerMonth, selectedMonth])

  // Next month that has matching stays (for jump button)
  const nextMonthIndex = useMemo(() => {
    for (let offset = 1; offset < 12; offset++) {
      const candidate = (selectedMonth + offset) % 12
      if (staysPerMonth[candidate].length > 0) {
        return candidate
      }
    }
    return selectedMonth
  }, [selectedMonth, staysPerMonth])

  const selectedMonthName = FULL_MONTH_NAMES[selectedMonth]
  const displayedFarms = matchingFarms.slice(0, 3)

  const inSeasonText =
    activeCrops.length > 0
      ? activeCrops.map((c) => c.name).join(', ')
      : 'None (off-season)'

  return (
    <section
      className="section"
      id="harvest-calendar"
      style={{ paddingBottom: '90px' }}
    >
      {/* Section Header */}
      <div style={{ marginBottom: '22px' }}>
        <p className="section-kicker" style={{ margin: '0 0 6px' }}>
          Seasonal calendar
        </p>
        <h2
          style={{
            fontSize: '36px',
            letterSpacing: '-1.5px',
            lineHeight: 1.1,
            margin: '0 0 8px',
            color: 'var(--ink)',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          What&apos;s in season.
        </h2>
        <p
          style={{
            color: 'var(--muted)',
            fontSize: '14px',
            lineHeight: 1.6,
            margin: 0,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          Plan your farm stay around live harvest cycles and seasonal activities across India.
        </p>
      </div>

      {/* 12-Month Button Bar */}
      <div
        className="seasonal-months-grid"
        role="tablist"
        aria-label="Seasonal calendar months"
      >
        {MONTH_NAMES.map((name, index) => {
          const isSelected = selectedMonth === index
          const isActualCurrent = actualCurrentMonth === index
          const hasStays = staysPerMonth[index].length > 0
          const isFaded = !hasStays && !isSelected

          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={`${FULL_MONTH_NAMES[index]}${isActualCurrent ? ' (current month)' : ''}${!hasStays ? ' (no stays)' : ''}`}
              onClick={() => setSelectedMonth(index)}
              className={`seasonal-month-btn ${isSelected ? 'is-active' : ''} ${isFaded ? 'is-faded' : ''}`}
            >
              <span>{name}</span>
              {isActualCurrent && (
                <span
                  className="gold-dot"
                  title="Current month"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* In-season crops summary line */}
      <p
        style={{
          fontSize: '13px',
          color: 'var(--muted)',
          margin: '14px 0 20px',
          lineHeight: 1.5,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        In season in {selectedMonthName}:{' '}
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
          {inSeasonText}
        </span>
      </p>

      {/* Compact stays list or quiet month state */}
      {displayedFarms.length > 0 ? (
        <div>
          <div
            style={{
              border: '1px solid var(--line)',
              background: '#ffffff',
            }}
          >
            {displayedFarms.map((farm, idx) => {
              const activity = getMatchingActivity(
                farm,
                selectedMonth,
                activities,
              )
              return (
                <div
                  key={farm.slug}
                  className="seasonal-stay-row"
                  style={{
                    borderTop: idx > 0 ? '1px solid var(--line)' : 'none',
                  }}
                >
                  {/* Left: Farm name and place */}
                  <div style={{ flex: '1.2', minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '14px',
                        color: 'var(--ink)',
                        lineHeight: 1.3,
                      }}
                    >
                      {farm.name}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--muted)',
                        marginTop: '2px',
                      }}
                    >
                      {farm.place}
                    </div>
                  </div>

                  {/* Middle: Matching activity */}
                  <div
                    style={{
                      flex: '1',
                      minWidth: 0,
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--forest)',
                    }}
                  >
                    {activity}
                  </div>

                  {/* Right: Price & View stay link */}
                  <div
                    className="seasonal-stay-row-right"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '18px',
                      flexShrink: 0,
                      justifyContent: 'flex-end',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: 'var(--ink)' }}>
                      <strong>{formatRupees(farm.pricePaise)}</strong>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--muted)',
                          marginLeft: '4px',
                        }}
                      >
                        / night
                      </span>
                    </span>
                    <Link
                      href={`/farms/${farm.slug}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--forest)',
                        textDecoration: 'none',
                      }}
                    >
                      View stay <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {matchingFarms.length > 3 && (
            <div style={{ marginTop: '14px' }}>
              <Link
                href={`/explore?when=${encodeURIComponent(selectedMonthName.toLowerCase())}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--forest)',
                  textDecoration: 'none',
                }}
              >
                See all {matchingFarms.length} stays in {selectedMonthName}{' '}
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            border: '1px solid var(--line)',
            background: '#ffffff',
            padding: '36px 20px',
            textAlign: 'center',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              color: 'var(--muted)',
              margin: '0 0 16px',
              lineHeight: 1.5,
            }}
          >
            It is a quiet month across host farms with no scheduled harvests.
          </p>
          <button
            type="button"
            onClick={() => setSelectedMonth(nextMonthIndex)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              background: 'var(--forest)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Jump to {FULL_MONTH_NAMES[nextMonthIndex]} <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Note line at the bottom */}
      <p
        style={{
          fontSize: '11px',
          color: 'var(--muted)',
          marginTop: '16px',
          lineHeight: 1.5,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Harvest and sowing dates vary with local rainfall and weather patterns. Dates are indicative.
      </p>
    </section>
  )
}
