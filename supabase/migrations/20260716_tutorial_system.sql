-- ════════════════════════════════════════════════════════════════════════════
-- TUTORIAL SYSTEM — data-driven onboarding (5 lessons), progress + analytics.
--  • tutorial_lessons  : data-driven lesson scripts (config jsonb) + rewards
--  • tutorial_progress : per-user completion / attempts / best time / claimed
--  • tutorial_events   : analytics (step timing, wrong actions, drop-off)
-- RPCs: rvn_tutorial_state / rvn_tutorial_complete / rvn_tutorial_log_event /
--        rvn_tutorial_analytics (admin). Rewards via rvn__grant_payload.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── tables ──────────────────────────────────────────────────────────────────
create table if not exists public.tutorial_lessons (
  id            uuid primary key default gen_random_uuid(),
  seed_key      text unique,
  slug          text unique not null,
  sort_order    int  not null default 0,
  title         text not null,
  subtitle      text,
  description   text,
  icon          text,
  est_minutes   int  default 4,
  config        jsonb not null default '{}'::jsonb,
  reward_payload jsonb not null default '{}'::jsonb,
  status        text not null default 'active',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.tutorial_progress (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  lesson_id      uuid not null references public.tutorial_lessons(id) on delete cascade,
  completed      boolean not null default false,
  attempts       int not null default 0,
  best_time_ms   int,
  reward_claimed boolean not null default false,
  completed_at   timestamptz,
  updated_at     timestamptz default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.tutorial_events (
  id          bigserial primary key,
  user_id     uuid references public.profiles(id) on delete set null,
  lesson_slug text,
  lesson_id   uuid,
  step_id     text,
  event_type  text not null,  -- lesson_start|lesson_complete|lesson_skip|step_start|step_complete|wrong_action|explanation_skip|hint_shown|lesson_quit
  value_ms    int,
  meta        jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);
create index if not exists tutorial_events_lesson_idx on public.tutorial_events(lesson_slug, event_type);
create index if not exists tutorial_events_user_idx   on public.tutorial_events(user_id);
create index if not exists tutorial_events_step_idx   on public.tutorial_events(lesson_slug, step_id);

-- ── xp_transactions CHECK: ensure 'tutorial' source allowed ─────────────────
do $$
declare v_list text;
begin
  alter table public.xp_transactions drop constraint if exists xp_transactions_source_type_check;
  select string_agg(v, ',') into v_list
    from (select distinct quote_literal(source_type) as v from public.xp_transactions) q;
  v_list := coalesce(v_list || ',', '') ||
    $q$'event_attendance','deck_published','deck_upvote_received','deck_downvote_received','deck_copied','collection_milestone','manual_admin_adjustment','badge_unlocked','ranked_match','ranked_reward','ranked_achievement','ranked_season','daily_quest','login_streak','season_pass','campaign_mission','tutorial'$q$;
  execute 'alter table public.xp_transactions add constraint xp_transactions_source_type_check check (source_type in (' || v_list || '))';
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.tutorial_lessons  enable row level security;
alter table public.tutorial_progress enable row level security;
alter table public.tutorial_events   enable row level security;

drop policy if exists tut_lessons_read on public.tutorial_lessons;
create policy tut_lessons_read on public.tutorial_lessons for select using (true);

drop policy if exists tut_lessons_admin on public.tutorial_lessons;
create policy tut_lessons_admin on public.tutorial_lessons for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists tut_progress_own on public.tutorial_progress;
create policy tut_progress_own on public.tutorial_progress for select using (user_id = auth.uid());

drop policy if exists tut_events_admin_read on public.tutorial_events;
create policy tut_events_admin_read on public.tutorial_events for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ── RPC: state (lessons + this user's progress) ─────────────────────────────
create or replace function public.rvn_tutorial_state()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  return jsonb_build_object(
    'lessons', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.sort_order)
      from public.tutorial_lessons l where l.status = 'active'), '[]'::jsonb),
    'progress', coalesce((
      select jsonb_agg(to_jsonb(p))
      from public.tutorial_progress p where p.user_id = v_uid), '[]'::jsonb)
  );
