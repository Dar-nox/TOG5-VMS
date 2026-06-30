use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::{maintenance::scheduling, settings};

use super::models::{
    AlertsDashboardSummary, BackupDashboardSummary, CostDashboardSummary, DashboardActivityItem,
    DashboardAlertItem, DashboardMaintenanceItem, DashboardOverview, DashboardSetupHint,
    FuelDashboardSummary, MaintenanceDashboardSummary, VehicleDashboardSummary,
};

#[derive(Debug)]
struct ScheduleDashboardRow {
    id: String,
    vehicle_id: String,
    vehicle_name: String,
    current_odometer: f64,
    template_name: String,
    category: String,
    priority: String,
    next_due_date: Option<String>,
    next_due_odometer: Option<f64>,
    due_soon_days: i64,
    due_soon_km: i64,
    status: String,
}

pub fn dashboard_overview(connection: &Connection) -> Result<DashboardOverview, String> {
    let generated_at = current_timestamp(connection)?;
    let current_month = current_month(connection)?;
    let settings = settings::repository::get_app_settings(connection)?;
    let active_user = settings::repository::ensure_default_owner_user(connection)?;
    let backup_reminder = settings::repository::backup_reminder_status(connection, &settings)?;

    let vehicle_summary = vehicle_summary(connection)?;
    let maintenance_summary = maintenance_summary(connection)?;
    let alerts_summary = alerts_summary(connection)?;
    let fuel_summary = fuel_summary(connection)?;
    let cost_summary = cost_summary(connection, &current_month, &settings.preferred_currency)?;
    let backup_summary = BackupDashboardSummary {
        latest_completed_at: backup_reminder.latest_backup_completed_at,
        latest_backup_path: backup_reminder.latest_backup_path,
        reminder_due: backup_reminder.reminder_due,
        message: backup_reminder.message,
        package_note: ".tog5backup local folder package".to_string(),
    };
    let recent_activity = recent_activity(connection)?;
    let setup_hints = setup_hints(
        &vehicle_summary,
        &maintenance_summary,
        &fuel_summary,
        &backup_summary,
    );

    Ok(DashboardOverview {
        generated_at,
        owner_display_name: active_user.display_name,
        preferred_currency: settings.preferred_currency.clone(),
        vehicle_summary,
        maintenance_summary,
        alerts_summary,
        fuel_summary,
        cost_summary,
        backup_summary,
        recent_activity,
        setup_hints,
    })
}

fn vehicle_summary(connection: &Connection) -> Result<VehicleDashboardSummary, String> {
    let (total_count, active_count, archived_count, under_maintenance_count) = connection
        .query_row(
            "
            SELECT
              COALESCE(SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END), 0),
              COALESCE(SUM(CASE
                WHEN deleted_at IS NULL
                 AND archived_at IS NULL
                 AND status IN ('active', 'under_maintenance') THEN 1 ELSE 0 END), 0),
              COALESCE(SUM(CASE
                WHEN deleted_at IS NULL
                 AND (archived_at IS NOT NULL OR status = 'archived') THEN 1 ELSE 0 END), 0),
              COALESCE(SUM(CASE
                WHEN deleted_at IS NULL
                 AND archived_at IS NULL
                 AND status = 'under_maintenance' THEN 1 ELSE 0 END), 0)
            FROM vehicles
            ",
            [],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, i64>(3)?,
                ))
            },
        )
        .map_err(|_| "Could not read dashboard vehicle summary.".to_string())?;

    let latest = connection
        .query_row(
            "
            SELECT vehicles.vehicle_name, vehicle_photos.file_path
            FROM vehicles
            LEFT JOIN vehicle_photos
              ON vehicle_photos.id = vehicles.primary_photo_id
             AND vehicle_photos.deleted_at IS NULL
            WHERE vehicles.deleted_at IS NULL
              AND vehicles.archived_at IS NULL
              AND vehicles.status != 'archived'
            ORDER BY vehicles.created_at DESC
            LIMIT 1
            ",
            [],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?)),
        )
        .optional()
        .map_err(|_| "Could not read latest vehicle for the dashboard.".to_string())?;

    let (latest_vehicle_name, latest_vehicle_photo_path) = latest.unwrap_or((String::new(), None));

    Ok(VehicleDashboardSummary {
        total_count,
        active_count,
        archived_count,
        under_maintenance_count,
        latest_vehicle_name: (!latest_vehicle_name.is_empty()).then_some(latest_vehicle_name),
        latest_vehicle_photo_path,
    })
}

