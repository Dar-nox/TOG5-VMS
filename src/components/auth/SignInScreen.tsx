import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../app/providers/authContext";

export function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setBusy(true);

    try {
      await signIn(email, password);
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
          <h1>Sign in</h1>
          <p>Use the email and password you were given for TOG 5 VMS.</p>
        </div>

        <label className="form-field">
          <span>Email</span>
          <input
            autoComplete="username"
            autoFocus
            inputMode="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label className="form-field">
          <span>Password</span>
          <input
            autoComplete="current-password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {errorMessage ? <div className="inline-error compact">{errorMessage}</div> : null}

        <button className="primary-button" disabled={busy} type="submit">
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
