-- Add invite_code_expires_at column to families table
ALTER TABLE public.families 
ADD COLUMN IF NOT EXISTS invite_code_expires_at timestamptz;