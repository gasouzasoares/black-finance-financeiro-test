-- Foundation only. Runtime credentials are provisioned separately, never in migrations.
CREATE SCHEMA IF NOT EXISTS app;
REVOKE ALL ON SCHEMA app FROM PUBLIC, anon, authenticated;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;
GRANT USAGE ON SCHEMA app TO app_runtime;
GRANT CONNECT ON DATABASE postgres TO app_runtime;
REVOKE CREATE ON SCHEMA public FROM app_runtime;
ALTER ROLE app_runtime SET search_path = app, pg_catalog;
ALTER ROLE app_runtime SET statement_timeout = '2s';
ALTER ROLE app_runtime SET lock_timeout = '500ms';
ALTER ROLE app_runtime SET idle_in_transaction_session_timeout = '10s';

-- Minimal identity needed by gate 0; full authorization belongs to section 1.
CREATE TABLE app.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  email text NOT NULL UNIQUE CHECK (email = lower(trim(email)) AND length(email) BETWEEN 3 AND 320),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 200),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE app.jobs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind text NOT NULL CHECK (length(kind) BETWEEN 1 AND 100),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  dedupe_key text UNIQUE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  attempt integer NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  CHECK (attempt <= max_attempts),
  CHECK ((status = 'running') = (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)),
  CHECK (status = 'running' OR (lease_token IS NULL AND lease_expires_at IS NULL)),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);
CREATE INDEX jobs_ready_idx ON app.jobs(available_at, id) WHERE status = 'queued';
CREATE INDEX jobs_expired_idx ON app.jobs(lease_expires_at, id) WHERE status = 'running';

GRANT SELECT ON app.users TO app_runtime;
GRANT SELECT, INSERT, UPDATE ON app.jobs TO app_runtime;
GRANT USAGE ON SEQUENCE app.jobs_id_seq TO app_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA app FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Private buckets with server-side size caps; no browser object policies.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('attachments','attachments',false,5242880),
       ('imports','imports',false,20971520),
       ('exports','exports',false,52428800),
       ('documents','documents',false,52428800)
ON CONFLICT (id) DO NOTHING;
