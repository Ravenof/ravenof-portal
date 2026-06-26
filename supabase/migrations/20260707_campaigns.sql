-- ════════════════════════════════════════════════════════════════════════════
-- Ravenof Digital — CAMPAIGN MODE (story single-player) schema + RPCs
-- Generic, reusable campaign system: campaigns → chapters → nodes(missions),
-- reusable cutscenes, per-user progress. Battles run through the existing
-- TutorialGame engine; scenario/wave/objective data lives in node JSONB.
-- Additive only — does NOT touch existing tables.
-- ════════════════════════════════════════════════════════════════════════════

-- helper: is the current user an admin/event_moderator (campaign authoring)
create or replace function public.rvn_is_campaign_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role in ('admin','event_moderator'));
$$;

-- ──────────────────────────────── CAMPAIGNS ────────────────────────────────
create table if not exists public.campaigns (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  title             text not null,
  subtitle          text,
  description       text,
  cover_image_url   text,
  campaign_type     text not null default 'story',   -- story | challenge | event | tutorial
  lore_period       text,                             -- related lore era/period (slug or free text)
  related_factions  text[] not null default '{}',     -- faction names
  map_image_url     text,                             -- null => app falls back to Atlas world map
  map_natural_w     int not null default 1448,
  map_natural_h     int not null default 1086,
  start_node_id     uuid,                             -- first playable node (set after nodes exist)
  visibility        text not null default 'draft',    -- draft | active | hidden
  required_level    int not null default 0,
  required_progress jsonb not null default '{}'::jsonb,
  sort_order        int not null default 0,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ──────────────────────────────── CHAPTERS ─────────────────────────────────
create table if not exists public.campaign_chapters (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references public.campaigns(id) on delete cascade,
  title               text not null,
  description         text,
  sort_order          int not null default 0,
  background_image_url text,
  background_video_url text,
  narration           text,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_campaign_chapters_campaign on public.campaign_chapters(campaign_id);

-- ──────────────────────────────── CUTSCENES (reusable) ─────────────────────
create table if not exists public.campaign_cutscenes (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid references public.campaigns(id) on delete cascade,
  title               text not null,
  type                text not null default 'dialogue', -- dialogue|cinematic|video|image_sequence|narration|mixed
  background_image_url text,
  background_video_url text,
  music_url           text,
  ambient_url         text,
  skippable           boolean not null default true,
  autoplay            boolean not null default false,
  steps               jsonb not null default '[]'::jsonb, -- CutsceneStep[] (see lib/campaign/types.ts)
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_campaign_cutscenes_campaign on public.campaign_cutscenes(campaign_id);

-- ──────────────────────────────── NODES / MISSIONS ─────────────────────────
create table if not exists public.campaign_nodes (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references public.campaigns(id) on delete cascade,
  chapter_id          uuid references public.campaign_chapters(id) on delete set null,
  title               text not null,
  subtitle            text,
  description         text,
  lore_text           text,
  pos_x               numeric not null default 50,   -- percent (0..100) of map width
  pos_y               numeric not null default 50,   -- percent (0..100) of map height
  icon_type           text not null default 'battle', -- battle|story|boss|siege|gate|wave|elite|reward|lock
  node_color          text,
  mission_type        text not null default 'STANDARD_CARD_BATTLE',
  unlock_rule         jsonb not null default '{"type":"all_prev"}'::jsonb,
  prev_node_ids       uuid[] not null default '{}',
  next_node_ids       uuid[] not null default '{}',
  branch_choice       jsonb,                          -- optional branching choice payload
  objectives          jsonb not null default '[]'::jsonb, -- MissionObjective[] (primary+secondary)
  pre_cutscene_id     uuid references public.campaign_cutscenes(id) on delete set null,
  post_cutscene_id    uuid references public.campaign_cutscenes(id) on delete set null,
  failure_cutscene_id uuid references public.campaign_cutscenes(id) on delete set null,
  battle_config       jsonb not null default '{}'::jsonb, -- BattleConfig (decks, factions, overrides)
  scenario            jsonb not null default '{}'::jsonb, -- ScenarioConfig (rules, waves, objectives, map)
  reward_payload      jsonb not null default '{}'::jsonb, -- {gold,exp,boosters,cardMin,cards[],cosmetics[],codex[]}
  replay              jsonb not null default '{"allowed":true}'::jsonb,
  difficulty          jsonb not null default '{}'::jsonb,
  admin_notes         text,
  status              text not null default 'active', -- draft | active | hidden
  sort_order          int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_campaign_nodes_campaign on public.campaign_nodes(campaign_id);
create index if not exists idx_campaign_nodes_chapter on public.campaign_nodes(chapter_id);

-- ──────────────────────────────── PER-USER PROGRESS ────────────────────────
create table if not exists public.campaign_progress (
  user_id            uuid not null references public.profiles(id) on delete cascade,
  campaign_id        uuid not null references public.campaigns(id) on delete cascade,
  completed_node_ids uuid[] not null default '{}',
  unlocked_node_ids  uuid[] not null default '{}',
  node_stars         jsonb not null default '{}'::jsonb, -- { nodeId: stars(1..3) }
  node_objectives    jsonb not null default '{}'::jsonb, -- { nodeId: string[] completed objective ids }
  failed_attempts    jsonb not null default '{}'::jsonb, -- { nodeId: count }
  rewards_claimed    uuid[] not null default '{}',
  choices            jsonb not null default '{}'::jsonb, -- { nodeId: choiceKey }
  cutscenes_watched  text[] not null default '{}',
  current_chapter_id uuid,
  last_node_id       uuid,
  difficulty         text,
  updated_at         timestamptz not null default now(),
  primary key (user_id, campaign_id)
);

-- ════════════════════════════════ RLS ══════════════════════════════════════
alter table public.campaigns          enable row level security;
alter table public.campaign_chapters  enable row level security;
alter table public.campaign_cutscenes enable row level security;
alter table public.campaign_nodes     enable row level security;
alter table public.campaign_progress  enable row level security;

-- public read of ACTIVE content; admins read everything; admins write everything
do $$ begin
  -- campaigns
  if not exists (select 1 from pg_policies where tablename='campaigns' and policyname='camp_read') then
    create policy "camp_read" on public.campaigns for select
      using (visibility = 'active' or public.rvn_is_campaign_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename='campaigns' and policyname='camp_write') then
    create policy "camp_write" on public.campaigns for all
      using (public.rvn_is_campaign_admin()) with check (public.rvn_is_campaign_admin());
  end if;
  -- chapters
  if not exists (select 1 from pg_policies where tablename='campaign_chapters' and policyname='chap_read') then
    create policy "chap_read" on public.campaign_chapters for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='campaign_chapters' and policyname='chap_write') then
    create policy "chap_write" on public.campaign_chapters for all
      using (public.rvn_is_campaign_admin()) with check (public.rvn_is_campaign_admin());
  end if;
  -- cutscenes
  if not exists (select 1 from pg_policies where tablename='campaign_cutscenes' and policyname='cut_read') then
    create policy "cut_read" on public.campaign_cutscenes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='campaign_cutscenes' and policyname='cut_write') then
    create policy "cut_write" on public.campaign_cutscenes for all
      using (public.rvn_is_campaign_admin()) with check (public.rvn_is_campaign_admin());
  end if;
  -- nodes
  if not exists (select 1 from pg_policies where tablename='campaign_nodes' and policyname='node_read') then
    create policy "node_read" on public.campaign_nodes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='campaign_nodes' and policyname='node_write') then
    create policy "node_write" on public.campaign_nodes for all
      using (public.rvn_is_campaign_admin()) with check (public.rvn_is_campaign_admin());
  end if;
  -- progress (own only)
  if not exists (select 1 from pg_policies where tablename='campaign_progress' and policyname='prog_own') then
    create policy "prog_own" on public.campaign_progress for all
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

-- ════════════════════════════════ RPC: state ═══════════════════════════════
-- Returns the player's progress for a campaign, initializing it (and unlocking
-- the start node) on first access. Returns null if campaign not visible.
create or replace function public.rvn_campaign_state(p_campaign uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_camp public.campaigns;
  v_prog public.campaign_progress;
  v_start uuid;
begin
  if v_uid is null then return null; end if;
  select * into v_camp from public.campaigns where id = p_campaign;
  if v_camp.id is null then return null; end if;
  if v_camp.visibility <> 'active' and not public.rvn_is_campaign_admin() then return null; end if;

  select * into v_prog from public.campaign_progress
    where user_id = v_uid and campaign_id = p_campaign;

  if v_prog.user_id is null then
    -- pick start node: explicit start_node_id, else lowest sort_order node with no prev
    v_start := v_camp.start_node_id;
    if v_start is null then
      select id into v_start from public.campaign_nodes
        where campaign_id = p_campaign and status <> 'hidden'
        order by (coalesce(array_length(prev_node_ids,1),0)) asc, sort_order asc
        limit 1;
    end if;
    insert into public.campaign_progress (user_id, campaign_id, unlocked_node_ids, last_node_id)
      values (v_uid, p_campaign, case when v_start is null then '{}'::uuid[] else array[v_start] end, v_start)
      returning * into v_prog;
  end if;

  return jsonb_build_object(
    'campaignId',       v_prog.campaign_id,
    'completedNodeIds', to_jsonb(v_prog.completed_node_ids),
    'unlockedNodeIds',  to_jsonb(v_prog.unlocked_node_ids),
    'nodeStars',        v_prog.node_stars,
    'nodeObjectives',   v_prog.node_objectives,
    'failedAttempts',   v_prog.failed_attempts,
    'rewardsClaimed',   to_jsonb(v_prog.rewards_claimed),
    'choices',          v_prog.choices,
    'cutscenesWatched', to_jsonb(v_prog.cutscenes_watched),
    'currentChapterId', v_prog.current_chapter_id,
    'lastNodeId',       v_prog.last_node_id,
    'difficulty',       v_prog.difficulty
  );
end $$;
grant execute on function public.rvn_campaign_state(uuid) to authenticated;

-- ════════════════════════════════ RPC: complete node ═══════════════════════
-- Server-authoritative completion: marks node complete, records stars/objectives,
-- unlocks next nodes (honoring each next node's unlock_rule), grants reward once.
-- p_payload: { nodeId, stars, objectives:[ids], choiceKey, result:'win'|'lose' }
create or replace function public.rvn_campaign_complete_node(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_node public.campaign_nodes;
  v_camp uuid;
  v_node_id uuid := (p_payload->>'nodeId')::uuid;
  v_result text := coalesce(p_payload->>'result','win');
  v_stars int := greatest(0, least(3, coalesce((p_payload->>'stars')::int, 1)));
  v_objs jsonb := coalesce(p_payload->'objectives', '[]'::jsonb);
  v_choice text := p_payload->>'choiceKey';
  v_prog public.campaign_progress;
  v_already boolean;
  v_unlock uuid[] := '{}';
  v_nxt uuid;
  v_nrule jsonb;
  v_can boolean;
  v_prev uuid;
  v_prev_done boolean;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select * into v_node from public.campaign_nodes where id = v_node_id;
  if v_node.id is null then raise exception 'node not found'; end if;
  v_camp := v_node.campaign_id;

  -- ensure progress row exists
  perform public.rvn_campaign_state(v_camp);
  select * into v_prog from public.campaign_progress where user_id=v_uid and campaign_id=v_camp;

  if v_result = 'lose' then
    -- record failed attempt only
    update public.campaign_progress
      set failed_attempts = jsonb_set(failed_attempts, array[v_node_id::text],
            to_jsonb(coalesce((failed_attempts->>v_node_id::text)::int,0)+1)),
          last_node_id = v_node_id,
          updated_at = now()
      where user_id=v_uid and campaign_id=v_camp;
    return jsonb_build_object('ok', true, 'result','lose');
  end if;

  v_already := v_node_id = any(v_prog.completed_node_ids);

  -- compute newly unlocked next nodes (respect unlock_rule)
  foreach v_nxt in array coalesce(v_node.next_node_ids, '{}'::uuid[]) loop
    select unlock_rule into v_nrule from public.campaign_nodes where id = v_nxt;
    v_can := true;
    if coalesce(v_nrule->>'type','all_prev') = 'all_prev' then
      -- all prev nodes of v_nxt must be (or now be) completed
      for v_prev in select unnest(prev_node_ids) from public.campaign_nodes where id = v_nxt loop
        v_prev_done := v_prev = any(v_prog.completed_node_ids) or v_prev = v_node_id;
        if not v_prev_done then v_can := false; end if;
      end loop;
    end if; -- 'any_prev'/'always' => unlock now (this node is a prev)
    if v_can then v_unlock := array_append(v_unlock, v_nxt); end if;
  end loop;

  update public.campaign_progress p set
    completed_node_ids = (select array(select distinct e from unnest(p.completed_node_ids || array[v_node_id]) e)),
    unlocked_node_ids  = (select array(select distinct e from unnest(p.unlocked_node_ids || array[v_node_id] || v_unlock) e)),
    node_stars       = jsonb_set(p.node_stars, array[v_node_id::text],
                         to_jsonb(greatest(coalesce((p.node_stars->>v_node_id::text)::int,0), v_stars))),
    node_objectives  = jsonb_set(p.node_objectives, array[v_node_id::text], v_objs),
    choices          = case when v_choice is null then p.choices
                            else jsonb_set(p.choices, array[v_node_id::text], to_jsonb(v_choice)) end,
    current_chapter_id = coalesce(v_node.chapter_id, p.current_chapter_id),
    last_node_id     = v_node_id,
    updated_at       = now()
  where p.user_id=v_uid and p.campaign_id=v_camp;

  -- grant reward once (first clear only)
  if not v_already and v_node.reward_payload is not null and v_node.reward_payload <> '{}'::jsonb then
    perform public.rvn__grant_payload(v_uid, v_node.reward_payload, 'campaign_mission');
    update public.campaign_progress
      set rewards_claimed = (select array(select distinct e from unnest(rewards_claimed || array[v_node_id]) e))
      where user_id=v_uid and campaign_id=v_camp;
  end if;

  return jsonb_build_object('ok', true, 'result','win',
    'firstClear', not v_already, 'stars', v_stars, 'unlocked', to_jsonb(v_unlock));
end $$;
grant execute on function public.rvn_campaign_complete_node(jsonb) to authenticated;

-- mark a cutscene as watched (idempotent)
create or replace function public.rvn_campaign_mark_cutscene(p_campaign uuid, p_cutscene text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  perform public.rvn_campaign_state(p_campaign);
  update public.campaign_progress
    set cutscenes_watched = (select array(select distinct e from unnest(cutscenes_watched || array[p_cutscene]) e)),
        updated_at = now()
    where user_id = v_uid and campaign_id = p_campaign;
end $$;
grant execute on function public.rvn_campaign_mark_cutscene(uuid, text) to authenticated;

-- updated_at touch triggers
create or replace function public.rvn__touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname='trg_campaigns_touch') then
    create trigger trg_campaigns_touch before update on public.campaigns
      for each row execute function public.rvn__touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='trg_campaign_nodes_touch') then
    create trigger trg_campaign_nodes_touch before update on public.campaign_nodes
      for each row execute function public.rvn__touch_updated_at();
  end if;
end $$;
