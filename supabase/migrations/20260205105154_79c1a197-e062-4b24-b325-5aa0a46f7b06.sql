-- Remove the overly permissive INSERT policy that allows anyone to insert
DROP POLICY IF EXISTS "task_events: anyone can insert" ON public.task_events;

-- The following policies already exist and properly secure the table:
-- - task_events_insert_by_member: requires actor_id = auth.uid() AND family membership
-- - task_events_insert_family_member: requires family membership for both actor and recipient
-- No additional policies needed as the secure ones are already in place