-- ════════════════════════════════════════════════════════════════════════════
--  PROGRESSION v2 — DAILY LOGIN (rolling 31 prisijungimo ciklas)
--  ─────────────────────────────────────────────────────────────────────────
--  • Praleista diena progreso NENUTRAUKIA (pozicija juda tik atsiėmus).
--  • 1 claim per UTC parą; 31 diena užbaigia ciklą; naujas ciklas – kitą UTC parą.
--  • Senas kalendorinis `user_monthly_login` NELIEČIAMAS (tik skaitomas backfill'ui).
--  • Atlygių lentelė versijuojama (login_cycle_reward_defs.economy_version) —
--    jau pradėtas ciklas visada naudoja savo versiją.
-- ════════════════════════════════════════════════════════════════════════════

-- ── UTC paros raktas ────────────────────────────────────────────────────────
create or replace function public.rvn__utc_date()
returns date language sql stable as $$ select (now() at time zone 'utc')::date $$;

create or replace function public.rvn__next_utc_midnight()
returns timestamptz language sql stable as $$
  select ((now() at time zone 'utc')::date + 1)::timestamp at time zone 'utc'
$$;

-- ── Atlygių apibrėžimai (versijuoti) ───────────────────────────────────────
create table if not exists public.login_cycle_reward_defs (
  economy_version int  not null,
  day_number      int  not null check (day_number between 1 and 31),
  rewards         jsonb not null,
  is_milestone    boolean not null default false,
  updated_at      timestamptz not null default now(),
  primary key (economy_version, day_number)
);
alter table public.login_cycle_reward_defs enable row level security;
drop policy if exists lcrd_read on public.login_cycle_reward_defs;
create policy lcrd_read on public.login_cycle_reward_defs for select using (true);
drop policy if exists lcrd_admin on public.login_cycle_reward_defs;
create policy lcrd_admin on public.login_cycle_reward_defs for all
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

insert into public.login_cycle_reward_defs(economy_version, day_number, rewards, is_milestone) values
 (2, 1,  '[{"type":"silver","amount":100}]', false),
 (2, 2,  '[{"type":"essence","amount":25}]', false),
 (2, 3,  '[{"type":"silver","amount":150}]', false),
 (2, 4,  '[{"type":"silver","amount":150}]', false),
 (2, 5,  '[{"type":"essence","amount":50}]', false),
 (2, 6,  '[{"type":"silver","amount":200}]', false),
 (2, 7,  '[{"type":"faction_booster_choice","quantity":1}]', true),
 (2, 8,  '[{"type":"silver","amount":200}]', false),
 (2, 9,  '[{"type":"essence","amount":50}]', false),
 (2, 10, '[{"type":"silver","amount":250}]', false),
 (2, 11, '[{"type":"silver","amount":250}]', false),
 (2, 12, '[{"type":"essence","amount":75}]', false),
 (2, 13, '[{"type":"silver","amount":300}]', false),
 (2, 14, '[{"type":"faction_booster_choice","quantity":1},{"type":"silver","amount":100}]', true),
 (2, 15, '[{"type":"silver","amount":300}]', false),
 (2, 16, '[{"type":"essence","amount":75}]', false),
 (2, 17, '[{"type":"silver","amount":350}]', false),
 (2, 18, '[{"type":"essence","amount":100}]', false),
 (2, 19, '[{"type":"silver","amount":400}]', false),
 (2, 20, '[{"type":"silver","amount":500}]', false),
 (2, 21, '[{"type":"card_choice","rarity":"rare"}]', true),
 (2, 22, '[{"type":"silver","amount":450}]', false),
 (2, 23, '[{"type":"essence","amount":100}]', false),
 (2, 24, '[{"type":"silver","amount":500}]', false),
 (2, 25, '[{"type":"essence","amount":125}]', false),
 (2, 26, '[{"type":"silver","amount":600}]', false),
 (2, 27, '[{"type":"silver","amount":750}]', false),
 (2, 28, '[{"type":"faction_booster_choice","quantity":1},{"type":"essence","amount":150}]', true),
 (2, 29, '[{"type":"silver","amount":1000}]', false),
 (2, 30, '[{"type":"rubies","amount":25}]', true),
 (2, 31, '[{"type":"faction_booster_choice","quantity":2},{"type":"essence","amount":200}]', true)
on conflict (economy_version, day_number) do nothing;

-- ── Ciklai ──────────────────────────────────────────────────────────────────
create table if not exists public.user_login_cycles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  cycle_index     int  not null,
  economy_version int  not null,
  position        int  not null default 0 check (position between 0 and 31),
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  unique (user_id, cycle_index)
);
-- vienam vartotojui – tik VIENAS aktyvus ciklas
create unique index if not exists user_login_cycles_active_uniq
  on public.user_login_cycles(user_id) where completed_at is null;
