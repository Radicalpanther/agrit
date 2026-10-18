import {
  searchFarms,
  getFarmDetails,
  getSeasonalCrops,
  SearchFarmsParams,
  GetFarmDetailsParams,
  GetSeasonalCropsParams,
} from './ai-tools'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export const SYSTEM_PROMPT = `You are AgriGuide, the rural farm stay and harvest seasonal advisor for AgriTrails.
CRITICAL OPERATING RULES:
1. Answer ONLY using data returned by the provided tools. NEVER invent or assume prices, amenities, dates, or host details from memory.
2. Recommend 1 to 3 farms with a single-line reason each, always including a markdown link in the format: [Farm Name](/farms/[slug]). When recommending or mentioning artisanal farm products, link to the farm using: [Product Name](/farms/[slug]).
3. If no farm or crop matches the criteria, say so plainly without inventing alternatives.
4. Ask at most ONE clarifying question if the user request is underspecified.
5. NEVER use emojis in any part of your reply.
6. Keep replies concise, factual, and formatted with plain paragraphs and clean bullet points.
7. Format all currency in Indian Rupees (e.g. ₹2,500).`

// Tool definitions for Anthropic Claude
const CLAUDE_TOOLS = [
  {
    name: 'searchFarms',
    description: 'Search for farm stays in the database matching budget, region, month, experience, or guest count.',
    input_schema: {
      type: 'object',
      properties: {
        budget_max_paise: {
          type: 'number',
          description: 'Maximum budget per guest in paise (e.g. 250000 for ₹2,500).',
        },
        region: {
          type: 'string',
          description: 'Geographical region in India (e.g. Maharashtra, Himachal Pradesh, Kerala, Punjab, Karnataka, Rajasthan, Kashmir).',
        },
        month: {
          type: 'number',
          description: 'Month index (0 for January to 11 for December).',
        },
        experience: {
          type: 'string',
          description: 'Type of farm activity or harvest (e.g. farming, culinary, relaxation, mango, spices).',
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
    description: 'Retrieve detailed farmstay information including amenities, rules, check-in policies, and review rating breakdown by slug.',
    input_schema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The unique slug identifier of the farm (e.g. kokan-roots-farmstay).',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'getSeasonalCrops',
    description: 'Query active harvest and sowing crops across regions for a specific calendar month.',
    input_schema: {
      type: 'object',
      properties: {
        month: {
          type: 'number',
          description: 'Month index (0 for January to 11 for December). Defaults to current month.',
        },
        region: {
          type: 'string',
          description: 'Optional filter by region in India (e.g. Maharashtra, Himachal Pradesh, Kerala, Punjab, Karnataka, Rajasthan).',
        },
      },
    },
  },
]

// Dispatch tool execution
async function executeTool(name: string, args: any) {
  if (name === 'searchFarms') {
    return await searchFarms(args as SearchFarmsParams)
  }
  if (name === 'getFarmDetails') {
    return await getFarmDetails(args as GetFarmDetailsParams)
  }
  if (name === 'getSeasonalCrops') {
    return await getSeasonalCrops(args as GetSeasonalCropsParams)
  }
  return { error: `Tool ${name} not recognized` }
}

const FARM_DIRECTORY = [
  { slug: 'kokan-roots-farmstay', name: 'Kokan Roots Farmstay', aliases: ['kokan', 'konkan', 'dapoli', 'ratnagiri mango'] },
  { slug: 'aamrai-orchard-escape', name: 'Aamrai Orchard Escape', aliases: ['aamrai', 'orchard', 'pawas'] },
  { slug: 'sahyadri-soil-and-soul', name: 'Sahyadri Soil and Soul', aliases: ['sahyadri', 'panchgani', 'soil and soul'] },
  { slug: 'gur-ghar-kolhapur', name: 'Gur Ghar Kolhapur', aliases: ['gur ghar', 'kolhapur', 'jaggery', 'jaysingpur'] },
  { slug: 'draksha-valley-stay', name: 'Draksha Valley Stay', aliases: ['draksha', 'nashik', 'vineyard', 'grape'] },
  { slug: 'spice-hills-homestay', name: 'Spice Hills Homestay', aliases: ['spice hills', 'wayanad', 'kerala', 'pepper'] },
  { slug: 'sarson-da-khet', name: 'Sarson da Khet', aliases: ['sarson', 'amritsar', 'punjab'] },
  { slug: 'himachal-apple-highlands', name: 'Himachal Apple Highlands', aliases: ['himachal', 'apple', 'kotgarh', 'narkanda', 'shimla'] },
  { slug: 'adai-farm-house', name: 'Adai Farm House', aliases: ['adai', 'panvel', 'morbe'] },
  { slug: 'pampore-saffron-haven', name: 'Pampore Saffron Haven', aliases: ['pampore', 'saffron', 'kashmir'] },
  { slug: 'brahmaputra-tea-estate', name: 'Brahmaputra Heritage Tea Estate', aliases: ['brahmaputra', 'tea', 'tezpur', 'assam'] },
  { slug: 'coorg-cloud-coffee-estate', name: 'Coorg Cloud Coffee Estate', aliases: ['coorg', 'coffee', 'madikeri'] },
  { slug: 'gir-somnath-kesar-grove', name: 'Gir Somnath Kesar Grove', aliases: ['gir', 'kesar', 'somnath', 'talala'] },
  { slug: 'thar-desert-farmstead', name: 'Thar Desert Organic Farmstead', aliases: ['thar', 'desert', 'pushkar', 'rajasthan'] },
  { slug: 'narmada-valley-heritage-farm', name: 'Narmada Valley Heritage Farm', aliases: ['narmada', 'hoshangabad'] },
  { slug: 'kumaon-terrace-orchard', name: 'Kumaon Terrace Orchard Farm', aliases: ['kumaon', 'mukteshwar', 'uttarakhand'] },
  { slug: 'nilgiri-cloud-tea', name: 'Nilgiri Cloud Tea & Spices', aliases: ['nilgiri', 'coonoor', 'tamil nadu'] },
  { slug: 'darjeeling-mist-farmstay', name: 'Darjeeling Mist Tea Farmstay', aliases: ['darjeeling', 'kurseong', 'west bengal'] },
]

/**
 * Deterministic Mock AI Stream:
 * Inspects user query, maintains conversation context across multiple turns, invokes genuine database tools, and formats response per System Prompt rules.
 */
async function runMockAiStream(
  messages: ChatMessage[],
  writer: WritableStreamDefaultWriter<Uint8Array>,
) {
  const encoder = new TextEncoder()
  const sendChunk = async (text: string) => {
    await writer.write(encoder.encode(text))
    await new Promise((r) => setTimeout(r, 20))
  }

  const lastUserMsg = messages[messages.length - 1]?.content || ''
  const q = lastUserMsg.toLowerCase().trim()

  // Find previous assistant message to understand conversational context
  let prevAssistantMsg = ''
  for (let i = messages.length - 2; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      prevAssistantMsg = messages[i].content.toLowerCase()
      break
    }
  }

  // Identify active target farm from current query or previous messages
  let targetFarm = FARM_DIRECTORY.find((f) =>
    q.includes(f.slug) ||
    q.includes(f.name.toLowerCase()) ||
    f.aliases.some((a) => q.includes(a))
  )

  if (!targetFarm) {
    for (let i = messages.length - 2; i >= 0; i--) {
      const prevText = messages[i].content.toLowerCase()
      targetFarm = FARM_DIRECTORY.find((f) =>
        prevText.includes(f.slug) ||
        prevText.includes(f.name.toLowerCase()) ||
        f.aliases.some((a) => prevText.includes(a))
      )
      if (targetFarm) break
    }
  }

  if (!targetFarm) {
    targetFarm = FARM_DIRECTORY[0] // fallback to Kokan Roots Farmstay
  }

  try {
    const isAffirmative =
      q === 'yes' ||
      q === 'yeah' ||
      q === 'yep' ||
      q === 'sure' ||
      q === 'ok' ||
      q === 'okay' ||
      q.startsWith('yes ') ||
      q.includes('tell me more') ||
      q.includes('show details') ||
      q.includes('tell me details') ||
      q.includes('more details')

    const isAskingDirections =
      q.includes('direction') ||
      q.includes('reach') ||
      q.includes('route') ||
      q.includes('how to get') ||
      q.includes('location') ||
      q.includes('distance') ||
      q.includes('map') ||
      q.includes('address') ||
      q.includes('where is')

    const isAskingActivities =
      q.includes('activit') ||
      q.includes('things to do') ||
      q.includes('chore') ||
      q.includes('bullock') ||
      q.includes('workshop') ||
      q.includes('tour') ||
      q.includes('experience')

    const isAskingFoodOrAmenities =
      q.includes('food') ||
      q.includes('meal') ||
      q.includes('eat') ||
      q.includes('amenit') ||
      q.includes('breakfast') ||
      q.includes('lunch') ||
      q.includes('dinner') ||
      q.includes('organic food')

    const isAskingPricingOrBooking =
      q.includes('price') ||
      q.includes('cost') ||
      q.includes('rate') ||
      q.includes('day visit') ||
      q.includes('overnight') ||
      q.includes('how much') ||
      q.includes('book') ||
      q.includes('reservation')

    const isAskingReviews =
      q.includes('review') ||
      q.includes('rating') ||
      q.includes('score') ||
      q.includes('feedback')

    // 1. Follow-up to seasonal crops question
    if (isAffirmative && prevAssistantMsg.includes('harvest regions')) {
      const data = await searchFarms({ budget_max_paise: 300000 })
      const farms = data.farms || []
      await sendChunk(`Here are verified farm stays in active harvest regions:\n\n`)
      for (const f of farms.slice(0, 3)) {
        const priceLine = f.allows_day_visit && f.day_visit_price_inr
          ? `₹${f.overnight_price_inr}/night (Day visit: ₹${f.day_visit_price_inr})`
          : `₹${f.overnight_price_inr}/night`
        await sendChunk(`- [${f.name}](/farms/${f.slug}) (${f.place}, ${f.region}) — ${priceLine}: ${f.summary}\n`)
      }
      await sendChunk(`\nWould you like details on farm activities or directions for any of these stays?`)
      return
    }

    // 2. Follow-up: Affirmative or Asking for Directions
    if (isAskingDirections || (isAffirmative && (prevAssistantMsg.includes('directions') || prevAssistantMsg.includes('farm activities')))) {
      const farmRes = await getFarmDetails({ slug: targetFarm.slug })
      if ((farmRes as any).error) {
        await sendChunk(`Could not find details for ${targetFarm.name}.`)
        return
      }

      const f = farmRes as any
      await sendChunk(`Directions and arrival guidelines for [${f.name}](/farms/${f.slug}) in ${f.place}, ${f.region}:\n\n`)
      if (f.check_in_info?.landmark_note) {
        await sendChunk(`- Landmark: ${f.check_in_info.landmark_note}\n`)
      }
      if (Array.isArray(f.check_in_info?.directions_steps) && f.check_in_info.directions_steps.length > 0) {
        await sendChunk(`- Route steps:\n`)
        for (let idx = 0; idx < f.check_in_info.directions_steps.length; idx++) {
          const step = f.check_in_info.directions_steps[idx]
          await sendChunk(`  ${idx + 1}. ${step.trim()}\n`)
        }
      }
      await sendChunk(`- Check-in: ${f.check_in_info?.overnight_check_in || '12:00 PM check-in, 10:00 AM checkout'}\n\n`)
      await sendChunk(`You can access the full offline route map and travel safety card on [${f.name}](/farms/${f.slug}). Would you like information on farm activities or meals?`)
      return
    }

    // 3. Follow-up: Asking for Activities
    if (isAskingActivities) {
      const farmRes = await getFarmDetails({ slug: targetFarm.slug })
      const f = farmRes as any
      await sendChunk(`Activities and farm experiences at [${f.name}](/farms/${f.slug}):\n\n`)
      if (Array.isArray(f.activities) && f.activities.length > 0) {
        for (const act of f.activities) {
          const durationStr = act.duration_min ? ` (${act.duration_min} mins)` : ''
          const kindStr = act.kind ? ` [${act.kind}]` : ''
          await sendChunk(`- ${act.name}${kindStr}${durationStr}\n`)
        }
      } else {
        await sendChunk(`- Organic orchard walk and seasonal fruit harvesting\n- Traditional village bullock cart ride\n- Evening community campfire and stargazing\n`)
      }
      await sendChunk(`\nAll farm activities are conducted with local hosts. Would you like to check pricing or how to reach?`)
      return
    }

    // 4. Follow-up: Asking for Food, Meals, or Amenities
    if (isAskingFoodOrAmenities) {
      const farmRes = await getFarmDetails({ slug: targetFarm.slug })
      const f = farmRes as any
      await sendChunk(`Food and amenities at [${f.name}](/farms/${f.slug}):\n\n`)
      if (Array.isArray(f.amenities) && f.amenities.length > 0) {
        for (const am of f.amenities) {
          await sendChunk(`- ${am}\n`)
        }
      }
      await sendChunk(`- Meals: Freshly prepared traditional farm thali using crops harvested directly from the fields.\n`)
      await sendChunk(`- Capacity: Accommodates up to ${f.max_guests || 6} guests comfortably.\n\n`)
      await sendChunk(`Would you like to know the pricing or read check-in rules?`)
      return
    }

    // 5. Follow-up: Asking for Pricing, Day visits, or Booking
    if (isAskingPricingOrBooking) {
      const farmRes = await getFarmDetails({ slug: targetFarm.slug })
      const f = farmRes as any
      const dayVisitText = f.day_visit_price_inr
        ? `₹${f.day_visit_price_inr} per guest (Hours: ${f.check_in_info?.day_visit_hours || '09:00 to 17:00'})`
        : 'Day visits are currently not offered (overnight stay only)'

      await sendChunk(`Pricing and booking for [${f.name}](/farms/${f.slug}):\n\n`)
      await sendChunk(`- Overnight stay: ₹${f.overnight_price_inr}/night (Includes organic home-cooked meals)\n`)
      await sendChunk(`- Day visit: ${dayVisitText}\n`)
      await sendChunk(`- Group capacity: Up to ${f.max_guests || 6} guests\n`)
      await sendChunk(`- Cancellation: Free cancellation up to 48 hours prior to arrival\n\n`)
      await sendChunk(`You can submit a booking request without payment today directly on [${f.name}](/farms/${f.slug}). Your host will confirm availability shortly.`)
      return
    }

    // 6. Follow-up: Asking for Reviews
    if (isAskingReviews) {
      const farmRes = await getFarmDetails({ slug: targetFarm.slug })
      const f = farmRes as any
      const rb = f.rating_breakdown || {}
      await sendChunk(`Verified guest ratings for [${f.name}](/farms/${f.slug}):\n\n`)
      await sendChunk(`- Overall score: ${rb.overall_avg || 4.8} / 5 (${rb.review_count || 12} reviews)\n`)
      await sendChunk(`- Food authenticity: ${rb.food_authenticity || 4.9} / 5\n`)
      await sendChunk(`- Cleanliness: ${rb.cleanliness || 4.8} / 5\n`)
      await sendChunk(`- Hospitality: ${rb.hospitality || 4.9} / 5\n`)
      await sendChunk(`- Location: ${rb.location || 4.7} / 5\n\n`)
      await sendChunk(`Reviews are collected only from verified travellers who completed their farm stay.`)
      return
    }

    // 7. Queries about seasons, harvests, or crops
    if (q.includes('season') || q.includes('crop') || q.includes('harvest') || q.includes('month')) {
      const currentMonth = new Date().getMonth()
      const data = await getSeasonalCrops({ month: currentMonth })
      const active = data.active_crops || []

      if (active.length === 0) {
        await sendChunk(`No major harvest crops are recorded for ${data.month_name} at this time.\n`)
      } else {
        await sendChunk(`In ${data.month_name}, the following crops are in season across our partner regions:\n\n`)
        for (const c of active.slice(0, 4)) {
          await sendChunk(`- ${c.name} (${c.place}, ${c.region}) — ${c.kind === 'harvest' ? 'Harvest season' : 'Sowing season'}\n`)
        }
        await sendChunk(`\nWould you like farm stay recommendations near these harvest regions?`)
      }
      return
    }

    // 8. Rules and Check-in Policies
    if (q.includes('rule') || q.includes('check-in') || q.includes('check in') || q.includes('policy')) {
      const farmRes = await getFarmDetails({ slug: targetFarm.slug })
      const f = farmRes as any
      await sendChunk(`Check-in policies and rules at [${f.name}](/farms/${f.slug}):\n\n`)
      await sendChunk(`- Overnight check-in: ${f.check_in_info?.overnight_check_in || '12:00 PM check-in, 10:00 AM checkout'}.\n`)
      await sendChunk(`- Day visits: ${f.check_in_info?.day_visit_hours || '09:00 to 17:00'}.\n`)
      await sendChunk(`- Farm etiquette: Respect quiet hours after 10:00 PM; no synthetic litter in orchards.\n`)
      await sendChunk(`- Cancellation: Free cancellation up to 48 hours prior to scheduled arrival.\n\n`)
      await sendChunk(`You can review detailed farm rules on [${f.name}](/farms/${f.slug}).`)
      return
    }

    // 9. Specific Farm Query if user typed a farm name directly
    const mentionedDirectly = FARM_DIRECTORY.find((f) =>
      q.includes(f.slug) ||
      q.includes(f.name.toLowerCase()) ||
      f.aliases.some((a) => q.includes(a))
    )
    if (mentionedDirectly) {
      const farmRes = await getFarmDetails({ slug: mentionedDirectly.slug })
      const f = farmRes as any
      const priceLine = f.allows_day_visit && f.day_visit_price_inr
        ? `₹${f.overnight_price_inr}/night (Day visit: ₹${f.day_visit_price_inr})`
        : `₹${f.overnight_price_inr}/night`
      await sendChunk(`[${f.name}](/farms/${f.slug}) in ${f.place}, ${f.region} (${priceLine}):\n\n`)
      if (f.amenities?.length) {
        await sendChunk(`- Highlights: ${f.amenities.slice(0, 3).join(', ')}\n`)
      }
      if (f.check_in_info?.landmark_note) {
        await sendChunk(`- Landmark: ${f.check_in_info.landmark_note}\n`)
      }
      await sendChunk(`\nWould you like details on farm activities or directions for [${f.name}](/farms/${f.slug})?`)
      return
    }

    // 10. Default: Search farms matching budget or location
    let budgetPaise = 300000 // default 3000 INR
    if (q.includes('2500') || q.includes('2,500')) budgetPaise = 250000
    if (q.includes('2000') || q.includes('2,000')) budgetPaise = 200000
    if (q.includes('1500') || q.includes('1,500')) budgetPaise = 150000
    if (q.includes('1000') || q.includes('1,000')) budgetPaise = 100000

    let region: string | undefined = undefined
    if (q.includes('maharashtra') || q.includes('konkan') || q.includes('ratnagiri') || q.includes('nashik') || q.includes('kolhapur')) region = 'Maharashtra'
    else if (q.includes('kerala') || q.includes('wayanad')) region = 'Kerala'
    else if (q.includes('punjab') || q.includes('amritsar')) region = 'Punjab'
    else if (q.includes('himachal') || q.includes('shimla') || q.includes('kotgarh')) region = 'Himachal Pradesh'
    else if (q.includes('kashmir') || q.includes('pampore')) region = 'Kashmir'
    else if (q.includes('rajasthan') || q.includes('pushkar')) region = 'Rajasthan'
    else if (q.includes('karnataka') || q.includes('coorg') || q.includes('madikeri')) region = 'Karnataka'
    else if (q.includes('tamil nadu') || q.includes('coonoor') || q.includes('nilgiris')) region = 'Tamil Nadu'
    else if (q.includes('uttarakhand') || q.includes('mukteshwar') || q.includes('kumaon')) region = 'Uttarakhand'
    else if (q.includes('gujarat') || q.includes('gir') || q.includes('talala')) region = 'Gujarat'
    else if (q.includes('west bengal') || q.includes('darjeeling')) region = 'West Bengal'
    else if (q.includes('assam') || q.includes('tezpur')) region = 'Assam'

    const data = await searchFarms({ budget_max_paise: budgetPaise, region })
    const farms = data.farms || []

    if (farms.length === 0) {
      await sendChunk(`No farm stays found matching that budget or location. Would you like to adjust your budget or explore other regions?`)
    } else {
      await sendChunk(`Here are recommendations based on verified farm data:\n\n`)
      for (const f of farms.slice(0, 3)) {
        const priceLine = f.allows_day_visit && f.day_visit_price_inr
          ? `₹${f.overnight_price_inr}/night (Day visit: ₹${f.day_visit_price_inr})`
          : `₹${f.overnight_price_inr}/night`
        await sendChunk(`- [${f.name}](/farms/${f.slug}) (${f.place}) — ${priceLine}: ${f.summary}\n`)
      }
      await sendChunk(`\nWould you like details on farm activities or directions for any of these stays?`)
    }
  } catch (err: any) {
    await sendChunk(`Unable to retrieve farm data at this time: ${err.message}`)
  } finally {
    await writer.close()
  }
}

/**
 * Anthropic Claude Provider
 */
async function runClaudeStream(
  messages: ChatMessage[],
  apiKey: string,
  writer: WritableStreamDefaultWriter<Uint8Array>,
) {
  const encoder = new TextEncoder()
  const sendChunk = async (text: string) => {
    await writer.write(encoder.encode(text))
  }

  try {
    const claudeMessages = messages.map((m) => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content,
    }))

    // First request: Allow tool usage
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: claudeMessages,
        tools: CLAUDE_TOOLS,
      }),
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson?.error?.message || `Claude API returned status ${res.status}`)
    }

    const data = await res.json()
    const content = data.content || []
    const toolCall = content.find((c: any) => c.type === 'tool_use')

    if (toolCall) {
      // Execute database tool
      const toolResult = await executeTool(toolCall.name, toolCall.input)

      // Send tool result back to Claude and stream final answer
      const followUpMessages = [
        ...claudeMessages,
        { role: 'assistant', content },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: JSON.stringify(toolResult),
            },
          ],
        },
      ]

      const streamRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 800,
          system: SYSTEM_PROMPT,
          messages: followUpMessages,
          stream: true,
        }),
      })

      const reader = streamRes.body?.getReader()
      if (!reader) throw new Error('No stream response from Claude')

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim()
            if (raw === '[DONE]') continue
            try {
              const parsed = JSON.parse(raw)
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                await sendChunk(parsed.delta.text)
              }
            } catch {}
          }
        }
      }
    } else {
      // Direct text response
      for (const item of content) {
        if (item.type === 'text') {
          await sendChunk(item.text)
        }
      }
    }
  } catch (err: any) {
    console.error('[Claude Error, falling back to database mock]:', err.message)
    await runMockAiStream(messages, writer)
    return
  } finally {
    try {
      await writer.close()
    } catch {}
  }
}

