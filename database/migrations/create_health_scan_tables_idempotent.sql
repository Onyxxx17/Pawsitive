-- ============================================================
-- PAWSITIVE - Idempotent setup for scan persistence + trends
-- Safe to run multiple times in Supabase SQL Editor.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'species_type') THEN
        CREATE TYPE public.species_type AS ENUM ('dog', 'cat');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_type') THEN
        CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'unknown');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'check_type') THEN
        CREATE TYPE public.check_type AS ENUM ('coat', 'fit', 'teeth', 'poop', 'face');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'check_status') THEN
        CREATE TYPE public.check_status AS ENUM ('pending', 'processing', 'complete', 'failed');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'log_type') THEN
        CREATE TYPE public.log_type AS ENUM ('diet', 'activity', 'biological');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
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

CREATE TABLE IF NOT EXISTS public.pets (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name                    VARCHAR(100) NOT NULL,
    species                 public.species_type NOT NULL,
    breed                   VARCHAR(100),
    gender                  public.gender_type,
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

CREATE TABLE IF NOT EXISTS public.health_checks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id                  UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    check_type              public.check_type NOT NULL,
    image_url               TEXT NOT NULL,
    score                   DECIMAL(3,1),
    confidence              DECIMAL(3,2),
    analysis_json           JSONB,
    status                  public.check_status DEFAULT 'pending',
    image_quality_score     DECIMAL(3,2),
    model_version           VARCHAR(50),
    processing_time_ms      INTEGER,
    created_at              TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.health_logs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id                  UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    log_type                public.log_type NOT NULL,
    log_data                JSONB NOT NULL,
    logged_at               TIMESTAMP NOT NULL,
    notes                   TEXT,
    created_at              TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.veterinarians (
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

CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON public.pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_health_checks_pet_id ON public.health_checks(pet_id);
CREATE INDEX IF NOT EXISTS idx_health_checks_pet_type ON public.health_checks(pet_id, check_type);
CREATE INDEX IF NOT EXISTS idx_health_checks_created ON public.health_checks(pet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_logs_pet_id ON public.health_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_logged_at ON public.health_logs(pet_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_veterinarians_active ON public.veterinarians(is_active);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $fn$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at') THEN
        CREATE TRIGGER trg_profiles_updated_at
            BEFORE UPDATE ON public.profiles
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pets_updated_at') THEN
        CREATE TRIGGER trg_pets_updated_at
            BEFORE UPDATE ON public.pets
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_veterinarians_updated_at') THEN
        CREATE TRIGGER trg_veterinarians_updated_at
            BEFORE UPDATE ON public.veterinarians
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Optional: create the storage bucket used by image uploads if it does not exist.
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Quick verification
SELECT to_regclass('public.health_checks') AS health_checks_table,
       to_regclass('public.health_logs')   AS health_logs_table;
