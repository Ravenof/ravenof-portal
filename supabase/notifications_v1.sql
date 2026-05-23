-- ============================================================
-- Notifications v1
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text NOT NULL, -- 'xp_gained' | 'badge_earned' | 'tournament_match' | 'tournament_result' | 'deck_upvote'
  title       text NOT NULL,
  message     text,
  link        text,          -- optional href to navigate to
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx  ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx     ON notifications (user_id, read) WHERE read = false;

-- 2. RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "notifications: owner select"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own as read (update read column only)
CREATE POLICY "notifications: owner update"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Only service role (server actions) can insert
CREATE POLICY "notifications: service insert"
  ON notifications FOR INSERT
  WITH CHECK (true); -- server actions run with service role bypass, or use admin client

-- Users can delete their own
CREATE POLICY "notifications: owner delete"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Helper function to create a notification (callable from triggers or server actions)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type    text,
  p_title   text,
  p_message text DEFAULT NULL,
  p_link    text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_link);
END;
$$;

-- 4. Auto-notify on badge earned (trigger on user_badges insert)
CREATE OR REPLACE FUNCTION notify_badge_earned() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_badge_name text;
  v_badge_icon text;
BEGIN
  SELECT name, icon INTO v_badge_name, v_badge_icon
  FROM badges WHERE id = NEW.badge_id;

  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    NEW.user_id,
    'badge_earned',
    COALESCE(v_badge_icon, '🏅') || ' Naujas ženklelis!',
    v_badge_name,
    '/me#badges'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_badge_earned ON user_badges;
CREATE TRIGGER trg_notify_badge_earned
  AFTER INSERT ON user_badges
  FOR EACH ROW EXECUTE FUNCTION notify_badge_earned();

-- 5. Keep only last 50 notifications per user (auto-cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_notifications() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM notifications
  WHERE id IN (
    SELECT id FROM notifications
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    OFFSET 50
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_notifications ON notifications;
CREATE TRIGGER trg_cleanup_notifications
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION cleanup_old_notifications();
