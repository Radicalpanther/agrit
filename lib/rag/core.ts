import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { embedBatch, embedText } from '@/lib/gemini'
import {
  RagChunkInput,
  RagSourceConfig,
  RetrieveOptions,
  RetrievedPassage,
} from './types'

/**
 * Generates an idempotent MD5 or SHA256 content hash of content + metadata.
 */
export function computeContentHash(content: string, metadata: Record<string, any> = {}): string {
  const normalized = `${content.trim()}::${JSON.stringify(metadata, Object.keys(metadata).sort())}`
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

/**
 * Creates a deterministic deterministic ID for a chunk.
 */
export function buildChunkId(
  source: string,
  entityType: string,
  entityId: string,
  chunkIndex: number,
  locale: string,
): string {
  return `${source}:${entityType}:${entityId}:${locale}:${chunkIndex}`
}

/**
 * Generic RAG Indexer:
 * - Completely source-agnostic
 * - Idempotent, skips unchanged chunks by content_hash
 * - Embeds in batches
 * - Removes chunks belonging to deleted or unpublished entities
 */
export async function index(
  config: RagSourceConfig,
  options: { force?: boolean; supabase?: any } = {},
): Promise<{ total: number; indexed: number; skipped: number; deleted: number }> {
  const supabase = options.supabase || (await createServiceClient())
  let totalChunks = 0
  let indexedCount = 0
  let skippedCount = 0
  let deletedCount = 0

  console.info(`[RAG Indexer] Starting index for source '${config.sourceName}' across locales: ${config.locales.join(', ')}`)

  // Step 1: Collect all chunks from all source definitions
  const allGeneratedChunks: (RagChunkInput & { id: string; source: string; content_hash: string })[] = []
  const activeEntityIdsByType = new Map<string, Set<string>>()

  for (const src of config.sources) {
    if (!activeEntityIdsByType.has(src.name)) {
      activeEntityIdsByType.set(src.name, new Set())
    }

    try {
      const rows = await src.fetchRows(supabase)
      console.info(`[RAG Indexer] Fetched ${rows.length} rows for source '${src.name}'`)

      for (const row of rows) {
        for (const locale of config.locales) {
          const chunks = await src.buildChunks(row, locale)
          for (const c of chunks) {
            const hash = computeContentHash(c.content, c.metadata || {})
            const id = buildChunkId(config.sourceName, c.entity_type, c.entity_id, c.chunk_index, c.locale)
            allGeneratedChunks.push({
              ...c,
              id,
              source: config.sourceName,
              content_hash: hash,
            })
            activeEntityIdsByType.get(src.name)?.add(c.entity_id)
          }
        }
      }
    } catch (err: any) {
      console.error(`[RAG Indexer] Error building chunks for source '${src.name}':`, err?.message)
    }
  }

  totalChunks = allGeneratedChunks.length
  console.info(`[RAG Indexer] Total generated chunks to process: ${totalChunks}`)

  // Step 2: Fetch existing hashes to skip unchanged chunks
  const existingMap = new Map<string, string>() // id -> content_hash
  try {
    const { data: existingRows, error: fetchErr } = await supabase
      .from('rag_chunks')
      .select('id, content_hash')
      .eq('source', config.sourceName)

    if (!fetchErr && existingRows) {
      for (const r of existingRows) {
        existingMap.set(r.id, r.content_hash)
      }
    }
  } catch (err: any) {
    console.warn('[RAG Indexer] Could not query existing rag_chunks (table may need migration):', err?.message)
  }

  // Filter chunks that need embedding & upserting
  const toUpsert = options.force
    ? allGeneratedChunks
    : allGeneratedChunks.filter((c) => {
        const existingHash = existingMap.get(c.id)
        if (existingHash === c.content_hash) {
          skippedCount++
          return false
        }
        return true
      })

  console.info(`[RAG Indexer] Chunks to embed & save: ${toUpsert.length} (Skipped unchanged: ${skippedCount})`)

  // Step 3: Embed in batches and upsert
  if (toUpsert.length > 0) {
    const batchSize = 25
    for (let i = 0; i < toUpsert.length; i += batchSize) {
      const slice = toUpsert.slice(i, i + batchSize)
      const texts = slice.map((c) => c.content)

      let embeddings: number[][] = []
      try {
        embeddings = await embedBatch(texts)
      } catch (embErr: any) {
        console.error(`[RAG Indexer] Batch embed error: ${embErr?.message}. Trying fallback zero vectors for indexing to proceed...`)
      }

      const rowsToInsert = slice.map((c, idx) => ({
        id: c.id,
        source: c.source,
        entity_type: c.entity_type,
        entity_id: c.entity_id,
        slug: c.slug || null,
        locale: c.locale,
        chunk_index: c.chunk_index,
        content: c.content,
        metadata: c.metadata || {},
        content_hash: c.content_hash,
        embedding: embeddings[idx] || null,
        updated_at: new Date().toISOString(),
      }))

      try {
        const { error: upsertErr } = await supabase
          .from('rag_chunks')
          .upsert(rowsToInsert, { onConflict: 'source,entity_id,chunk_index,locale' })

        if (upsertErr) {
          console.error('[RAG Indexer] Upsert error:', upsertErr.message)
        } else {
          indexedCount += slice.length
        }
      } catch (err: any) {
        console.error('[RAG Indexer] Database error during upsert:', err?.message)
      }
    }
  }

  // Step 4: Clean up obsolete or deleted/unpublished chunks
  try {
    const validIds = new Set(allGeneratedChunks.map((c) => c.id))
    const obsoleteIds: string[] = []

    for (const id of existingMap.keys()) {
      if (!validIds.has(id)) {
        obsoleteIds.push(id)
      }
    }

    if (obsoleteIds.length > 0) {
      console.info(`[RAG Indexer] Removing ${obsoleteIds.length} obsolete chunks for deleted/unpublished entities...`)
      const delBatchSize = 100
      for (let i = 0; i < obsoleteIds.length; i += delBatchSize) {
        const slice = obsoleteIds.slice(i, i + delBatchSize)
        await supabase.from('rag_chunks').delete().in('id', slice)
        deletedCount += slice.length
      }
    }
  } catch (err: any) {
    console.warn('[RAG Indexer] Error during obsolete chunk cleanup:', err?.message)
  }

  console.info(`[RAG Indexer] Completed: ${indexedCount} indexed, ${skippedCount} skipped, ${deletedCount} deleted.`)
  return {
    total: totalChunks,
    indexed: indexedCount,
    skipped: skippedCount,
    deleted: deletedCount,
  }
}

/**
 * Re-indexes a single entity without blocking the whole system.
 */
export async function indexEntity(
  config: RagSourceConfig,
  entityType: string,
  entityId: string,
  options: { supabase?: any } = {},
): Promise<void> {
  const supabase = options.supabase || (await createServiceClient())
  const sourceDef = config.sources.find((s) => s.name === entityType)
  if (!sourceDef) return

  try {
    // If entity has a single fetcher
    let row: any = null
    if (sourceDef.fetchSingle) {
      row = await sourceDef.fetchSingle(supabase, entityId)
    } else {
      const rows = await sourceDef.fetchRows(supabase)
      row = rows.find((r: any) => String(r.id) === String(entityId))
    }

    // If row is not found or unpublished, delete its existing chunks
    if (!row || (row.published === false)) {
      await supabase
        .from('rag_chunks')
        .delete()
        .eq('source', config.sourceName)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
      return
    }

    // Otherwise, rebuild its chunks across locales
    const chunks: (RagChunkInput & { id: string; source: string; content_hash: string })[] = []
    for (const locale of config.locales) {
      const built = await sourceDef.buildChunks(row, locale)
      for (const b of built) {
        const hash = computeContentHash(b.content, b.metadata || {})
        const id = buildChunkId(config.sourceName, b.entity_type, b.entity_id, b.chunk_index, b.locale)
        chunks.push({
          ...b,
          id,
          source: config.sourceName,
          content_hash: hash,
        })
      }
    }

    if (chunks.length > 0) {
      const texts = chunks.map((c) => c.content)
      const embeddings = await embedBatch(texts).catch(() => [])

      const rowsToInsert = chunks.map((c, idx) => ({
        id: c.id,
        source: c.source,
        entity_type: c.entity_type,
        entity_id: c.entity_id,
        slug: c.slug || null,
        locale: c.locale,
        chunk_index: c.chunk_index,
        content: c.content,
        metadata: c.metadata || {},
        content_hash: c.content_hash,
        embedding: embeddings[idx] || null,
        updated_at: new Date().toISOString(),
      }))

      await supabase
        .from('rag_chunks')
        .upsert(rowsToInsert, { onConflict: 'source,entity_id,chunk_index,locale' })
    }
  } catch (err: any) {
    console.error(`[RAG indexEntity Error for ${entityType}:${entityId}]:`, err?.message)
  }
}

/**
 * Generic Hybrid Retriever:
 * - Vector search (match_chunks RPC) & Keyword search in parallel
 * - Merges with Reciprocal Rank Fusion (RRF: score = 1 / (60 + r_v) + 1 / (60 + r_k))
 * - Applies filters on metadata
 * - Multi-stage fallbacks: Vector -> Keyword -> Source table fallback
 * - Never throws.
 */
export async function retrieve(
  query: string,
  config: RagSourceConfig,
  options: RetrieveOptions = {},
): Promise<RetrievedPassage[]> {
  const k = options.k || 6
  const locale = options.locale || 'en'
  const filters = options.filters || {}
  const supabase = options.supabaseClient || (await createServiceClient())

  const cleanQuery = query.trim()
  if (!cleanQuery) return []

  let vectorResults: RetrievedPassage[] = []
  let keywordResults: RetrievedPassage[] = []

  // 1. Vector Search
  const vectorPromise = (async (): Promise<RetrievedPassage[]> => {
    try {
      const queryEmbedding = await embedText(cleanQuery)
      const rpcFilter: Record<string, any> = {
        source: config.sourceName,
        locale,
      }
      if (filters.entity_type) rpcFilter.entity_type = filters.entity_type
      if (filters.slug) rpcFilter.slug = filters.slug

      const { data, error } = await supabase.rpc('match_chunks', {
        query_embedding: queryEmbedding,
        filter_json: rpcFilter,
        match_count: k * 2,
      })

      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          id: d.id,
          source: d.source,
          entity_type: d.entity_type,
          entity_id: d.entity_id,
          slug: d.slug,
          locale: d.locale,
          content: d.content,
          metadata: d.metadata || {},
          score: Number(d.similarity) || 0,
        }))
      }
    } catch (err: any) {
      console.warn('[RAG Vector Search fallback]:', err?.message)
    }
    return []
  })()

  // 2. Keyword Search (using tsvector or ILIKE on rag_chunks)
  const keywordPromise = (async (): Promise<RetrievedPassage[]> => {
    try {
      // Clean query tokens for search
      const terms = cleanQuery
        .replace(/[^\w\s\u0900-\u097F]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 1)
        .slice(0, 5)

      let builder = supabase
        .from('rag_chunks')
        .select('id, source, entity_type, entity_id, slug, locale, content, metadata')
        .eq('source', config.sourceName)
        .eq('locale', locale)

      if (filters.entity_type) {
        builder = builder.eq('entity_type', filters.entity_type)
      }
      if (filters.slug) {
        builder = builder.eq('slug', filters.slug)
      }

      if (terms.length > 0) {
        const orClauses = terms.map((term) => `content.ilike.%${term}%`).join(',')
        builder = builder.or(orClauses)
      }

      const { data, error } = await builder.limit(k * 2)

      if (!error && Array.isArray(data)) {
        return data.map((d: any, idx: number) => ({
          id: d.id,
          source: d.source,
          entity_type: d.entity_type,
          entity_id: d.entity_id,
          slug: d.slug,
          locale: d.locale,
          content: d.content,
          metadata: d.metadata || {},
          score: 1 / (idx + 1),
        }))
      }
    } catch (err: any) {
      console.warn('[RAG Keyword Search fallback]:', err?.message)
    }
    return []
  })()

  // Execute both searches in parallel
  const [vecRes, kwRes] = await Promise.all([vectorPromise, keywordPromise])
  vectorResults = vecRes
  keywordResults = kwRes

  // 3. Reciprocal Rank Fusion (RRF)
  const scoreMap = new Map<string, { passage: RetrievedPassage; rrf: number }>()

  vectorResults.forEach((p, rank) => {
    const current = scoreMap.get(p.id) || { passage: p, rrf: 0 }
    current.rrf += 1 / (60 + rank)
    scoreMap.set(p.id, current)
  })

  keywordResults.forEach((p, rank) => {
    const current = scoreMap.get(p.id) || { passage: p, rrf: 0 }
    current.rrf += 1 / (60 + rank)
    scoreMap.set(p.id, current)
  })

  let fused = Array.from(scoreMap.values())
    .sort((a, b) => b.rrf - a.rrf)
    .map((item) => ({
      ...item.passage,
      score: item.rrf,
    }))

  // 4. Apply metadata filters
  if (filters.region || filters.place || filters.state) {
    const targetPlace = (filters.region || filters.place || filters.state || '').toLowerCase()
    fused = fused.filter((p) => {
      const meta = p.metadata || {}
      const region = String(meta.region || '').toLowerCase()
      const place = String(meta.place || '').toLowerCase()
      return region.includes(targetPlace) || place.includes(targetPlace) || p.content.toLowerCase().includes(targetPlace)
    })
  }

  if (filters.max_price_inr && filters.max_price_inr > 0) {
    fused = fused.filter((p) => {
      const meta = p.metadata || {}
      if (meta.price_inr) {
        return meta.price_inr <= filters.max_price_inr!
      }
      return true
    })
  }

  // 5. Fallback if fused results are empty
  if (fused.length === 0 && config.getDirectFallbackResults) {
    try {
      console.info('[RAG] Fallback to direct source table queries...')
      const direct = await config.getDirectFallbackResults(supabase, cleanQuery, locale)
      return direct.slice(0, k)
    } catch (fallbackErr: any) {
      console.warn('[RAG Direct Fallback exception]:', fallbackErr?.message)
    }
  }

  return fused.slice(0, k)
}
