ALTER TABLE app.import_batches DROP CONSTRAINT import_batches_kind_check;
ALTER TABLE app.import_batches ADD CONSTRAINT import_batches_kind_check CHECK(kind IN('csv','ofx','xlsx'));
CREATE TABLE app.documents (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,account_id bigint NOT NULL REFERENCES app.accounts,
 filename text NOT NULL,mime text NOT NULL,content_hash text NOT NULL,original bytea NOT NULL,byte_size integer NOT NULL CHECK(byte_size BETWEEN 1 AND 1500000),
 extracted_text text NOT NULL DEFAULT '',extracted_fields jsonb NOT NULL DEFAULT '{}',fields jsonb NOT NULL DEFAULT '{}',provenance jsonb NOT NULL DEFAULT '{}',
 method text NOT NULL CHECK(method IN('pdf-text','ocr','manual')),duration_ms integer NOT NULL DEFAULT 0,cost_minor bigint NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','confirmed','rejected')),created_by uuid NOT NULL REFERENCES app.users,
 created_at timestamptz NOT NULL DEFAULT now(),version integer NOT NULL DEFAULT 1,UNIQUE(account_id,content_hash)
);
CREATE INDEX documents_account_id_idx ON app.documents(account_id,id DESC);
CREATE TABLE app.context_dimensions(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,kind text NOT NULL CHECK(kind IN('institution','program','area','activity','purpose','funding')),name text NOT NULL,description text NOT NULL DEFAULT '',status text NOT NULL DEFAULT 'active' CHECK(status IN('active','archived')),version integer NOT NULL DEFAULT 1);
CREATE INDEX context_dimensions_kind_name_idx ON app.context_dimensions(kind,lower(name),id);
CREATE TABLE app.party_context(party_id bigint PRIMARY KEY REFERENCES app.parties,emails jsonb NOT NULL DEFAULT '[]',affiliations jsonb NOT NULL DEFAULT '[]',notes text NOT NULL DEFAULT '',version integer NOT NULL DEFAULT 1);
CREATE TABLE app.entry_context(entry_id bigint PRIMARY KEY REFERENCES app.entries,justification text NOT NULL DEFAULT '',status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','confirmed','rejected')),reviewed_by uuid REFERENCES app.users,reviewed_at timestamptz,version integer NOT NULL DEFAULT 1);
CREATE TABLE app.entry_dimensions(entry_id bigint REFERENCES app.entries,dimension_id bigint REFERENCES app.context_dimensions,PRIMARY KEY(entry_id,dimension_id));
CREATE INDEX entry_dimensions_reverse_idx ON app.entry_dimensions(dimension_id,entry_id);
CREATE TABLE app.entry_contacts(entry_id bigint REFERENCES app.entries,party_id bigint REFERENCES app.parties,PRIMARY KEY(entry_id,party_id));
CREATE INDEX entry_contacts_reverse_idx ON app.entry_contacts(party_id,entry_id);
CREATE TABLE app.entry_documents(entry_id bigint REFERENCES app.entries,document_id bigint REFERENCES app.documents,PRIMARY KEY(entry_id,document_id));
CREATE INDEX entry_documents_reverse_idx ON app.entry_documents(document_id,entry_id);
CREATE TABLE app.entry_movements(entry_id bigint REFERENCES app.entries,movement_id bigint REFERENCES app.import_rows,PRIMARY KEY(entry_id,movement_id));
CREATE INDEX entry_movements_reverse_idx ON app.entry_movements(movement_id,entry_id);
CREATE TABLE app.provider_connections(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id uuid NOT NULL REFERENCES app.users,provider text NOT NULL DEFAULT 'google',tokens text NOT NULL,settings jsonb NOT NULL DEFAULT '{}',status text NOT NULL DEFAULT 'connected',version integer NOT NULL DEFAULT 1,UNIQUE(user_id,provider));
CREATE TABLE app.oauth_states(state_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES app.users,verifier text NOT NULL,expires_at timestamptz NOT NULL);
CREATE TABLE app.external_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,connection_id bigint NOT NULL REFERENCES app.provider_connections,calendar_id text NOT NULL,external_id text NOT NULL,title text NOT NULL,start_on date NOT NULL,end_on date NOT NULL,payload jsonb NOT NULL,seen_at timestamptz NOT NULL DEFAULT now(),UNIQUE(connection_id,calendar_id,external_id));
CREATE INDEX external_events_window_idx ON app.external_events(connection_id,start_on,id);
CREATE TABLE app.entry_events(entry_id bigint REFERENCES app.entries,event_id bigint REFERENCES app.external_events,PRIMARY KEY(entry_id,event_id));
CREATE INDEX entry_events_reverse_idx ON app.entry_events(event_id,entry_id);
CREATE TABLE app.document_copies(document_id bigint REFERENCES app.documents,connection_id bigint REFERENCES app.provider_connections,external_id text NOT NULL,url text NOT NULL,status text NOT NULL DEFAULT 'available',checked_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(document_id,connection_id));
GRANT SELECT,INSERT,UPDATE ON app.documents,app.context_dimensions,app.party_context,app.entry_context,app.provider_connections,app.external_events,app.document_copies TO app_runtime;
GRANT SELECT,INSERT,DELETE ON app.entry_dimensions,app.entry_contacts,app.entry_documents,app.entry_movements,app.entry_events,app.oauth_states TO app_runtime;
GRANT DELETE ON app.provider_connections TO app_runtime;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA app TO app_runtime;
REVOKE ALL ON app.documents,app.context_dimensions,app.party_context,app.entry_context,app.entry_dimensions,app.entry_contacts,app.entry_documents,app.entry_movements,app.entry_events,app.provider_connections,app.oauth_states,app.external_events,app.document_copies FROM PUBLIC,anon,authenticated;
