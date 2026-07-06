use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportReportCsvRequest {
    pub filename: String,
    pub csv_contents: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportReportCsvResponse {
    pub filename: String,
    pub file_path: String,
    pub folder_path: String,
    pub size_bytes: u64,
}
