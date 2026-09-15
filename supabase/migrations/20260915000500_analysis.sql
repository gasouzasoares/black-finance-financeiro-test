CREATE TABLE app.analysis_proposals (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 row_id bigint NOT NULL REFERENCES app.import_rows,
 actor_id uuid NOT NULL REFERENCES app.users,
 draft jsonb NOT NULL, sources jsonb NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','approved','rejected')),
 entry_id bigint REFERENCES app.entries,version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(row_id,actor_id)
);
CREATE INDEX analysis_actor_status_idx ON app.analysis_proposals(actor_id,status,id DESC);
CREATE TABLE app.classification_rules (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id uuid NOT NULL REFERENCES app.users,
 account_id bigint NOT NULL REFERENCES app.accounts,direction text NOT NULL CHECK(direction IN('income','expense')),
 term text NOT NULL CHECK(length(term)>=4),defaults jsonb NOT NULL,
 active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(actor_id,account_id,direction,term)
);
CREATE TABLE app.planned_activities (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id uuid NOT NULL REFERENCES app.users,
 title text NOT NULL,event_on date NOT NULL,description text NOT NULL DEFAULT '',
 participants jsonb NOT NULL DEFAULT '[]',dimension_ids jsonb NOT NULL DEFAULT '[]',
 status text NOT NULL DEFAULT 'active' CHECK(status IN('active','cancelled')),version integer NOT NULL DEFAULT 1
);
CREATE INDEX planned_activities_actor_date_idx ON app.planned_activities(actor_id,event_on,id);
CREATE TABLE app.entry_planned_activities(entry_id bigint REFERENCES app.entries,activity_id bigint REFERENCES app.planned_activities,PRIMARY KEY(entry_id,activity_id));
CREATE INDEX entry_planned_activity_reverse_idx ON app.entry_planned_activities(activity_id,entry_id);
CREATE TABLE app.accounting_mappings(category_id bigint PRIMARY KEY REFERENCES app.categories,debit_code text NOT NULL DEFAULT '',credit_code text NOT NULL DEFAULT '',notes text NOT NULL DEFAULT '',version integer NOT NULL DEFAULT 1);
GRANT SELECT,INSERT,UPDATE ON app.analysis_proposals,app.classification_rules,app.planned_activities,app.accounting_mappings TO app_runtime;
GRANT SELECT,INSERT ON app.entry_planned_activities TO app_runtime;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA app TO app_runtime;
REVOKE ALL ON app.analysis_proposals,app.classification_rules,app.planned_activities,app.entry_planned_activities,app.accounting_mappings FROM PUBLIC,anon,authenticated;

GRANT DELETE ON app.analysis_proposals TO app_runtime;
