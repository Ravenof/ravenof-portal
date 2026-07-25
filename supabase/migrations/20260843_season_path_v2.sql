-- ════════════════════════════════════════════════════════════════════════════
--  PROGRESSION v2 — SEASON PATH (20 lygių, free + pass)
--  ─────────────────────────────────────────────────────────────────────────
--  • 1000 Season XP / lygis (20 000 visam keliui) — economy_config.season_path_v2
--  • Atlygiai UŽŠALDOMI konkrečiam sezonui (season_reward_defs) → vėlesnis
--    ekonomikos keitimas nepakeičia jau vykstančio sezono.
--  • Pass kaina imama iš ESAMOS serverio konfigūracijos
--    (season_pass_seasons.pass_price_silver / pass_price_rubies).
--  • Vėliau nusipirkus pass — visi pasiekti premium atlygiai claimable retroaktyviai
--    (claim tikrina TIK xp ir has_season_pass, ne pirkimo laiką).
--  • Kosmetika: TIK card_back ir player_avatar; id imamas iš sezono konfigūracijos.
--    Nesukonfigūravus — atlygis praleidžiamas ir registruojamas turinio GAP.
--  Senos funkcijos (rvn_get_season_path / rvn_claim_season_reward /
--  rvn_unlock_season_pass) NELIEČIAMOS.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Sezono kosmetikos slotai (additive) ────────────────────────────────────
alter table public.season_pass_seasons add column if not exists card_back_cosmetic_id text;
alter table public.season_pass_seasons add column if not exists avatar_cosmetic_id text;
alter table public.season_pass_seasons add column if not exists economy_version int;

