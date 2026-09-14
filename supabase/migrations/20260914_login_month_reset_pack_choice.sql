-- ════════════════════════════════════════════════════════════════════════════
--  1) DAILY LOGIN — ciklas prasideda kiekvieno mėnesio 1 d. (UTC) ir baigiasi
--     mėnesio pabaigoje (28–31 d.). Praleistos dienos nepradingsta – atlygiai
--     imami iš eilės, bet naują mėnesį ciklas prasideda nuo 1 d. iš naujo.
--  2) BOOSTERIO PASIRINKIMAS — vietoj 8 frakcijų žaidėjas renkasi vieną iš
--     AKTYVIŲ parduotuvės pakuočių (card_packs). Pakuotė dedama į inventorių
--     (user_pack_inventory) – atidaroma Kolekcijoje kaip pirkta pakuotė.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Mėnesio ciklas ───────────────────────────────────────────────────────
alter table public.user_login_cycles add column if not exists month_key date;
-- aktyvūs ciklai priskiriami ŠIAM mėnesiui (progresas išlieka iki mėnesio galo)
update public.user_login_cycles
  set month_key = date_trunc('month', public.rvn__utc_date())::date
  where completed_at is null and month_key is null;
update public.user_login_cycles
  set month_key = date_trunc('month', (started_at at time zone 'utc'))::date
  where month_key is null;

create or replace function public.rvn__days_in_month(p_day date)
returns int language sql immutable as $$
  select extract(day from (date_trunc('month', p_day) + interval '1 month - 1 day'))::int
$$;

create or replace function public.rvn__next_month_start()
returns timestamptz language sql stable as $$
  select (date_trunc('month', public.rvn__utc_date()) + interval '1 month') at time zone 'utc'
$$;

create or replace function public.rvn_get_login_cycle()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_today date := public.rvn__utc_date();
  v_month date := date_trunc('month', public.rvn__utc_date())::date;
  v_len int := public.rvn__days_in_month(public.rvn__utc_date());
  v_cyc public.user_login_cycles%rowtype; v_ver int := public.rvn__economy_version();
  v_claimed_today boolean; v_next int; v_blocked boolean := false;
  v_rewards jsonb; v_claims jsonb; v_defver int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;

  -- ŠIO mėnesio ciklas (aktyvus arba jau užbaigtas)
  select * into v_cyc from public.user_login_cycles
    where user_id = v_uid and month_key = v_month
    order by completed_at nulls first, cycle_index desc limit 1;
  v_blocked := v_cyc.id is not null and (v_cyc.completed_at is not null or v_cyc.position >= v_len);

  select exists(select 1 from public.user_login_claims where user_id = v_uid and claim_date = v_today)
    into v_claimed_today;

  v_defver := coalesce(v_cyc.economy_version, v_ver);
  v_next := case
    when v_blocked or v_claimed_today then null
    when v_cyc.id is null then 1
    else least(v_len, coalesce(v_cyc.position, 0) + 1) end;

  -- Paskutinė mėnesio diena VISADA gauna 31 d. (finalo) apibrėžimą, net kai mėnuo trumpesnis
  select coalesce(jsonb_agg(jsonb_build_object(
           'day', x.day, 'rewards', x.rewards, 'milestone', x.is_milestone,
           'claimed', c.day_number is not null,
           'claimedAt', c.claimed_at) order by x.day), '[]'::jsonb)
    into v_rewards
    from (select case when d.day_number = 31 then v_len else d.day_number end as day, d.rewards, d.is_milestone
            from public.login_cycle_reward_defs d
           where d.economy_version = v_defver and (d.day_number < v_len or d.day_number = 31)) x
    left join public.user_login_claims c
      on c.cycle_id = v_cyc.id and c.day_number = x.day;

  select coalesce(jsonb_agg(day_number order by day_number), '[]'::jsonb) into v_claims
    from public.user_login_claims where cycle_id = v_cyc.id;

  return jsonb_build_object(
    'cycleId', v_cyc.id,
    'cycleIndex', coalesce(v_cyc.cycle_index, 0),
    'economyVersion', v_defver,
    'cyclePosition', coalesce(v_cyc.position, 0),
    'cycleLength', v_len,
    'monthKey', v_month,
    'claimedToday', v_claimed_today,
    'claimableDay', v_next,
    'nextClaimAt', case when v_blocked then public.rvn__next_month_start()
                        when v_next is null then public.rvn__next_utc_midnight() else null end,
    'resetAt', public.rvn__next_month_start(),
    'cycleCompleted', v_blocked,
    'claimedDays', v_claims,
    'rewards', v_rewards,
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'balances', public.rvn__balances(v_uid),
    'serverTime', now()
  );
