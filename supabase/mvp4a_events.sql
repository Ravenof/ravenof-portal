-- ════════════════════════════════════════════════════════
-- MVP 4A: Events + Event Registrations
-- Paleisk vienu bloku Supabase SQL Editor
-- Jokio DROP TABLE / TRUNCATE
-- ════════════════════════════════════════════════════════

-- 1. events table
CREATE TABLE IF NOT EXISTS public.events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  location    text,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz,
  capacity    int,
  status      text        NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','published','cancelled','completed')),
  created_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. event_registrations table
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     text        NOT NULL DEFAULT 'registered'
             CHECK (status IN ('registered','cancelled','attended','no_show')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- 3. updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS event_registrations_updated_at ON public.event_registrations;
CREATE TRIGGER event_registrations_updated_at
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Enable RLS
ALTER TABLE public.events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- 5. RLS: events
DROP POLICY IF EXISTS "events public read published" ON public.events;
DROP POLICY IF EXISTS "events admin read all"        ON public.events;
DROP POLICY IF EXISTS "events admin insert"          ON public.events;
DROP POLICY IF EXISTS "events admin update"          ON public.events;

CREATE POLICY "events public read published"
  ON public.events FOR SELECT
  USING (status = 'published');

CREATE POLICY "events admin read all"
  ON public.events FOR SELECT
  USING (public.is_admin());

CREATE POLICY "events admin insert"
  ON public.events FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "events admin update"
  ON public.events FOR UPDATE
  USING (public.is_admin());

-- 6. RLS: event_registrations
DROP POLICY IF EXISTS "regs user read own"    ON public.event_registrations;
DROP POLICY IF EXISTS "regs user insert own"  ON public.event_registrations;
DROP POLICY IF EXISTS "regs user cancel own"  ON public.event_registrations;
DROP POLICY IF EXISTS "regs admin update all" ON public.event_registrations;

CREATE POLICY "regs user read own"
  ON public.event_registrations FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "regs user insert own"
  ON public.event_registrations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "regs user cancel own"
  ON public.event_registrations FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "regs admin update all"
  ON public.event_registrations FOR UPDATE
  USING (public.is_admin());

-- 7. Verify
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') AS events_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'event_registrations' AND table_schema = 'public') AS regs_table,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'events') AS events_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'event_registrations') AS regs_policies;
