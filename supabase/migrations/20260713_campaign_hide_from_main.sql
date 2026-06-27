-- ════════════════════════════════════════════════════════════════════════════
-- Kampanijos turinį PASLĖPTI iš pagrindinio žaidimo (lieka veikiantis kampanijoje).
--  • VRN kortos → status='hidden': nematomos main kolekcijoje / deck builderyje /
--    turguje (jie filtruoja status='active'), BET kampanijos story-kaladės kraunamos
--    per deck_cards (nefiltruoja status), tad mūšyje vis tiek veikia.
--  • [Kampanija] kalados → visibility='private': dingsta iš community (filtruoja
--    'public'). Iš savo deck-pickerių (PvE/PvP/ranginė/mano kalados) jas išskiria
--    kodas (.not name ilike '[Kampanija]%'). Kampanija jas naudoja per storyDeckId.
-- Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

update public.cards
  set status = 'hidden'
  where card_number like 'VRN-%' and status = 'active';

update public.decks
  set visibility = 'private'
  where name like '[Kampanija]%' and visibility <> 'private';
