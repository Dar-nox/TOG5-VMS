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

Phase 14 - Client Testing and Fixes.

## Phase State

Phase 14 in progress / QA cleanup pass completed. Client smoke-test documentation and bug triage log were created, automated validation passed, the release binary smoke test passed, the installer artifact was checked non-destructively, the Maintenance simplification refactor was completed, and high-signal QA cleanup fixes were applied. Manual visual/client installer testing is still pending.

## Last Completed Phase

Phase 13 - Packaging and Release Preparation.

## Next Planned Phase

Post-MVP stabilization / release handoff after Phase 14 manual QA.

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
| 13 | Packaging and Release Preparation | Completed | Windows NSIS packaging configured, release exe/setup artifact generated, release checklist and notes added |
| 14 | Client Testing and Fixes | In progress | QA docs created; automated validation and release binary smoke test passed; Maintenance was simplified after client feedback; manual installer/client checks pending |

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

## Update 2026-06-26 23:48 - Phase 13: Packaging and Release Preparation

### Prompt / Task Given to Codex

Prepare the local Windows desktop MVP for release packaging: audit release metadata, configure Windows bundle output, validate production builds, generate installer artifacts, create release checklist/notes, smoke-launch the release binary, and update this tracker. Do not add new business modules or out-of-scope platform features.

### Summary of What Changed

- Audited package, Rust, Tauri, icon, build, and ignore configuration for release readiness.
- Updated Tauri bundle configuration from all bundle targets to a focused Windows NSIS target.
- Added explicit bundle icon references and NSIS installer/uninstaller icon settings.
- Kept the app identifier `com.tog5.vms` unchanged to avoid app-data path disruption.
- Created a Windows release checklist and local MVP release notes.
- Produced an optimized release executable and NSIS setup artifact.
- Smoke-launched the release executable and confirmed the expected app-data SQLite database path exists.

### Release Metadata / Config Changes

- `package.json` already uses `tog5-vms` and version `0.1.0`.
- `src-tauri/Cargo.toml` already uses package name `tog5-vms`, version `0.1.0`, and a local desktop VMS description.
- `src-tauri/tauri.conf.json` already used product name `TOG 5 VMS`, version `0.1.0`, identifier `com.tog5.vms`, and the correct `npm.cmd run build` before-build command.
- Tauri bundle targets are now `["nsis"]` for the Windows MVP release instead of `"all"`.
- Bundle publisher and icon paths are explicit.
- NSIS install mode is `currentUser` to avoid requiring administrator rights by default.

### Windows Bundle Configuration Result

- Bundle active: yes.
- Windows installer target: NSIS.
- Installer icon: `src-tauri/icons/icon.ico`.
- Generated NSIS artifact: `src-tauri/target/release/bundle/nsis/TOG 5 VMS_0.1.0_x64-setup.exe`.
- Generated optimized release executable: `src-tauri/target/release/tog5-vms.exe`.
- Build artifacts remain under `src-tauri/target/`, which is ignored by Git.

### Production Build Result

- Frontend production build passed.
- Rust release build passed.
- NSIS bundling passed after rerunning with escalation so Tauri could download the NSIS packaging tool.

### Files Created

- `docs/release/phase-13-windows-release-checklist.md` - Windows release validation, packaging, installer, smoke-test, caveat, and artifact naming checklist.
- `docs/release/v0.1.0-local-mvp-notes.md` - brief local MVP release notes and known limitations.

### Files Modified

- `src-tauri/tauri.conf.json` - focused bundle target to NSIS, added publisher/icons, and set safe NSIS installer metadata.
- `specs/live-update.md` - updated Phase 13 status and appended this release preparation entry.

### Files Deleted

- None.

### Commands Run

```bash
Resolve-Path "C:\Development Projects\TOG5-VMS"
git status --short
git check-ignore -v dist src-tauri/target src-tauri/target/release/bundle/nsis/example-setup.exe
rg -n '"NsisConfig"|"installerIcon"|"installMode"|"languages"|"displayLanguageSelector"|"publisher"|"targets"|"icon"' node_modules\@tauri-apps\cli\config.schema.json
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:build
npm.cmd run tauri:build
Get-ChildItem -Recurse -File src-tauri\target\release\bundle
Get-Item src-tauri\target\release\tog5-vms.exe
Start-Process src-tauri\target\release\tog5-vms.exe
Get-NetTCPConnection -LocalPort 1420
```

### Command Results

- Project root confirmed as `C:\Development Projects\TOG5-VMS`.
- Git ignore check confirmed `dist/` and `src-tauri/target/` release outputs are ignored.
- TypeScript tests: passed, 1 Vitest file / 12 tests.
- Typecheck: passed.
- Lint: passed.
- Prettier format check: passed.
- Frontend build: passed.
- Rust format: passed.
- Rust format check: passed.
- Rust check: passed.
- Rust tests: passed, 62 tests.
- First `npm.cmd run tauri:build`: frontend and optimized Rust release build passed, but NSIS bundling failed when the sandbox blocked Tauri's download of the NSIS package with socket permission error `os error 10013`.
- Second `npm.cmd run tauri:build` with escalation: passed and produced the NSIS installer.
- Release executable smoke launch: passed; `tog5-vms.exe` stayed running for the 10-second check and was stopped.
- App-data database check: `C:\Users\Darnocs\AppData\Roaming\com.tog5.vms\tog5-vms.sqlite3` exists.
- Port `1420` check returned no active listener, as expected for release mode.

### Whether Tauri Dev Launched

Not run for Phase 13. This phase used production build and release-binary smoke validation instead.

### Whether Production Release Binary Launched

Yes. `src-tauri/target/release/tog5-vms.exe` launched successfully and was stopped after validation.

### Whether Installer Artifacts Were Produced

Yes. NSIS setup artifact produced at `src-tauri/target/release/bundle/nsis/TOG 5 VMS_0.1.0_x64-setup.exe`.

### Whether Human Visual Confirmation Is Needed

Yes. Codex confirmed process launch and artifact creation, but human visual confirmation is still needed for the app window, icon/title appearance, and installer install/uninstall behavior.

### Issues Encountered

- NSIS bundling initially failed because the sandbox blocked the Tauri NSIS package download. Rerunning with escalation resolved it.
- No code-signing certificate is configured; the installer is expected to be unsigned.
- No installer install/uninstall test was performed by Codex.

### Decisions Made

- Targeted only NSIS for the Windows MVP to avoid unnecessary cross-platform/MSI packaging complexity.
- Used current-user install mode so the installer does not require administrator privileges by default.
- Kept the existing app identifier to avoid changing app-data storage paths.
- Added release documentation instead of adding risky installer scripting or update infrastructure.
- Did not add an About screen or version UI in this phase.

### Important Implementation Details

- No database migrations were added.
- No Tauri asset protocol scope changes were made.
- No user data, app-data database, uploaded photos, receipts, backups, `node_modules`, or target output are bundled from the project root.
- Release artifacts remain generated output under the ignored `src-tauri/target/` tree.

### Known Issues / Release Caveats

- Unsigned installer may trigger Windows SmartScreen warnings.
- Startup-on-boot is still a stored preference only; OS startup registration is future packaging/startup work.
- Database encryption is not enabled.
- Backup packages remain local folder-style `.tog5backup` packages.
- No auto-updater is configured.
- No cloud sync, OCR, native OS notifications, or report export is included.

### Manual Checks Completed

- Confirmed project root.
- Confirmed current Git status before and after changes.
- Confirmed icon files exist.
- Confirmed Tauri metadata and build scripts.
- Confirmed generated outputs are ignored by Git.
- Confirmed validation commands pass.
- Confirmed production release executable and NSIS setup artifact are generated.
- Confirmed release executable process launches and stops without leaving a leftover process.

### Manual Checks Still Needed

1. Launch the release app visibly and confirm Dashboard opens.
2. Confirm quick actions still navigate.
3. Confirm Vehicles opens and photos display.
4. Confirm Maintenance opens.
5. Confirm Fuel Logs opens.
6. Confirm Service History opens.
7. Confirm Expenses opens.
8. Confirm Reports opens.
9. Confirm Backup & Restore opens.
10. Confirm Alerts opens.
11. Confirm Settings opens and data safety notes remain clear.
12. Confirm no obvious debug/scaffold text remains.
13. Confirm app icon/window title look correct.
14. Run the NSIS installer manually on a test machine.
15. Confirm installer launch, install, app launch from shortcut/Start Menu, local app-data behavior, and uninstall behavior.

### Suggested Next Step

Proceed to Phase 14: Client Testing and Fixes after manually checking the release app and installer artifact.

### Notes for ChatGPT Prompt Optimization

Phase 14 prompts should focus on structured client smoke testing, bug triage, installer/manual QA feedback, and narrowly scoped stabilization fixes. Avoid adding new business features during release testing.

---

## Update 2026-06-30 21:24 - Phase 14: Client Testing and Fixes

### Prompt / Task Given to Codex

Start Phase 14 client testing and fixes: create structured client smoke-test documentation, create a bug triage log, run full automated validation, run a safe release binary smoke test, check the installer artifact non-destructively, fix only confirmed blocking/high-impact defects, and update this tracker. Do not add new features or run installer install/uninstall without explicit approval.

### Summary of What Changed

- Created a structured Phase 14 client smoke-test plan.
- Created an empty Phase 14 bug triage log for confirmed issues.
- Added `.gitignore` guardrails for accidental local app-data, backup, photo, and receipt artifacts copied into the repository.
- Ran full automated validation.
- Smoke-launched the packaged release executable.
- Checked the NSIS installer artifact without installing it.
- No confirmed product defects were found during automated/safe smoke testing.

### Testing Docs Created

- `docs/testing/phase-14-client-smoke-test-plan.md` - client/release QA plan, module smoke checklist, installer checks, data safety checks, severity definitions, and bug report template.
- `docs/testing/phase-14-bug-triage-log.md` - empty triage table for confirmed Phase 14 bugs only.

### Automated Validation Results

- TypeScript tests: passed, 1 Vitest file / 12 tests.
- Typecheck: passed.
- Lint: passed.
- Prettier format check: passed.
- Frontend production build: passed.
- Rust format: passed.
- Rust format check: passed.
- Rust check: passed.
- Rust tests: passed, 62 tests.

### Release Binary Smoke Test Result

- Release executable path: `src-tauri/target/release/tog5-vms.exe`.
- Result: passed.
- The release executable launched successfully and stayed running for the 10-second check.
- Port `1420` was not listening in release mode.
- App-data database path exists: `C:\Users\Darnocs\AppData\Roaming\com.tog5.vms\tog5-vms.sqlite3`.
- The release process was stopped and no leftover `tog5-vms.exe` process remained.

### Installer Artifact Check Result

- Installer artifact path: `src-tauri/target/release/bundle/nsis/TOG 5 VMS_0.1.0_x64-setup.exe`.
- Result: checked non-destructively only.
- File exists.
- File size: 3,126,293 bytes.
- Artifact is under ignored `src-tauri/target/`.
- Authenticode status: `NotSigned`, which matches the known unsigned MVP installer caveat.
- Installer was not run, installed, or uninstalled by Codex.

### Bugs Found

- None found during automated validation and safe release smoke testing.
- The bug triage log remains empty until a confirmed bug is reproduced.

### Fixes Made

- Added `.gitignore` patterns to prevent accidentally committed local SQLite databases, `.tog5backup` packages, app-managed photo/receipt folders, and logs.
- No source-code behavior fixes were needed.

### Files Created

- `docs/testing/phase-14-client-smoke-test-plan.md` - structured client/release smoke test plan.
- `docs/testing/phase-14-bug-triage-log.md` - empty confirmed-bug triage log.

### Files Modified

- `.gitignore` - added local app-data/backup/file-artifact guardrails.
- `specs/live-update.md` - updated Phase 14 status and appended this QA pass entry.

### Files Deleted

- None.

### Commands Run

```bash
Resolve-Path "C:\Development Projects\TOG5-VMS"
git status --short
Test-Path "src-tauri\target\release\tog5-vms.exe"
Test-Path "src-tauri\target\release\bundle\nsis\TOG 5 VMS_0.1.0_x64-setup.exe"
git check-ignore -v dist src-tauri/target src-tauri/target/release/bundle/nsis/TOG 5 VMS_0.1.0_x64-setup.exe tog5-vms.sqlite3 sample.tog5backup vehicle-photos/photo.png fuel-receipts/receipt.pdf maintenance-receipts/receipt.pdf maintenance-photos/photo.png debug.log
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
Start-Process src-tauri\target\release\tog5-vms.exe
Get-NetTCPConnection -LocalPort 1420
Get-Process -Name "tog5-vms"
Get-Item "src-tauri\target\release\bundle\nsis\TOG 5 VMS_0.1.0_x64-setup.exe"
Get-AuthenticodeSignature "src-tauri\target\release\bundle\nsis\TOG 5 VMS_0.1.0_x64-setup.exe"
```

### Command Results

- Project root confirmed as `C:\Development Projects\TOG5-VMS`.
- Phase 13 changes were already committed before Phase 14 started; initial working tree was clean.
- Release executable and installer artifact were present.
- Ignore checks confirmed generated output and accidental local-data artifacts are ignored.
- All automated validation commands passed.
- Release binary smoke launch passed.
- Installer artifact exists and is unsigned.
- No leftover release process remained.

### Whether Production Release Binary Launched

Yes. `src-tauri/target/release/tog5-vms.exe` launched successfully and was stopped after validation.

### Whether Installer Was Installed/Tested

No. Codex only checked the installer artifact non-destructively. It did not run, install, uninstall, or mutate installed apps.

### Whether Human Visual Confirmation Is Needed

Yes. Human/client QA still needs to visually confirm the release app window, module workflows, local attachment display, installer behavior, and uninstall behavior.

### Issues / Blockers Encountered

- The Codex session was interrupted after release smoke testing, but the resumed audit found no running `tog5-vms.exe` process and no half-finished validation command.
- No automated or safe smoke-test blocker was found.
- Manual installer/client testing remains the main Phase 14 blocker.

### Decisions Made

- Marked Phase 14 as in progress / QA pass started rather than completed because manual client and installer checks are still required.
- Kept bug triage empty because no confirmed bug was reproduced.
- Added ignore patterns as a release-safety guardrail, not a business feature.
- Did not run the installer because the task explicitly required user approval before install/uninstall testing.

### Known Issues / Release Caveats

- Installer is unsigned and may trigger Windows SmartScreen warnings.
- Database encryption is not enabled.
- Startup-on-boot remains a stored preference only.
- Backup packages remain local folder-style `.tog5backup` packages.
- No auto-updater, cloud sync, OCR, report export, or native OS notification system is included.

### Manual Checks Completed by Codex

- Confirmed project root.
- Confirmed release artifacts exist.
- Confirmed generated release artifacts are ignored by Git.
- Confirmed accidental local DB/backup/photo/receipt folders are ignored.
- Confirmed full automated validation passes.
- Confirmed release executable launches without dev server port `1420`.
- Confirmed expected app-data database path exists.
- Confirmed installer artifact exists and is unsigned.

