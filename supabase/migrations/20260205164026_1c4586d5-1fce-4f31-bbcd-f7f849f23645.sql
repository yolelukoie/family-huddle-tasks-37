-- Add block columns to user_families table
ALTER TABLE public.user_families
ADD COLUMN blocked_at TIMESTAMPTZ NULL,
ADD COLUMN blocked_until TIMESTAMPTZ NULL,
ADD COLUMN blocked_indefinite BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN blocked_reason TEXT NULL,
ADD COLUMN blocked_by UUID NULL;

-- Create index for efficient queries on blocked members
CREATE INDEX user_families_blocked_idx 
  ON public.user_families (family_id, blocked_indefinite, blocked_until, blocked_at);

-- Ensure REPLICA IDENTITY FULL for realtime UPDATE payloads
ALTER TABLE public.user_families REPLICA IDENTITY FULL;