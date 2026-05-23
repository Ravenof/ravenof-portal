-- ============================================================
-- Icons v1 — frakcijų ir kortų tipų ikonos
-- Paleisk Supabase SQL Editor
-- ============================================================

-- 1. Frakcijų ikonos (icon_url jau egzistuoja)
UPDATE factions SET icon_url = '/icons/factions/demonu-orda.png'          WHERE slug = 'demonu-orda';
UPDATE factions SET icon_url = '/icons/factions/inkvizicijos-legionas.png' WHERE slug = 'inkvizicijos-legionas';
UPDATE factions SET icon_url = '/icons/factions/mirties-marsas.png'        WHERE slug = 'mirties-marsas';
UPDATE factions SET icon_url = '/icons/factions/mistikos-melodija.png'     WHERE slug = 'mistikos-melodija';
UPDATE factions SET icon_url = '/icons/factions/neutralus.png'             WHERE slug = 'neutralus';
UPDATE factions SET icon_url = '/icons/factions/plesiku-naktis.png'        WHERE slug = 'plesiku-naktis';
UPDATE factions SET icon_url = '/icons/factions/rytu-vejas.png'            WHERE slug = 'rytu-vejas';
UPDATE factions SET icon_url = '/icons/factions/sviesos-pulkas.png'        WHERE slug = 'sviesos-pulkas';
UPDATE factions SET icon_url = '/icons/factions/vryhioko-gauja.png'        WHERE slug = 'vryhioko-gauja';

-- 2. Kortų tipų lentelė — pridedamas icon_url stulpelis
ALTER TABLE card_types ADD COLUMN IF NOT EXISTS icon_url text;

-- 3. Kortų tipų ikonos
UPDATE card_types SET icon_url = '/icons/card-types/field.png'    WHERE name = 'Laukas';
UPDATE card_types SET icon_url = '/icons/card-types/spell.png'    WHERE name = 'Burtas';
UPDATE card_types SET icon_url = '/icons/card-types/artefact.png' WHERE name = 'Artefaktas';
UPDATE card_types SET icon_url = '/icons/card-types/curse.png'    WHERE name = 'Prakeiksmas';
UPDATE card_types SET icon_url = '/icons/card-types/champion.png' WHERE name = 'Čempionas';
UPDATE card_types SET icon_url = '/icons/card-types/creature.png' WHERE name = 'Padaras';
UPDATE card_types SET icon_url = '/icons/card-types/reaction.png' WHERE name = 'Reakcija';

-- Patikrinimas
SELECT name, icon_url FROM factions ORDER BY sort_order;
SELECT name, icon_url FROM card_types ORDER BY sort_order;
