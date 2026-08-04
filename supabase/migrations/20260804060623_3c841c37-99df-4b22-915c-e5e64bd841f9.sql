DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.sync_note_like_count()',
    'public.set_updated_at()',
    'public.handle_new_user()',
    'public.apply_payment_approval()',
    'public.notify_on_answer()',
    'public.sync_answer_counts()',
    'public.sync_group_member_count()',
    'public.sync_vote_counts()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;