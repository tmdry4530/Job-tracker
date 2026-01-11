-- Job Application Tracker - Bookmark & Memo
-- Created: 2026-01-11
-- Feature: Bookmark and Memo functionality

-- ============================================
-- ADD BOOKMARK AND MEMO COLUMNS
-- ============================================

-- Add is_bookmarked column to applications
ALTER TABLE applications
ADD COLUMN is_bookmarked BOOLEAN DEFAULT FALSE NOT NULL;

-- Add memo column to applications
ALTER TABLE applications
ADD COLUMN memo TEXT DEFAULT NULL;

-- Index for bookmarked applications (for filtering)
CREATE INDEX idx_applications_is_bookmarked ON applications(is_bookmarked) WHERE is_bookmarked = TRUE;

-- ============================================
-- RLS POLICIES (inherits from existing user_id policies)
-- ============================================
-- Note: Existing RLS policies on applications table already handle
-- access control based on user_id, so no additional policies needed.
