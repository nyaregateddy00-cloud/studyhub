
-- STUDY PLANNER
CREATE TABLE public.study_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  subject text,
  notes text,
  due_date date,
  duration_minutes integer NOT NULL DEFAULT 30,
  priority text NOT NULL DEFAULT 'medium',
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_tasks TO authenticated;
GRANT ALL ON public.study_tasks TO service_role;
ALTER TABLE public.study_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.study_tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER study_tasks_updated_at BEFORE UPDATE ON public.study_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.study_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  subject text,
  target_minutes integer NOT NULL DEFAULT 300,
  progress_minutes integer NOT NULL DEFAULT 0,
  target_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_goals TO authenticated;
GRANT ALL ON public.study_goals TO service_role;
ALTER TABLE public.study_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals" ON public.study_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER study_goals_updated_at BEFORE UPDATE ON public.study_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- COMMUNITY Q&A
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  subject text,
  tags text[] NOT NULL DEFAULT '{}',
  is_resolved boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  vote_count integer NOT NULL DEFAULT 0,
  answer_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT SELECT ON public.questions TO anon;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions readable" ON public.questions FOR SELECT USING (true);
CREATE POLICY "questions insert own" ON public.questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "questions update own" ON public.questions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "questions delete own" ON public.questions FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER questions_updated_at BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  is_accepted boolean NOT NULL DEFAULT false,
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO authenticated;
GRANT SELECT ON public.answers TO anon;
GRANT ALL ON public.answers TO service_role;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers readable" ON public.answers FOR SELECT USING (true);
CREATE POLICY "answers insert own" ON public.answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "answers update own" ON public.answers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "answers delete own" ON public.answers FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER answers_updated_at BEFORE UPDATE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.post_votes (
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  post_type text NOT NULL,
  value smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_votes TO authenticated;
GRANT ALL ON public.post_votes TO service_role;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes readable" ON public.post_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "votes own write" ON public.post_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes own delete" ON public.post_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_vote_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid; ptype text;
BEGIN
  target := COALESCE(NEW.post_id, OLD.post_id);
  ptype := COALESCE(NEW.post_type, OLD.post_type);
  IF ptype = 'question' THEN
    UPDATE public.questions SET vote_count = (SELECT COUNT(*) FROM public.post_votes WHERE post_id = target) WHERE id = target;
  ELSE
    UPDATE public.answers SET vote_count = (SELECT COUNT(*) FROM public.post_votes WHERE post_id = target) WHERE id = target;
  END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_vote_counts() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER post_votes_sync AFTER INSERT OR DELETE ON public.post_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_vote_counts();

CREATE OR REPLACE FUNCTION public.sync_answer_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.questions SET answer_count = (
    SELECT COUNT(*) FROM public.answers WHERE question_id = COALESCE(NEW.question_id, OLD.question_id)
  ) WHERE id = COALESCE(NEW.question_id, OLD.question_id);
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_answer_counts() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER answers_count_sync AFTER INSERT OR DELETE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.sync_answer_counts();

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

-- notify answerers/question owners
CREATE OR REPLACE FUNCTION public.notify_on_answer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid; qtitle text;
BEGIN
  SELECT user_id, title INTO owner, qtitle FROM public.questions WHERE id = NEW.question_id;
  IF owner IS NOT NULL AND owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (owner, 'New answer to your question', qtitle, 'community', '/community');
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_on_answer() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER answers_notify AFTER INSERT ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_answer();

-- BADGES
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_key text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_key)
);
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges readable" ON public.user_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "badges insert own" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- NOTE REPORTS
CREATE TABLE public.note_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.note_reports TO authenticated;
GRANT ALL ON public.note_reports TO service_role;
ALTER TABLE public.note_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports insert own" ON public.note_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reports read own or staff" ON public.note_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "reports staff update" ON public.note_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));

-- ACCESS CONTROL HARDENING: staff moderation of notes
CREATE POLICY "staff can moderate notes" ON public.notes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));

-- PUBLIC LEADERBOARD (safe columns only)
CREATE OR REPLACE VIEW public.leaderboard
WITH (security_invoker = true) AS
  SELECT id, display_name, avatar_url, xp, level, streak_days
  FROM public.profiles;
GRANT SELECT ON public.leaderboard TO authenticated;
