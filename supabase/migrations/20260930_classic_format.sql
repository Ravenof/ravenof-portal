-- ════════════════════════════════════════════════════════════════════════════
-- KLASIKA (be ŽMK) — atskiras kovos formatas (2026-09-30)
-- ════════════════════════════════════════════════════════════════════════════
-- Formatas = 'zmk' (numatytasis, dabartinis žaidimas) arba 'classic' (be
-- modifikatorių: žala = kortų vertės). Klasika turi ATSKIRĄ reitingą ir eiles:
--   • ranked_seasons.format — vienas aktyvus sezonas KIEKVIENAM formatui;
--     ranked_profiles / queue / matches / rewards_claimed / user_achievements
--     raktuojami per season_id, tad atsiskiria automatiškai.
--   • pvp_matches.format — draugiškos kovos kambariai ir greita kova filtruojami
--     pagal formatą (klientas), ranked queue_poll kuria kambarį su sezono formatu.
--   • RPC gauna p_format (default 'zmk') — seni kvietimai be argumento veikia kaip
--     anksčiau. Senos nulinės signatūros DROP'inamos (PostgREST overload dviprasmybė).
--   • Botai (ranked_bots) — bendri abiem formatams (jų rangas rodomas abiejose lentelėse).
-- Bazuota į VĖLIAUSIAS apibrėžtis: rvn_report_ranked_match (20260623),
-- rvn_lock_ranked_deck / rvn_queue_join (20260856), rvn_leaderboard (20260861),
-- rvn_queue_poll (20260622), kitos — 20260620.

-- ── 1) Schema ────────────────────────────────────────────────────────────────
alter table public.ranked_seasons add column if not exists format text not null default 'zmk';
alter table public.ranked_seasons drop constraint if exists ranked_seasons_format_chk;
alter table public.ranked_seasons add constraint ranked_seasons_format_chk check (format in ('zmk','classic'));
drop index if exists public.ranked_seasons_one_active;
create unique index if not exists ranked_seasons_one_active_per_format
  on public.ranked_seasons (format) where is_active;

alter table public.pvp_matches add column if not exists format text not null default 'zmk';
alter table public.pvp_matches drop constraint if exists pvp_matches_format_chk;
alter table public.pvp_matches add constraint pvp_matches_format_chk check (format in ('zmk','classic'));
create index if not exists pvp_matches_format_idx on public.pvp_matches (format, status, is_public, created_at);

-- ── 2) Aktyvus sezonas PAGAL FORMATĄ ─────────────────────────────────────────
drop function if exists public.rvn_active_season();
create or replace function public.rvn_active_season(p_format text default 'zmk')
returns public.ranked_seasons language plpgsql security definer set search_path = public as $$
declare v_season public.ranked_seasons; v_name text; v_fmt text := case when p_format = 'classic' then 'classic' else 'zmk' end;
begin
  select * into v_season from public.ranked_seasons where is_active and format = v_fmt limit 1;
  if v_season.id is null then
    -- Klasikos sezonas gimsta lygiagrečiai ŽMK sezonui (tas pats pabaigos laikas, jei ŽMK sezonas yra)
    v_name := 'Sezonas ' || to_char(now(), 'YYYY') || '-' || to_char(now(), 'MM') || case when v_fmt = 'classic' then ' · Klasika' else '' end;
    insert into public.ranked_seasons (name, start_date, end_date, is_active, format)
      values (v_name, now(),
        coalesce((select end_date from public.ranked_seasons where is_active and format = 'zmk' and end_date > now() limit 1), now() + interval '90 days'),
        true, v_fmt)
      returning * into v_season;
  end if;
  return v_season;
end $$;
grant execute on function public.rvn_active_season(text) to authenticated;