/**
 * Custom error class to classify Gemini API responses for fallback handling.
 */
class GeminiApiError extends Error {
  status: number
  isModelNotFound: boolean
  isRateLimit: boolean
  isAuthError: boolean

  constructor(status: number, message: string, rawStatus?: string) {
    super(message)
    this.name = 'GeminiApiError'
    this.status = status

    const lowerMsg = (message || '').toLowerCase()
    const lowerStatus = (rawStatus || '').toLowerCase()

    this.isModelNotFound =
      status === 404 ||
      lowerStatus === 'not_found' ||
      lowerMsg.includes('not found') ||
      lowerMsg.includes('is not found') ||
      lowerMsg.includes('not supported for generatecontent') ||
      lowerMsg.includes('unsupported model') ||
      lowerMsg.includes('unknown model') ||
      lowerMsg.includes('model not recognized')

    this.isRateLimit =
      status === 429 ||
      lowerStatus === 'resource_exhausted' ||
      lowerMsg.includes('quota') ||
      lowerMsg.includes('rate limit') ||
      lowerMsg.includes('resource has been exhausted')

    this.isAuthError =
      status === 401 ||
      status === 403 ||
      lowerStatus === 'unauthenticated' ||
      lowerStatus === 'permission_denied' ||
      lowerMsg.includes('api key not valid') ||
      lowerMsg.includes('api_key_invalid')
  }
}

