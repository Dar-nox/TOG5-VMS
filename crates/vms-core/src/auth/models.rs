use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLocalUserRequest {
    pub display_name: String,
    pub username: String,
    pub password: String,
    pub role: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetLocalUserPasswordRequest {
    pub user_id: String,
    pub password: String,
}
