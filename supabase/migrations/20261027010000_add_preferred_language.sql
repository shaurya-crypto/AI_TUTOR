-- Migration: 20261027010000_add_preferred_language.sql
-- Description: Add preferred_language to profiles table for multilingual tutoring

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'English';
