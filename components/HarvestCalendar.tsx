'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
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

const MONTH_KEYS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const

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
  const t = useTranslations('home.calendar')
  const tMonths = useTranslations('search.months')

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

  const selectedMonthName = tMonths(MONTH_KEYS[selectedMonth])
  const displayedFarms = matchingFarms.slice(0, 3)

  const inSeasonText =
    activeCrops.length > 0
      ? activeCrops.map((c) => c.name).join(', ')
      : t('noneOffSeason')

  return (
    <section
      className="section"
      id="harvest-calendar"
      style={{ paddingBottom: '90px', scrollMarginTop: '85px' }}
    >
      {/* Section Header */}
      <div style={{ marginBottom: '22px' }}>
        <p className="section-kicker" style={{ margin: '0 0 6px' }}>
          {t('kicker')}
        </p>
        <h2
          style={{
            fontSize: '36px',
            letterSpacing: '-1.5px',
            lineHeight: 1.1,
            margin: '0 0 8px',
            color: 'var(--ink)',
            fontFamily: 'inherit',
          }}
        >
          {t('heading')}
        </h2>
        <p
          style={{
            color: 'var(--muted)',
            fontSize: '14px',
            lineHeight: 1.6,
            margin: 0,
            fontFamily: 'inherit',
          }}
        >
          {t('subhead')}
        </p>
      </div>

      {/* 12-Month Button Bar */}
      <div
        className="seasonal-months-grid"
        role="tablist"
        aria-label="Seasonal calendar months"
      >
        {MONTH_KEYS.map((key, index) => {
          const isSelected = selectedMonth === index
          const isActualCurrent = actualCurrentMonth === index
          const hasStays = staysPerMonth[index].length > 0
          const isFaded = !hasStays && !isSelected

          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={tMonths(key)}
              onClick={() => setSelectedMonth(index)}
              className={`seasonal-month-btn ${isSelected ? 'is-active' : ''} ${isFaded ? 'is-faded' : ''}`}
            >
              <span>{tMonths(key)}</span>
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
          fontFamily: 'inherit',
        }}
      >
        {t('inSeasonInMonth', { month: selectedMonthName })}{' '}
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
                      <Link
                        href={`/farms/${farm.slug}`}
                        className="seasonal-row-link"
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {farm.name}
                      </Link>
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
                        {t('perNight')}
                      </span>
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--forest)',
                        pointerEvents: 'none',
                      }}
                    >
                      {t('viewStay')} <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {matchingFarms.length > 3 && (
            <div style={{ marginTop: '14px' }}>
              <Link
                href={`/explore?when=${encodeURIComponent(FULL_MONTH_NAMES[selectedMonth].toLowerCase())}`}
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
                {t('seeAllStays', { count: matchingFarms.length, month: selectedMonthName })}{' '}
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
            fontFamily: 'inherit',
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
            {t('quietMonth')}
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
            {t('jumpToMonth', { month: tMonths(MONTH_KEYS[nextMonthIndex]) })} <ArrowRight size={14} />
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
          fontFamily: 'inherit',
        }}
      >
        {t('footnote')}
      </p>
    </section>
  )
}
