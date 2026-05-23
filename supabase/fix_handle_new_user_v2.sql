-- ============================================================
-- FIX: handle_new_user — v2
-- Suderina username iš metadata + badge apdovanojimai
-- Paleisk Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username  TEXT;
  final_username TEXT;
  counter        INT := 0;
BEGIN
  -- 1. Naudok username iš metadata (registracijos formos laukas),
  --    jei nėra — išvesk iš el. pašto
  base_username := lower(coalesce(
    nullif(trim(NEW.raw_user_meta_data->>'username'), ''),
    split_part(NEW.email, '@', 1)
  ));

  -- 2. Palik tik leistinus simbolius, apribok iki 20 simbolių
  base_username := left(regexp_replace(base_username, '[^a-z0-9_]', '_', 'g'), 20);
  IF length(base_username) < 3 THEN base_username := 'user'; END IF;

  final_username := base_username;

  -- 3. Unikalumo užtikrinimas
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := left(base_username, 16) || '_' || counter::text;
  END LOOP;

  -- 4. Įrašyk profilį
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    final_username,
    coalesce(
      nullif(trim(NEW.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      final_username
    )
  )
  ON CONFLICT (id) DO NOTHING;

  -- 5. Apdovanok pirminius ženklelius (klaidos neblokuoja registracijos)
  BEGIN
    PERFORM public.try_award_badge(NEW.id, 'first_step');
    IF final_username IS NOT NULL AND length(final_username) >= 3 THEN
      PERFORM public.try_award_badge(NEW.id, 'name_recorded');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- badge klaida neblokuoja
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggeris (jei kažkodėl nėra)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Patikrinimas
SELECT
  proname,
  prosrc LIKE '%raw_user_meta_data%' AS reads_metadata
FROM pg_proc
WHERE proname = 'handle_new_user'
  AND pronamespace = 'public'::regnamespace;
