-- ════════════════════════════════════════════════════════════════════════════
--  PASIEKIMAI v2 (Profile & Progression handoff, Fazė 5)
--  ─────────────────────────────────────────────────────────────────────────
--  70 gamybinių pasiekimų: konfigūracija + žaidėjo progresas + skaitymo RPC.
--  • Senoji `badges`/`user_badges` sistema (web portalas /me, /users) NELIEČIAMA
--    – ji lieka veikti lygiagrečiai, kol UI bus perjungtas.
--  • Pavadinimai/sąlygos/kategorijos ateina iš dizaino manifesto
--    (asffa/asset-maps/achievement-manifest.csv → scripts/gen-handoff-registries.mjs).
--  • Badge'ai 63–70 dar negeneruoti: `badge_file` NULL + `status='pending'`.
--    UI tokiems rodo neutralų burgundinį apvalkalą – NIEKADA svetimos ikonos.
--  • Atlygiai skiriami AUTOMATIŠKAI (jokio „Claim" mygtuko) – kai atsiras
--    reward engine kabliukai, jie rašys į rvn_achievement_progress.completed_at.
--  Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Konfigūracija ──────────────────────────────────────────────────────────
create table if not exists public.rvn_achievements (
  code           text primary key,
  sort_order     int  not null,
  category       text not null check (category in ('start','combat','tactics','decks','collection','ranked','daily','community')),
  name_lt        text not null,
  requirement_lt text not null,
  /** 512×512 WebP su alfa iš public/ravenof-ui/achievements/. NULL = dar negeneruotas. */
  badge_file     text,
  status         text not null default 'generated' check (status in ('generated','pending')),
  /** Kiek reikia progreso (1 = vienkartinis). Nustatoma vėliau, kai bus tracking'as. */
  target         int  not null default 1,
  /** RewardSpec[] (žr. PROFILE-DATA-CONTRACT.md). Draudžiama: avatar_frame, title, ranked_badge. */
  rewards        jsonb not null default '[]'::jsonb,
  is_secret      boolean not null default false,
  is_active      boolean not null default true,
  updated_at     timestamptz not null default now()
);
alter table public.rvn_achievements enable row level security;
drop policy if exists rvn_ach_read on public.rvn_achievements;
create policy rvn_ach_read on public.rvn_achievements for select using (true);
drop policy if exists rvn_ach_admin on public.rvn_achievements;
create policy rvn_ach_admin on public.rvn_achievements for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Apsauga: konfigūracijoje negali atsirasti draudžiamų atlygių tipų
create or replace function public.rvn__ach_rewards_guard() returns trigger
language plpgsql as $$
begin
  if exists (
    select 1 from jsonb_array_elements(coalesce(NEW.rewards, '[]'::jsonb)) r
     where r->>'kind' in ('avatar_frame','profile_frame','title','ranked_badge')
  ) then
    raise exception 'Pasiekimų atlygiuose draudžiami rėmai/titulai/ranked ženklai';
  end if;
  return NEW;
end $$;
drop trigger if exists trg_rvn_ach_rewards_guard on public.rvn_achievements;
create trigger trg_rvn_ach_rewards_guard before insert or update on public.rvn_achievements
  for each row execute function public.rvn__ach_rewards_guard();

-- ── Žaidėjo progresas ──────────────────────────────────────────────────────
create table if not exists public.rvn_achievement_progress (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  code         text not null references public.rvn_achievements(code) on delete cascade,
  progress     int  not null default 0,
  completed_at timestamptz,
  /** Atlygiai išduoti (automatiškai, be žaidėjo veiksmo). */
  granted_at   timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, code)
);
alter table public.rvn_achievement_progress enable row level security;
drop policy if exists rvn_achp_self on public.rvn_achievement_progress;
create policy rvn_achp_self on public.rvn_achievement_progress for select using (user_id = auth.uid());
drop policy if exists rvn_achp_public on public.rvn_achievement_progress;
-- vieši profiliai: matomi tik UŽBAIGTI pasiekimai
create policy rvn_achp_public on public.rvn_achievement_progress for select using (completed_at is not null);
create index if not exists rvn_achp_user_idx on public.rvn_achievement_progress (user_id, completed_at desc);

-- ── Prisegti pasiekimai profilyje (3 slotai) ───────────────────────────────
alter table public.profiles add column if not exists featured_achievements text[] not null default '{}'::text[];

