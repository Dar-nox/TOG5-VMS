use rusqlite::Connection;
use serde_json::Value;
use vms_core::{
    auth::{models::SetLocalUserPasswordRequest, repository as auth_repository},
    settings::{
        files::clear_managed_folders,
        models::{AppSettingsResponse, LocalDataSafetyInfo},
        repository,
    },
};

use super::{args::RequestArg, parse, run, Handled, RpcContext};

pub fn dispatch(context: &RpcContext, command: &str, args: &mut Value) -> Handled {
    Some(match command {
        "get_app_settings" => run(|| {
            let connection = context.connection()?;
            settings_response(context, &connection)
        }),
        "update_app_settings" => run(|| {
            let RequestArg { request } = parse(args)?;
            let connection = context.connection()?;
            repository::update_app_settings(&connection, request)?;

            settings_response(context, &connection)
        }),
        "reset_app_settings" => run(|| {
            let connection = context.connection()?;
            repository::reset_app_settings(&connection)?;

            settings_response(context, &connection)
        }),
        "list_local_users" => run(|| {
            let connection = context.connection()?;
            repository::list_local_users(&connection)
        }),
        "update_local_user" => run(|| {
            let RequestArg { request } = parse(args)?;
            let connection = context.connection()?;

            repository::update_local_user(&connection, request)
        }),
        "create_local_user" => run(|| {
            let RequestArg { request } = parse(args)?;
            let connection = context.connection()?;

            auth_repository::create_user(&connection, request)
        }),
        "set_local_user_password" => run(|| {
            let RequestArg { request } = parse::<RequestArg<SetLocalUserPasswordRequest>>(args)?;
            let connection = context.connection()?;

            auth_repository::set_user_password(&connection, &request.user_id, &request.password)
        }),
        "get_access_summary" => run(|| {
            let connection = context.connection()?;
            repository::access_summary(&connection, context.user().clone())
        }),
        "clear_app_data" => run(|| {
            let RequestArg { request } = parse(args)?;
            let mut connection = context.connection()?;
            let mut response = repository::clear_app_product_data(&mut connection, request)?;
            let folders = clear_managed_folders(context.paths())?;

            response.files_removed = folders.files_removed;
            response.managed_folders_cleared = folders.folder_names;

            Ok(response)
        }),
        _ => return None,
    })
}

/// The settings screen doubles as the "where is my data" screen, so it reports
/// the paths on the server machine. `active_user` is the signed-in account
/// rather than a stand-in profile, now that there is a real sign-in.
fn settings_response(
    context: &RpcContext,
    connection: &Connection,
) -> Result<AppSettingsResponse, String> {
    let settings = repository::get_app_settings(connection)?;
    let backup_reminder = repository::backup_reminder_status(connection, &settings)?;

    Ok(AppSettingsResponse {
        settings,
        active_user: context.user().clone(),
        backup_reminder,
        data_safety: LocalDataSafetyInfo {
            database_path: context.state().database().path().display().to_string(),
            app_data_dir: context.paths().data_dir().display().to_string(),
            encryption_status: "Not enabled".to_string(),
            backup_package_format: ".tog5backup local folder package".to_string(),
            startup_registration_status:
                "Preference saved only; starting TOG 5 VMS with the computer is handled by the Windows service on the server machine."
                    .to_string(),
        },
    })
}
