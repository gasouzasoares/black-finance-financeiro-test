ALTER TABLE app.documents ADD COLUMN storage text NOT NULL DEFAULT 'database' CHECK(storage IN('database','drive'));
ALTER TABLE app.documents DROP CONSTRAINT documents_byte_size_check;
ALTER TABLE app.documents ADD CONSTRAINT documents_byte_size_check CHECK(byte_size BETWEEN 1 AND 20000000 AND (storage='drive' OR byte_size<=1500000));
CREATE TABLE app.drive_sources (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,connection_id bigint NOT NULL REFERENCES app.provider_connections,
 account_id bigint NOT NULL REFERENCES app.accounts,month date NOT NULL CHECK(extract(day FROM month)=1),
 root_id text NOT NULL,folder_id text NOT NULL,folder_name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(connection_id,folder_id)
);
CREATE INDEX drive_sources_account_month_idx ON app.drive_sources(account_id,month,id);
CREATE TABLE app.drive_intake_files (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,source_id bigint NOT NULL REFERENCES app.drive_sources,
 connection_id bigint NOT NULL REFERENCES app.provider_connections,external_id text NOT NULL,name text NOT NULL,mime text NOT NULL,
 byte_size integer NOT NULL,checksum text NOT NULL,drive_version text NOT NULL,
 status text NOT NULL DEFAULT 'new' CHECK(status IN('new','imported','ignored','changed','missing')),
 document_id bigint REFERENCES app.documents,batch_id bigint REFERENCES app.import_batches,
 reason text NOT NULL DEFAULT '',version integer NOT NULL DEFAULT 1,seen_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(connection_id,external_id),CHECK(NOT(document_id IS NOT NULL AND batch_id IS NOT NULL))
);
CREATE INDEX drive_files_source_status_idx ON app.drive_intake_files(source_id,status,id);
CREATE INDEX drive_files_document_idx ON app.drive_intake_files(document_id) WHERE document_id IS NOT NULL;
CREATE TABLE app.drive_closures (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,source_id bigint NOT NULL REFERENCES app.drive_sources,
 snapshot_hash text NOT NULL,plan jsonb NOT NULL,approved_by uuid NOT NULL REFERENCES app.users,
 approved_at timestamptz NOT NULL DEFAULT now(),UNIQUE(source_id,snapshot_hash)
);
CREATE TABLE app.drive_rename_jobs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,closure_id bigint NOT NULL REFERENCES app.drive_closures,
 file_id bigint NOT NULL REFERENCES app.drive_intake_files,old_name text NOT NULL,new_name text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','done','error')),
 error text NOT NULL DEFAULT '',updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(closure_id,file_id)
);
CREATE INDEX drive_jobs_closure_idx ON app.drive_rename_jobs(closure_id,id);
GRANT SELECT,INSERT,UPDATE ON app.drive_sources,app.drive_intake_files,app.drive_closures,app.drive_rename_jobs TO app_runtime;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA app TO app_runtime;
REVOKE ALL ON app.drive_sources,app.drive_intake_files,app.drive_closures,app.drive_rename_jobs FROM PUBLIC,anon,authenticated;
