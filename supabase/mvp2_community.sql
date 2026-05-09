-- ═══════════════════════════════════════════════════════════════
-- MVP 2: Community Decks migration
-- Run in Supabase SQL Editor (in order)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Add score column to decks ──────────────────────────────
ALTER TABLE decks ADD COLUMN IF NOT EXISTS score INT NOT NULL DEFAULT 0;

-- ── 2. profiles table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url   TEXT,
  bio          TEXT,
  is_public    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (is_public = true OR auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ── 3. Auto-create profile on new user registration ──────────
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_uname TEXT;
  final_uname TEXT;
  counter INT := 0;
BEGIN
  base_uname  := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9_]', '_', 'g'));
  final_uname := base_uname;

  WHILE EXISTS(SELECT 1 FROM profiles WHERE username = final_uname) LOOP
    counter     := counter + 1;
    final_uname := base_uname || '_' || counter;
  END LOOP;

  INSERT INTO profiles (id, username, display_name)
  VALUES (NEW.id, final_uname, final_uname)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();

-- ── 4. Back-fill profiles for existing users ─────────────────
INSERT INTO profiles (id, username, display_name)
SELECT
  u.id,
  lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9_]', '_', 'g')),
  lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9_]', '_', 'g'))
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

-- ── 5. deck_votes table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS deck_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id    UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  vote       SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, deck_id)
);

ALTER TABLE deck_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votes_select_all"  ON deck_votes FOR SELECT USING (true);
CREATE POLICY "votes_insert_own"  ON deck_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_update_own"  ON deck_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "votes_delete_own"  ON deck_votes FOR DELETE USING (auth.uid() = user_id);

-- ── 6. Trigger: keep decks.score in sync ─────────────────────
CREATE OR REPLACE FUNCTION update_deck_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE decks SET score = score + NEW.vote WHERE id = NEW.deck_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE decks SET score = score - OLD.vote + NEW.vote WHERE id = NEW.deck_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE decks SET score = score - OLD.vote WHERE id = OLD.deck_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_deck_vote_change ON deck_votes;
CREATE TRIGGER on_deck_vote_change
  AFTER INSERT OR UPDATE OR DELETE ON deck_votes
  FOR EACH ROW EXECUTE FUNCTION update_deck_score();

-- ── 7. RLS: allow reading public decks ───────────────────────
-- Drop old "owner only" select policy if it exists, add combined one
-- (safe to run even if policies don't exist yet)
DROP POLICY IF EXISTS "decks_select_public" ON decks;
CREATE POLICY "decks_select_public" ON decks
  FOR SELECT USING (
    visibility = 'public'
    OR auth.uid() = user_id
  );
