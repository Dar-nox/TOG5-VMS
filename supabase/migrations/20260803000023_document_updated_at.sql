-- vehicle_documents was missing the column its own trigger writes to.
--
-- The initial schema gave every tracked table a set_updated_at trigger, and
-- gave this one created_by, updated_by and created_at — but no updated_at. So
-- the trigger fired on a column that was not there and the update failed with
-- `record "new" has no field "updated_at"`.
--
-- Nothing read the column, which is why it went unnoticed: the failure only
-- appears when a document row is *updated*, and the only thing that updates
-- one is attaching a receipt to the record it belongs to. Saving a fuel log or
-- a service record with a receipt therefore failed outright, while saving
-- either without one worked perfectly.
--
-- The column is added rather than the trigger dropped. Every other table here
-- tracks when it last changed, this one already tracks *who* changed it, and
-- knowing who without knowing when is the less useful half.

alter table public.vehicle_documents
  add column if not exists updated_at timestamptz not null default now();

-- Existing rows get their creation time rather than the moment of this
-- migration, which would claim every receipt was touched today.
update public.vehicle_documents
set updated_at = created_at
where updated_at > created_at;