### Manual Checks Still Needed by User

1. Launch the release app visibly and confirm Dashboard opens.
2. Confirm quick actions navigate correctly.
3. Confirm Vehicles opens, add/edit/archive works, and photos display after restart.
4. Confirm Maintenance opens, schedule sync works, and completion creates Service History.
5. Confirm Alerts opens and dismissal works.
6. Confirm Fuel Logs opens, partial/full-tank behavior works, and receipt attachment works.
7. Confirm Expenses opens and add/edit/archive works.
8. Confirm Reports opens and costs align with source records.
9. Confirm Backup & Restore opens, create/validate backup works, and restore is confirmation-gated.
10. Confirm Settings opens, update/reset works, and currency display remains consistent.
11. Run the NSIS installer on a safe test machine.
12. Confirm install, Start Menu/shortcut launch, local app-data behavior, local photo/receipt display, and uninstall behavior.
13. Record any confirmed issues in `docs/testing/phase-14-bug-triage-log.md`.

### Suggested Next Step

Run the manual/client smoke checklist in `docs/testing/phase-14-client-smoke-test-plan.md`, then use Phase 14 follow-up prompts to fix only confirmed bugs from the triage log.

### Notes for ChatGPT Prompt Optimization

Future Phase 14 prompts should include exact bug reports from the triage log, screenshots when relevant, environment details, and expected vs actual results. Keep fixes narrow and retest the affected workflow plus the standard validation commands.

---

# Current Blockers

- Phase 14 manual client/installer smoke testing is still pending.
- Direct `npm` in PowerShell is still blocked by execution policy; use `npm.cmd` for now.
- Release binary process launch is verified, but visible desktop-window and installer install/uninstall confirmation should be checked manually.

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
## Update 2026-06-30 23:33 +08:00 - Phase 14: Maintenance Simplification Client-Feedback Fix

### Prompt / Task Given to Codex

Implement the approved Maintenance Simplification Refactor Plan. Make Maintenance easier to understand by replacing the visible template/schedule/applicability workspace with a vehicle-centered flow for logging completed maintenance and setting per-vehicle reminders. Preserve existing schedules/history/files/reports and hide the smart template engine from normal users.

### Summary of What Changed

- Replaced the user-facing Maintenance tabs (`Schedules`, `Applicability`, `Template Library`) with a simpler page focused on:
  - Vehicle selector.
  - `Log maintenance done`.
  - `Needs attention`.
  - `Reminders for this vehicle`.
- Added direct maintenance logging so users can save service history without first creating or completing a schedule.
- Added per-vehicle reminder settings using the existing `vehicle_maintenance_settings` table.
- Changed schedule generation so schedules are created from active per-vehicle reminders, not from every auto-applicable template.
- Preserved existing live schedules by backfilling/linking them to vehicle reminder settings when maintenance data is loaded.
- Kept maintenance templates as an internal catalog for maintenance item choices and future compatibility warnings.
- Updated user-facing copy in Alerts, Service History, Settings, Dashboard, and navigation to remove the old "sync schedules / smart template planning" mental model.

### Maintenance Simplification Approach

- Maintenance now starts from normal user intent: log work that was done.
- A future due date/odometer is calculated only when the selected vehicle has an active reminder for that maintenance item.
- If no reminder exists, the service history record is still saved, but no next due target is invented.
- Removing a reminder disables/archives linked reminder schedules and resolves related active maintenance alerts while keeping service history.

### Backend Commands Added

- `list_vehicle_maintenance_settings`
- `upsert_vehicle_maintenance_setting`
- `archive_vehicle_maintenance_setting`
- `log_maintenance`

### Data / Migration Notes

- No migration was added.
- The existing `vehicle_maintenance_settings` table already supports per-vehicle custom day/km intervals, due-soon thresholds, status, and notes.
- Existing `maintenance_schedules`, `maintenance_logs`, `vehicle_documents`, `vehicle_photos`, and `alerts` behavior was preserved.

### Files Created

- `docs/planning/maintenance-simplification-audit.md` - audit of Maintenance touchpoints, old UI behavior retired, data safety notes, and connected modules.

### Files Modified

- `src/components/maintenance/MaintenanceTemplateModule.tsx` - replaced the tabbed Maintenance workspace with the simplified log/reminder workflow.
- `src/services/api/maintenance.ts` - added typed API wrappers and request/response types for reminders and direct maintenance logging.
- `src-tauri/src/maintenance/models.rs` - added reminder-setting and direct log-maintenance models.
- `src-tauri/src/maintenance/commands.rs` - added Tauri commands for reminders and direct maintenance logging.
- `src-tauri/src/maintenance/scheduling.rs` - changed sync/alert flow to use active vehicle reminder settings and backfill existing schedules into reminders.
- `src-tauri/src/maintenance/service_history.rs` - added direct maintenance logging and changed completion next-due calculation to use reminder intervals.
- `src-tauri/src/lib.rs` - registered new maintenance commands.
- `src-tauri/src/dashboard/repository.rs` - updated setup hint copy from schedule sync to reminder setup.
- `src/components/alerts/AlertsModule.tsx` - updated empty-state copy.
- `src/components/dashboard/DashboardModule.tsx` - updated Maintenance quick-action copy.
- `src/components/serviceHistory/ServiceHistoryModule.tsx` - updated empty-state copy.
- `src/components/settings/SettingsModule.tsx` - updated due-soon defaults copy.
- `src/types/navigation.ts` - updated Maintenance navigation description.
- `src/styles.css` - added simple Maintenance log/reminder layout styles.
- `specs/live-update.md` - recorded this Phase 14 client-feedback fix.

### Files Deleted

- None.

### Tests Added / Updated

- Updated Rust scheduling tests to verify reminder-driven schedule creation.
- Added Rust service-history tests for:
  - Logging maintenance without a reminder creates history without a next due schedule.
  - Logging maintenance with a reminder updates next due values.
- Existing applicability tests remain in place because templates still act as internal rules/catalog.

### Commands Run

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
npm.cmd run typecheck
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run test
npm.cmd run lint
npm.cmd run format:check
npx.cmd prettier --write src\components\maintenance\MaintenanceTemplateModule.tsx src\services\api\maintenance.ts
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
npm.cmd run tauri:dev
```

### Command Results

- `npm.cmd run test`: passed, 1 Vitest file / 12 tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: initially failed on two changed TypeScript files; passed after targeted Prettier formatting.
- `npm.cmd run build`: passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml`: completed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `cargo check --manifest-path src-tauri/Cargo.toml`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed, 64 Rust tests.
- `npm.cmd run tauri:dev`: passed after clearing a leftover dev process; app reached `Running target\debug\tog5-vms.exe`.

### Issues Encountered

- First Tauri dev attempt failed under sandboxed app-data access with `Could not configure SQLite connection: unable to open database file`.
- A retry found port `1420` occupied by a leftover dev process.
- Another retry failed because `src-tauri\target\debug\tog5-vms.exe` was locked by a leftover app process.
- The user exited the leftover app process; the final retry launched successfully.
- Codex cannot visually confirm the desktop window, so human visual confirmation is still needed.

### Decisions Made

- Kept templates seeded internally instead of deleting the template engine.
- Used `vehicle_maintenance_settings` as the source of user-visible maintenance reminders.
- Did not add a migration because the current schema supports the simplification.
- Preserved existing schedules as reminders instead of hiding or archiving them.
- Kept Service History as a read-only history page; Maintenance is now the primary place to log completed work.

### Known Issues / Technical Debt

- Applicability/template APIs still exist for internal rules and possible future advanced UI, but they are no longer exposed on the normal Maintenance page.
- Some legacy CSS selectors for removed Maintenance template tabs remain harmlessly in `src/styles.css`; they can be cleaned in a later pure-CSS cleanup if desired.
- Human visual testing is needed for the new Maintenance layout and reminder workflow.

### Manual Checks Still Needed

1. Open Maintenance.
2. Confirm the page shows the simplified log/reminder workflow, not tabs.
3. Log maintenance without setting a reminder and confirm it appears in Service History without creating a due target.
4. Add a reminder for a vehicle and maintenance item.
5. Log that maintenance again and confirm next due date/odometer updates.
6. Confirm due/overdue reminders still appear in Alerts.
7. Confirm Dashboard, Reports, Expenses, and Service History still show maintenance/service data correctly.

### Suggested Next Step

Run a focused client QA pass on the simplified Maintenance page. If the workflow feels right, continue Phase 14 stabilization and manual installer/client checks.

### Notes for ChatGPT Prompt Optimization

Future prompts should describe Maintenance as "log maintenance and set per-vehicle reminders." Avoid asking Codex to expose the template library or applicability preview unless the user explicitly asks for an advanced maintenance setup screen.

---

## Update 2026-07-01 00:18 +08:00 - Product/App-Data Cleanup

### Summary

Cleaned previous TOG 5 VMS test data from local app-data folders after the user confirmed the app functionality and UI were acceptable. This was a data/artifact cleanup only; no product code, database schema, or feature behavior was changed.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Cleanup Approach

- Created a reversible safety copy before removing local app-data/cache folders.
- Removed active and legacy TOG 5 VMS app-data folders that contained test databases, uploaded test vehicle photos, WebView cache data, and old updater/installer cache.
- Launched the app once after cleanup so Tauri recreated a fresh `com.tog5.vms` app-data folder and clean `tog5-vms.sqlite3` database.

### Safety Backup Created

`C:\tmp\TOG5-VMS-data-cleanup-backup-20260701-001606`

### App-Data Paths Cleaned

- `C:\Users\Darnocs\AppData\Roaming\com.tog5.vms`
- `C:\Users\Darnocs\AppData\Roaming\tog5-vms`
- `C:\Users\Darnocs\AppData\Local\com.tog5.vms`
- `C:\Users\Darnocs\AppData\Local\tog5-vms-updater`

### Resulting Active App-Data State

- `C:\Users\Darnocs\AppData\Roaming\com.tog5.vms` was recreated by the app.
- Fresh database exists at `C:\Users\Darnocs\AppData\Roaming\com.tog5.vms\tog5-vms.sqlite3`.
- No old active managed file folders were present after relaunch.
- Legacy `Roaming\tog5-vms` and `Local\tog5-vms-updater` folders remained removed.

### Files Created

- None in the repository.
- Safety backup folder created outside the repository under `C:\tmp`.

### Files Modified

- `specs/live-update.md`

### Files Deleted

- No repository files deleted.
- Local app-data/cache folders listed above were removed after safety backup.

### Commands Run

```bash
Get-Location
git status --short
Get-Content -Path src-tauri\src\db\mod.rs
Get-Content -Path src-tauri\tauri.conf.json
Get-ChildItem -Path $env:APPDATA -Directory
Get-ChildItem -Path $env:LOCALAPPDATA -Directory
Get-ChildItem -Path "$env:APPDATA\com.tog5.vms" -Recurse
Get-ChildItem -Path "$env:APPDATA\tog5-vms" -Recurse
Get-ChildItem -Path "$env:LOCALAPPDATA\com.tog5.vms" -Recurse
Get-ChildItem -Path "$env:LOCALAPPDATA\tog5-vms-updater" -Recurse
sqlite3 --version
npm.cmd run tauri:dev
Get-NetTCPConnection -LocalPort 1420
Get-Process
```

### Command Results

- Confirmed project root was correct.
- Confirmed no SQLite databases were present inside the repository.
- `sqlite3` CLI was not installed.
- Python launcher was unavailable in this shell session, so SQLite inspection by Python was skipped.
- Safety backup/copy completed successfully.
- Local app-data/cache cleanup completed successfully.
- `npm.cmd run tauri:dev` launched successfully and reached `Running target\debug\tog5-vms.exe`.
- The Tauri app recreated a fresh app-data database.
- TOG 5 VMS dev processes were stopped after validation.
- Port `1420` had no listener after cleanup validation.

### Issues Encountered

- The shell did not have `sqlite3`.
- Python/py launchers failed in this session with a Windows logon-session error, so no direct table-row inspection was performed.
- Codex cannot visually inspect the desktop window, so human visual confirmation is still needed.

### Decisions Made

- Cleaned app-data folders instead of editing tables in place because the request was to remove previous test stuff and a fresh local database was safer and simpler.
- Preserved a full out-of-band safety backup in `C:\tmp` before deleting any app-data folder.
- Did not remove repository build artifacts such as `dist/` or `src-tauri/target/` because they are ignored build outputs, not app user/test data.

### Manual Checks Still Needed

1. Open TOG 5 VMS.
2. Confirm Dashboard opens with empty/clean data states.
3. Confirm Vehicles has no old test vehicles/photos.
4. Confirm Fuel Logs, Maintenance, Service History, Expenses, Reports, Alerts, Backup & Restore, and Settings open normally.
5. Add one fresh real vehicle only when ready to start actual use.

### Suggested Next Step

Run one quick clean-start smoke test. If everything looks clean, the app is ready for real data entry.

---

## Update 2026-07-01 02:41 +08:00 - Phase 14: Dashboard Cleanup Polish

### Summary

Removed duplicate Dashboard quick-action cards and removed the top-header "Offline-first draft" badge. The sidebar remains the primary place for navigation, while contextual Dashboard attention/activity rows remain clickable where they point to relevant records.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Files Modified

- `src/components/dashboard/DashboardModule.tsx`
- `src/components/common/AppLayout.tsx`
- `src/styles.css`
- `docs/testing/phase-14-client-smoke-test-plan.md`
- `specs/live-update.md`

### Files Created / Deleted

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
- `npm.cmd run tauri:dev`: passed on the second longer launch check; app reached `Running target\debug\tog5-vms.exe`.

### Tauri Launch Notes

- First launch check reached Vite startup and Rust compilation but did not reach the app process before the wait window ended.
- Second launch check reached the Tauri desktop process successfully.
- TOG 5 VMS dev processes were stopped after validation.
- Human visual confirmation is still needed for the exact Dashboard appearance.

### Issues Encountered

- The first Tauri launch wait window was too short for a fresh Rust compile after recent changes.

### Decisions Made

- Removed the Dashboard quick-action panel entirely because those actions duplicate sidebar navigation.
- Removed the header status pill because "Offline-first draft" is no longer appropriate for the current local MVP.
- Kept contextual Dashboard rows clickable because they are tied to real attention/activity items rather than duplicate page shortcuts.
- Updated the Phase 14 smoke-test plan so it no longer asks testers to verify removed Dashboard quick actions.

### Manual Checks Still Needed

1. Open Dashboard.
2. Confirm the Quick actions panel is gone.
3. Confirm the "Offline-first draft" badge is gone.
4. Confirm sidebar navigation still works.
5. Confirm Dashboard attention/recent activity rows still navigate when present.
6. Confirm normal and narrow window layouts still look clean.

### Suggested Next Step

Run a quick visual pass on the Dashboard and continue Phase 14 client polish if any other visual cleanup is noticed.

---

## Update 2026-07-01 03:40 +08:00 - Phase 14: Expenses Manual Entry Polish

### Summary

