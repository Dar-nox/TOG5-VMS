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
          <h1>Not configured</h1>
          <p>
            TOG 5 VMS was built without the settings that tell it where its database is, so it
            cannot reach anything. Nothing is wrong with your records.
          </p>
          <p>
            Whoever deployed this needs to set <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code>, then build again — these are read when the app is
            built, not when it runs, so setting them is not enough on its own.
          </p>
        </div>
      </div>
    </div>
  );
}
