#!/usr/bin/env bash
# Apply migrations to the real Supabase project.
#
#   PGPASSWORD='...' supabase/push.sh                    # whatever is outstanding
#   PGPASSWORD='...' supabase/push.sh 20260803000018_*   # just these, always
#
# With no arguments this applies the files the project has not seen, and the
# ones whose contents have changed since it did. That second case is the normal
# way of working here: most migrations are `create or replace function`, so
# correcting one means editing its file and pushing again.
#
# Not every file survives that. The initial schema creates tables and cannot be
# re-run — if it ever needs to change, the change belongs in a new migration,
# which is the ordinary discipline anyway.
#
# The password is the database password from the project's dashboard, and it is
# deliberately not stored here. Never commit it.
#
# Needs Docker, and nothing else — this uses the postgres image's psql rather
# than asking you to install one.
#
# Note the host. The direct one, db.<ref>.supabase.co, has no A record on the
# free tier, so anything without IPv6 cannot reach it; the pooler is the way in.
# Session mode (5432) rather than transaction mode (6543), because migrations
# are DDL.
set -euo pipefail

project_ref="bwohklsdkinastyktcho"
host="aws-0-ap-southeast-1.pooler.supabase.com"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "${PGPASSWORD:-}" ]; then
  echo "Set PGPASSWORD to the project's database password." >&2
  exit 1
fi

psql() {
  docker run --rm -i -e PGPASSWORD postgres:16 \
    psql -h "$host" -p 5432 -U "postgres.$project_ref" -d postgres \
         -q -v ON_ERROR_STOP=1 "$@"
}

psql -c "
  create table if not exists public.schema_migrations (
    filename text primary key,
    checksum text not null,
    applied_at timestamptz not null default now()
  );
" >/dev/null

apply() {
  local migration="$1"
  local name checksum
  name="$(basename "$migration")"
  checksum="$(sha256sum "$migration" | cut -d' ' -f1)"

  echo "→ $name"
  psql < "$migration"
  psql -c "
    insert into public.schema_migrations (filename, checksum)
    values ('$name', '$checksum')
    on conflict (filename)
      do update set checksum = excluded.checksum, applied_at = now();
  " >/dev/null
}

# Named files are applied whether or not the project has seen them.
if [ "$#" -gt 0 ]; then
  for migration in "$@"; do
    apply "$migration"
  done

  echo "applied"
  exit 0
fi

applied="$(psql -t -A -F' ' -c 'select filename, checksum from public.schema_migrations;')"
outstanding=0

for migration in "$here"/migrations/*.sql; do
  name="$(basename "$migration")"
  checksum="$(sha256sum "$migration" | cut -d' ' -f1)"

  if printf '%s\n' "$applied" | grep -qxF "$name $checksum"; then
    continue
  fi

  apply "$migration"
  outstanding=$((outstanding + 1))
done

if [ "$outstanding" -eq 0 ]; then
  echo "nothing outstanding"
else
  echo "applied $outstanding"
fi
