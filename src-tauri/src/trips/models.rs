use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TripListFilter {
    pub vehicle_id: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TripReportFilter {
    pub vehicle_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartTripRequest {
    pub vehicle_id: String,
    pub departure_time: String,
    pub drivers: Vec<String>,
    pub passengers: Vec<String>,
    pub reason: String,
    pub destinations: Vec<String>,
    pub departure_notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteTripRequest {
    pub return_time: String,
    pub return_notes: Option<String>,
}

#[derive(Debug, Clone)]
pub struct NormalizedStartTrip {
    pub vehicle_id: String,
    pub departure_time: String,
    pub drivers: Vec<String>,
    pub passengers: Vec<String>,
    pub reason: String,
    pub destinations: Vec<String>,
    pub departure_notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TripRecord {
    pub id: String,
    pub vehicle_id: String,
    pub vehicle_name: String,
    pub departure_time: String,
    pub return_time: Option<String>,
    pub reason: String,
    pub destinations: Vec<String>,
    pub drivers: Vec<String>,
    pub passengers: Vec<String>,
    pub departure_notes: Option<String>,
    pub return_notes: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TripCountRecord {
    pub label: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TripReportsOverview {
    pub total_trips: i64,
    pub open_trips: i64,
    pub completed_trips: i64,
    pub cancelled_trips: i64,
    pub trips_by_vehicle: Vec<TripCountRecord>,
    pub trips_by_driver: Vec<TripCountRecord>,
    pub trips_by_destination: Vec<TripCountRecord>,
    pub recent_trips: Vec<TripRecord>,
}
