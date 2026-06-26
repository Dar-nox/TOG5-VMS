# live-update.md — TOG 5 VMS Progress Tracker

This file is the bridge between ChatGPT Chat and Codex.

Use this file to track what Codex has done, what worked, what failed, and what should happen next. After every phase, milestone, or meaningful prompt, update this file. Then send the updated file back to ChatGPT Chat for prompt optimization, troubleshooting, and next-step planning.

Do not delete useful history. Append new updates unless the user explicitly asks to consolidate.

---

# Current Project Snapshot

## Project Name

TOG 5 VMS — Vehicle Maintenance System

## Current Version Target

v1 local desktop MVP.

## Current Stack Decision

- Desktop framework: Tauri
- Frontend: React + TypeScript
- Styling: Tailwind CSS and/or shadcn/ui
- Database: SQLite
- Native layer: Rust/Tauri commands
- Development environment: VS Code + Codex

## Core Product Rules

1. Local-only app.
2. No cloud sync or remote data upload.
3. Vehicle name and uploaded vehicle picture are required.
4. Plate number is optional.
5. Maintenance templates must adapt by vehicle type, fuel type, transmission, drivetrain, and features.
6. Diesel vehicles must not automatically receive spark plug maintenance.
7. Gasoline vehicles must not automatically receive diesel-only DEF/AdBlue maintenance.
8. Full EVs must not automatically receive engine oil, spark plug, fuel filter, or exhaust maintenance.
9. Fuel efficiency should only be official between full-tank logs.
10. Due maintenance uses date, odometer, or whichever comes first.

---

# Current Phase Status

## Active Phase

Phase 12 - Dashboard Polish and UX Refinement.

## Phase State

Phase 12 completed. The Dashboard is now a real local overview powered by vehicles, maintenance schedules, active alerts, official fuel efficiency, monthly costs, backup reminder status, settings, and recent activity.

## Last Completed Phase

Phase 12 - Dashboard Polish and UX Refinement.

## Next Planned Phase

Phase 13 - Packaging and Release Preparation.

---

# Phase Checklist

| Phase | Name | Status | Notes |
|---:|---|---|---|
| 0 | Repository and Workflow Setup | Completed | Environment inspected; initial scaffold added; native Tauri prerequisites missing |
| 1 | App Scaffold | Completed | Desktop shell, sidebar navigation, static placeholder pages, and validation checks completed |
| 2 | Database Foundation and Migrations | Completed | SQLite app-data database, migration runner, initial schema, and Rust migration tests added |
| 3 | Domain Models and Validation | Completed | TypeScript domain models, validation helpers, Vitest coverage, and minimal Rust domain types added |
| 4 | Vehicle Module | Completed | Vehicle CRUD, local photo storage, archive flow, profile UI, and repository tests |
| 5 | Maintenance Template Engine | Completed | Default template library, idempotent seed, and vehicle applicability preview |
| 6 | Maintenance Scheduling and Alerts | Completed | Schedule sync, due status, active in-app alerts, and tests |
| 7 | Fuel Logging and Efficiency | Completed | Fuel logs, local receipts, full-tank km/L, warnings, efficiency-drop alert groundwork |
| 8 | Maintenance Completion and Service History | Completed | Complete schedules, service logs, next due recalculation, alert resolution |
| 9 | Expenses and Reports | Completed | Manual expenses, report summaries, source cost aggregation, and double-count prevention |
| 10 | Backup, Restore, and Local File Safety | Completed | Local .tog5backup folder package, manifest/checksums, validation, safe restore, and file safety summary |
| 11 | User Access and Settings | Completed | Local settings, owner/role scaffolding, alert toggles, startup preference, and data safety notes |
| 12 | Dashboard Polish and UX Refinement | Completed | Real local Dashboard overview, quick actions, needs-attention list, recent activity, and aggregation tests |
| 13 | Packaging and Release Preparation | Not started | Windows installer |
| 14 | Client Testing and Fixes | Not started | Feedback and stabilization |

---

# Latest Update Entry Template

Copy this template for each new update.

```md
## Update YYYY-MM-DD HH:mm — Phase X: [Phase Name]

### Prompt / Task Given to Codex

[Paste or summarize the exact prompt/task here.]

### Summary of What Changed

- [Change 1]
- [Change 2]
- [Change 3]

### Files Created

- `[path]` — [purpose]

### Files Modified

- `[path]` — [what changed]

### Files Deleted

- `[path]` — [why]

### Commands Run

```bash
[command]
```

### Command Results

- Typecheck: [pass/fail/not run]
- Lint: [pass/fail/not run]
- Tests: [pass/fail/not run]
- Build: [pass/fail/not run]
- App run/manual check: [pass/fail/not run]

### Errors / Warnings Encountered

- [Error/warning]
- [How it was handled or whether unresolved]

### Decisions Made

- [Decision 1]
- [Decision 2]

### Important Implementation Details

- [Detail 1]
- [Detail 2]

### Known Issues / Technical Debt

- [Issue 1]
- [Issue 2]

### Manual Checks Completed

- [Check 1]
- [Check 2]

### Suggested Next Step

[What should the next Codex task likely focus on?]

### Notes for ChatGPT Prompt Optimization

[Write anything ChatGPT should know before creating the next Codex prompt.]
```

---

# Update History

## Update 2026-06-25 21:18 +08:00 — Phase 0: Local Environment Inspection and Safe Initial Setup

### Prompt / Task Given to Codex

Complete Phase 0 by confirming the project root, reading required specs, inspecting the local environment, determining repository state, creating or verifying a safe Tauri + React + TypeScript + Vite scaffold if missing, validating available commands, and updating `specs/live-update.md`.

### Confirmed Project Root

- `C:\Development Projects\TOG5-VMS`

### Repository Status Before Changes

- Repository was documentation/specs only.
- No app scaffold existed.
- No `package.json`, `src/`, `src-tauri/`, `index.html`, `vite.config.ts`, or TypeScript config existed.
- Git was initialized.
- Existing status before scaffold showed `README.md` already modified and `AGENTS.md` / `specs/` untracked. These documentation/spec files were preserved.

### Local Environment Results

- Node: `v24.18.0`
- npm: PowerShell `npm -v` failed because `C:\Program Files\nodejs\npm.ps1` is blocked by the current execution policy.
- npm via cmd shim: `11.16.0` using `npm.cmd -v` and `cmd /c npm -v`
- pnpm: not installed / not on PATH.
- yarn: not installed / not on PATH.
- Rust/rustc: not installed / not on PATH.
- Cargo: not installed / not on PATH.
- rustup: not installed / not on PATH.
- Git: `git version 2.51.1.windows.1`
- `where node`: `C:\Program Files\nodejs\node.exe`
- `where npm`: `C:\Program Files\nodejs\npm`, `C:\Program Files\nodejs\npm.cmd`
- `where cargo`: not found.
- WebView2: available, detected version `149.0.4022.80`.
- MSVC / Visual Studio Build Tools: not detected by `tauri info`; `where cl` and `where link` did not find the compiler/linker.
- Current shell can run Node and `npm.cmd` commands successfully.
- Current shell cannot run `npm` directly unless the PowerShell execution policy or command path is adjusted.
- Current shell cannot run Cargo commands because Rust/Cargo are missing.

### Summary of What Changed

- Added an in-place Tauri v2 + React + TypeScript + Vite scaffold at the project root.
- Preserved the existing root `README.md`, root `AGENTS.md`, and all files under `specs/`.
- Added npm scripts for Vite dev/build, typecheck, lint, formatting, and Tauri commands.
- Added a clean source folder structure matching the architecture direction in `specs/01-tech-stack-architecture.md`.
- Added a minimal app shell only; no vehicle, fuel, maintenance, alert, backup, report, login, database, or business feature modules were implemented.
- Added formatting/lint/typecheck foundation.
- Installed npm dependencies and generated `package-lock.json`.
- Added `.prettierignore` so formatting checks do not rewrite the specification Markdown files.

### Files Created

- `.gitignore` — ignores dependencies, build output, local logs, and Tauri targets.
- `.prettierignore` — excludes specs/docs and generated folders from Prettier checks.
- `.prettierrc` — Prettier defaults for scaffold files.
- `eslint.config.js` — ESLint flat config for TypeScript/React.
- `index.html` — Vite HTML entry.
- `package.json` — npm metadata, dependencies, and scripts.
- `package-lock.json` — locked npm dependency graph.
- `tsconfig.json` — frontend TypeScript config.
- `tsconfig.node.json` — config for Vite/Node-side TypeScript files.
- `vite.config.ts` — Vite React config.
- `src/main.tsx` — React entry point.
- `src/app/App.tsx` — minimal non-business app shell.
- `src/styles.css` — base scaffold styling.
- `src/app/routes/.gitkeep`
- `src/app/layout/.gitkeep`
- `src/app/providers/.gitkeep`
- `src/components/common/.gitkeep`
- `src/components/forms/.gitkeep`
- `src/components/dashboard/.gitkeep`
- `src/components/vehicles/.gitkeep`
- `src/components/fuel/.gitkeep`
- `src/components/maintenance/.gitkeep`
- `src/components/reports/.gitkeep`
- `src/domain/vehicles/.gitkeep`
- `src/domain/fuel/.gitkeep`
- `src/domain/maintenance/.gitkeep`
- `src/domain/alerts/.gitkeep`
- `src/domain/expenses/.gitkeep`
- `src/services/api/.gitkeep`
- `src/services/validation/.gitkeep`
- `src/services/formatting/.gitkeep`
- `src/services/files/.gitkeep`
- `src/types/.gitkeep`
- `src/utils/.gitkeep`
- `src-tauri/Cargo.toml` — minimal Tauri Rust package config.
- `src-tauri/build.rs` — Tauri build hook.
- `src-tauri/src/main.rs` — native app entry.
- `src-tauri/src/lib.rs` — Tauri builder setup.
- `src-tauri/tauri.conf.json` — Tauri app configuration.
- `src-tauri/src/commands/.gitkeep`
- `src-tauri/src/db/.gitkeep`
- `src-tauri/src/files/.gitkeep`
- `src-tauri/src/notifications/.gitkeep`
- `src-tauri/src/backup/.gitkeep`
- `src-tauri/migrations/.gitkeep`

### Files Modified

- `specs/live-update.md` — recorded Phase 0 environment inspection, scaffold setup, validation results, blockers, and next steps.

### Files Deleted

- None.

### Commands Run

```bash
Get-Location
node -v
npm -v
pnpm -v
yarn -v
rustc --version
cargo --version
rustup --version
git --version
where.exe node
where.exe npm
where.exe cargo
npm.cmd -v
cmd /c npm -v
where.exe cl
where.exe link
where.exe npx
npx.cmd -v
where.exe git
Get-ChildItem -LiteralPath 'C:\Program Files (x86)\Microsoft\EdgeWebView\Application'
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue
npm.cmd install
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run tauri -- --version
npm.cmd run build
npm.cmd run tauri -- info
npm.cmd run dev
npm.cmd run format:check
npm.cmd exec prettier -- --write .prettierrc eslint.config.js index.html package.json src\app\App.tsx src\main.tsx src\styles.css src-tauri\tauri.conf.json tsconfig.json tsconfig.node.json vite.config.ts
git status --short --ignored
```

### Command Results

- Install: pass with `npm.cmd install`; 177 packages installed, 0 vulnerabilities.
- npm warning: `esbuild@0.28.1` has an install script pending npm allow-scripts approval. Vite build still passed.
- Typecheck: pass with `npm.cmd run typecheck`.
- Lint: pass with `npm.cmd run lint`.
- Format check: initially failed because Prettier checked existing docs/specs and two scaffold files; after adding `.prettierignore` and formatting scaffold files, pass with `npm.cmd run format:check`.
- Build: pass with `npm.cmd run build`.
- Tauri CLI version: pass, `tauri-cli 2.11.3`.
- Tauri environment check: partial/fail. `tauri info` printed environment results but timed out after 120 seconds. It clearly reported WebView2 available and Rust/Cargo/MSVC Build Tools missing.
- Vite dev server: foreground command started successfully and reported `http://127.0.0.1:1420/`; command was stopped by timeout because dev servers stay running. Attempts to keep a hidden background process alive from this shell exited without useful logs, so no persistent dev server is assumed to be running.
- Tests: not configured yet.

### Errors / Warnings Encountered

- `npm -v` failed in PowerShell due script execution policy blocking `npm.ps1`; workaround is to use `npm.cmd`.
- `pnpm`, `yarn`, `rustc`, `cargo`, and `rustup` were not found.
- MSVC / Visual Studio Build Tools were not detected.
- `tauri info` reported missing native prerequisites and timed out after printing environment details.
- Hidden/background Vite launch attempts exited without logs; foreground `npm.cmd run dev` starts successfully.

### Decisions Made

- Used npm because `npm.cmd` is available and pnpm/yarn are not installed.
- Scaffolded manually in the existing project root to avoid nested project folders and avoid overwriting existing documentation.
- Used Tauri v2 dependency ranges and generated the actual lockfile through `npm.cmd install`.
- Skipped Tailwind CSS for Phase 0 to keep setup minimal; it can be added in Phase 1 UI work if desired.
- Skipped SQLite/database setup because it belongs to a later phase.
- Skipped `tauri dev` and `tauri build` because Rust/Cargo/MSVC prerequisites are missing.
- Kept the app shell minimal and non-domain-specific to avoid implementing business features early.

### Important Implementation Details

- Project root remains `C:\Development Projects\TOG5-VMS`.
- App dev URL is configured as `http://127.0.0.1:1420/`.
- Tauri frontend dist points to `../dist`.
- Native source structure is ready for future commands, database, files, notifications, and backup modules, but these are placeholders only.
- Source folders match the planned layered architecture: `app`, `components`, `domain`, `services`, `types`, and `utils`.

### Known Issues / Technical Debt

- Rust/rustup/Cargo must be installed before native Tauri commands can run.
- Visual Studio Build Tools with MSVC and Windows SDK components must be installed before Tauri can build on Windows.
- PowerShell cannot run `npm` directly under the current execution policy; use `npm.cmd` or adjust policy.
- Tests are not configured yet.
- App icon and production packaging metadata are still placeholders/minimal.

### Manual Checks Completed

- Confirmed project root.
- Confirmed existing docs/specs were preserved.
- Confirmed repository was documentation/specs only before scaffold.
- Confirmed npm dependency installation.
- Confirmed TypeScript, ESLint, Prettier check, and Vite build pass.
- Confirmed Vite dev command starts in foreground at `http://127.0.0.1:1420/`.
- Confirmed Tauri native build prerequisites are not ready.

### Suggested Next Step

Install missing native prerequisites, then continue Phase 1 by running `npm.cmd run tauri:dev`, verifying the desktop window opens, and building the basic desktop app shell/sidebar/page placeholders.

### Notes for ChatGPT Prompt Optimization

The next prompt should focus on Phase 1 scaffold completion and should explicitly account for the current machine state: npm works through `npm.cmd`, WebView2 is installed, but Rust/Cargo/rustup and Visual Studio Build Tools with MSVC/Windows SDK are missing. If those tools are not installed yet, the next Codex task should stay on frontend scaffold work only and avoid claiming Tauri native validation.

## Update 2026-06-25 22:38 +08:00 — Pre-Phase 1: Scaffold Health Validation

### Prompt / Task Given to Codex

Validate the Phase 0 Tauri + React + TypeScript + Vite scaffold before starting Phase 1 app shell work. Verify icons, git ignores, Vite/Tauri config alignment, native Tauri readiness, and validation commands. Do not implement Phase 1 features or business modules.

### Confirmed Project Root

- Requested root: `C:\Development Projects\TOG5-VMS`
- Shell note: `Get-Location` reports a Codex sandbox-mapped path, but all commands were run with `workdir` set to `C:\Development Projects\TOG5-VMS` and resolved the expected project files.

### Current Environment Status

- Node: `v24.18.0`
- npm via `npm.cmd`: `11.16.0`
- Plain `npm -v`: still blocked by PowerShell execution policy for `npm.ps1`; continue using `npm.cmd`.
- rustc: `1.96.0 (ac68faa20 2026-05-25)`
- cargo: `1.96.0 (30a34c682 2026-05-25)`
- rustup: `1.29.0 (28d1352db 2026-03-05)`
- Rust toolchain: `stable-x86_64-pc-windows-msvc`
- Git: `2.51.1.windows.1`
- WebView2: detected by Tauri, version `149.0.4022.80`
- MSVC: detected by Tauri as Visual Studio Build Tools 2026

### Icon Status

- `vms-logo.png` exists in the project root.
- `src-tauri/icons/` exists.
- Required Tauri icon files exist, including `src-tauri/icons/icon.ico`.
- Existing generated icons include PNG sizes, `icon.icns`, `icon.ico`, `icon.png`, Windows Store logo assets, and mobile icon folders.
- No icon generation was needed in this checkpoint.

### Config Status

- Vite serves on `127.0.0.1:1420`.
- Tauri `devUrl` was aligned from `http://localhost:1420` to `http://127.0.0.1:1420`.
- Tauri `beforeDevCommand` and `beforeBuildCommand` were changed to `npm.cmd run dev` and `npm.cmd run build` because plain `npm` is not safe in the current PowerShell policy.
- Vite already ignores Rust/native generated paths:
  - `**/src-tauri/target/**`
  - `**/src-tauri/gen/**`
  - `**/src-tauri/icons/**`
- `dist/`, `node_modules/`, `src-tauri/target/`, and `src-tauri/gen/` are ignored by Git.

### Summary of What Changed

- Updated only scaffold validation/config files.
- Did not implement the Phase 1 app shell.
- Did not add vehicle, fuel, maintenance, alert, report, auth, backup, or database features.
- Formatted `vite.config.ts` after Prettier reported style drift.

### Files Created

- None.

### Files Modified

- `src-tauri/tauri.conf.json` — aligned `devUrl` with Vite and switched Tauri npm commands to `npm.cmd`.
- `vite.config.ts` — formatting only; watcher exclusions were already present.
- `specs/live-update.md` — added this checkpoint update and refreshed current blocker status.

### Files Deleted

- None.

### Commands Run

```bash
Get-Location
Get-Content -Raw -LiteralPath AGENTS.md
Get-Content -Raw -LiteralPath README.md
Get-Content -Raw -LiteralPath specs\00-project-brief.md
Get-Content -Raw -LiteralPath specs\01-tech-stack-architecture.md
Get-Content -Raw -LiteralPath specs\07-development-phases.md
Get-Content -Raw -LiteralPath specs\live-update.md
Get-Content -Raw -LiteralPath package.json
Get-Content -Raw -LiteralPath vite.config.ts
Get-Content -Raw -LiteralPath src-tauri\tauri.conf.json
Get-Content -Raw -LiteralPath src-tauri\Cargo.toml
Test-Path -LiteralPath vms-logo.png
Test-Path -LiteralPath src-tauri\icons
Get-ChildItem -Force -LiteralPath src-tauri\icons
Test-Path -LiteralPath src-tauri\icons\icon.ico
git check-ignore -v dist src-tauri/target src-tauri/target/debug src-tauri/gen node_modules
node -v
npm.cmd -v
npm -v
rustc --version
cargo --version
rustup --version
git --version
where.exe cargo
where.exe rustc
where.exe npm
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run tauri -- info
npm.cmd run tauri:dev
```

### Command Results

- Typecheck: pass.
- Lint: pass. One parallel lint attempt hit a transient sandbox ACL error, then the sequential rerun passed.
- Format check: initially failed on `vite.config.ts`; after formatting, pass.
- Build: pass.
- `tauri info`: environment and package info printed successfully and showed WebView2, MSVC, Rust, Cargo, and rustup detected. The command did not exit before the 180-second timeout after printing package info, so it was recorded as partial/timeout rather than clean exit.
- `tauri:dev`: clean logged run started Vite, compiled Rust, finished the dev build, and launched `target\debug\tog5-vms.exe`.
- Tauri desktop window visual confirmation: not conclusively visible from shell. The native `tog5-vms.exe` process launched and was responsive, but `MainWindowTitle` was blank in process inspection.
- Dev processes were stopped after validation.

### Errors / Warnings Encountered

