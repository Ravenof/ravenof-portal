-- ════════════════════════════════════════════════════════════════════
-- LIVE EVENTAI (2026-11-15) — 1 etapas
--   • live_events: eventai, skelbiami per adminą on demand arba pagal grafiką
--     (langas starts_at..ends_at + pasikartojimas savaitės dienomis / valandomis)
--   • tipai: multiplier (kovos atlygių daugiklis), login_gift (prisijungimo
--     dovana: kasdien / vieną kartą / kalendorius / sugrįžusiam), info (tik baneris)
--   • evento žetonai (profiles.event_tokens) + evento parduotuvė
--   • atlygių rinkiniai (cosmetic_pool): duodamas pirmas neturimas, kitaip pakaitalas
-- Bazė: rvn_report_match_v2 iš 20261001_admin_stats_grants.sql (vėliausias).
-- Saugu leisti pakartotinai.
-- ════════════════════════════════════════════════════════════════════
begin;

alter table public.profiles add column if not exists event_tokens int not null default 0;

-- ── 1) Lentelės ──────────────────────────────────────────────────────
create table if not exists public.live_events (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  kind         text not null check (kind in ('multiplier','login_gift','info')),
  title_lt     text not null,
  title_en     text,
  body_lt      text,
  body_en      text,
  image_url    text,
  image_focus  int[] not null default '{50,50}',
  accent       text not null default '#d4a33b',
  cta_route    text,
  priority     int  not null default 0,
  show_popup   boolean not null default true,
  enabled      boolean not null default false,
  starts_at    timestamptz,
  ends_at      timestamptz,
  recurrence   jsonb,                      -- null | {"days":[6,0]} | {"from":19,"to":21} | abu kartu
  config       jsonb not null default '{}'::jsonb,
  rewards      jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.live_events enable row level security;
drop policy if exists "live_events_read" on public.live_events;
create policy "live_events_read" on public.live_events for select using (true);
drop policy if exists "live_events_admin" on public.live_events;
create policy "live_events_admin" on public.live_events for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.live_event_claims (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  event_id   uuid not null references public.live_events(id) on delete cascade,
  claim_key  text not null,
  granted    boolean not null default true,
  rewards    jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id, claim_key)
);
alter table public.live_event_claims enable row level security;
drop policy if exists "live_event_claims_own" on public.live_event_claims;
create policy "live_event_claims_own" on public.live_event_claims for select using (auth.uid() = user_id);

create table if not exists public.event_shop_items (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('cosmetic','pack','currency')),
  ref            text not null,            -- cosmetics.id | card_packs.id | silver/essence
  amount         int  not null default 1,
  name_lt        text not null,
  name_en        text,
  image_url      text,
  price_tokens   int  not null check (price_tokens > 0),
  limit_per_user int,                      -- null = neribota (kosmetikai visada 1)
  sort_order     int  not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (kind, ref, amount)
);
alter table public.event_shop_items enable row level security;
drop policy if exists "event_shop_read" on public.event_shop_items;
create policy "event_shop_read" on public.event_shop_items for select using (true);
drop policy if exists "event_shop_admin" on public.event_shop_items;
create policy "event_shop_admin" on public.event_shop_items for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.user_event_shop_purchases (
  id           bigserial primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  item_id      uuid not null references public.event_shop_items(id) on delete cascade,
  price_tokens int  not null,
  created_at   timestamptz not null default now()
);
create index if not exists uesp_user_idx on public.user_event_shop_purchases(user_id, item_id);
alter table public.user_event_shop_purchases enable row level security;
drop policy if exists "uesp_own" on public.user_event_shop_purchases;
create policy "uesp_own" on public.user_event_shop_purchases for select using (auth.uid() = user_id);

