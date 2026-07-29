-- ════════════════════════════════════════════════════════════════════════════
-- STARTER KALADŽIŲ APRAŠYMAI = TIKRAS TURINYS (audit #22).
-- Aprašymo „(30 kortų)" buvo užšaldytas literalas, o rodomas kiekis skaičiuojamas
-- gyvai iš starter_deck_cards — jie išsiskirdavo (pvz., 30 vs 34). Čia aprašymo
-- skaičius pergeneruojamas iš VIENOS tiesos (sum(quantity)), o ateities seed'ai
-- turėtų naudoti tą patį šaltinį (žr. 20260718_starter_decks_8.sql:29).
-- Idempotentiška — galima leisti kartotinai.
-- ════════════════════════════════════════════════════════════════════════════

update public.starter_decks sd
   set description = regexp_replace(sd.description, '\(\d+\s*kort\w*\)', '(' || c.n || ' kortų)')
  from (select starter_deck_id, sum(quantity)::int as n
          from public.starter_deck_cards group by starter_deck_id) c
 where c.starter_deck_id = sd.id
   and sd.description ~ '\(\d+\s*kort'
   and sd.description !~ ('\(' || c.n || ' kortų\)');
