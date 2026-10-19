-- Migration: Add quiz_questions column to syllabus_modules for fast caching and on-demand generation
ALTER TABLE syllabus_modules ADD COLUMN IF NOT EXISTS quiz_questions jsonb DEFAULT '[]'::jsonb;
