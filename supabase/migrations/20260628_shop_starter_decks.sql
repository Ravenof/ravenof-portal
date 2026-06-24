-- ── Ravenof Digital: starter kaladės + shop admin + kosmetikos paveikslėliai ──

-- 1) Kosmetikai – paveikslėlis (admino įkeltas) + admin valdymas
alter table public.cosmetics add column if not exists image_url text;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='cosmetics' and policyname='cos_admin_all') then
    create policy "cos_admin_all" on public.cosmetics for all using (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    );
  end if;
end $$;

-- 2) Starter kaladės (0 gold pradžiamoksliai)
create table if not exists public.starter_decks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  faction_id  int  references public.factions(id),
  image_url   text,
  price_gold  int  not null default 0,
  is_active   boolean not null default true,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.starter_decks enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='starter_decks' and policyname='sd_read') then
    create policy "sd_read" on public.starter_decks for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='starter_decks' and policyname='sd_admin_all') then
    create policy "sd_admin_all" on public.starter_decks for all using (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    );
  end if;
end $$;

create table if not exists public.starter_deck_cards (
  starter_deck_id uuid not null references public.starter_decks(id) on delete cascade,
  card_id         uuid not null references public.cards(id) on delete cascade,
  quantity        int  not null default 1,
  primary key (starter_deck_id, card_id)
);
alter table public.starter_deck_cards enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='starter_deck_cards' and policyname='sdc_read') then
    create policy "sdc_read" on public.starter_deck_cards for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='starter_deck_cards' and policyname='sdc_admin_all') then
    create policy "sdc_admin_all" on public.starter_deck_cards for all using (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    );
  end if;
end $$;

create table if not exists public.user_starter_deck_claims (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  starter_deck_id uuid not null references public.starter_decks(id) on delete cascade,
  deck_id         uuid,
  claimed_at      timestamptz not null default now(),
  primary key (user_id, starter_deck_id)
);
alter table public.user_starter_deck_claims enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_starter_deck_claims' and policyname='usdc_own_read') then
    create policy "usdc_own_read" on public.user_starter_deck_claims for select using (user_id = auth.uid());
  end if;
end $$;

-- 3) RPC: starter kaladžių sąrašas (su kortų kiekiu + ar jau paimta)
create or replace function public.rvn_get_starter_decks()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_list jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select jsonb_agg(jsonb_build_object(
    'id', s.id, 'name', s.name, 'description', s.description, 'imageUrl', s.image_url,
    'priceGold', s.price_gold, 'faction', f.name,
    'cardCount', coalesce((select sum(quantity) from public.starter_deck_cards c where c.starter_deck_id = s.id), 0),
    'claimed', exists(select 1 from public.user_starter_deck_claims u where u.user_id = v_uid and u.starter_deck_id = s.id)
  ) order by s.sort_order, s.name)
  into v_list
  from public.starter_decks s
  left join public.factions f on f.id = s.faction_id
  where s.is_active;
  return jsonb_build_object('decks', coalesce(v_list, '[]'::jsonb));
end $$;

