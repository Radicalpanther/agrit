import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// Read environment variables from .env.local
const envPath = path.join(rootDir, '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim()
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const geminiApiKey = process.env.GEMINI_API_KEY
const embedModel = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function computeHash(content, metadata = {}) {
  const norm = `${content.trim()}::${JSON.stringify(metadata, Object.keys(metadata).sort())}`
  return crypto.createHash('sha256').update(norm).digest('hex')
}

async function embedBatch(texts) {
  if (!geminiApiKey) {
    console.warn('[RAG Index] Warning: GEMINI_API_KEY not configured. Generating zero vectors for offline/mock test.')
    return texts.map(() => new Array(768).fill(0))
  }

  const batchSize = 32
  const results = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const slice = texts.slice(i, i + batchSize)
    const requests = slice.map((t) => ({
      model: `models/${embedModel}`,
      content: { parts: [{ text: t.slice(0, 3000) }] },
      outputDimensionality: 768,
    }))

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${embedModel}:batchEmbedContents?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
        },
      )

      if (!res.ok) {
        console.warn(`[Batch embed HTTP ${res.status}], fallback to sequential embed...`)
        for (const t of slice) {
          const sRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${embedModel}:embedContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: `models/${embedModel}`,
                content: { parts: [{ text: t.slice(0, 3000) }] },
                outputDimensionality: 768,
              }),
            },
          )
          const sData = await sRes.json()
          results.push(sData.embedding?.values || new Array(768).fill(0))
        }
        continue
      }

      const data = await res.json()
      for (let j = 0; j < slice.length; j++) {
        results.push(data.embeddings?.[j]?.values || new Array(768).fill(0))
      }
    } catch (err) {
      console.warn(`[Batch embed error]: ${err.message}`)
      for (let j = 0; j < slice.length; j++) {
        results.push(new Array(768).fill(0))
      }
    }

    if (i + batchSize < texts.length) {
      await new Promise((r) => setTimeout(r, 400))
    }
  }

  return results
}

