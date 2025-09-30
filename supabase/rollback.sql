-- ========================================
-- Savvy Rilla Cashbook - Rollback Script
-- This script removes recent schema changes:
--   1. Drops the fx table (if exists)
--   2. Removes the note column from recurring (if exists)
-- ========================================

-- 1. Drop the FX rates table
drop table if exists public.fx cascade;

-- 2. Remove the note column from recurring
alter table public.recurring
drop column if exists note;
