CREATE TABLE public.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  subject text,
  institution text,
  is_public boolean NOT NULL DEFAULT true,
  join_code text NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),
  member_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX study_groups_join_code_key ON public.study_groups (join_code);

CREATE TABLE public.study_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE public.study_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX study_group_messages_group_idx ON public.study_group_messages (group_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_groups TO authenticated;
GRANT ALL ON public.study_groups TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_group_members TO authenticated;
GRANT ALL ON public.study_group_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_group_messages TO authenticated;
GRANT ALL ON public.study_group_messages TO service_role;

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = _group_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.study_groups WHERE id = _group_id AND owner_id = _user_id)
$$;

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups visible" ON public.study_groups FOR SELECT TO authenticated
  USING (is_public OR owner_id = auth.uid() OR public.is_group_member(id, auth.uid()));
CREATE POLICY "groups insert own" ON public.study_groups FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "groups owner update" ON public.study_groups FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "groups owner delete" ON public.study_groups FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "members visible" ON public.study_group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_group_member(group_id, auth.uid()) OR public.is_group_owner(group_id, auth.uid()));
CREATE POLICY "members join self" ON public.study_group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "members leave or owner removes" ON public.study_group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_group_owner(group_id, auth.uid()));

CREATE POLICY "messages visible to members" ON public.study_group_messages FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "messages insert by members" ON public.study_group_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY "messages delete own" ON public.study_group_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_group_owner(group_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.sync_group_member_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.study_groups SET member_count = (
    SELECT COUNT(*) FROM public.study_group_members WHERE group_id = COALESCE(NEW.group_id, OLD.group_id)
  ) WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  RETURN NULL;
END; $$;

CREATE TRIGGER study_group_members_count
AFTER INSERT OR DELETE ON public.study_group_members
FOR EACH ROW EXECUTE FUNCTION public.sync_group_member_count();

CREATE TRIGGER study_groups_updated_at
BEFORE UPDATE ON public.study_groups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();