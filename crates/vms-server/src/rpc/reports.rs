use serde_json::Value;
use vms_core::reports::export;

use super::{args::RequestArg, parse, run, Handled, RpcContext};

pub fn dispatch(context: &RpcContext, command: &str, args: &mut Value) -> Handled {
    Some(match command {
        // Writes the CSV into the server's app data folder, which is where it
        // went when the app was a desktop build. Downloading it straight from
        // the browser instead is frontend work, tracked separately.
        "export_report_csv" => run(|| {
            let RequestArg { request } = parse(args)?;
            export::export_report_csv(context.paths().data_dir(), request)
        }),
        _ => return None,
    })
}
