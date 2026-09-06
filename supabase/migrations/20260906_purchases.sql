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

-- Pradiniai produktai (pavyzdys; kainos nustatomos store'uose)
insert into public.iap_products (product_id, title, payload, sort_order) values
  ('ravenof.rubies.100',  'Rubinų sauja (100)',   '[{"type":"currency","currency":"rubies","amount":100}]', 1),
  ('ravenof.rubies.550',  'Rubinų maišelis (550)','[{"type":"currency","currency":"rubies","amount":550}]', 2),
  ('ravenof.rubies.1200', 'Rubinų skrynia (1200)','[{"type":"currency","currency":"rubies","amount":1200}]', 3)
on conflict (product_id) do nothing;
