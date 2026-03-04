-- StudySync Production Database Schema
-- Run: node src/db/setup.js

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Soft-deleted users enum
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');

CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  email            TEXT UNIQUE NOT NULL CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  password_hash    TEXT NOT NULL,
  avatar           TEXT NOT NULL DEFAULT '🧑‍💻',
  institution      TEXT NOT NULL DEFAULT '' CHECK (char_length(institution) <= 120),
  education        TEXT NOT NULL DEFAULT '' CHECK (char_length(education) <= 120),
  bio              TEXT NOT NULL DEFAULT '' CHECK (char_length(bio) <= 300),
  subjects         JSONB NOT NULL DEFAULT '[]',
  goal             TEXT NOT NULL DEFAULT '',
  availability     JSONB NOT NULL DEFAULT '[]',
  modes            JSONB NOT NULL DEFAULT '[]',
  rating           DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  total_sessions   INT NOT NULL DEFAULT 0 CHECK (total_sessions >= 0),
  streak           INT NOT NULL DEFAULT 0 CHECK (streak >= 0),
  longest_streak   INT NOT NULL DEFAULT 0,
  total_hours      DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  profile_views    INT NOT NULL DEFAULT 0,
  response_time_mins INT,
  status           user_status NOT NULL DEFAULT 'active',
  last_active_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

-- Indexes on users
CREATE INDEX IF NOT EXISTS users_email_idx       ON users(email);
CREATE INDEX IF NOT EXISTS users_subjects_idx    ON users USING GIN(subjects);
CREATE INDEX IF NOT EXISTS users_goal_idx        ON users(goal);
CREATE INDEX IF NOT EXISTS users_status_idx      ON users(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS users_last_active_idx ON users(last_active_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Study Buddy Requests / Connections
CREATE TYPE buddy_status AS ENUM ('pending', 'accepted', 'declined', 'archived');

CREATE TABLE IF NOT EXISTS study_buddies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buddy_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         buddy_status NOT NULL DEFAULT 'pending',
  subject        TEXT NOT NULL DEFAULT '' CHECK (char_length(subject) <= 100),
  mode           TEXT NOT NULL DEFAULT 'discussion' CHECK (mode IN ('silent','discussion','doubt')),
  scheduled_when TEXT NOT NULL DEFAULT 'Flexible',
  duration       TEXT NOT NULL DEFAULT '2 hours',
  message        TEXT NOT NULL DEFAULT '' CHECK (char_length(message) <= 500),
  sessions_together INT NOT NULL DEFAULT 0,
  hours_together    DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  last_session_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, buddy_id),
  CONSTRAINT no_self_buddy CHECK (user_id <> buddy_id)
);

CREATE INDEX IF NOT EXISTS sb_user_idx       ON study_buddies(user_id);
CREATE INDEX IF NOT EXISTS sb_buddy_idx      ON study_buddies(buddy_id);
CREATE INDEX IF NOT EXISTS sb_status_idx     ON study_buddies(status);
CREATE INDEX IF NOT EXISTS sb_pair_idx       ON study_buddies(user_id, buddy_id);

CREATE OR REPLACE TRIGGER study_buddies_updated_at
  BEFORE UPDATE ON study_buddies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  reply_to    UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_message CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS msg_pair_idx ON messages(sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS msg_recv_idx ON messages(receiver_id, is_read) WHERE is_read = FALSE;

-- Sessions
CREATE TYPE session_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  subject      TEXT NOT NULL DEFAULT '' CHECK (char_length(subject) <= 100),
  topic        TEXT NOT NULL DEFAULT '' CHECK (char_length(topic) <= 200),
  agenda       TEXT NOT NULL DEFAULT '' CHECK (char_length(agenda) <= 500),
  mode         TEXT NOT NULL DEFAULT 'silent' CHECK (mode IN ('silent','discussion','doubt')),
  duration_hrs DECIMAL(4,2) NOT NULL DEFAULT 1.00 CHECK (duration_hrs > 0 AND duration_hrs <= 12),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status       session_status NOT NULL DEFAULT 'scheduled',
  partner_rating   SMALLINT CHECK (partner_rating BETWEEN 1 AND 5),
  session_notes    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sess_creator_idx   ON sessions(creator_id, status);
CREATE INDEX IF NOT EXISTS sess_partner_idx   ON sessions(partner_id, status);
CREATE INDEX IF NOT EXISTS sess_scheduled_idx ON sessions(scheduled_at) WHERE status = 'scheduled';

CREATE OR REPLACE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Kudos / Endorsements
CREATE TABLE IF NOT EXISTS kudos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giver_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kudo_type   TEXT NOT NULL CHECK (kudo_type IN ('great_explainer','always_on_time','well_prepared','patient_tutor','keeps_focus','motivating_partner')),
  session_id  UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(giver_id, receiver_id, kudo_type)
);

CREATE INDEX IF NOT EXISTS kudos_receiver_idx ON kudos(receiver_id);

-- Notifications
CREATE TYPE notif_priority AS ENUM ('urgent','high','medium','low');

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  icon       TEXT NOT NULL DEFAULT '🔔',
  title      TEXT NOT NULL CHECK (char_length(title) <= 100),
  body       TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 300),
  category   TEXT NOT NULL DEFAULT 'system' CHECK (category IN ('request','message','session','system','achievement')),
  priority   notif_priority NOT NULL DEFAULT 'medium',
  action_url TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notif_user_idx  ON notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS notif_read_idx  ON notifications(user_id) WHERE is_read = FALSE;

-- Profile views tracking
CREATE TABLE IF NOT EXISTS profile_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  viewed_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pv_viewed_idx ON profile_views(viewed_id, created_at);