-- ── 2) Pagalbinės ────────────────────────────────────────────────────
-- Ar eventas dabar gyvas (Vilniaus laiku): įjungtas, lange, atitinka pasikartojimą
create or replace function public.rvn__event_live(e public.live_events, p_now timestamptz default now())
returns boolean language plpgsql stable set search_path = public as $$
declare v_loc timestamp := p_now at time zone 'Europe/Vilnius'; v_dow int; v_h numeric; v_from numeric; v_to numeric;
begin
  if not e.enabled then return false; end if;
  if e.starts_at is not null and p_now <  e.starts_at then return false; end if;
  if e.ends_at   is not null and p_now >= e.ends_at   then return false; end if;
  if e.recurrence is null or e.recurrence = 'null'::jsonb then return true; end if;
  if jsonb_typeof(e.recurrence->'days') = 'array' and jsonb_array_length(e.recurrence->'days') > 0 then
    v_dow := extract(dow from v_loc)::int;            -- 0 = sekmadienis
    if not (e.recurrence->'days') @> to_jsonb(v_dow) then return false; end if;
  end if;
  if e.recurrence ? 'from' and e.recurrence ? 'to' then
    v_h := extract(hour from v_loc) + extract(minute from v_loc) / 60.0;
    v_from := (e.recurrence->>'from')::numeric; v_to := (e.recurrence->>'to')::numeric;
    if not (v_h >= v_from and v_h < v_to) then return false; end if;
  end if;
  return true;
end $$;

