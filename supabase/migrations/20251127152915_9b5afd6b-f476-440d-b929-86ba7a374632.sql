-- Fix the seed function to use the correct task description that matches translation
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

  -- Insert default house chore templates with correct descriptions matching translations
  INSERT INTO public.task_templates (
    family_id, category_id, name, description, star_value, is_default, is_deletable, created_by
  ) VALUES
    (p_family_id, v_house_chores_id, 'Clean the room', 'Tidy up and organize the room', 3, true, false, p_creator),
    (p_family_id, v_house_chores_id, 'Do the dishes', 'Wash, dry, and put away dishes', 3, true, false, p_creator),
    (p_family_id, v_house_chores_id, 'Take out trash', 'Collect and take out household trash', 2, true, false, p_creator),
    (p_family_id, v_house_chores_id, 'Cook meal', 'Help prepare or cook a meal', 3, true, false, p_creator);
END;
$function$;

-- Update existing templates to have the correct description
UPDATE public.task_templates 
SET description = 'Collect and take out household trash'
WHERE name = 'Take out trash' 
  AND is_default = true
  AND description = 'Collect and trash out household trash';