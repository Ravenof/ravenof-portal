-- ── Ravenof Digital ekonomika (FAZĖ 1): auksas + pakuočių inventorius ─────────
-- Pridedama: profiles.gold, user_pack_inventory, card_packs.price_gold,
-- RPC funkcijos rvn_award_gold / rvn_buy_pack (SECURITY DEFINER, su lubomis),
-- numatytoji "Standartinė pakuotė" (10 kortų), jei dar nėra pakuočių.
-- Pakuočių ATPLĖŠIMAS (RNG pagal retumus) bus FAZĖ 2.

-- 1) Aukso balansas
alter table public.profiles add column if not exists gold int not null default 0;

-- 2) Pakuotės kaina auksu
alter table public.card_packs add column if not exists price_gold int not null default 200;

-- 3) Turimų pakuočių inventorius
create table if not exists public.user_pack_inventory (
  user_id  uuid not null references public.profiles(id)   on delete cascade,
  pack_id  uuid not null references public.card_packs(id) on delete cascade,
  quantity int  not null default 0,
  primary key (user_id, pack_id)
);
alter table public.user_pack_inventory enable row level security;
drop policy if exists "pack_inv_own_read" on public.user_pack_inventory;
create policy "pack_inv_own_read" on public.user_pack_inventory
  for select using (user_id = auth.uid());
-- Rašoma tik per RPC (SECURITY DEFINER) – tiesioginio insert/update vartotojui nėra.

-- 4) Auksas skiriamas tik per RPC su lubomis (client-trusted, bet su apsauga nuo absurdiškų sumų)
create or replace function public.rvn_award_gold(p_reason text, p_amount int)
returns int language plpgsql security definer set search_path = public as $$
declare v_max int; v_amt int; v_new int;
begin
  v_max := case p_reason
    when 'pve_easy'     then 10
    when 'pve_normal'   then 20
    when 'pve_hard'     then 50
    when 'pvp_unranked' then 100
    else 0 end;
  if v_max = 0 then raise exception 'unknown reason %', p_reason; end if;
  v_amt := least(greatest(coalesce(p_amount, v_max), 0), v_max);
  update public.profiles set gold = gold + v_amt where id = auth.uid() returning gold into v_new;
  return v_new;
end $$;

-- 5) Pakuotės pirkimas auksu
create or replace function public.rvn_buy_pack(p_pack_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_price int; v_gold int; v_qty int;
begin
  select price_gold into v_price from public.card_packs where id = p_pack_id and is_active = true;
  if v_price is null then raise exception 'pack not found / inactive'; end if;
  select gold into v_gold from public.profiles where id = auth.uid();
  if v_gold is null then raise exception 'no profile'; end if;
  if v_gold < v_price then raise exception 'not enough gold'; end if;
  update public.profiles set gold = gold - v_price where id = auth.uid() returning gold into v_gold;
  insert into public.user_pack_inventory (user_id, pack_id, quantity)
    values (auth.uid(), p_pack_id, 1)
    on conflict (user_id, pack_id) do update set quantity = public.user_pack_inventory.quantity + 1
    returning quantity into v_qty;
  return json_build_object('gold', v_gold, 'packs', v_qty);
end $$;

grant execute on function public.rvn_award_gold(text, int) to authenticated;
grant execute on function public.rvn_buy_pack(uuid)        to authenticated;

-- 6) Numatytoji pakuotė (jei dar nėra nė vienos)
insert into public.card_packs (name, description, cards_per_pack, daily_limit, is_active, sort_order, price_gold)
select 'Standartinė pakuotė', '10 kortų pakuotė (retumai pagal tikimybę)', 10, 0, true, 0, 200
where not exists (select 1 from public.card_packs);
