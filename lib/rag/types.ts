export interface RagChunk {
  id: string
  source: string
  entity_type: string
  entity_id: string
  slug?: string
  locale: string
  chunk_index: number
  content: string
  metadata: Record<string, any>
  content_hash: string
  embedding?: number[]
}

export interface RagChunkInput {
  entity_type: string
  entity_id: string
  slug?: string
  locale: string
  chunk_index: number
  content: string
  metadata?: Record<string, any>
}

export interface RagSourceDefinition<T = any> {
  name: string
  table: string
  fetchRows: (supabase: any) => Promise<T[]>
  fetchSingle?: (supabase: any, entityId: string) => Promise<T | null>
  buildChunks: (row: T, locale: string) => Promise<RagChunkInput[]>
  getDeletedOrUnpublishedIds?: (supabase: any) => Promise<string[]>
}

export interface RagSourceConfig {
  sourceName: string
  locales: string[]
  sources: RagSourceDefinition[]
  getCompactCatalogue?: (supabase: any, locale: string) => Promise<string>
  getDirectFallbackResults?: (supabase: any, query: string, locale: string) => Promise<RetrievedPassage[]>
}

export interface RetrieveOptions {
  locale?: string
  filters?: {
    place?: string
    region?: string
    state?: string
    max_price_inr?: number
    budget_max_paise?: number
    guests?: number
    month?: number
    visit_type?: string
    activity?: string
    slug?: string
    entity_type?: string
  }
  k?: number
  supabaseClient?: any
}

export interface RetrievedPassage {
  id: string
  source: string
  entity_type: string
  entity_id: string
  slug?: string
  locale: string
  content: string
  metadata: Record<string, any>
  score: number
}
