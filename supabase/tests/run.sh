#!/usr/bin/env bash
# Apply the schema to a throwaway Postgres and run the tests against it.
#
# Needs Docker and nothing else — not the Supabase CLI, not a project, not an
# internet connection after the first run. Takes a few seconds.
#
#   supabase/tests/run.sh
#
# Each test file gets its own database, cloned from a template that already has
# the migrations applied. Sharing one database meant the rows a test left
# behind changed what the next test saw, which is how a passing suite starts
# lying to you.
set -euo pipefail

container="tog5-vms-test"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"

cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker run --rm -d --name "$container" -e POSTGRES_PASSWORD=test postgres:16 >/dev/null

for _ in $(seq 1 60); do
  docker exec "$container" pg_isready -U postgres -q 2>/dev/null && break
  sleep 1
done

psql_in() { docker exec -i "$container" psql -U postgres -d "$1" -q -v ON_ERROR_STOP=1; }

docker exec "$container" createdb -U postgres tog5_template

echo "→ auth stub"
psql_in tog5_template < "$here/local_auth_stub.sql"

for migration in "$root"/supabase/migrations/*.sql; do
  echo "→ $(basename "$migration")"
  psql_in tog5_template < "$migration"
done

echo "→ grants"
psql_in tog5_template < "$here/local_grants.sql"

failed=0
index=0
for test_file in "$here"/*.sql; do
  case "$(basename "$test_file")" in
    local_*) continue ;;
  esac

  index=$((index + 1))
  database="tog5_test_${index}"
  docker exec "$container" createdb -U postgres -T tog5_template "$database"

  echo "→ testing $(basename "$test_file")"
  if ! psql_in "$database" < "$test_file"; then
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "FAILED"
  exit 1
fi

echo "OK"
