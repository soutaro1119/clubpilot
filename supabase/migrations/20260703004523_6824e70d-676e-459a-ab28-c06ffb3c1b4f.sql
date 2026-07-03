
-- Lock down SECURITY DEFINER functions: revoke default PUBLIC EXECUTE and grant narrowly.

-- Internal-only (triggers / helpers) — no direct callers needed
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_team_created() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_team_defaults(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- RLS helpers — called from policies as the invoking role; keep authenticated only
REVOKE ALL ON FUNCTION public.get_my_team_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_team_leader(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_team_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_leader(uuid) TO authenticated;

-- RPCs called by signed-in users
REVOKE ALL ON FUNCTION public.create_team(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_team(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_team(text, text) TO authenticated;
