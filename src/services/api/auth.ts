import { supabase, unreachableMessage, unwrap } from "./client";

export type SignedInUser = {
  id: string;
  email: string;
  displayName: string;
  role: "owner" | "manager" | "viewer";
  /**
   * Signing in and being let in are two different things. A new sign-up is
   * `pending` until an owner admits them, and until then every table returns
   * nothing — so the app has to know, or it looks broken instead of waiting.
   */
  status: "active" | "pending" | "inactive";
};

/**
 * The signed-in person's profile.
 *
 * Supabase Auth knows who somebody is; `profiles` knows what they are called
 * and what they may do. The app needs both, so they are fetched together.
 */
export async function currentUser(): Promise<SignedInUser | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session) {
    return null;
  }

  const profile = unwrap<{
    displayName: string;
    role: SignedInUser["role"];
    status: SignedInUser["status"];
  }>(
    await supabase
      .from("profiles")
      .select("display_name, role, status")
      .eq("id", session.user.id)
      .single(),
  );

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    displayName: profile.displayName,
    role: profile.role,
    status: profile.status,
  };
}

export async function signIn(email: string, password: string): Promise<SignedInUser> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    // A request that never arrived is given no HTTP status, while a refused
    // password comes back as a 400. Worth separating: blaming the password for
    // a sleeping server has somebody retyping a correct one all morning.
    if (!error.status) {
      throw new Error(unreachableMessage());
    }

    // Supabase deliberately says the same thing for an unknown address and a
    // wrong password, and so should we — otherwise the form becomes a way to
    // find out who has an account.
    throw new Error("That email and password combination did not work.");
  }

  const user = await currentUser();

  if (!user) {
    throw new Error("Signed in, but your profile could not be loaded. Ask the owner to check it.");
  }

  return user;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Fires when a session starts, ends, or is refreshed in another tab. */
export function onAuthStateChange(handler: () => void): () => void {
  const { data } = supabase.auth.onAuthStateChange(() => handler());

  return () => data.subscription.unsubscribe();
}

export async function changeOwnPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw new Error(error.message || "Could not change your password.");
  }
}
