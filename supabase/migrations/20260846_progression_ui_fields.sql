-- ════════════════════════════════════════════════════════════════════════════
--  PROGRESSION v2 — laukai, kurių reikalauja patvirtintas dizainas
--  (additive; UI toliau NIEKO neskaičiuoja)
--   • login: streak / missedDays / cycleStartedAt
--   • season: xpIntoLevel / xpForNextLevel / chapterIndex
--   • frakcijų pasirinkimas: collectionProgressPct + boosterCount
-- ════════════════════════════════════════════════════════════════════════════

-- ── Frakcijos kolekcijos pilnumas (%) ──────────────────────────────────────
create or replace function public.rvn__faction_collection_pct(p_user uuid, p_faction int)
returns int language sql stable security definer set search_path = public as $$
  select case when total = 0 then 0 else round(owned * 100.0 / total)::int end
  from (
    select
      sum(coalesce(r.copy_limit, 2))                                              as total,
      sum(least(coalesce(uc.quantity, 0), coalesce(r.copy_limit, 2)))             as owned
    from public.cards c
    join public.rarities r on r.id = c.rarity_id
    left join public.user_collections uc on uc.card_id = c.id and uc.user_id = p_user
    where c.status = 'active' and c.faction_id = p_faction
      and coalesce(c.is_champion, false) = false
  ) q
$$;

-- ── Frakcijų sąrašas su kolekcijos progresu (pasirinkimo langui) ───────────
create or replace function public.rvn__selectable_factions_for(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'factionId', f.id, 'slug', f.slug, 'name', f.name, 'alignment', f.alignment,
    'collectionProgressPct', public.rvn__faction_collection_pct(p_user, f.id)
  ) order by f.alignment, f.id), '[]'::jsonb)
  from public.rvn__selectable_factions() f
$$;

