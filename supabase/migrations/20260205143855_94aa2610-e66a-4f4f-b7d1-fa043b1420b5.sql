-- Drop unused status column
ALTER TABLE public.reports DROP COLUMN IF EXISTS status;

-- Add content_name column to store task name at time of reporting
ALTER TABLE public.reports ADD COLUMN content_name text NULL;