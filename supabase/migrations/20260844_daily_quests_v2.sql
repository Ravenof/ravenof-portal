-- ════════════════════════════════════════════════════════════════════════════
--  PROGRESSION v2 — DAILY QUESTS (1 easy + 1 medium + 1 hard per UTC parą)
--  ─────────────────────────────────────────────────────────────────────────
--  • Reset 00:00 UTC (rvn__utc_date). Atlygiai iš economy_config.daily_quests_v2:
--      easy 100 Silver + 80 Season XP · medium 150 + 100 · hard 200 + 120
--      Daily Chest (visi trys) 50 Essence + 100 Season XP
--  • Reroll: 1-as nemokamas, 2-as ir 3-ias po 100 Sidabro, 4-as draudžiamas.
--  • Generavimo taisyklės: be PvP kol PvP neprieinamas; frakcijos questas tik
--    turint galiojančią tos frakcijos kaladę; be dublikatų/konfliktų;
--    be win-streak; „atplėšk pakuotę" questai išjungiami.
--  • Progresas TIK iš galiojančių (valid_for_rewards) kovų.
--  Senoji v1 sistema (user_daily_tasks ir kt.) NELIEČIAMA — veikia lygiagrečiai,
--  kol dizaino handoff'as perjungs UI.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.economy_config(key, value) values
('daily_quests_v2', $j$
{
  "rewards": {
    "easy":   [{"type":"silver","amount":100},{"type":"season_xp","amount":80}],
    "medium": [{"type":"silver","amount":150},{"type":"season_xp","amount":100}],
    "hard":   [{"type":"silver","amount":200},{"type":"season_xp","amount":120}]
  },
  "chest": [{"type":"essence","amount":50},{"type":"season_xp","amount":100}],
  "daily_max": {"silver":450,"essence":50,"season_xp":400},
  "reroll": {"free":1,"paid_cost_silver":100,"max_total":3},
  "generation": {
    "difficulties": ["easy","medium","hard"],
    "min_deck_cards": 30,
    "enable_stat_objectives": false,
    "pvp_requires_onboarding": true
  }
}
$j$::jsonb)
on conflict (key) do nothing;

-- ── Šablonai v2 ─────────────────────────────────────────────────────────────
create table if not exists public.daily_quest_templates (
  code            text primary key,
  difficulty      text not null check (difficulty in ('easy','medium','hard')),
  objective_type  text not null,
  target_value    int  not null default 1,
  mode_restriction text,                    -- null|bot|unranked|ranked
  requires_pvp    boolean not null default false,
  requires_faction boolean not null default false,
  requires_stats  boolean not null default false,   -- reikia kovos telemetrijos
  conflict_group  text not null,
  weight          int  not null default 10,
  is_active       boolean not null default true,
  title_key       text not null,
  desc_key        text not null,
  updated_at      timestamptz not null default now()
);
alter table public.daily_quest_templates enable row level security;
drop policy if exists dqt_read on public.daily_quest_templates;
create policy dqt_read on public.daily_quest_templates for select using (true);
drop policy if exists dqt_admin on public.daily_quest_templates;
create policy dqt_admin on public.daily_quest_templates for all
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

