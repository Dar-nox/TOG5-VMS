import { useState } from "react";
import { useAuth } from "../../app/providers/authContext";
import { Button } from "../ui/Button";
import { AuthShell } from "./AuthShell";

/**
 * Signed in, but not let in.
 *
 * Anyone who has the app can create an account — the key that allows it ships
 * inside the app, as it is meant to — so a new account starts with no access
 * at all. Without this screen they would reach a workspace where every list is
 * empty and nothing explains why, and would reasonably conclude the app is
 * broken.
 */
export function NotAdmittedScreen() {
  const { user, retry, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const switchedOff = user?.status === "inactive";

  async function handleCheckAgain() {
    setChecking(true);

    try {
      await retry();
    } finally {
      setChecking(false);
    }
  }

  return (
    <AuthShell title={switchedOff ? "This account is switched off" : "Waiting to be let in"}>
      <p className="text-sm text-muted">
        {switchedOff
          ? "Nothing has been deleted — your records are still here. Ask the fleet owner to switch the account back on."
          : "Your account was created. The fleet owner has to let you in before you can see any vehicles or records — ask them to open Settings and approve it."}
      </p>

      <p className="text-sm text-muted">
        Signed in as <strong className="text-ink">{user?.email}</strong>.
      </p>

      <div className="flex flex-col gap-2">
        <Button block loading={checking} onClick={() => void handleCheckAgain()} variant="primary">
          Check again
        </Button>
        <Button block onClick={() => void signOut()} variant="quiet">
          Sign out
        </Button>
      </div>
    </AuthShell>
  );
}
