-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM types
CREATE TYPE user_level AS ENUM ('candidate', 'verified', 'core');
CREATE TYPE match_status AS ENUM ('open', 'closed', 'completed');
CREATE TYPE participant_status AS ENUM ('pending', 'confirmed', 'cancelled', 'no_show');

-- profiles table (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  level user_level NOT NULL DEFAULT 'candidate',
  points INTEGER NOT NULL DEFAULT 0,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 10,
  status match_status NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- match_participants table
CREATE TABLE match_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status participant_status NOT NULL DEFAULT 'pending',
  notified_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, user_id)
);

-- point_history table
CREATE TABLE point_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  points_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX idx_match_participants_user_id ON match_participants(user_id);
CREATE INDEX idx_point_history_user_id ON point_history(user_id);
CREATE INDEX idx_matches_date ON matches(date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_profiles_points ON profiles(points DESC);
CREATE INDEX idx_profiles_level ON profiles(level);

-- ============================================================
-- RPC: increment_points (atomic point update)
-- ============================================================
CREATE OR REPLACE FUNCTION increment_points(user_id UUID, delta INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles SET points = points + delta WHERE id = user_id;
END;
$$;

-- ============================================================
-- RPC: auto_close_matches (call via cron or edge function)
-- Closes matches 24h before scheduled game time
-- ============================================================
CREATE OR REPLACE FUNCTION auto_close_matches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE matches
  SET status = 'closed'
  WHERE status = 'open'
    AND (date + time)::TIMESTAMPTZ <= (now() AT TIME ZONE 'UTC' + INTERVAL '24 hours');
END;
$$;

-- ============================================================
-- Trigger: auto-promote next player when someone cancels
-- ============================================================
CREATE OR REPLACE FUNCTION handle_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  confirmed_count INTEGER;
  max_p INTEGER;
  next_participant UUID;
BEGIN
  -- Only act on cancellations of previously confirmed spots
  IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    SELECT max_players INTO max_p FROM matches WHERE id = NEW.match_id;
    SELECT COUNT(*) INTO confirmed_count
    FROM match_participants
    WHERE match_id = NEW.match_id AND status = 'confirmed';

    IF confirmed_count < max_p THEN
      -- Find next pending participant: core > verified > candidate, then points DESC
      SELECT mp.id INTO next_participant
      FROM match_participants mp
      JOIN profiles p ON p.id = mp.user_id
      WHERE mp.match_id = NEW.match_id AND mp.status = 'pending'
      ORDER BY
        CASE p.level
          WHEN 'core' THEN 0
          WHEN 'verified' THEN 1
          ELSE 2
        END,
        p.points DESC
      LIMIT 1;

      IF next_participant IS NOT NULL THEN
        UPDATE match_participants
        SET status = 'confirmed', responded_at = now()
        WHERE id = next_participant;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_cancellation
  AFTER UPDATE ON match_participants
  FOR EACH ROW
  EXECUTE FUNCTION handle_cancellation();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;

-- profiles: anyone authenticated can read all profiles
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- profiles: users can insert their own profile (on first login)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- profiles: users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- profiles: core admins can update any profile
CREATE POLICY "profiles_update_core"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND level = 'core')
  );

-- matches: anyone authenticated can read
CREATE POLICY "matches_select_all"
  ON matches FOR SELECT
  USING (auth.role() = 'authenticated');

-- matches: only core can create matches
CREATE POLICY "matches_insert_core"
  ON matches FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND level = 'core')
  );

-- matches: only core can update matches
CREATE POLICY "matches_update_core"
  ON matches FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND level = 'core')
  );

-- match_participants: anyone authenticated can read
CREATE POLICY "participants_select_all"
  ON match_participants FOR SELECT
  USING (auth.role() = 'authenticated');

-- match_participants: users can register themselves
CREATE POLICY "participants_insert_own"
  ON match_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- match_participants: users can update their own participation
CREATE POLICY "participants_update_own"
  ON match_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- match_participants: core admins can update any participation
CREATE POLICY "participants_update_core"
  ON match_participants FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND level = 'core')
  );

-- point_history: users can read their own history
CREATE POLICY "points_select_own"
  ON point_history FOR SELECT
  USING (auth.uid() = user_id);

-- point_history: core admins can read all history
CREATE POLICY "points_select_core"
  ON point_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND level = 'core')
  );

-- point_history: core admins can insert (manual adjustments)
CREATE POLICY "points_insert_core"
  ON point_history FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND level = 'core')
  );

-- Grant function execution to authenticated users
GRANT EXECUTE ON FUNCTION increment_points(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_close_matches() TO authenticated;
