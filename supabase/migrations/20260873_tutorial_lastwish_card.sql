-- ════════════════════════════════════════════════════════════════════════════
-- TUTORIAL V3 — L6 papildymas: PASKUTINIO NORO korta.
-- L6 („Būsenos ir raktažodžiai") nepaaiškino trijų dalykų: Palaiminimo,
-- Kovos šūksnio ir Paskutinio noro. Pirmiems dviem kortų UŽTEKO (blessed
-- uždedamas scenarijaus mutacija, Kovos šūksnio karys = TUT-110), o Paskutinio
-- noro TUT rinkinyje NEBUVO nė vienos — štai ji.
-- Idempotentiška (where not exists pagal card_number).
-- ════════════════════════════════════════════════════════════════════════════
insert into public.cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health, effect_text, description, is_champion, status, gameplay)
select v.num, v.cname,
       (select id from public.factions  where name = v.fac limit 1),
       (select id from public.card_types where name = v.typ limit 1),
       (select id from public.rarities   where name = v.rar limit 1),
       v.cost, v.atk, v.hp, v.eff, v.descr, false, 'hidden',
       case when v.gp = '' then null else v.gp::jsonb end
from (values
  ('TUT-114','Ištikimas skydnešys','Universalus','Padaras','Magiškas',200,2,2,
    'Paskutinis noras: patrauk kortą.','Krisdamas paduoda tau savo ženklą.',
    '{"effectMappings":[{"trigger":"onDeath","effect":"drawCards","target":"self","value":1}]}')
) as v(num, cname, fac, typ, rar, cost, atk, hp, eff, descr, gp)
where not exists (select 1 from public.cards c where c.card_number = v.num);
