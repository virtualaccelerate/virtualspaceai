CREATE OR REPLACE FUNCTION public.verified_pending_member_account(requested_email text)
RETURNS TABLE(id uuid, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
 SELECT u.id, u.email::text FROM auth.users u
 WHERE lower(u.email) = lower(btrim(requested_email)) AND u.email_confirmed_at IS NOT NULL
 LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.verified_pending_member_account(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verified_pending_member_account(text) TO service_role;