-- Dabartinio pasirodymo raktas (pop-up „matytas" žymei ir vienkartinėms dovanoms)
create or replace function public.rvn__event_occurrence(e public.live_events, p_now timestamptz default now())
returns text language sql stable set search_path = public as $$
  select case
    when e.recurrence is null or e.recurrence = 'null'::jsonb
      then 'w' || coalesce(extract(epoch from e.starts_at)::bigint::text, '0')
    else 'd' || to_char(p_now at time zone 'Europe/Vilnius', 'YYYYMMDD')
  end
$$;

-- Kada baigiasi dabartinis pasirodymas (laikmačiui)
create or replace function public.rvn__event_occurrence_end(e public.live_events, p_now timestamptz default now())
returns timestamptz language plpgsql stable set search_path = public as $$
declare v_loc timestamp := p_now at time zone 'Europe/Vilnius'; v_end timestamptz;
begin
  if e.recurrence is null or e.recurrence = 'null'::jsonb then return e.ends_at; end if;
  if e.recurrence ? 'to' then
    v_end := (date_trunc('day', v_loc) + make_interval(mins => round((e.recurrence->>'to')::numeric * 60)::int)) at time zone 'Europe/Vilnius';
  else
    v_end := (date_trunc('day', v_loc) + interval '1 day') at time zone 'Europe/Vilnius';
  end if;
  if e.ends_at is not null and e.ends_at < v_end then v_end := e.ends_at; end if;
  return v_end;
end $$;

-- Evento atlygių suteikimas: žetonai ir kosmetikos rinkiniai čia, visa kita –
-- per bendrą rvn__grant_reward_payload. Grąžina, kas iš tikrųjų duota.
create or replace function public.rvn__grant_event_rewards(p_user uuid, p_rewards jsonb, p_source_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare el jsonb; v_out jsonb := '[]'::jsonb; v_rest jsonb := '[]'::jsonb; v_amt int; v_cid text; v_fb jsonb; v_kind text;
begin
  if p_user is null or p_rewards is null or jsonb_typeof(p_rewards) <> 'array' then return v_out; end if;
  for el in select * from jsonb_array_elements(p_rewards) loop
    if el->>'type' = 'event_tokens' then
      v_amt := coalesce((el->>'amount')::int, 0);
      if v_amt > 0 then
        update public.profiles set event_tokens = event_tokens + v_amt where id = p_user;
        insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
          values (p_user, 'event', p_source_id, 'currency', 'event_tokens', v_amt);
        v_out := v_out || jsonb_build_array(el);
      end if;
    elsif el->>'type' = 'cosmetic_pool' then
      -- pirmas neturimas iš sąrašo; jei sąrašas tuščias – bet kuri neturima nurodytos rūšies kosmetika
      v_cid := null;
      if jsonb_typeof(el->'ids') = 'array' and jsonb_array_length(el->'ids') > 0 then
        select x.id into v_cid
          from jsonb_array_elements_text(el->'ids') with ordinality as x(id, ord)
          join public.cosmetics c on c.id = x.id
         where not exists (select 1 from public.user_cosmetics u where u.user_id = p_user and u.cosmetic_id = x.id)
         order by x.ord limit 1;
      else
        v_kind := coalesce(el->>'kind', 'card_back');
        select c.id into v_cid from public.cosmetics c
         where c.kind = v_kind and c.is_active and coalesce(c.owned_by_default, false) = false
           and not exists (select 1 from public.user_cosmetics u where u.user_id = p_user and u.cosmetic_id = c.id)
         order by c.sort_order, c.id limit 1;
      end if;
      if v_cid is not null then
        insert into public.user_cosmetics(user_id, cosmetic_id) values (p_user, v_cid) on conflict do nothing;
        insert into public.reward_transactions(user_id, source_type, source_id, reward_type, item_type, item_id, quantity)
          values (p_user, 'event', p_source_id, 'item', 'cosmetic', v_cid, 1);
        v_out := v_out || jsonb_build_array(jsonb_build_object('type','cosmetic','cosmeticId', v_cid));
      else
        v_fb := coalesce(el->'fallback', '[{"type":"event_tokens","amount":100}]'::jsonb);
        v_out := v_out || public.rvn__grant_event_rewards(p_user, v_fb, p_source_id);
      end if;
    else
      v_rest := v_rest || jsonb_build_array(el);
      v_out  := v_out  || jsonb_build_array(el);
    end if;
  end loop;
  if jsonb_array_length(v_rest) > 0 then
    perform public.rvn__grant_reward_payload(p_user, v_rest, 'event', p_source_id);
  end if;
  return v_out;
end $$;

-- Prisijungimo dovanos būsena vienam eventui ir žaidėjui
create or replace function public.rvn__event_claim_state(e public.live_events, p_user uuid, p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_mode text := coalesce(e.config->>'mode', 'once');
  v_today text := to_char(p_now at time zone 'Europe/Vilnius', 'YYYYMMDD');
  v_occ text := public.rvn__event_occurrence(e, p_now);
  v_key text; v_n int; v_total int; v_absent int; v_last timestamptz; v_rw jsonb; v_ok boolean := false;
begin
  if e.kind <> 'login_gift' then return null; end if;
  if v_mode = 'daily' then
    v_key := 'd' || v_today;
    v_ok := not exists (select 1 from public.live_event_claims where user_id = p_user and event_id = e.id and claim_key = v_key);
    v_rw := e.rewards;
    return jsonb_build_object('mode', v_mode, 'claimable', v_ok, 'key', v_key, 'rewards', v_rw);
  elsif v_mode = 'calendar' then
    v_total := case when jsonb_typeof(e.rewards) = 'array' then jsonb_array_length(e.rewards) else 0 end;
    select count(*) into v_n from public.live_event_claims
      where user_id = p_user and event_id = e.id and claim_key like v_occ || ':c%';
    v_ok := v_n < v_total and not exists (
      select 1 from public.live_event_claims
       where user_id = p_user and event_id = e.id and claim_key like v_occ || ':c%'
         and to_char(created_at at time zone 'Europe/Vilnius', 'YYYYMMDD') = v_today);
    v_key := v_occ || ':c' || (v_n + 1);
    v_rw := case when v_n < v_total then e.rewards->v_n else '[]'::jsonb end;
    return jsonb_build_object('mode', v_mode, 'claimable', v_ok, 'key', v_key, 'day', v_n + 1, 'total', v_total,
      'claimedDays', v_n, 'rewards', v_rw, 'calendar', e.rewards);
  elsif v_mode = 'returning' then
    v_absent := greatest(1, coalesce((e.config->>'absent_days')::int, 7));
    -- jau pažymėta teisė (nepaimta)?
    select claim_key into v_key from public.live_event_claims
      where user_id = p_user and event_id = e.id and granted = false order by created_at desc limit 1;
    if v_key is null then
      select max(created_at) into v_last from public.matches where user_id = p_user;
      if v_last is not null and v_last < p_now - make_interval(days => v_absent) then
        v_key := 'ret' || to_char(v_last at time zone 'Europe/Vilnius', 'YYYYMMDD');
        insert into public.live_event_claims(user_id, event_id, claim_key, granted)
          values (p_user, e.id, v_key, false) on conflict do nothing;
        if not exists (select 1 from public.live_event_claims where user_id = p_user and event_id = e.id and claim_key = v_key and granted = false) then
          v_key := null;   -- už šį sugrįžimą jau atsiimta
        end if;
      end if;
    end if;
    return jsonb_build_object('mode', v_mode, 'claimable', v_key is not null, 'key', v_key, 'rewards', e.rewards);
  else  -- once (vieną kartą per pasirodymą)
    v_key := v_occ || ':once';
    v_ok := not exists (select 1 from public.live_event_claims where user_id = p_user and event_id = e.id and claim_key = v_key);
    return jsonb_build_object('mode', 'once', 'claimable', v_ok, 'key', v_key, 'rewards', e.rewards);
  end if;
end $$;

-- ── 3) Kliento RPC ───────────────────────────────────────────────────
create or replace function public.rvn_get_live_events()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_list jsonb := '[]'::jsonb; e public.live_events; v_claim jsonb; v_tokens int := 0;
begin
  if v_uid is null then return jsonb_build_object('tokens', 0, 'events', '[]'::jsonb); end if;
  select coalesce(event_tokens, 0) into v_tokens from public.profiles where id = v_uid;
  for e in select * from public.live_events where enabled order by priority desc, created_at desc loop
    if not public.rvn__event_live(e) then continue; end if;
    v_claim := public.rvn__event_claim_state(e, v_uid);
    -- „sugrįžimo" dovana rodoma tik tam, kam ji priklauso
    if e.kind = 'login_gift' and coalesce(e.config->>'mode','') = 'returning' and not coalesce((v_claim->>'claimable')::boolean, false) then
      continue;
    end if;
    v_list := v_list || jsonb_build_array(jsonb_build_object(
      'id', e.id, 'slug', e.slug, 'kind', e.kind,
      'titleLt', e.title_lt, 'titleEn', e.title_en, 'bodyLt', e.body_lt, 'bodyEn', e.body_en,
      'imageUrl', e.image_url, 'imageFocus', to_jsonb(e.image_focus), 'accent', e.accent,
      'ctaRoute', e.cta_route, 'priority', e.priority, 'showPopup', e.show_popup,
      'occurrence', public.rvn__event_occurrence(e), 'endsAt', public.rvn__event_occurrence_end(e),
      'config', e.config, 'claim', v_claim));
  end loop;
  return jsonb_build_object('tokens', v_tokens, 'events', v_list, 'serverNow', now());
end $$;
grant execute on function public.rvn_get_live_events() to authenticated;

create or replace function public.rvn_claim_live_event(p_event uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); e public.live_events; v_st jsonb; v_key text; v_granted jsonb; v_rows int;
begin
  if v_uid is null then return jsonb_build_object('error', 'no auth'); end if;
  select * into e from public.live_events where id = p_event;
  if e.id is null or e.kind <> 'login_gift' or not public.rvn__event_live(e) then
    return jsonb_build_object('error', 'not_live');
  end if;
  v_st := public.rvn__event_claim_state(e, v_uid);
  if not coalesce((v_st->>'claimable')::boolean, false) then return jsonb_build_object('error', 'already_claimed'); end if;
  v_key := v_st->>'key';
  -- atominis užrakinimas: įrašas (arba teisės pažymėjimas) laimi tik vieną kartą
  if coalesce(v_st->>'mode','') = 'returning' then
    update public.live_event_claims set granted = true, created_at = now()
      where user_id = v_uid and event_id = e.id and claim_key = v_key and granted = false;
  else
    insert into public.live_event_claims(user_id, event_id, claim_key) values (v_uid, e.id, v_key) on conflict do nothing;
  end if;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return jsonb_build_object('error', 'already_claimed'); end if;
  v_granted := public.rvn__grant_event_rewards(v_uid, coalesce(v_st->'rewards', '[]'::jsonb), e.slug || ':' || v_key);
  update public.live_event_claims set rewards = v_granted where user_id = v_uid and event_id = e.id and claim_key = v_key;
  return jsonb_build_object('ok', true, 'granted', v_granted,
    'tokens', (select event_tokens from public.profiles where id = v_uid),
    'balances', (select jsonb_build_object('silver', gold, 'rubies', rubies, 'essence', essence) from public.profiles where id = v_uid));
end $$;
grant execute on function public.rvn_claim_live_event(uuid) to authenticated;

create or replace function public.rvn_get_event_shop()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_items jsonb;
begin
  if v_uid is null then return jsonb_build_object('tokens', 0, 'items', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'kind', i.kind, 'ref', i.ref, 'amount', i.amount,
      'nameLt', i.name_lt, 'nameEn', i.name_en,
      'imageUrl', coalesce(i.image_url, case when i.kind = 'cosmetic' then (select c.image_url from public.cosmetics c where c.id = i.ref)
                                             when i.kind = 'pack' then (select p.image_url from public.card_packs p where p.id::text = i.ref) end),
      'cosmeticKind', case when i.kind = 'cosmetic' then (select c.kind from public.cosmetics c where c.id = i.ref) end,
      'price', i.price_tokens, 'limit', i.limit_per_user,
      'bought', (select count(*) from public.user_event_shop_purchases p where p.user_id = v_uid and p.item_id = i.id),
      'owned', case when i.kind = 'cosmetic' then exists (select 1 from public.user_cosmetics u where u.user_id = v_uid and u.cosmetic_id = i.ref) else false end
    ) order by i.sort_order, i.price_tokens, i.name_lt), '[]'::jsonb)
    into v_items
    from public.event_shop_items i where i.is_active;
  return jsonb_build_object('tokens', (select coalesce(event_tokens, 0) from public.profiles where id = v_uid), 'items', v_items);
