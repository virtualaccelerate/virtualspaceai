
-- Enums
CREATE TYPE public.team_size AS ENUM ('0-50', '50-100', '100+');
CREATE TYPE public.business_type AS ENUM ('startup', 'agency', 'company');
CREATE TYPE public.member_role AS ENUM ('owner', 'admin', 'member');

-- Teamspaces
CREATE TABLE public.teamspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  team_size public.team_size NOT NULL,
  business_type public.business_type NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teamspaces TO authenticated;
GRANT ALL ON public.teamspaces TO service_role;
ALTER TABLE public.teamspaces ENABLE ROW LEVEL SECURITY;

-- Members
CREATE TABLE public.teamspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.member_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teamspace_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teamspace_members TO authenticated;
GRANT ALL ON public.teamspace_members TO service_role;
ALTER TABLE public.teamspace_members ENABLE ROW LEVEL SECURITY;

-- Helper (security definer) to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.is_teamspace_member(_ts uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.teamspace_members WHERE teamspace_id = _ts AND user_id = _uid)
$$;

CREATE OR REPLACE FUNCTION public.is_teamspace_owner(_ts uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.teamspaces WHERE id = _ts AND owner_id = _uid)
$$;

-- Teamspaces policies
CREATE POLICY "Members can view teamspace"
  ON public.teamspaces FOR SELECT TO authenticated
  USING (public.is_teamspace_member(id, auth.uid()));

CREATE POLICY "Authenticated can create teamspace"
  ON public.teamspaces FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update teamspace"
  ON public.teamspaces FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can delete teamspace"
  ON public.teamspaces FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Members policies
CREATE POLICY "Members can view co-members"
  ON public.teamspace_members FOR SELECT TO authenticated
  USING (public.is_teamspace_member(teamspace_id, auth.uid()));

CREATE POLICY "User can add self as member"
  ON public.teamspace_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can manage members"
  ON public.teamspace_members FOR UPDATE TO authenticated
  USING (public.is_teamspace_owner(teamspace_id, auth.uid()))
  WITH CHECK (public.is_teamspace_owner(teamspace_id, auth.uid()));

CREATE POLICY "User or owner can remove membership"
  ON public.teamspace_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_teamspace_owner(teamspace_id, auth.uid()));

-- Join by invite code (security definer, lets user look up teamspace by code)
CREATE OR REPLACE FUNCTION public.join_teamspace_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _ts_id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT id INTO _ts_id FROM public.teamspaces WHERE invite_code = _code;
  IF _ts_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  INSERT INTO public.teamspace_members (teamspace_id, user_id, role)
  VALUES (_ts_id, _uid, 'member')
  ON CONFLICT (teamspace_id, user_id) DO NOTHING;
  RETURN _ts_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_teamspace_by_code(text) TO authenticated;

-- Auto-add owner as member on teamspace create
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.teamspace_members (teamspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (teamspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER teamspace_add_owner_member
  AFTER INSERT ON public.teamspaces
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

-- Updated_at
CREATE TRIGGER teamspaces_set_updated_at
  BEFORE UPDATE ON public.teamspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Profiles: current teamspace
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_teamspace_id uuid REFERENCES public.teamspaces(id) ON DELETE SET NULL;
