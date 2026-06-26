use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseListFilter {
    pub vehicle_id: Option<String>,
    pub category: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportFilter {
    pub vehicle_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseMutationRequest {
    pub vehicle_id: String,
    pub expense_date: String,
    pub category: String,
    pub description: String,
    pub amount: f64,
    pub receipt_document_id: Option<String>,
    pub related_record_type: Option<String>,
    pub related_record_id: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseRecord {
    pub id: String,
    pub vehicle_id: Option<String>,
    pub vehicle_name: Option<String>,
    pub expense_date: String,
    pub category: String,
    pub description: String,
    pub amount: f64,
    pub receipt_document_id: Option<String>,
    pub related_record_type: Option<String>,
    pub related_record_id: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CategoryTotalRecord {
    pub category: String,
    pub total: f64,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MonthlyTotalRecord {
    pub month: String,
    pub total: f64,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CostEventRecord {
    pub source_type: String,
    pub source_id: String,
    pub vehicle_id: Option<String>,
    pub vehicle_name: Option<String>,
    pub event_date: String,
    pub category: String,
    pub description: String,
    pub amount: f64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseSummaryReport {
    pub direct_expense_total: f64,
    pub manual_expense_total: f64,
    pub linked_expense_total: f64,
    pub expense_count: i64,
    pub category_totals: Vec<CategoryTotalRecord>,
    pub monthly_totals: Vec<MonthlyTotalRecord>,
    pub recent_expenses: Vec<ExpenseRecord>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VehicleCostSummaryRecord {
    pub vehicle_id: String,
    pub vehicle_name: String,
    pub fuel_total: f64,
    pub maintenance_total: f64,
    pub repair_total: f64,
    pub manual_expense_total: f64,
    pub total_cost: f64,
    pub distance_km: Option<f64>,
    pub cost_per_km: Option<f64>,
    pub cost_per_km_reason: String,
    pub latest_official_km_per_liter: Option<f64>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VehicleCostReport {
    pub vehicle: VehicleCostSummaryRecord,
    pub category_totals: Vec<CategoryTotalRecord>,
    pub monthly_totals: Vec<MonthlyTotalRecord>,
    pub recent_cost_events: Vec<CostEventRecord>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ReportsOverview {
    pub total_tracked_cost: f64,
    pub fuel_total: f64,
    pub maintenance_total: f64,
    pub repair_total: f64,
    pub manual_expense_total: f64,
    pub direct_expense_total: f64,
    pub linked_expense_total: f64,
    pub category_totals: Vec<CategoryTotalRecord>,
    pub monthly_totals: Vec<MonthlyTotalRecord>,
    pub vehicle_summaries: Vec<VehicleCostSummaryRecord>,
    pub recent_cost_events: Vec<CostEventRecord>,
}

#[derive(Debug, Clone)]
pub struct NormalizedExpenseMutation {
    pub vehicle_id: String,
    pub expense_date: String,
    pub category: String,
    pub description: String,
    pub amount: f64,
    pub receipt_document_id: Option<String>,
    pub related_record_type: Option<String>,
    pub related_record_id: Option<String>,
    pub notes: Option<String>,
}