end $$;
grant execute on function public.rvn_get_event_shop() to authenticated;

create or replace function public.rvn_buy_event_shop_item(p_item uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); i public.event_shop_items; v_bought int; v_rows int; v_payload jsonb; v_it text;
begin
  if v_uid is null then return jsonb_build_object('error', 'no auth'); end if;
  select * into i from public.event_shop_items where id = p_item and is_active;
  if i.id is null then return jsonb_build_object('error', 'not_found'); end if;
  if i.kind = 'cosmetic' then
    if not exists (select 1 from public.cosmetics where id = i.ref) then return jsonb_build_object('error', 'not_found'); end if;
    if exists (select 1 from public.user_cosmetics where user_id = v_uid and cosmetic_id = i.ref) then
      return jsonb_build_object('error', 'owned');
    end if;
  end if;
  if i.limit_per_user is not null then
    select count(*) into v_bought from public.user_event_shop_purchases where user_id = v_uid and item_id = i.id;
    if v_bought >= i.limit_per_user then return jsonb_build_object('error', 'limit'); end if;
  end if;
  -- atominis nurašymas: pavyksta tik jei žetonų užtenka
  update public.profiles set event_tokens = event_tokens - i.price_tokens
    where id = v_uid and event_tokens >= i.price_tokens;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return jsonb_build_object('error', 'not_enough'); end if;
  insert into public.user_event_shop_purchases(user_id, item_id, price_tokens) values (v_uid, i.id, i.price_tokens);
  if i.kind = 'cosmetic' then
    insert into public.user_cosmetics(user_id, cosmetic_id) values (v_uid, i.ref) on conflict do nothing;
    insert into public.reward_transactions(user_id, source_type, source_id, reward_type, item_type, item_id, quantity)
      values (v_uid, 'event_shop', i.id::text, 'item', 'cosmetic', i.ref, 1);
  elsif i.kind = 'pack' then
    v_payload := jsonb_build_array(jsonb_build_object('type','item','item_type','pack','item_id', i.ref, 'quantity', greatest(i.amount, 1)));
    perform public.rvn__grant_reward_payload(v_uid, v_payload, 'event_shop', i.id::text);
  else
    v_it := case when i.ref in ('silver','essence') then i.ref else 'silver' end;   -- rubinų už žetonus neduodam
    v_payload := jsonb_build_array(jsonb_build_object('type','currency','currency', v_it, 'amount', greatest(i.amount, 0)));
    perform public.rvn__grant_reward_payload(v_uid, v_payload, 'event_shop', i.id::text);
  end if;
  return jsonb_build_object('ok', true,
    'tokens', (select event_tokens from public.profiles where id = v_uid),
    'balances', (select jsonb_build_object('silver', gold, 'rubies', rubies, 'essence', essence) from public.profiles where id = v_uid));
