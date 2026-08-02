import { useState } from "react";
import { useAuth } from "../../app/providers/authContext";

const MINIMUM_PASSWORD_LENGTH = 10;

/**
 * One screen for two jobs. On a brand-new server it sets the owner password;
 * after that it signs people in. There is no default password to fall back
 * on, so the setup form is the only way the first account is ever created.
 */
export function SignInScreen({ mode }: { mode: "setup" | "sign-in" }) {
  const { setUpOwner, signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSetup = mode === "setup";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    if (isSetup) {
      if (password.length < MINIMUM_PASSWORD_LENGTH) {
        setErrorMessage(`Choose a password with at least ${MINIMUM_PASSWORD_LENGTH} characters.`);
        return;
      }

      if (password !== confirmation) {
        setErrorMessage("The two passwords do not match.");
        return;
      }
    }

    setBusy(true);

    try {
      if (isSetup) {
        await setUpOwner(password);
      } else {
        await signIn(username, password);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  }

  return (
    <div className="sign-in-screen">
      <form className="sign-in-card" onSubmit={(event) => void handleSubmit(event)}>
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
          <h1>{isSetup ? "Set up TOG 5 VMS" : "Sign in"}</h1>
          <p>
            {isSetup
              ? "Choose the password for the owner account. It is the only account that can clear data, restore backups, and add other users, so keep it somewhere safe."
              : "Enter the username and password you were given for TOG 5 VMS."}
          </p>
        </div>

        {isSetup ? null : (
          <label className="form-field">
            <span>Username</span>
            <input
              autoComplete="username"
              autoFocus
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              required
              type="text"
              value={username}
            />
          </label>
        )}

        <label className="form-field">
          <span>Password</span>
          <input
            autoComplete={isSetup ? "new-password" : "current-password"}
            autoFocus={isSetup}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {isSetup ? (
          <label className="form-field">
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              name="confirmPassword"
              onChange={(event) => setConfirmation(event.target.value)}
              required
              type="password"
              value={confirmation}
            />
          </label>
        ) : null}

        {errorMessage ? <div className="inline-error compact">{errorMessage}</div> : null}

        <button className="primary-button" disabled={busy} type="submit">
          {busy ? "Please wait..." : isSetup ? "Set password and continue" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
