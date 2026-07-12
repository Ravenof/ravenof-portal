-- ══════════════════════════════════════════════════════════════════════════════
-- i18n v2 — trūkstamas EN turinys (kosmetika, pakuotės, sezonai, starteriai)
--
-- EN įrašai siejami per LT pavadinimą (stabilus ID vis tiek naudojamas rakte:
-- content_translations.owner_id = lentelės ID / slug). Nesutapę įrašai lieka LT
-- ir matomi /admin/i18n „Ataskaita" bei `card_translation_status` skiltyse.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Kosmetika (cosmetics.id = slug) — EN pagal LT pavadinimą ───────────────
insert into public.content_translations (owner_type, owner_id, locale, field, value)
select 'cosmetic', c.id, 'en', 'name', x.en_name
from public.cosmetics c
join (values
  ('Įprasta nugarėlė',      'Standard Card Back',  'A plain card back'),
  ('Bazinė nugarėlė',       'Basic Card Back',     'A simple card back'),
  ('Nuodų nugarėlė',        'Poison Card Back',    'A venomous card back'),
  ('Žaibo nugarėlė',        'Lightning Card Back', 'A crackling card back'),
  ('Žarijų nugarėlė',       'Ember Card Back',     'A fiery card back'),
  ('Šerkšno nugarėlė',      'Frost Card Back',     'An icy card back'),
  ('Elektrinė nugarėlė',    'Electric Card Back',  'An electrified card back'),
  ('Tuštumos nugarėlė',     'Void Card Back',      'A dark violet card back'),
  ('Auksinė nugarėlė',      'Golden Card Back',    'A luxurious golden card back'),
  ('Reta nugarėlė',         'Rare Card Back',      'A rare card back'),
  ('Premium nugarėlė',      'Premium Card Back',   'A premium card back'),
  ('Legendinė nugarėlė',    'Legendary Card Back', 'A legendary card back'),
  ('Karmazino karūna',      'Crimson Crown',       'An exclusive card back'),
  ('Rubino infernas',       'Ruby Inferno',        'An exclusive card back'),
  ('Rubino varnas',         'Ruby Raven',          'An exclusive avatar'),
  ('Nuotykių ieškotoja',    'Adventurer',          'A seeker of adventure'),
  ('Nuotykių ieškotojas',   'Adventurer',          'A seeker of adventure'),
  ('Bazinis avataras',      'Basic Avatar',        'A simple player avatar'),
  ('Retas avataras',        'Rare Avatar',         'A rare player avatar'),
  ('Premium avataras',      'Premium Avatar',      'A premium player avatar'),
  ('Legendinis avataras',   'Legendary Avatar',    'A legendary player avatar'),
  ('Arenos laukas',         'Arena Board',         'A classic arena'),
  ('Miško laukas',          'Forest Board',        'A green battlefield'),
  ('Pragaro laukas',        'Inferno Board',       'A field of fire and ash')
) as x(lt_name, en_name, en_desc) on x.lt_name = c.name
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value)
select 'cosmetic', c.id, 'en', 'description', x.en_desc
from public.cosmetics c
join (values
  ('Įprasta nugarėlė',      'A plain card back'),
  ('Nuodų nugarėlė',        'A venomous card back'),
  ('Žaibo nugarėlė',        'A crackling card back'),
  ('Elektrinė nugarėlė',    'An electrified card back'),
  ('Nuotykių ieškotoja',    'A seeker of adventure'),
  ('Nuotykių ieškotojas',   'A seeker of adventure'),
  ('Išskirtinė nugarėlė',   'An exclusive card back'),
  ('Išskirtinis avataras',  'An exclusive avatar')
) as x(lt_name, en_desc) on x.lt_name = c.name or x.lt_name = c.description
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

-- Bendrinės kosmetikos aprašų frazės (jei aprašas sutampa 1:1)
update public.content_translations ct
set value = 'An exclusive card back', updated_at = now()
where ct.owner_type = 'cosmetic' and ct.locale = 'en' and ct.field = 'description'
  and ct.value in ('Išskirtinė nugarėlė', 'Išskirtinė nugarėlė — tik už rubinus');

