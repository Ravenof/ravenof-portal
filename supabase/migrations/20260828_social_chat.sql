-- ════════════════════════════════════════════════════════════════════════════
-- Social chat v2: presence statusai (away/dnd/hidden), žinučių read/idempotency,
-- blokavimas, rate limit, pokalbių apžvalga su unread, realtime publikacija.
-- Bazė: 20260705_chat.sql (friend_messages) + 20260820 (last_seen/heartbeat).
-- Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) profiles.presence_status: 'auto' (pagal last_seen) | away | dnd | hidden
alter table public.profiles add column if not exists presence_status text not null default 'auto';
do $$ begin
  alter table public.profiles add constraint profiles_presence_chk
    check (presence_status in ('auto','away','dnd','hidden'));
exception when duplicate_object then null; end $$;

-- 2) friend_messages: read/idempotency
alter table public.friend_messages add column if not exists read_at timestamptz;
alter table public.friend_messages add column if not exists client_message_id text;
create unique index if not exists idx_fm_client_id on public.friend_messages(from_id, client_message_id) where client_message_id is not null;
create index if not exists idx_fm_unread on public.friend_messages(to_id, from_id) where read_at is null;

-- 3) blokavimas
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.user_blocks enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_blocks' and policyname='ub_own') then
    create policy "ub_own" on public.user_blocks for select using (auth.uid() = blocker_id);
  end if;
end $$;

create or replace function public.rvn_block_user(p_user uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_user = v_uid then raise exception 'negalima blokuoti savęs'; end if;
  if p_on then
    insert into public.user_blocks (blocker_id, blocked_id) values (v_uid, p_user) on conflict do nothing;
  else
    delete from public.user_blocks where blocker_id = v_uid and blocked_id = p_user;
  end if;
end $$;
grant execute on function public.rvn_block_user(uuid, boolean) to authenticated;

-- 4) presence nustatymas (server-side; hidden vykdomas rvn_friends_list/overview)
create or replace function public.rvn_set_presence(p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_status not in ('auto','away','dnd','hidden') then raise exception 'blogas statusas'; end if;
  update public.profiles set presence_status = p_status, last_seen_at = now() where id = v_uid;
end $$;
grant execute on function public.rvn_set_presence(text) to authenticated;

-- 5) rvn_send_message v2: blokai + rate limit + idempotency + grąžina žinutę
drop function if exists public.rvn_send_message(uuid, text);
create or replace function public.rvn_send_message(p_to uuid, p_body text, p_client_id text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_body text := left(regexp_replace(trim(coalesce(p_body,'')), '[\x00-\x08\x0B\x0C\x0E-\x1F]', '', 'g'), 500);
  v_id uuid; v_at timestamptz;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_body = '' then raise exception 'tuščia žinutė'; end if;
  if not exists (select 1 from public.friendships where status='accepted' and ((requester_id=v_uid and addressee_id=p_to) or (requester_id=p_to and addressee_id=v_uid))) then
    raise exception 'ne draugas';
  end if;
  if exists (select 1 from public.user_blocks where (blocker_id=p_to and blocked_id=v_uid) or (blocker_id=v_uid and blocked_id=p_to)) then
    raise exception 'užblokuota';
  end if;
  -- rate limit: max 25 žinutės / 60 s
  if (select count(*) from public.friend_messages where from_id=v_uid and created_at > now() - interval '60 seconds') >= 25 then
    raise exception 'per daug žinučių — palauk minutę';
  end if;
  -- idempotency: pakartotinis siuntimas grąžina esamą
  if p_client_id is not null then
    select id, created_at into v_id, v_at from public.friend_messages where from_id=v_uid and client_message_id=p_client_id;
    if v_id is not null then return jsonb_build_object('id', v_id, 'createdAt', v_at, 'dup', true); end if;
  end if;
  insert into public.friend_messages (from_id, to_id, body, client_message_id)
    values (v_uid, p_to, v_body, p_client_id) returning id, created_at into v_id, v_at;
  return jsonb_build_object('id', v_id, 'createdAt', v_at, 'dup', false);
end $$;
grant execute on function public.rvn_send_message(uuid, text, text) to authenticated;

-- 6) žinučių perskaitymas
create or replace function public.rvn_dm_mark_read(p_friend uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.friend_messages set read_at = now() where to_id = v_uid and from_id = p_friend and read_at is null;
end $$;
grant execute on function public.rvn_dm_mark_read(uuid) to authenticated;

-- 7) pokalbių apžvalga: paskutinės žinutės + unread (chat sluoksniui/Friends veiklai)
create or replace function public.rvn_dm_overview()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_out jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select coalesce(jsonb_agg(j order by (j->>'lastAt') desc), '[]'::jsonb) into v_out from (
    select jsonb_build_object(
      'friendId', q.fid,
      'username', p.username, 'displayName', p.display_name, 'avatar', p.avatar_url,
      'presence', case
        when p.presence_status = 'hidden' then 'offline'
        when p.last_seen_at is null or p.last_seen_at <= now() - interval '2 minutes' then 'offline'
        when p.presence_status in ('away','dnd') then p.presence_status
        else 'online' end,
      'lastAt', q.last_at, 'lastText', q.last_text, 'lastFromMe', q.last_from_me,
      'unread', q.unread
    ) as j
    from (
      select case when m.from_id = v_uid then m.to_id else m.from_id end as fid,
             max(m.created_at) as last_at,
             (array_agg(m.body order by m.created_at desc))[1] as last_text,
             (array_agg(m.from_id order by m.created_at desc))[1] = v_uid as last_from_me,
             count(*) filter (where m.to_id = v_uid and m.read_at is null) as unread
      from public.friend_messages m
      where m.from_id = v_uid or m.to_id = v_uid
      group by 1
    ) q join public.profiles p on p.id = q.fid
  ) z;
  return v_out;
