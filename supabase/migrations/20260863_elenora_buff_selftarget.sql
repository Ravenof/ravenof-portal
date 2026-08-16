-- ════════════════════════════════════════════════════════════════════════════
--  Elenora Kraujošviesa: „buff tipo burtas Į JĄ → 3 žala visiems priešo
--  padarams" (commit615). Variklio pusė: EffectMapping.triggerOnSelfTarget
--  (onAnyCast aktyvuojasi tik kai burto taikinių aibė apima ŠIĄ kortą —
--  rankinis taikinys arba auto/AoE). Duomenų pusė (ši migracija):
--  1) Elenoros mapping'ui pridedamas triggerOnSelfTarget=true
--     (requiresSelection nuimamas — allEnemyUnits taikinių nesirenkama).
--  2) Buff'iškiems burtams be spellType nustatomas gameplay.spellType='buff' —
--     be jo Elenoros triggerSpellType='buff' filtras neturėjo nuo ko užsivesti
--     (DB buvo TIK 2 burtai su spellType='buff').
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Elenora Kraujošviesa — triggerOnSelfTarget
update public.cards
set gameplay = jsonb_set(
  gameplay,
  '{effectMappings,0}',
  (gameplay->'effectMappings'->0)
    || jsonb_build_object('triggerOnSelfTarget', true, 'requiresSelection', false)
)
where name = 'Elenora Kraujošviesa'
  and gameplay->'effectMappings'->0->>'trigger' = 'onAnyCast'
returning name, gameplay->'effectMappings' as mappings;

-- 2) Buff burtai be spellType → 'buff' (tik aktyvūs; esamo spellType neliečiam)
update public.cards
set gameplay = jsonb_set(coalesce(gameplay, '{}'::jsonb), '{spellType}', '"buff"')
where status = 'active'
  and (gameplay->>'spellType') is null
  and name in (
    'Šventasis skydas', 'Antras kvėpavimas', 'Šventoji ranka', 'Šventintas vanduo',
    'Šviesos palaiminimas', 'Inkvizitoriaus Išmintis', 'Keistos šviesos', 'Dieviškoji aušra',
    'Pirmyn!', 'Krofordo relikvijos', 'Stiprus užnugaris', 'Įkvepianti kalba',
    'Šventasis įkvėpimas', 'Goblinų įniršis', 'Jungos agonija', 'Netikėtos relikvijos',
    'Laikinasis skydas', 'Jėgos eleksyras', 'Chaoso pakylėtas', 'Prakeiktųjų šauksmas'
  )
returning name, gameplay->>'spellType' as spell_type;
