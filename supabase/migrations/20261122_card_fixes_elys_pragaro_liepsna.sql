-- ════════════════════════════════════════════════════════════════════════════
-- Kortų pataisos po tekstų ir mapinimo palyginimo (v825, 2026-11-22).
-- Ataskaita: project doc claude/kortu-tekstu-ir-mapinimo-patikra-2026-11-22.md
--  A) Mapinimas pagal kortos tekstą:
--     • Elys Matviga – atstato PILNAS gyvybes visiems saviems (buvo gydo 1) → heal 99.
--     • Pragaro Liepsna – visi padarai ir artefaktai LIEKA su 1 gyvybe (buvo 1 žala visiems)
--       → damage su leaveHp = 1, be ŽMK (reikia kliento 825+; senesnis klientas darys 1 žalą kaip iki šiol).
--       Prakeiksmų įmaišymas (then) nekeičiamas.
--  B) DB tekstas pagal tikrą kortą (mapinimas buvo teisingas, Donatas patvirtino):
--     Magmos širdis, Kalnų trolis, Minotauras, Apvaizda.
-- Idempotentiška; kiti gameplay laukai (balsai, FX) neliečiami.
-- ════════════════════════════════════════════════════════════════════════════

update public.cards
   set gameplay = jsonb_set(gameplay, '{effectMappings,0,value}', '99'::jsonb)
 where card_number = 'inkvizicijos-legionas/CHARACTER_1-1' and name = 'Elys Matviga'
   and jsonb_typeof(gameplay->'effectMappings') = 'array'
   and gameplay->'effectMappings'->0->>'effect' = 'heal';

update public.cards
   set gameplay = jsonb_set(gameplay, '{effectMappings,0}',
         (gameplay->'effectMappings'->0)
         || '{"effect":"damage","target":"enemyUnit","targetTypes":["anyUnit","anyArtifact"],"applyToAllTypes":true,"value":1,"leaveHp":1,"triggersZmk":false,"requiresSelection":false}'::jsonb)
 where card_number = 'demonu-orda/Demonu_Orda_23' and name = 'Pragaro Liepsna'
   and jsonb_typeof(gameplay->'effectMappings') = 'array'
   and gameplay->'effectMappings'->0->>'effect' = 'damage';

update public.cards set effect_text = 'Savo ėjimo pradžioje suteikia po +1 ataką visiems jūsų padarams kovos lauke.'
 where card_number = 'BASE-004' and name = 'Magmos širdis';
update public.cards set effect_text = 'Kiekvieno savo ėjimo pradžioje įgyja +2 gyvybės.'
 where card_number = 'BASE-029' and name = 'Kalnų trolis';
update public.cards set effect_text = 'Atakuodamas apsvaigina taikinį.'
 where card_number = 'BASE-023' and name = 'Minotauras';
update public.cards set effect_text = 'Traukite 3 kortas.'
 where card_number = 'inkvizicijos-legionas/Inkvizicijos_legionas_291-11' and name = 'Apvaizda';

--  C) Papildyta (Donatas, 2026-11-22):
--     • Demoniška įžvalga – peržiūrimos 5 viršutinės SAVO kaladės kortos (buvo priešo kaladė).
--       Kortų perdėliojimo norima tvarka variklis savo kaladei dar neturi – lieka tik peržiūra.
--     • Laivo apskaita – šį ėjimą kortos kainuoja −100, bet ne pigiau nei 100 (kainos grindys buvo 1000).
update public.cards
   set gameplay = jsonb_set(gameplay, '{effectMappings,0}',
         (gameplay->'effectMappings'->0) || '{"effect":"revealOwnDeck","target":"self","value":5,"requiresSelection":false}'::jsonb)
 where card_number = 'demonu-orda/Demonu_Orda_37' and name = 'Demoniška įžvalga'
   and jsonb_typeof(gameplay->'effectMappings') = 'array'
   and gameplay->'effectMappings'->0->>'effect' in ('revealEnemyDeck', 'revealOwnDeck');

update public.cards
   set gameplay = jsonb_set(gameplay, '{effectMappings,0}',
         (gameplay->'effectMappings'->0) || '{"value":100,"costFloor":100}'::jsonb)
 where card_number = 'plesiku-naktis/Plesiku_Naktis_100' and name = 'Laivo apskaita'
   and jsonb_typeof(gameplay->'effectMappings') = 'array'
   and gameplay->'effectMappings'->0->>'effect' = 'turnCostDiscount';

--     • Drūzas Kirvarža – „visų priešininko padarų iškvietimas kainuoja +100".
--       Buvo: aura priešui +1 ataka ir kaina −100 (atvirkščiai), dar 1 žala sužaidus.
--       Dabar: aura priešui, kaina +100 (auraCostReduction −100), tik padarams (auraCostCardType – klientas 825+;
--       senesnis klientas brangins visas priešo kortas). Atakos priedas ir žala pašalinti.
update public.cards
   set gameplay = jsonb_set(
         jsonb_set(gameplay, '{passiveAura}', '{"auraScope":"enemy","auraCostReduction":-100,"auraCostCardType":"unit"}'::jsonb),
         '{effectMappings}', '[]'::jsonb)
 where card_number = 'plesiku-naktis/Plesiku_Naktis_85' and name = 'Drūzas Kirvarža';

--     • Kapitono Paslaptis – „Traukite 2 kortas; jeigu neturite padarų kovos lauke, įgykite +200".
--       Buvo: +100 visada. Dabar: 2 kortos ir +200 tik kai savo padarų lauke nėra.
update public.cards
   set gameplay = jsonb_set(gameplay, '{effectMappings}', '[
         {"trigger":"onCast","effect":"drawCards","target":"ownPlayer","value":2,"requiresSelection":false},
         {"trigger":"onCast","effect":"gainGold","target":"ownPlayer","value":200,"requiresSelection":false,"condition":{"source":"ownUnits","op":"eq","value":0}}
       ]'::jsonb)
 where card_number = 'plesiku-naktis/Plesiku_Naktis_70' and name = 'Kapitono Paslaptis';

--     • Kojos spąstai – „Priešininkui iškvietus padarą su Sprintu, padarykite jam sustabdymo efektą".
--       Buvo: nutildymas bet kuriam iškviestam padarui, be pusės filtro. Dabar: apsvaigina būtent iškviestą
--       priešo padarą ir tik jei jis turi Sprintą (triggerKeyword – klientas 825+).
update public.cards
   set gameplay = jsonb_set(gameplay, '{effectMappings}', '[
         {"trigger":"onAnySummon","triggerSide":"enemy","triggerKeyword":"sprint","effect":"stun","target":"enemyUnit","useTriggerSource":true,"value":1,"requiresSelection":false}
       ]'::jsonb)
 where card_number = 'BASE-037' and name = 'Kojos spastai';

--     • Platusis laukas – mapinimas (6 vietos) teisingas, taisomas tik DB tekstas.
update public.cards set effect_text = '- Padidina vietų skaičių nuo 5 iki 6 kiekvienoje pusėje.'
 where name = 'Platusus laukas' and effect_text like '%nuo 5 iki 10%';
