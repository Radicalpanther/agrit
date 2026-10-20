/**
 * Robust Gemini API client supporting chat, function calling, embeddings,
 * streaming SSE, retries with exponential backoff, and model fallbacks.
 * Server-side only. Never exposes API key.
 */

export interface GeminiPart {
  text?: string
  functionCall?: {
    name: string
    args: Record<string, any>
    id?: string
  }
  functionResponse?: {
    name: string
    response: Record<string, any>
  }
  thoughtSignature?: string
}

export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export interface GeminiFunctionDeclaration {
  name: string
  description: string
  parameters: {
    type: 'OBJECT' | 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export interface GeminiGenerateOptions {
  model?: string
  contents: GeminiContent[]
  systemInstruction?: string
  tools?: { function_declarations: GeminiFunctionDeclaration[] }[]
  temperature?: number
  maxOutputTokens?: number
}

export interface GeminiCandidate {
  content: {
    parts: GeminiPart[]
    role: string
  }
  finishReason?: string
}

const DEFAULT_CHAT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash'
const DEFAULT_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite'
const DEFAULT_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001'
const EMBED_DIMENSION = 768

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error('GEMINI_API_KEY environment variable is not configured')
  }
  return key.trim()
}

/**
 * Executes a fetch with timeout and retries with backoff on 429/5xx.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries: number = 1,
  backoffMs: number = 1500,
): Promise<Response> {
  let lastError: any = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 20000)

      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (res.ok) {
        return res
      }

      // Retry on 429 (rate-limit) or 5xx (server error)
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        console.warn(`[Gemini API] Received HTTP ${res.status}. Retrying in ${backoffMs}ms...`)
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
        backoffMs *= 2
        continue
      }

      return res
    } catch (err: any) {
      lastError = err
      if (attempt < retries) {
        console.warn(`[Gemini API] Request failed (${err?.message}). Retrying in ${backoffMs}ms...`)
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
        backoffMs *= 2
        continue
      }
    }
  }

  throw lastError || new Error('Network request failed after retries')
}

/**
 * Generate content with primary model and automatic fallback to GEMINI_FALLBACK_MODEL.
 */
export async function generateContent(options: GeminiGenerateOptions): Promise<GeminiCandidate | null> {
  const apiKey = getApiKey()
  const primaryModel = options.model || DEFAULT_CHAT_MODEL
  const fallbackModel = DEFAULT_FALLBACK_MODEL

  const body: Record<string, any> = {
    contents: options.contents,
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 1024,
    },
  }

  if (options.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    }
  }

  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools
  }

  // Attempt 1: Primary Model
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${apiKey}`
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))

    if (res.ok && data?.candidates?.[0]) {
      return data.candidates[0]
    }

    console.warn(`[Gemini Primary Model ${primaryModel} failed]:`, data?.error?.message || res.status)
  } catch (err: any) {
    console.warn(`[Gemini Primary Model ${primaryModel} exception]:`, err?.message)
  }

  // Attempt 2: Fallback Model
  if (primaryModel !== fallbackModel) {
    try {
      console.info(`[Gemini] Switching to fallback model: ${fallbackModel}`)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`
      const res = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok && data?.candidates?.[0]) {
        return data.candidates[0]
      }
      console.warn(`[Gemini Fallback Model ${fallbackModel} failed]:`, data?.error?.message || res.status)
    } catch (err: any) {
      console.warn(`[Gemini Fallback Model ${fallbackModel} exception]:`, err?.message)
    }
  }

  return null
}

/**
 * Stream final text response using Gemini's streamGenerateContent endpoint.
 * Returns an AsyncGenerator yielding text chunks.
 */
export async function* streamChat(options: GeminiGenerateOptions): AsyncGenerator<string, void, unknown> {
  const apiKey = getApiKey()
  const primaryModel = options.model || DEFAULT_CHAT_MODEL
  const fallbackModel = DEFAULT_FALLBACK_MODEL

  const body: Record<string, any> = {
    contents: options.contents,
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 1024,
    },
  }

  if (options.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    }
  }

  let activeModel = primaryModel
  let response: Response | null = null

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:streamGenerateContent?alt=sse&key=${apiKey}`
    response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (err: any) {
    console.warn(`[Gemini stream primary failed (${activeModel})]: ${err?.message}. Trying fallback ${fallbackModel}`)
    if (activeModel !== fallbackModel) {
      activeModel = fallbackModel
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:streamGenerateContent?alt=sse&key=${apiKey}`
      response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => null)
    }
  }

  if (!response || !response.ok || !response.body) {
    throw new Error('Could not establish streaming connection with Gemini')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue

      const jsonStr = trimmed.substring(5).trim()
      if (!jsonStr || jsonStr === '[DONE]') continue

      try {
        const parsed = JSON.parse(jsonStr)
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          yield text
        }
      } catch {
        // partial json chunk, ignore
      }
    }
  }

  if (buffer.trim().startsWith('data:')) {
    const jsonStr = buffer.trim().substring(5).trim()
    try {
      const parsed = JSON.parse(jsonStr)
      const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) yield text
    } catch {}
  }
}

/**
 * Embed a single text into a 768-dimensional vector using gemini-embedding-001.
 */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = getApiKey()
  const model = DEFAULT_EMBED_MODEL
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 4000)

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text: clean }] },
      outputDimensionality: EMBED_DIMENSION,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Embedding failed with status ${res.status}`)
  }

  const data = await res.json()
  const vector = data.embedding?.values
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('Invalid embedding vector returned by Gemini API')
  }

  return vector
}

/**
 * Batch embed multiple texts into 768-dimensional vectors.
 * Batches into groups of 32 requests per call.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const apiKey = getApiKey()
  const model = DEFAULT_EMBED_MODEL
  const batchSize = 32
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const slice = texts.slice(i, i + batchSize)
    const requests = slice.map((t) => ({
      model: `models/${model}`,
      content: { parts: [{ text: t.replace(/\s+/g, ' ').trim().slice(0, 4000) }] },
      outputDimensionality: EMBED_DIMENSION,
    }))

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${apiKey}`
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    })

    if (!res.ok) {
      // Fallback to sequential embedding for this batch
      console.warn(`[Gemini batchEmbedContents HTTP ${res.status}], falling back to sequential embed`)
      for (const t of slice) {
        results.push(await embedText(t))
      }
      continue
    }

    const data = await res.json()
    const embeddings = data.embeddings || []

    for (let j = 0; j < slice.length; j++) {
      const vec = embeddings[j]?.values
      if (Array.isArray(vec) && vec.length > 0) {
        results.push(vec)
      } else {
        // Fallback for single missing
        results.push(await embedText(slice[j]))
      }
    }

    // Small delay between batches to respect rate limits
    if (i + batchSize < texts.length) {
      await new Promise((r) => setTimeout(r, 400))
    }
  }

  return results
}
