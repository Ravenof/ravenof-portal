-- ════════════════════════════════════════════════════════════════════════════
--  Valtoras Magninis (commit623): „sužaidus burtą šis patiria −3, o burtas
--  grįžta į RANKĄ". Iki šiol: passiveAura.returnCastSpellScope='friendly'
--  grąžindavo burtą į KALADĘ (Alchemikų forto semantika), o trečias mapping'as
--  (onCast tutorToHand iš kapinyno) nebeveikė, nes aura burtą jau būdavo
--  išėmusi iš kapinyno PRIEŠ onCast trigerius — grąžinimas tyliai dingdavo.
--  Variklio pusė (commit623): passiveAura.returnCastSpellTo='hand'.
--  Duomenys: aura → {friendly, hand}; TRINAMAS perteklinis 3-ias mapping'as;
--  damage mapping'ui requiresSelection=false (selfUnit — nėra ko rinktis).
-- ════════════════════════════════════════════════════════════════════════════

update public.cards
set gameplay = jsonb_set(
  jsonb_set(
    gameplay,
    '{passiveAura}',
    '{"returnCastSpellScope": "friendly", "returnCastSpellTo": "hand"}'::jsonb
  ),
  '{effectMappings}',
  '[
    {"value": 1, "effect": "tutorToHand", "target": "selfUnit", "trigger": "onSummon",
     "tutorZone": "discard", "projectile": "healingGlow", "tutorChoose": true,
     "tutorCardType": "spell", "requiresSelection": true},
    {"value": 3, "effect": "damage", "target": "selfUnit", "trigger": "onCast",
     "requiresSelection": false}
  ]'::jsonb
)
where name = 'Valtoras Magninis'
returning name, gameplay->'passiveAura' as aura, gameplay->'effectMappings' as mappings;