end $$;
grant execute on function public.rvn_buy_event_shop_item(uuid) to authenticated;

-- ── 4) Daugikliai kovos atlygiuose ───────────────────────────────────
-- Didžiausias gyvas daugiklis kiekvienam atlygiui (eventai nesidaugina tarpusavyje)
create or replace function public.rvn__event_match_multipliers(p_user uuid, p_mode text, p_won boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e public.live_events; v_s numeric := 1; v_a numeric := 1; v_x numeric := 1; v_id uuid; v_title text; v_title_en text;
  v_es numeric; v_ea numeric; v_ex numeric; v_day_start timestamptz;
begin
  v_day_start := date_trunc('day', now() at time zone 'Europe/Vilnius') at time zone 'Europe/Vilnius';
  for e in select * from public.live_events where enabled and kind = 'multiplier' order by priority desc loop
    if not public.rvn__event_live(e) then continue; end if;
    if jsonb_typeof(e.config->'modes') = 'array' and jsonb_array_length(e.config->'modes') > 0
       and not (e.config->'modes') @> to_jsonb(p_mode) then continue; end if;
    if coalesce((e.config->>'first_win_only')::boolean, false) then
      if p_won is not true then continue; end if;
      if exists (select 1 from public.matches where user_id = p_user and result = 'win' and valid_for_rewards and created_at >= v_day_start) then continue; end if;
    end if;
    if coalesce((e.config->>'win_only')::boolean, false) and p_won is not true then continue; end if;
    v_es := greatest(1, coalesce((e.config->>'silver')::numeric, 1));
    v_ea := greatest(1, coalesce((e.config->>'account_xp')::numeric, 1));
    v_ex := greatest(1, coalesce((e.config->>'season_xp')::numeric, 1));
    if v_es > v_s or v_ea > v_a or v_ex > v_x then
      if v_id is null or (v_es * v_ea * v_ex) > (v_s * v_a * v_x) then v_id := e.id; v_title := e.title_lt; v_title_en := e.title_en; end if;
    end if;
    v_s := greatest(v_s, v_es); v_a := greatest(v_a, v_ea); v_x := greatest(v_x, v_ex);
  end loop;
  if v_id is null then return null; end if;
  return jsonb_build_object('id', v_id, 'titleLt', v_title, 'titleEn', v_title_en, 'silver', v_s, 'account_xp', v_a, 'season_xp', v_x);
end $$;

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
  v_evt jsonb; v_base jsonb;
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

  -- LIVE EVENTAI: daugikliai (po dienos ribos, prieš serijos bonusą)
  v_base := jsonb_build_object('account_xp', v_axp, 'season_xp', v_sxp, 'silver', v_slv);
  v_evt := public.rvn__event_match_multipliers(v_uid, p_mode, v_won);
  if v_evt is not null then
    v_axp := floor(v_axp * (v_evt->>'account_xp')::numeric);
    v_sxp := floor(v_sxp * (v_evt->>'season_xp')::numeric);
    v_slv := floor(v_slv * (v_evt->>'silver')::numeric);
    v_evt := v_evt || jsonb_build_object('bonus', jsonb_build_object(
      'account_xp', v_axp - (v_base->>'account_xp')::int,
      'season_xp',  v_sxp - (v_base->>'season_xp')::int,
      'silver',     v_slv - (v_base->>'silver')::int));
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
    'event', v_evt,
    'balances', (select jsonb_build_object('silver',gold,'rubies',rubies,'essence',essence) from public.profiles where id=v_uid)
  );
