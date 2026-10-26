-- ====================================================================
-- Migration: 20261026000000_secure_rls_and_performance_indexes.sql
-- Description: Drop wildcard/insecure dev policies, enforce published curriculum RLS,
--              lock user profiles/enrollments/progress to auth.uid(), and add
--              compound performance indexes for production workloads.
-- ====================================================================

-- 1. DROP INSECURE / WILDCARD DEV POLICIES
DROP POLICY IF EXISTS "Allow all on curriculums" ON public.curriculums;
DROP POLICY IF EXISTS "Allow anon delete curriculums" ON public.curriculums;
DROP POLICY IF EXISTS "Allow all on syllabus_modules" ON public.syllabus_modules;
DROP POLICY IF EXISTS "Allow anon delete syllabus_modules" ON public.syllabus_modules;
DROP POLICY IF EXISTS "Anyone can view modules of published curriculums" ON public.syllabus_modules;
DROP POLICY IF EXISTS "Public modules viewable by all" ON public.syllabus_modules;

DROP POLICY IF EXISTS "Allow all on enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Allow anon delete enrollments" ON public.enrollments;

DROP POLICY IF EXISTS "Allow all on user_progress" ON public.user_progress;

DROP POLICY IF EXISTS "Allow delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow anon update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow view profiles" ON public.profiles;

-- 2. RE-ESTABLISH SECURE CURRICULUM & MODULE POLICIES
-- Curriculums: Public read ONLY for published curriculums
DROP POLICY IF EXISTS "Anyone can view published curriculums" ON public.curriculums;
CREATE POLICY "Anyone can view published curriculums" ON public.curriculums
  FOR SELECT TO public
  USING (is_published = true);

-- Syllabus Modules: Public read ONLY for modules belonging to published curriculums
CREATE POLICY "Anyone can view modules of published curriculums" ON public.syllabus_modules
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.curriculums c
      WHERE c.id = syllabus_modules.curriculum_id AND c.is_published = true
    )
  );

-- 3. USER PROFILES: Strict tenant ownership
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;

CREATE POLICY "Users can view their own profile." ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile." ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 4. ENROLLMENTS: Strict tenant ownership
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can insert their own enrollments" ON public.enrollments;

CREATE POLICY "Users can view their own enrollments" ON public.enrollments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enrollments" ON public.enrollments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5. USER PROGRESS: Strict tenant ownership
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can manage their own progress" ON public.user_progress;

CREATE POLICY "Users can view their own progress" ON public.user_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own progress" ON public.user_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. COMPOUND PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_enrollments_user_status_enrolled 
  ON public.enrollments (user_id, status, enrolled_at);

CREATE INDEX IF NOT EXISTS idx_curriculums_published_order 
  ON public.curriculums (is_published, order_index);

CREATE INDEX IF NOT EXISTS idx_study_session_logs_module 
  ON public.study_session_logs (syllabus_module_id);
