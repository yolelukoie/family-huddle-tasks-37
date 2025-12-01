-- Add unique constraint to user_fcm_tokens for proper upsert behavior
-- This ensures one token per user per platform
ALTER TABLE public.user_fcm_tokens
ADD CONSTRAINT user_fcm_tokens_user_token_unique 
UNIQUE (user_id, token);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user_id 
ON public.user_fcm_tokens(user_id);
