-- Migration: Update calendar_events table to remove pet_id dependency
-- Run this if you already have the calendar_events table created

-- Drop the old index that included pet_id
DROP INDEX IF EXISTS idx_calendar_events_user_pet;

-- Drop the pet_id column
ALTER TABLE calendar_events DROP COLUMN IF EXISTS pet_id;

-- Change TIMESTAMP columns to TIMESTAMPTZ for proper timezone handling
ALTER TABLE calendar_events 
  ALTER COLUMN start_time TYPE TIMESTAMPTZ,
  ALTER COLUMN end_time TYPE TIMESTAMPTZ;

-- Create new index without pet_id
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);

-- The other indexes should already exist, but create them if not
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_external ON calendar_events(external_event_id);
