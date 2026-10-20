-- ==============================================================================
-- Migration 006: Reusable RAG Module with pgvector
-- Idempotent setup for vector embeddings, hybrid search, and semantic indexing
-- ==============================================================================

-- 1. Enable pgvector extension (idempotent)
create extension if not exists vector with schema public;

-- 2. Create rag_chunks table
create table if not exists rag_chunks (
  id text primary key,
  source text not null,
  entity_type text not null,
  entity_id text not null,
  slug text,
  locale text not null default 'en',
  chunk_index integer not null default 0,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  content_hash text not null,
  embedding vector(768),
  tsv tsvector generated always as (to_tsvector('simple', content)) stored,
  updated_at timestamptz not null default now(),
  constraint uq_rag_chunks_source_entity_chunk_locale unique (source, entity_id, chunk_index, locale)
);

-- 3. Indexes for fast vector, keyword, and entity lookups
create index if not exists idx_rag_chunks_embedding
  on rag_chunks using hnsw (embedding vector_cosine_ops);

create index if not exists idx_rag_chunks_tsv
  on rag_chunks using gin (tsv);

create index if not exists idx_rag_chunks_source_locale
  on rag_chunks (source, locale);

create index if not exists idx_rag_chunks_entity
  on rag_chunks (entity_type, entity_id);

create index if not exists idx_rag_chunks_slug
  on rag_chunks (slug) where slug is not null;

-- 4. Row Level Security (server-only access)
alter table rag_chunks enable row level security;
drop policy if exists "rag_chunks_service_role" on rag_chunks;
create policy "rag_chunks_service_role" on rag_chunks
  for all using (false);

-- 5. Match chunks RPC for vector similarity search with optional metadata filters
create or replace function match_chunks (
  query_embedding vector(768),
  filter_json jsonb default '{}'::jsonb,
  match_count int default 8
) returns table (
  id text,
  source text,
  entity_type text,
  entity_id text,
  slug text,
  locale text,
  chunk_index int,
  content text,
  metadata jsonb,
  similarity float
) language plpgsql security definer as $$
declare
  target_locale text := filter_json->>'locale';
  target_source text := filter_json->>'source';
  target_entity_type text := filter_json->>'entity_type';
  target_slug text := filter_json->>'slug';
begin
  return query
  select
    rc.id,
    rc.source,
    rc.entity_type,
    rc.entity_id,
    rc.slug,
    rc.locale,
    rc.chunk_index,
    rc.content,
    rc.metadata,
    (1 - (rc.embedding <=> query_embedding))::float as similarity
  from rag_chunks rc
  where
    rc.embedding is not null
    and (target_locale is null or rc.locale = target_locale)
    and (target_source is null or rc.source = target_source)
    and (target_entity_type is null or rc.entity_type = target_entity_type)
    and (target_slug is null or rc.slug = target_slug)
  order by rc.embedding <=> query_embedding
  limit match_count;
end;
$$;

notify pgrst, 'reload schema';