-- Boosterio pasirinkimai kuriami su kolekcijos progresu
create or replace function public.rvn__grant_rewards_v2(
  p_user uuid, p_rewards jsonb, p_source_type text, p_source_id text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  el jsonb; v_amt int; v_type text; v_ver int := public.rvn__economy_version();
  v_granted jsonb := '[]'::jsonb; v_pending jsonb := '[]'::jsonb;
  v_seq int; v_i int; v_cid text; v_choice public.reward_choices%rowtype; v_pool jsonb;
begin
  if p_user is null or p_rewards is null then
    return jsonb_build_object('granted','[]'::jsonb,'pendingChoices','[]'::jsonb);
  end if;
  select coalesce(max(seq),0) into v_seq from public.reward_choices
    where user_id=p_user and source_type=p_source_type and source_id=p_source_id;

  for el in select * from jsonb_array_elements(p_rewards) loop
    v_type := el->>'type';
    if v_type in ('silver','essence','rubies') then
      v_amt := coalesce((el->>'amount')::int, 0);
      if v_amt > 0 then
        if    v_type = 'silver'  then update public.profiles set gold    = gold    + v_amt where id = p_user;
        elsif v_type = 'rubies'  then update public.profiles set rubies  = rubies  + v_amt where id = p_user;
        else                          update public.profiles set essence = essence + v_amt where id = p_user;
        end if;
        insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
          values (p_user, p_source_type, p_source_id, 'currency', v_type, v_amt);
        insert into public.progression_reward_grants(user_id, source_type, source_id, reward_type, amount, economy_version)
          values (p_user, p_source_type, p_source_id, v_type, v_amt, v_ver);
        v_granted := v_granted || jsonb_build_array(jsonb_build_object('type', v_type, 'amount', v_amt));
      end if;

    elsif v_type = 'season_xp' then
      v_amt := coalesce((el->>'amount')::int, 0);
      if v_amt > 0 then
        perform public.rvn__add_pass_xp(p_user, v_amt);
        insert into public.reward_transactions(user_id, source_type, source_id, reward_type, amount)
          values (p_user, p_source_type, p_source_id, 'season_xp', v_amt);
        insert into public.progression_reward_grants(user_id, source_type, source_id, reward_type, amount, economy_version)
          values (p_user, p_source_type, p_source_id, 'season_xp', v_amt, v_ver);
        v_granted := v_granted || jsonb_build_array(jsonb_build_object('type','season_xp','amount',v_amt));
      end if;

    elsif v_type in ('card_back','player_avatar') then
      v_cid := el->>'cosmeticId';
      if v_cid is not null and exists (select 1 from public.cosmetics where id = v_cid) then
        insert into public.user_cosmetics(user_id, cosmetic_id) values (p_user, v_cid) on conflict do nothing;
        insert into public.reward_transactions(user_id, source_type, source_id, reward_type, item_type, item_id, quantity)
          values (p_user, p_source_type, p_source_id, 'item', v_type, v_cid, 1);
        insert into public.progression_reward_grants(user_id, source_type, source_id, reward_type, cosmetic_id, economy_version)
          values (p_user, p_source_type, p_source_id, v_type, v_cid, v_ver);
        v_granted := v_granted || jsonb_build_array(jsonb_build_object('type', v_type, 'cosmeticId', v_cid));
      end if;

    elsif v_type = 'faction_booster_choice' then
      for v_i in 1..greatest(1, coalesce((el->>'quantity')::int, 1)) loop
        v_seq := v_seq + 1;
        insert into public.reward_choices(user_id, source_type, source_id, seq, choice_type, choice_pool, economy_version)
          values (p_user, p_source_type, p_source_id, v_seq, 'faction_booster',
                  public.rvn__selectable_factions_for(p_user), v_ver)
          on conflict (user_id, source_type, source_id, seq) do nothing
          returning * into v_choice;
        if v_choice.id is not null then
          v_pending := v_pending || jsonb_build_array(public.rvn__choice_json(v_choice));
        end if;
      end loop;

    elsif v_type = 'card_choice' then
      v_seq := v_seq + 1;
      v_pool := public.rvn__build_card_choice_pool(p_user, coalesce(el->>'rarity','rare'));
      insert into public.reward_choices(user_id, source_type, source_id, seq, choice_type, rarity_code, choice_pool, economy_version)
        values (p_user, p_source_type, p_source_id, v_seq, 'card', coalesce(el->>'rarity','rare'), v_pool, v_ver)
        on conflict (user_id, source_type, source_id, seq) do nothing
        returning * into v_choice;
      if v_choice.id is not null then
        v_pending := v_pending || jsonb_build_array(public.rvn__choice_json(v_choice));
      end if;
    end if;
  end loop;

  return jsonb_build_object('granted', v_granted, 'pendingChoices', v_pending);
end $$;

-- ── Login būsena + serija ir praleistos dienos ─────────────────────────────
create or replace function public.rvn_get_login_cycle()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_today date := public.rvn__utc_date();
  v_cyc public.user_login_cycles%rowtype; v_ver int := public.rvn__economy_version();
  v_claimed_today boolean; v_next int; v_blocked boolean := false;
  v_last_completed timestamptz; v_rewards jsonb; v_claims jsonb; v_defver int;
  v_streak int := 0; v_missed int := 0; v_first date; v_last date; v_cnt int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;

  select * into v_cyc from public.user_login_cycles
    where user_id = v_uid and completed_at is null limit 1;

  if v_cyc.id is null then
    select max(completed_at) into v_last_completed from public.user_login_cycles where user_id = v_uid;
    v_blocked := v_last_completed is not null and (v_last_completed at time zone 'utc')::date >= v_today;
    if v_blocked then
      select * into v_cyc from public.user_login_cycles where user_id = v_uid
        order by cycle_index desc limit 1;
    end if;
  end if;

  select exists(select 1 from public.user_login_claims where user_id = v_uid and claim_date = v_today)
    into v_claimed_today;

  v_defver := coalesce(v_cyc.economy_version, v_ver);
  v_next := case
    when v_blocked or v_claimed_today then null
    when v_cyc.id is null then 1
    else least(31, coalesce(v_cyc.position, 0) + 1) end;

  select coalesce(jsonb_agg(jsonb_build_object(
           'day', d.day_number, 'rewards', d.rewards, 'milestone', d.is_milestone,
           'claimed', c.day_number is not null,
           'claimedAt', c.claimed_at) order by d.day_number), '[]'::jsonb)
    into v_rewards
    from public.login_cycle_reward_defs d
    left join public.user_login_claims c
      on c.cycle_id = v_cyc.id and c.day_number = d.day_number
    where d.economy_version = v_defver;

  select coalesce(jsonb_agg(day_number order by day_number), '[]'::jsonb) into v_claims
    from public.user_login_claims where cycle_id = v_cyc.id;

  -- serija: kiek paskutinių UTC parų iš eilės (nuo šiandien arba vakar) buvo claim'ų
  if v_cyc.id is not null then
    select min(claim_date), max(claim_date), count(*) into v_first, v_last, v_cnt
      from public.user_login_claims where user_id = v_uid;
    if v_last is not null and v_last >= v_today - 1 then
      select count(*) into v_streak from (
        select claim_date, row_number() over (order by claim_date desc) as rn
        from public.user_login_claims where user_id = v_uid and claim_date <= v_today
      ) s where s.claim_date = v_last - ((s.rn - 1)::int);
    end if;
    -- praleistos: kalendorinės paros nuo pirmo claim'o iki šiandien be atlygio
    if v_first is not null then
      v_missed := greatest(0, (v_today - v_first + 1) - v_cnt);
    end if;
  end if;

  return jsonb_build_object(
    'cycleId', v_cyc.id,
    'cycleIndex', coalesce(v_cyc.cycle_index, 0),
    'economyVersion', v_defver,
    'cyclePosition', coalesce(v_cyc.position, 0),
    'cycleLength', 31,
    'cycleStartedAt', v_cyc.started_at,
    'claimedToday', v_claimed_today,
    'claimableDay', v_next,
    'nextClaimAt', case when v_next is null then public.rvn__next_utc_midnight() else null end,
    'resetAt', public.rvn__next_utc_midnight(),
    'cycleCompleted', v_blocked,
    'claimedDays', v_claims,
    'streak', v_streak,
    'missedDays', v_missed,
    'rewards', v_rewards,
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'balances', public.rvn__balances(v_uid),
    'serverTime', now()
  );
end $$;

-- ── Season: XP dabartiniame lygyje ─────────────────────────────────────────
create or replace function public.rvn_get_season_path_v2()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_sid uuid; v_cfg jsonb; v_xp int; v_haspass boolean;
  v_per int; v_lvls int; v_level int; v_s record; v_rows jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  v_sid := public.rvn__current_season();
  perform public.rvn__ensure_season_rewards(v_sid);
  select value into v_cfg from public.economy_config where key='season_path_v2';
  v_per := coalesce((v_cfg->>'xp_per_level')::int, 1000);
  v_lvls := coalesce((v_cfg->>'levels')::int, 20);
  select coalesce(xp,0), coalesce(has_season_pass,false) into v_xp, v_haspass
    from public.user_season_pass where user_id=v_uid and season_id=v_sid;
  v_xp := coalesce(v_xp,0); v_haspass := coalesce(v_haspass,false);
  v_level := least(v_lvls, v_xp / v_per);
  select * into v_s from public.season_pass_seasons where id=v_sid;

  select coalesce(jsonb_agg(jsonb_build_object(
      'level', l.level,
      'xpRequired', l.level * v_per,
      'reached', v_xp >= l.level * v_per,
      'free', jsonb_build_object(
        'rewards', coalesce(df.rewards, '[]'::jsonb),
        'claimed', cf.level is not null,
        'claimable', v_xp >= l.level * v_per and cf.level is null),
      'pass', jsonb_build_object(
        'rewards', coalesce(dp.rewards, '[]'::jsonb),
        'claimed', cp.level is not null,
        'claimable', v_haspass and v_xp >= l.level * v_per and cp.level is null,
        'locked', not v_haspass)
    ) order by l.level), '[]'::jsonb) into v_rows
  from (select distinct level from public.season_reward_defs where season_id = v_sid) l
  left join public.season_reward_defs df on df.season_id=v_sid and df.level=l.level and df.track='free'
  left join public.season_reward_defs dp on dp.season_id=v_sid and dp.level=l.level and dp.track='pass'
  left join public.user_season_reward_claims cf
    on cf.user_id=v_uid and cf.season_id=v_sid and cf.level=l.level and cf.track='free'
  left join public.user_season_reward_claims cp
    on cp.user_id=v_uid and cp.season_id=v_sid and cp.level=l.level and cp.track='pass';

  return jsonb_build_object(
    'season', jsonb_build_object('id', v_sid, 'title', v_s.title, 'theme', v_s.theme,
                                 'startsAt', v_s.starts_at, 'endsAt', v_s.ends_at,
                                 'economyVersion', coalesce(v_s.economy_version, public.rvn__economy_version())),
    'xp', v_xp, 'level', v_level, 'levels', v_lvls, 'xpPerLevel', v_per,
    'totalXp', v_lvls * v_per,
    'xpIntoLevel', case when v_level >= v_lvls then v_per else v_xp - v_level * v_per end,
    'xpForNextLevel', v_per,
    'hasPass', v_haspass,
    'passPrice', jsonb_build_object('silver', v_s.pass_price_silver, 'rubies', v_s.pass_price_rubies),
    'rows', v_rows,
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'balances', public.rvn__balances(v_uid),
    'serverTime', now()
  );
end $$;

grant execute on function public.rvn__faction_collection_pct(uuid, int) to authenticated;
grant execute on function public.rvn__selectable_factions_for(uuid) to authenticated;

-- ── Kortos pasirinkimo variantas + frakcijos slug (UI logotipui) ───────────
create or replace function public.rvn__card_choice_option(p_user uuid, p_card uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'cardId', c.id,
    'nameLt', c.name,
    'nameEn', coalesce(tr.name, c.name),
    'factionId', c.faction_id,
    'factionSlug', f.slug,
    'factionName', f.name,
    'alignment', f.alignment,
    'rarity', public.rvn__rarity_code_by_sort(r.sort_order),
    'imageUrl', c.image_url,
    'effectTextLt', coalesce(c.effect_text, ''),
    'effectTextEn', coalesce(tr.effect_text, c.effect_text, ''),
    'goldCost', coalesce(c.gold_cost, 0),
    'ownedCount', coalesce(uc.quantity, 0),
    'copyLimit', coalesce(r.copy_limit, 2),
    'duplicateEssence', public.rvn__duplicate_essence(r.sort_order),
    'disabled', coalesce(uc.quantity,0) >= coalesce(r.copy_limit,2)
  )
  from public.cards c
  join public.rarities r on r.id = c.rarity_id
  join public.factions f on f.id = c.faction_id
  left join public.card_translations tr on tr.card_id = c.id and tr.locale = 'en' and tr.status = 'approved'
  left join public.user_collections uc on uc.card_id = c.id and uc.user_id = p_user
  where c.id = p_card
$$;