- Plain `npm -v` still fails under PowerShell due execution policy blocking `npm.ps1`.
- A first `tauri:dev` attempt timed out without output and left dev processes running.
- A second logged `tauri:dev` attempt failed because port `1420` was already in use by the previous run.
- After stopping leftover processes, a clean logged `tauri:dev` run succeeded through native process launch.
- Visual confirmation of the desktop window could not be proven from process metadata alone.

### Decisions Made

- Kept the existing generated icon set because `icon.ico` and related files are present.
- Did not regenerate icons from `vms-logo.png` because the icon setup is already complete enough for Tauri.
- Aligned Tauri to `127.0.0.1:1420` to match Vite exactly.
- Switched Tauri commands to `npm.cmd` to avoid PowerShell execution policy failures.
- Left app UI/features untouched because this was a pre-Phase 1 validation checkpoint.

### Suggested Next Step

Proceed to Phase 1 app shell work: create the basic desktop layout/sidebar/page placeholders and then run `npm.cmd run tauri:dev` with direct visual confirmation from the user if needed.

### Notes for ChatGPT Prompt Optimization

The scaffold is healthy enough to start Phase 1. The next prompt should not repeat icon generation unless icons are deleted. Continue using `npm.cmd`. Tauri native compilation now reaches and launches `target\debug\tog5-vms.exe`; however, this shell could not independently verify the visible desktop window title, so a human visual check is useful during Phase 1.

## Update 2026-06-25 22:50 +08:00 — Phase 1: App Scaffold

### Prompt / Task Given to Codex

Build the Phase 1 desktop app shell and placeholder navigation structure for TOG 5 VMS. Do not implement database, CRUD, business logic, authentication, Tauri commands, reports, backup, or real alerts.

### Confirmed Project Root

- `C:\Development Projects\TOG5-VMS`

### Summary of What Changed

- Replaced the minimal welcome panel with a desktop app shell.
- Added left sidebar navigation, top header, main content area, and simple React state-based page switching.
- Added placeholder pages for Dashboard, Vehicles, Fuel Logs, Maintenance, Service History, Expenses, Reports, Alerts, Backup & Restore, and Settings.
- Added static dashboard summary cards for total vehicles, maintenance due soon, overdue maintenance, average fuel efficiency, monthly cost, and backup status.
- Added static non-functional alert cards for due soon, overdue, fuel efficiency drop, missing receipt, and backup reminder.
- Added product-rule placeholder copy for vehicle setup, maintenance applicability, fuel logging, alerts, backups, reports, expenses, settings, and service history.
- Added responsive behavior for narrower windows with compact sidebar labels and horizontal navigation on small screens.
- Used mock/static data only. No localStorage, SQLite, Tauri commands, file upload, notifications, API layer, authentication, reports, or backup system were implemented.

### Files Created

- `src/app/routes/PlaceholderPages.tsx` — static placeholder page components and mock dashboard/alert data.
- `src/components/common/AppLayout.tsx` — reusable desktop shell layout with sidebar, header, and content area.
- `src/components/common/SidebarNav.tsx` — reusable sidebar navigation component.
- `src/components/common/SummaryCard.tsx` — reusable dashboard summary card.
- `src/components/common/PlaceholderSection.tsx` — reusable explanatory placeholder section.
- `src/components/common/AlertCard.tsx` — reusable static alert card.
- `src/types/navigation.ts` — navigation item and page id types plus navigation labels.

### Files Modified

- `src/app/App.tsx` — now owns simple state-based page switching and renders the app layout.
- `src/styles.css` — replaced starter splash styling with desktop shell, navigation, card, placeholder, alert, and responsive styles.
- `specs/live-update.md` — recorded Phase 1 completion, validation results, and next step.

### Files Deleted

- None.

### Commands Run

```bash
Get-Location
Get-Content -Raw -LiteralPath AGENTS.md
Get-Content -Raw -LiteralPath README.md
Get-Content -Raw -LiteralPath specs\00-project-brief.md
Get-Content -Raw -LiteralPath specs\01-tech-stack-architecture.md
Get-Content -Raw -LiteralPath specs\02-functional-specification.md
Get-Content -Raw -LiteralPath specs\05-ui-ux-specification.md
Get-Content -Raw -LiteralPath specs\06-business-rules.md
Get-Content -Raw -LiteralPath specs\07-development-phases.md
Get-Content -Raw -LiteralPath specs\live-update.md
Get-Content -Raw -LiteralPath package.json
Get-Content -Raw -LiteralPath src\app\App.tsx
Get-Content -Raw -LiteralPath src\styles.css
npm.cmd exec prettier -- --write src\app\App.tsx src\app\routes\PlaceholderPages.tsx src\components\common\AppLayout.tsx src\components\common\SidebarNav.tsx src\components\common\SummaryCard.tsx src\components\common\PlaceholderSection.tsx src\components\common\AlertCard.tsx src\types\navigation.ts src\styles.css
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue
npm.cmd run tauri:dev
git status --short --ignored
```

### Command Results

- Typecheck: pass.
- Lint: pass.
- Format check: pass after formatting the new/touched frontend files.
- Frontend build: pass. Vite built 36 modules successfully.
- Tauri dev: pass through compile and process launch. Vite started on `http://127.0.0.1:1420/`, Rust compiled, and `target\debug\tog5-vms.exe` launched.
- Tauri app visual confirmation: still needs human confirmation. Codex verified the native process was responsive, but could not visually inspect the desktop window from shell metadata.
- Tests: not configured yet.

### Errors / Warnings Encountered

- Initial typecheck failed because `JSX.Element` namespace was not available in `App.tsx`; fixed by using `ReactNode`.
- Initial lint reported a React Fast Refresh warning because navigation constants were exported from the component file; fixed by moving navigation types/data to `src/types/navigation.ts`.
- Initial format check reported `AppLayout.tsx`; fixed by running Prettier on touched files.
- Tauri dev process was stopped after validation.

### Decisions Made

- Used simple React state for page switching; React Router was not added.
- Kept all data mock/static.
- Used the existing CSS setup instead of adding Tailwind.
- Kept UI text friendly and rule-focused so users can understand future behavior before real modules exist.
- Kept Rust/Tauri files untouched because no native command changes were needed.
- Avoided README/spec changes except this required `live-update.md` update.

### Important Implementation Details

- Navigation pages are typed with `PageId` in `src/types/navigation.ts`.
- `AppLayout` receives the active navigation item and renders the shell around page content.
- Dashboard cards and alert cards are static examples only.
- Vehicle, fuel, and maintenance placeholders explicitly record the product rules that must guide future phases.
- Responsive behavior changes the sidebar to compact labels on medium widths and horizontal scrolling navigation on narrow widths.

### Known Issues / Technical Debt

- No automated UI tests are configured yet.
- Human visual confirmation of the Tauri desktop window is still useful because Codex cannot see the desktop.
- Placeholder pages are intentionally static and will need to be replaced or expanded in later phases.
- No database, API, Tauri commands, file upload, notifications, authentication, reports, or backup behavior exists yet.

### Manual Checks Completed

- Confirmed project root.
- Confirmed all required files were read before implementation.
- Confirmed every required Phase 1 page exists in navigation.
- Confirmed required dashboard summary cards exist.
- Confirmed required vehicle, maintenance, and fuel product rules are visible in placeholders.
- Confirmed required sample alert cards exist.
- Confirmed no leftover Tauri/Vite/Cargo dev processes remained after validation.

### Suggested Next Step

Proceed to Phase 2: Database Foundation and Migrations. Start by reading `specs/03-data-model.md`, `specs/04-maintenance-template-engine.md`, `specs/06-business-rules.md`, and `specs/08-testing-quality.md`, then design a safe SQLite migration and initialization plan before adding tables.

### Notes for ChatGPT Prompt Optimization

The Phase 1 shell is complete and static by design. The next prompt should focus on Phase 2 database setup only, avoid UI feature expansion unless needed for initialization visibility, and continue using `npm.cmd`. Ask the human to visually confirm the desktop window if screenshots or direct UI inspection are required.

## Update 2026-06-25 23:05 +08:00 — Phase 2: Database Foundation and Migrations

### Prompt / Task Given to Codex

Add the local SQLite database foundation for TOG 5 VMS without implementing UI CRUD, business modules, authentication, reports, real alerts, Tauri CRUD commands, or backup behavior.

### Confirmed Project Root

- `C:\Development Projects\TOG5-VMS`

### Database Approach Chosen

- Rust/Tauri owns database initialization.
- `rusqlite` was chosen instead of SQLx to keep Phase 2 synchronous, simple, and free of compile-time `DATABASE_URL` requirements.
- `rusqlite` uses the `bundled` SQLite feature for predictable local SQLite availability.
- A minimal Tauri command, `database_status`, was added for future health/status validation only. No CRUD commands were added.

### Migration Approach Chosen

- Migrations are embedded Rust-side with `include_str!` from `src-tauri/migrations/`.
- A `schema_migrations` table tracks applied migration versions.
- Migrations run inside a transaction and each migration only runs once.
- SQLite foreign keys are enabled for each initialized connection.
- Startup initialization runs in Tauri `.setup(...)`.

### Database File Location Strategy

- Normal app runs use the Tauri app data directory.
- On this Windows validation run, the database was created at:
  - `C:\Users\Darnocs\AppData\Roaming\com.tog5.vms\tog5-vms.sqlite3`
- Tests use temporary database files through `tempfile` and do not touch the production app data directory.

### Tables Created

- `schema_migrations`
- `users`
- `vehicles`
- `vehicle_photos`
- `vehicle_documents`
- `vehicle_features`
- `fuel_logs`
- `maintenance_templates`
- `maintenance_template_rules`
- `vehicle_maintenance_settings`
- `maintenance_schedules`
- `maintenance_logs`
- `repair_records`
- `parts_inventory`
- `expenses`
- `alerts`
- `settings`
- `backups`
- `audit_logs`

### Summary of What Changed

- Added a Rust database module for path resolution, database creation/opening, SQLite connection configuration, migration execution, and migration status reporting.
- Added the first SQL migration for the Phase 2 schema.
- Added Rust tests proving a temp database can be initialized and migrations are idempotent.
- Wired database initialization into Tauri startup.
- Kept the frontend UI unchanged.
- Did not seed full maintenance templates yet.

### Files Created

- `src-tauri/src/db/mod.rs` — SQLite initialization, migration runner, status command, and Rust tests.
- `src-tauri/migrations/001_initial_schema.sql` — initial database schema migration.

### Files Modified

- `src-tauri/Cargo.toml` — added `rusqlite` with bundled SQLite and `tempfile` for tests.
- `src-tauri/Cargo.lock` — updated lockfile for new Rust dependencies.
- `src-tauri/src/lib.rs` — runs database initialization during Tauri setup and registers the status command.
- `specs/live-update.md` — recorded Phase 2 results and corrected current status/blockers.

### Files Deleted

- None.

### Commands Run

```bash
Get-Location
Get-Content -Raw -LiteralPath AGENTS.md
Get-Content -Raw -LiteralPath README.md
Get-Content -Raw -LiteralPath specs\00-project-brief.md
Get-Content -Raw -LiteralPath specs\01-tech-stack-architecture.md
Get-Content -Raw -LiteralPath specs\02-functional-specification.md
Get-Content -Raw -LiteralPath specs\03-data-model.md
Get-Content -Raw -LiteralPath specs\04-maintenance-template-engine.md
Get-Content -Raw -LiteralPath specs\06-business-rules.md
Get-Content -Raw -LiteralPath specs\07-development-phases.md
Get-Content -Raw -LiteralPath specs\08-testing-quality.md
Get-Content -Raw -LiteralPath specs\live-update.md
Get-Content -Raw -LiteralPath src-tauri\Cargo.toml
Get-Content -Raw -LiteralPath src-tauri\src\lib.rs
Get-Content -Raw -LiteralPath src-tauri\src\main.rs
Get-Content -Raw -LiteralPath src-tauri\tauri.conf.json
Get-Content -Raw -LiteralPath package.json
Get-ChildItem -Force -Recurse -LiteralPath src-tauri\src
Get-ChildItem -Force -Recurse -LiteralPath src-tauri\migrations
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue
npm.cmd run tauri:dev
git status --short --ignored
```

### Command Results

- Rust format: pass.
- Cargo check: pass.
- Cargo test: pass. 2 tests passed, 0 failed.
- Typecheck: pass.
- Lint: pass.
- Format check: pass.
- Frontend build: pass.
- Tauri dev: pass through compile and process launch. Vite started on `http://127.0.0.1:1420/`, Rust compiled, startup database initialization succeeded, and `target\debug\tog5-vms.exe` launched.
- App data database file check: pass. `tog5-vms.sqlite3` exists under the Tauri app data directory.
- Visual desktop window confirmation: still needs human confirmation because Codex cannot inspect the desktop window directly from shell metadata.

### Tests Added

- `initializes_database_and_runs_migrations_once` verifies temp database creation and idempotent migration tracking.
- `initial_schema_contains_phase_two_tables` verifies the expected Phase 2 tables exist after migration.

### Issues / Warnings Encountered

- New Rust dependencies required crates.io resolution/download during `cargo check` and `cargo test`.
- Plain `npm` remains unsafe in PowerShell because `npm.ps1` is blocked by execution policy; validation continued with `npm.cmd`.
- Visual desktop-window confirmation is still not possible from this shell.

### Decisions Made

- Chose nullable `vehicles.primary_photo_id` in the database even though vehicle photo is required at the business-rule level. This keeps staged vehicle creation possible when a photo upload record and vehicle record need to be coordinated.
- Kept `plate_number` nullable.
- Represented vehicle type, fuel type, transmission type, drivetrain, and feature flags so future maintenance applicability logic can work.
- Added soft-delete readiness with `deleted_at` and archive readiness with `archived_at` on important long-lived records.
- Did not add full maintenance seed templates in Phase 2; that belongs to the maintenance template engine phase.
- Did not add frontend database status UI to avoid scope creep.
- Did not implement real backup/restore behavior; only the `backups` tracking table was created.

### Important Implementation Details

- `initialize_app_database` resolves the database path using Tauri `app.path().app_data_dir()`.
- `initialize_database_at_path` is reusable for tests and temporary databases.
- SQLite is configured with foreign keys enabled, WAL mode, and a busy timeout.
- Migration SQL includes indexes and foreign keys for future repository/query work.
- `expenses` can link to a vehicle and to related records by type/id.
- `alerts` can link to a vehicle and optionally to a maintenance schedule.
- `maintenance_template_rules` supports vehicle type, fuel type, transmission type, drivetrain, required feature, excluded feature, and include/exclude rule type.
- Fuel logs include odometer, fuel type, liters, price per liter, total amount, receipt reference, full-tank flag, and nullable computed efficiency fields.

### Known Issues / Technical Debt

- No repository layer or CRUD commands exist yet.
- No business validation/domain model layer exists yet.
- No maintenance template seeds exist yet.
- No encrypted database support has been added.
- No UI uses the database yet.
- The migration tracker has only a single migration so far.

### Manual Checks Completed

- Confirmed project root.
- Confirmed existing `src-tauri/src/db/` and `src-tauri/migrations/` were placeholders before Phase 2.
- Confirmed Rust/Tauri structure before editing.
- Confirmed app-data SQLite file exists after `tauri:dev`.
- Confirmed no leftover Tauri/Vite/Cargo validation processes remained after launch validation.

### Suggested Next Step

Proceed to Phase 3: Domain Models and Validation. Build shared TypeScript/Rust domain types and validation helpers for vehicles, fuel logs, maintenance applicability, alerts, and expenses before adding CRUD UI.

### Notes for ChatGPT Prompt Optimization

The next prompt should focus on Phase 3 domain model and validation foundations, not UI CRUD. It should reuse the Phase 2 schema, keep `vehicles.primary_photo_id` nullable at the database layer for staged creation, and continue using `npm.cmd` for Node commands. Maintenance template seed data should be deferred until the maintenance template engine phase unless the next prompt explicitly scopes a small seed-only task.

## Update 2026-06-25 23:19 +08:00 — Phase 3: Domain Models and Validation

### Prompt / Task Given to Codex

Create shared domain model and validation foundations for TOG 5 VMS without implementing CRUD screens, real data entry flows, reports, backup behavior, authentication, full maintenance scheduling, or frontend database reads/writes.

### Confirmed Project Root

- `C:\Development Projects\TOG5-VMS`

### Domain Model Approach

- Added explicit TypeScript domain types under `src/domain/` for common values, vehicle profiles, local file references, fuel logs, maintenance templates/rules/schedules/logs, expenses, and alerts.
- Added a root `src/domain/index.ts` barrel for future imports.
- Kept the model layer pure and frontend-testable. No database calls, Tauri invokes, localStorage, or UI forms were added.
- Added minimal Rust domain types under `src-tauri/src/domain/` for future Tauri command payload alignment. Rust validation was intentionally kept minimal because no repository/CRUD command layer exists yet.

### Validation Approach

- Used hand-written TypeScript validation helpers instead of adding a schema validation dependency such as Zod.
- Added reusable validation primitives for required trimmed text, finite numbers, non-negative numbers, positive numbers, validation issues/results, and odometer progression.
- Added project-specific helpers for vehicle creation validation, fuel log validation, official fuel efficiency eligibility/calculation, fuel type mismatch warnings, DEF/AdBlue exclusion from fuel consumption, maintenance applicability warnings/exclusions, and due status by date/odometer thresholds.
- Added Vitest because no TypeScript test runner existed and Phase 3 rules benefit from fast unit tests.

### Files Created

- `src/domain/index.ts` — domain barrel exports.
- `src/domain/common/types.ts` — shared IDs, ISO date strings, money note, validation issue/result types.
- `src/domain/common/validation.ts` — reusable validation primitives.
- `src/domain/common/index.ts`
- `src/domain/documents/types.ts` — local file, vehicle photo, and vehicle document reference types.
- `src/domain/documents/index.ts`
- `src/domain/vehicles/types.ts` — vehicle profile, fuel type, vehicle type, transmission, drivetrain, features, and status types.
- `src/domain/vehicles/validation.ts` — vehicle creation validation.
- `src/domain/vehicles/index.ts`
- `src/domain/fuel/types.ts` — fuel log and fuel efficiency types.
- `src/domain/fuel/validation.ts` — fuel log validation and fuel efficiency calculation eligibility.
- `src/domain/fuel/index.ts`
- `src/domain/maintenance/types.ts` — template, rule, schedule, log, priority, category, task, and status types.
- `src/domain/maintenance/validation.ts` — applicability and due-status helpers.
- `src/domain/maintenance/index.ts`
- `src/domain/expenses/types.ts` — expense category and expense types.
- `src/domain/expenses/validation.ts` — expense validation.
- `src/domain/expenses/index.ts`
- `src/domain/alerts/types.ts` — alert type, priority, status, and alert record types.
- `src/domain/alerts/index.ts`
- `src/domain/domainValidation.test.ts` — TypeScript unit tests for Phase 3 validation rules.
- `src-tauri/src/domain/mod.rs` — Rust domain module entry.
- `src-tauri/src/domain/common.rs` — Rust shared domain aliases and validation issue shape.
- `src-tauri/src/domain/vehicles.rs` — Rust vehicle/profile enum and struct types aligned with the schema.

### Files Modified

- `package.json` — added `test` script and Vitest dev dependency.
- `package-lock.json` — locked Vitest dependency graph.
- `src-tauri/src/lib.rs` — exposed the Rust domain module.
- `specs/live-update.md` — recorded Phase 3 completion and updated current status.

### Files Deleted

- None.

### TypeScript Domain Types Added

- Common: `EntityId`, `ISODateString`, `ISODateTimeString`, `ValidationIssue`, `ValidationResult`, `RelatedRecordType`, `MoneyAmount`.
- Vehicle: vehicle type, fuel type, transmission type, drivetrain, feature keys, vehicle status, vehicle feature, vehicle profile, vehicle creation input.
- Documents: local file reference, vehicle photo, document type, vehicle document.
- Fuel: fuel log fuel type, efficiency status, fuel log, validation input, efficiency input/calculation.
- Maintenance: category, task key, priority, rule type, template rule, template, schedule status, schedule, maintenance log, due input.
- Expenses: category and expense record.
- Alerts: alert type, priority, status, and alert record.

### Rust Domain Types Added

- Common aliases for entity IDs and ISO strings.
- Rust validation issue/validation severity structs for future command responses.
- Rust vehicle enums/structs for vehicle type, fuel type, transmission, drivetrain, status, feature keys, features, and vehicle profile payloads.

