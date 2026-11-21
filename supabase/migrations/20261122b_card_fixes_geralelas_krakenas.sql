-- ════════════════════════════════════════════════════════════════════════════
-- Kortų pataisos, 2 dalis (2026-11-22, po v825; kliento keisti nereikia).
-- Ataskaita: project doc claude/kortu-tekstu-ir-mapinimo-patikra-2026-11-22.md
-- Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

-- • Geralel'as – „įmaišykite 1 prakeiksmą": buvo du triggerCurse mapinimai (įmaišydavo 2) → paliekamas vienas
--   (tas, kuris aiškiai nurodo priešininko kaladę).
update public.cards
   set gameplay = jsonb_set(gameplay, '{effectMappings}', jsonb_build_array(gameplay->'effectMappings'->1))
 where card_number = 'demonu-orda/Demonu_Orda_25'
   and jsonb_typeof(gameplay->'effectMappings') = 'array'
   and jsonb_array_length(gameplay->'effectMappings') = 2
   and gameplay->'effectMappings'->0->>'effect' = 'triggerCurse'
   and gameplay->'effectMappings'->1->>'effect' = 'triggerCurse';

-- • Krakenas – mapinimas teisingas (čiuptuvus kviečia kiekvieno savo ėjimo pabaigoje), taisomas tik tekstas.
update public.cards set effect_text = 'Kiekvieno savo ėjimo pabaigoje iš kaladės, rankos arba kapinyno iškviečia 2 „Krakeno čiuptuvus“.'
 where card_number = 'BASE-008' and name = 'Krakenas';
update public.content_translations t
   set value = 'At the end of each of your turns, summons 2 “Kraken Tentacle” from the deck, hand or graveyard.'
  from public.cards c
 where c.card_number = 'BASE-008' and c.name = 'Krakenas'
   and t.owner_type = 'card' and t.owner_id = c.id::text and t.locale = 'en' and t.field = 'effect_text'
   and t.value like 'Battlecry:%';
