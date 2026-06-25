use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceTemplateRuleRecord {
    pub id: String,
    pub template_id: String,
    pub applies_to_vehicle_type: Option<String>,
    pub applies_to_fuel_type: Option<String>,
    pub applies_to_transmission_type: Option<String>,
    pub applies_to_drivetrain: Option<String>,
    pub requires_feature: Option<String>,
    pub excludes_feature: Option<String>,
    pub rule_type: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceTemplateRecord {
    pub id: String,
    pub template_key: Option<String>,
    pub name: String,
    pub category: String,
    pub description: Option<String>,
    pub default_time_interval_days: Option<i64>,
    pub default_odometer_interval_km: Option<i64>,
    pub default_due_soon_days: i64,
    pub default_due_soon_km: i64,
    pub priority: String,
    pub is_active: bool,
    pub rules: Vec<MaintenanceTemplateRuleRecord>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ApplicableMaintenanceTemplate {
    pub template: MaintenanceTemplateRecord,
    pub applicability_status: String,
    pub is_auto_applicable: bool,
    pub reason: String,
    pub warnings: Vec<String>,
    pub matched_rule_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SeedMaintenanceTemplatesResult {
    pub template_count: usize,
    pub rule_count: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MaintenanceVehicleProfile {
    pub id: String,
    pub vehicle_type: String,
    pub fuel_type: String,
    pub transmission_type: String,
    pub drivetrain: String,
    pub features: Vec<String>,
}
