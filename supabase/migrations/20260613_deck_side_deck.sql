-- ── Prakeiksmų side deck palaikymas ──────────────────────────────────────────
-- Demonų prakeiksmai NĖRA pagrindinėje kaladėje – jie sudaro atskirą side deck'ą.
-- Saugomi toje pačioje deck_cards lentelėje su žyma is_side_deck = true.

ALTER TABLE public.deck_cards
  ADD COLUMN IF NOT EXISTS is_side_deck BOOLEAN NOT NULL DEFAULT false;

-- Greitesnė užklausa atskiriant pagrindinę kaladę nuo side deck'o.
CREATE INDEX IF NOT EXISTS deck_cards_side_idx
  ON public.deck_cards (deck_id, is_side_deck);