-- ── 3) Profilis / deck-lock / eilė ───────────────────────────────────────────
drop function if exists public.rvn_ensure_ranked_profile();
create or replace function public.rvn_ensure_ranked_profile(p_format text default 'zmk')
returns public.ranked_profiles language plpgsql security definer set search_path = public as $$
declare v_season public.ranked_seasons; v_p public.ranked_profiles;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  v_season := public.rvn_active_season(p_format);
  select * into v_p from public.ranked_profiles where user_id = auth.uid() and season_id = v_season.id;
  if v_p.user_id is null then
    insert into public.ranked_profiles (user_id, season_id) values (auth.uid(), v_season.id)
      on conflict (user_id, season_id) do nothing;
    select * into v_p from public.ranked_profiles where user_id = auth.uid() and season_id = v_season.id;
  end if;
  return v_p;
end $$;
grant execute on function public.rvn_ensure_ranked_profile(text) to authenticated;

drop function if exists public.rvn_lock_ranked_deck(uuid);
create or replace function public.rvn_lock_ranked_deck(p_deck_id uuid, p_format text default 'zmk')
returns void language plpgsql security definer set search_path = public as $$
declare v_season public.ranked_seasons;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.decks where id = p_deck_id and user_id = auth.uid()) then
    raise exception 'deck not found or not owned';
  end if;
  if not public.rvn__deck_size_ok(p_deck_id) then
    raise exception 'deck_size_invalid: leidžiama 30–40 kortų (dabar %)', public.rvn__deck_main_count(p_deck_id);
  end if;
  v_season := public.rvn_active_season(p_format);
  perform public.rvn_ensure_ranked_profile(p_format);
  update public.ranked_profiles set locked_deck_id = p_deck_id
    where user_id = auth.uid() and season_id = v_season.id;
end $$;
grant execute on function public.rvn_lock_ranked_deck(uuid, text) to authenticated;

drop function if exists public.rvn_queue_join(uuid);
create or replace function public.rvn_queue_join(p_deck_id uuid, p_format text default 'zmk')
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_season public.ranked_seasons; v_p public.ranked_profiles;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.decks where id=p_deck_id and user_id=v_uid) then raise exception 'invalid deck'; end if;
  if not public.rvn__deck_size_ok(p_deck_id) then
    raise exception 'deck_size_invalid: leidžiama 30–40 kortų (dabar %)', public.rvn__deck_main_count(p_deck_id);
  end if;
  v_season := public.rvn_active_season(p_format);
  v_p := public.rvn_ensure_ranked_profile(p_format);
  insert into public.ranked_queue (user_id, season_id, rank_step, deck_id)
    values (v_uid, v_season.id, v_p.rank_step, p_deck_id)
    on conflict (user_id) do update set season_id=excluded.season_id, rank_step=excluded.rank_step, deck_id=excluded.deck_id, enqueued_at=now(), matched_with=null, match_id=null;
end $$;
grant execute on function public.rvn_queue_join(uuid, text) to authenticated;

