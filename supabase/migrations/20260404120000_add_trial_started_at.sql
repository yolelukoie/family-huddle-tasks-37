ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT NULL;

-- Give existing completed users a fresh 4-day trial starting now
UPDATE public.profiles
SET trial_started_at = now()
WHERE profile_complete = true AND trial_started_at IS NULL;
