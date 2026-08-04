import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  currentUser,
  onAuthStateChange,
  signIn as requestSignIn,
  signOut as requestSignOut,
  type SignedInUser,
} from "../../services/api/auth";
import { setUnauthorizedHandler } from "../../services/api/client";
import { AuthContext, type AuthContextValue, type AuthPhase } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AuthPhase>("checking");
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setProblem(null);

    try {
      const signedIn = await currentUser();
      setUser(signedIn);
      setPhase(phaseFor(signedIn));
    } catch (error) {
      // Reaching Supabase failed, which is different from not being signed in.
      // Saying "please sign in" when the connection is down sends people
      // round in circles typing a password that was never the problem.
      setUser(null);
      setProblem(error instanceof Error ? error.message : String(error));
      setPhase("unreachable");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // A session can expire mid-use, or be ended in another tab. Either way the
  // app should land back on the sign-in screen rather than leaving every panel
  // showing its own error.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setPhase("signed-out");
    });

    const stopListening = onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      setUnauthorizedHandler(undefined);
      stopListening();
    };
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      phase,
      user,
      problem,
      isOwner: user?.role === "owner",
      retry: refresh,
      signIn: async (email: string, password: string) => {
        const signedIn = await requestSignIn(email, password);
        setUser(signedIn);
        setPhase(phaseFor(signedIn));
      },
      signOut: async () => {
        try {
          await requestSignOut();
        } finally {
          setUser(null);
          setPhase("signed-out");
        }
      },
    }),
    [phase, problem, refresh, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * A correct password is not the same as access. Somebody waiting to be let in,
 * or switched off again, would otherwise land on a workspace where every panel
 * is empty and nothing says why.
 */
function phaseFor(signedIn: SignedInUser | null): AuthPhase {
  if (!signedIn) {
    return "signed-out";
  }

  return signedIn.status === "active" ? "signed-in" : "not-admitted";
}
