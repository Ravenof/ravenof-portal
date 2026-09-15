-- ── Admin žaidėjo profilis: viena agreguota užklausa + kovų / kolekcijos sąrašai ──
-- Visos funkcijos SECURITY DEFINER, viduje tikrina is_admin() – kitaip raise.

create or replace function public.rvn_admin_player_overview(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;

  select jsonb_build_object(
    'profile', (
      select to_jsonb(p) - 'digital_settings' - 'search_vector'
             || jsonb_build_object(
                  'email', u.email,
                  'auth_last_sign_in_at', u.last_sign_in_at,
                  'auth_providers', (select coalesce(jsonb_agg(distinct i.provider), '[]'::jsonb) from auth.identities i where i.user_id = p.id),
                  'email_confirmed_at', u.email_confirmed_at)
        from public.profiles p left join auth.users u on u.id = p.id where p.id = p_user
    ),
    'matches', (
      select jsonb_build_object(
        'total', count(*),
        'wins', count(*) filter (where result = 'win'),
        'losses', count(*) filter (where result = 'loss'),
        'by_mode', (select coalesce(jsonb_object_agg(mode, cnt), '{}'::jsonb) from (select mode, count(*) cnt from public.matches where user_id = p_user group by mode) x),
        'wins_by_mode', (select coalesce(jsonb_object_agg(mode, cnt), '{}'::jsonb) from (select mode, count(*) cnt from public.matches where user_id = p_user and result = 'win' group by mode) x),
        'vs_human', count(*) filter (where opponent_type = 'human'),
        'vs_bot', count(*) filter (where opponent_type = 'bot'),
        'first_at', min(created_at),
        'last_at', max(created_at),
        'active_days', count(distinct (created_at at time zone 'Europe/Vilnius')::date),
        'avg_duration_s', round(avg(duration_seconds)),
        'avg_turns', round(avg(turns_played), 1),
        'total_duration_s', coalesce(sum(duration_seconds), 0),
        'silver_earned', coalesce(sum(silver_reward), 0),
        'xp_earned', coalesce(sum(account_xp_reward), 0),
        'season_xp_earned', coalesce(sum(season_xp_reward), 0),
        'last_7d', count(*) filter (where created_at > now() - interval '7 days'),
        'last_30d', count(*) filter (where created_at > now() - interval '30 days'),
        'per_day', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d), '[]'::jsonb)
                    from (select (created_at at time zone 'Europe/Vilnius')::date d, count(*) n from public.matches where user_id = p_user and created_at > now() - interval '60 days' group by 1) x),
        'factions', (select coalesce(jsonb_agg(jsonb_build_object('faction', f.name, 'color', f.color_hex, 'n', x.n, 'wins', x.w) order by x.n desc), '[]'::jsonb)
                     from (select deck_faction_id, count(*) n, count(*) filter (where result='win') w from public.matches where user_id = p_user and deck_faction_id is not null group by 1) x
                     join public.factions f on f.id = x.deck_faction_id),
        'top_opponents', (select coalesce(jsonb_agg(jsonb_build_object('id', x.opponent_id, 'name', coalesce(pr.display_name, pr.username), 'username', pr.username, 'n', x.n, 'wins', x.w) order by x.n desc), '[]'::jsonb)
                          from (select opponent_id, count(*) n, count(*) filter (where result='win') w from public.matches where user_id = p_user and opponent_type = 'human' and opponent_id is not null group by 1 order by 2 desc limit 8) x
                          left join public.profiles pr on pr.id = x.opponent_id)
      ) from public.matches where user_id = p_user
    ),
    'ranked', (
      select jsonb_build_object(
        'total', count(*), 'wins', count(*) filter (where result = 'win'),
        'vs_real', count(*) filter (where opponent_kind = 'real'),
        'last_at', max(created_at),
        'best_step', max(rank_step_after), 'current_step', (select rank_step_after from public.ranked_matches where player_id = p_user order by created_at desc limit 1),
        'ups', count(*) filter (where rank_change = 'up'), 'downs', count(*) filter (where rank_change = 'down')
      ) from public.ranked_matches where player_id = p_user
    ),
    'collection', (
      select jsonb_build_object(
        'distinct', count(*), 'copies', coalesce(sum(uc.quantity), 0),
        'total_cards', (select count(*) from public.cards where status = 'active' or status is null),
        'by_faction', (select coalesce(jsonb_agg(jsonb_build_object('faction', f.name, 'color', f.color_hex, 'owned', x.n, 'copies', x.c, 'total', (select count(*) from public.cards c2 where c2.faction_id = f.id and (c2.status = 'active' or c2.status is null))) order by f.sort_order), '[]'::jsonb)
                       from (select c.faction_id, count(*) n, sum(uc2.quantity) c from public.user_collections uc2 join public.cards c on c.id = uc2.card_id where uc2.user_id = p_user group by 1) x join public.factions f on f.id = x.faction_id),
        'by_rarity', (select coalesce(jsonb_agg(jsonb_build_object('rarity', r.name, 'color', r.color_hex, 'owned', x.n, 'copies', x.c, 'total', (select count(*) from public.cards c2 where c2.rarity_id = r.id and (c2.status = 'active' or c2.status is null))) order by r.sort_order), '[]'::jsonb)
                      from (select c.rarity_id, count(*) n, sum(uc2.quantity) c from public.user_collections uc2 join public.cards c on c.id = uc2.card_id where uc2.user_id = p_user group by 1) x join public.rarities r on r.id = x.rarity_id)
      ) from public.user_collections uc where uc.user_id = p_user
    ),
    'packs', (select coalesce(jsonb_agg(jsonb_build_object('name', cp.name, 'qty', upi.quantity, 'image', cp.image_url)), '[]'::jsonb)
              from public.user_pack_inventory upi join public.card_packs cp on cp.id = upi.pack_id where upi.user_id = p_user and upi.quantity > 0),
    'decks', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'faction', f.name, 'color', f.color_hex, 'cards', d.card_count, 'visibility', d.visibility, 'updated_at', d.updated_at, 'is_active', d.id = p.active_deck_id) order by d.updated_at desc), '[]'::jsonb)
              from public.decks d left join public.factions f on f.id = d.faction_id cross join (select active_deck_id from public.profiles where id = p_user) p where d.user_id = p_user),
    'streak', (select to_jsonb(s) from public.user_login_streak s where s.user_id = p_user),
    'monthly_login', (select jsonb_build_object('this_month', count(*) filter (where month_key = to_char(now(), 'YYYY-MM')), 'total', count(*)) from public.user_monthly_login where user_id = p_user),
    'friends', (select count(*) from public.friendships where status = 'accepted' and (requester_id = p_user or addressee_id = p_user)),
    'achievements', (select jsonb_build_object('completed', count(*) filter (where completed_at is not null), 'total', (select count(*) from public.rvn_achievements where is_active)) from public.rvn_achievement_progress where user_id = p_user),
    'season_pass', (select to_jsonb(sp) from public.user_season_pass sp join public.season_pass_seasons ss on ss.id = sp.season_id and ss.is_active where sp.user_id = p_user limit 1),
    'grants', (select coalesce(jsonb_agg(jsonb_build_object('at', g.created_at, 'source', g.source_type, 'type', g.reward_type, 'amount', g.amount, 'card', c.name) order by g.created_at desc), '[]'::jsonb)
               from (select * from public.progression_reward_grants where user_id = p_user order by created_at desc limit 60) g left join public.cards c on c.id = g.card_id),
    'quests_done', (select count(*) from public.user_daily_quests where user_id = p_user and claimed),
    'bugs', (select count(*) from public.bug_reports where user_id = p_user)
  ) into v;
  return v;
