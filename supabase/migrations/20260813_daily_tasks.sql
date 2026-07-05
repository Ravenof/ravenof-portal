-- ════════════════════════════════════════════════════════════════════════════
--  Ravenof Ekonomika Phase 4 — Dienos užduotys (3/dieną: easy/medium/hard)
--  Reset 05:00 (date_key = (now()-5h)::date). Progresas per DB trigerį ant matches
--  (tik valid kovos). Reroll (1 free + mokamas 50 Sidabras, max 3). Daily chest.
--  Config-driven (daily_task_templates, admin redaguos). Idempotentiškas claim.
-- ════════════════════════════════════════════════════════════════════════════

-- ── šablonai ────────────────────────────────────────────────────────────────
create table if not exists public.daily_task_templates (
  id             bigserial primary key,
  difficulty     text not null,            -- easy|medium|hard
  title          text not null,
  description    text not null,
  objective_type text not null,            -- play_match|win_match|win_bot|win_unranked|win_ranked|play_ranked
  target_value   int  not null default 1,
  mode_restriction    text,                -- null|bot|unranked|ranked
  faction_restriction int,
  reward_payload jsonb not null default '[]'::jsonb,
  weight         int  not null default 10,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.daily_task_templates enable row level security;
drop policy if exists dtt_read on public.daily_task_templates;
create policy dtt_read on public.daily_task_templates for select using (true);
drop policy if exists dtt_admin on public.daily_task_templates;
create policy dtt_admin on public.daily_task_templates for all
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

-- ── vartotojo dienos užduotys ───────────────────────────────────────────────
create table if not exists public.user_daily_tasks (
  id             bigserial primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  template_id    bigint not null references public.daily_task_templates(id),
  date_key       text not null,
  difficulty     text not null,
  objective_type text not null,
  title          text not null,
  description    text not null,
  progress       int  not null default 0,
  target_value   int  not null default 1,
  reward_payload jsonb not null default '[]'::jsonb,
  is_completed   boolean not null default false,
  is_claimed     boolean not null default false,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz,
  claimed_at     timestamptz,
  unique (user_id, date_key, difficulty)
);
alter table public.user_daily_tasks enable row level security;
drop policy if exists udt_own on public.user_daily_tasks;
create policy udt_own on public.user_daily_tasks for select using (user_id = auth.uid());

create table if not exists public.user_daily_completion (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  date_key   text not null,
  is_claimed boolean not null default false,
  claimed_at timestamptz,
  primary key (user_id, date_key)
);
alter table public.user_daily_completion enable row level security;
drop policy if exists udc_own on public.user_daily_completion;
create policy udc_own on public.user_daily_completion for select using (user_id = auth.uid());

create table if not exists public.user_daily_rerolls (
  user_id          uuid not null references public.profiles(id) on delete cascade,
  date_key         text not null,
  free_reroll_used boolean not null default false,
  paid_reroll_count int not null default 0,
  primary key (user_id, date_key)
);
alter table public.user_daily_rerolls enable row level security;
drop policy if exists udr_own on public.user_daily_rerolls;
create policy udr_own on public.user_daily_rerolls for select using (user_id = auth.uid());

-- ── config: chest + reroll ──────────────────────────────────────────────────
insert into public.economy_config(key, value) values
('daily_chest', '[{"type":"season_xp","amount":250},{"type":"currency","currency":"silver","amount":200},{"type":"currency","currency":"essence","amount":100},{"type":"currency","currency":"rubies","amount":15}]'::jsonb),
('daily_chest_pack_chance', '{"chance":0.10,"item_id":"standard_pack"}'::jsonb),
('daily_reroll', '{"free":1,"max":3,"cost_silver":50}'::jsonb)
on conflict (key) do nothing;

-- ── seed šablonai ───────────────────────────────────────────────────────────
insert into public.daily_task_templates(difficulty, title, description, objective_type, target_value, mode_restriction, reward_payload, weight) values
('easy','Sužaisk kovą','Sužaisk 1 kovą','play_match',1,null,'[{"type":"currency","currency":"silver","amount":50},{"type":"season_xp","amount":50},{"type":"account_xp","amount":15}]',10),
('easy','Boto pergalė','Laimėk 1 kovą su botu','win_bot',1,'bot','[{"type":"currency","currency":"silver","amount":50},{"type":"season_xp","amount":50},{"type":"account_xp","amount":15}]',10),
('easy','Du žingsniai','Sužaisk 2 kovas','play_match',2,null,'[{"type":"currency","currency":"silver","amount":50},{"type":"season_xp","amount":50},{"type":"account_xp","amount":15}]',8),
('medium','Dvi pergalės','Laimėk 2 kovas','win_match',2,null,'[{"type":"currency","currency":"silver","amount":100},{"type":"season_xp","amount":100},{"type":"account_xp","amount":30},{"type":"currency","currency":"essence","amount":25}]',10),
('medium','Trys kovos','Sužaisk 3 kovas','play_match',3,null,'[{"type":"currency","currency":"silver","amount":100},{"type":"season_xp","amount":100},{"type":"account_xp","amount":30},{"type":"currency","currency":"essence","amount":25}]',10),
('medium','Nereitinguota pergalė','Laimėk 1 nereitinguotą kovą','win_unranked',1,'unranked','[{"type":"currency","currency":"silver","amount":100},{"type":"season_xp","amount":100},{"type":"account_xp","amount":30},{"type":"currency","currency":"essence","amount":25}]',7),
('hard','Trys pergalės','Laimėk 3 kovas','win_match',3,null,'[{"type":"currency","currency":"silver","amount":150},{"type":"season_xp","amount":150},{"type":"account_xp","amount":50},{"type":"currency","currency":"essence","amount":50}]',10),
('hard','Reitinguota pergalė','Laimėk 1 reitinguotą kovą','win_ranked',1,'ranked','[{"type":"currency","currency":"silver","amount":150},{"type":"season_xp","amount":150},{"type":"account_xp","amount":50},{"type":"currency","currency":"essence","amount":50}]',8),
('hard','Penkios kovos','Sužaisk 5 kovas','play_match',5,null,'[{"type":"currency","currency":"silver","amount":150},{"type":"season_xp","amount":150},{"type":"account_xp","amount":50},{"type":"currency","currency":"essence","amount":50}]',8)
on conflict do nothing;

-- ── helper: dienos raktas (05:00 riba) ──────────────────────────────────────
create or replace function public.rvn__daily_key()
returns text language sql stable as $$ select to_char((now() - interval '5 hours')::date, 'YYYY-MM-DD') $$;

-- ── trigeris: valid kova -> daily task progresas ────────────────────────────
create or replace function public.rvn__daily_task_from_match()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_dk text := public.rvn__daily_key();
begin
  if not NEW.valid_for_rewards then return NEW; end if;
  update public.user_daily_tasks t
    set progress = least(t.target_value, t.progress + 1),
        is_completed = (t.progress + 1 >= t.target_value),
        completed_at = case when (t.progress + 1 >= t.target_value) and t.completed_at is null then now() else t.completed_at end
  where t.user_id = NEW.user_id and t.date_key = v_dk and not t.is_completed
    and (
      t.objective_type = 'play_match'
      or (t.objective_type = 'win_match'    and NEW.result = 'win')
      or (t.objective_type = 'win_bot'      and NEW.result = 'win' and NEW.mode = 'bot')
      or (t.objective_type = 'win_unranked' and NEW.result = 'win' and NEW.mode = 'unranked')
      or (t.objective_type = 'win_ranked'   and NEW.result = 'win' and NEW.mode = 'ranked')
      or (t.objective_type = 'play_ranked'  and NEW.mode = 'ranked')
    );
  return NEW;
end $$;
drop trigger if exists trg_daily_task_from_match on public.matches;
create trigger trg_daily_task_from_match after insert on public.matches
  for each row execute function public.rvn__daily_task_from_match();

-- ── generate + get ──────────────────────────────────────────────────────────
create or replace function public.rvn_get_daily_tasks()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_dk text := public.rvn__daily_key();
  v_diff text; v_used text[] := '{}'; v_tpl record; v_cnt int;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  select count(*) into v_cnt from public.user_daily_tasks where user_id=v_uid and date_key=v_dk;
  if v_cnt = 0 then
    foreach v_diff in array array['easy','medium','hard'] loop
      select * into v_tpl from public.daily_task_templates
        where is_active and difficulty=v_diff and not (objective_type = any(v_used))
        order by random() * weight desc limit 1;
      if v_tpl is null then
        select * into v_tpl from public.daily_task_templates where is_active and difficulty=v_diff order by random() limit 1;
      end if;
      if v_tpl is not null then
        v_used := array_append(v_used, v_tpl.objective_type);
        insert into public.user_daily_tasks(user_id, template_id, date_key, difficulty, objective_type, title, description, target_value, reward_payload)
          values (v_uid, v_tpl.id, v_dk, v_diff, v_tpl.objective_type, v_tpl.title, v_tpl.description, v_tpl.target_value, v_tpl.reward_payload)
          on conflict (user_id, date_key, difficulty) do nothing;
      end if;
    end loop;
    insert into public.user_daily_completion(user_id, date_key) values (v_uid, v_dk) on conflict do nothing;
    insert into public.user_daily_rerolls(user_id, date_key) values (v_uid, v_dk) on conflict do nothing;
  end if;

  return jsonb_build_object(
    'dateKey', v_dk,
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id',id,'difficulty',difficulty,'objectiveType',objective_type,
        'title',title,'description',description,'progress',progress,'target',target_value,
        'rewardPayload',reward_payload,'completed',is_completed,'claimed',is_claimed)
        order by case difficulty when 'easy' then 1 when 'medium' then 2 else 3 end)
      from public.user_daily_tasks where user_id=v_uid and date_key=v_dk), '[]'::jsonb),
    'allDone', coalesce((select count(*)=3 and bool_and(is_completed) from public.user_daily_tasks where user_id=v_uid and date_key=v_dk), false),
    'chestClaimed', coalesce((select is_claimed from public.user_daily_completion where user_id=v_uid and date_key=v_dk), false),
    'reroll', coalesce((select jsonb_build_object('freeUsed',free_reroll_used,'paidCount',paid_reroll_count) from public.user_daily_rerolls where user_id=v_uid and date_key=v_dk), '{"freeUsed":false,"paidCount":0}'::jsonb)
  );
