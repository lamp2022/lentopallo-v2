-- =============================================
-- Lentopallo Phase 1: Initial Schema
-- Applied via: Supabase Dashboard > SQL Editor
-- Date: 2026-04-04
-- =============================================

-- ===================
-- 1. TABLE CREATION
-- ===================

-- 1. CLUBS
CREATE TABLE clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. TEAMS
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  season text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. PLAYERS (belong to club, not team — DB-01, TEAM-01)
CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nr int NOT NULL CHECK (nr BETWEEN 1 AND 99),
  name text NOT NULL,
  role text CHECK (role IN ('normaali', 'passari', 'libero')) DEFAULT 'normaali',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. TEAM_PLAYERS join table (many-to-many, DB-01, TEAM-02)
CREATE TABLE team_players (
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  nr int NOT NULL CHECK (nr BETWEEN 1 AND 99),
  PRIMARY KEY (team_id, player_id),
  UNIQUE (team_id, nr)
);

-- 5. MATCHES
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  opponent text,
  date date,
  notes text,
  status text CHECK (status IN ('active', 'closed')) DEFAULT 'active',
  scorer_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. EVENTS (= eventLog from app)
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_nr int NOT NULL CHECK (set_nr BETWEEN 1 AND 5),
  player_id uuid NOT NULL REFERENCES players(id),
  delta int NOT NULL CHECK (delta IN (-1, 1)),
  type text CHECK (type IN ('serve', 'point')) DEFAULT 'serve',
  court_json jsonb,
  position int CHECK (position BETWEEN 1 AND 6),
  ts timestamptz NOT NULL DEFAULT now()
);

-- 7. PROFILES (linked to Supabase auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id uuid REFERENCES clubs(id),
  role text CHECK (role IN ('admin', 'coach', 'viewer')) DEFAULT 'viewer',
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===================================
-- 2. ENABLE ROW LEVEL SECURITY (DB-02)
-- ===================================

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ====================
-- 3. RLS POLICIES (DB-02)
-- ====================
-- Pattern: derive club_id via auth.uid() -> profiles -> club_id
-- SELECT: USING only
-- INSERT: WITH CHECK only
-- UPDATE: both USING and WITH CHECK

-- PROFILES: user sees and updates own profile
CREATE POLICY "users_read_own_profile"
ON profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "users_update_own_profile"
ON profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- CLUBS: members see their club
CREATE POLICY "members_read_club"
ON clubs FOR SELECT TO authenticated
USING (
  id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
);

-- TEAMS: members see club teams
CREATE POLICY "members_read_teams"
ON teams FOR SELECT TO authenticated
USING (
  club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "admins_insert_teams"
ON teams FOR INSERT TO authenticated
WITH CHECK (
  club_id IN (
    SELECT club_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admins_update_teams"
ON teams FOR UPDATE TO authenticated
USING (
  club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "admins_delete_teams"
ON teams FOR DELETE TO authenticated
USING (
  club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- PLAYERS: club members see players; coaches/admins manage
CREATE POLICY "members_read_players"
ON players FOR SELECT TO authenticated
USING (
  club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "coaches_insert_players"
ON players FOR INSERT TO authenticated
WITH CHECK (
  club_id IN (
    SELECT club_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach')
  )
);

CREATE POLICY "coaches_update_players"
ON players FOR UPDATE TO authenticated
USING (
  club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
)
WITH CHECK (
  club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
);

-- TEAM_PLAYERS: readable by club members
CREATE POLICY "members_read_team_players"
ON team_players FOR SELECT TO authenticated
USING (
  team_id IN (
    SELECT t.id FROM teams t
    JOIN profiles p ON p.club_id = t.club_id
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "coaches_insert_team_players"
ON team_players FOR INSERT TO authenticated
WITH CHECK (
  team_id IN (
    SELECT t.id FROM teams t
    JOIN profiles p ON p.club_id = t.club_id
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'coach')
  )
);

CREATE POLICY "coaches_delete_team_players"
ON team_players FOR DELETE TO authenticated
USING (
  team_id IN (
    SELECT t.id FROM teams t
    JOIN profiles p ON p.club_id = t.club_id
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'coach')
  )
);

-- MATCHES: club members read; coaches/admins write
CREATE POLICY "members_read_matches"
ON matches FOR SELECT TO authenticated
USING (
  team_id IN (
    SELECT t.id FROM teams t
    JOIN profiles p ON p.club_id = t.club_id
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "coaches_insert_matches"
ON matches FOR INSERT TO authenticated
WITH CHECK (
  team_id IN (
    SELECT t.id FROM teams t
    JOIN profiles p ON p.club_id = t.club_id
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'coach')
  )
);

CREATE POLICY "coaches_update_matches"
ON matches FOR UPDATE TO authenticated
USING (
  team_id IN (
    SELECT t.id FROM teams t
    JOIN profiles p ON p.club_id = t.club_id
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'coach')
  )
)
WITH CHECK (
  team_id IN (
    SELECT t.id FROM teams t
    JOIN profiles p ON p.club_id = t.club_id
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'coach')
  )
);

-- EVENTS: club members read; coaches/admins insert
CREATE POLICY "members_read_events"
ON events FOR SELECT TO authenticated
USING (
  match_id IN (
    SELECT m.id FROM matches m
    JOIN teams t ON t.id = m.team_id
    JOIN profiles p ON p.club_id = t.club_id
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "coaches_insert_events"
ON events FOR INSERT TO authenticated
WITH CHECK (
  match_id IN (
    SELECT m.id FROM matches m
    JOIN teams t ON t.id = m.team_id
    JOIN profiles p ON p.club_id = t.club_id
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'coach')
  )
);

-- ====================
-- 4. INDEXES (DB-04)
-- ====================

CREATE INDEX idx_events_match ON events(match_id);
CREATE INDEX idx_events_player ON events(player_id);
CREATE INDEX idx_players_club ON players(club_id);
CREATE INDEX idx_matches_team_date ON matches(team_id, date);
CREATE INDEX idx_teams_club ON teams(club_id);
CREATE INDEX idx_profiles_club ON profiles(club_id);

-- =================================
-- 5. AUTO-CREATE PROFILE ON SIGNUP
-- =================================
-- Trigger: auto-create profile row when new user signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
