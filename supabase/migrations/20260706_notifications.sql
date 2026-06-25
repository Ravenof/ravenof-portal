-- ── Notifikacijos: vieninga apklausa (poll) + push token'ai ───────────────────

create table if not exists public.user_push_tokens (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null,
  platform   text not null default 'android',
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
alter table public.user_push_tokens enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_push_tokens' and policyname='upt_own') then
    create policy "upt_own" on public.user_push_tokens for select using (user_id = auth.uid());
  end if;
end $$;

create or replace function public.rvn_save_push_token(p_token text, p_platform text default 'android')
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or coalesce(p_token,'')='' then return; end if;
  insert into public.user_push_tokens (user_id, token, platform, updated_at) values (v_uid, p_token, coalesce(p_platform,'android'), now())
    on conflict (user_id, token) do update set updated_at=now(), platform=excluded.platform;
end $$;

-- Vieninga naujų įvykių apklausa nuo p_since (žinutės, draugystės, iššūkiai, mainai, pardavimai).
create or replace function public.rvn_notifications_poll(p_since timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_since timestamptz := coalesce(p_since, now() - interval '30 seconds'); v_out jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select coalesce(jsonb_agg(e order by (e->>'ts') desc), '[]'::jsonb) into v_out from (
    select jsonb_build_object('type','message','title', coalesce(p.display_name,p.username,'Draugas'), 'body', left(m.body,60), 'ts', m.created_at, 'link','/friends') e
      from public.friend_messages m join public.profiles p on p.id=m.from_id
      where m.to_id=v_uid and m.created_at > v_since
    union all
    select jsonb_build_object('type','friend','title','Nauja draugystės užklausa','body', coalesce(p.display_name,p.username,''), 'ts', f.created_at, 'link','/friends')
      from public.friendships f join public.profiles p on p.id=f.requester_id
      where f.addressee_id=v_uid and f.status='pending' and f.created_at > v_since
    union all
    select jsonb_build_object('type','challenge','title','Iššūkis į kovą ⚔','body', coalesce(p.display_name,p.username,''), 'ts', c.created_at, 'link','/friends')
      from public.friend_challenges c join public.profiles p on p.id=c.challenger_id
      where c.target_id=v_uid and c.status='pending' and c.created_at > v_since
    union all
    select jsonb_build_object('type','trade','title','Mainų pasiūlymas 🔄','body', coalesce(p.display_name,p.username,''), 'ts', t.created_at, 'link','/friends')
      from public.card_trades t join public.profiles p on p.id=t.a_id
      where t.b_id=v_uid and t.status='pending' and t.created_at > v_since
    union all
    select jsonb_build_object('type','sale','title','Korta parduota! 🪙','body', c.name || ' — ' || l.price_gold || ' aukso', 'ts', l.sold_at, 'link','/market')
      from public.card_listings l join public.cards c on c.id=l.card_id
      where l.seller_id=v_uid and l.status='sold' and l.sold_at > v_since
  ) q;
  return v_out;
end $$;

grant execute on function public.rvn_save_push_token(text,text)        to authenticated;
grant execute on function public.rvn_notifications_poll(timestamptz)   to authenticated;
