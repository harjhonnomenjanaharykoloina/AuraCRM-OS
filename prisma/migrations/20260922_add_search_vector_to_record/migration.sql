-- Add search_vector column to Record table for Phase 9 full-text search (PostgreSQL tsvector).
-- This enables to_tsquery / ts_rank_cd based full-text search via src/lib/search/postgresql.ts
ALTER TABLE "Record" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- GIN index for fast full-text tsvector matching
CREATE INDEX IF NOT EXISTS "Record_search_vector_gin" ON "Record" USING GIN ("search_vector");

-- Index to support organization-scoped search scans (avoid seq scan when search_vector filter can't use GIN)
CREATE INDEX IF NOT EXISTS "Record_org_isDeleted_searchVector_idx" ON "Record" ("organizationId", "isDeleted") WHERE "search_vector" IS NOT NULL;
