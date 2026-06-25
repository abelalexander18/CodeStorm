-- CampusFlow Database Schema
-- Paste this into the Supabase SQL Editor and click "Run"
-- RLS is intentionally DISABLED on all tables for demo purposes

-- ============================================================
-- TABLE: students
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  branch      text NOT NULL,
  year        int  NOT NULL,
  subjects    text NOT NULL,         -- comma-separated list
  phone       text NOT NULL UNIQUE,  -- E.164, used as login key
  email       text NOT NULL UNIQUE,
  created_at  timestamptz DEFAULT now()
);

-- Disable RLS so the secret key can read/write freely
ALTER TABLE students DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone          text NOT NULL REFERENCES students(phone) ON DELETE CASCADE,
  title          text NOT NULL,
  subject        text NOT NULL,
  deadline       timestamptz NOT NULL,
  days_remaining int  NOT NULL,
  ai_study_plan  jsonb NOT NULL DEFAULT '[]',  -- array of { date, topic }
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS tasks_phone_idx ON tasks(phone);

-- ============================================================
-- TABLE: attendance
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone            text NOT NULL REFERENCES students(phone) ON DELETE CASCADE,
  subject          text NOT NULL,
  classes_held     int  NOT NULL,
  classes_attended int  NOT NULL,
  current_percent  numeric(5,2) NOT NULL,
  classes_needed   int  NOT NULL,
  risk_level       text NOT NULL CHECK (risk_level IN ('AT_RISK', 'SAFE')),
  ai_advice        text NOT NULL,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS attendance_phone_idx ON attendance(phone);

-- Unique constraint enables upsert (ON CONFLICT) per student per subject
ALTER TABLE attendance ADD CONSTRAINT attendance_phone_subject_unique UNIQUE (phone, subject);
