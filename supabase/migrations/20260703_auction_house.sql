-- ── Aukcionas (auction house): fiksuota kaina auksu + escrow ──────────────────
-- Pardavėjas įdeda kortą (1 vnt išimama iš kolekcijos – escrow). Pirkėjas perka
-- už auksą; korta + auksas persikelia atomiškai. Listing'ai kabo nors user offline.

create table if not exists public.card_listings (
  id         uuid primary key default gen_random_uuid(),
  seller_id  uuid not null references public.profiles(id) on delete cascade,
  card_id    uuid not null references public.cards(id) on delete cascade,
  price_gold int  not null check (price_gold > 0),
  status     text not null default 'active',  -- 'active' | 'sold' | 'cancelled'
  buyer_id   uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  sold_at    timestamptz
);
create index if not exists idx_card_listings_active on public.card_listings(status, created_at desc);
create index if not exists idx_card_listings_seller on public.card_listings(seller_id);
alter table public.card_listings enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='card_listings' and policyname='cl_read') then
    create policy "cl_read" on public.card_listings for select using (status='active' or seller_id=auth.uid() or buyer_id=auth.uid());
  end if;
end $$;

-- ── RPC: įdėti kortą į aukcioną (escrow) ──
create or replace function public.rvn_list_card(p_card_id uuid, p_price int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_qty int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if coalesce(p_price,0) <= 0 then raise exception 'kaina turi būti > 0'; end if;
  select quantity into v_qty from public.user_collections where user_id=v_uid and card_id=p_card_id for update;
  if coalesce(v_qty,0) < 1 then raise exception 'neturi šios kortos'; end if;
  if v_qty <= 1 then delete from public.user_collections where user_id=v_uid and card_id=p_card_id;
  else update public.user_collections set quantity = quantity - 1 where user_id=v_uid and card_id=p_card_id; end if;
  insert into public.card_listings (seller_id, card_id, price_gold) values (v_uid, p_card_id, p_price);
  return jsonb_build_object('ok', true);
end $$;

-- ── RPC: atšaukti (grąžina kortą) ──
create or replace function public.rvn_cancel_listing(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_card uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.card_listings set status='cancelled'
    where id=p_id and seller_id=v_uid and status='active' returning card_id into v_card;
  if v_card is null then raise exception 'listing nerastas'; end if;
  insert into public.user_collections (user_id, card_id, quantity) values (v_uid, v_card, 1)
    on conflict (user_id, card_id) do update set quantity = public.user_collections.quantity + 1;
  return jsonb_build_object('ok', true);
end $$;

-- ── RPC: pirkti ──
create or replace function public.rvn_buy_listing(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_l public.card_listings; v_gold int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_l from public.card_listings where id=p_id and status='active' for update;
  if v_l.id is null then raise exception 'listing nerastas / jau parduotas'; end if;
  if v_l.seller_id = v_uid then raise exception 'negali pirkti savo kortos'; end if;
  select gold into v_gold from public.profiles where id=v_uid for update;
  if coalesce(v_gold,0) < v_l.price_gold then raise exception 'not enough gold'; end if;
  update public.profiles set gold = gold - v_l.price_gold where id=v_uid returning gold into v_gold;
  update public.profiles set gold = gold + v_l.price_gold where id=v_l.seller_id;
  insert into public.user_collections (user_id, card_id, quantity) values (v_uid, v_l.card_id, 1)
    on conflict (user_id, card_id) do update set quantity = public.user_collections.quantity + 1;
  update public.card_listings set status='sold', buyer_id=v_uid, sold_at=now() where id=p_id;
  return jsonb_build_object('ok', true, 'gold', v_gold);
end $$;

-- ── RPC: naršyti (paieška pagal kortą / pardavėją) ──
create or replace function public.rvn_browse_listings(p_card text default null, p_seller text default null, p_limit int default 60)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_out jsonb;
begin
  select coalesce(jsonb_agg(j), '[]'::jsonb) into v_out from (
    select jsonb_build_object(
      'id', l.id, 'price', l.price_gold, 'cardId', l.card_id,
      'name', c.name, 'imageUrl', c.image_url,
      'rarity', r.name, 'rarityColor', r.color_hex, 'sortOrder', r.sort_order,
      'faction', f.name, 'sellerId', l.seller_id, 'seller', p.username, 'createdAt', l.created_at
    ) as j
    from public.card_listings l
    join public.cards c on c.id = l.card_id
    left join public.rarities r on r.id = c.rarity_id
    left join public.factions f on f.id = c.faction_id
    join public.profiles p on p.id = l.seller_id
    where l.status='active'
      and (p_card is null or p_card='' or c.name ilike '%'||p_card||'%')
      and (p_seller is null or p_seller='' or p.username ilike '%'||p_seller||'%')
    order by l.created_at desc
    limit greatest(1, least(coalesce(p_limit,60), 120))
  ) q;
  return v_out;
end $$;

-- ── RPC: mano aktyvūs listing'ai ──
create or replace function public.rvn_my_listings()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_out jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select coalesce(jsonb_agg(j order by (j->>'createdAt') desc), '[]'::jsonb) into v_out from (
    select jsonb_build_object('id', l.id, 'price', l.price_gold, 'cardId', l.card_id, 'name', c.name,
      'imageUrl', c.image_url, 'rarity', r.name, 'rarityColor', r.color_hex, 'createdAt', l.created_at) as j
    from public.card_listings l
    join public.cards c on c.id = l.card_id
    left join public.rarities r on r.id = c.rarity_id
    where l.seller_id=v_uid and l.status='active'
  ) q;
  return v_out;
end $$;

grant execute on function public.rvn_list_card(uuid,int)            to authenticated;
grant execute on function public.rvn_cancel_listing(uuid)           to authenticated;
grant execute on function public.rvn_buy_listing(uuid)              to authenticated;
grant execute on function public.rvn_browse_listings(text,text,int) to authenticated;
grant execute on function public.rvn_my_listings()                  to authenticated;
