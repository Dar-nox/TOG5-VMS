import { apiGet, apiRequest } from "./client";
import type { LocalUserRecord } from "./settings";

export type AuthStatus = {
  needsSetup: boolean;
  user: LocalUserRecord | null;
};

type SignedInResponse = {
  user: LocalUserRecord;
};

export async function getAuthStatus(): Promise<AuthStatus> {
  return apiGet<AuthStatus>("/auth/status");
}

/** First run only: gives the owner account its password. */
export async function completeSetup(password: string): Promise<LocalUserRecord> {
  const response = await apiRequest<SignedInResponse>("/auth/setup", { password });

  return response.user;
}

export async function signIn(username: string, password: string): Promise<LocalUserRecord> {
  const response = await apiRequest<SignedInResponse>("/auth/login", { username, password });

  return response.user;
}

export async function signOut(): Promise<void> {
  await apiRequest<AuthStatus>("/auth/logout");
}
