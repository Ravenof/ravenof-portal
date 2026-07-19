-- ── Gazzaros žymė (Prakeiksmas): dispel aktyvacija ───────────────────────────
-- Buvo: trigger onAnyStatus (prakeiksmui NIEKADA nesuveikia – aktyvacija vyksta
-- tik per onCurseDrawn). Dabar: aukai ištraukus prakeiksmą, VISI jos padarai
-- praranda pozityvius efektus: Magišką skydą, Pasišaipymą, Sėlinimą, Sprintą,
-- Palaiminimą (reikia v507 cleanse dispel praplėtimo).
-- Pastaba: caster = prakeiksmo kerėtojas, todėl allEnemyUnits = aukos padarai.
UPDATE cards
SET gameplay = jsonb_set(COALESCE(gameplay, '{}'::jsonb), '{effectMappings}', '[
  { "trigger": "onCurseDrawn", "effect": "cleanse", "target": "allEnemyUnits",
    "cleanseStatuses": ["shield", "taunt", "stealth", "sprint", "blessed"],
    "requiresSelection": false, "note": "Žymė: aukos padarai praranda visus pozityvius efektus" }
]'::jsonb)
WHERE name = 'Gazzaros žymė';

SELECT name, jsonb_pretty(gameplay->'effectMappings') FROM cards WHERE name = 'Gazzaros žymė';