end $function$;

grant execute on function public.rvn_report_match_v2(uuid, text, text, integer, integer, integer, integer, uuid, text, text, text, text) to authenticated;

-- ── 5) Pradiniai duomenys ────────────────────────────────────────────
-- 7 eventų šablonai (išjungti – adminas prideda banerį ir įjungia)
insert into public.live_events (slug, kind, title_lt, title_en, body_lt, body_en, accent, cta_route, priority, recurrence, config, rewards) values
 ('aukso-karstine', 'multiplier', 'Aukso karštinė', 'Gold Rush',
  'Visą savaitgalį už kovas gauni dvigubai sidabro.', 'Double silver from every battle all weekend.',
  '#e8b84a', '/digital/pve', 50, '{"days":[6,0]}', '{"silver":2,"modes":["bot","unranked"]}', '[]'),
 ('patirties-audra', 'multiplier', 'Patirties audra', 'Experience Storm',
  'Dvigubas XP ir sezono tako taškai už kiekvieną kovą.', 'Double XP and season path points from every battle.',
  '#a678ff', '/digital/pve', 50, null, '{"account_xp":2,"season_xp":2,"modes":["bot","unranked"]}', '[]'),
 ('laimingoji-valanda', 'multiplier', 'Laimingoji valanda', 'Happy Hour',
  'Kasdien 19–21 val. +50 % sidabro ir XP.', 'Every day 19:00–21:00: +50% silver and XP.',
  '#f0a23c', '/digital/pve', 40, '{"from":19,"to":21}', '{"silver":1.5,"account_xp":1.5,"season_xp":1.5,"modes":["bot","unranked"]}', '[]'),
 ('pirmoji-pergale', 'multiplier', 'Pirmoji dienos pergalė ×3', 'First Win of the Day ×3',
  'Pirmoji pergalė per dieną duoda trigubą atlygį.', 'Your first win each day gives triple rewards.',
  '#f2c45a', '/digital/pve', 45, null, '{"silver":3,"account_xp":3,"season_xp":3,"first_win_only":true,"modes":["bot","unranked"]}', '[]'),
 ('varngrado-svente', 'login_gift', 'Varngrado šventė', 'Festival of Varngrad',
  'Prisijunk 7 dienas ir atsiimk dovaną kasdien. Septintą dieną – kosmetika.', 'Log in for 7 days and claim a gift each day. Day seven brings a cosmetic.',
  '#d4a33b', null, 60, null, '{"mode":"calendar"}',
  '[[{"type":"currency","currency":"silver","amount":150}],
    [{"type":"event_tokens","amount":30}],
    [{"type":"currency","currency":"essence","amount":40}],
    [{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1}],
    [{"type":"event_tokens","amount":50}],
    [{"type":"currency","currency":"silver","amount":300}],
    [{"type":"cosmetic_pool","kind":"card_back","ids":[],"fallback":[{"type":"event_tokens","amount":150}]},{"type":"event_tokens","amount":50}]]'),
 ('sugrizimo-dovana', 'login_gift', 'Sveikas sugrįžęs!', 'Welcome Back!',
  'Seniai nesimatėm. Štai dovana sugrįžimo proga.', 'It has been a while. Here is a gift for coming back.',
  '#7fc8ff', '/digital/pve', 70, null, '{"mode":"returning","absent_days":7}',
  '[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1},{"type":"event_tokens","amount":60},{"type":"currency","currency":"silver","amount":200}]'),
 ('savaitgalio-boosteris', 'login_gift', 'Savaitgalio boosteris', 'Weekend Booster',
  'Prisijunk šeštadienį ir sekmadienį – kasdien po boosterį.', 'Log in on Saturday and Sunday for a booster each day.',
  '#5fd6a8', '/digital/collection', 55, '{"days":[6,0]}', '{"mode":"daily"}',
  '[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1},{"type":"event_tokens","amount":20}]')
