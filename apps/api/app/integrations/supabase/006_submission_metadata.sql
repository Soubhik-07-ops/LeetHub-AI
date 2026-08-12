-- Migration 006: Add metadata columns to submissions

ALTER TABLE submissions 
  ADD COLUMN IF NOT EXISTS topics TEXT[],
  ADD COLUMN IF NOT EXISTS difficulty TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT;
