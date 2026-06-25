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

Phase 4 — Vehicle Module.

## Phase State

Phase 4 completed. Vehicle list, add, edit, archive, profile display, local photo storage, and vehicle persistence are in place.

## Last Completed Phase

Phase 4 — Vehicle Module.

## Next Planned Phase

Phase 5 — Maintenance Template Engine.

---

# Phase Checklist

| Phase | Name | Status | Notes |
|---:|---|---|---|
| 0 | Repository and Workflow Setup | Completed | Environment inspected; initial scaffold added; native Tauri prerequisites missing |
| 1 | App Scaffold | Completed | Desktop shell, sidebar navigation, static placeholder pages, and validation checks completed |
| 2 | Database Foundation and Migrations | Completed | SQLite app-data database, migration runner, initial schema, and Rust migration tests added |
| 3 | Domain Models and Validation | Completed | TypeScript domain models, validation helpers, Vitest coverage, and minimal Rust domain types added |
| 4 | Vehicle Module | Completed | Vehicle CRUD, local photo storage, archive flow, profile UI, and repository tests |
| 5 | Maintenance Template Engine | Not started | Applicability rules |
| 6 | Maintenance Scheduling and Alerts | Not started | Due soon/overdue logic |
| 7 | Fuel Logging and Efficiency | Not started | Receipts, full-tank rule, km/L |
| 8 | Maintenance Completion and Service History | Not started | Complete tasks and logs |
| 9 | Expenses and Reports | Not started | Expense tracking and reports |
| 10 | Backup, Restore, and Local File Safety | Not started | Local backup package |
| 11 | User Access and Settings | Not started | Roles and app settings |
| 12 | Dashboard Polish and UX Refinement | Not started | Friendly UI pass |
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

# Current Blockers

- No Phase 4 blocker remains.
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
