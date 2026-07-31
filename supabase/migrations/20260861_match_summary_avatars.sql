-- ════════════════════════════════════════════════════════════════════════════
-- FOLLOW-UP PAKETAS (audit #11/#15 + kosmetikos propagacija + atlygio tiesa):
--   1) rvn_get_recent_achievements — ką tik įvykdyti pasiekimai VIENAI tvarkingai
--      po-kovos santraukai (vietoj kelių blokuojančių popup'ų / jokios info).
--   2) rvn__avatar_src + rvn_leaderboard su tikru avataru: aktyvi kosmetika →
--      avatar_url → botų emoji (lyderių lentelė nebe 🎴 visiems).
--   3) rvn_get_match_reward_preview — kovos atlygių KONFIGŪRACIJOS peržiūra
--      klientui (PvE „Numatomas atlygis" rodys serverio tiesą, ne klientines
--      konstantas 10/25/50).
-- Idempotentiška; duomenų nekeičia.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Ką tik įvykdyti pasiekimai (po-kovos santraukai) ──────────────────────
create or replace function public.rvn_get_recent_achievements(p_seconds int default 90)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_out jsonb;
begin
  if v_uid is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'code', a.code, 'name', a.name_lt, 'badgeFile', a.badge_file,
           'rewards', coalesce(a.rewards, '[]'::jsonb),
           'completedAt', p.completed_at
         ) order by p.completed_at asc), '[]'::jsonb)
    into v_out
    from public.rvn_achievement_progress p
    join public.rvn_achievements a on a.code = p.code
   where p.user_id = v_uid
     and p.completed_at is not null
     and p.completed_at >= now() - make_interval(secs => greatest(1, least(p_seconds, 600)));
  return v_out;
end $$;
grant execute on function public.rvn_get_recent_achievements(int) to authenticated;

-- ── 2) Avataro šaltinis: aktyvi kosmetika → avatar_url ───────────────────────
create or replace function public.rvn__avatar_src(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select c.image_url from public.profiles pr
       join public.cosmetics c on c.id = pr.equipped_avatar and c.kind = 'avatar'
      where pr.id = p_user and c.image_url is not null),
    (select pr.avatar_url from public.profiles pr where pr.id = p_user)
  )
$$;

create or replace function public.rvn_leaderboard(p_limit int default 100, p_offset int default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_season public.ranked_seasons; v_out jsonb;
begin
  v_season := public.rvn_active_season();
  with rows as (
    -- Tikri žaidėjai (avataras: aktyvi kosmetika → avatar_url)
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
    -- Botai (atrodo kaip tikri žaidėjai)
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
grant execute on function public.rvn_leaderboard(int, int) to authenticated;

-- ── 3) Kovos atlygių konfigūracijos peržiūra (tik ne slapti skaičiai) ────────
create or replace function public.rvn_get_match_reward_preview()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.economy_config where key = 'match_rewards'), '{}'::jsonb)
$$;
grant execute on function public.rvn_get_match_reward_preview() to authenticated;
