-- ════════════════════════════════════════════════════════════════════════════
-- ADMIN: žaidėjo statistika pagal formatą/režimą + universalūs grantai (2026-10-01)
-- ════════════════════════════════════════════════════════════════════════════
--  1) matches.format ('zmk' | 'classic') — kovos rezultatas saugo formatą;
--     rvn_report_match_v2 gauna p_format (pilna 20260923 apibrėžtis + format).
--  2) rvn_admin_player_stats(p_user) — kovos pagal formatą, režimą, formatas×režimas,
--     bendras ir per režimą žaidimo laikas, savaitinė kreivė, reitingas abiejuose formatuose.
--  3) rvn_admin_grant_v2 — admin gali skirti: sidabrą/rubinus/esenciją (± suma),
--     BET KOKIĄ kortą (kopijų sk.), pakuotę, kosmetiką ar BET KOKĮ parduotuvės daiktą
--     (per rvn__grant_reward_payload, source 'admin'). Viskas žurnale admin_grant_log.
--  4) rvn_admin_grant_options() — sąrašai UI (pakuotės, kosmetika, parduotuvės daiktai).

-- ── 1) matches.format + report_match_v2 ──────────────────────────────────────
alter table public.matches add column if not exists format text not null default 'zmk';
create index if not exists matches_user_format_idx on public.matches (user_id, format);

drop function if exists public.rvn_report_match_v2(uuid, text, text, integer, integer, integer, integer, uuid, text, text, text);
create or replace function public.rvn_report_match_v2(
  p_client_match_id uuid, p_mode text, p_result text,
  p_duration_seconds integer default 0, p_turns integer default 0,
  p_player_actions integer default 0, p_opponent_actions integer default 0,
  p_opponent_id uuid default null, p_opponent_type text default 'human',
  p_difficulty text default null, p_opponent_deck text default null, p_format text default 'zmk')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_cfg jsonb; v_val jsonb; v_streak jsonb; v_mode jsonb; v_side jsonb;
  v_won boolean := (p_result = 'win');
  v_valid boolean; v_minA int; v_axp int; v_sxp int; v_slv int; v_lvl int;
  v_cap int; v_cnt int; v_after jsonb; v_streakCount int := 0; v_delta int := 0;
  v_xp0 bigint; v_xp1 bigint; v_payload jsonb; v_bonus jsonb; v_levelRewards jsonb := '[]'::jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
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

  v_minA := coalesce((v_val->>'min_actions')::int,3);
  v_valid := p_duration_seconds >= coalesce((v_val->>'min_duration_seconds')::int,180)
          or p_turns            >= coalesce((v_val->>'min_turns')::int,5)
          or (p_player_actions >= v_minA and p_opponent_actions >= v_minA);

  if not v_valid then
    insert into public.matches(user_id, client_match_id, opponent_id, opponent_type, mode, result,
      duration_seconds, turns_played, player_actions_count, opponent_actions_count, valid_for_rewards, difficulty, opponent_deck, format)
      values (v_uid, p_client_match_id, p_opponent_id, p_opponent_type, p_mode, p_result,
      p_duration_seconds, p_turns, p_player_actions, p_opponent_actions, false, p_difficulty, p_opponent_deck, case when p_format='classic' then 'classic' else 'zmk' end);
    if v_won is not true and p_mode='ranked' then update public.profiles set ranked_win_streak=0 where id=v_uid; end if;
    return jsonb_build_object('valid', false);
  end if;

  v_side := v_mode->(case when v_won then 'win' else 'loss' end);
  v_axp := coalesce((v_side->>'account_xp')::int,0);
  v_sxp := coalesce((v_side->>'season_xp')::int,0);
  v_slv := coalesce((v_side->>'silver')::int,0);

  -- PvE: sidabras pagal sudėtingumą × varžovo kaladę (bot.silver_by_level), jei nustatyta
  if p_mode = 'bot' and p_difficulty is not null and p_opponent_deck is not null then
    v_lvl := (v_mode->'silver_by_level'->p_opponent_deck->>p_difficulty)::int;
    if v_lvl is not null then
      v_slv := case when v_won then v_lvl else floor(v_lvl * 0.25) end;
    end if;
  end if;

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

  v_levelRewards := public.rvn__check_level_rewards(v_uid);

  insert into public.matches(user_id, client_match_id, opponent_id, opponent_type, mode, result,
    duration_seconds, turns_played, player_actions_count, opponent_actions_count, valid_for_rewards,
    account_xp_reward, season_xp_reward, silver_reward, ranked_progress_delta, difficulty, opponent_deck, format)
    values (v_uid, p_client_match_id, p_opponent_id, p_opponent_type, p_mode, p_result,
    p_duration_seconds, p_turns, p_player_actions, p_opponent_actions, true,
    v_axp, v_sxp, v_slv, v_delta, p_difficulty, p_opponent_deck, case when p_format='classic' then 'classic' else 'zmk' end);

  select coalesce(xp_total,0) into v_xp1 from public.profiles where id=v_uid;
  v_xp1 := greatest(v_xp1, v_xp0 + v_axp);

  return jsonb_build_object(
    'valid', true, 'result', p_result,
    'rewards', jsonb_build_object('account_xp',v_axp,'season_xp',v_sxp,'silver',v_slv),
    'streak', v_streakCount, 'rankedDelta', v_delta,
    'accountXpBefore', v_xp0, 'accountXpAfter', v_xp1,
    'levelRewards', v_levelRewards,
    'balances', (select jsonb_build_object('silver',gold,'rubies',rubies,'essence',essence) from public.profiles where id=v_uid)
  );
