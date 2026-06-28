-- ════════════════════════════════════════════════════════════════════════════
-- VRN kampanijos kortų gold_cost perskaičiavimas į tikrą žaidimo skalę.
-- Tikras framework: gold_cost = šimtai (100–900), ATK/HP = vienaženkliai.
-- Sukurta su 1–9 (Hearthstone) skale → ×100. ATK/HP NEKEIČIAMI (jau teisingi).
-- Idempotentiška: liečia tik 1–99 reikšmes (jau perskaičiuotos >99 nebepaveikiamos).
-- Čempionai/artefaktai su 0 lieka 0.
-- ════════════════════════════════════════════════════════════════════════════
update public.cards
  set gold_cost = gold_cost * 100
  where card_number like 'VRN-%'
    and gold_cost between 1 and 99;
