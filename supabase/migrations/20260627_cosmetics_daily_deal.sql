-- ── Ravenof Digital: kosmetika (aukso sink) + dienos kortų pasiūlymas ─────────

-- Įsirengimo slotai profilyje
alter table public.profiles add column if not exists equipped_card_back text;
alter table public.profiles add column if not exists equipped_board     text;
alter table public.profiles add column if not exists equipped_avatar    text;

-- Kosmetikos katalogas
create table if not exists public.cosmetics (
  id          text primary key,            -- slug
  kind        text not null,               -- 'card_back' | 'board' | 'avatar'
  name        text not null,
  description text,
  price_gold  int  not null default 500,
  css         text,                        -- CSS gradientas (peržiūra + pritaikymas)
  emoji       text,                        -- avatarui
  sort_order  int  not null default 0,
  is_active   boolean not null default true
);
alter table public.cosmetics enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='cosmetics' and policyname='cos_read') then
    create policy "cos_read" on public.cosmetics for select using (true);
  end if;
end $$;

create table if not exists public.user_cosmetics (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  cosmetic_id text not null references public.cosmetics(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);
alter table public.user_cosmetics enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_cosmetics' and policyname='ucos_own_read') then
    create policy "ucos_own_read" on public.user_cosmetics for select using (user_id = auth.uid());
  end if;
end $$;

-- Dienos pasiūlymo pirkimai (1 kartą per kortą per dieną)
create table if not exists public.user_daily_deal_purchases (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  deal_date  date not null,
  card_id    uuid not null references public.cards(id) on delete cascade,
  primary key (user_id, deal_date, card_id)
);
alter table public.user_daily_deal_purchases enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_daily_deal_purchases' and policyname='uddp_own_read') then
    create policy "uddp_own_read" on public.user_daily_deal_purchases for select using (user_id = auth.uid());
  end if;
end $$;

-- ════════════════════════════════ RPC: KOSMETIKA ════════════════════════════
create or replace function public.rvn_get_cosmetics()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_list jsonb; v_owned jsonb; v_cb text; v_bd text; v_av text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'name',name,'description',description,
                                      'priceGold',price_gold,'css',css,'emoji',emoji) order by sort_order, name)
    into v_list from public.cosmetics where is_active;
  select coalesce(jsonb_agg(cosmetic_id),'[]'::jsonb) into v_owned from public.user_cosmetics where user_id=v_uid;
  select equipped_card_back, equipped_board, equipped_avatar into v_cb, v_bd, v_av from public.profiles where id=v_uid;
  return jsonb_build_object('items', coalesce(v_list,'[]'::jsonb), 'owned', v_owned,
    'equippedCardBack', v_cb, 'equippedBoard', v_bd, 'equippedAvatar', v_av);
end $$;

create or replace function public.rvn_buy_cosmetic(p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_price int; v_gold int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select price_gold into v_price from public.cosmetics where id=p_id and is_active;
  if v_price is null then raise exception 'cosmetic not found'; end if;
  if exists (select 1 from public.user_cosmetics where user_id=v_uid and cosmetic_id=p_id) then raise exception 'already owned'; end if;
  select gold into v_gold from public.profiles where id=v_uid;
  if v_gold < v_price then raise exception 'not enough gold'; end if;
  update public.profiles set gold = gold - v_price where id=v_uid returning gold into v_gold;
  insert into public.user_cosmetics (user_id, cosmetic_id) values (v_uid, p_id) on conflict do nothing;
  return jsonb_build_object('ok', true, 'gold', v_gold);
end $$;

create or replace function public.rvn_equip_cosmetic(p_kind text, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_id is not null and not exists (
    select 1 from public.user_cosmetics u join public.cosmetics c on c.id=u.cosmetic_id
    where u.user_id=v_uid and u.cosmetic_id=p_id and c.kind=p_kind
  ) then raise exception 'not owned'; end if;
  if    p_kind = 'card_back' then update public.profiles set equipped_card_back = p_id where id=v_uid;
  elsif p_kind = 'board'     then update public.profiles set equipped_board     = p_id where id=v_uid;
  elsif p_kind = 'avatar'    then update public.profiles set equipped_avatar    = p_id where id=v_uid;
  else raise exception 'bad kind'; end if;
  return jsonb_build_object('ok', true, 'kind', p_kind, 'id', p_id);
end $$;

-- ════════════════════════════════ RPC: DIENOS PASIŪLYMAS ════════════════════
-- Vidinis: deterministiškai pagal datą sudaro dienos kortų sąrašą (≥1 epic+).
create or replace function public.rvn__daily_deal_ids(p_date date)
returns uuid[] language plpgsql security definer set search_path = public as $$
declare v_seed float8; v_epic uuid; r record; v_ids uuid[] := '{}';
begin
  v_seed := (('x'||substr(md5('rvn-daily-deal'||p_date::text),1,8))::bit(32)::bigint % 1000000) / 1000000.0;
  perform setseed(v_seed);
  select c.id into v_epic from public.cards c join public.rarities r on r.id=c.rarity_id
    where c.status='active' and r.sort_order >= 4 order by random() limit 1;
  if v_epic is not null then v_ids := array_append(v_ids, v_epic); end if;
  for r in select c.id from public.cards c
           where c.status='active' and (v_epic is null or c.id <> v_epic)
           order by random() limit 3 loop
    v_ids := array_append(v_ids, r.id);
  end loop;
  return v_ids;
end $$;

create or replace function public.rvn__deal_price(p_sort int)
returns int language sql immutable as $$
  select case p_sort when 1 then 60 when 2 then 120 when 3 then 250 when 4 then 600 when 5 then 1500 else 100 end;
$$;

create or replace function public.rvn_get_daily_deal()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_today date := current_date; v_ids uuid[]; v_cards jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  v_ids := public.rvn__daily_deal_ids(v_today);
  select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'imageUrl', c.image_url,
      'rarity', r.name, 'rarityColor', r.color_hex, 'sortOrder', r.sort_order, 'faction', f.name,
      'priceGold', public.rvn__deal_price(r.sort_order),
      'bought', exists(select 1 from public.user_daily_deal_purchases p
                       where p.user_id=v_uid and p.deal_date=v_today and p.card_id=c.id)
    ) order by r.sort_order desc)
    into v_cards
    from public.cards c
    join public.rarities r on r.id = c.rarity_id
    left join public.factions f on f.id = c.faction_id
    where c.id = any(v_ids);
  return jsonb_build_object('date', v_today, 'cards', coalesce(v_cards,'[]'::jsonb));
