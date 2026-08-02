use std::{
    collections::HashMap,
    sync::Mutex,
    time::{Duration, Instant},
};

const MAX_ATTEMPTS: usize = 10;
const WINDOW: Duration = Duration::from_secs(5 * 60);

/// Counts recent sign-in attempts per caller so that a guessing loop runs out
/// of patience long before it runs out of passwords. In memory only: a restart
/// clears it, which is fine because a restart also drops the attacker's pace.
#[derive(Debug)]
pub struct LoginRateLimiter {
    attempts: Mutex<HashMap<String, Vec<Instant>>>,
}

impl LoginRateLimiter {
    pub fn new() -> Self {
        Self {
            attempts: Mutex::new(HashMap::new()),
        }
    }

    /// Records one attempt and reports whether the caller may keep trying.
    pub fn record_attempt(&self, caller: &str) -> Result<(), String> {
        let now = Instant::now();
        let mut attempts = self.lock();

        attempts.retain(|_, times| {
            times.retain(|time| now.duration_since(*time) < WINDOW);
            !times.is_empty()
        });

        let times = attempts.entry(caller.to_string()).or_default();
        times.push(now);

        if times.len() > MAX_ATTEMPTS {
            return Err("Too many sign-in attempts. Wait a few minutes and try again.".to_string());
        }

        Ok(())
    }

    /// Clears the count after a successful sign-in, so one forgetful morning
    /// does not lock somebody out for the rest of the window.
    pub fn clear(&self, caller: &str) {
        self.lock().remove(caller);
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, HashMap<String, Vec<Instant>>> {
        self.attempts
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

impl Default for LoginRateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_a_handful_of_attempts_then_stops_the_caller() {
        let limiter = LoginRateLimiter::new();

        for attempt in 1..=MAX_ATTEMPTS {
            assert!(
                limiter.record_attempt("10.0.0.1").is_ok(),
                "attempt {attempt} should be allowed"
            );
        }

        assert!(limiter.record_attempt("10.0.0.1").is_err());
    }

    #[test]
    fn one_busy_caller_does_not_block_everybody_else() {
        let limiter = LoginRateLimiter::new();

        for _ in 0..=MAX_ATTEMPTS {
            let _ = limiter.record_attempt("10.0.0.1");
        }

        assert!(limiter.record_attempt("10.0.0.2").is_ok());
    }

    #[test]
    fn a_successful_sign_in_clears_the_count() {
        let limiter = LoginRateLimiter::new();

        for _ in 0..MAX_ATTEMPTS {
            let _ = limiter.record_attempt("10.0.0.1");
        }
        limiter.clear("10.0.0.1");

        assert!(limiter.record_attempt("10.0.0.1").is_ok());
    }
}