-- 4) RPC: paimti starter kaladę → kortos į kolekciją + sukuriama paruošta kaladė
create or replace function public.rvn_claim_starter_deck(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_s public.starter_decks; v_gold int;
  v_count int; v_avg numeric; v_deck_id uuid; r record;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_s from public.starter_decks where id = p_id and is_active;
  if v_s.id is null then raise exception 'starter deck not found'; end if;
  if exists (select 1 from public.user_starter_deck_claims where user_id = v_uid and starter_deck_id = p_id) then
    raise exception 'already claimed';
  end if;

  -- kaina (paprastai 0)
  if v_s.price_gold > 0 then
    select gold into v_gold from public.profiles where id = v_uid;
    if coalesce(v_gold,0) < v_s.price_gold then raise exception 'not enough gold'; end if;
    update public.profiles set gold = gold - v_s.price_gold where id = v_uid;
  end if;

  -- kortos į kolekciją
  for r in select card_id, quantity from public.starter_deck_cards where starter_deck_id = p_id loop
    insert into public.user_collections (user_id, card_id, quantity)
      values (v_uid, r.card_id, r.quantity)
      on conflict (user_id, card_id) do update set quantity = public.user_collections.quantity + r.quantity;
  end loop;

  -- kaladės statistika
  select coalesce(sum(sdc.quantity),0),
         coalesce(round(sum(coalesce(c.gold_cost,0) * sdc.quantity)::numeric / nullif(sum(sdc.quantity),0), 2), 0)
    into v_count, v_avg
    from public.starter_deck_cards sdc
    join public.cards c on c.id = sdc.card_id
    where sdc.starter_deck_id = p_id;

  -- sukuriam kaladę
  insert into public.decks (user_id, name, description, faction_id, visibility, card_count, avg_gold_cost)
    values (v_uid, v_s.name, coalesce(v_s.description, 'Starter kaladė'), v_s.faction_id, 'private', v_count, v_avg)
    returning id into v_deck_id;

  insert into public.deck_cards (deck_id, card_id, quantity, is_side_deck)
    select v_deck_id, card_id, quantity, false from public.starter_deck_cards where starter_deck_id = p_id;

  insert into public.user_starter_deck_claims (user_id, starter_deck_id, deck_id)
    values (v_uid, p_id, v_deck_id);

  return jsonb_build_object('ok', true, 'deckId', v_deck_id);
end $$;

grant execute on function public.rvn_get_starter_decks()        to authenticated;
grant execute on function public.rvn_claim_starter_deck(uuid)   to authenticated;

-- 5) SEED: 2 starter kaladės iš 2 daugiausiai kortų turinčių frakcijų (+ Universalus)
do $$
declare
  v_neutral int := 14;  -- Universalus
  v_fac int; v_name text; v_sid uuid; v_i int := 0;
  fr record;
begin
  -- jei jau yra starter kaladžių – nieko nedarom
  if exists (select 1 from public.starter_decks) then return; end if;

  for fr in
    select c.faction_id, f.name, count(*) as n
    from public.cards c join public.factions f on f.id = c.faction_id
    where c.status = 'active' and c.faction_id is not null and c.faction_id <> v_neutral
    group by c.faction_id, f.name
    order by n desc
    limit 2
  loop
    v_i := v_i + 1;
    insert into public.starter_decks (name, description, faction_id, price_gold, is_active, sort_order)
      values ('Starter: ' || fr.name, 'Pradžiamokslio kaladė naujokams (' || fr.name || ')', fr.faction_id, 0, true, v_i)
      returning id into v_sid;

    insert into public.starter_deck_cards (starter_deck_id, card_id, quantity)
    select v_sid, c.id, 1
    from public.cards c
    where c.status = 'active' and c.faction_id in (fr.faction_id, v_neutral)
    order by coalesce(c.gold_cost, 99), random()
    limit 30
    on conflict do nothing;
  end loop;
end $$;

-- 6) rvn_get_cosmetics atnaujinimas – grąžinti ir image_url (admino įkeltą)
create or replace function public.rvn_get_cosmetics()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_list jsonb; v_owned jsonb; v_cb text; v_bd text; v_av text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'name',name,'description',description,
                                      'priceGold',price_gold,'css',css,'emoji',emoji,'imageUrl',image_url) order by sort_order, name)
    into v_list from public.cosmetics where is_active;
  select coalesce(jsonb_agg(cosmetic_id),'[]'::jsonb) into v_owned from public.user_cosmetics where user_id=v_uid;
  select equipped_card_back, equipped_board, equipped_avatar into v_cb, v_bd, v_av from public.profiles where id=v_uid;
  return jsonb_build_object('items', coalesce(v_list,'[]'::jsonb), 'owned', v_owned,
    'equippedCardBack', v_cb, 'equippedBoard', v_bd, 'equippedAvatar', v_av);
end $$;