end $$;

-- ── RPC: complete a lesson (grant reward once) ──────────────────────────────
create or replace function public.rvn_tutorial_complete(p_lesson uuid, p_time_ms int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_payload jsonb; v_claimed boolean; v_first boolean;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select reward_payload into v_payload from public.tutorial_lessons where id = p_lesson;

  insert into public.tutorial_progress (user_id, lesson_id, completed, attempts, best_time_ms, completed_at, updated_at)
    values (v_uid, p_lesson, true, 1, p_time_ms, now(), now())
  on conflict (user_id, lesson_id) do update set
    completed = true,
    best_time_ms = least(coalesce(public.tutorial_progress.best_time_ms, 2147483647),
                         coalesce(p_time_ms, public.tutorial_progress.best_time_ms, 2147483647)),
    completed_at = coalesce(public.tutorial_progress.completed_at, now()),
    updated_at = now()
  returning reward_claimed into v_claimed;

  if not coalesce(v_claimed, false) then
    begin
      perform public.rvn__grant_payload(v_uid, coalesce(v_payload, '{}'::jsonb), 'tutorial');
    exception when others then null;  -- atlygis niekada nelaužia užbaigimo
    end;
    update public.tutorial_progress set reward_claimed = true where user_id = v_uid and lesson_id = p_lesson;
    v_first := true;
  else
    v_first := false;
  end if;

  return jsonb_build_object('ok', true, 'firstTime', v_first, 'reward', coalesce(v_payload, '{}'::jsonb));
end $$;

-- ── RPC: log analytics event (+ bump attempts on lesson_start) ──────────────
create or replace function public.rvn_tutorial_log_event(
  p_lesson_slug text, p_lesson uuid, p_step text, p_type text,
  p_value int default null, p_meta jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  insert into public.tutorial_events (user_id, lesson_slug, lesson_id, step_id, event_type, value_ms, meta)
    values (v_uid, p_lesson_slug, p_lesson, p_step, p_type, p_value, coalesce(p_meta, '{}'::jsonb));

  if p_type = 'lesson_start' and v_uid is not null and p_lesson is not null then
    insert into public.tutorial_progress (user_id, lesson_id, attempts, updated_at)
      values (v_uid, p_lesson, 1, now())
    on conflict (user_id, lesson_id) do update set
      attempts = public.tutorial_progress.attempts + 1, updated_at = now();
  end if;
end $$;

-- ── RPC: admin analytics aggregates ─────────────────────────────────────────
create or replace function public.rvn_tutorial_analytics()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.role = 'admin') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  return jsonb_build_object(
    'ok', true,
    'perLesson', coalesce((select jsonb_agg(x) from (
      select lesson_slug,
        count(*) filter (where event_type = 'lesson_start')    as starts,
        count(*) filter (where event_type = 'lesson_complete') as completes,
        count(*) filter (where event_type = 'lesson_skip')     as skips,
        count(*) filter (where event_type = 'lesson_quit')     as quits,
        count(*) filter (where event_type = 'wrong_action')    as wrong_actions
      from public.tutorial_events group by lesson_slug
    ) x), '[]'::jsonb),
    'perStep', coalesce((select jsonb_agg(y) from (
      select lesson_slug, step_id,
        count(*) filter (where event_type = 'step_complete') as completes,
        round(avg(value_ms) filter (where event_type = 'step_complete' and value_ms is not null)) as avg_ms,
        count(*) filter (where event_type = 'wrong_action')  as wrong
      from public.tutorial_events where step_id is not null group by lesson_slug, step_id
    ) y), '[]'::jsonb)
  );
end $$;

grant execute on function public.rvn_tutorial_state()                                   to anon, authenticated;
grant execute on function public.rvn_tutorial_complete(uuid, int)                        to authenticated;
grant execute on function public.rvn_tutorial_log_event(text, uuid, text, text, int, jsonb) to anon, authenticated;
grant execute on function public.rvn_tutorial_analytics()                                to authenticated;
