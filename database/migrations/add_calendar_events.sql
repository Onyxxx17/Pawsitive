-- Migration: Add calendar_events table to store imported calendar events
-- This allows users to see their Google/Apple calendar events in the app
-- and optionally enable notifications for them

CREATE TABLE IF NOT EXISTS calendar_events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    external_calendar_id    TEXT NOT NULL, -- ID from user's device calendar
    external_event_id       TEXT NOT NULL, -- Original event ID from Calendar API
    title                   VARCHAR(200) NOT NULL,
    description             TEXT,
    start_time              TIMESTAMPTZ NOT NULL, -- Use TIMESTAMPTZ to preserve timezone
    end_time                TIMESTAMPTZ NOT NULL,
    location                TEXT,
    is_all_day              BOOLEAN DEFAULT FALSE,
    has_notification        BOOLEAN DEFAULT FALSE, -- User explicitly enabled notification
    notification_id         TEXT, -- Expo notification ID if enabled
    last_synced_at          TIMESTAMP DEFAULT NOW(),
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    
    -- Ensure we don't duplicate imported events
    UNIQUE(user_id, external_event_id)
);

-- Index for faster queries
CREATE INDEX idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX idx_calendar_events_external ON calendar_events(external_event_id);

-- RLS Policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar events"
    ON calendar_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar events"
    ON calendar_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar events"
    ON calendar_events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar events"
    ON calendar_events FOR DELETE
    USING (auth.uid() = user_id);
