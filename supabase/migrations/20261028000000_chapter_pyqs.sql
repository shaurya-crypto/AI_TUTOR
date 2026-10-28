-- Migration: 20261028000000_chapter_pyqs.sql
-- Description: Chapter Previous Year Questions (PYQs) and Board Practice Sets

CREATE TABLE IF NOT EXISTS public.chapter_pyqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID REFERENCES public.curriculums(id) ON DELETE CASCADE NOT NULL,
  board TEXT NOT NULL,
  class_level TEXT NOT NULL,
  category TEXT NOT NULL,
  chapter_title TEXT NOT NULL,
  source_filename TEXT,
  practice_set JSONB DEFAULT '[]'::jsonb,
  raw_content TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chapter_pyqs_curriculum ON public.chapter_pyqs(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_chapter_pyqs_board_class ON public.chapter_pyqs(board, class_level, category);

ALTER TABLE public.chapter_pyqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public pyqs viewable by all" ON public.chapter_pyqs;
CREATE POLICY "Public pyqs viewable by all" ON public.chapter_pyqs
  FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Service role manages pyqs" ON public.chapter_pyqs;
CREATE POLICY "Service role manages pyqs" ON public.chapter_pyqs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
