-- ============================================================
-- PAWSITIVE - Database Schema (Supabase Compatible)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE species_type AS ENUM ('dog', 'cat');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'unknown');
CREATE TYPE check_type AS ENUM ('coat', 'fit', 'teeth', 'poop', 'face');
CREATE TYPE check_status AS ENUM ('pending', 'processing', 'complete', 'failed');
CREATE TYPE log_type AS ENUM ('diet', 'activity', 'biological');
CREATE TYPE recommendation_category AS ENUM ('diet', 'activity', 'care', 'grooming', 'vet_visit');
CREATE TYPE severity_level AS ENUM ('info', 'warning', 'urgent');
CREATE TYPE recommendation_source AS ENUM ('ai_check', 'anomaly_detection', 'rag', 'vet');
CREATE TYPE reminder_type AS ENUM ('feeding', 'walking', 'medication', 'grooming', 'checkup', 'custom');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE call_type AS ENUM ('video', 'voice');

-- ============================================================
-- 1. PROFILES (links to auth.users)
-- ============================================================

CREATE TABLE profiles (
    id                          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name                        VARCHAR(100),
    avatar_url                  TEXT,
    phone_number                VARCHAR(20),
    notification_preferences    JSONB DEFAULT '{}'::jsonb,
    timezone                    VARCHAR(50) DEFAULT 'Asia/Singapore',
    is_active                   BOOLEAN DEFAULT TRUE,
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. PETS
-- ============================================================

CREATE TABLE pets (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name                    VARCHAR(100) NOT NULL,
    species                 species_type NOT NULL,
    breed                   VARCHAR(100),
    gender                  gender_type,
    date_of_birth           DATE,
    weight_kg               DECIMAL(5,2),
    profile_photo_url       TEXT,
    existing_conditions     TEXT[] DEFAULT '{}',
    is_neutered             BOOLEAN,
    microchip_id            VARCHAR(50),
    notes                   TEXT,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 3. HEALTH CHECKS
-- ============================================================

CREATE TABLE health_checks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id                  UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    check_type              check_type NOT NULL,
    image_url               TEXT NOT NULL,
    score                   DECIMAL(3,1),
    confidence              DECIMAL(3,2),
    analysis_json           JSONB,
    status                  check_status DEFAULT 'pending',
    image_quality_score     DECIMAL(3,2),
    model_version           VARCHAR(50),
    processing_time_ms      INTEGER,
    created_at              TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 4. HEALTH LOGS
-- ============================================================

CREATE TABLE health_logs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id                  UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    log_type                log_type NOT NULL,
    log_data                JSONB NOT NULL,
    logged_at               TIMESTAMP NOT NULL,
    notes                   TEXT,
    created_at              TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 5. RECOMMENDATIONS
-- ============================================================

CREATE TABLE recommendations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id                  UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    category                recommendation_category NOT NULL,
    title                   VARCHAR(200) NOT NULL,
    content                 TEXT NOT NULL,
    severity                severity_level DEFAULT 'info',
    source                  recommendation_source,
    related_check_id        UUID REFERENCES health_checks(id) ON DELETE SET NULL,
    is_read                 BOOLEAN DEFAULT FALSE,
    is_dismissed            BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 6. REMINDERS
-- ============================================================

CREATE TABLE reminders (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pet_id                  UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    title                   VARCHAR(200) NOT NULL,
    description             TEXT,
    type                    reminder_type NOT NULL,
    recurrence              JSONB,
    next_trigger_at         TIMESTAMP NOT NULL,
    last_triggered_at       TIMESTAMP,
    is_active               BOOLEAN DEFAULT TRUE,
    is_completed            BOOLEAN DEFAULT FALSE,
    completed_at            TIMESTAMP,
    notification_id         TEXT,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 7. VETERINARIANS
-- ============================================================

CREATE TABLE veterinarians (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(100) NOT NULL,
    email                   VARCHAR(255) UNIQUE NOT NULL,
    password_hash           VARCHAR(255) NOT NULL,
    clinic_name             VARCHAR(200),
    specializations         TEXT[] DEFAULT '{}',
    bio                     TEXT,
    profile_photo_url       TEXT,
    license_number          VARCHAR(50),
    years_experience        INTEGER,
    consultation_fee        DECIMAL(6,2) NOT NULL,
    rating                  DECIMAL(2,1) DEFAULT 0.0,
    total_reviews           INTEGER DEFAULT 0,
    languages               TEXT[] DEFAULT '{"English"}',
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 8. VET AVAILABILITY
-- ============================================================

CREATE TABLE vet_availability (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vet_id                  UUID NOT NULL REFERENCES veterinarians(id) ON DELETE CASCADE,
    day_of_week             INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time              TIME NOT NULL,
    end_time                TIME NOT NULL,
    slot_duration_min       INTEGER DEFAULT 30,
    is_active               BOOLEAN DEFAULT TRUE,

    CONSTRAINT chk_time_range CHECK (start_time < end_time)
);

-- ============================================================
-- 9. APPOINTMENTS
-- ============================================================

CREATE TABLE appointments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pet_id                  UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    vet_id                  UUID NOT NULL REFERENCES veterinarians(id) ON DELETE CASCADE,
    scheduled_at            TIMESTAMP NOT NULL,
    duration_min            INTEGER DEFAULT 30,
    status                  appointment_status DEFAULT 'scheduled',
    call_type               call_type DEFAULT 'video',
    call_room_id            VARCHAR(200),
    cancellation_reason     TEXT,
    pet_snapshot_json       JSONB,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 10. CONSULTATION NOTES
-- ============================================================

CREATE TABLE consultation_notes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id          UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    vet_id                  UUID NOT NULL REFERENCES veterinarians(id) ON DELETE CASCADE,
    pet_id                  UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    summary                 TEXT,
    diagnosis               TEXT,
    treatment_plan          JSONB,
    prescriptions           JSONB,
    follow_up_date          DATE,
    attachments             TEXT[] DEFAULT '{}',
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_pets_owner_id ON pets(owner_id);

CREATE INDEX idx_health_checks_pet_id ON health_checks(pet_id);
CREATE INDEX idx_health_checks_pet_type ON health_checks(pet_id, check_type);
CREATE INDEX idx_health_checks_created ON health_checks(pet_id, created_at DESC);

CREATE INDEX idx_health_logs_pet_id ON health_logs(pet_id);
CREATE INDEX idx_health_logs_logged_at ON health_logs(pet_id, logged_at DESC);

CREATE INDEX idx_recommendations_pet_id ON recommendations(pet_id);
CREATE INDEX idx_recommendations_unread ON recommendations(pet_id, is_read) WHERE is_read = FALSE;

CREATE INDEX idx_reminders_next_trigger ON reminders(next_trigger_at) WHERE is_active = TRUE;
CREATE INDEX idx_reminders_user_id ON reminders(user_id);

CREATE INDEX idx_vet_availability_vet_id ON vet_availability(vet_id);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_vet_id ON appointments(vet_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at, status);
CREATE INDEX idx_consultation_notes_appointment ON consultation_notes(appointment_id);

-- ============================================================
-- TRIGGER: auto-update updated_at on modification
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_pets_updated_at
    BEFORE UPDATE ON pets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_veterinarians_updated_at
    BEFORE UPDATE ON veterinarians
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_consultation_notes_updated_at
    BEFORE UPDATE ON consultation_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
