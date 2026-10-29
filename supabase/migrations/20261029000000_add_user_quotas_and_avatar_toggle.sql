-- Migration: 20261029000000_add_user_quotas_and_avatar_toggle.sql
-- Description: Add configurable request/module usage limits and avatar toggles per student account

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_avatar_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS limit_type text DEFAULT 'unlimited',
  ADD COLUMN IF NOT EXISTS max_requests integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS used_requests integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_modules integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS used_modules integer DEFAULT 0;

COMMENT ON COLUMN public.profiles.is_avatar_enabled IS 'Controls whether the live video avatar (Simli/WebRTC) is enabled for this account. If false, classroom operates in audio-only mode with no avatar.';
COMMENT ON COLUMN public.profiles.limit_type IS 'Usage quota type: "requests" (max API interactions/prompts), "modules" (max curriculum modules taken), or "unlimited".';
COMMENT ON COLUMN public.profiles.max_requests IS 'Max requests allowed if limit_type is requests.';
COMMENT ON COLUMN public.profiles.used_requests IS 'Requests consumed so far by the student.';
COMMENT ON COLUMN public.profiles.max_modules IS 'Max modules allowed to be taken if limit_type is modules.';
COMMENT ON COLUMN public.profiles.used_modules IS 'Number of modules taken/accessed so far by the student.';
