INSERT INTO app.jobs(kind, payload, dedupe_key)
VALUES ('noop', '{}', 'foundation-smoke') ON CONFLICT (dedupe_key) DO NOTHING;
