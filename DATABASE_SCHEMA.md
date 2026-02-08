# Pawsitive - Database Schema Reference

> Comprehensive schema definitions for all entities in the Pawsitive MVP.
> Database: **PostgreSQL** (via Supabase) | ORM: **Prisma** | Validation: **Zod**

---

## Table of Contents

1. [Entity Relationship Overview](#1-entity-relationship-overview)
2. [User Profile](#2-user-profile)
3. [Pet Profile](#3-pet-profile)
4. [Health Checks](#4-health-checks)
5. [Health Logs](#5-health-logs)
6. [Recommendations](#6-recommendations)
7. [Reminders](#7-reminders)
8. [TeleVet - Veterinarians](#8-televet---veterinarians)
9. [TeleVet - Vet Availability](#9-televet---vet-availability)
10. [TeleVet - Appointments](#10-televet---appointments)
11. [TeleVet - Consultation Notes](#11-televet---consultation-notes)
12. [JSONB Field Schemas](#12-jsonb-field-schemas)
13. [Indexes](#13-indexes)
14. [Enums Reference](#14-enums-reference)

---

## 1. Entity Relationship Overview

```
users ─────────┐
  │             │
  │ 1:N         │ 1:N
  ▼             ▼
 pets        reminders
  │
  ├── 1:N ──► health_checks
  ├── 1:N ──► health_logs
  ├── 1:N ──► recommendations
  │
  └── N:1 ──► appointments ◄── N:1 ── veterinarians
                  │                        │
                  │ 1:1                     │ 1:N
                  ▼                         ▼
          consultation_notes         vet_availability
```

---

## 2. User Profile

> Stores registered user accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Unique user identifier |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | User's email address (used for login) |
| `password_hash` | `VARCHAR(255)` | NOT NULL | Bcrypt-hashed password |
| `name` | `VARCHAR(100)` | NOT NULL | User's display name |
| `avatar_url` | `TEXT` | NULLABLE | URL to user's profile photo |
| `phone_number` | `VARCHAR(20)` | NULLABLE | Contact number (for TeleVet notifications) |
| `notification_preferences` | `JSONB` | DEFAULT `{}` | Push notification settings (see [JSONB schemas](#121-notification-preferences)) |
| `timezone` | `VARCHAR(50)` | DEFAULT `'Asia/Singapore'` | User's timezone for reminders |
| `is_active` | `BOOLEAN` | DEFAULT `TRUE` | Soft-delete flag |
| `created_at` | `TIMESTAMP` | DEFAULT `NOW()` | Account creation time |
| `updated_at` | `TIMESTAMP` | DEFAULT `NOW()` | Last profile update time |

### Relationships

- **Has many** `pets` (1:N via `pets.owner_id`)
- **Has many** `reminders` (1:N via `reminders.user_id`)
- **Has many** `appointments` (1:N via `appointments.user_id`)

---

## 3. Pet Profile

> Stores pet profiles with breed, age, weight, and medical history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Unique pet identifier |
| `owner_id` | `UUID` | FK → `users(id)`, ON DELETE CASCADE, NOT NULL | Owner of the pet |
| `name` | `VARCHAR(100)` | NOT NULL | Pet's name |
| `species` | `VARCHAR(20)` | NOT NULL | `'dog'` or `'cat'` |
| `breed` | `VARCHAR(100)` | NULLABLE | Breed or breed mix (e.g., `'Golden Retriever'`, `'Mixed - Poodle/Lab'`) |
| `gender` | `VARCHAR(10)` | NULLABLE | `'male'`, `'female'`, `'unknown'` |
| `date_of_birth` | `DATE` | NULLABLE | Pet's date of birth (used to calculate age) |
| `weight_kg` | `DECIMAL(5,2)` | NULLABLE | Current weight in kilograms |
| `profile_photo_url` | `TEXT` | NULLABLE | URL to pet's profile photo in cloud storage |
| `existing_conditions` | `TEXT[]` | DEFAULT `'{}'` | Array of known medical conditions (e.g., `['hip dysplasia', 'allergies']`) |
| `is_neutered` | `BOOLEAN` | NULLABLE | Whether the pet is spayed/neutered |
| `microchip_id` | `VARCHAR(50)` | NULLABLE | Microchip number if available |
| `notes` | `TEXT` | NULLABLE | Free-text notes about the pet |
| `created_at` | `TIMESTAMP` | DEFAULT `NOW()` | Profile creation time |
| `updated_at` | `TIMESTAMP` | DEFAULT `NOW()` | Last profile update time |

### Relationships

- **Belongs to** `users` (N:1 via `owner_id`)
- **Has many** `health_checks` (1:N via `health_checks.pet_id`)
- **Has many** `health_logs` (1:N via `health_logs.pet_id`)
- **Has many** `recommendations` (1:N via `recommendations.pet_id`)
- **Has many** `reminders` (1:N via `reminders.pet_id`)
- **Has many** `appointments` (1:N via `appointments.pet_id`)

---

## 4. Health Checks

> Stores AI-powered health check results from photo analysis. Covers 5 check types: Coat, Fit, Teeth, Poop, Face.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Unique health check identifier |
| `pet_id` | `UUID` | FK → `pets(id)`, ON DELETE CASCADE, NOT NULL | Pet being checked |
| `check_type` | `VARCHAR(20)` | NOT NULL | One of: `'coat'`, `'fit'`, `'teeth'`, `'poop'`, `'face'` |
| `image_url` | `TEXT` | NOT NULL | URL to the uploaded check photo |
| `score` | `DECIMAL(3,1)` | NULLABLE | AI-generated score (0.0–10.0) |
| `confidence` | `DECIMAL(3,2)` | NULLABLE | AI confidence level (0.00–1.00) |
| `analysis_json` | `JSONB` | NULLABLE | Detailed AI output (see [JSONB schemas](#122-health-check-analysis)) |
| `status` | `VARCHAR(20)` | DEFAULT `'pending'` | Processing status: `'pending'`, `'processing'`, `'complete'`, `'failed'` |
| `image_quality_score` | `DECIMAL(3,2)` | NULLABLE | Pre-analysis image quality rating (0.00–1.00) |
| `model_version` | `VARCHAR(50)` | NULLABLE | AI model version used (for reproducibility) |
| `processing_time_ms` | `INTEGER` | NULLABLE | Time taken for AI inference in milliseconds |
| `created_at` | `TIMESTAMP` | DEFAULT `NOW()` | When the check was submitted |

### Relationships

- **Belongs to** `pets` (N:1 via `pet_id`)

---

## 5. Health Logs

> Manual daily logs for diet, activity, and biological markers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Unique log identifier |
| `pet_id` | `UUID` | FK → `pets(id)`, ON DELETE CASCADE, NOT NULL | Pet this log belongs to |
| `log_type` | `VARCHAR(20)` | NOT NULL | One of: `'diet'`, `'activity'`, `'biological'` |
| `log_data` | `JSONB` | NOT NULL | Flexible data per log type (see [JSONB schemas](#123-health-log-data)) |
| `logged_at` | `TIMESTAMP` | NOT NULL | When the event actually occurred |
| `notes` | `TEXT` | NULLABLE | Optional free-text notes |
| `created_at` | `TIMESTAMP` | DEFAULT `NOW()` | When the log entry was recorded |

### Relationships

- **Belongs to** `pets` (N:1 via `pet_id`)

---

## 6. Recommendations

> AI-generated care, diet, and activity recommendations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Unique recommendation identifier |
| `pet_id` | `UUID` | FK → `pets(id)`, ON DELETE CASCADE, NOT NULL | Pet this recommendation is for |
| `category` | `VARCHAR(30)` | NOT NULL | One of: `'diet'`, `'activity'`, `'care'`, `'grooming'`, `'vet_visit'` |
| `title` | `VARCHAR(200)` | NOT NULL | Short recommendation headline |
| `content` | `TEXT` | NOT NULL | Full recommendation text |
| `severity` | `VARCHAR(10)` | DEFAULT `'info'` | `'info'`, `'warning'`, `'urgent'` |
| `source` | `VARCHAR(30)` | NULLABLE | Source of recommendation: `'ai_check'`, `'anomaly_detection'`, `'rag'`, `'vet'` |
| `related_check_id` | `UUID` | FK → `health_checks(id)`, NULLABLE | Health check that triggered this recommendation |
| `is_read` | `BOOLEAN` | DEFAULT `FALSE` | Whether the user has viewed it |
| `is_dismissed` | `BOOLEAN` | DEFAULT `FALSE` | Whether the user dismissed it |
| `created_at` | `TIMESTAMP` | DEFAULT `NOW()` | When the recommendation was generated |

### Relationships

- **Belongs to** `pets` (N:1 via `pet_id`)
- **Optionally belongs to** `health_checks` (N:1 via `related_check_id`)

---

## 7. Reminders

> User-configured reminders for feeding, walking, medication, etc.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Unique reminder identifier |
| `user_id` | `UUID` | FK → `users(id)`, ON DELETE CASCADE, NOT NULL | User who created the reminder |
| `pet_id` | `UUID` | FK → `pets(id)`, ON DELETE CASCADE, NOT NULL | Pet this reminder is for |
| `title` | `VARCHAR(200)` | NOT NULL | Reminder title (e.g., `'Feed Max breakfast'`) |
| `type` | `VARCHAR(20)` | NOT NULL | One of: `'feeding'`, `'walking'`, `'medication'`, `'grooming'`, `'checkup'`, `'custom'` |
| `recurrence` | `JSONB` | NULLABLE | Recurrence pattern (see [JSONB schemas](#124-recurrence-pattern)) |
| `next_trigger_at` | `TIMESTAMP` | NULLABLE | Next scheduled notification time |
| `is_active` | `BOOLEAN` | DEFAULT `TRUE` | Whether the reminder is enabled |
| `created_at` | `TIMESTAMP` | DEFAULT `NOW()` | When the reminder was created |
| `updated_at` | `TIMESTAMP` | DEFAULT `NOW()` | Last update time |

### Relationships

- **Belongs to** `users` (N:1 via `user_id`)
- **Belongs to** `pets` (N:1 via `pet_id`)

---

## 8. TeleVet - Veterinarians

> Registered veterinarian profiles for teleconsultation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Unique vet identifier |
| `name` | `VARCHAR(100)` | NOT NULL | Vet's full name |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | Vet's contact email |
| `clinic_name` | `VARCHAR(200)` | NULLABLE | Name of affiliated clinic |
| `specializations` | `TEXT[]` | DEFAULT `'{}'` | Areas of expertise (e.g., `['dermatology', 'dentistry', 'general']`) |
| `bio` | `TEXT` | NULLABLE | Short professional biography |
| `profile_photo_url` | `TEXT` | NULLABLE | URL to vet's profile photo |
| `license_number` | `VARCHAR(50)` | NULLABLE | Professional veterinary license number |
| `years_experience` | `INTEGER` | NULLABLE | Years of practice |
| `consultation_fee` | `DECIMAL(6,2)` | NOT NULL | Per-session fee in SGD |
| `rating` | `DECIMAL(2,1)` | DEFAULT `0.0` | Average rating (1.0–5.0) |
| `total_reviews` | `INTEGER` | DEFAULT `0` | Total number of reviews received |
| `languages` | `TEXT[]` | DEFAULT `'{"English"}'` | Languages spoken |
| `is_active` | `BOOLEAN` | DEFAULT `TRUE` | Whether the vet is accepting bookings |
| `created_at` | `TIMESTAMP` | DEFAULT `NOW()` | Profile creation time |
| `updated_at` | `TIMESTAMP` | DEFAULT `NOW()` | Last update time |

### Relationships

- **Has many** `vet_availability` (1:N via `vet_availability.vet_id`)
- **Has many** `appointments` (1:N via `appointments.vet_id`)
- **Has many** `consultation_notes` (1:N via `consultation_notes.vet_id`)

---

## 9. TeleVet - Vet Availability

> Weekly availability slots for each veterinarian.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Unique slot identifier |
| `vet_id` | `UUID` | FK → `veterinarians(id)`, ON DELETE CASCADE, NOT NULL | Vet this slot belongs to |
| `day_of_week` | `INTEGER` | NOT NULL, CHECK (0–6) | Day of week (`0` = Sunday, `6` = Saturday) |
| `start_time` | `TIME` | NOT NULL | Slot start time (e.g., `09:00`) |
| `end_time` | `TIME` | NOT NULL | Slot end time (e.g., `17:00`) |
| `slot_duration_min` | `INTEGER` | DEFAULT `30` | Duration of each consultation slot in minutes |
| `is_active` | `BOOLEAN` | DEFAULT `TRUE` | Whether this availability window is active |

### Relationships

- **Belongs to** `veterinarians` (N:1 via `vet_id`)

---

## 10. TeleVet - Appointments

> Booked consultation appointments between users and vets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Unique appointment identifier |
| `user_id` | `UUID` | FK → `users(id)`, ON DELETE CASCADE, NOT NULL | User who booked |
| `pet_id` | `UUID` | FK → `pets(id)`, ON DELETE CASCADE, NOT NULL | Pet for the consultation |
| `vet_id` | `UUID` | FK → `veterinarians(id)`, ON DELETE CASCADE, NOT NULL | Vet conducting the consultation |
| `scheduled_at` | `TIMESTAMP` | NOT NULL | Scheduled start time |
| `duration_min` | `INTEGER` | DEFAULT `30` | Consultation duration in minutes |
| `status` | `VARCHAR(20)` | DEFAULT `'scheduled'` | `'scheduled'`, `'in_progress'`, `'completed'`, `'cancelled'`, `'no_show'` |
| `call_type` | `VARCHAR(10)` | DEFAULT `'video'` | `'video'` or `'voice'` |
| `call_room_id` | `VARCHAR(200)` | NULLABLE | Twilio/Agora room identifier for the call |
| `cancellation_reason` | `TEXT` | NULLABLE | Reason if appointment was cancelled |
| `pet_snapshot_json` | `JSONB` | NULLABLE | Frozen pet health snapshot shared with vet (see [JSONB schemas](#125-pet-health-snapshot)) |
| `created_at` | `TIMESTAMP` | DEFAULT `NOW()` | Booking creation time |
| `updated_at` | `TIMESTAMP` | DEFAULT `NOW()` | Last status update time |

### Relationships

- **Belongs to** `users` (N:1 via `user_id`)
- **Belongs to** `pets` (N:1 via `pet_id`)
- **Belongs to** `veterinarians` (N:1 via `vet_id`)
- **Has one** `consultation_notes` (1:1 via `consultation_notes.appointment_id`)

---

## 11. TeleVet - Consultation Notes

> Vet-authored notes, diagnosis, and treatment plans from a consultation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Unique note identifier |
| `appointment_id` | `UUID` | FK → `appointments(id)`, ON DELETE CASCADE, UNIQUE, NOT NULL | Associated appointment |
| `vet_id` | `UUID` | FK → `veterinarians(id)`, ON DELETE CASCADE, NOT NULL | Vet who wrote the notes |
| `pet_id` | `UUID` | FK → `pets(id)`, ON DELETE CASCADE, NOT NULL | Pet the notes are about |
| `summary` | `TEXT` | NULLABLE | Vet's consultation summary |
| `diagnosis` | `TEXT` | NULLABLE | Diagnosis or observations |
| `treatment_plan` | `JSONB` | NULLABLE | Structured treatment plan (see [JSONB schemas](#126-treatment-plan)) |
| `prescriptions` | `JSONB` | NULLABLE | Medications prescribed (see [JSONB schemas](#127-prescriptions)) |
| `follow_up_date` | `DATE` | NULLABLE | Recommended follow-up date |
| `attachments` | `TEXT[]` | DEFAULT `'{}'` | URLs to uploaded documents or images |
| `created_at` | `TIMESTAMP` | DEFAULT `NOW()` | When notes were created |
| `updated_at` | `TIMESTAMP` | DEFAULT `NOW()` | Last update time |

### Relationships

- **Belongs to** `appointments` (1:1 via `appointment_id`)
- **Belongs to** `veterinarians` (N:1 via `vet_id`)
- **Belongs to** `pets` (N:1 via `pet_id`)

---

## 12. JSONB Field Schemas

### 12.1 Notification Preferences

> `users.notification_preferences`

```json
{
  "push_enabled": true,
  "reminder_notifications": true,
  "health_alerts": true,
  "recommendation_notifications": true,
  "televet_reminders": true,
  "quiet_hours": {
    "enabled": false,
    "start": "22:00",
    "end": "07:00"
  }
}
```

### 12.2 Health Check Analysis

> `health_checks.analysis_json` — structure varies by `check_type`.

#### Poop Check

```json
{
  "consistency": "firm",
  "consistency_score": 4,
  "bristol_scale": 4,
  "color": "brown",
  "color_normal": true,
  "abnormalities": [],
  "flags": [],
  "summary": "Healthy stool with normal consistency and color.",
  "recommendations": [
    "Continue current diet — stool quality looks great."
  ]
}
```

#### Coat Check

```json
{
  "overall_condition": "good",
  "smoothness_score": 7.5,
  "shine": "moderate",
  "shedding_level": "normal",
  "abnormalities": [],
  "bald_patches_detected": false,
  "skin_irritation_detected": false,
  "summary": "Coat is in good condition with moderate shine.",
  "recommendations": [
    "Regular brushing 2-3 times per week to maintain coat health."
  ]
}
```

#### Fit Check (Body Condition Score)

```json
{
  "body_condition_score": 5,
  "bcs_scale": "1-9",
  "classification": "ideal",
  "estimated_weight_status": "healthy",
  "rib_visibility": "palpable with slight fat covering",
  "waist_visible": true,
  "abdominal_tuck": true,
  "summary": "Pet is at an ideal body condition score of 5/9.",
  "recommendations": [
    "Maintain current feeding portions and exercise routine."
  ]
}
```

#### Teeth Check

```json
{
  "dental_grade": 1,
  "dental_scale": "0-4",
  "tartar_level": "mild",
  "gum_color": "pink",
  "gum_inflammation": false,
  "plaque_detected": true,
  "broken_teeth_detected": false,
  "summary": "Mild plaque buildup detected. Gums appear healthy.",
  "recommendations": [
    "Introduce dental chews or brushing 3 times per week."
  ]
}
```

#### Face Check (Mood)

```json
{
  "mood": "alert",
  "mood_confidence": 0.82,
  "energy_level": "high",
  "pain_indicators": [],
  "eye_condition": "clear",
  "ear_position": "forward",
  "facial_symmetry": true,
  "summary": "Pet appears alert and comfortable with no signs of distress.",
  "recommendations": []
}
```

### 12.3 Health Log Data

> `health_logs.log_data` — structure varies by `log_type`.

#### Diet Log

```json
{
  "food_type": "dry kibble",
  "brand": "Royal Canin",
  "amount_grams": 150,
  "meal_time": "breakfast",
  "treats": [
    { "name": "dental stick", "quantity": 1 }
  ],
  "water_intake_ml": 300,
  "appetite": "normal"
}
```

#### Activity Log

```json
{
  "activity_type": "walk",
  "duration_min": 30,
  "distance_km": 1.5,
  "intensity": "moderate",
  "location": "park",
  "weather": "sunny"
}
```

#### Biological Marker Log

```json
{
  "marker_type": "defecation",
  "frequency": 2,
  "consistency": "normal",
  "abnormalities": [],
  "vomiting": false,
  "coughing": false,
  "sneezing": false,
  "lethargy": false,
  "temperature_celsius": null
}
```

### 12.4 Recurrence Pattern

> `reminders.recurrence`

```json
{
  "frequency": "daily",
  "interval": 1,
  "days_of_week": [1, 2, 3, 4, 5],
  "time": "08:00",
  "ends_at": null
}
```

**Frequency options:** `'once'`, `'daily'`, `'weekly'`, `'monthly'`

### 12.5 Pet Health Snapshot

> `appointments.pet_snapshot_json` — frozen at booking time for vet review.

```json
{
  "pet_name": "Max",
  "species": "dog",
  "breed": "Golden Retriever",
  "age_months": 36,
  "weight_kg": 30.5,
  "existing_conditions": ["hip dysplasia"],
  "recent_scores": {
    "coat": { "score": 7.5, "date": "2026-02-01" },
    "fit": { "score": 5.0, "date": "2026-02-01" },
    "teeth": { "score": 6.0, "date": "2026-01-28" },
    "poop": { "score": 8.0, "date": "2026-02-05" },
    "face": { "score": 7.0, "date": "2026-02-03" }
  },
  "recent_logs_summary": {
    "avg_daily_food_grams": 300,
    "avg_daily_walk_min": 45,
    "recent_abnormalities": []
  },
  "active_recommendations": [
    "Increase daily walk duration to 60 minutes for weight management."
  ]
}
```

### 12.6 Treatment Plan

> `consultation_notes.treatment_plan`

```json
{
  "steps": [
    {
      "order": 1,
      "action": "Switch to hypoallergenic diet",
      "duration": "2 weeks",
      "notes": "Gradually transition over 5 days"
    },
    {
      "order": 2,
      "action": "Apply medicated shampoo",
      "frequency": "twice per week",
      "duration": "4 weeks",
      "product": "Malaseb"
    }
  ],
  "follow_up_required": true,
  "follow_up_notes": "Re-check coat condition in 4 weeks"
}
```

### 12.7 Prescriptions

> `consultation_notes.prescriptions`

```json
[
  {
    "medication": "Apoquel",
    "dosage": "5.4mg",
    "frequency": "twice daily",
    "duration": "14 days",
    "instructions": "Give with food"
  }
]
```

---

## 13. Indexes

Recommended indexes for query performance:

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);

-- Pet lookups by owner
CREATE INDEX idx_pets_owner_id ON pets(owner_id);

-- Health check queries
CREATE INDEX idx_health_checks_pet_id ON health_checks(pet_id);
CREATE INDEX idx_health_checks_pet_type ON health_checks(pet_id, check_type);
CREATE INDEX idx_health_checks_created ON health_checks(pet_id, created_at DESC);

-- Health log queries
CREATE INDEX idx_health_logs_pet_id ON health_logs(pet_id);
CREATE INDEX idx_health_logs_pet_type ON health_logs(pet_id, log_type);
CREATE INDEX idx_health_logs_logged_at ON health_logs(pet_id, logged_at DESC);

-- Recommendation queries
CREATE INDEX idx_recommendations_pet_id ON recommendations(pet_id);
CREATE INDEX idx_recommendations_unread ON recommendations(pet_id, is_read) WHERE is_read = FALSE;

-- Reminder scheduling
CREATE INDEX idx_reminders_next_trigger ON reminders(next_trigger_at) WHERE is_active = TRUE;
CREATE INDEX idx_reminders_user_id ON reminders(user_id);

-- TeleVet queries
CREATE INDEX idx_vet_availability_vet_id ON vet_availability(vet_id);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_vet_id ON appointments(vet_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at, status);
CREATE INDEX idx_consultation_notes_appointment ON consultation_notes(appointment_id);
```

---

## 14. Enums Reference

| Field | Allowed Values |
|-------|---------------|
| `pets.species` | `'dog'`, `'cat'` |
| `pets.gender` | `'male'`, `'female'`, `'unknown'` |
| `health_checks.check_type` | `'coat'`, `'fit'`, `'teeth'`, `'poop'`, `'face'` |
| `health_checks.status` | `'pending'`, `'processing'`, `'complete'`, `'failed'` |
| `health_logs.log_type` | `'diet'`, `'activity'`, `'biological'` |
| `recommendations.category` | `'diet'`, `'activity'`, `'care'`, `'grooming'`, `'vet_visit'` |
| `recommendations.severity` | `'info'`, `'warning'`, `'urgent'` |
| `recommendations.source` | `'ai_check'`, `'anomaly_detection'`, `'rag'`, `'vet'` |
| `reminders.type` | `'feeding'`, `'walking'`, `'medication'`, `'grooming'`, `'checkup'`, `'custom'` |
| `reminders.recurrence.frequency` | `'once'`, `'daily'`, `'weekly'`, `'monthly'` |
| `appointments.status` | `'scheduled'`, `'in_progress'`, `'completed'`, `'cancelled'`, `'no_show'` |
| `appointments.call_type` | `'video'`, `'voice'` |

---

*Last updated: February 8, 2026*
*Project: PAWSITIVE — G4T1 — CS206 Software Product Management*
