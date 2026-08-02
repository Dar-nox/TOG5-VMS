use serde_json::Value;
use vms_core::vehicles::{
    photo_storage::{prepare_vehicle_photo, remove_photo_file_if_present},
    repository,
};

use super::{
    args::{IdArg, IdRequestArg, RequestArg},
    parse, run, Handled, RpcContext,
};

pub fn dispatch(context: &RpcContext, command: &str, args: &mut Value) -> Handled {
    Some(match command {
        "list_vehicles" => run(|| {
            let connection = context.connection()?;
            repository::list_vehicles(&connection)
        }),
        "get_vehicle" => run(|| {
            let IdArg { id } = parse(args)?;
            let connection = context.connection()?;

            repository::get_vehicle(&connection, &id)?
                .ok_or_else(|| "Vehicle was not found.".to_string())
        }),
        "store_vehicle_photo" => run(|| {
            let RequestArg { request } = parse(args)?;
            let photo = prepare_vehicle_photo(&context.paths().vehicle_photos_dir(), request)?;
            let photo_path = photo.file_path.clone();
            let connection = context.connection()?;

            repository::insert_vehicle_photo(&connection, photo).inspect_err(|_| {
                remove_photo_file_if_present(&photo_path);
            })
        }),
        "create_vehicle" => run(|| {
            let RequestArg { request } = parse(args)?;
            let mut connection = context.connection()?;

            repository::create_vehicle(&mut connection, request)
        }),
        "update_vehicle" => run(|| {
            let IdRequestArg { id, request } = parse(args)?;
            let mut connection = context.connection()?;

            repository::update_vehicle(&mut connection, &id, request)
        }),
        "archive_vehicle" => run(|| {
            let IdArg { id } = parse(args)?;
            let connection = context.connection()?;

            repository::archive_vehicle(&connection, &id)
        }),
        _ => return None,
    })
}