Removed confusing raw linked-record fields from the Add/Edit manual expense form and changed expense category entry into a typeable category field with built-in suggestions. Manual expenses are now clearer: use them for costs not already saved as fuel logs or completed maintenance/service records.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Files Modified

- `src/components/expenses/ExpensesModule.tsx`
- `src/services/api/expenses.ts`
- `src/domain/expenses/types.ts`
- `src-tauri/src/expenses/repository.rs`
- `specs/live-update.md`

### Backend Behavior

- Expense categories now accept custom user-entered text.
- Custom categories are normalized for storage, for example `Parking Fee` becomes `parking_fee`.
- Built-in category filtering still works.
- Existing linked/source expense rows keep their hidden link metadata when edited, but new manual expenses no longer expose or require raw linked record fields.

### Frontend Behavior

- Removed `Linked record type` and `Linked record ID` from the manual expense form.
- Replaced the category dropdown with a text input using category suggestions.
- Updated the helper copy so it explains manual expenses should be used for costs not already recorded elsewhere.
- Existing linked/source rows now display as source costs without exposing raw record IDs in the expense card.

### Tests Added / Updated

- Added Rust coverage for saving and filtering a custom expense category.

### Commands Run

```bash
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri\Cargo.toml --check
cargo check --manifest-path src-tauri\Cargo.toml
cargo test --manifest-path src-tauri\Cargo.toml
```

### Command Results

- `npm.cmd run test`: passed, 1 Vitest file / 12 tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- `cargo fmt --manifest-path src-tauri\Cargo.toml --check`: passed.
- `cargo check --manifest-path src-tauri\Cargo.toml`: passed.
- `cargo test --manifest-path src-tauri\Cargo.toml`: passed, 65 Rust tests.

### Tauri Launch Notes

- TOG 5 VMS was already running during validation, with `tog5-vms.exe` active and port `1420` listening.
- Codex did not stop the already-running app process because it was not launched by this cleanup step.
- Human visual confirmation is still needed for the updated Expenses form.

### Issues Encountered

- None.

### Decisions Made

- Kept the backend linked-record support because it is still useful for automatic/source cost records and double-count prevention.
- Removed raw linked-record entry from the user-facing manual expense form because it is confusing and not needed for ordinary manual costs.
- Did not change the database schema.

### Manual Checks Still Needed

1. Open Expenses.
2. Confirm `Linked record type` and `Linked record ID` are gone from Add/Edit manual expense.
3. Confirm Category can be selected from suggestions.
4. Confirm a custom category such as `Parking Fee` can be typed and saved.
5. Confirm the saved custom category appears cleanly in Expense History and Reports.

### Suggested Next Step

Run a quick visual check of the Expenses form and add one small test expense with a custom category.

---

## Update 2026-07-01 03:47 +08:00 - Phase 14: Expenses Category Dropdown Polish

### Summary

Polished the Expenses category control so it matches the app's other dropdown styling while still allowing custom typed categories. Removed the built-in `Other` suggestion because custom typing now covers that use case.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Files Modified

- `src/components/expenses/ExpensesModule.tsx`
- `src/styles.css`
- `specs/live-update.md`

### Behavior Changes

- Removed `Other` from the suggested expense category list.
- New manual expense forms now start with an empty category and show `Choose or type category`.
- Category remains required.
- The category field keeps custom typing but uses the same select-style visual affordance as other dropdown controls.
- Shared form dropdown styling was tightened so select controls and the typeable expense category control read as one design family.

### Commands Run

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo check --manifest-path src-tauri\Cargo.toml
npm.cmd run tauri:dev
```

### Command Results

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- `cargo check --manifest-path src-tauri\Cargo.toml`: passed.
- `npm.cmd run tauri:dev`: passed; app reached `Running target\debug\tog5-vms.exe`.

### Tauri Launch Notes

- TOG 5 VMS launched successfully.
- Dev processes were stopped after validation.
- Human visual confirmation is still needed for the exact dropdown appearance.

### Issues Encountered

- None.

### Manual Checks Still Needed

1. Open Expenses.
2. Confirm the Category control visually matches the app's dropdown style.
3. Confirm `Other` is no longer a suggested option.
4. Confirm built-in suggestions still appear.
5. Confirm a custom category can still be typed and saved.

### Suggested Next Step

Visually confirm the Expenses form at normal and narrow window widths.

---

## Update 2026-07-01 04:09 +08:00 - Phase 14: Expenses Category Combobox Consistency

### Summary

Replaced the Expenses category `datalist` control with a small app-rendered combobox so the open dropdown can match the visual language of the app's other dropdown controls while still allowing custom typed categories.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Files Modified

- `src/components/expenses/ExpensesModule.tsx`
- `src/styles.css`
- `specs/live-update.md`

### Behavior Changes

- Removed the browser-native `datalist` popup from the manual expense category field.
- Added an app-styled category combobox with built-in suggestions and custom typing.
- Kept `Other` out of the suggested categories.
- Preserved existing custom category behavior and backend normalization.
- Added mouse and keyboard selection support for category suggestions.
- Kept the Expenses category filter as a normal dropdown.

### Commands Run

```bash
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run tauri:dev
```

### Command Results

- `npm.cmd run test`: passed, 1 Vitest file / 12 tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed after formatting `src/components/expenses/ExpensesModule.tsx`.
- `npm.cmd run build`: passed.
- `npm.cmd run tauri:dev`: launched the app; the command timed out because the dev app kept running, then `tog5-vms.exe` and the port `1420` listener were confirmed and stopped.

### Tauri Launch Notes

- TOG 5 VMS launched in dev mode.
- Codex cannot visually inspect the dropdown styling from the desktop window in this run.
- Human visual confirmation is still needed for exact dropdown appearance.

### Issues Encountered

- The earlier `datalist` popup was controlled by WebView/browser styling and could not be made fully consistent with the app's native select controls.
- No backend, database, or report behavior changes were needed.

### Manual Checks Still Needed

1. Open Expenses.
2. Click the Category field.
3. Confirm the dropdown is now white/app-styled instead of the dark browser suggestion popup.
4. Confirm suggested categories can be selected.
5. Confirm a custom category can still be typed and saved.

### Suggested Next Step

Visually confirm the updated Expenses category combobox at normal and narrow window widths.

---

## Update 2026-07-01 04:16 +08:00 - Phase 14: Expenses Category Hint Row

### Summary

Added a top hint row to the Expenses category combobox so the full `Choose or type category` text is visible when the dropdown is open.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Files Modified

- `src/components/expenses/ExpensesModule.tsx`
- `src/styles.css`
- `specs/live-update.md`

### Behavior Changes

- The category combobox menu now starts with `Choose or type category`.
- Selecting the hint row clears the category instead of saving it as a category.
- Suggested categories and custom typed category behavior remain unchanged.
- No backend, database, or report behavior changed.

### Commands Run

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
```

### Command Results

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.

### Manual Checks Still Needed

1. Open Expenses.
2. Click the Category field.
3. Confirm `Choose or type category` appears at the top of the dropdown.
4. Confirm choosing a suggested category still works.
5. Confirm custom typed categories still save correctly.

### Suggested Next Step

Visually confirm the category combobox at the form width shown in the screenshot.

---

## Update 2026-07-01 04:26 +08:00 - Phase 14: Expenses Category Native Dropdown

### Summary

Changed the Expenses category control to use the same native dropdown style as the rest of the app. Custom categories are now entered through a separate text field that appears only after choosing `Custom category...`.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Files Modified

- `src/components/expenses/ExpensesModule.tsx`
- `src/styles.css`
- `specs/live-update.md`

### Behavior Changes

- Replaced the custom category combobox with a normal `<select>` so the Category dropdown matches Vehicle, Fuel, Transmission, and other app dropdowns.
- Added `Custom category...` as the last dropdown option.
- Selecting `Custom category...` reveals a separate `Custom category` text input.
- Built-in category selection and custom category saving remain supported.
- Removed the previous custom dropdown CSS because it is no longer needed.
- No backend, database, report, or expense aggregation behavior changed.

### Commands Run

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run test
npm.cmd run tauri:dev
```

### Command Results

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- `npm.cmd run test`: passed, 1 Vitest file / 12 tests.
- `npm.cmd run tauri:dev`: launched the app; the command timed out because the dev app kept running, then `tog5-vms.exe` and the port `1420` listener were confirmed and stopped.

### Tauri Launch Notes

- TOG 5 VMS launched in dev mode.
- Human visual confirmation is still needed for the exact Expenses category dropdown appearance.

### Manual Checks Still Needed

1. Open Expenses.
2. Confirm Category now opens like the app's other native dropdowns.
3. Confirm `Custom category...` appears at the bottom.
4. Confirm selecting `Custom category...` shows the separate custom category input.
5. Confirm custom categories still save correctly.

### Suggested Next Step

Visually confirm the Expenses category dropdown now matches the other app dropdowns.

---

## Update 2026-07-01 04:37 +08:00 - Phase 14: Expenses Custom Category Layout Fix

### Summary

Fixed the Expenses form layout so selecting `Custom category...` no longer stretches or shifts the Amount field awkwardly.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Files Modified

- `src/components/expenses/ExpensesModule.tsx`
- `src/styles.css`
- `specs/live-update.md`

### Behavior Changes

- Category remains a native dropdown for consistency with the rest of the app.
- The custom category input now renders as its own full-width row below the Category / Amount row.
- Amount stays stable and no longer gets stretched by the custom category field.
- Existing custom category behavior is preserved.
- No backend, database, report, or expense aggregation behavior changed.

### Commands Run

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
```

### Command Results

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.

### Manual Checks Still Needed

1. Open Expenses.
2. Select a built-in category and confirm Amount stays aligned.
3. Select `Custom category...` and confirm the custom input appears on its own row.
4. Confirm Amount does not stretch or shift awkwardly.
5. Confirm a custom category still saves correctly.

### Suggested Next Step

Visually confirm the Expenses form with both built-in and custom category selections.

---

## Update 2026-07-01 04:47 +08:00 - Phase 14: Expenses Custom Category Toggle Bugfix

### Summary

Fixed a bug where selecting `Custom category...` stopped working after switching from custom category back to a built-in category and then trying custom again.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Files Modified

- `src/components/expenses/ExpensesModule.tsx`
- `specs/live-update.md`

### Root Cause

- The category field had an auto-detection effect that forced custom mode off whenever the current category value matched a built-in category.
- After selecting a built-in category, choosing `Custom category...` set custom mode on, but the effect immediately saw the old built-in category value and turned custom mode back off.

### Fix

- Removed the auto-detection effect from the category dropdown component.
- Made the dropdown choice the source of truth for custom mode.
- Selecting `Custom category...` now clears the previous built-in category value and keeps the custom input open.

### Commands Run

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
```

### Command Results

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.

### Manual Checks Still Needed

1. Open Expenses.
2. Select `Custom category...`.
3. Switch to a built-in category.
4. Switch back to `Custom category...`.
5. Confirm the custom input opens every time.

### Suggested Next Step

Visually confirm the custom category toggle loop no longer gets stuck.

---

## Update 2026-07-01 10:25 +08:00 - Phase 14: Overall QA Cleanup Fixes

### Summary

Applied the high-signal cleanup fixes from the overall QA pass without changing the database schema or adding new product scope.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Fixes Made

- Expanded Tauri asset protocol access from vehicle photos only to all app-managed display folders:
  - `vehicle-photos`
  - `fuel-receipts`
  - `maintenance-receipts`
  - `maintenance-photos`
- Updated Fuel Logs and Service History cost display to use the Settings preferred currency, with `PHP` fallback if settings cannot be loaded.
- Updated Expenses category filtering so custom categories discovered from loaded expenses/summary data appear in the filter dropdown.
- Removed stale Service History copy that said reports and expenses come later.
- Updated the Phase 13 release checklist to describe the simplified Maintenance workflow instead of the old Schedules/Applicability/Template Library tabs.
- Renamed the route wrapper file from `PlaceholderPages.tsx` to `Pages.tsx`.
- Removed unused `PlaceholderSection` component and `.placeholder-section` CSS.
- Removed obsolete `.gitkeep` files from directories that now contain real tracked files.

### Files Created

- `src/app/routes/Pages.tsx`

### Files Modified

- `docs/release/phase-13-windows-release-checklist.md`
- `specs/live-update.md`
- `src-tauri/tauri.conf.json`
- `src/app/App.tsx`
- `src/components/expenses/ExpensesModule.tsx`
- `src/components/fuel/FuelLogsModule.tsx`
- `src/components/serviceHistory/ServiceHistoryModule.tsx`
- `src/styles.css`

### Files Deleted

- `src/app/routes/PlaceholderPages.tsx`
- `src/components/common/PlaceholderSection.tsx`
- Obsolete `.gitkeep` files in populated source folders:
  - `src-tauri/migrations/.gitkeep`
  - `src-tauri/src/backup/.gitkeep`
  - `src-tauri/src/db/.gitkeep`
  - `src/app/routes/.gitkeep`
  - `src/components/common/.gitkeep`
  - `src/components/dashboard/.gitkeep`
  - `src/components/fuel/.gitkeep`
  - `src/components/maintenance/.gitkeep`
  - `src/components/reports/.gitkeep`
  - `src/components/vehicles/.gitkeep`
  - `src/domain/alerts/.gitkeep`
  - `src/domain/expenses/.gitkeep`
  - `src/domain/fuel/.gitkeep`
  - `src/domain/maintenance/.gitkeep`
  - `src/domain/vehicles/.gitkeep`
  - `src/services/api/.gitkeep`
  - `src/types/.gitkeep`

### Commands Run

```bash
npm.cmd exec prettier -- --write src-tauri/tauri.conf.json src/app/App.tsx src/app/routes/Pages.tsx src/components/expenses/ExpensesModule.tsx src/components/fuel/FuelLogsModule.tsx src/components/serviceHistory/ServiceHistoryModule.tsx src/styles.css docs/release/phase-13-windows-release-checklist.md
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