fn maintenance_summary(connection: &Connection) -> Result<MaintenanceDashboardSummary, String> {
    let today = current_date(connection)?;
    let mut rows = load_dashboard_schedules(connection)?;
    rows.sort_by(|left, right| {
        schedule_rank(&left.status)
            .cmp(&schedule_rank(&right.status))
            .then_with(|| priority_rank(&left.priority).cmp(&priority_rank(&right.priority)))
            .then_with(|| left.template_name.cmp(&right.template_name))
    });

    let mut overdue_count = 0;
    let mut due_today_count = 0;
    let mut due_soon_count = 0;
    let mut needs_setup_count = 0;
    let mut upcoming = Vec::new();

    for row in rows {
        let evaluation = scheduling::evaluate_due_status(
            &today,
            row.current_odometer,
            row.next_due_date.as_deref(),
            row.next_due_odometer,
            row.due_soon_days,
            row.due_soon_km,
            row.status == "disabled",
        );

        match evaluation.status.as_str() {
            "overdue" => overdue_count += 1,
            "due_today" => due_today_count += 1,
            "due_soon" => due_soon_count += 1,
            "needs_setup" => needs_setup_count += 1,
            _ => {}
        }

        if upcoming.len() < 5
            && matches!(
                evaluation.status.as_str(),
                "overdue" | "due_today" | "due_soon" | "needs_setup"
            )
        {
            upcoming.push(DashboardMaintenanceItem {
                id: row.id,
                vehicle_id: row.vehicle_id,
                vehicle_name: row.vehicle_name,
                template_name: row.template_name,
                category: row.category,
                priority: row.priority,
                due_status: evaluation.status,
                due_reason: evaluation.reason,
                next_due_date: row.next_due_date,
                next_due_odometer: row.next_due_odometer,
            });
        }
    }

    let total_schedule_count = connection
        .query_row(
            "
            SELECT COUNT(*)
            FROM maintenance_schedules
            INNER JOIN vehicles
              ON vehicles.id = maintenance_schedules.vehicle_id
             AND vehicles.deleted_at IS NULL
            WHERE maintenance_schedules.deleted_at IS NULL
            ",
            [],
            |row| row.get(0),
        )
        .map_err(|_| "Could not count maintenance schedules.".to_string())?;

    Ok(MaintenanceDashboardSummary {
        total_schedule_count,
        overdue_count,
        due_today_count,
        due_soon_count,
        needs_setup_count,
        upcoming,
    })
}

fn alerts_summary(connection: &Connection) -> Result<AlertsDashboardSummary, String> {
    let (active_count, high_priority_count) = connection
        .query_row(
            "
            SELECT
              COUNT(*),
              COALESCE(SUM(CASE WHEN priority IN ('critical', 'high') THEN 1 ELSE 0 END), 0)
            FROM alerts
            WHERE deleted_at IS NULL
              AND status = 'active'
            ",
            [],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?)),
        )
        .map_err(|_| "Could not read dashboard alert summary.".to_string())?;

    let mut statement = connection
        .prepare(
            "
            SELECT
              alerts.id,
              alerts.title,
              alerts.message,
              alerts.alert_type,
              alerts.priority,
              vehicles.vehicle_name,
              maintenance_templates.name,
              alerts.created_at,
              alerts.due_date
            FROM alerts
            LEFT JOIN vehicles
              ON vehicles.id = alerts.vehicle_id
            LEFT JOIN maintenance_schedules
              ON maintenance_schedules.id = alerts.maintenance_schedule_id
            LEFT JOIN maintenance_templates
              ON maintenance_templates.id = maintenance_schedules.template_id
            WHERE alerts.deleted_at IS NULL
              AND alerts.status = 'active'
            ORDER BY
              CASE alerts.priority
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                ELSE 3
              END,
              alerts.created_at DESC
            LIMIT 5
            ",
        )
        .map_err(|_| "Could not prepare dashboard alerts.".to_string())?;
    let rows = statement
        .query_map([], alert_item_from_row)
        .map_err(|_| "Could not read dashboard alerts.".to_string())?;

    let top_alerts = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse dashboard alerts.".to_string())?;

    Ok(AlertsDashboardSummary {
        active_count,
        high_priority_count,
        top_alerts,
    })
}

