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

/**
 * Whether the app knows where its database is.
 *
 * Deliberately a flag rather than a thrown error. Throwing here happens while
 * the module is still being imported, before React has mounted anything, so
 * the whole app becomes a blank white page with the explanation buried in the
 * browser console. Somebody who forgot to set these when deploying would have
 * a site that built perfectly and showed nothing at all.
 *
 * The app checks this before it renders and says what is wrong instead.
 */
export const isConfigured = Boolean(url && anonKey);

export const supabase = createClient(url || "https://unconfigured.invalid", anonKey || "unset", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/**
 * A second connection to the same project that never touches storage.
 *
 * For the one operation that would otherwise sign the caller out of their own
 * account: creating somebody else's. `signUp` replaces the current session, and
 * an owner adding a driver does not expect to be thrown out and have to sign
 * back in as them. `persistSession: false` means this client writes nothing and
 * nothing survives it, so the real session is untouched.
 *
 * Make one, use it, drop it.
 */
export function createDisposableClient() {
  return createClient(url || "https://unconfigured.invalid", anonKey || "unset", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

const SIGNED_OUT_MESSAGE = "Your sign-in has expired. Please sign in again.";

/**
 * What to say when a request never reached the server.
 *
 * Two different faults look identical from in here, and the advice for one is
 * useless for the other. A device with no signal is fixed by the person holding
 * it. A server that has stopped answering is not — and it does stop: Supabase
 * puts a free project to sleep after seven days without traffic, and waking it
 * is a click in a dashboard the office has never seen. Telling somebody to
 * check their wi-fi that morning sends them to the router for an hour.
 *
 * `navigator.onLine` separates them. It is false only when the device itself
 * has no network, so a failure while it is true means the far end is silent.
 * It can be wrong the other way — connected to a wi-fi point that leads
 * nowhere reads as online — which is why the online message stops at "the
 * connection looks fine" rather than insisting it is.
 */
export function unreachableMessage(): string {
  return navigator.onLine
    ? "TOG 5 VMS is not answering. Your connection looks fine, so this is the app's server rather than anything at your end. Try again in a minute; if it keeps happening, tell whoever set the app up."
    : "This device is offline. Check your internet connection, then try again.";
}

/**
 * Whether a failure happened before any database saw the request.
 *
 * A real PostgREST error always carries a code, because something had to run
 * to produce it. A request that never arrived has none — `supabase-js` hands
 * back whatever `fetch` threw, which is "Failed to fetch" in Chrome, "Load
 * failed" in Safari, and "NetworkError" in Firefox.
 */
function isUnreachable(error: PostgrestError): boolean {
  if (error.code) {
    return false;
  }

  const message = (error.message || "").toLowerCase();

  return (
    message.includes("fetch") || message.includes("network") || message.includes("load failed")
  );
}

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

  if (isUnreachable(error)) {
    return unreachableMessage();
  }

  return error.message || "Something went wrong. Please try again.";
}

function isSignedOutError(error: PostgrestError): boolean {
  return error.code === "PGRST301" || error.code === "401" || error.code === "42501";
}

/**
 * Postgres columns are snake_case and the app's types are camelCase. Converting
 * once here beats aliasing every column in every query, or renaming the fields
 * every screen already reads.
 */
function toCamelCase(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toCamelCase);
  }

  if (value === null || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  const converted: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const camel = key.replace(/_([a-z0-9])/g, (_, character: string) => character.toUpperCase());
    converted[camel] = toCamelCase(nested);
  }

  return converted;
}

/**
 * Unwraps a Supabase result, throwing on failure so that existing `try/catch`
 * blocks keep working. Every query in this folder goes through here.
 */
export function unwrap<T>(result: { data: unknown; error: PostgrestError | null }): T {
  if (result.error) {
    const signedOut = isSignedOutError(result.error);

    if (signedOut) {
      onUnauthorized?.();
    }

    throw new ApiError(messageFor(result.error), result.error.code, signedOut);
  }

  // A `.single()` that matched nothing surfaces as an error, so reaching here
  // with null means the caller asked for a list and got an empty one.
  return toCamelCase(result.data) as T;
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
  return unwrap<T>(await supabase.rpc(name, args));
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
