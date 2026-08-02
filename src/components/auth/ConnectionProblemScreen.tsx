import { useState } from "react";
import { useAuth } from "../../app/providers/authContext";

/**
 * Shown when the app loads but the server does not answer. The people using
 * this are drivers and office staff, not administrators, so it says what to
 * do rather than what went wrong technically.
 */
export function ConnectionProblemScreen() {
  const { problem, retry } = useAuth();
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);

    try {
      await retry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="sign-in-screen">
      <div className="sign-in-card">
        <div className="sign-in-brand">
          <div className="brand-mark" aria-hidden="true">
            VMS
          </div>
          <div>
            <p>TOG 5</p>
            <strong>Vehicle Care</strong>
          </div>
        </div>

        <div className="sign-in-intro">
          <h1>TOG 5 VMS is not answering</h1>
          <p>
            {problem ?? "Could not reach TOG 5 VMS. Check your internet connection and try again."}
          </p>
          <p>
            If your connection is fine, the office computer that runs TOG 5 VMS may be switched off
            or restarting. Wait a moment, then try again.
          </p>
        </div>

        <button
          className="primary-button"
          disabled={retrying}
          onClick={() => void handleRetry()}
          type="button"
        >
          {retrying ? "Trying again..." : "Try again"}
        </button>
      </div>
    </div>
  );
}