### Validation Helpers Added

- `trimToUndefined`
- `validateRequiredText`
- `validateFiniteNumber`
- `validateNonNegativeNumber`
- `validatePositiveNumber`
- `validateOdometerProgression`
- `validateVehicleCreation`
- `validateFuelLog`
- `validateFuelTypeCompatibility`
- `calculateOfficialFuelEfficiency`
- `maintenanceApplicabilityIssues`
- `shouldAutoApplyMaintenanceTask`
- `doesTemplateRuleMatchVehicle`
- `templateHasMatchingExcludeRule`
- `getMaintenanceDueStatus`
- `validateExpense`

### Tests Added

- Required vehicle name.
- Required vehicle picture for normal creation.
- Optional plate number.
- Odometer rollback with and without admin override.
- Official fuel efficiency full-tank rule.
- Fuel type mismatch warning.
- DEF/AdBlue not counted as diesel fuel consumption.
- Diesel spark plug exclusion.
- Gasoline DEF/AdBlue exclusion.
- Full EV combustion-maintenance exclusions.
- Due soon / overdue by date.
- Due soon / overdue by odometer.

### Commands Run

```bash
Get-Location
npm -v
Get-Content -Raw -LiteralPath AGENTS.md
Get-Content -Raw -LiteralPath README.md
Get-Content -Raw -LiteralPath specs\00-project-brief.md
Get-Content -Raw -LiteralPath specs\01-tech-stack-architecture.md
Get-Content -Raw -LiteralPath specs\02-functional-specification.md
Get-Content -Raw -LiteralPath specs\03-data-model.md
Get-Content -Raw -LiteralPath specs\04-maintenance-template-engine.md
Get-Content -Raw -LiteralPath specs\06-business-rules.md
Get-Content -Raw -LiteralPath specs\07-development-phases.md
Get-Content -Raw -LiteralPath specs\08-testing-quality.md
Get-Content -Raw -LiteralPath specs\live-update.md
Get-Content -Raw -LiteralPath src-tauri\migrations\001_initial_schema.sql
Get-Content -Raw -LiteralPath src-tauri\src\db\mod.rs
Get-Content -Raw -LiteralPath src-tauri\src\lib.rs
Get-Content -Raw -LiteralPath src\app\routes\PlaceholderPages.tsx
Get-Content -Raw -LiteralPath src\types\navigation.ts
Get-Content -Raw -LiteralPath package.json
Get-Content -Raw -LiteralPath src-tauri\Cargo.toml
npm.cmd install --save-dev vitest
npm.cmd exec prettier -- --write [new/touched TypeScript files]
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue
npm.cmd run tauri:dev
git status --short --ignored
```

### Command Results

- Plain `npm -v`: still failed because PowerShell blocks `npm.ps1`.
- Vitest install: pass. 26 packages added, 0 vulnerabilities.
- TypeScript tests: pass. 1 file, 12 tests.
- Typecheck: initially failed due a readonly test fixture; fixed. Final result pass.
- Lint: pass.
- Format check: pass.
- Frontend build: pass.
- Rust format: pass.
- Cargo check: pass.
- Cargo test: pass. Existing Rust DB tests still pass, 2 tests.
- Tauri dev: pass through compile and process launch. Vite started, Rust compiled, and `target\debug\tog5-vms.exe` launched.
- Visual desktop window confirmation: still needs human confirmation because Codex cannot inspect the desktop window directly from shell metadata.

### Issues Encountered

- Plain `npm` is still blocked in this PowerShell environment, despite the suspected execution policy fix. `npm.cmd` remains the reliable command.
- A test fixture used `as const`, producing a readonly feature array that did not match the mutable domain type. The fixture was typed explicitly and the checks passed.
- Vite re-optimized dependencies during `tauri:dev` because the lockfile changed after adding Vitest.

### Decisions Made

- Added Vitest because Phase 3 is validation-heavy and the project had no TypeScript test runner.
- Did not add Zod or another validation library; simple explicit helpers are enough for this phase.
- Kept schema unchanged because no clear Phase 2 schema bug was found.
- Did not seed maintenance templates.
- Did not add UI forms, CRUD commands, repository layer, or frontend database reads/writes.
- Kept Rust domain groundwork minimal to avoid duplicating frontend placeholder logic before Tauri command contracts exist.

### Important Implementation Details

- Vehicle photo remains required at the TypeScript business-validation layer even though the database allows staged creation.
- Plate number remains optional.
- Numeric validators reject `NaN`, `Infinity`, invalid values, and negative values where applicable.
- Fuel type mismatch is a warning, not a hard failure.
- Official fuel efficiency only computes when both current and previous logs are full-tank and numeric inputs are valid.
- DEF/AdBlue returns `not_computed` for fuel efficiency.
- Maintenance applicability helpers return warnings/exclusions for diesel spark plug tasks, gasoline diesel-only tasks, and EV combustion tasks.
- Due status helper gives priority to overdue, then due today, then due soon, across date and odometer inputs.

### Known Issues / Technical Debt

- No repository layer or CRUD commands exist yet.
- No UI consumes these domain validators yet.
- No maintenance template seed data exists yet.
- Rust validation helpers are intentionally minimal and may need expansion once Tauri command payloads are introduced.
- Money handling still uses `number`; a stricter decimal/rounding policy should be decided before financial reporting.

### Manual Checks Completed

- Confirmed project root.
- Inspected Phase 2 schema before making changes.
- Confirmed no schema migration was needed for Phase 3.
- Confirmed no leftover Tauri/Vite/Cargo validation processes remained after `tauri:dev`.

### Suggested Next Step

Proceed to Phase 4: Vehicle Module. Start with vehicle add/edit/list/profile UI using the new domain types and validators, while keeping plate number optional and enforcing vehicle name/photo at the business layer.

### Notes for ChatGPT Prompt Optimization

The next prompt should focus on Phase 4 vehicle workflows and should reuse `src/domain/vehicles`, `src/domain/documents`, and common validation helpers. It should avoid changing the schema unless a real workflow bug appears, continue using `npm.cmd`, and decide how staged photo upload should interact with the nullable `vehicles.primary_photo_id` database field.

## Update 2026-06-25 23:40 +08:00 — Phase 4: Vehicle Module

### Prompt / Task Given to Codex

Implement the first real vehicle workflow: vehicle list, add vehicle, edit vehicle, archive vehicle, and vehicle profile display using the existing SQLite database, domain models, and validation helpers. Keep the scope limited to vehicles and local vehicle photo handling.

### Confirmed Project Root

- `C:\Development Projects\TOG5-VMS`

### Vehicle Module Approach

- Added a Rust vehicle module with typed command models, repository functions, local photo storage, and Tauri command wrappers.
- Reused the existing Phase 2 schema without editing `001_initial_schema.sql`; the nullable `vehicles.primary_photo_id` supports staged photo creation while user-facing creation still requires a picture.
- Reused the Phase 3 TypeScript vehicle validation helper in the form and mirrored critical validation in Rust before database writes.
- Replaced the Vehicles placeholder with a real state-based vehicle workflow inside the existing app shell.

### Vehicle Photo / Local File Approach

- Used a standard local file picker in the React UI.
- The frontend reads the selected image bytes and sends them to a Tauri command.
- Rust writes the image into the Tauri app data directory under `vehicle-photos/`.
- A staged `vehicle_photos` row is inserted before vehicle save, then linked as the primary photo during create/update.
- Supported image types are PNG, JPG/JPEG, WEBP, and GIF.
- Vehicle pictures are limited to 10 MB.
- No upload, cloud storage, network sync, or original-path dependency was added.

### Backend Commands Added

- `list_vehicles`
- `get_vehicle`
- `store_vehicle_photo`
- `create_vehicle`
- `update_vehicle`
- `archive_vehicle`

### Frontend Vehicle UI Added

- Vehicle list page with loading, error, and empty states.
- Add vehicle form.
- Edit vehicle form.
- Archive vehicle action.
- Vehicle profile/overview panel.
- Vehicle picture preview.
- Friendly labels for required name, required picture, optional plate number, current odometer, vehicle type, fuel type, transmission, drivetrain, and status.
- Archived vehicles are excluded from the normal vehicle list.

### Validation Behavior Added / Reused

- Vehicle name is trimmed and required.
- Vehicle picture is required for normal create/update through the UI.
- Plate number remains optional.
- Vehicle type and fuel type are required.
- Transmission and drivetrain default to `unknown`.
- Current odometer must be finite and non-negative.
- Backend rejects missing photo records, invalid choice values, invalid odometer values, and missing required text.

### Tests Added

- Rust photo storage test for writing image bytes into a temporary folder.
- Rust repository test for creating a vehicle with optional plate number and linked primary photo.
- Rust repository test for list, update, and archive behavior.
- Rust repository test for missing photo and negative odometer validation.
- No new TypeScript validation tests were needed because the Phase 3 validator was reused unchanged and existing Vitest coverage still passes.

### Files Created

- `src-tauri/src/vehicles/mod.rs` — vehicle module entry.
- `src-tauri/src/vehicles/models.rs` — typed command/repository payloads.
- `src-tauri/src/vehicles/photo_storage.rs` — local app-data photo writing and tests.
- `src-tauri/src/vehicles/repository.rs` — rusqlite vehicle repository and tests.
- `src-tauri/src/vehicles/commands.rs` — Tauri command wrappers.
- `src/components/vehicles/VehicleModule.tsx` — real vehicle list/form/profile UI.
- `src/services/api/vehicles.ts` — centralized typed Tauri API wrapper for vehicles.

### Files Modified

- `package.json` — changed Prettier scripts from root `.` matching to explicit project globs so `format:check` works in this workspace.
- `src-tauri/src/db/mod.rs` — added reusable app/open connection helpers for repository commands.
- `src-tauri/src/domain/vehicles.rs` — added `SoldDisposed` vehicle status.
- `src-tauri/src/lib.rs` — registered vehicle Tauri commands.
- `src/app/routes/PlaceholderPages.tsx` — replaced Vehicles placeholder with the real module.
- `src/domain/vehicles/types.ts` — added `sold_disposed` vehicle status.
- `src/styles.css` — added vehicle module layout, form, list, profile, status, and responsive styles.
- `specs/live-update.md` — recorded Phase 4 completion and updated current phase status.

### Files Deleted

- None.

### Commands Run

```bash
Get-Location
Get-Content -Raw -LiteralPath AGENTS.md
Get-Content -Raw -LiteralPath README.md
Get-Content -Raw -LiteralPath specs\00-project-brief.md
Get-Content -Raw -LiteralPath specs\01-tech-stack-architecture.md
Get-Content -Raw -LiteralPath specs\02-functional-specification.md
Get-Content -Raw -LiteralPath specs\03-data-model.md
Get-Content -Raw -LiteralPath specs\05-ui-ux-specification.md
Get-Content -Raw -LiteralPath specs\06-business-rules.md
Get-Content -Raw -LiteralPath specs\07-development-phases.md
Get-Content -Raw -LiteralPath specs\08-testing-quality.md
Get-Content -Raw -LiteralPath specs\live-update.md
Get-Content -Raw -LiteralPath src-tauri\migrations\001_initial_schema.sql
Get-Content -Raw -LiteralPath src-tauri\src\db\mod.rs
Get-Content -Raw -LiteralPath src-tauri\src\lib.rs
Get-Content -Raw -LiteralPath src-tauri\src\domain\mod.rs
Get-Content -Raw -LiteralPath src-tauri\src\domain\vehicles.rs
Get-Content -Raw -LiteralPath src\domain\index.ts
Get-Content -Raw -LiteralPath src\domain\common\validation.ts
Get-Content -Raw -LiteralPath src\domain\vehicles\types.ts
Get-Content -Raw -LiteralPath src\domain\vehicles\validation.ts
Get-Content -Raw -LiteralPath src\domain\documents\types.ts
Get-Content -Raw -LiteralPath src\app\App.tsx
Get-Content -Raw -LiteralPath src\app\routes\PlaceholderPages.tsx
Get-Content -Raw -LiteralPath src\components\common\AppLayout.tsx
Get-Content -Raw -LiteralPath src\types\navigation.ts
Get-Content -Raw -LiteralPath package.json
Get-Content -Raw -LiteralPath src-tauri\Cargo.toml
npm.cmd install @tauri-apps/plugin-dialog
npm.cmd uninstall @tauri-apps/plugin-dialog
npm.cmd exec prettier -- --write src/components/vehicles/VehicleModule.tsx src/services/api/vehicles.ts src/app/routes/PlaceholderPages.tsx src/styles.css package.json package-lock.json
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:dev
Get-CimInstance Win32_Process
Stop-Process
git status --short
```

### Command Results

- TypeScript tests: pass. 1 file, 12 tests.
- Typecheck: pass.
- Lint: pass.
- Format check: initially failed because `prettier --check .` treated the workspace root as a symbolic link after reporting matched files were formatted. After changing the script to explicit globs, pass.
- Frontend build: pass.
- Rust format: pass.
- Rust format check: pass.
- Cargo check: pass.
- Cargo test: pass. 6 Rust tests passed, including 4 new vehicle/photo tests.
- Tauri dev: command timed out because the dev app stays running, but process inspection confirmed `src-tauri\target\debug\tog5-vms.exe` and WebView2 processes launched. Project-specific dev processes were stopped afterward.

### Whether Tauri App Launched

- Native Tauri process launch: verified by process inspection.
- Visual desktop-window confirmation: still needs human confirmation because Codex cannot inspect the visible desktop window directly.

### Issues Encountered

- The native dev launch produced no useful console output before timeout, so process inspection was used to verify launch.
- `format:check` needed a script adjustment because `prettier --check .` failed on a symbolic-link workspace-root warning.
- The Tauri dialog plugin was briefly installed, then removed after choosing the simpler HTML file picker plus Rust app-data byte storage approach. No dialog dependency remains.
- Plain `npm` remains avoided; `npm.cmd` was used for Node commands.

### Decisions Made

- Did not change the existing initial migration because the Phase 2 vehicle/photo schema already supports the needed staged photo flow.
- Did not add a second migration for `sold_disposed` because vehicle status is stored as text without a database enum/check constraint.
- Used HTML file input plus Rust byte storage instead of native dialog path access to avoid relying on original user file paths.
- Kept feature selection out of Phase 4 UI; maintenance feature flags remain represented for future phases but are not part of the first vehicle workflow.
- Used soft archive only; no hard delete was implemented.

### Important Implementation Details

- `db::open_app_connection` initializes migrations and returns a configured SQLite connection for commands.
- Vehicle commands return user-safe string errors rather than raw SQLite errors.
- Repository list excludes `status = 'archived'` and rows with `archived_at` or `deleted_at`.
- Create/update links a staged photo by updating `vehicle_photos.vehicle_id` and `is_primary`.
- Vehicle photo previews use Tauri file URLs through `convertFileSrc`.
- Vehicle status now supports `active`, `under_maintenance`, `inactive`, `sold_disposed`, and `archived`.

### Known Issues / Technical Debt

- Human visual testing is still needed for the actual desktop window and the full add/edit/archive workflow.
- No archive filter or archived vehicle restore view exists yet.
- No vehicle feature selection UI exists yet.
- Large image handling is intentionally simple; there is no image compression or thumbnail generation yet.
- Orphan staged photo cleanup is not implemented if a user selects a photo but cancels before saving.
- No vehicle documents flow exists yet.

### Manual Checks Completed

- Confirmed project root.
- Inspected existing vehicle schema before editing.
- Confirmed no initial migration edit was required.
- Confirmed validation and build commands pass.
- Confirmed Tauri native process and WebView2 launched.
- Confirmed project-specific dev processes were stopped after validation.

### Suggested Next Step

Proceed to Phase 5: Maintenance Template Engine. Build template applicability rules and seed/default templates carefully, using the vehicle type, fuel type, transmission, drivetrain, and feature model without implementing full scheduling UI yet.

### Notes for ChatGPT Prompt Optimization

The next prompt should focus on the maintenance template engine and should account for the new vehicle repository/command pattern. It should keep vehicle CRUD stable, avoid fuel/alerts/reports scope, and ask Codex to include careful tests for diesel/gasoline/EV applicability exclusions before any scheduling work.

## Update 2026-06-26 00:01 +08:00 — Phase 4: Vehicle Module UX Polish

### Prompt / Task Given to Codex

Clean up the Vehicles page empty-state UX before Phase 5. Remove redundant Add vehicle buttons when no vehicles exist, update stale sidebar copy, avoid database/Rust/business behavior changes, validate the app, and update `specs/live-update.md`.

### Summary of Phase 4 UX Polish

- Hid the Vehicles page header Add vehicle button when there are no vehicles.
- Kept the empty-state card as the only Add vehicle action in the zero-vehicle state.
- Removed the Add vehicle button from the right-side Select a vehicle panel.
- Updated the Select a vehicle panel copy to explain that a profile appears after a vehicle is added or selected.
- Updated the sidebar note from stale Phase 1/static-scaffold wording to local MVP wording.
- Did not change vehicle CRUD behavior, database schema, Rust commands, maintenance templates, fuel logs, alerts, reports, backups, authentication, or scheduling.

### Files Changed

- `src/components/vehicles/VehicleModule.tsx` — adjusted empty-state/header button logic and simplified the no-selection panel.
- `src/components/common/SidebarNav.tsx` — updated the bottom sidebar note to short local MVP copy.
- `specs/live-update.md` — recorded this polish task and validation results.

### Commands Run

```bash
Get-Location
Get-Content -Raw -LiteralPath AGENTS.md
Get-Content -Raw -LiteralPath README.md
Get-Content -Raw -LiteralPath specs\live-update.md
Get-Content -Raw -LiteralPath src\components\vehicles\VehicleModule.tsx
Get-Content -Raw -LiteralPath src\components\common\AppLayout.tsx
Get-Content -Raw -LiteralPath src\components\common\SidebarNav.tsx
Get-Content -Raw -LiteralPath src\app\routes\PlaceholderPages.tsx
Get-Content -Raw -LiteralPath src\styles.css
npm.cmd exec prettier -- --write src/components/vehicles/VehicleModule.tsx src/components/common/SidebarNav.tsx
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:dev
Get-CimInstance Win32_Process
Stop-Process
git status --short
```

### Command Results

- TypeScript tests: pass. 1 file, 12 tests.
- Typecheck: pass.
- Lint: pass.
- Format check: pass.
- Frontend build: pass.
- Cargo check: pass.
- Cargo test: pass. 6 tests passed.
- Tauri dev: command timed out because the dev app stays running, but process inspection confirmed `src-tauri\target\debug\tog5-vms.exe` and WebView2 processes launched. Project-specific dev processes were stopped afterward.

### Whether Tauri Launched

- Native Tauri process launch: verified by process inspection.
- Visual desktop-window confirmation: still needs human confirmation because Codex cannot inspect the visible desktop window directly.

### Remaining Issues

- No code blocker remains for this polish task.
- Human visual confirmation should verify the no-vehicle state now shows only one Add vehicle button and that the sidebar note reads correctly.

### Suggested Next Step

Proceed to Phase 5: Maintenance Template Engine.

### Notes for ChatGPT Prompt Optimization

The next prompt can start Phase 5. Mention that Phase 4 vehicle UX polish removed redundant zero-state Add vehicle buttons and that vehicle CRUD/storage behavior should remain stable while maintenance template applicability work begins.

## Update 2026-06-26 02:16 +08:00 — Phase 4: Vehicle Photo Display Bugfix

### Prompt / Task Given to Codex

Fix the Phase 4 bug where vehicle photo files are written to the Tauri app-data `vehicle-photos` folder and vehicle records are created, but the pictures do not display in the Vehicles UI. Do not start Phase 5 or change vehicle workflow scope.

### Summary of the Photo-Display Bug

- Vehicle photo storage was working.
- Vehicle records were saving.
- Stored app-data image paths were returned to the frontend.
- The UI used `convertFileSrc`, but images did not display in the vehicle list/profile.

### Root Cause Found

