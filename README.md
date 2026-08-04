# TOG 5 VMS

A Vehicle Maintenance System for the TOG 5 fleet: vehicles, fuel, trips,
maintenance schedules, service history, expenses, and alerts.

Several staff use it at once, from phones and computers, wherever they are.
Nothing of the client's has to stay switched on.

## Running it

```sh
npm install
cp .env.example .env.local     # fill in from the Supabase dashboard
npm run dev                    # http://127.0.0.1:1420
```

```sh
npm run lint
npm run typecheck
npm run test
npm run build

supabase/tests/run.sh          # the database, in a throwaway Postgres
supabase/tests/mutate.sh       # prove those tests can fail
```

Everything but `npm install` needs no account. The database suite needs Docker
and nothing else.

## How it fits together

There is no application server. The browser talks to Postgres directly, and
Postgres decides what it is allowed to do — access rules, business logic and
the consequences of a change all live there. `specs/01-tech-stack-architecture.md`
explains why, and it is the thing to read first.

```text
src/           React and TypeScript. Thin: every call goes to a view or a function.
supabase/      The real schema, its tests, and the tools to apply it.
src-tauri/     A window for the Windows app. Nothing else.
specs/         What this is meant to do and why.
docs/          Deploying it, and the user manual.
```

## Where things are documented

| Question | File |
| --- | --- |
| What is this for, and who uses it | `specs/00-project-brief.md` |
| How it is built, and why that way | `specs/01-tech-stack-architecture.md` |
| What each screen does | `specs/02-functional-specification.md` |
| Tables and fields | `specs/03-data-model.md` |
| How maintenance items pick vehicles | `specs/04-maintenance-template-engine.md` |
| Rules that must not be got wrong | `specs/06-business-rules.md` |
| The database, and testing it | `supabase/README.md` |
| Putting it online | `docs/deploying.md` |
| Using it | `docs/TOG5-VMS-user-manual-v0.4.0.md` |
| What happened, in order | `specs/live-update.md` |

## The idea that matters most

The **maintenance template engine**. Maintenance tasks adapt to vehicle type,
fuel type, transmission, drivetrain and features — a diesel truck must never be
told to change its spark plugs, and an EV must never be told to change its oil.
Getting that wrong produces confident, wrong advice rather than an error, which
is the worst failure this app has.

## History

Versions up to 0.3 were a single-seat Windows app with a local SQLite file.
Version 0.4 moved the records to hosted Postgres so several people could use
them at once. `main` still holds the desktop version if it is ever wanted.
