-- Allow users to hide the character image and achievement badges on their
-- main screen ("more grown-up" view). Calculations are unchanged — this is
-- a display preference only.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS character_hidden boolean NOT NULL DEFAULT false;
