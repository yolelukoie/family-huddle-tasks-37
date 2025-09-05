-- Seed default categories and templates per family
-- 1) Helper to seed defaults for a given family
CREATE OR REPLACE FUNCTION public.seed_family_defaults(p_family_id uuid, p_creator uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
  v_house_chores_id uuid;
BEGIN
  -- If the family already has any categories, skip seeding
  SELECT EXISTS(SELECT 1 FROM public.task_categories tc WHERE tc.family_id = p_family_id) INTO v_exists;
  IF v_exists THEN
    RETURN;
  END IF;

  -- Insert default categories
  INSERT INTO public.task_categories (family_id, name, is_default, is_house_chores, order_index)
  VALUES 
    (p_family_id, 'House Chores', true, true, 0),
    (p_family_id, 'Personal Growth', true, false, 1),
    (p_family_id, 'Happiness', true, false, 2);

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

  -- Insert default house chore templates with corrected star values
  INSERT INTO public.task_templates (
    family_id, category_id, name, description, star_value, is_default, is_deletable, created_by
  ) VALUES
    (p_family_id, v_house_chores_id, 'Clean the room', 'Tidy up and organize the room', 3, true, true, p_creator),
    (p_family_id, v_house_chores_id, 'Do the dishes', 'Wash, dry, and put away dishes', 3, true, true, p_creator),
    (p_family_id, v_house_chores_id, 'Take out trash', 'Collect and take out household trash', 2, true, true, p_creator),
    (p_family_id, v_house_chores_id, 'Cook meal', 'Help prepare or cook a meal', 3, true, true, p_creator);
END;
$$;

-- 2) Trigger function to seed when a family is created
CREATE OR REPLACE FUNCTION public.on_family_insert_seed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_family_defaults(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;

-- 3) Create trigger on families
DROP TRIGGER IF EXISTS trg_families_seed_defaults ON public.families;
CREATE TRIGGER trg_families_seed_defaults
AFTER INSERT ON public.families
FOR EACH ROW
EXECUTE FUNCTION public.on_family_insert_seed();

-- 4) Backfill for existing families without categories
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, created_by FROM public.families LOOP
    PERFORM public.seed_family_defaults(r.id, r.created_by);
  END LOOP;
END $$;