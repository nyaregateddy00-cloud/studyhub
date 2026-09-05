DROP POLICY IF EXISTS "badges insert own" ON public.user_badges;
REVOKE INSERT ON public.user_badges FROM authenticated;

CREATE OR REPLACE FUNCTION public.award_badge(_badge_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  earned boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  CASE _badge_key
    WHEN 'first_note' THEN
      SELECT EXISTS (SELECT 1 FROM public.notes WHERE user_id = uid) INTO earned;
    WHEN 'quiz_rookie' THEN
      SELECT EXISTS (SELECT 1 FROM public.quiz_attempts WHERE user_id = uid) INTO earned;
    WHEN 'streak_7' THEN
      SELECT COALESCE((SELECT streak_days >= 7 FROM public.profiles WHERE id = uid), false) INTO earned;
    WHEN 'planner_pro' THEN
      SELECT (SELECT COUNT(*) FROM public.study_tasks WHERE user_id = uid AND completed) >= 10 INTO earned;
    WHEN 'helper' THEN
      SELECT EXISTS (SELECT 1 FROM public.answers WHERE user_id = uid) INTO earned;
    WHEN 'level_5' THEN
      SELECT COALESCE((SELECT level >= 5 FROM public.profiles WHERE id = uid), false) INTO earned;
    ELSE
      RAISE EXCEPTION 'unknown badge key: %', _badge_key;
  END CASE;

  IF NOT earned THEN RETURN false; END IF;

  INSERT INTO public.user_badges (user_id, badge_key)
  VALUES (uid, _badge_key)
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_badge(text) TO authenticated;

DROP POLICY IF EXISTS "members join self" ON public.study_group_members;

CREATE POLICY "members join public or own group" ON public.study_group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.study_groups g
      WHERE g.id = group_id
        AND (g.is_public OR g.owner_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.join_group_by_code(_code text, _display_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  gid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT id INTO gid FROM public.study_groups WHERE join_code = upper(trim(_code));
  IF gid IS NULL THEN RAISE EXCEPTION 'No group found with that code'; END IF;

  IF EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = gid AND user_id = uid) THEN
    RETURN gid;
  END IF;

  INSERT INTO public.study_group_members (group_id, user_id, role, display_name)
  VALUES (gid, uid, 'member', left(coalesce(_display_name, 'Member'), 80));

  RETURN gid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_group_by_code(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF current_user = 'authenticated'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.premium_status IS DISTINCT FROM OLD.premium_status
       OR NEW.premium_start_date IS DISTINCT FROM OLD.premium_start_date
       OR NEW.premium_end_date IS DISTINCT FROM OLD.premium_end_date
       OR NEW.trial_start_date IS DISTINCT FROM OLD.trial_start_date
       OR NEW.trial_end_date IS DISTINCT FROM OLD.trial_end_date
       OR NEW.xp IS DISTINCT FROM OLD.xp
       OR NEW.level IS DISTINCT FROM OLD.level
       OR NEW.streak_days IS DISTINCT FROM OLD.streak_days
       OR NEW.last_active_date IS DISTINCT FROM OLD.last_active_date THEN
      RAISE EXCEPTION 'billing and gamification fields can only be changed by the system';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_privileged_fields ON public.profiles;
CREATE TRIGGER profiles_protect_privileged_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();