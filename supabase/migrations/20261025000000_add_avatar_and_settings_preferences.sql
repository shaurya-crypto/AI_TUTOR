-- Migration: Add selected_avatar_id and target_board to profiles table
-- Supports prebuilt avatar selection (defaulting to 80459b57-2d66-4ca7-8682-59e1c649bc53) and board alignment (CBSE, ICSE, IB)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_avatar_id text DEFAULT '80459b57-2d66-4ca7-8682-59e1c649bc53';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_board text DEFAULT 'CBSE';
