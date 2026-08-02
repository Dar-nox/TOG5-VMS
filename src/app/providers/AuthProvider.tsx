import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  completeSetup,
  getAuthStatus,
  signIn as requestSignIn,
  signOut as requestSignOut,
} from "../../services/api/auth";
import { setUnauthorizedHandler } from "../../services/api/client";
import type { LocalUserRecord } from "../../services/api/settings";
import { AuthContext, type AuthContextValue, type AuthPhase } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AuthPhase>("checking");
  const [user, setUser] = useState<LocalUserRecord | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setPhase("checking");
    setProblem(null);

    try {
      const status = await getAuthStatus();

      if (status.user) {
        setUser(status.user);
        setPhase("signed-in");
        return;
      }

      setUser(null);
      setPhase(status.needsSetup ? "setup" : "signed-out");
    } catch (error) {
      setUser(null);
      setProblem(error instanceof Error ? error.message : String(error));
      setPhase("unreachable");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // A session can expire while somebody is in the middle of their work. When
  // the server says so, drop straight back to the sign-in screen rather than
  // leaving every panel showing its own "please sign in" error.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setPhase("signed-out");
    });

    return () => setUnauthorizedHandler(undefined);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      phase,
      user,
      problem,
      retry: refresh,
      setUpOwner: async (password: string) => {
        setUser(await completeSetup(password));
        setPhase("signed-in");
      },
      signIn: async (username: string, password: string) => {
        setUser(await requestSignIn(username, password));
        setPhase("signed-in");
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