- Prettier write: completed; touched files were already formatted.
- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml`: completed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `cargo check --manifest-path src-tauri/Cargo.toml`: first attempt timed out while waiting for the build-directory lock during `cargo test`; rerun passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed, 65 Rust tests.
- `npm.cmd run tauri:dev`: launched Vite on `127.0.0.1:1420`, compiled Tauri, and ran `target\debug\tog5-vms.exe`. Dev processes were stopped afterward and port 1420 was clear.
- Final `npm.cmd run format:check` after updating this file: passed.

### Tauri Launch Result

The Tauri dev app process launched successfully. Human visual confirmation is still needed for the actual desktop window and attachment-link behavior.

### Manual Checks Still Needed

1. Confirm vehicle photos still display.
2. Open a Fuel Logs receipt link.
3. Open Service History receipt, before-photo, and after-photo links.
4. Confirm Fuel Logs and Service History show the Settings preferred currency.
5. Save a custom expense category and confirm it appears in the category filter.
6. Confirm Dashboard, Vehicles, Maintenance, Fuel Logs, Service History, Expenses, Reports, Backup & Restore, Alerts, and Settings still open.

### Decisions Made

- Left `logo.png` and `vms-logo.png` in the project root because they may be useful source branding assets.
- Kept empty future-use folders and their `.gitkeep` files.
- Did not change database schema, backend repositories, reports aggregation, or product workflows.

### Suggested Next Step

Run the manual visual checks above, with special attention to Fuel Logs and Service History attachment links.

---

## Update 2026-07-05 01:41 +08:00 - Phase 14: Alerts Refresh and Dashboard Active Alerts Cleanup

### Summary

Fixed the client-reported alert refresh behavior and simplified the Dashboard summary by combining Maintenance Due into Active Alerts.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Changed the Alerts page refresh behavior so it recalculates maintenance alerts for all active vehicles before listing active alerts.
- The Alerts page now uses a `Refreshing...` button state while recalculating and loading alerts.
- Updated Dashboard loading to refresh maintenance alerts before reading the overview, so alert counts are less likely to feel delayed.
- Removed the separate `Maintenance due` Dashboard summary card.
- Updated the remaining `Active alerts` Dashboard card to include maintenance reminder attention in one user-facing count/detail.
- Added a Dashboard-specific responsive summary grid so the five-card layout stays cohesive after removing the extra card.

### Files Modified

- `src/services/api/alerts.ts`
- `src/components/alerts/AlertsModule.tsx`
- `src/components/dashboard/DashboardModule.tsx`
- `src/styles.css`
- `specs/live-update.md`

### Commands Run

```bash
npm.cmd exec prettier -- --write src/services/api/alerts.ts src/components/alerts/AlertsModule.tsx src/components/dashboard/DashboardModule.tsx src/styles.css
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

- Prettier write: completed.
- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `cargo check --manifest-path src-tauri/Cargo.toml`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed, 65 Rust tests.
- `npm.cmd run tauri:dev`: Vite listened on `127.0.0.1:1420` and `target\debug\tog5-vms.exe` launched. The wrapper returned nonzero only because the validation script intentionally stopped the running dev app afterward; no leftover `tog5-vms`, Cargo, or port 1420 process remained.

### Manual Checks Still Needed

1. Create or use a vehicle maintenance reminder that is due soon/overdue.
2. Open Alerts and press Refresh.
3. Confirm the due soon/overdue maintenance alert appears immediately after refresh.
4. Open Dashboard and confirm there is no separate `Maintenance due` card.
5. Confirm the `Active alerts` card includes maintenance reminder attention and the five-card layout still looks balanced.

### Decisions Made

- Used existing frontend APIs and existing Tauri commands instead of adding a new backend command or schema change.
- Kept the Dashboard needs-attention list intact because it provides contextual rows, not duplicate summary cards.

### Suggested Next Step

Run the manual visual checks above, then continue with the next client feedback item.

---

## Update 2026-07-05 01:46 +08:00 - Dashboard Summary Value Overflow Fix

### Summary

Fixed a Dashboard card layout bug where long summary values, especially large monthly cost amounts, could overflow outside the card.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Added safer width handling to shared summary card value text.
- Made Dashboard summary card values slightly more compact than the generic summary card value style.
- Increased the Dashboard summary grid minimum card width so long values have more room before wrapping.
- Kept Dashboard data aggregation and navigation behavior unchanged.

### Files Modified

- `src/styles.css`
- `specs/live-update.md`

### Commands Run

```bash
npm.cmd exec prettier -- --write src/styles.css
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run tauri:dev
```

### Command Results

- Prettier write: completed, `src/styles.css` unchanged after formatting.
- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- `npm.cmd run tauri:dev`: Vite started on `127.0.0.1:1420` and `target\debug\tog5-vms.exe` launched. The process was stopped after launch confirmation; the final nonzero exit was caused by manual Ctrl+C shutdown. No `tog5-vms` process or port `1420` listener remained afterward.

### Manual Checks Still Needed

1. Open Dashboard with a large monthly cost value.
2. Confirm the Monthly costs number stays inside the card.
3. Confirm the other Dashboard summary cards still look balanced at normal and narrow widths.

### Decisions Made

- Fixed this with CSS resilience instead of changing the reported money value or hiding decimals.
- Applied the behavior to Dashboard summary card values generally so other long Dashboard metrics are less likely to overflow.

### Suggested Next Step

Run the Dashboard visual check, then continue with the next client feedback item.

---

## Update 2026-07-05 14:46 +08:00 - Phase 14: User-Managed Maintenance Items

### Summary

Added client-requested maintenance item management so users can add, edit, and remove maintenance items themselves instead of relying only on the long built-in seeded list.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Added local Tauri/Rust commands for creating, updating, and archiving maintenance items.
- Added a compact `Maintenance items` manager to the Maintenance page.
- Grouped maintenance item dropdown choices by category to make log/reminder selection easier to scan.
- When choosing an item for a vehicle reminder, the reminder form now pre-fills that item’s suggested day/km intervals and warning thresholds.
- Removing a maintenance item now soft-disables it, disables related active reminders/schedules, resolves active alerts for that item, and keeps service history intact.
- Updated maintenance seeding so built-in item removals and edits are preserved across app startup instead of being overwritten by the default seed library.

### Files Modified

- `src-tauri/src/lib.rs`
- `src-tauri/src/maintenance/commands.rs`
- `src-tauri/src/maintenance/models.rs`
- `src-tauri/src/maintenance/repository.rs`
- `src/components/maintenance/MaintenanceTemplateModule.tsx`
- `src/services/api/maintenance.ts`
- `src/styles.css`
- `specs/live-update.md`

### Tests Added

- Rust test for creating, updating, and archiving custom maintenance items.
- Rust test confirming removal disables related reminders/schedules and resolves related alerts.
- Rust test confirming removed built-in items are not reactivated by startup seeding.
- Rust test confirming user edits to built-in items are preserved after reseeding.

### Commands Run

```bash
npm.cmd exec prettier -- --write src/components/maintenance/MaintenanceTemplateModule.tsx src/services/api/maintenance.ts src/styles.css
cargo fmt --manifest-path src-tauri/Cargo.toml
npm.cmd run typecheck
cargo check --manifest-path src-tauri/Cargo.toml
npm.cmd run test
npm.cmd run lint
npm.cmd run format:check
cargo fmt --manifest-path src-tauri/Cargo.toml --check
npm.cmd run build
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:dev
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue
Get-Process | Where-Object { $_.ProcessName -like '*tog5*' -or ($_.Path -like '*TOG5-VMS*') }
Stop-Process -Id 30240 -Force
Stop-Process -Id 23224 -Force
Stop-Process -Id 12236 -Force
```

### Command Results

- Prettier write: completed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml`: completed.
- `npm.cmd run typecheck`: passed.
- `cargo check --manifest-path src-tauri/Cargo.toml`: passed.
- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `npm.cmd run build`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed, 69 Rust tests.
- `npm.cmd run tauri:dev`: timed out because the dev app stayed running; Vite and `target\debug\tog5-vms.exe` launched successfully.
- Stopped leftover TOG5 dev helper/server/app processes after validation.
- Final process and port checks showed no TOG5 process and no port `1420` listener remaining.

### Tauri Launch Result

The Tauri debug desktop process launched. Human visual confirmation of the new Maintenance item manager is still needed.

### Decisions Made

- Used the existing `maintenance_templates` table instead of adding a migration.
- Used soft deactivation for removing maintenance items so history and database references are preserved.
- Preserved user edits/removals to seeded built-in maintenance items during future startup seeding.
- Kept smart applicability/template rules internal and did not bring back the old complex template workspace.

### Manual Checks Still Needed

1. Open Maintenance.
2. Confirm maintenance item dropdowns are grouped by category.
3. Add a custom maintenance item.
4. Edit the custom item and confirm the changes persist after reopening the app.
5. Remove an item and confirm it disappears from new log/reminder choices.
6. Confirm existing service history for removed items remains visible.
7. Confirm Vehicles, Fuel Logs, Service History, Dashboard, Alerts, Expenses, Reports, Backup, and Settings still open.

### Suggested Next Step

Run the Maintenance visual workflow checks with the client and continue with the next client feedback item.

---

## Update 2026-07-05 15:37 +08:00 - Phase 14: Maintenance Item List Correction

### Summary

Corrected the previous Maintenance item management change after client feedback: removed category grouping from the maintenance item dropdowns and hid the long seeded default maintenance library from the normal user-facing Maintenance item list.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Removed `<optgroup>` category grouping from Maintenance item dropdowns.
- Restored a flat maintenance item picker sorted by item name.
- Hid unconfigured seeded/default maintenance templates from the user-facing `list_maintenance_templates` command.
- Kept seeded templates internal so legacy applicability/tests and existing referenced records can still work.
- User-created maintenance items remain visible and manageable.
- Allowed users to create custom items with the same name as hidden seeded defaults.
- Simplified the Maintenance item editor by removing the visible Category field.
- New user-created items now use an internal `maintenance` category.
- Added first-use empty-state copy explaining that users should add their own maintenance item before logging work or setting reminders.

### Files Modified

- `src-tauri/src/maintenance/commands.rs`
- `src-tauri/src/maintenance/repository.rs`
- `src/components/maintenance/MaintenanceTemplateModule.tsx`
- `specs/live-update.md`

### Tests Added

- Rust test confirming the user-facing maintenance item list hides unconfigured seeded defaults.
- Rust test confirms a user-created item with the same name as a hidden seeded default can still be added and shown.

### Commands Run

```bash
npm.cmd exec prettier -- --write src/components/maintenance/MaintenanceTemplateModule.tsx
cargo fmt --manifest-path src-tauri/Cargo.toml
npm.cmd run typecheck
cargo check --manifest-path src-tauri/Cargo.toml
npm.cmd run test
npm.cmd run lint
npm.cmd run format:check
cargo fmt --manifest-path src-tauri/Cargo.toml --check
npm.cmd run build
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:dev
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue
Stop-Process -Id 19008,29932 -Force
Stop-Process -Id 30240 -Force
```

### Command Results

- Prettier write: completed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml`: completed.
- `npm.cmd run typecheck`: passed.
- `cargo check --manifest-path src-tauri/Cargo.toml`: passed.
- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `npm.cmd run build`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed, 70 Rust tests.
- `npm.cmd run tauri:dev`: timed out because the dev app stayed running; Vite and `target\debug\tog5-vms.exe` launched successfully.
- Stopped leftover TOG5 dev server/helper/app processes after validation.
- Final checks showed no TOG5 process and no port `1420` listener remaining.

### Tauri Launch Result

The Tauri debug desktop process launched. Human visual confirmation of the corrected flat Maintenance item list is still needed.

### Decisions Made

- Did not hard-delete seeded template rows from SQLite because older service history/reminder references may point to them.
- Hid unconfigured seeded defaults from normal UI instead of exposing a long default catalog.
- Kept old referenced seeded items visible only when tied to existing active reminder/schedule data so user data does not become unreachable.
- Removed visible category editing to match the client request for simple item control rather than more categorization.

### Manual Checks Still Needed

1. Open Maintenance.
2. Confirm the maintenance item dropdown is flat and has no category headers.
3. Confirm the long default maintenance list is gone.
4. Add a maintenance item.
5. Confirm the new item appears in Log maintenance and Reminder dropdowns.
6. Edit and remove the item.
7. Confirm existing service history still opens.

### Suggested Next Step

Run the Maintenance page visual check with the client, then continue with the next feedback item.

---

## Update 2026-07-05 16:53 +08:00 - Phase 14: Maintenance Attachment Picker UI Fix

### Summary

Fixed the Maintenance log receipt/before-photo/after-photo picker layout so file buttons and selected filenames remain readable at smaller and maximized window widths.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Replaced the visible native file input controls in the Maintenance log attachments section with app-styled `Choose file` buttons.
- Added a readable selected filename line for each attachment.
- Made attachment cards wrap responsively before they become too narrow.
- Prevented native file input text from being clipped or shortened unpredictably by browser styling.
- Kept receipt/photo storage behavior unchanged.

### Files Modified

- `src/components/maintenance/MaintenanceTemplateModule.tsx`
- `src/styles.css`
- `specs/live-update.md`

### Commands Run

```bash
npm.cmd exec prettier -- --write src/components/maintenance/MaintenanceTemplateModule.tsx src/styles.css
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run test
npm.cmd run tauri:dev
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue
Stop-Process -Id 22236,14376,19728 -Force
Stop-Process -Id 31000,17888,13916 -Force
```

### Command Results

- Prettier write: completed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- `npm.cmd run test`: passed, 12 Vitest tests.
- First `npm.cmd run tauri:dev`: failed because port `1420` was already in use by leftover TOG5 dev processes.
- Stopped the leftover TOG5 dev server/helper/app processes and retried.
- Second `npm.cmd run tauri:dev`: launched the dev app and timed out because it stayed running as expected.
- Stopped the launched TOG5 dev server/helper/app processes afterward.
- Final check showed no TOG5 process remained; port `1420` only had a harmless `TimeWait` entry.

### Tauri Launch Result

The Tauri debug desktop process launched. Human visual confirmation of the attachment picker layout is still needed.

### Manual Checks Still Needed

1. Open Maintenance.
2. Select receipt, before photo, and after photo files.
3. Confirm the `Choose file` buttons are not cut off.
4. Confirm selected filenames are readable at maximized and smaller window widths.
5. Confirm saving a maintenance log with attachments still works.

### Suggested Next Step

Run the Maintenance attachment visual check, then continue with the next client feedback item.

---

## Update 2026-07-05 17:15 +08:00 - Phase 14: Maintenance Section Validation Scoping

### Summary

Fixed Maintenance page validation placement so each form section shows only its own validation messages.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Replaced the shared Maintenance `issues` state with separate `logIssues`, `reminderIssues`, and `itemIssues`.
- Removed global rendering of form validation errors at the top of the Maintenance workspace.
- Kept Maintenance log validation inside the `Log maintenance done` panel.
- Added reminder validation rendering inside `Reminders for this vehicle`.
- Added maintenance item validation rendering inside `Maintenance items`.
- Cleared stale success messages when a submit fails validation.
- Kept success message behavior unchanged; no toast/pop-up system was added.

### Files Modified

- `src/components/maintenance/MaintenanceTemplateModule.tsx`
- `specs/live-update.md`

### Commands Run

```bash
npm.cmd exec prettier -- --write src/components/maintenance/MaintenanceTemplateModule.tsx
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run test
npm.cmd run build
npm.cmd run tauri:dev
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue
Stop-Process -Id 31204,22904,30348 -Force
Stop-Process -Id 32728,31756,14972 -Force
```

### Command Results

