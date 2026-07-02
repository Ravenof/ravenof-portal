-- Ravenof push trigger'iai. PROJECT_REF=hrfkelcoxnfpvdynkxtw
-- SVARBU: supabase secrets set SEND_PUSH_SECRET="<SEND_PUSH_SECRET>"  (tas pats kaip cia)
create extension if not exists pg_net;

create or replace function public.rvn__push(p_user uuid, p_title text, p_body text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://hrfkelcoxnfpvdynkxtw.functions.supabase.co/send-push',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <SEND_PUSH_SECRET>'),
    body := jsonb_build_object('userId', p_user, 'title', p_title, 'body', p_body, 'link', p_link)
  );
end $$;

create or replace function public.rvn__push_msg() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.rvn__push(new.to_id, 'Nauja žinutė', left(new.body,60), '/friends'); return new; end $$;
drop trigger if exists trg_push_msg on public.friend_messages;
create trigger trg_push_msg after insert on public.friend_messages for each row execute function public.rvn__push_msg();

create or replace function public.rvn__push_chal() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.rvn__push(new.target_id, 'Iššūkis į kovą ⚔', 'Tave kviečia į PvP', '/friends'); return new; end $$;
drop trigger if exists trg_push_chal on public.friend_challenges;
create trigger trg_push_chal after insert on public.friend_challenges for each row execute function public.rvn__push_chal();

create or replace function public.rvn__push_trade() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.rvn__push(new.b_id, 'Mainų pasiūlymas 🔄', 'Nori su tavimi mainytis kortomis', '/friends'); return new; end $$;
drop trigger if exists trg_push_trade on public.card_trades;
create trigger trg_push_trade after insert on public.card_trades for each row execute function public.rvn__push_trade();

create or replace function public.rvn__push_sale() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='sold' and old.status<>'sold' then
    perform public.rvn__push(new.seller_id, 'Korta parduota! 🪙', 'Tavo korta nupirkta aukcione', '/market');
  end if; return new;
end $$;
drop trigger if exists trg_push_sale on public.card_listings;
create trigger trg_push_sale after update on public.card_listings for each row execute function public.rvn__push_sale();
