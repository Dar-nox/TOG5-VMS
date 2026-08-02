use serde_json::Value;
use vms_core::maintenance::{
    file_storage::{
        prepare_maintenance_photo, prepare_maintenance_receipt, remove_file_if_present,
    },
    repository, scheduling, service_history,
};

use super::{
    args::{AlertIdArg, IdArg, RequestArg, SettingIdArg, TemplateIdArg, VehicleIdArg},
    parse, run, Handled, RpcContext,
};

pub fn dispatch(context: &RpcContext, command: &str, args: &mut Value) -> Handled {
    Some(match command {
        "list_maintenance_templates" => run(|| {
            let connection = context.connection()?;
            repository::list_user_maintenance_templates(&connection)
        }),
        "get_applicable_maintenance_templates_for_vehicle" => run(|| {
            let VehicleIdArg { vehicle_id } = parse(args)?;
            let connection = context.connection()?;

            repository::applicable_templates_for_vehicle(&connection, &vehicle_id)
        }),
        "seed_maintenance_templates" => run(|| {
            let mut connection = context.connection()?;
            repository::seed_default_templates(&mut connection)
        }),
        "create_maintenance_template" => run(|| {
            let RequestArg { request } = parse(args)?;
            let connection = context.connection()?;

            repository::create_maintenance_template(&connection, request)
        }),
        "update_maintenance_template" => run(|| {
            let RequestArg { request } = parse(args)?;
            let connection = context.connection()?;

            repository::update_maintenance_template(&connection, request)
        }),
        "archive_maintenance_template" => run(|| {
            let TemplateIdArg { template_id } = parse(args)?;
            let connection = context.connection()?;

            repository::archive_maintenance_template(&connection, &template_id)
        }),
        "list_maintenance_schedules_for_vehicle" => run(|| {
            let VehicleIdArg { vehicle_id } = parse(args)?;
            let connection = context.connection()?;

            scheduling::list_schedules_for_vehicle(&connection, &vehicle_id)
        }),
        "sync_maintenance_schedules_for_vehicle" => run(|| {
            let VehicleIdArg { vehicle_id } = parse(args)?;
            let connection = context.connection()?;

            scheduling::sync_schedules_for_vehicle(&connection, &vehicle_id)
        }),
        "list_vehicle_maintenance_settings" => run(|| {
            let VehicleIdArg { vehicle_id } = parse(args)?;
            let connection = context.connection()?;

            scheduling::list_vehicle_maintenance_settings(&connection, &vehicle_id)
        }),
        "upsert_vehicle_maintenance_setting" => run(|| {
            let RequestArg { request } = parse(args)?;
            let connection = context.connection()?;

            scheduling::upsert_vehicle_maintenance_setting(&connection, request)
        }),
        "archive_vehicle_maintenance_setting" => run(|| {
            let SettingIdArg { setting_id } = parse(args)?;
            let connection = context.connection()?;

            scheduling::archive_vehicle_maintenance_setting(&connection, &setting_id)
        }),
        "refresh_maintenance_alerts_for_vehicle" => run(|| {
            let VehicleIdArg { vehicle_id } = parse(args)?;
            let connection = context.connection()?;

            scheduling::refresh_maintenance_alerts_for_vehicle(&connection, &vehicle_id)
        }),
        "list_alerts" => run(|| {
            let connection = context.connection()?;
            scheduling::list_alerts(&connection)
        }),
        "dismiss_alert" => run(|| {
            let AlertIdArg { alert_id } = parse(args)?;
            let connection = context.connection()?;

            scheduling::dismiss_alert(&connection, &alert_id)
        }),
        "complete_maintenance_schedule" => run(|| {
            let RequestArg { request } = parse(args)?;
            let mut connection = context.connection()?;

            service_history::complete_maintenance_schedule(&mut connection, request)
        }),
        "log_maintenance" => run(|| {
            let RequestArg { request } = parse(args)?;
            let mut connection = context.connection()?;

            service_history::log_maintenance(&mut connection, request)
        }),
        "list_service_history_for_vehicle" => run(|| {
            let VehicleIdArg { vehicle_id } = parse(args)?;
            let connection = context.connection()?;

            service_history::list_service_history_for_vehicle(&connection, &vehicle_id)
        }),
        "get_maintenance_log" => run(|| {
            let IdArg { id } = parse(args)?;
            let connection = context.connection()?;

            service_history::get_maintenance_log(&connection, &id)?
                .ok_or_else(|| "Service history record was not found.".to_string())
        }),
        "store_maintenance_receipt" => run(|| {
            let RequestArg { request } = parse(args)?;
            let receipt =
                prepare_maintenance_receipt(&context.paths().maintenance_receipts_dir(), request)?;
            let file_path = receipt.file_path.clone();
            let connection = context.connection()?;

            service_history::insert_maintenance_receipt(&connection, receipt).inspect_err(|_| {
                remove_file_if_present(&file_path);
            })
        }),
        "store_maintenance_photo" => run(|| {
            let RequestArg { request } = parse(args)?;
            let photo =
                prepare_maintenance_photo(&context.paths().maintenance_photos_dir(), request)?;
            let file_path = photo.file_path.clone();
            let connection = context.connection()?;

            service_history::insert_maintenance_photo(&connection, photo).inspect_err(|_| {
                remove_file_if_present(&file_path);
            })
        }),
        _ => return None,
    })
}
