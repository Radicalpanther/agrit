'use client'

import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { formatRupees } from '@/lib/money'

export interface ActivityItem {
  id: string
  name: string
  kind: 'farming' | 'culinary' | 'relaxation' | string
  duration_min?: number
  best_months?: number[]
  sort_hint?: string
  day_number?: number
  start_time?: string
  sort_order?: number
  description?: string
  price_paise?: number
}

export interface FarmDayFlowProps {
  farm: {
    id: string
    name: string
    slug: string
    sleeps?: number
    pricePaise: number
    raw?: {
      allows_day_visit?: boolean
      day_visit_start?: string
      day_visit_end?: string
      day_visit_price_paise?: number
      [key: string]: any
    }
    [key: string]: any
  }
  activities: ActivityItem[]
}

const ACTIVITY_DESCRIPTIONS: Record<string, string> = {
  // Kokan Roots
  'Hurda roasting on open hearth': 'Gather around the open hearth to roast fresh winter tender jowar over hot embers.',
  'Morning rice paddy walk': 'Guided dawn walk along terraced bunds to inspect seasonal indigenous rice crops.',
  'Cow milking and shed tending': 'Learn traditional hand-milking routines and feed native Gir cattle with fresh fodder.',
  'Chutney grinding on sil-batta': 'Crush fresh coriander, roasted peanuts, garlic, and wild chilies on hand-carved black granite.',
  'Hammock reading under teakwood': 'Relax with gentle valley breezes under mature teak trees with estate well water.',

  // Aamrai Orchard Escape
  'Alphonso harvest and plucking': 'Hand-pick GI-tagged Alphonso mangoes using traditional cushioned bamboo poles.',
  'Raw mango pickle workshop': 'Slice crisp green mangoes and hand-mix stone-ground mustard, fenugreek, and cold-pressed oil.',
  'Orchard trail and birdwatching': 'Wander quiet shaded orchard paths to spot Malabar hornbills and sunbirds.',
  'Konkani wood-fired fish curry': 'Cook fresh coastal river fish with kokum rind and freshly grated coconut over wood embers.',
  'Sunset tea atop the laterite ridge': 'Sip steaming Konkani lemon grass tea while dusk falls over the laterite hills.',

  // Sahyadri Soil & Soul
  'Desi cow butter churning': 'Churn fresh whole A2 milk curd using a wooden bilona to harvest rich white butter.',
  'Terraced vegetable weeding': 'Join family members in tending chemical-free heirloom hill vegetables on mountain terraces.',
  'Compost making and soil prep': 'Learn ancient Jeevamrutha preparation and vermicomposting for soil enrichment.',
  'Valley breeze meditation sit': 'Quiet guided breathwork sitting on stone ledges overlooking the misty Krishna valley.',
  'Chulha flatbread dinner circle': 'Bake hot bajra bhakri directly on earthen griddles over crackling cow dung hearths.',

  // Gur Ghar Kolhapur
  'Sugarcane harvesting and cutting': 'Cut thick mature sugarcane stalks in the field using traditional curved sickles.',
  'Kolhu bullock press demonstration': 'Watch traditional stone-and-wood cane crushing driven by sturdy indigenous bullocks.',
  'Warm gur tasting and ladle work': 'Skim boiling golden cane juice and taste fresh warm jaggery straight from giant boiling pans.',
  'Village tree shade resting': 'Rest on woven charpais under ancient banyan trees while sharing village folk stories.',

  // Draksha Valley Stay
  'Table grape plucking and packing': 'Snip ripe golden Thompson grape bunches and pack in breathable wooden crates.',
  'Vineyard canopy pruning session': 'Learn delicate grapevine trellising and cane canopy pruning from master viticulturists.',
  'Sun-dried raisin sorting': 'Sort sun-cured sweet raisins on natural bamboo mats under the dry Deccan sun.',
  'Fresh juice pressing workshop': 'Cold-press hand-sorted vineyard grapes into thick unpasteurized sweet purple juice.',
  'Vine row twilight stroll': 'Stroll along sunset trellis rows with panoramic views of the Western Ghat ridgeline.',

  // Spice Hills Homestay
  'Cardamom pod harvest at dawn': 'Gently pluck ripe green cardamom capsules nestled at the base of shade-grown plants.',
  'Black pepper vine hand-picking': 'Climb sturdy wooden ladders to hand-pick peppercorn spikes climbing silver oak trees.',
  'Kerala spice blend roasting': 'Dry-roast whole cloves, cinnamon bark, and nutmeg in cast-iron pans for curry masalas.',
  'Bamboo grove sound walk': 'Immerse in the natural creaking and wind songs of old-growth rainforest bamboo clumps.',
  'Ayurvedic herbal foot soak': 'Soak weary feet in warm copper basins steeped with garden tulsi, eucalyptus, and rock salt.',

  // Sarson da Khet
  'Dawn tractor ride across fields': 'Ride an open tractor trailer into morning mist blanketed across bright yellow mustard fields.',
  'Mustard cutting and bundling': 'Harvest leafy tender mustard greens with hand sickles and tie into traditional burlap bundles.',
  'Saag making in earthenware handi': 'Slow-cook fresh sarson saag in clay pots on low chulha heat with stone-churned butter.',
  'Bhatti tandoor baking': 'Slap crisp corn flour makki rotis onto the white-hot inner clay walls of deep bhatti ovens.',
  'Charpai resting under neem tree': 'Unwind on woven rope cots under towering neem trees drinking buttermilk lassi.',

  // Himachal Apple Highlands
  'Apple harvesting and sorting': 'Climb wooden ladders to harvest crisp Royal Delicious apples into wicker baskets.',
  'Raw apple cider vinegar pressing': 'Crush orchard windfall apples in a heritage press to begin natural wild fermentation.',
  'Cedar forest trail and birding': 'Hike through deodar pine groves listening for Himalayan monal and crested serpent eagles.',
  'Chulha siddu making with walnut chutney': 'Steam traditional stuffed wheat siddu dumplings served with stone-crushed walnut paste.',
  'Pine deck mountain meditation': 'Sit on elevated timber platforms facing snow-capped peaks of the Greater Himalayas.',

  // Pampore Saffron Haven
  'Saffron flower harvesting at sunrise': 'Walk purple karewa plateaus at dawn plucking Crocus flowers before the morning sun opens them.',
  'Kahwa brewing on brass samovar': 'Brew spiced green tea with saffron stigmas, crushed cardamom, and slivered almonds.',
  'Walnut de-husking and sun drying': 'Crack green walnut husks and spread thin-shelled kagzi nuts across courtyard sun mats.',
  'Chinar shade garden contemplation': 'Sit beneath 300-year-old royal Chinar trees listening to nearby Jhelum river breezes.',
  'Wazwan haak-saag cooking class': 'Prepare traditional Kashmiri collard greens simmered gently with whole Kashmiri chilies.',

  // Brahmaputra Heritage Tea Estate
  'Two leaves and a bud tea plucking': 'Learn the rhythmic two-leaves-and-a-bud pluck alongside experienced tea artisans.',
  'Orthodox tea rolling and tasting': 'Hand-roll oxidized tea leaves and cup single-estate golden tippied Orange Pekoe.',
  'Riverbank bamboo weaving session': 'Weave indigenous Assam river baskets with split bamboo strips by the Brahmaputra.',
  'Assamese pitika and fish curry hearth feast': 'Taste wood-smoked mashed potato pitika and fresh river fish sour curry.',
  'Dawn wetland bird trail': 'Spot migratory pelicans and whistling teals along misty riverbank water meadows.',

  // Coorg Cloud Coffee Estate
  'Arabica coffee berry harvest': 'Hand-select crimson ripe coffee cherries along shaded multi-crop hillside rows.',
  'Estate roast and cupping masterclass': 'Roast raw green coffee beans and cup different roast profiles with estate growers.',
  'Pepper and cardamom canopy trail': 'Inspect wild pepper vines winding up tall shade trees in the moist Western Ghats.',
  'Kodava kachampuli curry cooking': 'Cook heritage Kodava vegetable or mushroom curry with tart wild black kachampuli vinegar.',
  'Rainforest stream sit and hammock nap': 'Recline in verandas listening to babbling forest springs and cicada chorus.',

  // Gir Somnath Kesar Grove
  'Gir Kesar mango plucking in orchard': 'Harvest sweet fragrant Gir Kesar mangoes directly from naturally irrigated orchards.',
  'Gir cow feeding and dung cake making': 'Feed holy Gir cows fresh grass and shape traditional organic manure cakes for fuel.',
  'Bajra rotla on earthen tavdi': 'Pound thick pearl millet flatbreads by hand and cook over red step-well firewood.',
  'Step-well heritage walk': 'Explore 400-year-old stone step-wells that have sustained local agriculture for centuries.',
  'Night orchard stargazing': 'Lie under unpolluted Saurashtra night skies listening for distant Asiatic lion roars.',
}

