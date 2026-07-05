-- ════════════════════════════════════════════════════════════════════════════
--  Ravenof Ekonomika Phase 6 — Parduotuvė (multi-valiutė: Sidabras/Rubinai)
--  shop_items + shop_item_prices. Joks daiktas negali būti TIK už real_money.
--  Pirkimas atomiškas per rvn_purchase_shop_item. Kartu: grant_reward_payload
--  dabar pakus deda į user_pack_inventory (atplėšiami), ne generic inventory.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.shop_items (
  id          bigserial primary key,
  slug        text unique,
  item_type   text not null,     -- pack|card_back|player_avatar|faction_deck|bundle|rubies_bundle
  name        text not null,
  description text,
  rarity      text,
  payload     jsonb not null default '[]'::jsonb,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.shop_items enable row level security;
drop policy if exists si_read on public.shop_items;
create policy si_read on public.shop_items for select using (true);
drop policy if exists si_admin on public.shop_items;
create policy si_admin on public.shop_items for all
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create table if not exists public.shop_item_prices (
  id            bigserial primary key,
  shop_item_id  bigint not null references public.shop_items(id) on delete cascade,
  currency_type text not null,   -- silver|rubies|real_money
  amount        numeric not null,
  is_active     boolean not null default true,
  unique (shop_item_id, currency_type)
);
alter table public.shop_item_prices enable row level security;
drop policy if exists sip_read on public.shop_item_prices;
create policy sip_read on public.shop_item_prices for select using (true);
drop policy if exists sip_admin on public.shop_item_prices;
create policy sip_admin on public.shop_item_prices for all
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create table if not exists public.user_shop_purchases (
  id           bigserial primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  shop_item_id bigint not null references public.shop_items(id),
  currency_type text not null,
  amount       numeric not null,
  created_at   timestamptz not null default now()
);
alter table public.user_shop_purchases enable row level security;
drop policy if exists usp_own on public.user_shop_purchases;
create policy usp_own on public.user_shop_purchases for select using (user_id = auth.uid());

-- ── seed prekės + kainos (spec) ─────────────────────────────────────────────
do $$
declare v_id bigint;
  procedure_dummy int;
begin
  -- helper per inline: įterpiam prekę ir kainas
  -- Packs
  insert into public.shop_items(slug,item_type,name,description,rarity,payload,sort_order) values
   ('standard_pack','pack','Standartinė pakuotė','10 kortų',null,'[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1}]',10)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'silver',500),(v_id,'rubies',60) on conflict do nothing; end if;

  insert into public.shop_items(slug,item_type,name,description,payload,sort_order) values
   ('faction_pack','pack','Frakcijos pakuotė','10 frakcijos kortų','[{"type":"item","item_type":"pack","item_id":"faction_pack","quantity":1}]',20)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'silver',800),(v_id,'rubies',100) on conflict do nothing; end if;

  insert into public.shop_items(slug,item_type,name,description,rarity,payload,sort_order) values
   ('rare_pack','pack','Reta+ pakuotė','Garantuota reta ar geresnė','rare','[{"type":"item","item_type":"pack","item_id":"rare_pack","quantity":1}]',30)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'silver',1200),(v_id,'rubies',150) on conflict do nothing; end if;

  insert into public.shop_items(slug,item_type,name,description,rarity,payload,sort_order) values
   ('champion_pack','pack','Čempionų pakuotė','Garantuotas čempionas','epic','[{"type":"item","item_type":"pack","item_id":"champion_pack","quantity":1}]',40)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'silver',2400),(v_id,'rubies',300) on conflict do nothing; end if;

  insert into public.shop_items(slug,item_type,name,description,payload,sort_order) values
   ('standard_pack_10','pack','10x Standartinės','10 standartinių pakuočių','[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":10}]',50)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'silver',4500),(v_id,'rubies',500) on conflict do nothing; end if;

  -- Card Backs
  insert into public.shop_items(slug,item_type,name,rarity,payload,sort_order) values
   ('basic_card_back','card_back','Bazinė nugarėlė','basic','[{"type":"item","item_type":"card_back","item_id":"basic_card_back","quantity":1}]',110)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'silver',800),(v_id,'rubies',100) on conflict do nothing; end if;
  insert into public.shop_items(slug,item_type,name,rarity,payload,sort_order) values
   ('rare_card_back','card_back','Reta nugarėlė','rare','[{"type":"item","item_type":"card_back","item_id":"rare_card_back","quantity":1}]',120)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'silver',1800),(v_id,'rubies',220) on conflict do nothing; end if;
  insert into public.shop_items(slug,item_type,name,rarity,payload,sort_order) values
   ('premium_card_back','card_back','Premium nugarėlė','premium','[{"type":"item","item_type":"card_back","item_id":"premium_card_back","quantity":1}]',130)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'silver',3000),(v_id,'rubies',350) on conflict do nothing; end if;
  insert into public.shop_items(slug,item_type,name,rarity,payload,sort_order) values
   ('legendary_card_back','card_back','Legendinė nugarėlė','legendary','[{"type":"item","item_type":"card_back","item_id":"legendary_card_back","quantity":1}]',140)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'silver',5000),(v_id,'rubies',600) on conflict do nothing; end if;

  -- Player Avatars
  insert into public.shop_items(slug,item_type,name,rarity,payload,sort_order) values
   ('basic_player_avatar','player_avatar','Bazinis avataras','basic','[{"type":"item","item_type":"player_avatar","item_id":"basic_player_avatar","quantity":1}]',210)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'silver',1000),(v_id,'rubies',120) on conflict do nothing; end if;
  insert into public.shop_items(slug,item_type,name,rarity,payload,sort_order) values
   ('rare_player_avatar','player_avatar','Retas avataras','rare','[{"type":"item","item_type":"player_avatar","item_id":"rare_player_avatar","quantity":1}]',220)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'silver',2500),(v_id,'rubies',300) on conflict do nothing; end if;
  insert into public.shop_items(slug,item_type,name,rarity,payload,sort_order) values
   ('premium_player_avatar','player_avatar','Premium avataras','premium','[{"type":"item","item_type":"player_avatar","item_id":"premium_player_avatar","quantity":1}]',230)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'silver',4500),(v_id,'rubies',550) on conflict do nothing; end if;
  insert into public.shop_items(slug,item_type,name,rarity,payload,sort_order) values
   ('legendary_player_avatar','player_avatar','Legendinis avataras','legendary','[{"type":"item","item_type":"player_avatar","item_id":"legendary_player_avatar","quantity":1}]',240)
   on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'silver',7000),(v_id,'rubies',850) on conflict do nothing; end if;

  -- Rubies bundles (real_money — IAP; rodomi, bet pirkimas per IAP)
  insert into public.shop_items(slug,item_type,name,description,payload,sort_order) values
   ('rubies_500','rubies_bundle','500 Rubinų',null,'[{"type":"currency","currency":"rubies","amount":500}]',310) on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'real_money',4.99) on conflict do nothing; end if;
  insert into public.shop_items(slug,item_type,name,payload,sort_order) values
   ('rubies_1100','rubies_bundle','1100 Rubinų','[{"type":"currency","currency":"rubies","amount":1100}]',320) on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'real_money',9.99) on conflict do nothing; end if;
  insert into public.shop_items(slug,item_type,name,payload,sort_order) values
   ('rubies_2400','rubies_bundle','2400 Rubinų','[{"type":"currency","currency":"rubies","amount":2400}]',330) on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'real_money',19.99) on conflict do nothing; end if;
  insert into public.shop_items(slug,item_type,name,payload,sort_order) values
   ('rubies_5000','rubies_bundle','5000 Rubinų','[{"type":"currency","currency":"rubies","amount":5000}]',340) on conflict (slug) do nothing returning id into v_id;
  if v_id is not null then insert into public.shop_item_prices(shop_item_id,currency_type,amount) values (v_id,'real_money',39.99) on conflict do nothing; end if;
