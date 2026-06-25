use serde::{Deserialize, Serialize};

pub type EntityId = String;
pub type IsoDateString = String;
pub type IsoDateTimeString = String;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ValidationSeverity {
    Error,
    Warning,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ValidationIssue {
    pub code: String,
    pub message: String,
    pub severity: ValidationSeverity,
    pub field: Option<String>,
}
