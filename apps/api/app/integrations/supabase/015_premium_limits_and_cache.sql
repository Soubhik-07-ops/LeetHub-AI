-- Migration 012: Premium Limits and Cache Identity

-- 1. Update Premium Limits
UPDATE plans 
SET ai_analysis_limit = 500, ai_chat_limit = 1000 
WHERE slug = 'premium';

-- 2. Add input_hash to ai_analyses for robust caching
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS input_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_ai_analyses_input_hash ON ai_analyses(input_hash);
