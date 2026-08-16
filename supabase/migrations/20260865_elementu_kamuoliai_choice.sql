-- ════════════════════════════════════════════════════════════════════════════
--  Elementų kamuoliai (commit618): žaidėjas RENKASI —
--  A) 2 taikiniai lauke (padaras/artefaktas/čempionas) po −4, ARBA
--  B) −6 priešo žaidėjui (be taikinio pasirinkimo).
--  Iki šiol: viena šaka — 2 taikiniai po 4 (galėjo taikyti ir į žaidėją).
--  Variklio pusė (commit618): resolveChoice šakos mapping'ai su rankiniu
--  taikiniu 'you' kerėtojui eina per pendingLastwish (žaidėjas renkasi),
--  o ne auto-pick. AI renkasi 1-ą šaką (esamas chooseAlt kanonas).
-- ════════════════════════════════════════════════════════════════════════════

update public.cards
set gameplay = jsonb_set(
  gameplay,
  '{effectMappings}',
  '[{
    "sound": "impact", "value": 4, "effect": "damage", "target": "enemyUnit",
    "trigger": "onPlay", "hitCount": 2, "projectile": "fireball",
    "targetTypes": ["anyUnit", "anyArtifact", "anyChampion"],
    "requiresSelection": true,
    "note": "2 taikiniai lauke po −4",
    "chooseAlt": [{
      "sound": "impact", "value": 6, "effect": "damage", "target": "enemyPlayer",
      "trigger": "onPlay", "projectile": "fireball", "requiresSelection": false,
      "note": "−6 priešo žaidėjui"
    }]
  }]'::jsonb
)
where name = 'Elementų kamuoliai'
returning name, gameplay->'effectMappings' as mappings;
