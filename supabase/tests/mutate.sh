#!/usr/bin/env bash
# Checks that the tests can actually fail.
#
# A test that passes for the wrong reason is worse than no test — it reports
# safety that is not there. This weakens one access rule at a time and confirms
# the suite notices. Every mutation below MUST be caught.
#
#   supabase/tests/mutate.sh
set -uo pipefail

container="tog5-vms-mutate"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"

cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT

# Each entry: a description, then SQL that makes the rules wrong.
mutations=(
  "anyone can create an account|drop policy \"owners can add accounts\" on public.profiles; create policy p on public.profiles for insert to authenticated with check (true);"
  "anyone can change settings|drop policy \"owners change settings\" on public.settings; drop policy \"owners add settings\" on public.settings; create policy p on public.settings for insert to authenticated with check (true);"
  "soft-deleted vehicles stay visible|drop policy \"signed in users read vehicles\" on public.vehicles; create policy p on public.vehicles for select to authenticated using (true);"
  "deactivated accounts keep working|create or replace function public.is_active_user() returns boolean language sql stable as \$\$ select auth.uid() is not null \$\$;"
  "the history can be rewritten|create policy p on public.audit_logs for update to authenticated using (true) with check (true);"
  "history can name somebody else|drop policy \"signed in users add to the history\" on public.audit_logs; create policy p on public.audit_logs for insert to authenticated with check (true);"
  "anyone signed out can read the fleet|drop policy \"signed in users read vehicles\" on public.vehicles; create policy p on public.vehicles for select to anon, authenticated using (true);"
  "signing up is the same as getting in|create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as \$\$ begin insert into public.profiles (id, display_name, role, status) values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), case when not exists (select 1 from public.profiles) then 'owner' else 'manager' end, 'active'); return new; end; \$\$;"
)

escaped=0
for mutation in "${mutations[@]}"; do
  description="${mutation%%|*}"
  sql="${mutation#*|}"

  cleanup
  docker run --rm -d --name "$container" -e POSTGRES_PASSWORD=test postgres:16 >/dev/null
  for _ in $(seq 1 60); do
    docker exec "$container" pg_isready -U postgres -q 2>/dev/null && break
    sleep 1
  done

  apply() { docker exec -i "$container" psql -U postgres -q -v ON_ERROR_STOP=1 < "$1" >/dev/null 2>&1; }
  apply "$here/local_auth_stub.sql"
  for migration in "$root"/supabase/migrations/*.sql; do apply "$migration"; done
  apply "$here/local_grants.sql"

  docker exec -i "$container" psql -U postgres -q -c "$sql" >/dev/null 2>&1

  if docker exec -i "$container" psql -U postgres -q -v ON_ERROR_STOP=1 \
      < "$here/rls.sql" >/dev/null 2>&1; then
    echo "ESCAPED  $description"
    escaped=1
  else
    echo "caught   $description"
  fi
done

if [ "$escaped" -ne 0 ]; then
  echo
  echo "Some weakened rules were not caught. Those tests prove nothing."
  exit 1
fi

echo
echo "every weakened rule was caught"
