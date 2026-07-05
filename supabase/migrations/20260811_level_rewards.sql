-- ════════════════════════════════════════════════════════════════════════════
--  Ravenof Ekonomika Phase 2a — Account level rewards (config-driven + claims)
--  Spec: kas lygį 100 Sidabras+25 Esencija; kas 5 +pakas/300/100; kas 10 +2pak/500/200/50rub;
--  lvl20 rare pak/750/300/rare card back; lvl50 legendary card back/3pak/1000/500/100rub.
--  Idempotentiška per user_level_reward_claims. BACKFILL esamiems lygiams (be dvigubo).
--  Įtraukta į rvn_report_match_v2 (grąžina levelRewards šventei). Esamo rvn_report_match NELIETA.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) config ───────────────────────────────────────────────────────────────
insert into public.economy_config(key, value) values
('level_rewards', $j$
{
  "every":   {"silver":100, "essence":25},
  "every5":  {"silver":300, "essence":100, "packs":1},
  "every10": {"silver":500, "essence":200, "rubies":50, "packs":2},
  "milestones": {
    "20": {"silver":750,  "essence":300, "pack_rare":1, "card_back":"rare_card_back"},
    "50": {"silver":1000, "essence":500, "rubies":100, "packs":3, "card_back":"legendary_card_back"}
  }
}
$j$::jsonb)
on conflict (key) do nothing;

-- ── 2) claims lentelė ───────────────────────────────────────────────────────
create table if not exists public.user_level_reward_claims (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  level       int  not null,
  reward_group text not null default 'level',
  claimed_at  timestamptz not null default now(),
  primary key (user_id, level, reward_group)
);
alter table public.user_level_reward_claims enable row level security;
drop policy if exists ulrc_own on public.user_level_reward_claims;
create policy ulrc_own on public.user_level_reward_claims for select using (user_id = auth.uid());

-- ── 3) BACKFILL: pažymim jau pasiektus lygius kaip claimed (be atlygio) ─────
insert into public.user_level_reward_claims(user_id, level, reward_group)
select p.id, gs.L, 'level'
from public.profiles p
cross join lateral generate_series(2, greatest(2, public.rvn__level_from_xp(coalesce(p.xp_total,0)))) as gs(L)
where public.rvn__level_from_xp(coalesce(p.xp_total,0)) >= 2
on conflict do nothing;

-- ── 4) level → reward payload (iš config) ───────────────────────────────────
create or replace function public.rvn__level_reward_payload(p_level int)
returns jsonb language plpgsql stable as $$
declare
  v_cfg jsonb; v_m jsonb;
  v_silver int := 0; v_essence int := 0; v_rubies int := 0; v_packs int := 0;
  v_items jsonb := '[]'::jsonb; v_out jsonb := '[]'::jsonb;
begin
  select value into v_cfg from public.economy_config where key='level_rewards';
  if v_cfg is null then return '[]'::jsonb; end if;

  v_silver  := v_silver  + coalesce((v_cfg->'every'->>'silver')::int,0);
  v_essence := v_essence + coalesce((v_cfg->'every'->>'essence')::int,0);

  if p_level % 5 = 0 then
    v_silver  := v_silver  + coalesce((v_cfg->'every5'->>'silver')::int,0);
    v_essence := v_essence + coalesce((v_cfg->'every5'->>'essence')::int,0);
    v_packs   := v_packs   + coalesce((v_cfg->'every5'->>'packs')::int,0);
  end if;
  if p_level % 10 = 0 then
    v_silver  := v_silver  + coalesce((v_cfg->'every10'->>'silver')::int,0);
    v_essence := v_essence + coalesce((v_cfg->'every10'->>'essence')::int,0);
    v_rubies  := v_rubies  + coalesce((v_cfg->'every10'->>'rubies')::int,0);
    v_packs   := v_packs   + coalesce((v_cfg->'every10'->>'packs')::int,0);
  end if;

  v_m := v_cfg->'milestones'->(p_level::text);
  if v_m is not null then
    v_silver  := v_silver  + coalesce((v_m->>'silver')::int,0);
    v_essence := v_essence + coalesce((v_m->>'essence')::int,0);
    v_rubies  := v_rubies  + coalesce((v_m->>'rubies')::int,0);
    v_packs   := v_packs   + coalesce((v_m->>'packs')::int,0);
    if coalesce((v_m->>'pack_rare')::int,0) > 0 then
      v_items := v_items || jsonb_build_object('type','item','item_type','pack','item_id','rare_pack','quantity',(v_m->>'pack_rare')::int);
    end if;
    if v_m ? 'card_back' then
      v_items := v_items || jsonb_build_object('type','item','item_type','card_back','item_id',v_m->>'card_back','quantity',1);
    end if;
  end if;

  if v_silver  > 0 then v_out := v_out || jsonb_build_object('type','currency','currency','silver','amount',v_silver); end if;
  if v_essence > 0 then v_out := v_out || jsonb_build_object('type','currency','currency','essence','amount',v_essence); end if;
  if v_rubies  > 0 then v_out := v_out || jsonb_build_object('type','currency','currency','rubies','amount',v_rubies); end if;
  if v_packs   > 0 then v_out := v_out || jsonb_build_object('type','item','item_type','pack','item_id','standard_pack','quantity',v_packs); end if;
  v_out := v_out || v_items;
  return v_out;