end $$;

create or replace function public.rvn_buy_daily_deal_card(p_card_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_today date := current_date; v_ids uuid[]; v_price int; v_so int; v_gold int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  v_ids := public.rvn__daily_deal_ids(v_today);
  if not (p_card_id = any(v_ids)) then raise exception 'card not in today deal'; end if;
  if exists (select 1 from public.user_daily_deal_purchases where user_id=v_uid and deal_date=v_today and card_id=p_card_id)
    then raise exception 'already bought'; end if;
  select r.sort_order into v_so from public.cards c join public.rarities r on r.id=c.rarity_id where c.id=p_card_id;
  v_price := public.rvn__deal_price(v_so);
  select gold into v_gold from public.profiles where id=v_uid;
  if v_gold < v_price then raise exception 'not enough gold'; end if;
  update public.profiles set gold = gold - v_price where id=v_uid returning gold into v_gold;
  insert into public.user_daily_deal_purchases (user_id, deal_date, card_id) values (v_uid, v_today, p_card_id);
  insert into public.user_collections (user_id, card_id, quantity) values (v_uid, p_card_id, 1)
    on conflict (user_id, card_id) do update set quantity = public.user_collections.quantity + 1;
  return jsonb_build_object('ok', true, 'gold', v_gold);
end $$;

grant execute on function public.rvn_get_cosmetics()              to authenticated;
grant execute on function public.rvn_buy_cosmetic(text)           to authenticated;
grant execute on function public.rvn_equip_cosmetic(text,text)    to authenticated;
grant execute on function public.rvn_get_daily_deal()             to authenticated;
grant execute on function public.rvn_buy_daily_deal_card(uuid)    to authenticated;

-- ════════════════════════════════ SEED: KOSMETIKA ══════════════════════════
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order) values
  ('cb_ember',  'card_back', 'Žarijų nugarėlė',   'Ugninė kortų nugarėlė',     800,  'linear-gradient(160deg,#7f1d1d,#f97316)',          null, 1),
  ('cb_frost',  'card_back', 'Šerkšno nugarėlė',  'Ledinė mėlyna nugarėlė',    800,  'linear-gradient(160deg,#0c4a6e,#38bdf8)',          null, 2),
  ('cb_void',   'card_back', 'Tuštumos nugarėlė', 'Tamsi violetinė nugarėlė',  1200, 'linear-gradient(160deg,#2e1065,#a855f7)',          null, 3),
  ('cb_gold',   'card_back', 'Auksinė nugarėlė',  'Prabangi auksinė nugarėlė', 2000, 'linear-gradient(160deg,#713f12,#f0b429)',          null, 4),
  ('bd_arena',  'board',     'Arenos laukas',     'Klasikinė arena',           1000, 'radial-gradient(circle at 50% 0%,#1f2937,#0a0810)', null, 5),
  ('bd_forest', 'board',     'Miško laukas',      'Žalias mūšio laukas',       1000, 'radial-gradient(circle at 50% 0%,#14532d,#0a0810)', null, 6),
  ('bd_inferno','board',     'Pragaro laukas',    'Ugnies ir pelenų laukas',   1500, 'radial-gradient(circle at 50% 0%,#7f1d1d,#0a0810)', null, 7),
  ('av_raven',  'avatar',    'Varnas',            'Varno avataras',            500,  null, '🐦‍⬛', 8),
  ('av_dragon', 'avatar',    'Drakonas',          'Drakono avataras',          700,  null, '🐉',   9),
  ('av_skull',  'avatar',    'Kaukolė',           'Kaukolės avataras',         700,  null, '💀',   10),
  ('av_crown',  'avatar',    'Karūna',            'Karūnos avataras',          1500, null, '👑',   11)
on conflict (id) do update set
  kind=excluded.kind, name=excluded.name, description=excluded.description,
  price_gold=excluded.price_gold, css=excluded.css, emoji=excluded.emoji, sort_order=excluded.sort_order;
