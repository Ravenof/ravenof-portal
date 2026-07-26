-- ════════════════════════════════════════════════════════════════════════════
--  ŽAIDĖJO PROFILIS · APŽVALGOS DUOMENYS (Profile handoff, ekranai 01 ir 02)
--  ─────────────────────────────────────────────────────────────────────────
--  Iki šiol bendro profilio RPC NEBUVO: `matches` lentelė kaupė kiekvieną kovą,
--  bet jos neskaitė niekas. Čia:
--    • profiles.player_id — stabilus VIEŠAS ID (URL ir draugų sistemai vietoj vardo)
--    • rvn_get_profile_overview() — VISI apžvalgos duomenys vienu užklausimu
--  Privatumas: svetimą profilį rodo tik tiek, kiek leidžia profiles.show_* vėliavos.
--  Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Stabilus viešas žaidėjo ID ──────────────────────────────────────────
--  Deterministinis iš uuid → nesikeičia niekada, net pervadinus paskyrą.
alter table public.profiles add column if not exists player_id text;

create or replace function public.rvn__make_player_id(p_id uuid)
returns text language sql immutable as $$
  select 'RVN-' || upper(substr(md5(p_id::text), 1, 4)) || '-' || upper(substr(md5(p_id::text), 5, 3))
$$;

update public.profiles set player_id = public.rvn__make_player_id(id) where player_id is null;
create unique index if not exists profiles_player_id_uidx on public.profiles (player_id);

create or replace function public.rvn__profiles_player_id() returns trigger
language plpgsql as $$
begin
  if NEW.player_id is null then NEW.player_id := public.rvn__make_player_id(NEW.id); end if;
  return NEW;
end $$;
drop trigger if exists trg_profiles_player_id on public.profiles;
create trigger trg_profiles_player_id before insert on public.profiles
  for each row execute function public.rvn__profiles_player_id();

-- ── 2) Ilgiausia pergalių serija (gaps-and-islands per `matches`) ──────────
create or replace function public.rvn__longest_win_streak(p_user uuid)
returns int language sql stable set search_path = public as $$
  select coalesce(max(cnt), 0)::int from (
    select count(*) cnt from (
      select result,
             row_number() over (order by created_at)
           - row_number() over (partition by result order by created_at) as grp
        from public.matches where user_id = p_user
    ) x where x.result = 'win' group by x.grp
  ) y
$$;

