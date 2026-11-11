-- ═══════════════════════════════════════
-- 14 kortų be gameplay konfigūracijos sumapinimas (commit762, auditas 2026-11-11).
-- Naudoja naujus 762 pasyvus (attackWithShield, attackKeepsStealth, noRetaliationDamage,
-- summonAlias, passiveAura.auraZmkRemapFrom/To, efektą refreshAttacks) ir esamus efektus.
-- Senas klientas naujų laukų tiesiog nemato (korta veikia kaip iki šiol – be efekto),
-- tad paleisti saugu bet kada. Idempotentiška (jsonb suliejimas).
-- Kiti gameplay laukai (balsai, FX, sinergijos) neliečiami.
-- ═══════════════════════════════════════
do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select * from (values
      -- „Puldamas visada turi Magišką skydą."
      ('689299e8', 'Fururuno',  '{"attackWithShield":true}'::jsonb, null::jsonb),
      ('ce59c2f6', 'Isodera',   '{"attackWithShield":true}'::jsonb, null),
      ('76236cb5', 'Uramami',   '{"attackWithShield":true}'::jsonb, null),
      -- „Pasyvus: puldamas visada turi Sėlinimą."
      ('6cdcbbbe', 'Keihito',   '{"attackKeepsStealth":true}'::jsonb, null),
      ('27c6f521', 'Toguchi',   '{"attackKeepsStealth":true}'::jsonb, null),
      -- „Kai atakuoja, negauna atgalinės žalos."
      ('9af31015', 'Harpija',   '{"noRetaliationDamage":true}'::jsonb, null),
      -- „Gali būti iškviestas vietoje Zombis."
      ('7c2bf955', 'Skausmo šauklys',     '{"summonAlias":"Zombis"}'::jsonb, null),
      ('455baf7b', 'Zordakas Brutalusis', '{"summonAlias":"Zombis"}'::jsonb, null),
      -- „tavo žalos modifikatoriai +2 veikia kaip x2" / „-1 veikia kaip +1" / „visi įgyja +1"
      ('aebc231d', 'Tomis Svyids',       '{}'::jsonb, '{"auraZmkRemapFrom":"+2","auraZmkRemapTo":"x2"}'::jsonb),
      ('c0d20a89', 'Griausminė Grikštė', '{}'::jsonb, '{"auraZmkRemapFrom":"-1","auraZmkRemapTo":"+1"}'::jsonb),
      ('2a79f62a', 'Jungos plunksna',    '{}'::jsonb, '{"auraScope":"friendly","auraZmkDelta":1}'::jsonb),
      -- „Atakuodamas padaro Sušaldymą."
      ('dfe98792', 'Oriko', '{"effectMappings":[{"trigger":"onAttack","effect":"freeze","target":"enemyUnit","useAttackTarget":true,"requiresSelection":false}]}'::jsonb, null),
      -- „Visi draugiški, kurie šį ėjimą puolė, gali pulti dar kartą. Už kiekvieną paveiktą traukite po kortą."
      ('54cd742c', 'Apgaulingos taktikos', '{"effectMappings":[{"trigger":"onPlay","effect":"refreshAttacks","target":"self","value":1,"requiresSelection":false}]}'::jsonb, null),
      -- „Po to, kai atakuoja padarą su Pasišaipymu, gali atakuoti dar kartą. Vieną kartą per žaidimą atgimsta su 1 HP."
      -- PATIKRINK: papildoma ataka duodama, kol priešas TURI padarą su Pasišaipymu (artimiausias esamas atitikmuo).
      ('41b12fec', 'Yoruichi Paslaptingoji', '{"extraAttacks":{"ifEnemyTaunt":1},"effectMappings":[{"trigger":"onDeath","effect":"resurrectSelf","target":"selfUnit","resurrectHp1":true,"oncePerGame":true,"requiresSelection":false}]}'::jsonb, null)
    ) as t(id_prefix, card_name, patch, aura)
  loop
    update public.cards c
       set gameplay = (
             case when r.aura is null then coalesce(c.gameplay, '{}'::jsonb) || r.patch
                  else jsonb_set(coalesce(c.gameplay, '{}'::jsonb) || r.patch, '{passiveAura}',
                                 coalesce(c.gameplay->'passiveAura', '{}'::jsonb) || r.aura)
             end
           ) || '{"needsEffectMapping":false}'::jsonb
     where c.id::text like r.id_prefix || '%' and c.name = r.card_name;
    if found then n := n + 1; else raise notice 'NERASTA: % (%)', r.card_name, r.id_prefix; end if;
  end loop;
  raise notice 'Sumapinta kortų: % iš 14', n;
end $$;