-- queue_poll: poruojama TIK tame pačiame sezone (= tame pačiame formate); kambarys gauna sezono formatą
create or replace function public.rvn_queue_poll(p_range int default 3)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_me public.ranked_queue;
  v_opp public.ranked_queue;
  v_match_id uuid;
  v_host uuid; v_guest uuid; v_host_deck uuid; v_guest_deck uuid;
  v_host_name text; v_guest_name text;
  v_is_host boolean; v_format text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_me from public.ranked_queue where user_id = v_uid;
  if v_me.user_id is null then return jsonb_build_object('status','left'); end if;

  if v_me.match_id is not null then
    select host_id into v_host from public.pvp_matches where id = v_me.match_id;
    return jsonb_build_object('status','matched', 'matchId', v_me.match_id::text,
      'isHost', (v_host = v_uid), 'opponent', v_me.matched_with::text);
  end if;

  select * into v_opp from public.ranked_queue
    where user_id <> v_uid and matched_with is null and match_id is null
      and season_id = v_me.season_id
      and abs(rank_step - v_me.rank_step) <= p_range
    order by enqueued_at asc
    for update skip locked
    limit 1;

  if v_opp.user_id is null then
    return jsonb_build_object('status','waiting');
  end if;

  select coalesce(format, 'zmk') into v_format from public.ranked_seasons where id = v_me.season_id;

  v_host := v_opp.user_id; v_host_deck := v_opp.deck_id;
  v_guest := v_uid;        v_guest_deck := v_me.deck_id;
  select coalesce(display_name, username, 'Žaidėjas') into v_host_name from public.profiles where id = v_host;
  select coalesce(display_name, username, 'Žaidėjas') into v_guest_name from public.profiles where id = v_guest;

  insert into public.pvp_matches (is_public, status, host_id, host_deck_id, host_name, guest_id, guest_deck_id, guest_name, format)
    values (true, 'ready', v_host, v_host_deck, v_host_name, v_guest, v_guest_deck, v_guest_name, coalesce(v_format, 'zmk'))
    returning id into v_match_id;

  update public.ranked_queue set matched_with = v_guest, match_id = v_match_id where user_id = v_host;
  update public.ranked_queue set matched_with = v_host,  match_id = v_match_id where user_id = v_guest;

  v_is_host := (v_host = v_uid);
  return jsonb_build_object('status','matched', 'matchId', v_match_id::text,
    'isHost', v_is_host, 'opponent', v_opp.user_id::text);
end $$;
grant execute on function public.rvn_queue_poll(int) to authenticated;

-- ── 4) Atlygiai / pasiekimai / botas / lyderių lentelė ───────────────────────
drop function if exists public.rvn_claim_ranked_reward(text);
create or replace function public.rvn_claim_ranked_reward(p_key text, p_format text default 'zmk')
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_season public.ranked_seasons; v_p public.ranked_profiles; v_r public.ranked_rewards;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  v_season := public.rvn_active_season(p_format);
  v_p := public.rvn_ensure_ranked_profile(p_format);
  select * into v_r from public.ranked_rewards where reward_key = p_key and active;
  if v_r.reward_key is null then raise exception 'reward not found'; end if;
  if v_p.best_rank_step < v_r.required_rank_step then raise exception 'requirement not met'; end if;
  if exists (select 1 from public.ranked_rewards_claimed where user_id=v_uid and season_id=v_season.id and reward_key=p_key) then
    raise exception 'already claimed';
  end if;
  insert into public.ranked_rewards_claimed (user_id, season_id, reward_key) values (v_uid, v_season.id, p_key);
  perform public.rvn__grant_payload(v_uid, v_r.reward_payload, 'ranked_reward');
end $$;
grant execute on function public.rvn_claim_ranked_reward(text, text) to authenticated;

drop function if exists public.rvn_claim_ranked_achievement(text);
create or replace function public.rvn_claim_ranked_achievement(p_key text, p_format text default 'zmk')
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_season public.ranked_seasons; v_a public.ranked_achievements; v_ua public.ranked_user_achievements;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  v_season := public.rvn_active_season(p_format);
  perform public.rvn_ensure_ranked_profile(p_format);
  select * into v_a from public.ranked_achievements where achievement_key = p_key and active;
  if v_a.achievement_key is null then raise exception 'achievement not found'; end if;
  select * into v_ua from public.ranked_user_achievements where user_id=v_uid and season_id=v_season.id and achievement_key=p_key;
  if v_ua.achievement_key is null or not v_ua.completed then raise exception 'not completed'; end if;
  if v_ua.claimed then raise exception 'already claimed'; end if;
  update public.ranked_user_achievements set claimed=true, claimed_at=now()
    where user_id=v_uid and season_id=v_season.id and achievement_key=p_key;
  perform public.rvn__grant_payload(v_uid, v_a.reward_payload, 'ranked_achievement');
end $$;
grant execute on function public.rvn_claim_ranked_achievement(text, text) to authenticated;

