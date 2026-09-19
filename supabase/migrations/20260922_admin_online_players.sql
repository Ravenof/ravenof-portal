-- 2026-09-19: Adminui – kas dabar prisijungęs (rodoma /digital pagrindiniame meniu, viršuje).
-- Šaltinis: profiles.last_seen_at (rvn_heartbeat_v2 kas ~60 s) + platforma/versija/presence.
-- Tik admin (is_admin()). Idempotentiška.

create or replace function public.rvn_admin_online_players(p_minutes integer default 3)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.is_admin() then jsonb_build_object('error', 'forbidden')
  else jsonb_build_object(
    'count', (select count(*) from public.profiles p where p.last_seen_at > now() - make_interval(mins => greatest(1, least(p_minutes, 60)))),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'displayName', p.display_name,
        'avatar', p.avatar_url,
        'role', p.role,
        'platform', p.last_platform,
        'version', p.last_app_version,
        'presence', p.presence_status,
        'lastSeen', p.last_seen_at,
        'secondsAgo', floor(extract(epoch from (now() - p.last_seen_at)))::int
      ) order by p.last_seen_at desc)
      from public.profiles p
      where p.last_seen_at > now() - make_interval(mins => greatest(1, least(p_minutes, 60)))
    ), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.rvn_admin_online_players(integer) from public, anon;
grant execute on function public.rvn_admin_online_players(integer) to authenticated;
