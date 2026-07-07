-- ════════════════════════════════════════════════════════════════════════════
--  (1) NAUJIENOS: admin valdoma news lentelė Home ekranui (vietoj statinio
--      masyvo kode). (2) PRESENCE: profiles.last_seen_at + rvn_heartbeat —
--      draugų „online" indikatorius (online = matytas < 2 min). rvn_friends_list
--      papildyta lastSeen/online. (3) Kosmetikos pavadinimo typo fix.
-- ════════════════════════════════════════════════════════════════════════════

-- ── (1) NAUJIENOS ────────────────────────────────────────────────────────────
create table if not exists public.news (
  id         bigserial primary key,
  tag        text not null default 'Naujiena',   -- Atnaujinimas|Renginys|Balansas|...
  title      text not null,
  when_label text,                                -- pvz. 'Naujiena' / 'Aktyvu' / '' (nebūtina)
  link       text,                                -- nebūtina vidinė nuoroda
  is_active  boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
alter table public.news enable row level security;
drop policy if exists news_read on public.news;
create policy news_read on public.news for select using (true);
drop policy if exists news_admin on public.news;
create policy news_admin on public.news for all
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

insert into public.news (tag, title, when_label, sort_order)
select * from (values
  ('Atnaujinimas', 'Nauja horizontali kova', 'Naujiena', 10),
  ('Atnaujinimas', 'Visas meniu — landscape', 'Naujiena', 20),
  ('Renginys', 'Dienos užduotys ir skrynia', 'Aktyvu', 30)
) as v(tag, title, when_label, sort_order)
where not exists (select 1 from public.news);

-- ── (2) PRESENCE ─────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists last_seen_at timestamptz;

create or replace function public.rvn_heartbeat()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;
grant execute on function public.rvn_heartbeat() to authenticated;

-- rvn_friends_list + lastSeen/online (online = < 2 min)
create or replace function public.rvn_friends_list()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_friends jsonb; v_pending jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'userId', p.id, 'username', p.username, 'displayName', p.display_name, 'avatar', p.avatar_url,
      'lastSeen', p.last_seen_at, 'online', (p.last_seen_at is not null and p.last_seen_at > now() - interval '2 minutes')) order by p.username), '[]'::jsonb)
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

-- ── (3) Kosmetikos typo ──────────────────────────────────────────────────────
update public.cosmetics set name = 'Nuodų nugarėlė' where name = 'Nuodų nugaėlė';
