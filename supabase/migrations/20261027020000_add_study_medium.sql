-- Migration: 20261027020000_add_study_medium.sql
-- Description: Add study_medium to profiles table for separating spoken language from instruction/notes medium

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS study_medium text DEFAULT 'English';
