# Pawsitive Development Context

## What this repo is

Pawsitive is a pet care application with:

- A React Native / Expo mobile app in `pawsitive-mobile/`
- A small FastAPI backend in `backend/`
- Supabase-backed database and storage definitions in `database/`
- Gemini-based AI helpers in `backend/src/ai_features/`

The app is split into two user experiences:

- Pet owner workspace
- Veterinarian workspace

## Repo layout

- `pawsitive-mobile/`: main client app, Expo Router, TypeScript, Supabase client
- `backend/`: FastAPI server used for chat, photo analysis, and health-insight generation
- `database/`: schema and migrations for Supabase/Postgres
- `ai-features/`: older duplicated AI helper folder at repo root; the backend currently imports from `backend/src/ai_features/`
- `start-dev.ps1`: starts frontend and backend in separate PowerShell windows

## High-level architecture

### Frontend

The mobile app uses:

- Expo Router for navigation
- React Context for session/profile/pet state
- Supabase Auth for pet owner login/signup
- Supabase Postgres for app data
- Supabase Storage for uploaded pet photos, profile photos, and saved scan images
- Expo Notifications for reminder scheduling
- Expo Calendar for importing device calendar events
- Expo Camera and ImagePicker for scan capture

### Backend

The FastAPI server exposes three main endpoints:

- `POST /chat`: generic pet-care chatbot response
- `POST /analyze`: analyzes a batch of pet scan images
- `POST /health-insights`: summarizes saved health history and answers health questions

The backend delegates AI work to Gemini through `backend/src/ai_features/gemini.py`.

### Data layer

Persistent app state lives primarily in Supabase tables such as:

- `profiles`
- `pets`
- `health_checks`
- `health_logs`
- `reminders`
- `veterinarians`
- `vet_availability`
- `appointments`
- `consultation_notes`
- `calendar_events` from migrations

## App flow

### Entry and authentication

The mobile entry flow is:

1. Splash screen
2. Onboarding
3. Landing page
4. Choose owner or veterinarian path

Owner auth:

- Login and signup use Supabase Auth
- `UserProvider` loads the signed-in user's `profiles` row
- `PetProvider` loads the signed-in user's pets and sets the first pet as active

Vet auth:

- Vet login checks the `veterinarians` table directly
- It currently only verifies that the email exists and `is_active` is true
- It does **not** verify the password against `password_hash` yet

## Owner workspace

The owner app lives under `pawsitive-mobile/app/(tabs)/`.

### Home tab

Purpose:

- Main dashboard for the active pet
- Reminder preview
- Daily scan streak
- Shortcut into the calendar and health views

Behavior:

- Reads the active pet from `PetContext`
- Pulls upcoming reminders from `reminders`
- Pulls recent scan dates from `health_checks`
- Computes a scan streak client-side
- Includes quick log buttons, but those quick actions currently only show alerts and do not persist data

### Activity tab

Purpose:

- Day/week planner for reminders and imported calendar events

Behavior:

- Shows reminders for the selected date
- Supports one-time and recurring reminders
- Writes reminder records to `reminders`
- Schedules local notifications with Expo Notifications
- Marks reminders complete by updating `is_completed` and `completed_at`
- Imports device calendar events into `calendar_events`

Important notes:

- Calendar import reads from device calendars using Expo Calendar
- Imported events are stored per user, not per pet
- Event notification toggling currently updates the database only; actual scheduling for imported calendar events is still TODO
- `syncCalendarEvents()` is effectively a stub right now

### Camera tab

Purpose:

- Guided pet health scan capture and AI analysis

Current scan types:

- Mood / face analysis
- Coat and body condition
- Teeth and gums
- Poop analysis
- Body weight / body condition

Behavior:

- User captures or uploads one image for each scan type
- Client runs a local quality gate before submission
- Guided capture UI gives framing instructions and reference images
- On web, MediaPipe is used for dog detection on some scan types
- The app submits all images in one batch to `POST /analyze`
- Results can be saved to `health_checks`
- Scan images are uploaded to the Supabase `images` bucket before saving final history rows

Important notes:

- The scan flow is one of the most implemented parts of the app
- Quality validation is client-side, while semantic analysis is backend/Gemini-driven

### Health tab

Purpose:

- Health dashboard and trend view for the active pet

Behavior:

- Reads recent `health_checks`
- Reads recent `health_logs`
- Reads active veterinarians for the tele-vet card
- Computes overall score and per-check trends client-side
- Provides a modal health report for recent check details
- Sends saved checks and logs to `POST /health-insights` for AI summaries/Q&A

Important notes:

- If no real health data is available, the screen falls back to a mock-style summary state
- The "Call vet" action is UI-only right now and does not create an appointment or live call

### Chat tab

Purpose:

- PawPal AI conversation screen

Behavior:

- Sends a raw message to `POST /chat`
- Displays the returned text response in a simple chat UI

Important notes:

- Chat is currently generic and stateless
- It does not inject the active pet, recent history, or user context into requests

### Profile and pet management

Purpose:

- Manage owner profile and pets

Behavior:

- Owner profile fields come from `profiles`
- Avatar uploads go to the `images` storage bucket
- Pet create/edit/delete flows operate on `pets`
- Pet photos also upload to the `images` bucket
- Profile screen refreshes the global pet list after pet changes

## Vet workspace

The vet app lives under `pawsitive-mobile/app/(vet)/`.

### Vet dashboard

Purpose:

- Fetch active vet profile
- Show today's and upcoming appointments

Behavior:

- Loads the vet profile from `veterinarians`
- Loads today's and next-week appointments from `appointments`

### Vet schedule

Purpose:

- List appointments by day or week

