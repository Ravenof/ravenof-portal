-- ════════════════════════════════════════════════════════════════════════════
--  RAVENOF · PROGRESSION v2 — VIENAS PALEIDIMO FAILAS
--  ─────────────────────────────────────────────────────────────────────────
--  Kaip paleisti:
--    Supabase Dashboard → SQL Editor → New query → įklijuok VISĄ šį failą → Run.
--
--  • Saugu: viskas additive (create table if not exists / create or replace
--    function / insert ... on conflict do nothing). Žaidėjų progresas NETRINAMAS.
--  • Idempotentiška: paleidus antrą kartą nieko nesugadina ir nedubliuoja.
--  • Turinys = migracijos 20260840–20260847 ta pačia tvarka.
--
--  Po paleidimo patikrink (turi grąžinti 7):
--    select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and p.proname in
--      ('rvn_get_login_cycle','rvn_claim_login_reward','rvn_get_season_path_v2',
--       'rvn_claim_season_reward_v2','rvn_get_daily_quests_v2','rvn_claim_daily_quest',
--       'rvn_get_progression_snapshot');
--
--  Ir kad dienos užduotys tikrai generuojasi (turi grąžinti 3 eilutes):
--    select difficulty, template_code, coalesce(mode_restriction,'any'), progress || '/' || target_value
--      from user_daily_quests_v2 where user_id = auth.uid() and date_key = (now() at time zone 'UTC')::date;
-- ════════════════════════════════════════════════════════════════════════════



-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  20260840_progression_core.sql                                         ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════
--  PROGRESSION v2 — BRANDUOLYS (additive; nieko netrina, nieko neperrašo)
--  ─────────────────────────────────────────────────────────────────────────
--  • factions.alignment (light|dark|neutral) — reikalinga card_choice pool'ui
--  • rarity kodų žemėlapis (rare|epic|legendary ↔ rarities.sort_order 3|4|5)
--  • progression_idempotency — (user, action, key) → atsakymas
--  • reward_choices — laukiantys pasirinkimai (booster frakcija / kortos)
--  • progression_reward_grants — audit log kiekvienam suteiktam komponentui
--  • rvn__grant_rewards_v2 — VIENAS atlygio variklis visoms sistemoms
--
--  Ekonomikos versija: economy_config.progression_economy_version.
--  Reward definition JSON (v2):
--    {"type":"silver|essence|rubies|season_xp","amount":N}
--    {"type":"faction_booster_choice","quantity":N}
--    {"type":"card_choice","rarity":"rare|epic|legendary"}
--    {"type":"card_back|player_avatar","cosmeticId":"..."}
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Frakcijų alignment ───────────────────────────────────────────────────
alter table public.factions add column if not exists alignment text;
update public.factions set alignment = 'light'
  where slug in ('sviesos-pulkas','inkvizicijos-legionas','mistikos-melodija','rytu-vejas');
update public.factions set alignment = 'dark'
  where slug in ('mirties-marsas','demonu-orda','vryhioko-gauja','plesiku-naktis');
update public.factions set alignment = 'neutral' where alignment is null;
do $$ begin
  alter table public.factions add constraint factions_alignment_chk
    check (alignment in ('light','dark','neutral'));
exception when duplicate_object then null; end $$;

-- Pasirenkamos (booster choice) frakcijos = 8 light+dark. „Universalus" NE.
create or replace function public.rvn__selectable_factions()
returns table (id int, slug text, name text, alignment text)
language sql stable set search_path = public as $$
  select f.id, f.slug, f.name, f.alignment
  from public.factions f
  where f.alignment in ('light','dark')
  order by f.alignment, f.sort_order, f.id
$$;

-- ── 2) Rarity kodų žemėlapis (kanoninis enum = rarities.sort_order) ─────────
create or replace function public.rvn__rarity_sort_by_code(p_code text)
returns int language sql immutable as $$
  select case lower(p_code)
    when 'common' then 1 when 'magic' then 2 when 'rare' then 3
    when 'epic' then 4 when 'legendary' then 5 else null end
$$;

create or replace function public.rvn__rarity_code_by_sort(p_sort int)
returns text language sql immutable as $$
  select case p_sort
    when 1 then 'common' when 2 then 'magic' when 3 then 'rare'
    when 4 then 'epic' when 5 then 'legendary' else null end
$$;

-- ── 3) Ekonomikos versija + v2 konfigūracija ───────────────────────────────
insert into public.economy_config(key, value) values
  ('progression_economy_version', '{"version":2}'::jsonb)
on conflict (key) do nothing;

-- Dublikatų kompensacija: naudojam ESAMĄ craft.disenchant lentelę (tier→esencija).
-- Atskiro rakto NEKURIAM, kad nebūtų dviejų tiesos šaltinių; čia tik nuoroda.
insert into public.economy_config(key, value) values
  ('progression_duplicate_compensation', '{"source":"craft.disenchant","multiplier":1}'::jsonb)
on conflict (key) do nothing;

create or replace function public.rvn__economy_version()
returns int language sql stable set search_path = public as $$
  select coalesce((select (value->>'version')::int from public.economy_config where key='progression_economy_version'), 2)
$$;

-- ── 4) Idempotencija ────────────────────────────────────────────────────────
create table if not exists public.progression_idempotency (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  action          text not null,
  idempotency_key text not null,
  response        jsonb not null,
  created_at      timestamptz not null default now(),
  primary key (user_id, action, idempotency_key)
);
alter table public.progression_idempotency enable row level security;
drop policy if exists prog_idem_own on public.progression_idempotency;
create policy prog_idem_own on public.progression_idempotency for select using (user_id = auth.uid());

-- ── 5) Laukiantys pasirinkimai ─────────────────────────────────────────────
create table if not exists public.reward_choices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  source_type     text not null,             -- login|season|daily_quest|daily_chest|admin
  source_id       text not null,             -- deterministinis claim raktas
  seq             int  not null,             -- eilė viename claim'e (nuo 1)
  choice_type     text not null check (choice_type in ('faction_booster','card')),
  rarity_code     text,                      -- card choice: rare|epic|legendary
  choice_pool     jsonb not null default '[]'::jsonb,
  status          text not null default 'pending' check (status in ('pending','resolved')),
  resolution      jsonb,
  economy_version int not null default 2,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  unique (user_id, source_type, source_id, seq)
);
create index if not exists reward_choices_pending_idx
  on public.reward_choices(user_id, created_at) where status = 'pending';
alter table public.reward_choices enable row level security;
drop policy if exists reward_choices_own on public.reward_choices;
create policy reward_choices_own on public.reward_choices for select using (user_id = auth.uid());

-- ── 6) Granulinis audit log ────────────────────────────────────────────────
create table if not exists public.progression_reward_grants (
  id              bigserial primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  source_type     text not null,
  source_id       text not null,
  reward_type     text not null,             -- silver|essence|rubies|season_xp|faction_booster|card|card_back|player_avatar|essence_compensation
  amount          int,
  card_id         uuid,
  faction_id      int,
  cosmetic_id     text,
  economy_version int not null default 2,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists prog_grants_user_idx on public.progression_reward_grants(user_id, created_at desc);
alter table public.progression_reward_grants enable row level security;
drop policy if exists prog_grants_own on public.progression_reward_grants;
create policy prog_grants_own on public.progression_reward_grants for select using (user_id = auth.uid());

-- ── 7) Balansų momentinė nuotrauka ─────────────────────────────────────────
create or replace function public.rvn__balances(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object('silver', gold, 'rubies', rubies, 'essence', essence)
  from public.profiles where id = p_user
$$;

-- ── 8) ATLYGIO VARIKLIS v2 ─────────────────────────────────────────────────
--  p_rewards  = jsonb massyvas RewardDefinition
--  p_source_*  = deterministinis šaltinio raktas (naudojamas ir choice unikalumui)
--  Grąžina: {"granted":[...], "pendingChoices":[...]}
--  Choice tipai NESUTEIKIAMI automatiškai — sukuriamas reward_choices įrašas.
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
  -- tęsiant tą patį šaltinį (pvz. po dalinio claim'o) seq nesikartoja
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
                  coalesce((select jsonb_agg(jsonb_build_object('factionId', id, 'slug', slug, 'name', name, 'alignment', alignment))
                            from public.rvn__selectable_factions()), '[]'::jsonb), v_ver)
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

-- ── 9) Pending choice → DTO ────────────────────────────────────────────────
create or replace function public.rvn__choice_json(p_row public.reward_choices)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'choiceId',   p_row.id,
    'choiceType', p_row.choice_type,
    'sourceType', p_row.source_type,
    'sourceId',   p_row.source_id,
    'seq',        p_row.seq,
    'rarity',     p_row.rarity_code,
    'options',    p_row.choice_pool,
    'createdAt',  p_row.created_at
  )
$$;

-- ── 10) Laukiančių pasirinkimų eilė (deterministinė) ───────────────────────
create or replace function public.rvn__pending_choices(p_user uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(public.rvn__choice_json(c) order by c.created_at, c.source_id, c.seq), '[]'::jsonb)
  from public.reward_choices c
  where c.user_id = p_user and c.status = 'pending'
$$;

grant execute on function public.rvn__selectable_factions() to authenticated;
grant execute on function public.rvn__economy_version() to authenticated;
grant execute on function public.rvn__pending_choices(uuid) to authenticated;


-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  20260841_progression_boosters.sql                                     ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════
--  PROGRESSION v2 — FRAKCIJOS BOOSTERIS + KORTOS PASIRINKIMAS
--  ─────────────────────────────────────────────────────────────────────────
--  • economy_config.booster_v2 — slotų taisyklės + rarity drop lentelė
--    (skaičiai PERKELTI iš gyvos rvn_open_pack_v3, 20260629_booster_rarity_v2.sql
--     — nauja ekonomika NEIŠGALVOTA)
--  • rvn__generate_faction_booster(user, faction) — 10 kortų viena transakcija
--  • rvn__build_card_choice_pool(user, rarity) — 1 Light + 1 Dark
--  • rvn_resolve_faction_booster_choice / rvn_resolve_card_choice
--  Esamas rvn_open_pack_v3 ir card_packs NELIEČIAMI.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.economy_config(key, value) values
('booster_v2', $j$
{
  "cards_total": 10,
  "faction_cards": 8,
  "universal_cards": 2,
  "universal_slot_pool": [1,2,3,4,5,6,7,8,9],
  "exclude_champions": true,
  "guaranteed_slot": {"index": 10, "min_rarity_sort": 3, "faction": "selected"},
  "slots": [
    {"from": 1, "to": 6,  "min_rarity_sort": 1, "weights": {"1":60,"2":30,"3":8,"4":1,"5":1}},
    {"from": 7, "to": 9,  "min_rarity_sort": 2, "weights": {"2":65,"3":25,"4":8,"5":2}},
    {"from": 10,"to": 10, "min_rarity_sort": 3, "weights": {"3":82,"4":15,"5":3}}
  ],
  "duplicate_protection_min_sort": 1
}
$j$::jsonb)
on conflict (key) do nothing;

insert into public.economy_config(key, value) values
('card_choice_v2', '{"exclude_champions":true,"options":2,"alignments":["light","dark"]}'::jsonb)
on conflict (key) do nothing;

-- ── Dublikato kompensacija (esencija) pagal rarity tier ────────────────────
create or replace function public.rvn__duplicate_essence(p_rarity_sort int)
returns int language sql stable set search_path = public as $$
  select coalesce(
    (select ((value->'disenchant')->>(p_rarity_sort::text))::int from public.economy_config where key='craft'),
    0)
$$;

-- ── Rarity pasirinkimas pagal svorius su minimaliu tieru ───────────────────
create or replace function public.rvn__roll_rarity_sort(p_weights jsonb, p_min_sort int)
returns int language plpgsql volatile set search_path = public as $$
declare k text; w int; v_total int := 0; v_roll int; v_acc int := 0; v_last int := p_min_sort;
begin
  for k, w in select key, value::text::int from jsonb_each(p_weights) loop
    if k::int >= p_min_sort then v_total := v_total + w; end if;
  end loop;
  if v_total <= 0 then return p_min_sort; end if;
  v_roll := floor(random() * v_total)::int + 1;
  for k, w in select key, value::text::int from jsonb_each(p_weights) order by key loop
    if k::int >= p_min_sort then
      v_acc := v_acc + w; v_last := k::int;
      if v_roll <= v_acc then return k::int; end if;
    end if;
  end loop;
  return v_last;
end $$;

