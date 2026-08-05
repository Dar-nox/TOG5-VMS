import { useState } from "react";
import { useAuth } from "../../app/providers/authContext";
import { Button } from "../ui/Button";
import { AuthShell } from "./AuthShell";

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
    <AuthShell title="Cannot reach TOG 5 VMS">
      <p className="text-sm text-muted">{problem ?? "The app could not connect."}</p>
      <p className="text-sm text-muted">Check your internet connection, then try again.</p>

      <Button block loading={retrying} onClick={() => void handleRetry()} variant="primary">
        Try again
      </Button>
    </AuthShell>
  );
}
