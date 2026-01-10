-- Fix function search paths for security
-- These functions need search_path set to prevent mutable search path attacks

-- Fix emit_category_sync
CREATE OR REPLACE FUNCTION public.emit_category_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
declare _op text := lower(tg_op);
begin
  insert into public.family_sync_events (family_id, entity, op, entity_id, payload)
  values (
    case when _op='delete' then old.family_id else new.family_id end,
    'task_category',
    _op,
    coalesce(new.id, old.id),
    case when _op='delete' then to_jsonb(old) else to_jsonb(new) end
  );
  return coalesce(new, old);
end $function$;

-- Fix emit_template_sync
CREATE OR REPLACE FUNCTION public.emit_template_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
declare _op text := lower(tg_op);
begin
  insert into public.family_sync_events (family_id, entity, op, entity_id, payload)
  values (
    case when _op='delete' then old.family_id else new.family_id end,
    'task_template',
    _op,
    coalesce(new.id, old.id),
    case when _op='delete' then to_jsonb(old) else to_jsonb(new) end
  );
  return coalesce(new, old);
end $function$;

-- Fix families_before_insert_fill
CREATE OR REPLACE FUNCTION public.families_before_insert_fill()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  IF NEW.invite_code IS NULL OR length(trim(NEW.invite_code)) = 0 THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix set_families_defaults
CREATE OR REPLACE FUNCTION public.set_families_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;
  RETURN NEW;
END;
$function$;