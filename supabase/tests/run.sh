#!/usr/bin/env bash
# Apply the schema to a throwaway Postgres and run the tests against it.
#
# Needs Docker and nothing else — not the Supabase CLI, not a project, not an
# internet connection after the first run. Takes a few seconds.
#
#   supabase/tests/run.sh
set -euo pipefail

container="tog5-vms-test"
port="55432"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"

cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker run --rm -d --name "$container" \
  -e POSTGRES_PASSWORD=test -p "$port:5432" postgres:16 >/dev/null

for _ in $(seq 1 60); do
  docker exec "$container" pg_isready -U postgres -q 2>/dev/null && break
  sleep 1
done

run() { docker exec -i "$container" psql -U postgres -q -v ON_ERROR_STOP=1 < "$1"; }

echo "→ auth stub"
run "$here/local_auth_stub.sql"

for migration in "$root"/supabase/migrations/*.sql; do
  echo "→ $(basename "$migration")"
  run "$migration"
done

echo "→ grants"
run "$here/local_grants.sql"

failed=0
for test_file in "$here"/*.sql; do
  case "$(basename "$test_file")" in
    local_*) continue ;;
  esac
  echo "→ testing $(basename "$test_file")"
  if ! docker exec -i "$container" psql -U postgres -q -v ON_ERROR_STOP=1 < "$test_file"; then
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "FAILED"
  exit 1
fi

echo "OK"
