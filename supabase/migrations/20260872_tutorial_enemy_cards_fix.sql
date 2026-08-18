-- ════════════════════════════════════════════════════════════════════════════
-- TUTORIAL: TRŪKSTAMOS PRIEŠO (Demonų orda) TUT KORTOS — REMONTAS
--
-- RADINYS 2026-08-18 (gyvas testas): prod DB turėjo 36 iš 40 TUT-### kortų —
-- trūko BŪTENT visų keturių priešo padarų iš 20260717 migracijos:
--   TUT-201 Goblinų skautas, TUT-202 Urvų padaras,
--   TUT-202B Akmeninis golemas, TUT-203 Plėšrus žvėris
-- (20260717 buvo paleista anksčiau, nei šios eilutės atsirado faile; `where not
--  exists` daro insert'ą idempotentišką, tad pakartotinis paleidimas jų nebeįdėjo
--  — jos tiesiog niekada nepateko į DB.)
--
-- PASEKMĖ: CardPool ima TIK `card_number like 'TUT-%'`, tad pamokų `setup.enemy`
-- lentos likdavo TUŠČIOS (L2 „pulk silpniausią priešą" — priešų iš viso nėra),
-- o L1 priešo kaladė (vien šios 4 kortos) būdavo tuščia → priešas per savo ėjimą
-- nieko nedarydavo ir atrodydavo kaip bug'as.
--
-- PASTABA: `npm run tutorial:check` lygina pamokas su migracijų FAILAIS, ne su DB,
-- todėl šito nepagavo. Po šios migracijos verta pasitikrinti ir admin'e.
-- ════════════════════════════════════════════════════════════════════════════
insert into public.cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health, effect_text, description, is_champion, status, gameplay)
select v.num, v.cname,
       (select id from public.factions  where name = v.fac limit 1),
       (select id from public.card_types where name = v.typ limit 1),
       (select id from public.rarities   where name = v.rar limit 1),
       v.cost, v.atk, v.hp, v.eff, v.descr, false, 'hidden', null
from (values
  ('TUT-201','Goblinų skautas','Demonų orda','Padaras','Paprastas',100,1,1,'','Mažas, bet greitas.'),
  ('TUT-202','Urvų padaras','Demonų orda','Padaras','Paprastas',200,2,2,'','Iš tamsos.'),
  ('TUT-203','Plėšrus žvėris','Demonų orda','Padaras','Paprastas',300,3,3,'','Alkanas.'),
  ('TUT-202B','Akmeninis golemas','Demonų orda','Padaras','Magiškas',400,4,5,'','Lėtas, bet tvirtas priešas.')
) as v(num, cname, fac, typ, rar, cost, atk, hp, eff, descr)
where not exists (select 1 from public.cards c where c.card_number = v.num);

-- Patikra: turi grąžinti 40
-- select count(*) from public.cards where card_number like 'TUT-%';
