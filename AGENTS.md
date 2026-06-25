# AGENTS.md — Codex Working Instructions for TOG 5 VMS

## Role

You are the coding agent for **TOG 5 VMS**, a local desktop Vehicle Maintenance System.

The goal is to implement the project incrementally, safely, and with minimal unnecessary rewrites. Prefer small, verifiable changes over broad speculative changes.

## Required Behavior

Before making code changes, read the relevant specification files in this repository, especially:

1. `00-project-brief.md`
2. `01-tech-stack-architecture.md`
3. `02-functional-specification.md`
4. `03-data-model.md`
5. `04-maintenance-template-engine.md`
6. `05-ui-ux-specification.md`
7. `06-business-rules.md`
8. `07-development-phases.md`
9. `08-testing-quality.md`
10. `live-update.md`

## Development Rules

1. Keep the app local-only. Do not add cloud sync, remote APIs, analytics, telemetry, or external data upload.
2. Use SQLite for persistent local data unless explicitly instructed otherwise.
3. Preserve user data and avoid destructive migrations.
4. Do not hard-code universal maintenance schedules when templates/rules are appropriate.
5. Do not make plate number required.
6. Vehicle name and vehicle picture are the primary identifiers.
7. Maintenance applicability must consider fuel type, transmission type, drivetrain, and selected vehicle features.
8. Diesel vehicles must not automatically receive spark plug maintenance.
9. Gasoline vehicles must not automatically receive diesel-only maintenance such as DEF/AdBlue service.
10. Full EVs must not automatically receive engine oil, fuel filter, spark plug, or exhaust maintenance.
11. Allow user override with warning when maintenance applicability is questionable.
12. Prefer clear, simple UI over dense technical screens.
13. Add validation for odometer, required fields, costs, dates, and fuel quantities.
14. When changing data structures, update related types, migrations, seed data, and tests.
15. After completing a phase or milestone, update `live-update.md`.

## Coding Style

- Use TypeScript for frontend code.
- Prefer explicit types for domain models.
- Keep business logic separate from UI components where possible.
- Use small reusable UI components.
- Use clear naming over abbreviations.
- Write readable validation errors.
- Add comments only where they clarify business logic.

## Testing Expectations

For each meaningful change:

1. Run available formatting/linting.
2. Run available unit tests.
3. Run build/typecheck where available.
4. Record results in `live-update.md`.

If tests are not yet configured, state that clearly in `live-update.md` and add a future task.

## Live Update Requirement

At the end of each task, update `live-update.md` with:

1. Date/time if available.
2. Phase or milestone worked on.
3. Files changed.
4. Summary of changes.
5. Commands run.
6. Test/build results.
7. Errors encountered.
8. Decisions made.
9. Remaining issues.
10. Suggested next step.

Do not remove useful history from `live-update.md`. Append new updates unless the user explicitly asks to consolidate it.

## Safety and Scope Control

Do not implement future/out-of-scope features unless requested, including:

- Cloud sync
- Online accounts
- GPS tracking
- Automatic manufacturer schedule lookup
- Receipt OCR
- Mobile app
- Network database
- Remote telemetry

When uncertain, prefer adding a TODO note or asking for confirmation instead of inventing a large architecture.
