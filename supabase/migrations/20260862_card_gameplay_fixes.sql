-- ─────────────────────────────────────────────────────────────────────────────
-- 20260862: kortų gameplay pataisymai (commit596/595 palydintys DB pakeitimai)
--
-- 1) Prazaras (visos fazių kortos): 1-as gebėjimas renkasi 2 taikinius RANKINIU
--    būdu (hitCount=2, requiresSelection=true, allowRandomTarget=false).
--    UI palaikymas: commit596 (kelių taikinių čempiono gebėjimo režimas).
-- 2) Chaoso tarnaitė: atakos pranašumas TIK jai pačiai puolant
--    (passiveAura.advAttackSelfOnly=true; variklio palaikymas commit596).
-- 3) Gazzaros žymė: mapping'ų trigeris onAnyStatus → onCurseDrawn
--    (prakeiksmai aktyvuojasi TIK per onCurseDrawn; iki šiol korta negyva).
-- 4) Belzatoro akis: trigeris onPlay → onCurseDrawn + revealOwnDeck →
--    revealEnemyDeck (turi rodyti AUKOS kaladę, ne kerėtojo).
--
-- Saugu leisti kelis kartus (idempotentiška). Kiekvienas UPDATE turi RETURNING,
-- kad Supabase SQL editor'iuje matytum, kurios kortos realiai paliestos.
-- NEPADENGTA (reikia dizaino sprendimo admin'e): „Pikti liežuviai" (mapping'ų
-- iš viso nėra – reikia sukurti efektą) ir „Juodieji pirštai" (tuščias chooseOne).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Peržiūra PRIEŠ (pasileisk atskirai, jei nori pamatyti dabartinę būseną) ──
-- SELECT name, gameplay#>'{championSkillConfig,skills,0,mappings,0}' AS skill1_map0
--   FROM cards WHERE name ILIKE 'prazaras%' OR champion_group ILIKE 'prazaras%';
-- SELECT name, gameplay->'passiveAura' FROM cards WHERE name ILIKE 'chaoso tarnait%';
-- SELECT name, gameplay->'effectMappings' FROM cards
--   WHERE name ILIKE 'gazzaros žym%' OR name ILIKE 'belzatoro ak%';

-- ── 1) Prazaras: skill 1 → 2 rankiniai taikiniai ────────────────────────────
UPDATE cards
SET gameplay = jsonb_set(jsonb_set(jsonb_set(
      gameplay,
      '{championSkillConfig,skills,0,mappings,0,hitCount}', '2'::jsonb),
      '{championSkillConfig,skills,0,mappings,0,requiresSelection}', 'true'::jsonb),
      '{championSkillConfig,skills,0,mappings,0,allowRandomTarget}', 'false'::jsonb)
WHERE (name ILIKE 'prazaras%' OR champion_group ILIKE 'prazaras%')
  AND gameplay #> '{championSkillConfig,skills,0,mappings,0}' IS NOT NULL
RETURNING name, gameplay#>'{championSkillConfig,skills,0,mappings,0}' AS skill1_map0;

-- ── 2) Chaoso tarnaitė: advantage tik pačiai kortai ─────────────────────────
UPDATE cards
SET gameplay = jsonb_set(gameplay, '{passiveAura,advAttackSelfOnly}', 'true'::jsonb)
WHERE name ILIKE 'chaoso tarnait%'
  AND gameplay ? 'passiveAura'
RETURNING name, gameplay->'passiveAura' AS aura;

-- ── 3) Gazzaros žymė: onAnyStatus → onCurseDrawn ────────────────────────────
UPDATE cards c
SET gameplay = jsonb_set(c.gameplay, '{effectMappings}', (
      SELECT jsonb_agg(
        CASE WHEN m->>'trigger' = 'onAnyStatus'
             THEN jsonb_set(m, '{trigger}', '"onCurseDrawn"'::jsonb)
             ELSE m END)
      FROM jsonb_array_elements(c.gameplay->'effectMappings') AS m))
WHERE c.name ILIKE 'gazzaros žym%'
  AND jsonb_typeof(c.gameplay->'effectMappings') = 'array'
  AND jsonb_array_length(c.gameplay->'effectMappings') > 0
RETURNING c.name, c.gameplay->'effectMappings' AS mappings;

-- ── 4) Belzatoro akis: onPlay → onCurseDrawn, revealOwnDeck → revealEnemyDeck ─
UPDATE cards c
SET gameplay = jsonb_set(c.gameplay, '{effectMappings}', (
      SELECT jsonb_agg(
        jsonb_set(
          CASE WHEN m->>'trigger' = 'onPlay'
               THEN jsonb_set(m, '{trigger}', '"onCurseDrawn"'::jsonb)
               ELSE m END,
          '{effect}',
          CASE WHEN m->>'effect' = 'revealOwnDeck'
               THEN '"revealEnemyDeck"'::jsonb
               ELSE to_jsonb(m->>'effect') END))
      FROM jsonb_array_elements(c.gameplay->'effectMappings') AS m))
WHERE c.name ILIKE 'belzatoro ak%'
  AND jsonb_typeof(c.gameplay->'effectMappings') = 'array'
  AND jsonb_array_length(c.gameplay->'effectMappings') > 0
RETURNING c.name, c.gameplay->'effectMappings' AS mappings;

-- ── Patikra PO: visos 4 užklausos aukščiau turėjo grąžinti bent po 1 eilutę ──
-- (Prazaras – iki 3 eilučių, po vieną kiekvienai fazei). Jei kuri grąžino 0 –
-- kortos vardas DB skiriasi nuo šablono; susirask tikslų vardą:
-- SELECT name FROM cards WHERE name ILIKE '%prazar%' OR name ILIKE '%tarnait%'
--   OR name ILIKE '%gazzar%' OR name ILIKE '%belzator%';