fn fuel_summary(connection: &Connection) -> Result<FuelDashboardSummary, String> {
    let official_log_count = connection
        .query_row(
            "
            SELECT COUNT(*)
            FROM fuel_logs
            WHERE deleted_at IS NULL
              AND efficiency_status = 'official'
              AND computed_km_per_liter IS NOT NULL
            ",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|_| "Could not count official fuel efficiency logs.".to_string())?;

    let mut statement = connection
        .prepare(
            "
            SELECT computed_km_per_liter
            FROM fuel_logs
            WHERE deleted_at IS NULL
              AND efficiency_status = 'official'
              AND computed_km_per_liter IS NOT NULL
            ORDER BY fuel_date DESC, created_at DESC
            LIMIT 3
            ",
        )
        .map_err(|_| "Could not prepare fuel efficiency summary.".to_string())?;
    let rows = statement
        .query_map([], |row| row.get::<_, f64>(0))
        .map_err(|_| "Could not read official fuel efficiency logs.".to_string())?;
    let recent_values = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse official fuel efficiency logs.".to_string())?;

    let latest_official_km_per_liter = recent_values.first().copied();
    let recent_average_km_per_liter = if recent_values.is_empty() {
        None
    } else {
        Some(round_two(
            recent_values.iter().copied().sum::<f64>() / recent_values.len() as f64,
        ))
    };
    let efficiency_drop_active = connection
        .query_row(
            "
            SELECT 1
            FROM alerts
            WHERE deleted_at IS NULL
              AND status = 'active'
              AND alert_type = 'fuel_efficiency_drop'
            LIMIT 1
            ",
            [],
            |_| Ok(()),
        )
        .optional()
        .map_err(|_| "Could not check active fuel efficiency alerts.".to_string())?
        .is_some();

    let message = match official_log_count {
        0 => "Not enough full-tank fuel logs yet.".to_string(),
        1 => "One official full-tank efficiency result is available.".to_string(),
        _ => "Recent official full-tank efficiency is ready.".to_string(),
    };

    Ok(FuelDashboardSummary {
        latest_official_km_per_liter: latest_official_km_per_liter.map(round_two),
        recent_average_km_per_liter,
        official_log_count,
        efficiency_drop_active,
        message,
    })
}

fn cost_summary(
    connection: &Connection,
    current_month: &str,
    preferred_currency: &str,
) -> Result<CostDashboardSummary, String> {
    let fuel_total = sum_for_month(
        connection,
        "SELECT COALESCE(SUM(total_amount), 0) FROM fuel_logs WHERE deleted_at IS NULL AND substr(fuel_date, 1, 7) = ?1",
        current_month,
    )?;
    let maintenance_total = sum_for_month(
        connection,
        "SELECT COALESCE(SUM(total_cost), 0) FROM maintenance_logs WHERE deleted_at IS NULL AND substr(completed_date, 1, 7) = ?1",
        current_month,
    )?;
    let repair_total = sum_for_month(
        connection,
        "SELECT COALESCE(SUM(total_cost), 0) FROM repair_records WHERE deleted_at IS NULL AND substr(repair_date, 1, 7) = ?1",
        current_month,
    )?;
    let manual_expense_total = sum_for_month(
        connection,
        "
        SELECT COALESCE(SUM(amount), 0)
        FROM expenses
        WHERE deleted_at IS NULL
          AND substr(expense_date, 1, 7) = ?1
          AND (
            related_record_type IS NULL
            OR related_record_id IS NULL
            OR related_record_type NOT IN ('fuel_log', 'maintenance_log', 'repair_record')
          )
        ",
        current_month,
    )?;
    let total_tracked_cost =
        round_two(fuel_total + maintenance_total + repair_total + manual_expense_total);

    Ok(CostDashboardSummary {
        current_month: current_month.to_string(),
        total_tracked_cost,
        fuel_total,
        maintenance_total,
        repair_total,
        manual_expense_total,
        preferred_currency: preferred_currency.to_string(),
    })
}

fn recent_activity(connection: &Connection) -> Result<Vec<DashboardActivityItem>, String> {
    let mut activity = Vec::new();
    activity.extend(recent_fuel_activity(connection)?);
    activity.extend(recent_maintenance_activity(connection)?);
    activity.extend(recent_expense_activity(connection)?);
    activity.extend(recent_alert_activity(connection)?);
    activity.extend(recent_backup_activity(connection)?);

    activity.sort_by(|left, right| {
        right
            .happened_at
            .cmp(&left.happened_at)
            .then_with(|| right.id.cmp(&left.id))
    });
    activity.truncate(8);

    Ok(activity)
}

fn setup_hints(
    vehicle_summary: &VehicleDashboardSummary,
    maintenance_summary: &MaintenanceDashboardSummary,
    fuel_summary: &FuelDashboardSummary,
    backup_summary: &BackupDashboardSummary,
) -> Vec<DashboardSetupHint> {
    let mut hints = Vec::new();

    if vehicle_summary.total_count == 0 {
        hints.push(hint(
            "no_vehicles",
            "Add your first vehicle",
            "Vehicle records start with a name and picture.",
            Some("Add vehicle"),
            Some("vehicles"),
        ));
    } else if vehicle_summary.active_count > 0 && maintenance_summary.total_schedule_count == 0 {
        hints.push(hint(
            "no_schedules",
            "Set maintenance reminders",
            "Add reminders only for the maintenance items you want each vehicle to track.",
            Some("Open Maintenance"),
            Some("maintenance"),
        ));
    }

    if backup_summary.reminder_due {
        hints.push(hint(
            "backup_due",
            "Create a local backup",
            "Keep a current .tog5backup copy of your database and managed files.",
            Some("Open Backup"),
            Some("backup"),
        ));
    }

    if vehicle_summary.active_count > 0 && fuel_summary.official_log_count < 2 {
        hints.push(hint(
            "fuel_efficiency_setup",
            "Build fuel efficiency history",
            "Two valid full-tank logs are needed before official km/L appears.",
            Some("Open Fuel Logs"),
            Some("fuel"),
        ));
    }

    if maintenance_summary.needs_setup_count > 0 {
        hints.push(hint(
            "maintenance_setup_needed",
            "Finish schedule setup",
            "Some maintenance items need real due dates or odometer targets before alerts.",
            Some("Review schedules"),
            Some("maintenance"),
        ));
    }

    hints
}

fn load_dashboard_schedules(connection: &Connection) -> Result<Vec<ScheduleDashboardRow>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              maintenance_schedules.id,
              maintenance_schedules.vehicle_id,
              vehicles.vehicle_name,
              vehicles.current_odometer,
              maintenance_templates.name,
              maintenance_templates.category,
              maintenance_schedules.priority,
              maintenance_schedules.next_due_date,
              maintenance_schedules.next_due_odometer,
              maintenance_schedules.due_soon_days,
              maintenance_schedules.due_soon_km,
              maintenance_schedules.status
            FROM maintenance_schedules
            INNER JOIN vehicles
              ON vehicles.id = maintenance_schedules.vehicle_id
             AND vehicles.deleted_at IS NULL
             AND vehicles.archived_at IS NULL
             AND vehicles.status != 'archived'
            INNER JOIN maintenance_templates
              ON maintenance_templates.id = maintenance_schedules.template_id
             AND maintenance_templates.deleted_at IS NULL
            WHERE maintenance_schedules.deleted_at IS NULL
            ",
        )
        .map_err(|_| "Could not prepare dashboard maintenance schedules.".to_string())?;
    let rows = statement
        .query_map([], schedule_dashboard_row_from_row)
        .map_err(|_| "Could not read dashboard maintenance schedules.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse dashboard maintenance schedules.".to_string())
}

