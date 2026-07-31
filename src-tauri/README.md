# src-tauri — temporarily out of the build

This crate is **excluded from the Cargo workspace** and does not currently
compile. That is expected mid-migration, not a bug.

## Why

The v0.4.0 online migration moved every domain, persistence, and file-storage
module out of here and into `crates/vms-core`, which is now Tauri-free. What is
left in `src/commands/` is the old Tauri command layer: 64 thin shims that
resolved `app_data_dir` from an `AppHandle` and called a repository function.

Those shims are being replaced by HTTP handlers in `crates/vms-server`, so
rewriting them against the new core would be throwaway work. They are kept in
the tree, uncompiled, because they are the clearest reference for which
repository call and argument shape each RPC command maps to.

## What happens to it

Phase 6 of the migration rewrites this crate as a thin webview shell that loads
the deployed app URL — no IPC, no commands, no asset protocol — and re-adds it
to the workspace `members` list. Until then it is reference material.

See the migration plan for the full sequence.