- The database stores absolute Windows app-data paths such as `C:\Users\Darnocs\AppData\Roaming\com.tog5.vms\vehicle-photos\photo_...png`.
- `list_vehicles` and `get_vehicle` return that absolute path as `primaryPhotoPath`.
- The frontend passed the path into `convertFileSrc`.
- `src-tauri/tauri.conf.json` had `csp: null`, but did not enable Tauri's asset protocol or define a scope for app-data vehicle photos.
- Tauri v2 requires `app.security.assetProtocol.enable = true`, an allowed asset scope, and the Rust `tauri` dependency feature `protocol-asset`.

### Fix Made

- Enabled Tauri's local asset protocol in `src-tauri/tauri.conf.json`.
- Scoped asset access narrowly to `$APPDATA/vehicle-photos/**`.
- Added the `protocol-asset` feature to the Rust `tauri` dependency.
- Let Cargo update `Cargo.lock` with the required `http-range` dependency.
- Normalized Windows backslashes to forward slashes before calling `convertFileSrc`.
- Added image `onError` handling so a user-friendly fallback appears if a saved image cannot be displayed.
- Kept vehicle files in the app-data `vehicle-photos` folder.
- Did not change the database schema, vehicle CRUD behavior, original storage location, or Phase 5 scope.

### Files Changed

- `src-tauri/tauri.conf.json` — enabled local asset protocol and scoped it to app-data vehicle photos.
- `src-tauri/Cargo.toml` — added the `protocol-asset` Tauri feature.
- `src-tauri/Cargo.lock` — added `http-range` via Cargo for the asset protocol feature.
- `src/services/api/vehicles.ts` — normalized Windows paths before `convertFileSrc`.
- `src/components/vehicles/VehicleModule.tsx` — added image load failure fallback for list/profile photo frames.
- `src/styles.css` — styled the photo unavailable fallback state.
- `specs/live-update.md` — recorded this bugfix and validation results.

### Commands Run

```bash
Get-Location
Get-Content -Raw -LiteralPath AGENTS.md
Get-Content -Raw -LiteralPath README.md
Get-Content -Raw -LiteralPath specs\live-update.md
Get-Content -Raw -LiteralPath src-tauri\tauri.conf.json
Get-Content -Raw -LiteralPath src-tauri\src\vehicles\photo_storage.rs
Get-Content -Raw -LiteralPath src-tauri\src\vehicles\repository.rs
Get-Content -Raw -LiteralPath src-tauri\src\vehicles\models.rs
Get-Content -Raw -LiteralPath src-tauri\src\vehicles\commands.rs
Get-Content -Raw -LiteralPath src\components\vehicles\VehicleModule.tsx
Get-Content -Raw -LiteralPath src\services\api\vehicles.ts
Get-Content -Raw -LiteralPath src\styles.css
Get-ChildItem -Recurse -Filter *.sqlite3 -Path "$env:APPDATA\com.tog5.vms"
[System.IO.File]::ReadAllBytes(...) path scan for vehicle-photos values
npm.cmd exec prettier -- --write src-tauri/tauri.conf.json src/services/api/vehicles.ts src/components/vehicles/VehicleModule.tsx src/styles.css
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:dev
Get-CimInstance Win32_Process
Stop-Process
git status --short
```

### Command Results

- TypeScript tests: pass. 1 file, 12 tests.
- Typecheck: pass.
- Lint: pass.
- Format check: pass.
- Frontend build: initially had a transient Vite/Rollup sandbox path error, then passed on rerun.
- Rust format: pass.
- Rust format check: pass.
- Cargo check: initially failed because enabling the asset protocol requires the `protocol-asset` feature. After adding the feature, Cargo needed network access to fetch `http-range`; rerun with approval passed.
- Cargo test: pass. 6 tests passed.
- Tauri dev: first timeout was inconclusive and did not show `tog5-vms.exe`; a logged retry confirmed Vite started, Rust compiled, and `target\debug\tog5-vms.exe` launched. Project-specific dev processes were stopped afterward.

### Whether Tauri Launched

- Native Tauri process launch: verified by captured logs and process inspection.
- Visual desktop-window confirmation: still needs human confirmation because Codex cannot inspect the visible desktop window directly.

### Manual Checks Still Needed

1. Add a vehicle with a picture.
2. Confirm the picture appears in the vehicle list.
3. Confirm the picture appears in the profile panel.
4. Restart the app.
5. Confirm the picture still appears after restart.

### Remaining Issues

- No code blocker remains from this bugfix.
- The UI now shows a "Photo unavailable" fallback if an asset URL cannot be rendered.
- Manual visual confirmation is still needed to prove image rendering in the desktop window.

### Suggested Next Step

Proceed to Phase 5: Maintenance Template Engine after photo display is visually confirmed.

### Notes for ChatGPT Prompt Optimization

The next prompt should only begin Phase 5 after the user confirms vehicle photos display after add and restart. Phase 4 now uses Tauri's asset protocol with `$APPDATA/vehicle-photos/**` scope and the Rust `protocol-asset` feature.

## Update 2026-06-26 02:26 +08:00 — Phase 4: Vehicle Image Centering Polish

### Prompt / Task Given to Codex

Center vehicle images consistently inside their containers anywhere they appear in the Vehicle Module. Do not change vehicle CRUD behavior, Rust/Tauri commands, database schema, or start Phase 5.

### Summary of Image-Centering Polish

- Updated the shared Vehicle Module image CSS so images render as block elements.
- Added explicit centered object positioning for vehicle images.
- Kept `object-fit: cover`, full width/height, and clipped containers for list, profile, and add/edit preview images.
- Did not change vehicle persistence, photo storage, Tauri commands, or database schema.

### Files Changed

- `src/styles.css` — added `display: block` and `object-position: center center` to `.vehicle-photo-frame img`.
- `specs/live-update.md` — recorded this tiny Phase 4 polish task and validation results.

### Commands Run

```bash
Get-Location
Get-Content -Raw -LiteralPath AGENTS.md
Get-Content -Raw -LiteralPath README.md
Get-Content -Raw -LiteralPath specs\live-update.md
Get-Content -Raw -LiteralPath src\components\vehicles\VehicleModule.tsx
Get-Content -Raw -LiteralPath src\styles.css
npm.cmd exec prettier -- --write src/styles.css
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run tauri:dev
Get-CimInstance Win32_Process
Stop-Process
git status --short
```

### Command Results

- TypeScript tests: pass. 1 file, 12 tests.
- Typecheck: pass.
- Lint: pass.
- Format check: pass.
- Frontend build: pass.
- Tauri dev: pass through Vite startup, Rust compile, and `target\debug\tog5-vms.exe` process launch. Project-specific dev processes were stopped afterward.

### Whether Tauri Launched

- Native Tauri process launch: verified by captured logs and process inspection.
- Visual centered-image confirmation: still needs human confirmation because Codex cannot inspect the visible desktop window directly.

### Manual Visual Checks Still Needed

1. Confirm vehicle list images are centered in their small frames.
2. Confirm vehicle profile image is centered in its large frame.
3. Confirm add/edit form preview image is centered.
4. Confirm no image overflow or distortion beyond the intended crop.

### Suggested Next Step

Proceed to Phase 5: Maintenance Template Engine after the user confirms vehicle image alignment.

### Notes for ChatGPT Prompt Optimization

The next prompt can begin Phase 5 after visual confirmation that vehicle photos display and align correctly in list, profile, and form preview contexts.

## Update 2026-06-26 02:35 +08:00 — Phase 4: Vehicle Preview Image Centering Polish

### Prompt / Task Given to Codex

Continue Phase 4 UI polish. Vehicle photos save and display, and list thumbnails are centered, but the add/edit/details preview area crops or aligns square logo images poorly. Make vehicle images consistently centered everywhere, without changing CRUD, Rust/Tauri commands, database schema, or starting Phase 5.

### Summary of Vehicle Image-Centering Polish

- Inspected every Vehicle Module image usage:
  - vehicle list thumbnail
  - add vehicle form preview
  - edit vehicle form preview
  - vehicle profile/details image
  - photo unavailable fallback state
- Kept the shared `.vehicle-photo-frame img` base rule for width, height, block display, and centered object position.
- Split image fit behavior by frame size:
  - small thumbnails use `object-fit: cover` to keep the list frame filled.
  - large form/profile previews use `object-fit: contain` to show the full image centered without cropping logos or unusual aspect ratios.
- Kept image containers clipped, stable, and centered.

### Root Cause Found

- The prior shared image rule used `object-fit: cover` for all vehicle image frames.
- That works well for small list thumbnails, but it crops square, wide, or tall images in the larger form/profile preview frames.
- The square logo sample looked misaligned because the preview was filling a 4:3 frame by cropping instead of showing the full image.

### Files Changed

- `src/styles.css` — kept the shared centered image base rule, added `.vehicle-photo-frame.small img { object-fit: cover; }`, and added `.vehicle-photo-frame.large img { object-fit: contain; }`.
- `specs/live-update.md` — recorded this Phase 4 polish task and validation results.

### Commands Run

```bash
Get-Location
Get-Content -Raw -LiteralPath AGENTS.md
Get-Content -Raw -LiteralPath README.md
Get-Content -Raw -LiteralPath specs\live-update.md
Get-Content -Raw -LiteralPath src\components\vehicles\VehicleModule.tsx
Get-Content -Raw -LiteralPath src\styles.css
npm.cmd exec prettier -- --write src/styles.css
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run tauri:dev
Get-CimInstance Win32_Process
Stop-Process
git status --short
```

### Command Results

- TypeScript tests: pass. 1 file, 12 tests.
- Typecheck: pass.
- Lint: pass.
- Format check: pass.
- Frontend build: pass.
- Tauri dev: pass through Vite startup, Rust compile, and `target\debug\tog5-vms.exe` process launch. Project-specific dev processes were stopped afterward.

### Whether Tauri Launched

- Native Tauri process launch: verified by captured logs and process inspection.
- Visual centered-image confirmation: still needs human confirmation because Codex cannot inspect the visible desktop window directly.

### Manual Visual Checks Still Needed

1. Open Vehicles.
2. Add or edit a vehicle using a square logo image.
3. Confirm the list thumbnail remains centered.
4. Confirm the form preview is centered and shows the full image.
5. Confirm the profile/details image is centered and shows the full image.
6. Try a wide or tall image if available and confirm it still looks centered.

### Suggested Next Step

Proceed to Phase 5: Maintenance Template Engine only after the user confirms image alignment.

### Notes for ChatGPT Prompt Optimization

The next prompt can begin Phase 5 after the user confirms the list, form preview, and profile/detail vehicle images are visually centered. The image-fit decision is now thumbnail = cover, large preview/profile = contain.

## Update 2026-06-26 03:35 +08:00 — Phase 4: Targeted Vehicle Image Centering Polish

### Prompt / Task Given to Codex

Continue Phase 4 vehicle UI polish. The vehicle list thumbnail appears acceptable, but the add/edit/details preview image is still not vertically centered, especially with square logo-style images. Diagnose the actual image elements and selectors first, then make a targeted CSS/component fix. Do not start Phase 5.

### Summary of the Exact Image-Centering Issue

- Vehicle photo usages were inspected in `VehicleModule.tsx`:
  - List thumbnail: rendered through `<VehiclePhoto vehicle={vehicle} size="small" />`.
  - Form preview: rendered directly as `<img>` inside `className="vehicle-photo-frame large"`.
  - Profile/details image: rendered through `<VehiclePhoto vehicle={vehicle} size="large" />`.
  - Fallback state: rendered inside the same `vehicle-photo-frame` container.
- The form preview image had no image-specific class, so it depended only on broad `.vehicle-photo-frame img` selectors.
- The profile and form preview both used the generic `large` class, making the intended context less explicit.

### Root Cause Found

- The previous selectors were still too generic:
  - `.vehicle-photo-frame img`
  - `.vehicle-photo-frame.small img`
  - `.vehicle-photo-frame.large img`
- Large image elements filled the full frame box and relied on `object-fit: contain`; this should work in many cases, but it made the form/profile behavior hard to target and verify separately.
- The form preview used a bare `<img>` without a clear class such as `vehicle-photo-image`.
- There were no separate real classes for thumbnail, form preview, and profile image contexts.

### Fit Behavior by Vehicle Image Context

- Vehicle list thumbnail:
  - Frame class: `vehicle-photo-frame small vehicle-thumbnail-photo`
  - Image class: `vehicle-photo-image`
  - Fit behavior: `object-fit: cover`
  - Reason: small list thumbnails look better when the frame is filled.
- Add/edit form preview:
  - Frame class: `vehicle-photo-frame large vehicle-photo-preview`
  - Image class: `vehicle-photo-image`
  - Fit behavior: natural aspect ratio constrained with `max-width: 100%`, `max-height: 100%`, and `object-fit: contain`
  - Reason: square logos, wide images, and tall images should remain fully visible and centered.
- Vehicle profile/details image:
  - Frame class: `vehicle-photo-frame large vehicle-profile-photo`
  - Image class: `vehicle-photo-image`
  - Fit behavior: natural aspect ratio constrained with `max-width: 100%`, `max-height: 100%`, and `object-fit: contain`
  - Reason: larger display should show the whole stored photo, centered both ways.

### Fix Made

- Added explicit context classes in `VehicleModule.tsx`:
  - `vehicle-thumbnail-photo`
  - `vehicle-photo-preview`
  - `vehicle-profile-photo`
  - `vehicle-photo-image`
- Changed `.vehicle-photo-frame` from grid centering to flex centering:
  - `display: flex`
  - `align-items: center`
  - `justify-content: center`
  - `overflow: hidden`
- Kept thumbnails full-frame with:
  - `width: 100%`
  - `height: 100%`
  - `object-fit: cover`
  - `object-position: center center`
- Changed large preview/profile images to center the rendered image element itself:
  - `width: auto`
  - `height: auto`
  - `max-width: 100%`
  - `max-height: 100%`
  - `object-fit: contain`
  - `object-position: center center`
- Kept vehicle CRUD, photo storage, Rust/Tauri commands, database schema, and Phase 5 untouched.

### Files Changed

- `src/components/vehicles/VehicleModule.tsx` — added real context/image class names for thumbnail, form preview, and profile photo usage.
- `src/styles.css` — replaced broad image selectors with targeted context selectors and flex-centered frames.
- `specs/live-update.md` — recorded this targeted Phase 4 polish and validation results.

### Commands Run

```bash
Get-Location
Get-Content -Raw -LiteralPath AGENTS.md
Get-Content -Raw -LiteralPath README.md
Get-Content -Raw -LiteralPath specs\live-update.md
Get-Content -Raw -LiteralPath src\components\vehicles\VehicleModule.tsx
Get-Content -Raw -LiteralPath src\styles.css
Select-String -Path src\components\vehicles\VehicleModule.tsx -Pattern '<img|vehicle-photo-frame|VehiclePhoto'
Select-String -Path src\styles.css -Pattern 'vehicle-photo-frame|vehicle-photo-picker|object-fit|object-position'
npm.cmd exec prettier -- --write src/components/vehicles/VehicleModule.tsx src/styles.css
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run tauri:dev
Get-CimInstance Win32_Process
Stop-Process
git status --short
```

### Command Results

- TypeScript tests: pass. 1 file, 12 tests.
- Typecheck: pass.
- Lint: pass.
- Format check: pass.
- Frontend build: pass.
- Tauri dev: pass through Vite startup, Rust compile, and `target\debug\tog5-vms.exe` process launch. Project-specific dev processes were stopped afterward.

### Whether Tauri Launched

- Native Tauri process launch: verified by captured logs and process inspection.
- Visual image-centering confirmation: still needs human confirmation because Codex cannot inspect the visible desktop window directly.

### Manual Visual Checks Still Needed

1. Open Vehicles.
2. Use the square logo image again.
3. Confirm the vehicle list thumbnail still looks good.
4. Confirm the add/edit form preview is vertically centered.
5. Confirm the profile/details image is vertically centered.
6. Confirm the image is not awkwardly cropped in the larger preview/profile frame.
7. Try a wide or tall image if available and confirm it remains centered.

### Suggested Next Step

Proceed to Phase 5: Maintenance Template Engine only after the user confirms image alignment.

### Notes for ChatGPT Prompt Optimization

The next prompt can begin Phase 5 only after visual confirmation. Vehicle image classes are now context-specific: thumbnail uses `cover`; form preview and profile/detail use centered `contain` with natural image sizing inside a flex-centered frame.

---

## Update 2026-06-26 04:34 +08:00 — Phase 5: Maintenance Template Engine

### Prompt / Task Given to Codex

Implement Phase 5: Maintenance Template Engine. Build the default maintenance template library, idempotent seeding, applicability engine, typed Tauri commands, read-only maintenance preview UI, and tests. Do not implement full scheduling, completion logs, alerts, fuel logging, reports, backup, authentication, user roles, cloud features, or maintenance template editing.

### Confirmed Project Root

- `C:\Development Projects\TOG5-VMS`

### Summary of What Changed

- Added the Phase 5 maintenance template engine in Rust, including typed models, seed data, repository functions, rule evaluation, and Tauri commands.
- Added an idempotent default maintenance template library covering combustion, diesel, EV, hybrid, transmission, drivetrain, tire, brake, fluid, renewal, and feature-specific templates.
- Added a read-only Maintenance page preview that lists templates and shows applicability results for a selected vehicle.
- Added a migration for stable `maintenance_templates.template_key` seed identity without editing the Phase 2 initial schema.
- Updated startup setup to initialize the app database and seed maintenance templates safely.
- Added Rust tests for idempotent seeding and critical applicability rules.

### Maintenance Template Engine Approach

- Rust/Tauri owns template persistence and applicability evaluation, matching the existing database-owner pattern used for vehicles.
- The engine loads the selected vehicle profile plus enabled `vehicle_features`, then evaluates template rules by vehicle type, fuel type, transmission type, drivetrain, required feature, and excluded feature.
- Results include the template, applicability status, whether it is auto-applicable, a human-readable reason, warnings, and matched rule IDs.
- The frontend remains read-only and calls typed Tauri API wrappers instead of scattering raw `invoke(...)` calls in components.

### Seed / Default Template Approach

- Added `template_key` with a partial unique index in migration `002_maintenance_template_keys.sql`.
- Seeds are idempotent by `template_key`; rerunning the seed updates/replaces rules without creating duplicate templates.
- The default library includes engine oil, oil filter, air filter, fuel filter, spark plugs, glow plugs, diesel fuel filter/water separator, DEF/AdBlue, DPF, brakes, brake pads, brake fluid, tires, alignment, battery checks, coolant, transmission fluid, clutch, differential oil, transfer case fluid, cabin filter, wipers, registration, insurance, exhaust, timing belt/chain, turbocharger, hybrid battery, and EV battery checks.

### Applicability Rule Approach

- Universal templates such as brakes, tires, wipers, registration, and insurance apply broadly.
- Diesel vehicles do not auto-apply spark plug templates.
- Gasoline vehicles do not auto-apply DEF/AdBlue or DPF templates.
- Full EVs do not auto-apply combustion, exhaust, diesel, or fuel-system templates.
- Manual vehicles can receive clutch inspection; automatic/CVT/DCT vehicles do not.
- AWD/4WD vehicles can receive transfer case service; FWD/RWD vehicles do not automatically receive it.
- Feature-required templates, such as DEF/AdBlue, DPF, timing belt/chain, turbocharger, hybrid battery, and EV battery checks, are not auto-applied until the matching feature exists.
- Empty feature lists are safe: feature-required templates return `requires_feature` rather than becoming automatically applicable.

### Backend Commands Added

- `list_maintenance_templates`
- `get_applicable_maintenance_templates_for_vehicle`
- `seed_maintenance_templates`

### Frontend Maintenance Preview Added

- Replaced the Maintenance placeholder with a read-only template library and vehicle applicability preview.
- If vehicles exist, the page can select a vehicle and display applicable, excluded, not-applicable, and feature-required template results.
- The UI shows template name, category, priority, interval text, applicability status, reasons, and warnings.
- No maintenance scheduling, completion, alert generation, or template editing UI was added.

### Tests Added

- Added Rust maintenance repository tests for:
  - idempotent seed behavior
  - universal template applicability for gasoline and diesel vehicles
  - diesel vehicle exclusion from spark plugs
  - gasoline vehicle exclusion from DEF/AdBlue
  - full EV exclusion from combustion/diesel/fuel/exhaust templates
  - manual clutch applicability and automatic exclusion
  - AWD/4WD transfer case applicability and FWD exclusion
  - feature-required templates only applying when the matching feature exists
