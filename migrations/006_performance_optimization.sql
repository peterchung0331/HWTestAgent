-- Migration 006: Performance Optimization for Error Pattern Search
-- Date: 2026-01-17
-- Purpose: Add indexes to improve error pattern search performance (80-200ms → 5-10ms)

-- Install pg_trgm extension for trigram-based text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index for error_message (ILIKE optimization)
-- This index will dramatically speed up searchErrorPatterns() queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_message_trgm
  ON error_patterns USING gin (error_message gin_trgm_ops);

-- Composite index for filtered searches (project + category)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_patterns_project_category
  ON error_patterns(project_name, error_category)
  WHERE error_category IS NOT NULL;

-- Index for occurrence sorting (most common patterns first)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_patterns_occurrence
  ON error_patterns(occurrence_count DESC, last_seen DESC);

-- Update table statistics for query planner
ANALYZE error_patterns;

-- Add index comments
COMMENT ON INDEX idx_error_message_trgm IS 'GIN trigram index for fast ILIKE searches on error_message';
COMMENT ON INDEX idx_error_patterns_project_category IS 'Composite index for project+category filtered searches';
COMMENT ON INDEX idx_error_patterns_occurrence IS 'Index for sorting by occurrence count and last seen date';
