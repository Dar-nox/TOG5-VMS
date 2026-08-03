/**
 * Talks to Supabase.
 *
 * The rest of `src/services/api/` is written against the contract the desktop
 * build had: a call either returns data or **throws** a message somebody can
 * read. `supabase-js` does neither — it resolves with `{ data, error }` and
 * never throws. Every one of the app's error handlers assumes the throw, so
 * this file restores it. Without that, failures would stop being caught and
 * the app would render `undefined` instead of saying what went wrong.
 */

import { createClient, type PostgrestError } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "TOG 5 VMS is not configured. Copy .env.example to .env.local and fill in the " +
      "Supabase project URL and publishable key.",
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

const OFFLINE_MESSAGE =
  "Could not reach TOG 5 VMS. Check your internet connection and try again.";

const SIGNED_OUT_MESSAGE = "Your sign-in has expired. Please sign in again.";

export class ApiError extends Error {
  readonly code: string | undefined;
  readonly isSignedOut: boolean;

  constructor(message: string, code?: string, isSignedOut = false) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.isSignedOut = isSignedOut;
  }
}

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | undefined;

/**
 * Lets the sign-in screen react when a session expires mid-session, without
 * every screen in the app having to check for it.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | undefined) {
  onUnauthorized = handler;
}

/**
 * Turns a Postgres error into something worth showing somebody.
 *
 * The database raises its own messages deliberately — "Completion odometer
 * cannot be lower than the previous completed odometer (12,000 km)." is
 * written for the person reading it, not for a log. Those come through
 * unchanged. Everything else gets translated, because a raw constraint name
 * helps nobody.
 */
function messageFor(error: PostgrestError): string {
  const code = error.code ?? "";

  // Raised by our own functions with `raise exception`.
  if (code === "P0001" && error.message) {
    return error.message;
  }

  switch (code) {
    case "23505":
      return "That already exists.";
    case "23503":
      return "That refers to something which no longer exists.";
    case "23514":
      return "Some of those details are not valid. Check the form and try again.";
    case "42501":
      return "You do not have permission to do that.";
    case "PGRST301":
    case "401":
      return SIGNED_OUT_MESSAGE;
    default:
      break;
  }

  if (!navigator.onLine) {
    return OFFLINE_MESSAGE;
  }

  return error.message || "Something went wrong. Please try again.";
}

function isSignedOutError(error: PostgrestError): boolean {
  return error.code === "PGRST301" || error.code === "401" || error.code === "42501";
}

/**
 * Unwraps a Supabase result, throwing on failure so that existing `try/catch`
 * blocks keep working. Every query in this folder goes through here.
 */
export function unwrap<T>(result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) {
    const signedOut = isSignedOutError(result.error);

    if (signedOut) {
      onUnauthorized?.();
    }

    throw new ApiError(messageFor(result.error), result.error.code, signedOut);
  }

  // A `.single()` that matched nothing surfaces as an error, so reaching here
  // with null means the caller asked for a list and got an empty one.
  return result.data as T;
}

/** Same, for calls whose result is not used. */
export function unwrapVoid(result: { error: PostgrestError | null }): void {
  unwrap({ data: null, error: result.error });
}

/**
 * Calls a database function. The business rules live in Postgres, so most
 * writes go through one of these rather than a table update.
 */
export async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  return unwrap<T>((await supabase.rpc(name, args)) as { data: T | null; error: PostgrestError | null });
}

const MANAGED_BUCKETS = [
  "vehicle-photos",
  "fuel-receipts",
  "maintenance-receipts",
  "maintenance-photos",
];

/**
 * Builds a URL for a stored photo or receipt.
 *
 * The buckets are private, so this is a signed link that expires. Kept
 * synchronous-looking at the call sites by returning a promise the components
 * already await.
 */
export async function managedFileUrl(storagePath?: string | null): Promise<string | undefined> {
  if (!storagePath) {
    return undefined;
  }

  const [bucket, ...rest] = storagePath.split("/");

  if (!bucket || rest.length === 0 || !MANAGED_BUCKETS.includes(bucket)) {
    return undefined;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(rest.join("/"), 60 * 60);

  return error ? undefined : data?.signedUrl;
}
