-- Migration: 20261012000000_chapter_notes_and_security.sql
-- Description: Add chapter notes and caching metadata, capsule numericals and misconceptions, indexes, and Row Level Security (RLS)

-- 1. Extend curriculums table for chapter notes & caching metadata
ALTER TABLE public.curriculums
ADD COLUMN IF NOT EXISTS raw_chapter_notes TEXT,
ADD COLUMN IF NOT EXISTS notes_summary TEXT,
ADD COLUMN IF NOT EXISTS notes_source_filename TEXT,
ADD COLUMN IF NOT EXISTS notes_updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS gemini_cache_name TEXT;

-- 2. Extend syllabus_modules for capsule-level depth
ALTER TABLE public.syllabus_modules
ADD COLUMN IF NOT EXISTS chapter_notes TEXT,
ADD COLUMN IF NOT EXISTS worked_examples JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS common_misconceptions TEXT[] DEFAULT ARRAY[]::text[];

-- 3. Create high-performance compound indexes
CREATE INDEX IF NOT EXISTS idx_curriculums_board_class_cat ON public.curriculums (board, class_level, category, order_index);
CREATE INDEX IF NOT EXISTS idx_syllabus_modules_curriculum_order ON public.syllabus_modules (curriculum_id, order_index);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_module ON public.user_progress (user_id, syllabus_module_id);

-- Ensure ai_user_memories table exists
CREATE TABLE IF NOT EXISTS public.ai_user_memories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles (id) on delete cascade not null,
  memory_type text,
  content text not null,
  importance_score numeric default 0.5,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE INDEX IF NOT EXISTS idx_ai_user_memories_user_importance ON public.ai_user_memories (user_id, importance_score DESC);

-- 4. Enable RLS across application tables
ALTER TABLE public.curriculums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_user_memories ENABLE ROW LEVEL SECURITY;

-- 5. Curriculums & Modules Policies:
-- Public read for published; writes strictly via service_role
DROP POLICY IF EXISTS "Public curriculums viewable by all" ON public.curriculums;
CREATE POLICY "Public curriculums viewable by all" ON public.curriculums
  FOR SELECT TO authenticated, anon
  USING (is_published = true);

DROP POLICY IF EXISTS "Service role manages curriculums" ON public.curriculums;
CREATE POLICY "Service role manages curriculums" ON public.curriculums
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public modules viewable by all" ON public.syllabus_modules;
CREATE POLICY "Public modules viewable by all" ON public.syllabus_modules
  FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Service role manages syllabus modules" ON public.syllabus_modules;
CREATE POLICY "Service role manages syllabus modules" ON public.syllabus_modules
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Student Data Policies: Strictly isolated to authenticated user
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role manages profiles" ON public.profiles;
CREATE POLICY "Service role manages profiles" ON public.profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users manage own progress" ON public.user_progress;
CREATE POLICY "Users manage own progress" ON public.user_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages user progress" ON public.user_progress;
CREATE POLICY "Service role manages user progress" ON public.user_progress
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users manage own enrollments" ON public.enrollments;
CREATE POLICY "Users manage own enrollments" ON public.enrollments
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages enrollments" ON public.enrollments;
CREATE POLICY "Service role manages enrollments" ON public.enrollments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users manage own AI memories" ON public.ai_user_memories;
CREATE POLICY "Users manage own AI memories" ON public.ai_user_memories
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages AI memories" ON public.ai_user_memories;
CREATE POLICY "Service role manages AI memories" ON public.ai_user_memories
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