- No new TypeScript tests were needed because no frontend mapping helper logic was added beyond typed command wrappers.

### Files Created

- `src-tauri/migrations/002_maintenance_template_keys.sql` — adds stable template seed keys.
- `src-tauri/src/maintenance/mod.rs` — maintenance module entrypoint.
- `src-tauri/src/maintenance/models.rs` — typed maintenance template, rule, vehicle profile, and applicability response models.
- `src-tauri/src/maintenance/seeds.rs` — idempotent default maintenance template seed library.
- `src-tauri/src/maintenance/repository.rs` — template seeding, listing, applicability evaluation, and tests.
- `src-tauri/src/maintenance/commands.rs` — Tauri command handlers.
- `src/components/maintenance/MaintenanceTemplateModule.tsx` — read-only maintenance template library and applicability preview.
- `src/services/api/maintenance.ts` — typed frontend API wrapper for maintenance Tauri commands.

### Files Modified

- `src-tauri/src/db/mod.rs` — registered migration 2 and updated migration tests to expect both migrations.
- `src-tauri/src/lib.rs` — registered maintenance module, seeded templates during startup, and exposed maintenance commands.
- `src/app/routes/PlaceholderPages.tsx` — replaced the Maintenance placeholder route with the new read-only template module.
- `src/domain/maintenance/types.ts` — expanded maintenance task keys to cover the default template library.
- `src/styles.css` — added styles for the maintenance template preview and library.
- `specs/live-update.md` — recorded Phase 5 completion and updated current phase status.

### Files Deleted

- None.

### Commands Run

```bash
cargo check --manifest-path src-tauri/Cargo.toml
npm.cmd exec prettier -- --write src/components/maintenance/MaintenanceTemplateModule.tsx src/services/api/maintenance.ts src/app/routes/PlaceholderPages.tsx src/domain/maintenance/types.ts src/styles.css
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:dev
```

### Command Results

- Initial `cargo check --manifest-path src-tauri/Cargo.toml`: failed with Rust ownership error `E0505` in the maintenance applicability evaluator while returning a template after borrowing its rule list.
- Fix applied: cloned the template rules into a local vector before building borrowed rule filters, allowing the template response to move safely.
- `npm.cmd exec prettier -- --write ...`: passed and formatted new/modified frontend files.
- `npm.cmd run test`: passed, 1 Vitest file and 12 tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed; Vite production build completed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml`: passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- Final `cargo check --manifest-path src-tauri/Cargo.toml`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed, 14 Rust tests.
- First `npm.cmd run tauri:dev`: Vite started but Rust native compile was still in progress after the short wait; the dev process was stopped and retried with a longer window.
- Second `npm.cmd run tauri:dev`: Vite started, Rust compile finished, and `target\debug\tog5-vms.exe` launched. The process was stopped after validation.

### Whether Tauri Launched

- Tauri native process launch: verified by logs showing `Running target\debug\tog5-vms.exe`.
- Human visual confirmation is still needed because Codex cannot reliably inspect the visible desktop window.

### Issues Encountered

- A temporary Rust ownership issue appeared during applicability evaluation and was fixed before final validation.
- The first Tauri dev validation window was too short for native recompilation after adding the maintenance module; the second longer run reached app launch.
- Direct `npm` in PowerShell remains avoided; `npm.cmd` continues to work.

### Decisions Made

- Added a new migration instead of editing `001_initial_schema.sql`, preserving the existing migration history.
- Used stable `template_key` values for idempotent seed identity.
- Seeded templates at app startup so the read-only Maintenance page has data without requiring a user-facing admin workflow.
- Kept feature-required templates conservative while vehicle feature selection UI does not exist.
- Kept the Maintenance UI read-only and non-destructive for Phase 5.

### Important Implementation Details

- The startup path initializes the database, runs migrations, opens an app-data database connection, and seeds the default maintenance template library.
- Seed reruns replace rules for a seeded template, keeping rules current without duplicate rows.
- Applicability status values currently include `applicable`, `excluded`, `requires_feature`, and `not_applicable`.
- `requires_feature` is used for templates such as DEF/AdBlue, DPF, timing belt/chain, turbocharger, hybrid battery, and EV battery checks when the selected vehicle has no matching feature row.

### Known Issues / Technical Debt

- Vehicle feature selection UI is still not implemented, so feature-required templates will remain conditional for normal vehicles.
- The Maintenance page previews applicability only; it does not create schedules or alerts yet.
- Visual desktop confirmation and manual rule spot checks still need to be done by the human user.

### Manual Checks Completed

- Confirmed the working directory is `C:\Development Projects\TOG5-VMS`.
- Confirmed Phase 5 did not edit the initial migration directly.
- Confirmed validation commands pass after the ownership fix.
- Confirmed Tauri native process starts from `npm.cmd run tauri:dev`.

### Manual Visual Checks Still Needed

1. Open the Maintenance page.
2. Confirm the template library is visible.
3. Select an existing vehicle and confirm applicability results load.
4. Confirm diesel vehicles do not show spark plugs as auto-applicable.
5. Confirm gasoline vehicles do not show DEF/AdBlue as auto-applicable.
6. Confirm full EVs do not show combustion-engine maintenance as auto-applicable.
7. Confirm the Vehicle module still opens and vehicle photos remain visible and centered.

### Suggested Next Step

Proceed to Phase 6: Maintenance Scheduling and Alerts after the Maintenance page and key applicability results are visually confirmed.

### Notes for ChatGPT Prompt Optimization

The next prompt should start Phase 6 by using the seeded template library and applicability preview as the source for schedule creation. It should avoid editing seed rules unless a specific applicability bug is found, add vehicle feature UI only if Phase 6 needs it, and continue to keep scheduling separate from completion logs, fuel logs, reports, and backup behavior.

---

## Update 2026-06-26 05:07 +08:00 — Phase 6: Maintenance Scheduling and Alerts

### Prompt / Task Given to Codex

Implement Phase 6: Maintenance Scheduling and Alerts. Create vehicle-specific schedules from auto-applicable maintenance templates, calculate due soon / due today / overdue status by date and odometer, generate in-app maintenance alerts, enhance the Maintenance page with schedule sync/listing, replace the Alerts placeholder with real active alerts, and avoid service completion logs, fuel logging, reports, backup/restore, authentication, native notifications, cloud features, and OCR.

### Confirmed Project Root

- `C:\Development Projects\TOG5-VMS`

### Summary of What Changed

- Added vehicle-specific maintenance schedule generation from Phase 5 applicability results.
- Added backend due-status calculation by date and odometer with readable reason strings.
- Added idempotent active in-app maintenance alert generation for due soon, due today, and overdue schedules.
- Added a dismiss action for active alerts.
- Enhanced the Maintenance page with schedule sync, schedule cards, due status labels, thresholds, and alert refresh.
- Replaced the static Alerts placeholder with a real active-alert list.
- Added deterministic Rust tests for schedule generation, due status, and alerts.

### Schedule Generation Approach

- Schedules are created only from templates where Phase 5 applicability returns `is_auto_applicable = true` and `applicability_status = applicable`.
- Excluded, not-applicable, and feature-required templates do not create automatic schedules.
- Sync is idempotent: a partial unique index enforces one live schedule per vehicle/template, and existing schedules are preserved rather than duplicated.
- Initial `next_due_odometer` is calculated from the vehicle's current odometer plus the template odometer interval.
- Initial `next_due_date` is calculated from the local current date plus the template time interval.
- Templates with both date and odometer intervals track both targets.
- Registration and insurance schedules are created as `needs_setup` without invented renewal dates, because the user has not entered actual renewal dates yet.
- Archived vehicles cannot create new schedules.

### Due Status Approach

- Backend status values include `not_due`, `due_soon`, `due_today`, `overdue`, `needs_setup`, and `disabled`.
- Date logic:
  - after due date: `overdue`
  - same date: `due_today`
  - within threshold days: `due_soon`
- Odometer logic:
  - current odometer greater than or equal to next due odometer: `overdue`
  - within threshold kilometers: `due_soon`
- When both date and odometer apply, the more urgent status wins, with overdue taking priority.
- Reason strings include examples such as `Overdue by 250 km.`, `Due in 7 days.`, and `Needs setup: no due date or odometer target is set.`

### Alert Generation Approach

- Alerts are local in-app database records only; no OS notifications were added.
- Alert refresh recalculates schedule statuses first, then creates or updates active due soon / due today / overdue alerts.
- Active alert generation is idempotent through a partial unique index and repository checks.
- If a schedule is no longer due soon or overdue, active maintenance alerts for that schedule are resolved.
- If a due-soon alert becomes overdue, stale active alert types for the same schedule are resolved and the current alert type remains active.
- Dismissed alerts suppress the same alert type from being recreated immediately; later completion/reschedule behavior belongs to a future phase.

### Backend Commands Added

- `list_maintenance_schedules_for_vehicle`
- `sync_maintenance_schedules_for_vehicle`
- `refresh_maintenance_alerts_for_vehicle`
- `list_alerts`
- `dismiss_alert`

### Frontend Maintenance Schedule UI Added

- Added a Vehicle schedules section to the Maintenance page.
- Added `Create / sync schedules` for the selected vehicle.
- Added `Refresh alerts` for the selected vehicle.
- Schedule cards show template name, category, priority/status label, next due date, next due odometer, due reason, due soon thresholds, and setup notes.
- The existing applicability preview and default template library remain read-only.
- No complete-service, service history, schedule editing, or template editing UI was added.

### Frontend Alerts UI Added

- Replaced the static Alerts page examples with a real active alert list.
- Alerts show title, message, vehicle name, maintenance item, alert type, priority, status, and a dismiss button.
- The Alerts page includes a refresh button and friendly empty/loading/error states.

### Tests Added

- Added Rust tests for:
  - applicable templates creating schedules
  - excluded templates not creating schedules
  - feature-required templates not creating schedules without a feature
  - feature-required templates creating schedules when the feature exists
  - schedule sync idempotency
  - next due odometer from current odometer plus interval
  - next due date from today plus interval
  - legal renewals as `needs_setup` without invented dates
  - `not_due`, `due_soon`, `due_today`, `overdue`, and `needs_setup`
  - due soon by odometer
  - overdue by odometer
  - overdue winning over due soon
  - overdue alert creation
  - due soon alert creation
  - duplicate active alerts not being created on refresh
  - linked vehicle and schedule IDs stored on alerts
- No TypeScript tests were added because the new frontend logic is display and command orchestration, while calculation logic is covered in Rust.

### Files Created

- `src-tauri/migrations/003_maintenance_schedules_alerts_indexes.sql` — unique partial indexes for idempotent schedules and active alerts.
- `src-tauri/src/maintenance/scheduling.rs` — schedule generation, due-status calculation, alert generation/listing/dismissal, and tests.
- `src/components/alerts/AlertsModule.tsx` — real active in-app Alerts page.
- `src/services/api/alerts.ts` — typed frontend API wrapper for alert list/dismiss commands.

### Files Modified

- `src-tauri/src/db/mod.rs` — registered migration 3 and updated migration tests.
- `src-tauri/src/lib.rs` — exposed Phase 6 maintenance schedule and alert commands.
- `src-tauri/src/maintenance/commands.rs` — added command handlers for schedule and alert operations.
- `src-tauri/src/maintenance/mod.rs` — registered the scheduling module.
- `src-tauri/src/maintenance/models.rs` — added schedule, sync result, due evaluation, alert, and alert refresh response models.
- `src/app/routes/PlaceholderPages.tsx` — replaced the Alerts placeholder with `AlertsModule`.
- `src/components/maintenance/MaintenanceTemplateModule.tsx` — added schedule loading, sync, alert refresh, and schedule cards.
- `src/domain/maintenance/types.ts` — added `not_due` and `needs_setup` schedule statuses.
- `src/services/api/maintenance.ts` — added typed schedule and alert refresh command wrappers.
- `src/styles.css` — added schedule and active-alert UI styles.
- `specs/live-update.md` — recorded Phase 6 completion and updated current phase status.

### Files Deleted

- None.

### Commands Run

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml
npm.cmd exec prettier -- --write src/components/maintenance/MaintenanceTemplateModule.tsx src/components/alerts/AlertsModule.tsx src/services/api/maintenance.ts src/services/api/alerts.ts src/app/routes/PlaceholderPages.tsx src/domain/maintenance/types.ts src/styles.css specs/live-update.md
cargo check --manifest-path src-tauri/Cargo.toml
npm.cmd run typecheck
npm.cmd run test
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:dev
```

### Command Results

