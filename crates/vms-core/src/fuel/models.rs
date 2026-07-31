use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FuelTypeWarningRecord {
    pub code: String,
    pub severity: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FuelLogRecord {
    pub id: String,
    pub vehicle_id: String,
    pub vehicle_name: String,
    pub fuel_date: String,
    pub odometer: f64,
    pub fuel_type: String,
    pub liters: f64,
    pub price_per_liter: Option<f64>,
    pub total_amount: f64,
    pub station_name: Option<String>,
    pub receipt_number: Option<String>,
    pub receipt_document_id: Option<String>,
    pub receipt_file_path: Option<String>,
    pub receipt_original_filename: Option<String>,
    pub is_full_tank: bool,
    pub efficiency_status: String,
    pub efficiency_reason: String,
    pub computed_km_per_liter: Option<f64>,
    pub computed_l_per_100km: Option<f64>,
    pub computed_cost_per_km: Option<f64>,
    pub warnings: Vec<FuelTypeWarningRecord>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FuelLogMutationRequest {
    pub vehicle_id: String,
    pub fuel_date: String,
    pub odometer: f64,
    pub fuel_type: String,
    pub liters: f64,
    pub price_per_liter: Option<f64>,
    pub total_amount: Option<f64>,
    pub station_name: Option<String>,
    pub receipt_number: Option<String>,
    pub receipt_document_id: Option<String>,
    pub is_full_tank: bool,
    pub notes: Option<String>,
}

#[derive(Debug, Clone)]
pub struct NormalizedFuelLogMutation {
    pub vehicle_id: String,
    pub fuel_date: String,
    pub odometer: f64,
    pub fuel_type: String,
    pub liters: f64,
    pub price_per_liter: Option<f64>,
    pub total_amount: f64,
    pub station_name: Option<String>,
    pub receipt_number: Option<String>,
    pub receipt_document_id: Option<String>,
    pub is_full_tank: bool,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoreFuelReceiptRequest {
    pub vehicle_id: String,
    pub original_filename: Option<String>,
    pub mime_type: Option<String>,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone)]
pub struct NewFuelReceipt {
    pub id: String,
    pub vehicle_id: String,
    pub file_path: String,
    pub original_filename: Option<String>,
    pub file_size_bytes: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FuelReceiptRecord {
    pub id: String,
    pub vehicle_id: String,
    pub file_path: String,
    pub original_filename: Option<String>,
    pub file_size_bytes: i64,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FuelEfficiencySummaryRecord {
    pub vehicle_id: String,
    pub official_log_count: usize,
    pub latest_km_per_liter: Option<f64>,
    pub recent_average_km_per_liter: Option<f64>,
    pub efficiency_drop_detected: bool,
    pub warning: Option<String>,
}
