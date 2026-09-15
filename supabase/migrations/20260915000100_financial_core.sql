-- Single organization. Forward-only migration; never resets existing data.
CREATE TABLE app.organization_profile (
 id smallint PRIMARY KEY DEFAULT 1 CHECK(id=1), name text NOT NULL DEFAULT 'Black Finance',
 timezone text NOT NULL DEFAULT 'America/Sao_Paulo' CHECK(timezone='America/Sao_Paulo'), version integer NOT NULL DEFAULT 1 CHECK(version>0)
);
INSERT INTO app.organization_profile(id) VALUES(1);
CREATE TABLE app.legal_entities (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200),
 cnpj text NOT NULL UNIQUE CHECK(cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$'), status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app.accounts (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, legal_entity_id bigint NOT NULL REFERENCES app.legal_entities,
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200), kind text NOT NULL CHECK(kind IN ('bank','cash','other')),
 currency text NOT NULL DEFAULT 'BRL' CHECK(currency='BRL'), opening_on date NOT NULL, is_default boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')), version integer NOT NULL DEFAULT 1 CHECK(version>0)
);
CREATE UNIQUE INDEX accounts_default_uq ON app.accounts(legal_entity_id) WHERE is_default AND status='active';
CREATE INDEX accounts_legal_entity_idx ON app.accounts(legal_entity_id,id);
CREATE TABLE app.access_policies (
 user_id uuid PRIMARY KEY REFERENCES app.users, is_owner boolean NOT NULL DEFAULT false,
 permissions text[] NOT NULL DEFAULT '{}', legal_entity_ids bigint[] NOT NULL DEFAULT '{}', account_ids bigint[] NOT NULL DEFAULT '{}',
 directions text[] NOT NULL DEFAULT '{}', groups text[] NOT NULL DEFAULT '{}', version integer NOT NULL DEFAULT 1 CHECK(version>0)
);
CREATE TABLE app.invitations (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, email text NOT NULL CHECK(email=lower(trim(email))),
 display_name text NOT NULL, policy jsonb NOT NULL CHECK(jsonb_typeof(policy)='object'),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days', status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','revoked')),
 created_by uuid NOT NULL REFERENCES app.users, accepted_by uuid REFERENCES app.users, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX invitations_pending_email_uq ON app.invitations(email) WHERE status='pending';
CREATE TABLE app.audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid NOT NULL REFERENCES app.users,
 resource_type text NOT NULL, resource_id text NOT NULL, action text NOT NULL, before_data jsonb, after_data jsonb,
 request_id text NOT NULL, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX audit_resource_idx ON app.audit_events(resource_type,resource_id,occurred_at DESC,id DESC);
CREATE TABLE app.parties (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200),
 document text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')), version integer NOT NULL DEFAULT 1 CHECK(version>0)
);
CREATE TABLE app.categories (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200),
 direction text NOT NULL CHECK(direction IN ('income','expense')), reporting_group text NOT NULL CHECK(reporting_group IN ('revenue','deductions','fixed','variable','people','taxes','unclassified')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')), version integer NOT NULL DEFAULT 1 CHECK(version>0)
);
CREATE TABLE app.cost_centers (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')), version integer NOT NULL DEFAULT 1 CHECK(version>0)
);
CREATE TABLE app.labels (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')), version integer NOT NULL DEFAULT 1 CHECK(version>0)
);
CREATE UNIQUE INDEX labels_name_uq ON app.labels(lower(trim(name)));
CREATE TABLE app.entries (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, account_id bigint NOT NULL REFERENCES app.accounts,
 party_id bigint REFERENCES app.parties, direction text NOT NULL CHECK(direction IN ('income','expense')),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 240), notes text NOT NULL DEFAULT '' CHECK(length(notes)<=5000),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), currency text NOT NULL DEFAULT 'BRL' CHECK(currency='BRL'),
 due_on date NOT NULL, competence_on date NOT NULL, status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','settled','cancelled')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX entries_period_idx ON app.entries(due_on DESC,id DESC);
CREATE INDEX entries_account_period_idx ON app.entries(account_id,due_on DESC,id DESC);
CREATE TABLE app.entry_allocations (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, entry_id bigint NOT NULL REFERENCES app.entries,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), settled_minor bigint NOT NULL DEFAULT 0 CHECK(settled_minor>=0 AND settled_minor<=amount_minor),
 due_on date NOT NULL, competence_on date NOT NULL, category_id bigint REFERENCES app.categories, cost_center_id bigint REFERENCES app.cost_centers,
 reporting_group text NOT NULL, cancelled boolean NOT NULL DEFAULT false
);
CREATE INDEX allocations_open_due_idx ON app.entry_allocations(due_on,id) WHERE settled_minor<amount_minor AND NOT cancelled;
CREATE INDEX allocations_entry_idx ON app.entry_allocations(entry_id,id);
CREATE INDEX allocations_competence_idx ON app.entry_allocations(competence_on,id);
CREATE TABLE app.entry_labels(entry_id bigint REFERENCES app.entries, label_id bigint REFERENCES app.labels, PRIMARY KEY(entry_id,label_id));
CREATE TABLE app.settlements (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, entry_id bigint NOT NULL REFERENCES app.entries, account_id bigint NOT NULL REFERENCES app.accounts,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), settled_on date NOT NULL, reversal_of bigint UNIQUE REFERENCES app.settlements,
 reason text NOT NULL DEFAULT '', actor_id uuid NOT NULL REFERENCES app.users, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX settlements_entry_idx ON app.settlements(entry_id,id);
