-- Fix touch_updated_at function search path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$;

-- Fix overly permissive RLS policy on families table
-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Users can create families" ON public.families;

-- Create a more secure policy that ensures created_by is set correctly
CREATE POLICY "Users can create families" 
ON public.families 
FOR INSERT 
TO authenticated
WITH CHECK (created_by = auth.uid());