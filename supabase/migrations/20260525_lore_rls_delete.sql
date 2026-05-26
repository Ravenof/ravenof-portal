-- ── Lore tables: add DELETE + UPDATE RLS policies for admins ─────────────────
-- Run this if you can't delete lore entries from the admin panel.
-- The tables were created without explicit DELETE policies.

-- Helper: check if policy exists before creating
DO $$
DECLARE
  tables TEXT[] := ARRAY['lore_eras','lore_locations','lore_events','lore_characters','lore_artifacts'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP

    -- DELETE policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = t AND policyname = t || '_admin_delete'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin'')
        )',
        t || '_admin_delete', t
      );
    END IF;

    -- UPDATE policy (in case it's also missing)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = t AND policyname = t || '_admin_update'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin'')
        )',
        t || '_admin_update', t
      );
    END IF;

    -- INSERT policy (in case it's also missing)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = t AND policyname = t || '_admin_insert'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin'')
        )',
        t || '_admin_insert', t
      );
    END IF;

  END LOOP;
END $$;
