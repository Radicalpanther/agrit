'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  ChevronDown,
  Compass,
  MapPin,
  Search,
  X,
  Calendar as CalendarIcon,
} from 'lucide-react'

const POPULAR_DESTINATIONS = [
  { region: 'Himachal Pradesh', place: 'Kotgarh, Shimla', tag: 'Apples & Cider' },
  { region: 'Kashmir', place: 'Pampore', tag: 'Saffron & Walnuts' },
  { region: 'Assam', place: 'Tezpur', tag: 'Orthodox Tea' },
  { region: 'Karnataka', place: 'Coorg, Madikeri', tag: 'Coffee & Spices' },
  { region: 'Maharashtra', place: 'Ratnagiri & Nashik', tag: 'Mango & Grapes' },
  { region: 'Kerala', place: 'Wayanad', tag: 'Spice Plantations' },
  { region: 'Punjab', place: 'Amritsar', tag: 'Mustard & Wheat' },
  { region: 'Rajasthan', place: 'Pushkar', tag: 'Damask Roses & Millet' },
  { region: 'Gujarat', place: 'Talala Gir', tag: 'Kesar Mango & Dairy' },
  { region: 'Uttarakhand', place: 'Mukteshwar', tag: 'Himalayan Apricots' },
  { region: 'Tamil Nadu', place: 'Coonoor, Nilgiris', tag: 'Frost Tea & Herbs' },
  { region: 'West Bengal', place: 'Darjeeling, Kurseong', tag: 'First Flush Tea' },
]

const MONTHS = [
  { name: 'January', short: 'Jan', season: 'Hurda & Mustard' },
  { name: 'February', short: 'Feb', season: 'Grapes & Spices' },
  { name: 'March', short: 'Mar', season: 'First Flush Tea' },
  { name: 'April', short: 'Apr', season: 'Alphonso Mango' },
  { name: 'May', short: 'May', season: 'Kesar Mango & Apricot' },
  { name: 'June', short: 'Jun', season: 'Monsoon Paddy' },
  { name: 'July', short: 'Jul', season: 'Rainforest Greens' },
  { name: 'August', short: 'Aug', season: 'Highland Apples' },
  { name: 'September', short: 'Sep', season: 'Wheat & Walnuts' },
  { name: 'October', short: 'Oct', season: 'Saffron & Coffee' },
  { name: 'November', short: 'Nov', season: 'Winter Jowar' },
  { name: 'December', short: 'Dec', season: 'Frost Tea & Berries' },
]

const SEASONS = [
  { label: 'Spring (Mar - Apr)', month: 'March' },
  { label: 'Summer (May - Jun)', month: 'May' },
  { label: 'Monsoon (Jul - Aug)', month: 'July' },
  { label: 'Autumn (Sep - Oct)', month: 'October' },
  { label: 'Winter (Dec - Feb)', month: 'January' },
]

const EXPERIENCES = [
  {
    value: 'farm stay',
    label: 'Farm stay',
    category: 'STAY',
    desc: 'Overnight rural living, farm-fresh family meals & harvest walks',
  },
  {
    value: 'apple orchard',
    label: 'Apple orchard',
    category: 'ORCHARD',
    desc: 'Himalayan tree harvest, cider pressing & deodar cedar trails',
  },
  {
    value: 'saffron',
    label: 'Saffron fields',
    category: 'HARVEST',
    desc: 'Sunrise purple blossom plucking & brass samovar saffron kahwa',
  },
  {
    value: 'tea plantation',
    label: 'Tea plantation',
    category: 'PLANTATION',
    desc: 'Orthodox leaf plucking, tea tasting & heritage colonial bungalows',
  },
  {
    value: 'coffee estate',
    label: 'Coffee estate',
    category: 'PLANTATION',
    desc: 'Shade-grown Arabica berry picking, cupping & rainforest walks',
  },
  {
    value: 'fruit picking',
    label: 'Fruit picking',
    category: 'ORCHARD',
    desc: 'Hand-pick GI Alphonso, Gir Kesar mangoes & Himalayan apricots',
  },
  {
    value: 'spice plantation',
    label: 'Spice plantation',
    category: 'NATURE',
    desc: 'Green cardamom, black pepper vines & ayurvedic aroma trails',
  },
  {
    value: 'hurda',
    label: 'Hurda party',
    category: 'CULINARY',
    desc: 'Tender winter jowar roasted on earthen hearths with spicy chutney',
  },
  {
    value: 'jaggery',
    label: 'Jaggery making',
    category: 'CULINARY',
    desc: 'Sugarcane crush, traditional bullock Kolhu & warm fresh gur',
  },
  {
    value: 'vineyard',
    label: 'Vineyard stay',
    category: 'ORCHARD',
    desc: 'Table grape harvest, canopy pruning & sunset valley walks',
  },
  {
    value: 'mustard harvest',
    label: 'Mustard harvest',
    category: 'FARMING',
    desc: 'Golden yellow fields, morning tractor rides & wood-fired saag',
  },
  {
    value: 'cattle tending',
    label: 'Cattle tending',
    category: 'FARMING',
    desc: 'Desi Gir cow shed care, fresh milk & cultured bilona ghee',
  },
]

