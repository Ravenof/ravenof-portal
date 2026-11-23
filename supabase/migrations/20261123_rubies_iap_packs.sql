-- ── Rubinų paketai už tikrus pinigus (Google Play Billing) ────────────────────
-- 7 paketai: 100 / 200 / 500 / 1000 / 2000 / 5000 / 10000 rubinų.
-- Kainos EUR: 0,99 / 1,99 / 4,99 / 9,99 / 19,99 / 49,99 / 99,99 (tikra kaina –
-- Play Console; price_eur – tik atsarginis rodymas, kol store kainos neužkrautos).
-- Bonusai: 500 +5 proc., 1000 +10, 2000 +15, 5000 +20, 10000 +25 (payload jau su bonusu).
-- Product ID'ai Play Console turi būti LYGIAI tokie patys kaip product_id čia.

-- ── Bazė (idempotentiška kopija iš 20260906_purchases.sql – saugu leisti pakartotinai) ──
-- ── IAP pirkiniai (Google Play / App Store / Steam) ───────────────────────────
-- Kvitą tikrina edge function verify-receipt (service role); klientas NIEKADA
-- pats neprideda valiutos. Idempotencija: (platform, external_id) unikalus.
create table if not exists public.purchases (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  platform      text not null check (platform in ('google','apple','steam','web')),
  product_id    text not null,
  external_id   text not null,               -- purchaseToken / transactionId / orderid
  status        text not null default 'granted' check (status in ('granted','refunded','pending','rejected')),
  payload       jsonb not null default '[]'::jsonb,   -- reward payload, perduotas rvn__grant_reward_payload
  raw           jsonb,                       -- kvito atsakymas iš platformos (audit)
  created_at    timestamptz not null default now(),
  unique (platform, external_id)
);
alter table public.purchases enable row level security;
drop policy if exists "purchases: own read" on public.purchases;
create policy "purchases: own read" on public.purchases for select using (auth.uid() = user_id);

-- Produktų katalogas: store product id → reward payload (tas pats formatas kaip season/level rewards).
create table if not exists public.iap_products (
  product_id    text primary key,            -- pvz. 'ravenof.rubies.100' (visose platformose tas pats)
  title         text not null,
  payload       jsonb not null,              -- [{"type":"currency","currency":"rubies","amount":100}]
  active        boolean not null default true,
  sort_order    int not null default 0
);
alter table public.iap_products enable row level security;
drop policy if exists "iap_products: public read" on public.iap_products;
create policy "iap_products: public read" on public.iap_products for select using (active);

-- Suteikimas (kviečia TIK service role iš edge function; idempotentiškas).
create or replace function public.rvn_grant_purchase(p_user uuid, p_platform text, p_product text, p_external text, p_raw jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_payload jsonb; v_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'service role only'; end if;
  select payload into v_payload from public.iap_products where product_id = p_product and active;
  if v_payload is null then raise exception 'unknown product %', p_product; end if;
  insert into public.purchases (user_id, platform, product_id, external_id, payload, raw)
    values (p_user, p_platform, p_product, p_external, v_payload, p_raw)
    on conflict (platform, external_id) do nothing
    returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  perform public.rvn__grant_reward_payload(p_user, v_payload, 'purchase', v_id::text);
  return jsonb_build_object('ok', true, 'purchase_id', v_id, 'payload', v_payload);
end $$;
revoke all on function public.rvn_grant_purchase(uuid, text, text, text, jsonb) from public, anon, authenticated;

alter table public.iap_products add column if not exists base_amount int;
alter table public.iap_products add column if not exists bonus_amount int not null default 0;
alter table public.iap_products add column if not exists price_eur numeric(10,2);
alter table public.iap_products add column if not exists image_url text;

-- seni pavyzdiniai paketai (550 / 1200) – išjungiami
update public.iap_products set active = false where product_id in ('ravenof.rubies.550', 'ravenof.rubies.1200');

insert into public.iap_products (product_id, title, payload, sort_order, base_amount, bonus_amount, price_eur, active) values
  ('ravenof.rubies.100',   '100 rubinų',   '[{"type":"currency","currency":"rubies","amount":100}]',   1,   100,    0,  0.99, true),
  ('ravenof.rubies.200',   '200 rubinų',   '[{"type":"currency","currency":"rubies","amount":200}]',   2,   200,    0,  1.99, true),
  ('ravenof.rubies.500',   '500 rubinų',   '[{"type":"currency","currency":"rubies","amount":525}]',   3,   500,   25,  4.99, true),
  ('ravenof.rubies.1000',  '1000 rubinų',  '[{"type":"currency","currency":"rubies","amount":1100}]',  4,  1000,  100,  9.99, true),
  ('ravenof.rubies.2000',  '2000 rubinų',  '[{"type":"currency","currency":"rubies","amount":2300}]',  5,  2000,  300, 19.99, true),
  ('ravenof.rubies.5000',  '5000 rubinų',  '[{"type":"currency","currency":"rubies","amount":6000}]',  6,  5000, 1000, 49.99, true),
  ('ravenof.rubies.10000', '10000 rubinų', '[{"type":"currency","currency":"rubies","amount":12500}]', 7, 10000, 2500, 99.99, true)
on conflict (product_id) do update set
  title = excluded.title, payload = excluded.payload, sort_order = excluded.sort_order,
  base_amount = excluded.base_amount, bonus_amount = excluded.bonus_amount, price_eur = excluded.price_eur, active = true;

-- Seni shop_items rubies_bundle (rubies_500/1100/2400/5000) – išjungiami: rubinų
-- sekcija dabar rodoma iš iap_products (pirkimas tik per Google Play).
update public.shop_items set is_active = false where item_type = 'rubies_bundle';