- Prettier write: completed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run build`: passed.
- First `npm.cmd run tauri:dev`: failed because port `1420` was already in use by leftover TOG5 dev processes.
- Stopped leftover TOG5 dev server/helper/app processes and retried.
- Second `npm.cmd run tauri:dev`: launched the dev app and timed out because it stayed running as expected.
- Stopped the launched TOG5 dev server/helper/app processes afterward.
- Final check showed no TOG5 process remained; port `1420` only had a transient `TimeWait` entry.

### Tauri Launch Result

The Tauri debug desktop process launched. Human visual confirmation of section-scoped validation placement is still needed.

### Manual Checks Still Needed

1. Open Maintenance.
2. Submit an empty Maintenance item form.
3. Confirm the error appears only inside `Maintenance items`.
4. Submit an incomplete Log maintenance form.
5. Confirm the error appears only inside `Log maintenance done`.
6. Submit an incomplete reminder form.
7. Confirm the error appears only inside `Reminders for this vehicle`.
8. Confirm stale success messages clear when a validation error appears.

### Suggested Next Step

Run the Maintenance validation placement visual check, then continue with the next client feedback item.

---

## Update 2026-07-05 13:35 +08:00 - Settings Clear Local Product Data Action

### Summary

Added a guarded Settings action to clear local product/test data from this device without removing app settings, the local user profile, maintenance item suggestions, or existing backup packages.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Added a backend `clear_app_data` Tauri command.
- Added typed clear-data request/response models.
- Added a transactional product-data clear operation that removes product records from vehicle, fuel, maintenance, service history, expense, alert, parts, document/photo, and audit tables.
- Preserved `settings`, `users`, `maintenance_templates`, `maintenance_template_rules`, `schema_migrations`, and `backups`.
- Cleared app-managed local upload folders:
  - `vehicle-photos`
  - `fuel-receipts`
  - `maintenance-receipts`
  - `maintenance-photos`
- Recreated the managed folders after clearing them.
- Added a Settings `Clear Local Product Data` danger-zone card.
- Added a required checkbox confirmation before the destructive button becomes usable.
- Added frontend API wrapper/types for `clearAppData`.
- Added Rust coverage for clearing product data while keeping settings, users, templates, and backups.

### Files Modified

- `src-tauri/src/lib.rs`
- `src-tauri/src/settings/commands.rs`
- `src-tauri/src/settings/models.rs`
- `src-tauri/src/settings/repository.rs`
- `src/components/settings/SettingsModule.tsx`
- `src/services/api/settings.ts`
- `src/styles.css`
- `specs/live-update.md`

### Commands Run

```bash
npm.cmd exec prettier -- --write src/services/api/settings.ts src/components/settings/SettingsModule.tsx src/styles.css
cargo fmt --manifest-path src-tauri/Cargo.toml
npm.cmd run typecheck
cargo check --manifest-path src-tauri/Cargo.toml
npm.cmd run test
npm.cmd run lint
cargo fmt --manifest-path src-tauri/Cargo.toml --check
npm.cmd run format:check
npm.cmd run build
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:dev
```

### Command Results

- Prettier write: completed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml`: completed.
- `npm.cmd run typecheck`: passed.
- `cargo check --manifest-path src-tauri/Cargo.toml`: passed.
- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run lint`: passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- First `cargo test --manifest-path src-tauri/Cargo.toml`: all visible tests passed but the command timed out at 60 seconds after test completion output.
- Second `cargo test --manifest-path src-tauri/Cargo.toml`: passed cleanly, 66 Rust tests.
- `npm.cmd run tauri:dev`: initial command timed out before returning output, but the dev server and `target\debug\tog5-vms.exe` did launch. The leftover TOG5 dev server, Cargo, Node, and app processes were stopped afterward. No TOG5 app process or port `1420` listener remained.

### Manual Checks Still Needed

1. Open Settings.
2. Confirm the `Clear Local Product Data` card appears under local data safety.
3. Confirm the `Clear local data` button is disabled until the checkbox is checked.
4. Create a backup before testing if any real data should be preserved.
5. Check the confirmation box and clear data only on a test copy/device.
6. Confirm vehicles, logs, reminders, expenses, alerts, and uploaded files are cleared.
7. Confirm Settings still opens and the local owner/profile remains.
8. Confirm backup history/packages remain available.

### Decisions Made

- Kept this as a product-data cleanup action rather than deleting the whole app-data folder or database.
- Preserved backup packages so accidental cleanup can still be recovered from if a backup exists.
- Preserved settings and local user/access scaffolding so the app remains usable immediately after cleanup.
- Preserved the seeded maintenance template catalog because it is internal product reference data, not user-entered test data.

### Suggested Next Step

Manually verify the Settings clear-data confirmation flow on a test data set, then continue with the next client feedback item.

---

## Update 2026-07-05 02:27 +08:00 - Dashboard Needs Attention Duplicate Cleanup

### Summary

Removed the confusing duplicate Dashboard `Needs attention` display where a due-soon maintenance reminder and its generated alert could appear as two separate rows for the same item.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Added `maintenanceScheduleId` to Dashboard alert response items.
- Updated the Dashboard alert query to return the linked `alerts.maintenance_schedule_id`.
- Filtered Dashboard maintenance reminder rows when a visible alert row already represents the same schedule.
- Updated the `Needs attention` helper copy to say `Important reminders and alerts that need your attention.`
- Updated the empty-state copy to say `New reminders` instead of `New schedules`.
- Kept Maintenance, Alerts, scheduling, alert generation, and database behavior unchanged.

### Files Modified

- `src-tauri/src/dashboard/models.rs`
- `src-tauri/src/dashboard/repository.rs`
- `src/services/api/dashboard.ts`
- `src/components/dashboard/DashboardModule.tsx`
- `specs/live-update.md`

### Commands Run

```bash
npm.cmd exec prettier -- --write src/components/dashboard/DashboardModule.tsx src/services/api/dashboard.ts
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

- Prettier write: completed, files unchanged after formatting.
- `cargo fmt --manifest-path src-tauri/Cargo.toml`: completed.
- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `cargo check --manifest-path src-tauri/Cargo.toml`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed, 65 Rust tests.
- `npm.cmd run tauri:dev`: Vite started on `127.0.0.1:1420` and `target\debug\tog5-vms.exe` launched. The process was stopped after launch confirmation; the final nonzero exit was caused by manual Ctrl+C shutdown. No `tog5-vms` process or port `1420` listener remained afterward.

### Manual Checks Still Needed

1. Open Dashboard with a maintenance reminder that has a matching due-soon/overdue alert.
2. Confirm only one row appears for that maintenance item in `Needs attention`.
3. Confirm the Alerts page still shows the alert.
4. Confirm the Maintenance page still shows the reminder details.

### Decisions Made

- Used the linked maintenance schedule id for exact deduplication instead of matching by title/date text.
- Kept this as a Dashboard presentation cleanup so underlying maintenance reminders and alert records remain intact.

### Suggested Next Step

Run the Dashboard duplicate-row visual check, then continue with the next client feedback item.

---

## Update 2026-07-05 02:33 +08:00 - Fuel and Maintenance Total Auto-Fill Polish

### Summary

Added live total auto-fill behavior to the Fuel Logs and Maintenance logging forms based on client feedback.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Fuel Logs now automatically fills `Total amount` when both `Liters` and `Price per liter` are valid.
- Maintenance logging now automatically fills `Total cost` from `Labor cost + Parts cost`.
- Maintenance logging clears `Total cost` again when both labor and parts costs are blank.
- Existing save-time validation and backend persistence behavior were kept unchanged.
- Total fields remain editable so users can still correct unusual real-world receipts if needed.

### Files Modified

- `src/components/fuel/FuelLogsModule.tsx`
- `src/components/maintenance/MaintenanceTemplateModule.tsx`
- `specs/live-update.md`

### Commands Run

```bash
npm.cmd exec prettier -- --write src/components/fuel/FuelLogsModule.tsx src/components/maintenance/MaintenanceTemplateModule.tsx
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run tauri:dev
```

### Command Results

- Prettier write: completed, files unchanged after formatting.
- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- `npm.cmd run tauri:dev`: Vite started on `127.0.0.1:1420` and `target\debug\tog5-vms.exe` launched. The process was stopped after launch confirmation; the final nonzero exit was caused by manual Ctrl+C shutdown. No `tog5-vms` process or port `1420` listener remained afterward.

### Manual Checks Still Needed

1. Open Fuel Logs and enter liters plus price per liter.
2. Confirm `Total amount` fills automatically.
3. Open Maintenance and enter labor cost plus parts cost.
4. Confirm `Total cost` fills automatically.
5. Confirm both forms still save normally.

### Decisions Made

- Kept this as frontend form behavior rather than a schema or backend command change.
- Kept total fields editable to avoid blocking real receipts or corrected totals.

### Suggested Next Step

Run the manual form checks above, then continue with the next client feedback item.

---

## Update 2026-07-05 03:16 +08:00 - Interruption Recovery Sanity Check

### Summary

Checked the project after the user manually stopped the app/dev process during the previous follow-up. No broken or half-applied state was found.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Checks Completed

- Confirmed the shell is still operating in the project root.
- Checked for leftover `tog5-vms`, Cargo, and project Node dev processes.
- Checked port `1420`.
- Ran frontend and Rust validation commands.

### Files Modified

- `specs/live-update.md`

### Commands Run

```bash
git status --short --untracked-files=all
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue
Get-Process tog5-vms,cargo,node -ErrorAction SilentlyContinue
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

### Command Results

- Project root confirmed as `C:\Development Projects\TOG5-VMS`.
- No `tog5-vms` app process was running.
- No port `1420` listener remained.
- Only an unrelated Adobe Creative Cloud Node process was visible.
- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- `cargo check --manifest-path src-tauri/Cargo.toml`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed, 65 Rust tests.

### Issues Encountered

- None from the manual stop. The interruption did not corrupt the working tree or leave the dev server running.

### Decisions Made

- Did not relaunch `npm.cmd run tauri:dev` again during this recovery check because the user had already stopped the app manually and port/process cleanup was confirmed.

### Suggested Next Step

Continue with the next client feedback item.

---

## Update 2026-07-05 18:40 +08:00 - Phase 14: Vehicle Maintenance Overview Polish

### Summary

Replaced the stale Vehicle profile `Maintenance setup later` card with a real read-only `Maintenance reminders` overview for the selected vehicle.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Vehicle profile now loads existing vehicle maintenance settings and schedule records for the selected vehicle.
- Added a compact maintenance reminder list to the Vehicle details panel.
- Shows reminder item name, category, due status, due reason, next due date, and next due odometer when available.
- Shows a friendly empty state when no reminders are set for the vehicle.
- Keeps reminder editing and maintenance logging on the Maintenance page, avoiding a second management workflow on Vehicles.
- Updated Vehicles header copy so it no longer references future/template setup.
- Added responsive CSS so reminder rows stack cleanly on narrow windows.
- Recovered from an interrupted `tauri:dev` run and confirmed no TOG5 process or port `1420` listener remained afterward.

### Files Modified

- `src/components/vehicles/VehicleModule.tsx`
- `src/styles.css`
- `specs/live-update.md`

### Commands Run

```bash
Get-Location
git status --short
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,State,OwningProcess
Get-Process -Id 5092 | Select-Object Id,ProcessName,Path
Stop-Process -Id 5092 -Force
npm.cmd exec prettier -- --write src/components/vehicles/VehicleModule.tsx src/styles.css
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:dev
Stop-Process -Id 24648,24672 -Force
```

### Command Results

- Confirmed working directory: `C:\Development Projects\TOG5-VMS`.
- First port check found a leftover `node.exe` listener on `127.0.0.1:1420`; it had already exited by the time `Stop-Process` ran.
- Prettier write completed.
- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `cargo check --manifest-path src-tauri/Cargo.toml`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed, 70 Rust tests.
- `npm.cmd run tauri:dev`: timed out at the tool limit, but process inspection confirmed Vite was listening on `127.0.0.1:1420` and `target\debug\tog5-vms.exe` launched.
- Stopped the TOG5 dev server/app processes after launch confirmation.
- Final port/process check confirmed no `tog5-vms` process or port `1420` listener remained.

### Manual Visual Checks Still Needed

1. Open Vehicles.
2. Select a vehicle with maintenance reminders.
3. Confirm the old `Maintenance setup later` card is gone.
4. Confirm configured maintenance items appear with next due date/km when available.
5. Confirm vehicles with no reminders show the friendly empty reminder message.
6. Confirm the Vehicle profile still looks clean at normal and narrow window widths.

### Decisions Made

- Used existing maintenance setting and schedule APIs instead of adding backend commands or schema changes.
- Kept Vehicle page read-only for reminders because Maintenance remains the primary place to log work and edit reminder intervals.
- Included settings without generated schedules so reminders do not disappear just because no next-due target exists yet.

### Issues Encountered

- The interrupted `tauri:dev` left uncertainty around port `1420`, so the port and app process were checked and cleaned up.
- Codex could confirm process launch but not perform human visual inspection of the desktop window.

### Suggested Next Step

Run the Vehicle page visual check, then continue with the next client feedback item.

---

## Update 2026-07-05 19:27 +08:00 - Phase 14: Maintenance Reminders UI Simplification

### Summary

Removed the separate `Reminders for this vehicle` panel from the Maintenance page and folded reminder management into the `Maintenance items` cards.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Removed the standalone visible `Reminders for this vehicle` workflow from the Maintenance page.
- Kept `Needs attention` and `Log maintenance done` unchanged.
- Each Maintenance item card now shows whether the selected vehicle has a reminder for that item.
- Added inline `Set reminder` / `Edit reminder` / `Remove reminder` controls inside each Maintenance item card.
- Preserved existing vehicle reminder records, alert behavior, schedule behavior, and backend commands.
- Kept Maintenance item add/edit/remove behavior intact.
- Removed stale `Reminders for this vehicle` copy and old reminder-card CSS selectors.
- Added responsive inline reminder editor styling.

### Files Modified

- `src/components/maintenance/MaintenanceTemplateModule.tsx`
- `src/styles.css`
- `specs/live-update.md`

### Commands Run

```bash
Get-Location
npm.cmd exec prettier -- --write src/components/maintenance/MaintenanceTemplateModule.tsx src/styles.css
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run format:check
npm.cmd run build
npm.cmd run tauri:dev
Stop-Process -Id 6096,22908 -Force
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,State,OwningProcess
```

### Command Results

- Confirmed working directory: `C:\Development Projects\TOG5-VMS`.
- Prettier write completed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- `npm.cmd run tauri:dev`: timed out at the tool limit, but process inspection confirmed Vite was listening on `127.0.0.1:1420` and `target\debug\tog5-vms.exe` launched.
- Stopped the TOG5 dev server/app processes after launch confirmation.
- Final port/process check confirmed no `tog5-vms` process or port `1420` listener remained.

### Manual Visual Checks Still Needed

1. Open Maintenance.
2. Confirm the separate `Reminders for this vehicle` panel is gone.
3. Confirm Maintenance item cards show `Set reminder` when no reminder exists.
4. Confirm `Edit reminder` opens inline fields inside the item card.
5. Confirm saving/removing a reminder updates the selected vehicle reminders and Vehicle page overview.
6. Confirm the inline editor stacks cleanly on narrower windows.

### Decisions Made

- Merged reminder controls into Maintenance items instead of deleting reminder functionality.
- Kept due status/next due display out of the Maintenance item cards because the Vehicle profile now shows that overview.
- Did not change backend, database schema, schedule calculation, alerts, or service history behavior.

### Suggested Next Step

Run the Maintenance page visual check, then continue with the next client feedback item.

---

## Update 2026-07-05 20:27 +08:00 - Phase 14: Maintenance Item Reminder Behavior and Card Clipping Fix

### Summary

Aligned the Maintenance item form with the simplified reminder model: the item day/km fields now apply as the selected vehicle's reminder when the item is saved, and the confusing `Set reminder` button flow was removed.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Saving a maintenance item with `Every how many days?` and/or `Every how many km?` now creates or updates the selected vehicle's reminder automatically.
- Saving a maintenance item with both interval fields blank removes the selected vehicle's reminder for that item if one exists.
- Removed the remaining per-card `Set reminder` / inline reminder editor flow.
- Maintenance item cards now show simple status copy:
  - `Tracking for this vehicle...` when a reminder exists.
  - setup guidance when no reminder interval exists yet.
  - legacy guidance if an item has intervals but has not yet been applied to the selected vehicle.
- Editing an item now loads the selected vehicle's actual reminder values when that vehicle already has a reminder for the item.
- Renamed form labels from `Suggested days` / `Suggested km` to `Every how many days?` / `Every how many km?`.
- Removed the nested max-height/scroll behavior from the maintenance item list to prevent cards and buttons from clipping into each other.

### Files Modified

- `src/components/maintenance/MaintenanceTemplateModule.tsx`
- `src/styles.css`
- `specs/live-update.md`

### Commands Run

```bash
Get-Location
npm.cmd exec prettier -- --write src/components/maintenance/MaintenanceTemplateModule.tsx src/styles.css
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run format:check
npm.cmd run build
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,State,OwningProcess
Stop-Process -Id 32332 -Force
npm.cmd run tauri:dev
Stop-Process -Id 10696 -Force
npm.cmd run tauri:dev
Stop-Process -Id 22352,32772 -Force
```

### Command Results

- Confirmed working directory: `C:\Development Projects\TOG5-VMS`.
- Prettier write completed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- First `npm.cmd run tauri:dev`: failed because a stale `tog5-vms.exe` process still held `src-tauri\target\debug\tog5-vms.exe`, causing Windows `Access is denied`.
- Stopped the stale `tog5-vms.exe` process and retried.
- Second `npm.cmd run tauri:dev`: timed out at the tool limit, but process inspection confirmed Vite was listening on `127.0.0.1:1420` and `target\debug\tog5-vms.exe` launched.
- Stopped the TOG5 dev server/app processes after launch confirmation.
- Final port/process check confirmed no `tog5-vms` process remained; only temporary `TIME_WAIT` sockets were visible.

### Manual Visual Checks Still Needed

1. Open Maintenance.
2. Add a maintenance item with days/km values and confirm it shows as tracking for the selected vehicle after save.
3. Confirm there is no separate `Set reminder` button flow.
4. Edit an item, clear both interval fields, save, and confirm the selected vehicle reminder is removed.
5. Confirm item cards no longer clip or overlap inside the list.
6. Confirm the Vehicle page maintenance overview reflects the changed reminder.

### Decisions Made

- Treated the item interval fields as the selected vehicle's reminder intervals because that matches the simplified client expectation.
- Kept backend schema and command APIs unchanged.
- Left legacy items with intervals but no selected-vehicle reminder as a visible guidance state; editing and saving them applies the interval to the selected vehicle.

### Suggested Next Step

Run the Maintenance visual checks, then continue with the next client feedback item.

---

## Update 2026-07-05 03:07 +08:00 - Interruption Sanity Check

### Summary

Verified that the manual stop after the previous Tauri dev run did not leave the TOG 5 VMS workspace, dev server, or validation state broken.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Checks Completed

- Confirmed the current working directory is still the project root.
- Confirmed no `tog5-vms` or Cargo process remained running.
- Confirmed port `1420` was clear.
- Confirmed the working tree still contains the expected Phase 14 client-fix files.

### Commands Run

```bash
git status --short --untracked-files=all
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue
Get-Process tog5-vms,cargo,node -ErrorAction SilentlyContinue
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

