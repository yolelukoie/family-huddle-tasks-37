-- Drop the existing check constraint and recreate with "completed" added
ALTER TABLE public.task_events DROP CONSTRAINT IF EXISTS task_events_event_type_check;

ALTER TABLE public.task_events ADD CONSTRAINT task_events_event_type_check 
CHECK (event_type IN ('assigned', 'accepted', 'rejected', 'completed'));