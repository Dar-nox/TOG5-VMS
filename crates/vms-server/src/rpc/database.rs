use serde_json::Value;

use super::{run, Handled, RpcContext};

pub fn dispatch(context: &RpcContext, command: &str, _args: &mut Value) -> Handled {
    Some(match command {
        "database_status" => run(|| context.state().database().status()),
        _ => return None,
    })
}