insert into public.daily_quest_templates
  (code, difficulty, objective_type, target_value, mode_restriction, requires_pvp, requires_faction, requires_stats, conflict_group, weight, title_key, desc_key) values
 -- EASY
 ('easy_play_1',        'easy',  'play_match',       1, null,     false,false,false,'play_match',    10,'quests.v2.playMatch.title','quests.v2.playMatch.desc'),
 ('easy_play_2',        'easy',  'play_match',       2, null,     false,false,false,'play_match',     8,'quests.v2.playMatch.title','quests.v2.playMatch.desc'),
 ('easy_win_bot_1',     'easy',  'win_match',        1, 'bot',    false,false,false,'win_match',     10,'quests.v2.winBot.title','quests.v2.winBot.desc'),
 ('easy_creatures_5',   'easy',  'play_creatures',   5, null,     false,false,true, 'play_creatures',10,'quests.v2.playCreatures.title','quests.v2.playCreatures.desc'),
 ('easy_damage_30',     'easy',  'deal_damage',     30, null,     false,false,true, 'deal_damage',    8,'quests.v2.dealDamage.title','quests.v2.dealDamage.desc'),
 -- MEDIUM
 ('med_play_3',         'medium','play_match',       3, null,     false,false,false,'play_match',    10,'quests.v2.playMatch.title','quests.v2.playMatch.desc'),
 ('med_win_2',          'medium','win_match',        2, null,     false,false,false,'win_match',     10,'quests.v2.winMatch.title','quests.v2.winMatch.desc'),
 ('med_creatures_12',   'medium','play_creatures',  12, null,     false,false,true, 'play_creatures',10,'quests.v2.playCreatures.title','quests.v2.playCreatures.desc'),
 ('med_damage_80',      'medium','deal_damage',     80, null,     false,false,true, 'deal_damage',    9,'quests.v2.dealDamage.title','quests.v2.dealDamage.desc'),
 ('med_faction_win_1',  'medium','win_faction_match',1,null,      false,true, true, 'faction',        7,'quests.v2.factionWin.title','quests.v2.factionWin.desc'),
 ('med_pvp_play_1',     'medium','play_match',       1, 'unranked',true,false,false,'pvp',            6,'quests.v2.pvpPlay.title','quests.v2.pvpPlay.desc'),
 -- HARD
 ('hard_win_3',         'hard',  'win_match',        3, null,     false,false,false,'win_match',     10,'quests.v2.winMatch.title','quests.v2.winMatch.desc'),
 ('hard_play_5',        'hard',  'play_match',       5, null,     false,false,false,'play_match',     9,'quests.v2.playMatch.title','quests.v2.playMatch.desc'),
 ('hard_creatures_25',  'hard',  'play_creatures',  25, null,     false,false,true, 'play_creatures',10,'quests.v2.playCreatures.title','quests.v2.playCreatures.desc'),
 ('hard_damage_150',    'hard',  'deal_damage',    150, null,     false,false,true, 'deal_damage',    9,'quests.v2.dealDamage.title','quests.v2.dealDamage.desc'),
 ('hard_faction_win_2', 'hard',  'win_faction_match',2,null,      false,true, true, 'faction',        7,'quests.v2.factionWin.title','quests.v2.factionWin.desc'),
 ('hard_pvp_win_1',     'hard',  'win_match',        1, 'ranked',  true,false,false,'pvp',            6,'quests.v2.pvpWin.title','quests.v2.pvpWin.desc')
on conflict (code) do nothing;

-- „Atplėšk pakuotę" tipo questai — draudžiami (gynybinis išjungimas)
update public.daily_quest_templates set is_active = false
  where objective_type in ('open_pack','open_booster') or code ilike '%pack%';
update public.daily_task_templates set is_active = false
  where objective_type in ('open_pack','open_booster')
     or title ilike '%pakuot%' or description ilike '%atplėšk%pakuot%';

-- ── Vartotojo dienos questai ───────────────────────────────────────────────
create table if not exists public.user_daily_quests_v2 (
  id              bigserial primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  date_key        date not null,                    -- UTC
  difficulty      text not null check (difficulty in ('easy','medium','hard')),
  template_code   text not null references public.daily_quest_templates(code),
  objective_type  text not null,
  target_value    int  not null,
  faction_id      int  references public.factions(id),
  progress        int  not null default 0,
  rewards         jsonb not null,                   -- užšaldyti generavimo metu
  economy_version int  not null default 2,
  reroll_index    int  not null default 0,
  is_completed    boolean not null default false,
  is_claimed      boolean not null default false,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,
  claimed_at      timestamptz,
  unique (user_id, date_key, difficulty)
);
alter table public.user_daily_quests_v2 enable row level security;
drop policy if exists udq_own on public.user_daily_quests_v2;
create policy udq_own on public.user_daily_quests_v2 for select using (user_id = auth.uid());

