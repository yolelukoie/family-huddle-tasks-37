-- Add 'reported' to the task_events event_type CHECK constraint
ALTER TABLE public.task_events DROP CONSTRAINT task_events_event_type_check;
ALTER TABLE public.task_events ADD CONSTRAINT task_events_event_type_check 
  CHECK (event_type = ANY (ARRAY['assigned'::text, 'accepted'::text, 'rejected'::text, 'completed'::text, 'reported'::text]));