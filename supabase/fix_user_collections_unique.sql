-- ============================================================
-- FIX: user_collections unique (user_id, card_id) constraint
-- ------------------------------------------------------------
-- Simptomas: OwnedToggle upsert su on_conflict=user_id,card_id
-- grazina HTTP 400 (Postgres 42P10: "there is no unique or
-- exclusion constraint matching the ON CONFLICT specification").
-- schema.sql constraint'a turi, bet gyvoje DB jo nera.
--
-- Paleisti: Supabase Dashboard -> SQL Editor -> Run
-- Saugu paleisti kelis kartus (idempotentiskas).
-- ============================================================

-- 1. Jei spejo atsirasti dublikatu — sujungiame (paliekame didziausia quantity)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, card_id
           ORDER BY quantity DESC, updated_at DESC
         ) AS rn
  FROM public.user_collections
)
DELETE FROM public.user_collections
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Sukuriame unique constraint, jei jo nera
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'user_collections'
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname ORDER BY a.attname)
        FROM unnest(c.conkey) k
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k
      ) = ARRAY['card_id','user_id']::name[]
  ) THEN
    ALTER TABLE public.user_collections
      ADD CONSTRAINT user_collections_user_id_card_id_key UNIQUE (user_id, card_id);
    RAISE NOTICE 'Constraint sukurtas.';
  ELSE
    RAISE NOTICE 'Constraint jau egzistuoja — nieko nedaryta.';
  END IF;
END $$;

-- 3. Patikrinimas — turi grazinti 1 eilute
SELECT conname
FROM pg_constraint
WHERE conrelid = 'public.user_collections'::regclass
  AND contype = 'u';