create table if not exists public.user_daily_quest_meta (
  user_id           uuid not null references public.profiles(id) on delete cascade,
  date_key          date not null,
  free_reroll_used  boolean not null default false,
  paid_reroll_count int not null default 0,
  retired_codes     text[] not null default '{}',   -- ką jau išmetė (negrąžinam iškart)
  primary key (user_id, date_key)
);
alter table public.user_daily_quest_meta enable row level security;
drop policy if exists udqm_own on public.user_daily_quest_meta;
create policy udqm_own on public.user_daily_quest_meta for select using (user_id = auth.uid());

create table if not exists public.user_daily_chests (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  date_key   date not null,
  rewards    jsonb not null default '[]'::jsonb,
  claimed_at timestamptz not null default now(),
  primary key (user_id, date_key)
);
alter table public.user_daily_chests enable row level security;
drop policy if exists udc2_own on public.user_daily_chests;
create policy udc2_own on public.user_daily_chests for select using (user_id = auth.uid());

-- ── Tinkamumo patikros ─────────────────────────────────────────────────────
create or replace function public.rvn__pvp_available(p_uid uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_cfg jsonb;
begin
  select value into v_cfg from public.economy_config where key='daily_quests_v2';
  if not coalesce((v_cfg->'generation'->>'pvp_requires_onboarding')::boolean, true) then return true; end if;
  return exists (select 1 from public.profiles where id = p_uid and digital_onboarded_at is not null);
end $$;

-- Frakcijos, kurioms žaidėjas turi galiojančią (≥ min kortų) kaladę
create or replace function public.rvn__playable_deck_factions(p_uid uuid)
returns int[] language plpgsql stable security definer set search_path = public as $$
declare v_min int; v_out int[];
begin
  select coalesce((value->'generation'->>'min_deck_cards')::int, 30) into v_min
    from public.economy_config where key='daily_quests_v2';
  select coalesce(array_agg(distinct d.faction_id), '{}') into v_out
    from public.decks d
    join (select deck_id, sum(quantity) as n from public.deck_cards group by deck_id) c on c.deck_id = d.id
    where d.user_id = p_uid and d.faction_id is not null and c.n >= v_min;
  return v_out;
end $$;

-- ── Generavimas ────────────────────────────────────────────────────────────
create or replace function public.rvn__pick_quest_template(
  p_uid uuid, p_difficulty text, p_exclude_groups text[], p_exclude_codes text[]
) returns public.daily_quest_templates language plpgsql volatile security definer set search_path = public as $$
declare v_cfg jsonb; v_stats boolean; v_pvp boolean; v_factions int[]; v_t public.daily_quest_templates;
begin
  select value into v_cfg from public.economy_config where key='daily_quests_v2';
  v_stats := coalesce((v_cfg->'generation'->>'enable_stat_objectives')::boolean, false);
  v_pvp := public.rvn__pvp_available(p_uid);
  v_factions := public.rvn__playable_deck_factions(p_uid);

  select * into v_t from public.daily_quest_templates t
   where t.is_active and t.difficulty = p_difficulty
     and (v_stats or not t.requires_stats)
     and (v_pvp or not t.requires_pvp)
     and (not t.requires_faction or array_length(v_factions,1) > 0)
     and not (t.conflict_group = any(coalesce(p_exclude_groups,'{}')))
     and not (t.code = any(coalesce(p_exclude_codes,'{}')))
   order by random() * t.weight desc
   limit 1;

  if v_t.code is null then
    -- atsarginis variantas: atlaisvinam konfliktų filtrą, bet NE tinkamumo
    select * into v_t from public.daily_quest_templates t
     where t.is_active and t.difficulty = p_difficulty
       and (v_stats or not t.requires_stats)
       and (v_pvp or not t.requires_pvp)
       and (not t.requires_faction or array_length(v_factions,1) > 0)
       and not (t.code = any(coalesce(p_exclude_codes,'{}')))
     order by random() * t.weight desc limit 1;
  end if;
  return v_t;
end $$;

create or replace function public.rvn__ensure_daily_quests(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_dk date := public.rvn__utc_date(); v_cfg jsonb; v_diff text; v_t public.daily_quest_templates;
  v_groups text[] := '{}'; v_codes text[] := '{}'; v_fac int; v_factions int[]; v_ver int := public.rvn__economy_version();
begin
  if p_uid is null then return; end if;
  if exists (select 1 from public.user_daily_quests_v2 where user_id=p_uid and date_key=v_dk) then return; end if;

  select value into v_cfg from public.economy_config where key='daily_quests_v2';
  v_factions := public.rvn__playable_deck_factions(p_uid);

  foreach v_diff in array array['easy','medium','hard'] loop
    v_t := public.rvn__pick_quest_template(p_uid, v_diff, v_groups, v_codes);
    if v_t.code is null then continue; end if;
    v_groups := array_append(v_groups, v_t.conflict_group);
    v_codes  := array_append(v_codes, v_t.code);
    v_fac := null;
    if v_t.requires_faction and array_length(v_factions,1) > 0 then
      v_fac := v_factions[1 + floor(random() * array_length(v_factions,1))::int];
    end if;
    insert into public.user_daily_quests_v2(user_id, date_key, difficulty, template_code, objective_type,
                                         target_value, faction_id, rewards, economy_version)
      values (p_uid, v_dk, v_diff, v_t.code, v_t.objective_type, v_t.target_value, v_fac,
              coalesce(v_cfg->'rewards'->v_diff, '[]'::jsonb), v_ver)
      on conflict (user_id, date_key, difficulty) do nothing;
  end loop;

  insert into public.user_daily_quest_meta(user_id, date_key) values (p_uid, v_dk) on conflict do nothing;
end $$;

-- ── Progresas iš kovų ──────────────────────────────────────────────────────
create or replace function public.rvn__quests_progress(
  p_uid uuid, p_objective text, p_amount int, p_faction int default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_dk date := public.rvn__utc_date();
begin
  if p_uid is null or coalesce(p_amount,0) <= 0 then return; end if;
  update public.user_daily_quests_v2 q
    set progress = least(q.target_value, q.progress + p_amount),
        is_completed = (q.progress + p_amount >= q.target_value),
        completed_at = case when (q.progress + p_amount >= q.target_value) and q.completed_at is null
                            then now() else q.completed_at end
  where q.user_id = p_uid and q.date_key = v_dk and not q.is_completed
    and q.objective_type = p_objective
    and (q.faction_id is null or q.faction_id = p_faction);
end $$;

create or replace function public.rvn__quests_from_match()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not NEW.valid_for_rewards then return NEW; end if;
  perform public.rvn__ensure_daily_quests(NEW.user_id);
  perform public.rvn__quests_progress(NEW.user_id, 'play_match', 1);
  if NEW.result = 'win' then
    perform public.rvn__quests_progress(NEW.user_id, 'win_match', 1);
  end if;
  return NEW;
end $$;
drop trigger if exists trg_quests_v2_from_match on public.matches;
create trigger trg_quests_v2_from_match after insert on public.matches
  for each row execute function public.rvn__quests_from_match();

-- Kovos telemetrija (kortos / žala / kaladės frakcija). Idempotentiška per matches eilutę.
alter table public.matches add column if not exists deck_faction_id int references public.factions(id);
alter table public.matches add column if not exists creatures_played int;
alter table public.matches add column if not exists spells_played int;
alter table public.matches add column if not exists damage_dealt int;
alter table public.matches add column if not exists stats_reported_at timestamptz;

create or replace function public.rvn_report_match_stats(
  p_client_match_id uuid, p_stats jsonb, p_deck_faction_id int default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_m public.matches%rowtype; v_c int; v_s int; v_d int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  select * into v_m from public.matches
    where user_id = v_uid and client_match_id = p_client_match_id for update;
  if v_m.id is null then return jsonb_build_object('error','match_not_found'); end if;
  if v_m.stats_reported_at is not null then return jsonb_build_object('ok', true, 'duplicate', true); end if;

  v_c := greatest(0, coalesce((p_stats->>'creaturesPlayed')::int, 0));
  v_s := greatest(0, coalesce((p_stats->>'spellsPlayed')::int, 0));
  v_d := greatest(0, coalesce((p_stats->>'damageDealt')::int, 0));

  update public.matches set creatures_played = v_c, spells_played = v_s, damage_dealt = v_d,
         deck_faction_id = p_deck_faction_id, stats_reported_at = now()
    where id = v_m.id;

  if v_m.valid_for_rewards then
    perform public.rvn__ensure_daily_quests(v_uid);
    perform public.rvn__quests_progress(v_uid, 'play_creatures', v_c);
    perform public.rvn__quests_progress(v_uid, 'play_spells', v_s);
    perform public.rvn__quests_progress(v_uid, 'deal_damage', v_d);
    if v_m.result = 'win' and p_deck_faction_id is not null then
      perform public.rvn__quests_progress(v_uid, 'win_faction_match', 1, p_deck_faction_id);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;

-- ── Būsena ──────────────────────────────────────────────────────────────────
create or replace function public.rvn_get_daily_quests_v2()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_dk date := public.rvn__utc_date(); v_cfg jsonb;
  v_quests jsonb; v_all boolean; v_meta record; v_used int; v_max int; v_cost int; v_free int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  perform public.rvn__ensure_daily_quests(v_uid);
  select value into v_cfg from public.economy_config where key='daily_quests_v2';
  v_free := coalesce((v_cfg->'reroll'->>'free')::int, 1);
  v_max  := coalesce((v_cfg->'reroll'->>'max_total')::int, 3);
  v_cost := coalesce((v_cfg->'reroll'->>'paid_cost_silver')::int, 100);

  select * into v_meta from public.user_daily_quest_meta where user_id=v_uid and date_key=v_dk;
  v_used := (case when coalesce(v_meta.free_reroll_used,false) then 1 else 0 end) + coalesce(v_meta.paid_reroll_count,0);

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'difficulty', q.difficulty, 'templateCode', q.template_code,
      'objectiveType', q.objective_type, 'titleKey', t.title_key, 'descKey', t.desc_key,
      'target', q.target_value, 'progress', q.progress, 'factionId', q.faction_id,
      'rewards', q.rewards, 'completed', q.is_completed, 'claimed', q.is_claimed,
      'rerollable', not q.is_completed and not q.is_claimed and v_used < v_max,
      'rerollCostSilver', case when v_used < v_free then 0 else v_cost end)
      order by case q.difficulty when 'easy' then 1 when 'medium' then 2 else 3 end), '[]'::jsonb)
    into v_quests
    from public.user_daily_quests_v2 q join public.daily_quest_templates t on t.code = q.template_code
    where q.user_id=v_uid and q.date_key=v_dk;

  select count(*) = 3 and bool_and(is_completed) into v_all
    from public.user_daily_quests_v2 where user_id=v_uid and date_key=v_dk;

  return jsonb_build_object(
    'dateKey', v_dk,
    'resetAt', public.rvn__next_utc_midnight(),
    'quests', v_quests,
    'allCompleted', coalesce(v_all,false),
    'chest', jsonb_build_object(
      'rewards', coalesce(v_cfg->'chest','[]'::jsonb),
      'claimable', coalesce(v_all,false) and not exists (select 1 from public.user_daily_chests where user_id=v_uid and date_key=v_dk),
      'claimed', exists (select 1 from public.user_daily_chests where user_id=v_uid and date_key=v_dk)),
    'reroll', jsonb_build_object(
      'used', v_used, 'max', v_max, 'freeRemaining', greatest(0, v_free - v_used),
      'nextCostSilver', case when v_used >= v_max then null when v_used < v_free then 0 else v_cost end),
    'dailyMax', coalesce(v_cfg->'daily_max','{}'::jsonb),
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'balances', public.rvn__balances(v_uid),
    'serverTime', now()
  );
end $$;

-- ── Claim quest ────────────────────────────────────────────────────────────
create or replace function public.rvn_claim_daily_quest(p_quest_id bigint, p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_rewards jsonb; v_upd int; v_grant jsonb; v_res jsonb; v_prev jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='claim_quest' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;
  perform 1 from public.profiles where id=v_uid for update;

  update public.user_daily_quests_v2 set is_claimed = true, claimed_at = now()
    where id = p_quest_id and user_id = v_uid and is_completed and not is_claimed
    returning rewards into v_rewards;
  get diagnostics v_upd = row_count;
  if v_upd = 0 then return jsonb_build_object('error','not_claimable'); end if;

  v_grant := public.rvn__grant_rewards_v2(v_uid, v_rewards, 'daily_quest', p_quest_id::text);
  v_res := jsonb_build_object(
    'status', case when jsonb_array_length(v_grant->'pendingChoices') > 0 then 'choice_required' else 'completed' end,
    'grantedRewards', v_grant->'granted',
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'snapshot', public.rvn_get_daily_quests_v2());
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'claim_quest', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

-- ── Claim chest ────────────────────────────────────────────────────────────
create or replace function public.rvn_claim_daily_chest_v2(p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_dk date := public.rvn__utc_date(); v_all boolean;
        v_rewards jsonb; v_grant jsonb; v_res jsonb; v_prev jsonb; v_ins int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='claim_chest' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;
  perform 1 from public.profiles where id=v_uid for update;

  select count(*) = 3 and bool_and(is_completed) into v_all
    from public.user_daily_quests_v2 where user_id=v_uid and date_key=v_dk;
  if not coalesce(v_all,false) then return jsonb_build_object('error','not_all_completed'); end if;

  select coalesce(value->'chest','[]'::jsonb) into v_rewards from public.economy_config where key='daily_quests_v2';
  insert into public.user_daily_chests(user_id, date_key, rewards) values (v_uid, v_dk, v_rewards)
    on conflict do nothing;
  get diagnostics v_ins = row_count;
  if v_ins = 0 then return jsonb_build_object('error','already_claimed'); end if;

  v_grant := public.rvn__grant_rewards_v2(v_uid, v_rewards, 'daily_chest', v_dk::text);
  v_res := jsonb_build_object('status','completed', 'grantedRewards', v_grant->'granted',
    'pendingChoices', public.rvn__pending_choices(v_uid), 'snapshot', public.rvn_get_daily_quests_v2());
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'claim_chest', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

-- ── Reroll ──────────────────────────────────────────────────────────────────
create or replace function public.rvn_reroll_daily_quest(
  p_quest_id bigint, p_confirm_progress_loss boolean default false, p_idempotency_key text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_dk date := public.rvn__utc_date(); v_cfg jsonb;
  v_q public.user_daily_quests_v2%rowtype; v_meta public.user_daily_quest_meta%rowtype;
  v_free int; v_max int; v_cost int; v_used int; v_pay int := 0;
  v_groups text[]; v_codes text[]; v_t public.daily_quest_templates; v_factions int[]; v_fac int;
  v_res jsonb; v_prev jsonb; v_silver int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='reroll_quest' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  -- viena transakcija + eilutės užraktas → lygiagrečios užklausos nenuskaito du kartus
  perform 1 from public.profiles where id=v_uid for update;

  select * into v_q from public.user_daily_quests_v2 where id=p_quest_id and user_id=v_uid for update;
  if v_q.id is null then return jsonb_build_object('error','quest_not_found'); end if;
  if v_q.is_completed or v_q.is_claimed then return jsonb_build_object('error','quest_completed'); end if;
  if v_q.progress > 0 and not p_confirm_progress_loss then
    return jsonb_build_object('error','confirmation_required', 'progress', v_q.progress, 'target', v_q.target_value);
  end if;

  select value into v_cfg from public.economy_config where key='daily_quests_v2';
  v_free := coalesce((v_cfg->'reroll'->>'free')::int, 1);
  v_max  := coalesce((v_cfg->'reroll'->>'max_total')::int, 3);
  v_cost := coalesce((v_cfg->'reroll'->>'paid_cost_silver')::int, 100);

  insert into public.user_daily_quest_meta(user_id, date_key) values (v_uid, v_dk) on conflict do nothing;
  select * into v_meta from public.user_daily_quest_meta where user_id=v_uid and date_key=v_dk for update;
  v_used := (case when v_meta.free_reroll_used then 1 else 0 end) + v_meta.paid_reroll_count;
  if v_used >= v_max then return jsonb_build_object('error','reroll_limit_reached','used',v_used,'max',v_max); end if;

  if v_used < v_free then
    update public.user_daily_quest_meta set free_reroll_used = true where user_id=v_uid and date_key=v_dk;
  else
    select gold into v_silver from public.profiles where id=v_uid;
    if v_silver < v_cost then return jsonb_build_object('error','not_enough_silver','cost',v_cost); end if;
    v_pay := v_cost;
  end if;

  -- naujas šablonas: ta pati difficulty, ne toks pat kaip ką tik išmestas ir ne
  -- toks pat kaip kiti šiandienos questai
  select coalesce(array_agg(t.conflict_group), '{}'), coalesce(array_agg(q.template_code), '{}')
    into v_groups, v_codes
    from public.user_daily_quests_v2 q join public.daily_quest_templates t on t.code=q.template_code
    where q.user_id=v_uid and q.date_key=v_dk and q.id <> v_q.id;
  v_codes := v_codes || v_q.template_code || coalesce(v_meta.retired_codes, '{}');

  v_t := public.rvn__pick_quest_template(v_uid, v_q.difficulty, v_groups, v_codes);
  if v_t.code is null then
    -- paskutinė išeitis: bet koks tinkamas tos difficulty šablonas, išskyrus dabartinį
    v_t := public.rvn__pick_quest_template(v_uid, v_q.difficulty, '{}', array[v_q.template_code]);
  end if;
  if v_t.code is null then return jsonb_build_object('error','no_alternative_quest'); end if;

  if v_pay > 0 then
    update public.profiles set gold = gold - v_pay where id=v_uid;
    update public.user_daily_quest_meta set paid_reroll_count = paid_reroll_count + 1
      where user_id=v_uid and date_key=v_dk;
    insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
      values (v_uid, 'daily_quest_reroll', v_q.id::text, 'currency', 'silver', -v_pay);
  end if;

  v_factions := public.rvn__playable_deck_factions(v_uid);
  v_fac := null;
  if v_t.requires_faction and array_length(v_factions,1) > 0 then
    v_fac := v_factions[1 + floor(random() * array_length(v_factions,1))::int];
  end if;

  update public.user_daily_quests_v2
    set template_code = v_t.code, objective_type = v_t.objective_type, target_value = v_t.target_value,
        faction_id = v_fac, progress = 0, is_completed = false, completed_at = null,
        reroll_index = reroll_index + 1,
        rewards = coalesce(v_cfg->'rewards'->v_q.difficulty, v_q.rewards)   -- difficulty ir vertė nesikeičia
    where id = v_q.id;

  update public.user_daily_quest_meta
    set retired_codes = array(select distinct unnest(coalesce(retired_codes,'{}') || v_q.template_code))
    where user_id=v_uid and date_key=v_dk;

  v_res := jsonb_build_object('status','completed','questId', v_q.id, 'paidSilver', v_pay,
    'snapshot', public.rvn_get_daily_quests_v2());
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'reroll_quest', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

grant execute on function public.rvn_get_daily_quests_v2() to authenticated;
grant execute on function public.rvn_claim_daily_quest(bigint, text) to authenticated;
grant execute on function public.rvn_claim_daily_chest_v2(text) to authenticated;
grant execute on function public.rvn_reroll_daily_quest(bigint, boolean, text) to authenticated;
grant execute on function public.rvn_report_match_stats(uuid, jsonb, int) to authenticated;