alter table public.user_login_cycles enable row level security;
drop policy if exists ulc_own on public.user_login_cycles;
create policy ulc_own on public.user_login_cycles for select using (user_id = auth.uid());

create table if not exists public.user_login_claims (
  cycle_id   uuid not null references public.user_login_cycles(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day_number int  not null check (day_number between 1 and 31),
  claim_date date not null,
  rewards    jsonb not null default '[]'::jsonb,
  claimed_at timestamptz not null default now(),
  primary key (cycle_id, day_number),
  unique (user_id, claim_date)        -- 1 atlygis per UTC parą
);
alter table public.user_login_claims enable row level security;
drop policy if exists ulcl_own on public.user_login_claims;
create policy ulcl_own on public.user_login_claims for select using (user_id = auth.uid());

-- ── BACKFILL iš seno kalendoriaus (idempotentinis; nieko netrina) ──────────
--  Kiekvienam vartotojui, kuris turi v1 įrašų, sukuriamas 1-as ciklas su
--  paskutinėmis iki 31 atsiimtomis dienomis (data → tos pačios datos claim'as),
--  kad progresas nedingtų ir tą pačią parą nebūtų galima atsiimti du kartus.
do $$
declare u record; v_cid uuid; v_n int; d record; v_day int;
begin
  for u in
    select user_id, count(*) as total from public.user_monthly_login group by user_id
  loop
    if exists (select 1 from public.user_login_cycles where user_id = u.user_id) then continue; end if;
    v_n := least(31, u.total);
    insert into public.user_login_cycles(user_id, cycle_index, economy_version, position, started_at)
      values (u.user_id, 1, 2, v_n, now()) returning id into v_cid;
    v_day := 0;
    for d in
      select date_key, claimed_at from (
        select date_key, claimed_at from public.user_monthly_login
        where user_id = u.user_id order by date_key desc limit v_n
      ) x order by date_key asc
    loop
      v_day := v_day + 1;
      insert into public.user_login_claims(cycle_id, user_id, day_number, claim_date, rewards, claimed_at)
        values (v_cid, u.user_id, v_day, d.date_key::date, '[]'::jsonb, d.claimed_at)
        on conflict do nothing;
    end loop;
    if v_n >= 31 then
      update public.user_login_cycles set completed_at = now() where id = v_cid;
    end if;
  end loop;
end $$;

-- ── Būsena ──────────────────────────────────────────────────────────────────
create or replace function public.rvn_get_login_cycle()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_today date := public.rvn__utc_date();
  v_cyc public.user_login_cycles%rowtype; v_ver int := public.rvn__economy_version();
  v_claimed_today boolean; v_next int; v_blocked boolean := false;
  v_last_completed timestamptz; v_rewards jsonb; v_claims jsonb; v_defver int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;

  -- aktyvus ciklas (jei yra)
  select * into v_cyc from public.user_login_cycles
    where user_id = v_uid and completed_at is null limit 1;

  if v_cyc.id is null then
    select max(completed_at) into v_last_completed from public.user_login_cycles where user_id = v_uid;
    -- 31-a diena atsiimta ŠIANDIEN → naujas ciklas tik kitą UTC parą
    v_blocked := v_last_completed is not null and (v_last_completed at time zone 'utc')::date >= v_today;
    if v_blocked then
      select * into v_cyc from public.user_login_cycles where user_id = v_uid
        order by cycle_index desc limit 1;
    end if;
  end if;

  select exists(select 1 from public.user_login_claims where user_id = v_uid and claim_date = v_today)
    into v_claimed_today;

  v_defver := coalesce(v_cyc.economy_version, v_ver);
  v_next := case
    when v_blocked or v_claimed_today then null
    when v_cyc.id is null then 1
    else least(31, coalesce(v_cyc.position, 0) + 1) end;

  select coalesce(jsonb_agg(jsonb_build_object(
           'day', d.day_number, 'rewards', d.rewards, 'milestone', d.is_milestone,
           'claimed', c.day_number is not null,
           'claimedAt', c.claimed_at) order by d.day_number), '[]'::jsonb)
    into v_rewards
    from public.login_cycle_reward_defs d
    left join public.user_login_claims c
      on c.cycle_id = v_cyc.id and c.day_number = d.day_number
    where d.economy_version = v_defver;

  select coalesce(jsonb_agg(day_number order by day_number), '[]'::jsonb) into v_claims
    from public.user_login_claims where cycle_id = v_cyc.id;

  return jsonb_build_object(
    'cycleId', v_cyc.id,
    'cycleIndex', coalesce(v_cyc.cycle_index, 0),
    'economyVersion', v_defver,
    'cyclePosition', coalesce(v_cyc.position, 0),
    'cycleLength', 31,
    'claimedToday', v_claimed_today,
    'claimableDay', v_next,
    'nextClaimAt', case when v_next is null then public.rvn__next_utc_midnight() else null end,
    'cycleCompleted', v_blocked,
    'claimedDays', v_claims,
    'rewards', v_rewards,
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'balances', public.rvn__balances(v_uid),
    'serverTime', now()
  );
end $$;

-- ── Claim ───────────────────────────────────────────────────────────────────
create or replace function public.rvn_claim_login_reward(p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_today date := public.rvn__utc_date();
  v_cyc public.user_login_cycles%rowtype; v_ver int := public.rvn__economy_version();
  v_day int; v_rewards jsonb; v_grant jsonb; v_res jsonb; v_prev jsonb; v_idx int; v_lastdone timestamptz;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='claim_login' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  -- serializuojam lygiagrečias to paties vartotojo užklausas
  perform 1 from public.profiles where id = v_uid for update;

  if exists (select 1 from public.user_login_claims where user_id=v_uid and claim_date=v_today) then
    return jsonb_build_object('error','already_claimed_today',
      'nextClaimAt', public.rvn__next_utc_midnight());
  end if;

  select * into v_cyc from public.user_login_cycles where user_id=v_uid and completed_at is null limit 1;
  if v_cyc.id is null then
    select max(completed_at) into v_lastdone from public.user_login_cycles where user_id=v_uid;
    if v_lastdone is not null and (v_lastdone at time zone 'utc')::date >= v_today then
      return jsonb_build_object('error','cycle_completed_today',
        'nextClaimAt', public.rvn__next_utc_midnight());
    end if;
    select coalesce(max(cycle_index),0)+1 into v_idx from public.user_login_cycles where user_id=v_uid;
    insert into public.user_login_cycles(user_id, cycle_index, economy_version, position)
      values (v_uid, v_idx, v_ver, 0) returning * into v_cyc;
  end if;

  v_day := v_cyc.position + 1;
  if v_day > 31 then return jsonb_build_object('error','cycle_completed'); end if;

  select rewards into v_rewards from public.login_cycle_reward_defs
    where economy_version = v_cyc.economy_version and day_number = v_day;
  if v_rewards is null then return jsonb_build_object('error','no_reward_definition'); end if;

  insert into public.user_login_claims(cycle_id, user_id, day_number, claim_date, rewards)
    values (v_cyc.id, v_uid, v_day, v_today, v_rewards);

  update public.user_login_cycles
    set position = v_day, completed_at = case when v_day >= 31 then now() else null end
    where id = v_cyc.id;

  v_grant := public.rvn__grant_rewards_v2(v_uid, v_rewards, 'login', v_cyc.id::text || ':day:' || v_day);

  v_res := jsonb_build_object(
    'status', case when jsonb_array_length(v_grant->'pendingChoices') > 0 then 'choice_required' else 'completed' end,
    'claimedDay', v_day,
    'grantedRewards', v_grant->'granted',
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'snapshot', public.rvn_get_login_cycle()
  );

  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'claim_login', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

grant execute on function public.rvn_get_login_cycle() to authenticated;
grant execute on function public.rvn_claim_login_reward(text) to authenticated;
grant execute on function public.rvn__utc_date() to authenticated;
