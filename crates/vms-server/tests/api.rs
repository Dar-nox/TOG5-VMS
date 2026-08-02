//! End-to-end tests over the real router: sign-in, the owner gate, the RPC
//! surface, and file serving. They exercise the HTTP layer the browser talks
//! to, which is the part `vms-core`'s unit tests cannot reach.

use std::net::SocketAddr;

use axum::{
    body::{to_bytes, Body},
    extract::ConnectInfo,
    http::{header, Request, Response, StatusCode},
    Router,
};
use serde_json::{json, Value};
use tempfile::TempDir;
use tower::ServiceExt;
use vms_server::{config::ServerConfig, routes, rpc::COMMANDS};

const OWNER_PASSWORD: &str = "owner-password-2026";
const OTHER_PASSWORD: &str = "driver-password-2026";
const BODY_LIMIT: usize = 32 * 1024 * 1024;

struct TestServer {
    _data_dir: TempDir,
    router: Router,
}

impl TestServer {
    fn start() -> Self {
        let data_dir = tempfile::tempdir().expect("temp data folder should be created");
        let config = ServerConfig {
            bind_address: "127.0.0.1:0".parse().expect("address should parse"),
            data_dir: data_dir.path().to_path_buf(),
            web_dir: None,
            secure_cookies: false,
        };
        let state = vms_server::build_state(config).expect("server state should build");

        Self {
            _data_dir: data_dir,
            router: routes::router(state),
        }
    }

    async fn send(&self, request: Request<Body>) -> Response<Body> {
        self.router
            .clone()
            .oneshot(request)
            .await
            .expect("the router should always answer")
    }

    async fn post(&self, uri: &str, body: Value, session: Option<&str>) -> Response<Body> {
        self.send(request("POST", uri, Some(body), session)).await
    }

    async fn get(&self, uri: &str, session: Option<&str>) -> Response<Body> {
        self.send(request("GET", uri, None, session)).await
    }

    /// Runs first-run setup and returns the owner's session cookie.
    async fn sign_up_owner(&self) -> String {
        let response = self
            .post(
                "/api/auth/setup",
                json!({ "password": OWNER_PASSWORD }),
                None,
            )
            .await;

        assert_eq!(response.status(), StatusCode::OK, "setup should succeed");
        session_cookie(&response)
    }

    async fn sign_in(&self, username: &str, password: &str) -> Response<Body> {
        self.post(
            "/api/auth/login",
            json!({ "username": username, "password": password }),
            None,
        )
        .await
    }
}

fn request(method: &str, uri: &str, body: Option<Value>, session: Option<&str>) -> Request<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(uri)
        .header(header::CONTENT_TYPE, "application/json");

    if let Some(cookie) = session {
        builder = builder.header(header::COOKIE, cookie);
    }

    let body = match body {
        Some(value) => Body::from(value.to_string()),
        None => Body::empty(),
    };
    let mut request = builder.body(body).expect("request should build");

    // Stands in for the peer address the listener would normally attach.
    request
        .extensions_mut()
        .insert(ConnectInfo(SocketAddr::from(([127, 0, 0, 1], 51000))));

    request
}

fn session_cookie(response: &Response<Body>) -> String {
    let cookie = response
        .headers()
        .get(header::SET_COOKIE)
        .and_then(|value| value.to_str().ok())
        .expect("a signed-in response should set a session cookie");

    cookie
        .split(';')
        .next()
        .expect("the cookie should have a value")
        .to_string()
}

async fn body_json(response: Response<Body>) -> Value {
    let bytes = to_bytes(response.into_body(), BODY_LIMIT)
        .await
        .expect("the response body should be readable");

    serde_json::from_slice(&bytes).expect("the response should be JSON")
}

/// Stores a vehicle photo and returns its id and the name it was saved under.
async fn upload_photo(server: &TestServer, session: &str) -> (String, String) {
    let response = server
        .post(
            "/api/rpc/store_vehicle_photo",
            json!({
                "request": {
                    "originalFilename": "front.png",
                    "mimeType": "image/png",
                    "bytes": [137, 80, 78, 71, 13, 10, 26, 10],
                }
            }),
            Some(session),
        )
        .await;

    assert_eq!(response.status(), StatusCode::OK, "photo should be stored");
    let photo = body_json(response).await;
    let file_path = photo["filePath"].as_str().expect("photo has a file path");
    let file_name = file_path
        .rsplit(['/', '\\'])
        .next()
        .expect("the path has a file name")
        .to_string();

    (
        photo["id"].as_str().expect("photo has an id").to_string(),
        file_name,
    )
}

#[tokio::test]
async fn an_uploaded_photo_can_be_read_back_through_the_file_route() {
    let server = TestServer::start();
    let owner = server.sign_up_owner().await;
    let (_id, file_name) = upload_photo(&server, &owner).await;

    let response = server
        .get(
            &format!("/api/files/vehicle-photos/{file_name}"),
            Some(&owner),
        )
        .await;

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get(header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok()),
        Some("image/png")
    );

    let signed_out = server
        .get(&format!("/api/files/vehicle-photos/{file_name}"), None)
        .await;
    assert_eq!(
        signed_out.status(),
        StatusCode::UNAUTHORIZED,
        "receipts and photos must not be readable without signing in"
    );
}

