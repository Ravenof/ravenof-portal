-- ════════════════════════════════════════════════════════════════════════════
-- Ranked pataisos:
--  (1) xp_transactions CHECK tvarkingai apima ranked_* (be tylaus exception),
--  (2) rvn_report_ranked_match: saugesnis last_opponent_ids + array castai,
--  (3) botų tarpusavio kovų simuliacija (K/D + rangas), 2 k./d. per pg_cron.
-- ════════════════════════════════════════════════════════════════════════════

-- (1) EXP šaltinio tipų CHECK — dinamiškai: VISOS jau esančios reikšmės + ranked_*,
--     kad nepažeistų egzistuojančių eilučių (kitos migracijos pridėjo savų tipų).
do $$
declare v_existing text; v_list text;
begin
  alter table public.xp_transactions drop constraint if exists xp_transactions_source_type_check;
  select string_agg(v, ',') into v_existing
    from (select distinct quote_literal(source_type) as v from public.xp_transactions) q;
  v_list := coalesce(nullif(v_existing, ''), '');
  if v_list <> '' then v_list := v_list || ','; end if;
  v_list := v_list || $q$'event_attendance','deck_published','deck_upvote_received','deck_downvote_received','deck_copied','collection_milestone','manual_admin_adjustment','ranked_match','ranked_reward','ranked_achievement','ranked_season'$q$;
  execute 'alter table public.xp_transactions add constraint xp_transactions_source_type_check check (source_type in (' || v_list || '))';
end $$;

-- (2) Perkuriam match-report su saugiu last_opponent_ids (kintamasis, ne išraiškos slice)
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

  v_season := public.rvn_active_season();
  v_p := public.rvn_ensure_ranked_profile();

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

-- (3) Botų tarpusavio kovų simuliacija — generuoja K/D + judina rangą.
--     BE admin patikros, kad pg_cron galėtų kviesti (liečia tik botų lentelę).
create or replace function public.rvn_simulate_bot_matches(p_rounds int default 1)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_round int; ids uuid[]; i int; a uuid; b uuid; ra record; rb record;
  a_win boolean; v_played int := 0; v_chance numeric;
  a_k int; a_d int; b_k int; b_d int; a_dmg int; b_dmg int;
begin
  for v_round in 1..greatest(1, p_rounds) loop
    select array_agg(id order by random()) into ids from public.ranked_bots where active;
    if ids is null then return v_played; end if;
    i := 1;
    while i + 1 <= array_length(ids, 1) loop
      a := ids[i]; b := ids[i+1];
      select * into ra from public.ranked_bots where id = a;
      select * into rb from public.ranked_bots where id = b;
      v_chance := 0.5
        + (case ra.difficulty when 'hard' then 0.12 when 'easy' then -0.10 else 0 end)
        - (case rb.difficulty when 'hard' then 0.12 when 'easy' then -0.10 else 0 end)
        + greatest(-0.2, least(0.2, (ra.rank_step - rb.rank_step) * 0.01));
      a_win := random() < v_chance;
      if a_win then
        a_k := 3 + floor(random()*4)::int; a_d := floor(random()*3)::int;
        b_k := 1 + floor(random()*3)::int; b_d := 3 + floor(random()*4)::int;
      else
        b_k := 3 + floor(random()*4)::int; b_d := floor(random()*3)::int;
        a_k := 1 + floor(random()*3)::int; a_d := 3 + floor(random()*4)::int;
      end if;
      a_dmg := 20 + floor(random()*30)::int; b_dmg := 20 + floor(random()*30)::int;

      update public.ranked_bots set
        wins = wins + (case when a_win then 1 else 0 end),
        losses = losses + (case when a_win then 0 else 1 end),
        total_kills = total_kills + a_k, total_deaths = total_deaths + a_d,
        creatures_killed = creatures_killed + a_k, creatures_lost = creatures_lost + a_d,
        total_damage_dealt = total_damage_dealt + a_dmg, total_damage_taken = total_damage_taken + b_dmg,
        rank_step = case when a_win then least(rank_step+1,149)
                         when random() < 0.5 then greatest(rank_step-1,0) else rank_step end
      where id = a;

      update public.ranked_bots set
        wins = wins + (case when a_win then 0 else 1 end),
        losses = losses + (case when a_win then 1 else 0 end),
        total_kills = total_kills + b_k, total_deaths = total_deaths + b_d,
        creatures_killed = creatures_killed + b_k, creatures_lost = creatures_lost + b_d,
        total_damage_dealt = total_damage_dealt + b_dmg, total_damage_taken = total_damage_taken + a_dmg,
        rank_step = case when not a_win then least(rank_step+1,149)
                         when random() < 0.5 then greatest(rank_step-1,0) else rank_step end
      where id = b;

      v_played := v_played + 1;
      i := i + 2;
    end loop;
  end loop;
  return v_played;
end $$;

-- Admin apvalkalas mygtukui
create or replace function public.rvn_admin_simulate_bot_matches(p_rounds int default 1)
returns int language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return public.rvn_simulate_bot_matches(p_rounds);
end $$;
grant execute on function public.rvn_admin_simulate_bot_matches(int) to authenticated;

-- Pradinis užpildymas, kad botai iškart turėtų K/D
select public.rvn_simulate_bot_matches(3);

-- 2 k./d. botų kovos per pg_cron (jei įjungtas). Jei pg_cron nėra – nieko nedaro;
-- įjunk Supabase: Database → Extensions → pg_cron, tada paleisk šį bloką dar kartą.
do $$
begin
  perform cron.schedule('rvn-bot-matches-morning', '0 6 * * *',  'select public.rvn_simulate_bot_matches(1);');
  perform cron.schedule('rvn-bot-matches-evening', '0 18 * * *', 'select public.rvn_simulate_bot_matches(1);');
exception when others then
  raise notice 'pg_cron neprieinamas (%); botų kovas planuok rankiniu būdu arba per admin mygtuką.', sqlerrm;
end $$;

-- (4) „Lazy cron": jei pg_cron neįjungtas, botų kovos vis tiek vyksta ~2 k./d.,
--     kai kas nors atidaro Reitingo kovą (≥11 val. nuo paskutinio karto).
create table if not exists public.ranked_sim_state (
  id       boolean primary key default true,
  last_run timestamptz
);
insert into public.ranked_sim_state (id, last_run) values (true, null) on conflict (id) do nothing;
alter table public.ranked_sim_state enable row level security;
drop policy if exists ranked_sim_state_read on public.ranked_sim_state;
create policy ranked_sim_state_read on public.ranked_sim_state for select using (true);

create or replace function public.rvn_maybe_simulate_bot_matches()
returns boolean language plpgsql security definer set search_path = public as $$
declare v_last timestamptz; v_ran boolean := false;
begin
  -- užrakinam vienintelę eilutę, kad du klientai vienu metu nepaleistų dukart
  select last_run into v_last from public.ranked_sim_state where id = true for update;
  if v_last is null or now() - v_last >= interval '11 hours' then
    perform public.rvn_simulate_bot_matches(1);
    update public.ranked_sim_state set last_run = now() where id = true;
    v_ran := true;
  end if;
  return v_ran;
end $$;
grant execute on function public.rvn_maybe_simulate_bot_matches() to authenticated;
