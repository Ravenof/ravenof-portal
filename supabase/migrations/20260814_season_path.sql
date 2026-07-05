-- ════════════════════════════════════════════════════════════════════════════
--  Ravenof Ekonomika Phase 5 — Sezono kelias (20 lygių, free + pass takai)
--  1000 Season XP / lygis (20k viso). Ketvirčio sezonai (Q1-Q4). XP resetina
--  kiekvieną sezoną (naujas season row + user_season_pass eilutė). Pass unlock:
--  8000 Sidabras arba 950 Rubinai. Vėlyvas unlock -> praeiti pass atlygiai claimable.
--  Free atlygiai visada claimable. Config-driven (economy_config.season_path).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.season_pass_seasons add column if not exists theme text;
alter table public.season_pass_seasons add column if not exists pass_price_silver int not null default 8000;
alter table public.season_pass_seasons add column if not exists pass_price_rubies int not null default 950;
alter table public.season_pass_seasons add column if not exists grace_end_date timestamptz;
alter table public.user_season_pass add column if not exists has_season_pass boolean not null default false;
alter table public.user_season_pass add column if not exists season_pass_activated_at timestamptz;

create table if not exists public.user_season_reward_claims (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  season_id  uuid not null references public.season_pass_seasons(id) on delete cascade,
  level      int  not null,
  track      text not null,   -- free|pass
  claimed_at timestamptz not null default now(),
  primary key (user_id, season_id, level, track)
);
alter table public.user_season_reward_claims enable row level security;
drop policy if exists usrc_own on public.user_season_reward_claims;
create policy usrc_own on public.user_season_reward_claims for select using (user_id = auth.uid());