-- ── Parduotuvės prekės: EN pagal LT pavadinimą (naujos prekės) ─────────────
insert into public.content_translations (owner_type, owner_id, locale, field, value)
select 'shop_item', s.slug, 'en', 'name', x.en_name
from public.shop_items s
join (values
  ('Gėrio gynėjai',   'Defenders of Good'),
  ('GĖRIO GYNĖJAI',   'DEFENDERS OF GOOD'),
  ('Tamsos aljansas', 'Alliance of Darkness'),
  ('TAMSOS ALJANSAS', 'ALLIANCE OF DARKNESS'),
  ('Įprasta nugarėlė','Standard Card Back'),
  ('Nuodų nugarėlė',  'Poison Card Back'),
  ('Žaibo nugarėlė',  'Lightning Card Back'),
  ('Elektrinė nugarėlė','Electric Card Back'),
  ('Šerkšno nugarėlė','Frost Card Back'),
  ('Žarijų nugarėlė', 'Ember Card Back'),
  ('Nuotykių ieškotoja','Adventurer'),
  ('Nuotykių ieškotojas','Adventurer')
) as x(lt_name, en_name) on x.lt_name = s.name
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

-- ── Kortų pakuotės (card_packs) ────────────────────────────────────────────
insert into public.content_translations (owner_type, owner_id, locale, field, value)
select 'card_pack', p.id::text, 'en', 'name', x.en_name
from public.card_packs p
join (values
  ('Gėrio gynėjai',   'Defenders of Good'),
  ('GĖRIO GYNĖJAI',   'DEFENDERS OF GOOD'),
  ('Tamsos aljansas', 'Alliance of Darkness'),
  ('TAMSOS ALJANSAS', 'ALLIANCE OF DARKNESS'),
  ('Standartinė pakuotė', 'Standard Pack'),
  ('Frakcijos pakuotė',   'Faction Pack'),
  ('Čempionų pakuotė',    'Champion Pack')
) as x(lt_name, en_name) on x.lt_name = p.name
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

-- ── Sezonai (season_pass_seasons) ──────────────────────────────────────────
insert into public.content_translations (owner_type, owner_id, locale, field, value)
select 'season', s.id::text, 'en', 'title', x.en_title
from public.season_pass_seasons s
join (values
  ('PIRMASIS SEZONAS', 'FIRST SEASON'),
  ('Pirmasis sezonas', 'First Season'),
  ('ANTRASIS SEZONAS', 'SECOND SEASON'),
  ('Antrasis sezonas', 'Second Season')
) as x(lt_title, en_title) on x.lt_title = s.title
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

-- LT snapshot'ai naujiems tipams (admin redagavimui)
insert into public.content_translations (owner_type, owner_id, locale, field, value)
select 'season', id::text, 'lt', 'title', title from public.season_pass_seasons
on conflict (owner_type, owner_id, locale, field) do nothing;

-- ── Starterinės kaladės (starter_decks) — pavadinimai/aprašymai ────────────
insert into public.content_translations (owner_type, owner_id, locale, field, value)
select 'starter_deck', d.id::text, 'en', 'name', x.en_name
from public.starter_decks d
join (values
  ('Mirties maršas',        'March of Death'),
  ('Demonų orda',           'Demon Horde'),
  ('Inkvizicijos legionas', 'Inquisition Legion'),
  ('Šviesos pulkas',        'Legion of Light'),
  ('Mistikos melodija',     'Melody of Mystics'),
  ('Rytų vėjas',            'Eastern Wind'),
  ('Plėšikų naktis',        'Night of Thieves'),
  ('Vryhioko gauja',        'Vryhiok Pack')
) as x(lt_name, en_name) on x.lt_name = d.name
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

-- ── Ataskaita: kiek EN įrašų pagal tipą ────────────────────────────────────
create or replace view public.content_translation_status as
select
  owner_type,
  count(*) filter (where locale = 'lt') as lt_rows,
  count(*) filter (where locale = 'en') as en_rows,
  count(*) filter (where locale = 'lt')
    - count(*) filter (where locale = 'en') as missing_en
from public.content_translations
group by owner_type
order by missing_en desc;
