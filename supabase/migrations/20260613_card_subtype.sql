-- ── Padarų potipiai (ZOMBIE / GOBLIN / DEMON ir pan.) ────────────────────────
-- Naudojama efektų targeting'e (targetSubtype) ir buffuose pagal potipį.
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS subtype TEXT;
