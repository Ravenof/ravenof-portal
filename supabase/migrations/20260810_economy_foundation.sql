-- ════════════════════════════════════════════════════════════════════════════
--  Ravenof Ekonomikos PAMATAS (Phase 1)
--  • Valiutos: profiles.gold = SIDABRAS (perpanaudota); + rubies (Rubinai) + essence (Esencija)
--  • reward_transactions — kiekvieno atlygio logas
--  • economy_config — config-driven reikšmės (admin redaguos vėliau)
--  • user_inventory — ne-pak daiktai (card_back/player_avatar/faction_deck)
--  • matches — kovų įrašai su validumu + idempotencija (client_match_id)
--  • rvn__grant_reward_payload(...) — vienas pernaudojamas atlygio davimo variklis
--  • rvn_report_match_v2(...) — config-driven match rewards (bot/unranked/ranked)
--  Esamo rvn_report_match (tik XP) NELIEČIAM — v2 yra atskiras.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Valiutos į profiles (gold jau yra = Sidabras) ────────────────────────
alter table public.profiles add column if not exists rubies  int not null default 0;
alter table public.profiles add column if not exists essence int not null default 0;

-- ── 2) reward_transactions ──────────────────────────────────────────────────
create table if not exists public.reward_transactions (
  id            bigserial primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  source_type   text not null,              -- match|daily_task|daily_chest|login|level|ranked_milestone|season|shop|craft|admin
  source_id     text,
  reward_type   text not null,              -- currency|item|account_xp|season_xp
  currency_type text,                       -- silver|rubies|essence
  amount        int,
  item_type     text,                       -- pack|card|card_back|player_avatar|faction_deck
  item_id       text,
  quantity      int,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists reward_tx_user_idx on public.reward_transactions(user_id, created_at desc);
alter table public.reward_transactions enable row level security;
drop policy if exists rtx_own_read on public.reward_transactions;
create policy rtx_own_read on public.reward_transactions for select using (user_id = auth.uid());

-- ── 3) economy_config (config-driven; admin redaguos) ───────────────────────
create table if not exists public.economy_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.economy_config enable row level security;
drop policy if exists eco_read on public.economy_config;
create policy eco_read on public.economy_config for select using (true);
drop policy if exists eco_admin on public.economy_config;
create policy eco_admin on public.economy_config for all
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

insert into public.economy_config(key, value) values
('match_rewards', $j$
{
  "bot":      {"win":{"account_xp":25,"season_xp":10,"silver":20}, "loss":{"account_xp":10,"season_xp":5,"silver":5},
               "daily_cap":10, "after_cap":{"account_xp_pct":25,"season_xp_pct":25,"silver_pct":0}},
  "unranked": {"win":{"account_xp":40,"season_xp":20,"silver":35}, "loss":{"account_xp":20,"season_xp":10,"silver":10},
               "daily_cap":20, "after_cap":{"account_xp_pct":50,"season_xp_pct":50,"silver_pct":0}},
  "ranked":   {"win":{"account_xp":60,"season_xp":30,"silver":50}, "loss":{"account_xp":25,"season_xp":12,"silver":15},
               "ranked_step_win":1, "ranked_step_loss":-1}
}
$j$::jsonb),
('match_validity', '{"min_duration_seconds":180,"min_turns":5,"min_actions":3}'::jsonb),
('win_streak_bonus', '{"3":{"season_xp":10,"silver":10},"5":{"season_xp":20,"silver":25}}'::jsonb)
on conflict (key) do nothing;

-- ── 4) user_inventory (ne-pak daiktai) ──────────────────────────────────────
create table if not exists public.user_inventory (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  item_type   text not null,               -- card_back|player_avatar|faction_deck|pack
  item_id     text not null,
  quantity    int  not null default 1,
  acquired_at timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);
alter table public.user_inventory enable row level security;
drop policy if exists uinv_own on public.user_inventory;
create policy uinv_own on public.user_inventory for select using (user_id = auth.uid());

-- ── 5) matches (validumas + idempotencija) ──────────────────────────────────
create table if not exists public.matches (
  id                     bigserial primary key,
  user_id                uuid not null references public.profiles(id) on delete cascade,
  client_match_id        uuid,
  opponent_id            uuid,
  opponent_type          text,             -- human|bot
  mode                   text not null,    -- bot|unranked|ranked
  result                 text not null,    -- win|loss|draw
  duration_seconds       int,
  turns_played           int,
  player_actions_count   int,
  opponent_actions_count int,
  valid_for_rewards      boolean not null default false,
  account_xp_reward      int not null default 0,
  season_xp_reward       int not null default 0,
  silver_reward          int not null default 0,
  rubies_reward          int not null default 0,
  essence_reward         int not null default 0,
  ranked_progress_delta  int not null default 0,
  created_at             timestamptz not null default now()
);
create index if not exists matches_user_idx on public.matches(user_id, created_at desc);
create unique index if not exists matches_client_uniq on public.matches(user_id, client_match_id) where client_match_id is not null;
alter table public.matches enable row level security;
drop policy if exists matches_own on public.matches;
create policy matches_own on public.matches for select using (user_id = auth.uid());

