-- ════════════════════════════════════════════════════════════════
-- FIX v2: Skip role column (already exists) — just functions + RLS + storage
-- ════════════════════════════════════════════════════════════════

-- 1. is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2. is_moderator()
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'event_moderator')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_moderator() TO authenticated;

-- 3. profiles RLS — admin can read all + update any profile
DROP POLICY IF EXISTS "Admin read all profiles"  ON public.profiles;
DROP POLICY IF EXISTS "Admin update any profile" ON public.profiles;
CREATE POLICY "Admin read all profiles"  ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin update any profile" ON public.profiles FOR UPDATE USING (public.is_admin());

-- 4. events RLS
DROP POLICY IF EXISTS "events admin read all" ON public.events;
DROP POLICY IF EXISTS "events admin insert"   ON public.events;
DROP POLICY IF EXISTS "events admin update"   ON public.events;
CREATE POLICY "events admin read all" ON public.events FOR SELECT  USING (public.is_moderator());
CREATE POLICY "events admin insert"   ON public.events FOR INSERT  WITH CHECK (public.is_moderator());
CREATE POLICY "events admin update"   ON public.events FOR UPDATE  USING (public.is_moderator());

-- 5. event_registrations RLS
DROP POLICY IF EXISTS "regs user read own"    ON public.event_registrations;
DROP POLICY IF EXISTS "regs user insert own"  ON public.event_registrations;
DROP POLICY IF EXISTS "regs user cancel own"  ON public.event_registrations;
DROP POLICY IF EXISTS "regs admin update all" ON public.event_registrations;
CREATE POLICY "regs user read own"    ON public.event_registrations FOR SELECT USING (user_id = auth.uid() OR public.is_moderator());
CREATE POLICY "regs user insert own"  ON public.event_registrations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "regs user cancel own"  ON public.event_registrations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "regs admin update all" ON public.event_registrations FOR UPDATE USING (public.is_moderator());

-- 6. cards RLS
DROP POLICY IF EXISTS "Admin manage cards" ON public.cards;
DROP POLICY IF EXISTS "Admin read cards"   ON public.cards;
CREATE POLICY "Admin read cards"   ON public.cards FOR SELECT USING (public.is_admin() OR status = 'active');
CREATE POLICY "Admin manage cards" ON public.cards FOR ALL    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7. avatars storage bucket + policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 2097152;

DROP POLICY IF EXISTS "avatars public read"     ON storage.objects;
DROP POLICY IF EXISTS "avatars user upload own" ON storage.objects;
DROP POLICY IF EXISTS "avatars user update own" ON storage.objects;
DROP POLICY IF EXISTS "avatars user delete own" ON storage.objects;
CREATE POLICY "avatars public read"     ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars user upload own" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars user update own" ON storage.objects FOR UPDATE USING   (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars user delete own" ON storage.objects FOR DELETE USING   (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- VERIFICATION
SELECT
  (SELECT COUNT(*) FROM information_schema.routines   WHERE routine_schema='public' AND routine_name='is_admin')                                       AS is_admin_fn,
  (SELECT COUNT(*) FROM information_schema.routines   WHERE routine_schema='public' AND routine_name='is_moderator')                                   AS is_moderator_fn,
  (SELECT COUNT(*) FROM pg_policies                   WHERE tablename='profiles'    AND policyname='Admin update any profile')                         AS admin_update_policy,
  (SELECT COUNT(*) FROM storage.buckets               WHERE id='avatars')                                                                              AS avatars_bucket;
