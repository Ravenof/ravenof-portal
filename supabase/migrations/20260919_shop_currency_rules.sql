-- ── Valiutų taisyklė (2026-09-17, Donato sprendimas) ─────────────────────────
--   RUBINAI  → tik kosmetika (card_back / player_avatar) ir Season Pass.
--   SIDABRAS → boosteriai, starter kaladės, kortos (dienos pasiūlymas) + kosmetika (abi valiutos).
--   Season Pass → TIK už rubinus.
--
-- Kas buvo ne taip: 20260826 sinchronizavo card_packs → shop_items su silver IR rubinų kaina (~12 %),
-- o Season Pass buvo atrakinamas už 8000 sidabro arba 950 rubinų.
-- Starter kaladės (rvn_claim_starter_deck) ir dienos pasiūlymo kortos (rvn_buy_daily_deal_card)
-- jau ir taip perkamos tik už sidabrą (profiles.gold) – jų liesti nereikia.
--
-- Įgyvendinimas – DB lygyje, kad taisyklės neapeitų nei senas klientas, nei būsimas sync skriptas:
--   1) trigeris ant shop_item_prices: rubinų kaina ne kosmetikai visada is_active=false
--      (rvn_get_shop ir abu rvn_purchase_shop_item* ima tik is_active kainas → „no_price")
--   2) esamų rubinų kainų ne kosmetikai išjungimas (eilutės paliekamos – grįžtama vienu update)
--   3) kosmetikai, kuri turi tik sidabro kainą, pridedama rubinų kaina (~12 %, suapvalinta iki 5)
--   4) Season Pass: abi unlock funkcijos nebepriima 'silver'; pass_price_silver = 0
-- Idempotentiška.

-- ─── 1) Sargas ant kainų ─────────────────────────────────────────────────────
create or replace function public.rvn__shop_price_guard()
returns trigger language plpgsql as $$
declare v_type text;
begin
  if new.currency_type = 'rubies' and new.is_active then
    select item_type into v_type from public.shop_items where id = new.shop_item_id;
    if coalesce(v_type, '') not in ('card_back', 'player_avatar') then
      new.is_active := false;   -- tyliai išjungiam (ne raise) – kad esami sync skriptai nelūžtų
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_shop_price_guard on public.shop_item_prices;
create trigger trg_shop_price_guard before insert or update on public.shop_item_prices
  for each row execute function public.rvn__shop_price_guard();

-- Jei kada nors pakeičiamas prekės tipas (kosmetika → pakas) – jos rubinų kaina irgi išsijungia.
create or replace function public.rvn__shop_item_type_guard()
returns trigger language plpgsql as $$
begin
  if new.item_type is distinct from old.item_type and new.item_type not in ('card_back', 'player_avatar') then
    update public.shop_item_prices set is_active = false
     where shop_item_id = new.id and currency_type = 'rubies' and is_active;
  end if;
  return new;
end $$;

drop trigger if exists trg_shop_item_type_guard on public.shop_items;
create trigger trg_shop_item_type_guard after update of item_type on public.shop_items
  for each row execute function public.rvn__shop_item_type_guard();

-- ─── 2) Esamos rubinų kainos ne kosmetikai → išjungtos ───────────────────────
update public.shop_item_prices p
   set is_active = false
  from public.shop_items s
 where s.id = p.shop_item_id
   and p.currency_type = 'rubies'
   and p.is_active
   and s.item_type not in ('card_back', 'player_avatar');

-- ─── 3) Kosmetika: kur yra tik sidabro kaina – pridedam rubinų (abi valiutos) ─
-- Kursas kaip Season Pass'o (950 rub ≈ 8000 sid → ~12 %), apvalinam aukštyn iki 5. Min. 5.
insert into public.shop_item_prices (shop_item_id, currency_type, amount)
select s.id, 'rubies', greatest(5, (ceil(ps.amount * 0.12 / 5.0) * 5)::int)
  from public.shop_items s
  join public.shop_item_prices ps on ps.shop_item_id = s.id and ps.currency_type = 'silver' and ps.is_active
 where s.item_type in ('card_back', 'player_avatar')
   and ps.amount > 0
   and not exists (select 1 from public.shop_item_prices pr where pr.shop_item_id = s.id and pr.currency_type = 'rubies')
