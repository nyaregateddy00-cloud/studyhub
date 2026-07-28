-- 1. Harden the SECURITY DEFINER role-check helper: only answer for the caller.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND _user_id = auth.uid()
  )
$$;

-- 2. profiles: only the owner may read full profile rows.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Public projection for the leaderboard: safe columns only, RLS-independent.
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard
WITH (security_invoker = false) AS
  SELECT id, display_name, avatar_url, xp, level, streak_days
  FROM public.profiles;

GRANT SELECT ON public.leaderboard TO authenticated;

-- 3. user_roles: own row, or admins.
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select_own_or_admin"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 4. post_votes: users only see their own votes (totals live on questions/answers).
DROP POLICY IF EXISTS "votes readable" ON public.post_votes;
CREATE POLICY "votes readable own"
  ON public.post_votes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 5. user_badges: users only see their own badges.
DROP POLICY IF EXISTS "badges readable" ON public.user_badges;
CREATE POLICY "badges readable own"
  ON public.user_badges FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
