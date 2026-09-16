DROP POLICY IF EXISTS "Admins can view all officer profiles" ON public.officer_profiles;
DROP FUNCTION IF EXISTS public.has_officer_role(UUID, public.officer_role);
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;