on conflict (shop_item_id, currency_type) do nothing;

-- ─── 4) Season Pass – tik už rubinus ─────────────────────────────────────────
alter table public.season_pass_seasons alter column pass_price_silver set default 0;
update public.season_pass_seasons set pass_price_silver = 0 where pass_price_silver <> 0;

-- v2 (bazė: 20260843_season_path_v2.sql – vėliausias apibrėžimas). Pakeista TIK valiutos patikra ir nuimta 'silver' šaka.
create or replace function public.rvn_unlock_season_pass_v2(p_currency text, p_idempotency_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_sid uuid; v_s record; v_bal int; v_cost int; v_prev jsonb; v_res jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if p_currency <> 'rubies' then return jsonb_build_object('error','bad_currency'); end if;   -- Season Pass tik už rubinus
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

  v_cost := v_s.pass_price_rubies;
  if v_cost is null or v_cost <= 0 then return jsonb_build_object('error','no_price'); end if;
  select rubies into v_bal from public.profiles where id=v_uid;
  if v_bal < v_cost then return jsonb_build_object('error','not_enough'); end if;
  update public.profiles set rubies = rubies - v_cost where id=v_uid;

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
grant execute on function public.rvn_unlock_season_pass_v2(text, text) to authenticated;

-- v1 (bazė: 20260814_season_path.sql) – UI jos nebenaudoja, bet RPC vis dar kviečiamas tiesiogiai → ta pati taisyklė.
create or replace function public.rvn_unlock_season_pass(p_currency text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_sid uuid; v_s record; v_bal int; v_cost int;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  if p_currency <> 'rubies' then return jsonb_build_object('error','bad_currency'); end if;   -- Season Pass tik už rubinus
  v_sid := public.rvn__current_season();
  select * into v_s from public.season_pass_seasons where id=v_sid;
  insert into public.user_season_pass(user_id, season_id, xp) values (v_uid, v_sid, 0) on conflict do nothing;
  if (select has_season_pass from public.user_season_pass where user_id=v_uid and season_id=v_sid) then
    return jsonb_build_object('error','already_owned');
  end if;
  v_cost := v_s.pass_price_rubies;
  if v_cost is null or v_cost <= 0 then return jsonb_build_object('error','no_price'); end if;
  select rubies into v_bal from public.profiles where id=v_uid;
  if v_bal < v_cost then return jsonb_build_object('error','not_enough'); end if;
  update public.profiles set rubies = rubies - v_cost where id=v_uid;
  update public.user_season_pass set has_season_pass=true, season_pass_activated_at=now() where user_id=v_uid and season_id=v_sid;
  insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
    values (v_uid, 'season_pass_unlock', v_sid::text, 'currency', p_currency, -v_cost);
  return jsonb_build_object('ok',true,
    'balances',(select jsonb_build_object('silver',gold,'rubies',rubies,'essence',essence) from public.profiles where id=v_uid));
end $$;
grant execute on function public.rvn_unlock_season_pass(text) to authenticated;

-- ─── Patikra po paleidimo (SQL Editor'iuje matysi rezultatą) ─────────────────
select s.item_type,
       count(*) filter (where p.currency_type = 'silver' and p.is_active) as silver_kainu,
       count(*) filter (where p.currency_type = 'rubies' and p.is_active) as rubinu_kainu,
       count(*) filter (where p.currency_type = 'rubies' and not p.is_active) as isjungtu_rubinu_kainu
  from public.shop_items s join public.shop_item_prices p on p.shop_item_id = s.id
 where s.is_active
 group by s.item_type order by s.item_type;
