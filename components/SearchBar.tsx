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

export function SearchBar() {
  const router = useRouter()

  const [whereValue, setWhereValue] = useState('')
  const [whenValue, setWhenValue] = useState('')
  const [experienceValue, setExperienceValue] = useState('')

  const [whereOpen, setWhereOpen] = useState(false)
  const [whenOpen, setWhenOpen] = useState(false)

  const whereRef = useRef<HTMLLabelElement>(null)
  const whenRef = useRef<HTMLLabelElement>(null)

  const currentMonthIdx = new Date().getMonth()

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (whereRef.current && !whereRef.current.contains(e.target as Node)) {
        setWhereOpen(false)
      }
      if (whenRef.current && !whenRef.current.contains(e.target as Node)) {
        setWhenOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setWhereOpen(false)
        setWhenOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setWhereOpen(false)
    setWhenOpen(false)

    const params = new URLSearchParams()
    if (whereValue.trim()) params.set('where', whereValue.trim())
    if (whenValue.trim()) params.set('when', whenValue.trim())
    if (experienceValue.trim()) params.set('experience', experienceValue.trim())

    const queryString = params.toString()
    router.push(queryString ? `/explore?${queryString}` : '/explore')
  }

  return (
    <div className="search-wrap" style={{ position: 'relative', zIndex: 40 }}>
      <form className="search-bar" onSubmit={handleSubmit}>
        {/* WHERE FIELD */}
        <label
          ref={whereRef}
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => {
            setWhereOpen(true)
            setWhenOpen(false)
          }}
        >
          <MapPin size={18} />
          <span>Where</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              name="where"
              placeholder="Himachal, Kashmir, Coorg, Assam..."
              value={whereValue}
              onChange={(e) => setWhereValue(e.target.value)}
              onFocus={() => {
                setWhereOpen(true)
                setWhenOpen(false)
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

          {/* WHERE POPUP DROPDOWN */}
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
                    <span
                      style={{
                        fontSize: '10px',
                        color: 'var(--muted)',
                      }}
                    >
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

        {/* WHEN FIELD */}
        <label
          ref={whenRef}
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => {
            setWhenOpen(true)
            setWhereOpen(false)
          }}
        >
          <CalendarDays size={18} />
          <span>When</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              name="when"
              placeholder="Any month or season"
              value={whenValue}
              onChange={(e) => setWhenValue(e.target.value)}
              onFocus={() => {
                setWhenOpen(true)
                setWhereOpen(false)
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

          {/* WHEN POPUP CALENDAR & SEASON SELECTOR */}
          {whenOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: 'min(380px, 92vw)',
                maxHeight: '380px',
                overflowY: 'auto',
                background: '#ffffff',
                border: '1px solid var(--line)',
                boxShadow: '0 16px 36px rgba(16, 54, 39, 0.16)',
                padding: '14px',
                zIndex: 100,
                cursor: 'default',
              }}
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
                  Select Month or Season
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setWhenValue('')
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
                  Any month
                </button>
              </div>

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
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = 'var(--forest)'
                            e.currentTarget.style.background = '#f2f7f0'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = isCurrent
                              ? 'var(--forest)'
                              : 'var(--line)'
                            e.currentTarget.style.background = isCurrent
                              ? 'var(--mint)'
                              : '#ffffff'
                          }
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
            </div>
          )}
        </label>

        {/* EXPERIENCE FIELD */}
        <label>
          <Compass size={18} />
          <span>Experience</span>
          <select
            name="experience"
            value={experienceValue}
            onChange={(e) => setExperienceValue(e.target.value)}
          >
            <option value="">Any activity</option>
            <option value="farm stay">Farm stay</option>
            <option value="apple orchard">Apple orchard</option>
            <option value="tea plantation">Tea plantation</option>
            <option value="coffee estate">Coffee estate</option>
            <option value="saffron">Saffron fields</option>
            <option value="fruit picking">Fruit picking</option>
            <option value="hurda">Hurda party</option>
            <option value="jaggery">Jaggery making</option>
            <option value="vineyard">Vineyard stay</option>
            <option value="cattle tending">Cattle tending</option>
            <option value="spice plantation">Spice plantation</option>
            <option value="mustard harvest">Mustard harvest</option>
          </select>
          <ChevronDown size={15} />
        </label>

        <button className="search-btn" type="submit">
          <Search size={19} />
          <span>Search farms</span>
        </button>
      </form>
    </div>
  )
}
