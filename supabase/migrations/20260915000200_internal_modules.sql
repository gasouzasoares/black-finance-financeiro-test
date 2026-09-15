-- Additive internal modules. Existing entries and immutable ledger remain authoritative.
CREATE TABLE app.invoices (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 account_id bigint NOT NULL REFERENCES app.accounts, party_id bigint NOT NULL REFERENCES app.parties,
 entry_id bigint UNIQUE REFERENCES app.entries, title text NOT NULL, issued_on date NOT NULL, due_on date NOT NULL,
 items jsonb NOT NULL CHECK(jsonb_typeof(items)='array'), discount_minor bigint NOT NULL CHECK(discount_minor>=0),
 total_minor bigint NOT NULL CHECK(total_minor>0), notes text NOT NULL DEFAULT '', category_id bigint REFERENCES app.categories,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','issued','cancelled')),
 version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), CHECK(due_on>=issued_on)
);
CREATE INDEX invoices_account_issued_idx ON app.invoices(account_id,issued_on DESC,id DESC);
CREATE INDEX invoices_account_due_idx ON app.invoices(account_id,due_on DESC,id DESC);
CREATE TABLE app.recurrences (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, account_id bigint NOT NULL REFERENCES app.accounts,
 template jsonb NOT NULL CHECK(jsonb_typeof(template)='object'), frequency text NOT NULL CHECK(frequency IN('weekly','monthly','quarterly','yearly')),
 start_on date NOT NULL,end_on date NOT NULL,next_index integer NOT NULL DEFAULT 0 CHECK(next_index>=0),
 status text NOT NULL DEFAULT 'active' CHECK(status IN('active','paused','ended')),version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),CHECK(end_on>=start_on)
);
CREATE INDEX recurrences_account_idx ON app.recurrences(account_id,id DESC);
CREATE TABLE app.recurrence_occurrences (
 recurrence_id bigint REFERENCES app.recurrences, due_on date NOT NULL, entry_id bigint NOT NULL UNIQUE REFERENCES app.entries,
 PRIMARY KEY(recurrence_id,due_on)
);
CREATE TABLE app.import_batches (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,account_id bigint NOT NULL REFERENCES app.accounts,
 kind text NOT NULL CHECK(kind IN('csv','ofx')),filename text NOT NULL,content_hash text NOT NULL,
 bank_identity text, status text NOT NULL DEFAULT 'review' CHECK(status IN('review','completed','cancelled')),
 created_by uuid NOT NULL REFERENCES app.users,created_at timestamptz NOT NULL DEFAULT now(),version integer NOT NULL DEFAULT 1,
 UNIQUE(account_id,kind,content_hash)
);
CREATE INDEX import_batches_account_idx ON app.import_batches(account_id,id DESC);
CREATE TABLE app.import_rows (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,batch_id bigint NOT NULL REFERENCES app.import_batches,
 line integer NOT NULL,payload jsonb NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','invalid','duplicate','imported','matched','ignored')),
 error text,entry_id bigint REFERENCES app.entries,settlement_id bigint REFERENCES app.settlements,version integer NOT NULL DEFAULT 1,
 UNIQUE(batch_id,line)
);
CREATE INDEX import_rows_entry_idx ON app.import_rows(entry_id) WHERE entry_id IS NOT NULL;
CREATE TABLE app.import_fingerprints (
 account_id bigint REFERENCES app.accounts,external_id text NOT NULL,row_id bigint NOT NULL UNIQUE REFERENCES app.import_rows,
 PRIMARY KEY(account_id,external_id)
);
CREATE UNIQUE INDEX reconciliation_settlement_uq ON app.import_rows(settlement_id) WHERE settlement_id IS NOT NULL;
GRANT SELECT,INSERT,UPDATE ON app.invoices,app.recurrences,app.import_batches,app.import_rows TO app_runtime;
GRANT SELECT,INSERT ON app.recurrence_occurrences,app.import_fingerprints TO app_runtime;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA app TO app_runtime;
REVOKE ALL ON app.invoices,app.recurrences,app.recurrence_occurrences,app.import_batches,app.import_rows,app.import_fingerprints FROM PUBLIC,anon,authenticated;
