#!/usr/bin/env bash
# Apply migrations to the real Supabase project.
#
#   PGPASSWORD='...' supabase/push.sh                    # everything, in order
#   PGPASSWORD='...' supabase/push.sh 20260803000018_*   # just these
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

if [ "$#" -gt 0 ]; then
  files=("$@")
else
  files=("$here"/migrations/*.sql)
fi

for migration in "${files[@]}"; do
  echo "→ $(basename "$migration")"
  docker run --rm -i -e PGPASSWORD postgres:16 \
    psql -h "$host" -p 5432 -U "postgres.$project_ref" -d postgres \
         -q -v ON_ERROR_STOP=1 < "$migration"
done

echo "applied"
