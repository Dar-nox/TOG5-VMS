use axum::{
    body::Bytes,
    extract::{Path, State},
    Json,
};
use serde_json::{Map, Value};

use crate::{
    blocking,
    error::ApiError,
    rpc::{self, RpcContext},
    session::CurrentUser,
    state::AppState,
};

/// The commands only an owner may run. There is no roles screen in the app on
/// purpose — the client did not want one — so this short list is the whole of
/// the permission model: everybody can do the day-to-day work, and only the
/// owner can do the things that are hard to undo.
const OWNER_ONLY_COMMANDS: &[&str] = &[
    "clear_app_data",
    "restore_backup",
    "reset_app_settings",
    "update_local_user",
    "create_local_user",
    "set_local_user_password",
];

/// A restore is staged rather than applied, so the server has to restart for
/// it to take effect.
const RESTART_AFTER: &[&str] = &["restore_backup"];

pub async fn handle(
    State(state): State<AppState>,
    CurrentUser(user): CurrentUser,
    Path(command): Path<String>,
    body: Bytes,
) -> Result<Json<Value>, ApiError> {
    if OWNER_ONLY_COMMANDS.contains(&command.as_str()) && !user.is_owner() {
        return Err(ApiError::forbidden(
            "Only the owner account can do that. Ask whoever set up TOG 5 VMS to run it.",
        ));
    }

    let mut args = parse_args(&body)?;
    let restarts = RESTART_AFTER.contains(&command.as_str());
    let context = RpcContext::new(state.clone(), user);
    let value = blocking(move || rpc::dispatch(&context, &command, &mut args)).await?;

    if restarts {
        state.request_restart();
    }

    Ok(Json(value))
}

/// An empty body means "no arguments", which is what a command with no
/// parameters sends.
fn parse_args(body: &Bytes) -> Result<Value, ApiError> {
    if body.is_empty() {
        return Ok(Value::Object(Map::new()));
    }

    serde_json::from_slice(body)
        .map_err(|_| ApiError::bad_request("That request could not be read."))
}