drop function if exists public.rvn_pick_bot();
create or replace function public.rvn_pick_bot(p_format text default 'zmk')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_p public.ranked_profiles; v_bot public.ranked_bots; v_last text[];
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  v_p := public.rvn_ensure_ranked_profile(p_format);
  v_last := v_p.last_opponent_ids;
  select * into v_bot from public.ranked_bots
    where active and not (slug = any(v_last[1:2]))
    order by abs(rank_step - v_p.rank_step), random() limit 1;
  if v_bot.slug is null then
    select * into v_bot from public.ranked_bots where active
      order by abs(rank_step - v_p.rank_step), random() limit 1;
  end if;
  if v_bot.slug is null then raise exception 'no bots available'; end if;
  return jsonb_build_object(
    'slug', v_bot.slug, 'name', v_bot.name, 'avatar', v_bot.avatar,
    'faction', v_bot.faction, 'faction_slug', v_bot.faction_slug,
    'rank_step', v_bot.rank_step, 'difficulty', v_bot.difficulty
  );
end $$;
grant execute on function public.rvn_pick_bot(text) to authenticated;

drop function if exists public.rvn_leaderboard(int, int);
create or replace function public.rvn_leaderboard(p_limit int default 100, p_offset int default 0, p_format text default 'zmk')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_season public.ranked_seasons; v_out jsonb;
begin
  v_season := public.rvn_active_season(p_format);
  with rows as (
    select
      false as is_bot, rp.user_id::text as entity_id,
      coalesce(pr.display_name, pr.username, 'Žaidėjas') as name,
      public.rvn__avatar_src(rp.user_id) as avatar,
      rp.rank_step, rp.wins, rp.losses, rp.wins_vs_real, rp.win_streak,
      rp.best_rank_step, rp.main_faction, rp.total_kills, rp.total_deaths, rp.updated_at,
      (rp.user_id = v_uid) as is_me
    from public.ranked_profiles rp
    join public.profiles pr on pr.id = rp.user_id
    where rp.season_id = v_season.id and (rp.wins + rp.losses) > 0
    union all
    select
      true as is_bot, b.slug as entity_id, b.name, b.avatar,
      b.rank_step, b.wins, b.losses, b.wins_vs_real, 0 as win_streak,
      greatest(b.rank_step, b.rank_step) as best_rank_step, b.faction as main_faction,
      b.total_kills, b.total_deaths, b.updated_at, false as is_me
    from public.ranked_bots b
    where b.active
  ), ranked as (
    select *,
      case when (wins+losses) > 0 then round(wins::numeric/(wins+losses), 4) else 0 end as win_rate,
      case when total_deaths > 0 then round(total_kills::numeric/total_deaths, 2)
           else total_kills::numeric end as kd_ratio,
      row_number() over (order by
        rank_step desc, wins_vs_real desc, wins desc,
        (case when (wins+losses)>0 then wins::numeric/(wins+losses) else 0 end) desc,
        (case when total_deaths>0 then total_kills::numeric/total_deaths else total_kills end) desc,
        win_streak desc, (wins+losses) desc, updated_at asc
      ) as position
    from rows
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'position', position, 'is_bot', is_bot, 'entity_id', entity_id,
    'name', name, 'avatar', avatar, 'rank_step', rank_step,
    'rank_number', public.rvn_rank_number(rank_step), 'medal_tier', public.rvn_medal_tier(rank_step),
    'wins', wins, 'losses', losses, 'win_rate', win_rate, 'kd_ratio', kd_ratio,
    'wins_vs_real', wins_vs_real, 'win_streak', win_streak, 'best_rank_step', best_rank_step,
    'main_faction', main_faction, 'is_me', is_me
  ) order by position), '[]'::jsonb) into v_out
  from ranked where position > p_offset and position <= p_offset + p_limit;
  return v_out;
end $$;
grant execute on function public.rvn_leaderboard(int, int, text) to authenticated;

