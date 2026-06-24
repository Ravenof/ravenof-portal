-- ── Socialinis sluoksnis: draugai + iššūkiai (challenge inbox + accept) ───────

-- 1) Draugystės
create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending',   -- 'pending' | 'accepted'
  created_at   timestamptz not null default now(),
  unique (requester_id, addressee_id)
);
alter table public.friendships enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='friendships' and policyname='fr_own_read') then
    create policy "fr_own_read" on public.friendships for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
  end if;
end $$;

-- 2) Iššūkiai (nukreipti į draugą; saugo pvp_matches kodą)
create table if not exists public.friend_challenges (
  id            uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  target_id     uuid not null references public.profiles(id) on delete cascade,
  code          text not null,
  status        text not null default 'pending',  -- 'pending' | 'accepted' | 'cancelled'
  created_at    timestamptz not null default now()
);
alter table public.friend_challenges enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='friend_challenges' and policyname='fc_own_read') then
    create policy "fc_own_read" on public.friend_challenges for select using (auth.uid() = challenger_id or auth.uid() = target_id);
  end if;
end $$;

-- ════════════════════════════════ RPC: DRAUGAI ══════════════════════════════
create or replace function public.rvn_friend_request(p_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_target uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select id into v_target from public.profiles where lower(username) = lower(trim(p_username)) limit 1;
  if v_target is null then raise exception 'naudotojas nerastas'; end if;
  if v_target = v_uid then raise exception 'negali pridėti savęs'; end if;
  if exists (select 1 from public.friendships where (requester_id=v_uid and addressee_id=v_target) or (requester_id=v_target and addressee_id=v_uid)) then
    raise exception 'jau yra draugystė arba užklausa';
  end if;
  insert into public.friendships (requester_id, addressee_id, status) values (v_uid, v_target, 'pending');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rvn_friend_respond(p_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_accept then
    update public.friendships set status='accepted' where id=p_id and addressee_id=v_uid and status='pending';
  else
    delete from public.friendships where id=p_id and addressee_id=v_uid and status='pending';
  end if;
end $$;

create or replace function public.rvn_friend_remove(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  delete from public.friendships where id=p_id and (requester_id=v_uid or addressee_id=v_uid);
end $$;

create or replace function public.rvn_friends_list()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_friends jsonb; v_pending jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'userId', p.id, 'username', p.username, 'displayName', p.display_name, 'avatar', p.avatar_url) order by p.username), '[]'::jsonb)
    into v_friends
    from public.friendships f
    join public.profiles p on p.id = (case when f.requester_id = v_uid then f.addressee_id else f.requester_id end)
    where f.status='accepted' and (f.requester_id=v_uid or f.addressee_id=v_uid);
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'userId', p.id, 'username', p.username, 'displayName', p.display_name, 'avatar', p.avatar_url) order by f.created_at desc), '[]'::jsonb)
    into v_pending
    from public.friendships f join public.profiles p on p.id = f.requester_id
    where f.status='pending' and f.addressee_id=v_uid;
  return jsonb_build_object('friends', v_friends, 'pending', v_pending);
end $$;

-- ════════════════════════════════ RPC: IŠŠŪKIAI ════════════════════════════
create or replace function public.rvn_challenge_create(p_target uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.friendships where status='accepted' and ((requester_id=v_uid and addressee_id=p_target) or (requester_id=p_target and addressee_id=v_uid))) then
    raise exception 'ne draugas';
  end if;
  -- pašalinam senus laukiančius to paties iššūkėjo iššūkius tam draugui
  delete from public.friend_challenges where challenger_id=v_uid and target_id=p_target and status='pending';
  insert into public.friend_challenges (challenger_id, target_id, code, status) values (v_uid, p_target, p_code, 'pending');
end $$;

create or replace function public.rvn_challenge_incoming()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_out jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'challengerId', c.challenger_id, 'username', p.username, 'displayName', p.display_name) order by c.created_at desc), '[]'::jsonb)
    into v_out
    from public.friend_challenges c join public.profiles p on p.id = c.challenger_id
    where c.target_id=v_uid and c.status='pending' and c.created_at > now() - interval '10 minutes';
  return v_out;
end $$;

create or replace function public.rvn_challenge_accept(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_code text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.friend_challenges set status='accepted' where id=p_id and target_id=v_uid and status='pending' returning code into v_code;
  return v_code;
end $$;

create or replace function public.rvn_challenge_cancel(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  delete from public.friend_challenges where id=p_id and (challenger_id=v_uid or target_id=v_uid);
end $$;

grant execute on function public.rvn_friend_request(text)       to authenticated;
grant execute on function public.rvn_friend_respond(uuid,boolean) to authenticated;
grant execute on function public.rvn_friend_remove(uuid)        to authenticated;
grant execute on function public.rvn_friends_list()             to authenticated;
grant execute on function public.rvn_challenge_create(uuid,text) to authenticated;
grant execute on function public.rvn_challenge_incoming()       to authenticated;
grant execute on function public.rvn_challenge_accept(uuid)     to authenticated;
grant execute on function public.rvn_challenge_cancel(uuid)     to authenticated;
