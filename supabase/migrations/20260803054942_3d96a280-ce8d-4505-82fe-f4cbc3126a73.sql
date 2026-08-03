-- 1. Subscription fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS premium_status boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_start_date timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_end_date timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS premium_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS premium_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- admins may read/update any profile (needed for payment approval + support)
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Reviews / testimonials
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  university text,
  comment text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "reviews_insert_own" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews_update_own" ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews_delete_own_or_staff" ON public.reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- 3. Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_code text NOT NULL,
  phone_number text NOT NULL,
  email text,
  amount numeric NOT NULL DEFAULT 49,
  currency text NOT NULL DEFAULT 'KES',
  method text NOT NULL DEFAULT 'mpesa_manual',
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status, created_at DESC);
GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_select_own_or_admin" ON public.payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "payments_insert_own" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "payments_update_admin" ON public.payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Usage events for free-plan limits
CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_events_user_idx ON public.usage_events (user_id, kind, created_at DESC);
GRANT SELECT, INSERT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_select_own" ON public.usage_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "usage_insert_own" ON public.usage_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 5. Approving a payment activates premium for 7 days
CREATE OR REPLACE FUNCTION public.apply_payment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND COALESCE(OLD.status, '') <> 'approved' THEN
    UPDATE public.profiles
      SET plan = 'premium',
          premium_status = true,
          premium_start_date = now(),
          premium_end_date = GREATEST(COALESCE(premium_end_date, now()), now()) + interval '7 days'
    WHERE id = NEW.user_id;
    NEW.reviewed_at = now();
  ELSIF NEW.status = 'rejected' AND COALESCE(OLD.status, '') <> 'rejected' THEN
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_payment_approval() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS payments_apply_approval ON public.payments;
CREATE TRIGGER payments_apply_approval
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_payment_approval();

-- 6. New signups start on a 30-day trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, plan, trial_start_date, trial_end_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
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

-- 7. Seed testimonials
INSERT INTO public.reviews (user_id, name, university, comment, rating)
VALUES
  (NULL, 'Amina Njeri', 'University of Nairobi', 'StudyHub has made revision easier because I can access notes, quizzes, and AI assistance in one place.', 5),
  (NULL, 'Brian Otieno', 'Kenyatta University', 'The AI Tutor helped me understand difficult topics and prepare better for exams.', 5),
  (NULL, 'Cynthia Wambui', 'JKUAT', 'Finding quality study materials is now much easier with StudyHub.', 5),
  (NULL, 'Daniel Kiptoo', 'Moi University', 'The flashcards and spaced repetition helped me remember far more before finals.', 4),
  (NULL, 'Faith Mwikali', 'Strathmore University', 'Study groups keep me accountable and the planner keeps my week organised.', 5),
  (NULL, 'Kevin Mutua', 'Technical University of Kenya', 'Generating quizzes straight from my lecture PDFs saves me hours every week.', 5);