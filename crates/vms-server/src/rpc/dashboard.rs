use serde_json::Value;
use vms_core::dashboard::repository;

use super::{run, Handled, RpcContext};

pub fn dispatch(context: &RpcContext, command: &str, _args: &mut Value) -> Handled {
    Some(match command {
        "get_dashboard_overview" => run(|| {
            let connection = context.connection()?;
            repository::dashboard_overview(&connection)
        }),
        _ => return None,
    })
}
