-- Add chat_cleared_at column to user_families table
ALTER TABLE public.user_families
ADD COLUMN IF NOT EXISTS chat_cleared_at timestamp with time zone DEFAULT NULL;

COMMENT ON COLUMN public.user_families.chat_cleared_at IS 'Timestamp when user last cleared their chat history. Messages before this timestamp are hidden for this user.';