# Calendar Integration Feature

## Overview
Users can now import events from their Google/Apple calendars and manage them directly in the Pawsitive app. Calendar events can be viewed, modified, deleted, and optionally set up with notifications.

## Features

### 1. **Import Calendar Events**
- Tap the calendar icon (📅) in the Activity screen
- Select which calendars to import from
- Events are imported for the next 60 days
- Events are stored in the app database for easy access
- **Calendar events are visible regardless of which pet is selected**

### 2. **View Calendar Events**
- Calendar events appear in the Activity tab alongside reminders
- Events show:
  - Title
  - Start and end time (in your local timezone)
  - Location (if available)
  - Description (if available)
  - All-day indicator
- **Calendar events display for all pets** - they are not pet-specific

### 3. **Manage Events**
- **Edit**: Modify event details
- **Delete**: Remove events from both the app and device calendar
- **Toggle Notifications**: Enable/disable push notifications for specific events

### 4. **Notification Control**
- By default, imported events do NOT trigger notifications
- Users must explicitly enable notifications for each event
- This prevents notification spam from calendar imports

## Technical Implementation

### Files Created/Modified

#### Database
- `database/migrations/add_calendar_events.sql` - New table for storing imported calendar events

#### Components
- `components/CalendarImportModal.tsx` - Modal for selecting and importing calendars
- `components/CalendarEventCard.tsx` - Display card for calendar events with action buttons

#### Utilities
- `utils/calendarUtils.ts` - Helper functions for calendar API operations:
  - Request permissions
  - Get user calendars
  - Fetch events
  - Create/update/delete events

#### Screens
- `app/(tabs)/activity.tsx` - Updated to show calendar import button and display events

#### iOS Permissions
- `ios/pawsitivemobile/Info.plist` - Added calendar permission descriptions

### Dependencies
- `expo-calendar@15.0.8` - Native calendar API access

## Database Schema

```sql
CREATE TABLE calendar_events (
    id                      UUID PRIMARY KEY,
    user_id                 UUID NOT NULL,
    external_calendar_id    TEXT NOT NULL,
    external_event_id       TEXT NOT NULL UNIQUE,
    title                   VARCHAR(200) NOT NULL,
    description             TEXT,
    start_time              TIMESTAMPTZ NOT NULL,  -- Uses TIMESTAMPTZ for timezone support
    end_time                TIMESTAMPTZ NOT NULL,
    location                TEXT,
    is_all_day              BOOLEAN DEFAULT FALSE,
    has_notification        BOOLEAN DEFAULT FALSE,
    notification_id         TEXT,
    last_synced_at          TIMESTAMP DEFAULT NOW(),
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);
```

**Note:** Calendar events are NOT tied to specific pets. They are user-level events that display regardless of which pet you have selected.

## Usage Flow

1. **User opens Activity tab**
2. **Taps calendar import button (📅)** - Available even when no pet is selected
3. **Grants calendar permission (first time only)**
4. **Selects calendars to import from**
5. **Taps "Import Events"**
6. **Events are synced to database**
7. **Events appear in Activity calendar** - Visible regardless of pet selection
8. **User can optionally enable notifications per event**

## Permissions

### iOS
- NSCalendarsUsageDescription: "Pawsitive needs access to your calendar to import and sync your pet care events."
- NSCalendarsWriteOnlyAccessUsageDescription: "Pawsitive needs access to create and manage pet care events in your calendar."

### Android
- READ_CALENDAR
- WRITE_CALENDAR

## Installation

```bash
cd pawsitive-mobile
npm install
```

For iOS:
```bash
cd ios && pod install && cd ..
```

## Migration

### For New Installations:
Run the database migration:
```sql
-- Run: database/migrations/add_calendar_events.sql
```

### For Existing Installations (if you already created calendar_events table):
Run the update migration to remove pet_id dependency and fix timezone handling:
```sql
-- Run: database/migrations/update_calendar_events_remove_pet_id.sql
```

This migration will:
- Remove the `pet_id` column (calendar events now display for all pets)
- Change `TIMESTAMP` to `TIMESTAMPTZ` for proper timezone handling
- Update indexes accordingly

## Timezone Handling

The app now properly handles timezones:
- Events are stored using `TIMESTAMPTZ` in PostgreSQL
- Event times are displayed in your device's local timezone
- No more timezone conversion issues when syncing calendars

## Future Enhancements

- [ ] Bi-directional sync (create events in app and export to calendar)
- [ ] Auto-sync on app launch
- [ ] Sync specific event categories only
- [ ] Event conflict detection
- [ ] Recurring event support
- [ ] Calendar color coding
- [ ] Event reminders with custom timing

## Troubleshooting

### Events show wrong time
**Fixed!** The timezone issue has been resolved. If you still see wrong times:
1. Run the update migration: `update_calendar_events_remove_pet_id.sql`
2. Re-import your calendar events
3. Events should now display in your local timezone

### Calendar events not showing
**Fixed!** Calendar events now display regardless of which pet you have selected.
1. Make sure you've run the update migration if you had the old version
2. Events will appear in the Activity tab even when no pet is selected
3. Check the console logs for any import errors

### How to re-sync calendar
1. Delete existing events (optional)
2. Tap calendar icon (📅) in Activity tab
3. Select calendars and import again
4. Upsert logic prevents duplicates based on `external_event_id`