end $$;
grant execute on function public.rvn_admin_player_overview(uuid) to authenticated;

-- Kovų sąrašas (puslapiuojamas)
create or replace function public.rvn_admin_player_matches(p_user uuid, p_limit int default 100, p_offset int default 0)
returns jsonb language sql security definer set search_path = public as $$
  select case when public.is_admin() then coalesce(jsonb_agg(row order by created_at desc), '[]'::jsonb) else null end
  from (
    select m.id, m.created_at, m.mode, m.result, m.opponent_type, m.opponent_id,
           coalesce(pr.display_name, pr.username) opponent_name, pr.username opponent_username,
           m.duration_seconds, m.turns_played, f.name faction, f.color_hex faction_color,
           m.silver_reward, m.account_xp_reward, m.season_xp_reward, m.valid_for_rewards,
           m.creatures_played, m.spells_played, m.damage_dealt, m.face_damage, m.creatures_killed, m.cards_drawn,
           m.heal_done, m.hp_remaining, m.hp_lost, m.gold_spent, m.curses_activated, m.champion_abilities,
           m.player_actions_count, m.opponent_actions_count
      from public.matches m
      left join public.profiles pr on pr.id = m.opponent_id
      left join public.factions f on f.id = m.deck_faction_id
     where m.user_id = p_user
     order by m.created_at desc
     limit p_limit offset p_offset
  ) row;
$$;
grant execute on function public.rvn_admin_player_matches(uuid, int, int) to authenticated;

-- Kolekcija: visos kortos su kiekiu (0 = neturi)
create or replace function public.rvn_admin_player_collection(p_user uuid)
returns jsonb language sql security definer set search_path = public as $$
  select case when public.is_admin() then coalesce(jsonb_agg(row order by faction_order, rarity_order, name), '[]'::jsonb) else null end
  from (
    select c.id, c.card_number, c.name, f.name faction, f.color_hex faction_color, f.sort_order faction_order,
           r.name rarity, r.color_hex rarity_color, r.sort_order rarity_order, c.is_champion,
           coalesce(uc.quantity, 0) qty
      from public.cards c
      left join public.factions f on f.id = c.faction_id
      left join public.rarities r on r.id = c.rarity_id
      left join public.user_collections uc on uc.card_id = c.id and uc.user_id = p_user
     where c.status = 'active' or c.status is null
  ) row;
$$;
grant execute on function public.rvn_admin_player_collection(uuid) to authenticated;

-- Vartotojų sąrašui: kovų sk. ir paskutinė kova vienu užklausimu
create or replace function public.rvn_admin_users_activity(p_ids uuid[])
returns jsonb language sql security definer set search_path = public as $$
  select case when public.is_admin() then coalesce(jsonb_object_agg(user_id, jsonb_build_object('n', n, 'last', last_at, 'wins', w)), '{}'::jsonb) else null end
  from (select user_id, count(*) n, count(*) filter (where result='win') w, max(created_at) last_at from public.matches where user_id = any(p_ids) group by user_id) x;
$$;
grant execute on function public.rvn_admin_users_activity(uuid[]) to authenticated;
