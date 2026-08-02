use std::path::PathBuf;

use serde_json::Value;
use vms_core::backup::service;

use super::{
    args::{BackupPathArg, RequestArg},
    parse, run, Handled, RpcContext,
};

pub fn dispatch(context: &RpcContext, command: &str, args: &mut Value) -> Handled {
    Some(match command {
        "create_backup" => run(|| service::create_backup(&context.state().backup_context())),
        "validate_backup_file" => run(|| {
            let BackupPathArg { backup_path } = parse(args)?;
            Ok(service::validate_backup_package(&PathBuf::from(
                backup_path.trim(),
            )))
        }),
        // Staged now, applied during the next start. The handler asks the
        // process to stop once this response is on its way out.
        "restore_backup" => run(|| {
            let RequestArg { request } = parse(args)?;
            service::restore_backup(&context.state().backup_context(), request)
        }),
        "list_backups" => run(|| service::list_backup_history(context.state().database().path())),
        "get_local_file_safety_summary" => {
            run(|| service::local_file_safety_summary(&context.state().backup_context()))
        }
        _ => return None,
    })
}
