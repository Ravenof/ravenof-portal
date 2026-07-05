-- ════════════════════════════════════════════════════════════════════════════
--  Ravenof Ekonomika Phase 3 — Mėnesio prisijungimo kalendorius (30 dienų)
--  NE baudžianti serija: praleidus dieną neresetina; atsiimi kitą neatsiimtą.
--  1 claim per kalendorinę dieną. Reset mėnesio 1 d. 31-a diena = 100 Sidabras bonusas.
--  Config-driven (monthly_login_rewards, admin redaguos). Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

-- ── šablonas: 1 payload per day_number (reused kas mėnesį) ───────────────────
create table if not exists public.monthly_login_rewards (
  day_number     int primary key,
  reward_payload jsonb not null,
  is_active      boolean not null default true,
  updated_at     timestamptz not null default now()
);
alter table public.monthly_login_rewards enable row level security;
drop policy if exists mlr_read on public.monthly_login_rewards;
create policy mlr_read on public.monthly_login_rewards for select using (true);
drop policy if exists mlr_admin on public.monthly_login_rewards;
create policy mlr_admin on public.monthly_login_rewards for all
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

-- ── vartotojo atsiimtos dienos ──────────────────────────────────────────────
create table if not exists public.user_monthly_login (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  month_key  text not null,     -- YYYY-MM
  day_number int  not null,
  date_key   text not null,     -- YYYY-MM-DD
  claimed_at timestamptz not null default now(),
  unique (user_id, date_key),                 -- 1 claim / kalendorinę dieną
  unique (user_id, month_key, day_number)      -- 1 claim / dienos langelį
);
alter table public.user_monthly_login enable row level security;
drop policy if exists uml_own on public.user_monthly_login;
create policy uml_own on public.user_monthly_login for select using (user_id = auth.uid());

-- ── seed: 30 dienų (+ 31-a bonusas) pagal spec ──────────────────────────────
insert into public.monthly_login_rewards(day_number, reward_payload) values
(1,  '[{"type":"currency","currency":"silver","amount":100}]'),
(2,  '[{"type":"currency","currency":"essence","amount":25}]'),
(3,  '[{"type":"season_xp","amount":100}]'),
(4,  '[{"type":"currency","currency":"silver","amount":150}]'),
(5,  '[{"type":"currency","currency":"essence","amount":50}]'),
(6,  '[{"type":"season_xp","amount":150}]'),
(7,  '[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1}]'),
(8,  '[{"type":"currency","currency":"silver","amount":150}]'),
(9,  '[{"type":"currency","currency":"essence","amount":50}]'),
(10, '[{"type":"currency","currency":"rubies","amount":25}]'),
(11, '[{"type":"season_xp","amount":200}]'),
(12, '[{"type":"currency","currency":"silver","amount":200}]'),
(13, '[{"type":"currency","currency":"essence","amount":75}]'),
(14, '[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1},{"type":"currency","currency":"essence","amount":100}]'),
(15, '[{"type":"currency","currency":"silver","amount":250}]'),
(16, '[{"type":"season_xp","amount":200}]'),
(17, '[{"type":"currency","currency":"essence","amount":75}]'),
(18, '[{"type":"currency","currency":"silver","amount":250}]'),
(19, '[{"type":"currency","currency":"rubies","amount":25}]'),
(20, '[{"type":"season_xp","amount":300}]'),
(21, '[{"type":"item","item_type":"pack","item_id":"rare_pack","quantity":1}]'),
(22, '[{"type":"currency","currency":"silver","amount":300}]'),
(23, '[{"type":"currency","currency":"essence","amount":100}]'),
(24, '[{"type":"season_xp","amount":300}]'),
(25, '[{"type":"currency","currency":"silver","amount":350}]'),
(26, '[{"type":"currency","currency":"essence","amount":100}]'),
(27, '[{"type":"currency","currency":"rubies","amount":50}]'),
(28, '[{"type":"season_xp","amount":400}]'),
(29, '[{"type":"currency","currency":"silver","amount":500}]'),
(30, '[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1},{"type":"currency","currency":"silver","amount":500},{"type":"currency","currency":"essence","amount":200},{"type":"currency","currency":"rubies","amount":75}]'),
(31, '[{"type":"currency","currency":"silver","amount":100}]')
on conflict (day_number) do nothing;

-- ── būsena ──────────────────────────────────────────────────────────────────
create or replace function public.rvn_get_monthly_login()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now())::date;
  v_mk text := to_char(v_today,'YYYY-MM');
  v_dk text := to_char(v_today,'YYYY-MM-DD');
  v_dim int := extract(day from (date_trunc('month', v_today) + interval '1 month - 1 day'))::int;
  v_claimed int[]; v_today_claimed boolean; v_rewards jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  select coalesce(array_agg(day_number order by day_number), '{}') into v_claimed
    from public.user_monthly_login where user_id=v_uid and month_key=v_mk;
  select exists(select 1 from public.user_monthly_login where user_id=v_uid and date_key=v_dk) into v_today_claimed;
  select jsonb_agg(jsonb_build_object('day', day_number, 'payload', reward_payload,
           'milestone', day_number in (7,14,21,30)) order by day_number)
    into v_rewards from public.monthly_login_rewards
    where is_active and day_number <= greatest(30, v_dim);
  return jsonb_build_object(
    'monthKey', v_mk, 'month', extract(month from v_today)::int, 'year', extract(year from v_today)::int,
    'daysInMonth', v_dim, 'claimedDays', to_jsonb(v_claimed), 'claimedToday', v_today_claimed,
    'nextDay', coalesce(array_length(v_claimed,1),0) + 1, 'rewards', coalesce(v_rewards,'[]'::jsonb)
  );
end $$;

-- ── claim (idempotentiška; 1/diena; sekantis neatsiimtas) ───────────────────
create or replace function public.rvn_claim_monthly_login()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now())::date;
  v_mk text := to_char(v_today,'YYYY-MM');
  v_dk text := to_char(v_today,'YYYY-MM-DD');
  v_dim int := extract(day from (date_trunc('month', v_today) + interval '1 month - 1 day'))::int;
  v_cnt int; v_day int; v_pay jsonb; v_ins int;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  if exists(select 1 from public.user_monthly_login where user_id=v_uid and date_key=v_dk) then
    return jsonb_build_object('error','already_today');
  end if;
  select count(*) into v_cnt from public.user_monthly_login where user_id=v_uid and month_key=v_mk;
  v_day := v_cnt + 1;
  if v_day > v_dim then return jsonb_build_object('error','month_complete'); end if;
  select reward_payload into v_pay from public.monthly_login_rewards where day_number=v_day and is_active;
  if v_pay is null then return jsonb_build_object('error','no_reward'); end if;

  insert into public.user_monthly_login(user_id, month_key, day_number, date_key)
    values (v_uid, v_mk, v_day, v_dk) on conflict do nothing;
  get diagnostics v_ins = row_count;
  if v_ins = 0 then return jsonb_build_object('error','already_today'); end if;

  perform public.rvn__grant_reward_payload(v_uid, v_pay, 'login', v_mk || '-' || v_day);

  return jsonb_build_object('claimedDay', v_day, 'payload', v_pay,
    'balances', (select jsonb_build_object('silver',gold,'rubies',rubies,'essence',essence) from public.profiles where id=v_uid));
end $$;

grant execute on function public.rvn_get_monthly_login() to authenticated;
grant execute on function public.rvn_claim_monthly_login() to authenticated;
