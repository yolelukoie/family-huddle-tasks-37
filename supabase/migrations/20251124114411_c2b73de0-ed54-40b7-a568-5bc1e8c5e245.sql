-- Add user_id column to task_categories for user-owned categories
-- NULL user_id means it's a shared/default category
ALTER TABLE public.task_categories
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX idx_task_categories_user_id ON public.task_categories(user_id);
CREATE INDEX idx_task_categories_family_user ON public.task_categories(family_id, user_id);

-- Update RLS policies for task_categories
DROP POLICY IF EXISTS "Family members can manage categories" ON public.task_categories;
DROP POLICY IF EXISTS "Family members can view categories" ON public.task_categories;
DROP POLICY IF EXISTS "TaskCategories: manage if member" ON public.task_categories;
DROP POLICY IF EXISTS "TaskCategories: select if member" ON public.task_categories;

-- Users can view default categories (user_id IS NULL) OR their own categories
CREATE POLICY "Users can view family default and own categories"
ON public.task_categories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_families uf
    WHERE uf.user_id = auth.uid() AND uf.family_id = task_categories.family_id
  )
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- Users can create categories in their families
CREATE POLICY "Users can create categories in their families"
ON public.task_categories
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_families uf
    WHERE uf.user_id = auth.uid() AND uf.family_id = task_categories.family_id
  )
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- Users can update their own categories or default categories they created
CREATE POLICY "Users can update their own categories"
ON public.task_categories
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_families uf
    WHERE uf.user_id = auth.uid() AND uf.family_id = task_categories.family_id
  )
  AND (user_id = auth.uid() OR (is_default = true AND user_id IS NULL))
);

-- Users can only delete their own custom categories
CREATE POLICY "Users can delete their own custom categories"
ON public.task_categories
FOR DELETE
USING (
  user_id = auth.uid() AND is_default = false
);

-- Update the seed_family_defaults function to ensure default categories have NULL user_id
CREATE OR REPLACE FUNCTION public.seed_family_defaults(p_family_id uuid, p_creator uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_exists boolean;
  v_house_chores_id uuid;
BEGIN
  -- If the family already has any categories, skip seeding
  SELECT EXISTS(SELECT 1 FROM public.task_categories tc WHERE tc.family_id = p_family_id) INTO v_exists;
  IF v_exists THEN
    RETURN;
  END IF;

  -- Insert default categories with NULL user_id (shared across family)
  INSERT INTO public.task_categories (family_id, name, is_default, is_house_chores, order_index, user_id)
  VALUES 
    (p_family_id, 'House Chores', true, true, 0, NULL),
    (p_family_id, 'Personal Growth', true, false, 1, NULL),
    (p_family_id, 'Happiness', true, false, 2, NULL);

  -- Get House Chores category id
  SELECT id INTO v_house_chores_id
  FROM public.task_categories
  WHERE family_id = p_family_id AND name = 'House Chores'
  ORDER BY created_at ASC
  LIMIT 1;

  -- Guard: if not found, stop
  IF v_house_chores_id IS NULL THEN
    RETURN;
  END IF;

  -- Insert default house chore templates
  INSERT INTO public.task_templates (
    family_id, category_id, name, description, star_value, is_default, is_deletable, created_by
  ) VALUES
    (p_family_id, v_house_chores_id, 'Clean the room', 'Tidy up and organize the room', 3, true, true, p_creator),
    (p_family_id, v_house_chores_id, 'Do the dishes', 'Wash, dry, and put away dishes', 3, true, true, p_creator),
    (p_family_id, v_house_chores_id, 'Take out trash', 'Collect and trash out household trash', 2, true, true, p_creator),
    (p_family_id, v_house_chores_id, 'Cook meal', 'Help prepare or cook a meal', 3, true, true, p_creator);
END;
$function$;