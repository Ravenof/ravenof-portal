-- ═══════════════════════════════════════
-- Kortų permapinimas nuo NEGYVŲ trigerių (commit755, auditas 2026-11-11).
-- onDamageDealt / onDamageReceived / onHeal variklis niekada nešaudo, todėl
-- šių 11 kortų efektai neveikė. Permapinama į veikiančius:
--   • „po atakos"            → onAfterAttack
--   • „kol sužeistas +X ATK" → passiveAura.enrageAttack
--   • „kai ŠI korta gauna žalos / pagydoma" → onAnyDamage / onAnyHeal
--     + triggerOnSelfTarget (+ oncePerTurn) — reikia kliento 755+
-- Idempotentiška: kiekvienas UPDATE taikomas tik kol kortoje dar yra senas
-- trigeris. Kiti gameplay laukai (balsai, FX, auros) neliečiami.
-- ═══════════════════════════════════════
do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select * from (values
      -- Natsumi: „Po to kai atakuoja, grįžta į ranką."
      ('8089ba0f-bdcf-48ce-a803-faac7810bbb4'::uuid, 'onDamageDealt',
        '[{"trigger":"onAfterAttack","effect":"returnToHand","target":"selfUnit","requiresSelection":false}]'::jsonb, null::int),
      -- Azura Miklioji: „Atlikus puolimo veiksmą grįžta atgal į ranką."
      ('0664141e-faeb-4b1e-9218-f182f87d459f'::uuid, 'onDamageDealt',
        '[{"trigger":"onAfterAttack","effect":"returnToHand","target":"selfUnit","requiresSelection":false}]'::jsonb, null),
      -- Kazuma: „Po to, kai atakuoja, susinaikina."
      ('19065482-a3cf-447c-8dfa-caa96dbb885b'::uuid, 'onDamageDealt',
        '[{"trigger":"onAfterAttack","effect":"destroy","target":"selfUnit","requiresSelection":false}]'::jsonb, null),
      -- Vramaarx'as: „kai padaro žalos priešininko … +1" → po atakos +1 ATK (PATIKRINK tekstą)
      ('8094ea3f-0f90-43f7-bee8-149fcb48576b'::uuid, 'onDamageDealt',
        '[{"trigger":"onAfterAttack","effect":"buffAttack","target":"selfUnit","value":1,"requiresSelection":false}]'::jsonb, null),
      -- Chaoso tarnaitė: tekste tik „puola palankiai" — susinaikinimo mapping'as buvo šiukšlė
      ('af7feeda-25dd-4b0c-8f56-c2ed7d1f910c'::uuid, 'onDamageDealt', '[]'::jsonb, null),
      -- Vadas Vryhiok'as: „Tol, kol yra sužeistas, įgyja +3" → Įsiūtis 3
      ('fd3e8fe0-8cee-4d74-a1e8-2d8b42005560'::uuid, 'onDamageReceived', '[]'::jsonb, 3),
      -- Orm'as: „Tol kol yra sužeistas, įgija +1" → Įsiūtis 1
      ('16b66b62-b690-4e69-966b-21d144033989'::uuid, 'onDamageReceived', '[]'::jsonb, 1),
      -- Baltvilis Žiaurusis: „Kai šis [gauna žalos] įgauna +3" → kaskart gavus žalos +3 ATK (PATIKRINK tekstą)
      ('aa02bddf-742f-45a1-9fcf-c69f724b3898'::uuid, 'onDamageReceived',
        '[{"trigger":"onAnyDamage","triggerOnSelfTarget":true,"effect":"buffAttack","target":"selfUnit","value":3,"requiresSelection":false}]'::jsonb, null),
      -- Žėltma Šarmė: „Kai patiria žalą, suteikia pasirinktam draugiškam +1" → taikinys parenkamas automatiškai
      ('381c8243-4b18-4df6-86e4-41120faaf6a6'::uuid, 'onDamageReceived',
        '[{"trigger":"onAnyDamage","triggerOnSelfTarget":true,"effect":"buffAttack","target":"ownUnit","value":1,"requiresSelection":false}]'::jsonb, null),
      -- Ulvydas Kantrusis: „Kai šis patiria žalą – traukite kortą. Kartą per ėjimą."
      ('1bc79fc8-8149-4186-b550-aa18b8361208'::uuid, 'onDamageReceived',
        '[{"trigger":"onAnyDamage","triggerOnSelfTarget":true,"oncePerTurn":true,"effect":"drawCards","target":"self","value":1,"requiresSelection":false}]'::jsonb, null),
      -- Žemigijus Tolietis: „kai ant šio panaudojamas gydymas – traukite kortą. 1 kartą per ėjimą."
      ('51bae7e4-0288-4423-9697-118baa58b6fc'::uuid, 'onHeal',
        '[{"trigger":"onAnyHeal","triggerOnSelfTarget":true,"oncePerTurn":true,"effect":"drawCards","target":"self","value":1,"requiresSelection":false}]'::jsonb, null)
    ) as t(card_id, old_trigger, new_mappings, enrage)
  loop
    update public.cards c
       set gameplay = case
             when r.enrage is null then jsonb_set(c.gameplay, '{effectMappings}', r.new_mappings)
             else jsonb_set(
                    jsonb_set(c.gameplay, '{effectMappings}', r.new_mappings),
                    '{passiveAura}', coalesce(c.gameplay->'passiveAura', '{}'::jsonb) || jsonb_build_object('enrageAttack', r.enrage))
           end
     where c.id = r.card_id
       and jsonb_path_exists(c.gameplay, '$.effectMappings[*] ? (@.trigger == $t)', jsonb_build_object('t', r.old_trigger));
    if found then n := n + 1; end if;
  end loop;
  raise notice 'Permapinta kortų: %', n;
end $$;

-- Patikra: neturi likti nė vienos aktyvios kortos su negyvu trigeriu (tikimasi 0 eilučių).
select name from public.cards
 where status = 'active'
   and gameplay::text ~ '"trigger"\s*:\s*"(onDamageDealt|onDamageReceived|onHeal)"';
