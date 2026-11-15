-- ════════════════════════════════════════════════════════════════════
-- Frakcija „Rytų vėjas" LAIKINAI paslepiama iš žaidimo (2026-11-15).
-- Niekas netrinama: ankstesnės reikšmės įrašomos į hidden_faction_backup,
-- atstatymas – _restore_rytu_vejas.sql. Saugu leisti pakartotinai.
-- ════════════════════════════════════════════════════════════════════
begin;

create table if not exists public.hidden_faction_backup (
  kind      text not null,
  ref       text not null,
  prev      text,
  hidden_at timestamptz not null default now(),
  primary key (kind, ref)
);
alter table public.hidden_faction_backup enable row level security;

-- 1) Kortos: active -> hidden (kolekcija, kaladžių kūrimas, boosteriai, dienos
--    pasiūlymas, DI kaladės ir viešas kortų katalogas ima tik 'active')
insert into public.hidden_faction_backup (kind, ref, prev)
select 'card', c.id::text, c.status::text
  from public.cards c join public.factions f on f.id = c.faction_id
 where f.slug = 'rytu-vejas' and c.status::text = 'active'
on conflict do nothing;

update public.cards c set status = 'hidden'
  from public.factions f
 where f.id = c.faction_id and f.slug = 'rytu-vejas' and c.status::text = 'active';

-- 2) Pradinė kaladė (naujoko pasirinkimas, parduotuvė, treniruotė)
insert into public.hidden_faction_backup (kind, ref, prev)
select 'starter_deck', s.id::text, 'active'
  from public.starter_decks s join public.factions f on f.id = s.faction_id
 where f.slug = 'rytu-vejas' and s.is_active
on conflict do nothing;

update public.starter_decks s set is_active = false
  from public.factions f
 where f.id = s.faction_id and f.slug = 'rytu-vejas' and s.is_active;

-- 3) Boosteriai: frakcija išimama iš pakuočių, aprašymai be jos vardo
insert into public.hidden_faction_backup (kind, ref, prev)
select 'pack_faction', pf.pack_id::text, pf.faction_id::text
  from public.pack_factions pf join public.factions f on f.id = pf.faction_id
 where f.slug = 'rytu-vejas'
on conflict do nothing;

delete from public.pack_factions pf using public.factions f
 where f.id = pf.faction_id and f.slug = 'rytu-vejas';

insert into public.hidden_faction_backup (kind, ref, prev)
select 'pack_desc', p.id::text, p.description
  from public.card_packs p
 where p.description like '%Rytų vėjas%'
on conflict do nothing;

update public.card_packs
   set description = replace(replace(description, ' · Rytų vėjas', ''), 'Rytų vėjas · ', '')
 where description like '%Rytų vėjas%';

insert into public.hidden_faction_backup (kind, ref, prev)
select 'translation', t.owner_type || '|' || t.owner_id || '|' || t.locale || '|' || t.field, t.value
  from public.content_translations t
 where t.value like '%· Eastern Wind%' or t.value like '%Eastern Wind ·%'
    or t.value like '%· Rytų vėjas%' or t.value like '%Rytų vėjas ·%'
on conflict do nothing;

update public.content_translations
   set value = replace(replace(replace(replace(value, ' · Eastern Wind', ''), 'Eastern Wind · ', ''), ' · Rytų vėjas', ''), 'Rytų vėjas · ', '')
 where value like '%· Eastern Wind%' or value like '%Eastern Wind ·%'
    or value like '%· Rytų vėjas%' or value like '%Rytų vėjas ·%';

-- 4) Reitingo botai: du Rytų vėjo botai laikinai žaidžia kitomis frakcijomis
insert into public.hidden_faction_backup (kind, ref, prev)
select 'bot', b.slug, b.faction_slug || '|' || b.faction
  from public.ranked_bots b
 where b.faction_slug = 'rytu-vejas'
on conflict do nothing;

update public.ranked_bots set faction_slug = 'plesiku-naktis', faction = 'Plėšikų naktis'
 where slug = 'sneak-exe' and faction_slug = 'rytu-vejas';
update public.ranked_bots set faction_slug = 'mirties-marsas', faction = 'Mirties maršas'
 where faction_slug = 'rytu-vejas';

-- 5) Kortų nugarėlė parduotuvėje
insert into public.hidden_faction_backup (kind, ref, prev)
select 'cosmetic', c.id, 'active' from public.cosmetics c
 where c.id = 'cb_rytu_vejas' and c.is_active
on conflict do nothing;

update public.cosmetics set is_active = false where id = 'cb_rytu_vejas' and is_active;

commit;

-- Patikra: kas paslėpta
select kind, count(*) as kiek from public.hidden_faction_backup group by kind order by kind;
