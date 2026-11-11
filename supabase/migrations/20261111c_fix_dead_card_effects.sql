-- ═══════════════════════════════════════
-- Kortų efektų pataisos po patikros tikrame variklyje (commit770, 2026-11-11).
-- Ataskaita: project doc claude/kortu-efektu-patikra-2026-11.md
--   • 2 reakcijos su trigeriu „onCast" niekada nesuveikdavo → onAnyCast (priešininko burtas)
--   • 2 kortos buvo pažymėtos kaip Reakcija, nors pagal kortą tai Burtas (nėra „Aktyvuojasi…" sąlygos)
--   • Kapinių žibintas, Mergelė Liliana, Išeinam, Šventintas vanduo – konfigūracija pagal kortos tekstą
-- „Išeinam" ir „+HP čempionui" veikia tik su klientu 770+.
-- Idempotentiška: effectMappings tiesiog perrašomi; kiti gameplay laukai (balsai, FX) neliečiami.
-- ═══════════════════════════════════════
do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select * from (values
      -- Sprogstanti magija: reakcija: trigeris onCast niekada nesaudavo -> kai priesininkas panaudoja burta
      ('1107fd44-d4c1-436c-8aab-6fe44f7c19d2'::uuid, '[{"trigger": "onAnyCast", "triggerSide": "enemy", "effect": "damage", "target": "allEnemyUnits", "targetTypes": ["enemyUnit", "enemyArtifact"], "value": 4, "requiresSelection": false}]'::jsonb, null::text),
      -- Stichijų skydas: reakcija: onCast -> priesininko burtas atsaukiamas + trauki korta
      ('f836dbf6-bc4a-42f9-93b7-7712254edd70'::uuid, '[{"trigger": "onAnyCast", "triggerSide": "enemy", "effect": "silence", "target": "castSpell", "targetTypes": ["castSpell"], "value": 1, "requiresSelection": false}, {"trigger": "onAnyCast", "triggerSide": "enemy", "effect": "drawCards", "target": "ownPlayer", "value": 1, "requiresSelection": false}]'::jsonb, null::text),
      -- Dūmų uždanga: ne reakcija, o burtas; Sprintas visiems saviems (buvo Selinimas)
      ('1c365c70-acd0-4112-a2f2-fc0545a4eba2'::uuid, '[{"trigger": "onPlay", "effect": "sprint", "target": "allOwnUnits", "value": 1, "requiresSelection": false}]'::jsonb, 'Burtas'),
      -- Meditacija: ne reakcija, o burtas; pilnas HP visiems saviems
      ('e609e560-0ed4-473c-b140-27103b482d68'::uuid, '[{"trigger": "onPlay", "effect": "heal", "target": "allOwnUnits", "value": 99, "requiresSelection": false}]'::jsonb, 'Burtas'),
      -- Kapinių žibintas: +2/+2 butent prikeltam padarui (buvo +1/+1, ATK kitam padarui)
      ('16e167d2-5353-4ff8-8492-c140c98f5386'::uuid, '[{"trigger": "onAnySummon", "triggerSide": "own", "triggerSummonSource": "graveyard", "effect": "buffAttack", "target": "ownUnit", "targetTypes": ["ownUnit"], "targetSummoned": true, "value": 2, "projectile": "healingGlow", "requiresSelection": false, "then": [{"trigger": "onAnySummon", "effect": "buffHealth", "target": "ownUnit", "targetSummoned": true, "sameTarget": true, "value": 2, "requiresSelection": false}]}]'::jsonb, null::text),
      -- Mergelė Liliana: kol lentoje: traukiant korta +1 HP visiems saviems (buvo tik istraukus pacia Liliana)
      ('7e27fcbb-1dcd-4b90-a843-fd58c849e126'::uuid, '[{"trigger": "onAnyDraw", "triggerSide": "own", "effect": "buffHealth", "target": "allOwnUnits", "value": 1, "projectile": "healingGlow", "requiresSelection": false}]'::jsonb, null::text),
      -- Išeinam: panaikina aktyvu lauka (reikia kliento 770)
      ('bf1e607c-d429-49ed-ac37-ed4961784ff2'::uuid, '[{"trigger": "onPlay", "effect": "destroy", "target": "activeField", "targetTypes": ["activeField"], "value": 1, "requiresSelection": false}]'::jsonb, null::text),
      -- Šventintas vanduo: +5 HP cempionui (reikia kliento 770); sinergijos +10 dalis dar nesukonfiguruota
      ('490fde61-3825-4e0e-a620-6c45751c2585'::uuid, '[{"trigger": "onPlay", "effect": "buffHealth", "target": "ownPlayer", "value": 5, "requiresSelection": false}]'::jsonb, null::text)
    ) as t(card_id, new_mappings, new_type)
  loop
    update public.cards c
       set gameplay = jsonb_set(jsonb_set(coalesce(c.gameplay, '{}'::jsonb), '{effectMappings}', r.new_mappings), '{needsEffectMapping}', 'false'::jsonb),
           card_type_id = coalesce((select ct.id from public.card_types ct where ct.name = r.new_type), c.card_type_id)
     where c.id = r.card_id;
    if found then n := n + 1; end if;
  end loop;
  raise notice 'Pataisyta kortų: % (tikėtasi 8)', n;
end $$;
