-- ════════════════════════════════════════════════════════════════════════════
-- TUTORIAL CARDS (TUT-###) — controlled, deterministic cards for the v2 tutorial.
-- status='hidden' (never in main collection/deckbuilder; tutorial loads by name).
-- Effects via cards.gameplay JSONB (effectMappings / championSkillConfig /
-- artifactEffectConfig) so lessons behave EXACTLY as taught.
-- Factions: Universalus (player) / Demonų orda (enemy). Idempotent on card_number.
-- ════════════════════════════════════════════════════════════════════════════
insert into public.cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health, effect_text, description, is_champion, status, gameplay)
select v.num, v.cname,
       (select id from public.factions  where name = v.fac limit 1),
       (select id from public.card_types where name = v.typ limit 1),
       (select id from public.rarities   where name = v.rar limit 1),
       v.cost, v.atk, v.hp, v.eff, v.descr, (v.typ = 'Čempionas'), 'hidden',
       case when v.gp = '' then null else v.gp::jsonb end
from (values
  -- ── Vanilla žaidėjo padarai (L1, L4 mainai) ──
  ('TUT-101','Naujokas kareivis','Universalus','Padaras','Paprastas',100,2,1,'','Pirmas tavo karys.',''),
  ('TUT-102','Kaimo gynėjas','Universalus','Padaras','Paprastas',200,2,3,'','Tvirtas ir kantrus.',''),
  ('TUT-103','Geležinis sargas','Universalus','Padaras','Paprastas',300,3,4,'','Laiko liniją.',''),
  ('TUT-104','Sienos lankininkas','Universalus','Padaras','Paprastas',200,3,2,'','Smogia iš tolo.',''),
  -- ── Vanilla priešo padarai ──
  ('TUT-201','Goblinų skautas','Demonų orda','Padaras','Paprastas',100,1,1,'','Mažas, bet greitas.',''),
  ('TUT-202','Urvų padaras','Demonų orda','Padaras','Paprastas',200,2,2,'','Iš tamsos.',''),
  ('TUT-203','Plėšrus žvėris','Demonų orda','Padaras','Paprastas',300,3,3,'','Alkanas.',''),
  -- ── Battlecry (L2) ──
  ('TUT-110','Kovos šūksnio karys','Universalus','Padaras','Magiškas',300,2,3,
    'Kovos šūksnis: padaro 2 žalą priešo padarui.','Šūksnis prieš smūgį.',
    '{"effectMappings":[{"trigger":"onSummon","effect":"damage","target":"enemyUnit","value":2,"requiresSelection":true}]}'),
  -- ── Burtai (L2/L5) ──
  ('TUT-120','Ugnies sviedinys','Universalus','Burtas','Magiškas',200,null,null,
    'Padaro 3 žalą priešo padarui.','Liepsna iš delno.',
    '{"spellType":"fireball","effectMappings":[{"trigger":"onCast","effect":"damage","target":"enemyUnit","value":3,"requiresSelection":true,"projectile":"fireball"}]}'),
  ('TUT-121','Gydanti šviesa','Universalus','Burtas','Magiškas',100,null,null,
    'Pagydo 3 draugišką padarą.','Šiluma žaizdoms.',
    '{"effectMappings":[{"trigger":"onCast","effect":"heal","target":"ownUnit","value":3,"requiresSelection":true}]}'),
  ('TUT-122','Mirtinas smūgis','Universalus','Burtas','Unikalus',300,null,null,
    'Sunaikina priešo padarą.','Vienas tikslus kirtis.',
    '{"effectMappings":[{"trigger":"onCast","effect":"destroy","target":"enemyUnit","requiresSelection":true}]}'),
  ('TUT-123','Senų raštų žinios','Universalus','Burtas','Paprastas',200,null,null,
    'Patrauk 2 kortas.','Žinios – galia.',
    '{"effectMappings":[{"trigger":"onCast","effect":"drawCards","target":"self","value":2}]}'),
  ('TUT-124','Ašmenų pūga','Universalus','Burtas','Epinis',400,null,null,
    'Padaro 2 žalą VISIEMS priešo padarams.','Plieno audra.',
    '{"effectMappings":[{"trigger":"onCast","effect":"damage","target":"allEnemyUnits","value":2}]}'),
  ('TUT-125','Ledo gniaužtai','Universalus','Burtas','Magiškas',200,null,null,
    'Užšaldo priešo padarą.','Šaltis, kuris stabdo.',
    '{"spellType":"freezeBurst","effectMappings":[{"trigger":"onCast","effect":"freeze","target":"enemyUnit","requiresSelection":true,"projectile":"freezeBurst"}]}'),
  -- ── Čempionas (L3/L5) ──
  ('TUT-130','Mokytojas Aldaras','Universalus','Čempionas','Legendinis',0,null,25,
    'Čempionas. Gebėjimas: padaro 3 žalą priešo padarui. Auginamas per Tribute.','Tavo vedlys mūšyje.',
    '{"championSkillConfig":{"skills":[{"name":"Žaibo smūgis","mappings":[{"trigger":"onChampionSkill","effect":"damage","target":"enemyUnit","value":3,"requiresSelection":true,"projectile":"lightning"}]},{"name":"Šviesos pliūpsnis","mappings":[{"trigger":"onChampionSkill","effect":"heal","target":"ownChampion","value":5}]},{"name":"Teisingumo kirtis","mappings":[{"trigger":"onChampionSkill","effect":"damage","target":"allEnemyUnits","value":3}]}]}}'),
  -- ── Artefaktas (L3) ──
  ('TUT-140','Senovinis vimpelas','Universalus','Artefaktas','Magiškas',200,null,null,
    'Kiekvieno ėjimo pradžioje tavo padarai gauna +1 puolimą.','Vėliava, kuri įkvepia.',
    '{"artifactEffectConfig":{"mappings":[{"trigger":"onTurnStart","effect":"buffAttack","target":"allOwnUnits","value":1}]}}')
) as v(num, cname, fac, typ, rar, cost, atk, hp, eff, descr, gp)
where not exists (select 1 from public.cards c where c.card_number = v.num);

