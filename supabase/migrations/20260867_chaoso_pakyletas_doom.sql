-- ════════════════════════════════════════════════════════════════════════════
--  Chaoso pakylėtas (commit625): „+5 atakos pasirinktam padarui; jo savininko
--  ėjimo PABAIGOJE padaras sunaikinamas". Iki šiol `then: destroy sameTarget`
--  sunaikindavo padarą IŠKART po buff'o (tą pačią akimirką) — kortos nauda
--  būdavo nulinė. Variklio pusė (commit625): EffectMapping.doomTargetAtTurnEnd
--  → taikinys pažymimas (BoardUnit.doomTurnEnd, 💀 ženkliukas) ir žūsta savo
--  savininko ėjimo pabaigoje (po onTurnEnd trigerių; lastwish veikia įprastai).
-- ════════════════════════════════════════════════════════════════════════════

update public.cards
set gameplay = jsonb_set(
  gameplay,
  '{effectMappings}',
  '[{
    "value": 5, "effect": "buffAttack", "target": "anyUnit", "trigger": "onPlay",
    "projectile": "healingGlow", "requiresSelection": true,
    "doomTargetAtTurnEnd": true
  }]'::jsonb
)
where name = 'Chaoso pakylėtas'
returning name, gameplay->'effectMappings' as mappings;
