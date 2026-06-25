# Ravenof push notifikacijų setup (Android / Capacitor + FCM)

In-app notifikacijos (toast'ai + varpelis) **veikia iškart** be jokio setup — ir naršyklėje, ir Android appe (NotificationCenter apklausia `rvn_notifications_poll`).

Tikram **telefono push** (kai appas uždarytas) reikia šių žingsnių (vienkartinis):

## 1. Firebase
1. https://console.firebase.google.com → naujas projektas.
2. Add app → Android, package: **app.ravenof.game**.
3. Atsisiųsk **google-services.json** → įdėk į `C:\RavenofApp\android\app\google-services.json`.
4. Project settings → Service accounts → **Generate new private key** → gausi service account JSON.

## 2. Native shell (C:\RavenofApp)
```
cd C:\RavenofApp
npm i @capacitor/push-notifications
npx cap sync android
```
(android/app/build.gradle ir project build.gradle paprastai Capacitor sutvarko; jei ne — pridėk `com.google.gms.google-services` plugin per Firebase docs.)

Web kodas push'ui jau paruoštas (`src/lib/notify.ts` → `registerNativePush` per `window.Capacitor.Plugins.PushNotifications`), tad daugiau web pakeitimų nereikia.

## 3. Edge Function (siuntimas)
```
supabase functions deploy send-push
supabase secrets set FCM_SERVICE_ACCOUNT='<service account JSON vienoje eiluteje>'
supabase secrets set SEND_PUSH_SECRET='<sugalvok ilga slapta zodi>'
```
Funkcijos URL: `https://<PROJECT_REF>.functions.supabase.co/send-push`

## 4. Sujungti su įvykiais (DB trigger'iai per pg_net)
SQL editoriuje (pakeisk URL ir SECRET):
```sql
create extension if not exists pg_net;

create or replace function public.rvn__push(p_user uuid, p_title text, p_body text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/send-push',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <SEND_PUSH_SECRET>'),
    body := jsonb_build_object('userId', p_user, 'title', p_title, 'body', p_body, 'link', p_link)
  );
end $$;

-- Žinutė
create or replace function public.rvn__push_msg() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.rvn__push(new.to_id, 'Nauja žinutė', left(new.body,60), '/friends'); return new; end $$;
drop trigger if exists trg_push_msg on public.friend_messages;
create trigger trg_push_msg after insert on public.friend_messages for each row execute function public.rvn__push_msg();

-- Iššūkis
create or replace function public.rvn__push_chal() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.rvn__push(new.target_id, 'Iššūkis į kovą ⚔', 'Tave kviečia į PvP', '/friends'); return new; end $$;
drop trigger if exists trg_push_chal on public.friend_challenges;
create trigger trg_push_chal after insert on public.friend_challenges for each row execute function public.rvn__push_chal();

-- Mainai
create or replace function public.rvn__push_trade() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.rvn__push(new.b_id, 'Mainų pasiūlymas 🔄', 'Nori su tavimi mainytis kortomis', '/friends'); return new; end $$;
drop trigger if exists trg_push_trade on public.card_trades;
create trigger trg_push_trade after insert on public.card_trades for each row execute function public.rvn__push_trade();

-- Aukciono pardavimas (kai listing tampa 'sold')
create or replace function public.rvn__push_sale() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='sold' and old.status<>'sold' then
    perform public.rvn__push(new.seller_id, 'Korta parduota! 🪙', 'Tavo korta nupirkta aukcione', '/market');
  end if; return new;
end $$;
drop trigger if exists trg_push_sale on public.card_listings;
create trigger trg_push_sale after update on public.card_listings for each row execute function public.rvn__push_sale();
```

Po šių žingsnių: žinutė / iššūkis / mainai / pardavimas → push į telefoną (net kai appas uždarytas), o appui esant atvirame — toast per NotificationCenter.
