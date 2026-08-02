use rand_core::{OsRng, RngCore};
use rusqlite::{params, Connection, OptionalExtension};
use sha2::{Digest, Sha256};

use crate::settings::{
    models::LocalUserRecord,
    repository::{ensure_default_owner_user, get_user, user_from_row, VALID_ROLES},
};
use crate::vehicles::photo_storage::generate_local_id;

use super::models::CreateLocalUserRequest;
use super::passwords::{hash_password, spend_verification_time, verify_password};

pub const SESSION_LIFETIME_DAYS: i64 = 30;
pub const MINIMUM_USERNAME_LENGTH: usize = 3;

/// New accounts land on `manager`, which today has the same day-to-day access
/// as every other non-owner role. Owner stays reserved for the account created
/// during first-run setup.
const DEFAULT_NEW_USER_ROLE: &str = "manager";

const TOKEN_BYTES: usize = 32;
const SIGN_IN_FAILED: &str = "That username and password combination did not work.";

/// A newly issued session. `token` is the only time the raw value exists —
/// only its hash is stored, so a leaked database cannot be used to sign in.
pub struct IssuedSession {
    pub token: String,
    pub expires_at: String,
}

pub fn needs_initial_setup(connection: &Connection) -> Result<bool, String> {
    let configured: i64 = connection
        .query_row(
            "
            SELECT COUNT(*)
            FROM users
            WHERE password_hash IS NOT NULL
              AND deleted_at IS NULL
              AND status = 'active'
            ",
            [],
            |row| row.get(0),
        )
        .map_err(|_| "Could not check whether sign-in has been set up.".to_string())?;

    Ok(configured == 0)
}

/// One-time bootstrap: gives the seeded owner profile its first password.
/// Refuses once any account has a password, so the route stays closed after
/// setup even if it is left mounted.
pub fn set_initial_owner_password(
    connection: &Connection,
    password: &str,
) -> Result<LocalUserRecord, String> {
    if !needs_initial_setup(connection)? {
        return Err("Sign-in has already been set up on this system.".to_string());
    }

    let owner = ensure_default_owner_user(connection)?;
    set_user_password(connection, &owner.id, password)?;

    get_user(connection, &owner.id)?
        .ok_or_else(|| "Could not read the owner profile after setup.".to_string())
}

/// Adds a second (or third, or tenth) account that can sign in. This is the
/// only way to get more than one user, so it validates the username the same
/// way sign-in reads it: trimmed and lower-cased, so "Maria" and "maria"
/// cannot become two different accounts.
pub fn create_user(
    connection: &Connection,
    request: CreateLocalUserRequest,
) -> Result<LocalUserRecord, String> {
    let display_name = request.display_name.trim().to_string();
    if display_name.is_empty() {
        return Err("Enter a name for the new user.".to_string());
    }

    let username = normalize_username(&request.username)?;
    let role = match request.role {
        Some(role) => normalize_role(&role)?,
        None => DEFAULT_NEW_USER_ROLE.to_string(),
    };
    let password_hash = hash_password(&request.password)?;

    if username_is_taken(connection, &username)? {
        return Err("That username is already in use. Choose another one.".to_string());
    }

    let id = generate_local_id("user");
    connection
        .execute(
            "
            INSERT INTO users (
              id,
              display_name,
              username,
              role,
              status,
              password_hash,
              password_updated_at
            )
            VALUES (?1, ?2, ?3, ?4, 'active', ?5, datetime('now'))
            ",
            params![id, display_name, username, role, password_hash],
        )
        .map_err(|_| "Could not create that user.".to_string())?;

    get_user(connection, &id)?.ok_or_else(|| "Could not read the new user profile.".to_string())
}

pub fn set_user_password(
    connection: &Connection,
    user_id: &str,
    password: &str,
) -> Result<(), String> {
    let password_hash = hash_password(password)?;

    let updated = connection
        .execute(
            "
            UPDATE users
            SET
              password_hash = ?1,
              password_updated_at = datetime('now'),
              updated_at = datetime('now')
            WHERE id = ?2
              AND deleted_at IS NULL
            ",
            params![password_hash, user_id],
        )
        .map_err(|_| "Could not save the new password.".to_string())?;

    if updated == 0 {
        return Err("That user profile was not found.".to_string());
    }

    revoke_sessions_for_user(connection, user_id)?;

    Ok(())
}

