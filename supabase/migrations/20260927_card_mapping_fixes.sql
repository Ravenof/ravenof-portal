-- ════════════════════════════════════════════════════════════════════════════
--  Kortų mappingų pataisos pagal auditą KORTU-MAPPING-AUDITAS-2026-09-23.md
--  Tik DUOMENYS (cards.gameplay). Idempotentiška: kiekvienas update turi guard'ą,
--  pakartotinai paleidus nieko nesugadina. Kiekvienas blokas grąžina paveiktas eilutes.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── A. SULAUŽYTI MAPPINGAI ──────────────────────────────────────────────────

-- A1) Pikti liežuviai (Prakeiksmas): onPlay niekada nesuveikia prakeiksmui →
--     onCurseDrawn. requiresSelection nuimamas (aktyvacija vyksta aukos ėjime).
update public.cards
set gameplay = jsonb_set(gameplay, '{effectMappings,0}',
  (gameplay->'effectMappings'->0) || '{"trigger":"onCurseDrawn","requiresSelection":false}'::jsonb)
where name = 'Pikti liežuviai'
  and gameplay->'effectMappings'->0->>'trigger' = 'onPlay'
returning name, gameplay->'effectMappings' as mappings;

-- A2) Klykianti siela (Prakeiksmas): Impo iškvietimas buvo ant onPlay →
--     onCurseDrawn + sąlyga „aukos rankoje ≥3" (enemyHandCards — mapping'as
--     vykdomas prakeikėjo vardu) + tik „Impas" iš kaladės/rankos/kapinyno.
update public.cards
set gameplay = jsonb_set(gameplay, '{effectMappings,1}',
  (gameplay->'effectMappings'->1) || jsonb_build_object(
    'trigger', 'onCurseDrawn',
    'target', 'self',
    'requiresSelection', false,
    'summonChoose', false,
    'summonNames', 'Impas',
    'summonZones', jsonb_build_array('deck','hand','discard'),
    'condition', jsonb_build_object('source','enemyHandCards','op','gte','value',3)))
where name = 'Klykianti siela'
  and gameplay->'effectMappings'->1->>'effect' = 'summonAdvanced'
  and gameplay->'effectMappings'->1->>'trigger' = 'onPlay'
returning name, gameplay->'effectMappings'->1 as impas_mapping;

-- A3) Raiden: „Kovos šūksnis: traukite 2 kortas" — mapping'o nebuvo.
update public.cards
set gameplay = coalesce(gameplay,'{}'::jsonb)
  || jsonb_build_object('effectMappings', jsonb_build_array(jsonb_build_object(
       'trigger','onSummon','effect','drawCards','target','self','value',2,'requiresSelection',false)),
     'needsEffectMapping', false)
where name = 'Raiden'
  and coalesce(jsonb_array_length(gameplay->'effectMappings'),0) = 0
returning name, gameplay->'effectMappings' as mappings;

-- A4) Tylos katedra (Laukas): fieldEffectConfig.passive.globalSilence jau yra
--     ir veikia; passiveAura laukui negyva → pašalinama.
update public.cards
set gameplay = (gameplay - 'passiveAura') || '{"needsEffectMapping":false}'::jsonb
where name = 'Tylos katedra'
  and (gameplay->'fieldEffectConfig'->'passive'->>'globalSilence')::boolean is true
returning name, gameplay->'fieldEffectConfig'->'passive' as passive;

-- A5) Gynybiniai įtvirtinimai (Laukas): tikrasis efektas jau per
--     fieldEffectConfig.passive.unitsGuardPlayer; negyva passiveAura pašalinama.
update public.cards
set gameplay = (gameplay - 'passiveAura') || '{"needsEffectMapping":false}'::jsonb
where name = 'Gynybiniai įtvirtinimai'
  and (gameplay->'fieldEffectConfig'->'passive'->>'unitsGuardPlayer')::boolean is true
returning name, gameplay->'fieldEffectConfig'->'passive' as passive;

-- A6) Didžioji Aelotės menė (Laukas): effectMappings lauko kortoms nevykdomi
--     (negyvas returnGraveyardToDeck). Pašalinama; lieka „reikia sumapinti",
--     nes tikram efektui reikia naujo lauko pasyvo variklyje.
update public.cards
set gameplay = (gameplay - 'effectMappings') || '{"needsEffectMapping":true}'::jsonb
where name = 'Didžioji Aelotės menė'
  and gameplay ? 'effectMappings'
returning name;

-- ── B. ŠIUKŠLĖS (poveikio neturi, bet klaidina admin'e) ─────────────────────

-- B1) gameplay šaknyje likę mapping'o laukai (tikri mapping'ai — effectMappings)
update public.cards
set gameplay = gameplay - array['trigger','effect','target','then','value','triggerSide',
                                'copyFromSide','requiresSelection','sameTarget']
where name in ('Oglor’as Klaidintojas','Rajūnas Pak-erael’is','Regnaras Mėgdžiotojas','Zorzok’as Alkanasis')
  and (gameplay ? 'trigger' or gameplay ? 'effect' or gameplay ? 'target')
  and jsonb_array_length(coalesce(gameplay->'effectMappings','[]'::jsonb)) > 0
returning name, jsonb_array_length(gameplay->'effectMappings') as mappings_left;

-- B2) Aukso kasykla (Laukas): negyvas shield/onAttack mapping'as + keywords
update public.cards
set gameplay = gameplay - array['effectMappings','keywords']
where name = 'Aukso kasykla'
  and (gameplay->'fieldEffectConfig'->'passive'->>'goldBonusPerTurn') is not null
returning name, gameplay->'fieldEffectConfig'->'passive' as passive;

-- B3) keywords ne padarų kortoms (burtai/reakcija lauke nebūna — negyva)
update public.cards
set gameplay = gameplay - 'keywords'
where name in ('Kabum!','Keistos šviesos','Kojos spastai')
  and card_type_id in (6, 7)
  and gameplay ? 'keywords'
returning name;

-- B4) Tuščios passiveAura (nė vieno aktyvaus lauko)
update public.cards
set gameplay = gameplay - 'passiveAura'
where name in ('Ginklų sandėlis','Isekono','Oglor’as Klaidintojas')
  and gameplay ? 'passiveAura'
  and not exists (
    select 1 from jsonb_each(gameplay->'passiveAura') e
    where e.key not in ('auraScope','auraIncludesSelf')
      and e.value not in ('null'::jsonb,'false'::jsonb,'0'::jsonb,'[]'::jsonb,'""'::jsonb))
returning name;

-- ── C. „Reikia sumapinti" varnelė nuimama kortoms, kurių efektą JAU dengia
--       pasyvas/raktažodis/lauko konfigūracija (tik admin higiena).
update public.cards
set gameplay = gameplay || '{"needsEffectMapping":false}'::jsonb
where (gameplay->>'needsEffectMapping')::boolean is true
  and name in (
    'Isodera','Uramami','Fururuno','Toguchi','Keihito',            -- keywords
    'Aidų tarpeklis','Užmirštųjų miškas','Mirties Pelkė','Ginklų sandėlis',
    'Platusus laukas','Siauras skersgatvis',                        -- lauko pasyvai
    'Alchemikų fortas','Kapitono Teleskopas','Ledo kristalas','Šėšėlio batai', -- artefaktų auros
    'Klausas','Gilez’as','Zabelx’as','Rinso','Kenjutsu','Kenji','Kūnų rijikas',
    'Isekono','Narigawa','Senasis golemas','Meistras Domura',
    'Gydūnė Džilė','Eldoras sielų meistras'                         -- padarų pasyvai
  )
returning name;

commit;