fn recent_fuel_activity(connection: &Connection) -> Result<Vec<DashboardActivityItem>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              fuel_logs.id,
              vehicles.vehicle_name,
              fuel_logs.fuel_date,
              fuel_logs.fuel_type,
              fuel_logs.liters,
              fuel_logs.total_amount
            FROM fuel_logs
            INNER JOIN vehicles
              ON vehicles.id = fuel_logs.vehicle_id
             AND vehicles.deleted_at IS NULL
            WHERE fuel_logs.deleted_at IS NULL
            ORDER BY fuel_logs.fuel_date DESC, fuel_logs.created_at DESC
            LIMIT 3
            ",
        )
        .map_err(|_| "Could not prepare recent fuel activity.".to_string())?;
    let rows = statement
        .query_map([], |row| {
            let fuel_type: String = row.get(3)?;
            let liters: f64 = row.get(4)?;
            Ok(DashboardActivityItem {
                id: row.get(0)?,
                activity_type: "fuel".to_string(),
                title: "Fuel log".to_string(),
                detail: format!("{} - {:.1} L", label_from_key(&fuel_type), liters),
                happened_at: row.get(2)?,
                vehicle_name: row.get(1)?,
                amount: row.get(5)?,
                target_page: Some("fuel".to_string()),
            })
        })
        .map_err(|_| "Could not read recent fuel activity.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse recent fuel activity.".to_string())
}