export function SearchBar() {
  const router = useRouter()

  const [whereValue, setWhereValue] = useState('')
  const [whenValue, setWhenValue] = useState('')
  const [experienceValue, setExperienceValue] = useState('')

  const [whereOpen, setWhereOpen] = useState(false)
  const [whenOpen, setWhenOpen] = useState(false)
  const [experienceOpen, setExperienceOpen] = useState(false)

  // 'month' or 'date' mode in the When popover
  const [whenMode, setWhenMode] = useState<'month' | 'date'>('month')
  const [customDate, setCustomDate] = useState('')

  const whereRef = useRef<HTMLLabelElement>(null)
  const whenRef = useRef<HTMLLabelElement>(null)
  const experienceRef = useRef<HTMLLabelElement>(null)

  const currentMonthIdx = new Date().getMonth()

  // Format today's minimum string for date input
  const todayIso = new Date().toISOString().split('T')[0]

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (whereRef.current && !whereRef.current.contains(e.target as Node)) {
        setWhereOpen(false)
      }
      if (whenRef.current && !whenRef.current.contains(e.target as Node)) {
        setWhenOpen(false)
      }
      if (experienceRef.current && !experienceRef.current.contains(e.target as Node)) {
        setExperienceOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setWhereOpen(false)
        setWhenOpen(false)
        setExperienceOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Helper date shortcuts
  const selectQuickDay = (daysFromNow: number) => {
    const d = new Date()
    d.setDate(d.getDate() + daysFromNow)
    const monthShort = d.toLocaleString('en-US', { month: 'short' })
    const day = d.getDate()
    const year = d.getFullYear()
    const formatted = `${monthShort} ${day}, ${year}`
    setWhenValue(formatted)
    setCustomDate(d.toISOString().split('T')[0])
    setWhenOpen(false)
  }

  const selectNextWeekend = () => {
    const d = new Date()
    const dayOfWeek = d.getDay() // 0=Sun, 6=Sat
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7
    d.setDate(d.getDate() + daysUntilSaturday)
    const monthShort = d.toLocaleString('en-US', { month: 'short' })
    const day = d.getDate()
    const year = d.getFullYear()
    const formatted = `${monthShort} ${day}, ${year}`
    setWhenValue(formatted)
    setCustomDate(d.toISOString().split('T')[0])
    setWhenOpen(false)
  }

  const applyCustomDate = (isoDate: string) => {
    if (!isoDate) return
    const [year, month, day] = isoDate.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    const monthShort = d.toLocaleString('en-US', { month: 'short' })
    const formatted = `${monthShort} ${day}, ${year}`
    setWhenValue(formatted)
    setWhenOpen(false)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setWhereOpen(false)
    setWhenOpen(false)
    setExperienceOpen(false)

    const params = new URLSearchParams()
    if (whereValue.trim()) params.set('where', whereValue.trim())
    if (whenValue.trim()) params.set('when', whenValue.trim())
    if (experienceValue.trim()) params.set('experience', experienceValue.trim())

    const queryString = params.toString()
    router.push(queryString ? `/explore?${queryString}` : '/explore')
  }

  // Filter experiences when typing in the experience box
  const filteredExperiences = experienceValue.trim()
    ? EXPERIENCES.filter(
        (exp) =>
          exp.label.toLowerCase().includes(experienceValue.toLowerCase()) ||
          exp.value.toLowerCase().includes(experienceValue.toLowerCase()) ||
          exp.desc.toLowerCase().includes(experienceValue.toLowerCase()) ||
          exp.category.toLowerCase().includes(experienceValue.toLowerCase()),
      )
    : EXPERIENCES

  return (
    <div className="search-wrap" style={{ position: 'relative', zIndex: 40 }}>
      <form className="search-bar" onSubmit={handleSubmit}>
        {/* ================================================================= */}
        {/* WHERE FIELD */}
        {/* ================================================================= */}
        <label
          ref={whereRef}
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => {
            setWhereOpen((prev) => !prev)
            setWhenOpen(false)
            setExperienceOpen(false)
          }}
        >
          <MapPin size={18} />
          <span>Where</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              name="where"
              placeholder="Himachal, Kashmir, Coorg, Assam..."
              value={whereValue}
              onChange={(e) => {
                setWhereValue(e.target.value)
                setWhereOpen(true)
              }}
              onFocus={() => {
                setWhereOpen(true)
                setWhenOpen(false)
                setExperienceOpen(false)
              }}
              onClick={(e) => {
                e.stopPropagation()
                setWhereOpen(true)
              }}
              autoComplete="off"
            />
            {whereValue && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setWhereValue('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Clear destination"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* WHERE POPUP */}
          {whereOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: 'min(380px, 92vw)',
                maxHeight: '360px',
                overflowY: 'auto',
                background: '#ffffff',
                border: '1px solid var(--line)',
                boxShadow: '0 16px 36px rgba(16, 54, 39, 0.16)',
                padding: '14px',
                zIndex: 100,
                cursor: 'default',
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '8px',
                  marginBottom: '10px',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: 'var(--forest)',
                  }}
                >
                  Major Indian Farming Regions
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setWhereValue('')
                    setWhereOpen(false)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Any region
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '8px',
                }}
              >
                {POPULAR_DESTINATIONS.map((dest) => (
                  <button
                    key={dest.region}
                    type="button"
                    onClick={() => {
                      setWhereValue(dest.region)
                      setWhereOpen(false)
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      background:
                        whereValue.toLowerCase() === dest.region.toLowerCase()
                          ? 'var(--mint)'
                          : '#fafbf9',
                      border: '1px solid var(--line)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--forest)'
                      e.currentTarget.style.background = '#f2f7f0'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--line)'
                      e.currentTarget.style.background =
                        whereValue.toLowerCase() === dest.region.toLowerCase()
                          ? 'var(--mint)'
                          : '#fafbf9'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--ink)',
                      }}
                    >
                      {dest.region}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                      {dest.place}
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        color: 'var(--forest)',
                        fontWeight: 600,
                        marginTop: '2px',
                      }}
                    >
                      {dest.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </label>

        {/* ================================================================= */}
        {/* WHEN FIELD (WITH DATE OPTION) */}
        {/* ================================================================= */}
        <label
          ref={whenRef}
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => {
            setWhenOpen((prev) => !prev)
            setWhereOpen(false)
            setExperienceOpen(false)
          }}
        >
          <CalendarDays size={18} />
          <span>When</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              name="when"
              placeholder="Any date, month or season"
              value={whenValue}
              onChange={(e) => {
                setWhenValue(e.target.value)
                setWhenOpen(true)
              }}
              onFocus={() => {
                setWhenOpen(true)
                setWhereOpen(false)
                setExperienceOpen(false)
              }}
              onClick={(e) => {
                e.stopPropagation()
                setWhenOpen(true)
              }}
              autoComplete="off"
            />
            {whenValue && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setWhenValue('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Clear date"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* WHEN POPUP (MONTHS / SEASONS + SPECIFIC DATE PICKER) */}
          {whenOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: 'min(380px, 92vw)',
                maxHeight: '400px',
                overflowY: 'auto',
                background: '#ffffff',
                border: '1px solid var(--line)',
                boxShadow: '0 16px 36px rgba(16, 54, 39, 0.16)',
                padding: '14px',
                zIndex: 100,
                cursor: 'default',
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Switcher Tabs */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '8px',
                  marginBottom: '10px',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setWhenMode('month')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: whenMode === 'month' ? 'var(--forest)' : '#f2f6f1',
                      color: whenMode === 'month' ? '#ffffff' : 'var(--muted)',
                      border: '1px solid var(--line)',
                      cursor: 'pointer',
                    }}
                  >
                    Month &amp; Season
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhenMode('date')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: whenMode === 'date' ? 'var(--forest)' : '#f2f6f1',
                      color: whenMode === 'date' ? '#ffffff' : 'var(--muted)',
                      border: '1px solid var(--line)',
                      cursor: 'pointer',
                    }}
                  >
                    Specific Date
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setWhenValue('')
                    setCustomDate('')
                    setWhenOpen(false)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Any time
                </button>
              </div>

              {/* MODE 1: MONTH & SEASON */}
              {whenMode === 'month' && (
                <>
                  {/* Quick Seasons */}
                  <div style={{ marginBottom: '12px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        color: 'var(--muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'block',
                        marginBottom: '6px',
                        fontWeight: 600,
                      }}
                    >
                      By Season
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {SEASONS.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => {
                            setWhenValue(s.month)
                            setWhenOpen(false)
                          }}
                          style={{
                            padding: '5px 8px',
                            fontSize: '11px',
                            background:
                              whenValue.toLowerCase() === s.month.toLowerCase()
                                ? 'var(--forest)'
                                : '#f2f6f1',
                            color:
                              whenValue.toLowerCase() === s.month.toLowerCase()
                                ? '#ffffff'
                                : 'var(--ink)',
                            border: '1px solid var(--line)',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 12 Months Grid */}
                  <div>
                    <span
                      style={{
                        fontSize: '10px',
                        color: 'var(--muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'block',
                        marginBottom: '6px',
                        fontWeight: 600,
                      }}
                    >
                      12-Month Calendar
                    </span>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '6px',
                      }}
                    >
                      {MONTHS.map((m, idx) => {
                        const isSelected =
                          whenValue.toLowerCase().startsWith(m.short.toLowerCase())
                        const isCurrent = idx === currentMonthIdx

                        return (
                          <button
                            key={m.name}
                            type="button"
                            onClick={() => {
                              setWhenValue(m.name)
                              setWhenOpen(false)
                            }}
                            style={{
                              padding: '8px 6px',
                              textAlign: 'center',
                              background: isSelected
                                ? 'var(--forest)'
                                : isCurrent
                                ? 'var(--mint)'
                                : '#ffffff',
                              color: isSelected ? '#ffffff' : 'var(--ink)',
                              border: isCurrent
                                ? '1px solid var(--forest)'
                                : '1px solid var(--line)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '2px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span style={{ fontSize: '12px', fontWeight: 700 }}>
                              {m.short}
                              {isCurrent && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: isSelected ? '#ffffff' : '#c78137',
                                    marginLeft: '4px',
                                    verticalAlign: 'middle',
                                  }}
                                />
                              )}
                            </span>
                            <span
                              style={{
                                fontSize: '9px',
                                color: isSelected ? '#e8f2e5' : 'var(--muted)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '95px',
                              }}
                            >
                              {m.season}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* MODE 2: SPECIFIC DATE PICKER */}
              {whenMode === 'date' && (
                <div>
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: 600,
                    }}
                  >
                    Quick Days
                  </span>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button
                      type="button"
                      onClick={() => selectQuickDay(1)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: '#f2f6f1',
                        border: '1px solid var(--line)',
                        cursor: 'pointer',
                      }}
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => selectNextWeekend()}
                      style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: '#f2f6f1',
                        border: '1px solid var(--line)',
                        cursor: 'pointer',
                      }}
                    >
                      This Weekend
                    </button>
                    <button
                      type="button"
                      onClick={() => selectQuickDay(7)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: '#f2f6f1',
                        border: '1px solid var(--line)',
                        cursor: 'pointer',
                      }}
                    >
                      Next Week
                    </button>
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'block',
                      marginBottom: '6px',
                      fontWeight: 600,
                    }}
                  >
                    Choose Exact Date
                  </span>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="date"
                      min={todayIso}
                      value={customDate}
                      onChange={(e) => {
                        setCustomDate(e.target.value)
                        applyCustomDate(e.target.value)
                      }}
                      style={{
                        flex: 1,
                        border: '1px solid var(--line)',
                        padding: '9px 12px',
                        fontSize: '13px',
                        background: '#ffffff',
                        color: 'var(--ink)',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </label>

        {/* ================================================================= */}
        {/* EXPERIENCE FIELD (CUSTOM POPOVER MATCHING WHERE & WHEN) */}
        {/* ================================================================= */}
        <label
          ref={experienceRef}
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => {
            setExperienceOpen((prev) => !prev)
            setWhereOpen(false)
            setWhenOpen(false)
          }}
        >
          <Compass size={18} />
          <span>Experience</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              name="experience"
              placeholder="Any activity or stay"
              value={experienceValue}
              onChange={(e) => {
                setExperienceValue(e.target.value)
                setExperienceOpen(true)
              }}
              onFocus={() => {
                setExperienceOpen(true)
                setWhereOpen(false)
                setWhenOpen(false)
              }}
              onClick={(e) => {
                e.stopPropagation()
                setExperienceOpen(true)
              }}
              autoComplete="off"
            />
            {experienceValue && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setExperienceValue('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Clear activity"
              >
                <X size={14} />
              </button>
            )}
            <ChevronDown
              size={15}
              style={{
                color: 'var(--muted)',
                transform: experienceOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                flexShrink: 0,
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* EXPERIENCE CUSTOM POPUP */}
          {experienceOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: 'min(410px, 92vw)',
                maxHeight: '380px',
                overflowY: 'auto',
                background: '#ffffff',
                border: '1px solid var(--line)',
                boxShadow: '0 16px 36px rgba(16, 54, 39, 0.16)',
                padding: '14px',
                zIndex: 100,
                cursor: 'default',
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '8px',
                  marginBottom: '10px',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: 'var(--forest)',
                  }}
                >
                  Curated Farm Activities
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setExperienceValue('')
                    setExperienceOpen(false)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Any activity
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '8px',
                }}
              >
                {filteredExperiences.map((exp) => {
                  const isSelected =
                    experienceValue.toLowerCase() === exp.label.toLowerCase() ||
                    experienceValue.toLowerCase() === exp.value.toLowerCase()

                  return (
                    <button
                      key={exp.value}
                      type="button"
                      onClick={() => {
                        setExperienceValue(exp.label)
                        setExperienceOpen(false)
                      }}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        background: isSelected ? 'var(--mint)' : '#fafbf9',
                        border: isSelected
                          ? '1px solid var(--forest)'
                          : '1px solid var(--line)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--forest)'
                          e.currentTarget.style.background = '#f2f7f0'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--line)'
                          e.currentTarget.style.background = '#fafbf9'
                        }
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--ink)',
                          }}
                        >
                          {exp.label}
                        </span>
                        <span
                          style={{
                            fontSize: '9px',
                            color: 'var(--forest)',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                          }}
                        >
                          {exp.category}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--muted)',
                          lineHeight: 1.35,
                          marginTop: '2px',
                        }}
                      >
                        {exp.desc}
                      </span>
                    </button>
                  )
                })}
              </div>

              {filteredExperiences.length === 0 && (
                <div
                  style={{
                    padding: '18px 10px',
                    textAlign: 'center',
                    color: 'var(--muted)',
                    fontSize: '12px',
                  }}
                >
                  No curated activity found for &quot;{experienceValue}&quot;
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--forest)',
                      fontWeight: 600,
                      marginTop: '4px',
                    }}
                  >
                    Click &quot;Search farms&quot; to search all listings!
                  </div>
                </div>
              )}
            </div>
          )}
        </label>

        {/* SUBMIT BUTTON */}
        <button className="search-btn" type="submit">
          <Search size={19} />
          <span>Search farms</span>
        </button>
      </form>
    </div>
  )
}
