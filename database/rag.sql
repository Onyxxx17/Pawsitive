-- ============================================================
-- RAG - Retrieval-Augmented Generation
-- PostgreSQL (Supabase)
-- ============================================================
-- Might not be needed for MVP.
-- ============================================================

-- Track veterinary knowledge base sources (WSAVA, AAHA, breed guides, etc.)
create table knowledge_sources (
  id bigint primary key generated always as identity,
  name text not null,                    -- e.g., 'WSAVA Body Condition Score Guide'
  source_type text,                      -- e.g., 'guideline', 'breed_guide', 'nutrition'
  source_url text,                       -- original URL if applicable
  created_at timestamp with time zone not null default now()
);

-- Store chunked content with embeddings for RAG retrieval
create table knowledge_chunks (
  id bigint primary key generated always as identity,
  source_id bigint not null references knowledge_sources (id),
  content text not null,
  embedding extensions.vector(384)
);