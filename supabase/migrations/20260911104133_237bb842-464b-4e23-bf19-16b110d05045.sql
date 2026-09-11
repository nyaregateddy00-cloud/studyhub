CREATE OR REPLACE FUNCTION public.admin_stats(_university_id uuid DEFAULT NULL, _programme_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles p
      WHERE (_university_id IS NULL OR p.university_id = _university_id)
        AND (_programme_id IS NULL OR p.programme_id = _programme_id)),
    'active_learners', (SELECT COUNT(*) FROM public.profiles p
      WHERE p.last_active_date >= CURRENT_DATE - 7
        AND (_university_id IS NULL OR p.university_id = _university_id)
        AND (_programme_id IS NULL OR p.programme_id = _programme_id)),
    'quiz_completions', (SELECT COUNT(*) FROM public.quiz_attempts qa
      JOIN public.profiles p ON p.id = qa.user_id
      WHERE (_university_id IS NULL OR p.university_id = _university_id)
        AND (_programme_id IS NULL OR p.programme_id = _programme_id)),
    'materials_downloaded', (SELECT COUNT(*) FROM public.note_downloads nd
      JOIN public.profiles p ON p.id = nd.user_id
      WHERE (_university_id IS NULL OR p.university_id = _university_id)
        AND (_programme_id IS NULL OR p.programme_id = _programme_id)),
    'materials_uploaded', (SELECT COUNT(*) FROM public.notes n
      JOIN public.profiles p ON p.id = n.user_id
      WHERE (_university_id IS NULL OR p.university_id = _university_id)
        AND (_programme_id IS NULL OR p.programme_id = _programme_id)),
    'premium_users', (SELECT COUNT(*) FROM public.profiles p
      WHERE p.premium_status
        AND (_university_id IS NULL OR p.university_id = _university_id)
        AND (_programme_id IS NULL OR p.programme_id = _programme_id))
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_stats(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_stats(uuid, uuid) TO authenticated;