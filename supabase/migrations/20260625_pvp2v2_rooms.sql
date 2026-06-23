-- ════════════════════════════════════════════════════════════════════════════
-- 2v2 PvP kambariai (4 žaidėjai, 2 komandos). Stage A: kambario/matchmaking modelis.
-- a1 = host (komanda A), a2 = A draugas; b1,b2 = komanda B. Realaus laiko būsenos
-- sinchronizacija (host-authoritative broadcast) – atskira fazė (kliento pusėje).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.pvp2v2_rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text unique,                       -- privatus kambarys (NULL = vieša eilė)
  is_public   boolean not null default false,
  status      text not null default 'waiting',   -- waiting | ready | active | finished | abandoned
  host_id     uuid not null references auth.users(id) on delete cascade,
  a1_id uuid references auth.users(id) on delete set null, a1_deck uuid references public.decks(id) on delete set null, a1_name text,
  a2_id uuid references auth.users(id) on delete set null, a2_deck uuid references public.decks(id) on delete set null, a2_name text,
  b1_id uuid references auth.users(id) on delete set null, b1_deck uuid references public.decks(id) on delete set null, b1_name text,
  b2_id uuid references auth.users(id) on delete set null, b2_deck uuid references public.decks(id) on delete set null, b2_name text,
  winner_team text,                              -- 'A' | 'B' | NULL
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists pvp2v2_status_idx on public.pvp2v2_rooms (status, is_public, created_at);
create index if not exists pvp2v2_code_idx on public.pvp2v2_rooms (code);

alter table public.pvp2v2_rooms enable row level security;
drop policy if exists pvp2v2_read on public.pvp2v2_rooms;
create policy pvp2v2_read on public.pvp2v2_rooms for select to authenticated using (true);
-- Rašoma tik per RPC (SECURITY DEFINER).

create or replace function public.rvn_touch_2v2()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists pvp2v2_touch on public.pvp2v2_rooms;
create trigger pvp2v2_touch before update on public.pvp2v2_rooms for each row execute function public.rvn_touch_2v2();

-- ── Sukurti kambarį (privatų su kodu arba viešą eilei) ───────────────────────
create or replace function public.rvn_2v2_create(p_deck uuid, p_public boolean default false)
returns public.pvp2v2_rooms language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_name text; v_code text; v_room public.pvp2v2_rooms;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.decks where id = p_deck and user_id = v_uid) then raise exception 'invalid deck'; end if;
  select coalesce(display_name, username, 'Žaidėjas') into v_name from public.profiles where id = v_uid;
  if not p_public then
    v_code := upper(substr(md5(random()::text), 1, 5));
  end if;
  insert into public.pvp2v2_rooms (code, is_public, status, host_id, a1_id, a1_deck, a1_name)
    values (v_code, p_public, 'waiting', v_uid, v_uid, p_deck, v_name)
    returning * into v_room;
  return v_room;
end $$;

-- ── Prisijungti į kitą laisvą vietą (komandos balansas: A2 → B1 → B2) ─────────
create or replace function public.rvn_2v2_join_room(p_room uuid, p_deck uuid)
returns public.pvp2v2_rooms language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_name text; v_room public.pvp2v2_rooms;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.decks where id = p_deck and user_id = v_uid) then raise exception 'invalid deck'; end if;
  select coalesce(display_name, username, 'Žaidėjas') into v_name from public.profiles where id = v_uid;
  select * into v_room from public.pvp2v2_rooms where id = p_room for update;
  if v_room.id is null then raise exception 'room not found'; end if;
  if v_room.status <> 'waiting' then raise exception 'room not open'; end if;
  if v_uid in (v_room.a1_id, v_room.a2_id, v_room.b1_id, v_room.b2_id) then raise exception 'already in room'; end if;
  if v_room.b1_id is null then
    update public.pvp2v2_rooms set b1_id = v_uid, b1_deck = p_deck, b1_name = v_name where id = p_room returning * into v_room;
  elsif v_room.a2_id is null then
    update public.pvp2v2_rooms set a2_id = v_uid, a2_deck = p_deck, a2_name = v_name where id = p_room returning * into v_room;
  elsif v_room.b2_id is null then
    update public.pvp2v2_rooms set b2_id = v_uid, b2_deck = p_deck, b2_name = v_name, status = 'ready' where id = p_room returning * into v_room;
  else
    raise exception 'room full';
  end if;
  return v_room;
end $$;

-- ── Greita paieška: prisijungti prie laukiančio viešo kambario arba sukurti ──
create or replace function public.rvn_2v2_quick(p_deck uuid)
returns public.pvp2v2_rooms language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_room public.pvp2v2_rooms;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_room from public.pvp2v2_rooms
    where is_public and status = 'waiting'
      and host_id <> v_uid
      and (a2_id is null or b1_id is null or b2_id is null)
      and v_uid not in (coalesce(a1_id,'00000000-0000-0000-0000-000000000000'), coalesce(a2_id,'00000000-0000-0000-0000-000000000000'), coalesce(b1_id,'00000000-0000-0000-0000-000000000000'), coalesce(b2_id,'00000000-0000-0000-0000-000000000000'))
    order by created_at asc
    for update skip locked
    limit 1;
  if v_room.id is not null then
    return public.rvn_2v2_join_room(v_room.id, p_deck);
  end if;
  return public.rvn_2v2_create(p_deck, true);
end $$;

-- ── Prisijungti pagal kodą (privatus) ────────────────────────────────────────
create or replace function public.rvn_2v2_join_code(p_code text, p_deck uuid)
returns public.pvp2v2_rooms language plpgsql security definer set search_path = public as $$
declare v_room public.pvp2v2_rooms;
begin
  select * into v_room from public.pvp2v2_rooms where code = upper(p_code) and status = 'waiting' limit 1;
  if v_room.id is null then raise exception 'room not found'; end if;
  return public.rvn_2v2_join_room(v_room.id, p_deck);
end $$;

-- ── Palikti / atšaukti ───────────────────────────────────────────────────────
create or replace function public.rvn_2v2_leave(p_room uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  -- host palieka → kambarys nutraukiamas
  update public.pvp2v2_rooms set status = 'abandoned' where id = p_room and host_id = v_uid;
  -- ne-host palieka → atlaisvina savo vietą (jei dar waiting)
  update public.pvp2v2_rooms set a2_id = null, a2_deck = null, a2_name = null where id = p_room and a2_id = v_uid and status = 'waiting';
  update public.pvp2v2_rooms set b1_id = null, b1_deck = null, b1_name = null where id = p_room and b1_id = v_uid and status = 'waiting';
  update public.pvp2v2_rooms set b2_id = null, b2_deck = null, b2_name = null where id = p_room and b2_id = v_uid and status = 'waiting';
end $$;

grant execute on function public.rvn_2v2_create(uuid, boolean) to authenticated;
grant execute on function public.rvn_2v2_join_room(uuid, uuid) to authenticated;
grant execute on function public.rvn_2v2_quick(uuid) to authenticated;
grant execute on function public.rvn_2v2_join_code(text, uuid) to authenticated;
grant execute on function public.rvn_2v2_leave(uuid) to authenticated;

alter publication supabase_realtime add table public.pvp2v2_rooms;
