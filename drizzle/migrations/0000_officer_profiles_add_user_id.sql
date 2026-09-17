ALTER TABLE public.officer_profiles
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.officer_profiles SET user_id = id WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS officer_profiles_user_id_key ON public.officer_profiles (user_id);