CREATE TABLE app.settlement_items (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, settlement_id bigint NOT NULL REFERENCES app.settlements,
 allocation_id bigint NOT NULL REFERENCES app.entry_allocations, amount_minor bigint NOT NULL CHECK(amount_minor>0), UNIQUE(settlement_id,allocation_id)
);
CREATE TABLE app.transfers (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, source_account_id bigint NOT NULL REFERENCES app.accounts,
 destination_account_id bigint NOT NULL REFERENCES app.accounts, amount_minor bigint NOT NULL CHECK(amount_minor>0), effective_on date NOT NULL,
 scope text NOT NULL CHECK(scope IN ('intra_cnpj','intercompany')), status text NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','reversed')),
 reason text NOT NULL DEFAULT '', version integer NOT NULL DEFAULT 1 CHECK(version>0), CHECK(source_account_id<>destination_account_id)
);
CREATE TABLE app.cash_postings (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, account_id bigint NOT NULL REFERENCES app.accounts,
 effective_on date NOT NULL, signed_minor bigint NOT NULL CHECK(signed_minor<>0), kind text NOT NULL CHECK(kind IN ('opening','settlement','transfer','reversal')),
 settlement_item_id bigint UNIQUE REFERENCES app.settlement_items, transfer_id bigint REFERENCES app.transfers,
 reversal_of bigint UNIQUE REFERENCES app.cash_postings, description text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((kind='reversal')=(reversal_of IS NOT NULL))
);
CREATE UNIQUE INDEX cash_opening_uq ON app.cash_postings(account_id) WHERE kind='opening';
CREATE INDEX cash_account_date_idx ON app.cash_postings(account_id,effective_on DESC,id DESC);
CREATE TABLE app.account_balances(account_id bigint PRIMARY KEY REFERENCES app.accounts,balance_minor bigint NOT NULL DEFAULT 0);
CREATE TABLE app.cash_daily(account_id bigint REFERENCES app.accounts,effective_on date NOT NULL,net_minor bigint NOT NULL,PRIMARY KEY(account_id,effective_on));
CREATE TABLE app.idempotency_records (
 actor_id uuid REFERENCES app.users, key text NOT NULL CHECK(length(key) BETWEEN 8 AND 128), payload_hash text NOT NULL,
 response jsonb, expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days', PRIMARY KEY(actor_id,key)
);
CREATE TABLE app.outbox (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, kind text NOT NULL, payload jsonb NOT NULL,
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','completed','failed')), available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz
);
CREATE INDEX outbox_ready_idx ON app.outbox(available_at,id) WHERE state='queued';
CREATE INDEX outbox_lease_idx ON app.outbox(lease_until,id) WHERE state='running';

-- Enforce aggregate allocation totals at commit, including updates and deletes.
CREATE FUNCTION app.check_allocation_total() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app AS $$
DECLARE eid bigint; expected bigint; actual numeric; n bigint;
BEGIN
 IF TG_TABLE_NAME='entries' THEN eid=NEW.id; ELSE eid=COALESCE(NEW.entry_id,OLD.entry_id); END IF;
 SELECT amount_minor INTO expected FROM app.entries WHERE id=eid;
 SELECT count(*),coalesce(sum(amount_minor),0) INTO n,actual FROM app.entry_allocations WHERE entry_id=eid;
 IF expected IS NOT NULL AND (n=0 OR actual<>expected) THEN RAISE EXCEPTION 'ALLOCATION_TOTAL_MISMATCH' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER entries_total AFTER INSERT OR UPDATE ON app.entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_allocation_total();
CREATE CONSTRAINT TRIGGER allocations_total AFTER INSERT OR UPDATE OR DELETE ON app.entry_allocations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.check_allocation_total();
-- The ledger and audit are append-only even for runtime SQL.
CREATE FUNCTION app.reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'APPEND_ONLY' USING ERRCODE='23514'; END $$;
CREATE TRIGGER cash_immutable BEFORE UPDATE OR DELETE ON app.cash_postings FOR EACH ROW EXECUTE FUNCTION app.reject_mutation();
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON app.audit_events FOR EACH ROW EXECUTE FUNCTION app.reject_mutation();

GRANT SELECT,INSERT,UPDATE ON app.organization_profile,app.legal_entities,app.accounts,app.access_policies,app.invitations,app.parties,app.categories,app.cost_centers,app.labels,app.entries,app.entry_allocations,app.transfers,app.account_balances,app.cash_daily,app.idempotency_records,app.outbox TO app_runtime;
GRANT INSERT,UPDATE ON app.users TO app_runtime;
GRANT SELECT,INSERT ON app.audit_events,app.settlements,app.settlement_items,app.cash_postings,app.entry_labels TO app_runtime;
GRANT DELETE ON app.entry_allocations,app.entry_labels,app.idempotency_records TO app_runtime;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA app TO app_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA app FROM PUBLIC,anon,authenticated;
