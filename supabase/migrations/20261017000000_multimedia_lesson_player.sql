-- Migration: 20261017000000_multimedia_lesson_player.sql
-- Description: Add structured visual lesson plans and multimedia progress tracking to syllabus_modules and user_progress

-- 1. Extend syllabus_modules with visual lesson plans
ALTER TABLE public.syllabus_modules
ADD COLUMN IF NOT EXISTS visual_lesson_plan JSONB DEFAULT '{}'::jsonb;

-- 2. Extend user_progress with visual timeline position and step state
ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS visual_progress JSONB DEFAULT '{"currentStepIndex": 0, "completedStepIds": [], "lastActiveAt": null}'::jsonb;

-- 3. Create index for fast retrieval of modules with lesson plans
CREATE INDEX IF NOT EXISTS idx_syllabus_modules_visual_plan ON public.syllabus_modules USING gin (visual_lesson_plan);
