-- Remove the cascading foreign key from families.created_by to auth.users
-- This prevents automatic family deletion when the creator user is deleted
-- The created_by column remains as an audit/informational field only

ALTER TABLE public.families DROP CONSTRAINT IF EXISTS families_created_by_fkey;