import { AuthShell } from "./AuthShell";

/**
 * Shown when the app was built without knowing where its database is.
 *
 * This is a deployment mistake, not a user one, so it says exactly what is
 * missing and where it goes. The alternative — and what happened before this
 * screen existed — is a blank white page, because the failure occurs while the
 * code is still loading and React never gets as far as rendering.
 */
export function NotConfiguredScreen() {
  return (
    <AuthShell title="Not set up yet">
      <p className="text-sm text-muted">
        TOG 5 VMS was built without the settings that tell it where its database is, so it cannot
        reach anything. Nothing is wrong with your records.
      </p>

      <p className="text-sm text-muted">
        Whoever deployed this needs to set{" "}
        <code className="rounded-sm bg-surface-sunken px-1 font-mono text-xs">
          VITE_SUPABASE_URL
        </code>{" "}
        and{" "}
        <code className="rounded-sm bg-surface-sunken px-1 font-mono text-xs">
          VITE_SUPABASE_ANON_KEY
        </code>
        , then build again. They are read when the app is built, not when it runs, so setting them
        is not enough on its own.
      </p>
    </AuthShell>
  );
}
