-- ── Ravenof Digital: dienos užduotys + prisijungimo serija + sezono kelias ────
-- Naudoja esamą rvn__grant_payload (exp/gold/boosters/cardMin) iš ranked migracijos.

-- ════════════════════════════════ 1) DIENOS UŽDUOTYS ════════════════════════
create table if not exists public.daily_quest_defs (
  quest_key      text primary key,
  title          text not null,
  description    text not null,
  event_type     text not null,            -- 'win' | 'pve_win' | 'pvp_win' | 'open_pack' | 'play_match'
  target         int  not null default 1,
  reward_payload jsonb not null default '{}'::jsonb,  -- {gold,exp,boosters,cardMin,passXp}
  weight         int  not null default 10,
  is_active      boolean not null default true
);
alter table public.daily_quest_defs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='daily_quest_defs' and policyname='dq_defs_read') then
    create policy "dq_defs_read" on public.daily_quest_defs for select using (true);
  end if;
end $$;

create table if not exists public.user_daily_quests (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  quest_date     date not null,
  quest_key      text not null references public.daily_quest_defs(quest_key) on delete cascade,
  title          text not null,
  description    text not null,
  event_type     text not null,
  progress       int  not null default 0,
  target         int  not null default 1,
  reward_payload jsonb not null default '{}'::jsonb,
  claimed        boolean not null default false,
  primary key (user_id, quest_date, quest_key)
);
alter table public.user_daily_quests enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_daily_quests' and policyname='udq_own_read') then
    create policy "udq_own_read" on public.user_daily_quests for select using (user_id = auth.uid());
  end if;
end $$;

-- ════════════════════════════════ 2) PRISIJUNGIMO SERIJA ════════════════════
create table if not exists public.user_login_streak (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  current_streak int  not null default 0,
  longest_streak int  not null default 0,
  last_checkin   date,
  total_checkins int  not null default 0
);
alter table public.user_login_streak enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_login_streak' and policyname='uls_own_read') then
    create policy "uls_own_read" on public.user_login_streak for select using (user_id = auth.uid());
  end if;
end $$;

-- ════════════════════════════════ 3) SEZONO KELIAS ══════════════════════════
create table if not exists public.season_pass_seasons (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,
  is_active  boolean not null default true
);
alter table public.season_pass_seasons enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='season_pass_seasons' and policyname='sps_read') then
    create policy "sps_read" on public.season_pass_seasons for select using (true);
  end if;
end $$;

create table if not exists public.season_pass_tiers (
  season_id      uuid not null references public.season_pass_seasons(id) on delete cascade,
  tier           int  not null,
  xp_required    int  not null,
  title          text not null,
  reward_payload jsonb not null default '{}'::jsonb,
  primary key (season_id, tier)
);
alter table public.season_pass_tiers enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='season_pass_tiers' and policyname='spt_read') then
    create policy "spt_read" on public.season_pass_tiers for select using (true);
  end if;
end $$;

create table if not exists public.user_season_pass (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  season_id     uuid not null references public.season_pass_seasons(id) on delete cascade,
  xp            int  not null default 0,
  claimed_tiers int[] not null default '{}',
  primary key (user_id, season_id)
);
alter table public.user_season_pass enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_season_pass' and policyname='usp_own_read') then
    create policy "usp_own_read" on public.user_season_pass for select using (user_id = auth.uid());
  end if;
end $$;

-- ════════════════════════════════ RPC ═══════════════════════════════════════

-- Vidinis: prideda sezono kelio XP aktyviam sezonui
create or replace function public.rvn__add_pass_xp(p_user uuid, p_xp int)
returns void language plpgsql security definer set search_path = public as $$
declare v_sid uuid;
begin
  if coalesce(p_xp,0) <= 0 then return; end if;
  select id into v_sid from public.season_pass_seasons where is_active order by starts_at desc limit 1;
  if v_sid is null then return; end if;
  insert into public.user_season_pass (user_id, season_id, xp)
    values (p_user, v_sid, p_xp)
    on conflict (user_id, season_id) do update set xp = public.user_season_pass.xp + p_xp;
end $$;

-- Užtikrina ir grąžina šiandienos užduotis (3 deterministiškai-atsitiktinės/dieną)
create or replace function public.rvn_get_daily_quests()
returns setof public.user_daily_quests language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_today date := current_date; v_cnt int; r record; v_seed float8;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select count(*) into v_cnt from public.user_daily_quests where user_id = v_uid and quest_date = v_today;
  if v_cnt = 0 then
    v_seed := (('x'||substr(md5(v_uid::text || v_today::text),1,8))::bit(32)::bigint % 1000000) / 1000000.0;
    perform setseed(v_seed);
    for r in select * from public.daily_quest_defs where is_active order by random() limit 3 loop
      insert into public.user_daily_quests (user_id, quest_date, quest_key, title, description, event_type, progress, target, reward_payload, claimed)
        values (v_uid, v_today, r.quest_key, r.title, r.description, r.event_type, 0, r.target, r.reward_payload, false)
        on conflict do nothing;
    end loop;
  end if;
  return query select * from public.user_daily_quests where user_id = v_uid and quest_date = v_today order by quest_key;
