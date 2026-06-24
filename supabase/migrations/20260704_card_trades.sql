-- ── Realaus laiko korta↔korta mainai (trade) tarp dviejų žaidėjų ──────────────
-- Abu deda kortas, abu patvirtina → atominis apsikeitimas. Sinchronizacija per
-- trade eilutės polling'ą (rvn_trade_get). Nuosavybė validuojama vykdymo metu.

create table if not exists public.card_trades (
  id          uuid primary key default gen_random_uuid(),
  a_id        uuid not null references public.profiles(id) on delete cascade,  -- iniciatorius
  b_id        uuid not null references public.profiles(id) on delete cascade,  -- gavėjas
  status      text not null default 'pending',  -- pending|active|completed|cancelled
  a_offer     jsonb not null default '[]'::jsonb,  -- card_id masyvas (kartojasi = keli vnt)
  b_offer     jsonb not null default '[]'::jsonb,
  a_confirmed boolean not null default false,
  b_confirmed boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_card_trades_parties on public.card_trades(a_id, b_id, status);
alter table public.card_trades enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='card_trades' and policyname='ct_own_read') then
    create policy "ct_own_read" on public.card_trades for select using (auth.uid()=a_id or auth.uid()=b_id);
  end if;
end $$;

create or replace function public.rvn_trade_create(p_target uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_target = v_uid then raise exception 'negali mainytis su savimi'; end if;
  if not exists (select 1 from public.friendships where status='accepted' and ((requester_id=v_uid and addressee_id=p_target) or (requester_id=p_target and addressee_id=v_uid))) then
    raise exception 'ne draugas';
  end if;
  delete from public.card_trades where a_id=v_uid and b_id=p_target and status in ('pending','active');
  insert into public.card_trades (a_id, b_id, status) values (v_uid, p_target, 'pending') returning id into v_id;
  return v_id;
end $$;

create or replace function public.rvn_trade_incoming()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_out jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'fromId', t.a_id, 'username', p.username, 'displayName', p.display_name) order by t.created_at desc), '[]'::jsonb)
    into v_out from public.card_trades t join public.profiles p on p.id=t.a_id
    where t.b_id=v_uid and t.status='pending' and t.created_at > now() - interval '15 minutes';
  return v_out;
end $$;

