# supabase

The database: schema, access rules, and the business logic that used to live in
Rust.

## Running the tests

```sh
supabase/tests/run.sh
```

Needs Docker and nothing else — no Supabase project, no account, no CLI, and no
internet after the first image pull. It starts a throwaway Postgres, applies
every migration in order, and runs each test file. A few seconds end to end.

```sh
supabase/tests/mutate.sh
```

Checks that the tests can actually fail. It weakens one access rule at a time
and confirms the suite notices. This is not optional ceremony: the first
version of "a manager cannot create an account" passed just as happily with the
rule deleted, because it was failing on an unrelated permission before it ever
reached the policy. Run this after changing any policy.

## How the logic gets ported

The business rules came from ~16k lines of Rust. Reading them carefully is not
enough — the expensive failures here are silent, producing wrong maintenance
reminders rather than errors. So each ported rule is checked by running the
same inputs through both implementations and diffing the output, including the
message strings people read on screen.

`evaluate_due_status` was verified this way against seventeen cases. It caught
one thing nothing else would have: when a schedule is overdue by both date and
distance, the Rust original reports the odometer reason, because `max_by_key`
returns the last maximum. No desktop test covered it.

## The CLI

`npx supabase` may fail on Windows with `No matching Supabase CLI binary
package found for win32-x64`. That is an npm optional-dependency bug, not a
problem with the project. Install it directly instead:

```sh
winget install Supabase.CLI
```

Nothing in `tests/` needs the CLI. You only need it to push migrations to a
real project.

## Files

| Path | What it is |
| --- | --- |
| `migrations/` | Applied in filename order. The real schema. |
| `tests/run.sh` | Apply everything to a throwaway Postgres and test it |
| `tests/mutate.sh` | Prove the tests can fail |
| `tests/local_auth_stub.sql` | Enough of Supabase's auth surface to test policies locally. **Never applied to a real project** — note it is in `tests/`, not `migrations/`. |
| `tests/local_grants.sql` | Table grants Supabase would apply for you |
