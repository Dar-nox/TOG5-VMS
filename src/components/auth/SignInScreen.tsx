import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../app/providers/authContext";
import { messageFromError } from "../../lib/errors";
import { Button } from "../ui/Button";
import { TextField } from "../ui/Field";
import { ErrorBlock } from "../ui/States";
import { AuthShell } from "./AuthShell";

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
      setErrorMessage(messageFromError(error));
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Sign in">
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <p className="text-sm text-muted">
          Use the email and password you were given for TOG 5 VMS.
        </p>

        <TextField
          autoComplete="username"
          label="Email"
          onChange={setEmail}
          required
          type="email"
          value={email}
        />

        <TextField
          autoComplete="current-password"
          label="Password"
          onChange={setPassword}
          required
          type="password"
          value={password}
        />

        {errorMessage ? <ErrorBlock message={errorMessage} /> : null}

        <Button block loading={busy} type="submit" variant="primary">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