pub fn authenticate(
    connection: &Connection,
    username: &str,
    password: &str,
) -> Result<LocalUserRecord, String> {
    let username = username.trim().to_ascii_lowercase();

    let candidate = connection
        .query_row(
            "
            SELECT id, password_hash
            FROM users
            WHERE username = ?1
              AND deleted_at IS NULL
              AND status = 'active'
            ",
            params![username],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?)),
        )
        .optional()
        .map_err(|_| "Could not check those sign-in details.".to_string())?;

    let Some((user_id, Some(password_hash))) = candidate else {
        spend_verification_time();
        return Err(SIGN_IN_FAILED.to_string());
    };

    if !verify_password(password, &password_hash) {
        return Err(SIGN_IN_FAILED.to_string());
    }

    connection
        .execute(
            "UPDATE users SET last_login_at = datetime('now') WHERE id = ?1",
            params![user_id],
        )
        .map_err(|_| "Could not complete sign-in.".to_string())?;

    get_user(connection, &user_id)?.ok_or_else(|| SIGN_IN_FAILED.to_string())
}

pub fn start_session(
    connection: &Connection,
    user_id: &str,
    user_agent: Option<&str>,
    ip_address: Option<&str>,
) -> Result<IssuedSession, String> {
    let token = generate_token();
    let token_hash = hash_token(&token);

    connection
        .execute(
            "
            INSERT INTO sessions (
              id,
              user_id,
              token_hash,
              expires_at,
              user_agent,
              ip_address
            )
            VALUES (?1, ?2, ?3, datetime('now', ?4), ?5, ?6)
            ",
            params![
                generate_local_id("session"),
                user_id,
                token_hash,
                format!("+{SESSION_LIFETIME_DAYS} days"),
                user_agent,
                ip_address,
            ],
        )
        .map_err(|_| "Could not start the sign-in session.".to_string())?;

    let expires_at = connection
        .query_row(
            "SELECT expires_at FROM sessions WHERE token_hash = ?1",
            params![token_hash],
            |row| row.get(0),
        )
        .map_err(|_| "Could not read the session expiry.".to_string())?;

    Ok(IssuedSession { token, expires_at })
}

pub fn user_for_token(
    connection: &Connection,
    token: &str,
) -> Result<Option<LocalUserRecord>, String> {
    let token_hash = hash_token(token);

    let user = connection
        .query_row(
            "
            SELECT
              users.id,
              users.display_name,
              users.username,
              users.role,
              users.status,
              users.created_at,
              users.updated_at
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ?1
              AND sessions.revoked_at IS NULL
              AND sessions.expires_at > datetime('now')
              AND users.deleted_at IS NULL
              AND users.status = 'active'
            ",
            params![token_hash],
            user_from_row,
        )
        .optional()
        .map_err(|_| "Could not check the sign-in session.".to_string())?;

    if user.is_some() {
        connection
            .execute(
                "UPDATE sessions SET last_seen_at = datetime('now') WHERE token_hash = ?1",
                params![token_hash],
            )
            .map_err(|_| "Could not update the sign-in session.".to_string())?;
    }

    Ok(user)
}

pub fn end_session(connection: &Connection, token: &str) -> Result<(), String> {
    connection
        .execute(
            "
            UPDATE sessions
            SET revoked_at = datetime('now')
            WHERE token_hash = ?1
              AND revoked_at IS NULL
            ",
            params![hash_token(token)],
        )
        .map_err(|_| "Could not sign out.".to_string())?;

    Ok(())
}

pub fn revoke_sessions_for_user(connection: &Connection, user_id: &str) -> Result<(), String> {
    connection
        .execute(
            "
            UPDATE sessions
            SET revoked_at = datetime('now')
            WHERE user_id = ?1
              AND revoked_at IS NULL
            ",
            params![user_id],
        )
        .map_err(|_| "Could not end the existing sessions for that user.".to_string())?;

    Ok(())
}

pub fn purge_expired_sessions(connection: &Connection) -> Result<usize, String> {
    connection
        .execute(
            "DELETE FROM sessions WHERE expires_at <= datetime('now')",
            [],
        )
        .map_err(|_| "Could not clear expired sign-in sessions.".to_string())
}

