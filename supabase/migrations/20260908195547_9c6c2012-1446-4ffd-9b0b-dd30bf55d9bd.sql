DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.leaderboard(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_leaderboard_rank(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_badge(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_group_by_code(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;