-- ── Skaitymo RPC: konfigūracija + progresas + suvestinės ───────────────────
create or replace function public.rvn_get_achievements(p_user_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := coalesce(p_user_id, auth.uid()); v_list jsonb; v_done int; v_total int; v_cats jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;

  select jsonb_agg(jsonb_build_object(
      'code', a.code, 'sortOrder', a.sort_order, 'category', a.category,
      'nameLt', a.name_lt, 'requirementLt', a.requirement_lt,
      'badgeFile', a.badge_file, 'status', a.status, 'target', a.target,
      'rewards', a.rewards, 'isSecret', a.is_secret,
      'progress', coalesce(p.progress, 0),
      'completedAt', p.completed_at
    ) order by a.sort_order)
    into v_list
    from public.rvn_achievements a
    left join public.rvn_achievement_progress p on p.code = a.code and p.user_id = v_uid
   where a.is_active;

  select count(*) into v_total from public.rvn_achievements where is_active;
  select count(*) into v_done from public.rvn_achievement_progress p
    join public.rvn_achievements a on a.code = p.code and a.is_active
   where p.user_id = v_uid and p.completed_at is not null;

  select jsonb_object_agg(c.category, jsonb_build_object('total', c.total, 'done', coalesce(d.done, 0)))
    into v_cats
    from (select category, count(*) total from public.rvn_achievements where is_active group by category) c
    left join (
      select a.category, count(*) done from public.rvn_achievement_progress p
        join public.rvn_achievements a on a.code = p.code and a.is_active
       where p.user_id = v_uid and p.completed_at is not null group by a.category
    ) d on d.category = c.category;

  return jsonb_build_object(
    'achievements', coalesce(v_list, '[]'::jsonb),
    'completed', v_done, 'total', v_total,
    'categories', coalesce(v_cats, '{}'::jsonb),
    'featured', coalesce((select featured_achievements from public.profiles where id = v_uid), '{}'::text[])
  );
end $$;
grant execute on function public.rvn_get_achievements(uuid) to authenticated;

-- ── Prisegimas į profilį (tik UŽBAIGTI, daugiausiai 3) ─────────────────────
create or replace function public.rvn_set_featured_achievements(p_codes text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_ok int; v_codes text[] := coalesce(p_codes, '{}'::text[]);
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  if array_length(v_codes, 1) > 3 then return jsonb_build_object('error','max_three'); end if;
  if array_length(v_codes, 1) is not null then
    select count(*) into v_ok from public.rvn_achievement_progress
     where user_id = v_uid and completed_at is not null and code = any(v_codes);
    if v_ok <> array_length(v_codes, 1) then return jsonb_build_object('error','not_completed'); end if;
  end if;
  update public.profiles set featured_achievements = v_codes where id = v_uid;
  return jsonb_build_object('ok', true, 'featured', v_codes);
end $$;
grant execute on function public.rvn_set_featured_achievements(text[]) to authenticated;

-- ── Seed'as (generuotas iš dizaino manifesto) ──────────────────────────────
-- ⚠️ GENERUOTAS FAILAS (scripts/gen-handoff-registries.mjs) — nekeisk ranka.
-- 70 gamybinių pasiekimų iš asffa/asset-maps/achievement-manifest.csv
insert into public.rvn_achievements (code, sort_order, category, name_lt, requirement_lt, badge_file, status) values
  ('ach_01', 1, 'start', 'Pirmasis žingsnis', 'Susikurkite paskyrą ir pirmą kartą įeikite į žaidimą', '01-pirmasis-zingsnis.webp', 'generated'),
  ('ach_02', 2, 'start', 'Vardas įrašytas', 'Pasirinkite žaidėjo vardą', '02-vardas-irasytas.webp', 'generated'),
  ('ach_03', 3, 'start', 'Veidas Arenoje', 'Pasirinkite ne numatytąjį avatarą', '03-veidas-arenoje.webp', 'generated'),
  ('ach_04', 4, 'start', 'Kovos priesaika', 'Užbaikite mokymus', '04-kovos-priesaika.webp', 'generated'),
  ('ach_05', 5, 'start', 'Pirmoji kaladė', 'Išsaugokite galiojančią 30–40 kortų kaladę', '05-pirmoji-kalade.webp', 'generated'),
  ('ach_06', 6, 'start', 'Pirmasis susirėmimas', 'Užbaikite pirmąsias rungtynes', '06-pirmasis-susiremimas.webp', 'generated'),
  ('ach_07', 7, 'start', 'Pirmoji pergalė', 'Laimėkite pirmąsias Casual arba Ranked rungtynes', '07-pirmoji-pergale.webp', 'generated'),
  ('ach_08', 8, 'start', 'Pilnas profilis', 'Pasirinkite avatarą prisegtus ženklus ir profilio privatumo nustatymus', '08-pilnas-profilis.webp', 'generated'),
  ('ach_09', 9, 'combat', 'Kraujo krikštas', 'Užbaikite 10 rungtynių', '09-kraujo-krikstas.webp', 'generated'),
  ('ach_10', 10, 'combat', 'Arenos nuolatinis', 'Užbaikite 50 rungtynių', '10-arenos-nuolatinis.webp', 'generated'),
  ('ach_11', 11, 'combat', 'Šimtas susirėmimų', 'Užbaikite 100 rungtynių', '11-simtas-susiremimu.webp', 'generated'),
  ('ach_12', 12, 'combat', 'Karo veteranas', 'Užbaikite 250 rungtynių', '12-karo-veteranas.webp', 'generated'),
  ('ach_13', 13, 'combat', 'Pergalių skonis', 'Laimėkite 10 PvP rungtynių', '13-pergaliu-skonis.webp', 'generated'),
  ('ach_14', 14, 'combat', 'Kovų nugalėtojas', 'Laimėkite 50 PvP rungtynių', '14-kovu-nugaletojas.webp', 'generated'),
  ('ach_15', 15, 'combat', 'Šimtąkart triumfavęs', 'Laimėkite 100 PvP rungtynių', '15-simtakart-triumfaves.webp', 'generated'),
  ('ach_16', 16, 'combat', 'Arenos siaubas', 'Laimėkite 250 PvP rungtynių', '16-arenos-siaubas.webp', 'generated'),
  ('ach_17', 17, 'combat', 'Pergalių serija', 'Laimėkite 3 rungtynes iš eilės', '17-pergaliu-serija.webp', 'generated'),
  ('ach_18', 18, 'combat', 'Nenugalimas', 'Laimėkite 5 parinktas PvP rungtynes iš eilės', '18-nenugalimas.webp', 'generated'),
  ('ach_19', 19, 'tactics', 'Pirma reakcija', 'Panaudokite pirmą Reaction kortą', '19-pirma-reakcija.webp', 'generated'),
  ('ach_20', 20, 'tactics', 'Grandinės pradžia', 'Suaktyvinkite 2 Reaction vienoje grandinėje', '20-grandines-pradzia.webp', 'generated'),
  ('ach_21', 21, 'tactics', 'Reakcijų meistras', 'Panaudokite 50 Reaction', '21-reakciju-meistras.webp', 'generated'),
  ('ach_22', 22, 'tactics', 'Kovos šauksmas', 'Suaktyvinkite pirmą Battlecry', '22-kovos-sauksmas.webp', 'generated'),
  ('ach_23', 23, 'tactics', 'Šauklių armija', 'Suaktyvinkite 100 Battlecry arba summon efektų', '23-saukliu-armija.webp', 'generated'),
  ('ach_24', 24, 'tactics', 'Aukos kaina', 'Pirmą kartą sumokėkite Tribute', '24-aukos-kaina.webp', 'generated'),
  ('ach_25', 25, 'tactics', 'Čempiono iškilimas', 'Pasiekite Champion III fazę', '25-cempiono-iskilimas.webp', 'generated'),
  ('ach_26', 26, 'tactics', 'Lauko valdovas', 'Pakeiskite priešininko lauką', '26-lauko-valdovas.webp', 'generated'),
  ('ach_27', 27, 'tactics', 'Vienu smūgiu', 'Vienu efektu sunaikinkite 3 padarus', '27-vienu-smugiu.webp', 'generated'),
  ('ach_28', 28, 'tactics', 'Trigubas taikinys', 'Viena korta arba efektu paveikite 3 taikinius', '28-trigubas-taikinys.webp', 'generated'),
  ('ach_29', 29, 'tactics', 'Ant mirties slenksčio', 'Laimėkite kai herojui likę 5 arba mažiau HP', '29-ant-mirties-slenkscio.webp', 'generated'),
  ('ach_30', 30, 'tactics', 'Be įbrėžimo', 'Laimėkite nepatyrę žalos herojui', '30-be-ibrezimo.webp', 'generated'),
  ('ach_31', 31, 'decks', 'Kaladžių kalvis', 'Sukurkite 5 galiojančias kalades', '31-kaladziu-kalvis.webp', 'generated'),
  ('ach_32', 32, 'decks', 'Frakcijų eksperimentuotojas', 'Sužaiskite su 3 skirtingomis frakcijomis', '32-frakciju-eksperimentuotojas.webp', 'generated'),
  ('ach_33', 33, 'decks', 'Trijų vėliavų nugalėtojas', 'Laimėkite su 3 skirtingomis frakcijomis', '33-triju-veliavu-nugaletojas.webp', 'generated'),
  ('ach_34', 34, 'decks', 'Visų kelių keleivis', 'Sužaiskite su visomis 8 frakcijomis', '34-visu-keliu-keleivis.webp', 'generated'),
  ('ach_35', 35, 'decks', 'Visų frakcijų strategas', 'Laimėkite su visomis 8 frakcijomis', '35-visu-frakciju-strategas.webp', 'generated'),
  ('ach_36', 36, 'decks', 'Ištikimas vėliavai', 'Laimėkite 10 rungtynių su ta pačia frakcija', '36-istikimas-veliavai.webp', 'generated'),
  ('ach_37', 37, 'decks', 'Frakcijos čempionas', 'Laimėkite 50 rungtynių su ta pačia frakcija', '37-frakcijos-cempionas.webp', 'generated'),
  ('ach_38', 38, 'decks', 'Čempiono kaladė', 'Laimėkite su III fazės Champion', '38-cempiono-kalade.webp', 'generated'),
  ('ach_39', 39, 'decks', 'Burtų meistras', 'Laimėkite su kalade turinčia bent 12 burtų', '39-burtu-meistras.webp', 'generated'),
  ('ach_40', 40, 'decks', 'Padarų vadas', 'Laimėkite su kalade turinčia bent 20 padarų', '40-padaru-vadas.webp', 'generated'),
  ('ach_41', 41, 'collection', 'Pirmasis radinys', 'Gaukite pirmą kortą nepriklausančią pradinei kolekcijai', '41-pirmasis-radinys.webp', 'generated'),
  ('ach_42', 42, 'collection', 'Auganti kolekcija', 'Surinkite 50 unikalių kortų', '42-auganti-kolekcija.webp', 'generated'),
  ('ach_43', 43, 'collection', 'Kortų archyvas', 'Surinkite 100 unikalių kortų', '43-kortu-archyvas.webp', 'generated'),
  ('ach_44', 44, 'collection', 'Didžioji saugykla', 'Surinkite 200 unikalių kortų', '44-didzioji-saugykla.webp', 'generated'),
  ('ach_45', 45, 'collection', 'Ravenoro kolekcionierius', 'Surinkite 300 unikalių kortų', '45-ravenoro-kolekcionierius.webp', 'generated'),
  ('ach_46', 46, 'collection', 'Retas laimikis', 'Gaukite pirmą Rare kortą', '46-retas-laimikis.webp', 'generated'),
  ('ach_47', 47, 'collection', 'Epiškas radinys', 'Gaukite pirmą Epic kortą', '47-episkas-radinys.webp', 'generated'),
  ('ach_48', 48, 'collection', 'Legenda rankose', 'Gaukite pirmą Legendary kortą', '48-legenda-rankose.webp', 'generated'),
  ('ach_49', 49, 'collection', 'Čempionas pabudo', 'Gaukite pirmą Champion kortą', '49-cempionas-pabudo.webp', 'generated'),
  ('ach_50', 50, 'collection', 'Aštuonių vėliavų rinkinys', 'Surinkite po 10 unikalių kortų iš kiekvienos iš 8 frakcijų', '50-astuoniu-veliavu-rinkinys.webp', 'generated'),
  ('ach_51', 51, 'ranked', 'Pirmasis rangas', 'Užbaikite pirmąsias Ranked rungtynes', '51-pirmasis-rangas.webp', 'generated'),
  ('ach_52', 52, 'ranked', 'Įrašas lentelėje', 'Laimėkite pirmąsias Ranked rungtynes', '52-irasas-lenteleje.webp', 'generated'),
  ('ach_53', 53, 'ranked', 'Kylantis varžovas', 'Laimėkite 10 Ranked rungtynių', '53-kylantis-varzovas.webp', 'generated'),
  ('ach_54', 54, 'ranked', 'Arenos grėsmė', 'Laimėkite 50 Ranked rungtynių', '54-arenos-gresme.webp', 'generated'),
  ('ach_55', 55, 'ranked', 'Šimtas ranginių pergalių', 'Laimėkite 100 Ranked rungtynių', '55-simtas-ranginiu-pergaliu.webp', 'generated'),
  ('ach_56', 56, 'ranked', 'Sidabro slenkstis', 'Pirmą kartą pasiekite Silver pakopą', '56-sidabro-slenkstis.webp', 'generated'),
  ('ach_57', 57, 'ranked', 'Aukso vartai', 'Pirmą kartą pasiekite Gold pakopą', '57-aukso-vartai.webp', 'generated'),
  ('ach_58', 58, 'ranked', 'Aukso viršūnė', 'Pasiekite aukščiausią Gold pakopą', '58-aukso-virsune.webp', 'generated'),
  ('ach_59', 59, 'ranked', 'Sezono veteranas', 'Per vieną sezoną sužaiskite 50 Ranked rungtynių', '59-sezono-veteranas.webp', 'generated'),
  ('ach_60', 60, 'ranked', 'Auksinė pabaiga', 'Užbaikite sezoną Gold pakopoje', '60-auksine-pabaiga.webp', 'generated'),
  ('ach_61', 61, 'daily', 'Dienos darbas', 'Užbaikite pirmą Daily Quest', '61-dienos-darbas.webp', 'generated'),
  ('ach_62', 62, 'daily', 'Darbas baigtas', 'Per vieną dieną užbaikite visus 3 Daily Quest', '62-darbas-baigtas.webp', 'generated'),
  ('ach_63', 63, 'daily', 'Patikimas samdinys', 'Užbaikite 25 Daily Quest', null, 'pending'),
  ('ach_64', 64, 'daily', 'Šimtas užduočių', 'Užbaikite 100 Daily Quest', null, 'pending'),
  ('ach_65', 65, 'daily', 'Savaitės ritmas', 'Prisijunkite 7 dienas iš eilės', null, 'pending'),
  ('ach_66', 66, 'daily', 'Mėnesio ištvermė', 'Prisijunkite 30 dienų iš eilės', null, 'pending'),
  ('ach_67', 67, 'community', 'Vieša strategija', 'Paskelbkite pirmą viešą kaladę', null, 'pending'),
  ('ach_68', 68, 'community', 'Pirmas balsas', 'Balsuokite už kito žaidėjo kaladę', null, 'pending'),
  ('ach_69', 69, 'community', 'Bendruomenės kibirkštis', 'Gaukite 10 balsų už paskelbtą kaladę', null, 'pending'),
  ('ach_70', 70, 'community', 'Meta pėdsakas', 'Pasiekite kad jūsų kaladė būtų nukopijuota 25 kartus', null, 'pending')
on conflict (code) do update set
  sort_order = excluded.sort_order, category = excluded.category, name_lt = excluded.name_lt,
  requirement_lt = excluded.requirement_lt, badge_file = excluded.badge_file, status = excluded.status,
  updated_at = now();

-- ── Sveikatos patikra ──────────────────────────────────────────────────────
do $$
declare n_all int; n_gen int; n_pend int; n_cat jsonb;
begin
  select count(*) into n_all from public.rvn_achievements;
  select count(*) into n_gen from public.rvn_achievements where status = 'generated';
  select count(*) into n_pend from public.rvn_achievements where status = 'pending';
  select jsonb_object_agg(category, c) into n_cat from (select category, count(*) c from public.rvn_achievements group by category) x;
  raise notice 'PASIEKIMAI: viso=% generated=% pending=% pagal kategorijas=%', n_all, n_gen, n_pend, n_cat;
  if n_all <> 70 then raise exception 'Laukta 70 pasiekimų, rasta %', n_all; end if;
end $$;