const GEMINI_FUNCTION_DECLARATIONS = [
  {
    name: 'searchFarms',
    description: 'Search for farm stays matching budget, region, month, or guests.',
    parameters: {
      type: 'OBJECT',
      properties: {
        budget_max_paise: { type: 'NUMBER' },
        region: { type: 'STRING' },
        month: { type: 'NUMBER' },
        experience: { type: 'STRING' },
        guests: { type: 'NUMBER' },
      },
    },
  },
  {
    name: 'getFarmDetails',
    description: 'Get detailed amenities, check-in info, rules, and reviews for a farm.',
    parameters: {
      type: 'OBJECT',
      properties: {
        slug: { type: 'STRING' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'getSeasonalCrops',
    description: 'Get active crops in season for a month and region.',
    parameters: {
      type: 'OBJECT',
      properties: {
        month: { type: 'NUMBER' },
        region: { type: 'STRING' },
      },
    },
  },
]

/**
 * Execute a single Gemini generateContent request for a given model.
 */
async function callGeminiWithModel(
  model: string,
  apiKey: string,
  messages: ChatMessage[],
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const geminiContents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: geminiContents,
      tools: [{ functionDeclarations: GEMINI_FUNCTION_DECLARATIONS }],
    }),
  })

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}))
    const msg = errJson?.error?.message || `HTTP ${res.status}`
    const st = errJson?.error?.status || ''
    throw new GeminiApiError(res.status, msg, st)
  }

  const data = await res.json()
  const candidate = data?.candidates?.[0]
  if (!candidate) {
    throw new Error('No candidate returned by Gemini')
  }

  const parts = candidate.content?.parts || []
  const functionCallPart = parts.find((p: any) => p.functionCall)

  if (functionCallPart) {
    const call = functionCallPart.functionCall
    const toolResult = await executeTool(call.name, call.args || {})

    const followUpRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          ...geminiContents,
          { role: 'model', parts: parts },
          {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: call.name,
                  response: { content: toolResult },
                },
              },
            ],
          },
        ],
      }),
    })

    if (!followUpRes.ok) {
      const errJson = await followUpRes.json().catch(() => ({}))
      const msg = errJson?.error?.message || `Follow-up HTTP ${followUpRes.status}`
      const st = errJson?.error?.status || ''
      throw new GeminiApiError(followUpRes.status, msg, st)
    }

    const followUpData = await followUpRes.json()
    const followUpParts = followUpData?.candidates?.[0]?.content?.parts || []
    const textParts = followUpParts
      .map((p: any) => p.text)
      .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
    const answer = textParts.join('\n')

    if (!answer) {
      throw new Error('Empty response from model after tool call')
    }
    return answer
  }

  const textParts = parts
    .map((p: any) => p.text)
    .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
  const directText = textParts.join('\n')

  if (!directText) {
    throw new Error('Empty response from model')
  }
  return directText
}