- `cargo fmt --manifest-path src-tauri/Cargo.toml`: passed.
- `npm.cmd exec prettier -- --write ...`: passed.
- First `cargo check --manifest-path src-tauri/Cargo.toml`: passed.
- First sandboxed `npm.cmd run typecheck`: failed because the Windows sandbox returned `helper_unknown_error: apply deny-read ACLs`; this was a sandbox/environment failure, not a TypeScript error.
- Escalated `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 1 Vitest file and 12 tests.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed, 23 Rust tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed; Vite production build completed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- Final `cargo check --manifest-path src-tauri/Cargo.toml`: passed.
- `npm.cmd run tauri:dev`: Vite started, Rust compile finished, and `target\debug\tog5-vms.exe` launched. The dev process was stopped after validation.

### Whether Tauri Launched

- Tauri native process launch: verified by logs showing `Running target\debug\tog5-vms.exe`.
- Human visual confirmation is still needed because Codex cannot reliably inspect the visible desktop window.

### Issues Encountered

- The sandboxed TypeScript check hit a Windows ACL helper error and was rerun successfully with escalation.
- Tauri dev required native recompilation and took about 42 seconds before launching the desktop binary.

### Decisions Made

- Added a new migration instead of editing existing migrations.
- Used database uniqueness plus repository checks for idempotent sync and alert refresh.
- Kept registration and insurance schedules as `needs_setup` rather than inventing due dates.
- Kept schedule editing out of Phase 6; thresholds are stored and displayed but not edited in the UI yet.
- Kept Dashboard static to avoid broadening the phase beyond Maintenance and Alerts.
- Implemented in-app alert dismissal but not snooze, OS notifications, or completion-based resolution.

### Important Implementation Details

- Schedule sync uses Phase 5 applicability results and only auto-schedules truly applicable templates.
- Feature-required templates remain unscheduled until the vehicle has the matching enabled feature.
- Due-status calculation is backend-owned and deterministic in tests.
- Alert refresh resolves stale active maintenance alerts when schedules are no longer due soon or overdue.
- Dismissed alerts are hidden from the active list and suppress immediate recreation of the same alert type.

### Known Issues / Technical Debt

- Vehicle feature selection UI still does not exist, so DPF/DEF/timing/turbo feature-required schedules require future vehicle-feature support.
- Schedule thresholds are not editable yet.
- No maintenance completion workflow exists yet, so completing service and recalculating next intervals are still future work.
- Alerts are in-app only; OS notifications are still future scope.
- Dashboard maintenance counts remain static placeholders.

### Manual Checks Completed

- Confirmed the working directory is `C:\Development Projects\TOG5-VMS`.
- Confirmed existing migrations were not edited.
- Confirmed all required frontend and Rust validation commands pass.
- Confirmed Tauri native process starts from `npm.cmd run tauri:dev`.

### Manual Visual Checks Still Needed

1. Open the Maintenance page.
2. Select an existing vehicle.
3. Use `Create / sync schedules`.
4. Confirm schedules appear for applicable templates.
5. Confirm excluded, not-applicable, and feature-required templates are not incorrectly scheduled.
6. Confirm due status labels and reasons appear.
7. Use `Refresh alerts`.
8. Open the Alerts page.
9. Confirm due soon / overdue alerts appear when schedule data is due.
10. Confirm the Vehicle module still opens.
11. Confirm vehicle photos still display and remain centered.

### Suggested Next Step

Proceed to Phase 7: Fuel Logging and Efficiency after the Maintenance schedule and Alerts pages are visually confirmed.

### Notes for ChatGPT Prompt Optimization

The next prompt should start Phase 7 with fuel log CRUD, receipt storage, odometer validation, full-tank official efficiency rules, fuel type mismatch warnings, and fuel-efficiency-drop alert groundwork. It should avoid maintenance completion logs, service history, reports, backup/restore, authentication, and dashboard rewrites unless explicitly requested.

---

## Update 2026-06-26 12:17 +08:00 — Phase 6: Maintenance Page Layout Refactor

### Prompt / Task Given to Codex

Implement the approved Maintenance Page Layout Refactor Plan. Convert the vertical Maintenance page into a compact tabbed workspace with one shared vehicle context and tabs for Schedules, Applicability, and Template Library. Keep this UI-only with no database, Rust/Tauri command, scheduling, or alert behavior changes.

### Summary of What Changed

- Replaced the three stacked Maintenance sections with one tabbed workspace.
- Set `Schedules` as the default active tab.
- Moved the vehicle selector, selected vehicle chips, `Create / sync schedules`, and `Refresh alerts` actions into a shared top context.
- Moved applicability results into an `Applicability` tab with simple summary counts.
- Moved the default template library into a `Template Library` tab grouped by category.
- Changed schedules from tall grid cards to denser row-style cards.

### Files Created

- None.

### Files Modified

- `src/components/maintenance/MaintenanceTemplateModule.tsx` — added local tab state, shared vehicle/action context, schedule/applicability/library panel components, summary counts, grouped template library, and denser schedule rows.
- `src/styles.css` — added workspace, tab, dense schedule row, applicability summary, grouped template library, and responsive rules.
- `specs/live-update.md` — recorded this Phase 6 UI polish task and validation results.

### Files Deleted

- None.

### Commands Run

```bash
npm.cmd exec prettier -- --write src/components/maintenance/MaintenanceTemplateModule.tsx src/styles.css
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run tauri:dev
```

### Command Results

- `npm.cmd exec prettier -- --write ...`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed; Vite production build completed.
- First `npm.cmd run tauri:dev`: failed because port `1420` was already in use by a leftover TOG5-VMS dev stack.
- Stopped only the confirmed TOG5-VMS leftover Node/Cargo/native dev processes and retried once.
- Second `npm.cmd run tauri:dev`: passed launch validation; Vite started and `target\debug\tog5-vms.exe` launched.

### Whether Tauri Launched

- Tauri native process launch: verified by logs showing `Running target\debug\tog5-vms.exe`.
- Human visual confirmation is still needed because Codex cannot reliably inspect the visible desktop window.

### Issues Encountered

- Port `1420` was occupied by leftover TOG5-VMS dev processes and was cleared before retrying.

### Decisions Made

- Kept this strictly UI-only.
- Did not change database schema, Rust/Tauri commands, maintenance scheduling logic, alert behavior, or template seed data.
- Prioritized the daily-use schedule view by making `Schedules` the default tab.

### Manual Visual Checks Still Needed

1. Open Maintenance.
2. Confirm `Schedules`, `Applicability`, and `Template Library` tabs switch correctly.
3. Confirm the vehicle selector and action buttons remain visible in the shared top context.
4. Confirm schedule sync still works.
5. Confirm applicability results still load.
6. Confirm template library groups are visible.
7. Check a narrow window for no overlap or horizontal overflow.

### Suggested Next Step

Proceed to Phase 7: Fuel Logging and Efficiency after the tabbed Maintenance layout is visually confirmed.

### Notes for ChatGPT Prompt Optimization

The Maintenance page is now a tabbed workspace rather than a vertical stack. Future prompts should preserve the shared vehicle context and default `Schedules` tab unless the user requests a broader maintenance redesign.

---

## Update 2026-06-26 12:33 +08:00 — Phase 6: Maintenance Card Consistency Polish

### Prompt / Task Given to Codex

Implement the Maintenance Card Consistency Refinement Plan. Make the Applicability tab visually consistent with the denser horizontal cards used by Schedules and the compact Template Library cards. Keep the change UI-only with no database, Rust/Tauri command, scheduling, alert, or template rule behavior changes.

### Summary of What Changed

- Changed the Applicability tab from the tall 3-column template grid to a compact row/list layout.
- Reused the existing `MaintenanceTemplateCard` with a compact row variant for Applicability.
- Kept applicability summary counts at the top.
- Kept Template Library grouped by category while sharing the same compact card structure.
- Added responsive CSS so Applicability rows collapse cleanly on narrower windows.

### Files Created

- None.

### Files Modified

- `src/components/maintenance/MaintenanceTemplateModule.tsx` — changed Applicability rendering to use a list layout and compact template cards; added a shared template-card main content wrapper.
- `src/styles.css` — added compact applicability list/card styling and responsive single-column behavior.
- `specs/live-update.md` — recorded this Phase 6 UI consistency polish and validation results.

### Files Deleted

- None.

### Commands Run

```bash
npm.cmd exec prettier -- --write src/components/maintenance/MaintenanceTemplateModule.tsx src/styles.css
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run tauri:dev
```

### Command Results

- `npm.cmd exec prettier -- --write ...`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- First `npm.cmd run build`: failed with a transient Vite/Rollup emitted `index.html` path error.
- Second `npm.cmd run build`: passed; Vite production build completed.
- First `npm.cmd run tauri:dev`: failed because port `1420` was already in use by a leftover TOG5-VMS dev stack.
- Stopped only the confirmed TOG5-VMS leftover Node/Cargo/native dev processes and retried once.
- Second `npm.cmd run tauri:dev`: passed launch validation; Vite started and `target\debug\tog5-vms.exe` launched.

### Whether Tauri Launched

- Tauri native process launch: verified by logs showing `Running target\debug\tog5-vms.exe`.
- Human visual confirmation is still needed because Codex cannot reliably inspect the visible desktop window.

### Issues Encountered

- A transient Vite build path error occurred once and passed on rerun.
- Port `1420` was occupied by leftover TOG5-VMS dev processes and was cleared before retrying.

### Decisions Made

- Kept this strictly UI-only.
- Did not change database schema, Rust/Tauri commands, scheduling logic, alert behavior, template rules, or seed data.
- Used the same compact card component for Applicability and Template Library so Maintenance tabs feel visually consistent.

### Manual Visual Checks Still Needed

1. Open Maintenance.
2. Switch to Applicability.
3. Confirm applicability template rows look compact and horizontal rather than tall.
4. Confirm Schedules and Template Library still look good.
5. Confirm tabs, vehicle selector, and action buttons still work.
6. Check a narrow window for no overlap or horizontal overflow.

### Suggested Next Step

Proceed to Phase 7: Fuel Logging and Efficiency after the Maintenance card consistency polish is visually confirmed.

### Notes for ChatGPT Prompt Optimization

The Maintenance tabs now share a compact visual language. Future Maintenance UI prompts should preserve the horizontal row pattern for dense operational lists and avoid returning Applicability to the old tall grid.

---

## Update 2026-06-26 12:58 +08:00 — Phase 7: Fuel Logging and Efficiency

### Prompt / Task Given to Codex

Implement Phase 7: Fuel Logging and Efficiency. Add fuel log CRUD, local receipt storage, odometer validation, fuel-type compatibility warnings, official full-tank fuel-efficiency calculation, basic fuel-efficiency-drop alert groundwork, a real Fuel Logs page, tests, validation, and update `specs/live-update.md`.

### Confirmed Project Root

- `C:\Development Projects\TOG5-VMS`

### Fuel Log Approach

- Added a Rust `fuel` module with typed Tauri commands, models, repository functions, receipt storage helpers, and tests.
- Used the existing `fuel_logs` table; no schema migration was needed.
- Fuel logs are soft archived through `fuel_logs.deleted_at`.
- Vehicle odometer is advanced when a saved fuel log has a higher odometer reading.
- The frontend Fuel Logs page uses one shared vehicle selector, an add/edit form, and a compact fuel history list.

### Receipt / Local File Approach

- Fuel receipts are copied into the Tauri app-data `fuel-receipts/` folder.
- Receipt metadata is stored in `vehicle_documents` with `document_type = 'fuel_receipt'`.
- Fuel logs link to receipts through the existing `fuel_logs.receipt_document_id` field.
- Supported receipt types: PNG, JPG/JPEG, WEBP, and PDF.
- Receipt size limit: 10 MB.
- No OCR, cloud upload, or remote file handling was added.

### Fuel Efficiency Calculation Approach

- Official efficiency is recalculated for active fuel logs after create, update, or archive.
- Official km/L is calculated only when the current log is full tank, there is a previous full-tank fuel log for the same vehicle, current odometer is higher, liters are valid, and the log is not DEF/AdBlue.
- Stored calculated values use the existing `computed_km_per_liter`, `computed_l_per_100km`, and `computed_cost_per_km` columns.
- Partial tank logs save successfully but stay `not_computed`.
- First full-tank logs save successfully but wait for the next valid full-tank log.

### Fuel Type Warning Approach

- Fuel type mismatch returns a warning, not a hard failure.
- DEF/AdBlue can be saved as a fluid entry but is not counted as diesel fuel consumption or official fuel efficiency.
- Diesel and hybrid-diesel vehicles accept DEF/AdBlue as compatible fluid entries while still warning that it is not fuel consumption.

### Alert Groundwork

- Added conservative local fuel-efficiency-drop detection.
- If at least three previous official efficiency logs exist and the latest official km/L is more than 20% below the recent average, the backend creates or updates one active `fuel_efficiency_drop` in-app alert.
- If the drop is no longer present, active fuel-efficiency-drop alerts for that vehicle are resolved.
- No OS notifications, email, push, or telemetry were added.

### Backend Commands Added

- `list_fuel_logs_for_vehicle`
- `get_fuel_log`
- `create_fuel_log`
- `update_fuel_log`
- `archive_fuel_log`
- `store_fuel_receipt`
- `get_fuel_efficiency_summary_for_vehicle`

### Frontend Fuel Logs UI Added

- Replaced the Fuel Logs placeholder with a real Fuel Logs module.
- Added vehicle selector and selected vehicle chips.
- Added add/edit fuel log form.
- Added local receipt attachment input.
- Added fuel history list with date/time, odometer, fuel type, liters, price per liter, total amount, full-tank status, official efficiency status, km/L, cost/km, receipt indicator/link, warnings, edit, and archive actions.
- Added fuel summary cards for official log count, latest km/L, recent average, and efficiency-drop status.

### Tests Added

- Rust repository tests for create/list/update/archive fuel logs.
- Rust tests for odometer rollback rejection.
- Rust tests for partial tank, first full tank, and second full tank official km/L calculation.
- Rust tests for cost/km calculation.
- Rust tests for DEF/AdBlue non-computation.
- Rust tests for fuel type mismatch warning.
- Rust tests for receipt metadata linking.
- Rust test for conservative efficiency-drop summary and in-app alert creation.
- Rust receipt storage test using a temp folder.

### Files Created

- `src-tauri/src/fuel/mod.rs` — fuel module registration.
- `src-tauri/src/fuel/models.rs` — typed fuel, receipt, warning, and summary models.
- `src-tauri/src/fuel/receipt_storage.rs` — app-data receipt file storage and validation.
- `src-tauri/src/fuel/repository.rs` — fuel log repository, validation, efficiency calculations, warnings, alerts, and tests.
- `src-tauri/src/fuel/commands.rs` — Tauri command handlers.
- `src/components/fuel/FuelLogsModule.tsx` — real Fuel Logs UI.
- `src/services/api/fuel.ts` — typed frontend Tauri API wrapper for fuel commands.

### Files Modified

- `src-tauri/src/lib.rs` — registered the fuel module and fuel Tauri commands.
- `src/app/routes/PlaceholderPages.tsx` — replaced Fuel Logs placeholder with `FuelLogsModule`.
- `src/components/alerts/AlertsModule.tsx` — added friendly display handling for fuel-efficiency-drop alerts.
- `src/domain/fuel/types.ts` — widened fuel validation input numeric fields to `unknown` so the UI can safely pass not-yet-valid form values into validation helpers.
- `src/styles.css` — added Fuel Logs workspace, form, summary, warning, and history list styles.
- `specs/live-update.md` — updated current phase status and recorded this Phase 7 entry.

### Files Deleted

- None.

### Commands Run

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml
npm.cmd run typecheck
cargo check --manifest-path src-tauri/Cargo.toml
npm.cmd run lint
npm.cmd run test
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run format:check
npm.cmd run build
npm.cmd exec prettier -- --write src/components/fuel/FuelLogsModule.tsx src/services/api/fuel.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run test
npm.cmd run build
npm.cmd run tauri:dev
```

### Command Results

- `cargo fmt --manifest-path src-tauri/Cargo.toml`: passed.
- `npm.cmd run typecheck`: passed before and after formatting.
- `cargo check --manifest-path src-tauri/Cargo.toml`: passed.
- `npm.cmd run lint`: passed before and after formatting.
- `npm.cmd run test`: passed before and after formatting; 1 Vitest file, 12 tests passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed; 31 Rust tests passed.
- First `npm.cmd run format:check`: failed because two new TypeScript files needed Prettier formatting.
- `npm.cmd exec prettier -- --write src/components/fuel/FuelLogsModule.tsx src/services/api/fuel.ts`: passed.
- Second `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed; Vite production build completed.
- First sandboxed `npm.cmd run tauri:dev`: reached the native app binary but failed during setup with `Could not configure SQLite connection: unable to open database file` because the sandbox blocked app-data SQLite access.
- Escalated `npm.cmd run tauri:dev`: passed launch validation; Vite started and logs showed `Running target\debug\tog5-vms.exe`.
- Cleanup check confirmed no process was left listening on port `1420`.

### Whether Tauri Launched

- Tauri native process launch: verified by escalated logs showing `Running target\debug\tog5-vms.exe`.
- Human visual confirmation is still needed because Codex cannot reliably inspect the visible desktop window.

### Issues Encountered

- The managed sandbox blocked the Tauri app from opening the SQLite database in the Windows app-data directory during the first dev launch. Rerunning with escalation fixed this validation issue.
- Prettier check initially failed for the two new TypeScript files and passed after formatting them.

### Decisions Made

- No database migration was added because the existing `fuel_logs`, `vehicle_documents`, and `alerts` schema supports Phase 7.
- Used `vehicle_documents` rather than a new receipt table for fuel receipt metadata.
- Used backend recalculation after fuel mutations so official efficiency values stay consistent after edits and archives.
- Implemented conservative efficiency-drop alert creation only when there is enough official history.
- Left Dashboard fuel cards static to avoid scope creep.

### Important Implementation Details

- Odometer rollback is a backend hard error until a future admin override workflow exists.
- The frontend also warns before save when the odometer is below the latest fuel log reading for the selected vehicle.
- Price per liter or total amount can be calculated from the other value when liters are valid.
- Receipt files are local-only and app-managed; the app does not depend on the original selected file path after save.
- Fuel logs use centralized frontend API wrappers instead of raw `invoke(...)` calls in the UI.

### Known Issues / Technical Debt

- Human visual testing is still needed for the Fuel Logs screen and receipt link behavior.
- Receipt attachments are stored and linked, but there is no dedicated document viewer yet.
- Fuel-efficiency-drop alerting is intentionally conservative and text-based; no reports or charts were added.
- No admin odometer override UI exists yet.
- No dashboard fuel/alert real-data rollup was added in this phase.

### Manual Checks Completed

- Confirmed project root.
- Inspected existing fuel schema and verified no migration was required.
- Confirmed app-data launch needs escalation in Codex because SQLite lives outside the workspace sandbox.
- Confirmed no leftover process was listening on port `1420` after Tauri dev cleanup.

### Manual Visual Checks Still Needed

1. Open Fuel Logs.
2. Confirm the vehicle selector works.
3. Add a partial tank log and confirm it saves without official efficiency.
4. Add a first full-tank log and confirm it waits for the next full-tank log.
5. Add a second full-tank log and confirm km/L is calculated correctly.
6. Attach a PNG/JPG/WEBP/PDF receipt and confirm it is shown in the fuel history.
7. Try a mismatched fuel type and confirm a warning appears.
8. Save DEF/AdBlue and confirm it is not shown as diesel fuel efficiency.
9. Confirm edit and archive actions work.
10. Confirm Vehicles, Maintenance tabs, and Alerts still open.

### Suggested Next Step

Proceed to Phase 8: Maintenance Completion and Service History after Fuel Logs receive a quick human visual check.

### Notes for ChatGPT Prompt Optimization

Phase 8 prompts should treat Fuel Logs as implemented and should avoid changing fuel behavior unless a user-reported bug appears. The most useful next focus is completing maintenance schedules into service history records while preserving the existing Maintenance tab layout and Fuel Logs receipt/file strategy.

---

## Update 2026-06-26 13:13 +08:00 — Phase 7 UI Polish: Fuel Log Form Layout

### Prompt / Task Given to Codex

Implement the Fuel Log Form Layout Polish Plan. Restructure the Fuel Logs add/edit form so the date/time input no longer collides with the odometer input, while keeping the change UI-only with no backend, schema, validation, fuel calculation, receipt storage, or command changes.

### Summary of What Changed

- Replaced the top generic two-column fuel form grid with explicit form rows.
- Made Date and time span its own full row so the browser datetime control has enough width.
- Kept Odometer and Fuel type as a balanced two-column row.
- Grouped Liters, Price per liter, and Total amount into a compact three-column row on wider screens.
- Kept Station name and Receipt number in a two-column row.
- Styled the Full tank checkbox as a cleaner inline control.
- Added responsive CSS so fuel form rows collapse to one column on narrower windows.

### Files Created

- None.

### Files Modified

- `src/components/fuel/FuelLogsModule.tsx` — reorganized the Fuel Logs form markup into purpose-built rows without changing state, validation, or submit behavior.
- `src/styles.css` — added scoped Fuel Logs row layout classes and responsive collapse behavior.
- `specs/live-update.md` — recorded this Phase 7 UI polish and validation results.

### Files Deleted

- None.

### Commands Run

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run tauri:dev
```

### Command Results

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- First `npm.cmd run tauri:dev`: failed because port `1420` was already in use.
- Confirmed no process remained listening on port `1420` after cleanup.
- Retried `npm.cmd run tauri:dev`: passed launch validation; Vite started and logs showed `Running target\debug\tog5-vms.exe`.

### Whether Tauri Launched

- Tauri native process launch: verified by logs showing `Running target\debug\tog5-vms.exe`.
- Human visual confirmation is still needed because Codex cannot reliably inspect the visible desktop window.

### Issues Encountered

- Port `1420` was occupied on the first launch attempt and was clear before the retry.
- No TypeScript, lint, formatting, or build errors remained.

### Decisions Made

- Kept this strictly UI-only.
- Did not change Rust/Tauri commands, database schema, fuel validation, fuel calculation, receipt storage, alert behavior, or CRUD behavior.
- Used structured form rows rather than just increasing grid spacing, because the browser datetime input needs a more reliable layout.

### Manual Visual Checks Still Needed

1. Open Fuel Logs.
2. Confirm the Date and time input no longer touches or overlaps Odometer.
3. Confirm the form looks balanced at the screenshot width.
4. Confirm the add/edit fuel log flow still works.
5. Resize to a narrow window and confirm fields stack cleanly without overlap.

### Suggested Next Step

Proceed to Phase 8: Maintenance Completion and Service History after the Fuel Log form layout is visually confirmed.

### Notes for ChatGPT Prompt Optimization

Future Fuel Logs UI polish should keep the purpose-built form row structure. Avoid returning the top fuel-entry fields to a generic two-column grid because `datetime-local` controls can render wider than expected.

---

## Update 2026-06-26 17:20 +08:00 — Phase 8: Maintenance Completion and Service History

### Prompt / Task Given to Codex

Implement Phase 8: Maintenance Completion and Service History. Allow completing maintenance schedules, creating service history records, recalculating next due date/odometer, resolving related active maintenance alerts, supporting local maintenance receipt/photo storage, adding Maintenance completion UI, replacing the Service History placeholder, adding tests, running validation, and updating `specs/live-update.md`.

### Confirmed Project Root

- `C:\Development Projects\TOG5-VMS`

### Maintenance Completion Approach

- Added a focused Rust service-history implementation inside the existing maintenance module.
- Completing a schedule inserts a `maintenance_logs` record using the existing schema.
- Completion updates the existing `maintenance_schedules` row instead of deleting or recreating schedules.
- Completion date and work performed are required.
- Completion odometer is optional; if omitted, the current vehicle odometer is used for the maintenance log.
- Completion odometer must be finite, non-negative, and not lower than the schedule's previous completed odometer.
- Vehicle current odometer is advanced when the completion odometer is higher.

### Service History Approach

- Replaced the Service History placeholder with a real local service-history page.
- Service History uses a vehicle selector and lists completed maintenance records newest first.
- Service history records show date, odometer, maintenance item, work performed, parts, costs, provider, warranty date, next recommended date/odometer, notes, and receipt/photo indicators.
- Editing and archiving service history were deferred to avoid expanding Phase 8 beyond completion and display.

### Next-Due Recalculation Approach

- If the related template has a time interval, `next_due_date` is calculated from completion date plus the template interval.
- If the related template has an odometer interval, `next_due_odometer` is calculated from completion odometer plus the template interval.
- Templates with both intervals store both next due values and keep the existing due-status behavior.
- Legal/setup-needed schedules can create service history, but only safe template intervals are used for next due values.

### Alert Resolution Approach

- Completing a schedule resolves active maintenance alerts linked to that schedule.
- The implementation reuses the existing maintenance alert resolution behavior and does not resolve unrelated alerts.
- Fuel-efficiency-drop alerts remain untouched.
- The existing alert refresh flow can recreate an appropriate alert later if unusual completion input still leaves a schedule due soon or overdue.

### Receipt / Photo Local File Approach

- Added app-managed maintenance receipt storage under `maintenance-receipts/`.
- Added app-managed maintenance photo storage under `maintenance-photos/`.
- Receipts support PNG, JPG/JPEG, WEBP, and PDF.
- Before/after photos support PNG, JPG/JPEG, and WEBP.
- Maintenance files are limited to 10 MB.
- Maintenance receipts use `vehicle_documents` with `document_type = 'maintenance_receipt'`.
- Maintenance before/after photos use `vehicle_photos` with `is_primary = 0`.
- No OCR, upload, cloud, or remote file behavior was added.

### Backend Commands Added

- `complete_maintenance_schedule`
- `list_service_history_for_vehicle`
- `get_maintenance_log`
- `store_maintenance_receipt`
- `store_maintenance_photo`

### Frontend Maintenance Completion UI Added

- Added a `Complete` action to each schedule card in the existing Maintenance `Schedules` tab.
- Added an inline completion panel while preserving the tabbed Maintenance workspace and `Schedules` as the default tab.
- Completion panel collects completion date, odometer, work performed, parts, labor cost, parts cost, total cost, service provider, warranty date, notes, receipt, before photo, and after photo.
- After completion, schedules and alerts are refreshed and a success message is shown.
- Applicability and Template Library tabs remain unchanged.

### Frontend Service History UI Added

- Added `ServiceHistoryModule`.
- Replaced the Service History placeholder route with the real service history module.
- Added service-history layout styles consistent with Maintenance/Fuel card patterns.

### Tests Added

- Rust tests for completing a schedule and creating a maintenance log.
- Rust tests for updating last completed date and odometer.
- Rust tests for recalculating next due date and odometer from template intervals.
- Rust tests for resolving active maintenance alerts linked to the completed schedule.
- Rust tests confirming unrelated `fuel_efficiency_drop` alerts remain active.
- Rust tests for rejecting completion odometer lower than previous completed odometer.
- Rust tests for listing service history newest first.
- Rust tests for maintenance receipt/photo local storage.

### Files Created

- `src-tauri/src/maintenance/file_storage.rs` — local maintenance receipt/photo storage helpers and tests.
- `src-tauri/src/maintenance/service_history.rs` — maintenance completion, service history repository functions, attachment linking, alert resolution, and tests.
- `src/components/serviceHistory/ServiceHistoryModule.tsx` — real Service History page UI.

### Files Modified

- `src-tauri/src/lib.rs` — registered Phase 8 Tauri commands.
- `src-tauri/src/maintenance/mod.rs` — added `file_storage` and `service_history` modules.
- `src-tauri/src/maintenance/models.rs` — added completion, service history, and maintenance attachment types.
- `src-tauri/src/maintenance/commands.rs` — added completion, service history, receipt, and photo commands.
- `src-tauri/src/maintenance/scheduling.rs` — exposed maintenance alert resolution for completion flow reuse.
- `src/services/api/maintenance.ts` — added typed frontend API wrappers and file URL helper for Phase 8 commands.
- `src/components/maintenance/MaintenanceTemplateModule.tsx` — added schedule completion action and inline completion panel.
- `src/app/routes/PlaceholderPages.tsx` — replaced Service History placeholder with `ServiceHistoryModule`.
- `src/styles.css` — added completion panel and service history styles.
- `specs/live-update.md` — updated current phase status and recorded this Phase 8 entry.

