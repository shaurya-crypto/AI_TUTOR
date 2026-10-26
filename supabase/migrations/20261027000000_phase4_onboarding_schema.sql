-- Migration: 20261027000000_phase4_onboarding_schema.sql
-- Description: Extend student profiles for Phase 4 onboarding diagnostic metrics (age, career aspiration, pacing, weak areas)

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS career_aspiration text,
  ADD COLUMN IF NOT EXISTS learning_pace text DEFAULT 'steady_and_balanced',
  ADD COLUMN IF NOT EXISTS favorite_subject text DEFAULT 'Physics',
  ADD COLUMN IF NOT EXISTS strong_subjects text[] DEFAULT ARRAY['Physics']::text[],
  ADD COLUMN IF NOT EXISTS weak_subjects text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS learning_style text DEFAULT 'socratic',
  ADD COLUMN IF NOT EXISTS preferred_teacher_voice text DEFAULT 'Aoede',
  ADD COLUMN IF NOT EXISTS target_board text DEFAULT 'CBSE',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Create index for class_level and target_board filtering
CREATE INDEX IF NOT EXISTS idx_profiles_class_board ON public.profiles (class_level, target_board);
