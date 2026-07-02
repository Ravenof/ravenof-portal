-- Migracija: visoms PRAKEIKSMAS (curse) kortoms perjungti aktyvacijos mapping'ų
-- trigerį į 'onCurseDrawn'. Reikalinga po to, kai engine pradėjo aktyvuoti
-- prakeiksmus TIK pagal 'onCurseDrawn' trigerį (griežtas režimas).
--
-- Saugu paleisti kelis kartus (idempotentiška). Nekeičia nested `then` grandinių.
-- Prieš paleidžiant rekomenduojama: SELECT žemiau (peržiūra).

-- Peržiūra (kiek kortų bus paliesta):
-- SELECT c.card_number, c.name, c.gameplay->'mappings'
-- FROM cards c JOIN card_types ct ON ct.id = c.type_id
-- WHERE ct.name = 'Prakeiksmas'
--   AND c.gameplay ? 'mappings'
--   AND jsonb_typeof(c.gameplay->'mappings') = 'array'
--   AND jsonb_array_length(c.gameplay->'mappings') > 0;

UPDATE cards c
SET gameplay = jsonb_set(
  c.gameplay,
  '{mappings}',
  (
    SELECT jsonb_agg(jsonb_set(elem, '{trigger}', '"onCurseDrawn"'::jsonb))
    FROM jsonb_array_elements(c.gameplay->'mappings') AS elem
  )
)
FROM card_types ct
WHERE c.type_id = ct.id
  AND ct.name = 'Prakeiksmas'
  AND c.gameplay ? 'mappings'
  AND jsonb_typeof(c.gameplay->'mappings') = 'array'
  AND jsonb_array_length(c.gameplay->'mappings') > 0;