### Command Results

- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `cargo check --manifest-path src-tauri/Cargo.toml`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed, 65 Rust tests.
- No TOG5 app process or port `1420` listener remained after the manual stop.

### Files Modified

- `specs/live-update.md`

### Issues Encountered

- No broken or interrupted source changes were found.

### Suggested Next Step

Continue with the next client feedback item.

---

## Update 2026-07-05 02:13 +08:00 - Dashboard Monthly Cost Mix Simplification

### Summary

Simplified the Dashboard `Monthly cost mix` section from four rows to three clearer rows: Fuel, Maintenance, and Manual Expenses.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Removed the separate Dashboard `Repairs` cost-mix row.
- Renamed `Service` to `Maintenance`.
- Combined maintenance/service costs and repair costs into the single Dashboard `Maintenance` row so the visible rows still add up to the monthly total.
- Renamed `Manual` to `Manual Expenses`.
- Updated Dashboard cost-mix helper copy to match the simplified three-category display.
- Kept backend cost aggregation, Reports detail, and database behavior unchanged.

### Files Modified

- `src/components/dashboard/DashboardModule.tsx`
- `specs/live-update.md`

### Commands Run

```bash
npm.cmd exec prettier -- --write src/components/dashboard/DashboardModule.tsx
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run tauri:dev
```

### Command Results

- Prettier write: completed, `DashboardModule.tsx` unchanged after formatting.
- `npm.cmd run test`: passed, 12 Vitest tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run build`: passed.
- First `npm.cmd run tauri:dev`: failed because port `1420` was already in use by a leftover TOG5 dev server.
- Stopped the leftover TOG5 dev process and retried once.
- Second `npm.cmd run tauri:dev`: Vite started on `127.0.0.1:1420` and `target\debug\tog5-vms.exe` launched. The process was stopped after launch confirmation; the final nonzero exit was caused by manual Ctrl+C shutdown. No `tog5-vms` process or port `1420` listener remained afterward.

### Manual Checks Still Needed

1. Open Dashboard.
2. Confirm `Monthly cost mix` shows only Fuel, Maintenance, and Manual Expenses.
3. Confirm Maintenance includes maintenance/service and repair costs as one Dashboard category.
4. Confirm Reports still show detailed cost categories where needed.

### Decisions Made

- Kept this as a Dashboard display simplification instead of changing backend/report data structures.
- Kept repair totals available internally and in detailed Reports, but grouped them under Maintenance on the Dashboard because the separate Dashboard row felt redundant.

### Suggested Next Step

Run the Dashboard visual check, then continue with the next client feedback item.

---

## Update 2026-07-05 21:32 +08:00 - Phase 14: Trip Logs and Trip Reports

### Summary

Added a new local-only Trips module for operational vehicle trip logging and added Trip Reports beside the existing maintenance/cost reports.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Added a new Trips sidebar page.
- Added trip start workflow with vehicle, time out, multiple drivers, optional passengers, reason, multiple destinations, and departure notes.
- Added trip return workflow for open trips with return time and return notes.
- Added open trip and past trip lists with friendly empty states.
- Prevented starting a second open trip for the same vehicle.
- Added local SQLite trip tables through a new migration.
- Added Rust Trips repository, Tauri commands, and Rust tests.
- Added typed frontend Trips API wrapper.
- Added a `Trip Reports` tab to the existing Reports page.
- Trip Reports show total trips, currently-out trips, completed trips, trips by vehicle, trips by driver, common destinations, and recent trips.
- Kept Trips independent from odometer, fuel, maintenance, expenses, backup, auth, cloud, OCR, and native notifications.

### Files Created

- `src-tauri/migrations/004_trip_logs.sql`
- `src-tauri/src/trips/mod.rs`
- `src-tauri/src/trips/models.rs`
- `src-tauri/src/trips/repository.rs`
- `src-tauri/src/trips/commands.rs`
- `src/components/trips/TripsModule.tsx`
- `src/services/api/trips.ts`

### Files Modified

- `src-tauri/src/db/mod.rs` - registered trip migration and migration tests.
- `src-tauri/src/lib.rs` - registered Trips module and commands.
- `src/app/App.tsx` - added Trips route.
- `src/app/routes/Pages.tsx` - added Trips page wrapper.
- `src/types/navigation.ts` - added Trips navigation item.
- `src/components/reports/ReportsModule.tsx` - added report tabs and Trip Reports UI.
- `src/styles.css` - added Trips and report tab styling/responsive rules.
- `specs/live-update.md` - recorded this update.

### Files Deleted

- None.

### Commands Run

```bash
cargo check --manifest-path src-tauri/Cargo.toml
npm.cmd exec prettier -- --write src-tauri/migrations/004_trip_logs.sql src/app/App.tsx src/app/routes/Pages.tsx src/components/trips/TripsModule.tsx src/components/reports/ReportsModule.tsx src/services/api/trips.ts src/styles.css src/types/navigation.ts
npm.cmd run typecheck
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run test
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:dev
```

### Command Results

- Initial Rust check: passed.
- Prettier write: TS/CSS files formatted; SQL migration was left hand-formatted because Prettier could not infer a SQL parser.
- Typecheck: passed.
- Rust fmt: passed.
- Rust tests: passed, 74 tests.
- Vitest: passed, 12 tests.
- Lint: passed.
- Format check: passed.
- Frontend build: passed.
- Rust fmt check: passed.
- Rust check: passed.
- Tauri dev launch: first run timed out without app confirmation and left dev processes; those were stopped. The retry timed out because the dev app stays running, but `target\debug\tog5-vms.exe` was confirmed running and then stopped.

### Issues Encountered

- Tauri dev output did not surface before the tool timeout. Process inspection confirmed the second launch reached the native app.
- PowerShell blocked process command-line inspection through CIM, so cleanup used the visible TOG5/Cargo/Node process IDs from the launch while leaving unrelated Adobe Node untouched.

### Decisions Made

- Used simple text names for drivers, passengers, and destinations instead of adding a people directory.
- Made Trips independent from odometer and distance calculations per client request.
- Blocked duplicate open trips for the same vehicle to avoid impossible active vehicle usage.
- Kept cancelled trip status internal/future-facing and did not show a cancelled workflow because users cannot currently create cancelled trips.
- Added Trip Reports as a tab in Reports instead of creating a second reports navigation page.

### Important Implementation Details

- New tables: `trips`, `trip_drivers`, `trip_passengers`, and `trip_destinations`.
- Trips use `open` and `completed` states in the current UI.
- Archiving a trip hides it from trip history without hard-deleting the row.
- Reports filters for vehicle/date range are shared between maintenance/cost reports and Trip Reports.

### Manual Visual Checks Still Needed

1. Open Trips from the sidebar.
2. Start a trip with multiple drivers and multiple destinations.
3. Confirm the open trip appears under `Currently out`.
4. End the trip and confirm it moves to `Past trips`.
5. Confirm a second open trip for the same vehicle is blocked.
6. Open Reports and switch to `Trip Reports`.
7. Confirm trip counts, driver totals, destination totals, and recent trips update.
8. Confirm Dashboard, Vehicles, Maintenance, Fuel Logs, Service History, Expenses, Backup, Alerts, and Settings still open.

### Suggested Next Step

Run the Trips and Trip Reports visual checks with the client, then continue with the next client-requested fix or packaging handoff.

---

## Update 2026-07-06 00:01 +08:00 - Phase 14: Trips Time Out Field Layout Fix

### Summary

Fixed a Trips page UI bug where the `Time out` datetime input could clip outside the Start trip form container.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Changed the Start trip top form grid to a single-column layout so the native datetime input has enough horizontal space.
- Added width guards for Trips form inputs, selects, and textareas.
- Removed a stale unused Trips type import found by lint.
- Kept Trips backend, database schema, reports behavior, and trip data unchanged.

### Files Modified

- `src/components/trips/TripsModule.tsx`
- `src/styles.css`
- `specs/live-update.md`

### Commands Run

```bash
npm.cmd exec prettier -- --write src/styles.css
npm.cmd run typecheck
npm.cmd run lint
npm.cmd exec prettier -- --write src/components/trips/TripsModule.tsx src/styles.css
npm.cmd run format:check
npm.cmd run build
```

### Command Results

- Prettier write: passed.
- Typecheck: passed.
- Lint: initially failed because `TripStatus` was unused after the Trips filter simplification; fixed and reran successfully.
- Format check: passed.
- Frontend build: passed.

### Manual Visual Checks Still Needed

1. Open Trips.
2. Confirm the `Time out` field stays inside the Start trip form at the client screenshot width.
3. Confirm wider and narrower window widths do not clip the datetime field.
4. Confirm Start trip still saves normally.

### Suggested Next Step

Run the Trips visual check, then continue with the next client feedback item.

---

## Update 2026-07-06 00:07 +08:00 - Phase 14: Reports Export and Print Polish

### Summary

Added separate export and print actions for Maintenance reports and Trips reports, and renamed the `Trip Reports` tab to `Trips`.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Renamed the Reports tabs to `Maintenance` and `Trips`.
- Added a report action bar that changes with the active tab.
- Added `Export maintenance CSV` and `Print maintenance` actions.
- Added `Export trips CSV` and `Print trips` actions.
- Maintenance exports include summary totals, category totals, monthly totals, vehicle summaries, and recent cost events.
- Trips exports include summary totals, trips by vehicle, trips by driver, trips by destination, and recent trips.
- Print actions generate a dedicated print document for the active report instead of printing the whole app shell.
- Updated visible cost labels from `Service` to `Maintenance` in the Reports page.
- Kept this frontend-only; no database, Rust, command, or schema changes were needed.

### Files Modified

- `src/components/reports/ReportsModule.tsx`
- `src/styles.css`
- `specs/live-update.md`

### Commands Run

```bash
npm.cmd exec prettier -- --write src/components/reports/ReportsModule.tsx src/styles.css
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
```

### Command Results

- Prettier write: passed.
- Typecheck: passed.
- Lint: passed.
- Format check: passed.
- Frontend build: passed.

### Manual Visual Checks Still Needed

1. Open Reports.
2. Confirm tabs are labeled `Maintenance` and `Trips`.
3. Confirm Maintenance export downloads a CSV.
4. Confirm Maintenance print opens the print dialog/document.
5. Confirm Trips export downloads a CSV.
6. Confirm Trips print opens the print dialog/document.
7. Confirm report filters affect both export and print output.

### Suggested Next Step

Run the Reports export/print manual checks, then continue with the next client feedback item.

---

## Update 2026-07-06 04:08 +08:00 - Phase 14: Final QA Findings Cleanup

### Summary

Implemented the high-signal findings from the final QA pass without changing database schema or broad product behavior.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Changes Made

- Added Trips tables to Settings clear-data product cleanup so trip logs, drivers, passengers, and destinations are explicitly cleared instead of relying on vehicle cascade behavior.
- Expanded the clear-data Rust test fixture to include a completed trip and related driver/passenger/destination rows.
- Updated Settings danger-zone copy to mention trip logs.
- Changed Trips so the `Currently out` list ignores history date/status filters while still respecting the vehicle filter.
- Updated Trips history copy to avoid saying archived trips are shown in the normal history list.
- Updated stale Reports wording from `Service` to `Maintenance` in visible copy and CSV export rows.
- Updated stale Vehicle form copy that still referenced future/later phases.
- Updated the Reports navigation description now that printable/exportable summaries exist.
- Replaced remaining native browser confirmation dialogs in Vehicles, Maintenance, and Trips with inline app-styled confirmation controls.

### Files Modified

- `src-tauri/src/settings/repository.rs`
- `src/components/settings/SettingsModule.tsx`
- `src/components/trips/TripsModule.tsx`
- `src/components/reports/ReportsModule.tsx`
- `src/components/vehicles/VehicleModule.tsx`
- `src/types/navigation.ts`
- `src/styles.css`
- `specs/live-update.md`

### Commands Run

```bash
npm.cmd exec prettier -- --write src/components/trips/TripsModule.tsx src/components/reports/ReportsModule.tsx src/components/vehicles/VehicleModule.tsx src/components/settings/SettingsModule.tsx src/types/navigation.ts
cargo fmt --manifest-path src-tauri/Cargo.toml
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd exec prettier -- --write src/components/vehicles/VehicleModule.tsx src/components/maintenance/MaintenanceTemplateModule.tsx src/components/trips/TripsModule.tsx src/styles.css
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

