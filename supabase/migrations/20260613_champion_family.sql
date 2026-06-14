-- ── Čempionų šeima + fazė ────────────────────────────────────────────────────
-- champion_group = šeimos raktas (visos 3 fazės kortos dalinasi tuo pačiu).
-- champion_phase = kuri fazė (1/2/3) yra ši korta.
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS champion_group TEXT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS champion_phase INT;