Behavior:

- Reads `appointments`
- Shows status, call type, pet, and owner details

### Vet availability

Purpose:

- Configure recurring weekly availability

Behavior:

- Reads and writes `vet_availability`
- Supports slot durations of 15, 30, or 60 minutes
- Deletes and reinserts enabled availability rows on save

### Vet profile

Purpose:

- View and edit veterinarian profile details

Behavior:

- Reads and updates `veterinarians`
- Uploads profile photo to a different storage bucket path than owner flows

Important note:

- Vet profile photo upload currently uses the `user_profiles` storage bucket, while owner and pet image flows use the `images` bucket. That storage usage is inconsistent and worth normalizing.

### Consultations

- Still a placeholder screen

## Backend behavior

### `POST /chat`

- Accepts `{ "message": "..." }`
- Returns `{ "response": "..." }`
- Uses Gemini with a generic pet-care assistant prompt
- Does not use database state or conversation memory

### `POST /analyze`

- Accepts multipart form data
- Requires matched `analysisTypes[]` and `photos[]`
- Validates file MIME type
- Runs one Gemini prompt per image/analysis type
- Returns a list of structured results

### `POST /health-insights`

- Accepts saved checks/logs plus an optional question
- Sends the history payload to Gemini
- Returns Markdown-like guidance for the health screen

## AI implementation notes

- Gemini is configured through `GEMINI_API_KEY`
- The backend tries multiple Gemini models in fallback order
- Scan prompts enforce JSON output for image analysis
- Health insights use a Markdown-style summary prompt

Important note:

- There is duplicated AI code in `ai-features/` and `backend/src/ai_features/`. The backend server currently uses the backend copy.

## Database notes

### Core relationships

- `profiles.id` references `auth.users.id`
- Each pet belongs to one owner profile
- `health_checks`, `health_logs`, and `reminders` belong to a pet
- Appointments connect owner profile, pet, and veterinarian

### Schema drift to be aware of

- `database/schema.sql` is not the full current source of truth anymore
- `calendar_events` is created in migrations, not in the base schema file
- The `reminders` section in `schema.sql` includes duplicated and partially drifted definitions
- Several app behaviors now depend on fields added by migrations, such as reminder completion and notification metadata

When working on database changes, read both:

- `database/schema.sql`
- `database/migrations/`

## Development entry points

If you are changing navigation or user flow, start with:

- `pawsitive-mobile/app/_layout.tsx`
- `pawsitive-mobile/app/index.tsx`
- `pawsitive-mobile/app/landing.tsx`

If you are changing owner session or profile state, start with:

- `pawsitive-mobile/context/UserContext.tsx`
- `pawsitive-mobile/context/PetContext.tsx`
- `pawsitive-mobile/lib/supabase.ts`

If you are changing scan functionality, start with:

- `pawsitive-mobile/app/(tabs)/camera.tsx`
- `pawsitive-mobile/components/healthAnalysis/PhotoUploader.tsx`
- `pawsitive-mobile/components/healthAnalysis/GuidedCaptureModal.tsx`
- `pawsitive-mobile/utils/scanQuality.ts`
- `backend/src/server.py`
- `backend/src/ai_features/gemini.py`
- `backend/src/ai_features/prompts_config.py`

If you are changing reminders or calendar behavior, start with:

- `pawsitive-mobile/app/(tabs)/activity.tsx`
- `pawsitive-mobile/utils/notifications.ts`
- `pawsitive-mobile/utils/calendarUtils.ts`
- `pawsitive-mobile/components/CalendarImportModal.tsx`

If you are changing vet workflows, start with:

- `pawsitive-mobile/app/vet-login.tsx`
- `pawsitive-mobile/app/(vet)/index.tsx`
- `pawsitive-mobile/app/(vet)/schedule.tsx`
- `pawsitive-mobile/app/(vet)/availability.tsx`
- `pawsitive-mobile/app/(vet)/profile.tsx`

## Local development setup

### Current local readiness

As of this repo inspection:

- `pawsitive-mobile/node_modules` exists
- `backend/venv` exists
- `pawsitive-mobile/.env` exists
- `backend/.env` exists

### Required environment variables

Frontend expects:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_BACKEND_API_URL`
- Optional dev autofill values:
  - `EXPO_PUBLIC_DEV_LOGIN_EMAIL`
  - `EXPO_PUBLIC_DEV_LOGIN_PW`

Backend expects:

- `GEMINI_API_KEY`

### Start commands

Recommended:

- `./start-dev.ps1`
- `./start-dev.ps1 -InstallDeps`

Manual startup:

- Frontend: `cd pawsitive-mobile && npm start`
- Backend: `cd backend && python -m fastapi run src/server.py`

Important note for physical-device Expo testing:

- `EXPO_PUBLIC_BACKEND_API_URL` needs to point to your machine's reachable local IP, not just `localhost`

## Current gaps and risks

- Vet authentication is not secure yet; password verification is still TODO
- PawPal chat is generic and not grounded in the selected pet
- Quick log actions on the home screen do not persist to `health_logs`
- Imported calendar event notifications are not fully implemented
- Consultations is still a placeholder
- There is some schema drift between `schema.sql` and migrations
- Storage bucket usage is inconsistent between owner and vet image uploads
- The root `README.md` is minimal and not a reliable source of setup detail

## Recommended next steps before major feature work

1. Normalize the database source of truth between `schema.sql` and migrations
2. Decide whether vet auth should move into Supabase Auth or stay custom
3. Normalize storage bucket usage for all image uploads
4. Decide whether PawPal should become pet-aware and history-aware
5. Add a real write path for `health_logs` if quick logging is meant to be a core feature
