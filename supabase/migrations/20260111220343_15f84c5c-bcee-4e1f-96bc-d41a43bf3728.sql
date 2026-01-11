-- Add status column to tasks table for pending/active/completed flow
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add check constraint for valid status values
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('pending', 'active', 'completed'));

-- Update existing tasks to have 'active' status (they're already visible)
UPDATE tasks SET status = 'active' WHERE status IS NULL;

-- Delete duplicate tasks (keep the oldest one based on created_at)
DELETE FROM tasks a USING tasks b
WHERE a.created_at > b.created_at 
  AND a.name = b.name 
  AND a.assigned_to = b.assigned_to 
  AND a.due_date = b.due_date
  AND a.family_id = b.family_id;