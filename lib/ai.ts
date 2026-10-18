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
2. Recommend 1 to 3 farms with a single-line reason each, always including a markdown link in the format: [Farm Name](/farms/[slug]).
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
          description: 'Geographical region (e.g. Maharashtra, Kerala, Punjab).',
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
          description: 'Optional filter by region (e.g. Maharashtra, Kerala, Punjab).',
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

/**
 * Deterministic Mock AI Stream:
 * Inspects user query, invokes genuine database tools, and formats response per System Prompt rules.
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
  const q = lastUserMsg.toLowerCase()

  try {
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
    } else if (q.includes('rule') || q.includes('check-in') || q.includes('check in') || q.includes('policy')) {
      // Find farm or default to Kokan Roots
      const farmRes = await getFarmDetails({ slug: 'kokan-roots-farmstay' })
      await sendChunk(`Here are the general check-in policies and rules across our partner farm stays:\n\n`)
      await sendChunk(`- Overnight check-in: Typically 12:00 PM check-in, 10:00 AM checkout.\n`)
      await sendChunk(`- Day visits: ${farmRes.check_in_info?.day_visit_hours || '09:00 to 17:00'}.\n`)
      await sendChunk(`- Farm etiquette: Respect quiet hours after 10:00 PM; no synthetic litter or chemical waste in orchards.\n`)
      await sendChunk(`- Meals: Organic traditional local meals cooked fresh on the farm.\n\n`)
      await sendChunk(`You can review individual farm rules on any stay page, for example [Kokan Roots Farmstay](/farms/kokan-roots-farmstay).`)
    } else {
      // Default: Search farms
      let budgetPaise = 300000 // default 3000 INR
      if (q.includes('2500') || q.includes('2,500')) budgetPaise = 250000
      if (q.includes('2000') || q.includes('2,000')) budgetPaise = 200000
      if (q.includes('1500') || q.includes('1,500')) budgetPaise = 150000

      let region: string | undefined = undefined
      if (q.includes('maharashtra') || q.includes('konkan') || q.includes('ratnagiri')) region = 'Maharashtra'
      if (q.includes('kerala') || q.includes('wayanad')) region = 'Kerala'
      if (q.includes('punjab') || q.includes('amritsar')) region = 'Punjab'

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
          { role: 'model', parts: [{ functionCall: call }] },
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
 * - Reads model from GEMINI_MODEL env or defaults to "gemini-flash-latest"
 * - On 404 or model not found, retries in order: gemini-flash-latest, gemini-3.1-flash-lite, gemini-3-flash-preview
 * - Logs which model finally worked on the server
 * - If every model fails, key is missing, invalid, or rate limited (429), falls back to mock database AI
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

    const primaryModel = process.env.GEMINI_MODEL?.trim() || 'gemini-flash-latest'
    const FALLBACK_MODELS = [
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
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
          console.warn(`[AgriGuide] Gemini rate limit reached (429) on model "${model}". Falling back to database mock AI.`)
          break
        }
        if (err?.isAuthError) {
          console.warn(`[AgriGuide] Gemini API authentication failed on model "${model}": ${err.message}. Falling back to database mock AI.`)
          break
        }
        console.warn(`[AgriGuide] Gemini error on model "${model}": ${err?.message || err}.`)
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
