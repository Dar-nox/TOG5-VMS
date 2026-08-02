use serde::Deserialize;

/// The argument shapes the web app sends. They mirror the object that used to
/// be passed to Tauri's `invoke`, camel-cased keys and all, so no call site in
/// the frontend had to change when the transport became HTTP.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdArg {
    pub id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VehicleIdArg {
    pub vehicle_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlertIdArg {
    pub alert_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateIdArg {
    pub template_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingIdArg {
    pub setting_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupPathArg {
    pub backup_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestArg<T> {
    pub request: T,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdRequestArg<T> {
    pub id: String,
    pub request: T,
}

/// The filter is optional twice over: the web app may leave the key out
/// entirely, or send it as null. The explicit bound keeps `#[serde(default)]`
/// from demanding that every filter type also implement `Default`.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", bound(deserialize = "T: Deserialize<'de>"))]
pub struct FilterArg<T> {
    #[serde(default)]
    pub filter: Option<T>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", bound(deserialize = "T: Deserialize<'de>"))]
pub struct VehicleFilterArg<T> {
    pub vehicle_id: String,
    #[serde(default)]
    pub filter: Option<T>,
}