fn normalize_username(username: &str) -> Result<String, String> {
    let normalized = username.trim().to_ascii_lowercase();

    if normalized.chars().count() < MINIMUM_USERNAME_LENGTH {
        return Err(format!(
            "Usernames need at least {MINIMUM_USERNAME_LENGTH} characters."
        ));
    }

    let allowed = normalized
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | '-'));

    if !allowed {
        return Err(
            "Usernames can only use letters, numbers, dots, underscores, and dashes.".to_string(),
        );
    }

    Ok(normalized)
}

fn normalize_role(role: &str) -> Result<String, String> {
    let normalized = role.trim().to_ascii_lowercase();

    VALID_ROLES
        .contains(&normalized.as_str())
        .then_some(normalized)
        .ok_or_else(|| "Choose a valid role.".to_string())
}

fn username_is_taken(connection: &Connection, username: &str) -> Result<bool, String> {
    let existing: Option<String> = connection
        .query_row(
            "SELECT id FROM users WHERE username = ?1",
            params![username],
            |row| row.get(0),
        )
        .optional()
        .map_err(|_| "Could not check whether that username is free.".to_string())?;

    Ok(existing.is_some())
}

fn generate_token() -> String {
    let mut bytes = [0u8; TOKEN_BYTES];
    OsRng.fill_bytes(&mut bytes);
    to_hex(&bytes)
}

fn hash_token(token: &str) -> String {
    to_hex(&Sha256::digest(token.as_bytes()))
}