fn recent_maintenance_activity(
    connection: &Connection,
) -> Result<Vec<DashboardActivityItem>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              maintenance_logs.id,
              vehicles.vehicle_name,
              maintenance_logs.completed_date,
              COALESCE(maintenance_templates.name, 'Maintenance service'),
              maintenance_logs.work_performed,
              maintenance_logs.total_cost
            FROM maintenance_logs
            INNER JOIN vehicles
              ON vehicles.id = maintenance_logs.vehicle_id
             AND vehicles.deleted_at IS NULL
            LEFT JOIN maintenance_templates
              ON maintenance_templates.id = maintenance_logs.template_id
            WHERE maintenance_logs.deleted_at IS NULL
            ORDER BY maintenance_logs.completed_date DESC, maintenance_logs.created_at DESC
            LIMIT 3
            ",
        )
        .map_err(|_| "Could not prepare recent maintenance activity.".to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(DashboardActivityItem {
                id: row.get(0)?,
                activity_type: "maintenance".to_string(),
                title: row.get(3)?,
                detail: row.get(4)?,
                happened_at: row.get(2)?,
                vehicle_name: row.get(1)?,
                amount: row.get(5)?,
                target_page: Some("service-history".to_string()),
            })
        })
        .map_err(|_| "Could not read recent maintenance activity.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse recent maintenance activity.".to_string())
}

fn recent_expense_activity(connection: &Connection) -> Result<Vec<DashboardActivityItem>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              expenses.id,
              vehicles.vehicle_name,
              expenses.expense_date,
              expenses.category,
              expenses.description,
              expenses.amount
            FROM expenses
            LEFT JOIN vehicles
              ON vehicles.id = expenses.vehicle_id
            WHERE expenses.deleted_at IS NULL
              AND (
                expenses.related_record_type IS NULL
                OR expenses.related_record_id IS NULL
                OR expenses.related_record_type NOT IN ('fuel_log', 'maintenance_log', 'repair_record')
              )
            ORDER BY expenses.expense_date DESC, expenses.created_at DESC
            LIMIT 3
            ",
        )
        .map_err(|_| "Could not prepare recent expense activity.".to_string())?;
    let rows = statement
        .query_map([], |row| {
            let category: String = row.get(3)?;
            Ok(DashboardActivityItem {
                id: row.get(0)?,
                activity_type: "expense".to_string(),
                title: row.get(4)?,
                detail: label_from_key(&category),
                happened_at: row.get(2)?,
                vehicle_name: row.get(1)?,
                amount: row.get(5)?,
                target_page: Some("expenses".to_string()),
            })
        })
        .map_err(|_| "Could not read recent expense activity.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse recent expense activity.".to_string())
}

fn recent_alert_activity(connection: &Connection) -> Result<Vec<DashboardActivityItem>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
              alerts.id,
              vehicles.vehicle_name,
              alerts.created_at,
              alerts.title,
              alerts.message
            FROM alerts
            LEFT JOIN vehicles
              ON vehicles.id = alerts.vehicle_id
            WHERE alerts.deleted_at IS NULL
              AND alerts.status = 'active'
            ORDER BY alerts.created_at DESC
            LIMIT 3
            ",
        )
        .map_err(|_| "Could not prepare recent alert activity.".to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(DashboardActivityItem {
                id: row.get(0)?,
                activity_type: "alert".to_string(),
                title: row.get(3)?,
                detail: row.get(4)?,
                happened_at: row.get(2)?,
                vehicle_name: row.get(1)?,
                amount: None,
                target_page: Some("alerts".to_string()),
            })
        })
        .map_err(|_| "Could not read recent alert activity.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse recent alert activity.".to_string())
}

