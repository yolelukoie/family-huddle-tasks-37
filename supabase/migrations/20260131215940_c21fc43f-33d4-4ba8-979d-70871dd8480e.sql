-- Remove date_of_birth and age columns from profiles table
-- All users now have the same functionality regardless of age

ALTER TABLE public.profiles DROP COLUMN IF EXISTS date_of_birth;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS age;