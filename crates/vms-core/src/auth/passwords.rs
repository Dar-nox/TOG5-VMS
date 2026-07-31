use std::sync::OnceLock;

use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand_core::OsRng;

pub const MINIMUM_PASSWORD_LENGTH: usize = 10;

/// A real Argon2 hash, built once on first use, that is verified against when
/// the requested username does not exist. Rejecting a missing account then
/// costs about the same as rejecting a wrong password, so response time does
/// not reveal which usernames are real.
fn timing_equaliser_hash() -> &'static str {
    static HASH: OnceLock<String> = OnceLock::new();

    HASH.get_or_init(|| hash_password("timing equaliser placeholder").unwrap_or_default())
}

pub fn validate_password_strength(password: &str) -> Result<(), String> {
    if password.trim().is_empty() {
        return Err("Enter a password.".to_string());
    }

    if password.chars().count() < MINIMUM_PASSWORD_LENGTH {
        return Err(format!(
            "Choose a password with at least {MINIMUM_PASSWORD_LENGTH} characters."
        ));
    }

    Ok(())
}

pub fn hash_password(password: &str) -> Result<String, String> {
    validate_password_strength(password)?;

    let salt = SaltString::generate(&mut OsRng);

    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|_| "Could not secure that password. Please try again.".to_string())
}

pub fn verify_password(password: &str, stored_hash: &str) -> bool {
    let Ok(parsed) = PasswordHash::new(stored_hash) else {
        return false;
    };

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok()
}

/// Spends roughly the same time as a real verification so that callers can
/// avoid leaking whether a username exists.
pub fn spend_verification_time() {
    let _ = verify_password("no-such-password", timing_equaliser_hash());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hashes_and_verifies_a_password() {
        let hash = hash_password("correct horse battery").expect("password should hash");

        assert!(verify_password("correct horse battery", &hash));
        assert!(!verify_password("Correct horse battery", &hash));
        assert!(!verify_password("", &hash));
    }

    #[test]
    fn hashing_the_same_password_twice_gives_different_hashes() {
        let first = hash_password("correct horse battery").expect("password should hash");
        let second = hash_password("correct horse battery").expect("password should hash");

        assert_ne!(first, second, "each hash should use a fresh salt");
        assert!(verify_password("correct horse battery", &first));
        assert!(verify_password("correct horse battery", &second));
    }

    #[test]
    fn rejects_short_and_blank_passwords() {
        assert!(hash_password("short").is_err());
        assert!(hash_password("   ").is_err());
        assert!(validate_password_strength("123456789").is_err());
        assert!(validate_password_strength("1234567890").is_ok());
    }

    #[test]
    fn verifying_against_a_corrupt_hash_fails_without_panicking() {
        assert!(!verify_password("anything", "not-a-real-hash"));
    }

    #[test]
    fn timing_equaliser_hash_is_a_valid_argon2_hash() {
        assert!(
            PasswordHash::new(timing_equaliser_hash()).is_ok(),
            "the equaliser must parse, otherwise it returns early and defeats its purpose"
        );
    }
}