end $$;

create or replace function public.rvn_claim_login_reward(p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_today date := public.rvn__utc_date();
  v_month date := date_trunc('month', public.rvn__utc_date())::date;
  v_len int := public.rvn__days_in_month(public.rvn__utc_date());
  v_cyc public.user_login_cycles%rowtype; v_ver int := public.rvn__economy_version();
  v_day int; v_rewards jsonb; v_grant jsonb; v_res jsonb; v_prev jsonb; v_idx int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='claim_login' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  perform 1 from public.profiles where id = v_uid for update;

  if exists (select 1 from public.user_login_claims where user_id=v_uid and claim_date=v_today) then
    return jsonb_build_object('error','already_claimed_today',
      'nextClaimAt', public.rvn__next_utc_midnight());
  end if;

  -- praėjusio mėnesio nebaigtas ciklas užveriamas (naujas mėnuo = nauja pradžia)
  update public.user_login_cycles set completed_at = now()
    where user_id = v_uid and completed_at is null and month_key is distinct from v_month;

  select * into v_cyc from public.user_login_cycles
    where user_id=v_uid and month_key = v_month order by cycle_index desc limit 1;
  if v_cyc.id is not null and (v_cyc.completed_at is not null or v_cyc.position >= v_len) then
    return jsonb_build_object('error','cycle_completed', 'nextClaimAt', public.rvn__next_month_start());
  end if;
  if v_cyc.id is null then
    select coalesce(max(cycle_index),0)+1 into v_idx from public.user_login_cycles where user_id=v_uid;
    insert into public.user_login_cycles(user_id, cycle_index, economy_version, position, month_key)
      values (v_uid, v_idx, v_ver, 0, v_month) returning * into v_cyc;
  end if;

  v_day := v_cyc.position + 1;
  if v_day > v_len then return jsonb_build_object('error','cycle_completed', 'nextClaimAt', public.rvn__next_month_start()); end if;

  select rewards into v_rewards from public.login_cycle_reward_defs
    where economy_version = v_cyc.economy_version
      and day_number = case when v_day >= v_len then 31 else v_day end;   -- paskutinė diena = finalas
  if v_rewards is null then return jsonb_build_object('error','no_reward_definition'); end if;

  insert into public.user_login_claims(cycle_id, user_id, day_number, claim_date, rewards)
    values (v_cyc.id, v_uid, v_day, v_today, v_rewards);

  update public.user_login_cycles
    set position = v_day, completed_at = case when v_day >= v_len then now() else null end
    where id = v_cyc.id;

  v_grant := public.rvn__grant_rewards_v2(v_uid, v_rewards, 'login', v_cyc.id::text || ':day:' || v_day);

  v_res := jsonb_build_object(
    'status', case when jsonb_array_length(v_grant->'pendingChoices') > 0 then 'choice_required' else 'completed' end,
    'claimedDay', v_day,
    'grantedRewards', v_grant->'granted',
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'snapshot', public.rvn_get_login_cycle()
  );

  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'claim_login', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

-- ── 2) Boosterio pasirinkimas = aktyvi parduotuvės pakuotė ─────────────────
create or replace function public.rvn__pack_choice_pool()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'packId', p.id, 'name', p.name, 'description', p.description, 'imageUrl', p.image_url,
    'cardsPerPack', coalesce(p.cards_per_pack, 10),
    'alignment', coalesce((
      select case when bool_or(f.alignment = 'dark') and not bool_or(f.alignment = 'light') then 'dark'
                  when bool_or(f.alignment = 'light') and not bool_or(f.alignment = 'dark') then 'light'
                  else 'neutral' end
      from public.pack_factions pf join public.factions f on f.id = pf.faction_id where pf.pack_id = p.id
    ), 'neutral'),
    'factions', coalesce((
      select jsonb_agg(jsonb_build_object('factionId', f.id, 'slug', f.slug, 'name', f.name, 'alignment', f.alignment) order by f.sort_order, f.id)
      from public.pack_factions pf join public.factions f on f.id = pf.faction_id
      where pf.pack_id = p.id and f.alignment in ('light','dark')
    ), '[]'::jsonb)
  ) order by p.sort_order, p.name), '[]'::jsonb)
  from public.card_packs p
  where p.is_active = true
