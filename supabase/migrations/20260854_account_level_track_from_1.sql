-- ════════════════════════════════════════════════════════════════════════════
--  LYGIŲ TAKELIS PRASIDEDA NUO 1 (Profile UI fix-pack, ekranas 05)
--  ─────────────────────────────────────────────────────────────────────────
--  20260852 takelį generavo nuo 2 lygio, nes 1 lygis atlygio neduoda. Dizaine
--  1 lygis takelyje YRA (pirmas langelis, pažymėtas kaip pasiektas) — kitaip
--  eilutė „1–25" prasideda nuo dvejeto ir žaidėjas nemato savo kelio pradžios.
--  Keičiasi TIK generate_series apatinė riba ir 1 lygio būsena. Ekonomika,
--  atlygiai ir rvn__check_level_rewards NELIEČIAMI.
--  Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.rvn_get_account_level(p_user_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_self boolean := (p_user_id is null or p_user_id = auth.uid());
  v_xp bigint; v_lvl int; v_cur bigint; v_next bigint; v_track jsonb; v_ms jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  select coalesce(xp_total,0) into v_xp from public.profiles where id = v_uid;
  if v_xp is null then return jsonb_build_object('error','no_profile'); end if;

  v_lvl  := public.rvn__level_from_xp(v_xp);
  v_cur  := public.rvn__xp_for_level(v_lvl);
  v_next := case when v_lvl >= 50 then null else public.rvn__xp_for_level(v_lvl + 1) end;
  select value->'milestoneLevels' into v_ms from public.economy_config where key = 'account_level_rewards_v3';

  select jsonb_agg(jsonb_build_object(
      'level', L,
      'xpRequired', public.rvn__xp_for_level(L),
      -- 1 lygis atlygio neturi (jis yra starto taškas), tad payload grąžina []
      'rewards', public.rvn__account_level_payload_v3(L),
      'milestone', coalesce(v_ms @> to_jsonb(L), false),
      'state', case
        when L <= v_lvl and exists (
          select 1 from public.reward_choices rc
           where rc.user_id = v_uid and rc.source_type = 'level'
             and rc.source_id = 'level:' || L::text and rc.status = 'pending') then 'pending'
        when L <= v_lvl then 'claimed'
        when L = v_lvl + 1 then 'next'
        else 'future' end
    ) order by L)
    into v_track
    from generate_series(1, 50) as gs(L);

  return jsonb_build_object(
    'level', v_lvl,
    'maxLevel', 50,
    'totalXp', v_xp,
    'currentLevelXp', v_cur,
    'nextLevelXp', v_next,
    'xpIntoLevel', v_xp - v_cur,
    'xpForNextLevel', case when v_next is null then 0 else v_next - v_cur end,
    'isMaxLevel', v_lvl >= 50,
    'track', coalesce(v_track, '[]'::jsonb),
    'pendingChoices', case when v_self then public.rvn__pending_choices(v_uid) else '[]'::jsonb end,
    'balances', case when v_self then public.rvn__balances(v_uid) else '{}'::jsonb end
  );
end $$;
grant execute on function public.rvn_get_account_level(uuid) to authenticated;

do $$
declare v jsonb;
begin
  if public.rvn__account_level_payload_v3(1) <> '[]'::jsonb then
    raise exception '1 lygis neturi duoti atlygio, gavom %', public.rvn__account_level_payload_v3(1);
  end if;
  raise notice 'LYGIU TAKELIS: 50 langeliu, pradzia nuo 1 lygio';
end $$;
