ALTER TABLE app.entry_context ADD COLUMN documentation_complete boolean NOT NULL DEFAULT false;
ALTER TABLE app.entry_context ADD COLUMN entry_version integer;
CREATE INDEX documents_match_amount_idx ON app.documents(account_id,(fields->>'total_minor')) WHERE status<>'rejected';
CREATE INDEX documents_match_date_idx ON app.documents(account_id,(fields->>'issued_on')) WHERE status<>'rejected';
CREATE INDEX import_rows_match_amount_idx ON app.import_rows((payload->>'amount_minor'),batch_id) WHERE status NOT IN('invalid','duplicate');
CREATE INDEX import_rows_match_date_idx ON app.import_rows((payload->>'date'),batch_id) WHERE status NOT IN('invalid','duplicate');