-- ── Papildomos kortos: Laukas / Reakcija / Prišaukimas / Prakeiksmas / Stun (L3, L5) ──
insert into public.cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health, effect_text, description, is_champion, status, gameplay)
select v.num, v.cname,
       (select id from public.factions  where name = v.fac limit 1),
       (select id from public.card_types where name = v.typ limit 1),
       (select id from public.rarities   where name = v.rar limit 1),
       v.cost, v.atk, v.hp, v.eff, v.descr, false, 'hidden',
       case when v.gp = '' then null else v.gp::jsonb end
from (values
  ('TUT-150','Prakeiktas laukas','Universalus','Laukas','Epinis',300,null,null,
    'Kiekvieno ėjimo pradžioje VISI padarai (abiejų pusių) gauna 1 žalą.','Žemė, kuri ryja visus.',
    '{"fieldEffectConfig":{"affectsBothPlayers":true,"triggers":[{"trigger":"onTurnStart","effect":"damage","target":"allUnits","value":1}]}}'),
  ('TUT-160','Spąstų kilpa','Universalus','Reakcija','Magiškas',200,null,null,
    'Reakcija: kai tavo padaras puolamas, padaro 2 žalą puolėjui.','Paslėpta iki smūgio.',
    '{"effectMappings":[{"trigger":"onAttacked","effect":"damage","target":"enemyUnit","value":2,"useAttackTarget":true}]}'),
  ('TUT-112','Nekromantas','Universalus','Padaras','Unikalus',300,1,3,
    'Kovos šūksnis: iškviečia padarą iš tavo kaladės.','Šaukia mirusius į rikiuotę.',
    '{"effectMappings":[{"trigger":"onSummon","effect":"summonFromDeck","target":"self","summonCount":1,"summonCostMax":300}]}'),
  ('TUT-127','Tamsos ženklas','Universalus','Burtas','Unikalus',200,null,null,
    'Įmaišo 1 prakeiksmą į priešininko kaladę.','Žymė, kuri laukia.',
    '{"effectMappings":[{"trigger":"onCast","effect":"triggerCurse","target":"enemyPlayer","triggersCurse":{"count":1,"appliesTo":"opponent"}}]}'),
  ('TUT-128','Trenksmas','Universalus','Burtas','Magiškas',200,null,null,
    'Apsvaigina (stun) priešo padarą.','Smūgis, kuris stabdo.',
    '{"effectMappings":[{"trigger":"onCast","effect":"stun","target":"enemyUnit","requiresSelection":true}]}'),
  ('TUT-202B','Akmeninis golemas','Demonų orda','Padaras','Magiškas',400,4,5,'','Lėtas, bet tvirtas priešas.','')
) as v(num, cname, fac, typ, rar, cost, atk, hp, eff, descr, gp)
where not exists (select 1 from public.cards c where c.card_number = v.num);