fn to_hex(bytes: &[u8]) -> String {
    let mut hex = String::with_capacity(bytes.len() * 2);

    for byte in bytes {
        use std::fmt::Write;
        let _ = write!(hex, "{byte:02x}");
    }

    hex
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{initialize_database_at_path, open_database_at_path};

    const GOOD_PASSWORD: &str = "fleet-manager-2026";

    fn test_connection() -> (tempfile::TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let database_path = temp_dir.path().join("auth.sqlite3");
        initialize_database_at_path(&database_path).expect("init should succeed");
        let connection = open_database_at_path(&database_path).expect("database should open");

        (temp_dir, connection)
    }

    fn set_up_owner(connection: &Connection) -> LocalUserRecord {
        set_initial_owner_password(connection, GOOD_PASSWORD).expect("setup should succeed")
    }

    #[test]
    fn a_fresh_database_needs_setup_and_has_no_usable_password() {
        let (_temp_dir, connection) = test_connection();

        ensure_default_owner_user(&connection).expect("owner profile should exist");

        assert!(
            needs_initial_setup(&connection).expect("check should succeed"),
            "the seeded owner profile must not ship with a usable password"
        );
        assert!(authenticate(&connection, "owner", GOOD_PASSWORD).is_err());
    }

    #[test]
    fn setup_sets_the_password_once_and_then_refuses() {
        let (_temp_dir, connection) = test_connection();

        let owner = set_up_owner(&connection);
        assert_eq!(owner.role, "owner");
        assert!(!needs_initial_setup(&connection).expect("check should succeed"));

        let second = set_initial_owner_password(&connection, "another-password-1");
        assert!(second.is_err(), "setup must not be usable twice");
        assert!(authenticate(&connection, "owner", GOOD_PASSWORD).is_ok());
    }

    #[test]
    fn authenticate_accepts_the_right_password_and_rejects_others() {
        let (_temp_dir, connection) = test_connection();
        set_up_owner(&connection);

        assert!(authenticate(&connection, "owner", GOOD_PASSWORD).is_ok());
        assert!(authenticate(&connection, "owner", "wrong-password-99").is_err());
        assert!(authenticate(&connection, "nobody", GOOD_PASSWORD).is_err());
    }

    #[test]
    fn authenticate_gives_the_same_message_for_unknown_user_and_wrong_password() {
        let (_temp_dir, connection) = test_connection();
        set_up_owner(&connection);

        let wrong_password = authenticate(&connection, "owner", "wrong-password-99").unwrap_err();
        let unknown_user = authenticate(&connection, "ghost", GOOD_PASSWORD).unwrap_err();

        assert_eq!(
            wrong_password, unknown_user,
            "differing messages would reveal which usernames exist"
        );
    }

    #[test]
    fn a_session_resolves_to_its_user_and_stops_working_after_sign_out() {
        let (_temp_dir, connection) = test_connection();
        let owner = set_up_owner(&connection);

        let session = start_session(
            &connection,
            &owner.id,
            Some("test-agent"),
            Some("127.0.0.1"),
        )
        .expect("session should start");

        let resolved = user_for_token(&connection, &session.token)
            .expect("lookup should succeed")
            .expect("session should resolve to a user");
        assert_eq!(resolved.id, owner.id);

        end_session(&connection, &session.token).expect("sign out should succeed");

        assert!(user_for_token(&connection, &session.token)
            .expect("lookup should succeed")
            .is_none());
    }

    #[test]
    fn only_the_hash_of_a_token_is_stored() {
        let (_temp_dir, connection) = test_connection();
        let owner = set_up_owner(&connection);

        let session =
            start_session(&connection, &owner.id, None, None).expect("session should start");

        let stored: String = connection
            .query_row("SELECT token_hash FROM sessions", [], |row| row.get(0))
            .expect("session row should exist");

        assert_ne!(stored, session.token);
        assert_eq!(stored, hash_token(&session.token));
    }

    #[test]
    fn an_unknown_or_expired_token_resolves_to_nobody() {
        let (_temp_dir, connection) = test_connection();
        let owner = set_up_owner(&connection);

        assert!(user_for_token(&connection, "not-a-real-token")
            .expect("lookup should succeed")
            .is_none());

        let session =
            start_session(&connection, &owner.id, None, None).expect("session should start");
        connection
            .execute(
                "UPDATE sessions SET expires_at = datetime('now', '-1 day')",
                [],
            )
            .expect("expiry should be forced");

        assert!(
            user_for_token(&connection, &session.token)
                .expect("lookup should succeed")
                .is_none(),
            "an expired session must not authenticate"
        );

        assert_eq!(
            purge_expired_sessions(&connection).expect("purge should succeed"),
            1
        );
    }

    #[test]
    fn changing_a_password_signs_existing_sessions_out() {
        let (_temp_dir, connection) = test_connection();
        let owner = set_up_owner(&connection);

        let session =
            start_session(&connection, &owner.id, None, None).expect("session should start");

        set_user_password(&connection, &owner.id, "brand-new-password")
            .expect("password should set");

        assert!(
            user_for_token(&connection, &session.token)
                .expect("lookup should succeed")
                .is_none(),
            "a password change must invalidate sessions opened with the old one"
        );
        assert!(authenticate(&connection, "owner", "brand-new-password").is_ok());
    }

    fn new_user_request(username: &str) -> CreateLocalUserRequest {
        CreateLocalUserRequest {
            display_name: "Maria Santos".to_string(),
            username: username.to_string(),
            password: GOOD_PASSWORD.to_string(),
            role: None,
        }
    }

    #[test]
    fn a_created_user_can_sign_in_and_is_not_an_owner() {
        let (_temp_dir, connection) = test_connection();
        set_up_owner(&connection);

        let created =
            create_user(&connection, new_user_request("Maria")).expect("user should be created");

        assert_eq!(created.username.as_deref(), Some("maria"));
        assert!(!created.is_owner());
        assert!(authenticate(&connection, "  MARIA ", GOOD_PASSWORD).is_ok());
    }

    #[test]
    fn creating_a_user_rejects_duplicates_and_unusable_details() {
        let (_temp_dir, connection) = test_connection();
        set_up_owner(&connection);

        create_user(&connection, new_user_request("maria")).expect("user should be created");

        assert!(
            create_user(&connection, new_user_request("Maria")).is_err(),
            "the same username in different letter cases must not create two accounts"
        );
        assert!(create_user(&connection, new_user_request("owner")).is_err());
        assert!(create_user(&connection, new_user_request("ma")).is_err());
        assert!(create_user(&connection, new_user_request("maria santos")).is_err());

        let short_password = CreateLocalUserRequest {
            password: "short".to_string(),
            ..new_user_request("carlos")
        };
        assert!(create_user(&connection, short_password).is_err());
    }

    #[test]
    fn a_deactivated_user_can_no_longer_use_an_open_session() {
        let (_temp_dir, connection) = test_connection();
        let owner = set_up_owner(&connection);

        let session =
            start_session(&connection, &owner.id, None, None).expect("session should start");
        connection
            .execute(
                "UPDATE users SET status = 'inactive' WHERE id = ?1",
                params![owner.id],
            )
            .expect("user should deactivate");

        assert!(user_for_token(&connection, &session.token)
            .expect("lookup should succeed")
            .is_none());
    }
}