-- ── Turinio spragų registras ───────────────────────────────────────────────
create table if not exists public.progression_content_gaps (
  id          bigserial primary key,
  gap_type    text not null,          -- season_cosmetic|card_choice_pool|booster_pool
  scope       text not null,          -- season_id / rarity / faction ir pan.
  detail      jsonb not null default '{}'::jsonb,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  unique (gap_type, scope)
);
alter table public.progression_content_gaps enable row level security;
drop policy if exists pcg_admin on public.progression_content_gaps;
create policy pcg_admin on public.progression_content_gaps for select
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create or replace function public.rvn__log_content_gap(p_type text, p_scope text, p_detail jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.progression_content_gaps(gap_type, scope, detail)
    values (p_type, p_scope, coalesce(p_detail,'{}'::jsonb))
    on conflict (gap_type, scope) do update set last_seen = now(), detail = excluded.detail;
end $$;

-- ── Kanoninė 20 lygių lentelė (vienintelis tiesos šaltinis) ────────────────
insert into public.economy_config(key, value) values
('season_path_v2', $j$
{
  "xp_per_level": 1000,
  "levels": 20,
  "total_xp": 20000,
  "rewards": {
    "1":  {"free":[{"type":"silver","amount":250}],  "pass":[{"type":"essence","amount":50}]},
    "2":  {"free":[{"type":"essence","amount":50}],  "pass":[{"type":"silver","amount":350}]},
    "3":  {"free":[{"type":"silver","amount":350}],  "pass":[{"type":"faction_booster_choice","quantity":1}]},
    "4":  {"free":[{"type":"silver","amount":400}],  "pass":[{"type":"essence","amount":75}]},
    "5":  {"free":[{"type":"faction_booster_choice","quantity":1}], "pass":[{"type":"silver","amount":500}]},
    "6":  {"free":[{"type":"silver","amount":500}],  "pass":[{"type":"faction_booster_choice","quantity":1}]},
    "7":  {"free":[{"type":"card_choice","rarity":"rare"}], "pass":[{"type":"essence","amount":125}]},
    "8":  {"free":[{"type":"essence","amount":100}], "pass":[{"type":"faction_booster_choice","quantity":1}]},
    "9":  {"free":[{"type":"silver","amount":650}],  "pass":[{"type":"silver","amount":750}]},
    "10": {"free":[{"type":"faction_booster_choice","quantity":1}], "pass":[{"type":"faction_booster_choice","quantity":2}]},
    "11": {"free":[{"type":"silver","amount":750}],  "pass":[{"type":"essence","amount":150}]},
    "12": {"free":[{"type":"essence","amount":150}], "pass":[{"type":"card_back","cosmeticId":"$season_card_back"}]},
    "13": {"free":[{"type":"silver","amount":850}],  "pass":[{"type":"faction_booster_choice","quantity":1}]},
    "14": {"free":[{"type":"faction_booster_choice","quantity":1}], "pass":[{"type":"silver","amount":1000}]},
    "15": {"free":[{"type":"card_choice","rarity":"epic"}], "pass":[{"type":"faction_booster_choice","quantity":2}]},
    "16": {"free":[{"type":"silver","amount":1000}], "pass":[{"type":"essence","amount":250}]},
    "17": {"free":[{"type":"essence","amount":200}], "pass":[{"type":"faction_booster_choice","quantity":1},{"type":"silver","amount":500}]},
    "18": {"free":[{"type":"faction_booster_choice","quantity":1}], "pass":[{"type":"silver","amount":1500}]},
    "19": {"free":[{"type":"silver","amount":1250}], "pass":[{"type":"faction_booster_choice","quantity":2}]},
    "20": {"free":[{"type":"card_choice","rarity":"legendary"}],
           "pass":[{"type":"player_avatar","cosmeticId":"$season_player_avatar"},{"type":"faction_booster_choice","quantity":2}]}
  }
}
$j$::jsonb)
on conflict (key) do nothing;

-- ── Sezonui užšaldyti atlygiai ─────────────────────────────────────────────
create table if not exists public.season_reward_defs (
  season_id       uuid not null references public.season_pass_seasons(id) on delete cascade,
  level           int  not null check (level between 1 and 100),
  track           text not null check (track in ('free','pass')),
  rewards         jsonb not null,
  economy_version int  not null,
  created_at      timestamptz not null default now(),
  primary key (season_id, level, track)
);
alter table public.season_reward_defs enable row level security;
drop policy if exists srd_read on public.season_reward_defs;
create policy srd_read on public.season_reward_defs for select using (true);

-- Kosmetikos placeholderių išsprendimas + spragų registravimas
create or replace function public.rvn__resolve_season_rewards(p_season uuid, p_rewards jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare el jsonb; v_out jsonb := '[]'::jsonb; v_cb text; v_av text; v_id text;
begin
  select card_back_cosmetic_id, avatar_cosmetic_id into v_cb, v_av
    from public.season_pass_seasons where id = p_season;
  for el in select * from jsonb_array_elements(p_rewards) loop
    if el->>'type' in ('card_back','player_avatar') then
      v_id := el->>'cosmeticId';
      if v_id = '$season_card_back' then v_id := v_cb;
      elsif v_id = '$season_player_avatar' then v_id := v_av; end if;
      if v_id is null or not exists (select 1 from public.cosmetics where id = v_id) then
        perform public.rvn__log_content_gap('season_cosmetic', p_season::text || ':' || (el->>'type'),
          jsonb_build_object('reward', el, 'reason', 'sezonui nepriskirta esama kosmetika'));
        continue;  -- praleidžiam; admin gali priskirti vėliau ir padaryti backfill
      end if;
      v_out := v_out || jsonb_build_array(jsonb_build_object('type', el->>'type', 'cosmeticId', v_id));
    else
      v_out := v_out || jsonb_build_array(el);
    end if;
  end loop;
  return v_out;
end $$;

create or replace function public.rvn__ensure_season_rewards(p_season uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb; v_ver int := public.rvn__economy_version(); L int; v_lvls int;
begin
  if p_season is null then return; end if;
  if exists (select 1 from public.season_reward_defs where season_id = p_season) then return; end if;
  select value into v_cfg from public.economy_config where key = 'season_path_v2';
  if v_cfg is null then return; end if;
  v_lvls := coalesce((v_cfg->>'levels')::int, 20);
  for L in 1..v_lvls loop
    insert into public.season_reward_defs(season_id, level, track, rewards, economy_version)
      values (p_season, L, 'free',
              public.rvn__resolve_season_rewards(p_season, coalesce(v_cfg->'rewards'->(L::text)->'free','[]'::jsonb)), v_ver)
      on conflict do nothing;
    insert into public.season_reward_defs(season_id, level, track, rewards, economy_version)
      values (p_season, L, 'pass',
              public.rvn__resolve_season_rewards(p_season, coalesce(v_cfg->'rewards'->(L::text)->'pass','[]'::jsonb)), v_ver)
      on conflict do nothing;
  end loop;
  update public.season_pass_seasons set economy_version = coalesce(economy_version, v_ver) where id = p_season;
end $$;

-- Admin: priskyrus sezonui kosmetiką, atnaujina dar neišduotus apibrėžimus
create or replace function public.rvn_admin_refresh_season_rewards(p_season uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb; L int; v_lvls int; v_ver int := public.rvn__economy_version(); v_upd int := 0;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    return jsonb_build_object('error','forbidden');
  end if;
  select value into v_cfg from public.economy_config where key = 'season_path_v2';
  v_lvls := coalesce((v_cfg->>'levels')::int, 20);
  for L in 1..v_lvls loop
    -- atnaujinam TIK dar neatsiimtus (track, level) — claimintų NEPERRAŠOM
    update public.season_reward_defs d
      set rewards = public.rvn__resolve_season_rewards(p_season, coalesce(v_cfg->'rewards'->(L::text)->d.track,'[]'::jsonb)),
          economy_version = v_ver
      where d.season_id = p_season and d.level = L
        and not exists (select 1 from public.user_season_reward_claims c
                        where c.season_id = d.season_id and c.level = d.level and c.track = d.track);
    get diagnostics v_upd = row_count;
  end loop;
  return jsonb_build_object('ok', true, 'season', p_season);
end $$;

-- ── Būsena ──────────────────────────────────────────────────────────────────
create or replace function public.rvn_get_season_path_v2()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_sid uuid; v_cfg jsonb; v_xp int; v_haspass boolean;
  v_per int; v_lvls int; v_level int; v_s record; v_rows jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  v_sid := public.rvn__current_season();
  perform public.rvn__ensure_season_rewards(v_sid);
  select value into v_cfg from public.economy_config where key='season_path_v2';
  v_per := coalesce((v_cfg->>'xp_per_level')::int, 1000);
  v_lvls := coalesce((v_cfg->>'levels')::int, 20);
  select coalesce(xp,0), coalesce(has_season_pass,false) into v_xp, v_haspass
    from public.user_season_pass where user_id=v_uid and season_id=v_sid;
  v_xp := coalesce(v_xp,0); v_haspass := coalesce(v_haspass,false);
  v_level := least(v_lvls, v_xp / v_per);
  select * into v_s from public.season_pass_seasons where id=v_sid;

  select coalesce(jsonb_agg(jsonb_build_object(
      'level', l.level,
      'xpRequired', l.level * v_per,
      'reached', v_xp >= l.level * v_per,
      'free', jsonb_build_object(
        'rewards', coalesce(df.rewards, '[]'::jsonb),
        'claimed', cf.level is not null,
        'claimable', v_xp >= l.level * v_per and cf.level is null),
      'pass', jsonb_build_object(
        'rewards', coalesce(dp.rewards, '[]'::jsonb),
        'claimed', cp.level is not null,
        'claimable', v_haspass and v_xp >= l.level * v_per and cp.level is null)
    ) order by l.level), '[]'::jsonb) into v_rows
  from (select distinct level from public.season_reward_defs where season_id = v_sid) l
  left join public.season_reward_defs df on df.season_id=v_sid and df.level=l.level and df.track='free'
  left join public.season_reward_defs dp on dp.season_id=v_sid and dp.level=l.level and dp.track='pass'
  left join public.user_season_reward_claims cf
    on cf.user_id=v_uid and cf.season_id=v_sid and cf.level=l.level and cf.track='free'
  left join public.user_season_reward_claims cp
    on cp.user_id=v_uid and cp.season_id=v_sid and cp.level=l.level and cp.track='pass';

  return jsonb_build_object(
    'season', jsonb_build_object('id', v_sid, 'title', v_s.title, 'theme', v_s.theme,
                                 'startsAt', v_s.starts_at, 'endsAt', v_s.ends_at,
                                 'economyVersion', coalesce(v_s.economy_version, public.rvn__economy_version())),
    'xp', v_xp, 'level', v_level, 'levels', v_lvls, 'xpPerLevel', v_per,
    'totalXp', v_lvls * v_per,
    'hasPass', v_haspass,
    'passPrice', jsonb_build_object('silver', v_s.pass_price_silver, 'rubies', v_s.pass_price_rubies),
    'rows', v_rows,
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'balances', public.rvn__balances(v_uid),
    'serverTime', now()
  );
end $$;

-- ── Vieno lygio claim ──────────────────────────────────────────────────────
create or replace function public.rvn__claim_season_level(p_uid uuid, p_sid uuid, p_level int, p_track text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb; v_per int; v_xp int; v_haspass boolean; v_rewards jsonb; v_ins int; v_grant jsonb;
begin
  select value into v_cfg from public.economy_config where key='season_path_v2';
  v_per := coalesce((v_cfg->>'xp_per_level')::int, 1000);
  select coalesce(xp,0), coalesce(has_season_pass,false) into v_xp, v_haspass
    from public.user_season_pass where user_id=p_uid and season_id=p_sid;
  v_xp := coalesce(v_xp,0); v_haspass := coalesce(v_haspass,false);
  if v_xp < p_level * v_per then return jsonb_build_object('error','level_not_reached'); end if;
  if p_track = 'pass' and not v_haspass then return jsonb_build_object('error','no_pass'); end if;

  select rewards into v_rewards from public.season_reward_defs
    where season_id=p_sid and level=p_level and track=p_track;
  if v_rewards is null then return jsonb_build_object('error','no_reward_definition'); end if;

  insert into public.user_season_reward_claims(user_id, season_id, level, track)
    values (p_uid, p_sid, p_level, p_track) on conflict do nothing;
  get diagnostics v_ins = row_count;
  if v_ins = 0 then return jsonb_build_object('error','already_claimed'); end if;

  v_grant := public.rvn__grant_rewards_v2(p_uid, v_rewards, 'season',
                p_sid::text || ':' || p_level || ':' || p_track);
  return jsonb_build_object('ok', true, 'level', p_level, 'track', p_track,
                            'granted', v_grant->'granted', 'pending', v_grant->'pendingChoices');
end $$;

create or replace function public.rvn_claim_season_reward_v2(
  p_level int, p_track text, p_idempotency_key text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_sid uuid; v_r jsonb; v_res jsonb; v_prev jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_track not in ('free','pass') then return jsonb_build_object('error','bad_track'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='claim_season' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  perform 1 from public.profiles where id=v_uid for update;
  v_sid := public.rvn__current_season();
  perform public.rvn__ensure_season_rewards(v_sid);
  v_r := public.rvn__claim_season_level(v_uid, v_sid, p_level, p_track);
  if v_r ? 'error' then return v_r; end if;

  v_res := jsonb_build_object(
    'status', case when jsonb_array_length(v_r->'pending') > 0 then 'choice_required' else 'completed' end,
    'grantedRewards', v_r->'granted',
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'snapshot', public.rvn_get_season_path_v2());
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'claim_season', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

-- ── CLAIM ALL (sustoja ties pasirinkimu) ───────────────────────────────────
create or replace function public.rvn_claim_all_season_rewards(p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_sid uuid; v_prev jsonb; v_res jsonb;
  v_granted jsonb := '[]'::jsonb; v_stopped boolean := false; r record; v_one jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='claim_all_season' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  perform 1 from public.profiles where id=v_uid for update;
  v_sid := public.rvn__current_season();
  perform public.rvn__ensure_season_rewards(v_sid);

  -- jei jau yra neišspręstų pasirinkimų — nieko naujo neclaiminam
  if jsonb_array_length(public.rvn__pending_choices(v_uid)) > 0 then
    return jsonb_build_object('status','choice_required','grantedRewards','[]'::jsonb,
      'pendingChoices', public.rvn__pending_choices(v_uid),
      'snapshot', public.rvn_get_season_path_v2());
  end if;

  -- deterministinė tvarka: lygis didėjančiai, free prieš pass
  for r in
    select d.level, d.track from public.season_reward_defs d
    where d.season_id = v_sid
      and not exists (select 1 from public.user_season_reward_claims c
                      where c.user_id=v_uid and c.season_id=d.season_id and c.level=d.level and c.track=d.track)
    order by d.level asc, case d.track when 'free' then 0 else 1 end
  loop
    exit when v_stopped;
    v_one := public.rvn__claim_season_level(v_uid, v_sid, r.level, r.track);
    if v_one ? 'error' then
      -- nepasiektas lygis → toliau nebeeinam; be pass → praleidžiam pass takelį
      if v_one->>'error' = 'level_not_reached' then exit; end if;
      continue;
    end if;
    v_granted := v_granted || coalesce(v_one->'granted','[]'::jsonb);
    if jsonb_array_length(coalesce(v_one->'pending','[]'::jsonb)) > 0 then v_stopped := true; end if;
  end loop;

  v_res := jsonb_build_object(
    'status', case when v_stopped then 'choice_required' else 'completed' end,
    'grantedRewards', v_granted,
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'snapshot', public.rvn_get_season_path_v2());
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'claim_all_season', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

-- ── Pass atrakinimas (kaina iš esamos serverio konfigūracijos) ─────────────
create or replace function public.rvn_unlock_season_pass_v2(p_currency text, p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_sid uuid; v_s record; v_bal int; v_cost int; v_prev jsonb; v_res jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_currency not in ('silver','rubies') then return jsonb_build_object('error','bad_currency'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='unlock_pass' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  perform 1 from public.profiles where id=v_uid for update;
  v_sid := public.rvn__current_season();
  perform public.rvn__ensure_season_rewards(v_sid);
  select * into v_s from public.season_pass_seasons where id=v_sid;
  insert into public.user_season_pass(user_id, season_id, xp) values (v_uid, v_sid, 0) on conflict do nothing;
  if (select has_season_pass from public.user_season_pass where user_id=v_uid and season_id=v_sid) then
    return jsonb_build_object('error','already_owned');
  end if;

  if p_currency = 'silver' then
    v_cost := v_s.pass_price_silver; select gold into v_bal from public.profiles where id=v_uid;
    if v_bal < v_cost then return jsonb_build_object('error','not_enough'); end if;
    update public.profiles set gold = gold - v_cost where id=v_uid;
  else
    v_cost := v_s.pass_price_rubies; select rubies into v_bal from public.profiles where id=v_uid;
    if v_bal < v_cost then return jsonb_build_object('error','not_enough'); end if;
    update public.profiles set rubies = rubies - v_cost where id=v_uid;
  end if;

  update public.user_season_pass set has_season_pass=true, season_pass_activated_at=now()
    where user_id=v_uid and season_id=v_sid;
  insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
    values (v_uid, 'season_pass_unlock', v_sid::text, 'currency', p_currency, -v_cost);

  v_res := jsonb_build_object('status','completed','cost', v_cost, 'currency', p_currency,
                              'snapshot', public.rvn_get_season_path_v2());
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'unlock_pass', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

grant execute on function public.rvn_get_season_path_v2() to authenticated;
grant execute on function public.rvn_claim_season_reward_v2(int, text, text) to authenticated;
grant execute on function public.rvn_claim_all_season_rewards(text) to authenticated;
grant execute on function public.rvn_unlock_season_pass_v2(text, text) to authenticated;
grant execute on function public.rvn_admin_refresh_season_rewards(uuid) to authenticated;
