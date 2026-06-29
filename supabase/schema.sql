-- OR Unit Rental Tracker — Database Schema
-- Run this on a fresh Supabase project

-- ── principals (static, seeded) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS principals (
  id    text PRIMARY KEY,
  name  text NOT NULL,
  color text NOT NULL
);

-- ── units ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS units (
  id           text PRIMARY KEY,
  principal_id text NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  name         text NOT NULL,
  serial       text NOT NULL,
  label        text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- ── companions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companions (
  id         text PRIMARY KEY,
  name       text UNIQUE NOT NULL,
  role       text NOT NULL DEFAULT 'Field Specialist',
  created_at timestamptz DEFAULT now()
);

-- ── rentals ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rentals (
  id             text PRIMARY KEY,
  principal_id   text NOT NULL,
  unit_id        text NOT NULL,
  unit_label     text NOT NULL,
  serial         text NOT NULL,
  hospital_name  text NOT NULL,
  department     text NOT NULL DEFAULT 'OR',
  surgeon_name   text NOT NULL DEFAULT '',
  procedure      text NOT NULL DEFAULT '',
  rental_start   date NOT NULL,
  rental_end     date NOT NULL,
  status         text NOT NULL DEFAULT 'scheduled',
  companion_id   text NOT NULL,
  companion_name text NOT NULL,
  notes          text NOT NULL DEFAULT '',
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER rentals_updated_at
  BEFORE UPDATE ON rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ────────────────────────────────────────────
ALTER TABLE principals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE units       ENABLE ROW LEVEL SECURITY;
ALTER TABLE companions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals     ENABLE ROW LEVEL SECURITY;

-- Open anon read/write (internal tool — no user auth)
CREATE POLICY "anon_all_principals"  ON principals  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_units"       ON units       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_companions"  ON companions  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_rentals"     ON rentals     FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── Seed principals ───────────────────────────────────────────────
INSERT INTO principals (id, name, color) VALUES
  ('mitaka',               'Mitaka',                '#2563eb'),
  ('huidamed-hsd',         'Huidamed (HSD)',         '#059669'),
  ('huidamed-head-frame',  'Huidamed (Head Frame)',  '#10b981'),
  ('vivostat',             'VivoStat',               '#f97316'),
  ('vpix',                 'vPIx',                   '#0ea5e9'),
  ('alltion',              'Alltion',                '#dc2626')
ON CONFLICT (id) DO NOTHING;

-- ── Seed default units ────────────────────────────────────────────
INSERT INTO units (id, principal_id, name, serial, label) VALUES
  ('564745', 'mitaka', 'Mitaka MM80', '564745', 'Mitaka MM80 (564745)'),
  ('000369', 'mitaka', 'Mitaka MM90', '000369', 'Mitaka MM90 (000369)')
ON CONFLICT (id) DO NOTHING;

-- ── Seed default companions ───────────────────────────────────────
INSERT INTO companions (id, name, role) VALUES
  ('galih',  'Galih',  'Field Specialist'),
  ('farhan', 'Farhan', 'Field Specialist'),
  ('reza',   'Reza',   'Field Specialist')
ON CONFLICT (id) DO NOTHING;
