-- Enable REPLICA IDENTITY FULL for realtime filtering
-- This ensures Supabase Realtime receives all column values for proper filtering

ALTER TABLE task_events REPLICA IDENTITY FULL;
ALTER TABLE chat_messages REPLICA IDENTITY FULL;