fn recent_backup_activity(connection: &Connection) -> Result<Vec<DashboardActivityItem>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, completed_at, backup_path, notes
            FROM backups
            WHERE completed_at IS NOT NULL
              AND status IN ('completed', 'restored')
            ORDER BY completed_at DESC, started_at DESC
            LIMIT 3
            ",
        )
        .map_err(|_| "Could not prepare recent backup activity.".to_string())?;
    let rows = statement
        .query_map([], |row| {
            let path: String = row.get(2)?;
            let notes: Option<String> = row.get(3)?;
            Ok(DashboardActivityItem {
                id: row.get(0)?,
                activity_type: "backup".to_string(),
                title: "Local backup".to_string(),
                detail: notes.unwrap_or(path),
                happened_at: row.get(1)?,
                vehicle_name: None,
                amount: None,
                target_page: Some("backup".to_string()),
            })
        })
        .map_err(|_| "Could not read recent backup activity.".to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not parse recent backup activity.".to_string())
}

fn alert_item_from_row(row: &Row<'_>) -> rusqlite::Result<DashboardAlertItem> {
    Ok(DashboardAlertItem {
        id: row.get(0)?,
        title: row.get(1)?,
        message: row.get(2)?,
        alert_type: row.get(3)?,
        priority: row.get(4)?,
        vehicle_name: row.get(5)?,
        maintenance_template_name: row.get(6)?,
        created_at: row.get(7)?,
        due_date: row.get(8)?,
    })
}

fn schedule_dashboard_row_from_row(row: &Row<'_>) -> rusqlite::Result<ScheduleDashboardRow> {
    Ok(ScheduleDashboardRow {
        id: row.get(0)?,
        vehicle_id: row.get(1)?,
        vehicle_name: row.get(2)?,
        current_odometer: row.get(3)?,
        template_name: row.get(4)?,
        category: row.get(5)?,
        priority: row.get(6)?,
        next_due_date: row.get(7)?,
        next_due_odometer: row.get(8)?,
        due_soon_days: row.get(9)?,
        due_soon_km: row.get(10)?,
        status: row.get(11)?,
    })
}

fn current_timestamp(connection: &Connection) -> Result<String, String> {
    connection
        .query_row("SELECT datetime('now', 'localtime')", [], |row| row.get(0))
        .map_err(|_| "Could not timestamp the dashboard overview.".to_string())
}

fn current_date(connection: &Connection) -> Result<String, String> {
    connection
        .query_row("SELECT date('now', 'localtime')", [], |row| row.get(0))
        .map_err(|_| "Could not read today's dashboard date.".to_string())
}

fn current_month(connection: &Connection) -> Result<String, String> {
    connection
        .query_row("SELECT strftime('%Y-%m', 'now', 'localtime')", [], |row| {
            row.get(0)
        })
        .map_err(|_| "Could not read the dashboard month.".to_string())
}

fn sum_for_month(connection: &Connection, sql: &str, month: &str) -> Result<f64, String> {
    connection
        .query_row(sql, params![month], |row| row.get::<_, f64>(0))
        .map(round_two)
        .map_err(|_| "Could not calculate monthly dashboard costs.".to_string())
}

