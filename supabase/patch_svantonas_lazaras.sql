-- ── Svantonas Lazaras: vagystė + self buff ───────────────────────────────────
-- 1) Pašalinama klaidinga pasyvi aura (auraScope=enemy + auraCostReduction=100,
--    kuri PIGINO priešo kortas; anksčiau dar davė +1 ATK priešo padarams).
-- 2) Savininko ėjimo pradžioje: +200 aukso sau, priešas netenka 200 SAVO kito
--    ėjimo pradžioje (tarp ėjimų priešo auksas = 0, todėl vagystė modeliuojama
--    per loseGoldNextTurn baudą), ir +1 ATK / +1 HP pačiam Svantonui.
-- 3) Paliekamas esamas onPlay battlecry (1 žala pasirinktam priešo padarui).
UPDATE cards
SET gameplay = (gameplay - 'passiveAura') || jsonb_build_object('effectMappings', '[
  { "trigger": "onTurnStart", "effect": "gainGold", "value": 200, "goldAppliesTo": "caster", "target": "self", "requiresSelection": false, "note": "Vagystė: +200 aukso sau ėjimo pradžioje" },
  { "trigger": "onTurnStart", "effect": "loseGoldNextTurn", "value": 200, "target": "enemyPlayer", "requiresSelection": false, "note": "Vagystė: priešas netenka 200 savo ėjimo pradžioje" },
  { "trigger": "onTurnStart", "effect": "buffAttack", "value": 1, "target": "selfUnit", "requiresSelection": false,
    "then": [ { "trigger": "onTurnStart", "effect": "buffHealth", "value": 1, "target": "selfUnit", "requiresSelection": false } ] },
  { "trigger": "onPlay", "effect": "damage", "value": 1, "target": "enemyUnit", "requiresSelection": true }
]'::jsonb)
WHERE id = 'f32807bd-18af-435e-9797-813cb355961a';

-- Patikra:
SELECT name, gameplay->'passiveAura' AS aura, jsonb_pretty(gameplay->'effectMappings') AS mappings
FROM cards WHERE id = 'f32807bd-18af-435e-9797-813cb355961a';