end $$;

-- ── 5) check + grant neatsiimtus level rewards (idempotentiška) ──────────────
create or replace function public.rvn__check_level_rewards(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_lvl int; L int; v_ins int; v_pay jsonb; v_out jsonb := '[]'::jsonb;
begin
  if p_user is null then return '[]'::jsonb; end if;
  select public.rvn__level_from_xp(coalesce(xp_total,0)) into v_lvl from public.profiles where id = p_user;
  if v_lvl is null or v_lvl < 2 then return '[]'::jsonb; end if;
  for L in 2..v_lvl loop
    insert into public.user_level_reward_claims(user_id, level, reward_group)
      values (p_user, L, 'level') on conflict do nothing;
    get diagnostics v_ins = row_count;
    if v_ins > 0 then
      v_pay := public.rvn__level_reward_payload(L);
      perform public.rvn__grant_reward_payload(p_user, v_pay, 'level', L::text);
      v_out := v_out || jsonb_build_object('level', L, 'payload', v_pay);
    end if;
  end loop;
  return v_out;
end $$;

grant execute on function public.rvn__check_level_rewards(uuid) to authenticated;

-- ── 6) rvn_report_match_v2: po XP – patikrinam level rewards, grąžinam šventei ─
-- (perkuriam v2 su papildoma eilute; likusi logika ta pati kaip 20260810)
create or replace function public.rvn_report_match_v2(
  p_client_match_id uuid, p_mode text, p_result text,
  p_duration_seconds int default 0, p_turns int default 0,
  p_player_actions int default 0, p_opponent_actions int default 0,
  p_opponent_id uuid default null, p_opponent_type text default 'human'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cfg jsonb; v_val jsonb; v_streak jsonb; v_mode jsonb; v_side jsonb;
  v_won boolean := (p_result = 'win');
  v_valid boolean; v_minA int; v_axp int; v_sxp int; v_slv int;
  v_cap int; v_cnt int; v_after jsonb; v_streakCount int := 0; v_delta int := 0;
  v_xp0 bigint; v_xp1 bigint; v_payload jsonb; v_bonus jsonb; v_levelRewards jsonb := '[]'::jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  if p_client_match_id is not null and exists (select 1 from public.matches where user_id=v_uid and client_match_id=p_client_match_id) then
    select jsonb_build_object('valid', valid_for_rewards, 'duplicate', true,
      'rewards', jsonb_build_object('account_xp',account_xp_reward,'season_xp',season_xp_reward,'silver',silver_reward))
      into v_payload from public.matches where user_id=v_uid and client_match_id=p_client_match_id limit 1;
    return v_payload;
  end if;

  select value into v_cfg    from public.economy_config where key='match_rewards';
  select value into v_val    from public.economy_config where key='match_validity';
  select value into v_streak from public.economy_config where key='win_streak_bonus';
  v_mode := v_cfg->p_mode;
  if v_mode is null then return jsonb_build_object('error','unknown mode'); end if;

  v_minA := coalesce((v_val->>'min_actions')::int,3);
  v_valid := p_duration_seconds >= coalesce((v_val->>'min_duration_seconds')::int,180)
          or p_turns            >= coalesce((v_val->>'min_turns')::int,5)
          or (p_player_actions >= v_minA and p_opponent_actions >= v_minA);

  if not v_valid then
    insert into public.matches(user_id, client_match_id, opponent_id, opponent_type, mode, result,
      duration_seconds, turns_played, player_actions_count, opponent_actions_count, valid_for_rewards)
      values (v_uid, p_client_match_id, p_opponent_id, p_opponent_type, p_mode, p_result,
      p_duration_seconds, p_turns, p_player_actions, p_opponent_actions, false);
    if v_won is not true and p_mode='ranked' then update public.profiles set ranked_win_streak=0 where id=v_uid; end if;
    return jsonb_build_object('valid', false);
  end if;

  v_side := v_mode->(case when v_won then 'win' else 'loss' end);
  v_axp := coalesce((v_side->>'account_xp')::int,0);
  v_sxp := coalesce((v_side->>'season_xp')::int,0);
  v_slv := coalesce((v_side->>'silver')::int,0);

  v_cap := coalesce((v_mode->>'daily_cap')::int, 0);
  if v_cap > 0 then
    select count(*) into v_cnt from public.matches
      where user_id=v_uid and mode=p_mode and valid_for_rewards and created_at >= date_trunc('day', now());
    if v_cnt >= v_cap then
      v_after := v_mode->'after_cap';
      v_axp := floor(v_axp * coalesce((v_after->>'account_xp_pct')::numeric,100) / 100.0);
      v_sxp := floor(v_sxp * coalesce((v_after->>'season_xp_pct')::numeric,100) / 100.0);
      v_slv := floor(v_slv * coalesce((v_after->>'silver_pct')::numeric,100) / 100.0);
    end if;
  end if;

  if p_mode='ranked' then
    if v_won then
      update public.profiles set ranked_win_streak = ranked_win_streak + 1 where id=v_uid returning ranked_win_streak into v_streakCount;
      if v_streakCount >= 5 then v_bonus := v_streak->'5';
      elsif v_streakCount >= 3 then v_bonus := v_streak->'3'; end if;
      if v_bonus is not null then
        v_sxp := v_sxp + coalesce((v_bonus->>'season_xp')::int,0);
        v_slv := v_slv + coalesce((v_bonus->>'silver')::int,0);
      end if;
    else
      update public.profiles set ranked_win_streak = 0 where id=v_uid;
    end if;
    v_delta := coalesce((v_mode->>(case when v_won then 'ranked_step_win' else 'ranked_step_loss' end))::int, 0);
  end if;

  select coalesce(xp_total,0) into v_xp0 from public.profiles where id=v_uid;

  v_payload := jsonb_build_array(
    jsonb_build_object('type','account_xp','amount',v_axp),
    jsonb_build_object('type','season_xp','amount',v_sxp),
    jsonb_build_object('type','currency','currency','silver','amount',v_slv)
  );
  perform public.rvn__grant_reward_payload(v_uid, v_payload, 'match', p_client_match_id::text);

  -- Level rewards už perliptus lygius (idempotentiška)
  v_levelRewards := public.rvn__check_level_rewards(v_uid);

  insert into public.matches(user_id, client_match_id, opponent_id, opponent_type, mode, result,
    duration_seconds, turns_played, player_actions_count, opponent_actions_count, valid_for_rewards,
    account_xp_reward, season_xp_reward, silver_reward, ranked_progress_delta)
    values (v_uid, p_client_match_id, p_opponent_id, p_opponent_type, p_mode, p_result,
    p_duration_seconds, p_turns, p_player_actions, p_opponent_actions, true,
    v_axp, v_sxp, v_slv, v_delta);

  select coalesce(xp_total,0) into v_xp1 from public.profiles where id=v_uid;
  v_xp1 := greatest(v_xp1, v_xp0 + v_axp);

  return jsonb_build_object(
    'valid', true, 'result', p_result,
    'rewards', jsonb_build_object('account_xp',v_axp,'season_xp',v_sxp,'silver',v_slv),
    'streak', v_streakCount, 'rankedDelta', v_delta,
    'accountXpBefore', v_xp0, 'accountXpAfter', v_xp1,
    'levelRewards', v_levelRewards,
    'balances', (select jsonb_build_object('silver',gold,'rubies',rubies,'essence',essence) from public.profiles where id=v_uid)
  );
end $$;

grant execute on function public.rvn_report_match_v2(uuid, text, text, int, int, int, int, uuid, text) to authenticated;
