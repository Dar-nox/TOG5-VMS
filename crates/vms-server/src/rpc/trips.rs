use serde_json::Value;
use vms_core::trips::{
    models::{TripListFilter, TripReportFilter},
    repository,
};

use super::{
    args::{FilterArg, IdArg, IdRequestArg, RequestArg},
    parse, run, Handled, RpcContext,
};

pub fn dispatch(context: &RpcContext, command: &str, args: &mut Value) -> Handled {
    Some(match command {
        "list_trips" => run(|| {
            let FilterArg { filter } = parse::<FilterArg<TripListFilter>>(args)?;
            let connection = context.connection()?;

            repository::list_trips(&connection, filter)
        }),
        "list_open_trips" => run(|| {
            let connection = context.connection()?;
            repository::list_open_trips(&connection)
        }),
        "get_trip" => run(|| {
            let IdArg { id } = parse(args)?;
            let connection = context.connection()?;

            repository::get_trip(&connection, &id)?.ok_or_else(|| "Trip was not found.".to_string())
        }),
        "start_trip" => run(|| {
            let RequestArg { request } = parse(args)?;
            let mut connection = context.connection()?;

            repository::start_trip(&mut connection, request)
        }),
        "complete_trip" => run(|| {
            let IdRequestArg { id, request } = parse(args)?;
            let connection = context.connection()?;

            repository::complete_trip(&connection, &id, request)
        }),
        "archive_trip" => run(|| {
            let IdArg { id } = parse(args)?;
            let connection = context.connection()?;

            repository::archive_trip(&connection, &id)
        }),
        "get_trip_reports_overview" => run(|| {
            let FilterArg { filter } = parse::<FilterArg<TripReportFilter>>(args)?;
            let connection = context.connection()?;

            repository::trip_reports_overview(&connection, filter)
        }),
        _ => return None,
    })
}
