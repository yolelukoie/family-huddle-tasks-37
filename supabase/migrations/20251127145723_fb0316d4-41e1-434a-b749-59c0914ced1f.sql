-- Drop the old restrictive delete policy
DROP POLICY IF EXISTS "Users can delete their own custom categories" ON public.task_categories;

-- Create a new policy that allows family members to delete non-default categories
-- whether they own them (user_id matches) or they're shared (user_id is NULL)
CREATE POLICY "Family members can delete non-default categories" 
ON public.task_categories 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_families uf 
    WHERE uf.user_id = auth.uid() 
      AND uf.family_id = task_categories.family_id
  )
  AND is_default = false
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- Update existing custom categories with NULL user_id to set them to the family creator
-- This ensures future deletions will work properly
UPDATE public.task_categories tc
SET user_id = (
  SELECT f.created_by 
  FROM public.families f 
  WHERE f.id = tc.family_id
)
WHERE tc.user_id IS NULL 
  AND tc.is_default = false;