-- ── Kortos parinkimas slotui (su duplicate protection) ─────────────────────
--  Grąžina cards.id arba null (jei visos tos rarity/frakcijos kortos jau capped)
create or replace function public.rvn__pick_booster_card(
  p_user uuid, p_faction_id int, p_rarity_sort int, p_exclude uuid[], p_exclude_champions boolean
) returns uuid language sql volatile set search_path = public as $$
  select c.id
  from public.cards c
  join public.rarities r on r.id = c.rarity_id
  left join public.user_collections uc on uc.card_id = c.id and uc.user_id = p_user
  where c.status = 'active'
    and c.faction_id = p_faction_id
    and r.sort_order = p_rarity_sort
    and (not p_exclude_champions or coalesce(c.is_champion,false) = false)
    and not (c.id = any(coalesce(p_exclude,'{}'::uuid[])))
    and coalesce(uc.quantity,0) < coalesce(r.copy_limit,2)
  order by random()
  limit 1
$$;

-- ── FRAKCIJOS BOOSTERIS ────────────────────────────────────────────────────
--  8 pasirinktos frakcijos + 2 Universalus kortos; slotai 1–6 Common+,
--  7–9 Magic+, 10 garantuotai Rare+ IR pasirinktos frakcijos.
--  Viskas viena transakcija (funkcijos kūnas).
create or replace function public.rvn__generate_faction_booster(
  p_user uuid, p_faction_id int, p_source_type text, p_source_id text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cfg jsonb; v_total int; v_univ int; v_excl_champ boolean; v_ver int := public.rvn__economy_version();
  v_universal int; v_univ_slots int[]; v_slot int; v_sort int; v_faction int;
  v_card uuid; v_rule jsonb; v_weights jsonb; v_min int;
  v_drawn uuid[] := '{}'; v_cards jsonb := '[]'::jsonb; v_ess int; v_comp int := 0;
  v_rname text; v_code text;
begin
  if p_user is null then return jsonb_build_object('error','no_user'); end if;
  select id into v_universal from public.factions where slug = 'universalus';
  if v_universal is null then return jsonb_build_object('error','no_universal_faction'); end if;
  if not exists (select 1 from public.rvn__selectable_factions() f where f.id = p_faction_id) then
    return jsonb_build_object('error','faction_not_selectable');
  end if;

  select value into v_cfg from public.economy_config where key='booster_v2';
  v_total := coalesce((v_cfg->>'cards_total')::int, 10);
  v_univ  := coalesce((v_cfg->>'universal_cards')::int, 2);
  v_excl_champ := coalesce((v_cfg->>'exclude_champions')::boolean, true);

  -- 2 atsitiktiniai (bet ne garantuotasis) slotai atitenka Universalus kortoms
  select coalesce(array_agg(s order by s), '{}') into v_univ_slots
    from (select (jsonb_array_elements_text(v_cfg->'universal_slot_pool'))::int as s
          order by random() limit v_univ) q(s);

  for v_slot in 1..v_total loop
    -- slot taisyklė
    select r into v_rule from jsonb_array_elements(v_cfg->'slots') r
      where (r->>'from')::int <= v_slot and (r->>'to')::int >= v_slot limit 1;
    v_min := coalesce((v_rule->>'min_rarity_sort')::int, 1);
    v_weights := coalesce(v_rule->'weights', '{"1":100}'::jsonb);

    v_faction := case when v_slot = any(v_univ_slots) then v_universal else p_faction_id end;
    -- garantuotasis slotas visada pasirinktos frakcijos
    if v_slot = coalesce((v_cfg->'guaranteed_slot'->>'index')::int, v_total) then
      v_faction := p_faction_id;
      v_min := greatest(v_min, coalesce((v_cfg->'guaranteed_slot'->>'min_rarity_sort')::int, 3));
    end if;

    v_sort := public.rvn__roll_rarity_sort(v_weights, v_min);
    v_card := public.rvn__pick_booster_card(p_user, v_faction, v_sort, v_drawn, v_excl_champ);

    -- fallback: leidžiam žemesnį/aukštesnį tier'ą tos pačios frakcijos ribose
    if v_card is null then
      select c.id into v_card from public.cards c
        join public.rarities r on r.id = c.rarity_id
        left join public.user_collections uc on uc.card_id = c.id and uc.user_id = p_user
        where c.status='active' and c.faction_id = v_faction and r.sort_order >= v_min
          and (not v_excl_champ or coalesce(c.is_champion,false) = false)
          and not (c.id = any(v_drawn))
          and coalesce(uc.quantity,0) < coalesce(r.copy_limit,2)
        order by random() limit 1;
      if v_card is not null then
        select r.sort_order into v_sort from public.cards c join public.rarities r on r.id=c.rarity_id where c.id=v_card;
      end if;
    end if;

    if v_card is null then
      -- visos tinkamos kortos jau pasiektos iki copy limit → esencijos kompensacija
      v_ess := public.rvn__duplicate_essence(v_sort);
      v_comp := v_comp + v_ess;
      v_cards := v_cards || jsonb_build_array(jsonb_build_object(
        'slot', v_slot, 'cardId', null, 'factionId', v_faction,
        'rarity', public.rvn__rarity_code_by_sort(v_sort),
        'compensated', true, 'essence', v_ess));
    else
      v_drawn := array_append(v_drawn, v_card);
      insert into public.user_collections(user_id, card_id, quantity) values (p_user, v_card, 1)
        on conflict (user_id, card_id) do update set quantity = public.user_collections.quantity + 1, updated_at = now();
      select c.name, r.sort_order into v_rname, v_sort
        from public.cards c join public.rarities r on r.id=c.rarity_id where c.id = v_card;
      v_code := public.rvn__rarity_code_by_sort(v_sort);
      insert into public.progression_reward_grants(user_id, source_type, source_id, reward_type, card_id, faction_id, economy_version, metadata)
        values (p_user, p_source_type, p_source_id, 'card', v_card, v_faction, v_ver,
                jsonb_build_object('slot', v_slot, 'rarity', v_code, 'booster', true));
      v_cards := v_cards || jsonb_build_array(jsonb_build_object(
        'slot', v_slot, 'cardId', v_card, 'name', v_rname, 'factionId', v_faction,
        'rarity', v_code, 'compensated', false));
    end if;
  end loop;

  if v_comp > 0 then
    update public.profiles set essence = essence + v_comp where id = p_user;
    insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
      values (p_user, p_source_type, p_source_id, 'currency', 'essence', v_comp);
    insert into public.progression_reward_grants(user_id, source_type, source_id, reward_type, amount, economy_version)
      values (p_user, p_source_type, p_source_id, 'essence_compensation', v_comp, v_ver);
  end if;

  insert into public.progression_reward_grants(user_id, source_type, source_id, reward_type, faction_id, economy_version, metadata)
    values (p_user, p_source_type, p_source_id, 'faction_booster', p_faction_id, v_ver, jsonb_build_object('cards', v_cards));

  return jsonb_build_object('factionId', p_faction_id, 'cards', v_cards, 'essenceCompensation', v_comp);
end $$;

-- ── KORTOS PASIRINKIMO POOL (1 Light + 1 Dark) ─────────────────────────────
create or replace function public.rvn__card_choice_option(p_user uuid, p_card uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'cardId', c.id,
    'nameLt', c.name,
    'nameEn', coalesce(tr.name, c.name),
    'factionId', c.faction_id,
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

create or replace function public.rvn__build_card_choice_pool(p_user uuid, p_rarity_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_sort int := public.rvn__rarity_sort_by_code(p_rarity_code);
  v_excl boolean := coalesce((select (value->>'exclude_champions')::boolean from public.economy_config where key='card_choice_v2'), true);
  v_light uuid; v_dark uuid; v_out jsonb := '[]'::jsonb;
begin
  if v_sort is null then return '[]'::jsonb; end if;
  -- pirmenybė kortoms, kurių žaidėjas dar neturi iki copy limit
  select c.id into v_light from public.cards c
    join public.rarities r on r.id=c.rarity_id join public.factions f on f.id=c.faction_id
    left join public.user_collections uc on uc.card_id=c.id and uc.user_id=p_user
    where c.status='active' and r.sort_order=v_sort and f.alignment='light'
      and (not v_excl or coalesce(c.is_champion,false)=false)
    order by (coalesce(uc.quantity,0) < coalesce(r.copy_limit,2)) desc, random() limit 1;
  select c.id into v_dark from public.cards c
    join public.rarities r on r.id=c.rarity_id join public.factions f on f.id=c.faction_id
    left join public.user_collections uc on uc.card_id=c.id and uc.user_id=p_user
    where c.status='active' and r.sort_order=v_sort and f.alignment='dark'
      and (not v_excl or coalesce(c.is_champion,false)=false)
    order by (coalesce(uc.quantity,0) < coalesce(r.copy_limit,2)) desc, random() limit 1;

  if v_light is not null then v_out := v_out || jsonb_build_array(public.rvn__card_choice_option(p_user, v_light)); end if;
  if v_dark  is not null then v_out := v_out || jsonb_build_array(public.rvn__card_choice_option(p_user, v_dark));  end if;
  return v_out;
end $$;

-- ── PASIRINKIMŲ IŠSPRENDIMAS ───────────────────────────────────────────────
create or replace function public.rvn_resolve_faction_booster_choice(
  p_choice_id uuid, p_faction_id int, p_idempotency_key text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_c public.reward_choices%rowtype; v_res jsonb; v_prev jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='resolve_faction_booster' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  perform 1 from public.profiles where id = v_uid for update;
  select * into v_c from public.reward_choices
    where id = p_choice_id and user_id = v_uid for update;
  if v_c.id is null then return jsonb_build_object('error','choice_not_found'); end if;
  if v_c.status <> 'pending' then return jsonb_build_object('error','already_resolved'); end if;
  if v_c.choice_type <> 'faction_booster' then return jsonb_build_object('error','wrong_choice_type'); end if;
  if not exists (select 1 from public.rvn__selectable_factions() f where f.id = p_faction_id) then
    return jsonb_build_object('error','faction_not_selectable');
  end if;

  v_res := public.rvn__generate_faction_booster(v_uid, p_faction_id, v_c.source_type, v_c.source_id || ':choice:' || v_c.seq);
  update public.reward_choices set status='resolved', resolved_at=now(),
         resolution = jsonb_build_object('factionId', p_faction_id) || coalesce(v_res,'{}'::jsonb)
    where id = v_c.id;

  v_res := jsonb_build_object('status','completed','choiceId',v_c.id,'booster',v_res,
                              'pendingChoices', public.rvn__pending_choices(v_uid),
                              'balances', public.rvn__balances(v_uid));
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'resolve_faction_booster', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

create or replace function public.rvn_resolve_card_choice(
  p_choice_id uuid, p_card_id uuid, p_idempotency_key text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_c public.reward_choices%rowtype; v_opt jsonb; v_res jsonb; v_prev jsonb;
  v_sort int; v_limit int; v_owned int; v_ess int; v_ver int := public.rvn__economy_version();
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='resolve_card_choice' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  perform 1 from public.profiles where id = v_uid for update;
  select * into v_c from public.reward_choices where id = p_choice_id and user_id = v_uid for update;
  if v_c.id is null then return jsonb_build_object('error','choice_not_found'); end if;
  if v_c.status <> 'pending' then return jsonb_build_object('error','already_resolved'); end if;
  if v_c.choice_type <> 'card' then return jsonb_build_object('error','wrong_choice_type'); end if;

  -- pasirinkimas privalo būti IŠ SERVERIO sukurto pool'o
  select o into v_opt from jsonb_array_elements(v_c.choice_pool) o where (o->>'cardId')::uuid = p_card_id limit 1;
  if v_opt is null then return jsonb_build_object('error','card_not_in_pool'); end if;

  select r.sort_order, coalesce(r.copy_limit,2) into v_sort, v_limit
    from public.cards c join public.rarities r on r.id=c.rarity_id where c.id = p_card_id;
  select coalesce(quantity,0) into v_owned from public.user_collections where user_id=v_uid and card_id=p_card_id;
  v_owned := coalesce(v_owned, 0);

  if v_owned >= v_limit then
    -- copy limit pasiektas → sukonfigūruota esencijos kompensacija
    v_ess := public.rvn__duplicate_essence(v_sort);
    update public.profiles set essence = essence + v_ess where id = v_uid;
    insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
      values (v_uid, v_c.source_type, v_c.source_id, 'currency', 'essence', v_ess);
    insert into public.progression_reward_grants(user_id, source_type, source_id, reward_type, amount, card_id, economy_version)
      values (v_uid, v_c.source_type, v_c.source_id, 'essence_compensation', v_ess, p_card_id, v_ver);
    update public.reward_choices set status='resolved', resolved_at=now(),
      resolution = jsonb_build_object('cardId', p_card_id, 'compensated', true, 'essence', v_ess) where id = v_c.id;
    v_res := jsonb_build_object('status','completed','choiceId',v_c.id,'cardId',p_card_id,'compensated',true,'essence',v_ess);
  else
    insert into public.user_collections(user_id, card_id, quantity) values (v_uid, p_card_id, 1)
      on conflict (user_id, card_id) do update set quantity = public.user_collections.quantity + 1, updated_at = now();
    insert into public.progression_reward_grants(user_id, source_type, source_id, reward_type, card_id, economy_version, metadata)
      values (v_uid, v_c.source_type, v_c.source_id, 'card', p_card_id, v_ver,
              jsonb_build_object('rarity', v_c.rarity_code, 'fromChoice', true));
    insert into public.reward_transactions(user_id, source_type, source_id, reward_type, item_type, item_id, quantity)
      values (v_uid, v_c.source_type, v_c.source_id, 'item', 'card', p_card_id::text, 1);
    update public.reward_choices set status='resolved', resolved_at=now(),
      resolution = jsonb_build_object('cardId', p_card_id, 'compensated', false) where id = v_c.id;
    v_res := jsonb_build_object('status','completed','choiceId',v_c.id,'cardId',p_card_id,'compensated',false);
  end if;

  v_res := v_res || jsonb_build_object('pendingChoices', public.rvn__pending_choices(v_uid),
                                       'balances', public.rvn__balances(v_uid));
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'resolve_card_choice', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

-- ── Laukiančių pasirinkimų eilė klientui ───────────────────────────────────
create or replace function public.rvn_get_pending_choices()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  return jsonb_build_object('pendingChoices', public.rvn__pending_choices(v_uid),
                            'balances', public.rvn__balances(v_uid));
end $$;

grant execute on function public.rvn_resolve_faction_booster_choice(uuid, int, text) to authenticated;
grant execute on function public.rvn_resolve_card_choice(uuid, uuid, text) to authenticated;
grant execute on function public.rvn_get_pending_choices() to authenticated;


-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  20260842_login_cycle_v2.sql                                           ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════
--  PROGRESSION v2 — DAILY LOGIN (rolling 31 prisijungimo ciklas)
--  ─────────────────────────────────────────────────────────────────────────
--  • Praleista diena progreso NENUTRAUKIA (pozicija juda tik atsiėmus).
--  • 1 claim per UTC parą; 31 diena užbaigia ciklą; naujas ciklas – kitą UTC parą.
--  • Senas kalendorinis `user_monthly_login` NELIEČIAMAS (tik skaitomas backfill'ui).
--  • Atlygių lentelė versijuojama (login_cycle_reward_defs.economy_version) —
--    jau pradėtas ciklas visada naudoja savo versiją.
-- ════════════════════════════════════════════════════════════════════════════

-- ── UTC paros raktas ────────────────────────────────────────────────────────
create or replace function public.rvn__utc_date()
returns date language sql stable as $$ select (now() at time zone 'utc')::date $$;

create or replace function public.rvn__next_utc_midnight()
returns timestamptz language sql stable as $$
  select ((now() at time zone 'utc')::date + 1)::timestamp at time zone 'utc'
$$;

-- ── Atlygių apibrėžimai (versijuoti) ───────────────────────────────────────
create table if not exists public.login_cycle_reward_defs (
  economy_version int  not null,
  day_number      int  not null check (day_number between 1 and 31),
  rewards         jsonb not null,
  is_milestone    boolean not null default false,
  updated_at      timestamptz not null default now(),
  primary key (economy_version, day_number)
);
alter table public.login_cycle_reward_defs enable row level security;
drop policy if exists lcrd_read on public.login_cycle_reward_defs;
create policy lcrd_read on public.login_cycle_reward_defs for select using (true);
drop policy if exists lcrd_admin on public.login_cycle_reward_defs;
create policy lcrd_admin on public.login_cycle_reward_defs for all
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

insert into public.login_cycle_reward_defs(economy_version, day_number, rewards, is_milestone) values
 (2, 1,  '[{"type":"silver","amount":100}]', false),
 (2, 2,  '[{"type":"essence","amount":25}]', false),
 (2, 3,  '[{"type":"silver","amount":150}]', false),
 (2, 4,  '[{"type":"silver","amount":150}]', false),
 (2, 5,  '[{"type":"essence","amount":50}]', false),
 (2, 6,  '[{"type":"silver","amount":200}]', false),
 (2, 7,  '[{"type":"faction_booster_choice","quantity":1}]', true),
 (2, 8,  '[{"type":"silver","amount":200}]', false),
 (2, 9,  '[{"type":"essence","amount":50}]', false),
 (2, 10, '[{"type":"silver","amount":250}]', false),
 (2, 11, '[{"type":"silver","amount":250}]', false),
 (2, 12, '[{"type":"essence","amount":75}]', false),
 (2, 13, '[{"type":"silver","amount":300}]', false),
 (2, 14, '[{"type":"faction_booster_choice","quantity":1},{"type":"silver","amount":100}]', true),
 (2, 15, '[{"type":"silver","amount":300}]', false),
 (2, 16, '[{"type":"essence","amount":75}]', false),
 (2, 17, '[{"type":"silver","amount":350}]', false),
 (2, 18, '[{"type":"essence","amount":100}]', false),
 (2, 19, '[{"type":"silver","amount":400}]', false),
 (2, 20, '[{"type":"silver","amount":500}]', false),
 (2, 21, '[{"type":"card_choice","rarity":"rare"}]', true),
 (2, 22, '[{"type":"silver","amount":450}]', false),
 (2, 23, '[{"type":"essence","amount":100}]', false),
 (2, 24, '[{"type":"silver","amount":500}]', false),
 (2, 25, '[{"type":"essence","amount":125}]', false),
 (2, 26, '[{"type":"silver","amount":600}]', false),
 (2, 27, '[{"type":"silver","amount":750}]', false),
 (2, 28, '[{"type":"faction_booster_choice","quantity":1},{"type":"essence","amount":150}]', true),
 (2, 29, '[{"type":"silver","amount":1000}]', false),
 (2, 30, '[{"type":"rubies","amount":25}]', true),
 (2, 31, '[{"type":"faction_booster_choice","quantity":2},{"type":"essence","amount":200}]', true)
on conflict (economy_version, day_number) do nothing;

-- ── Ciklai ──────────────────────────────────────────────────────────────────
create table if not exists public.user_login_cycles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  cycle_index     int  not null,
  economy_version int  not null,
  position        int  not null default 0 check (position between 0 and 31),
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  unique (user_id, cycle_index)
);
-- vienam vartotojui – tik VIENAS aktyvus ciklas
create unique index if not exists user_login_cycles_active_uniq
  on public.user_login_cycles(user_id) where completed_at is null;
alter table public.user_login_cycles enable row level security;
drop policy if exists ulc_own on public.user_login_cycles;
create policy ulc_own on public.user_login_cycles for select using (user_id = auth.uid());

create table if not exists public.user_login_claims (
  cycle_id   uuid not null references public.user_login_cycles(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day_number int  not null check (day_number between 1 and 31),
  claim_date date not null,
  rewards    jsonb not null default '[]'::jsonb,
  claimed_at timestamptz not null default now(),
  primary key (cycle_id, day_number),
  unique (user_id, claim_date)        -- 1 atlygis per UTC parą
);
alter table public.user_login_claims enable row level security;
drop policy if exists ulcl_own on public.user_login_claims;
create policy ulcl_own on public.user_login_claims for select using (user_id = auth.uid());

-- ── BACKFILL iš seno kalendoriaus (idempotentinis; nieko netrina) ──────────
--  Kiekvienam vartotojui, kuris turi v1 įrašų, sukuriamas 1-as ciklas su
--  paskutinėmis iki 31 atsiimtomis dienomis (data → tos pačios datos claim'as),
--  kad progresas nedingtų ir tą pačią parą nebūtų galima atsiimti du kartus.
do $$
declare u record; v_cid uuid; v_n int; d record; v_day int;
begin
  for u in
    select user_id, count(*) as total from public.user_monthly_login group by user_id
  loop
    if exists (select 1 from public.user_login_cycles where user_id = u.user_id) then continue; end if;
    v_n := least(31, u.total);
    insert into public.user_login_cycles(user_id, cycle_index, economy_version, position, started_at)
      values (u.user_id, 1, 2, v_n, now()) returning id into v_cid;
    v_day := 0;
    for d in
      select date_key, claimed_at from (
        select date_key, claimed_at from public.user_monthly_login
        where user_id = u.user_id order by date_key desc limit v_n
      ) x order by date_key asc
    loop
      v_day := v_day + 1;
      insert into public.user_login_claims(cycle_id, user_id, day_number, claim_date, rewards, claimed_at)
        values (v_cid, u.user_id, v_day, d.date_key::date, '[]'::jsonb, d.claimed_at)
        on conflict do nothing;
    end loop;
    if v_n >= 31 then
      update public.user_login_cycles set completed_at = now() where id = v_cid;
    end if;
  end loop;
end $$;

-- ── Būsena ──────────────────────────────────────────────────────────────────
create or replace function public.rvn_get_login_cycle()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_today date := public.rvn__utc_date();
  v_cyc public.user_login_cycles%rowtype; v_ver int := public.rvn__economy_version();
  v_claimed_today boolean; v_next int; v_blocked boolean := false;
  v_last_completed timestamptz; v_rewards jsonb; v_claims jsonb; v_defver int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;

  -- aktyvus ciklas (jei yra)
  select * into v_cyc from public.user_login_cycles
    where user_id = v_uid and completed_at is null limit 1;

  if v_cyc.id is null then
    select max(completed_at) into v_last_completed from public.user_login_cycles where user_id = v_uid;
    -- 31-a diena atsiimta ŠIANDIEN → naujas ciklas tik kitą UTC parą
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

  return jsonb_build_object(
    'cycleId', v_cyc.id,
    'cycleIndex', coalesce(v_cyc.cycle_index, 0),
    'economyVersion', v_defver,
    'cyclePosition', coalesce(v_cyc.position, 0),
    'cycleLength', 31,
    'claimedToday', v_claimed_today,
    'claimableDay', v_next,
    'nextClaimAt', case when v_next is null then public.rvn__next_utc_midnight() else null end,
    'cycleCompleted', v_blocked,
    'claimedDays', v_claims,
    'rewards', v_rewards,
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'balances', public.rvn__balances(v_uid),
    'serverTime', now()
  );
end $$;

-- ── Claim ───────────────────────────────────────────────────────────────────
create or replace function public.rvn_claim_login_reward(p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_today date := public.rvn__utc_date();
  v_cyc public.user_login_cycles%rowtype; v_ver int := public.rvn__economy_version();
  v_day int; v_rewards jsonb; v_grant jsonb; v_res jsonb; v_prev jsonb; v_idx int; v_lastdone timestamptz;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='claim_login' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  -- serializuojam lygiagrečias to paties vartotojo užklausas
  perform 1 from public.profiles where id = v_uid for update;

  if exists (select 1 from public.user_login_claims where user_id=v_uid and claim_date=v_today) then
    return jsonb_build_object('error','already_claimed_today',
      'nextClaimAt', public.rvn__next_utc_midnight());
  end if;

  select * into v_cyc from public.user_login_cycles where user_id=v_uid and completed_at is null limit 1;
  if v_cyc.id is null then
    select max(completed_at) into v_lastdone from public.user_login_cycles where user_id=v_uid;
    if v_lastdone is not null and (v_lastdone at time zone 'utc')::date >= v_today then
      return jsonb_build_object('error','cycle_completed_today',
        'nextClaimAt', public.rvn__next_utc_midnight());
    end if;
    select coalesce(max(cycle_index),0)+1 into v_idx from public.user_login_cycles where user_id=v_uid;
    insert into public.user_login_cycles(user_id, cycle_index, economy_version, position)
      values (v_uid, v_idx, v_ver, 0) returning * into v_cyc;
  end if;

  v_day := v_cyc.position + 1;
  if v_day > 31 then return jsonb_build_object('error','cycle_completed'); end if;

  select rewards into v_rewards from public.login_cycle_reward_defs
    where economy_version = v_cyc.economy_version and day_number = v_day;
  if v_rewards is null then return jsonb_build_object('error','no_reward_definition'); end if;

  insert into public.user_login_claims(cycle_id, user_id, day_number, claim_date, rewards)
    values (v_cyc.id, v_uid, v_day, v_today, v_rewards);

  update public.user_login_cycles
    set position = v_day, completed_at = case when v_day >= 31 then now() else null end
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

grant execute on function public.rvn_get_login_cycle() to authenticated;
grant execute on function public.rvn_claim_login_reward(text) to authenticated;
grant execute on function public.rvn__utc_date() to authenticated;


-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  20260843_season_path_v2.sql                                           ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════
--  PROGRESSION v2 — SEASON PATH (20 lygių, free + pass)
--  ─────────────────────────────────────────────────────────────────────────
--  • 1000 Season XP / lygis (20 000 visam keliui) — economy_config.season_path_v2
--  • Atlygiai UŽŠALDOMI konkrečiam sezonui (season_reward_defs) → vėlesnis
--    ekonomikos keitimas nepakeičia jau vykstančio sezono.
--  • Pass kaina imama iš ESAMOS serverio konfigūracijos
--    (season_pass_seasons.pass_price_silver / pass_price_rubies).
--  • Vėliau nusipirkus pass — visi pasiekti premium atlygiai claimable retroaktyviai
--    (claim tikrina TIK xp ir has_season_pass, ne pirkimo laiką).
--  • Kosmetika: TIK card_back ir player_avatar; id imamas iš sezono konfigūracijos.
--    Nesukonfigūravus — atlygis praleidžiamas ir registruojamas turinio GAP.
--  Senos funkcijos (rvn_get_season_path / rvn_claim_season_reward /
--  rvn_unlock_season_pass) NELIEČIAMOS.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Sezono kosmetikos slotai (additive) ────────────────────────────────────
alter table public.season_pass_seasons add column if not exists card_back_cosmetic_id text;
alter table public.season_pass_seasons add column if not exists avatar_cosmetic_id text;
alter table public.season_pass_seasons add column if not exists economy_version int;

-- ── Turinio spragų registras ───────────────────────────────────────────────
create table if not exists public.progression_content_gaps (
  id          bigserial primary key,
  gap_type    text not null,          -- season_cosmetic|card_choice_pool|booster_pool
  scope       text not null,          -- season_id / rarity / faction ir pan.
  detail      jsonb not null default '{}'::jsonb,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  unique (gap_type, scope)
);
alter table public.progression_content_gaps enable row level security;
drop policy if exists pcg_admin on public.progression_content_gaps;
create policy pcg_admin on public.progression_content_gaps for select
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create or replace function public.rvn__log_content_gap(p_type text, p_scope text, p_detail jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.progression_content_gaps(gap_type, scope, detail)
    values (p_type, p_scope, coalesce(p_detail,'{}'::jsonb))
    on conflict (gap_type, scope) do update set last_seen = now(), detail = excluded.detail;
end $$;

-- ── Kanoninė 20 lygių lentelė (vienintelis tiesos šaltinis) ────────────────
insert into public.economy_config(key, value) values
('season_path_v2', $j$
{
  "xp_per_level": 1000,
  "levels": 20,
  "total_xp": 20000,
  "rewards": {
    "1":  {"free":[{"type":"silver","amount":250}],  "pass":[{"type":"essence","amount":50}]},
    "2":  {"free":[{"type":"essence","amount":50}],  "pass":[{"type":"silver","amount":350}]},
    "3":  {"free":[{"type":"silver","amount":350}],  "pass":[{"type":"faction_booster_choice","quantity":1}]},
    "4":  {"free":[{"type":"silver","amount":400}],  "pass":[{"type":"essence","amount":75}]},
    "5":  {"free":[{"type":"faction_booster_choice","quantity":1}], "pass":[{"type":"silver","amount":500}]},
    "6":  {"free":[{"type":"silver","amount":500}],  "pass":[{"type":"faction_booster_choice","quantity":1}]},
    "7":  {"free":[{"type":"card_choice","rarity":"rare"}], "pass":[{"type":"essence","amount":125}]},
    "8":  {"free":[{"type":"essence","amount":100}], "pass":[{"type":"faction_booster_choice","quantity":1}]},
    "9":  {"free":[{"type":"silver","amount":650}],  "pass":[{"type":"silver","amount":750}]},
    "10": {"free":[{"type":"faction_booster_choice","quantity":1}], "pass":[{"type":"faction_booster_choice","quantity":2}]},
    "11": {"free":[{"type":"silver","amount":750}],  "pass":[{"type":"essence","amount":150}]},
    "12": {"free":[{"type":"essence","amount":150}], "pass":[{"type":"card_back","cosmeticId":"$season_card_back"}]},
    "13": {"free":[{"type":"silver","amount":850}],  "pass":[{"type":"faction_booster_choice","quantity":1}]},
    "14": {"free":[{"type":"faction_booster_choice","quantity":1}], "pass":[{"type":"silver","amount":1000}]},
    "15": {"free":[{"type":"card_choice","rarity":"epic"}], "pass":[{"type":"faction_booster_choice","quantity":2}]},
    "16": {"free":[{"type":"silver","amount":1000}], "pass":[{"type":"essence","amount":250}]},
    "17": {"free":[{"type":"essence","amount":200}], "pass":[{"type":"faction_booster_choice","quantity":1},{"type":"silver","amount":500}]},
    "18": {"free":[{"type":"faction_booster_choice","quantity":1}], "pass":[{"type":"silver","amount":1500}]},
    "19": {"free":[{"type":"silver","amount":1250}], "pass":[{"type":"faction_booster_choice","quantity":2}]},
    "20": {"free":[{"type":"card_choice","rarity":"legendary"}],
           "pass":[{"type":"player_avatar","cosmeticId":"$season_player_avatar"},{"type":"faction_booster_choice","quantity":2}]}
  }
}
$j$::jsonb)
on conflict (key) do nothing;

-- ── Sezonui užšaldyti atlygiai ─────────────────────────────────────────────
create table if not exists public.season_reward_defs (
  season_id       uuid not null references public.season_pass_seasons(id) on delete cascade,
  level           int  not null check (level between 1 and 100),
  track           text not null check (track in ('free','pass')),
  rewards         jsonb not null,
  economy_version int  not null,
  created_at      timestamptz not null default now(),
  primary key (season_id, level, track)
);
alter table public.season_reward_defs enable row level security;
drop policy if exists srd_read on public.season_reward_defs;
create policy srd_read on public.season_reward_defs for select using (true);

-- Kosmetikos placeholderių išsprendimas + spragų registravimas
create or replace function public.rvn__resolve_season_rewards(p_season uuid, p_rewards jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare el jsonb; v_out jsonb := '[]'::jsonb; v_cb text; v_av text; v_id text;
begin
  select card_back_cosmetic_id, avatar_cosmetic_id into v_cb, v_av
    from public.season_pass_seasons where id = p_season;
  for el in select * from jsonb_array_elements(p_rewards) loop
    if el->>'type' in ('card_back','player_avatar') then
      v_id := el->>'cosmeticId';
      if v_id = '$season_card_back' then v_id := v_cb;
      elsif v_id = '$season_player_avatar' then v_id := v_av; end if;
      if v_id is null or not exists (select 1 from public.cosmetics where id = v_id) then
        perform public.rvn__log_content_gap('season_cosmetic', p_season::text || ':' || (el->>'type'),
          jsonb_build_object('reward', el, 'reason', 'sezonui nepriskirta esama kosmetika'));
        continue;  -- praleidžiam; admin gali priskirti vėliau ir padaryti backfill
      end if;
      v_out := v_out || jsonb_build_array(jsonb_build_object('type', el->>'type', 'cosmeticId', v_id));
    else
      v_out := v_out || jsonb_build_array(el);
    end if;
  end loop;
  return v_out;
end $$;

create or replace function public.rvn__ensure_season_rewards(p_season uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb; v_ver int := public.rvn__economy_version(); L int; v_lvls int;
begin
  if p_season is null then return; end if;
  if exists (select 1 from public.season_reward_defs where season_id = p_season) then return; end if;
  select value into v_cfg from public.economy_config where key = 'season_path_v2';
  if v_cfg is null then return; end if;
  v_lvls := coalesce((v_cfg->>'levels')::int, 20);
  for L in 1..v_lvls loop
    insert into public.season_reward_defs(season_id, level, track, rewards, economy_version)
      values (p_season, L, 'free',
              public.rvn__resolve_season_rewards(p_season, coalesce(v_cfg->'rewards'->(L::text)->'free','[]'::jsonb)), v_ver)
      on conflict do nothing;
    insert into public.season_reward_defs(season_id, level, track, rewards, economy_version)
      values (p_season, L, 'pass',
              public.rvn__resolve_season_rewards(p_season, coalesce(v_cfg->'rewards'->(L::text)->'pass','[]'::jsonb)), v_ver)
      on conflict do nothing;
  end loop;
  update public.season_pass_seasons set economy_version = coalesce(economy_version, v_ver) where id = p_season;
end $$;

-- Admin: priskyrus sezonui kosmetiką, atnaujina dar neišduotus apibrėžimus
create or replace function public.rvn_admin_refresh_season_rewards(p_season uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb; L int; v_lvls int; v_ver int := public.rvn__economy_version(); v_upd int := 0;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    return jsonb_build_object('error','forbidden');
  end if;
  select value into v_cfg from public.economy_config where key = 'season_path_v2';
  v_lvls := coalesce((v_cfg->>'levels')::int, 20);
  for L in 1..v_lvls loop
    -- atnaujinam TIK dar neatsiimtus (track, level) — claimintų NEPERRAŠOM
    update public.season_reward_defs d
      set rewards = public.rvn__resolve_season_rewards(p_season, coalesce(v_cfg->'rewards'->(L::text)->d.track,'[]'::jsonb)),
          economy_version = v_ver
      where d.season_id = p_season and d.level = L
        and not exists (select 1 from public.user_season_reward_claims c
                        where c.season_id = d.season_id and c.level = d.level and c.track = d.track);
    get diagnostics v_upd = row_count;
  end loop;
  return jsonb_build_object('ok', true, 'season', p_season);
end $$;

-- ── Būsena ──────────────────────────────────────────────────────────────────
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
        'claimable', v_haspass and v_xp >= l.level * v_per and cp.level is null)
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
    'hasPass', v_haspass,
    'passPrice', jsonb_build_object('silver', v_s.pass_price_silver, 'rubies', v_s.pass_price_rubies),
    'rows', v_rows,
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'balances', public.rvn__balances(v_uid),
    'serverTime', now()
  );
end $$;

-- ── Vieno lygio claim ──────────────────────────────────────────────────────
create or replace function public.rvn__claim_season_level(p_uid uuid, p_sid uuid, p_level int, p_track text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb; v_per int; v_xp int; v_haspass boolean; v_rewards jsonb; v_ins int; v_grant jsonb;
begin
  select value into v_cfg from public.economy_config where key='season_path_v2';
  v_per := coalesce((v_cfg->>'xp_per_level')::int, 1000);
  select coalesce(xp,0), coalesce(has_season_pass,false) into v_xp, v_haspass
    from public.user_season_pass where user_id=p_uid and season_id=p_sid;
  v_xp := coalesce(v_xp,0); v_haspass := coalesce(v_haspass,false);
  if v_xp < p_level * v_per then return jsonb_build_object('error','level_not_reached'); end if;
  if p_track = 'pass' and not v_haspass then return jsonb_build_object('error','no_pass'); end if;

  select rewards into v_rewards from public.season_reward_defs
    where season_id=p_sid and level=p_level and track=p_track;
  if v_rewards is null then return jsonb_build_object('error','no_reward_definition'); end if;

  insert into public.user_season_reward_claims(user_id, season_id, level, track)
    values (p_uid, p_sid, p_level, p_track) on conflict do nothing;
  get diagnostics v_ins = row_count;
  if v_ins = 0 then return jsonb_build_object('error','already_claimed'); end if;

  v_grant := public.rvn__grant_rewards_v2(p_uid, v_rewards, 'season',
                p_sid::text || ':' || p_level || ':' || p_track);
  return jsonb_build_object('ok', true, 'level', p_level, 'track', p_track,
                            'granted', v_grant->'granted', 'pending', v_grant->'pendingChoices');
end $$;

create or replace function public.rvn_claim_season_reward_v2(
  p_level int, p_track text, p_idempotency_key text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_sid uuid; v_r jsonb; v_res jsonb; v_prev jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_track not in ('free','pass') then return jsonb_build_object('error','bad_track'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='claim_season' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  perform 1 from public.profiles where id=v_uid for update;
  v_sid := public.rvn__current_season();
  perform public.rvn__ensure_season_rewards(v_sid);
  v_r := public.rvn__claim_season_level(v_uid, v_sid, p_level, p_track);
  if v_r ? 'error' then return v_r; end if;

  v_res := jsonb_build_object(
    'status', case when jsonb_array_length(v_r->'pending') > 0 then 'choice_required' else 'completed' end,
    'grantedRewards', v_r->'granted',
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'snapshot', public.rvn_get_season_path_v2());
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'claim_season', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

-- ── CLAIM ALL (sustoja ties pasirinkimu) ───────────────────────────────────
create or replace function public.rvn_claim_all_season_rewards(p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_sid uuid; v_prev jsonb; v_res jsonb;
  v_granted jsonb := '[]'::jsonb; v_stopped boolean := false; r record; v_one jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='claim_all_season' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  perform 1 from public.profiles where id=v_uid for update;
  v_sid := public.rvn__current_season();
  perform public.rvn__ensure_season_rewards(v_sid);

  -- jei jau yra neišspręstų pasirinkimų — nieko naujo neclaiminam
  if jsonb_array_length(public.rvn__pending_choices(v_uid)) > 0 then
    return jsonb_build_object('status','choice_required','grantedRewards','[]'::jsonb,
      'pendingChoices', public.rvn__pending_choices(v_uid),
      'snapshot', public.rvn_get_season_path_v2());
  end if;

  -- deterministinė tvarka: lygis didėjančiai, free prieš pass
  for r in
    select d.level, d.track from public.season_reward_defs d
    where d.season_id = v_sid
      and not exists (select 1 from public.user_season_reward_claims c
                      where c.user_id=v_uid and c.season_id=d.season_id and c.level=d.level and c.track=d.track)
    order by d.level asc, case d.track when 'free' then 0 else 1 end
  loop
    exit when v_stopped;
    v_one := public.rvn__claim_season_level(v_uid, v_sid, r.level, r.track);
    if v_one ? 'error' then
      -- nepasiektas lygis → toliau nebeeinam; be pass → praleidžiam pass takelį
      if v_one->>'error' = 'level_not_reached' then exit; end if;
      continue;
    end if;
    v_granted := v_granted || coalesce(v_one->'granted','[]'::jsonb);
    if jsonb_array_length(coalesce(v_one->'pending','[]'::jsonb)) > 0 then v_stopped := true; end if;
  end loop;

  v_res := jsonb_build_object(
    'status', case when v_stopped then 'choice_required' else 'completed' end,
    'grantedRewards', v_granted,
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'snapshot', public.rvn_get_season_path_v2());
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'claim_all_season', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

-- ── Pass atrakinimas (kaina iš esamos serverio konfigūracijos) ─────────────
create or replace function public.rvn_unlock_season_pass_v2(p_currency text, p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_sid uuid; v_s record; v_bal int; v_cost int; v_prev jsonb; v_res jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_currency not in ('silver','rubies') then return jsonb_build_object('error','bad_currency'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='unlock_pass' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  perform 1 from public.profiles where id=v_uid for update;
  v_sid := public.rvn__current_season();
  perform public.rvn__ensure_season_rewards(v_sid);
  select * into v_s from public.season_pass_seasons where id=v_sid;
  insert into public.user_season_pass(user_id, season_id, xp) values (v_uid, v_sid, 0) on conflict do nothing;
  if (select has_season_pass from public.user_season_pass where user_id=v_uid and season_id=v_sid) then
    return jsonb_build_object('error','already_owned');
  end if;

  if p_currency = 'silver' then
    v_cost := v_s.pass_price_silver; select gold into v_bal from public.profiles where id=v_uid;
    if v_bal < v_cost then return jsonb_build_object('error','not_enough'); end if;
    update public.profiles set gold = gold - v_cost where id=v_uid;
  else
    v_cost := v_s.pass_price_rubies; select rubies into v_bal from public.profiles where id=v_uid;
    if v_bal < v_cost then return jsonb_build_object('error','not_enough'); end if;
    update public.profiles set rubies = rubies - v_cost where id=v_uid;
  end if;

  update public.user_season_pass set has_season_pass=true, season_pass_activated_at=now()
    where user_id=v_uid and season_id=v_sid;
  insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
    values (v_uid, 'season_pass_unlock', v_sid::text, 'currency', p_currency, -v_cost);

  v_res := jsonb_build_object('status','completed','cost', v_cost, 'currency', p_currency,
                              'snapshot', public.rvn_get_season_path_v2());
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'unlock_pass', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

grant execute on function public.rvn_get_season_path_v2() to authenticated;
grant execute on function public.rvn_claim_season_reward_v2(int, text, text) to authenticated;
grant execute on function public.rvn_claim_all_season_rewards(text) to authenticated;
grant execute on function public.rvn_unlock_season_pass_v2(text, text) to authenticated;
grant execute on function public.rvn_admin_refresh_season_rewards(uuid) to authenticated;


-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  20260844_daily_quests_v2.sql                                          ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════
--  PROGRESSION v2 — DAILY QUESTS (1 easy + 1 medium + 1 hard per UTC parą)
--  ─────────────────────────────────────────────────────────────────────────
--  • Reset 00:00 UTC (rvn__utc_date). Atlygiai iš economy_config.daily_quests_v2:
--      easy 100 Silver + 80 Season XP · medium 150 + 100 · hard 200 + 120
--      Daily Chest (visi trys) 50 Essence + 100 Season XP
--  • Reroll: 1-as nemokamas, 2-as ir 3-ias po 100 Sidabro, 4-as draudžiamas.
--  • Generavimo taisyklės: be PvP kol PvP neprieinamas; frakcijos questas tik
--    turint galiojančią tos frakcijos kaladę; be dublikatų/konfliktų;
--    be win-streak; „atplėšk pakuotę" questai išjungiami.
--  • Progresas TIK iš galiojančių (valid_for_rewards) kovų.
--  Senoji v1 sistema (user_daily_tasks ir kt.) NELIEČIAMA — veikia lygiagrečiai,
--  kol dizaino handoff'as perjungs UI.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.economy_config(key, value) values
('daily_quests_v2', $j$
{
  "rewards": {
    "easy":   [{"type":"silver","amount":100},{"type":"season_xp","amount":80}],
    "medium": [{"type":"silver","amount":150},{"type":"season_xp","amount":100}],
    "hard":   [{"type":"silver","amount":200},{"type":"season_xp","amount":120}]
  },
  "chest": [{"type":"essence","amount":50},{"type":"season_xp","amount":100}],
  "daily_max": {"silver":450,"essence":50,"season_xp":400},
  "reroll": {"free":1,"paid_cost_silver":100,"max_total":3},
  "generation": {
    "difficulties": ["easy","medium","hard"],
    "min_deck_cards": 30,
    "enable_stat_objectives": false,
    "pvp_requires_onboarding": true
  }
}
$j$::jsonb)
on conflict (key) do nothing;

-- ── Šablonai v2 ─────────────────────────────────────────────────────────────
create table if not exists public.daily_quest_templates (
  code            text primary key,
  difficulty      text not null check (difficulty in ('easy','medium','hard')),
  objective_type  text not null,
  target_value    int  not null default 1,
  mode_restriction text,                    -- null|bot|unranked|ranked
  requires_pvp    boolean not null default false,
  requires_faction boolean not null default false,
  requires_stats  boolean not null default false,   -- reikia kovos telemetrijos
  conflict_group  text not null,
  weight          int  not null default 10,
  is_active       boolean not null default true,
  title_key       text not null,
  desc_key        text not null,
  updated_at      timestamptz not null default now()
);
alter table public.daily_quest_templates enable row level security;
drop policy if exists dqt_read on public.daily_quest_templates;
create policy dqt_read on public.daily_quest_templates for select using (true);
drop policy if exists dqt_admin on public.daily_quest_templates;
create policy dqt_admin on public.daily_quest_templates for all
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

insert into public.daily_quest_templates
  (code, difficulty, objective_type, target_value, mode_restriction, requires_pvp, requires_faction, requires_stats, conflict_group, weight, title_key, desc_key) values
 -- EASY
 ('easy_play_1',        'easy',  'play_match',       1, null,     false,false,false,'play_match',    10,'quests.v2.playMatch.title','quests.v2.playMatch.desc'),
 ('easy_play_2',        'easy',  'play_match',       2, null,     false,false,false,'play_match',     8,'quests.v2.playMatch.title','quests.v2.playMatch.desc'),
 ('easy_win_bot_1',     'easy',  'win_match',        1, 'bot',    false,false,false,'win_match',     10,'quests.v2.winBot.title','quests.v2.winBot.desc'),
 ('easy_creatures_5',   'easy',  'play_creatures',   5, null,     false,false,true, 'play_creatures',10,'quests.v2.playCreatures.title','quests.v2.playCreatures.desc'),
 ('easy_damage_30',     'easy',  'deal_damage',     30, null,     false,false,true, 'deal_damage',    8,'quests.v2.dealDamage.title','quests.v2.dealDamage.desc'),
 -- MEDIUM
 ('med_play_3',         'medium','play_match',       3, null,     false,false,false,'play_match',    10,'quests.v2.playMatch.title','quests.v2.playMatch.desc'),
 ('med_win_2',          'medium','win_match',        2, null,     false,false,false,'win_match',     10,'quests.v2.winMatch.title','quests.v2.winMatch.desc'),
 ('med_creatures_12',   'medium','play_creatures',  12, null,     false,false,true, 'play_creatures',10,'quests.v2.playCreatures.title','quests.v2.playCreatures.desc'),
 ('med_damage_80',      'medium','deal_damage',     80, null,     false,false,true, 'deal_damage',    9,'quests.v2.dealDamage.title','quests.v2.dealDamage.desc'),
 ('med_faction_win_1',  'medium','win_faction_match',1,null,      false,true, true, 'faction',        7,'quests.v2.factionWin.title','quests.v2.factionWin.desc'),
 ('med_pvp_play_1',     'medium','play_match',       1, 'unranked',true,false,false,'pvp',            6,'quests.v2.pvpPlay.title','quests.v2.pvpPlay.desc'),
 -- HARD
 ('hard_win_3',         'hard',  'win_match',        3, null,     false,false,false,'win_match',     10,'quests.v2.winMatch.title','quests.v2.winMatch.desc'),
 ('hard_play_5',        'hard',  'play_match',       5, null,     false,false,false,'play_match',     9,'quests.v2.playMatch.title','quests.v2.playMatch.desc'),
 ('hard_creatures_25',  'hard',  'play_creatures',  25, null,     false,false,true, 'play_creatures',10,'quests.v2.playCreatures.title','quests.v2.playCreatures.desc'),
 ('hard_damage_150',    'hard',  'deal_damage',    150, null,     false,false,true, 'deal_damage',    9,'quests.v2.dealDamage.title','quests.v2.dealDamage.desc'),
 ('hard_faction_win_2', 'hard',  'win_faction_match',2,null,      false,true, true, 'faction',        7,'quests.v2.factionWin.title','quests.v2.factionWin.desc'),
 ('hard_pvp_win_1',     'hard',  'win_match',        1, 'ranked',  true,false,false,'pvp',            6,'quests.v2.pvpWin.title','quests.v2.pvpWin.desc')
on conflict (code) do nothing;

-- „Atplėšk pakuotę" tipo questai — draudžiami (gynybinis išjungimas)
update public.daily_quest_templates set is_active = false
  where objective_type in ('open_pack','open_booster') or code ilike '%pack%';
update public.daily_task_templates set is_active = false
  where objective_type in ('open_pack','open_booster')
     or title ilike '%pakuot%' or description ilike '%atplėšk%pakuot%';

-- ── Vartotojo dienos questai ───────────────────────────────────────────────
create table if not exists public.user_daily_quests_v2 (
  id              bigserial primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  date_key        date not null,                    -- UTC
  difficulty      text not null check (difficulty in ('easy','medium','hard')),
  template_code   text not null references public.daily_quest_templates(code),
  objective_type  text not null,
  target_value    int  not null,
  faction_id      int  references public.factions(id),
  progress        int  not null default 0,
  rewards         jsonb not null,                   -- užšaldyti generavimo metu
  economy_version int  not null default 2,
  reroll_index    int  not null default 0,
  is_completed    boolean not null default false,
  is_claimed      boolean not null default false,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,
  claimed_at      timestamptz,
  unique (user_id, date_key, difficulty)
);
alter table public.user_daily_quests_v2 enable row level security;
drop policy if exists udq_own on public.user_daily_quests_v2;
create policy udq_own on public.user_daily_quests_v2 for select using (user_id = auth.uid());

create table if not exists public.user_daily_quest_meta (
  user_id           uuid not null references public.profiles(id) on delete cascade,
  date_key          date not null,
  free_reroll_used  boolean not null default false,
  paid_reroll_count int not null default 0,
  retired_codes     text[] not null default '{}',   -- ką jau išmetė (negrąžinam iškart)
  primary key (user_id, date_key)
);
alter table public.user_daily_quest_meta enable row level security;
drop policy if exists udqm_own on public.user_daily_quest_meta;
create policy udqm_own on public.user_daily_quest_meta for select using (user_id = auth.uid());

create table if not exists public.user_daily_chests (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  date_key   date not null,
  rewards    jsonb not null default '[]'::jsonb,
  claimed_at timestamptz not null default now(),
  primary key (user_id, date_key)
);
alter table public.user_daily_chests enable row level security;
drop policy if exists udc2_own on public.user_daily_chests;
create policy udc2_own on public.user_daily_chests for select using (user_id = auth.uid());

-- ── Tinkamumo patikros ─────────────────────────────────────────────────────
create or replace function public.rvn__pvp_available(p_uid uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_cfg jsonb;
begin
  select value into v_cfg from public.economy_config where key='daily_quests_v2';
  if not coalesce((v_cfg->'generation'->>'pvp_requires_onboarding')::boolean, true) then return true; end if;
  return exists (select 1 from public.profiles where id = p_uid and digital_onboarded_at is not null);
end $$;

-- Frakcijos, kurioms žaidėjas turi galiojančią (≥ min kortų) kaladę
create or replace function public.rvn__playable_deck_factions(p_uid uuid)
returns int[] language plpgsql stable security definer set search_path = public as $$
declare v_min int; v_out int[];
begin
  select coalesce((value->'generation'->>'min_deck_cards')::int, 30) into v_min
    from public.economy_config where key='daily_quests_v2';
  select coalesce(array_agg(distinct d.faction_id), '{}') into v_out
    from public.decks d
    join (select deck_id, sum(quantity) as n from public.deck_cards group by deck_id) c on c.deck_id = d.id
    where d.user_id = p_uid and d.faction_id is not null and c.n >= v_min;
  return v_out;
end $$;

-- ── Generavimas ────────────────────────────────────────────────────────────
create or replace function public.rvn__pick_quest_template(
  p_uid uuid, p_difficulty text, p_exclude_groups text[], p_exclude_codes text[]
) returns public.daily_quest_templates language plpgsql volatile security definer set search_path = public as $$
declare v_cfg jsonb; v_stats boolean; v_pvp boolean; v_factions int[]; v_t public.daily_quest_templates;
begin
  select value into v_cfg from public.economy_config where key='daily_quests_v2';
  v_stats := coalesce((v_cfg->'generation'->>'enable_stat_objectives')::boolean, false);
  v_pvp := public.rvn__pvp_available(p_uid);
  v_factions := public.rvn__playable_deck_factions(p_uid);

  select * into v_t from public.daily_quest_templates t
   where t.is_active and t.difficulty = p_difficulty
     and (v_stats or not t.requires_stats)
     and (v_pvp or not t.requires_pvp)
     and (not t.requires_faction or array_length(v_factions,1) > 0)
     and not (t.conflict_group = any(coalesce(p_exclude_groups,'{}')))
     and not (t.code = any(coalesce(p_exclude_codes,'{}')))
   order by random() * t.weight desc
   limit 1;

  if v_t.code is null then
    -- atsarginis variantas: atlaisvinam konfliktų filtrą, bet NE tinkamumo
    select * into v_t from public.daily_quest_templates t
     where t.is_active and t.difficulty = p_difficulty
       and (v_stats or not t.requires_stats)
       and (v_pvp or not t.requires_pvp)
       and (not t.requires_faction or array_length(v_factions,1) > 0)
       and not (t.code = any(coalesce(p_exclude_codes,'{}')))
     order by random() * t.weight desc limit 1;
  end if;
  return v_t;
end $$;

create or replace function public.rvn__ensure_daily_quests(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_dk date := public.rvn__utc_date(); v_cfg jsonb; v_diff text; v_t public.daily_quest_templates;
  v_groups text[] := '{}'; v_codes text[] := '{}'; v_fac int; v_factions int[]; v_ver int := public.rvn__economy_version();
begin
  if p_uid is null then return; end if;
  if exists (select 1 from public.user_daily_quests_v2 where user_id=p_uid and date_key=v_dk) then return; end if;

  select value into v_cfg from public.economy_config where key='daily_quests_v2';
  v_factions := public.rvn__playable_deck_factions(p_uid);

  foreach v_diff in array array['easy','medium','hard'] loop
    v_t := public.rvn__pick_quest_template(p_uid, v_diff, v_groups, v_codes);
    if v_t.code is null then continue; end if;
    v_groups := array_append(v_groups, v_t.conflict_group);
    v_codes  := array_append(v_codes, v_t.code);
    v_fac := null;
    if v_t.requires_faction and array_length(v_factions,1) > 0 then
      v_fac := v_factions[1 + floor(random() * array_length(v_factions,1))::int];
    end if;
    insert into public.user_daily_quests_v2(user_id, date_key, difficulty, template_code, objective_type,
                                         target_value, faction_id, rewards, economy_version)
      values (p_uid, v_dk, v_diff, v_t.code, v_t.objective_type, v_t.target_value, v_fac,
              coalesce(v_cfg->'rewards'->v_diff, '[]'::jsonb), v_ver)
      on conflict (user_id, date_key, difficulty) do nothing;
  end loop;

  insert into public.user_daily_quest_meta(user_id, date_key) values (p_uid, v_dk) on conflict do nothing;
end $$;

-- ── Progresas iš kovų ──────────────────────────────────────────────────────
create or replace function public.rvn__quests_progress(
  p_uid uuid, p_objective text, p_amount int, p_faction int default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_dk date := public.rvn__utc_date();
begin
  if p_uid is null or coalesce(p_amount,0) <= 0 then return; end if;
  update public.user_daily_quests_v2 q
    set progress = least(q.target_value, q.progress + p_amount),
        is_completed = (q.progress + p_amount >= q.target_value),
        completed_at = case when (q.progress + p_amount >= q.target_value) and q.completed_at is null
                            then now() else q.completed_at end
  where q.user_id = p_uid and q.date_key = v_dk and not q.is_completed
    and q.objective_type = p_objective
    and (q.faction_id is null or q.faction_id = p_faction);
end $$;

create or replace function public.rvn__quests_from_match()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not NEW.valid_for_rewards then return NEW; end if;
  perform public.rvn__ensure_daily_quests(NEW.user_id);
  perform public.rvn__quests_progress(NEW.user_id, 'play_match', 1);
  if NEW.result = 'win' then
    perform public.rvn__quests_progress(NEW.user_id, 'win_match', 1);
  end if;
  return NEW;
end $$;
drop trigger if exists trg_quests_v2_from_match on public.matches;
create trigger trg_quests_v2_from_match after insert on public.matches
  for each row execute function public.rvn__quests_from_match();

-- Kovos telemetrija (kortos / žala / kaladės frakcija). Idempotentiška per matches eilutę.
alter table public.matches add column if not exists deck_faction_id int references public.factions(id);
alter table public.matches add column if not exists creatures_played int;
alter table public.matches add column if not exists spells_played int;
alter table public.matches add column if not exists damage_dealt int;
alter table public.matches add column if not exists stats_reported_at timestamptz;

create or replace function public.rvn_report_match_stats(
  p_client_match_id uuid, p_stats jsonb, p_deck_faction_id int default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_m public.matches%rowtype; v_c int; v_s int; v_d int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  select * into v_m from public.matches
    where user_id = v_uid and client_match_id = p_client_match_id for update;
  if v_m.id is null then return jsonb_build_object('error','match_not_found'); end if;
  if v_m.stats_reported_at is not null then return jsonb_build_object('ok', true, 'duplicate', true); end if;

  v_c := greatest(0, coalesce((p_stats->>'creaturesPlayed')::int, 0));
  v_s := greatest(0, coalesce((p_stats->>'spellsPlayed')::int, 0));
  v_d := greatest(0, coalesce((p_stats->>'damageDealt')::int, 0));

  update public.matches set creatures_played = v_c, spells_played = v_s, damage_dealt = v_d,
         deck_faction_id = p_deck_faction_id, stats_reported_at = now()
    where id = v_m.id;

  if v_m.valid_for_rewards then
    perform public.rvn__ensure_daily_quests(v_uid);
    perform public.rvn__quests_progress(v_uid, 'play_creatures', v_c);
    perform public.rvn__quests_progress(v_uid, 'play_spells', v_s);
    perform public.rvn__quests_progress(v_uid, 'deal_damage', v_d);
    if v_m.result = 'win' and p_deck_faction_id is not null then
      perform public.rvn__quests_progress(v_uid, 'win_faction_match', 1, p_deck_faction_id);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;

-- ── Būsena ──────────────────────────────────────────────────────────────────
create or replace function public.rvn_get_daily_quests_v2()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_dk date := public.rvn__utc_date(); v_cfg jsonb;
  v_quests jsonb; v_all boolean; v_meta record; v_used int; v_max int; v_cost int; v_free int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  perform public.rvn__ensure_daily_quests(v_uid);
  select value into v_cfg from public.economy_config where key='daily_quests_v2';
  v_free := coalesce((v_cfg->'reroll'->>'free')::int, 1);
  v_max  := coalesce((v_cfg->'reroll'->>'max_total')::int, 3);
  v_cost := coalesce((v_cfg->'reroll'->>'paid_cost_silver')::int, 100);

  select * into v_meta from public.user_daily_quest_meta where user_id=v_uid and date_key=v_dk;
  v_used := (case when coalesce(v_meta.free_reroll_used,false) then 1 else 0 end) + coalesce(v_meta.paid_reroll_count,0);

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'difficulty', q.difficulty, 'templateCode', q.template_code,
      'objectiveType', q.objective_type, 'titleKey', t.title_key, 'descKey', t.desc_key,
      'target', q.target_value, 'progress', q.progress, 'factionId', q.faction_id,
      'rewards', q.rewards, 'completed', q.is_completed, 'claimed', q.is_claimed,
      'rerollable', not q.is_completed and not q.is_claimed and v_used < v_max,
      'rerollCostSilver', case when v_used < v_free then 0 else v_cost end)
      order by case q.difficulty when 'easy' then 1 when 'medium' then 2 else 3 end), '[]'::jsonb)
    into v_quests
    from public.user_daily_quests_v2 q join public.daily_quest_templates t on t.code = q.template_code
    where q.user_id=v_uid and q.date_key=v_dk;

  select count(*) = 3 and bool_and(is_completed) into v_all
    from public.user_daily_quests_v2 where user_id=v_uid and date_key=v_dk;

  return jsonb_build_object(
    'dateKey', v_dk,
    'resetAt', public.rvn__next_utc_midnight(),
    'quests', v_quests,
    'allCompleted', coalesce(v_all,false),
    'chest', jsonb_build_object(
      'rewards', coalesce(v_cfg->'chest','[]'::jsonb),
      'claimable', coalesce(v_all,false) and not exists (select 1 from public.user_daily_chests where user_id=v_uid and date_key=v_dk),
      'claimed', exists (select 1 from public.user_daily_chests where user_id=v_uid and date_key=v_dk)),
    'reroll', jsonb_build_object(
      'used', v_used, 'max', v_max, 'freeRemaining', greatest(0, v_free - v_used),
      'nextCostSilver', case when v_used >= v_max then null when v_used < v_free then 0 else v_cost end),
    'dailyMax', coalesce(v_cfg->'daily_max','{}'::jsonb),
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'balances', public.rvn__balances(v_uid),
    'serverTime', now()
  );
end $$;

-- ── Claim quest ────────────────────────────────────────────────────────────
create or replace function public.rvn_claim_daily_quest(p_quest_id bigint, p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_rewards jsonb; v_upd int; v_grant jsonb; v_res jsonb; v_prev jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='claim_quest' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;
  perform 1 from public.profiles where id=v_uid for update;

  update public.user_daily_quests_v2 set is_claimed = true, claimed_at = now()
    where id = p_quest_id and user_id = v_uid and is_completed and not is_claimed
    returning rewards into v_rewards;
  get diagnostics v_upd = row_count;
  if v_upd = 0 then return jsonb_build_object('error','not_claimable'); end if;

  v_grant := public.rvn__grant_rewards_v2(v_uid, v_rewards, 'daily_quest', p_quest_id::text);
  v_res := jsonb_build_object(
    'status', case when jsonb_array_length(v_grant->'pendingChoices') > 0 then 'choice_required' else 'completed' end,
    'grantedRewards', v_grant->'granted',
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'snapshot', public.rvn_get_daily_quests_v2());
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'claim_quest', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

-- ── Claim chest ────────────────────────────────────────────────────────────
create or replace function public.rvn_claim_daily_chest_v2(p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_dk date := public.rvn__utc_date(); v_all boolean;
        v_rewards jsonb; v_grant jsonb; v_res jsonb; v_prev jsonb; v_ins int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='claim_chest' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;
  perform 1 from public.profiles where id=v_uid for update;

  select count(*) = 3 and bool_and(is_completed) into v_all
    from public.user_daily_quests_v2 where user_id=v_uid and date_key=v_dk;
  if not coalesce(v_all,false) then return jsonb_build_object('error','not_all_completed'); end if;

  select coalesce(value->'chest','[]'::jsonb) into v_rewards from public.economy_config where key='daily_quests_v2';
  insert into public.user_daily_chests(user_id, date_key, rewards) values (v_uid, v_dk, v_rewards)
    on conflict do nothing;
  get diagnostics v_ins = row_count;
  if v_ins = 0 then return jsonb_build_object('error','already_claimed'); end if;

  v_grant := public.rvn__grant_rewards_v2(v_uid, v_rewards, 'daily_chest', v_dk::text);
  v_res := jsonb_build_object('status','completed', 'grantedRewards', v_grant->'granted',
    'pendingChoices', public.rvn__pending_choices(v_uid), 'snapshot', public.rvn_get_daily_quests_v2());
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'claim_chest', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

-- ── Reroll ──────────────────────────────────────────────────────────────────
create or replace function public.rvn_reroll_daily_quest(
  p_quest_id bigint, p_confirm_progress_loss boolean default false, p_idempotency_key text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_dk date := public.rvn__utc_date(); v_cfg jsonb;
  v_q public.user_daily_quests_v2%rowtype; v_meta public.user_daily_quest_meta%rowtype;
  v_free int; v_max int; v_cost int; v_used int; v_pay int := 0;
  v_groups text[]; v_codes text[]; v_t public.daily_quest_templates; v_factions int[]; v_fac int;
  v_res jsonb; v_prev jsonb; v_silver int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_idempotency_key is not null then
    select response into v_prev from public.progression_idempotency
      where user_id=v_uid and action='reroll_quest' and idempotency_key=p_idempotency_key;
    if v_prev is not null then return v_prev; end if;
  end if;

  -- viena transakcija + eilutės užraktas → lygiagrečios užklausos nenuskaito du kartus
  perform 1 from public.profiles where id=v_uid for update;

  select * into v_q from public.user_daily_quests_v2 where id=p_quest_id and user_id=v_uid for update;
  if v_q.id is null then return jsonb_build_object('error','quest_not_found'); end if;
  if v_q.is_completed or v_q.is_claimed then return jsonb_build_object('error','quest_completed'); end if;
  if v_q.progress > 0 and not p_confirm_progress_loss then
    return jsonb_build_object('error','confirmation_required', 'progress', v_q.progress, 'target', v_q.target_value);
  end if;

  select value into v_cfg from public.economy_config where key='daily_quests_v2';
  v_free := coalesce((v_cfg->'reroll'->>'free')::int, 1);
  v_max  := coalesce((v_cfg->'reroll'->>'max_total')::int, 3);
  v_cost := coalesce((v_cfg->'reroll'->>'paid_cost_silver')::int, 100);

  insert into public.user_daily_quest_meta(user_id, date_key) values (v_uid, v_dk) on conflict do nothing;
  select * into v_meta from public.user_daily_quest_meta where user_id=v_uid and date_key=v_dk for update;
  v_used := (case when v_meta.free_reroll_used then 1 else 0 end) + v_meta.paid_reroll_count;
  if v_used >= v_max then return jsonb_build_object('error','reroll_limit_reached','used',v_used,'max',v_max); end if;

  if v_used < v_free then
    update public.user_daily_quest_meta set free_reroll_used = true where user_id=v_uid and date_key=v_dk;
  else
    select gold into v_silver from public.profiles where id=v_uid;
    if v_silver < v_cost then return jsonb_build_object('error','not_enough_silver','cost',v_cost); end if;
    v_pay := v_cost;
  end if;

  -- naujas šablonas: ta pati difficulty, ne toks pat kaip ką tik išmestas ir ne
  -- toks pat kaip kiti šiandienos questai
  select coalesce(array_agg(t.conflict_group), '{}'), coalesce(array_agg(q.template_code), '{}')
    into v_groups, v_codes
    from public.user_daily_quests_v2 q join public.daily_quest_templates t on t.code=q.template_code
    where q.user_id=v_uid and q.date_key=v_dk and q.id <> v_q.id;
  v_codes := v_codes || v_q.template_code || coalesce(v_meta.retired_codes, '{}');

  v_t := public.rvn__pick_quest_template(v_uid, v_q.difficulty, v_groups, v_codes);
  if v_t.code is null then
    -- paskutinė išeitis: bet koks tinkamas tos difficulty šablonas, išskyrus dabartinį
    v_t := public.rvn__pick_quest_template(v_uid, v_q.difficulty, '{}', array[v_q.template_code]);
  end if;
  if v_t.code is null then return jsonb_build_object('error','no_alternative_quest'); end if;

  if v_pay > 0 then
    update public.profiles set gold = gold - v_pay where id=v_uid;
    update public.user_daily_quest_meta set paid_reroll_count = paid_reroll_count + 1
      where user_id=v_uid and date_key=v_dk;
    insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
      values (v_uid, 'daily_quest_reroll', v_q.id::text, 'currency', 'silver', -v_pay);
  end if;

  v_factions := public.rvn__playable_deck_factions(v_uid);
  v_fac := null;
  if v_t.requires_faction and array_length(v_factions,1) > 0 then
    v_fac := v_factions[1 + floor(random() * array_length(v_factions,1))::int];
  end if;

  update public.user_daily_quests_v2
    set template_code = v_t.code, objective_type = v_t.objective_type, target_value = v_t.target_value,
        faction_id = v_fac, progress = 0, is_completed = false, completed_at = null,
        reroll_index = reroll_index + 1,
        rewards = coalesce(v_cfg->'rewards'->v_q.difficulty, v_q.rewards)   -- difficulty ir vertė nesikeičia
    where id = v_q.id;

  update public.user_daily_quest_meta
    set retired_codes = array(select distinct unnest(coalesce(retired_codes,'{}') || v_q.template_code))
    where user_id=v_uid and date_key=v_dk;

  v_res := jsonb_build_object('status','completed','questId', v_q.id, 'paidSilver', v_pay,
    'snapshot', public.rvn_get_daily_quests_v2());
  if p_idempotency_key is not null then
    insert into public.progression_idempotency(user_id, action, idempotency_key, response)
      values (v_uid, 'reroll_quest', p_idempotency_key, v_res) on conflict do nothing;
  end if;
  return v_res;
end $$;

grant execute on function public.rvn_get_daily_quests_v2() to authenticated;
grant execute on function public.rvn_claim_daily_quest(bigint, text) to authenticated;
grant execute on function public.rvn_claim_daily_chest_v2(text) to authenticated;
grant execute on function public.rvn_reroll_daily_quest(bigint, boolean, text) to authenticated;
grant execute on function public.rvn_report_match_stats(uuid, jsonb, int) to authenticated;


-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  20260845_progression_api.sql                                          ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════
--  PROGRESSION v2 — BENDRAS API SLUOKSNIS
--  • rvn_get_progression_snapshot() — viskas vienu kvietimu (login+season+quests)
--  • rvn_continue_pending_claims()  — tęsia „Claim All" po pasirinkimo
--  • rvn_get_progression_config()   — ekonomikos konfigūracija tik skaitymui
--  • saugumo patikros: viskas per auth.uid(); klientas neperduoda user_id
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.rvn_get_progression_snapshot()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  return jsonb_build_object(
    'login',   public.rvn_get_login_cycle(),
    'season',  public.rvn_get_season_path_v2(),
    'quests',  public.rvn_get_daily_quests_v2(),
    'pendingChoices', public.rvn__pending_choices(v_uid),
    'balances', public.rvn__balances(v_uid),
    'economyVersion', public.rvn__economy_version(),
    'serverTime', now()
  );
end $$;

-- Tęsia nutrūkusį „Claim All" (po to, kai pasirinkimai išspręsti)
create or replace function public.rvn_continue_pending_claims(p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if jsonb_array_length(public.rvn__pending_choices(v_uid)) > 0 then
    return jsonb_build_object('status','choice_required','grantedRewards','[]'::jsonb,
      'pendingChoices', public.rvn__pending_choices(v_uid),
      'snapshot', public.rvn_get_progression_snapshot());
  end if;
  return public.rvn_claim_all_season_rewards(p_idempotency_key);
end $$;

-- Ekonomikos konfigūracija klientui (tik skaitymui; sumos NIEKADA iš kliento)
create or replace function public.rvn_get_progression_config()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object(
    'economyVersion', public.rvn__economy_version(),
    'loginCycle', jsonb_build_object(
      'length', 31,
      'rewards', coalesce((select jsonb_agg(jsonb_build_object('day',day_number,'rewards',rewards,'milestone',is_milestone) order by day_number)
                           from public.login_cycle_reward_defs where economy_version = public.rvn__economy_version()), '[]'::jsonb)),
    'seasonPath', (select value from public.economy_config where key='season_path_v2'),
    'dailyQuests', (select value from public.economy_config where key='daily_quests_v2'),
    'booster', (select value from public.economy_config where key='booster_v2'),
    'factions', coalesce((select jsonb_agg(jsonb_build_object('id',id,'slug',slug,'name',name,'alignment',alignment))
                          from public.rvn__selectable_factions()), '[]'::jsonb)
  );
end $$;

grant execute on function public.rvn_get_progression_snapshot() to authenticated;
grant execute on function public.rvn_continue_pending_claims(text) to authenticated;
grant execute on function public.rvn_get_progression_config() to authenticated;

-- ── Saugumo pastaba (RLS) ──────────────────────────────────────────────────
--  Visos v2 lentelės: RLS įjungtas, SELECT tik savo eilutėms (user_id=auth.uid()),
--  jokių INSERT/UPDATE/DELETE politikų klientui — visi rašymai vyksta tik per
--  security definer RPC, kurie tapatybę ima iš auth.uid(), o ne iš parametro.
--  Definition lentelės (login_cycle_reward_defs, daily_quest_templates,
--  season_reward_defs) — vieša tik SELECT teisė; rašymas tik admin rolei.


-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  20260846_progression_ui_fields.sql                                    ║
-- ╚════════════════════════════════════════════════════════════════════════╝

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


-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  20260847_daily_quests_fix.sql                                         ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════
--  PROGRESSION v2 — DIENOS UŽDUOČIŲ PATAISOS
--  ─────────────────────────────────────────────────────────────────────────
--  Rasta tikrinant „dienos užduotys neveikia":
--   1) `mode_restriction` buvo ignoruojamas skaičiuojant progresą — questas
--      „Laimėk kovą su botu" užsiskaitydavo iš BET KOKIOS pergalės (taip pat
--      reitinguotos / nereitinguotos). Dabar režimas įrašomas į questo eilutę
--      ir tikrinamas didinant progresą.
--   2) Be telemetrijos (enable_stat_objectives=false) ir be PvP likdavo per
--      mažai šablonų → visos trys dienos užduotys tapdavo „Sužaisk N kovų".
--      Pridedami botų režimo šablonai medium/hard + atskiriama „win_bot"
--      konfliktų grupė → 3 skirtingos užduotys jau nuo pirmos dienos.
--   3) Jei kuriai nors sudėtingumo klasei nelikdavo tinkamo šablono, eilutė
--      būdavo praleidžiama → mažiau nei 3 questai → dienos skrynia NIEKADA
--      neatsidarydavo. Pridėta paskutinės išeities atsarga.
--   4) Generuojant užduotis nebuvo BACKFILL'inamos tą parą jau sužaistos
--      galiojančios kovos (v1 sistema tai darė) → progresas prapuldavo, jei
--      questai sugeneruojami po kovos (pvz. pirmą kartą pritaikius migracijas).
--  Logika, atlygiai ir ekonomika NEKEIČIAMI.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Režimo apribojimas keliauja į questo eilutę ─────────────────────────
alter table public.user_daily_quests_v2
  add column if not exists mode_restriction text;

update public.user_daily_quests_v2 q
  set mode_restriction = t.mode_restriction
  from public.daily_quest_templates t
  where t.code = q.template_code and q.mode_restriction is distinct from t.mode_restriction;

-- ── 2) Papildomi šablonai be telemetrijos ir be PvP ────────────────────────
--     (bot režimas prieinamas visiems žaidėjams nuo pirmos dienos)
insert into public.daily_quest_templates
  (code, difficulty, objective_type, target_value, mode_restriction, requires_pvp, requires_faction, requires_stats, conflict_group, weight, title_key, desc_key) values
 ('med_win_bot_2',  'medium','win_match', 2, 'bot', false,false,false,'win_bot', 10,'quests.v2.winBot.title','quests.v2.winBot.desc'),
 ('hard_win_bot_3', 'hard',  'win_match', 3, 'bot', false,false,false,'win_bot', 10,'quests.v2.winBot.title','quests.v2.winBot.desc'),
 ('med_play_bot_4', 'medium','play_match',4, 'bot', false,false,false,'play_bot', 8,'quests.v2.playBot.title','quests.v2.playBot.desc'),
 ('hard_play_bot_7','hard',  'play_match',7, 'bot', false,false,false,'play_bot', 8,'quests.v2.playBot.title','quests.v2.playBot.desc')
on conflict (code) do nothing;

-- „Laimėk su botu" turi savo konfliktų grupę — kitaip jis blokuodavo visus
-- kitus pergalių questus ir likdavo tik „sužaisk N kovų".
update public.daily_quest_templates set conflict_group = 'win_bot'
  where code = 'easy_win_bot_1' and conflict_group <> 'win_bot';

-- ── 3) Progresas — su režimo patikra ───────────────────────────────────────
drop function if exists public.rvn__quests_progress(uuid, text, int, int);

create or replace function public.rvn__quests_progress(
  p_uid uuid, p_objective text, p_amount int, p_faction int default null, p_mode text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_dk date := public.rvn__utc_date();
begin
  if p_uid is null or coalesce(p_amount,0) <= 0 then return; end if;
  update public.user_daily_quests_v2 q
    set progress = least(q.target_value, q.progress + p_amount),
        is_completed = (q.progress + p_amount >= q.target_value),
        completed_at = case when (q.progress + p_amount >= q.target_value) and q.completed_at is null
                            then now() else q.completed_at end
  where q.user_id = p_uid and q.date_key = v_dk and not q.is_completed
    and q.objective_type = p_objective
    and (q.faction_id is null or q.faction_id = p_faction)
    and (q.mode_restriction is null or q.mode_restriction = p_mode);
end $$;

-- ── 4) Trigeris perduoda kovos režimą ──────────────────────────────────────
create or replace function public.rvn__quests_from_match()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not NEW.valid_for_rewards then return NEW; end if;
  perform public.rvn__ensure_daily_quests(NEW.user_id);
  perform public.rvn__quests_progress(NEW.user_id, 'play_match', 1, null, NEW.mode);
  if NEW.result = 'win' then
    perform public.rvn__quests_progress(NEW.user_id, 'win_match', 1, null, NEW.mode);
  end if;
  return NEW;
end $$;

-- Telemetrijos questai režimo neriboja (mode_restriction null) — perduodam
-- tikrą kovos režimą, kad ateityje būtų galima riboti ir juos.
create or replace function public.rvn_report_match_stats(
  p_client_match_id uuid, p_stats jsonb, p_deck_faction_id int default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_m public.matches%rowtype; v_c int; v_s int; v_d int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  select * into v_m from public.matches
    where user_id = v_uid and client_match_id = p_client_match_id for update;
  if v_m.id is null then return jsonb_build_object('error','match_not_found'); end if;
  if v_m.stats_reported_at is not null then return jsonb_build_object('ok', true, 'duplicate', true); end if;

  v_c := greatest(0, coalesce((p_stats->>'creaturesPlayed')::int, 0));
  v_s := greatest(0, coalesce((p_stats->>'spellsPlayed')::int, 0));
  v_d := greatest(0, coalesce((p_stats->>'damageDealt')::int, 0));

  update public.matches set creatures_played = v_c, spells_played = v_s, damage_dealt = v_d,
         deck_faction_id = p_deck_faction_id, stats_reported_at = now()
    where id = v_m.id;

  if v_m.valid_for_rewards then
    perform public.rvn__ensure_daily_quests(v_uid);
    perform public.rvn__quests_progress(v_uid, 'play_creatures', v_c, null, v_m.mode);
    perform public.rvn__quests_progress(v_uid, 'play_spells', v_s, null, v_m.mode);
    perform public.rvn__quests_progress(v_uid, 'deal_damage', v_d, null, v_m.mode);
    if v_m.result = 'win' and p_deck_faction_id is not null then
      perform public.rvn__quests_progress(v_uid, 'win_faction_match', 1, p_deck_faction_id, v_m.mode);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;

-- ── 5) Generavimas: garantuotai 3 questai + režimas + backfill ─────────────
create or replace function public.rvn__ensure_daily_quests(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_dk date := public.rvn__utc_date(); v_cfg jsonb; v_diff text; v_t public.daily_quest_templates;
  v_groups text[] := '{}'; v_codes text[] := '{}'; v_fac int; v_factions int[];
  v_ver int := public.rvn__economy_version();
begin
  if p_uid is null then return; end if;
  if exists (select 1 from public.user_daily_quests_v2 where user_id=p_uid and date_key=v_dk) then return; end if;

  select value into v_cfg from public.economy_config where key='daily_quests_v2';
  v_factions := public.rvn__playable_deck_factions(p_uid);

  foreach v_diff in array array['easy','medium','hard'] loop
    v_t := public.rvn__pick_quest_template(p_uid, v_diff, v_groups, v_codes);
    -- paskutinė išeitis: geriau pasikartojanti užduotis nei jokios — kitaip
    -- žaidėjas turėtų < 3 questų ir dienos skrynia niekada neatsidarytų.
    if v_t.code is null then
      select * into v_t from public.daily_quest_templates t
       where t.is_active and t.difficulty = v_diff and not t.requires_stats and not t.requires_pvp
         and not t.requires_faction
       order by random() * t.weight desc limit 1;
    end if;
    if v_t.code is null then continue; end if;
    v_groups := array_append(v_groups, v_t.conflict_group);
    v_codes  := array_append(v_codes, v_t.code);
    v_fac := null;
    if v_t.requires_faction and array_length(v_factions,1) > 0 then
      v_fac := v_factions[1 + floor(random() * array_length(v_factions,1))::int];
    end if;
    insert into public.user_daily_quests_v2(user_id, date_key, difficulty, template_code, objective_type,
                                         target_value, faction_id, mode_restriction, rewards, economy_version)
      values (p_uid, v_dk, v_diff, v_t.code, v_t.objective_type, v_t.target_value, v_fac,
              v_t.mode_restriction, coalesce(v_cfg->'rewards'->v_diff, '[]'::jsonb), v_ver)
      on conflict (user_id, date_key, difficulty) do nothing;
  end loop;

  insert into public.user_daily_quest_meta(user_id, date_key) values (p_uid, v_dk) on conflict do nothing;

  -- ── BACKFILL: šią UTC parą jau sužaistos galiojančios kovos ──────────────
  --  Režimą ribojantiems questams — tik to režimo kovos; neribojantiems — visos.
  --  DĖMESIO: `update ... from (...) cross join lateral (... target_alias ...)`
  --  PostgreSQL'e NEGALIOJA (invalid reference to FROM-clause entry) — todėl
  --  „done" suskaičiuojamas atskirame použklausyje su savo alias'u.
  update public.user_daily_quests_v2 q
    set progress = least(q.target_value, d.done),
        is_completed = (d.done >= q.target_value),
        completed_at = case when d.done >= q.target_value and q.completed_at is null then now() else q.completed_at end
  from (
    select u.id,
           case u.objective_type when 'play_match' then s.played
                                 when 'win_match'  then s.won else 0 end as done
      from public.user_daily_quests_v2 u
      join (
        select m.mode, count(*) as played, count(*) filter (where m.result = 'win') as won
          from public.matches m
         where m.user_id = p_uid and m.valid_for_rewards
           and (m.created_at at time zone 'UTC')::date = v_dk
         group by m.mode
      ) s on s.mode = u.mode_restriction
     where u.user_id = p_uid and u.date_key = v_dk
    union all
    select u.id,
           case u.objective_type when 'play_match' then s.played
                                 when 'win_match'  then s.won else 0 end
      from public.user_daily_quests_v2 u
      cross join (
        select count(*) as played, count(*) filter (where m.result = 'win') as won
          from public.matches m
         where m.user_id = p_uid and m.valid_for_rewards
           and (m.created_at at time zone 'UTC')::date = v_dk
      ) s
     where u.user_id = p_uid and u.date_key = v_dk and u.mode_restriction is null
  ) d
  where q.id = d.id and not q.is_completed and d.done > 0;
end $$;

-- ── 6) Režimo apribojimas visada sinchronizuojamas su šablonu ─────────────
--     Taip padengiami VISI keliai (generavimas, reroll, admin taisymai) —
--     nereikia kartoti to paties `update` kelete funkcijų.
create or replace function public.rvn__quest_sync_mode()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select t.mode_restriction into NEW.mode_restriction
    from public.daily_quest_templates t where t.code = NEW.template_code;
  return NEW;
end $$;

drop trigger if exists trg_quest_sync_mode on public.user_daily_quests_v2;
create trigger trg_quest_sync_mode before insert or update of template_code
  on public.user_daily_quests_v2
  for each row execute function public.rvn__quest_sync_mode();

-- ── 7) Trigeris perkuriamas su nauja funkcija ──────────────────────────────
drop trigger if exists trg_quests_v2_from_match on public.matches;
create trigger trg_quests_v2_from_match after insert on public.matches
  for each row execute function public.rvn__quests_from_match();

grant execute on function public.rvn_report_match_stats(uuid, jsonb, int) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
--  KRITINIS: v1 (`user_daily_tasks`) generavimas buvo NEVEIKIANTIS
--  ─────────────────────────────────────────────────────────────────────────
--  20260835_daily_tasks_selfheal.sql backfill'e naudojama konstrukcija
--     update ... from (...) c cross join lateral (select ... t.objective_type ...)
--  PostgreSQL'e neteisėta — UPDATE tikslinės lentelės alias'o negalima naudoti
--  FROM sąrašo lateral'e. Sakinys metasi „invalid reference to FROM-clause
--  entry for table t", todėl VISAS `rvn__ensure_daily_tasks` kvietimas
--  atsukamas atgal:
--    • `rvn_get_daily_tasks()` (pagrindinis puslapis) grąžindavo klaidą →
--      dienos užduotys nesugeneruodavo NIEKADA;
--    • trigeris ant `matches` taip pat metėsi → pirmoji paros kova galėjo
--      nepasirašyti.
--  Čia sakinys perrašomas teisinga forma. Ekonomika/logika nekeičiama.
-- ════════════════════════════════════════════════════════════════════════════
do $do$
begin
  if to_regprocedure('public.rvn__ensure_daily_tasks(uuid)') is null then return; end if;

  create or replace function public.rvn__ensure_daily_tasks(p_uid uuid)
  returns void language plpgsql security definer set search_path = public as $fn$
  declare
    v_dk text := public.rvn__daily_key();
    v_diff text; v_used text[] := '{}'; v_tpl record; v_cnt int;
  begin
    if p_uid is null then return; end if;

    select count(*) into v_cnt from public.user_daily_tasks where user_id = p_uid and date_key = v_dk;
    if v_cnt <> 0 then return; end if;

    foreach v_diff in array array['easy','medium','hard'] loop
      select * into v_tpl from public.daily_task_templates
        where is_active and difficulty = v_diff and not (objective_type = any(v_used))
        order by random() * weight desc limit 1;
      if not found then
        select * into v_tpl from public.daily_task_templates
          where is_active and difficulty = v_diff order by random() limit 1;
      end if;
      if found then
        v_used := array_append(v_used, v_tpl.objective_type);
        insert into public.user_daily_tasks(user_id, template_id, date_key, difficulty, objective_type,
                                            title, description, target_value, reward_payload)
          values (p_uid, v_tpl.id, v_dk, v_diff, v_tpl.objective_type,
                  v_tpl.title, v_tpl.description, v_tpl.target_value, v_tpl.reward_payload)
          on conflict (user_id, date_key, difficulty) do nothing;
      end if;
    end loop;

    select count(*) into v_cnt from public.user_daily_tasks where user_id = p_uid and date_key = v_dk;
    if v_cnt = 0 then
      insert into public.user_daily_tasks(user_id, template_id, date_key, difficulty, objective_type,
                                          title, description, target_value, reward_payload)
      select p_uid, t.id, v_dk, t.difficulty, t.objective_type, t.title, t.description, t.target_value, t.reward_payload
      from (
        select distinct on (difficulty) * from public.daily_task_templates
        where is_active order by difficulty, random()
      ) t
      on conflict (user_id, date_key, difficulty) do nothing;
    end if;

    insert into public.user_daily_completion(user_id, date_key) values (p_uid, v_dk) on conflict do nothing;
    insert into public.user_daily_rerolls(user_id, date_key)  values (p_uid, v_dk) on conflict do nothing;

    -- BACKFILL (perrašyta teisinga forma)
    update public.user_daily_tasks t
      set progress = least(t.target_value, d.done),
          is_completed = (d.done >= t.target_value),
          completed_at = case when d.done >= t.target_value and t.completed_at is null then now() else t.completed_at end
    from (
      select u.id,
             case u.objective_type
               when 'play_match'   then c.play_match
               when 'win_match'    then c.win_match
               when 'win_bot'      then c.win_bot
               when 'win_unranked' then c.win_unranked
               when 'win_ranked'   then c.win_ranked
               when 'play_ranked'  then c.play_ranked
               else 0 end as done
        from public.user_daily_tasks u
        cross join (
          select
            count(*)                                                     as play_match,
            count(*) filter (where m.result = 'win')                     as win_match,
            count(*) filter (where m.result = 'win' and m.mode = 'bot')  as win_bot,
            count(*) filter (where m.result = 'win' and m.mode = 'unranked') as win_unranked,
            count(*) filter (where m.result = 'win' and m.mode = 'ranked')   as win_ranked,
            count(*) filter (where m.mode = 'ranked')                    as play_ranked
          from public.matches m
          where m.user_id = p_uid and m.valid_for_rewards
            and to_char((m.created_at - interval '5 hours')::date, 'YYYY-MM-DD') = v_dk
        ) c
       where u.user_id = p_uid and u.date_key = v_dk
    ) d
    where t.id = d.id and not t.is_completed and d.done > 0;
  end $fn$;
end
$do$;
