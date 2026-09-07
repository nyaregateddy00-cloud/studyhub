-- 1. Profile academic links + protected points total
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS university_id uuid REFERENCES public.universities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS faculty_id uuid REFERENCES public.faculties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key ON public.profiles (lower(username));
CREATE INDEX IF NOT EXISTS profiles_points_idx ON public.profiles (points DESC);
CREATE INDEX IF NOT EXISTS profiles_university_idx ON public.profiles (university_id);
CREATE INDEX IF NOT EXISTS profiles_programme_idx ON public.profiles (programme_id);

-- 2. Points ledger
CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL,
  activity_type text NOT NULL,
  reference_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_points TO authenticated;
GRANT ALL ON public.user_points TO service_role;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS user_points_activity_key
  ON public.user_points (user_id, activity_type, coalesce(reference_id, ''));
CREATE INDEX IF NOT EXISTS user_points_user_idx ON public.user_points (user_id, created_at DESC);

CREATE POLICY "Users read their own points history"
  ON public.user_points FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins read all points history"
  ON public.user_points FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- No INSERT/UPDATE/DELETE policies: points are only written by SECURITY DEFINER routines.

-- 3. Download records
CREATE TABLE IF NOT EXISTS public.note_downloads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (note_id, user_id)
);

GRANT SELECT, INSERT ON public.note_downloads TO authenticated;
GRANT ALL ON public.note_downloads TO service_role;
ALTER TABLE public.note_downloads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS note_downloads_note_idx ON public.note_downloads (note_id);
CREATE INDEX IF NOT EXISTS note_downloads_user_idx ON public.note_downloads (user_id);

CREATE POLICY "Users record their own downloads"
  ON public.note_downloads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users see their own downloads"
  ON public.note_downloads FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Note owners see downloads of their notes"
  ON public.note_downloads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.notes n WHERE n.id = note_id AND n.user_id = auth.uid()));

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS download_count integer NOT NULL DEFAULT 0;

