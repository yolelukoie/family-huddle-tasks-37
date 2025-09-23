-- Ensure RLS policies for task_events table

-- Policy for recipients to select their events
CREATE POLICY IF NOT EXISTS "task_events: recipient can select"
ON public.task_events
FOR SELECT
TO authenticated
USING (recipient_id = auth.uid());

-- Policy for authenticated users to insert events
CREATE POLICY IF NOT EXISTS "task_events: anyone can insert"
ON public.task_events
FOR INSERT
TO authenticated
WITH CHECK (true);