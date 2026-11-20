-- ════════════════════════════════════════════════════════════════════════════
-- KOSMETIKA TIK UŽ RUBINUS ARBA IŠ EVENTŲ (Donato sprendimas 2026-11-20) — v814.
-- Nugarėlės, avatarai ir avataro rėmeliai parduotuvėje nebeturi sidabro kainos.
-- cosmetics.price_gold kosmetikai nuo šiol reiškia RUBINŲ kainą. Idempotentiška.
-- Leisti PO 20261120b (jei ši jau buvo paleista su sidabro kainomis – čia sutvarkoma).
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Kur kosmetikos prekė turi tik sidabro kainą – pridedam rubinų (~12 %, apvalinta iki 5).
insert into public.shop_item_prices (shop_item_id, currency_type, amount)
select s.id, 'rubies', greatest(5, (ceil(ps.amount * 0.12 / 5.0) * 5)::int)
  from public.shop_items s
  join public.shop_item_prices ps on ps.shop_item_id = s.id and ps.currency_type = 'silver' and ps.amount > 0
 where s.item_type in ('card_back', 'player_avatar', 'avatar_frame')
   and not exists (select 1 from public.shop_item_prices pr where pr.shop_item_id = s.id and pr.currency_type = 'rubies')
on conflict (shop_item_id, currency_type) do nothing;

-- 2) Sargas: kosmetikai sidabro kaina visada išjungta; ne kosmetikai – rubinų (kaip iki šiol).
create or replace function public.rvn__shop_price_guard()
returns trigger language plpgsql as $$
declare v_type text; v_cos boolean;
begin
  if new.is_active and new.currency_type in ('rubies', 'silver') then
    select item_type into v_type from public.shop_items where id = new.shop_item_id;
    v_cos := coalesce(v_type, '') in ('card_back', 'player_avatar', 'avatar_frame');
    if (new.currency_type = 'rubies' and not v_cos) or (new.currency_type = 'silver' and v_cos) then
      new.is_active := false;
    end if;
  end if;
  return new;
end $$;

-- 3) Esamos kosmetikos sidabro kainos → išjungtos (eilutės lieka, grįžtama vienu update).
update public.shop_item_prices p
   set is_active = false
  from public.shop_items s
 where s.id = p.shop_item_id and p.currency_type = 'silver' and p.is_active
   and s.item_type in ('card_back', 'player_avatar', 'avatar_frame');

-- 4) cosmetics.price_gold = parduotuvės rubinų kaina (adminas ir užrakto užuominos rodo tą patį).
update public.cosmetics c
   set price_gold = pr.amount
  from public.shop_items s
  join public.shop_item_prices pr on pr.shop_item_id = s.id and pr.currency_type = 'rubies'
 where s.slug = c.id and s.item_type in ('card_back', 'player_avatar', 'avatar_frame')
   and c.price_gold is distinct from pr.amount;

-- 5) Senas tiesioginis pirkimas už sidabrą (rvn_buy_cosmetic) – uždaromas.
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'rvn_buy_cosmetic'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;
