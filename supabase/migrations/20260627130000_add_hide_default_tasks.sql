ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hide_default_tasks boolean NOT NULL DEFAULT false;
