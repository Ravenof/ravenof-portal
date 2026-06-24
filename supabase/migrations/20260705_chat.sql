-- ── Draugų žinutės (chat) + draugystės užklausa pagal id ──────────────────────

create table if not exists public.friend_messages (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid not null references public.profiles(id) on delete cascade,
  to_id      uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_fm_pair on public.friend_messages(from_id, to_id, created_at);
create index if not exists idx_fm_to on public.friend_messages(to_id, created_at);
alter table public.friend_messages enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='friend_messages' and policyname='fm_own_read') then
    create policy "fm_own_read" on public.friend_messages for select using (auth.uid()=from_id or auth.uid()=to_id);
  end if;
end $$;

create or replace function public.rvn_send_message(p_to uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_body text := left(trim(coalesce(p_body,'')), 500);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_body = '' then return; end if;
  if not exists (select 1 from public.friendships where status='accepted' and ((requester_id=v_uid and addressee_id=p_to) or (requester_id=p_to and addressee_id=v_uid))) then
    raise exception 'ne draugas';
  end if;
  insert into public.friend_messages (from_id, to_id, body) values (v_uid, p_to, v_body);
end $$;

create or replace function public.rvn_conversation(p_friend uuid, p_limit int default 60)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_out jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select coalesce(jsonb_agg(j order by (j->>'createdAt') asc), '[]'::jsonb) into v_out from (
    select jsonb_build_object('id', m.id, 'fromMe', (m.from_id = v_uid), 'body', m.body, 'createdAt', m.created_at) as j
    from public.friend_messages m
    where (m.from_id=v_uid and m.to_id=p_friend) or (m.from_id=p_friend and m.to_id=v_uid)
    order by m.created_at desc
    limit greatest(1, least(coalesce(p_limit,60), 200))
  ) q;
  return v_out;
end $$;

create or replace function public.rvn_friend_request_id(p_target uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_target = v_uid then raise exception 'negali pridėti savęs'; end if;
  if exists (select 1 from public.friendships where (requester_id=v_uid and addressee_id=p_target) or (requester_id=p_target and addressee_id=v_uid)) then
    return jsonb_build_object('ok', false, 'reason', 'jau yra');
  end if;
  insert into public.friendships (requester_id, addressee_id, status) values (v_uid, p_target, 'pending');
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.rvn_send_message(uuid,text)   to authenticated;
grant execute on function public.rvn_conversation(uuid,int)    to authenticated;
grant execute on function public.rvn_friend_request_id(uuid)   to authenticated;