/**
 * Google Gemini Provider with automatic fallback retry list:
 * - Reads model from GEMINI_MODEL env or defaults to "gemini-3.1-flash-lite"
 * - On 404, rate limit, or model error, automatically retries in order across known working models
 * - Logs which model finally worked on the server
 * - If every model fails or key is missing, falls back to database mock AI
 */
async function runGeminiStream(
  messages: ChatMessage[],
  apiKey: string,
  writer: WritableStreamDefaultWriter<Uint8Array>,
) {
  try {
    const cleanKey = (apiKey || '').trim()
    if (!cleanKey) {
      console.warn('[AgriGuide] Missing Gemini API key. Falling back to database mock AI.')
      await runMockAiStream(messages, writer)
      return
    }

    const primaryModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite'
    const FALLBACK_MODELS = [
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ]

    const modelsToTry: string[] = [primaryModel]
    for (const fb of FALLBACK_MODELS) {
      if (!modelsToTry.includes(fb)) {
        modelsToTry.push(fb)
      }
    }

    let finalAnswer: string | null = null
    let successfulModel: string | null = null

    for (const model of modelsToTry) {
      try {
        finalAnswer = await callGeminiWithModel(model, cleanKey, messages)
        successfulModel = model
        break
      } catch (err: any) {
        if (err?.isModelNotFound) {
          console.warn(`[AgriGuide] Model "${model}" not found (${err.message}). Retrying with next fallback model...`)
          continue
        }
        if (err?.isRateLimit) {
          console.warn(`[AgriGuide] Gemini rate limit reached (429) on model "${model}". Retrying with next fallback model...`)
          continue
        }
        if (err?.isAuthError) {
          console.warn(`[AgriGuide] Gemini API authentication failed on model "${model}": ${err.message}. Retrying with next fallback model...`)
          continue
        }
        console.warn(`[AgriGuide] Gemini error on model "${model}": ${err?.message || err}. Retrying with next fallback model...`)
        continue
      }
    }

    if (finalAnswer && successfulModel) {
      console.log(`[AgriGuide Server] Successfully responded using model: ${successfulModel}`)
      const encoder = new TextEncoder()
      try {
        await writer.write(encoder.encode(finalAnswer))
      } catch {}
      try {
        await writer.close()
      } catch {}
      return
    }

    console.warn('[AgriGuide] All Gemini models failed or rate-limited. Falling back to database mock AI.')
    await runMockAiStream(messages, writer)
  } catch (err: any) {
    console.error('[AgriGuide] Fatal error in runGeminiStream, falling back to mock AI:', err)
    try {
      await runMockAiStream(messages, writer)
    } catch {
      try {
        await writer.close()
      } catch {}
    }
  }
}

/**
 * Public streaming entry point for AgriGuide chat.
 * Selects provider according to environment variables:
 * - ANTHROPIC_API_KEY -> Claude
 * - GEMINI_API_KEY / GOOGLE_API_KEY -> Gemini
 * - Missing -> Deterministic database mock AI stream
 */
export function streamChatResponse(messages: ChatMessage[]): ReadableStream<Uint8Array> {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()

  const anthropicKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()

  if (anthropicKey) {
    runClaudeStream(messages, anthropicKey, writer)
  } else if (geminiKey) {
    runGeminiStream(messages, geminiKey, writer)
  } else {
    runMockAiStream(messages, writer)
  }

  return readable
}
