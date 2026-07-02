
ALTER FUNCTION public.set_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.on_team_created() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_team_defaults(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_team_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_team_leader(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_team(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.join_team(TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_team_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_leader(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_team(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_team_defaults(UUID) TO authenticated;