function formatKindTag(kind?: string): string {
  if (!kind) return 'Farming'
  const lower = kind.toLowerCase()
  if (lower.includes('culinary') || lower.includes('food') || lower.includes('cook')) return 'Culinary'
  if (lower.includes('relax') || lower.includes('wellness') || lower.includes('rest')) return 'Relaxation'
  return 'Farming'
}

interface ProcessedActivity {
  id: string
  name: string
  kind: string
  duration_min: number
  best_months: number[]
  day_number: number
  start_time: string
  sort_order: number
  description: string
  price_paise: number
  isSeasonal: boolean
}

export function FarmDayFlow({ farm, activities }: FarmDayFlowProps) {
  const currentMonth = new Date().getMonth() // 0-indexed: 0=Jan ... 11=Dec
  const raw = farm.raw || {}

  // Process and sort activities
  const { activitiesByDay, days } = useMemo(() => {
    if (!activities || activities.length === 0) {
      return { activitiesByDay: {}, days: [] }
    }

    const total = activities.length
    const hasOvernightStay = (farm.sleeps || 0) > 0 || (farm.pricePaise || 0) > 0

    // Group into Day 1, Day 2, Day 3 if multi-day
    const processed: ProcessedActivity[] = activities.map((act, idx) => {
      // Determine day_number
      let dayNumber = 1
      if (typeof act.day_number === 'number' && act.day_number > 0) {
        dayNumber = act.day_number
      } else if (total >= 4 && hasOvernightStay) {
        // Multi-activity overnight farm partition: ~60% Day 1, ~40% Day 2
        dayNumber = idx < Math.ceil(total * 0.6) ? 1 : 2
      }

      // Determine start_time
      let startTime = act.start_time
      if (!startTime) {
        const hint = (act.sort_hint || '').toLowerCase()
        if (dayNumber === 1) {
          if (hint === 'morning') startTime = idx === 0 ? '10:00 AM' : '11:15 AM'
          else if (hint === 'midday') startTime = '12:45 PM'
          else if (hint === 'afternoon') startTime = '03:15 PM'
          else if (hint === 'evening') startTime = '05:30 PM'
          else {
            const seq = ['10:00 AM', '12:30 PM', '03:15 PM', '05:30 PM']
            startTime = seq[idx % seq.length]
          }
        } else {
          // Day 2
          if (hint === 'morning') startTime = '07:30 AM'
          else if (hint === 'midday') startTime = '09:30 AM'
          else startTime = '08:30 AM'
        }
      }

      const sortOrder = typeof act.sort_order === 'number' ? act.sort_order : idx
      const bestMonths = act.best_months || []
      const isSeasonal = bestMonths.length > 0 && !bestMonths.includes(currentMonth)

      const desc =
        act.description ||
        ACTIVITY_DESCRIPTIONS[act.name] ||
        `Hands-on ${act.kind || 'farming'} experience guided by your host in the ${act.sort_hint || 'day'}.`

      return {
        id: act.id,
        name: act.name,
        kind: formatKindTag(act.kind),
        duration_min: act.duration_min || 60,
        best_months: bestMonths,
        day_number: dayNumber,
        start_time: startTime,
        sort_order: sortOrder,
        description: desc,
        price_paise: act.price_paise || 0,
        isSeasonal,
      }
    })

    // Sort by day_number, then start_time, then sort_order
    processed.sort((a, b) => {
      if (a.day_number !== b.day_number) return a.day_number - b.day_number
      if (a.start_time !== b.start_time) return a.start_time.localeCompare(b.start_time)
      return a.sort_order - b.sort_order
    })

    const grouped: Record<number, ProcessedActivity[]> = {}
    for (const item of processed) {
      if (!grouped[item.day_number]) {
        grouped[item.day_number] = []
      }
      grouped[item.day_number].push(item)
    }

    const availableDays = Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b)

    return { activitiesByDay: grouped, days: availableDays }
  }, [activities, farm, currentMonth])

  // Active day tab state: Day visitors see Day 1 first
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const t = useTranslations('farmDetail.itinerary')
  const locale = useLocale()

  // If farm has no activities, hide the section
  if (!activities || activities.length === 0 || days.length === 0) {
    return null
  }

  const activeDayActivities = activitiesByDay[selectedDay] || activitiesByDay[days[0]] || []

  // Arrival and departure times
  const dayVisitStart = raw.day_visit_start ? raw.day_visit_start.slice(0, 5) : '09:30 AM'
  const dayVisitEnd = raw.day_visit_end ? raw.day_visit_end.slice(0, 5) : '05:00 PM'
  const overnightCheckIn = '12:00 PM'
  const overnightCheckOut = '11:00 AM'

  const isFirstDay = selectedDay === days[0]
  const isLastDay = selectedDay === days[days.length - 1]

  const arriveTime = isFirstDay
    ? (raw.allows_day_visit ? dayVisitStart : overnightCheckIn)
    : '07:00 AM'

  const departTime = isLastDay
    ? (raw.allows_day_visit && days.length === 1 ? dayVisitEnd : overnightCheckOut)
    : '08:30 PM'

  return (
    <section className="farm-flow-section" aria-label="A day at the farm">
      <div style={{ marginBottom: '16px' }}>
        <p className="section-kicker" style={{ margin: '0 0 4px' }}>{t('kicker')}</p>
        <h2 style={{ fontSize: '22px', letterSpacing: '-0.5px', margin: 0, color: 'var(--ink)' }}>
          {t('heading')}
        </h2>
      </div>

      {/* Tabs if activities exist for more than one day. Day visitors see Day 1 first. */}
      {days.length > 1 && (
        <div className="farm-flow-tabs" role="tablist">
          {days.map((dayNum) => {
            const isActive = selectedDay === dayNum
            return (
              <button
                key={dayNum}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedDay(dayNum)}
                className={`farm-flow-tab-btn ${isActive ? 'is-active' : ''}`}
              >
                {t('dayTab', { day: dayNum })}
              </button>
            )
          })}
        </div>
      )}

      {/* Vertical flowchart timeline */}
      <div className="farm-flow-timeline">
        {/* Continuous thin vertical spine in var(--line) */}
        <div className="farm-flow-spine" aria-hidden="true" />

        {/* 1. Arrive Node */}
        {/* 1. Arrive Node */}
        <div className="farm-flow-node-wrap">
          {/* Filled var(--forest) square marker */}
          <div className="farm-flow-marker is-forest-filled" aria-hidden="true" />

          <div className="farm-flow-card">
            <div className="farm-flow-card-head">
              <span className="farm-flow-time">{arriveTime}</span>
            </div>
            <div className="farm-flow-title-row">
              <h3 className="farm-flow-title">{t('arrive')}</h3>
              <span className="farm-flow-duration">
                {isFirstDay ? 'Check-in & welcome' : 'Morning dawn start'}
              </span>
            </div>
            <p className="farm-flow-desc">
              {isFirstDay
                ? 'Meet your host family, settle in with authentic farm refreshments, and receive a short property orientation.'
                : 'Wake up to crisp rural birdsong and hot wood-fired tea or fresh estate milk on the veranda.'}
            </p>
          </div>

          {/* Small chevron between nodes showing direction of flow */}
          <div className="farm-flow-chevron" aria-hidden="true">
            <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
              <path d="M1.5 1.5L5 5L8.5 1.5" stroke="var(--forest)" strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="miter" />
            </svg>
          </div>
        </div>

        {/* 2. Intermediate Activity Nodes */}
        {activeDayActivities.map((act) => {
          return (
            <div className="farm-flow-node-wrap" key={act.id}>
              {/* Square marker on spine */}
              <div
                className={`farm-flow-marker ${act.isSeasonal ? 'is-seasonal' : 'is-activity'}`}
                aria-hidden="true"
              />

              <div className={`farm-flow-card ${act.isSeasonal ? 'is-seasonal' : ''}`}>
                <div className="farm-flow-card-head">
                  <span className="farm-flow-time">{act.start_time}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {act.isSeasonal && (
                      <span className="farm-flow-seasonal-tag">{t('seasonal')}</span>
                    )}
                    <span className="farm-flow-kind-tag">{act.kind}</span>
                    {act.price_paise > 0 && (
                      <span className="farm-flow-price">
                        {formatRupees(act.price_paise, locale)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="farm-flow-title-row">
                  <h3 className="farm-flow-title">{act.name}</h3>
                  <span className="farm-flow-duration">{t('mins', { count: act.duration_min })}</span>
                </div>

                <p className="farm-flow-desc">{act.description}</p>
              </div>

              {/* Small chevron between nodes */}
              <div className="farm-flow-chevron" aria-hidden="true">
                <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                  <path d="M1.5 1.5L5 5L8.5 1.5" stroke="var(--forest)" strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="miter" />
                </svg>
              </div>
            </div>
          )
        })}

        {/* 3. Depart Node */}
        <div className="farm-flow-node-wrap">
          {/* Filled var(--forest) square marker */}
          <div className="farm-flow-marker is-forest-filled" aria-hidden="true" />

          <div className="farm-flow-card">
            <div className="farm-flow-card-head">
              <span className="farm-flow-time">{departTime}</span>
            </div>
            <div className="farm-flow-title-row">
              <h3 className="farm-flow-title">{t('depart')}</h3>
              <span className="farm-flow-duration">
                {isLastDay ? 'Farewell & checkout' : 'Day 1 departure'}
              </span>
            </div>
            <p className="farm-flow-desc">
              Collect your reserved artisanal farm produce, exchange warm farewells with host family, and conclude your stay.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