-- ── 3) Profilio apžvalga ───────────────────────────────────────────────────
create or replace function public.rvn_get_profile_overview(p_user_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_me   uuid := auth.uid();
  v_uid  uuid := coalesce(p_user_id, v_me);
  v_self boolean := (v_uid = v_me);
  v_p    public.profiles%rowtype;
  v_lvl int; v_cur bigint; v_next bigint;
  v_total int; v_wins int; v_streak int;
  v_rp jsonb; v_season text;
  v_fac jsonb; v_col jsonb; v_rar jsonb; v_decks jsonb; v_hist jsonb; v_ach jsonb;
  v_owned int; v_all int;
begin
  if v_me is null then return jsonb_build_object('error','no_auth'); end if;
  select * into v_p from public.profiles where id = v_uid;
  if v_p.id is null then return jsonb_build_object('error','no_profile'); end if;
  if not v_self and not coalesce(v_p.is_public, true) then
    return jsonb_build_object('error','private_profile');
  end if;

  -- lygis
  v_lvl  := public.rvn__level_from_xp(coalesce(v_p.xp_total, 0));
  v_cur  := public.rvn__xp_for_level(v_lvl);
  v_next := case when v_lvl >= 50 then null else public.rvn__xp_for_level(v_lvl + 1) end;

  -- bendros kovos (visi režimai)
  select count(*)::int, count(*) filter (where result = 'win')::int
    into v_total, v_wins from public.matches where user_id = v_uid;
  v_streak := public.rvn__longest_win_streak(v_uid);

  -- ranked sezono profilis
  select to_jsonb(rp) into v_rp from public.ranked_profiles rp
   where rp.user_id = v_uid order by rp.updated_at desc limit 1;
  select name into v_season from public.ranked_seasons where is_active limit 1;

  -- dažniausia frakcija sezone (iš ranked_matches — vienintelis šaltinis su frakcija)
  select jsonb_build_object('faction', m.player_faction, 'matches', m.n,
                            'pct', round(100.0 * m.n / nullif(sum(m.n) over (), 0), 1))
    into v_fac
    from (select player_faction, count(*) n from public.ranked_matches
           where player_id = v_uid and player_faction is not null
           group by player_faction order by count(*) desc limit 1) m;

  -- kolekcija (+ pjūvis pagal retumą)
  select count(*)::int into v_all from public.cards where status = 'active';
  select count(distinct c.id)::int into v_owned
    from public.cards c join public.user_collections uc on uc.card_id = c.id
   where c.status = 'active' and uc.user_id = v_uid and uc.quantity > 0;
  select jsonb_agg(jsonb_build_object('rarity', r.name, 'sortOrder', r.sort_order,
                                      'owned', x.owned, 'total', x.total) order by r.sort_order)
    into v_rar
    from public.rarities r
    join lateral (
      select count(*)::int total,
             count(*) filter (where exists (
               select 1 from public.user_collections uc
                where uc.card_id = c.id and uc.user_id = v_uid and uc.quantity > 0))::int owned
        from public.cards c where c.status = 'active' and c.rarity_id = r.id
    ) x on true;
  v_col := jsonb_build_object('owned', v_owned, 'total', v_all,
             'pct', case when v_all > 0 then round(100.0 * v_owned / v_all, 1) else 0 end,
             'byRarity', coalesce(v_rar, '[]'::jsonb));

  -- vieši deckai
  select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'cardCount', d.card_count,
                                      'score', d.score, 'faction', f.name) order by d.score desc)
    into v_decks
    from public.decks d left join public.factions f on f.id = d.faction_id
   where d.user_id = v_uid and d.visibility = 'public';

  -- nauji pasiekimai (tik užbaigti)
  select jsonb_agg(jsonb_build_object('code', a.code, 'nameLt', a.name_lt,
                                      'completedAt', p.completed_at) order by p.completed_at desc)
    into v_ach
    from (select code, completed_at from public.rvn_achievement_progress
           where user_id = v_uid and completed_at is not null
           order by completed_at desc limit 3) p
    join public.rvn_achievements a on a.code = p.code;

  -- rungtynių istorija: ranked (pilni duomenys) + kiti režimai (kiek turim)
  select jsonb_agg(h order by (h->>'at') desc) into v_hist from (
    select jsonb_build_object('mode','ranked','result', rm.result, 'opponent', rm.opponent_name,
             'opponentKind', rm.opponent_kind, 'faction', rm.opponent_faction,
             'turns', rm.turns_played, 'at', rm.created_at) h
      from public.ranked_matches rm where rm.player_id = v_uid
      order by rm.created_at desc limit 8
    union all
    select jsonb_build_object('mode', m.mode, 'result', m.result, 'opponent', null,
             'opponentKind', m.opponent_type, 'faction', null,
             'turns', m.turns_played, 'at', m.created_at) h
      from public.matches m where m.user_id = v_uid and m.mode <> 'ranked'
      order by m.created_at desc limit 8
  ) z;

  return jsonb_build_object(
    'isSelf', v_self,
    'identity', jsonb_build_object(
      'playerId', v_p.player_id, 'name', coalesce(v_p.display_name, v_p.username),
      'username', v_p.username, 'avatarUrl', v_p.avatar_url,
      'equippedAvatar', v_p.equipped_avatar, 'isPublic', coalesce(v_p.is_public, true)),
    'level', jsonb_build_object('level', v_lvl, 'totalXp', coalesce(v_p.xp_total,0),
      -- svetimam profiliui XP eiga NERODOMA (handoff §2, ekranas 02)
      'xpIntoLevel', case when v_self then coalesce(v_p.xp_total,0) - v_cur else null end,
      'xpForNextLevel', case when v_self and v_next is not null then v_next - v_cur else null end,
      'isMaxLevel', v_lvl >= 50),
    'ranked', jsonb_build_object('season', v_season,
      'rankStep', (v_rp->>'rank_step')::int, 'bestRankStep', (v_rp->>'best_rank_step')::int,
      'wins', coalesce((v_rp->>'wins')::int,0), 'losses', coalesce((v_rp->>'losses')::int,0),
      'winStreak', coalesce((v_rp->>'win_streak')::int,0),
      'bestWinStreak', coalesce((v_rp->>'best_win_streak')::int,0)),
    'stats', jsonb_build_object('matches', v_total, 'wins', v_wins,
      'winRate', case when v_total > 0 then round(100.0 * v_wins / v_total, 1) else 0 end,
      'longestStreak', v_streak),
    'topFaction', v_fac,
    'collection', case when v_self or coalesce(v_p.show_owned_cards, true) then v_col else null end,
    'publicDecks', case when v_self or coalesce(v_p.show_public_decks, true) then coalesce(v_decks,'[]'::jsonb) else null end,
    'recentAchievements', case when v_self or coalesce(v_p.show_badges, true) then coalesce(v_ach,'[]'::jsonb) else null end,
    'matchHistory', case when v_self or coalesce(v_p.show_profile_details, true) then coalesce(v_hist,'[]'::jsonb) else null end
  );
end $$;
grant execute on function public.rvn_get_profile_overview(uuid) to authenticated;

-- ── 4) Sveikatos patikra ───────────────────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n from public.profiles where player_id is null;
  if n > 0 then raise exception 'Liko % profiliu be player_id', n; end if;
  if public.rvn__make_player_id('00000000-0000-0000-0000-000000000001'::uuid)
     <> public.rvn__make_player_id('00000000-0000-0000-0000-000000000001'::uuid) then
    raise exception 'player_id generatorius nedeterministinis';
  end if;
  raise notice 'PROFILIO APZVALGA: player_id sugeneruoti, rvn_get_profile_overview paruoštas';
end $$;
