-- 1. USERNAMES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

UPDATE public.profiles p
SET username = sub.candidate
FROM (
  SELECT id,
         lower(regexp_replace(coalesce(nullif(display_name,''), 'student'), '[^a-zA-Z0-9]+', '', 'g'))
           || substr(replace(id::text,'-',''), 1, 4) AS candidate
  FROM public.profiles
) sub
WHERE p.id = sub.id AND p.username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (lower(username));

-- new signups get a username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE base text; candidate text; n int := 0;
BEGIN
  base := lower(regexp_replace(
    coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1), 'student'),
    '[^a-zA-Z0-9_]+', '', 'g'));
  IF base = '' THEN base := 'student'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = candidate) LOOP
    n := n + 1;
    candidate := base || n::text;
  END LOOP;

  INSERT INTO public.profiles (id, display_name, username, avatar_url, plan, trial_start_date, trial_end_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    candidate,
    NEW.raw_user_meta_data->>'avatar_url',
    'trial',
    now(),
    now() + interval '30 days'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. REVIEW MODERATION
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewed_by uuid;
UPDATE public.reviews SET status = 'approved' WHERE status = 'pending';

DROP POLICY IF EXISTS reviews_select_all ON public.reviews;
CREATE POLICY reviews_select_approved ON public.reviews FOR SELECT
  TO anon, authenticated USING (status = 'approved');
CREATE POLICY reviews_select_own ON public.reviews FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY reviews_select_staff ON public.reviews FOR SELECT
  TO authenticated USING (has_role(auth.uid(),'moderator') OR has_role(auth.uid(),'admin'));
CREATE POLICY reviews_update_staff ON public.reviews FOR UPDATE
  TO authenticated USING (has_role(auth.uid(),'moderator') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'moderator') OR has_role(auth.uid(),'admin'));

-- 3. ADMIN AUDIT LOG
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_select_staff ON public.admin_audit_log FOR SELECT
  TO authenticated USING (has_role(auth.uid(),'moderator') OR has_role(auth.uid(),'admin'));
CREATE POLICY audit_insert_staff ON public.admin_audit_log FOR INSERT
  TO authenticated WITH CHECK (
    actor_id = auth.uid()
    AND (has_role(auth.uid(),'moderator') OR has_role(auth.uid(),'admin'))
  );

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);

-- 4. ACCURATE LIKE COUNTS
CREATE OR REPLACE FUNCTION public.sync_note_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.notes SET like_count = (
    SELECT COUNT(*) FROM public.note_likes WHERE note_id = COALESCE(NEW.note_id, OLD.note_id)
  ) WHERE id = COALESCE(NEW.note_id, OLD.note_id);
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS note_likes_count_sync ON public.note_likes;
CREATE TRIGGER note_likes_count_sync
AFTER INSERT OR DELETE ON public.note_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_note_like_count();

UPDATE public.notes n
SET like_count = (SELECT COUNT(*) FROM public.note_likes l WHERE l.note_id = n.id);

-- notes.like_count must be readable/consistent: allow anyone signed in to read note_likes
-- aggregate only via the count column (no policy change needed).

-- 5. STUDY STREAK
CREATE OR REPLACE FUNCTION public.touch_streak()
RETURNS TABLE (streak_days integer, xp integer, level integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); last date; cur int; newxp int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT p.last_active_date, p.streak_days, p.xp INTO last, cur, newxp
  FROM public.profiles p WHERE p.id = uid FOR UPDATE;

  IF last IS DISTINCT FROM CURRENT_DATE THEN
    IF last = CURRENT_DATE - 1 THEN
      cur := COALESCE(cur,0) + 1;
    ELSE
      cur := 1;
    END IF;
    newxp := COALESCE(newxp,0) + 10;
    UPDATE public.profiles p
      SET last_active_date = CURRENT_DATE,
          streak_days = cur,
          xp = newxp,
          level = GREATEST(1, (newxp / 500) + 1)
    WHERE p.id = uid;
  END IF;

  RETURN QUERY
    SELECT p.streak_days, p.xp, p.level FROM public.profiles p WHERE p.id = uid;
END; $$;

REVOKE ALL ON FUNCTION public.touch_streak() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_streak() TO authenticated;

-- 6. PREMIUM EXPIRY
CREATE OR REPLACE FUNCTION public.expire_premium_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE affected int;
BEGIN
  UPDATE public.profiles
    SET plan = 'free', premium_status = false
  WHERE (premium_status = true OR plan <> 'free')
    AND COALESCE(premium_end_date, '-infinity'::timestamptz) <= now()
    AND COALESCE(trial_end_date, '-infinity'::timestamptz) <= now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END; $$;

REVOKE ALL ON FUNCTION public.expire_premium_accounts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_premium_accounts() TO service_role;