fn round_two(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

fn schedule_rank(status: &str) -> i32 {
    match status {
        "overdue" => 0,
        "due_today" => 1,
        "due_soon" => 2,
        "needs_setup" => 3,
        _ => 4,
    }
}

fn priority_rank(priority: &str) -> i32 {
    match priority {
        "critical" => 0,
        "high" => 1,
        "medium" => 2,
        _ => 3,
    }
}

fn hint(
    code: &str,
    title: &str,
    message: &str,
    action_label: Option<&str>,
    target_page: Option<&str>,
) -> DashboardSetupHint {
    DashboardSetupHint {
        code: code.to_string(),
        title: title.to_string(),
        message: message.to_string(),
        action_label: action_label.map(str::to_string),
        target_page: target_page.map(str::to_string),
    }
}

fn label_from_key(value: &str) -> String {
    value
        .split('_')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => format!("{}{}", first.to_uppercase(), chars.as_str()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use rusqlite::params;
    use tempfile::TempDir;

    use crate::db;

    use super::*;

    fn setup_database() -> (TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let database_path = temp_dir.path().join("dashboard.sqlite3");
        db::initialize_database_at_path(&database_path).expect("database should initialize");
        let connection = db::open_database_at_path(&database_path).expect("database should open");

        (temp_dir, connection)
    }

    fn insert_vehicle(connection: &Connection, id: &str, name: &str, status: &str) {
        connection
            .execute(
                "
                INSERT INTO vehicles (
                  id,
                  vehicle_name,
                  vehicle_type,
                  fuel_type,
                  transmission_type,
                  drivetrain,
                  current_odometer,
                  status,
                  archived_at
                )
                VALUES (?1, ?2, 'van', 'gasoline', 'automatic', 'fwd', 1000, ?3, CASE WHEN ?3 = 'archived' THEN datetime('now') ELSE NULL END)
                ",
                params![id, name, status],
            )
            .expect("vehicle should insert");
    }

    fn insert_template(connection: &Connection, id: &str, name: &str) {
        connection
            .execute(
                "
                INSERT INTO maintenance_templates (
                  id,
                  template_key,
                  name,
                  category,
                  default_time_interval_days,
                  default_odometer_interval_km,
                  priority
                )
                VALUES (?1, ?1, ?2, 'engine', 30, 1000, 'high')
                ",
                params![id, name],
            )
            .expect("template should insert");
    }

    #[test]
    fn empty_database_returns_safe_empty_dashboard() {
        let (_temp_dir, connection) = setup_database();

        let overview = dashboard_overview(&connection).expect("dashboard should load");

        assert_eq!(overview.vehicle_summary.total_count, 0);
        assert_eq!(overview.cost_summary.preferred_currency, "PHP");
        assert!(overview
            .setup_hints
            .iter()
            .any(|hint| hint.code == "no_vehicles"));
    }

    #[test]
    fn active_and_archived_vehicles_are_counted() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "active-1", "Daily Van", "active");
        insert_vehicle(
            &connection,
            "maintenance-1",
            "Shop Truck",
            "under_maintenance",
        );
        insert_vehicle(&connection, "archived-1", "Old Van", "archived");

        let overview = dashboard_overview(&connection).expect("dashboard should load");

        assert_eq!(overview.vehicle_summary.total_count, 3);
        assert_eq!(overview.vehicle_summary.active_count, 2);
        assert_eq!(overview.vehicle_summary.archived_count, 1);
        assert_eq!(overview.vehicle_summary.under_maintenance_count, 1);
        assert!(overview.vehicle_summary.latest_vehicle_name.is_some());
    }

    #[test]
    fn maintenance_and_alert_counts_are_aggregated() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "Daily Van", "active");
        insert_template(&connection, "oil", "Oil change");
        insert_template(&connection, "tires", "Tire rotation");
        insert_template(&connection, "legal", "Registration renewal");
        connection
            .execute(
                "
                INSERT INTO maintenance_schedules (
                  id,
                  vehicle_id,
                  template_id,
                  next_due_date,
                  due_soon_days,
                  status,
                  priority
                )
                VALUES
                  ('sched-overdue', 'vehicle-1', 'oil', date('now', 'localtime', '-1 day'), 14, 'overdue', 'high'),
                  ('sched-soon', 'vehicle-1', 'tires', date('now', 'localtime', '+7 days'), 14, 'due_soon', 'medium'),
                  ('sched-setup', 'vehicle-1', 'legal', NULL, 14, 'needs_setup', 'medium')
                ",
                [],
            )
            .expect("schedules should insert");
        connection
            .execute(
                "
                INSERT INTO alerts (
                  id,
                  vehicle_id,
                  maintenance_schedule_id,
                  alert_type,
                  priority,
                  title,
                  message,
                  status
                )
                VALUES ('alert-1', 'vehicle-1', 'sched-overdue', 'overdue_by_date', 'high', 'Overdue', 'Oil overdue', 'active')
                ",
                [],
            )
            .expect("alert should insert");

        let overview = dashboard_overview(&connection).expect("dashboard should load");

        assert_eq!(overview.maintenance_summary.overdue_count, 1);
        assert_eq!(overview.maintenance_summary.due_soon_count, 1);
        assert_eq!(overview.maintenance_summary.needs_setup_count, 1);
        assert_eq!(overview.alerts_summary.active_count, 1);
        assert_eq!(overview.alerts_summary.high_priority_count, 1);
        assert_eq!(overview.maintenance_summary.upcoming.len(), 3);
    }

    #[test]
    fn fuel_summary_uses_only_official_efficiency_logs() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "Daily Van", "active");
        connection
            .execute(
                "
                INSERT INTO fuel_logs (
                  id,
                  vehicle_id,
                  fuel_date,
                  odometer,
                  fuel_type,
                  liters,
                  total_amount,
                  is_full_tank,
                  efficiency_status,
                  computed_km_per_liter
                )
                VALUES
                  ('fuel-1', 'vehicle-1', '2026-06-01T08:00', 1100, 'gasoline', 10, 600, 1, 'not_computed', NULL),
                  ('fuel-2', 'vehicle-1', '2026-06-02T08:00', 1200, 'gasoline', 10, 600, 1, 'official', 10),
                  ('fuel-3', 'vehicle-1', '2026-06-03T08:00', 1300, 'gasoline', 20, 1200, 1, 'official', 5)
                ",
                [],
            )
            .expect("fuel logs should insert");

        let overview = dashboard_overview(&connection).expect("dashboard should load");

        assert_eq!(overview.fuel_summary.official_log_count, 2);
        assert_eq!(
            overview.fuel_summary.latest_official_km_per_liter,
            Some(5.0)
        );
        assert_eq!(overview.fuel_summary.recent_average_km_per_liter, Some(7.5));
    }

    #[test]
    fn current_month_costs_avoid_linked_expense_duplicates() {
        let (_temp_dir, connection) = setup_database();
        insert_vehicle(&connection, "vehicle-1", "Daily Van", "active");
        connection
            .execute(
                "
                INSERT INTO fuel_logs (
                  id,
                  vehicle_id,
                  fuel_date,
                  odometer,
                  fuel_type,
                  liters,
                  total_amount,
                  is_full_tank
                )
                VALUES ('fuel-1', 'vehicle-1', datetime('now', 'localtime'), 1100, 'gasoline', 10, 600, 1)
                ",
                [],
            )
            .expect("fuel log should insert");
        connection
            .execute(
                "
                INSERT INTO maintenance_logs (
                  id,
                  vehicle_id,
                  completed_date,
                  odometer,
                  work_performed,
                  labor_cost,
                  parts_cost,
                  total_cost
                )
                VALUES ('maint-1', 'vehicle-1', date('now', 'localtime'), 1200, 'Oil', 300, 700, 1000)
                ",
                [],
            )
            .expect("maintenance log should insert");
        connection
            .execute(
                "
                INSERT INTO repair_records (
                  id,
                  vehicle_id,
                  repair_date,
                  issue_description,
                  total_cost
                )
                VALUES ('repair-1', 'vehicle-1', date('now', 'localtime'), 'Flat tire', 250)
                ",
                [],
            )
            .expect("repair record should insert");
        connection
            .execute(
                "
                INSERT INTO expenses (
                  id,
                  vehicle_id,
                  expense_date,
                  category,
                  description,
                  amount,
                  related_record_type,
                  related_record_id
                )
                VALUES
                  ('expense-manual', 'vehicle-1', date('now', 'localtime'), 'registration', 'Registration', 400, NULL, NULL),
                  ('expense-linked', 'vehicle-1', date('now', 'localtime'), 'fuel', 'Fuel copy', 600, 'fuel_log', 'fuel-1')
                ",
                [],
            )
            .expect("expenses should insert");

        let overview = dashboard_overview(&connection).expect("dashboard should load");

        assert_eq!(overview.cost_summary.fuel_total, 600.0);
        assert_eq!(overview.cost_summary.maintenance_total, 1000.0);
        assert_eq!(overview.cost_summary.repair_total, 250.0);
        assert_eq!(overview.cost_summary.manual_expense_total, 400.0);
        assert_eq!(overview.cost_summary.total_tracked_cost, 2250.0);
    }

    #[test]
    fn settings_currency_and_backup_reminder_are_returned() {
        let (_temp_dir, connection) = setup_database();
        connection
            .execute(
                "
                INSERT INTO settings (key, value, value_type, description)
                VALUES ('preferred_currency', 'USD', 'string', 'test')
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                ",
                [],
            )
            .expect("setting should save");
        connection
            .execute(
                "
                INSERT INTO backups (
                  id,
                  backup_path,
                  status,
                  completed_at,
                  verified_at,
                  size_bytes
                )
                VALUES ('backup-1', 'C:/tmp/test.tog5backup', 'completed', datetime('now', 'localtime'), datetime('now', 'localtime'), 100)
                ",
                [],
            )
            .expect("backup should insert");

        let overview = dashboard_overview(&connection).expect("dashboard should load");

        assert_eq!(overview.preferred_currency, "USD");
        assert_eq!(overview.cost_summary.preferred_currency, "USD");
        assert!(!overview.backup_summary.reminder_due);
        assert_eq!(
            overview.backup_summary.latest_backup_path.as_deref(),
            Some("C:/tmp/test.tog5backup")
        );
    }
}
