CREATE TYPE public.officer_role AS ENUM ('Inspector', 'Senior Inspector', 'Admin');

CREATE TABLE public.officer_profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  officer_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  designation TEXT NOT NULL DEFAULT 'Legal Metrology Inspector',
  department TEXT NOT NULL DEFAULT 'Department of Consumer Affairs',
  district TEXT,
  state TEXT,
  email TEXT NOT NULL,
  role public.officer_role NOT NULL DEFAULT 'Inspector',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.officer_profiles TO authenticated;
GRANT ALL ON public.officer_profiles TO service_role;

ALTER TABLE public.officer_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_officer_role(_user_id UUID, _role public.officer_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.officer_profiles
    WHERE id = _user_id AND role = _role AND is_active = true
  )
$$;

CREATE POLICY "Officers can view their own profile"
ON public.officer_profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all officer profiles"
ON public.officer_profiles FOR SELECT TO authenticated
USING (public.has_officer_role(auth.uid(), 'Admin'));

CREATE POLICY "Officers can update their own profile"
ON public.officer_profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER officer_profiles_updated_at
BEFORE UPDATE ON public.officer_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();