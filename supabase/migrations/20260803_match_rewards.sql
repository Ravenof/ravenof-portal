-- ════════════════════════════════════════════════════════════════════════════
--  Ravenof — Kovos atlygis (XP) + level-up šventė  (retention #3)
--  Kiekviena PvE/PvP unranked kova skiria XP (ir už pergalę, ir už pralaimėjimą,
--  mažiau). XP įrašomas į xp_transactions (source_type='match'); profiles.xp_total
--  ir level atnaujina esamas trigeris. Grąžina prieš/po sumas, kad klientas
--  aptiktų level-up (levels.ts = tiesos šaltinis).
--  Ranked ir campaign turi savo XP kelius — jų NEliečiam.
-- ════════════════════════════════════════════════════════════════════════════

-- ── xp_transactions CHECK: leisti 'match' šaltinį ───────────────────────────
do $$
declare v_list text;
begin
  alter table public.xp_transactions drop constraint if exists xp_transactions_source_type_check;
  select string_agg(v, ',') into v_list
    from (select distinct quote_literal(source_type) as v from public.xp_transactions) q;
  v_list := coalesce(v_list || ',', '') ||
    $q$'event_attendance','deck_published','deck_upvote_received','deck_downvote_received','deck_copied','collection_milestone','manual_admin_adjustment','badge_unlocked','ranked_match','ranked_reward','ranked_achievement','ranked_season','daily_quest','login_streak','season_pass','campaign_mission','tutorial','match'$q$;
  execute 'alter table public.xp_transactions add constraint xp_transactions_source_type_check check (source_type in (' || v_list || '))';
end $$;

-- ── RPC: kovos rezultatas → XP ──────────────────────────────────────────────
create or replace function public.rvn_report_match(p_won boolean, p_mode text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_xp    int  := 0;
  v_before bigint := 0;
  v_after  bigint := 0;
  v_reason text;
begin
  if v_uid is null then
    return jsonb_build_object('xpGained', 0, 'totalBefore', 0, 'totalAfter', 0);
  end if;

  -- XP pagal režimą ir rezultatą (nedideli, kad progresas jaustųsi bet nebūtų infliacijos)
  v_xp := case p_mode
    when 'pvp'        then case when p_won then 60 else 20 end
    when 'pve_hard'   then case when p_won then 45 else 12 end
    when 'pve_normal' then case when p_won then 25 else 8  end
    when 'pve_easy'   then case when p_won then 15 else 5  end
    else                   case when p_won then 20 else 6  end
  end;

  select coalesce(xp_total, 0) into v_before from public.profiles where id = v_uid;

  if v_xp > 0 then
    v_reason := case when p_won then 'Kovos pergalė' else 'Sužaista kova' end;
    insert into public.xp_transactions (user_id, amount, reason, source_type)
      values (v_uid, v_xp, v_reason, 'match');
  end if;

  select coalesce(xp_total, 0) into v_after from public.profiles where id = v_uid;
  -- Jei bazinis trigeris xp_total dar neatnaujino, garantuojam intuityvią sumą,
  -- kad klientas patikimai aptiktų level-up (levels.ts skaičiuoja lygį iš sumos).
  v_after := greatest(v_after, v_before + v_xp);

  return jsonb_build_object(
    'xpGained',    v_xp,
    'totalBefore', v_before,
    'totalAfter',  v_after
  );
end $$;

grant execute on function public.rvn_report_match(boolean, text) to authenticated;
