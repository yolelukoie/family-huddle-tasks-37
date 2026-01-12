-- Drop existing permissive SELECT policy
DROP POLICY IF EXISTS "Read self or co-members" ON public.profiles;

-- Create new restrictive policy: users can only read their own profile
CREATE POLICY "Users can only read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Family members must use get_family_members() function which already hides date_of_birth