end $$;

-- ── claim task ──────────────────────────────────────────────────────────────
create or replace function public.rvn_claim_daily_task(p_task_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_pay jsonb; v_upd int;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  update public.user_daily_tasks set is_claimed=true, claimed_at=now()
    where id=p_task_id and user_id=v_uid and is_completed and not is_claimed
    returning reward_payload into v_pay;
  get diagnostics v_upd = row_count;
  if v_upd = 0 then return jsonb_build_object('error','not_claimable'); end if;
  perform public.rvn__grant_reward_payload(v_uid, v_pay, 'daily_task', p_task_id::text);
  perform public.rvn__check_level_rewards(v_uid);
  return jsonb_build_object('ok',true,'payload',v_pay,
    'balances',(select jsonb_build_object('silver',gold,'rubies',rubies,'essence',essence) from public.profiles where id=v_uid));
end $$;

-- ── claim chest ─────────────────────────────────────────────────────────────
create or replace function public.rvn_claim_daily_chest()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_dk text := public.rvn__daily_key(); v_all boolean; v_upd int; v_pay jsonb; v_pack jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  select count(*)=3 and bool_and(is_completed) into v_all from public.user_daily_tasks where user_id=v_uid and date_key=v_dk;
  if not coalesce(v_all,false) then return jsonb_build_object('error','not_all_done'); end if;
  update public.user_daily_completion set is_claimed=true, claimed_at=now()
    where user_id=v_uid and date_key=v_dk and not is_claimed;
  get diagnostics v_upd = row_count;
  if v_upd = 0 then return jsonb_build_object('error','already'); end if;
  select value into v_pay from public.economy_config where key='daily_chest';
  select value into v_pack from public.economy_config where key='daily_chest_pack_chance';
  if v_pack is not null and random() < coalesce((v_pack->>'chance')::numeric,0) then
    v_pay := v_pay || jsonb_build_array(jsonb_build_object('type','item','item_type','pack','item_id',coalesce(v_pack->>'item_id','standard_pack'),'quantity',1));
  end if;
  perform public.rvn__grant_reward_payload(v_uid, v_pay, 'daily_chest', v_dk);
  return jsonb_build_object('ok',true,'payload',v_pay,
    'balances',(select jsonb_build_object('silver',gold,'rubies',rubies,'essence',essence) from public.profiles where id=v_uid));
end $$;

-- ── reroll ──────────────────────────────────────────────────────────────────
create or replace function public.rvn_reroll_daily_task(p_task_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_dk text := public.rvn__daily_key();
  v_cfg jsonb; v_free boolean; v_paid int; v_max int; v_cost int; v_total int;
  v_diff text; v_used text[]; v_tpl record; v_gold int;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  select difficulty into v_diff from public.user_daily_tasks where id=p_task_id and user_id=v_uid and not is_completed;
  if v_diff is null then return jsonb_build_object('error','not_rerollable'); end if;

  select value into v_cfg from public.economy_config where key='daily_reroll';
  v_max := coalesce((v_cfg->>'max')::int,3); v_cost := coalesce((v_cfg->>'cost_silver')::int,50);
  select free_reroll_used, paid_reroll_count into v_free, v_paid from public.user_daily_rerolls where user_id=v_uid and date_key=v_dk;
  v_total := (case when v_free then 1 else 0 end) + coalesce(v_paid,0);
  if v_total >= v_max then return jsonb_build_object('error','max_rerolls'); end if;

  if not coalesce(v_free,false) then
    update public.user_daily_rerolls set free_reroll_used=true where user_id=v_uid and date_key=v_dk;
  else
    select gold into v_gold from public.profiles where id=v_uid;
    if v_gold < v_cost then return jsonb_build_object('error','not_enough_silver'); end if;
    update public.profiles set gold = gold - v_cost where id=v_uid;
    update public.user_daily_rerolls set paid_reroll_count = paid_reroll_count + 1 where user_id=v_uid and date_key=v_dk;
    insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
      values (v_uid, 'daily_reroll', p_task_id::text, 'currency', 'silver', -v_cost);
  end if;

  select array_agg(objective_type) into v_used from public.user_daily_tasks where user_id=v_uid and date_key=v_dk and id<>p_task_id;
  select * into v_tpl from public.daily_task_templates
    where is_active and difficulty=v_diff and not (objective_type = any(coalesce(v_used,'{}')))
    order by random() limit 1;
  if v_tpl is null then
    select * into v_tpl from public.daily_task_templates where is_active and difficulty=v_diff order by random() limit 1;
  end if;
  if v_tpl is null then return jsonb_build_object('error','no_template'); end if;

  update public.user_daily_tasks
    set template_id=v_tpl.id, objective_type=v_tpl.objective_type, title=v_tpl.title, description=v_tpl.description,
        target_value=v_tpl.target_value, reward_payload=v_tpl.reward_payload, progress=0, is_completed=false, completed_at=null
    where id=p_task_id and user_id=v_uid;

  return jsonb_build_object('ok',true);
end $$;

grant execute on function public.rvn_get_daily_tasks() to authenticated;
grant execute on function public.rvn_claim_daily_task(bigint) to authenticated;
grant execute on function public.rvn_claim_daily_chest() to authenticated;
grant execute on function public.rvn_reroll_daily_task(bigint) to authenticated;