end $$;

-- ── grant_reward_payload PERKURTA: pakai -> user_pack_inventory (atplėšiami) ──
create or replace function public.rvn__grant_reward_payload(p_user uuid, p_payload jsonb, p_source_type text, p_source_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  el jsonb; v_cur text; v_amt int; v_it text; v_iid text; v_qty int; v_xpsrc text; v_pid uuid;
begin
  if p_user is null or p_payload is null then return '{}'::jsonb; end if;
  v_xpsrc := case when p_source_type = 'match' then 'match' else 'reward' end;
  for el in select * from jsonb_array_elements(p_payload) loop
    case el->>'type'
      when 'currency' then
        v_cur := el->>'currency'; v_amt := coalesce((el->>'amount')::int,0);
        if v_amt <> 0 then
          if    v_cur = 'silver'  then update public.profiles set gold    = gold    + v_amt where id = p_user;
          elsif v_cur = 'rubies'  then update public.profiles set rubies  = rubies  + v_amt where id = p_user;
          elsif v_cur = 'essence' then update public.profiles set essence = essence + v_amt where id = p_user;
          end if;
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
            values (p_user, p_source_type, p_source_id, 'currency', v_cur, v_amt);
        end if;
      when 'account_xp' then
        v_amt := coalesce((el->>'amount')::int,0);
        if v_amt > 0 then
          insert into public.xp_transactions(user_id, amount, reason, source_type) values (p_user, v_amt, 'Atlygis', v_xpsrc);
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, amount)
            values (p_user, p_source_type, p_source_id, 'account_xp', v_amt);
        end if;
      when 'season_xp' then
        v_amt := coalesce((el->>'amount')::int,0);
        if v_amt > 0 then
          perform public.rvn__add_pass_xp(p_user, v_amt);
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, amount)
            values (p_user, p_source_type, p_source_id, 'season_xp', v_amt);
        end if;
      when 'item' then
        v_it := el->>'item_type'; v_iid := el->>'item_id'; v_qty := coalesce((el->>'quantity')::int,1);
        if v_it is not null and v_iid is not null then
          if v_it = 'pack' then
            -- simbolinį pako id mapinam į realų card_pack (atplėšiamą)
            if v_iid ilike '%rare%' or v_iid ilike '%champion%' or v_iid ilike '%legendary%' then
              select id into v_pid from public.card_packs where is_active order by sort_order desc limit 1;
            else
              select id into v_pid from public.card_packs where is_active order by sort_order asc limit 1;
            end if;
            if v_pid is null then select id into v_pid from public.card_packs order by sort_order limit 1; end if;
            if v_pid is not null then
              insert into public.user_pack_inventory(user_id, pack_id, quantity) values (p_user, v_pid, v_qty)
                on conflict (user_id, pack_id) do update set quantity = public.user_pack_inventory.quantity + v_qty;
            end if;
          else
            insert into public.user_inventory(user_id, item_type, item_id, quantity)
              values (p_user, v_it, v_iid, v_qty)
              on conflict (user_id, item_type, item_id) do update set quantity = public.user_inventory.quantity + v_qty, updated_at = now();
          end if;
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, item_type, item_id, quantity)
            values (p_user, p_source_type, p_source_id, 'item', v_it, v_iid, v_qty);
        end if;
      else null;
    end case;
  end loop;
  return (select jsonb_build_object('silver', gold, 'rubies', rubies, 'essence', essence) from public.profiles where id = p_user);