-- ── 20 lygių free+pass šablonas (admin redaguos) ────────────────────────────
insert into public.economy_config(key, value) values
('season_path', $j$
{
  "xp_per_level": 1000, "levels": 20,
  "rewards": {
    "1":  {"free":[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1}], "pass":[{"type":"item","item_type":"player_avatar","item_id":"rare_player_avatar","quantity":1}]},
    "2":  {"free":[{"type":"currency","currency":"silver","amount":200}], "pass":[{"type":"currency","currency":"silver","amount":300}]},
    "3":  {"free":[{"type":"currency","currency":"essence","amount":100}], "pass":[{"type":"currency","currency":"essence","amount":200}]},
    "4":  {"free":[{"type":"currency","currency":"silver","amount":200}], "pass":[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1}]},
    "5":  {"free":[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1}], "pass":[{"type":"item","item_type":"pack","item_id":"rare_pack","quantity":1}]},
    "6":  {"free":[{"type":"currency","currency":"silver","amount":300}], "pass":[{"type":"currency","currency":"rubies","amount":50}]},
    "7":  {"free":[{"type":"currency","currency":"essence","amount":150}], "pass":[{"type":"currency","currency":"essence","amount":300}]},
    "8":  {"free":[{"type":"item","item_type":"card_back","item_id":"basic_card_back","quantity":1}], "pass":[{"type":"item","item_type":"card_back","item_id":"premium_card_back","quantity":1}]},
    "9":  {"free":[{"type":"currency","currency":"silver","amount":400}], "pass":[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1}]},
    "10": {"free":[{"type":"item","item_type":"pack","item_id":"rare_pack","quantity":1}], "pass":[{"type":"item","item_type":"player_avatar","item_id":"premium_player_avatar","quantity":1}]},
    "11": {"free":[{"type":"currency","currency":"essence","amount":200}], "pass":[{"type":"currency","currency":"silver","amount":500}]},
    "12": {"free":[{"type":"currency","currency":"silver","amount":500}], "pass":[{"type":"currency","currency":"rubies","amount":100}]},
    "13": {"free":[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1}], "pass":[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":2}]},
    "14": {"free":[{"type":"currency","currency":"essence","amount":250}], "pass":[{"type":"currency","currency":"essence","amount":500}]},
    "15": {"free":[{"type":"item","item_type":"card_back","item_id":"rare_card_back","quantity":1}], "pass":[{"type":"item","item_type":"card_back","item_id":"premium_card_back","quantity":1}]},
    "16": {"free":[{"type":"currency","currency":"silver","amount":600}], "pass":[{"type":"currency","currency":"rubies","amount":100}]},
    "17": {"free":[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1}], "pass":[{"type":"item","item_type":"pack","item_id":"rare_pack","quantity":1}]},
    "18": {"free":[{"type":"currency","currency":"essence","amount":300}], "pass":[{"type":"currency","currency":"silver","amount":750}]},
    "19": {"free":[{"type":"currency","currency":"rubies","amount":100}], "pass":[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":2}]},
    "20": {"free":[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":2},{"type":"currency","currency":"essence","amount":500},{"type":"currency","currency":"silver","amount":1000},{"type":"currency","currency":"rubies","amount":100},{"type":"item","item_type":"card_back","item_id":"rare_card_back","quantity":1}],
           "pass":[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":3},{"type":"currency","currency":"essence","amount":1000},{"type":"currency","currency":"silver","amount":1500},{"type":"currency","currency":"rubies","amount":200},{"type":"item","item_type":"card_back","item_id":"legendary_card_back","quantity":1},{"type":"item","item_type":"player_avatar","item_id":"legendary_player_avatar","quantity":1}]}
  }
}
$j$::jsonb)
on conflict (key) do nothing;

-- ── get-or-create einamojo ketvirčio sezonas ────────────────────────────────
create or replace function public.rvn__current_season()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now())::date; v_q int; v_start date; v_end timestamptz; v_sid uuid; v_name text; v_theme text;
begin
  select id into v_sid from public.season_pass_seasons
    where starts_at <= now() and (ends_at is null or ends_at >= now()) order by starts_at desc limit 1;
  if v_sid is not null then return v_sid; end if;
  v_q := ((extract(month from v_today)::int - 1) / 3);   -- 0..3
  v_start := make_date(extract(year from v_today)::int, v_q*3 + 1, 1);
  v_end := (v_start + interval '3 months' - interval '1 second');
  v_theme := (array['Žiemos','Pavasario','Vasaros','Rudens'])[v_q + 1];
  v_name := v_theme || ' sezonas ' || extract(year from v_today)::int;
  insert into public.season_pass_seasons(title, theme, starts_at, ends_at, grace_end_date, is_active)
    values (v_name, v_theme, v_start, v_end, v_end + interval '7 days', true) returning id into v_sid;
  update public.season_pass_seasons set is_active = false where id <> v_sid;
  return v_sid;
end $$;

-- ── season XP visada landina į einamąjį sezoną ──────────────────────────────
create or replace function public.rvn__add_pass_xp(p_user uuid, p_xp int)
returns void language plpgsql security definer set search_path = public as $$
declare v_sid uuid;
begin
  if coalesce(p_xp,0) <= 0 then return; end if;
  v_sid := public.rvn__current_season();
  if v_sid is null then return; end if;
  insert into public.user_season_pass(user_id, season_id, xp) values (p_user, v_sid, p_xp)
    on conflict (user_id, season_id) do update set xp = public.user_season_pass.xp + p_xp;
end $$;

-- ── būsena ──────────────────────────────────────────────────────────────────
create or replace function public.rvn_get_season_path()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_sid uuid; v_cfg jsonb; v_xp int; v_haspass boolean;
  v_per int; v_lvls int; v_level int; L int; v_claims jsonb; v_rows jsonb := '[]'::jsonb;
  v_s record; v_lr jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  v_sid := public.rvn__current_season();
  select value into v_cfg from public.economy_config where key='season_path';
  v_per := coalesce((v_cfg->>'xp_per_level')::int,1000); v_lvls := coalesce((v_cfg->>'levels')::int,20);
  select coalesce(xp,0), coalesce(has_season_pass,false) into v_xp, v_haspass from public.user_season_pass where user_id=v_uid and season_id=v_sid;
  v_xp := coalesce(v_xp,0); v_haspass := coalesce(v_haspass,false);
  v_level := least(v_lvls, v_xp / v_per);
  select coalesce(jsonb_object_agg(track || ':' || level, true),'{}'::jsonb) into v_claims
    from public.user_season_reward_claims where user_id=v_uid and season_id=v_sid;
  select * into v_s from public.season_pass_seasons where id=v_sid;
  for L in 1..v_lvls loop
    v_lr := v_cfg->'rewards'->(L::text);
    v_rows := v_rows || jsonb_build_object(
      'level', L, 'xpRequired', L*v_per, 'reached', v_xp >= L*v_per,
      'free', jsonb_build_object('payload', coalesce(v_lr->'free','[]'::jsonb), 'claimed', coalesce(v_claims->>('free:'||L),'')='true'),
      'pass', jsonb_build_object('payload', coalesce(v_lr->'pass','[]'::jsonb), 'claimed', coalesce(v_claims->>('pass:'||L),'')='true')
    );
  end loop;
  return jsonb_build_object(
    'season', jsonb_build_object('id',v_sid,'title',v_s.title,'theme',v_s.theme,'endsAt',v_s.ends_at),
    'xp', v_xp, 'level', v_level, 'levels', v_lvls, 'xpPerLevel', v_per, 'hasPass', v_haspass,
    'priceSilver', v_s.pass_price_silver, 'priceRubies', v_s.pass_price_rubies,
    'rows', v_rows
  );
end $$;

-- ── claim reward (free arba pass) ───────────────────────────────────────────
create or replace function public.rvn_claim_season_reward(p_level int, p_track text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_sid uuid; v_cfg jsonb; v_xp int; v_haspass boolean; v_per int; v_pay jsonb; v_ins int;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  if p_track not in ('free','pass') then return jsonb_build_object('error','bad_track'); end if;
  v_sid := public.rvn__current_season();
  select value into v_cfg from public.economy_config where key='season_path';
  v_per := coalesce((v_cfg->>'xp_per_level')::int,1000);
  select coalesce(xp,0), coalesce(has_season_pass,false) into v_xp, v_haspass from public.user_season_pass where user_id=v_uid and season_id=v_sid;
  v_xp := coalesce(v_xp,0); v_haspass := coalesce(v_haspass,false);
  if v_xp < p_level * v_per then return jsonb_build_object('error','level_not_reached'); end if;
  if p_track='pass' and not v_haspass then return jsonb_build_object('error','no_pass'); end if;
  v_pay := v_cfg->'rewards'->(p_level::text)->p_track;
  if v_pay is null or jsonb_array_length(v_pay) = 0 then return jsonb_build_object('error','no_reward'); end if;

  insert into public.user_season_reward_claims(user_id, season_id, level, track)
    values (v_uid, v_sid, p_level, p_track) on conflict do nothing;
  get diagnostics v_ins = row_count;
  if v_ins = 0 then return jsonb_build_object('error','already'); end if;

  perform public.rvn__grant_reward_payload(v_uid, v_pay, 'season', v_sid::text || ':' || p_level || ':' || p_track);
  return jsonb_build_object('ok',true,'payload',v_pay,
    'balances',(select jsonb_build_object('silver',gold,'rubies',rubies,'essence',essence) from public.profiles where id=v_uid));
end $$;

-- ── unlock pass (Sidabras arba Rubinai) ─────────────────────────────────────
create or replace function public.rvn_unlock_season_pass(p_currency text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_sid uuid; v_s record; v_bal int; v_cost int;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  v_sid := public.rvn__current_season();
  select * into v_s from public.season_pass_seasons where id=v_sid;
  insert into public.user_season_pass(user_id, season_id, xp) values (v_uid, v_sid, 0) on conflict do nothing;
  if (select has_season_pass from public.user_season_pass where user_id=v_uid and season_id=v_sid) then
    return jsonb_build_object('error','already_owned');
  end if;
  if p_currency='silver' then
    v_cost := v_s.pass_price_silver; select gold into v_bal from public.profiles where id=v_uid;
    if v_bal < v_cost then return jsonb_build_object('error','not_enough'); end if;
    update public.profiles set gold = gold - v_cost where id=v_uid;
  elsif p_currency='rubies' then
    v_cost := v_s.pass_price_rubies; select rubies into v_bal from public.profiles where id=v_uid;
    if v_bal < v_cost then return jsonb_build_object('error','not_enough'); end if;
    update public.profiles set rubies = rubies - v_cost where id=v_uid;
  else
    return jsonb_build_object('error','bad_currency');
  end if;
  update public.user_season_pass set has_season_pass=true, season_pass_activated_at=now() where user_id=v_uid and season_id=v_sid;
  insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
    values (v_uid, 'season_pass_unlock', v_sid::text, 'currency', p_currency, -v_cost);
  return jsonb_build_object('ok',true,
    'balances',(select jsonb_build_object('silver',gold,'rubies',rubies,'essence',essence) from public.profiles where id=v_uid));
end $$;

grant execute on function public.rvn_get_season_path() to authenticated;
grant execute on function public.rvn_claim_season_reward(int, text) to authenticated;
grant execute on function public.rvn_unlock_season_pass(text) to authenticated;
