-- Migration: 20261016000000_student_study_plans.sql
-- Description: Dynamic Adaptive Study Plans and Study Session Logs for Gauth-inspired Dashboard

CREATE TABLE IF NOT EXISTS public.student_study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_exam_date DATE NOT NULL,
    daily_study_minutes INTEGER NOT NULL DEFAULT 45,
    target_curriculum_ids UUID[] DEFAULT '{}',
    plan_metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_daily_minutes CHECK (daily_study_minutes >= 15 AND daily_study_minutes <= 360)
);

CREATE TABLE IF NOT EXISTS public.study_session_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.student_study_plans(id) ON DELETE SET NULL,
    syllabus_module_id UUID REFERENCES public.syllabus_modules(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
    duration_minutes INTEGER DEFAULT 15,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_study_plans_user ON public.student_study_plans(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_study_session_logs_user_date ON public.study_session_logs(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_study_session_logs_plan ON public.study_session_logs(plan_id);

-- Enable RLS
ALTER TABLE public.student_study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_session_logs ENABLE ROW LEVEL SECURITY;

-- Policies for student_study_plans
CREATE POLICY "Users can view own study plans"
    ON public.student_study_plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own study plans"
    ON public.student_study_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study plans"
    ON public.student_study_plans FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study plans"
    ON public.student_study_plans FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for study_session_logs
CREATE POLICY "Users can view own study session logs"
    ON public.study_session_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own study session logs"
    ON public.study_session_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study session logs"
    ON public.study_session_logs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study session logs"
    ON public.study_session_logs FOR DELETE
    USING (auth.uid() = user_id);
