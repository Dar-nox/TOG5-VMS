#!/usr/bin/env bash
# Load a desktop backup into a throwaway Postgres and report what arrived.
#
#   supabase/rehearse_migration.sh <backup-dir>
#
# Nothing here touches the real project. It builds the schema from scratch,
# runs the generated load, and then counts what came out against what went in —
# because "the load did not error" and "the fleet is intact" are different
# claims, and only the second one matters.
set -euo pipefail

backup="${1:?usage: rehearse_migration.sh <backup-dir>}"
container="tog5-vms-rehearsal"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/.." && pwd)"
work="$(mktemp -d)"

cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; rm -rf "$work"; }
trap cleanup EXIT
docker rm -f "$container" >/dev/null 2>&1 || true

docker run --rm -d --name "$container" -e POSTGRES_PASSWORD=test postgres:16 >/dev/null
for _ in $(seq 1 60); do
  docker exec "$container" pg_isready -U postgres -q 2>/dev/null && break
  sleep 1
done

psql() { docker exec -i "$container" psql -U postgres -d rehearsal -q -v ON_ERROR_STOP=1 "$@"; }

docker exec "$container" createdb -U postgres rehearsal

echo "→ schema"
psql < "$here/tests/local_auth_stub.sql" >/dev/null
for migration in "$root"/supabase/migrations/*.sql; do
  psql < "$migration" >/dev/null
done
psql < "$here/tests/local_grants.sql" >/dev/null

# An owner to credit the imported records to, standing in for the real one.
owner="940425c3-a470-4fcd-a1c2-7a0cceb831c3"
psql -c "insert into auth.users (id, email, raw_user_meta_data)
         values ('$owner', 'owner@tog5vms.local', '{\"display_name\": \"Fleet Owner\"}'::jsonb);" >/dev/null

echo "→ generating"
python "$here/migrate_from_backup.py" "$backup" --owner "$owner" \
  --files "$work/files.tsv" > "$work/load.sql" 2> "$work/counts.txt"

echo "→ loading"
psql < "$work/load.sql" >/dev/null

echo
echo "read from the backup:"
sed 's/^/  /' "$work/counts.txt"

echo
echo "landed in Postgres:"
psql -t -A -F'  ' -c "
  select 'vehicles', count(*) from public.vehicles union all
  select 'vehicle_photos', count(*) from public.vehicle_photos union all
  select 'vehicle_documents', count(*) from public.vehicle_documents union all
  select 'maintenance_templates (theirs)', count(*) from public.maintenance_templates
    where template_key is null union all
  select 'vehicle_maintenance_settings', count(*) from public.vehicle_maintenance_settings union all
  select 'maintenance_schedules', count(*) from public.maintenance_schedules union all
  select 'maintenance_logs', count(*) from public.maintenance_logs union all
  select 'fuel_logs', count(*) from public.fuel_logs union all
  select 'trips', count(*) from public.trips union all
  select 'trip_drivers', count(*) from public.trip_drivers union all
  select 'trip_passengers', count(*) from public.trip_passengers union all
  select 'trip_destinations', count(*) from public.trip_destinations union all
  select 'alerts', count(*) from public.alerts
  ;" | sed 's/^/  /'

echo
echo "checks:"
psql -t -A -c "
  select case when count(*) = 0 then 'ok    every reminder found its item'
              else 'FAIL  ' || count(*) || ' reminders lost their item' end
  from public.vehicle_maintenance_settings where template_id is null;

  select case when count(*) = 0 then 'ok    every schedule found its item'
              else 'FAIL  ' || count(*) || ' schedules lost their item' end
  from public.maintenance_schedules where template_id is null;

  select case when count(*) = 0 then 'ok    every vehicle photo points at its vehicle'
              else 'FAIL  ' || count(*) || ' photos are orphaned' end
  from public.vehicle_photos p
  where p.vehicle_id is not null
    and not exists (select 1 from public.vehicles v where v.id = p.vehicle_id);

  select case when count(*) = 0 then 'ok    every file path names a bucket'
              else 'FAIL  ' || count(*) || ' files have no bucket' end
  from (
    select storage_path from public.vehicle_photos
    union all select storage_path from public.vehicle_documents
  ) f
  where storage_path is null or split_part(storage_path, '/', 1) not in
    ('vehicle-photos', 'fuel-receipts', 'maintenance-receipts', 'maintenance-photos');

  select case when count(*) = 0 then 'ok    no vehicle lost its profile picture'
              else 'FAIL  ' || count(*) || ' vehicles lost their picture' end
  from public.vehicles where primary_photo_id is null and deleted_at is null;

  select case when count(*) = 2 then 'ok    both dismissed alerts carried over'
              else 'FAIL  ' || count(*) || ' dismissed alerts, expected 2' end
  from public.alerts where status = 'dismissed';

  select case when value = '30' then 'ok    their own due-soon default kept (30 days)'
              else 'FAIL  due-soon default is ' || value end
  from public.settings where key = 'default_due_soon_days';

  select case when count(*) = 0 then 'ok    every trip kept its driver'
              else 'FAIL  ' || count(*) || ' trips have no driver' end
  from public.trips t
  where not exists (select 1 from public.trip_drivers d where d.trip_id = t.id);
" | sed 's/^/  /'

echo
echo "dates, as they landed:"
psql -t -A -F'  ' -c "
  select 'a vehicle was created', to_char(min(created_at) at time zone 'Asia/Manila',
    'YYYY-MM-DD HH24:MI') || ' Manila' from public.vehicles union all
  select 'a trip left at', to_char(min(departure_time) at time zone 'Asia/Manila',
    'YYYY-MM-DD HH24:MI') || ' Manila' from public.trips union all
  select 'fuel was bought at', to_char(min(fuel_date) at time zone 'Asia/Manila',
    'YYYY-MM-DD HH24:MI') || ' Manila' from public.fuel_logs union all
  select 'service was done on', min(completed_date)::text from public.maintenance_logs
  ;" | sed 's/^/  /'

echo
echo "what the fleet looks like afterwards:"
psql -t -A -F'  ' -c "
  select v.vehicle_name, v.current_odometer::bigint || ' km',
         count(*) filter (where s.deleted_at is null) || ' reminders',
         coalesce(count(a.id) filter (where a.status = 'active'), 0) || ' alerts'
  from public.vehicles v
  left join public.maintenance_schedules s on s.vehicle_id = v.id
  left join public.alerts a on a.vehicle_id = v.id and a.status = 'active'
  group by v.id, v.vehicle_name, v.current_odometer
  order by v.vehicle_name;" | sed 's/^/  /'

echo
echo "what is due, and why nothing is shouting:"
psql -t -A -F'  ' -c "
  select 'schedules by status', string_agg(status || '=' || c, ' ')
  from (select status, count(*) c from public.maintenance_schedules group by 1) s;

  select 'due, silenced by a dismissal', count(*)
  from public.maintenance_schedules m
  join public.alerts a on a.maintenance_schedule_id = m.id and a.status = 'dismissed'
  where m.status in ('due_soon', 'due_today', 'overdue');

  select 'due, with no alert at all', count(*)
  from public.maintenance_schedules m
  where m.status in ('due_soon', 'due_today', 'overdue')
    and not exists (select 1 from public.alerts a
                    where a.maintenance_schedule_id = m.id
                      and a.status in ('active', 'dismissed'));

  select 'nearest due date', coalesce(min(next_due_date)::text, 'none')
  from public.maintenance_schedules where status <> 'disabled';

  select 'nearest due odometer gap',
    coalesce(min(m.next_due_odometer - v.current_odometer)::bigint || ' km', 'none')
  from public.maintenance_schedules m join public.vehicles v on v.id = m.vehicle_id
  where m.status <> 'disabled' and m.next_due_odometer is not null;
" | sed 's/^/  /'

echo
echo "files to upload:"
wc -l < "$work/files.tsv" | sed 's/^/  /'
cp "$work/files.tsv" "$root/migration-files.tsv"
echo "  list written to migration-files.tsv"