-- ── 5) Kovos rezultatas: formatas iš payload ('format': 'zmk' | 'classic') ──
--     (pilna 20260623 apibrėžtis; pakeistos TIK sezono/profilio eilutės)
create or replace function public.rvn_report_ranked_match(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_season public.ranked_seasons;
  v_p public.ranked_profiles;
  v_kind text := p_payload->>'opponentKind';
  v_opp_id text := p_payload->>'opponentId';
  v_opp_name text := coalesce(p_payload->>'opponentName', 'Priešininkas');
  v_opp_step int := coalesce((p_payload->>'opponentRankStep')::int, 0);
  v_result text := p_payload->>'result';
  v_pfac text := p_payload->>'playerFaction';
  v_ofac text := p_payload->>'opponentFaction';
  v_dur int := coalesce((p_payload->>'durationSeconds')::int, 0);
  v_turns int := coalesce((p_payload->>'turnsPlayed')::int, 0);
  v_stats jsonb := coalesce(p_payload->'stats', '{}'::jsonb);
  v_cmid text := p_payload->>'clientMatchId';
  v_format text := case when p_payload->>'format' = 'classic' then 'classic' else 'zmk' end;
  v_before int; v_loss_before int; v_after int; v_loss_after int; v_change text;
  v_exp int := 0; v_gold int := 0; v_match_id uuid;
  v_nn int; v_new_number int := null; v_medal text;
  v_hp_rem int := coalesce((v_stats->>'hpRemaining')::int, 0);
  v_hp_low int := coalesce((v_stats->>'hpLowest')::int, 99);
  v_ck int := coalesce((v_stats->>'creaturesKilled')::int, 0);
  v_cl int := coalesce((v_stats->>'creaturesLost')::int, 0);
  v_chk int := coalesce((v_stats->>'championsKilled')::int, 0);
  v_chl int := coalesce((v_stats->>'championsLost')::int, 0);
  v_tk int := coalesce((v_stats->>'totalKills')::int, v_ck + v_chk);
  v_td int := coalesce((v_stats->>'totalDeaths')::int, v_cl + v_chl);
  v_dd int := coalesce((v_stats->>'damageDealtToEnemyPlayer')::int, 0);
  v_dt int := coalesce((v_stats->>'damageTaken')::int, 0);
  v_unlocked text[] := array[]::text[];
  v_completed text[] := array[]::text[];
  v_last_ids text[];
  v_is_real boolean := (v_kind = 'real');
  ach record; v_prog int; v_done boolean;
  v_wins_vs_bot int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_result not in ('win','loss') then raise exception 'invalid result'; end if;
  if v_kind not in ('bot','real') then raise exception 'invalid opponent kind'; end if;

  v_season := public.rvn_active_season(v_format);
  v_p := public.rvn_ensure_ranked_profile(v_format);

  if v_cmid is not null and exists (
    select 1 from public.ranked_matches where player_id = v_uid and client_match_id = v_cmid
  ) then
    raise exception 'duplicate match submission';
  end if;

  v_before := v_p.rank_step;
  v_loss_before := v_p.loss_counter;

  if v_result = 'win' then
    v_after := least(v_before + 1, 149);
    v_loss_after := 0;
    v_change := case when v_after > v_before then 'up' else 'same' end;
  else
    if v_loss_before + 1 >= 2 then
      v_after := greatest(v_before - 1, 0);
      v_loss_after := 0;
      v_change := case when v_after < v_before then 'down' else 'same' end;
    else
      v_after := v_before;
      v_loss_after := v_loss_before + 1;
      v_change := 'same';
    end if;
  end if;

  if v_result = 'win' then v_exp := v_exp + 20; end if;
  if v_change = 'up' then
    v_medal := public.rvn_medal_tier(v_after);
    v_exp := v_exp + 50 + case v_medal when 'bronze' then 25 when 'silver' then 50 else 75 end;
    v_nn := public.rvn_rank_number(v_after);
    if not (v_nn = any(v_p.reached_numbers)) then
      v_new_number := v_nn;
      v_gold := v_gold + 100;
    end if;
  end if;

  -- saugus anti-repeat sąrašas (kintamojo slice, ne išraiškos)
  v_last_ids := array[coalesce(v_opp_id, '')] || v_p.last_opponent_ids;
  if array_length(v_last_ids, 1) > 3 then v_last_ids := v_last_ids[1:3]; end if;

  update public.ranked_profiles set
    rank_step = v_after,
    loss_counter = v_loss_after,
    wins = wins + (case when v_result='win' then 1 else 0 end),
    losses = losses + (case when v_result='loss' then 1 else 0 end),
    wins_vs_real = wins_vs_real + (case when v_result='win' and v_is_real then 1 else 0 end),
    losses_vs_real = losses_vs_real + (case when v_result='loss' and v_is_real then 1 else 0 end),
    win_streak = (case when v_result='win' then win_streak + 1 else 0 end),
    best_win_streak = greatest(best_win_streak, (case when v_result='win' then win_streak + 1 else 0 end)),
    best_rank_step = greatest(best_rank_step, v_after),
    reached_numbers = (case when v_new_number is not null then array_append(reached_numbers, v_new_number) else reached_numbers end),
    portal_exp_earned = portal_exp_earned + v_exp,
    ranked_gold_earned = ranked_gold_earned + v_gold,
    creatures_killed = creatures_killed + v_ck,
    creatures_lost = creatures_lost + v_cl,
    champions_killed = champions_killed + v_chk,
    champions_lost = champions_lost + v_chl,
    total_kills = total_kills + v_tk,
    total_deaths = total_deaths + v_td,
    total_damage_dealt = total_damage_dealt + v_dd,
    total_damage_taken = total_damage_taken + v_dt,
    main_faction = coalesce(v_pfac, main_faction),
    last_opponent_ids = v_last_ids
  where user_id = v_uid and season_id = v_season.id
  returning * into v_p;

  if v_exp > 0 then
    insert into public.xp_transactions (user_id, amount, reason, source_type)
      values (v_uid, v_exp, 'Reitingo kova', 'ranked_match');
  end if;
  if v_gold > 0 then
    update public.profiles set gold = gold + v_gold where id = v_uid;
  end if;

  insert into public.ranked_matches (
    season_id, player_id, opponent_kind, opponent_id, opponent_name, opponent_rank_step,
    player_faction, opponent_faction, result, rank_step_before, rank_step_after,
    loss_counter_before, loss_counter_after, rank_change, reason, duration_seconds,
    turns_played, player_stats, exp_gained, gold_gained, client_match_id
  ) values (
    v_season.id, v_uid, v_kind, v_opp_id, v_opp_name, v_opp_step,
    v_pfac, v_ofac, v_result, v_before, v_after,
    v_loss_before, v_loss_after, v_change,
    (case when v_result='loss' and v_change='down' then 'second_loss' else 'match' end),
    v_dur, v_turns, v_stats, v_exp, v_gold, v_cmid
  ) returning id into v_match_id;

  if v_kind = 'bot' and v_opp_id is not null then
    update public.ranked_bots set
      wins = wins + (case when v_result='loss' then 1 else 0 end),
      losses = losses + (case when v_result='win' then 1 else 0 end),
      wins_vs_real = wins_vs_real + (case when v_result='loss' then 1 else 0 end),
      losses_vs_real = losses_vs_real + (case when v_result='win' then 1 else 0 end),
      creatures_killed = creatures_killed + v_cl,
      creatures_lost = creatures_lost + v_ck,
      total_kills = total_kills + v_td,
      total_deaths = total_deaths + v_tk,
      total_damage_dealt = total_damage_dealt + v_dt,
      total_damage_taken = total_damage_taken + v_dd
    where slug = v_opp_id;
  end if;

  v_wins_vs_bot := v_p.wins - v_p.wins_vs_real;
  for ach in select * from public.ranked_achievements where active loop
    v_prog := 0; v_done := false;
    case ach.requirement_type
      when 'wins' then v_prog := v_p.wins; v_done := v_p.wins >= ach.requirement_value;
      when 'reach_rank' then
        v_done := public.rvn_rank_number(v_p.best_rank_step) <= ach.requirement_value;
        v_prog := case when v_done then ach.requirement_value else 0 end;
      when 'win_streak' then v_prog := v_p.best_win_streak; v_done := v_p.best_win_streak >= ach.requirement_value;
      when 'beat_higher' then
        v_prog := (case when v_result='win' and v_opp_step > v_before then 1 else 0 end);
        v_done := v_prog >= 1;
      when 'comeback' then
        v_prog := (case when v_result='win' and v_hp_low < 10 then 1 else 0 end);
        v_done := v_prog >= 1;
      when 'flawless' then
        v_prog := (case when v_result='win' and v_hp_rem >= 20 then 1 else 0 end);
        v_done := v_prog >= 1;
      when 'beat_bots' then v_prog := v_wins_vs_bot; v_done := v_wins_vs_bot >= ach.requirement_value;
      when 'beat_real' then v_prog := v_p.wins_vs_real; v_done := v_p.wins_vs_real >= ach.requirement_value;
      when 'season_games' then v_prog := v_p.wins + v_p.losses; v_done := (v_p.wins + v_p.losses) >= ach.requirement_value;
      when 'kd_ratio' then
        v_prog := (case when (v_p.wins+v_p.losses) >= 20 and
          (case when v_p.total_deaths > 0 then v_p.total_kills::numeric / v_p.total_deaths else v_p.total_kills end) >= ach.requirement_value
          then 1 else 0 end);
        v_done := v_prog >= 1;
      else v_prog := 0;
    end case;

    insert into public.ranked_user_achievements (user_id, season_id, achievement_key, progress, completed, completed_at)
      values (v_uid, v_season.id, ach.achievement_key, v_prog, v_done, case when v_done then now() else null end)
    on conflict (user_id, season_id, achievement_key) do update set
      progress = greatest(public.ranked_user_achievements.progress, excluded.progress),
      completed = public.ranked_user_achievements.completed or excluded.completed,
      completed_at = coalesce(public.ranked_user_achievements.completed_at, excluded.completed_at);

    if v_done and exists (
      select 1 from public.ranked_user_achievements
      where user_id=v_uid and season_id=v_season.id and achievement_key=ach.achievement_key and not claimed
    ) then
      v_completed := array_append(v_completed, ach.achievement_key);
    end if;
  end loop;

  select coalesce(array_agg(r.reward_key), array[]::text[]) into v_unlocked
  from public.ranked_rewards r
  where r.active and r.required_rank_step <= v_p.best_rank_step
    and not exists (select 1 from public.ranked_rewards_claimed c
                    where c.user_id=v_uid and c.season_id=v_season.id and c.reward_key=r.reward_key);

  return jsonb_build_object(
    'rankStepBefore', v_before,
    'rankStepAfter', v_after,
    'rankChange', v_change,
    'lossCounterBefore', v_loss_before,
    'lossCounterAfter', v_loss_after,
    'hitFloor', (v_result='loss' and v_before=0),
    'hitCeiling', (v_result='win' and v_before=149),
    'expGained', v_exp,
    'goldGained', v_gold,
    'newRankNumberReached', v_new_number,
    'unlockedRewardKeys', to_jsonb(v_unlocked),
    'completedAchievementKeys', to_jsonb(v_completed),
    'matchId', v_match_id
  );
end $$;
grant execute on function public.rvn_report_ranked_match(jsonb) to authenticated;

-- ── 6) Klasikos sezonas iš karto (kad tab'as neatrodytų tuščias) ─────────────
select public.rvn_active_season('classic');