$$;

-- laukiantys boosterio pasirinkimai visada rodo GYVĄ pakuočių sąrašą
create or replace function public.rvn__choice_json(p_row public.reward_choices)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'choiceId',   p_row.id,
    'choiceType', p_row.choice_type,
    'sourceType', p_row.source_type,
    'sourceId',   p_row.source_id,
    'seq',        p_row.seq,
    'rarity',     p_row.rarity_code,
    'options',    case when p_row.choice_type = 'faction_booster' then public.rvn__pack_choice_pool() else p_row.choice_pool end,
    'createdAt',  p_row.created_at
  )
$$;

create or replace function public.rvn_resolve_pack_choice(
  p_choice_id uuid, p_pack_id uuid, p_idempotency_key text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_c public.reward_choices%rowtype; v_res jsonb; v_prev jsonb;
  v_pack public.card_packs%rowtype; v_ver int := public.rvn__economy_version();
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='resolve_pack_choice' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  perform 1 from public.profiles where id = v_uid for update;
  select * into v_c from public.reward_choices where id = p_choice_id and user_id = v_uid for update;
  if v_c.id is null then return jsonb_build_object('error','choice_not_found'); end if;
  if v_c.status <> 'pending' then return jsonb_build_object('error','already_resolved'); end if;
  if v_c.choice_type <> 'faction_booster' then return jsonb_build_object('error','wrong_choice_type'); end if;
  select * into v_pack from public.card_packs where id = p_pack_id and is_active = true;
  if v_pack.id is null then return jsonb_build_object('error','pack_not_selectable'); end if;

  insert into public.user_pack_inventory(user_id, pack_id, quantity) values (v_uid, v_pack.id, 1)
    on conflict (user_id, pack_id) do update set quantity = public.user_pack_inventory.quantity + 1;
  insert into public.progression_reward_grants(user_id, source_type, source_id, reward_type, economy_version, metadata)
    values (v_uid, v_c.source_type, v_c.source_id || ':choice:' || v_c.seq, 'pack', v_ver,
            jsonb_build_object('packId', v_pack.id, 'name', v_pack.name));

  update public.reward_choices set status='resolved', resolved_at=now(),
         resolution = jsonb_build_object('packId', v_pack.id, 'name', v_pack.name)
    where id = v_c.id;

  v_res := jsonb_build_object('status','completed','choiceId',v_c.id,
                              'pack', jsonb_build_object('packId', v_pack.id, 'name', v_pack.name, 'imageUrl', v_pack.image_url),
                              'pendingChoices', public.rvn__pending_choices(v_uid),
                              'balances', public.rvn__balances(v_uid));
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'resolve_pack_choice', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

grant execute on function public.rvn__pack_choice_pool() to authenticated;
grant execute on function public.rvn_resolve_pack_choice(uuid, uuid, text) to authenticated;
grant execute on function public.rvn__days_in_month(date) to authenticated;
grant execute on function public.rvn__next_month_start() to authenticated;
