import { useState } from "react";
import { useAuth } from "../../app/providers/authContext";

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
          {switchedOff ? (
            <>
              <h1>This account is switched off</h1>
              <p>
                Nothing has been deleted — your records are still here. Ask the fleet owner to
                switch the account back on.
              </p>
            </>
          ) : (
            <>
              <h1>Waiting to be let in</h1>
              <p>
                Your account was created. The fleet owner has to let you in before you can see any
                vehicles or records — ask them to open Settings and approve it.
              </p>
            </>
          )}
          <p>
            Signed in as <strong>{user?.email}</strong>.
          </p>
        </div>

        <button
          className="primary-button"
          disabled={checking}
          onClick={() => void handleCheckAgain()}
          type="button"
        >
          {checking ? "Checking..." : "Check again"}
        </button>

        <button className="secondary-button" onClick={() => void signOut()} type="button">
          Sign out
        </button>
      </div>
    </div>
  );
}
