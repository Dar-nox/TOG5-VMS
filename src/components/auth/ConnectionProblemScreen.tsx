import { useState } from "react";
import { useAuth } from "../../app/providers/authContext";

/**
 * Shown when the app loads but cannot reach the server.
 *
 * Deliberately separate from the sign-in screen: telling somebody to sign in
 * when the connection is down sends them round in circles retyping a password
 * that was never the problem.
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
          <h1>Cannot reach TOG 5 VMS</h1>
          <p>{problem ?? "The app could not connect."}</p>
          <p>Check your internet connection, then try again.</p>
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