end $$;
grant execute on function public.rvn_dm_overview() to authenticated;

-- 8) rvn_friends_list v3: presence (hidden vykdoma ČIA — kitiems rodo offline,
--    lastSeen slepiamas), xp lygiui, unread per draugą, blokai atfiltruojami
create or replace function public.rvn_friends_list()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_friends jsonb; v_pending jsonb; v_out jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', f.id, 'userId', p.id, 'username', p.username, 'displayName', p.display_name, 'avatar', p.avatar_url,
      'xp', coalesce(p.xp_total, 0),
      'presence', case
        when p.presence_status = 'hidden' then 'offline'
        when p.last_seen_at is null or p.last_seen_at <= now() - interval '2 minutes' then 'offline'
        when p.presence_status in ('away','dnd') then p.presence_status
        else 'online' end,
      'lastSeen', case when p.presence_status = 'hidden' then null else p.last_seen_at end,
      'online', (p.presence_status <> 'hidden' and p.last_seen_at is not null and p.last_seen_at > now() - interval '2 minutes'),
      'unread', coalesce((select count(*) from public.friend_messages m where m.from_id = p.id and m.to_id = v_uid and m.read_at is null), 0),
      'blockedByMe', exists (select 1 from public.user_blocks b where b.blocker_id = v_uid and b.blocked_id = p.id)
    ) order by p.username), '[]'::jsonb)
    into v_friends
    from public.friendships f
    join public.profiles p on p.id = (case when f.requester_id = v_uid then f.addressee_id else f.requester_id end)
    where f.status='accepted' and (f.requester_id=v_uid or f.addressee_id=v_uid);
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'userId', p.id, 'username', p.username, 'displayName', p.display_name, 'avatar', p.avatar_url) order by f.created_at desc), '[]'::jsonb)
    into v_pending
    from public.friendships f join public.profiles p on p.id = f.requester_id
    where f.status='pending' and f.addressee_id=v_uid;
  select jsonb_build_object('friends', v_friends, 'pending', v_pending,
    'me', (select jsonb_build_object('presenceStatus', presence_status) from public.profiles where id = v_uid))
    into v_out;
  return v_out;
end $$;
grant execute on function public.rvn_friends_list() to authenticated;

-- 9) rvn_conversation v2: + read/clientId laukai (senas formatas praplečiamas)
create or replace function public.rvn_conversation(p_friend uuid, p_limit int default 60)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_out jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select coalesce(jsonb_agg(j order by (j->>'createdAt') asc), '[]'::jsonb) into v_out from (
    select jsonb_build_object('id', m.id, 'fromMe', (m.from_id = v_uid), 'body', m.body, 'createdAt', m.created_at,
      'readAt', m.read_at, 'clientId', m.client_message_id) as j
    from public.friend_messages m
    where (m.from_id=v_uid and m.to_id=p_friend) or (m.from_id=p_friend and m.to_id=v_uid)
    order by m.created_at desc
    limit greatest(1, least(coalesce(p_limit,60), 200))
  ) q;
  return v_out;
end $$;
grant execute on function public.rvn_conversation(uuid,int) to authenticated;

-- 10) Realtime: INSERT/UPDATE įvykiai klientams (gavėjas mato naujas, siuntėjas — read)
do $$ begin
  alter publication supabase_realtime add table public.friend_messages;
exception when duplicate_object then null; end $$;
alter table public.friend_messages replica identity full;