-- 4. Central award routine (single source of truth, idempotent per activity)
CREATE OR REPLACE FUNCTION public.award_points(
  _user_id uuid, _points integer, _activity_type text, _reference_id text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE inserted int;
BEGIN
  IF _user_id IS NULL OR _points IS NULL OR _points <= 0 THEN RETURN false; END IF;

  INSERT INTO public.user_points (user_id, points, activity_type, reference_id)
  VALUES (_user_id, _points, _activity_type, _reference_id)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;

  IF inserted = 0 THEN RETURN false; END IF;

  UPDATE public.profiles SET points = COALESCE(points, 0) + _points WHERE id = _user_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.award_points(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;

-- 5. Activity triggers
CREATE OR REPLACE FUNCTION public.points_on_quiz_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.award_points(NEW.user_id, 20, 'quiz_completed', NEW.id::text);
  IF NEW.total > 0 AND (NEW.score::numeric / NEW.total::numeric) >= 0.5 THEN
    PERFORM public.award_points(NEW.user_id, 30, 'quiz_passed', NEW.id::text);
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS quiz_attempts_points ON public.quiz_attempts;
CREATE TRIGGER quiz_attempts_points AFTER INSERT ON public.quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.points_on_quiz_attempt();

CREATE OR REPLACE FUNCTION public.points_on_note_upload()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.award_points(NEW.user_id, 25, 'note_upload', NEW.id::text);
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS notes_points ON public.notes;
CREATE TRIGGER notes_points AFTER INSERT ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.points_on_note_upload();

CREATE OR REPLACE FUNCTION public.points_on_note_download()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE owner_id uuid;
BEGIN
  UPDATE public.notes SET download_count = (
    SELECT COUNT(*) FROM public.note_downloads WHERE note_id = NEW.note_id
  ) WHERE id = NEW.note_id
  RETURNING user_id INTO owner_id;

  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    PERFORM public.award_points(owner_id, 5, 'download_received', NEW.note_id::text || ':' || NEW.user_id::text);
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS note_downloads_points ON public.note_downloads;
CREATE TRIGGER note_downloads_points AFTER INSERT ON public.note_downloads
  FOR EACH ROW EXECUTE FUNCTION public.points_on_note_download();

CREATE OR REPLACE FUNCTION public.points_on_note_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.notes WHERE id = NEW.note_id;
  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    PERFORM public.award_points(owner_id, 2, 'like_received', NEW.note_id::text || ':' || NEW.user_id::text);
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS note_likes_points ON public.note_likes;
CREATE TRIGGER note_likes_points AFTER INSERT ON public.note_likes
  FOR EACH ROW EXECUTE FUNCTION public.points_on_note_like();

CREATE OR REPLACE FUNCTION public.points_on_task_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.completed AND NOT COALESCE(OLD.completed, false) THEN
    PERFORM public.award_points(NEW.user_id, 5, 'task_completed', NEW.id::text);
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS study_tasks_points ON public.study_tasks;
CREATE TRIGGER study_tasks_points AFTER UPDATE ON public.study_tasks
  FOR EACH ROW EXECUTE FUNCTION public.points_on_task_complete();

-- 6. Points total cannot be edited from the client
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
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
       OR NEW.points IS DISTINCT FROM OLD.points
       OR NEW.level IS DISTINCT FROM OLD.level
       OR NEW.streak_days IS DISTINCT FROM OLD.streak_days
       OR NEW.last_active_date IS DISTINCT FROM OLD.last_active_date THEN
      RAISE EXCEPTION 'billing and gamification fields can only be changed by the system';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Leaderboard reads (safe public columns only)
CREATE OR REPLACE FUNCTION public.leaderboard(
  _scope text DEFAULT 'global', _limit integer DEFAULT 50
) RETURNS TABLE (
  user_id uuid, rank bigint, username text, display_name text, avatar_url text,
  points integer, level integer, streak_days integer, university text, programme text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH me AS (
    SELECT university_id, programme_id FROM public.profiles WHERE id = auth.uid()
  ), scoped AS (
    SELECT p.* FROM public.profiles p, me
    WHERE auth.uid() IS NOT NULL
      AND (
        _scope = 'global'
        OR (_scope = 'university' AND me.university_id IS NOT NULL AND p.university_id = me.university_id)
        OR (_scope = 'programme' AND me.programme_id IS NOT NULL AND p.programme_id = me.programme_id)
      )
  ), ranked AS (
    SELECT s.id, RANK() OVER (ORDER BY s.points DESC, s.xp DESC, s.created_at ASC) AS rnk,
           s.username, s.display_name, s.avatar_url, s.points, s.level, s.streak_days,
           s.university_id, s.programme_id
    FROM scoped s
  )
  SELECT r.id, r.rnk, r.username, r.display_name, r.avatar_url, r.points, r.level, r.streak_days,
         u.name, pr.name
  FROM ranked r
  LEFT JOIN public.universities u ON u.id = r.university_id
  LEFT JOIN public.programmes pr ON pr.id = r.programme_id
  ORDER BY r.rnk
  LIMIT GREATEST(1, LEAST(_limit, 200));
$$;

GRANT EXECUTE ON FUNCTION public.leaderboard(text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_leaderboard_rank(_scope text DEFAULT 'global')
RETURNS TABLE (
  user_id uuid, rank bigint, username text, display_name text, avatar_url text,
  points integer, level integer, streak_days integer, university text, programme text, total_users bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH me AS (
    SELECT university_id, programme_id FROM public.profiles WHERE id = auth.uid()
  ), scoped AS (
    SELECT p.* FROM public.profiles p, me
    WHERE auth.uid() IS NOT NULL
      AND (
        _scope = 'global'
        OR (_scope = 'university' AND me.university_id IS NOT NULL AND p.university_id = me.university_id)
        OR (_scope = 'programme' AND me.programme_id IS NOT NULL AND p.programme_id = me.programme_id)
      )
  ), ranked AS (
    SELECT s.id, RANK() OVER (ORDER BY s.points DESC, s.xp DESC, s.created_at ASC) AS rnk,
           s.username, s.display_name, s.avatar_url, s.points, s.level, s.streak_days,
           s.university_id, s.programme_id,
           COUNT(*) OVER () AS total_users
    FROM scoped s
  )
  SELECT r.id, r.rnk, r.username, r.display_name, r.avatar_url, r.points, r.level, r.streak_days,
         u.name, pr.name, r.total_users
  FROM ranked r
  LEFT JOIN public.universities u ON u.id = r.university_id
  LEFT JOIN public.programmes pr ON pr.id = r.programme_id
  WHERE r.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.my_leaderboard_rank(text) TO authenticated;

-- Safe public profile for leaderboard clicks (never exposes email or private billing fields)
CREATE OR REPLACE FUNCTION public.public_profile(_user_id uuid)
RETURNS TABLE (
  id uuid, username text, display_name text, avatar_url text, bio text,
  points integer, xp integer, level integer, streak_days integer, year_of_study integer,
  university text, faculty text, programme text, joined_at timestamp with time zone,
  notes_count bigint, quizzes_completed bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.bio,
         p.points, p.xp, p.level, p.streak_days, p.year_of_study,
         u.name, f.name, pr.name, p.created_at,
         (SELECT COUNT(*) FROM public.notes n WHERE n.user_id = p.id),
         (SELECT COUNT(*) FROM public.quiz_attempts qa WHERE qa.user_id = p.id)
  FROM public.profiles p
  LEFT JOIN public.universities u ON u.id = p.university_id
  LEFT JOIN public.faculties f ON f.id = p.faculty_id
  LEFT JOIN public.programmes pr ON pr.id = p.programme_id
  WHERE p.id = _user_id AND auth.uid() IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.public_profile(uuid) TO authenticated;

-- 8. Backfill points from activity that already happened
INSERT INTO public.user_points (user_id, points, activity_type, reference_id, created_at)
SELECT qa.user_id, 20, 'quiz_completed', qa.id::text, qa.created_at FROM public.quiz_attempts qa
ON CONFLICT DO NOTHING;

INSERT INTO public.user_points (user_id, points, activity_type, reference_id, created_at)
SELECT qa.user_id, 30, 'quiz_passed', qa.id::text, qa.created_at FROM public.quiz_attempts qa
WHERE qa.total > 0 AND (qa.score::numeric / qa.total::numeric) >= 0.5
ON CONFLICT DO NOTHING;

INSERT INTO public.user_points (user_id, points, activity_type, reference_id, created_at)
SELECT n.user_id, 25, 'note_upload', n.id::text, n.created_at FROM public.notes n
ON CONFLICT DO NOTHING;

INSERT INTO public.user_points (user_id, points, activity_type, reference_id, created_at)
SELECT n.user_id, 2, 'like_received', nl.note_id::text || ':' || nl.user_id::text, nl.created_at
FROM public.note_likes nl JOIN public.notes n ON n.id = nl.note_id
WHERE n.user_id <> nl.user_id
ON CONFLICT DO NOTHING;

INSERT INTO public.user_points (user_id, points, activity_type, reference_id, created_at)
SELECT st.user_id, 5, 'task_completed', st.id::text, COALESCE(st.completed_at, st.updated_at)
FROM public.study_tasks st WHERE st.completed
ON CONFLICT DO NOTHING;

UPDATE public.profiles p
SET points = COALESCE((SELECT SUM(up.points) FROM public.user_points up WHERE up.user_id = p.id), 0);