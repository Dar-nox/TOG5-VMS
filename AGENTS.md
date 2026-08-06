# AGENTS.md — Working Instructions for TOG 5 VMS

## Role

You are the coding agent for **TOG 5 VMS**, a Vehicle Maintenance System the
client's staff reach from anywhere — phone or computer.

Implement incrementally and safely. Prefer small, verifiable changes over broad
speculative ones.

## Read First

1. `specs/00-project-brief.md`
2. `specs/01-tech-stack-architecture.md`
3. `specs/02-functional-specification.md`
4. `specs/03-data-model.md`
5. `specs/04-maintenance-template-engine.md`
6. `specs/05-ui-ux-specification.md`
7. `specs/06-business-rules.md`
8. `specs/07-development-phases.md`
9. `specs/08-testing-quality.md`
10. `specs/live-update.md`

`supabase/README.md` covers the database and how to test it.

## Development Rules

1. **Rules that must always hold go in Postgres, not the client.** Four clients
   talk to PostgREST directly with a key that ships inside the app. Anything
   enforced only in TypeScript is not enforced.
2. **Every table has row level security, including `deleted_at is null`.** A
   soft-deleted row must not exist as far as any client is concerned.
3. **Views must be `security_invoker = on`.** Without it a view runs as its
   owner and is a hole straight through the access rules.
4. **Anything that must happen as one piece is a database function.** Not a
   sequence of requests from the browser that can fail halfway.
5. **A change with consequences carries them.** A fuel log moves the vehicle's
   odometer; moving the odometer re-evaluates what is due. Do not leave that to
   whichever screen someone happens to open.
6. Grants and policies are different things, and Postgres checks the grant
   first. New tables need both.
7. Preserve user data. Avoid destructive migrations.
8. Do not hard-code universal maintenance schedules when templates and rules
   are appropriate.
9. Do not make plate number required.
10. Vehicle name and vehicle picture are the primary identifiers.
11. Maintenance applicability must consider fuel type, transmission type,
    drivetrain, and selected vehicle features.
12. Diesel vehicles must not automatically receive spark plug maintenance.
13. Gasoline vehicles must not automatically receive diesel-only maintenance
    such as DEF/AdBlue service.
14. Full EVs must not automatically receive engine oil, fuel filter, spark
    plug, or exhaust maintenance.
15. Allow user override with warning when applicability is questionable.
16. Prefer clear, simple UI over dense technical screens. Assume a phone.
    Everything the computer can do, the phone must do.
17. Validate odometer, required fields, costs, dates, and fuel quantities.
18. When changing data structures, update related types, migrations, seed data,
    and tests together.
19. After a phase or milestone, update `specs/live-update.md`.

## Interface

`specs/05-ui-ux-specification.md` is the authority. The short version:

1. **Every value comes from `src/styles/theme.css`.** No screen defines a
   colour, a size or a spacing value. The stylesheet this replaced had 64 hex
   colours, 28 font sizes and no custom properties, which is the entire
   explanation for how inconsistent it looked.
2. **Build from `src/components/ui/`.** If a primitive is missing, add it
   there. Do not write a local variant — the old interface had fifteen
   versions of one row.
3. **Container queries, never viewport breakpoints,** inside the content area.
   Viewport breakpoints on content that sits beside a sidebar is what made
   things overlap, including at ordinary Windows zoom levels.
4. **Never put an unbreakable string in a fixed-width box.** Amounts and
   odometer readings cannot wrap unless you let them.
5. **Confirm every destructive action** with `useConfirm()`, naming the record
   and saying it can be restored.
6. **Do not explain the app inside the app.** No paragraph under a heading, no
   essay in an empty state, no instructions naming buttons. If a screen needs
   explaining, fix the screen. Explanations of mechanical terms belong in
   `helpTerms.ts`, attached to the word.
7. **Measured values are set in the mono face** so figures line up.

## Online Only

Confirmed with the client: no offline mode, no queue, no sync.

Writes must **fail visibly**. Never accept something optimistically and lose it
quietly — a record that vanishes without a word is worse than one that was
never taken.

Do not cache fleet data in the service worker. The shell, yes; records, never.
A stale odometer reading with no way to tell it is stale is worse than a
spinner.

## Secrets

- The **publishable key** is meant to be public. It ships in the bundle. Row
  level security protects the data, not secrecy of the key.
- The **database password** is a real secret. It is only for pushing
  migrations, only ever in a shell, and never in a file.
- The client's backup file holds real fleet data and stays git-ignored.

## Coding Style

- TypeScript for frontend code, explicit types for domain models.
- Business logic out of components.
- Small reusable components, clear names over abbreviations.
- Readable validation errors, written for the person reading them.
- Comments explain *why*, especially where a rule is subtle or was got wrong
  before. Do not narrate what the code plainly says.

## Testing Expectations

For each meaningful change:

1. `supabase/tests/run.sh` if the database changed.
2. `supabase/tests/mutate.sh` if any access rule changed. Not optional — a
   passing test that cannot fail proves nothing.
3. `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
4. Record results in `specs/live-update.md`.

**When adding a test for a bug, check it fails without the fix.** Two bugs have
reached the client through tests that exercised the shape of a feature but not
the part that touched another table.

## Live Update Requirement

At the end of each task, append to `specs/live-update.md`: date, phase, files
changed, summary, commands run, results, errors, decisions, remaining issues,
next step.

Do not remove history. Append unless asked to consolidate.

## Scope Control

Out of scope unless asked:

- GPS tracking
- Automatic manufacturer schedule lookup
- Receipt OCR
- Offline mode or sync
- Anything requiring a paid plan

The client has ruled out paid subscriptions **for now**. That rules out paid
tiers, not vendors — check before letting it shape an architecture.

When uncertain, ask or leave a TODO rather than inventing a large architecture.