end $$;

-- Įvykis iš kliento: didina atitinkamų užduočių progresą + sezono XP už pergales
create or replace function public.rvn_quest_event(p_event text, p_amount int default 1)
returns setof public.user_daily_quests language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_today date := current_date; v_amt int := greatest(coalesce(p_amount,1),1);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  perform public.rvn_get_daily_quests();
  update public.user_daily_quests
    set progress = least(target, progress + v_amt)
    where user_id = v_uid and quest_date = v_today and not claimed
      and (event_type = p_event or (event_type = 'win' and p_event in ('pve_win','pvp_win')));
  if p_event in ('pve_win','pvp_win') then
    perform public.rvn__add_pass_xp(v_uid, case when p_event='pvp_win' then 30 else 15 end);
  end if;
  return query select * from public.user_daily_quests where user_id = v_uid and quest_date = v_today order by quest_key;
end $$;

-- Atsiimti užduoties atlygį
create or replace function public.rvn_claim_quest(p_quest_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_today date := current_date; v_q public.user_daily_quests; v_passxp int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_q from public.user_daily_quests where user_id=v_uid and quest_date=v_today and quest_key=p_quest_key;
  if v_q.quest_key is null then raise exception 'quest not found'; end if;
  if v_q.claimed then raise exception 'already claimed'; end if;
  if v_q.progress < v_q.target then raise exception 'not complete'; end if;
  update public.user_daily_quests set claimed=true where user_id=v_uid and quest_date=v_today and quest_key=p_quest_key;
  perform public.rvn__grant_payload(v_uid, v_q.reward_payload, 'daily_quest');
  v_passxp := coalesce((v_q.reward_payload->>'passXp')::int, 0);
  if v_passxp > 0 then perform public.rvn__add_pass_xp(v_uid, v_passxp); end if;
  return jsonb_build_object('ok', true, 'reward', v_q.reward_payload);
end $$;

-- Dienos prisijungimo „check-in" (idempotentiška per dieną)
create or replace function public.rvn_login_checkin()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_today date := current_date; v_row public.user_login_streak;
        v_new_streak int; v_reward int; v_already boolean := false; v_bonus boolean := false;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_row from public.user_login_streak where user_id = v_uid;
  if v_row.user_id is null then
    insert into public.user_login_streak (user_id, current_streak, longest_streak, last_checkin, total_checkins)
      values (v_uid, 1, 1, v_today, 1) returning * into v_row;
    v_new_streak := 1;
  elsif v_row.last_checkin = v_today then
    v_already := true; v_new_streak := v_row.current_streak;
  else
    if v_row.last_checkin = v_today - 1 then v_new_streak := v_row.current_streak + 1; else v_new_streak := 1; end if;
    update public.user_login_streak set
      current_streak = v_new_streak,
      longest_streak = greatest(longest_streak, v_new_streak),
      last_checkin = v_today,
      total_checkins = total_checkins + 1
    where user_id = v_uid returning * into v_row;
  end if;
  v_reward := 0;
  if not v_already then
    v_reward := least(50 + (v_new_streak-1)*25, 300);
    update public.profiles set gold = gold + v_reward where id = v_uid;
    if v_new_streak % 7 = 0 then
      perform public.rvn__grant_payload(v_uid, '{"boosters":1}'::jsonb, 'login_streak');
      v_bonus := true;
    end if;
  end if;
  return jsonb_build_object('streak', v_new_streak, 'longest', v_row.longest_streak,
    'reward', v_reward, 'already', v_already, 'bonusBooster', v_bonus);
end $$;

-- Sezono kelio būsena
create or replace function public.rvn_get_season_pass()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_sid uuid; v_season public.season_pass_seasons; v_up public.user_season_pass; v_tiers jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_season from public.season_pass_seasons where is_active order by starts_at desc limit 1;
  if v_season.id is null then return jsonb_build_object('season', null); end if;
  v_sid := v_season.id;
  select * into v_up from public.user_season_pass where user_id=v_uid and season_id=v_sid;
  if v_up.user_id is null then
    insert into public.user_season_pass (user_id, season_id) values (v_uid, v_sid) on conflict do nothing;
    select * into v_up from public.user_season_pass where user_id=v_uid and season_id=v_sid;
  end if;
  select jsonb_agg(jsonb_build_object('tier',tier,'xpRequired',xp_required,'title',title,'reward',reward_payload) order by tier)
    into v_tiers from public.season_pass_tiers where season_id=v_sid;
  return jsonb_build_object(
    'season', jsonb_build_object('id',v_season.id,'title',v_season.title,'endsAt',v_season.ends_at),
    'xp', v_up.xp, 'claimedTiers', to_jsonb(v_up.claimed_tiers), 'tiers', coalesce(v_tiers,'[]'::jsonb));
end $$;

-- Atsiimti sezono kelio pakopą
create or replace function public.rvn_claim_pass_tier(p_tier int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_sid uuid; v_xpreq int; v_payload jsonb; v_up public.user_season_pass;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select id into v_sid from public.season_pass_seasons where is_active order by starts_at desc limit 1;
  if v_sid is null then raise exception 'no active season'; end if;
  select xp_required, reward_payload into v_xpreq, v_payload from public.season_pass_tiers where season_id=v_sid and tier=p_tier;
  if v_xpreq is null then raise exception 'tier not found'; end if;
  select * into v_up from public.user_season_pass where user_id=v_uid and season_id=v_sid;
  if v_up.user_id is null then raise exception 'no pass'; end if;
  if v_up.xp < v_xpreq then raise exception 'tier locked'; end if;
  if p_tier = any(v_up.claimed_tiers) then raise exception 'already claimed'; end if;
  update public.user_season_pass set claimed_tiers = array_append(claimed_tiers, p_tier) where user_id=v_uid and season_id=v_sid;
  perform public.rvn__grant_payload(v_uid, v_payload, 'season_pass');
  return jsonb_build_object('ok', true, 'reward', v_payload);
end $$;

grant execute on function public.rvn_get_daily_quests()        to authenticated;
grant execute on function public.rvn_quest_event(text,int)     to authenticated;
grant execute on function public.rvn_claim_quest(text)         to authenticated;
grant execute on function public.rvn_login_checkin()           to authenticated;
grant execute on function public.rvn_get_season_pass()         to authenticated;
grant execute on function public.rvn_claim_pass_tier(int)      to authenticated;

-- ════════════════════════════════ SEED ══════════════════════════════════════
insert into public.daily_quest_defs (quest_key, title, description, event_type, target, reward_payload, weight) values
  ('win1',       'Pirmoji pergalė',  'Laimėk 1 kovą',             'win',        1, '{"gold":60,"passXp":20}',               10),
  ('win3',       'Pergalių serija',  'Laimėk 3 kovas',            'win',        3, '{"gold":150,"passXp":50}',              10),
  ('win5',       'Nenugalimas',      'Laimėk 5 kovas',            'win',        5, '{"gold":300,"passXp":90,"boosters":1}', 6),
  ('pvp_win2',   'Arenos kovotojas', 'Laimėk 2 PvP kovas',        'pvp_win',    2, '{"gold":200,"passXp":60}',              8),
  ('pve_win3',   'Botų valytojas',   'Laimėk 3 kovas prieš AI',   'pve_win',    3, '{"gold":120,"passXp":40}',              9),
  ('play3',      'Apšilimas',        'Sužaisk 3 kovas',           'play_match', 3, '{"gold":80,"passXp":25}',               10),
  ('play5',      'Ištvermė',         'Sužaisk 5 kovas',           'play_match', 5, '{"gold":120,"passXp":40}',              10),
  ('open_pack1', 'Kolekcionierius',  'Atplėšk 1 pakuotę',         'open_pack',  1, '{"gold":100,"passXp":30}',              7)
on conflict (quest_key) do update set
  title=excluded.title, description=excluded.description, event_type=excluded.event_type,
  target=excluded.target, reward_payload=excluded.reward_payload, weight=excluded.weight;

insert into public.season_pass_seasons (title, is_active)
select 'Pirmasis sezonas', true
where not exists (select 1 from public.season_pass_seasons where is_active);

do $$
declare v_sid uuid;
begin
  select id into v_sid from public.season_pass_seasons where is_active order by starts_at desc limit 1;
  if v_sid is not null then
    insert into public.season_pass_tiers (season_id, tier, xp_required, title, reward_payload) values
      (v_sid, 1,  100,  'Pakopa 1',  '{"gold":100}'),
      (v_sid, 2,  250,  'Pakopa 2',  '{"gold":150}'),
      (v_sid, 3,  450,  'Pakopa 3',  '{"boosters":1}'),
      (v_sid, 4,  700,  'Pakopa 4',  '{"gold":250}'),
      (v_sid, 5,  1000, 'Pakopa 5',  '{"cardMin":"unique"}'),
      (v_sid, 6,  1400, 'Pakopa 6',  '{"gold":350}'),
      (v_sid, 7,  1900, 'Pakopa 7',  '{"boosters":2}'),
      (v_sid, 8,  2500, 'Pakopa 8',  '{"gold":500}'),
      (v_sid, 9,  3200, 'Pakopa 9',  '{"cardMin":"epic"}'),
      (v_sid, 10, 4000, 'Pakopa 10', '{"gold":800,"boosters":2,"cardMin":"legendary"}')
    on conflict (season_id, tier) do update set
      xp_required=excluded.xp_required, title=excluded.title, reward_payload=excluded.reward_payload;
  end if;
end $$;
