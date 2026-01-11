-- Enable full replica identity for realtime to receive old row data on DELETE
ALTER TABLE user_families REPLICA IDENTITY FULL;

-- Add table to realtime publication (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'user_families'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_families;
  END IF;
END $$;