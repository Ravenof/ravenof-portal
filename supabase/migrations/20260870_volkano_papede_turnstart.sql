-- ════════════════════════════════════════════════════════════════════════════
--  Volkano papėdė (commit629): „visi padarai, artefaktai ir čempionai patiria
--  po −1 (su ŽMK modifikatoriumi) KIEKVIENO SAVO ėjimo pradžioje".
--  Kodėl neveikė: mapping'as buvo `effectMappings` masyve, o LAUKO kortų
--  trigeriai skaitomi TIK iš `gameplay.fieldEffectConfig.triggers`
--  (fieldEngine.fieldTriggers) — effectMappings lauko kortoms niekada nešaunami.
--  Be to, senas trigger onAnyTurnStart + anyUnit/anyArtifact/anyChampion būtų
--  mušęs ABI puses per kiekvieną ėjimą (dvigubai per raundą).
--  Naujas: fieldEffectConfig.triggers su onTurnStart — fireTrigger jį šauna
--  AKTYVIOS pusės vardu ėjimo pradžioje, tad [allOwnUnits, ownChampion,
--  ownArtifact] + applyToAllTypes = tik aktyvios pusės taikiniai, kiekvienas
--  savo ėjimo pradžioje. Žala su ŽMK modifikatoriumi (default).
-- ════════════════════════════════════════════════════════════════════════════

update public.cards
set gameplay = jsonb_set(
  jsonb_set(
    gameplay,
    '{fieldEffectConfig,triggers}',
    '[{
      "value": 1, "effect": "damage", "trigger": "onTurnStart",
      "target": "ownUnit",
      "targetTypes": ["allOwnUnits", "ownChampion", "ownArtifact"],
      "applyToAllTypes": true, "requiresSelection": false,
      "projectile": "fireball", "sound": "impact"
    }]'::jsonb
  ),
  '{effectMappings}',
  '[]'::jsonb
)
where name = 'Volkano papėdė'
returning name, gameplay->'fieldEffectConfig' as field_cfg;