end $$;

-- ── get shop ────────────────────────────────────────────────────────────────
create or replace function public.rvn_get_shop()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'slug', s.slug, 'itemType', s.item_type, 'name', s.name, 'description', s.description,
      'rarity', s.rarity, 'payload', s.payload, 'sortOrder', s.sort_order,
      'prices', coalesce((select jsonb_object_agg(p.currency_type, p.amount) from public.shop_item_prices p where p.shop_item_id=s.id and p.is_active), '{}'::jsonb)
    ) order by s.sort_order)
    from public.shop_items s where s.is_active), '[]'::jsonb);
end $$;

-- ── purchase ────────────────────────────────────────────────────────────────
create or replace function public.rvn_purchase_shop_item(p_item_id bigint, p_currency text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_it record; v_amt numeric; v_cost int; v_bal int;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  if p_currency = 'real_money' then return jsonb_build_object('error','iap_required'); end if;
  select * into v_it from public.shop_items where id=p_item_id and is_active;
  if v_it is null then return jsonb_build_object('error','not_found'); end if;
  select amount into v_amt from public.shop_item_prices where shop_item_id=p_item_id and currency_type=p_currency and is_active;
  if v_amt is null then return jsonb_build_object('error','no_price'); end if;
  v_cost := v_amt::int;

  if p_currency='silver' then
    select gold into v_bal from public.profiles where id=v_uid;
    if v_bal < v_cost then return jsonb_build_object('error','not_enough'); end if;
    update public.profiles set gold = gold - v_cost where id=v_uid;
  elsif p_currency='rubies' then
    select rubies into v_bal from public.profiles where id=v_uid;
    if v_bal < v_cost then return jsonb_build_object('error','not_enough'); end if;
    update public.profiles set rubies = rubies - v_cost where id=v_uid;
  else
    return jsonb_build_object('error','bad_currency');
  end if;

  perform public.rvn__grant_reward_payload(v_uid, v_it.payload, 'shop', v_it.slug);
  insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
    values (v_uid, 'shop', v_it.slug, 'currency', p_currency, -v_cost);
  insert into public.user_shop_purchases(user_id, shop_item_id, currency_type, amount) values (v_uid, p_item_id, p_currency, v_cost);
  return jsonb_build_object('ok',true,
    'balances',(select jsonb_build_object('silver',gold,'rubies',rubies,'essence',essence) from public.profiles where id=v_uid));
end $$;

grant execute on function public.rvn_get_shop() to authenticated;
grant execute on function public.rvn_purchase_shop_item(bigint, text) to authenticated;