on conflict (slug) do nothing;

-- Evento parduotuvė: visa aktyvi kosmetika (kaina pagal sidabro kainą), boosteris, valiutos
insert into public.event_shop_items (kind, ref, amount, name_lt, name_en, price_tokens, limit_per_user, sort_order)
select 'cosmetic', c.id, 1, c.name, null,
       greatest(60, least(600, round(coalesce(c.price_gold, 500) / 5.0)::int)), 1,
       case when c.kind = 'avatar' then 10 else 20 end
  from public.cosmetics c
 where c.is_active and c.kind in ('card_back','avatar') and coalesce(c.owned_by_default, false) = false
on conflict (kind, ref, amount) do nothing;

insert into public.event_shop_items (kind, ref, amount, name_lt, name_en, price_tokens, limit_per_user, sort_order)
select 'pack', p.id::text, 1, p.name, null, 80, null, 30
  from public.card_packs p where p.is_active
on conflict (kind, ref, amount) do nothing;

insert into public.event_shop_items (kind, ref, amount, name_lt, name_en, price_tokens, limit_per_user, sort_order) values
  ('currency', 'silver',  500, '500 sidabro',  '500 silver',  50, null, 40),
  ('currency', 'essence', 100, '100 esencijos', '100 essence', 60, null, 41)
on conflict (kind, ref, amount) do nothing;

commit;

-- Patikra
select slug, kind, enabled from public.live_events order by priority desc;
select kind, count(*) as kiek from public.event_shop_items group by kind order by kind;
