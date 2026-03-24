-- Migration: create RPC for veterinarian login verification
-- Uses pgcrypto's crypt() so bcrypt-hashed vet passwords can be validated
-- through Supabase RPC instead of raw client-side table reads.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.verify_veterinarian_login(
  input_email TEXT,
  input_password TEXT
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  email VARCHAR,
  clinic_name VARCHAR,
  specializations TEXT[],
  bio TEXT,
  profile_photo_url TEXT,
  license_number VARCHAR,
  years_experience INTEGER,
  consultation_fee DECIMAL,
  languages TEXT[],
  rating DECIMAL,
  total_reviews INTEGER,
  is_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    veterinarians.id,
    veterinarians.name,
    veterinarians.email,
    veterinarians.clinic_name,
    veterinarians.specializations,
    veterinarians.bio,
    veterinarians.profile_photo_url,
    veterinarians.license_number,
    veterinarians.years_experience,
    veterinarians.consultation_fee,
    veterinarians.languages,
    veterinarians.rating,
    veterinarians.total_reviews,
    veterinarians.is_active
  FROM public.veterinarians
  WHERE LOWER(veterinarians.email) = LOWER(TRIM(input_email))
    AND veterinarians.is_active = TRUE
    AND (
      veterinarians.password_hash = TRIM(input_password)
      OR veterinarians.password_hash = crypt(
        TRIM(input_password),
        veterinarians.password_hash::TEXT
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_veterinarian_login(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_veterinarian_login(TEXT, TEXT) TO anon, authenticated;
