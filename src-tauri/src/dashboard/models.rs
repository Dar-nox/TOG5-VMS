use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardOverview {
    pub generated_at: String,
    pub owner_display_name: String,
    pub preferred_currency: String,
    pub vehicle_summary: VehicleDashboardSummary,
    pub maintenance_summary: MaintenanceDashboardSummary,
    pub alerts_summary: AlertsDashboardSummary,
    pub fuel_summary: FuelDashboardSummary,
    pub cost_summary: CostDashboardSummary,
    pub backup_summary: BackupDashboardSummary,
    pub recent_activity: Vec<DashboardActivityItem>,
    pub setup_hints: Vec<DashboardSetupHint>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VehicleDashboardSummary {
    pub total_count: i64,
    pub active_count: i64,
    pub archived_count: i64,
    pub under_maintenance_count: i64,
    pub latest_vehicle_name: Option<String>,
    pub latest_vehicle_photo_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceDashboardSummary {
    pub total_schedule_count: i64,
    pub overdue_count: i64,
    pub due_today_count: i64,
    pub due_soon_count: i64,
    pub needs_setup_count: i64,
    pub upcoming: Vec<DashboardMaintenanceItem>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardMaintenanceItem {
    pub id: String,
    pub vehicle_id: String,
    pub vehicle_name: String,
    pub template_name: String,
    pub category: String,
    pub priority: String,
    pub due_status: String,
    pub due_reason: String,
    pub next_due_date: Option<String>,
    pub next_due_odometer: Option<f64>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AlertsDashboardSummary {
    pub active_count: i64,
    pub high_priority_count: i64,
    pub top_alerts: Vec<DashboardAlertItem>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardAlertItem {
    pub id: String,
    pub title: String,
    pub message: String,
    pub alert_type: String,
    pub priority: String,
    pub vehicle_name: Option<String>,
    pub maintenance_template_name: Option<String>,
    pub created_at: String,
    pub due_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FuelDashboardSummary {
    pub latest_official_km_per_liter: Option<f64>,
    pub recent_average_km_per_liter: Option<f64>,
    pub official_log_count: i64,
    pub efficiency_drop_active: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CostDashboardSummary {
    pub current_month: String,
    pub total_tracked_cost: f64,
    pub fuel_total: f64,
    pub maintenance_total: f64,
    pub repair_total: f64,
    pub manual_expense_total: f64,
    pub preferred_currency: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BackupDashboardSummary {
    pub latest_completed_at: Option<String>,
    pub latest_backup_path: Option<String>,
    pub reminder_due: bool,
    pub message: String,
    pub package_note: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardActivityItem {
    pub id: String,
    pub activity_type: String,
    pub title: String,
    pub detail: String,
    pub happened_at: String,
    pub vehicle_name: Option<String>,
    pub amount: Option<f64>,
    pub target_page: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardSetupHint {
    pub code: String,
    pub title: String,
    pub message: String,
    pub action_label: Option<String>,
    pub target_page: Option<String>,
}
