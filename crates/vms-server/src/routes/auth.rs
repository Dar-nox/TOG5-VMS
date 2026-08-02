use std::net::SocketAddr;

use axum::{
    extract::{ConnectInfo, State},
    http::{header::USER_AGENT, HeaderMap},
    Json,
};
use axum_extra::extract::cookie::CookieJar;
use serde::{Deserialize, Serialize};
use vms_core::{
    auth::repository::{
        authenticate, end_session, needs_initial_setup, set_initial_owner_password, start_session,
    },
    settings::models::LocalUserRecord,
};

use crate::{
    blocking,
    error::ApiError,
    session::{expired_session_cookie, resolve_user, session_cookie, SESSION_COOKIE_NAME},
    state::AppState,
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatusResponse {
    needs_setup: bool,
    user: Option<LocalUserRecord>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SignedInResponse {
    user: LocalUserRecord,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupRequest {
    password: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignInRequest {
    username: String,
    password: String,
}

/// What the sign-in screen asks before it decides whether to show a sign-in
/// form, a first-run setup form, or nothing at all because you are already in.
pub async fn status(
    State(state): State<AppState>,
    jar: CookieJar,
) -> Result<Json<AuthStatusResponse>, ApiError> {
    let user = resolve_user(&state, &jar).await?;
    let lookup_state = state.clone();
    let needs_setup = blocking(move || {
        let connection = lookup_state.connection().map_err(ApiError::internal)?;
        needs_initial_setup(&connection).map_err(ApiError::internal)
    })
    .await?;

    Ok(Json(AuthStatusResponse { needs_setup, user }))
}

/// First run only. `set_initial_owner_password` refuses once any account has a
/// password, so leaving this route mounted does not leave a way back in.
pub async fn setup(
    State(state): State<AppState>,
    jar: CookieJar,
    headers: HeaderMap,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    Json(request): Json<SetupRequest>,
) -> Result<(CookieJar, Json<SignedInResponse>), ApiError> {
    let caller = caller_key(&headers, peer);
    let user_agent = user_agent(&headers);
    let secure = state.config().secure_cookies;
    let setup_state = state.clone();

    let (user, session) = blocking(move || {
        let connection = setup_state.connection().map_err(ApiError::internal)?;
        let user = set_initial_owner_password(&connection, &request.password)
            .map_err(ApiError::bad_request)?;
        let session = start_session(
            &connection,
            &user.id,
            user_agent.as_deref(),
            Some(caller.as_str()),
        )
        .map_err(ApiError::internal)?;

        Ok((user, session))
    })
    .await?;

    Ok((
        jar.add(session_cookie(session.token, secure)),
        Json(SignedInResponse { user }),
    ))
}

pub async fn login(
    State(state): State<AppState>,
    jar: CookieJar,
    headers: HeaderMap,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    Json(request): Json<SignInRequest>,
) -> Result<(CookieJar, Json<SignedInResponse>), ApiError> {
    let caller = caller_key(&headers, peer);
    state
        .login_limiter()
        .record_attempt(&caller)
        .map_err(ApiError::too_many_requests)?;

    let user_agent = user_agent(&headers);
    let secure = state.config().secure_cookies;
    let sign_in_caller = caller.clone();
    let sign_in_state = state.clone();

    let (user, session) = blocking(move || {
        let connection = sign_in_state.connection().map_err(ApiError::internal)?;
        let user = authenticate(&connection, &request.username, &request.password)
            .map_err(ApiError::unauthorized)?;
        let session = start_session(
            &connection,
            &user.id,
            user_agent.as_deref(),
            Some(sign_in_caller.as_str()),
        )
        .map_err(ApiError::internal)?;

        Ok((user, session))
    })
    .await?;

    state.login_limiter().clear(&caller);

    Ok((
        jar.add(session_cookie(session.token, secure)),
        Json(SignedInResponse { user }),
    ))
}

/// Signing out always succeeds, even from an expired session: the point is to
/// end up signed out, and saying "you cannot sign out, you are signed out"
/// would be a strange thing to tell somebody.
pub async fn logout(
    State(state): State<AppState>,
    jar: CookieJar,
) -> Result<(CookieJar, Json<AuthStatusResponse>), ApiError> {
    if let Some(token) = jar
        .get(SESSION_COOKIE_NAME)
        .map(|cookie| cookie.value().to_string())
    {
        let logout_state = state.clone();
        blocking(move || {
            let connection = logout_state.connection().map_err(ApiError::internal)?;
            end_session(&connection, &token).map_err(ApiError::internal)
        })
        .await?;
    }

    Ok((
        jar.add(expired_session_cookie(state.config().secure_cookies)),
        Json(AuthStatusResponse {
            needs_setup: false,
            user: None,
        }),
    ))
}

fn user_agent(headers: &HeaderMap) -> Option<String> {
    headers
        .get(USER_AGENT)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.chars().take(255).collect())
}

/// Identifies the caller for rate limiting and the session log.
///
/// The forwarding headers are trusted on purpose: the server is meant to
/// listen on loopback with Cloudflare Tunnel in front of it, so the only thing
/// that can reach it is the tunnel, and the socket address would otherwise
/// read `127.0.0.1` for every person in the company.
fn caller_key(headers: &HeaderMap, peer: SocketAddr) -> String {
    for header_name in ["cf-connecting-ip", "x-forwarded-for"] {
        let forwarded = headers
            .get(header_name)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.split(',').next())
            .map(str::trim)
            .filter(|value| !value.is_empty());

        if let Some(address) = forwarded {
            return address.to_string();
        }
    }

    peer.ip().to_string()
}