### Command Results

- Prettier write: passed; files were already formatted.
- Rust format: passed.
- Frontend tests: passed, 12 tests on both validation runs.
- Typecheck: passed on both validation runs.
- Lint: passed on both validation runs.
- Format check: passed on both validation runs.
- Frontend build: passed on both validation runs.
- Rust format check: passed on both validation runs.
- Cargo check: passed on both validation runs.
- Rust tests: passed, 74 tests on both validation runs.

### Tauri Launch

Not run for this cleanup pass. Changes were covered by automated frontend/Rust validation; human visual confirmation is still recommended for the Trips current-trip filter and the updated copy.

### Issues Encountered

- One initial grep command had PowerShell quoting trouble; reran with safer quoting and confirmed the stale QA phrases were removed from active source files.

### Decisions Made

- Kept open/current trips visible regardless of date range so active operational trips do not disappear when history filters are changed.
- Kept the vehicle filter on current trips because selecting one vehicle should still focus that page.
- Used inline confirmation rows instead of native browser confirmation dialogs so archive/remove actions stay consistent with the rest of the app.

### Manual Visual Checks Still Needed

1. Open Settings and confirm Clear Local Product Data copy mentions trip logs.
2. Create or view an open trip, change date filters, and confirm it stays visible in `Currently out`.
3. Confirm Trips history copy reads cleanly.
4. Open Reports and confirm visible labels say Maintenance rather than Service.
5. Export a Maintenance CSV and confirm the summary row uses Maintenance.
6. Open Vehicles add/edit form and confirm the helper copy no longer mentions later phases.
7. Confirm archive/remove actions in Vehicles, Maintenance, and Trips show inline confirmation controls.

### Suggested Next Step

Run the manual visual checks above, then package or hand off the updated build to the client if no new feedback appears.

---

## Update 2026-07-06 13:11 +08:00 - Reports CSV Export Feedback and Reliability

### Summary

Fixed Reports CSV export so it no longer depends on a silent browser-style download. Reports now save CSV files through a Tauri backend command and show a clear success message with the saved local path.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Root Cause

- Reports export previously created a `Blob`, clicked a hidden `<a download>`, and immediately revoked the object URL.
- This provided no success/failure feedback, and in the desktop WebView it could look like nothing happened even when the click handler ran.

### Changes Made

- Added a dedicated Rust `reports` module for local CSV export.
- Added `export_report_csv` Tauri command.
- CSV exports now save to the app-data `report-exports/` folder.
- Export filenames are sanitized and duplicate exports receive `-2`, `-3`, etc. instead of overwriting.
- Added a 20 MB report export size guard.
- Added a typed frontend `src/services/api/reports.ts` wrapper.
- Reports page now shows:
  - `Exporting...` while saving.
  - `CSV exported.` after success.
  - the saved local file path.
  - `Show file`, using the existing Tauri opener plugin to reveal the exported CSV.
- Removed the old hidden-link `Blob` download helper.

### Files Created

- `src-tauri/src/reports/mod.rs`
- `src-tauri/src/reports/models.rs`
- `src-tauri/src/reports/export.rs`
- `src-tauri/src/reports/commands.rs`
- `src/services/api/reports.ts`

### Files Modified

- `src-tauri/src/lib.rs`
- `src/components/reports/ReportsModule.tsx`
- `src/styles.css`
- `specs/live-update.md`

### Commands Run

```bash
npm.cmd exec prettier -- --write src/components/reports/ReportsModule.tsx src/services/api/reports.ts src/styles.css
cargo fmt --manifest-path src-tauri/Cargo.toml
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run test
npm.cmd run format:check
cargo fmt --manifest-path src-tauri/Cargo.toml --check
```

### Command Results

- Prettier write: passed.
- Rust format: passed.
- Typecheck: passed.
- Lint: passed.
- Frontend build: passed.
- Cargo check: passed.
- Rust tests: passed, 76 tests.
- Frontend tests: passed, 12 tests.
- Format check: passed.
- Rust format check: passed.

### Tauri Launch

Not run for this export fix. The backend command is covered by `cargo check`/`cargo test`; manual click testing is still needed.

### Manual Visual Checks Still Needed

1. Open Reports.
2. Click `Export maintenance CSV`.
3. Confirm `CSV exported.` appears with a local path.
4. Click `Show file` and confirm File Explorer reveals the CSV.
5. Switch to Trips and repeat `Export trips CSV`.
6. Confirm repeated exports do not overwrite older files.

### Suggested Next Step

Run the manual export checks above, then rebuild/package the client handoff if the export behavior is confirmed.

---

## Update 2026-07-06 13:31 +08:00 - Reports Show File Permission Fix

### Summary

Fixed the Reports `Show file` action after CSV export. The export itself worked, but Tauri blocked `revealItemInDir` because the app did not explicitly allow the opener reveal permission.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Root Cause

- The Reports page uses the Tauri opener plugin to reveal the exported CSV in File Explorer.
- Tauri v2 requires the `opener:allow-reveal-item-in-dir` permission for that command.
- The project did not have a capabilities file granting that permission.

### Fix Made

- Added `src-tauri/capabilities/default.json`.
- Granted:
  - `core:default`
  - `opener:default`
  - `opener:allow-reveal-item-in-dir`

### Files Created

- `src-tauri/capabilities/default.json`

### Files Modified

- `specs/live-update.md`

### Commands Run

```bash
npm.cmd run format:check
cargo check --manifest-path src-tauri/Cargo.toml
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
```

### Command Results

- Format check: passed.
- Cargo check: passed.
- Typecheck: passed.
- Lint: passed.
- Frontend build: passed.
- Rust format check: passed.

### Tauri Launch

Not run for this targeted permission fix. Manual runtime confirmation is still needed because the issue only appears when clicking `Show file` in the desktop app.

### Manual Visual Checks Still Needed

1. Open Reports.
2. Export a Maintenance or Trips CSV.
3. Click `Show file`.
4. Confirm File Explorer opens/reveals the exported CSV without a permission error.

### Suggested Next Step

Rerun the Reports export check in the desktop app, then rebuild/package once confirmed.

---

## Update 2026-07-06 14:13 +08:00 - Client Handoff Version Bump and User Manual

### Summary

Prepared the app for client handoff by bumping the local MVP version from `0.1.0` to `0.2.0`, creating an end-user manual, refreshing handoff/testing docs, and building a fresh Windows installer.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Version / Metadata Changes

- Updated app/package version to `0.2.0` in Node, Rust, and Tauri metadata.
- Kept the app name `TOG 5 VMS`.
- Kept the app identifier `com.tog5.vms` unchanged so existing app-data paths are not disrupted.
- Generated a new `0.2.0` NSIS installer.

### Manual / Handoff Documentation

- Created `docs/TOG5-VMS-user-manual-v0.2.0.md`.
- Updated the Phase 14 client smoke-test plan and bug triage log to reference version `0.2.0`.
- Updated the Windows release checklist with current Trips, Reports export/print, and handoff expectations.

### Files Created

- `docs/TOG5-VMS-user-manual-v0.2.0.md`

