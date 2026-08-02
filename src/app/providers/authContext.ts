import { createContext, useContext } from "react";
import type { LocalUserRecord } from "../../services/api/settings";

export type AuthPhase = "checking" | "setup" | "signed-out" | "signed-in" | "unreachable";

export type AuthContextValue = {
  phase: AuthPhase;
  user: LocalUserRecord | null;
  problem: string | null;
  retry: () => Promise<void>;
  setUpOwner: (password: string) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return value;
}
