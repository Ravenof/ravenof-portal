-- ── Dizaino pack ikonos: DB icon_url → lokalūs app failai ────────────────────
-- Frakcijų sigilai ir kortų tipų ikonos UI pirmiausia imamos iš DB icon_url
-- (Supabase upload'ai), todėl vien failų pakeitimo repo NEUŽTENKA. Šis patch'as
-- nukreipia DB į naujus dizainerio failus, kuriuos servina pati aplikacija.
UPDATE factions SET icon_url = '/icons/factions/' || slug || '.png'
WHERE slug IN ('demonu-orda','inkvizicijos-legionas','mirties-marsas','mistikos-melodija',
               'plesiku-naktis','rytu-vejas','sviesos-pulkas','vryhioko-gauja');
UPDATE factions SET icon_url = '/icons/factions/neutralus.png'
WHERE slug IN ('neutralus','universalus','neutral');

UPDATE card_types SET icon_url = CASE name
  WHEN 'Padaras' THEN '/icons/card-types/creature.png'
  WHEN 'Burtas' THEN '/icons/card-types/spell.png'
  WHEN 'Artefaktas' THEN '/icons/card-types/artefact.png'
  WHEN 'Reakcija' THEN '/icons/card-types/reaction.png'
  WHEN 'Laukas' THEN '/icons/card-types/field.png'
  WHEN 'Čempionas' THEN '/icons/card-types/champion.png'
  WHEN 'Prakeiksmas' THEN '/icons/card-types/curse.png'
  ELSE icon_url END;

SELECT slug, icon_url FROM factions ORDER BY id;
SELECT name, icon_url FROM card_types ORDER BY id;
