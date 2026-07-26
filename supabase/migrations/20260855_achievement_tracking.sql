-- ════════════════════════════════════════════════════════════════════════════
--  PASIEKIMŲ SEKIMO VARIKLIS (20260851 paliktas TODO: „kai atsiras kabliukai")
--  ─────────────────────────────────────────────────────────────────────────
--  Iki šiol rvn_achievement_progress NIEKAS nerašė, todėl visi 70 pasiekimų
--  amžinai kabėjo ties 0/70. Čia:
--    • rvn__ach_set()            – progreso upsert + užbaigimas + ATLYGIS
--    • rvn_recheck_achievements()– perskaičiuoja VISKĄ iš esamų agregatų
--    • rvn_sync_achievements()   – recheck + snapshot vienu iškvietimu (UI)
--    • trigeris ant `matches`    – perskaičiuoja iškart po kovos statistikos
--
--  Duomenų šaltiniai (visi jau egzistuoja): matches (21 metrika), decks,
--  user_collections + cards + rarities, ranked_profiles, user_daily_quests_v2,
--  profiles. Naujų skaitiklių lentelių NEKURIAM.
--
--  ❗ 16 pasiekimų LIEKA NESEKAMI, nes variklis tokios telemetrijos nesiunčia
--  (grandinės gylis, tribute, Champion III fazė, vieno efekto 3 taikiniai,
--  kaladės sudėtis kovos metu, sezono pabaigos pakopa, prisijungimų serija,
--  bendruomenės balsai): 20, 24, 25, 26, 27, 28, 38, 39, 40, 60, 65, 66, 67,
--  68, 69, 70. Jie pažymimi `target = 0` → UI rodo „dar nesekama", o ne melagingą 0/1.
--  Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Tikslai (target) ────────────────────────────────────────────────────
update public.rvn_achievements set target = v.t from (values
  ('ach_01',1),('ach_02',1),('ach_03',1),('ach_04',1),('ach_05',1),('ach_06',1),('ach_07',1),('ach_08',1),
  ('ach_09',10),('ach_10',50),('ach_11',100),('ach_12',250),
  ('ach_13',10),('ach_14',50),('ach_15',100),('ach_16',250),('ach_17',3),('ach_18',5),
  ('ach_19',1),('ach_21',50),('ach_22',1),('ach_23',100),('ach_29',1),('ach_30',1),
  ('ach_31',5),('ach_32',3),('ach_33',3),('ach_34',8),('ach_35',8),('ach_36',10),('ach_37',50),
  ('ach_41',1),('ach_42',50),('ach_43',100),('ach_44',200),('ach_45',300),
  ('ach_46',1),('ach_47',1),('ach_48',1),('ach_49',1),('ach_50',8),
  ('ach_51',1),('ach_52',1),('ach_53',10),('ach_54',50),('ach_55',100),
  ('ach_56',1),('ach_57',1),('ach_58',1),('ach_59',50),
  ('ach_61',1),('ach_62',1),('ach_63',25),('ach_64',100)
) as v(code,t) where public.rvn_achievements.code = v.code;

-- dar nesekami – aiškiai pažymim nuliu, kad UI nemeluotų
update public.rvn_achievements set target = 0
 where code in ('ach_20','ach_24','ach_25','ach_26','ach_27','ach_28','ach_38','ach_39','ach_40',
                'ach_60','ach_65','ach_66','ach_67','ach_68','ach_69','ach_70');

-- ── 2) Progreso rašiklis (+ automatinis atlygis) ───────────────────────────
create or replace function public.rvn__ach_set(p_user uuid, p_code text, p_progress int)
returns void language plpgsql security definer set search_path = public as $$
declare v_target int; v_done timestamptz; v_rewards jsonb;
begin
  select target, rewards into v_target, v_rewards from public.rvn_achievements
   where code = p_code and is_active;
  if v_target is null or v_target <= 0 then return; end if;   -- nesekamas

  insert into public.rvn_achievement_progress(user_id, code, progress, updated_at)
    values (p_user, p_code, greatest(0, p_progress), now())
  on conflict (user_id, code) do update
    set progress = greatest(public.rvn_achievement_progress.progress, excluded.progress),
        updated_at = now();

  select completed_at into v_done from public.rvn_achievement_progress
   where user_id = p_user and code = p_code;

  if v_done is null and p_progress >= v_target then
    update public.rvn_achievement_progress
       set completed_at = now(), granted_at = now()
     where user_id = p_user and code = p_code;
    -- atlygis skiriamas AUTOMATIŠKAI (jokio „Claim"), per bendrą variklį
    if v_rewards is not null and jsonb_array_length(v_rewards) > 0 then
      perform public.rvn__grant_rewards_v2(p_user, v_rewards, 'achievement', p_code);
    end if;
  end if;
end $$;

-- ── 3) Perskaičiavimas iš esamų agregatų ───────────────────────────────────
create or replace function public.rvn_recheck_achievements(p_user uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(p_user, auth.uid());
  v_p public.profiles%rowtype;
  n_matches int; n_wins int; n_pvp_wins int; n_streak int; n_pvp_streak int;
  n_react int; n_bcry int; n_low_hp int; n_flawless int; n_decks int;
  n_fac_played int; n_fac_won int; n_fac_best_wins int;
  n_uniq int; n_rare int; n_epic int; n_leg int; n_champ int; n_fac_ten int;
  n_rk_matches int; n_rk_wins int; n_best_step int;
  n_dq int; n_dq_full int;
  v_before int; v_after int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  select * into v_p from public.profiles where id = v_uid;
  if v_p.id is null then return jsonb_build_object('error','no_profile'); end if;

  select count(*) into v_before from public.rvn_achievement_progress
   where user_id = v_uid and completed_at is not null;

  -- ── Pradžia ir profilis ──
  perform public.rvn__ach_set(v_uid, 'ach_01', 1);
  perform public.rvn__ach_set(v_uid, 'ach_02', case when coalesce(v_p.username,'') <> '' then 1 else 0 end);
  perform public.rvn__ach_set(v_uid, 'ach_03', case when v_p.equipped_avatar is not null or v_p.avatar_url is not null then 1 else 0 end);
  perform public.rvn__ach_set(v_uid, 'ach_04', case when v_p.digital_onboarded_at is not null then 1 else 0 end);
  select count(*) into n_decks from public.decks where user_id = v_uid and coalesce(card_count,0) between 30 and 40;
  perform public.rvn__ach_set(v_uid, 'ach_05', least(1, n_decks));
  perform public.rvn__ach_set(v_uid, 'ach_08', case
    when (v_p.equipped_avatar is not null or v_p.avatar_url is not null)
     and coalesce(array_length(v_p.featured_achievements, 1), 0) > 0 then 1 else 0 end);

  -- ── Kovos ──
  select count(*), count(*) filter (where result = 'win'),
         count(*) filter (where result = 'win' and mode in ('ranked','unranked')),
         count(*) filter (where result = 'win' and hp_remaining between 1 and 5),
         count(*) filter (where result = 'win' and coalesce(hp_lost, 0) = 0),
         coalesce(sum(reactions_triggered), 0),
         coalesce(sum(coalesce(battlecries,0) + coalesce(summons_by_effect,0)), 0)
    into n_matches, n_wins, n_pvp_wins, n_low_hp, n_flawless, n_react, n_bcry
    from public.matches where user_id = v_uid;

  perform public.rvn__ach_set(v_uid, 'ach_06', least(1, n_matches));
  perform public.rvn__ach_set(v_uid, 'ach_07', least(1, n_wins));
  perform public.rvn__ach_set(v_uid, 'ach_09', n_matches);
  perform public.rvn__ach_set(v_uid, 'ach_10', n_matches);
  perform public.rvn__ach_set(v_uid, 'ach_11', n_matches);
  perform public.rvn__ach_set(v_uid, 'ach_12', n_matches);
  perform public.rvn__ach_set(v_uid, 'ach_13', n_pvp_wins);
  perform public.rvn__ach_set(v_uid, 'ach_14', n_pvp_wins);
  perform public.rvn__ach_set(v_uid, 'ach_15', n_pvp_wins);
  perform public.rvn__ach_set(v_uid, 'ach_16', n_pvp_wins);
  perform public.rvn__ach_set(v_uid, 'ach_29', n_low_hp);
  perform public.rvn__ach_set(v_uid, 'ach_30', n_flawless);
  perform public.rvn__ach_set(v_uid, 'ach_19', least(1, n_react));
  perform public.rvn__ach_set(v_uid, 'ach_21', n_react);
  perform public.rvn__ach_set(v_uid, 'ach_22', least(1, n_bcry));
  perform public.rvn__ach_set(v_uid, 'ach_23', n_bcry);

  -- ilgiausios pergalių serijos (visos kovos ir tik PvP)
  n_streak := public.rvn__longest_win_streak(v_uid);
  select coalesce(max(cnt), 0) into n_pvp_streak from (
    select count(*) cnt from (
      select result, row_number() over (order by created_at)
                   - row_number() over (partition by result order by created_at) grp
        from public.matches where user_id = v_uid and mode in ('ranked','unranked')
    ) x where x.result = 'win' group by x.grp) y;
  perform public.rvn__ach_set(v_uid, 'ach_17', n_streak);
  perform public.rvn__ach_set(v_uid, 'ach_18', n_pvp_streak);

  -- ── Kaladės ir frakcijos ──
  select count(*) into n_decks from public.decks where user_id = v_uid and coalesce(card_count,0) between 30 and 40;
  perform public.rvn__ach_set(v_uid, 'ach_31', n_decks);
  select count(distinct deck_faction_id) into n_fac_played from public.matches
   where user_id = v_uid and deck_faction_id is not null;
  select count(distinct deck_faction_id) into n_fac_won from public.matches
   where user_id = v_uid and deck_faction_id is not null and result = 'win';
  select coalesce(max(c), 0) into n_fac_best_wins from (
    select count(*) c from public.matches
     where user_id = v_uid and result = 'win' and deck_faction_id is not null
     group by deck_faction_id) f;
  perform public.rvn__ach_set(v_uid, 'ach_32', n_fac_played);
  perform public.rvn__ach_set(v_uid, 'ach_34', n_fac_played);
  perform public.rvn__ach_set(v_uid, 'ach_33', n_fac_won);
  perform public.rvn__ach_set(v_uid, 'ach_35', n_fac_won);
  perform public.rvn__ach_set(v_uid, 'ach_36', n_fac_best_wins);
  perform public.rvn__ach_set(v_uid, 'ach_37', n_fac_best_wins);

  -- ── Kolekcija (retumai pagal rarities.sort_order: 3 Unikalus, 4 Epiškas, 5 Legendinis) ──
  select count(distinct c.id),
         count(distinct c.id) filter (where r.sort_order = 3),
         count(distinct c.id) filter (where r.sort_order = 4),
         count(distinct c.id) filter (where r.sort_order >= 5),
         count(distinct c.id) filter (where c.is_champion)
    into n_uniq, n_rare, n_epic, n_leg, n_champ
    from public.user_collections uc
    join public.cards c on c.id = uc.card_id and c.status = 'active'
    left join public.rarities r on r.id = c.rarity_id
   where uc.user_id = v_uid and uc.quantity > 0;
  perform public.rvn__ach_set(v_uid, 'ach_41', least(1, n_uniq));
  perform public.rvn__ach_set(v_uid, 'ach_42', n_uniq);
  perform public.rvn__ach_set(v_uid, 'ach_43', n_uniq);
  perform public.rvn__ach_set(v_uid, 'ach_44', n_uniq);
  perform public.rvn__ach_set(v_uid, 'ach_45', n_uniq);
  perform public.rvn__ach_set(v_uid, 'ach_46', least(1, n_rare));
  perform public.rvn__ach_set(v_uid, 'ach_47', least(1, n_epic));
  perform public.rvn__ach_set(v_uid, 'ach_48', least(1, n_leg));
  perform public.rvn__ach_set(v_uid, 'ach_49', least(1, n_champ));
  select count(*) into n_fac_ten from (
    select c.faction_id from public.user_collections uc
      join public.cards c on c.id = uc.card_id and c.status = 'active'
     where uc.user_id = v_uid and uc.quantity > 0 and c.faction_id is not null
     group by c.faction_id having count(distinct c.id) >= 10) g;
  perform public.rvn__ach_set(v_uid, 'ach_50', n_fac_ten);

  -- ── Ranked ──
  select count(*), count(*) filter (where result = 'win')
    into n_rk_matches, n_rk_wins from public.ranked_matches where player_id = v_uid;
  select coalesce(max(best_rank_step), 0) into n_best_step from public.ranked_profiles where user_id = v_uid;
  perform public.rvn__ach_set(v_uid, 'ach_51', least(1, n_rk_matches));
  perform public.rvn__ach_set(v_uid, 'ach_52', least(1, n_rk_wins));
  perform public.rvn__ach_set(v_uid, 'ach_53', n_rk_wins);
  perform public.rvn__ach_set(v_uid, 'ach_54', n_rk_wins);
  perform public.rvn__ach_set(v_uid, 'ach_55', n_rk_wins);
  -- pakopa: žingsnis % 3 → 0 bronza, 1 sidabras, 2 auksas; best_step >= 1 reiškia, kad sidabras jau pasiektas
  perform public.rvn__ach_set(v_uid, 'ach_56', case when n_best_step >= 1 then 1 else 0 end);
  perform public.rvn__ach_set(v_uid, 'ach_57', case when n_best_step >= 2 then 1 else 0 end);
  perform public.rvn__ach_set(v_uid, 'ach_58', case when n_best_step >= 149 then 1 else 0 end);
  perform public.rvn__ach_set(v_uid, 'ach_59', n_rk_matches);

  -- ── Dienos aktyvumas ──
  select count(*) into n_dq from public.user_daily_quests_v2 where user_id = v_uid and is_claimed;
  select count(*) into n_dq_full from (
    select date_key from public.user_daily_quests_v2
     where user_id = v_uid and is_claimed group by date_key having count(*) >= 3) d;
  perform public.rvn__ach_set(v_uid, 'ach_61', n_dq);
  perform public.rvn__ach_set(v_uid, 'ach_62', least(1, n_dq_full));
  perform public.rvn__ach_set(v_uid, 'ach_63', n_dq);
  perform public.rvn__ach_set(v_uid, 'ach_64', n_dq);

  select count(*) into v_after from public.rvn_achievement_progress
   where user_id = v_uid and completed_at is not null;

  return jsonb_build_object('completed', v_after, 'unlockedNow', greatest(0, v_after - v_before));
end $$;
grant execute on function public.rvn_recheck_achievements(uuid) to authenticated;

-- ── 4) UI kelias: perskaičiuoti IR grąžinti snapshot'ą vienu iškvietimu ────
create or replace function public.rvn_sync_achievements()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_res jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  v_res := public.rvn_recheck_achievements(v_uid);
  return public.rvn_get_achievements(v_uid) || jsonb_build_object('unlockedNow', coalesce(v_res->'unlockedNow', '0'::jsonb));
end $$;
grant execute on function public.rvn_sync_achievements() to authenticated;

-- ── 5) Kabliukas: po kovos statistikos – iškart perskaičiuoti ─────────────
create or replace function public.rvn__ach_after_match() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if NEW.stats_reported_at is not null and (OLD.stats_reported_at is null) then
    perform public.rvn_recheck_achievements(NEW.user_id);
  end if;
  return NEW;
end $$;
drop trigger if exists trg_ach_after_match on public.matches;
create trigger trg_ach_after_match after update on public.matches
  for each row execute function public.rvn__ach_after_match();

-- ── 6) Sveikatos patikra ───────────────────────────────────────────────────
do $$
declare n_tracked int; n_untracked int;
begin
  select count(*) filter (where target > 0), count(*) filter (where target = 0)
    into n_tracked, n_untracked from public.rvn_achievements where is_active;
  if n_tracked <> 54 then raise exception 'Laukta 54 sekamu pasiekimu, rasta %', n_tracked; end if;
  if n_untracked <> 16 then raise exception 'Laukta 16 nesekamu pasiekimu, rasta %', n_untracked; end if;
  raise notice 'PASIEKIMAI: sekami %, laukia telemetrijos %', n_tracked, n_untracked;
end $$;