create or replace function public.rvn_trade_accept(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.card_trades set status='active', updated_at=now() where id=p_id and b_id=v_uid and status='pending';
end $$;

create or replace function public.rvn_trade_cancel(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.card_trades set status='cancelled', updated_at=now() where id=p_id and (a_id=v_uid or b_id=v_uid) and status in ('pending','active');
end $$;

create or replace function public.rvn_trade_set_offer(p_id uuid, p_cards jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_t public.card_trades;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_t from public.card_trades where id=p_id and status='active' for update;
  if v_t.id is null then raise exception 'mainai neaktyvūs'; end if;
  if v_uid = v_t.a_id then
    update public.card_trades set a_offer=coalesce(p_cards,'[]'::jsonb), a_confirmed=false, b_confirmed=false, updated_at=now() where id=p_id;
  elsif v_uid = v_t.b_id then
    update public.card_trades set b_offer=coalesce(p_cards,'[]'::jsonb), a_confirmed=false, b_confirmed=false, updated_at=now() where id=p_id;
  else raise exception 'ne tavo mainai'; end if;
end $$;

-- Patvirtinimas; kai abu patvirtina – atominis apsikeitimas.
create or replace function public.rvn_trade_confirm(p_id uuid, p_confirm boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_t public.card_trades; rec record; q int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_t from public.card_trades where id=p_id and status='active' for update;
  if v_t.id is null then raise exception 'mainai neaktyvūs'; end if;
  if v_uid = v_t.a_id then update public.card_trades set a_confirmed=p_confirm, updated_at=now() where id=p_id;
  elsif v_uid = v_t.b_id then update public.card_trades set b_confirmed=p_confirm, updated_at=now() where id=p_id;
  else raise exception 'ne tavo mainai'; end if;

  select * into v_t from public.card_trades where id=p_id for update;
  if not (v_t.a_confirmed and v_t.b_confirmed) then return jsonb_build_object('ok', true, 'done', false); end if;

  -- VALIDACIJA: abi pusės turi pakankamai kortų
  for rec in select cid, count(*) n from (select jsonb_array_elements_text(v_t.a_offer) cid) s group by cid loop
    select quantity into q from public.user_collections where user_id=v_t.a_id and card_id=rec.cid::uuid;
    if coalesce(q,0) < rec.n then update public.card_trades set status='cancelled' where id=p_id; raise exception 'A nebeturi siūlomų kortų'; end if;
  end loop;
  for rec in select cid, count(*) n from (select jsonb_array_elements_text(v_t.b_offer) cid) s group by cid loop
    select quantity into q from public.user_collections where user_id=v_t.b_id and card_id=rec.cid::uuid;
    if coalesce(q,0) < rec.n then update public.card_trades set status='cancelled' where id=p_id; raise exception 'B nebeturi siūlomų kortų'; end if;
  end loop;

  -- APSIKEITIMAS: A→B
  for rec in select cid, count(*) n from (select jsonb_array_elements_text(v_t.a_offer) cid) s group by cid loop
    update public.user_collections set quantity=quantity-rec.n where user_id=v_t.a_id and card_id=rec.cid::uuid;
    delete from public.user_collections where user_id=v_t.a_id and card_id=rec.cid::uuid and quantity<=0;
    insert into public.user_collections (user_id, card_id, quantity) values (v_t.b_id, rec.cid::uuid, rec.n)
      on conflict (user_id, card_id) do update set quantity=public.user_collections.quantity+rec.n;
  end loop;
  -- B→A
  for rec in select cid, count(*) n from (select jsonb_array_elements_text(v_t.b_offer) cid) s group by cid loop
    update public.user_collections set quantity=quantity-rec.n where user_id=v_t.b_id and card_id=rec.cid::uuid;
    delete from public.user_collections where user_id=v_t.b_id and card_id=rec.cid::uuid and quantity<=0;
    insert into public.user_collections (user_id, card_id, quantity) values (v_t.a_id, rec.cid::uuid, rec.n)
      on conflict (user_id, card_id) do update set quantity=public.user_collections.quantity+rec.n;
  end loop;

  update public.card_trades set status='completed', updated_at=now() where id=p_id;
  return jsonb_build_object('ok', true, 'done', true);
end $$;

-- Pilna būsena (polling); su kortų detalėmis ir naudotojų vardais.
create or replace function public.rvn_trade_get(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_t public.card_trades; v_cards jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_t from public.card_trades where id=p_id and (a_id=v_uid or b_id=v_uid);
  if v_t.id is null then raise exception 'mainai nerasti'; end if;
  select coalesce(jsonb_object_agg(c.id::text, jsonb_build_object('name', c.name, 'imageUrl', c.image_url, 'rarity', r.name, 'rarityColor', r.color_hex)), '{}'::jsonb)
    into v_cards from public.cards c left join public.rarities r on r.id=c.rarity_id
    where c.id::text in (select jsonb_array_elements_text(v_t.a_offer) union select jsonb_array_elements_text(v_t.b_offer));
  return jsonb_build_object(
    'id', v_t.id, 'status', v_t.status,
    'aId', v_t.a_id, 'bId', v_t.b_id,
    'aOffer', v_t.a_offer, 'bOffer', v_t.b_offer,
    'aConfirmed', v_t.a_confirmed, 'bConfirmed', v_t.b_confirmed,
    'aName', (select coalesce(display_name, username) from public.profiles where id=v_t.a_id),
    'bName', (select coalesce(display_name, username) from public.profiles where id=v_t.b_id),
    'cards', v_cards, 'me', case when v_uid=v_t.a_id then 'a' else 'b' end
  );
end $$;

grant execute on function public.rvn_trade_create(uuid)         to authenticated;
grant execute on function public.rvn_trade_incoming()           to authenticated;
grant execute on function public.rvn_trade_accept(uuid)         to authenticated;
grant execute on function public.rvn_trade_cancel(uuid)         to authenticated;
grant execute on function public.rvn_trade_set_offer(uuid,jsonb) to authenticated;
grant execute on function public.rvn_trade_confirm(uuid,boolean) to authenticated;
grant execute on function public.rvn_trade_get(uuid)            to authenticated;
