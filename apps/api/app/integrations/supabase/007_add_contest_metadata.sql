-- Migration 006: Add contest_slug to leetcode_submissions

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS contest_slug text;