### Files Deleted

- None.

### Commands Run

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:dev
```

### Command Results

- `cargo fmt --manifest-path src-tauri/Cargo.toml`: passed.
- `npm.cmd run test`: passed; 1 Vitest file, 12 tests passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed; Vite production build completed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `cargo check --manifest-path src-tauri/Cargo.toml`: passed.
- First `cargo test --manifest-path src-tauri/Cargo.toml`: initially failed due test expectations that did not match existing seed intervals/title casing, and once timed out while waiting on a parallel Cargo build lock.
- Final `cargo test --manifest-path src-tauri/Cargo.toml`: passed; 36 Rust tests passed.
- `npm.cmd run tauri:dev`: passed launch validation with escalation for app-data SQLite access; logs showed `Running target\debug\tog5-vms.exe`.
- Confirmed no process remained listening on port `1420` after cleanup.

### Whether Tauri Launched

- Tauri native process launch: verified by logs showing `Running target\debug\tog5-vms.exe`.
- Human visual confirmation is still needed because Codex cannot reliably inspect the visible desktop window.

### Issues Encountered

- The run was interrupted by usage limits mid-validation, but no file edit was cut off and the repository remained coherent.
- New Rust tests originally expected a 180-day/10,000 km oil interval title differently than the existing seed data. Expectations were corrected to the actual seed behavior: 180 days, 5,000 km, and `Engine Oil Change`.
- One `cargo test` attempt timed out because it waited on a Cargo build lock from a parallel `cargo check`; rerunning alone passed.

### Decisions Made

- No migration was added because the existing `maintenance_logs`, `maintenance_schedules`, `vehicle_documents`, `vehicle_photos`, and `alerts` schema supports the Phase 8 workflow.
- Used existing `maintenance_logs.mechanic_shop`, cost, receipt, before/after photo, warranty expiration, and next recommended fields.
- Deferred warranty odometer and warranty notes because the current schema has no dedicated columns and adding a migration was not necessary for the core Phase 8 workflow.
- Deferred service-history edit/archive flows to keep Phase 8 focused.
- Did not create expense records from maintenance costs.

### Important Implementation Details

- Completion preserves schedule identity.
- Completion date is used as the base for time-based next due calculation.
- Completion odometer, or current vehicle odometer if omitted, is used as the base for odometer-based next due calculation.
- Related active maintenance alerts are resolved during completion.
- Unrelated fuel alerts remain active.
- Maintenance attachments are copied into app-managed folders and the database stores only local references/metadata.

### Known Issues / Technical Debt

- Human visual testing is needed for the completion panel and Service History page.
- Service history edit/archive is not implemented yet.
- Warranty until odometer and warranty notes are not represented as dedicated fields.
- Costs are stored on service history but not connected to the future Expenses module.
- There is no dedicated receipt/photo viewer beyond local file links.

### Manual Checks Completed

- Confirmed project root.
- Inspected existing Phase 2 schema and verified no migration was needed.
- Confirmed Tauri launch needs escalation in Codex because SQLite lives in app data outside the workspace sandbox.
- Confirmed no leftover process was listening on port `1420` after Tauri dev cleanup.

### Manual Visual Checks Still Needed

1. Open Maintenance.
2. Confirm `Schedules` is still the default tab.
3. Complete a schedule.
4. Confirm a service history record is created.
5. Confirm schedule next due date/odometer updates.
6. Confirm related maintenance alerts resolve.
7. Open Service History.
8. Confirm vehicle selector works.
9. Confirm completed service appears.
10. Confirm receipt/photo indicators or links work if attachments were used.
11. Confirm Vehicles, Fuel Logs, Alerts, Applicability, and Template Library still open.

### Suggested Next Step

Proceed to Phase 9: Expenses and Reports after completing the Phase 8 visual checks.

### Notes for ChatGPT Prompt Optimization

Phase 9 prompts should treat maintenance costs as stored in service history but not yet linked to expenses. The next useful step is to design the Expenses module so it can optionally relate to fuel logs, maintenance logs, and repair records without duplicating service-history data.

## Phase 8 Cutoff Recovery Verification - 2026-06-26 17:27 +08:00

Codex resumed after a usage cutoff and verified that no file edit was left half-applied. The project root was reconfirmed as `C:\Development Projects\TOG5-VMS`.

Additional commands run after resuming:

- `npm.cmd run format:check` - Passed after the `live-update.md` edit.
- `git status --short` - Showed expected Phase 8 modified/new files only.
- `git diff --stat` - Confirmed Phase 8 changes were scoped to maintenance completion, service history, maintenance APIs/UI, styles, and live update notes.
- `npm.cmd run test` - Passed, 1 Vitest file / 12 tests.
- `npm.cmd run typecheck` - Passed.
- `npm.cmd run lint` - Passed.
- `npm.cmd run build` - Passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check` - Passed.
- `cargo check --manifest-path src-tauri/Cargo.toml` - Passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` - Passed, 36 Rust tests.
- `npm.cmd run tauri:dev` - Retried after clearing leftover TOG5-VMS dev server processes. The final run started `tog5-vms.exe` and WebView2, confirming Tauri launch. Codex then stopped the dev process tree and confirmed port `1420` was clear.

Notes:

- One hidden redirected Tauri launch attempt returned `STATUS_DLL_INIT_FAILED`; a normal launch path then succeeded after clearing stale Vite/Tauri processes.
- Human visual confirmation is still needed for the Maintenance completion form and Service History page.

## Update 2026-06-26 17:47 +08:00 - Phase 9: Expenses and Reports

### Prompt / Task Given to Codex

Implement Phase 9: local expense tracking and useful MVP reports. Add an Expenses page, replace the Reports placeholder with real local summaries, connect expenses safely to vehicles and optional source records, aggregate fuel/service/repair/manual costs without obvious duplicate counting, preserve completed modules, and update this file.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Expenses Approach

- Added a focused Rust `expenses` module using the existing `expenses` table.
- Manual expenses require vehicle, date, category, description, and non-negative finite amount.
- Expenses can optionally link to `fuel_log`, `maintenance_log`, `repair_record`, or `other` records.
- Soft archive uses the existing `deleted_at` column.
- Existing schema was sufficient; no new migration was added.

### Reports Approach

- Added backend report aggregation for:
  - total tracked cost
  - fuel total
  - maintenance/service total
  - repair total
  - manual expenses total
  - cost by category
  - monthly totals
  - recent cost events
  - vehicle cost summaries
  - selected vehicle cost report
- Reports support optional vehicle and date-range filters.
- Reports are read-only; no CSV/PDF/Excel export was added in this phase.

### Cost Aggregation / Double-Counting Prevention Approach

- Fuel costs are read from `fuel_logs.total_amount`.
- Maintenance/service costs are read from `maintenance_logs.total_cost`.
- Repair costs are read from `repair_records.total_cost`.
- Manual expenses are read from `expenses.amount` only when the row is not linked to a source record type that already carries a cost.
- Expense rows linked to `fuel_log`, `maintenance_log`, or `repair_record` are still visible as direct expense rows, but combined report totals exclude them as source-copy duplicates.
- No automatic expense rows are created from fuel logs or maintenance logs in Phase 9.

### Backend Commands Added

- `list_expenses`
- `list_expenses_for_vehicle`
- `get_expense`
- `create_expense`
- `update_expense`
- `archive_expense`
- `get_expense_summary`
- `get_vehicle_cost_report`
- `get_reports_overview`

### Frontend Expenses UI Added

- Replaced the Expenses placeholder with a real Expenses page.
- Added vehicle, category, and date filters.
- Added manual expense form with add/edit behavior.
- Added archive action.
- Added summary cards for manual total, direct expense rows, linked source-copy rows, and record count.
- Added compact expense history cards.

### Frontend Reports UI Added

- Replaced the Reports placeholder with a real Reports page.
- Added vehicle and date filters.
- Added overview summary cards.
- Added cost by category, monthly totals, vehicle cost summaries, selected vehicle cost report, and recent cost events.
- Kept the UI in the compact card/list style used by Maintenance, Fuel Logs, and Service History.

### Tests Added

- Rust expense CRUD tests:
  - create expense
  - list expenses for vehicle
  - update expense
  - archive expense
  - reject negative amount
  - reject missing vehicle/date/category/description
- Rust report aggregation tests:
  - manual expenses total correctly
  - fuel costs aggregate from fuel logs
  - maintenance costs aggregate from maintenance logs
  - repair costs aggregate from repair records
  - combined report avoids linked source-copy double counting
  - category totals are correct
  - monthly totals are correct
  - vehicle/date filters work
  - cost per km only appears when enough odometer movement exists

### Files Created

- `src-tauri/src/expenses/mod.rs` - Rust expenses module registration.
- `src-tauri/src/expenses/models.rs` - Expense and report command models.
- `src-tauri/src/expenses/repository.rs` - Expense CRUD and report aggregation logic.
- `src-tauri/src/expenses/commands.rs` - Tauri command wrappers.
- `src/services/api/expenses.ts` - Typed frontend API wrapper for expense/report commands.
- `src/components/expenses/ExpensesModule.tsx` - Real Expenses page.
- `src/components/reports/ReportsModule.tsx` - Real Reports page.

### Files Modified

- `src-tauri/src/lib.rs` - Registered expenses module and commands.
- `src/app/routes/PlaceholderPages.tsx` - Replaced Expenses and Reports placeholders with real modules.
- `src/styles.css` - Added Expenses and Reports layout/card styles.
- `specs/live-update.md` - Updated Phase 9 status and this progress entry.

### Files Deleted

- None.

### Commands Run

- `cargo fmt --manifest-path src-tauri/Cargo.toml`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `npm.cmd run typecheck`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `npm.cmd run test`
- `npm.cmd run lint`
- `npm.cmd run build`
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`
- `npm.cmd run format:check`
- `npm.cmd run format`
- `git status --short`
- `npm.cmd run tauri:dev`

### Command Results

- Rust format: Passed.
- Rust check: Passed.
- Rust tests: Passed, 40 tests.
- TypeScript tests: Passed, 1 Vitest file / 12 tests.
- Typecheck: Passed.
- Lint: Passed.
- Frontend build: Passed.
- Prettier check: Initially failed on the new Expenses/Reports/API TypeScript files; `npm.cmd run format` fixed them and the rerun passed.
- Tauri dev launch: Passed after allowing extra compile time; `tog5-vms.exe` and WebView2 processes were observed, then the dev process tree was stopped.

### Whether Tauri App Launched

Yes. `npm.cmd run tauri:dev` started the Tauri native app process. Codex cannot visually inspect the desktop window, so human visual confirmation is still needed.

### Whether Human Visual Confirmation Is Needed

Yes. Codex can confirm process launch, but the human should visually inspect the new Expenses and Reports pages.

### Issues Encountered

- The initial Prettier check found style drift in the new TypeScript files only. The project formatter corrected it.
- The Tauri launch command timed out while the dev build was still running; a follow-up process check confirmed `tog5-vms.exe` and WebView2 were running. The dev process tree was stopped afterward.
- No schema issue required a migration.

### Decisions Made

- Did not create automatic expense rows for fuel logs or service history because that would risk duplicate totals.
- Used reports to aggregate source costs directly from fuel, maintenance, and repair tables.
- Required a vehicle for manual expense creation even though the existing schema allows nullable `vehicle_id`, because Phase 9 product behavior says expenses should belong to a vehicle whenever possible.
- Did not implement CSV/PDF/Excel export in this phase to keep scope focused on local MVP reports.
- Did not add expense receipt file storage; existing source modules already store fuel and maintenance receipts, and manual expense receipt handling can be added later if needed.

### Important Implementation Details

- Combined reports exclude expense rows linked to `fuel_log`, `maintenance_log`, or `repair_record` from manual totals.
- Direct expense summary still shows direct expense rows, including linked source-copy rows, so the user can inspect what was saved.
- Vehicle cost per km is calculated only when at least two cost/source records provide different odometer readings.
- Latest official fuel efficiency is read from `fuel_logs` when available.

### Known Issues / Technical Debt

- CSV/PDF/Excel export remains future work.
- Manual expense receipt storage remains future work.
- Repair record CRUD does not exist yet; reports can include repair records already present in the database.
- Dashboard cards are still mostly static and were not redesigned in this phase.

### Manual Checks Completed

- Confirmed repository root.
- Confirmed Expenses and Reports placeholders are replaced by real modules.
- Confirmed no database migration was needed.
- Confirmed no cloud, telemetry, backup/restore, auth, packaging, or dashboard redesign work was added.

### Manual Checks Still Needed

1. Open Expenses.
2. Confirm vehicle/category/date filters work.
3. Create a manual expense.
4. Confirm it appears in history and summary cards.
5. Edit a manual expense.
6. Archive a manual expense.
7. Open Reports.
8. Confirm overview cards show real data.
9. Confirm vehicle filter changes vehicle cost summary.
10. Confirm fuel and maintenance costs appear without obvious duplicate counting.
11. Confirm Vehicles, Fuel Logs, Maintenance, Service History, and Alerts still open.

### Suggested Next Step

Proceed to Phase 10: Backup, Restore, and Local File Safety after Phase 9 visual checks.

### Notes for ChatGPT Prompt Optimization

Phase 10 prompts should treat the app data directory as containing the SQLite database plus managed folders for vehicle photos, fuel receipts, maintenance receipts, and maintenance photos. Backup should include the database and those file folders, and restore should be careful, local-only, and user-confirmed.

## Update 2026-06-26 18:17 +08:00 - Phase 10: Backup, Restore, and Local File Safety

### Prompt / Task Given to Codex

Implement Phase 10: local backup creation, backup validation, restore safety, and local file integrity checks for the app-managed database and folders. Keep everything local-only and do not add cloud sync, auth, packaging, dashboard redesign, OCR, or report export.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Backup Package Approach

- Added local `.tog5backup` directory-style packages under the app-managed `backups/` folder.
- Package structure:
  - `manifest.json`
  - `database/tog5-vms.sqlite3`
  - `files/vehicle-photos/...`
  - `files/fuel-receipts/...`
  - `files/maintenance-receipts/...`
  - `files/maintenance-photos/...`
- The manifest records app name/version, format version, created timestamp, database filename, included folders, file count, total size, checksum algorithm, and one checksum entry per included file.
- Compression was not added because the project does not currently include a zip dependency and network access is restricted. The directory-style package is inspectable, deterministic, and tested.

### Database Snapshot Approach

- Used SQLite `VACUUM INTO` to create a consistent database snapshot.
- The backup includes only the snapshot database, not stale WAL/SHM sidecar files.
- Backup validation opens the snapshot read-only so validation does not mutate the backup database or alter manifest checksums.

### Managed File Inclusion Approach

- Backups include app-managed folders:
  - `vehicle-photos`
  - `fuel-receipts`
  - `maintenance-receipts`
  - `maintenance-photos`
- Backups do not depend on original user-selected source paths.
- Empty managed folders are created in the package so the package shape remains predictable.

### Restore Validation / Safety Approach

- Restore requires explicit frontend confirmation.
- Restore validates before applying:
  - package exists and is a `.tog5backup` folder
  - manifest exists and is valid JSON
  - format version is supported
  - database snapshot exists and opens read-only
  - required schema/migrations are present
  - manifest paths are safe relative paths
  - file sizes and checksums match the manifest
- Restore creates a pre-restore safety backup before replacing local app data.
- Restore stages files in a temporary restore folder before applying.
- Restore replaces the app-data database and managed folders, clears SQLite sidecar files, records restore history, and returns `restartRequired = true`.
- Failed validation does not replace existing data.

### Local File Safety Summary Approach

- Added a summary that checks database presence, managed folder presence, file counts, folder sizes, and database references to local files.
- Checks references from:
  - `vehicle_photos.file_path`
  - `vehicle_documents.file_path`
- Missing referenced files are returned as warnings.
- Orphan cleanup was not implemented; deletion of local files remains future user-confirmed work.

### Backend Commands Added

- `create_backup`
- `validate_backup_file`
- `restore_backup`
- `list_backups`
- `get_local_file_safety_summary`

### Frontend Backup & Restore UI Added

- Replaced the Backup placeholder with a real Backup & Restore page.
- Added backup status cards.
- Added managed folder and local file safety summary.
- Added create backup action.
- Added readable/copyable backup path display.
- Added backup package path field with history suggestions.
- Added validate backup action and validation result display.
- Added explicit restore confirmation checkbox.
- Added restore action with restart-required messaging.
- Added backup history list with reusable backup paths.

### Tests Added

- Rust backup package tests:
  - package creates manifest
  - database snapshot is included
  - vehicle photos are included
  - fuel receipts are included
  - maintenance receipts/photos are included
  - manifest file count and size are populated
- Rust database snapshot tests:
  - backup database opens successfully
  - expected schema exists
  - expected test vehicle data exists
- Rust validation tests:
  - valid backup passes
  - missing manifest fails
  - missing database fails
  - unsupported format version fails
  - checksum/size mismatch fails
  - path traversal manifest entry fails
- Rust restore tests:
  - restore applies validated backup into a temp app-data directory
  - failed validation does not replace existing data
  - pre-restore safety backup is created
  - restore response marks restart required
- Rust local file safety tests:
  - missing referenced file is reported
  - existing referenced files are not reported
  - managed folder file counts are returned

### Files Created

- `src-tauri/src/backup/mod.rs` - Rust backup module registration.
- `src-tauri/src/backup/models.rs` - Backup, manifest, validation, restore, history, and safety response models.
- `src-tauri/src/backup/service.rs` - Backup package creation, validation, restore, history, and local file safety logic.
- `src-tauri/src/backup/commands.rs` - Tauri command wrappers for backup operations.
- `src/services/api/backup.ts` - Typed frontend API wrapper for backup commands.
- `src/components/backup/BackupRestoreModule.tsx` - Real Backup & Restore page.

### Files Modified

- `src-tauri/src/db/mod.rs` - Exposed the canonical database filename for backup code.
- `src-tauri/src/lib.rs` - Registered backup module and Tauri commands.
- `src/app/routes/PlaceholderPages.tsx` - Replaced Backup placeholder with the real Backup & Restore module.
- `src/styles.css` - Added Backup & Restore workspace, card, validation, history, and responsive styles.
- `specs/live-update.md` - Updated Phase 10 status and this progress entry.

### Files Deleted

- None.

### Commands Run

- `cargo fmt --manifest-path src-tauri/Cargo.toml`
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo test --manifest-path src-tauri/Cargo.toml backup::service::tests`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run format:check`
- `npm.cmd run build`
- `npm.cmd run format`
- `npm.cmd run tauri:dev`
- `git status --short`

### Command Results

- Rust format: Passed.
- Rust format check: Passed.
- Rust check: Passed.
- Backup-specific Rust tests: Passed, 7 tests.
- Full Rust tests: Passed, 47 tests.
- TypeScript tests: Passed, 1 Vitest file / 12 tests.
- Typecheck: Passed.
- Lint: Passed.
- Frontend build: Passed.
- Prettier check: Initially failed on the new backup API/UI files; `npm.cmd run format` fixed them and the rerun passed.
- Tauri dev launch: Passed with escalation for app-data database access. The dev run started `target\debug\tog5-vms.exe` and WebView2, then Codex stopped the dev process tree and confirmed port `1420` was clear.

### Whether Tauri App Launched

Yes. `npm.cmd run tauri:dev` started the Tauri native app process and WebView2. Codex cannot visually inspect the desktop window, so human visual confirmation is still needed.

### Whether Human Visual Confirmation Is Needed

Yes. Codex can confirm process launch, but the human should visually inspect the Backup & Restore page and actual backup/restore UX.

### Issues Encountered

- Backup validation initially opened the snapshot through the normal app DB helper, which enables WAL mode and could mutate backup files, causing checksum validation to fail. Fixed by opening backup snapshots read-only during validation.
- No schema migration was required.
- No compressed archive dependency was added.

