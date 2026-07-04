# TOG 5 VMS Phase 13 Windows Release Checklist

This checklist prepares the local-only TOG 5 VMS MVP for Windows packaging. It does not add cloud sync, auto-updates, database encryption, online login, OCR, or report export.

## Environment Prerequisites

- Windows build machine.
- Node.js and npm available through `npm.cmd`.
- Rust and Cargo.
- Microsoft C++ Build Tools / MSVC toolchain.
- Microsoft Edge WebView2 Runtime.
- Existing generated Tauri icons in `src-tauri/icons/`.

## Validation Commands

Run these from the project root:

```powershell
npm.cmd run test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

## Production Build Command

```powershell
npm.cmd run tauri:build
```

If the script is unavailable in a future branch, use:

```powershell
npm.cmd run tauri -- build
```

## Expected Artifact Locations

- Release executable: `src-tauri/target/release/tog5-vms.exe`
- NSIS installer: `src-tauri/target/release/bundle/nsis/*.exe`

Generated release artifacts stay under `src-tauri/target/`, which is ignored by Git.

## Manual Installer Checks

- Installer opens on a Windows test machine.
- Installer completes using the current-user install mode.
- App launches from Start Menu or shortcut if one is created.
- App creates or uses the local app-data database.
- Installer package does not include user app-data, databases, backups, uploaded photos, receipts, or `node_modules`.
- Backup & Restore page opens after install.
- Local photos and receipts still display through the Tauri asset protocol.
- Uninstall behavior is observed and documented, especially whether user app-data remains.

## Manual MVP Smoke Test

- Dashboard opens and shows real local overview data or friendly empty states.
- Vehicles opens and a saved vehicle photo displays.
- Maintenance opens with the simplified log-maintenance workflow, vehicle reminders, and needs-attention list.
- Fuel Logs opens and receipt indicators still work.
- Service History opens and attachment indicators still work.
- Expenses opens.
- Reports opens.
- Backup & Restore opens.
- Alerts opens.
- Settings opens and local-only data safety copy remains visible.

## Known Release Caveats

- The installer is unsigned and may trigger Windows SmartScreen warnings.
- Startup-on-boot is stored as a preference only; OS startup registration is not implemented yet.
- Database encryption is not enabled.
- Backup packages are local folder-style `.tog5backup` packages, not zip files.
- No auto-updater is configured.
- No cloud sync, online account, native notification, OCR, or report export is included.

## Artifact Naming Guidance

Use clear names when sharing release artifacts manually, for example:

```text
TOG5-VMS_0.1.0_windows_x64_setup.exe
TOG5-VMS_0.1.0_windows_x64_portable.exe
```

Keep generated binaries and installers out of Git unless a future release policy explicitly says otherwise.