end $function$;

grant execute on function public.rvn_report_match_v2(uuid, text, text, integer, integer, integer, integer, uuid, text, text, text, text) to authenticated;

-- ── 2) Žaidėjo statistika ────────────────────────────────────────────────────
create or replace function public.rvn_admin_player_stats(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_out jsonb;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select jsonb_build_object(
    'total', jsonb_build_object(
      'n', count(*), 'wins', count(*) filter (where result='win'), 'losses', count(*) filter (where result='loss'),
      'seconds', coalesce(sum(duration_seconds),0), 'avg_s', round(avg(duration_seconds))::int, 'max_s', max(duration_seconds),
      'avg_turns', round(avg(turns_played),1), 'first_at', min(created_at), 'last_at', max(created_at),
      'active_days', count(distinct (created_at at time zone 'Europe/Vilnius')::date)
    ),
    'by_format', (select coalesce(jsonb_object_agg(f, j), '{}'::jsonb) from (
        select coalesce(format,'zmk') f, jsonb_build_object('n', count(*), 'wins', count(*) filter (where result='win'),
          'seconds', coalesce(sum(duration_seconds),0), 'avg_s', round(avg(duration_seconds))::int, 'last_at', max(created_at)) j
        from public.matches where user_id = p_user group by 1) x),
    'by_mode', (select coalesce(jsonb_object_agg(m, j), '{}'::jsonb) from (
        select mode m, jsonb_build_object('n', count(*), 'wins', count(*) filter (where result='win'),
          'seconds', coalesce(sum(duration_seconds),0), 'avg_s', round(avg(duration_seconds))::int, 'last_at', max(created_at),
          'vs_human', count(*) filter (where opponent_type='human'), 'vs_bot', count(*) filter (where opponent_type<>'human' or opponent_type is null)) j
        from public.matches where user_id = p_user group by 1) x),
    'matrix', (select coalesce(jsonb_agg(jsonb_build_object('format', f, 'mode', m, 'n', n, 'wins', w, 'seconds', s) order by f, m), '[]'::jsonb) from (
        select coalesce(format,'zmk') f, mode m, count(*) n, count(*) filter (where result='win') w, coalesce(sum(duration_seconds),0) s
        from public.matches where user_id = p_user group by 1,2) x),
    'weekly', (select coalesce(jsonb_agg(jsonb_build_object('week', wk, 'n', n, 'seconds', s) order by wk), '[]'::jsonb) from (
        select to_char(date_trunc('week', created_at at time zone 'Europe/Vilnius'), 'YYYY-MM-DD') wk, count(*) n, coalesce(sum(duration_seconds),0) s
        from public.matches where user_id = p_user and created_at > now() - interval '12 weeks' group by 1) x),
    'by_difficulty', (select coalesce(jsonb_object_agg(d, j), '{}'::jsonb) from (
        select coalesce(difficulty,'—') d, jsonb_build_object('n', count(*), 'wins', count(*) filter (where result='win')) j
        from public.matches where user_id = p_user and mode = 'bot' group by 1) x),
    'ranked', (select coalesce(jsonb_object_agg(s.format, jsonb_build_object('season', s.name, 'rank_step', rp.rank_step, 'best_step', rp.best_rank_step,
                 'wins', rp.wins, 'losses', rp.losses, 'streak', rp.win_streak, 'vs_real', rp.wins_vs_real)), '{}'::jsonb)
               from public.ranked_seasons s join public.ranked_profiles rp on rp.season_id = s.id and rp.user_id = p_user where s.is_active)
  ) into v_out
  from public.matches where user_id = p_user;
  return v_out;
end $$;
grant execute on function public.rvn_admin_player_stats(uuid) to authenticated;

-- ── 3) Grantai ───────────────────────────────────────────────────────────────
create table if not exists public.admin_grant_log (
  id          bigserial primary key,
  admin_id    uuid references public.profiles(id) on delete set null,
  target_id   uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,           -- silver|rubies|essence|card|pack|cosmetic|shop_item
  ref         text,                    -- card uuid / pack uuid / cosmetic id / shop_item id
  ref_name    text,
  amount      int not null default 1,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists admin_grant_log_target_idx on public.admin_grant_log (target_id, created_at desc);
alter table public.admin_grant_log enable row level security;
drop policy if exists admin_grant_log_admin_read on public.admin_grant_log;
create policy admin_grant_log_admin_read on public.admin_grant_log for select using (public.is_admin());

create or replace function public.rvn_admin_grant_v2(p_target uuid, p_kind text, p_ref text default null, p_amount int default 1, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := auth.uid(); v_name text; v_qty int; v_payload jsonb; v_cur text; v_pid uuid; v_cid text; v_card uuid; v_item public.shop_items;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then raise exception 'target not found'; end if;
  p_amount := coalesce(p_amount, 1);

  case p_kind
    when 'silver', 'gold', 'rubies', 'essence' then
      if p_amount = 0 then raise exception 'amount 0'; end if;
      v_cur := case when p_kind = 'gold' then 'silver' else p_kind end;
      if    v_cur = 'silver'  then update public.profiles set gold    = greatest(0, gold    + p_amount) where id = p_target;
      elsif v_cur = 'rubies'  then update public.profiles set rubies  = greatest(0, rubies  + p_amount) where id = p_target;
      elsif v_cur = 'essence' then update public.profiles set essence = greatest(0, essence + p_amount) where id = p_target;
      end if;
      insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
        values (p_target, 'admin', v_admin::text, 'currency', v_cur, p_amount);
      v_name := v_cur;
    when 'card' then
      if p_amount = 0 then raise exception 'amount 0'; end if;
      v_card := p_ref::uuid;
      select name into v_name from public.cards where id = v_card;
      if v_name is null then raise exception 'card not found'; end if;
      if p_amount > 0 then
        insert into public.user_collections(user_id, card_id, quantity) values (p_target, v_card, p_amount)
          on conflict (user_id, card_id) do update set quantity = public.user_collections.quantity + p_amount;
      else
        update public.user_collections set quantity = greatest(0, quantity + p_amount) where user_id = p_target and card_id = v_card;
        delete from public.user_collections where user_id = p_target and card_id = v_card and quantity <= 0;
      end if;
      insert into public.reward_transactions(user_id, source_type, source_id, reward_type, item_type, item_id, quantity)
        values (p_target, 'admin', v_admin::text, 'item', 'card', v_card::text, p_amount);
    when 'pack' then
      if p_amount <= 0 then raise exception 'amount must be > 0'; end if;
      v_pid := p_ref::uuid;
      select name into v_name from public.card_packs where id = v_pid;
      if v_name is null then raise exception 'pack not found'; end if;
      insert into public.user_pack_inventory(user_id, pack_id, quantity) values (p_target, v_pid, p_amount)
        on conflict (user_id, pack_id) do update set quantity = public.user_pack_inventory.quantity + p_amount;
      insert into public.reward_transactions(user_id, source_type, source_id, reward_type, item_type, item_id, quantity)
        values (p_target, 'admin', v_admin::text, 'item', 'pack', v_pid::text, p_amount);
    when 'cosmetic' then
      select id, name into v_cid, v_name from public.cosmetics where id = p_ref;
      if v_cid is null then raise exception 'cosmetic not found'; end if;
      insert into public.user_cosmetics(user_id, cosmetic_id) values (p_target, v_cid) on conflict do nothing;
      insert into public.reward_transactions(user_id, source_type, source_id, reward_type, item_type, item_id, quantity)
        values (p_target, 'admin', v_admin::text, 'item', 'cosmetic', v_cid, 1);
      p_amount := 1;
    when 'shop_item' then
      if p_amount <= 0 then raise exception 'amount must be > 0'; end if;
      select * into v_item from public.shop_items where id = p_ref::bigint;
      if v_item.id is null then raise exception 'shop item not found'; end if;
      v_name := v_item.name;
      for v_qty in 1..least(p_amount, 50) loop
        perform public.rvn__grant_reward_payload(p_target, v_item.payload, 'admin', 'shop_item:' || v_item.id::text);
      end loop;
    else
      raise exception 'unknown kind %', p_kind;
  end case;

  insert into public.admin_grant_log(admin_id, target_id, kind, ref, ref_name, amount, note)
    values (v_admin, p_target, p_kind, p_ref, v_name, p_amount, p_note);

  return (select jsonb_build_object('ok', true, 'kind', p_kind, 'name', v_name, 'amount', p_amount,
            'balances', jsonb_build_object('silver', gold, 'rubies', rubies, 'essence', essence))
          from public.profiles where id = p_target);
end $$;
grant execute on function public.rvn_admin_grant_v2(uuid, text, text, int, text) to authenticated;

-- ── 4) Pasirinkimų sąrašai UI ───────────────────────────────────────────────
create or replace function public.rvn_admin_grant_options()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'packs', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'active', is_active) order by sort_order), '[]'::jsonb) from public.card_packs),
    'cosmetics', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'kind', kind, 'active', is_active) order by kind, sort_order, name), '[]'::jsonb) from public.cosmetics),
    'shop_items', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'type', item_type, 'active', is_active) order by sort_order), '[]'::jsonb) from public.shop_items)
  );
end $$;
grant execute on function public.rvn_admin_grant_options() to authenticated;

create or replace function public.rvn_admin_grant_log(p_user uuid, p_limit int default 50)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('at', l.created_at, 'kind', l.kind, 'name', l.ref_name, 'amount', l.amount, 'note', l.note,
            'admin', coalesce(a.display_name, a.username)) order by l.created_at desc), '[]'::jsonb)
          from (select * from public.admin_grant_log where target_id = p_user order by created_at desc limit p_limit) l
          left join public.profiles a on a.id = l.admin_id);
end $$;
grant execute on function public.rvn_admin_grant_log(uuid, int) to authenticated;
