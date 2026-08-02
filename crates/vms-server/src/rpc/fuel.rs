use serde_json::Value;
use vms_core::fuel::{
    receipt_storage::{prepare_fuel_receipt, remove_receipt_file_if_present},
    repository,
};

use super::{
    args::{IdArg, IdRequestArg, RequestArg, VehicleIdArg},
    parse, run, Handled, RpcContext,
};

pub fn dispatch(context: &RpcContext, command: &str, args: &mut Value) -> Handled {
    Some(match command {
        "list_fuel_logs_for_vehicle" => run(|| {
            let VehicleIdArg { vehicle_id } = parse(args)?;
            let connection = context.connection()?;

            repository::list_fuel_logs_for_vehicle(&connection, &vehicle_id)
        }),
        "get_fuel_log" => run(|| {
            let IdArg { id } = parse(args)?;
            let connection = context.connection()?;

            repository::get_fuel_log(&connection, &id)?
                .ok_or_else(|| "Fuel log was not found.".to_string())
        }),
        "create_fuel_log" => run(|| {
            let RequestArg { request } = parse(args)?;
            let mut connection = context.connection()?;

            repository::create_fuel_log(&mut connection, request)
        }),
        "update_fuel_log" => run(|| {
            let IdRequestArg { id, request } = parse(args)?;
            let mut connection = context.connection()?;

            repository::update_fuel_log(&mut connection, &id, request)
        }),
        "archive_fuel_log" => run(|| {
            let IdArg { id } = parse(args)?;
            let connection = context.connection()?;

            repository::archive_fuel_log(&connection, &id)
        }),
        "store_fuel_receipt" => run(|| {
            let RequestArg { request } = parse(args)?;
            let receipt = prepare_fuel_receipt(&context.paths().fuel_receipts_dir(), request)?;
            let receipt_path = receipt.file_path.clone();
            let connection = context.connection()?;

            repository::insert_fuel_receipt(&connection, receipt).inspect_err(|_| {
                remove_receipt_file_if_present(&receipt_path);
            })
        }),
        "get_fuel_efficiency_summary_for_vehicle" => run(|| {
            let VehicleIdArg { vehicle_id } = parse(args)?;
            let connection = context.connection()?;

            repository::fuel_efficiency_summary_for_vehicle(&connection, &vehicle_id)
        }),
        _ => return None,
    })
}