async function runIndex() {
  console.log('==============================================================================')
  console.log('AgriTrails RAG Indexer (pnpm rag:index)')
  console.log('==============================================================================')
  console.log(`Target database: ${supabaseUrl}`)
  console.log(`Embedding model: ${embedModel} (768 dimensions)`)

  // Step 1: Verify rag_chunks table exists
  const { error: probeErr } = await supabase.from('rag_chunks').select('id').limit(1)
  if (probeErr) {
    console.error('\n[Notice]: Table "rag_chunks" does not exist in Supabase yet.')
    console.error('Please run the migration in Supabase SQL Editor:')
    console.error('  File: supabase/migrations/006_rag.sql\n')
    console.log('The chatbot will continue using keyword search and direct table fallbacks automatically.')
    return
  }

  // Step 2: Fetch all published entities
  console.log('\nFetching published entities from database...')
  const [farmsRes, actsRes, prodsRes, cropsRes, revsRes] = await Promise.all([
    supabase.from('farms').select('*, activities(*), products(*), farm_crops(crop:crops(*))').eq('published', true),
    supabase.from('activities').select('*, farm:farms(name, slug, place, region, published)'),
    supabase.from('products').select('*, farm:farms(name, slug, place, region, published)').gt('stock', 0),
    supabase.from('crops').select('*'),
    supabase.from('reviews').select('*, farm:farms(name, slug, place, region, published)').limit(80),
  ])

  const farms = farmsRes.data || []
  const activities = (actsRes.data || []).filter((a) => a.farm && a.farm.published !== false)
  const products = (prodsRes.data || []).filter((p) => p.farm && p.farm.published !== false)
  const crops = cropsRes.data || []
  const reviews = (revsRes.data || []).filter((r) => r.farm && r.farm.published !== false && r.comment)

  console.log(`Entities fetched: ${farms.length} farms, ${activities.length} activities, ${products.length} products, ${crops.length} crops, ${reviews.length} reviews`)

  const locales = ['en', 'hi', 'mr']
  const generatedChunks = []

  // Chunk Farms
  for (const f of farms) {
    const priceInr = Math.round((f.price_paise || 250000) / 100)
    const dayInr = f.day_visit_price_paise ? Math.round(f.day_visit_price_paise / 100) : null
    const acts = (f.activities || []).map((a) => a.name).join(', ')
    const activeCrops = (f.farm_crops || []).map((fc) => fc.crop?.name).filter(Boolean).join(', ')

    for (const locale of locales) {
      const content = [
        `[Farm Stay] ${f.name} located in ${f.place}, ${f.region}.`,
        `Overnight stay price: ₹${priceInr.toLocaleString('en-IN')} per guest.`,
        f.allows_day_visit && dayInr ? `Day visit allowed at ₹${dayInr.toLocaleString('en-IN')} per guest.` : 'Overnight stay only.',
        `Accommodates up to ${f.max_guests || 4} guests.`,
        f.verified ? 'Verified authentic farm stay.' : '',
        f.organic_pct ? `${f.organic_pct}% certified organic produce.` : 'Natural farming.',
        f.rating_avg ? `Guest rating: ${f.rating_avg} / 5 stars (${f.review_count || 0} reviews).` : '',
        f.description ? `Description: ${f.description}` : '',
        acts ? `Activities: ${acts}.` : '',
        activeCrops ? `Crops: ${activeCrops}.` : '',
        f.landmark_note ? `Landmark: ${f.landmark_note}.` : '',
        `Link: /farms/${f.slug}`,
      ]
        .filter(Boolean)
        .join(' ')

      const meta = {
        slug: f.slug,
        name: f.name,
        place: f.place,
        region: f.region,
        price_inr: priceInr,
        rating: f.rating_avg,
        entity_type: 'farm',
      }

      generatedChunks.push({
        id: `agritrails:farm:${f.id}:${locale}:0`,
        source: 'agritrails',
        entity_type: 'farm',
        entity_id: String(f.id),
        slug: f.slug,
        locale,
        chunk_index: 0,
        content,
        metadata: meta,
        content_hash: computeHash(content, meta),
      })
    }
  }

  // Chunk Activities
  for (const a of activities) {
    const f = a.farm || {}
    for (const locale of locales) {
      const content = `[Farm Activity] ${a.name} at ${f.name} in ${f.place}, ${f.region}. Type: ${a.kind}. Duration: ${a.duration_min} minutes. Link: /farms/${f.slug}`
      const meta = { slug: f.slug, farm_name: f.name, place: f.place, region: f.region, entity_type: 'activity' }
      generatedChunks.push({
        id: `agritrails:activity:${a.id}:${locale}:0`,
        source: 'agritrails',
        entity_type: 'activity',
        entity_id: String(a.id),
        slug: f.slug,
        locale,
        chunk_index: 0,
        content,
        metadata: meta,
        content_hash: computeHash(content, meta),
      })
    }
  }

  // Chunk Products
  for (const p of products) {
    const f = p.farm || {}
    const priceInr = Math.round((p.price_paise || 0) / 100)
    for (const locale of locales) {
      const content = `[Produce] ${p.name} from ${f.name} in ${f.place}, ${f.region}. Price: ₹${priceInr} per ${p.unit}. Available stock: ${p.stock}. ${p.detail || ''} Link: /farms/${f.slug}`
      const meta = { slug: f.slug, farm_name: f.name, price_inr: priceInr, entity_type: 'product' }
      generatedChunks.push({
        id: `agritrails:product:${p.id}:${locale}:0`,
        source: 'agritrails',
        entity_type: 'product',
        entity_id: String(p.id),
        slug: f.slug,
        locale,
        chunk_index: 0,
        content,
        metadata: meta,
        content_hash: computeHash(content, meta),
      })
    }
  }

  // Chunk Crops
  for (const c of crops) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const mNames = Array.isArray(c.months) ? c.months.map((m) => monthNames[m]).join(', ') : 'Year-round'
    for (const locale of locales) {
      const content = `[Seasonal Crop] ${c.name} in ${c.place}, ${c.region}. Kind: ${c.kind || 'harvest'}. Months: ${mNames}.`
      const meta = { crop_name: c.name, place: c.place, region: c.region, kind: c.kind, entity_type: 'crop' }
      generatedChunks.push({
        id: `agritrails:crop:${c.id}:${locale}:0`,
        source: 'agritrails',
        entity_type: 'crop',
        entity_id: String(c.id),
        slug: null,
        locale,
        chunk_index: 0,
        content,
        metadata: meta,
        content_hash: computeHash(content, meta),
      })
    }
  }

  // Chunk Reviews
  for (const r of reviews) {
    const f = r.farm || {}
    const avg = Number(((r.rating_food + r.rating_cleanliness + r.rating_hospitality + r.rating_location) / 4).toFixed(1))
    for (const locale of locales) {
      const content = `[Guest Review] For ${f.name} (${f.place}, ${f.region}) - Rating ${avg}/5: "${r.comment}". Link: /farms/${f.slug}`
      const meta = { slug: f.slug, farm_name: f.name, rating: avg, entity_type: 'review' }
      generatedChunks.push({
        id: `agritrails:review:${r.id}:${locale}:0`,
        source: 'agritrails',
        entity_type: 'review',
        entity_id: String(r.id),
        slug: f.slug,
        locale,
        chunk_index: 0,
        content,
        metadata: meta,
        content_hash: computeHash(content, meta),
      })
    }
  }

  console.log(`Total generated chunks: ${generatedChunks.length}`)

  // Fetch existing hashes to skip unchanged
  const { data: existingRows } = await supabase.from('rag_chunks').select('id, content_hash').eq('source', 'agritrails')
  const existingMap = new Map((existingRows || []).map((r) => [r.id, r.content_hash]))

  const toEmbed = generatedChunks.filter((c) => existingMap.get(c.id) !== c.content_hash)
  const skippedCount = generatedChunks.length - toEmbed.length

  console.log(`Skipped unchanged chunks: ${skippedCount}`)
  console.log(`Chunks requiring embeddings & upsert: ${toEmbed.length}`)

  let indexedCount = 0
  if (toEmbed.length > 0) {
    const batchSize = 25
    for (let i = 0; i < toEmbed.length; i += batchSize) {
      const slice = toEmbed.slice(i, i + batchSize)
      process.stdout.write(`Embedding and upserting chunks ${i + 1} to ${Math.min(i + batchSize, toEmbed.length)}... `)

      const embeddings = await embedBatch(slice.map((s) => s.content))
      const upsertRows = slice.map((c, idx) => ({
        ...c,
        embedding: embeddings[idx],
        updated_at: new Date().toISOString(),
      }))

      const { error: upsertErr } = await supabase
        .from('rag_chunks')
        .upsert(upsertRows, { onConflict: 'source,entity_id,chunk_index,locale' })

      if (upsertErr) {
        console.log(`Error: ${upsertErr.message}`)
      } else {
        indexedCount += slice.length
        console.log('Done.')
      }
    }
  }

  // Cleanup obsolete chunks
  const validIds = new Set(generatedChunks.map((c) => c.id))
  const obsoleteIds = []
  for (const id of existingMap.keys()) {
    if (!validIds.has(id)) {
      obsoleteIds.push(id)
    }
  }

  let deletedCount = 0
  if (obsoleteIds.length > 0) {
    console.log(`Deleting ${obsoleteIds.length} obsolete chunks for unpublished/deleted entities...`)
    await supabase.from('rag_chunks').delete().in('id', obsoleteIds)
    deletedCount = obsoleteIds.length
  }

  console.log('==============================================================================')
  console.log(`Index completed: ${indexedCount} indexed, ${skippedCount} skipped, ${deletedCount} deleted.`)
  console.log('==============================================================================')
}

runIndex().catch((err) => {
  console.error('Fatal error during indexing:', err)
  process.exit(1)
})