### Files Modified

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`
- `docs/release/phase-13-windows-release-checklist.md`
- `docs/testing/phase-14-bug-triage-log.md`
- `docs/testing/phase-14-client-smoke-test-plan.md`
- `specs/live-update.md`

### Commands Run

```bash
Get-Location
git status --short --untracked-files=all
rg -n '0\.1\.0|0\.2\.0|productName|identifier|version' package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json docs specs/live-update.md
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:build
Get-Item "src-tauri\target\release\bundle\nsis\TOG 5 VMS_0.2.0_x64-setup.exe"
npm.cmd exec prettier -- --check docs/TOG5-VMS-user-manual-v0.2.0.md docs/release/phase-13-windows-release-checklist.md docs/testing/phase-14-bug-triage-log.md docs/testing/phase-14-client-smoke-test-plan.md
npm.cmd exec prettier -- --write docs/testing/phase-14-bug-triage-log.md docs/testing/phase-14-client-smoke-test-plan.md
```

### Command Results

- Project root check: confirmed.
- Version search: app metadata now references `0.2.0`; remaining `0.1.0` hits are third-party dependency versions or historical `v0.1.0` release notes.
- Frontend tests: passed, 12 tests.
- Typecheck: passed.
- Lint: passed.
- Format check: passed.
- Frontend production build: passed.
- Rust format check: passed.
- Cargo check: passed.
- Cargo format: passed.
- Rust tests: passed, 76 tests.
- Tauri production build: passed.
- Docs Prettier check initially reported wrapping differences in two testing docs; Prettier write fixed them.
- Final docs Prettier check: passed.

### Packaging Result

- Release binary built at `src-tauri/target/release/tog5-vms.exe`.
- NSIS installer built at `src-tauri/target/release/bundle/nsis/TOG 5 VMS_0.2.0_x64-setup.exe`.
- Installer size observed: 3,224,683 bytes.

### Tauri Launch

Tauri dev launch was not run for this documentation/versioning task. The production build and installer generation completed successfully; human installer/window confirmation is still recommended before sending the final package.

### Manual Visual Checks Still Needed

1. Run `TOG 5 VMS_0.2.0_x64-setup.exe` on the target Windows machine.
2. Confirm the app installs and launches.
3. Confirm Dashboard, Vehicles, Fuel Logs, Trips, Maintenance, Service History, Expenses, Reports, Alerts, Backup & Restore, and Settings open.
4. Confirm report export `Show file` works after the permission fix.
5. Confirm the user manual matches the delivered build.

### Decisions Made

- Used `0.2.0` as the client handoff version because the product has moved beyond the original `0.1.0` local MVP packaging baseline.
- Did not change the Tauri identifier to avoid moving or orphaning existing app data.
- Kept historical `v0.1.0` release notes in place as history instead of rewriting them.

### Known Issues / Release Caveats

- Installer is unsigned and may trigger Windows SmartScreen warnings.
- Database encryption is not enabled.
- Backups remain local `.tog5backup` folder packages.
- Startup-on-boot preference is stored as a setting but does not register with Windows startup yet.
- Human visual smoke testing is still recommended before final client delivery.

### Suggested Next Step

Give the client the `TOG 5 VMS_0.2.0_x64-setup.exe` installer together with `docs/TOG5-VMS-user-manual-v0.2.0.md` and, if helpful, the client smoke-test plan.

---

## Update 2026-07-06 15:14 +08:00 - v0.2.0 Logo Refresh

### Summary

Updated the app icon/logo assets using the new root source image `logo-v0.2.0.png`.

### Confirmed Project Root

`C:\Development Projects\TOG5-VMS`

### Logo/Icon Approach

- Used Tauri's icon generator to regenerate the full icon set from `logo-v0.2.0.png`.
- Left the existing Tauri icon configuration unchanged because it already references the generated icon files in `src-tauri/icons/`.
- Rebuilt the Windows release installer so the delivered `0.2.0` package uses the refreshed icon.

### Files Modified

- `src-tauri/icons/32x32.png`
- `src-tauri/icons/64x64.png`
- `src-tauri/icons/128x128.png`
- `src-tauri/icons/128x128@2x.png`
- `src-tauri/icons/icon.png`
- `src-tauri/icons/icon.ico`
- `src-tauri/icons/icon.icns`
- `src-tauri/icons/StoreLogo.png`
- `src-tauri/icons/Square*.png`
- `src-tauri/icons/android/**`
- `src-tauri/icons/ios/**`
- `specs/live-update.md`

### Commands Run

```bash
Get-Location
Get-ChildItem -Force | Where-Object { $_.Name -like '*logo*' }
rg -n "logo|vms-logo|icon\.png|src-tauri/icons|32x32|128x128|icon\.ico|icon\.icns" AGENTS.md README.md specs src package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
Get-ChildItem src-tauri\icons
npm.cmd run tauri -- icon logo-v0.2.0.png
git status --short --untracked-files=all
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run format:check
cargo check --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
npm.cmd run test
cargo test --manifest-path src-tauri/Cargo.toml
npm.cmd run tauri:build
Get-Item "src-tauri\target\release\bundle\nsis\TOG 5 VMS_0.2.0_x64-setup.exe"
git ls-files logo-v0.2.0.png
git check-ignore -v logo-v0.2.0.png
```

### Command Results

- Project root check: confirmed.
- New source logo: found at `logo-v0.2.0.png`.
- Tauri icon generation: passed.
- Typecheck: passed.
- Lint: passed.
- Frontend build: passed.
- Format check: passed.
- Cargo check: passed.
- Rust format check: passed.
- Frontend tests: passed, 12 tests.
- Rust tests: passed, 76 tests.
- Tauri production build: passed.
- `logo-v0.2.0.png` is tracked by Git and not ignored.

### Packaging Result

- Rebuilt release binary: `src-tauri/target/release/tog5-vms.exe`.
- Rebuilt NSIS installer: `src-tauri/target/release/bundle/nsis/TOG 5 VMS_0.2.0_x64-setup.exe`.
- Installer size observed after logo refresh: 3,344,057 bytes.

### Tauri Launch

Tauri dev launch was not run for this icon-only update. The production installer was rebuilt successfully. Human visual confirmation is still recommended to verify the installer icon, taskbar icon, and window icon look correct on Windows.

### Manual Visual Checks Still Needed

1. Launch the rebuilt installer or app.
2. Confirm the installer icon uses the new logo.
3. Confirm the installed app shortcut/taskbar/window icon uses the new logo.

### Suggested Next Step

Use the refreshed `TOG 5 VMS_0.2.0_x64-setup.exe` installer for the client handoff after a quick visual icon check.

## 2026-07-20 — Backup Validation Error Reporting

### Phase / Milestone

Post-v0.2.0 client support fix. Backup & Restore validation reporting.

### Background

A client backed up on one computer, moved the backup to a new computer, and could not restore.
Validation reported "Backup validation found issues. Restore is disabled until they are fixed."
with no indication of the cause or the fix.

Root cause was a user mistake, not a defect: only the `tog5-vms.sqlite3` file from inside the
`.tog5backup` folder was copied, rather than the whole package folder. Validation correctly
refused it, but reported it as `package_not_folder` / `manifest_invalid`, which does not tell a
non-technical user what to do. The failure text was also written to `successMessage`, so a
failed validation rendered inside the green success box.

### Files Changed

- `src-tauri/src/backup/service.rs`
- `src/components/backup/BackupRestoreModule.tsx`
- `src/styles.css`
- `docs/TOG5-VMS-user-manual-v0.2.0.md`
- `specs/live-update.md`

### Summary of Changes

1. New validation issue code `database_file_selected`. Raised when the selected path is a SQLite
   database file (detected by `.sqlite3` / `.sqlite` / `.db` extension, or by the
   `SQLite format 3` file header so a renamed copy is still caught), or when the selected folder
   holds a loose database file with no `manifest.json` and no `files` folder. The message tells
   the user to copy the whole `.tog5backup` folder from the source computer.
2. A genuine package with a missing or damaged manifest still reports `manifest_invalid`. The
   `files` folder check keeps the two cases apart.
3. Rewrote `package_not_folder`, `manifest_invalid`, `manifest_file_missing` and `size_mismatch`
   messages to state the fix. `size_mismatch` now includes expected and actual byte counts.
   Partial copies and cloud storage placeholder files are called out explicitly.
4. Failed validation now routes to `errorMessage` instead of `successMessage`, so it renders in
   the red error box. The summary names the issue count and codes.
5. Issue codes are now rendered in `IssueList`, and `ValidationResultCard` gained a
   `Copy diagnostic report` button that copies the full validation result as JSON.
6. User manual gained a "Moving a Backup to Another Computer" section.

### Tests Added

- `backup_validation_explains_when_only_the_database_file_was_copied` — covers the loose database
  file, the same file renamed to remove its extension, and the file placed in its own folder.
- `backup_validation_reports_a_damaged_manifest_rather_than_a_loose_database` — regression guard
  ensuring a real package with a removed manifest is not misreported as the above.

### Commands Run

- `npm install` — dependencies were not previously installed in this environment.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 12 tests.

### Errors Encountered

None in the frontend checks.

### Not Yet Verified

**The Rust changes are unverified.** No Rust toolchain is installed in this WSL environment
(`cargo` not found, `rustc` not installed), and the Tauri system build dependencies are likely
absent as well. `cargo test`, `cargo fmt` and `cargo clippy` were NOT run, so the two new tests
have never executed and `src-tauri/src/backup/service.rs` has not been compiled.

Run the following on the Windows build machine before releasing:

```
cargo fmt --check
cargo clippy
cargo test
```

### Decisions Made

- Kept scope to the reporting dead end. Two unrelated findings were deliberately left out:
  1. `validate_database_snapshot` hard-fails when a backup's schema is older than the current
     build, which blocks legitimate old-computer to new-computer restores. Startup already runs
     migrations, so this check is stricter than necessary. Worth a separate change.
  2. `db::database_status` is registered in `lib.rs` but has no frontend caller. Surfacing app
     version, database path and applied migrations in Settings would help diagnose version gaps.
- Did not add a native folder picker. The backup path is still a free text input, which is what
  allowed the wrong path to be entered. Adding `tauri-plugin-dialog` would remove this error
  class outright but adds a dependency. Deferred until clearer messaging is shown to be
  insufficient.

### Remaining Issues

- Rust build, format, lint and tests must be run on a machine with the toolchain.
- Manual check still needed: point the path field at a bare `.sqlite3` file, validate, and
  confirm the message appears in the red box with the `database_file_selected` code.

### Suggested Next Step

Tell the client to copy the entire folder ending in `.tog5backup`, not the database file inside
it. Their data is intact and no repair is needed. Then run the Rust test suite on the build
machine and fold these changes into the next build.

## 2026-07-20 — Backup Validation Reporting v0.3.0: Windows Build Verification

### Phase / Milestone

Post-v0.2.0 client support fix, continued. First compile/build of the `database_file_selected`
backup validation change on a machine with a real Rust toolchain, closing out the "Not Yet
Verified" item from the entry above. Branch `fix/backup-validation-reporting-v0.3.0`.

### Background

The Rust side of this change was written in WSL with no `cargo`/`rustc` available, so
`src-tauri/src/backup/service.rs` had never been compiled. This session ran on a Windows
machine that also had no Rust toolchain installed (`cargo`, `rustc`, `rustup` all absent from
both Git Bash and PowerShell), so `rustup` (stable-x86_64-pc-windows-msvc) was installed via
`winget install --id Rustlang.Rustup -e` before any Rust command could run. MSVC Build Tools
and the WebView2 runtime were already present on the machine, so no other prerequisites were
needed.

### Files Changed

- `specs/live-update.md` (this entry only; no source changes were needed)

### Commands Run

- `winget install --id Rustlang.Rustup -e --source winget` — installed
  `stable-x86_64-pc-windows-msvc` (cargo 1.97.1, rustc 1.97.1).
- `npm install` — passed, 203 packages, 0 vulnerabilities.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 12 tests.
- `cargo fmt --check` (src-tauri) — passed, no diff.
- `cargo clippy --all-targets --all-features` (src-tauri) — passed, exit 0. 5 pre-existing
  warnings (`manual_inspect` x3, `too_many_arguments` x1) in `maintenance/commands.rs`,
  `maintenance/seeds.rs`, and `vehicles/commands.rs` — unrelated to this change, left as-is.
  None of the new backup validation code triggered a warning.
- `cargo test` (src-tauri) — passed, 78 passed; 0 failed. Both new tests confirmed:
  `backup_validation_explains_when_only_the_database_file_was_copied` and
  `backup_validation_reports_a_damaged_manifest_rather_than_a_loose_database`.
- `npm run tauri:build` — passed. Release binary and NSIS installer built successfully.

### Test/Build Results

- The const-sized header array (`[0_u8; SQLITE_FILE_HEADER.len()]`) and the nested
  `.flatten().flatten()` chain in `looks_like_sqlite_file` / `is_loose_database_folder`
  (`src-tauri/src/backup/service.rs`) both compiled without changes on current stable Rust
  (1.97.1) and needed no fixes.
- No compile errors anywhere in `src-tauri`. No source changes were required this session.

### Packaging Result

- Release binary: `src-tauri/target/release/tog5-vms.exe`.
- NSIS installer: `src-tauri/target/release/bundle/nsis/TOG 5 VMS_0.3.0_x64-setup.exe`.
- Installer size: 3,252,296 bytes.

### Errors Encountered

None.

### Decisions Made

- Installed `rustup` via `winget` rather than asking the user to do it manually, per their
  explicit go-ahead, since it was the only way to actually run the compile/test/build steps
  this task required.
- Did not touch the two deferred findings noted in the entry above
  (`validate_database_snapshot` schema strictness, unused `db::database_status` command) or the
  unrelated pre-existing clippy warnings — out of scope for this verification pass.

### Remaining Issues

- Manual check still needed: point the path field at a bare `.sqlite3` file, validate, and
  confirm the message appears in the red box with the `database_file_selected` code (carried
  over from the entry above; still not done since it requires running the built app).
- The two deferred findings from the previous entry (old-schema restore blocking,
  unused `database_status` command) remain open.

### Suggested Next Step

Manually smoke-test the built installer (`TOG 5 VMS_0.3.0_x64-setup.exe`) — install it, then
exercise the "select a bare .sqlite3 file" and "select a folder with just the database" paths
in Backup & Restore to confirm the red error box and diagnostic copy button render as expected.
Once confirmed, this branch is ready to merge to `main`.

---

## 2026-08-02 — v0.4.0 Online Migration (Phases 1–8)

### Phase / Milestone

The whole v0.4.0 migration, on `feat/online-migration-v0.4.0`: TOG 5 VMS goes from a
single-seat offline desktop app to a self-hosted multi-user web app the client's staff can
reach from anywhere.

### Why

The client asked for the app to be usable by several people from anywhere, without paying for
a subscription. That is flatly incompatible with the local-only rule the project had held
since v0.1.0, so the rule changed rather than the request. The data still never leaves
hardware the client owns.

### What Changed

**Schema (migration 005).** Added `sessions`, `last_login_at`/`password_updated_at` on users,
and nullable `created_by`/`updated_by` on the seven transactional tables. `audit_logs` existed
and was indexed but nothing had ever written to it; it does now.

**crates/vms-core.** The domain, persistence, and file-storage code moved out of `src-tauri`
and became Tauri-free. `AppHandle` was replaced by an `AppPaths` value — the entire Tauri
coupling in the backend turned out to be `AppHandle → app_data_dir: PathBuf`. Per-call
`open_app_connection` (which re-ran every migration on every call) became an r2d2 pool built
once at startup.

**Authentication.** Argon2 hashing, server-side sessions storing only a SHA-256 of the token,
a one-time setup route that refuses once any account has a password, and `create_user` so
"multiple users" is actually reachable. Sign-in gives the same message for an unknown username
and a wrong password, and spends the same time on both.

**crates/vms-server.** Axum. All 66 commands at `POST /api/rpc/{command}`, taking the same
JSON object the desktop build passed to `invoke`. Vehicle photos and receipts moved from
Tauri's asset protocol to `GET /api/files/{kind}/{name}`. Six destructive commands are
owner-only. Database and file work runs on `spawn_blocking`.

**Frontend.** One new `client.ts` exporting an `invoke`-shaped `fetch`; ten changed import
lines; zero changed call sites. Sign-in screen, auth gate, sign-out in the sidebar. CSV export
now downloads through the browser instead of writing to the server's disk.

**Clients.** PWA with `display: "standalone"` for phones; `src-tauri` stripped to a webview
shell that reads a server URL from `vms-shell.json`, checks `/healthz`, and shows a plain
retry screen when the office computer is not answering. Neither shows browser chrome.

**Deployment.** `deploy/` holds WinSW service definitions for the server and the Cloudflare
Tunnel, a nightly backup task, and a runbook.

**Attribution.** Every command that changes something stamps `created_by`/`updated_by` and
writes an activity history entry naming the account that did it. This hooks into the dispatch
layer, not the repositories, so the domain rules and their tests stayed unaware of sign-in.

### Files Changed

Too many to list individually; see the eight commits on the branch. The shape of it:

- New: `Cargo.toml` (workspace), `crates/vms-core/**`, `crates/vms-server/**`, `deploy/**`,
  `public/**`, `src/services/api/{client,auth}.ts`, `src/components/auth/**`,
  `src/app/providers/**`, `src-tauri/shell/index.html`
- Rewritten: `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`, `src/app/App.tsx`,
  `src/components/common/SidebarNav.tsx`, `src/services/api/reports.ts`
- Deleted: `src-tauri/src/commands/**` (the 64 Tauri shims)
- Docs: `README.md`, `AGENTS.md`, `specs/00-project-brief.md`,
  `specs/01-tech-stack-architecture.md`, `docs/TOG5-VMS-user-manual-v0.4.0.md`

### Commands Run

- `cargo test --workspace` — passed. 101 in `vms-core`, 8 + 12 in `vms-server`.
- `cargo clippy --workspace --all-targets` — one pre-existing warning
  (`too_many_arguments` in `maintenance/seeds.rs`), unrelated and left alone.
- `cargo fmt --all --check` — clean.
- `npm run typecheck`, `npm run lint`, `npm run test` — all pass; 20 frontend tests.
- `npm run build` — PWA generated, 15 precached entries.
- Manual end-to-end against a running server: setup, sign-in, RPC, photo upload and read-back
  through `/api/files`, owner gate, backup while serving, and a full restore cycle.

### Test/Build Results

All green. Notable new coverage:

- `vms-server/tests/api.rs` runs against the real router: sign-in, the owner gate, path
  traversal on `/api/files`, every command in `COMMANDS` reaching a handler, and attribution
  landing in the database.
- Restore verified end to end: staged, server exits 75, next start applies it and clears the
  staging folder.

### Errors Encountered

- **Restore would have corrupted the database.** The pool keeps SQLite handles open for the
  life of the process, so the old restore — which overwrote the database file in place — was
  no longer safe. Restores are now staged and applied at startup before anything opens the
  database. This is the most important change in the migration and it was not in the original
  plan.
- **`WinSW` restarts on failure, not on a clean exit.** A staged restore would therefore have
  stopped the service and left it stopped. The server now exits 75 to ask for a restart.
- **`&context.connection()?` would not coerce.** Binding the pooled connection to a variable
  first fixes it and reads better anyway.
- **`#[serde(default)]` on a generic `Option<T>` field** made serde demand `T: Default`. Fixed
  with an explicit `bound(deserialize = ...)`.

### Decisions Made

- **SQLite stays.** A fleet writes a few dozen rows a day. No Postgres port, no data
  migration, no `sqlx` rewrite.
- **RPC routes, not REST.** Mirrors `invoke(name, args)` almost exactly, so translating 66
  commands was mechanical and no frontend call site changed shape. Trade-off accepted:
  everything is `POST`, no HTTP-level caching.
- **Offline support dropped, deliberately.** A stale odometer reading is worse than a screen
  that says it cannot reach the server. The service worker caches the app shell and never
  caches data.
- **`sessions` is not in `PRODUCT_DATA_TABLES`.** That list excludes `users` on purpose;
  adding sessions would sign everybody out when somebody clears fleet data.
- **Attribution hooks into dispatch, not the repositories.** Keeps the domain rules and their
  tests unaware of sign-in. The cost is that it is written just after the row rather than in
  the same statement.
- **Roles exist but have no UI**, per the client: everybody does the day-to-day work, only the
  owner does the destructive things.
- **Historical documents were not rewritten.** `live-update.md` entries and the v0.1.0/v0.2.0
  release notes describe what was true when written. Only the living specs changed.

### Remaining Issues

- The cutover itself has not happened. Copying the client's data to the server machine, buying
  the domain, creating the tunnel, setting the owner password, and smoke-testing from a phone
  on mobile data are all steps for whoever runs the deployment. `deploy/README.md` is the
  runbook.
- The UI overhaul is still a separate piece of work and was deliberately kept out of this
  branch.
- TanStack Query was listed as optional Phase 5b and was not done. Every module still
  hand-rolls `useEffect` + `useState`, which will feel slower over a network than it did
  against local IPC. Worth doing, not required for correctness.
- `export_report_csv` still exists on the server and is still tested, but the web app no
  longer calls it.
- The office PC remains a single point of failure. Accepted for now; the nightly backup is the
  mitigation and a VPS is a recompile away.

### Suggested Next Step

Review the branch, then deploy to a test machine and walk `deploy/README.md` end to end before
merging to `main` — the runbook has never been followed on a machine that was not this
development one.
