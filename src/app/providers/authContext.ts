import { createContext, useContext } from "react";
import type { SignedInUser } from "../../services/api/auth";

export type AuthPhase =
  | "checking"
  | "signed-out"
  | "signed-in"
  | "not-admitted"
  | "unreachable";

export type AuthContextValue = {
  phase: AuthPhase;
  user: SignedInUser | null;
  problem: string | null;
  /** Owners are the only accounts allowed the destructive operations. */
  isOwner: boolean;
  retry: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
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
