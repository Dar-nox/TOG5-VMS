-- Empty the fleet so a backup can be loaded over the top.
--
--   PGPASSWORD='...' psql "<connection string>" -v ON_ERROR_STOP=1 -f supabase/reset_fleet.sql
--
-- WHY THIS EXISTS. `migrate_from_backup.py` only ever inserts — 1,702
-- statements, no delete and no truncate anywhere in them. Every id it writes is
-- a uuid5 derived from the desktop id, so loading a second backup on top of a
-- database that already holds one produces the *same* primary keys. The load
-- runs in one transaction, so the first collision aborts the lot and nothing
-- lands. Safe, but it means "we will just replace everything" needs a step that
-- did not exist.
--
-- WHAT IT KEEPS, and why each one:
--
--   profiles, auth.users        The accounts. Wiping them would lock everybody
--                               out of the app they are about to be handed.
--   notification_preferences    Whose digest is at what hour. Tied to accounts,
--   push_subscriptions          not to the fleet.
--   snapshots, data_exports     The record of backups taken. Deleting the
--                               history of your backups during a data
--                               replacement is precisely backwards.
--   settings                    The import writes these as UPDATEs against rows
--                               it expects to be there. Delete them and the
--                               client's own preferences — a 30-day warning
--                               window rather than 14 — silently do not apply.
--   maintenance_templates       Only the client's own are removed, the ones with
--     with a template_key       a null template_key. The seeded catalogue comes
--                               from migration 18 and the import deliberately
--                               skips it: 363 of their 398 templates are
--                               emitted, and the other 35 are these.
--
-- Not idempotent in any interesting sense — running it twice just leaves an
-- empty fleet twice. Running it at the wrong moment costs whatever has been
-- entered since the backup was taken, which on go-live day is nothing, and on
-- any other day could be everything. There is no confirmation prompt here
-- because psql is not the place for one; the safeguard is that you have to
-- type the filename.

begin;

-- The same reason the load disables them: these triggers exist to keep a live
-- fleet consistent, and a fleet being emptied is not one. The odometer trigger
-- in particular would fire for every fuel log removed from a vehicle that is
-- about to be removed anyway.
alter table public.vehicles disable trigger user;
alter table public.fuel_logs disable trigger user;
alter table public.trips disable trigger user;
alter table public.maintenance_schedules disable trigger user;
alter table public.vehicle_maintenance_settings disable trigger user;
alter table public.maintenance_logs disable trigger user;
alter table public.expenses disable trigger user;

delete from public.alerts;
delete from public.expenses;
delete from public.repair_records;
delete from public.maintenance_logs;
delete from public.maintenance_schedules;
delete from public.vehicle_maintenance_settings;

delete from public.trip_drivers;
delete from public.trip_passengers;
delete from public.trip_destinations;
delete from public.trips;

delete from public.fuel_logs;

-- vehicles.primary_photo_id points at vehicle_photos, and vehicle_photos
-- points back at vehicles. One of the two has to let go first.
update public.vehicles set primary_photo_id = null;
delete from public.vehicle_documents;
delete from public.vehicle_photos;
delete from public.vehicle_features;
delete from public.vehicles;

-- Theirs, not the seeded catalogue.
delete from public.maintenance_template_rules
where template_id in (
  select id from public.maintenance_templates where template_key is null
);
delete from public.maintenance_templates where template_key is null;

-- The load builds this and would collide with its own previous run.
drop table if exists public.id_map;

alter table public.vehicles enable trigger user;
alter table public.fuel_logs enable trigger user;
alter table public.trips enable trigger user;
alter table public.maintenance_schedules enable trigger user;
alter table public.vehicle_maintenance_settings enable trigger user;
alter table public.maintenance_logs enable trigger user;
alter table public.expenses enable trigger user;

commit;

-- Files are not touched. The photos and receipts from the previous load are
-- still in Storage and nothing points at them any more; `prune_orphan_files.py`
-- is what removes those, and it is worth running after the new upload rather
-- than before, so a half-finished import cannot delete what it is replacing.
select 'fleet emptied — accounts, settings and backup history kept' as result;