#[tokio::test]
async fn health_is_answerable_without_signing_in() {
    let server = TestServer::start();

    let response = server.get("/healthz", None).await;

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn the_api_is_closed_until_you_sign_in() {
    let server = TestServer::start();

    let rpc = server.post("/api/rpc/list_vehicles", json!({}), None).await;
    assert_eq!(rpc.status(), StatusCode::UNAUTHORIZED);

    let file = server
        .get("/api/files/vehicle-photos/photo.jpg", None)
        .await;
    assert_eq!(file.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn a_fresh_server_asks_for_setup_and_then_never_again() {
    let server = TestServer::start();

    let before = body_json(server.get("/api/auth/status", None).await).await;
    assert_eq!(before["needsSetup"], json!(true));
    assert_eq!(before["user"], Value::Null);

    let session = server.sign_up_owner().await;

    let after = body_json(server.get("/api/auth/status", Some(&session)).await).await;
    assert_eq!(after["needsSetup"], json!(false));
    assert_eq!(after["user"]["role"], json!("owner"));

    let second_setup = server
        .post(
            "/api/auth/setup",
            json!({ "password": "another-password" }),
            None,
        )
        .await;
    assert_eq!(
        second_setup.status(),
        StatusCode::BAD_REQUEST,
        "setup must not be usable a second time"
    );
}

#[tokio::test]
async fn signing_in_opens_the_api_and_signing_out_closes_it() {
    let server = TestServer::start();
    server.sign_up_owner().await;

    let wrong = server.sign_in("owner", "not-the-password").await;
    assert_eq!(wrong.status(), StatusCode::UNAUTHORIZED);

    let signed_in = server.sign_in("owner", OWNER_PASSWORD).await;
    assert_eq!(signed_in.status(), StatusCode::OK);
    let session = session_cookie(&signed_in);

    let vehicles = server
        .post("/api/rpc/list_vehicles", json!({}), Some(&session))
        .await;
    assert_eq!(vehicles.status(), StatusCode::OK);
    assert_eq!(body_json(vehicles).await, json!([]));

    let signed_out = server
        .post("/api/auth/logout", json!({}), Some(&session))
        .await;
    assert_eq!(signed_out.status(), StatusCode::OK);

    let after_sign_out = server
        .post("/api/rpc/list_vehicles", json!({}), Some(&session))
        .await;
    assert_eq!(
        after_sign_out.status(),
        StatusCode::UNAUTHORIZED,
        "the session must stop working the moment somebody signs out"
    );
}

#[tokio::test]
async fn a_second_user_can_work_but_cannot_run_the_destructive_commands() {
    let server = TestServer::start();
    let owner = server.sign_up_owner().await;

    let created = server
        .post(
            "/api/rpc/create_local_user",
            json!({
                "request": {
                    "displayName": "Maria Santos",
                    "username": "maria",
                    "password": OTHER_PASSWORD,
                }
            }),
            Some(&owner),
        )
        .await;
    assert_eq!(created.status(), StatusCode::OK);
    assert_eq!(body_json(created).await["username"], json!("maria"));

    let maria = session_cookie(&server.sign_in("maria", OTHER_PASSWORD).await);

    let photo_id = upload_photo(&server, &maria).await.0;
    let everyday_work = server
        .post(
            "/api/rpc/create_vehicle",
            json!({
                "request": {
                    "vehicleName": "Service Van 1",
                    "primaryPhotoId": photo_id,
                    "vehicleType": "van",
                    "fuelType": "diesel",
                    "currentOdometer": 1200,
                }
            }),
            Some(&maria),
        )
        .await;
    assert_eq!(
        everyday_work.status(),
        StatusCode::OK,
        "a non-owner must still be able to do the day-to-day work"
    );

    for command in [
        "clear_app_data",
        "reset_app_settings",
        "restore_backup",
        "update_local_user",
        "create_local_user",
        "set_local_user_password",
    ] {
        let response = server
            .post(&format!("/api/rpc/{command}"), json!({}), Some(&maria))
            .await;

        assert_eq!(
            response.status(),
            StatusCode::FORBIDDEN,
            "{command} should be owner-only"
        );
    }
}

#[tokio::test]
async fn every_command_the_web_app_calls_reaches_a_handler() {
    let server = TestServer::start();
    let owner = server.sign_up_owner().await;

    for command in COMMANDS {
        let response = server
            .post(&format!("/api/rpc/{command}"), json!({}), Some(&owner))
            .await;

        assert_ne!(
            response.status(),
            StatusCode::NOT_FOUND,
            "'{command}' is not wired up to a handler"
        );
    }
}

#[tokio::test]
async fn an_unknown_command_is_reported_rather_than_ignored() {
    let server = TestServer::start();
    let owner = server.sign_up_owner().await;

    let response = server
        .post("/api/rpc/drop_everything", json!({}), Some(&owner))
        .await;

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn managed_files_cannot_be_used_to_read_the_rest_of_the_disk() {
    let server = TestServer::start();
    let owner = server.sign_up_owner().await;

    for path in [
        "/api/files/vehicle-photos/..%2Ftog5-vms.sqlite3",
        "/api/files/vehicle-photos/..%2F..%2Fsecrets.txt",
        "/api/files/vehicle-photos/%2Fetc%2Fpasswd",
        "/api/files/backups/tog5-vms.sqlite3",
        "/api/files/vehicle-photos/missing.jpg",
    ] {
        let response = server.get(path, Some(&owner)).await;

        assert_eq!(
            response.status(),
            StatusCode::NOT_FOUND,
            "{path} should not serve a file"
        );
    }
}

#[tokio::test]
async fn settings_report_the_signed_in_account() {
    let server = TestServer::start();
    let owner = server.sign_up_owner().await;

    let settings = body_json(
        server
            .post("/api/rpc/get_app_settings", json!({}), Some(&owner))
            .await,
    )
    .await;

    assert_eq!(settings["activeUser"]["username"], json!("owner"));

    let access = body_json(
        server
            .post("/api/rpc/get_access_summary", json!({}), Some(&owner))
            .await,
    )
    .await;

    assert_eq!(
        access["permissionsEnforced"],
        json!(true),
        "the access summary must not still claim there is no sign-in"
    );
}
