use axum::{extract::FromRequestParts, http::request::Parts};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use time::Duration;
use vms_core::{
    auth::repository::{user_for_token, SESSION_LIFETIME_DAYS},
    settings::models::LocalUserRecord,
};

use crate::{error::ApiError, state::AppState};

pub const SESSION_COOKIE_NAME: &str = "vms_session";

const SIGNED_OUT: &str = "Please sign in to continue.";

/// The signed-in account behind the current request. Handlers that take this
/// extractor cannot run without a valid session, so authentication is visible
/// in each handler's signature rather than hidden in a layer.
#[derive(Debug, Clone)]
pub struct CurrentUser(pub LocalUserRecord);

impl FromRequestParts<AppState> for CurrentUser {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let jar = CookieJar::from_headers(&parts.headers);

        resolve_user(state, &jar)
            .await?
            .map(CurrentUser)
            .ok_or_else(|| ApiError::unauthorized(SIGNED_OUT))
    }
}

/// Looks up the session without rejecting the request when there isn't one.
/// The sign-in screen needs this: it asks who you are before you are anybody.
pub async fn resolve_user(
    state: &AppState,
    jar: &CookieJar,
) -> Result<Option<LocalUserRecord>, ApiError> {
    let Some(token) = jar
        .get(SESSION_COOKIE_NAME)
        .map(|cookie| cookie.value().to_string())
    else {
        return Ok(None);
    };

    let state = state.clone();
    crate::blocking(move || {
        let connection = state.connection().map_err(ApiError::internal)?;
        user_for_token(&connection, &token).map_err(ApiError::internal)
    })
    .await
}

pub fn session_cookie(token: String, secure: bool) -> Cookie<'static> {
    Cookie::build((SESSION_COOKIE_NAME, token))
        .http_only(true)
        .secure(secure)
        .same_site(SameSite::Lax)
        .path("/")
        .max_age(Duration::days(SESSION_LIFETIME_DAYS))
        .build()
}

pub fn expired_session_cookie(secure: bool) -> Cookie<'static> {
    Cookie::build((SESSION_COOKIE_NAME, String::new()))
        .http_only(true)
        .secure(secure)
        .same_site(SameSite::Lax)
        .path("/")
        .max_age(Duration::ZERO)
        .build()
}
