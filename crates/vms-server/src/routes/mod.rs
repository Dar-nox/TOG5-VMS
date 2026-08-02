pub mod auth;
pub mod files;
pub mod rpc;

use axum::{
    routing::{get, post},
    Json, Router,
};
use serde_json::{json, Value};
use tower_http::{
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};

use crate::state::AppState;

pub fn router(state: AppState) -> Router {
    let api = Router::new()
        .route("/auth/status", get(auth::status))
        .route("/auth/setup", post(auth::setup))
        .route("/auth/login", post(auth::login))
        .route("/auth/logout", post(auth::logout))
        .route("/rpc/{command}", post(rpc::handle))
        .route("/files/{kind}/{name}", get(files::serve));

    let mut app = Router::new()
        .route("/healthz", get(healthz))
        .nest("/api", api);

    // Everything that is not an API call is the web app itself. Unknown paths
    // fall back to index.html so a refresh on any screen still loads.
    if let Some(web_dir) = state.config().web_dir.clone() {
        let index_file = web_dir.join("index.html");
        app = app.fallback_service(ServeDir::new(web_dir).fallback(ServeFile::new(index_file)));
    }

    app.layer(TraceLayer::new_for_http()).with_state(state)
}

/// Deliberately unauthenticated and free of any database work: the service
/// watchdog needs to know the process is answering, not who is signed in.
async fn healthz() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}