-- ── 6) xp_transactions CHECK: leisti 'reward' (be 'match' jau yra) ──────────
do $$
declare v_list text;
begin
  alter table public.xp_transactions drop constraint if exists xp_transactions_source_type_check;
  select string_agg(v, ',') into v_list from (select distinct quote_literal(source_type) as v from public.xp_transactions) q;
  v_list := coalesce(v_list || ',', '') ||
    $q$'event_attendance','deck_published','deck_upvote_received','deck_downvote_received','deck_copied','collection_milestone','manual_admin_adjustment','badge_unlocked','ranked_match','ranked_reward','ranked_achievement','ranked_season','daily_quest','login_streak','season_pass','campaign_mission','tutorial','match','reward'$q$;
  execute 'alter table public.xp_transactions add constraint xp_transactions_source_type_check check (source_type in (' || v_list || '))';
end $$;

-- ranked win streak (lengvas; ranked_profiles žingsnis tvarkomas ranked fazėje)
alter table public.profiles add column if not exists ranked_win_streak int not null default 0;

-- ── 7) rvn__grant_reward_payload — vienas atlygio davimo variklis ───────────
-- p_payload = jsonb massyvas: {type:currency|account_xp|season_xp|item, ...}
-- Kiekvienas komponentas įrašomas į reward_transactions. Grąžina naujus balansus.
create or replace function public.rvn__grant_reward_payload(p_user uuid, p_payload jsonb, p_source_type text, p_source_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  el jsonb; v_cur text; v_amt int; v_it text; v_iid text; v_qty int; v_xpsrc text;
begin
  if p_user is null or p_payload is null then return '{}'::jsonb; end if;
  v_xpsrc := case when p_source_type = 'match' then 'match' else 'reward' end;
  for el in select * from jsonb_array_elements(p_payload) loop
    case el->>'type'
      when 'currency' then
        v_cur := el->>'currency'; v_amt := coalesce((el->>'amount')::int,0);
        if v_amt <> 0 then
          if    v_cur = 'silver'  then update public.profiles set gold    = gold    + v_amt where id = p_user;
          elsif v_cur = 'rubies'  then update public.profiles set rubies  = rubies  + v_amt where id = p_user;
          elsif v_cur = 'essence' then update public.profiles set essence = essence + v_amt where id = p_user;
          end if;
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
            values (p_user, p_source_type, p_source_id, 'currency', v_cur, v_amt);
        end if;
      when 'account_xp' then
        v_amt := coalesce((el->>'amount')::int,0);
        if v_amt > 0 then
          insert into public.xp_transactions(user_id, amount, reason, source_type) values (p_user, v_amt, 'Atlygis', v_xpsrc);
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, amount)
            values (p_user, p_source_type, p_source_id, 'account_xp', v_amt);
        end if;
      when 'season_xp' then
        v_amt := coalesce((el->>'amount')::int,0);
        if v_amt > 0 then
          perform public.rvn__add_pass_xp(p_user, v_amt);
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, amount)
            values (p_user, p_source_type, p_source_id, 'season_xp', v_amt);
        end if;
      when 'item' then
        v_it := el->>'item_type'; v_iid := el->>'item_id'; v_qty := coalesce((el->>'quantity')::int,1);
        if v_it is not null and v_iid is not null then
          insert into public.user_inventory(user_id, item_type, item_id, quantity)
            values (p_user, v_it, v_iid, v_qty)
            on conflict (user_id, item_type, item_id) do update set quantity = public.user_inventory.quantity + v_qty, updated_at = now();
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, item_type, item_id, quantity)
            values (p_user, p_source_type, p_source_id, 'item', v_it, v_iid, v_qty);
        end if;
      else null;
    end case;
  end loop;
  return (select jsonb_build_object('silver', gold, 'rubies', rubies, 'essence', essence) from public.profiles where id = p_user);
end $$;

-- ── 8) rvn_report_match_v2 — config-driven match rewards ─────────────────────
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
  v_xp0 bigint; v_xp1 bigint; v_payload jsonb; v_bonus jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;

  -- Idempotencija
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

  -- Validumas: trukmė ARBA ėjimai ARBA abu žaidėjai po min veiksmų
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

  -- Dienos cap (tik bot/unranked): jei viršyta – procentai
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

  -- Ranked win streak bonusas
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
    'balances', (select jsonb_build_object('silver',gold,'rubies',rubies,'essence',essence) from public.profiles where id=v_uid)
  );
end $$;

grant execute on function public.rvn__grant_reward_payload(uuid, jsonb, text, text) to authenticated;
grant execute on function public.rvn_report_match_v2(uuid, text, text, int, int, int, int, uuid, text) to authenticated;