### Decisions Made

- Used an inspectable `.tog5backup` directory package instead of zip compression for this phase.
- Used a built-in FNV-1a 64-bit checksum implementation to avoid adding dependencies while still detecting tampering/mismatch.
- Did not widen Tauri asset protocol scopes because Backup & Restore does not render backup files directly.
- Did not implement cloud backup, scheduled backup, encryption, or orphan cleanup.

### Important Implementation Details

- Restore returns `restartRequired = true`.
- Restore creates a safety backup first and records restore history after applying the validated package.
- Validation rejects unsafe manifest paths containing traversal or absolute path components.
- Backup history uses the existing `backups` table.

### Known Issues / Technical Debt

- Backup packages are folder packages, not compressed single files.
- Checksums use FNV-1a 64-bit, not SHA-256. SHA-256 can be added later if a vetted hash crate is introduced.
- Arbitrary external backup picking is path-based; a Tauri dialog plugin could improve this later.
- No encryption yet.
- No scheduled backup reminder workflow yet.
- No orphan cleanup yet.

### Manual Checks Completed

- Confirmed repository root.
- Confirmed backup table schema was sufficient.
- Confirmed app-data database path and managed folder names.
- Confirmed current Tauri asset scope did not need expansion.
- Confirmed Backup placeholder is replaced with a real module.
- Confirmed `npm.cmd run tauri:dev` starts the Tauri native process, then stopped the dev process tree.
- Confirmed no cloud, network sync, authentication, packaging, OCR, or dashboard redesign was added.

### Manual Checks Still Needed

1. Open Backup & Restore.
2. Confirm local file safety summary appears.
3. Confirm managed folder counts appear.
4. Create a backup.
5. Confirm backup history updates.
6. Validate the created backup path.
7. Confirm restore requires explicit confirmation.
8. Restore a backup only after intentionally testing with safe data.
9. Restart the app after restore and confirm data/files are present.
10. Confirm Vehicles, Fuel Logs, Maintenance, Service History, Expenses, Reports, and Alerts still open.

### Suggested Next Step

Proceed to Phase 11: User Access and Settings after Phase 10 visual checks.

### Notes for ChatGPT Prompt Optimization

Phase 11 prompts should account for local-only user access and settings. Avoid cloud login. Settings should likely include backup reminder preferences, due-soon defaults, startup-on-boot preference, and role scaffolding while preserving the existing local database and backup behavior.

---

## Update 2026-06-26 22:45 +08:00 - Phase 11: User Access and Settings

### Prompt / Task Given to Codex

Implement Phase 11: replace the Settings placeholder with real local settings, add local user/access scaffolding, persist settings in SQLite, wire low-risk settings into existing behavior, and keep everything local-only. Do not implement cloud login, online accounts, packaging, dashboard redesign, OCR, native OS notifications, or plaintext passwords/PINs.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Settings Persistence Approach

- Used the existing `settings` key/value SQLite table; no migration was required.
- Added default settings creation at app startup and on settings reads.
- Settings persisted:
  - preferred currency, default `PHP`
  - distance unit, default `km`
  - fuel efficiency unit, default `km_per_liter`
  - date display preference
  - default due-soon days and km thresholds
  - setup-needed schedule display preference
  - backup reminder enabled and interval days
  - maintenance alert enabled flag
  - fuel-efficiency-drop alert enabled flag
  - startup-on-boot preference
- Startup-on-boot is persisted as a preference only; actual OS startup registration remains future packaging/startup work.

### User / Access Approach

- Used the existing `users` table; no migration was required.
- Ensured a default active local owner user exists at startup.
- Added local role scaffolding for:
  - `owner`
  - `manager`
  - `viewer`
- Added list/update user profile behavior.
- Did not add login, app lock, password, or PIN storage.
- Settings UI clearly states that roles are scaffolding only and that no database encryption or login enforcement exists yet.

### Alert / Settings Integration Approach

- New maintenance schedules use the saved global due-soon day/km defaults.
- Existing schedules keep their stored thresholds; no bulk rewrite was performed.
- When maintenance alerts are disabled, refresh does not create new maintenance alerts.
- When fuel-efficiency-drop alerts are disabled, fuel efficiency drop detection still computes summaries but does not create active fuel drop alerts.

### Backup Reminder / Settings Approach

- Added backup reminder summary from settings plus backup history.
- Reminder shows whether a backup is due based on the configured interval and latest completed backup.
- No OS notification or scheduled backup was added.

### Startup Preference Approach

- `startup_on_boot_enabled` is persisted locally.
- Settings UI explains that actual Windows startup registration is future packaging/startup work.

### Backend Commands Added

- `get_app_settings`
- `update_app_settings`
- `reset_app_settings`
- `list_local_users`
- `update_local_user`
- `get_access_summary`

### Frontend Settings UI Added

- Replaced the Settings placeholder with a real Settings page.
- Added sections:
  - Profile & Access
  - General Preferences
  - Maintenance & Alerts
  - Backup & Local Data Safety
  - Startup & App Behavior
- Added editable controls for local user display name/role and app settings.
- Added save, reset-to-defaults, loading, success, error, and validation states.
- Added read-only local database path, app-data path, backup package format, and encryption status notes.
- Expenses and Reports now read the preferred currency for display formatting.

### Tests Added

- Rust settings tests:
  - default settings are created
  - get settings returns defaults
  - update settings persists values
  - reset settings restores defaults
  - invalid negative due-soon threshold is rejected
  - invalid backup reminder interval is rejected
- Rust user/access tests:
  - default owner user is created
  - list users returns owner
  - update user display name/role persists
  - invalid role is rejected
- Rust settings-driven behavior tests:
  - newly synced schedules use saved global due-soon thresholds
  - disabled maintenance alerts do not create new active maintenance alerts
  - disabled fuel-efficiency-drop alerts do not create new active fuel alerts
  - backup reminder summary changes based on settings/history

### Files Created

- `src-tauri/src/settings/mod.rs` - Rust settings module registration.
- `src-tauri/src/settings/models.rs` - Settings, user, role, access, reminder, and data safety models.
- `src-tauri/src/settings/repository.rs` - Settings persistence, validation, user scaffolding, reminder summary, and tests.
- `src-tauri/src/settings/commands.rs` - Tauri command wrappers for settings/access.
- `src/services/api/settings.ts` - Typed frontend API wrapper for settings/access commands.
- `src/components/settings/SettingsModule.tsx` - Real Settings page.

### Files Modified

- `src-tauri/src/lib.rs` - Registered settings module, startup defaults, and settings/access commands.
- `src-tauri/src/maintenance/scheduling.rs` - Used saved due-soon defaults for newly synced schedules and respected maintenance alert toggle.
- `src-tauri/src/fuel/repository.rs` - Respected fuel-efficiency-drop alert toggle.
- `src/app/routes/PlaceholderPages.tsx` - Replaced Settings placeholder with real Settings module.
- `src/components/expenses/ExpensesModule.tsx` - Loaded preferred currency for expense display labels.
- `src/components/reports/ReportsModule.tsx` - Loaded preferred currency for report display labels.
- `src/styles.css` - Added Settings page layout, form, role, path, reminder, and responsive styles.
- `specs/live-update.md` - Updated Phase 11 status and this progress entry.

### Files Deleted

- None.

### Commands Run

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- `npm.cmd run format`
- `npm.cmd run format:check`
- `cargo fmt --manifest-path src-tauri/Cargo.toml`
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `npm.cmd run tauri:dev`
- `git status --short`

### Command Results

- Initial `npm.cmd run typecheck`: failed because parsed numeric form fields in the new Settings page needed explicit narrowing. Fixed and reran successfully.
- Typecheck: Passed.
- Lint: Passed.
- TypeScript tests: Passed, 1 Vitest file / 12 tests.
- Frontend build: Passed.
- Rust format: Passed.
- Rust format check: Passed.
- Rust check: Passed.
- Rust tests: Passed, 56 tests.
- Prettier check: initially failed on the new Settings page and Reports currency wiring; `npm.cmd run format` fixed them and the rerun passed.
- Tauri dev launch: Passed with escalation for app-data database access. The dev run started `target\debug\tog5-vms.exe` and WebView2, then Codex stopped the dev process tree and confirmed port `1420` was clear.

### Whether Tauri App Launched

Yes. `npm.cmd run tauri:dev` started the Tauri native app process and WebView2. Codex cannot visually inspect the desktop window, so human visual confirmation is still needed.

### Whether Human Visual Confirmation Is Needed

Yes. Codex can confirm process launch, but the human should visually inspect the Settings page and affected existing pages.

### Issues Encountered

- A TypeScript form parsing type issue appeared during validation and was fixed.
- Prettier style drift appeared in new/modified frontend files and was fixed with the project formatter.
- No schema migration was required.
- No password/PIN/app-lock was added because the project does not yet include a suitable password hashing approach and database encryption remains future work.

### Decisions Made

- Kept Phase 11 local-only with no cloud login or online account concepts.
- Used the existing `settings` and `users` tables instead of adding a migration.
- Persisted startup-on-boot preference but did not register OS startup behavior.
- Applied currency display in Expenses/Reports without converting stored numeric values.
- Did not bulk-update existing maintenance schedules when global thresholds change; settings apply to newly synced schedules.
- Fuel alert suppression resolves or avoids active fuel drop alerts through the existing refresh path when disabled.

### Important Implementation Details

- Default settings and the default owner user are ensured during app startup.
- Settings commands return backup reminder and local data safety context for the Settings UI.
- Access summary is explicit that permissions are not enforced yet.
- Database encryption status is shown as `Not enabled`.
- Backup package format is shown as `.tog5backup local folder package`.

### Known Issues / Technical Debt

- No login screen yet.
- No password/PIN/app-lock yet.
- No database encryption yet.
- No actual OS startup registration yet.
- Existing maintenance schedules keep their saved thresholds after global setting changes.
- Distance and fuel efficiency unit preferences are stored but do not perform unit conversion yet.
- Dashboard remains mostly static and should be revisited in Phase 12.

### Manual Checks Completed

- Confirmed repository root.
- Confirmed `users` and `settings` table schemas were sufficient.
- Confirmed Settings placeholder is replaced with a real module.
- Confirmed `npm.cmd run tauri:dev` starts the Tauri native process, then stopped the dev process tree.
- Confirmed no cloud login, remote sync, telemetry, native notifications, OCR, packaging, or dashboard redesign was added.

### Manual Checks Still Needed

1. Open Settings.
2. Confirm Profile & Access section appears.
3. Confirm default local owner user appears.
4. Update the display name and save.
5. Change general preferences and save.
6. Change maintenance/alert settings and save.
7. Confirm backup reminder settings and data safety notes appear.
8. Reset settings to defaults.
9. Confirm Expenses and Reports still show money values using the preferred currency.
10. Confirm Vehicles, Fuel Logs, Maintenance, Service History, Expenses, Reports, Backup & Restore, and Alerts still open.

### Suggested Next Step

Proceed to Phase 12: Dashboard Polish and UX Refinement after Phase 11 visual checks.

### Notes for ChatGPT Prompt Optimization

Phase 12 prompts should focus on turning the mostly static Dashboard into a real overview using existing vehicles, maintenance schedules, alerts, fuel efficiency, expenses/reports, backup reminder status, and settings. Keep it local-only and avoid broad redesigns of finished modules unless small consistency fixes are needed.

---

## Update 2026-06-26 23:19 +08:00 - Phase 12: Dashboard Polish and UX Refinement

### Prompt / Task Given to Codex

Implement Phase 12 by replacing the mostly static Dashboard with a real local overview powered by existing data: vehicles, maintenance schedules, active alerts, fuel logs/efficiency, expenses/reports, backup reminder status, and settings. Keep the work focused on dashboard and small UX consistency only.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Dashboard Data Aggregation Approach

- Added one focused Rust dashboard backend module and command: `get_dashboard_overview`.
- Aggregation is read-only and uses existing SQLite tables; no migration was needed.
- The dashboard overview returns vehicle counts, maintenance due counts, active alerts, official fuel efficiency, monthly cost totals, backup reminder status, recent activity, and setup hints.
- Maintenance due status is evaluated through the existing Phase 6 due-status helper so date/odometer/needs-setup logic remains consistent.

### Backend Commands Added

- `get_dashboard_overview`

### Frontend Dashboard UI Added

- Replaced the static Dashboard placeholder with a real `DashboardModule`.
- Added a greeting using the local owner display name.
- Added overview cards for Vehicles, Maintenance due, Active alerts, Fuel efficiency, Monthly costs, and Backup status.
- Added Needs attention rows for due maintenance, active alerts, backup/setup hints.
- Added Recent activity rows for fuel logs, maintenance completions, manual expenses, active alerts, and backup events.
- Added Monthly cost mix bars without adding a chart dependency.
- Added Quick actions that navigate to existing pages through the app's current navigation state.

### Settings Integration

- Preferred currency is returned and used for dashboard cost display.
- Local owner display name is used in the dashboard greeting.
- Backup reminder status comes from the existing settings plus backup history helper.
- Alert preferences are respected indirectly through the existing alert-generation behavior; no duplicate frontend alert rules were added.

### Cost / Fuel / Maintenance / Backup Aggregation Behavior

- Fuel efficiency shows only official full-tank values stored by the Fuel Logs module.
- Recent average km/L uses the latest official values only.
- Monthly costs aggregate current-month fuel, maintenance/service, repair, and manual expense totals.
- Manual expenses linked to fuel, maintenance, or repair source records are excluded from dashboard totals to avoid obvious double counting.
- Backup status uses latest completed backup history and reminder settings.

### Tests Added

- Rust dashboard aggregation tests:
  - empty database returns a safe dashboard
  - active/archived/under-maintenance vehicles are counted
  - overdue, due soon, needs setup, and active alert counts are aggregated
  - official fuel efficiency excludes non-official logs
  - current-month costs avoid linked expense duplicates
  - preferred currency and backup reminder status are returned

### Files Created

- `src-tauri/src/dashboard/mod.rs` - dashboard module registration.
- `src-tauri/src/dashboard/models.rs` - dashboard overview response models.
- `src-tauri/src/dashboard/repository.rs` - local dashboard aggregation queries and tests.
- `src-tauri/src/dashboard/commands.rs` - Tauri command wrapper.
- `src/services/api/dashboard.ts` - typed frontend dashboard API wrapper.
- `src/components/dashboard/DashboardModule.tsx` - real Dashboard UI.

### Files Modified

- `src-tauri/src/lib.rs` - registered dashboard module and command.
- `src/app/App.tsx` - changed page rendering so Dashboard quick actions can navigate through existing app state.
- `src/app/routes/PlaceholderPages.tsx` - replaced Dashboard placeholder with `DashboardModule`.
- `src/styles.css` - added Dashboard layout, cards, attention rows, activity rows, cost bars, quick actions, and responsive rules.
- `specs/live-update.md` - updated Phase 12 status and this progress entry.

### Files Deleted

- None.

### Commands Run

- `Resolve-Path 'C:\Development Projects\TOG5-VMS'`
- `git status --short`
- `npm.cmd exec prettier -- --write src/app/App.tsx src/app/routes/PlaceholderPages.tsx src/components/dashboard/DashboardModule.tsx src/services/api/dashboard.ts src/styles.css`
- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run format:check`
- `npm.cmd run build`
- `cargo fmt --manifest-path src-tauri/Cargo.toml`
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `npm.cmd run tauri:dev`
- `Get-Process -Name 'tog5-vms' -ErrorAction SilentlyContinue`
- `Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue`

### Command Results

- TypeScript tests: Passed, 1 Vitest file / 12 tests.
- Typecheck: Passed.
- Lint: Passed.
- Prettier format check: Passed.
- Frontend build: Passed.
- Rust format: Passed.
- Rust format check: Passed.
- Rust check: Passed.
- Rust tests: Passed, 62 tests.
- Initial full Rust test run failed because a new dashboard test fixture inserted two schedules for the same vehicle/template pair, violating the existing unique schedule rule. The fixture was corrected to use distinct templates, and the rerun passed.
- Tauri dev launch: Passed with escalation for app-data database access. The dev run started Vite and `target\debug\tog5-vms.exe`; Codex stopped the process tree after confirmation.
- Process cleanup: no remaining `tog5-vms` process or port `1420` listener was reported after shutdown.

### Whether Tauri App Launched

Yes. `npm.cmd run tauri:dev` launched the native `tog5-vms.exe` process. The final Tauri log noted `beforeDevCommand` ended with a non-zero status because Codex intentionally stopped the dev server after validation.

### Whether Human Visual Confirmation Is Needed

Yes. Codex confirmed process launch but cannot visually inspect the desktop window.

### Issues Encountered

- One dashboard Rust test fixture used duplicate schedule keys and was fixed.
- `Get-Location` reports a sandbox-mapped path, but `Resolve-Path 'C:\Development Projects\TOG5-VMS'` confirms the requested root exists and all commands used that project path.
- No database migration was required.

### Decisions Made

- Added one dashboard overview command instead of stitching many unrelated commands together in the frontend.
- Kept Dashboard aggregation read-only.
- Did not add charting dependencies.
- Quick actions navigate to existing pages rather than performing mutations from the Dashboard.
- Did not redesign existing modules.

### Important Implementation Details

- Dashboard photo display uses the existing Tauri asset URL pattern through `convertFileSrc`.
- Cost totals mirror the Phase 9 double-counting decision by excluding linked manual expenses from tracked dashboard totals.
- Maintenance counts are based on existing due-status logic using current vehicle odometer and due thresholds.
- Setup hints remain helpful but non-destructive.

### Known Issues / Technical Debt

- Dashboard does not auto-refresh after data changes in other pages until it is loaded/refreshed again.
- Quick actions navigate to pages; they do not deep-link into a specific add form yet.
- No charts or exports were added.
- Visual desktop confirmation is still manual.

### Manual Checks Completed

- Confirmed project root path.
- Confirmed Dashboard placeholder was replaced.
- Confirmed no migration/schema change was needed.
- Confirmed the dashboard command compiles and is registered.
- Confirmed full validation commands pass after the test fixture fix.
- Confirmed Tauri native process launches and is stopped after validation.

### Manual Checks Still Needed

1. Open Dashboard.
2. Confirm real overview cards load.
3. Confirm empty states look friendly if there is little data.
4. Confirm vehicles count matches existing vehicles.
5. Confirm maintenance counts match schedules.
6. Confirm alerts summary matches Alerts page.
7. Confirm fuel efficiency shows not-enough-data or official values correctly.
8. Confirm monthly costs align with Reports.
9. Confirm backup status reflects backup history/settings.
10. Confirm quick actions navigate to the expected pages.
11. Confirm Dashboard looks good at normal and narrow window widths.
12. Confirm Vehicles, Fuel Logs, Maintenance, Service History, Expenses, Reports, Backup & Restore, Alerts, and Settings still open.

### Suggested Next Step

Proceed to Phase 13: Packaging and Release Preparation after Phase 12 visual checks.

### Notes for ChatGPT Prompt Optimization

Phase 13 prompts should focus on release readiness, Windows packaging/installer preparation, metadata/icons, production build validation, and final pre-release QA. Avoid adding new business modules during packaging work.

---

# Current Blockers

- No Phase 11 blocker remains.
- Direct `npm` in PowerShell is still blocked by execution policy; use `npm.cmd` for now.
- Tauri native process launch is verified, but visible desktop-window confirmation should be checked manually if Codex cannot observe the screen.

---

# Open Questions

1. Will the first build target Windows only, or should macOS/Linux compatibility be preserved from the start?
2. Should user login be implemented in MVP immediately, or after vehicle/fuel/maintenance modules are working?
3. Should local database encryption be required for v1, or treated as future hardening?
4. Should receipt OCR be excluded entirely from v1, or added as a placeholder setting only?

---

# Next Prompt Preparation Notes

When asking ChatGPT to create the next Codex prompt, include:

1. The latest full contents of this `live-update.md`.
2. Any errors from VS Code terminal.
3. Any screenshots or exact UI issues if relevant.
4. What phase you want to continue or start.
5. Whether Codex should only modify specific files.

ChatGPT should use this file to produce a focused Codex prompt with:

1. Clear objective.
2. Files to read first.
3. Files to modify.
4. Guardrails.
5. Tests/checks to run.
6. Required `live-update.md` update instructions.
