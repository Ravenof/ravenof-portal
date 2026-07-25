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
