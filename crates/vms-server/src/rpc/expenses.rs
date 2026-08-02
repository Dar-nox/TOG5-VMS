use serde_json::Value;
use vms_core::expenses::{
    models::{ExpenseListFilter, ReportFilter},
    repository,
};

use super::{
    args::{FilterArg, IdArg, IdRequestArg, RequestArg, VehicleFilterArg, VehicleIdArg},
    parse, run, Handled, RpcContext,
};

pub fn dispatch(context: &RpcContext, command: &str, args: &mut Value) -> Handled {
    Some(match command {
        "list_expenses" => run(|| {
            let FilterArg { filter } = parse::<FilterArg<ExpenseListFilter>>(args)?;
            let connection = context.connection()?;

            repository::list_expenses(&connection, filter)
        }),
        "list_expenses_for_vehicle" => run(|| {
            let VehicleIdArg { vehicle_id } = parse(args)?;
            let connection = context.connection()?;

            repository::list_expenses_for_vehicle(&connection, &vehicle_id)
        }),
        "get_expense" => run(|| {
            let IdArg { id } = parse(args)?;
            let connection = context.connection()?;

            repository::get_expense(&connection, &id)?
                .ok_or_else(|| "Expense was not found.".to_string())
        }),
        "create_expense" => run(|| {
            let RequestArg { request } = parse(args)?;
            let connection = context.connection()?;

            repository::create_expense(&connection, request)
        }),
        "update_expense" => run(|| {
            let IdRequestArg { id, request } = parse(args)?;
            let connection = context.connection()?;

            repository::update_expense(&connection, &id, request)
        }),
        "archive_expense" => run(|| {
            let IdArg { id } = parse(args)?;
            let connection = context.connection()?;

            repository::archive_expense(&connection, &id)
        }),
        "get_expense_summary" => run(|| {
            let FilterArg { filter } = parse::<FilterArg<ExpenseListFilter>>(args)?;
            let connection = context.connection()?;

            repository::expense_summary(&connection, filter)
        }),
        "get_vehicle_cost_report" => run(|| {
            let VehicleFilterArg { vehicle_id, filter } =
                parse::<VehicleFilterArg<ReportFilter>>(args)?;
            let connection = context.connection()?;

            repository::vehicle_cost_report(&connection, &vehicle_id, filter)
        }),
        "get_reports_overview" => run(|| {
            let FilterArg { filter } = parse::<FilterArg<ReportFilter>>(args)?;
            let connection = context.connection()?;

            repository::reports_overview(&connection, filter)
        }),
        _ => return None,
    })
}
